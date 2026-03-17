import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { storeId } = req.body;

        // 1. Cria a conta no Stripe Connect (Tipo Express)
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'BR', // Necessário para Pix no Brasil
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: { storeId: storeId }
        });

        // 2. Gera o link de Onboarding (onde o cliente preenche os dados)
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${req.headers.origin}/admin?stripe_error=true`,
            return_url: `${req.headers.origin}/admin?stripe_connected=${account.id}`,
            type: 'account_onboarding',
        });

        // Retorna a URL para o frontend redirecionar o lojista
        return res.status(200).json({ url: accountLink.url });

    } catch (error) {
        console.error('Erro ao criar conta Connect:', error);
        return res.status(500).json({ error: error.message });
    }
}