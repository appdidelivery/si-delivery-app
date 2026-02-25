import Stripe from 'stripe';
import { db } from '../src/services/firebase'; 
import { doc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// A Stripe precisa ler a requisição "crua" para validar a segurança. Isso desativa o parser da Vercel.
export const config = {
    api: { bodyParser: false },
};

// Função mágica para ler os dados que a Stripe manda
async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    // Vamos colocar essa chave na Vercel no Passo 3
    const endpointSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET; 

    let event;

    try {
        // Valida se foi a Stripe MESMO que mandou isso (Segurança contra hackers)
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        console.error('⚠️  Erro na assinatura do Webhook.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // MÁGICA ACONTECENDO: Se o pagamento foi concluído com sucesso
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.client_reference_id; // Esse é o ID do pedido que mandamos antes!

        if (orderId) {
            try {
                // Atualiza o Firebase automaticamente para "Em Preparo" e "Pago"
                await updateDoc(doc(db, "orders", orderId), {
                    status: 'preparing', 
                    paymentStatus: 'paid'
                });
                console.log(`✅ Pedido ${orderId} atualizado para PAGO!`);
            } catch (error) {
                console.error("Erro ao atualizar o Firebase:", error);
            }
        }
    }

    res.status(200).json({ received: true });
}