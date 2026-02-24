import Stripe from 'stripe';
import admin from 'firebase-admin';

// 1. Inicializa o Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 2. Configuração do Webhook (Obrigatório na Vercel)
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

// 3. A FUNÇÃO PRINCIPAL QUE A VERCEL ESTAVA PROCURANDO
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Só aceita POST');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Erro de Assinatura do Webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 4. Mágica no Banco de Dados
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const storeId = session.client_reference_id;

    if (storeId) {
      try {
        await db.collection('stores').doc(storeId).set({
          plan: 'pro',
          paymentStatus: 'paid',
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        console.log(`✅ SUCESSO: Loja ${storeId} atualizada para PRO e status PAGO!`);
      } catch (dbError) {
        console.error('❌ Erro ao atualizar o Firebase:', dbError);
      }
    }
  }

  res.status(200).json({ received: true });
}