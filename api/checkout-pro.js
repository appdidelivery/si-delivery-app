import Stripe from 'stripe';

export default async function handler(req, res) {
  // 1. Permite apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 2. Trava de Segurança: Verifica se a Vercel está lendo a senha
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("A chave da Stripe não foi encontrada na Vercel (STRIPE_SECRET_KEY).");
    }

    // 3. Inicia a Stripe com a senha garantida
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { storeId } = req.body;

    // 4. Cria a sessão
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'prod_U2lvkIJiHngVyc', // Seu ID correto!
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://${req.headers.host}/admin?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `https://${req.headers.host}/admin?canceled=true`,
      client_reference_id: storeId || 'loja_desconhecida',
    });

    // 5. Devolve o link
    return res.status(200).json({ url: session.url });

  } catch (error) {
    // Agora o erro exato vai aparecer no log da Vercel e no navegador!
    console.error("Erro na API da Stripe:", error);
    return res.status(500).json({ error: error.message });
  }
}