import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { storeId } = req.body;

    try {
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'BR',
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
                pix_payments: { requested: true },

      },
      metadata: { storeId: storeId }
    });

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `https://${req.headers.host}/admin?stripe_error=true`,
            return_url: `https://${req.headers.host}/admin?stripe_connected=${account.id}`,
            type: 'account_onboarding',
        });

        res.status(200).json({ url: accountLink.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}