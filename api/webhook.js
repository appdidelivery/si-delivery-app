import Stripe from 'stripe';
import admin from 'firebase-admin';

export const config = {
  api: { bodyParser: false },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// A FUNÇÃO PRINCIPAL
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Só aceita POST');

  try {
    // 1. Verifica chaves da Stripe
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Falta a STRIPE_SECRET_KEY na Vercel");
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Falta a STRIPE_WEBHOOK_SECRET na Vercel");
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 2. Verifica chaves do Firebase
    if (!process.env.FIREBASE_PROJECT_ID) throw new Error("Falta o FIREBASE_PROJECT_ID");
    if (!process.env.FIREBASE_CLIENT_EMAIL) throw new Error("Falta o FIREBASE_CLIENT_EMAIL");
    if (!process.env.FIREBASE_PRIVATE_KEY) throw new Error("Falta a FIREBASE_PRIVATE_KEY na Vercel");

    // 3. Inicializa Firebase (Protegido)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Garante que as quebras de linha funcionam mesmo que a chave venha bagunçada
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
      });
    }
    const db = admin.firestore();

    // 4. Lê a mensagem da Stripe
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new Error(`A Senha do Webhook (whsec_) está errada ou a assinatura falhou: ${err.message}`);
    }

    // 5. Salva no Banco de Dados
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const storeId = session.client_reference_id;

      if (storeId) {
        await db.collection('stores').doc(storeId).set({
          plan: 'pro',
          paymentStatus: 'paid',
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ SUCESSO: Loja ${storeId} atualizada no Firebase!`);
      } else {
         console.log(`⚠️ AVISO: Pagamento aprovado, mas não veio o ID da loja.`);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    // AGORA SIM! Se der erro, ele vai mostrar EXATAMENTE o que falhou no painel da Vercel!
    console.error('❌ ERRO FATAL NO WEBHOOK:', error.message);
    return res.status(500).json({ error: error.message });
  }
}