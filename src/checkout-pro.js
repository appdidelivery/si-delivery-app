import Stripe from 'stripe';

// Puxa a chave secreta que escondemos no .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { storeId } = req.body; // Pega o ID da loja (ex: 'ng') que está assinando

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          // Cole aqui o ID do Preço que você copiou no Passo 1!
          price: 'price_1T4Q2k6iD1OCwvLcBw6fUw6a', 
          quantity: 1,
        },
      ],
      mode: 'subscription', // Modo Assinatura (Mensalidade)
      // Para onde o lojista volta depois de pagar:
      success_url: `https://${req.headers.host}/admin?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `https://${req.headers.host}/admin?canceled=true`,
      client_reference_id: storeId, // Isso é vital: avisa a Stripe qual loja está pagando!
    });

    // Devolve o link de pagamento seguro para o seu React redirecionar o lojista
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("Erro na Stripe:", error);
    return res.status(500).json({ error: error.message });
  }
}