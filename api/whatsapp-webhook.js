// Arquivo: /api/whatsapp-webhook.js
import admin from 'firebase-admin';

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

// O token que você configura no painel da Meta App "Verify Token"
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'SUA_SENHA_SECRETA_WEBHOOK_VELO'; 

export default async function handler(req, res) {
    // 1. Rota GET: Usada pela Meta apenas na hora de "Assinar" o Webhook
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).json({ error: 'Token de verificação inválido' });
            }
        }
        return res.status(400).json({ error: 'Parâmetros de webhook ausentes' });
    }

    // 2. Rota POST: Usada pela Meta para entregar mensagens recebidas e status de leitura
    if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    const value = change.value;
                    const phoneNumberId = value.metadata?.phone_number_id;

                    // Verifica se há novas mensagens do cliente
                    if (value.messages && value.messages[0]) {
                        const message = value.messages[0];
                        const fromPhone = message.from; // Cliente
                        
                        let messageText = '';
                        if (message.type === 'text') {
                            messageText = message.text.body;
                        } else if (message.type === 'button') {
                            messageText = message.button.text;
                        }

                        // Registra a mensagem no Firestore para o lojista ler/responder no painel (Futura caixa de entrada)
                        if (messageText) {
                            try {
                                // Opcional: Adiciona a um sub-documento de chats
                                await db.collection('whatsapp_inbound').add({
                                    phoneNumberId: phoneNumberId, // Para identificar qual loja recebeu
                                    from: fromPhone,
                                    text: messageText,
                                    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                                    status: 'unread'
                                });
                            } catch (error) {
                                console.error('Erro ao gravar mensagem recebida:', error);
                            }
                        }
                    }
                }
            }
            // Retorna 200 rapidamente para a Meta não reenviar a mesma mensagem
            return res.status(200).send('EVENT_RECEIVED');
        }

        return res.status(404).send('Not Found');
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}