// Arquivo: api/cron-automations.js
import admin from 'firebase-admin';
import { sendWhatsAppNotification } from '../lib/evolution.js';

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
    // Segurança: Verifica se a requisição vem do Vercel Cron
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log("⏱️ Iniciando Rotina de Automação de Marketing...");
        const batch = db.batch();
        let alertsSent = 0;
        let reengagementsSent = 0;

        const now = new Date();
        // Timestamp de 30 minutos atrás
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);
        
        // --- 1. RECUPERAÇÃO DE CARRINHO ABANDONADO ---
        // Pega pedidos pendentes criados antes de 30 minutos atrás que não receberam alerta
        const abandonedQuery = await db.collection("orders")
            .where("status", "==", "pending")
            .where("abandonmentAlertSent", "!=", true) // Necessita criar índice no Firebase
            .get();

        const abandonedPromises =[];

        abandonedQuery.forEach(doc => {
            const data = doc.data();
            // Verifica a data em memória para contornar limitações de múltiplas queries no Firestore
            if (data.createdAt && data.createdAt.toDate() < thirtyMinsAgo && data.customerPhone) {
                const msg = `🛒 *Esqueceu algo na sacola?*\n\nOlá ${data.customerName || 'Cliente'}! Notamos que você iniciou um pedido na nossa loja, mas não finalizou.\n\nCaso tenha ocorrido algum erro no pagamento ou precise de ajuda, estamos aqui! \n\n👉 Para finalizar agora, clique no link:\nhttps://${data.storeId}.velodelivery.com.br/track/${doc.id}`;
                
                abandonedPromises.push(sendWhatsAppNotification(data.customerPhone, msg, `Velo_${data.storeId?.toUpperCase()}`));
                
                // Marca que já avisou para não criar loop
                batch.update(doc.ref, { abandonmentAlertSent: true });
                alertsSent++;
            }
        });

        // --- 2. REATIVAÇÃO DE CLIENTES SUMIDOS (7 DIAS) ---
        // Exemplo simplificado lendo a subcoleção de fidelidade (onde salvamos a lastPurchaseDate)
        // DICA: Para escalar, é melhor ter uma collection raiz "customers" apenas com lastPurchaseDate
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60000);
        
        const inactiveQuery = await db.collectionGroup("loyalty")
            .where("lastPurchaseDate", "<", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
            .where("reengagementSent", "!=", true)
            .limit(50) // Limita por execução para não estourar tempo da Vercel
            .get();

        inactiveQuery.forEach(doc => {
            const data = doc.data();
            const phone = doc.ref.parent.parent.id; // user id é o telefone no nosso modelo
            const storeId = doc.ref.id;

            const msg = `🍻 *Saudades de você!*\n\nOi ${data.customerName}! Faz tempo que você não pede uma bebida gelada com a gente.\n\nPara matar a sede, aqui vai um cupom de *10% OFF* válido para hoje!\n\nUse o código: *VOLTA10*\n👉 https://${storeId}.velodelivery.com.br`;
            
            abandonedPromises.push(sendWhatsAppNotification(phone, msg, `Velo_${storeId.toUpperCase()}`));
            
            // Marca envio
            batch.update(doc.ref, { reengagementSent: true, reengagementDate: admin.firestore.FieldValue.serverTimestamp() });
            reengagementsSent++;
        });

        // Dispara todos os WhatsApps em paralelo
        await Promise.all(abandonedPromises);

        // Salva atualizações no Firestore
        if (alertsSent > 0 || reengagementsSent > 0) {
            await batch.commit();
        }

        console.log(`✅ CRON Finalizado: ${alertsSent} carrinhos recuperados, ${reengagementsSent} reengajamentos.`);
        return res.status(200).json({ success: true, alertsSent, reengagementsSent });

    } catch (error) {
        console.error('❌ Erro no CRON:', error);
        return res.status(500).json({ error: error.message });
    }
}