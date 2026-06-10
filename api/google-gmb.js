import admin from 'firebase-admin';

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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function getValidGmbTokenAndIds(storeId) {
    const docRef = db.collection('settings').doc(storeId);
    const docSnap = await docRef.get();
    const data = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;

    if (!data || !data.accessToken) throw new Error("Loja não possui integração Google conectada.");

    const connectedAtMs = data.connectedAt?.toMillis ? data.connectedAt.toMillis() : Date.now();
    const isExpired = (Date.now() - connectedAtMs) > 3500000; 

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
            if (!tokenRes.ok) throw new Error("Erro no refresh_token do Google.");

            const newAccessToken = tokenData.access_token;

            await docRef.set({
                integrations: { google_my_business: { accessToken: newAccessToken, connectedAt: admin.firestore.FieldValue.serverTimestamp() } }
            }, { merge: true });

            return { accessToken: newAccessToken, locationId: data.locationId };
        } catch (error) {
            throw new Error("Token expirou e não pôde ser renovado automaticamente.");
        }
    }
    return { accessToken: data.accessToken, locationId: data.locationId };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const params = { ...req.query, ...req.body };
        const { action, storeId } = params;

        if (!storeId) return res.status(400).json({ success: false, error: 'O storeId é obrigatório.' });

        if (action === 'checkStatus') {
            const docSnap = await db.collection('settings').doc(storeId).get();
            const gmbData = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;
            return res.status(200).json({ connected: !!(gmbData && gmbData.accessToken) });
        }

        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        if (!locationId) return res.status(400).json({ success: false, error: "Falta o ID do Local." });

        const cleanLocationId = locationId.replace('locations/', '');
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        // 1. PERFIL
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

        // 2. FEED (POSTAGENS)
        if (action === 'createGooglePost') {
            const { summary, imageUrl, topicType } = params;
            if (!summary) throw new Error("O texto da postagem é obrigatório.");

            const postPayload = { languageCode: "pt-BR", topicType: topicType || "STANDARD", summary: summary };
            if (imageUrl) postPayload.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(postPayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao publicar postagem.");
            return res.status(200).json({ success: true, post: data });
        }

        // 3. AVALIAÇÕES
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
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: replyText })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar resposta.");
            return res.status(200).json({ success: true, reply: data });
        }

        // 4. MÍDIAS (GET E POST)
        if (action === 'getMedia') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao buscar mídias.");
            return res.status(200).json({ success: true, media: data });
        }

        if (action === 'uploadGoogleMedia') {
            const { mediaUrl, category } = params; 
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaFormat: "PHOTO", locationAssociation: { category: category }, sourceUrl: mediaUrl })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar imagem.");
            return res.status(200).json({ success: true, media: data });
        }

        // 5. SINCRONIZAR CARDÁPIO
        if (action === 'syncVeloProducts') {
            const productsSnap = await db.collection('products').where('storeId', '==', storeId).where('isActive', '==', true).get();
            if (productsSnap.empty) throw new Error("Nenhum produto ativo encontrado.");

            const products = productsSnap.docs.map(doc => doc.data());
            let syncedCount = 0;
            
            const batchPromises = products.map(async (p) => {
                if (!p.imageUrl) return; 
                const postPayload = {
                    languageCode: "pt-BR", topicType: "STANDARD",
                    summary: `${p.name} - R$ ${p.price}\n\n${p.description || 'Peça online agora mesmo.'}`,
                    media: [{ mediaFormat: "PHOTO", sourceUrl: p.imageUrl }]
                };
                const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(postPayload)
                });
                if (gRes.ok) syncedCount++;
            });

            await Promise.all(batchPromises);
            return res.status(200).json({ success: true, syncedCount });
        }

        return res.status(400).json({ success: false, error: 'Ação não reconhecida.' });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}