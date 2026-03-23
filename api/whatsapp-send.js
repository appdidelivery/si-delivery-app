// Arquivo: /api/whatsapp-send.js
import admin from 'firebase-admin';

// Inicializa o Firebase Admin (Proteção para Next.js HMR)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, storeId, templateName, toPhone, dynamicParams } = req.body;

    if (!storeId) return res.status(400).json({ error: 'StoreId é obrigatório' });

    try {
        // 1. Busca as configurações de integração da loja
        const storeSettingsDoc = await db.collection('settings').doc(storeId).get();
        if (!storeSettingsDoc.exists) return res.status(404).json({ error: 'Configuração da loja não encontrada' });

        const settingsData = storeSettingsDoc.data();
        const waConfig = settingsData.integrations?.whatsapp;

        if (!waConfig || !waConfig.phoneNumberId || !waConfig.apiToken) {
            return res.status(400).json({ error: 'WhatsApp não configurado ou credenciais inválidas nesta loja' });
        }

        const { phoneNumberId, apiToken } = waConfig;
        const GRAPH_API_URL = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        // Função interna auxiliar para disparar mensagem para a Meta
        const sendMessageToMeta = async (recipientPhone, template, languageCode = 'pt_BR') => {
            // Remove caracteres não numéricos do telefone
            let cleanPhone = String(recipientPhone).replace(/\D/g, '');
            // Se não tiver código DDI 55 e tiver 10/11 dígitos, insere o 55
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "template",
                template: {
                    name: template,
                    language: { code: languageCode },
                    // components: [] // Adicione mapping dinâmico se seu template exigir variáveis (Ex: {{1}})
                }
            };

            const response = await fetch(GRAPH_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) console.error("Erro Meta API:", data);
            return { ok: response.ok, data };
        };

        // --- ROTEAMENTO DA AÇÃO ---
        
        // Ação 1: Disparo em Massa (Broadcast de Marketing)
        if (action === 'broadcast') {
            if (!templateName) return res.status(400).json({ error: 'Nome do template obrigatório' });

            // Busca clientes unicos nos pedidos recentes
            const ordersSnap = await db.collection('orders').where('storeId', '==', storeId).limit(500).get();
            const uniquePhones = new Set();
            
            ordersSnap.forEach(doc => {
                const phone = doc.data().customerPhone;
                if (phone) uniquePhones.add(phone);
            });

            // Dispara assincronamente (em produção idealmente use Pub/Sub ou filas Vercel Inngest)
            const sendPromises = Array.from(uniquePhones).map(phone => sendMessageToMeta(phone, templateName));
            
            // Aguardamos todas as chamadas (Ou podemos retornar OK e rodar em background dependendo da infra)
            await Promise.allSettled(sendPromises);

            return res.status(200).json({ success: true, message: `Disparado para ${uniquePhones.size} clientes.` });
        }

        // Ação 2: Disparo de Status Único Transacional (Usado via Trigger do Firestore)
        if (action === 'transactional') {
            if (!toPhone || !templateName) return res.status(400).json({ error: 'Telefone e template obrigatórios' });
            
            const result = await sendMessageToMeta(toPhone, templateName);
            if(result.ok) return res.status(200).json({ success: true });
            else return res.status(400).json({ error: 'Falha na Graph API', details: result.data });
        }

        return res.status(400).json({ error: 'Ação não reconhecida' });

    } catch (error) {
        console.error('Erro geral no WhatsApp Send:', error);
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
}