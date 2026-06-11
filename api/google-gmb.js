import admin from 'firebase-admin';

// Inicializa o Firebase Admin (Singleton para evitar erros de múltiplas conexões)
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

// Função utilitária para verificar e renovar o token do Google automaticamente
async function getValidGmbTokenAndIds(storeId) {
    const docRef = db.collection('settings').doc(storeId);
    const docSnap = await docRef.get();
    const data = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;

    if (!data || !data.accessToken) {
        throw new Error("A loja não possui uma conta do Google Meu Negócio conectada.");
    }

    const connectedAtMs = data.connectedAt?.toMillis ? data.connectedAt.toMillis() : Date.now();
    const isExpired = (Date.now() - connectedAtMs) > 3500000; // Aproximadamente 58 minutos

    // Renova o token se estiver expirado e houver um refresh token salvo
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
            if (!tokenRes.ok) throw new Error(tokenData.error_description || "Erro ao tentar atualizar o token do Google.");

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
            throw new Error("O Token do Google expirou e não pôde ser renovado. Desconecte e conecte novamente na aba Integrações.");
        }
    }
    return { accessToken: data.accessToken, locationId: data.locationId };
}

// Handler Principal (Roteador da API)
export default async function handler(req, res) {
    // Configurações de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Agrupa os parâmetros independentemente de ser GET ou POST
        const params = { ...req.query, ...req.body };
        const { action, storeId } = params;

        if (!storeId) {
            return res.status(400).json({ success: false, error: 'O parâmetro storeId é obrigatório.' });
        }

        // 1. CHECAGEM DE STATUS RÁPIDA (Não consome chamadas pesadas da API)
        if (action === 'checkStatus') {
            const docSnap = await db.collection('settings').doc(storeId).get();
            const gmbData = docSnap.exists ? docSnap.data()?.integrations?.google_my_business : null;
            return res.status(200).json({ connected: !!(gmbData && gmbData.accessToken) });
        }

        // Para todas as outras requisições, validamos e extraímos o token
        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        
        if (!locationId && action !== 'getProfile') {
            return res.status(400).json({ success: false, error: "O ID do Local não foi configurado na aba de integrações." });
        }

        // Formatação dos IDs que o Google exige dependendo do endpoint
        const cleanLocationId = locationId ? locationId.replace('locations/', '') : '';
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        // ==========================================
        // ESCOPOS DA INTEGRAÇÃO
        // ==========================================

        // 2. PERFIL: Buscar Dados do Local
        if (action === 'getProfile') {
            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=title,profile,primaryPhone`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Erro na API GMB.");
            return res.status(200).json({ success: true, profile: data });
        }

        // 3. PERFIL: Atualizar Dados (PATCH)
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
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao atualizar perfil no Google.");
            return res.status(200).json({ success: true, profile: data });
        }

        // 4. FEED: Criar Postagem no Google
        if (action === 'createGooglePost') {
            const { summary, imageUrl, topicType, startDate, endDate, productUrl } = params;
            if (!summary) throw new Error("O texto da postagem é obrigatório.");

            const postPayload = { 
                languageCode: "pt-BR", 
                topicType: topicType || "STANDARD", 
                summary: summary 
            };
            
            if (imageUrl) {
                // encodeURI resolve o DeprecationWarning url.parse do Node para URLs do Cloudinary contendo espaços
                postPayload.media = [{ mediaFormat: "PHOTO", sourceUrl: encodeURI(imageUrl) }];
            }

            // Se o produto estiver vinculado, cria um Botão (Call To Action) na postagem
            if (productUrl) {
                postPayload.callToAction = {
                    actionType: "ORDER", // No Google em PT-BR isso vira "Fazer pedido"
                    url: productUrl
                };
            }

            // O Google exige objeto 'event' e 'schedule' se o post for uma oferta ou evento
            if (topicType === 'OFFER' || topicType === 'EVENT') {
                if (!startDate || !endDate) {
                    throw new Error("Data de Início e Término são obrigatórias para Ofertas e Eventos.");
                }
                
                // Quebra a string "YYYY-MM-DD" localmente para evitar shift de Fuso Horário do objeto Date nativo
                const startYear = parseInt(startDate.split('-')[0]);
                const startMonth = parseInt(startDate.split('-')[1]);
                const startDay = parseInt(startDate.split('-')[2]);
                
                const endYear = parseInt(endDate.split('-')[0]);
                const endMonth = parseInt(endDate.split('-')[1]);
                const endDay = parseInt(endDate.split('-')[2]);

                postPayload.event = {
                    title: topicType === 'EVENT' ? 'Evento Especial' : 'Oferta Especial',
                    schedule: {
                        startDate: { year: startYear, month: startMonth, day: startDay },
                        endDate: { year: endYear, month: endMonth, day: endDay }
                    }
                };
            }

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(postPayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao publicar postagem no Google.");
            return res.status(200).json({ success: true, post: data });
        }

        // 5. AVALIAÇÕES: Buscar (GET)
        if (action === 'getReviews') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao listar avaliações do Google.");
            return res.status(200).json({ success: true, reviews: data });
        }

        // 6. AVALIAÇÕES: Responder (PUT)
        if (action === 'handleReviews') {
            const { reviewId, replyText } = params;
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: replyText })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar resposta para o Google.");
            return res.status(200).json({ success: true, reply: data });
        }

        // 7. MÍDIAS: Buscar Fotos (GET)
        if (action === 'getMedia') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao buscar mídias do Google.");
            return res.status(200).json({ success: true, media: data });
        }

        // 8. MÍDIAS: Fazer Upload (POST)
        if (action === 'uploadGoogleMedia') {
            const { mediaUrl, category } = params; 
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mediaFormat: "PHOTO", 
                    locationAssociation: { category: category }, 
                    sourceUrl: encodeURI(mediaUrl) 
                })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar imagem para o Google.");
            return res.status(200).json({ success: true, media: data });
        }

        // 9. CARDÁPIO: Sincronização em Massa de Produtos (POST)
        if (action === 'syncVeloProducts') {
            const productsSnap = await db.collection('products')
                .where('storeId', '==', storeId)
                .where('isActive', '==', true)
                .get();
                
            if (productsSnap.empty) throw new Error("Nenhum produto ativo encontrado para sincronizar.");

            const products = productsSnap.docs.map(doc => doc.data());
            let syncedCount = 0;
            
            // Cria postagens no formato "Offer/Standard" para preencher o catálogo do Google
            const batchPromises = products.map(async (p) => {
                if (!p.imageUrl) return; 
                
                const postPayload = {
                    languageCode: "pt-BR", 
                    topicType: "STANDARD",
                    summary: `${p.name} - R$ ${p.price}\n\n${p.description || 'Faça seu pedido online agora mesmo.'}`,
                    media: [{ mediaFormat: "PHOTO", sourceUrl: encodeURI(p.imageUrl) }]
                };
                
                const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(postPayload)
                });
                
                if (gRes.ok) syncedCount++;
            });

            await Promise.all(batchPromises);
            
            // Grava o timestamp da última sincronização para a trava do frontend (Antispam)
            await db.collection('stores').doc(storeId).update({
                lastCatalogSync: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, syncedCount });
        }

        // Fallback para Ação Desconhecida
        return res.status(400).json({ success: false, error: 'Ação não reconhecida pelo servidor.' });

    } catch (error) {
        console.error("Erro na API do Google Meu Negócio:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}