import admin from 'firebase-admin';

function getAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'zetesteapp',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    }) });
  }
  return admin;
}
const kinds = new Set(['oferta','desconto','lancamento','combo']);
const styles = new Set(['varejo','moderno','vibrante']);
const MAX = 3;
export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({error:'Geração de IA ainda não configurada no servidor'});
  try {
    const bearer = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!bearer) return res.status(401).json({error:'Login necessário'});
    const fb = getAdmin();
    const user = await fb.auth().verifyIdToken(bearer[1]);
    const {storeId,productId,campaign,template} = req.body || {};
    if (![storeId,productId].every(v => typeof v === 'string' && v.length > 0 && v.length < 150) || !kinds.has(campaign) || !styles.has(template)) {
      return res.status(400).json({error:'Dados inválidos'});
    }
    const db = fb.firestore();
    const profile = await db.collection('users').doc(user.uid).get();
    const role = profile.data()?.role;
    if (profile.data()?.storeId !== storeId && !['adminSaaS','superadmin'].includes(role)) {
      return res.status(403).json({error:'Loja não autorizada'});
    }
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists || productDoc.data()?.storeId !== storeId) return res.status(404).json({error:'Produto não encontrado nesta loja'});
    const product = productDoc.data();
    const date = new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
    const usageRef = db.collection('banner_ai_usage').doc(storeId+'_'+date);
    // Reserva uma geração antes da chamada externa. Falhas são reembolsadas.
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(usageRef);
      const count = Number(snapshot.data()?.count || 0);
      if (count >= MAX) { const err = new Error('Limite diário de 3 gerações atingido'); err.status=429; throw err; }
      tx.set(usageRef,{storeId,date,count:count+1,updatedAt:fb.firestore.FieldValue.serverTimestamp()},{merge:true});
    });
    try {
      const category = String(product.category || 'produto de mercado').slice(0,80);
      const prompt = `Professional Brazilian retail advertising background for a ${category} campaign. Style: ${template}. Campaign: ${campaign}. High-end commercial photography atmosphere, realistic textures, premium lighting, dynamic composition, appropriate contextual props, bold layered shapes, sophisticated visual hierarchy. Wide 3:2 landscape. Keep middle left and right edges uncluttered for later product photo, brand logo, prices and labels. NO products, NO packaging, NO logos, NO text, NO numbers, NO typography, NO watermarks.`;
      const response = await fetch('https://api.openai.com/v1/images/generations',{
        method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
        body:JSON.stringify({model:'gpt-image-1',prompt,size:'1536x1024',quality:'medium',n:1}),
        signal:AbortSignal.timeout(90000)
      });
      const result=await response.json();
      if (!response.ok || !result.data?.[0]?.b64_json) throw new Error('Serviço de imagens indisponível');
      return res.status(200).json({image:'data:image/png;base64,'+result.data[0].b64_json,remaining:Math.max(0,MAX-(await usageRef.get()).data().count)});
    } catch (error) {
      await db.runTransaction(async tx => {
        const snap=await tx.get(usageRef);
        tx.update(usageRef,{count:Math.max(0,Number(snap.data()?.count||1)-1)});
      });
      throw error;
    }
  } catch (error) {
    return res.status(error.status||500).json({error:error.status?error.message:'Não foi possível gerar a imagem agora'});
  }
}
