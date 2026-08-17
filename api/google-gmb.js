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

        // 🚀 CORREÇÃO CRÍTICA MESTRA: Blindagem do Location ID contra colagens erradas
        let rawLoc = locationId || '';
        if (rawLoc.includes('locations/')) {
            rawLoc = rawLoc.split('locations/')[1]; 
        }
        const cleanLocationId = rawLoc.replace('accounts/-/', '').trim();
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        // ==========================================
        // ESCOPOS DA INTEGRAÇÃO
        // ==========================================

        // 2. PERFIL: Buscar Dados do Local
        if (action === 'getProfile') {
            // 🚀 CORREÇÃO API V1: Troca de 'primaryPhone' por 'phoneNumbers' no readMask
            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=title,profile,phoneNumbers`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Erro na API GMB.");
            
            // 🚀 MÁGICA: Mapeia o resultado para o frontend continuar lendo igualzinho sem quebrar
            const formattedProfile = {
                title: data.title || '',
                profile: { description: data.profile?.description || '' },
                primaryPhone: data.phoneNumbers?.primaryPhone || ''
            };

            return res.status(200).json({ success: true, profile: formattedProfile });
        }

        // 3. PERFIL: Atualizar Dados (PATCH)
        if (action === 'updateBusinessInfo') {
            const { title, description, phone } = params;
            const updatePayload = {};
            const updateMask = [];

            if (title) { updatePayload.title = title; updateMask.push('title'); }
            if (description) { updatePayload.profile = { description }; updateMask.push('profile.description'); }
            if (phone) { 
                // 🚀 CORREÇÃO API V1: Formato novo de telefone exigido pelo Google
                updatePayload.phoneNumbers = { primaryPhone: phone }; 
                updateMask.push('phoneNumbers'); 
            }

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

        // 9. CARDÁPIO: Sincronização NATIVA (PriceLists / Menu) e Posts
        if (action === 'syncVeloProducts') {
            const productsSnap = await db.collection('products')
                .where('storeId', '==', storeId)
                .where('isActive', '==', true)
                .get();
                
            if (productsSnap.empty) throw new Error("Nenhum produto ativo encontrado para sincronizar.");

            // Pegamos o ID do doc para compor o ID do produto no Google
            const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            let menuInjected = false;
            let menuError = null;
            
            // --- PARTE A: ISOLAMENTO TOTAL DA INJEÇÃO DO CARDÁPIO (Risco Zero para o Legado) ---
            try {
                const categoriesMap = {};
                products.forEach(p => {
                    const catName = p.category || 'Destaques';
                    if (!categoriesMap[catName]) categoriesMap[catName] = [];
                    categoriesMap[catName].push(p);
                });

                const sections = Object.keys(categoriesMap).map((catName, index) => {
                    const items = categoriesMap[catName].map((p) => {
                        const finalPrice = Number(p.promotionalPrice > 0 ? p.promotionalPrice : (p.price || 0));
                        const units = Math.floor(finalPrice);
                        const nanos = Math.round((finalPrice - units) * 1000000000);

                        const itemPayload = {
                            itemId: `item_${p.id}`,
                            labels: {
                                displayName: (p.name || '').substring(0, 140),
                                description: (p.description || '').substring(0, 1000)
                            },
                            price: { currencyCode: "BRL", units: String(units), nanos: nanos }
                        };

                        if (p.imageUrl) itemPayload.photoUrl = encodeURI(p.imageUrl);
                        return itemPayload;
                    });

                    return {
                        sectionId: `sec_${index}`,
                        sectionType: "FOOD_AND_DRINK",
                        labels: { displayName: catName.substring(0, 140) },
                        items: items.slice(0, 100) 
                    };
                });

                const priceListsPayload = {
                    priceLists: [{
                        priceListId: "menu_velo_delivery",
                        labels: {
                            displayName: "Cardápio Principal",
                            description: "Nosso cardápio atualizado. Faça seu pedido diretamente conosco!"
                        },
                        sections: sections.slice(0, 100)
                    }]
                };

                // SE O PARÂMETRO 'dryRun' FOR ENVIADO, ELE NÃO BATE NO GOOGLE, APENAS TESTA O PAYLOAD
                if (params.dryRun === 'true') {
                    console.log("DRY RUN PAYLOAD (Não enviado ao Google):", JSON.stringify(priceListsPayload, null, 2));
                    menuInjected = true; 
                } else {
                    const menuRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}?updateMask=priceLists`, {
                        method: 'PATCH',
                        headers: { 
                            'Authorization': `Bearer ${accessToken}`, 
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify(priceListsPayload)
                    });

                    const menuData = await menuRes.json();
                    if (!menuRes.ok) {
                        menuError = menuData.error?.message || "Falha desconhecida";
                        console.error("GMB API (Menu) retornou erro, mas o fluxo continuará:", menuData);
                    } else {
                        menuInjected = true;
                    }
                }
            } catch (err) {
                // Se der qualquer erro na formatação (ex: p.price ser undefined e quebrar a matemática), 
                // ele engole o erro e permite que os Posts abaixo funcionem.
                console.error("Erro interno ao montar/enviar PriceLists:", err);
                menuError = err.message;
            }

            // --- PARTE B: MANUTENÇÃO DOS POSTS (Legado Intacto e Protegido) ---
            let syncedCount = 0;
            const batchPromises = products.map(async (p) => {
                if (!p.imageUrl) return; 
                
                const postPayload = {
                    languageCode: "pt-BR", 
                    topicType: "STANDARD",
                    summary: `${p.name} - R$ ${p.price}\n\n${p.description || 'Faça seu pedido online agora mesmo.'}`,
                    media: [{ mediaFormat: "PHOTO", sourceUrl: encodeURI(p.imageUrl) }]
                };
                
                // Se for dryRun, também não publica o post de verdade
                if (params.dryRun === 'true') {
                    syncedCount++;
                    return;
                }

                const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(postPayload)
                });
                
                if (gRes.ok) syncedCount++;
            });

            await Promise.all(batchPromises);
            
            if (params.dryRun !== 'true') {
                await db.collection('stores').doc(storeId).update({
                    lastCatalogSync: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return res.status(200).json({ 
                success: true, 
                syncedCount, 
                menuInjected, 
                menuError,
                isDryRun: params.dryRun === 'true' 
            });
        }

        // 10. ASSISTENTE DE OTIMIZAÇÃO GMB (VERTEX AI / GEMINI) - VELO GMB SPECIALIST
        if (action === 'askGmbAgent') {
            const { promptUser, storeName, storeNiche, currentBio } = params;
            
            // Reaproveita a mesma arquitetura de chaves seguras do seu sistema Velo Insights
            const GEMINI_KEY = process.env.GEMINI_API_KEY;
            if (!GEMINI_KEY) throw new Error("Chave da IA não configurada no servidor da Vercel.");

            // System Prompt de Injeção de Especialista (E-E-A-T focado em Delivery)
            const systemPrompt = `Você é o "Velo GMB Specialist", um agente de Inteligência Artificial Especialista em SEO Local e Google Meu Negócio focado estritamente em Deliveries e Restaurantes.
Sua missão é ajudar o lojista a dominar a primeira página do Google Maps na cidade dele.

Dados do Lojista:
- Nome da Loja: ${storeName || 'Loja de Delivery'}
- Nicho de Mercado: ${storeNiche || 'Geral'}
- Bio/Descrição Atual no Google: ${currentBio || 'Não preenchida ainda'}

Regras Absolutas:
1. Responda à solicitação de forma direta e altamente aplicável.
2. Use formatação limpa e de fácil leitura (parágrafos curtos, emojis com moderação, sem marcadores de código como \`\`\`).
3. Foque sempre em táticas de conversão e atração de clientes orgânicos.

Solicitação do Lojista: "${promptUser}"`;

            // Chamada nativa para a versão estável do motor de IA que vocês já usam
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });

            const aiData = await aiRes.json();

            if (!aiRes.ok) {
                console.error("Erro na API da IA (GMB Agent):", aiData);
                throw new Error(aiData.error?.message || "O agente especialista de IA está indisponível no momento.");
            }

            const answerText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!answerText) throw new Error("A IA processou o pedido, mas não retornou um texto legível.");

            return res.status(200).json({ success: true, answer: answerText });
        }

        // Fallback para Ação Desconhecida
        return res.status(400).json({ success: false, error: 'Ação não reconhecida pelo servidor.' });

    } catch (error) {
        console.error("Erro na API do Google Meu Negócio:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}