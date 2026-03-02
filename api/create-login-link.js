import Stripe from 'stripe';

// A Vercel usa a variável STRIPE_SECRET_KEY que você configurou no painel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // 🛡️ Segurança: Só aceita requisições do tipo POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { stripeConnectId } = req.body;

        if (!stripeConnectId) {
            return res.status(400).json({ error: 'O ID da conta Stripe é obrigatório.' });
        }

        // 🚀 Chama a Stripe para gerar o link único de acesso do lojista
        const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);

        // Retorna o link para o frontend abrir em nova aba
        return res.status(200).json({ url: loginLink.url });
    } catch (error) {
        console.error('Erro ao gerar login link da Stripe:', error);
        return res.status(500).json({ error: error.message });
    }
}