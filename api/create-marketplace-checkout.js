import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { items, orderId, storeConnectId, customerEmail, shippingFee, discountAmount, successUrl, cancelUrl } = req.body;

        // 1. Constrói a lista de itens do carrinho para a Stripe
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'brl',
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100), // Stripe usa centavos
            },
            quantity: item.quantity,
        }));

        // 2. Adiciona a Taxa de Entrega como um item na fatura
        if (shippingFee > 0) {
            lineItems.push({
                price_data: {
                    currency: 'brl',
                    product_data: { name: 'Taxa de Entrega' },
                    unit_amount: Math.round(shippingFee * 100),
                },
                quantity: 1,
            });
        }

        // 3. Monta a configuração base da sessão
        // ⚠️ O CÁLCULO MANUAL FOI REMOVIDO. O PAINEL DA STRIPE APLICARÁ OS 2% AUTOMATICAMENTE.
        let sessionConfig = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            client_reference_id: orderId, // Grava o ID do pedido do Firebase na Stripe
            payment_intent_data: {
                transfer_data: {
                    destination: storeConnectId, // Dinheiro vai pra conta conectada da loja (ex: Conveniência Santa Isabel)
                },
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        };

        // 4. Trata o Cupom de Desconto
        if (discountAmount > 0) {
            const tempCoupon = await stripe.coupons.create({
                amount_off: Math.round(discountAmount * 100),
                currency: 'brl',
                duration: 'once',
            });
            sessionConfig.discounts = [{ coupon: tempCoupon.id }];
        }

        // 5. Gera a URL de pagamento
        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Devolve o link da página da Stripe para o front-end
        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error("Erro no Checkout Connect:", error);
        res.status(500).json({ error: error.message });
    }
}