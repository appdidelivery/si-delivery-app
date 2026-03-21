import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS Headers (Essencial para não dar bloqueio no Subdomínio)
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
    // Cria a sessão de Checkout de ASSINATURA RECORRENTE
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Para assinatura recorrente no Brasil, a Stripe usa predominantemente Cartão
      line_items: [
        {
          // COLOQUE O SEU PRICE ID AQUI EMBAIXO
          price: 'price_COLE_AQUI_SEU_ID', 
          quantity: 1,
        },
      ],
      mode: 'subscription', // MUITO IMPORTANTE: Isso diz à Stripe para cobrar todo mês
      success_url: `${req.headers.origin}/admin?fatura=paga`, 
      cancel_url: `${req.headers.origin}/admin?fatura=cancelada`,
      client_reference_id: storeId, // Salva o ID da loja para seu webhook saber quem pagou
      subscription_data: {
        metadata: {
          storeId: storeId,
          plano: 'Pro_Velo'
        }
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Erro ao criar sessão na Stripe:', error);
    return res.status(500).json({ error: 'Erro interno ao comunicar com a Stripe.' });
  }
}