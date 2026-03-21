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
    // Cria a sessão de Checkout da Mensalidade (SaaS)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix'], // Aceita Cartão de Crédito e Pix
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Mensalidade Velo Delivery Pro',
              description: `Acesso completo ao painel, pedidos ilimitados e suporte para a loja ${storeId}.`,
              images: ['https://velodelivery.com.br/logo-square.png'], // Opcional: Sua Logo
            },
            unit_amount: 4990, // R$ 49,90 (em centavos = 4990)
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // 'payment' para cobrança única. Use 'subscription' se quiser que a Stripe cobre automático todo mês
      success_url: `${req.headers.origin}/admin?fatura=paga`, // Volta pro Admin
      cancel_url: `${req.headers.origin}/admin?fatura=cancelada`,
      client_reference_id: storeId, // Salva o ID da loja no pagamento para o seu webhook liberar o sistema
      metadata: {
        storeId: storeId,
        type: 'SaaS_Subscription'
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Erro ao criar sessão na Stripe:', error);
    return res.status(500).json({ error: 'Erro interno ao comunicar com a Stripe.' });
  }
}