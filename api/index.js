import Stripe from 'stripe';
import admin from 'firebase-admin';
// Ajuste o caminho se a pasta lib for diferente!
import { sendWhatsAppNotification } from '../lib/evolution.js';

// ============================================================================
// CONFIGURAÇÃO GLOBAL (NECESSÁRIA PARA O STRIPE WEBHOOK FUNCIONAR)
// Desativa o body parser automático do Vercel/Next.js para lermos os dados "crus"
// ============================================================================
export const config = {
    api: { bodyParser: false },
};

// Função para ler os dados crus (Raw Body)
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks =[];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// Inicializa a Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inicializa o Firebase Admin (Singleton para não dar erro de limite de conexões)
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

// Helper para o Google Order Feed
const generateSlug = (text) => {
    if (!text) return 'produto';
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9 -]/g, '') 
        .replace(/\s+/g, '-') 
        .replace(/-+/g, '-') 
        .replace(/^-+/, '').replace(/-+$/, ''); 
};

// ============================================================================
// INÍCIO DO ROTEADOR CENTRAL (O MAESTRO DA SUA API)
// ============================================================================
export default async function handler(req, res) {
    // Isola o caminho exato ignorando os parâmetros após a interrogação (?)
    const path = req.url.split('?')[0];

    // Ler o corpo da requisição (Raw Body)
    let rawBody = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        rawBody = await getRawBody(req);
    }

    // Se a rota não for o Stripe Webhook, converte o Raw Body para JSON e joga no req.body
    if (rawBody && path !== '/api/stripe-webhook') {
        try {
            req.body = JSON.parse(rawBody);
        } catch (e) {
            req.body = {}; // Fallback se não for um JSON válido
        }
    } else if (!req.body) {
        req.body = {};
    }

    // Garante que req.query funcione perfeitamente
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryParams = Object.fromEntries(urlObj.searchParams);
    req.query = { ...req.query, ...queryParams };


    // ------------------------------------------------------------------------
    // 1. ACTIVATE PIX
    // ------------------------------------------------------------------------
    if (path === '/api/activate-pix') {
        if (req.method !== 'POST') return res.status(405).end();
        try {
            const { stripeConnectId } = req.body;
            if (!stripeConnectId) return res.status(400).json({ error: 'ID da conta Connect não fornecido.' });

            const account = await stripe.accounts.update(stripeConnectId, {
                capabilities: { pix_payments: { requested: true } },
            });
            return res.status(200).json({ success: true, status: account.capabilities.pix_payments, message: "Solicitação de Pix enviada com sucesso!" });
        } catch (error) {
            console.error('Erro ao ativar Pix:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 2. CHECKOUT PRO
    // ------------------------------------------------------------------------
    else if (path === '/api/checkout-pro') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        const { storeId } = req.body;
        if (!storeId) return res.status(400).json({ error: 'ID da loja (storeId) é obrigatório.' });

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'], 
                line_items:[{ price: 'price_1T4gNo6iD1OCwvLcVlQ9q2hW', quantity: 1 }],
                mode: 'subscription',
                success_url: `${req.headers.origin}/admin?fatura=paga`,
                cancel_url: `${req.headers.origin}/admin?fatura=cancelada`,
                client_reference_id: storeId,
                subscription_data: { metadata: { storeId: storeId, type: 'velo_pro_subscription' } }
            });
            return res.status(200).json({ url: session.url });
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 3. CREATE CONNECT ACCOUNT
    // ------------------------------------------------------------------------
    else if (path === '/api/create-connect-account') {
        if (req.method !== 'POST') return res.status(405).end();
        try {
            const { storeId } = req.body;
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'BR',
                capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                metadata: { storeId: storeId }
            });
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: `${req.headers.origin}/admin?stripe_error=true`,
                return_url: `${req.headers.origin}/admin?stripe_connected=${account.id}`,
                type: 'account_onboarding',
            });
            return res.status(200).json({ url: accountLink.url });
        } catch (error) {
            console.error('Erro ao criar conta Connect:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 4. CREATE LOGIN LINK
    // ------------------------------------------------------------------------
    else if (path === '/api/create-login-link') {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        try {
            const { stripeConnectId } = req.body;
            if (!stripeConnectId) return res.status(400).json({ error: 'O ID da conta Stripe é obrigatório.' });
            const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);
            return res.status(200).json({ url: loginLink.url });
        } catch (error) {
            console.error('Erro ao gerar login link:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 5. CRON AUTOMATIONS
    // ------------------------------------------------------------------------
    else if (path === '/api/cron-automations') {
        if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            console.log("⏱️ Iniciando Rotina de Automação de Marketing...");
            const batch = db.batch();
            let alertsSent = 0;
            let reengagementsSent = 0;
            const now = new Date();
            const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);
            
            const abandonedQuery = await db.collection("orders").where("status", "==", "pending").where("abandonmentAlertSent", "!=", true).get();
            const abandonedPromises =[];

            abandonedQuery.forEach(doc => {
                const data = doc.data();
                if (data.createdAt && data.createdAt.toDate() < thirtyMinsAgo && data.customerPhone) {
                    const msg = `🛒 *Esqueceu algo na sacola?*\n\nOlá ${data.customerName || 'Cliente'}! Notamos que você iniciou um pedido, mas não finalizou.\n👉 Para finalizar agora: https://${data.storeId}.velodelivery.com.br/track/${doc.id}`;
                    abandonedPromises.push(sendWhatsAppNotification(data.customerPhone, msg, `Velo_${data.storeId?.toUpperCase()}`));
                    batch.update(doc.ref, { abandonmentAlertSent: true });
                    alertsSent++;
                }
            });

            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60000);
            const inactiveQuery = await db.collectionGroup("loyalty").where("lastPurchaseDate", "<", admin.firestore.Timestamp.fromDate(sevenDaysAgo)).where("reengagementSent", "!=", true).limit(50).get();

            inactiveQuery.forEach(doc => {
                const data = doc.data();
                const phone = doc.ref.parent.parent.id; 
                const storeId = doc.ref.id;
                const msg = `🍻 *Saudades de você!*\n\nOi ${data.customerName}! Faz tempo que você não pede uma bebida com a gente.\nPara matar a sede, aqui vai um cupom de *10% OFF* válido para hoje!\nUse: *VOLTA10*\n👉 https://${storeId}.velodelivery.com.br`;
                abandonedPromises.push(sendWhatsAppNotification(phone, msg, `Velo_${storeId.toUpperCase()}`));
                batch.update(doc.ref, { reengagementSent: true, reengagementDate: admin.firestore.FieldValue.serverTimestamp() });
                reengagementsSent++;
            });

            await Promise.all(abandonedPromises);
            if (alertsSent > 0 || reengagementsSent > 0) await batch.commit();

            return res.status(200).json({ success: true, alertsSent, reengagementsSent });
        } catch (error) {
            console.error('❌ Erro no CRON:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 6. GOOGLE ORDER FEED
    // ------------------------------------------------------------------------
    else if (path === '/api/google-order-feed') {
        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        let storeId = host.split('.')[0]; 
        if (host.includes('localhost') || !storeId) {
            storeId = req.query.store || 'csi';
        }
        if (!storeId) return res.status(400).send('Loja não informada.');
        const feedType = req.query.feed || 'menu';

        try {
            const storeDoc = await db.collection('stores').doc(storeId).get();
            if (!storeDoc.exists) return res.status(404).send('Loja não encontrada no banco.');
            const storeData = storeDoc.data();

            if (feedType === 'merchant') {
                const merchantFeed = {
                    data:[{
                        "@type": "Restaurant", "merchantId": storeId, "name": storeData.name || "Velo Delivery",
                        "telephone": storeData.phone || "+5500000000000",
                        "address": {
                            "streetAddress": storeData.address?.street || "Endereço não informado",
                            "locality": storeData.address?.city || "São José",
                            "region": storeData.address?.state || "SC",
                            "postalCode": storeData.address?.zipcode || "00000-000"
                        }
                    }]
                };
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.status(200).send(JSON.stringify(merchantFeed));
            }

            if (feedType === 'service') {
                const serviceFeed = { data:[{ "@type": "Service", "serviceId": `srv_delivery_${storeId}`, "merchantId": storeId, "serviceType": "DELIVERY" }] };
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.status(200).send(JSON.stringify(serviceFeed));
            }

            const productsSnapshot = await db.collection('products').where('storeId', '==', storeId).get();
            let googleOrderFeed = { data:[] };

            productsSnapshot.forEach(doc => {
                const p = doc.data();
                if (!p.name) return;

                let availability = 'in_stock'; 
                if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
                    if (parseInt(p.stock) <= 0) availability = 'out_of_stock';
                }

                const nomeProduto = p.name.toLowerCase();
                const palavrasProibidas =['cigarro', 'tabaco', 'vape', 'narguile', 'essência', 'essencia', 'palheiro', 'gift'];
                if (palavrasProibidas.some(palavra => nomeProduto.includes(palavra))) return; 

                if (!p.imageUrl || typeof p.imageUrl !== 'string' || !p.imageUrl.startsWith('http')) return; 
                const urlImagem = p.imageUrl.toLowerCase();
                if (urlImagem.includes('.webp') || urlImagem.includes('.svg')) return; 
                
                const finalPrice = Number(p.promotionalPrice) > 0 ? Number(p.promotionalPrice) : Number(p.price || 0);
                const itemMenu = {
                    "@type": "MenuItem", "menuItemId": doc.id,
                    "name":[{ "@type": "TextProperty", "text": p.name, "language": "pt" }],
                    "description":[{ "@type": "TextProperty", "text": p.description || p.name, "language": "pt" }],
                    "price": { "@type": "Price", "price": finalPrice, "currency": "BRL" },
                    "image": [p.imageUrl]
                };
                googleOrderFeed.data.push(itemMenu);
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
            return res.status(200).send(JSON.stringify(googleOrderFeed));

        } catch (error) {
            console.error("Erro no feed:", error);
            res.status(500).send(`Erro interno do servidor: ${error.message}`);
        }
    }

    // ------------------------------------------------------------------------
    // 7. GOOGLE ORDER WEBHOOK
    // ------------------------------------------------------------------------
    else if (path === '/api/google-order-webhook') {
        if (req.method !== 'POST') return res.status(405).send('Método não permitido. Use POST.');
        try {
            const payload = req.body;
            const action = payload.action || payload.intent; 
            const merchantId = payload.merchantId;
            if (!merchantId) return res.status(400).json({ error: 'merchantId não fornecido.' });

            if (action === 'checkAvailability') {
                return res.status(200).json({ status: 'AVAILABLE', reason: 'Itens validados.' });
            }

            if (action === 'submitOrder') {
                const orderData = {
                    storeId: merchantId, 
                    source: 'google_food_marketplace', 
                    googleOrderId: payload.orderId || 'N/A',
                    customer: { name: payload.customer?.name || 'Cliente Google', phone: payload.customer?.phone || '' },
                    items: payload.cart?.items ||[],
                    total: payload.cart?.total || 0,
                    status: 'pending', 
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                const orderRef = await db.collection('orders').add(orderData);
                return res.status(200).json({ status: 'ACCEPTED', orderId: orderRef.id, message: 'Pedido processado.' });
            }
            return res.status(400).json({ error: 'Ação não suportada.' });
        } catch (error) {
            console.error('Erro no Webhook Google:', error);
            return res.status(500).json({ error: `Erro interno: ${error.message}` });
        }
    }

    // ------------------------------------------------------------------------
    // 8. STRIPE WEBHOOK (EXIGE RAW BODY PARA ASSINATURA)
    // ------------------------------------------------------------------------
    else if (path === '/api/stripe-webhook') {
        if (req.method !== 'POST') return res.status(405).end();
        try {
            // Usa a variável rawBody intocada para que a Stripe consiga ler perfeitamente!
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET; 

            const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

            if (event.type === 'checkout.session.completed') {
                const session = event.data.object;
                const orderId = session.client_reference_id;
                const valorTotal = session.amount_total / 100;
                const storeId = session.metadata?.storeId || 'csi'; 

                if (orderId) {
                    const orderSnapshot = await db.collection("orders").doc(orderId).get();
                    const orderData = orderSnapshot.exists ? orderSnapshot.data() : {};
                    const customerPhone = orderData.customerPhone || session.metadata?.customerPhone;
                    const customerName = orderData.customerName || 'Cliente';

                    const batch = db.batch();

                    const orderRef = db.collection("orders").doc(orderId);
                    batch.set(orderRef, {
                        status: 'preparing', 
                        paymentStatus: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    const statsRef = db.collection("stats").doc(storeId);
                    batch.set(statsRef, {
                        faturamentoTotal: admin.firestore.FieldValue.increment(valorTotal),
                        pedidosPagos: admin.firestore.FieldValue.increment(1),
                        comissaoVeloAcumulada: admin.firestore.FieldValue.increment(valorTotal * 0.02)
                    }, { merge: true });

                    let earnedPoints = Math.floor(valorTotal); 
                    if (customerPhone) {
                        const phoneId = String(customerPhone).replace(/\D/g, ''); 
                        const loyaltyRef = db.collection("users").doc(phoneId).collection("loyalty").doc(storeId);
                        batch.set(loyaltyRef, {
                            points: admin.firestore.FieldValue.increment(earnedPoints),
                            customerName: customerName,
                            lastPurchaseDate: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }

                    await batch.commit();
                    console.log(`✅ Pedido ${orderId} atualizado.`);

                    const storeOwnerPhone = process.env.STORE_OWNER_PHONE || '5548991311442';
                    const msgLojista = `🚀 *NOVO PEDIDO PAGO!*\n\n*ID:* ${orderId.slice(-5).toUpperCase()}\n*Valor:* R$ ${valorTotal.toFixed(2)}\n*Cliente:* ${customerName}\n\nO pedido já consta como "Em Preparo" no seu painel.`;
                    await sendWhatsAppNotification(storeOwnerPhone, msgLojista);

                    if (customerPhone) {
                        const msgCliente = `✅ *Pagamento Aprovado!*\n\nOlá ${customerName}, recebemos seu pagamento do pedido *#${orderId.slice(-5).toUpperCase()}*.\n\n👨‍🍳 Já estamos preparando tudo!\n🎁 *Clube VIP:* Você ganhou +${earnedPoints} pontos nesta compra!`;
                        await sendWhatsAppNotification(customerPhone, msgCliente);
                    }
                }
            }
            return res.status(200).json({ received: true });
        } catch (err) {
            console.error('⚠️ Erro no Webhook:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    // ------------------------------------------------------------------------
    // 9. WHATSAPP SEND
    // ------------------------------------------------------------------------
    else if (path === '/api/whatsapp-send') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        const { action, storeId, templateName, toPhone, dynamicParams } = req.body;

        if (!storeId) return res.status(400).json({ error: 'StoreId é obrigatório' });

        try {
            const storeSettingsDoc = await db.collection('settings').doc(storeId).get();
            if (!storeSettingsDoc.exists) return res.status(404).json({ error: 'Configuração não encontrada' });

            const waConfig = storeSettingsDoc.data().integrations?.whatsapp;
            if (!waConfig || !waConfig.phoneNumberId || !waConfig.apiToken) {
                return res.status(400).json({ error: 'WhatsApp não configurado.' });
            }

            const { phoneNumberId, apiToken } = waConfig;
            const GRAPH_API_URL = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

            const sendMessageToMeta = async (recipientPhone, template, languageCode = 'pt_BR') => {
                let cleanPhone = String(recipientPhone).replace(/\D/g, '');
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

                const payload = {
                    messaging_product: "whatsapp", recipient_type: "individual",
                    to: cleanPhone, type: "template",
                    template: { name: template, language: { code: languageCode } }
                };
                const response = await fetch(GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                return { ok: response.ok, data };
            };

            if (action === 'broadcast') {
                if (!templateName) return res.status(400).json({ error: 'Nome do template obrigatório' });
                const ordersSnap = await db.collection('orders').where('storeId', '==', storeId).limit(500).get();
                const uniquePhones = new Set();
                ordersSnap.forEach(doc => { if (doc.data().customerPhone) uniquePhones.add(doc.data().customerPhone); });
                const sendPromises = Array.from(uniquePhones).map(phone => sendMessageToMeta(phone, templateName));
                await Promise.allSettled(sendPromises);
                return res.status(200).json({ success: true, message: `Disparado para ${uniquePhones.size} clientes.` });
            }

            // --- INÍCIO: LÓGICA PARA RESPOSTA LIVRE NO CHAT ---
            if (action === 'chat_reply') {
                if (!toPhone || !dynamicParams?.text) return res.status(400).json({ error: 'Telefone e texto são obrigatórios' });
                
                let cleanPhone = String(toPhone).replace(/\D/g, '');
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

                const payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: cleanPhone,
                    type: "text",
                    text: { body: dynamicParams.text }
                };
                
                const response = await fetch(GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                if(response.ok) {
                    return res.status(200).json({ success: true });
                } else {
                    return res.status(400).json({ error: 'Falha na API Meta', details: data });
                }
            }
            // --- FIM: LÓGICA PARA RESPOSTA LIVRE NO CHAT ---

            return res.status(400).json({ error: 'Ação não reconhecida' });
        } catch (error) {
            console.error('Erro no WhatsApp Send:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    // ------------------------------------------------------------------------
    // 10. WHATSAPP WEBHOOK
    // ------------------------------------------------------------------------
    else if (path === '/api/whatsapp-webhook') {
        const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'SUA_SENHA_SECRETA_WEBHOOK_VELO'; 

        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode && token) {
                if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
                    console.log('WEBHOOK_VERIFIED');
                    return res.status(200).send(challenge);
                } else {
                    return res.status(403).json({ error: 'Token inválido' });
                }
            }
            return res.status(400).json({ error: 'Parâmetros ausentes' });
        }

        if (req.method === 'POST') {
            const body = req.body;
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value;
                        const phoneNumberId = value.metadata?.phone_number_id;

                        if (value.messages && value.messages[0]) {
                            const message = value.messages[0];
                            let messageText = '';
                            if (message.type === 'text') messageText = message.text.body;
                            else if (message.type === 'button') messageText = message.button.text;

                           if (messageText) {
                                try {
                                    // 1. MULTILOJA: Descobrir qual loja é dona deste número do WhatsApp
                                    const settingsSnap = await db.collection('settings')
                                        .where('integrations.whatsapp.phoneNumberId', '==', phoneNumberId)
                                        .limit(1)
                                        .get();
                                    
                                    let storeId = 'desconhecida';
                                    let apiToken = null;
                                    let storeDomain = '';

                                    if (!settingsSnap.empty) {
                                        const storeData = settingsSnap.docs[0].data();
                                        storeId = settingsSnap.docs[0].id;
                                        apiToken = storeData.integrations?.whatsapp?.apiToken;
                                        // Monta o link dinâmico da loja baseado no padrão do Velo
                                        storeDomain = `https://${storeId}.velodelivery.com.br`; 
                                    }

                                    // 2. Salva a mensagem na caixa de entrada (agora atrelada ao storeId)
                                    await db.collection('whatsapp_inbound').add({
                                        storeId: storeId,
                                        phoneNumberId: phoneNumberId, 
                                        from: message.from,
                                        text: messageText,
                                        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                                        status: 'unread'
                                    });

                                    // 3. LÓGICA DO BOT (Executa apenas se achou o token da loja)
                                    const waSettings = settingsSnap.docs[0].data().integrations?.whatsapp || {};
                                    
                                    // Só responde automático se o lojista ativou o botão "Ativar Menu Automático" no painel
                                    if (apiToken && waSettings.botEnabled) {
                                        const incomingText = messageText.trim().toLowerCase();
                                        let replyText = "";

                                        // Textos personalizados pelo lojista (com fallbacks se ele deixar em branco)
                                        const greeting = waSettings.botGreeting || "Olá! 👋 Sou o assistente virtual da loja.\n\nComo posso te ajudar hoje?\n*Digite o número da opção desejada:*";
                                        const opt1 = waSettings.botOption1 || "Fazer um Pedido (Ver Cardápio)";
                                        const opt2 = waSettings.botOption2 || "Falar com um Atendente";

                                        // Árvore de decisão
                                        if (incomingText === "1") {
                                            replyText = `Acesse nosso cardápio digital e faça seu pedido rapidinho por aqui:\n\n👉 ${storeDomain}`;
                                        } else if (incomingText === "2") {
                                            replyText = "Certo! Já chamei um de nossos atendentes. Por favor, aguarde um instante que já vamos te responder por aqui mesmo.";
                                        } else {
                                            // Monta o menu dinâmico
                                            replyText = `${greeting}\n\n*1* - ${opt1}\n*2* - ${opt2}`;
                                        }

                                        // 4. Dispara a resposta automática usando o token específico da loja
                                        await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${apiToken}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                messaging_product: "whatsapp",
                                                recipient_type: "individual",
                                                to: message.from,
                                                type: "text",
                                                text: { body: replyText }
                                            })
                                        });
                                    }
                                } catch (error) { console.error('Erro no processamento da mensagem recebida:', error); }
                            }
                        }
                    }
                }
                return res.status(200).send('EVENT_RECEIVED');
            }
            return res.status(404).send('Not Found');
        }
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ============================================================================
    // ROTA NÃO ENCONTRADA (Fallback de segurança)
    // ============================================================================
    else {
        return res.status(404).json({ error: 'Rota da API não foi encontrada no index.js', requestedPath: path });
    }
}