import Stripe from 'stripe';
import admin from 'firebase-admin';
import { sendWhatsAppNotification } from '../lib/evolution.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
    api: { bodyParser: false },
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks =[];
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
            const storeId = session.metadata?.storeId || 'csi'; 

            if (orderId) {
                const orderSnapshot = await db.collection("orders").doc(orderId).get();
                const orderData = orderSnapshot.exists ? orderSnapshot.data() : {};
                const customerPhone = orderData.customerPhone || session.metadata?.customerPhone;
                const customerName = orderData.customerName || 'Cliente';

                const batch = db.batch();

                const orderRef = db.collection("orders").doc(orderId);
                batch.set(orderRef, {
                    status: 'preparing', 
                    paymentStatus: 'paid',
                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const statsRef = db.collection("stats").doc(storeId);
                batch.set(statsRef, {
                    faturamentoTotal: admin.firestore.FieldValue.increment(valorTotal),
                    pedidosPagos: admin.firestore.FieldValue.increment(1),
                    comissaoVeloAcumulada: admin.firestore.FieldValue.increment(valorTotal * 0.02)
                }, { merge: true });

                let earnedPoints = Math.floor(valorTotal); 
                if (customerPhone) {
                    const phoneId = String(customerPhone).replace(/\D/g, ''); 
                    const loyaltyRef = db.collection("users").doc(phoneId).collection("loyalty").doc(storeId);
                    
                    batch.set(loyaltyRef, {
                        points: admin.firestore.FieldValue.increment(earnedPoints),
                        customerName: customerName,
                        lastPurchaseDate: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                await batch.commit();
                console.log(`✅ Fluxo Completo: Pedido ${orderId} atualizado no Firestore.`);

                const storeOwnerPhone = process.env.STORE_OWNER_PHONE || '5548991311442';
                const msgLojista = `🚀 *NOVO PEDIDO PAGO!*\n\n*ID:* ${orderId.slice(-5).toUpperCase()}\n*Valor:* R$ ${valorTotal.toFixed(2)}\n*Cliente:* ${customerName}\n\nO pedido já consta como "Em Preparo" no seu painel.`;
                await sendWhatsAppNotification(storeOwnerPhone, msgLojista);

                if (customerPhone) {
                    const msgCliente = `✅ *Pagamento Aprovado!*\n\nOlá ${customerName}, recebemos seu pagamento do pedido *#${orderId.slice(-5).toUpperCase()}*.\n\n👨‍🍳 Já estamos preparando tudo e logo sai para entrega!\n\n🎁 *Clube VIP:* Você ganhou +${earnedPoints} pontos nesta compra!`;
                    await sendWhatsAppNotification(customerPhone, msgCliente);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('⚠️ Erro no Webhook:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
}