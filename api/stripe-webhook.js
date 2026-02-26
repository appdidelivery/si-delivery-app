import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
    api: { bodyParser: false },
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

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

        const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.client_reference_id;
            const valorTotal = session.amount_total / 100;

            if (orderId) {
                const batch = db.batch();

                // 1. Atualiza o Pedido
                const orderRef = db.collection("orders").doc(orderId);
                batch.set(orderRef, {
                    status: 'preparing', 
                    paymentStatus: 'paid',
                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // 2. Atualiza os KPIs no documento de Estatísticas (Útil para o seu Painel)
                const statsRef = db.collection("stats").doc("geral"); // Você pode trocar "geral" pelo ID da loja depois
                batch.set(statsRef, {
                    faturamentoTotal: admin.firestore.FieldValue.increment(valorTotal),
                    pedidosPagos: admin.firestore.FieldValue.increment(1),
                    comissaoVeloAcumulada: admin.firestore.FieldValue.increment(valorTotal * 0.02)
                }, { merge: true });

                await batch.commit();
                console.log(`✅ Fluxo Completo: Pedido ${orderId} pago e KPIs atualizados.`);

                // 3. Envio de WhatsApp (Logica de disparo)
                const msg = `🚀 *Velo Delivery: Novo Pedido!*\n\n*ID:* ${orderId}\n*Valor:* R$ ${valorTotal.toFixed(2)}\n*Loja:* CSI Santa Isabel\n*Status:* Pago e em Preparo.`;
                
                // Aqui você chamará sua API de WhatsApp. Exemplo genérico:
                console.log(`📱 Notificação enviada para 48991311442: ${msg}`);
            }
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('⚠️ Erro no Webhook:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
}