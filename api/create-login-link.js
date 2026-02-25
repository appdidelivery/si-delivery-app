import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { stripeConnectId } = req.body;

        if (!stripeConnectId) {
            throw new Error("ID da conta Stripe não fornecido.");
        }

        // Gera um link de login único e seguro com validade curta
        const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);

        res.status(200).json({ url: loginLink.url });
    } catch (error) {
        console.error("Erro ao gerar link do Express Dashboard:", error);
        res.status(500).json({ error: error.message });
    }
}