import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { stripeConnectId } = req.body;

        if (!stripeConnectId) {
            return res.status(400).json({ error: 'ID da conta Connect não fornecido.' });
        }

        // 🚀 O COMANDO MÁGICO: Solicita a capacidade de Pix para a conta existente
        const account = await stripe.accounts.update(stripeConnectId, {
            capabilities: {
                pix_payments: { requested: true },
            },
        });

        return res.status(200).json({ 
            success: true, 
            status: account.capabilities.pix_payments,
            message: "Solicitação de Pix enviada com sucesso!" 
        });
    } catch (error) {
        console.error('Erro ao ativar Pix:', error);
        return res.status(500).json({ error: error.message });
    }
}