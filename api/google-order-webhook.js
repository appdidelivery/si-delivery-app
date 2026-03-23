import admin from 'firebase-admin';

// Inicialização do Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
    });
}
const db = admin.firestore();

export default async function handler(req, res) {
    // O Google Actions Center se comunica estritamente via POST
    if (req.method !== 'POST') {
        return res.status(405).send('Método não permitido. Use POST.');
    }

    try {
        const payload = req.body;
        
        // O Google envia a intenção da chamada no corpo da requisição
        const action = payload.action || payload.intent; 
        
        // O merchantId que enviamos no Feed volta aqui para identificarmos o cliente B2B
        const merchantId = payload.merchantId;

        if (!merchantId) {
            return res.status(400).json({ error: 'merchantId não fornecido pelo Google.' });
        }

        // ==========================================
        // AÇÃO 1: VALIDAÇÃO DO CARRINHO (CheckAvailability)
        // ==========================================
        if (action === 'checkAvailability') {
            // MVP: Por padrão, aprovamos a disponibilidade. 
            // Futuramente, você pode cruzar o payload.cart.items com o Firestore para checar estoque real.
            return res.status(200).json({
                status: 'AVAILABLE',
                reason: 'Itens validados e disponíveis no catálogo.'
            });
        }

        // ==========================================
        // AÇÃO 2: RECEBIMENTO DO PEDIDO PAGO (SubmitOrder)
        // ==========================================
        if (action === 'submitOrder') {
            // Estruturação do documento no padrão Velo Delivery
            const orderData = {
                storeId: merchantId, // Associa o pedido à Conveniência Santa Isabel
                source: 'google_food_marketplace', // Tag para métricas e painel
                googleOrderId: payload.orderId || 'N/A',
                customer: {
                    name: payload.customer?.name || 'Cliente Google',
                    phone: payload.customer?.phone || '',
                },
                items: payload.cart?.items || [],
                total: payload.cart?.total || 0,
                status: 'pending', // Status inicial para disparar a notificação no painel do lojista
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Inserção na coleção principal de pedidos
            const orderRef = await db.collection('orders').add(orderData);

            // Resposta de sucesso obrigatória para o Google finalizar o fluxo do lado do cliente
            return res.status(200).json({
                status: 'ACCEPTED',
                orderId: orderRef.id, // Retornamos o ID interno gerado pelo Firebase
                message: 'Pedido processado e integrado ao ecossistema Velo.'
            });
        }

        // Caso o Google envie um Action não mapeado
        return res.status(400).json({ error: 'Ação não suportada por este webhook.' });

    } catch (error) {
        console.error('Erro no Webhook do Order with Google:', error);
        return res.status(500).json({ error: `Erro interno: ${error.message}` });
    }
}