import admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { effectivePromoPrice } from '../src/lib/promotions.js';

const MAX_DAILY = 3;
const CAMPAIGNS = new Set(['oferta', 'desconto', 'lancamento', 'combo']);
const TEMPLATES = new Set(['varejo', 'moderno', 'vibrante']);
const TRUSTED_ADMINS = new Set(['appdedelivery@gmail.com', 'appdidelivery@gmail.com', 'projetosdiego.l@gmail.com']);
const BYTES_MAX = 6 * 1024 * 1024;
const STYLE_GUIDE = {
  varejo: 'Premium Brazilian supermarket campaign, vivid green-and-yellow retail energy, realistic studio lighting, subtle branded sale shapes, luxurious editorial food photography.',
  moderno: 'Refined luxury e-commerce advertising, deep navy, cool electric reflections, sleek typography-safe negative space, glossy high-end photographic art direction.',
  vibrante: 'Energetic highly saturated Brazilian beverage and snack advertising, red-orange-magenta highlights, dynamic light trails, colorful droplets, realistic commercial photography and sharp focus.'
};
const CAMPAIGN_GUIDE = {
  oferta: 'A compelling special offer with energetic merchandising and a high value perception.',
  desconto: 'A high impact verified discount campaign, premium urgency cues with elegant discount badge areas.',
  lancamento: 'A fresh new arrival with a hero spotlight, excitement, and premium reveal atmosphere.',
  combo: 'A celebratory multi-item combo atmosphere with energetic grouped product podiums (do not invent other products).'
};
function getAdmin() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || 'zetesteapp',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
  }), storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'zetesteapp.appspot.com' });
  return admin;
}
function failure(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
function imageUrl(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return imageUrl(value[0]);
  if (value && typeof value === 'object') return imageUrl(value.secure_url || value.url || value.src || value.imageUrl);
  return '';
}
function productPhoto(product) {
  return [product.imageUrl,product.imageURL,product.image,product.photoUrl,product.photo,
    product.thumbnailUrl,product.images,product.imageUrls,product.photos,product.coverImage]
    .map(imageUrl).find(Boolean) || '';
}
function storeLogo(store) {
  return [store.storeLogoUrl,store.logoUrl,store.logo,store.imageUrl].map(imageUrl).find(Boolean) || '';
}
function safeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw failure(422, 'O endereço da imagem cadastrada é inválido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw failure(422, 'A imagem precisa usar um endereço HTTPS público.');
  }
  const host = url.hostname.toLowerCase();
  const allowed = ['res.cloudinary.com','firebasestorage.googleapis.com','storage.googleapis.com',
    'images.unsplash.com','cdn.shopify.com','i.imgur.com','lh3.googleusercontent.com'];
  if (!allowed.includes(host)) {
    throw failure(422, 'A origem da imagem não está habilitada no gerador. Atualize a foto usando o cadastro da loja.');
  }
  return url.toString();
}
async function readImage(raw, label) {
  if (!raw) throw failure(422, 'Cadastre a imagem de ' + label + ' antes de gerar o banner.');
  const url = safeUrl(raw);
  const response = await fetch(url, {redirect:'error',signal:AbortSignal.timeout(13000)});
  if (!response.ok) throw failure(422, 'Não foi possível carregar a imagem de ' + label + ' do catálogo.');
  const size = Number(response.headers.get('content-length') || 0);
  if (size > BYTES_MAX) throw failure(422, 'A imagem de ' + label + ' excede 6 MB.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > BYTES_MAX) throw failure(422, 'Imagem de ' + label + ' vazia ou muito grande.');
  let mime = 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) mime = 'image/png';
  else if (buffer[0] === 0xff && buffer[1] === 0xd8) mime = 'image/jpeg';
  else if (buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') mime = 'image/webp';
  else throw failure(422, 'O formato da imagem de ' + label + ' não é compatível (use JPG, PNG ou WebP).');
  return {buffer,mime};
}
function dateKey() {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return values.year + '-' + values.month + '-' + values.day;
}
async function authorize(db, decoded, storeId) {
  if (!storeId || typeof storeId !== 'string' || storeId.length > 140 || storeId.includes('/')) throw failure(400,'Loja inválida');
  const [userDoc,storeDoc] = await Promise.all([
    db.collection('users').doc(decoded.uid).get(),
    db.collection('stores').doc(storeId).get()
  ]);
  if (!storeDoc.exists) throw failure(404,'Loja não encontrada');
  const record = userDoc.data() || {};
  const merchant = storeDoc.data() || {};
  const email = String(decoded.email || '').trim().toLowerCase();
  const roles = [record.role,record.userRole,decoded.role].map(x=>String(x||'').toLowerCase());
  const admin = decoded.admin === true || decoded.superAdmin === true ||
    TRUSTED_ADMINS.has(email) || roles.includes('superadmin') || roles.includes('adminsaas');
  const owns = [
    record.storeId,record.lojaId,record.store_id,...(Array.isArray(record.storeIds)?record.storeIds:[])
  ].includes(storeId) || [merchant.ownerUid,merchant.ownerId,merchant.userId,merchant.uid,merchant.adminId]
    .includes(decoded.uid) || (email && [merchant.ownerEmail,merchant.adminEmail,merchant.email]
      .some(e=>String(e||'').toLowerCase()===email));
  let teamAccess = false;
  if (!admin && !owns && email) {
    const team = await db.collection('team').where('storeId','==',storeId).where('email','==',email).limit(1).get();
    if (!team.empty) {
      const member=team.docs[0].data()||{};
      teamAccess=member.active!==false && member.disabled!==true &&
        !['inactive','inativo','disabled','bloqueado'].includes(String(member.status||'').toLowerCase());
    }
  }
  if (!admin && !owns && !teamAccess) throw failure(403,'Seu usuário não tem permissão de gestão desta loja. Confira o vínculo da conta com a loja.');
  return merchant;
}
function getFacts(product) {
  const original = Number(product.catalogBasePrice ?? product.price ?? 0);
  const promo = effectivePromoPrice(product);
  const hasPromo = original > 0 && promo > 0 && promo < original;
  const sellingPrice = hasPromo ? promo : original;
  const percentage = hasPromo ? Math.round((1 - promo / original) * 100) : 0;
  return {name:String(product.name||'Produto').slice(0,95),category:String(product.category||'').slice(0,95),
    description:String(product.description||'').slice(0,280),original,sellingPrice,hasPromo,percentage};
}
function buildPrompt({facts,merchant,campaign,template,headline}) {
  const customHeadline = /^\s*\d+\s*%\s*$/.test(headline) && !facts.hasPromo ? '' : headline;
  return [
    'You are a top Brazilian advertising art director creating the premium DESIGN ELEMENTS of one complete 3:1 promotional banner for a real delivery retailer.',
    'Exact identity: merchant '+String(merchant.name||'Loja').slice(0,100)+'.',
    'Actual item: '+facts.name+'. Category: '+facts.category+'. Product context: '+facts.description+'.',
    'Real selling price (BRL): '+facts.sellingPrice+'. Verified promotion: '+(facts.hasPromo ? facts.percentage+' percent off from '+facts.original : 'NONE. NEVER imply an unverified percent discount.')+'.',
    'Campaign '+campaign+': '+CAMPAIGN_GUIDE[campaign]+'. Art direction '+template+': '+STYLE_GUIDE[template]+'.',
    customHeadline ? 'Headline context: '+customHeadline.slice(0,65)+'.' : '',
    'The input photos are references for the exact real-world product packaging and merchant logo, used to understand the brand, packaging colors, flavors, category and tone.',
    'Make a bespoke photorealistic, extraordinarily polished commercial ad layout: dimensional themed props relevant to this product, punchy specular lighting, nuanced material effects, shadows, glamorous pedestal, rich depth, editorial composition.',
    'ALL ESSENTIAL VISUAL ACTION MUST FIT A CENTRAL ULTRAWIDE 3:1 CROP OF THIS LANDSCAPE IMAGE (center 33 percent vertically).',
    'Crucial composition for the FINAL 1200 x 400 banner: left 48 percent kept smoothly dark and legible for exact text/price overlays; center-right 30 percent is a beautifully lit empty display plinth for the actual product photo; top-right kept visually clean for actual merchant logo.',
    'The final product photo, logo, campaign headline, correct price, call-to-action and discount will be composited afterward, pixel-exact, using the original photos and verified catalog fields.',
    'Do NOT paint, duplicate, redraw or invent any product packaging, bottles, brandmarks, logos, letters, fake prices, numeric characters, labels or text inside your illustration. This is the art-directed body of the FINAL marketing creative, not a boring flat gradient or generic template.',
    'Avoid mockup frames, empty white blocks, UI rectangles and generic placeholder shapes. Deliver strong distinctive visual art in the product category.'
  ].filter(Boolean).join('\n');
}
async function generateCreative(apiKey,product,merchant,campaign,template,headline) {
  const photo = await readImage(productPhoto(product),'produto');
  const logo = await readImage(storeLogo(merchant),'logo da loja');
  const facts = getFacts(product);
  const form = new FormData();
  form.set('model','gpt-image-1.5');
  form.set('prompt',buildPrompt({facts,merchant,campaign,template,headline}));
  form.set('size','1536x1024');
  form.set('quality','medium');
  form.set('input_fidelity','high');
  form.set('output_format','jpeg');
  form.set('output_compression','74');
  form.set('n','1');
  form.append('image[]',new Blob([photo.buffer],{type:photo.mime}),'produto.'+(photo.mime==='image/png'?'png':photo.mime==='image/webp'?'webp':'jpg'));
  form.append('image[]',new Blob([logo.buffer],{type:logo.mime}),'logo.'+(logo.mime==='image/png'?'png':logo.mime==='image/webp'?'webp':'jpg'));
  const response = await fetch('https://api.openai.com/v1/images/edits',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey},body:form,signal:AbortSignal.timeout(102000)
  });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) {
    console.error('[Velo Banner IA]',response.status,result?.error?.code||'',result?.error?.message?.slice(0,200)||'');
    if ([402,429].includes(response.status)) throw failure(503,'O serviço de imagens não tem saldo ou está temporariamente limitado. Verifique o faturamento da API OpenAI.');
    if ([400,403].includes(response.status)) throw failure(502,'O serviço de imagem não aceitou os arquivos ou a configuração da conta. Verifique as imagens e a permissão para geração.');
    throw failure(502,'O serviço de geração de imagens falhou. Nenhuma geração foi descontada.');
  }
  if (!result.data?.[0]?.b64_json) throw failure(502,'O serviço de imagem não devolveu um criativo válido.');
  return {image:'data:image/jpeg;base64,'+result.data[0].b64_json,facts};
}
async function uploadBanner(db,storeId,productId,body,user) {
  if (!body.imageData || typeof body.imageData !== 'string' || !body.imageData.startsWith('data:image/jpeg;base64,')) throw failure(400,'Arte JPEG inválida');
  const raw=Buffer.from(body.imageData.slice('data:image/jpeg;base64,'.length),'base64');
  if (!raw.length || raw.length > 4*1024*1024 || raw[0]!==0xff || raw[1]!==0xd8) throw failure(413,'A arte precisa ser um JPEG de até 4 MB');
  const product=await db.collection('products').doc(productId).get();
  if (!product.exists || product.data()?.storeId!==storeId) throw failure(404,'Produto não pertence à loja');
  const storage=admin.storage().bucket();
  const token=randomUUID();
  const filename='banners/'+storeId+'/ia-'+Date.now()+'-'+randomUUID()+'.jpg';
  await storage.file(filename).save(raw,{resumable:false,contentType:'image/jpeg',metadata:{cacheControl:'public, max-age=86400',metadata:{firebaseStorageDownloadTokens:token}}});
  const imageUrl='https://firebasestorage.googleapis.com/v0/b/'+storage.name+'/o/'+encodeURIComponent(filename)+'?alt=media&token='+token;
  const banner=await db.collection('banners').add({
    storeId,imageUrl,linkTo:'',order:Date.now(),isActive:true,
    productId,campaign:body.campaign,template:body.template,
    source:'velo-banner-ai',createdBy:user.uid,createdAt:admin.firestore.FieldValue.serverTimestamp()
  });
  return {bannerId:banner.id,imageUrl};
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if (req.method!=='POST') return res.status(405).json({error:'Método não permitido'});
  try {
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if (!token) throw failure(401,'Faça login para usar o gerador.');
    const fb=getAdmin(), user=await fb.auth().verifyIdToken(token), db=fb.firestore();
    const {storeId,productId,campaign,template} = req.body||{};
    const action=String(req.body?.action||'generate');
    const merchant=await authorize(db,user,storeId);
    const day=dateKey(),usageRef=db.collection('banner_ai_usage').doc(storeId+'_'+day);
    if (action==='quota') {
      const s=await usageRef.get(),count=Number(s.data()?.count||0);
      return res.status(200).json({remaining:Math.max(0,MAX_DAILY-count),limit:MAX_DAILY});
    }
    if (typeof productId!=='string' || !productId || productId.length>140 || productId.includes('/')) throw failure(400,'Selecione um produto válido.');
    const productSnap=await db.collection('products').doc(productId).get();
    if (!productSnap.exists || productSnap.data()?.storeId!==storeId) throw failure(404,'Produto não pertence a esta loja.');
    const product=productSnap.data();
    if (action==='asset') {
      if (!['product','logo'].includes(req.body?.kind)) throw failure(400,'Tipo de imagem inválido');
      const which=req.body.kind;
      const asset=await readImage(which==='product'?productPhoto(product):storeLogo(merchant),which==='product'?'produto':'logo da loja');
      return res.status(200).json({dataUrl:'data:'+asset.mime+';base64,'+asset.buffer.toString('base64')});
    }
    if (action==='publish') {
      const result=await uploadBanner(db,storeId,productId,req.body,user);
      return res.status(200).json({ok:true,...result});
    }
    if (action!=='generate'||!CAMPAIGNS.has(campaign)||!TEMPLATES.has(template)) throw failure(400,'Campanha ou modelo inválido');
    if (!process.env.OPENAI_API_KEY) throw failure(503,'Chave OpenAI não configurada no servidor');
    // Check all required original assets BEFORE charging quota.
    await Promise.all([readImage(productPhoto(product),'produto'),readImage(storeLogo(merchant),'logo da loja')]);
    await db.runTransaction(async tx=>{
      const snapshot=await tx.get(usageRef);
      const count=Number(snapshot.data()?.count||0);
      if (count>=MAX_DAILY) throw failure(429,'Limite de 3 gerações por loja atingido hoje.');
      tx.set(usageRef,{storeId,day,count:count+1,updatedAt:fb.firestore.FieldValue.serverTimestamp()},{merge:true});
    });
    try {
      const result=await generateCreative(process.env.OPENAI_API_KEY,product,merchant,campaign,template,String(req.body?.headline||'').slice(0,65));
      const s=await usageRef.get();
      return res.status(200).json({...result,remaining:Math.max(0,MAX_DAILY-Number(s.data()?.count||1))});
    } catch(err) {
      await db.runTransaction(async tx=>{
        const s=await tx.get(usageRef);
        tx.update(usageRef,{count:Math.max(0,Number(s.data()?.count||1)-1)});
      });
      throw err;
    }
  } catch(error) {
    console.error('[Velo Banner IA request]',error?.status||500,error?.message);
    return res.status(error?.status||500).json({error:error?.status?error.message:'Não foi possível concluir a operação. Tente novamente.'});
  }
}
