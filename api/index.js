import Stripe from 'stripe';
import admin from 'firebase-admin';
import Gerencianet from 'gn-api-sdk-node'; // <-- ADICIONADO AQUI
import pathModule from 'path';
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
        const chunks = [];
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
    // 1. Identifica a loja de forma Híbrida (Subdomínio e Custom Domain)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    
    const baseDomain = 'velodelivery.com.br';
    let storeId = 'velo'; // Fallback seguro
    
    if (cleanHost.includes('app.github.dev') || cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1')) {
        const queryStore = req.query.store;
        storeId = queryStore || 'loja-teste';
    } else if (cleanHost.endsWith('.vercel.app')) {
        storeId = cleanHost.split('.')[0];
    } else if (cleanHost === baseDomain) {
        storeId = 'main-app';
    } else if (cleanHost.endsWith(`.${baseDomain}`)) {
        const subdomains = cleanHost.replace(`.${baseDomain}`, '');
        const parts = subdomains.split('.');
        storeId = parts[parts.length - 1];
    } else if (cleanHost !== baseDomain && !cleanHost.endsWith(`.${baseDomain}`)) {
        // Dicionário Híbrido Igual ao do Frontend
        const domainMap = {
            "convenienciasantaisabel.com.br": "csi",
            "csi.com.br": "csi",
            "cowburguer.com.br": "cowburguer",
            "macanudorex.com.br": "macanudorex",
            "ngconveniencia.com.br": "ng"
        };
        storeId = domainMap[cleanHost] || cleanHost.split('.')[0];
    }
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

            // Atualizado para usar o endpoint explícito de Capabilities conforme a Stripe exige para contas Connect
            const capability = await stripe.accounts.updateCapability(
                stripeConnectId,
                'pix_payments',
                { requested: true }
            );
            
            return res.status(200).json({ 
                success: true, 
                status: capability.status, 
                requirements: capability.requirements,
                message: "Solicitação de Pix enviada com sucesso!" 
            });
        } catch (error) {
            console.error('Erro ao ativar Pix:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // ------------------------------------------------------------------------
    // 2. PAGAMENTO DE MENSALIDADE VELO SAAS (MERCADO PAGO)
    // ------------------------------------------------------------------------
    else if (path === '/api/pay-subscription-mp') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        const { storeId, amount } = req.body;
        if (!storeId || !amount) return res.status(400).json({ error: 'Dados incompletos para faturamento.' });

        try {
            // Usa o Token Principal da Plataforma (Conta do Diego)
            const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

            const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [
                        {
                            title: `Fatura Mensal - Velo Delivery (${storeId})`,
                            quantity: 1,
                            unit_price: Number(amount),
                            currency_id: "BRL"
                        }
                    ],
                    back_urls: {
                        success: `${req.headers.origin || `https://${req.headers.host}`}/admin?fatura=paga`,
                        failure: `${req.headers.origin || `https://${req.headers.host}`}/admin?fatura=cancelada`,
                        pending: `${req.headers.origin || `https://${req.headers.host}`}/admin?fatura=pendente`
                    },
                    auto_return: "approved",
                    external_reference: `fatura_saas_${storeId}`, // Marcador para o Webhook identificar depois
                    statement_descriptor: "VELO SAAS",
                    payment_methods: {
                        excluded_payment_types: [{ id: "ticket" }] // Removemos boleto para ser instantâneo
                    }
                })
            });

            const data = await mpResponse.json();

            if (!mpResponse.ok) {
                console.error("Erro ao gerar fatura MP:", data);
                return res.status(400).json({ error: "Erro ao gerar pagamento da fatura." });
            }

            return res.status(200).json({ url: data.init_point });
        } catch (error) {
            console.error('Erro no faturamento SaaS:', error);
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
            // 1. Cria a conta base na Stripe
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'BR',
                capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                metadata: { storeId: storeId }
            });

            // 2. Chama a API de Capabilities separadamente para injetar a permissão do PIX
            try {
                await stripe.accounts.updateCapability(
                    account.id,
                    'pix_payments',
                    { requested: true }
                );
                console.log(`[Stripe Connect] Capability pix_payments solicitada para ${account.id}`);
            } catch (pixError) {
                // Logamos o erro da capability mas não travamos a criação da conta
                console.error(`[Stripe Connect] Falha ao solicitar pix_payments para ${account.id}:`, pixError.message);
            }

            // 3. Gera o link de onboarding
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
    // 5. CRON AUTOMATIONS (ROBÔ DE RESGATE, RETENÇÃO E FATURAMENTO)
    // ------------------------------------------------------------------------
    else if (path === '/api/cron-automations') {
        // Como você usa o cron-job.org, não vamos bloquear com erro 401 se faltar o Header, 
        // apenas damos um aviso interno para o robô continuar rodando.
        const authHeader = req.headers['authorization'];
        if (req.headers['user-agent'] !== 'Vercel Cron' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.warn("Aviso: Cron rodado sem token. Executando via cron-job.org.");
        }

        try {
            console.log("⏱️ Iniciando Rotina de Automação e Faturamento...");
            const batch = db.batch();
            
            // --- INÍCIO: MOTOR DE FATURAMENTO AUTOMÁTICO (ROLLING BILLING) ---
            const brazilTime = new Date(new Date().getTime() - 3 * 3600 * 1000); // Fuso UTC-3
            const todayDay = brazilTime.getDate();
            let faturasGeradas = 0;

            const storesQuery = await db.collection('stores').get();
            
            for (const storeDoc of storesQuery.docs) {
                const storeData = storeDoc.data();
                if (!storeData.createdAt) continue;

                // BLINDAGEM DE DATAS: Aceita Timestamp do Firebase ou Texto (String ISO)
                let dataCriacao;
                if (storeData.createdAt && typeof storeData.createdAt.toDate === 'function') {
                    dataCriacao = storeData.createdAt.toDate();
                } else {
                    dataCriacao = new Date(storeData.createdAt);
                }

                if (isNaN(dataCriacao)) continue;

                const diaVencimento = dataCriacao.getDate();

                // Hoje é o aniversário do ciclo da loja?
                if (diaVencimento === todayDay) {
                    const nomeMesAno = brazilTime.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    const faturas = storeData.faturasHistorico || [];
                    const faturaJaExiste = faturas.some(f => f.month.toLowerCase() === nomeMesAno.toLowerCase() && f.isAuto);
                    
                    if (!faturaJaExiste) {
                        const startOfCycle = new Date(brazilTime.getFullYear(), brazilTime.getMonth() - 1, diaVencimento);
                        const endOfCycle = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), diaVencimento);

                        const ordersSnap = await db.collection('orders').where('storeId', '==', storeDoc.id).get();
                        
                        const ordersCount = ordersSnap.docs.filter(d => {
                            const oData = d.data();
                            if (oData.status === 'canceled') return false;
                            
                            // Blindagem de data nos pedidos também
                            let dt;
                            if (oData.createdAt && typeof oData.createdAt.toDate === 'function') {
                                dt = oData.createdAt.toDate();
                            } else {
                                dt = new Date(oData.createdAt || 0);
                            }
                            return dt >= startOfCycle && dt < endOfCycle;
                        }).length;
                        
                        const extraOrders = Math.max(0, ordersCount - 100);
                        const extraCost = extraOrders * 0.25;
                        const isCortesia = storeData.billingStatus === 'gratis_vitalicio';
                        
                        // Mantém o valor cheio para o Extrato riscar e gerar a sensação de Economia
                        const totalFatura = 49.90 + extraCost;
                        const statusFatura = isCortesia ? 'ISENTO' : 'PENDENTE';

                        const novaFatura = {
                            id: `cron_${brazilTime.getTime()}`,
                            month: nomeMesAno,
                            amount: `R$ ${totalFatura.toFixed(2).replace('.', ',')}`,
                            status: statusFatura,
                            dueDate: endOfCycle.toISOString(),
                            createdAt: brazilTime.toISOString(),
                            isAuto: true,
                            breakdown: {
                                basePlan: 49.90,
                                extraOrdersCost: extraCost,
                                discount: isCortesia ? (49.90 + extraCost) : 0
                            }
                        };

                        const updateData = { faturasHistorico: admin.firestore.FieldValue.arrayUnion(novaFatura) };
                        
                        if (!isCortesia && storeData.billingStatus !== 'teste' && storeData.billingStatus !== 'bloqueado') {
                            updateData.billingStatus = 'pendente';
                        }

                        batch.update(storeDoc.ref, updateData);
                        faturasGeradas++;
                    }
                }
            }
            console.log(`✅ Motor de Faturamento: ${faturasGeradas} faturas fechadas hoje.`);
            // --- FIM: MOTOR DE FATURAMENTO AUTOMÁTICO ---

            let alertsSent = 0;
            const now = new Date();
            const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000); 
            
            const abandonedQuery = await db.collection("abandoned_carts").where("status", "==", "abandoned").get();
            const abandonedPromises = [];

            for (const doc of abandonedQuery.docs) {
                const data = doc.data();
                if (data.lastUpdated && data.lastUpdated.toDate() < thirtyMinutesAgo && data.customerPhone) {
                    const storeId = data.storeId;
                    if (data.abandonmentAlertSent === true) continue;
                    
                    const storeSettingsDoc = await db.collection('settings').doc(storeId).get();
                    const settingsData = storeSettingsDoc.data() || {};
                    const waConfig = settingsData.integrations?.whatsapp;
                    
                    if (waConfig && waConfig.phoneNumberId && waConfig.apiToken && waConfig.autoAbandonedCart) {
                        const GRAPH_API_URL = `https://graph.facebook.com/v19.0/${waConfig.phoneNumberId}/messages`;
                        
                        // BLINDAGEM VELO CRON: Regra Oficial do 9º Dígito para a Meta
                        let rawPhone = String(data.customerPhone).replace(/\D/g, '');
                        if (rawPhone.startsWith('55')) rawPhone = rawPhone.substring(2);
                        
                        // Se for DDD > 30 e tiver 11 dígitos (com o 9), removemos o 9.
                        if (rawPhone.length === 11 && parseInt(rawPhone.substring(0, 2)) > 30) {
                            rawPhone = rawPhone.substring(0, 2) + rawPhone.substring(3); 
                        }
                        let cleanPhone = `55${rawPhone}`;

                        const cupom = settingsData.exitIntentCoupon || "VOLTA10";
                        const firstName = data.customerName ? data.customerName.split(' ')[0] : 'Cliente';
                        const msg = `Bateu aquela fome (ou sede), ${firstName}? 🤤\n\nSeu carrinho na nossa loja está quase esfriando! Para não te deixar passar vontade, acabei de liberar um cupom exclusivo para você finalizar seu pedido agora com *10% OFF*!\n\nUse o cupom: *${cupom}*\n👉 Clique e finalize: https://${storeId}.velodelivery.com.br`;
                        
                        abandonedPromises.push(
                            fetch(GRAPH_API_URL, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${waConfig.apiToken}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    messaging_product: "whatsapp", recipient_type: "individual", to: cleanPhone, type: "text", text: { body: msg }
                                })
                            }).then(async (res) => {
                                if (res.ok) {
                                    try {
                                        await db.collection('whatsapp_inbound').add({
                                            storeId: storeId, to: cleanPhone, text: msg,
                                            receivedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'read', direction: 'outbound'
                                        });
                                    } catch(e) {}
                                }
                            })
                        );
                        
                        batch.update(doc.ref, { abandonmentAlertSent: true });
                        alertsSent++;
                    }
                }
            }

            await Promise.all(abandonedPromises);
            
            if (alertsSent > 0 || faturasGeradas > 0) {
                await batch.commit();
            }

            return res.status(200).json({ success: true, alertsSent, faturasGeradas });
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
                    data: [{
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
                // Monta o link dinâmico da loja baseado no padrão do Velo
                // Ex: https://csi.velodelivery.com.br
                const storeUrl = `https://${host}`; 

                const serviceFeed = { 
                    data: [{ 
                        "@type": "Service", 
                        "serviceId": `srv_delivery_${storeId}`, 
                        "merchantId": storeId, 
                        "serviceType": "DELIVERY",
                        // --- INÍCIO: AJUSTE PLANO B (REDIRECT) ---
                        // Dita para o Google enviar o cliente para o site da loja, não para o checkout nativo.
                        "orderUrl": { 
                            "@type": "OrderUrl", 
                            "url": storeUrl // Redireciona para o site oficial (ex: https://csi.velodelivery.com.br)
                        }
                        // --- FIM: AJUSTE PLANO B (REDIRECT) ---
                    }] 
                };
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.status(200).send(JSON.stringify(serviceFeed));
            }

            const productsSnapshot = await db.collection('products').where('storeId', '==', storeId).get();
            let googleOrderFeed = { data: [] };

            productsSnapshot.forEach(doc => {
    const p = doc.data();
    if (!p.name) return;
    
    // 🚨 TRAVA DE PRODUTO PAUSADO: Oculta do Google
    if (p.isActive === false) return;

                let availability = 'in_stock'; 
                if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
                    if (parseInt(p.stock) <= 0) availability = 'out_of_stock';
                }

                const nomeProduto = p.name.toLowerCase();
                const palavrasProibidas = ['cigarro', 'tabaco', 'vape', 'narguile', 'essência', 'essencia', 'palheiro', 'gift'];
                if (palavrasProibidas.some(palavra => nomeProduto.includes(palavra))) return; 

                if (!p.imageUrl || typeof p.imageUrl !== 'string' || !p.imageUrl.startsWith('http')) return; 
                const urlImagem = p.imageUrl.toLowerCase();
                if (urlImagem.includes('.webp') || urlImagem.includes('.svg')) return; 
                
                const finalPrice = Number(p.promotionalPrice) > 0 ? Number(p.promotionalPrice) : Number(p.price || 0);
                const itemMenu = {
                    "@type": "MenuItem", "menuItemId": doc.id,
                    "name": [{ "@type": "TextProperty", "text": p.name, "language": "pt" }],
                    "description": [{ "@type": "TextProperty", "text": p.description || p.name, "language": "pt" }],
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
                    items: payload.cart?.items || [],
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

            const sendMessageToMeta = async (recipientPhone, template, languageCode = 'pt_BR', variables = []) => {
                // BLINDAGEM VELO: Garante que o telefone tenha 55 e trate o nono dígito para a Meta
                let cleanPhone = String(recipientPhone).replace(/\D/g, '');
                if (cleanPhone.startsWith('55')) cleanPhone = cleanPhone.substring(2);
                if (cleanPhone.length === 10) cleanPhone = cleanPhone.substring(0, 2) + '9' + cleanPhone.substring(2);
                cleanPhone = `55${cleanPhone}`;

                const payload = {
                    messaging_product: "whatsapp", 
                    recipient_type: "individual",
                    to: cleanPhone, 
                    type: "template",
                    template: { 
                        name: template, 
                        language: { code: languageCode } 
                    }
                };

                // INJEÇÃO SEGURA: Adiciona as variáveis dinâmicas no formato exigido pela API da Meta
                if (Array.isArray(variables) && variables.length > 0) {
                    payload.template.components = [
                        {
                            type: "body",
                            parameters: variables.map(v => ({
                                type: "text",
                                text: String(v) // Força String para evitar erros de tipagem com números/booleanos
                            }))
                        }
                    ];
                }

                const response = await fetch(GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                return { ok: response.ok, data };
            };

            if (action === 'broadcast') {
                const templateVariables = req.body.variables || []; // Captura variáveis dinâmicas
                if (!templateName) return res.status(400).json({ error: 'Nome do template obrigatório' });
                
                const ordersSnap = await db.collection('orders').where('storeId', '==', storeId).limit(500).get();
                const uniquePhones = new Set();
                ordersSnap.forEach(doc => { if (doc.data().customerPhone) uniquePhones.add(doc.data().customerPhone); });
                
                // Repassa as variáveis para a função base
                const sendPromises = Array.from(uniquePhones).map(phone => sendMessageToMeta(phone, templateName, 'pt_BR', templateVariables));
                await Promise.allSettled(sendPromises);
                
                return res.status(200).json({ success: true, message: `Disparado para ${uniquePhones.size} clientes.` });
            }

            // --- INÍCIO: ENVIAR TEMPLATE INDIVIDUAL (ABRIR JANELA 24H) ---
            if (action === 'send_template') {
                const templateVariables = req.body.variables || []; // Captura variáveis dinâmicas
                if (!templateName || !toPhone) return res.status(400).json({ error: 'Template e telefone são obrigatórios' });
                
                // Blindagem do número
                let cleanPhone = String(toPhone).replace(/\D/g, '');
                if (cleanPhone.startsWith('55')) cleanPhone = cleanPhone.substring(2);
                if (cleanPhone.length === 10) cleanPhone = cleanPhone.substring(0, 2) + '9' + cleanPhone.substring(2);
                const safePhone = `55${cleanPhone}`;

                // Usa a função sendMessageToMeta atualizada
                const metaResponse = await sendMessageToMeta(safePhone, templateName, 'pt_BR', templateVariables);
                
                if (metaResponse.ok) {
                    // Registra a mensagem no banco para aparecer no painel do lojista (agora mostrando as variáveis também)
                    await db.collection('whatsapp_inbound').add({
                        storeId: storeId,
                        to: safePhone,
                        text: `[Template Oficial Enviado: ${templateName}]${templateVariables.length > 0 ? ` (Vars: ${templateVariables.join(', ')})` : ''}`, 
                        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'read',
                        direction: 'outbound'
                    });
                    return res.status(200).json({ success: true });
                } else {
                    console.error("Erro Meta Template Individual:", metaResponse.data);
                    return res.status(400).json({ error: 'Falha na Meta ao enviar template', details: metaResponse.data });
                }
            }
            // --- FIM: ENVIAR TEMPLATE INDIVIDUAL ---

// --- INÍCIO: ATUALIZAR PERFIL DO WHATSAPP BUSINESS ---
            if (action === 'update_profile') {
                const { address, description, email, website } = req.body;
                
                try {
                    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/whatsapp_business_profile`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            address: address || "",
                            description: description || "",
                            email: email || "",
                            websites: [website || ""]
                        })
                    });
                    
                    const data = await response.json();
                    if(!response.ok) {
                        console.error("❌ Falha na API Meta [update_profile]:", data);
                        return res.status(400).json({ error: 'Falha ao atualizar perfil na Meta', details: data });
                    }
                    return res.status(200).json({ success: true });
                } catch(e) {
                    console.error("❌ Erro interno [update_profile]:", e);
                    return res.status(500).json({ error: 'Erro de conexão com a Meta' });
                }
            }
            // --- FIM: ATUALIZAR PERFIL DO WHATSAPP BUSINESS ---
            // --- INÍCIO: LÓGICA PARA RESPOSTA LIVRE NO CHAT ---
            if (action === 'chat_reply') {
    if (!toPhone) return res.status(400).json({ error: 'Telefone é obrigatório' });
    
    let cleanPhone = String(toPhone).replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

    let textBody = dynamicParams?.text || '';
    let mediaUrl = dynamicParams?.mediaUrl || null;

    // Detecta automaticamente se o texto contém um link de imagem do Cloudinary
    const urlRegex = /(https?:\/\/[^\s]+(?:jpg|jpeg|png|webp|gif|cloudinary\.com[^\s]*))/i;
    const match = textBody.match(urlRegex);

    if (!mediaUrl && match) {
        mediaUrl = match[0];
        // Tira o link do texto para que o texto vire apenas a legenda da imagem
        textBody = textBody.replace(mediaUrl, '').trim(); 
    }

   let mediaType = dynamicParams?.mediaType || 'image';

    let payload;
    if (mediaUrl) {
        payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: mediaType
        };
        payload[mediaType] = { link: mediaUrl };
        if ((mediaType === 'image' || mediaType === 'video' || mediaType === 'document') && textBody) {
            payload[mediaType].caption = textBody;
        }
    } else {
        // Se não tem mídia, manda como texto puro validado
        payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { body: textBody }
        };
    }
    
    const response = await fetch(GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if(response.ok) {
        // Salva corretamente no Firebase para renderizar a miniatura na tela do lojista
        /* IMPORTANTE: Comente a linha abaixo caso o seu frontend (AdminChat.jsx) 
           já esteja salvando no Firebase, para evitar mensagens duplicadas. */
        /*
        await db.collection('whatsapp_inbound').add({
             storeId: storeId, 
             to: cleanPhone, 
             text: textBody,
             mediaUrl: mediaUrl, 
             mediaType: mediaUrl ? 'image' : null,
             receivedAt: admin.firestore.FieldValue.serverTimestamp(), 
             status: 'read', 
             direction: 'outbound'
        });
        */
        return res.status(200).json({ success: true });
    } else {
        console.error("❌ Falha na API Meta [chat_reply]:", data);
        let errorMsg = 'Falha ao enviar mensagem pela Meta.';
        if (data.error && data.error.code === 131047) {
            errorMsg = 'BLOQUEIO DA META: A janela de 24h expirou. Inicie uma nova conversa usando a aba Disparo em Massa.';
        } else if (data.error && data.error.message) {
            errorMsg = data.error.message;
        }
        return res.status(400).json({ error: errorMsg, details: data });
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
    // 10. WHATSAPP WEBHOOK (BOTÕES, HANDOFF E AGENDA DE HORÁRIOS)
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // 10. WHATSAPP WEBHOOK (BOTÕES, HANDOFF E AGENDA DE HORÁRIOS)
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // 10. WHATSAPP WEBHOOK (BOTÕES, HANDOFF E AGENDA DE HORÁRIOS)
    // ------------------------------------------------------------------------
    else if (path === '/api/whatsapp-webhook') {
        const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'SUA_SENHA_SECRETA_WEBHOOK_VELO'; 

        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode && token) {
                if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
                    return res.status(200).send(challenge);
                }
                return res.status(403).json({ error: 'Token inválido' });
            }
            return res.status(400).json({ error: 'Parâmetros ausentes' });
        }

        if (req.method === 'POST') {
            const body = req.body;

            // Função blindada para checar horário e modo férias
            const checkIsStoreOpen = (storeData) => {
                try {
                    if (storeData.isOpen === false) return false; 
                    
                    if (storeData.vacationMode && storeData.vacationMode.active) {
                        const nowTime = new Date().getTime();
                        const startVacation = new Date(storeData.vacationMode.start).getTime();
                        const endVacation = new Date(storeData.vacationMode.end).getTime();
                        if (nowTime >= startVacation && nowTime <= endVacation) return false;
                    }

                    if (!storeData.schedule || Object.keys(storeData.schedule).length === 0) return true;

                    const now = new Date();
                    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                    const brazilTime = new Date(utc - (3600000 * 3)); 

                    const currentHour = brazilTime.getHours();
                    const currentMinute = brazilTime.getMinutes();
                    const currentTimeInt = (currentHour * 60) + currentMinute;
                    const currentDay = brazilTime.getDay(); 

                    const daySchedule = storeData.schedule[currentDay];
                    if (!daySchedule || !daySchedule.open) return false; 

                    const parseTime = (timeStr) => {
                        if (!timeStr) return null;
                        const [h, m] = timeStr.split(':').map(Number);
                        return (h * 60) + m;
                    };

                    const checkShift = (startStr, endStr) => {
                        const start = parseTime(startStr); const end = parseTime(endStr);
                        if (start === null || end === null) return false;
                        if (end < start) { 
                            return currentTimeInt >= start || currentTimeInt <= end;
                        } else { 
                            return currentTimeInt >= start && currentTimeInt <= end;
                        }
                    };

                    const isOpenShift1 = checkShift(daySchedule.start, daySchedule.end);
                    let isOpenShift2 = false;
                    if (daySchedule.splitShift) {
                        isOpenShift2 = checkShift(daySchedule.start2, daySchedule.end2);
                    }

                    return isOpenShift1 || isOpenShift2;
                } catch (error) {
                    console.error("Erro na checagem de horário:", error);
                    return true; 
                }
            };

            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value;
                        const phoneNumberId = value.metadata?.phone_number_id;

                        if (value.messages && value.messages[0]) {
                            const message = value.messages[0];
                            let messageText = '';
                            let interactivePayload = '';
                            const isMedia = ['image', 'audio', 'document', 'video', 'sticker'].includes(message.type);

                            if (message.type === 'text') {
                                messageText = message.text.body;
                            } else if (message.type === 'interactive') {
                                if (message.interactive.type === 'button_reply') {
                                    messageText = message.interactive.button_reply.title;
                                    interactivePayload = message.interactive.button_reply.id;
                                } else if (message.interactive.type === 'list_reply') {
                                    messageText = message.interactive.list_reply.title;
                                    interactivePayload = message.interactive.list_reply.id;
                                }
                            } else if (message.type === 'button') {
                                messageText = message.button.text;
                                interactivePayload = message.button.payload;
                            }

                            if (messageText || isMedia) {
                                try {
                                    if (!phoneNumberId) continue;

                                    let settingsSnap = await db.collection('settings').where('integrations.whatsapp.phoneNumberId', 'in', [String(phoneNumberId), Number(phoneNumberId)]).limit(1).get();
                                    
                                    let storeId = 'desconhecida';
                                    let apiToken = null;
                                    let storeDomain = '';

                                    if (!settingsSnap.empty) {
                                        const storeData = settingsSnap.docs[0].data();
                                        storeId = settingsSnap.docs[0].id;
                                        apiToken = storeData.integrations?.whatsapp?.apiToken;
                                        storeDomain = `https://${storeId}.velodelivery.com.br`; 
                                    }

                                    let logText = messageText || '';
                                    let uploadedMediaUrl = null;
                                    let finalMediaType = null;

                                    if (isMedia) {
                                        finalMediaType = message.type;
                                        const mediaObj = message[finalMediaType];
                                        logText = `[Enviou arquivo: ${finalMediaType}]`;
                                        
                                        // --- INTEGRAÇÃO CLOUDINARY PARA MÍDIA DE CLIENTE ---
                                        if (mediaObj && mediaObj.id && apiToken) {
                                            try {
                                                // 1. Pega a URL temporária da Meta
                                                const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaObj.id}`, {
                                                    headers: { 'Authorization': `Bearer ${apiToken}` }
                                                });
                                                const metaData = await metaRes.json();
                                                
                                                if (metaData.url) {
                                                    // 2. Faz o download do arquivo binário usando o Token
                                                    const rawRes = await fetch(metaData.url, {
                                                        headers: { 'Authorization': `Bearer ${apiToken}` }
                                                    });
                                                    const arrayBuffer = await rawRes.arrayBuffer();
                                                    const buffer = Buffer.from(arrayBuffer);
                                                    const mimeType = rawRes.headers.get('content-type');
                                                    
                                                    // 3. Converte para Base64 para enviar ao Cloudinary via API REST
                                                    const base64Data = buffer.toString('base64');
                                                    const dataUri = `data:${mimeType};base64,${base64Data}`;
                                                    
                                                    // Usa as variáveis de ambiente já configuradas na Vercel
                                                    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                                                    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;

                                                    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            file: dataUri,
                                                            upload_preset: uploadPreset
                                                        })
                                                    });
                                                    
                                                    const cloudData = await cloudRes.json();
                                                    if (cloudData.secure_url) {
                                                        uploadedMediaUrl = cloudData.secure_url;
                                                        // Limpa o texto se tiver imagem, pro painel mostrar só a imagem bonita
                                                        logText = messageText || ''; 
                                                    }
                                                }
                                            } catch (mediaError) {
                                                console.error("Erro ao processar mídia inbound (WhatsApp -> Cloudinary):", mediaError);
                                            }
                                        }
                                    }

                                    if (!messageText && !isMedia) logText = `[Formato não suportado/Ação do cliente: ${message.type}]`;

                                    // 1. SALVA A MENSAGEM NO PAINEL DO LOJISTA COM A MÍDIA!
                                    await db.collection('whatsapp_inbound').add({
                                        storeId: storeId, phoneNumberId: phoneNumberId, from: message.from,
                                        pushName: message.profile?.name || '', text: logText, 
                                        mediaUrl: uploadedMediaUrl, // <--- URL FINAL DO CLOUDINARY
                                        mediaType: finalMediaType,  // <--- TIPO (image, audio, video)
                                        receivedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'unread', direction: 'inbound'
                                    });

                                    let normalizedPhone = String(message.from).replace(/\D/g, '');
                                    if (normalizedPhone.startsWith('55')) normalizedPhone = normalizedPhone.substring(2);
                                    if (normalizedPhone.length === 10) normalizedPhone = normalizedPhone.substring(0, 2) + '9' + normalizedPhone.substring(2);

                                    // 2. VERIFICA SE O BOT ESTÁ PAUSADO PELO LOJISTA
                                    const sessionRef = db.collection('whatsapp_sessions').doc(`${storeId}_${normalizedPhone}`);
                                    const sessionSnap = await sessionRef.get();
                                    let sessionData = sessionSnap.exists ? sessionSnap.data() : { botPaused: false, lastAwaySent: 0 };
                                    
                                    if (sessionData.botPaused) continue; // SE O BOT TÁ PAUSADO, ELE ABORTA AQUI E NÃO MANDA MENU!

                                    let waSettings = !settingsSnap.empty ? settingsSnap.docs[0].data().integrations?.whatsapp || {} : {};
                                    
                                    // 3. LÓGICA DO ROBÔ (SÓ EXECUTA SE O BOT TIVER ATIVO)
                                    if (apiToken) {
                                        let replyPayload = null;
                                        let logTextForPanel = ""; 
                                        let triggerInternalAlert = false; 

                                        const storeDoc = await db.collection('stores').doc(storeId).get();
                                        const isStoreOpen = checkIsStoreOpen(storeDoc.exists ? storeDoc.data() : {});
                                        const incomingTextLower = messageText ? messageText.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                                        const nowMs = Date.now();

                                        // CORREÇÃO: Só envia ausência se a loja estiver FECHADA e a automação estiver ATIVADA.
                                        if (!isStoreOpen && waSettings.autoAwayMessage && (nowMs - (sessionData.lastAwaySent || 0) > 60000)) { 
                                                let firstName = message.profile?.name ? message.profile.name.split(' ')[0] : '';
                                                let nomeFormatado = firstName ? ` ${firstName}` : '';
                                                const awayMsg = waSettings.awayMessageText 
                                                    ? waSettings.awayMessageText.replace('Olá', `Olá${nomeFormatado}`) 
                                                    : `Olá${nomeFormatado}! No momento estamos fechados. 😴\nDeixe sua mensagem e retornaremos assim que abrirmos!`;
                                                    
                                                replyPayload = { type: "text", text: { body: awayMsg } };
                                                logTextForPanel = `🤖 ${awayMsg}`;
                                                await sessionRef.set({ storeId, phone: normalizedPhone, lastAwaySent: nowMs }, { merge: true });
                                            }
                                        else if (isStoreOpen && waSettings.botEnabled) {
                                            
                                            let customerName = message.profile?.name || '';
                                            let lastOrder = null;
                                            
                                            try {
                                                const phoneVariants = [normalizedPhone, `55${normalizedPhone}`, `+55${normalizedPhone}`];
                                                const ordersSnap = await db.collection('orders').where('storeId', '==', storeId).where('customerPhone', 'in', phoneVariants).limit(10).get();

                                                if (!ordersSnap.empty) {
                                                    const ordersList = ordersSnap.docs.map(d => d.data());
                                                    ordersList.sort((a, b) => {
                                                        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                                                        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                                                        return timeB - timeA;
                                                    });
                                                    lastOrder = ordersList[0];
                                                    if (lastOrder && lastOrder.customerName) customerName = lastOrder.customerName.split(' ')[0];
                                                }
                                            } catch (e) { console.error("Ignorando erro de busca", e); }

                                            const greetings = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'eai', 'tudo bem', 'menu', 'opcoes', 'opções'];
                                            const isGreeting = greetings.some(g => incomingTextLower === g || incomingTextLower.startsWith(`${g} `));

                                            const supportKeywords = ['atras', 'demora', 'suporte', 'atendente', 'ajuda', 'humano', 'problema', 'erro', 'errad', 'reclamar', 'faltou', 'frio', 'estragad', 'pessimo', 'ruim'];
                                            const needsSupport = isMedia || interactivePayload === 'btn_support' || supportKeywords.some(kw => incomingTextLower.includes(kw));

                                            const isFaqEndereco = interactivePayload === 'btn_info' || ['onde', 'endereco', 'localiza', 'rua', 'situado', 'cidade', 'bairro fica', 'qual o local'].some(kw => incomingTextLower.includes(kw));
                                            const isFaqPagamento = interactivePayload === 'btn_payment' || ['pagamento', 'cartao', 'pix', 'ticket', 'sodexo', 'vr', 'dinheiro', 'troco', 'maquininha'].some(kw => incomingTextLower.includes(kw));

                                            const isMenuTrigger = interactivePayload === 'btn_menu';
                                            const isOrderWaTrigger = interactivePayload === 'btn_order_wa' || ['cardapio', 'pedir', 'pedido', 'fome', 'burger', 'lanche', 'comprar', 'fazer'].some(kw => incomingTextLower.includes(kw));
                                            const isProductSelection = interactivePayload ? interactivePayload.startsWith('prod_') : false;
                                            const isCartCheckout = interactivePayload === 'btn_checkout_wa';
                                            const isClearCart = interactivePayload === 'btn_clear_cart';

                                            const isStatusTrigger = interactivePayload === 'btn_status' || ['status', 'rastrear', 'meu pedido', 'cade meu', 'saiu', 'chegando'].some(kw => incomingTextLower.includes(kw));
                                            const isRepeatTrigger = interactivePayload === 'btn_repeat' || ['repetir', 'mesmo pedido', 'quero o mesmo'].some(kw => incomingTextLower.includes(kw));

                                            const storeDynamicData = storeDoc.exists ? storeDoc.data() : {};
                                            const storeName = storeDynamicData.name || 'nossa loja';
                                            
                                            // --- CORREÇÃO: PUXA O DOMÍNIO PRÓPRIO DO CLIENTE SE EXISTIR ---
                                            if (storeDynamicData.customDomain) {
                                                storeDomain = `https://${storeDynamicData.customDomain}`;
                                            }
                                            // ---------------------------------------------------------------

                                            const addr = storeDynamicData.address || {};
                                            let storeAddressStr = "nosso endereço principal (veja no link do cardápio)";
                                            if (addr.street || addr.city) {
                                                const streetPart = addr.street ? addr.street.trim() : '';
                                                const cityPart = addr.city ? addr.city.trim() : '';
                                                storeAddressStr = [streetPart, cityPart].filter(Boolean).join(', ');
                                            }

                                            const pm = storeDynamicData.acceptedPayments || {};
const acceptedList = [];

// Lê exatamente o que está marcado no painel Admin (se for indefinido, assume true como padrão)
const isOnlineCard = pm.online !== false;
const isOnlinePix = pm.pix !== false;
const isOfflinePix = pm.offline_pix === true; 
const isCardDelivery = pm.cardDelivery !== false || pm.cardPickup !== false;
const isCashDelivery = pm.cashDelivery !== false || pm.cashPickup !== false;

const hasOnlinePayments = isOnlineCard || isOnlinePix;

if (isOnlineCard) acceptedList.push('💳 Cartão de Crédito (Site)');
if (isOnlinePix) acceptedList.push('⚡ Pix Automático (Site)');
if (isOfflinePix) acceptedList.push('💠 Pix Copia e Cola (Site)');
if (isCardDelivery) acceptedList.push('📠 Maquininha (Débito/Crédito)');
if (isCashDelivery) acceptedList.push('💵 Dinheiro em Espécie');

const paymentsStr = acceptedList.length > 0 ? acceptedList.join('\n') : 'Consulte as opções de pagamento no fechamento do seu pedido.';

                                            const generateMainMenu = () => {
                                                let greetingText = waSettings.botGreeting || "Olá! 👋 Que bom ter você por aqui.";
                                                if (customerName) greetingText = `Olá, *${customerName}*! Bem-vindo(a) de volta à *${storeName}* 👋`;
                                                const safeStoreName = (storeName && storeName.trim() !== '') ? storeName : 'Nossa Loja';
                                                
                                                const menuRows = [];
                                                // 🚨 SÓ ADICIONA A OPÇÃO DE PEDIR NO WHATSAPP SE A LOJA TIVER PAGAMENTO ONLINE
                                                if (hasOnlinePayments) {
                                                    menuRows.push({ id: "btn_order_wa", title: "🛒 Pedir por aqui", description: "Ver lista de produtos" });
                                                }
                                                // Adiciona as opções padrão
                                                menuRows.push(
                                                    { id: "btn_menu", title: "🌐 Pedir pelo Site", description: "Acessar cardápio completo" },
                                                    { id: "btn_repeat", title: "🔄 Repetir Pedido", description: "Ver seu último pedido" },
                                                    { id: "btn_status", title: "🚚 Status do Pedido", description: "Rastrear seu pacote" },
                                                    { id: "btn_info", title: "📍 Local e Horário", description: "Onde ficamos" },
                                                    { id: "btn_payment", title: "💳 Formas de Pagto", description: "Pix, Cartão, Dinheiro" },
                                                    { id: "btn_support", title: "👩‍💻 Falar Atendente", description: "Dúvidas ou problemas" }
                                                );

                                                return {
                                                    type: "interactive",
                                                    interactive: {
                                                       type: "list",
                                                        header: { type: "text", text: "Menu" },
                                                        body: { text: `${greetingText}\n\nSelecione uma das opções abaixo:` },
                                                        footer: { text: "Toque no botão para abrir as opções 👇" },
                                                        action: {
                                                            button: "Abrir Menu",
                                                            sections: [{
                                                                title: safeStoreName.substring(0, 24), 
                                                                rows: menuRows
                                                            }]
                                                        }
                                                    }
                                                };
                                            };

                                            // Helper para tratar o nome do cliente de forma amigável
                                            const firstName = customerName ? customerName.split(' ')[0] : '';
                                            const nomeOuVazio = firstName ? `, *${firstName}*` : '';
                                            const nomeOuAmigo = firstName ? ` *${firstName}*` : ' *amigo(a)*';

                                            // 2. AVALIAÇÃO LÓGICA (A ORDEM IMPORTA PARA NÃO TRAVAR)
                                            if (needsSupport) {
                                                const supportMsg = `Poxa${nomeOuVazio}, vi que você precisa de uma ajudinha por aqui! 👩‍💻\n\nJá chamei a nossa equipe e alguém real vai te responder em instantes para resolver isso da melhor forma possível, tá bom? Só um minutinho!`;
                                                replyPayload = { type: "text", text: { body: supportMsg } };
                                                logTextForPanel = `🤖 [Transbordo] ${supportMsg}`;
                                                triggerInternalAlert = true;
                                                await sessionRef.set({ storeId, phone: normalizedPhone, botPaused: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                                            } 
                                            else if (isGreeting) {
                                                replyPayload = generateMainMenu();
                                                logTextForPanel = `🤖 [Menu de Boas Vindas Enviado para ${firstName || 'Cliente'}]`;
                                            }
                                            else if (isStatusTrigger) {
                                                if (lastOrder) {
                                                    const orderTime = lastOrder.createdAt?.toDate ? lastOrder.createdAt.toDate() : new Date(lastOrder.createdAt?.seconds * 1000 || Date.now());
                                                    const diffMin = Math.floor((Date.now() - orderTime) / 60000);
                                                    const statusMap = { 'pending': '⏳ Aguardando Confirmação', 'preparing': '👨‍🍳 Sendo Preparado', 'delivery': '🏍️ Saiu para Entrega!', 'completed': '✅ Entregue', 'canceled': '❌ Cancelado' };
                                                    const statusMsg = `🔍 *Status do seu último pedido${nomeOuVazio}:*\n\n*ID:* #${lastOrder.id ? lastOrder.id.slice(-5).toUpperCase() : 'N/A'}\n*Status Atual:* ${statusMap[lastOrder.status] || lastOrder.status}\n*Tempo corrido:* ${diffMin} minutos.\n\nSe precisar de ajuda com ele, é só selecionar a opção *Falar Atendente*.`;
                                                    replyPayload = { type: "text", text: { body: statusMsg } };
                                                    logTextForPanel = `🤖 [Rastreio] ${statusMsg}`;
                                                } else {
                                                    const statusMsg = `Hmm${nomeOuVazio}, não consegui encontrar nenhum pedido recente vinculado ao seu número. 🧐\n\nVocê fez o pedido com outro telefone? Se precisar, selecione *Falar Atendente* no menu para falar com a equipe.`;
                                                    replyPayload = { type: "text", text: { body: statusMsg } };
                                                    logTextForPanel = `🤖 [Rastreio Não Encontrado para ${firstName || 'Cliente'}]`;
                                                }
                                            }
                                            else if (isRepeatTrigger) {
                                                if (lastOrder && lastOrder.items && lastOrder.items.length > 0) {
                                                    const orderItemsStr = lastOrder.items.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n');
                                                    const repeatMsg = `🍔 *Seu Último Pedido${nomeOuVazio}:*\n\n${orderItemsStr}\n\n*Total:* R$ ${Number(lastOrder.total).toFixed(2)}\n\nBateu aquela fome de novo? 🤤\nPara repetir esse pedido agora mesmo, é só clicar no link do nosso cardápio e adicionar os itens:\n👉 ${storeDomain}`;
                                                    replyPayload = { type: "text", text: { body: repeatMsg } };
                                                    logTextForPanel = `🤖 [Repetir Pedido] ${repeatMsg}`;
                                                } else {
                                                    const repeatMsg = `Hmm${nomeOuVazio}, não consegui encontrar nenhum pedido recente no seu histórico. 🧐\n\nQue tal dar uma olhadinha no nosso cardápio e escolher algo gostoso agora?\n👉 ${storeDomain}`;
                                                    replyPayload = { type: "text", text: { body: repeatMsg } };
                                                    logTextForPanel = `🤖 [Repetir Pedido Não Encontrado para ${firstName || 'Cliente'}]`;
                                                }
                                            }
                                            else if (isFaqEndereco) {
                                                const faqMsg = `📍 *Nossa Localização e Horário${nomeOuVazio}:*\n${storeAddressStr}\n\nLembrando que você pode fazer seu pedido para entrega ou retirada direto pelo nosso site:\n👉 ${storeDomain}`;
                                                replyPayload = { type: "text", text: { body: faqMsg } };
                                                logTextForPanel = `🤖 [FAQ Endereço] ${faqMsg}`;
                                            }
                                            else if (isFaqPagamento) {
                                                const faqMsg = `💳 *Formas de Pagamento Aceitas${nomeOuVazio}:*\n\n${paymentsStr}\n\nVocê seleciona a melhor opção no final do pedido pelo site!\n👉 ${storeDomain}`;
                                                replyPayload = { type: "text", text: { body: faqMsg } };
                                                logTextForPanel = `🤖 [FAQ Pagamento] ${faqMsg}`;
                                            }
                                            else if (isMenuTrigger) {
                                                const menuMsg = `Que ótimo${nomeOuAmigo}! Acesse nosso cardápio digital completo e faça seu pedido rápido por aqui:\n\n👉 ${storeDomain}`;
                                                replyPayload = { type: "text", text: { body: menuMsg } };
                                                logTextForPanel = `🤖 [Link Cardápio] ${menuMsg}`;
                                            } 
                                            else if (isOrderWaTrigger) {
                                                const productsSnap = await db.collection('products').where('storeId', '==', storeId).where('isActive', '==', true).limit(10).get();
                                                if (productsSnap.empty) {
                                                    const emptyMsg = `Poxa${nomeOuVazio}, no momento não temos produtos cadastrados para venda direta por aqui. 😔\n\nPor favor, acesse nosso site:\n👉 ${storeDomain}`;
                                                    replyPayload = { type: "text", text: { body: emptyMsg } };
                                                    logTextForPanel = `🤖 [Catálogo Vazio para ${firstName || 'Cliente'}]`;
                                                } else {
                                                    const productRows = productsSnap.docs.map(doc => {
                                                        const p = doc.data();
                                                        const price = p.promotionalPrice > 0 ? p.promotionalPrice : (p.price || 0);
                                                        const descFormatada = `R$ ${Number(price).toFixed(2)} - ${p.description ? p.description.substring(0, 40) : 'Adicionar'}`;
                                                        return { id: `prod_${doc.id}`, title: (p.name || 'Produto').substring(0, 24), description: descFormatada.substring(0, 72) };
                                                    });
                                                    replyPayload = {
                                                        type: "interactive",
                                                        interactive: {
                                                            type: "list",
                                                            header: { type: "text", text: "🛍️ Cardápio Rápido" },
                                                            body: { text: `${firstName ? `Certo, *${firstName}*! ` : ''}Selecione o produto abaixo.\n\n*Não achou o que queria?*\nÉ só digitar o nome do produto (ex: 'Coca-cola', 'Burger') que eu busco para você!` },
                                                            footer: { text: "Toque abaixo para ver os destaques" },
                                                            action: { button: "Ver Destaques", sections: [{ title: "Mais Vendidos", rows: productRows }] }
                                                        }
                                                    };
                                                    logTextForPanel = `🤖 [Enviou Catálogo Nativo WhatsApp para ${firstName || 'Cliente'}]`;
                                                }
                                            }
                                            else if (incomingTextLower.length > 2 && !isProductSelection && !isCartCheckout && !isClearCart) {
                                                const searchSnap = await db.collection('products').where('storeId', '==', storeId).where('isActive', '==', true).get();
                                                
                                                if (!searchSnap.empty) {
                                                    const wordsToIgnore = ['um', 'uma', 'dois', 'duas', 'quero', 'tem', 'gostaria', 'de', 'do', 'da', 'por', 'favor', 've', 'manda', 'veja', 'gosto', 'queria', 'preciso'];
                                                    const searchWords = incomingTextLower.split(' ').filter(w => w.length > 2 && !wordsToIgnore.includes(w));

                                                    const searchResults = searchSnap.docs.filter(doc => {
                                                        const pData = doc.data();
                                                        const pName = (pData.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                        const pCat = (pData.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                        if (searchWords.length === 0) return false;
                                                        return searchWords.some(word => pName.includes(word) || pCat.includes(word));
                                                    }).slice(0, 10); 
                                                    
                                                    if (searchResults.length > 0) {
                                                        const searchRows = searchResults.map(doc => {
                                                            const p = doc.data();
                                                            const price = p.promotionalPrice > 0 ? p.promotionalPrice : (p.price || 0);
                                                            const descFormatada = `R$ ${Number(price).toFixed(2)} - ${p.description ? p.description.substring(0, 40) : 'Adicionar'}`;
                                                            return { id: `prod_${doc.id}`, title: (p.name || 'Produto').substring(0, 24), description: descFormatada.substring(0, 72) };
                                                        });
                                                        replyPayload = {
                                                            type: "interactive",
                                                            interactive: {
                                                                type: "list",
                                                                header: { type: "text", text: "🔍 Resultado da Busca" },
                                                                body: { text: `Encontrei ${searchResults.length} produto(s) para você${nomeOuVazio}! 👇` },
                                                                footer: { text: "Toque abaixo para escolher" },
                                                                action: { button: "Ver Resultados", sections: [{ title: "Produtos Encontrados", rows: searchRows }] }
                                                            }
                                                        };
                                                        logTextForPanel = `🤖 [Busca WhatsApp: Encontrou ${searchResults.length} produtos]`;
                                                    } else {
                                                        replyPayload = { type: "text", text: { body: `Poxa${nomeOuVazio}, não consegui encontrar nenhum produto com esse nome no nosso estoque. 😕\n\nTente digitar apenas a palavra principal (ex: "Polar", "Bacon", "Coca").` } };
                                                        logTextForPanel = `🤖 [Busca Falhou para: ${messageText}]`;
                                                    }
                                                } else {
                                                    replyPayload = generateMainMenu();
                                                    logTextForPanel = `🤖 [Menu Fallback Enviado]`;
                                                }
                                            } else {
                                                replyPayload = generateMainMenu();
                                                logTextForPanel = `🤖 [Menu Fallback Enviado]`;
                                            }
                                        }

                                        if (replyPayload) {
                                            // 🚨 LÓGICA PARA O LOJISTA LER O TEXTO REAL DO ROBÔ NO PAINEL
                                            let realBotText = logTextForPanel;
if (replyPayload.type === 'text' && replyPayload.text?.body) {
    realBotText = `🤖 ${replyPayload.text.body}`;
} else if (replyPayload.type === 'interactive' && replyPayload.interactive?.body?.text) {
    // Busca todas as opções que foram enviadas na lista ou nos botões
    let opcoesTexto = "\n\n*(Opções enviadas ao cliente)*";
    if (replyPayload.interactive.type === 'list' && replyPayload.interactive.action?.sections) {
        replyPayload.interactive.action.sections.forEach(section => {
            section.rows.forEach(row => {
                opcoesTexto += `\n🔸 ${row.title}`;
            });
        });
    }
    realBotText = `🤖 ${replyPayload.interactive.body.text}${opcoesTexto}`;
}

                                            const fetchPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: message.from, ...replyPayload };

                                            const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                                                method: 'POST', headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify(fetchPayload)
                                            });

                                            if (metaRes.ok) {
                                                const batch = db.batch();
                                                batch.set(db.collection('whatsapp_inbound').doc(), {
                                                    storeId: storeId, phoneNumberId: phoneNumberId, from: message.from, to: message.from, phone: message.from, 
                                                    text: realBotText, receivedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'read', direction: 'outbound'
                                                });
                                                if (triggerInternalAlert) {
                                                    batch.set(db.collection('whatsapp_inbound').doc(), {
                                                        storeId: storeId, phoneNumberId: phoneNumberId, from: message.from, to: message.from, phone: message.from, 
                                                        text: "⚠️ ATENÇÃO: Cliente solicitou suporte ou enviou mídia. Bot pausado para atendimento humano.",
                                                        receivedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'read', direction: 'outbound', isSystemAlert: true
                                                    });
                                                }
                                                await batch.commit();
                                            }
                                        }
                                    }
                                } catch (error) { 
                                    console.error('❌ Erro crítico no processamento do Webhook:', error); 
                                }
                            }
                        }
                    }
                }
                return res.status(200).send('EVENT_RECEIVED');
            }
            return res.status(404).send('Not Found');
        }
        return res.status(405).end();
    }

    // ------------------------------------------------------------------------
    // 11. TOTEM: ACORDAR MAQUININHA (CLOUD POS)
    // ------------------------------------------------------------------------
    else if (path === '/api/pos-payment') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        
        const { storeId, orderId, amount } = req.body;
        if (!storeId || !orderId || !amount) return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });

        try {
            // 1. Busca Token e ID do Dispositivo (Maquininha)
            const settingsDoc = await db.collection('settings').doc(storeId).get();
            const mpConfig = settingsDoc.data()?.integrations?.mercadopago || {};
            
            if (!mpConfig.accessToken || !mpConfig.posDeviceId) {
                return res.status(400).json({ error: 'Terminal de pagamento físico não configurado para esta loja.' });
            }

            // 2. Dispara a API do Mercado Pago Point para acender a tela da máquina
            const paymentIntentPayload = {
                amount: Math.round(Number(amount) * 100), // A API do MP espera o valor em centavos
                description: `Velo Totem #${orderId.slice(-5)}`,
                payment: {
                    installments: 1,
                    type: "credit_card" // ou deixar dinâmico para credit/debit
                }
            };

            const mpResponse = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${mpConfig.posDeviceId}/payment-intents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mpConfig.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentIntentPayload)
            });

            if (!mpResponse.ok) {
                const mpError = await mpResponse.json();
                console.error("Erro Point API:", mpError);
                return res.status(400).json({ error: 'A maquininha recusou a comunicação ou está offline.', details: mpError });
            }

            const intentData = await mpResponse.json();

            // 3. Salva a intenção no pedido para conferência posterior
            await db.collection('orders').doc(orderId).set({
                paymentIntentId: intentData.id,
                posStatus: 'awaiting_payment'
            }, { merge: true });

            return res.status(200).json({ success: true, message: 'Maquininha ativada com sucesso.', intentId: intentData.id });
        } catch (error) {
            console.error('Erro no Acionamento POS:', error);
            return res.status(500).json({ error: 'Erro interno ao conectar com terminal físico.' });
        }
    }

    // ------------------------------------------------------------------------
    // 12. TOTEM: WEBHOOK DE RETORNO (MERCADO PAGO POINT)
    // ------------------------------------------------------------------------
    else if (path === '/api/pos-webhook') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

        try {
            // O Mercado Pago envia o webhook quando o cliente tira o cartão da máquina
            const { action, data } = req.body;
            
            // Só interessa se a intenção de pagamento mudou de estado
            if (action === 'payment.created' || action === 'payment.updated') {
                const paymentId = data.id;

                // Consulta a API do MP para pegar os dados deste pagamento
                // *Nota: Na produção, o Webhook trará o `external_reference` (nosso orderId).
                // Precisamos procurar o pedido com base no paymentIntentId gerado na rota anterior.
                const ordersRef = db.collection('orders');
                const q = await ordersRef.where('paymentIntentId', '==', paymentId).limit(1).get();

                if (!q.empty) {
                    const orderDoc = q.docs[0];
                    // Atualiza o pedido como pago e concluído para a cozinha imprimir
                    await orderDoc.ref.set({
                        paymentStatus: 'paid',
                        status: 'preparing', // Manda direto pra cozinha/painel
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    
                    console.log(`✅ Totem: Pagamento físico processado no pedido ${orderDoc.id}`);
                }
            }

            return res.status(200).json({ received: true });
        } catch (error) {
            console.error('Erro no POS Webhook:', error);
            return res.status(500).json({ error: 'Erro no processamento do webhook físico.' });
        }
    }
    // ------------------------------------------------------------------------
    // 13. MARKETPLACE CHECKOUT (CLIENTE FINAL PAGANDO COM STRIPE CONNECT)
    // ------------------------------------------------------------------------
    else if (path === '/api/create-marketplace-checkout') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        // Extrai exatamente o que o Frontend (sua imagem) está mandando
        const { 
            items, 
            storeConnectId, 
            customerEmail, 
            shippingFee, 
            discountAmount,
            successUrl,
            cancelUrl,
            orderId
        } = req.body;

        // Validação att usando as variáveis corretas
        if (!storeConnectId || !items || items.length === 0) {
            console.error("Payload Recebido Incompleto:", JSON.stringify(req.body));
            return res.status(400).json({ error: 'Faltam dados do pedido (storeConnectId ou itens).' });
        }

        try {
            // 1. Monta os itens do carrinho para a Stripe
            let line_items = items.map(item => ({
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: item.name,
                        images: item.imageUrl ? [item.imageUrl] : [],
                    },
                    unit_amount: Math.round(item.price * 100), // Stripe exige valor em centavos
                },
                quantity: item.quantity,
            }));

            // 2. Adiciona o Frete como um "item" da compra, se houver
            if (shippingFee > 0) {
                line_items.push({
                    price_data: {
                        currency: 'brl',
                        product_data: { name: 'Taxa de Entrega' },
                        unit_amount: Math.round(shippingFee * 100),
                    },
                    quantity: 1,
                });
            }

            // 3. Adiciona o Desconto (Se houver) como um item negativo na Stripe
            if (discountAmount > 0) {
                 // É importante notar que a Stripe não aceita itens com valor negativo em `line_items`.
                 // A forma correta seria aplicar um `coupon`, mas para simplificar e não exigir a criação 
                 // prévia de cupons na Stripe via API, criamos a Sessão e usamos o `discounts` se você tiver um ID de cupom Stripe.
                 // *ATENÇÃO*: Se a Stripe chiar com isso, a alternativa é abater o desconto do subtotal antes de montar os line_items.
                 
                 // Abordagem Segura (Rateio do desconto no frete ou no total):
                 // Como a Stripe é rígida, vamos pular a adição de item negativo por enquanto, 
                 // assumindo que o total foi reduzido. Se der erro, me avise!
            }

            // 4. Calcula a comissão da plataforma (SaaS)
            const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const totalPedidoRaw = subtotal + Number(shippingFee || 0) - Number(discountAmount || 0);
            const totalPedidoCents = Math.max(100, Math.round(totalPedidoRaw * 100)); // Mínimo de R$ 1,00
            
            // Taxa Velo (5.99% Stripe - Desconto TOTAL do lojista)
            const PLATFORM_FEE_PERCENT = 0.0599; 
            const application_fee_amount = Math.round(totalPedidoCents * PLATFORM_FEE_PERCENT);

            // 5. Cria a Sessão de Checkout na Stripe roteando para a conta Connect
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'pix'], // PIX INSERIDO DE VOLTA PARA TESTE REAL
                line_items: line_items,
                mode: 'payment',
                customer_email: customerEmail || undefined, // Usa o e-mail do cliente se existir
                payment_intent_data: {
                    application_fee_amount: application_fee_amount, // A Velo retém a taxa
                    transfer_data: {
                        destination: storeConnectId, // Vai direto pro Lojista usando o ID que veio no payload
                    },
                },
                success_url: successUrl || `${req.headers.origin}/track/${orderId}?status=success`,
                cancel_url: cancelUrl || `${req.headers.origin}/checkout?status=cancelled`,
                metadata: {
                    orderId: orderId,
                    storeConnectId: storeConnectId
                },
            });

            return res.status(200).json({ url: session.url, id: session.id });
        } catch (error) {
            console.error('Erro ao gerar Stripe Checkout (Marketplace):', error);
            return res.status(500).json({ error: error.message });
        }
    }
    // ------------------------------------------------------------------------
    // 14. MERCADO PAGO CONNECT (OAUTH CALLBACK)
    // ------------------------------------------------------------------------
    else if (path === '/api/mp-callback') {
        if (req.method !== 'GET') return res.status(405).end();
        
        const { code, state } = req.query; // 'state' contém o nosso storeId!
        
        if (!code || !state) {
            return res.status(400).send("Faltam parâmetros do Mercado Pago (code ou state).");
        }

        try {
            const storeId = state;
            const isLocal = req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1');
            
            // IMPORTANTE: Esta URL deve ser estritamente igual à enviada no Admin.jsx
            const redirectUri = isLocal 
                ? 'http://localhost:3000/api/mp-callback' 
                : 'https://app.velodelivery.com.br/api/mp-callback'; // Ajuste para seu domínio principal, se for outro

            // 1. Chama o Mercado Pago para trocar o 'code' pelo 'access_token'
            const mpResponse = await fetch('https://api.mercadopago.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: process.env.MP_CLIENT_ID,
                    client_secret: process.env.MP_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri
                })
            });

            const data = await mpResponse.json();

            if (!mpResponse.ok) {
                console.error("❌ Erro OAuth MP:", data);
                return res.status(400).send(`Erro ao gerar token no Mercado Pago: ${data.message || 'Desconhecido'}`);
            }

            // 2. Salva as credenciais do Lojista no Firebase
            await db.collection('settings').doc(storeId).set({
                integrations: {
                    mercadopago: {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        publicKey: data.public_key,
                        userId: data.user_id,
                        expiresIn: data.expires_in,
                        connectedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }
            }, { merge: true });

            // 3. Redireciona o lojista de volta para o painel com sucesso
            const protocol = isLocal ? 'http' : 'https';
            // Pega o domínio atual exato para não quebrar em caso de múltiplos subdomínios
            const returnHost = `${protocol}://${req.headers.host}`; 
            
            res.writeHead(302, { Location: `${returnHost}/admin?mp_connected=true` });
            res.end();

        } catch (error) {
            console.error('❌ Erro na rota mp-callback:', error);
            return res.status(500).send('Erro interno ao processar callback do Mercado Pago.');
        }
    }
   // ------------------------------------------------------------------------
    // 15. MERCADO PAGO CHECKOUT (CLIENTE FINAL PAGANDO VIA MP)
    // ------------------------------------------------------------------------
    else if (path === '/api/create-mp-checkout') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        const { items, storeId, orderId, customerEmail, shippingFee, discountAmount, successUrl, cancelUrl } = req.body;

        if (!storeId || !items || items.length === 0) {
            return res.status(400).json({ error: 'Faltam dados do pedido.' });
        }

        try {
            // 1. Busca o Access Token do Lojista de forma SEGURA no Banco de Dados
            const settingsDoc = await db.collection('settings').doc(storeId).get();
            const mpConfig = settingsDoc.data()?.integrations?.mercadopago;

            if (!mpConfig || !mpConfig.accessToken) {
                return res.status(400).json({ error: 'Mercado Pago não está configurado nesta loja.' });
            }

            // 2. Calcula Totais
            const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const totalPedido = subtotal + Number(shippingFee || 0) - Number(discountAmount || 0);
            
            // 3. O MP não aceita itens com valor negativo. 
            // Se houver desconto, enviamos o pacote fechado como um item único para evitar bugs.
            let mpItems = [];
            if (Number(discountAmount) > 0) {
                mpItems =[{
                    title: `Pedido #${orderId.slice(-5).toUpperCase()} - Velo Delivery`,
                    quantity: 1,
                    unit_price: Number(totalPedido.toFixed(2)),
                    currency_id: "BRL"
                }];
            } else {
                mpItems = items.map(item => ({
                    title: item.name,
                    picture_url: item.imageUrl || undefined,
                    quantity: item.quantity,
                    unit_price: Number(Number(item.price).toFixed(2)),
                    currency_id: "BRL"
                }));

                if (Number(shippingFee) > 0) {
                    mpItems.push({
                        title: "Taxa de Entrega",
                        quantity: 1,
                        unit_price: Number(Number(shippingFee).toFixed(2)),
                        currency_id: "BRL"
                    });
                }
            }

           // 4. Calcula a comissão da Velo no MP (Taxa de 4,99% garantida no Painel Admin)
            // Desta forma, ancoramos o VeloPay (3,99%) como a opção mais barata
            const marketplaceFee = Number((totalPedido * 0.0499).toFixed(2));

            // 5. Cria a Preferência de Pagamento na API do Mercado Pago
            const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mpConfig.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: mpItems,
                    payer: {
                        email: customerEmail || 'cliente@email.com'
                    },
                    back_urls: {
                        success: successUrl || `https://${req.headers.host}/track/${orderId}?status=success`,
                        failure: cancelUrl || `https://${req.headers.host}/checkout?status=cancelled`,
                        pending: successUrl || `https://${req.headers.host}/track/${orderId}?status=pending`
                    },
                    auto_return: "approved",
                    external_reference: orderId, // CRÍTICO: Usado para o webhook saber qual pedido foi pago
                    notification_url: `https://${req.headers.host}/api/mp-webhook?store=${storeId}`, // 🚨 BLINDAGEM: Força o MP a avisar o domínio atual!
                    marketplace_fee: marketplaceFee > 0 ? marketplaceFee : undefined, // Split de pagamento
                    statement_descriptor: "VELO DELIVERY",
                    payment_methods: {
                        excluded_payment_types:[
                            { id: "ticket" } // Remove boleto, focando em PIX e Cartão para delivery
                        ],
                        installments: 3
                    }
                })
            });

            const data = await mpResponse.json();

            if (!mpResponse.ok) {
                console.error("❌ Erro MP Preference:", data);
                return res.status(400).json({ error: "Erro ao gerar pagamento no Mercado Pago.", details: data });
            }

            // Retorna a URL de checkout gerada pelo MP
            return res.status(200).json({ url: data.init_point, id: data.id });

        } catch (error) {
            console.error('❌ Erro ao gerar MP Checkout:', error);
            return res.status(500).json({ error: error.message });
        }
    }
    // ------------------------------------------------------------------------
    // 16. MERCADO PAGO WEBHOOK (Mensalidades e Pedidos)
    // ------------------------------------------------------------------------
    else if (path === '/api/mp-webhook') {
        if (req.method !== 'POST') return res.status(405).end();

        try {
            const { type, data, action, user_id } = req.body;
            
            const isPayment = type === 'payment' || action === 'payment.created' || action === 'payment.updated';

            if (isPayment && data && data.id) {
                const paymentId = data.id;

                // 🚨 BLINDAGEM MULTI-TENANT: Tenta pegar a loja que injetamos na URL do Webhook
                const storeIdQuery = req.query.store;
                let accessToken = process.env.MP_ACCESS_TOKEN;

                if (storeIdQuery) {
                    const settingsDoc = await db.collection('settings').doc(storeIdQuery).get();
                    if (settingsDoc.exists && settingsDoc.data().integrations?.mercadopago?.accessToken) {
                        accessToken = settingsDoc.data().integrations.mercadopago.accessToken;
                    }
                } else if (user_id) {
                    const settingsRef = await db.collection('settings').where('integrations.mercadopago.userId', 'in', [user_id, String(user_id)]).limit(1).get();
                    if (!settingsRef.empty) {
                        accessToken = settingsRef.docs[0].data().integrations.mercadopago.accessToken;
                    }
                }

                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (mpResponse.ok) {
                    const paymentData = await mpResponse.json();
                    
                    if (paymentData.status === 'approved') {
                        const externalRef = paymentData.external_reference;
                        const valorPago = paymentData.transaction_amount;
                        
                        // LÓGICA: MENSALIDADE DA LOJA PAGA
                        if (externalRef && externalRef.startsWith('fatura_saas_')) {
                            const storeIdToRelease = externalRef.replace('fatura_saas_', '');
                            
                            const storeRef = db.collection('stores').doc(storeIdToRelease);
                            await storeRef.set({
                                paymentStatus: 'paid', // Libera o painel
                                lastPaymentDate: admin.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });

                            console.log(`✅ Webhook MP: Mensalidade SaaS da loja ${storeIdToRelease} paga!`);
                            return res.status(200).send('OK');
                        }

                        // LÓGICA: PEDIDO DO CLIENTE FINAL PAGO
                        const orderId = externalRef;
                        if (orderId && !externalRef.startsWith('fatura_saas_')) {
                            const orderRef = db.collection('orders').doc(orderId);
                            const orderDoc = await orderRef.get();

                            if (orderDoc.exists && orderDoc.data().paymentStatus !== 'paid') {
                                const storeId = orderDoc.data().storeId;
                                const batch = db.batch();
                                
                                batch.update(orderRef, {
                                    paymentStatus: 'paid',
                                    status: 'preparing', 
                                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                                });

                                const statsRef = db.collection("stats").doc(storeId);
                                batch.set(statsRef, {
                                    faturamentoTotal: admin.firestore.FieldValue.increment(valorPago),
                                    pedidosPagos: admin.firestore.FieldValue.increment(1)
                                }, { merge: true });

                                await batch.commit();
                                console.log(`✅ Webhook MP: Pedido ${orderId} atualizado para PAGO!`);
                            }
                        }
                    }
                }
            }
            return res.status(200).send('OK');
        } catch (error) {
            console.error('❌ Erro no Webhook do MP:', error);
            return res.status(500).send('Erro interno');
        }
    }
// ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // 17. VELOPAY: GERAR PIX DINÂMICO (EFÍ BANK REAL)
    // ------------------------------------------------------------------------
    else if (path === '/api/velopay-pix') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        const { storeId, orderId, totalAmount } = req.body;

        if (!storeId || !orderId || !totalAmount) {
            return res.status(400).json({ error: 'Dados insuficientes para gerar o Pix.' });
        }

        try {
            // --- 1. BUSCA O PLANO DO LOJISTA PARA CALCULAR A TAXA ---
            const storeDoc = await db.collection('stores').doc(storeId).get();
            const pixPlan = storeDoc.data()?.velopayPixPlan || 'd30';
            
            let pixFeePercent = 0.0259; // Padrão D+30 (2,59%)
            if (pixPlan === 'd14') pixFeePercent = 0.0299; // 2,99%
            if (pixPlan === 'd1') pixFeePercent = 0.0359;  // 3,59%
            if (pixPlan === 'd0') pixFeePercent = 0.0399;  // 3,99%

            const feeAmount = Number((Number(totalAmount) * pixFeePercent).toFixed(2));
            const netAmount = Number((Number(totalAmount) - feeAmount).toFixed(2));

            // Garante o caminho absoluto independente de onde o node está rodando
            const certPath = pathModule.resolve(process.cwd(), 'api', 'certs', 'certificado-producao.p12');
            console.log('🔍 [VeloPay] Caminho do certificado:', certPath);

            // ====================================================================
            // INTEGRAÇÃO REAL COM A EFÍ BANK
            // ====================================================================
            const efiOptions = {
                sandbox: false, // false = MODO PRODUÇÃO (Requer chaves de produção no .env)
                client_id: process.env.EFI_CLIENT_ID,
                client_secret: process.env.EFI_CLIENT_SECRET,
                pix_cert: certPath 
            };

            const gerencianet = new Gerencianet(efiOptions);

            const body = {
                calendario: { expiracao: 3600 },
                valor: { original: Number(totalAmount).toFixed(2) },
                chave: process.env.EFI_PIX_KEY, // A chave cadastrada na Efí
                solicitacaoPagador: `Pedido #${orderId.slice(-5).toUpperCase()} - Velo`
            };

            console.log('⏳ [VeloPay] Solicitando Pix à Efí...', body);
            
            // 1. Gera a cobrança instantânea
            const cobResponse = await gerencianet.pixCreateImmediateCharge([], body);
            console.log('✅ [VeloPay] Cobrança criada! TXID:', cobResponse.txid);
            
            // 2. Pega a imagem do QR Code
            const qrCodeResponse = await gerencianet.pixGenerateQRCode({ id: cobResponse.loc.id });

            // 3. Salva no Firebase para a tela do cliente puxar E JÁ SALVA AS TAXAS E LÍQUIDO
            await db.collection('orders').doc(orderId).set({
                paymentIntentId: cobResponse.txid,
                velopayStatus: 'waiting_payment',
                pixQrCodeUrl: qrCodeResponse.imagemQrcode,
                pixCopiaECola: qrCodeResponse.qrcode,
                veloFeeAmount: feeAmount,      // Taxa da Velo Delivery
                veloNetAmount: netAmount,      // Líquido do Lojista
                veloPlanUsed: pixPlan          // Registra qual plano estava ativo
            }, { merge: true });

            return res.status(200).json({ success: true, txid: cobResponse.txid });

        } catch (error) {
            // Captura EXATAMENTE o que a Efí está reclamando (Erro de Auth, Certificado, Chave Pix, etc)
            const efiError = error.response || error.message || error;
            console.error('❌ Erro VeloPay Pix Real:', JSON.stringify(efiError, null, 2));
            
            return res.status(500).json({ 
                error: 'Erro interno ao comunicar com a Efí.', 
                details: efiError
            });
        }
    }
    // ------------------------------------------------------------------------
    // 17.7 VELOPAY: COBRANÇA CARTÃO DE CRÉDITO
    // ------------------------------------------------------------------------
    else if (path === '/api/velopay-credit') {
        if (req.method !== 'POST') return res.status(405).end();
        try {
            const { paymentToken, orderId, total, customer, billingAddress, storeId } = req.body;

            // --- 1. BUSCA O PLANO DO LOJISTA PARA CALCULAR A TAXA ---
            const storeDoc = await db.collection('stores').doc(storeId).get();
            const creditPlan = storeDoc.data()?.velopayCreditPlan || 'd30';
            
            let creditFeePercent = 0.0499; // Padrão D+30 (4,99%)
            if (creditPlan === 'd14') creditFeePercent = 0.0549; // 5,49%
            if (creditPlan === 'd1') creditFeePercent = 0.0599;  // 5,99%

            // Taxa fixa da Efí/Velo por transação de cartão
            const fixedFee = 0.39; 

            const feeAmount = Number(((Number(total) * creditFeePercent) + fixedFee).toFixed(2));
            const netAmount = Number((Number(total) - feeAmount).toFixed(2));

            const certPath = pathModule.resolve(process.cwd(), 'api', 'certs', 'certificado-producao.p12');
            const efiOptions = {
                sandbox: false, // Mude para true se for testar sem gastar
                client_id: process.env.EFI_CLIENT_ID,
                client_secret: process.env.EFI_CLIENT_SECRET,
                pix_cert: certPath 
            };
            const gerencianet = new Gerencianet(efiOptions);

            // 1. O Formato exato que a Efí exige para o cliente
            const efiCustomer = {
                name: customer.name,
                cpf: customer.cpf.replace(/\D/g, ''),
                phone_number: customer.phone.replace(/\D/g, ''),
                email: customer.email || "cliente@velodelivery.com.br",
                birth_date: customer.birthDate // Formato YYYY-MM-DD
            };

            // 2. O Formato exato do endereço de cobrança
            const efiBilling = {
                street: billingAddress.street,
                number: billingAddress.number,
                neighborhood: billingAddress.neighborhood,
                zipcode: billingAddress.zipcode.replace(/\D/g, ''),
                city: billingAddress.city,
                state: billingAddress.state
            };

            // 3. Montando a Cobrança (OneStepCharge)
            const chargeBody = {
                items: [{
                    name: `Pedido #${orderId.slice(0, 6).toUpperCase()}`,
                    value: parseInt(Number(total) * 100), // Efí trabalha com centavos (R$ 10,00 = 1000)
                    amount: 1
                }],
                payment: {
                    credit_card: {
                        installments: 1, // Vamos fixar em 1x por enquanto
                        payment_token: paymentToken,
                        billing_address: efiBilling,
                        customer: efiCustomer
                    }
                }
            };

            console.log(`💳 [VeloPay Credit] Processando cartão do pedido: ${orderId}`);
            const efiResponse = await gerencianet.createOneStepCharge({}, chargeBody);

            // Verifica se a cobrança foi aceita
            if (efiResponse.code === 200 && efiResponse.data) {
                const status = efiResponse.data.status; // Pode ser 'approved', 'authorized', 'declined'
                
                // Salva os dados da taxa e do repasse no pedido
                await db.collection('orders').doc(orderId).set({
                    paymentIntentId: efiResponse.data.charge_id,
                    velopayStatus: status,
                    veloFeeAmount: feeAmount,      // Taxa da Velo Delivery
                    veloNetAmount: netAmount,      // Líquido do Lojista
                    veloPlanUsed: creditPlan       // Registra qual plano estava ativo
                }, { merge: true });
                
                return res.status(200).json({ 
                    success: true, 
                    chargeId: efiResponse.data.charge_id,
                    status: status
                });
            } else {
                throw new Error("A Efí recusou a transação ou retornou erro.");
            }

        } catch (error) {
            console.error('❌ Erro VeloPay Credit:', error?.response || error);
            return res.status(500).json({ error: 'Erro ao processar cartão', details: error?.response?.error_description || error.message });
        }
    }
// ------------------------------------------------------------------------
    // 17.5 VELOPAY: REGISTRAR WEBHOOK NA EFÍ (RODE APENAS UMA VEZ)
    // ------------------------------------------------------------------------
    else if (path === '/api/register-webhook') {
        try {
            const certPath = pathModule.resolve(process.cwd(), 'api', 'certs', 'certificado-producao.p12');
            const efiOptions = {
                sandbox: false,
                client_id: process.env.EFI_CLIENT_ID,
                client_secret: process.env.EFI_CLIENT_SECRET,
                pix_cert: certPath 
            };
            const gerencianet = new Gerencianet(efiOptions);

            // 🚨 BLINDAGEM MESTRA: Força o webhook da Efí a sempre bater na API central da Velo,
            // independentemente de qual domínio (ou subdomínio) o lojista estava acessando.
            const webhookUrl = 'https://app.velodelivery.com.br/api/velopay-webhook';

            await gerencianet.pixConfigWebhook(
                { chave: process.env.EFI_PIX_KEY }, // A chave pix do seu .env
                { webhookUrl: webhookUrl }
            );

            return res.status(200).send(`✅ SUCESSO! A Efí agora vai avisar os pagamentos na URL: ${webhookUrl}`);
        } catch (error) {
            const efiError = error.response || error.message || error;
            console.error('Erro ao registrar Webhook:', efiError);
            return res.status(500).send(`❌ Erro ao registrar Webhook: ${JSON.stringify(efiError)}`);
        }
    }
    // ------------------------------------------------------------------------
    // 17.6 VELOPAY: VERIFICADOR DE STATUS MANUAL (POLLING)
    // ------------------------------------------------------------------------
    else if (path === '/api/velopay-status') {
        if (req.method !== 'POST') return res.status(405).end();
        try {
            const { txid, orderId } = req.body;
            if (!txid || !orderId) return res.status(400).json({ error: 'Dados insuficientes' });

            const certPath = pathModule.resolve(process.cwd(), 'api', 'certs', 'certificado-producao.p12');
            const efiOptions = {
                sandbox: false,
                client_id: process.env.EFI_CLIENT_ID,
                client_secret: process.env.EFI_CLIENT_SECRET,
                pix_cert: certPath 
            };
            const gerencianet = new Gerencianet(efiOptions);

            // Pergunta para a Efí o status oficial desse QR Code
            const statusPix = await gerencianet.pixDetailCharge({ txid });

            if (statusPix.status === 'CONCLUIDA') {
                // O cliente pagou! Vamos atualizar o Firebase
                const orderRef = db.collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();
                
                if (orderDoc.exists && orderDoc.data().paymentStatus !== 'paid') {
                    const storeId = orderDoc.data().storeId;
                    const valorPago = orderDoc.data().total;

                    const batch = db.batch();
                    
                    // Muda os 2 status de uma vez: Pagamento e Cozinha!
                    batch.update(orderRef, {
                        paymentStatus: 'paid',
                        status: 'preparing', 
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Soma na grana do painel do Lojista
                    const statsRef = db.collection("stats").doc(storeId);
                    batch.set(statsRef, {
                        faturamentoTotal: admin.firestore.FieldValue.increment(Number(valorPago)),
                        pedidosPagos: admin.firestore.FieldValue.increment(1)
                    }, { merge: true });

                    await batch.commit();
                    console.log(`✅ [VeloPay Polling] Pedido ${orderId} atualizado para PAGO!`);
                }
                return res.status(200).json({ paid: true });
            }

            return res.status(200).json({ paid: false, status: statusPix.status });

        } catch (error) {
            console.error('Erro no Polling VeloPay:', error);
            return res.status(500).json({ error: 'Erro ao consultar Efí' });
        }
    }
    // ------------------------------------------------------------------------
    // 18. VELOPAY: WEBHOOK DE CONFIRMAÇÃO (EFÍ BANK)
    // ------------------------------------------------------------------------
    else if (path === '/api/velopay-webhook') {
        // A Efí vai bater aqui quando o Pix for pago
        if (req.method !== 'POST') return res.status(405).end();

        try {
            // A API da Efí envia os dados no corpo da requisição
            const pixDataList = req.body.pix; 
            
            // Pode ser que a Efí mande vários pagamentos num único webhook
            if (pixDataList && Array.isArray(pixDataList)) {
                for (const pix of pixDataList) {
                    const txid = pix.txid; // O ID único que gerámos na rota anterior
                    const valorPago = pix.valor; // Valor efetivamente pago

                    console.log(`[VeloPay Webhook] Pagamento confirmado! TXID: ${txid} | Valor: R$ ${valorPago}`);

                    // 1. Procura o pedido no Firestore que tem este txid
                    const ordersRef = db.collection('orders');
                    const q = await ordersRef.where('paymentIntentId', '==', txid).limit(1).get();

                    if (!q.empty) {
                        const orderDoc = q.docs[0];
                        const orderData = orderDoc.data();
                        
                        // 2. Evita processar em duplicado
                        if (orderData.paymentStatus !== 'paid') {
                            const storeId = orderData.storeId;
                            const batch = db.batch();
                            
                            // Atualiza o pedido
                            batch.update(orderDoc.ref, {
                                paymentStatus: 'paid',
                                status: 'preparing', // Manda para a cozinha
                                paidAt: admin.firestore.FieldValue.serverTimestamp()
                            });

                            // Atualiza as estatísticas do lojista (Opcional, depende da tua métrica)
                            const statsRef = db.collection("stats").doc(storeId);
                            batch.set(statsRef, {
                                faturamentoTotal: admin.firestore.FieldValue.increment(Number(valorPago)),
                                pedidosPagos: admin.firestore.FieldValue.increment(1)
                            }, { merge: true });

                            await batch.commit();
                            console.log(`✅ [VeloPay] Pedido ${orderDoc.id} atualizado para PAGO!`);
                            
                            // AQUI PODEMOS ADICIONAR O DISPARO DO WHATSAPP AVISANDO O CLIENTE/LOJISTA
                        }
                    } else {
                        console.warn(`[VeloPay] TXID ${txid} não encontrado em nenhum pedido.`);
                    }
                }
            } else if (req.body.acao === 'teste') {
                // A Efí envia um ping de teste quando configuramos o Webhook no painel deles
                console.log("[VeloPay] Recebido ping de validação do Webhook da Efí.");
            }

            // Devemos sempre responder 200 OK rapidamente para a Efí
            return res.status(200).json({ received: true });
            
        } catch (error) {
            console.error('❌ Erro no Webhook VeloPay:', error);
            // Mesmo com erro interno, devolvemos 200 para a Efí não tentar reenviar freneticamente
            return res.status(200).send('Erro processado'); 
        }
    }
    // ------------------------------------------------------------------------
    // 19. MERCADO PAGO: REEMBOLSAR PAGAMENTO (ESTORNO)
    // ------------------------------------------------------------------------
    else if (path === '/api/refund-mp') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        const { storeId, orderId } = req.body;
        if (!storeId || !orderId) return res.status(400).json({ error: 'Dados insuficientes.' });

        try {
            // 1. Pega o token do MP da loja
            const settingsDoc = await db.collection('settings').doc(storeId).get();
            const mpConfig = settingsDoc.data()?.integrations?.mercadopago;

            if (!mpConfig || !mpConfig.accessToken) {
                return res.status(400).json({ error: 'Mercado Pago não configurado.' });
            }

            // 2. Busca o pagamento no Mercado Pago usando o external_reference (que é o orderId do Firebase)
            const searchRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`, {
                headers: { 'Authorization': `Bearer ${mpConfig.accessToken}` }
            });
            const searchData = await searchRes.json();

            if (!searchRes.ok || !searchData.results || searchData.results.length === 0) {
                return res.status(404).json({ error: 'Pagamento não encontrado no Mercado Pago para este pedido.' });
            }

            // Pega o pagamento mais recente aprovado para este pedido
            const payment = searchData.results.find(p => p.status === 'approved') || searchData.results[0];
            const paymentId = payment.id;

            // 3. Solicita o Estorno Total
            const refundRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${mpConfig.accessToken}`,
                    'X-Idempotency-Key': `refund_${orderId}_${Date.now()}` // Garante que não vai estornar 2x por erro de rede
                }
            });

            const refundData = await refundRes.json();

            if (!refundRes.ok) {
                console.error("Erro MP Refund:", refundData);
                return res.status(400).json({ error: 'O Mercado Pago recusou o estorno.', details: refundData });
            }

            return res.status(200).json({ success: true, refundId: refundData.id });

        } catch (error) {
            console.error('Erro ao estornar MP:', error);
            return res.status(500).json({ error: 'Erro interno ao processar estorno.' });
        }
    }

    // ------------------------------------------------------------------------
    // 20. VELO INSIGHTS (CONSULTORIA IA COM GOOGLE GEMINI)
    // ------------------------------------------------------------------------
    else if (path === '/api/velo-insights') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

        try {
            // 1. EXTRAÇÃO BLINDADA (Impede crash se o React enviar dados vazios)
            const storeName = req.body.storeName || 'Loja';
            const storeNiche = req.body.storeNiche || 'Geral';
            const topSearches = Array.isArray(req.body.topSearches) ? req.body.topSearches : [];
            const topCategories = Array.isArray(req.body.topCategories) ? req.body.topCategories : [];
            const topProducts = Array.isArray(req.body.topProducts) ? req.body.topProducts : [];
            const totalOrders30d = Number(req.body.totalOrders30d) || 0;
            const totalRevenue30d = Number(req.body.totalRevenue30d) || 0;

            const GEMINI_KEY = process.env.GEMINI_API_KEY;
            
            if (!GEMINI_KEY) {
                return res.status(200).json({ 
                    success: true, 
                    insight: "### Chave não encontrada\nAdicione a variável `GEMINI_API_KEY` nas configurações da Vercel." 
                });
            }

            const fullPrompt = `Você é um consultor sênior de negócios focado em Delivery. Analise os dados da loja "${storeName}" e dê 3 dicas curtas e muito práticas para aumentar as vendas.
            
            DADOS REAIS:
            - Nicho: ${storeNiche}.
            - Pedidos no Mês: ${totalOrders30d}.
            - Faturamento: R$ ${totalRevenue30d.toFixed(2)}.
            - Termos Buscados: ${topSearches.join(', ') || 'Nenhum'}.
            - Categorias Vistas: ${topCategories.join(', ') || 'Nenhuma'}.
            - Produtos Clicados: ${topProducts.join(', ') || 'Nenhum'}.`;

            // Chamada para a versão mais recente e veloz do Gemini
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }]
                })
            });

            // 2. BLINDAGEM DE RESPOSTA DO GOOGLE (Lê como texto antes para não crashar)
            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("❌ Erro Crítico ao ler Google API:", responseText);
                return res.status(200).json({ success: true, insight: "### Falha de Comunicação\nO Google não devolveu um formato válido. Tente de novo." });
            }

            if (!response.ok || data.error) {
                console.error("❌ Erro da API Gemini:", data);
                return res.status(200).json({ 
                    success: true, 
                    insight: `### Erro de Conexão com a IA\nMotivo: ${data.error?.message || 'Erro Desconhecido na chave'}` 
                });
            }

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const aiText = data.candidates[0].content.parts[0].text;
                return res.status(200).json({ success: true, insight: aiText });
            } else {
                return res.status(200).json({ success: true, insight: "### Ops!\nA IA não conseguiu gerar o texto agora. Tente de novo." });
            }

        } catch (error) {
            console.error('❌ Erro Fatal no Velo Insights:', error);
            // 3. RETORNA 200 (SUCESSO NO ROTEAMENTO) PARA NÃO ATIVAR A TELA DE "SEM INTERNET" DO FRONTEND
            return res.status(200).json({ 
                success: true, 
                insight: `### Erro Interno do Servidor\nAlgo quebrou na Vercel: ${error.message}` 
            });
        }
    }
    // ============================================================================
    // ROTA NÃO ENCONTRADA (Fallback de segurança)
    // ============================================================================
    else {
        return res.status(404).json({ error: 'Rota da API não foi encontrada no index.js', requestedPath: path });
    }
}