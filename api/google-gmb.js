import admin from 'firebase-admin';

// Inicializa o Firebase Admin garantindo o padrão Singleton
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

// Credenciais configuradas na Vercel (.env)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Helper: Lê o Token do local correto na Velo e renova se necessário
 */
async function getValidGmbTokenAndIds(storeId) {
    // 🎯 CORREÇÃO: Puxando da coleção SETTINGS que a Velo já usa!
    const docRef = db.collection('settings').doc(storeId);
    const docSnap = await docRef.get();
    
    const data = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;

    if (!data || !data.accessToken) {
        throw new Error("Loja não possui integração Google conectada.");
    }

    // Verifica se o token expirou (A Velo usa connectedAt + 1 hora)
    const connectedAtMs = data.connectedAt?.toMillis ? data.connectedAt.toMillis() : Date.now();
    const isExpired = (Date.now() - connectedAtMs) > 3500000; // ~58 minutos

    if (isExpired && data.refreshToken) {
        try {
            const tokenParams = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: data.refreshToken,
                grant_type: 'refresh_token'
            });

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams
            });

            const tokenData = await tokenRes.json();
            
            if (!tokenRes.ok) throw new Error("Erro no refresh_token");

            const newAccessToken = tokenData.access_token;

            await docRef.set({
                integrations: {
                    google_my_business: {
                        accessToken: newAccessToken,
                        connectedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }
            }, { merge: true });

            return { accessToken: newAccessToken, locationId: data.locationId };
        } catch (error) {
            throw new Error("Token expirou e não pôde ser renovado automaticamente.");
        }
    }

    return { accessToken: data.accessToken, locationId: data.locationId };
}

/**
 * Função Serverless Principal (Roteador)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const params = { ...req.query, ...req.body };
        const { action, storeId } = params;

        if (!storeId) {
            return res.status(400).json({ success: false, error: 'O storeId é obrigatório.' });
        }

        // ==========================================
        // 0. VERIFICAR STATUS DA CONEXÃO (Lê do Settings da Velo)
        // ==========================================
        if (action === 'checkStatus') {
            const docSnap = await db.collection('settings').doc(storeId).get();
            const gmbData = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;
            // Se tem accessToken, está conectado! Retrocompatibilidade garantida.
            return res.status(200).json({ connected: !!(gmbData && gmbData.accessToken) });
        }

        // Recupera de forma segura as credenciais
        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        
        if (!locationId) {
            return res.status(400).json({ success: false, error: "Falta o ID do Local (Location ID). Preencha na aba de Integrações e tente novamente." });
        }

        // 🎯 O TRUQUE: Usar '-' (wildcard) no lugar do accountId resolve o problema de lojas antigas
        const cleanLocationId = locationId.replace('locations/', '');
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        // ==========================================
        // 1. UPDATE BUSINESS INFO (GET E PATCH)
        // ==========================================
        if (action === 'getProfile') {
            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=title,profile,primaryPhone`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Erro na API GMB.");
            return res.status(200).json({ success: true, profile: data });
        }

        if (action === 'updateBusinessInfo') {
            const { title, description, phone } = params;
            const updatePayload = {};
            const updateMask = [];

            if (title) { updatePayload.title = title; updateMask.push('title'); }
            if (description) { updatePayload.profile = { description }; updateMask.push('profile.description'); }
            if (phone) { updatePayload.primaryPhone = phone; updateMask.push('primaryPhone'); }

            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?updateMask=${updateMask.join(',')}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao atualizar perfil.");
            return res.status(200).json({ success: true, profile: data });
        }

        // ==========================================
        // 2. CREATE GOOGLE POST (FEED)
        // ==========================================
        if (action === 'createGooglePost') {
            const { summary, imageUrl, topicType } = params;
            if (!summary) throw new Error("O texto da postagem é obrigatório.");

            const postPayload = {
                languageCode: "pt-BR",
                topicType: topicType || "STANDARD",
                summary: summary
            };

            if (imageUrl) {
                postPayload.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];
            }

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(postPayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao publicar postagem.");
            return res.status(200).json({ success: true, post: data });
        }

        // ==========================================
        // 3. AVALIAÇÕES (GET REVIEWS E REPLY REVIEW)
        // ==========================================
        if (action === 'getReviews') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao listar avaliações.");
            return res.status(200).json({ success: true, reviews: data });
        }

        if (action === 'handleReviews') {
            const { reviewId, replyText } = params;
            if (!reviewId || !replyText) throw new Error("ID do Review e Texto da Resposta são obrigatórios.");

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: replyText })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar resposta.");
            return res.status(200).json({ success: true, reply: data });
        }

        // ==========================================
        // 4. UPLOAD GOOGLE MEDIA (CAPA E LOGO)
        // ==========================================
        if (action === 'uploadGoogleMedia') {
            const { mediaUrl, category } = params; // category = "PROFILE" ou "COVER"
            if (!mediaUrl || !category) throw new Error("URL da imagem e Categoria são obrigatórios.");

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaFormat: "PHOTO",
                    locationAssociation: { category: category },
                    sourceUrl: mediaUrl
                })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao associar imagem.");
            return res.status(200).json({ success: true, media: data });
        }

        // ==========================================
        // 5. SINCRONIZAR PRODUTOS VELO PARA O GOOGLE
        // ==========================================
        if (action === 'syncVeloProducts') {
            const productsSnap = await db.collection('products').where('storeId', '==', storeId).where('isActive', '==', true).get();
            if (productsSnap.empty) throw new Error("Nenhum produto ativo encontrado para sincronizar.");

            const products = productsSnap.docs.map(doc => doc.data());
            
            let syncedCount = 0;
            const batchPromises = products.map(async (p) => {
                if (!p.imageUrl) return; 
                
                const postPayload = {
                    languageCode: "pt-BR",
                    topicType: "STANDARD",
                    summary: `${p.name} - R$ ${p.price}\n\n${p.description || 'Disponível em nossa loja.'}`,
                    media: [{ mediaFormat: "PHOTO", sourceUrl: p.imageUrl }]
                };

                const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(postPayload)
                });

                if (gRes.ok) syncedCount++;
            });

            await Promise.all(batchPromises);
            return res.status(200).json({ success: true, syncedCount });
        }

        return res.status(400).json({ success: false, error: 'Ação não reconhecida pelo backend GMB.' });

    } catch (error) {
        console.error("❌ Erro /api/google-gmb:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}