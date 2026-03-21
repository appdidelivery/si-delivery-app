import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { storeId } = req.body;

  if (!storeId) {
    return res.status(400).json({ error: 'ID da loja (storeId) é obrigatório.' });
  }

  try {
    // Modo Assinatura Recorrente exige uma estrutura mais simples
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      line_items: [
        {
          price: 'price_1T4gNo6iD1OCwvLcVlQ9q2hW', // <-- O SEU PRICE ID OFICIAL AQUI
          quantity: 1,
        },
      ],
      mode: 'subscription', // MODO RECORRENTE
      success_url: `${req.headers.origin}/admin?fatura=paga`,
      cancel_url: `${req.headers.origin}/admin?fatura=cancelada`,
      client_reference_id: storeId, // O ID da loja para seu Webhook ouvir
      subscription_data: {
        metadata: {
          storeId: storeId,
          type: 'velo_pro_subscription'
        }
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Erro ao criar sessão de Assinatura na Stripe:', error);
    // Retorna a mensagem de erro específica da Stripe para facilitar o debug
    return res.status(500).json({ error: error.message || 'Erro interno ao comunicar com a Stripe.' });
  }
}