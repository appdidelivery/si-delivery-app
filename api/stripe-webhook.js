import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
    api: { bodyParser: false },
};

// NOVA FUNÇÃO INFALÍVEL PARA LER O CORPO DA REQUISIÇÃO (BODY CRU)
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// Inicializa o Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
    });
}
const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const rawBody = await getRawBody(req);
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET; 

        // Agora sim a Stripe vai receber o texto completo para validar a segurança
        const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.client_reference_id; 

            if (orderId) {
                // Usando o .set() com merge para evitar falhas caso o documento não exista previamente
                await db.collection("orders").doc(orderId).set({
                    status: 'preparing', 
                    paymentStatus: 'paid'
                }, { merge: true });
                console.log(`✅ Pedido ${orderId} atualizado para PAGO no Firebase!`);
            } else {
                console.log("⚠️ Pagamento aprovado, mas sem orderId (client_reference_id vazio).");
            }
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('⚠️ Erro no Webhook:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
}