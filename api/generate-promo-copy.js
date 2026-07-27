import admin from 'firebase-admin';
import crypto from 'crypto';

// =========================================================================
// INICIALIZAÇÃO FIREBASE ADMIN
// =========================================================================
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { storeName, storeNiche, productName, productDesc, productPrice } = req.body;

    if (!productName) {
        return res.status(400).json({ success: false, error: 'O nome do produto é obrigatório.' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(200).json({ success: false, error: 'Chave do Gemini não configurada na Vercel.' });
    }

    try {
        // =========================================================================
        // 1. ESTRATÉGIA DE CACHE
        // =========================================================================
        const safeStoreName = storeName || 'loja';
        const cacheString = `${safeStoreName}-${productName}`.toLowerCase().trim();
        const cacheKey = crypto.createHash('md5').update(cacheString).digest('hex');
        const cacheRef = db.collection('ai_promo_cache').doc(cacheKey);

        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists) {
            const cachedData = cacheSnap.data();
            return res.status(200).json({
                success: true,
                whatsapp: cachedData.whatsapp,
                instagram: cachedData.instagram,
                hashtags: cachedData.hashtags
            });
        }

        // =========================================================================
        // 2. ENGENHARIA DE PROMPT E CHAMADA FETCH (IGUAL AO DA ABA ESTOQUE)
        // =========================================================================
        const prompt = `Atue como Copywriter de Delivery. Crie copy de venda para:
Loja: ${storeName || 'Delivery'} (${storeNiche || 'Alimentação'})
Produto: ${productName} (R$ ${productPrice ? Number(productPrice).toFixed(2) : 'A consultar'})
Detalhes: ${productDesc || 'Premium'}

REGRAS ESTRITAS:
1. Retorne APENAS um JSON válido. É TERMINANTEMENTE PROIBIDO usar marcadores markdown (\`\`\`json), saudações ou texto fora do JSON.
2. "whatsapp": Frase direta com gatilho de escassez. MÁXIMO 150 caracteres.
3. "instagram": Legenda de desejo focada no produto. MÁXIMO 250 caracteres.
4. "hashtags": Exatamente 4 hashtags separadas por espaço.

Formato exigido:
{"whatsapp": "...", "instagram": "...", "hashtags": "..."}`;

        // 🚀 MUDANÇA: Travado APENAS no modelo de baixo custo (Flash). 
        // Não vai pular para modelos caros, protegendo seu saldo!
        const modelsToTry = ['gemini-1.5-flash'];
        let aiData = null;
        let responseOk = false;

        for (const model of modelsToTry) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            aiData = await response.json();

            if (response.ok) {
                responseOk = true;
                break; // Se deu certo, para o loop
            }
        }

        if (!responseOk) {
            console.error("🚨 DETALHES DO ERRO DO GOOGLE:", JSON.stringify(aiData, null, 2));
            throw new Error(aiData.error?.message || "O Google recusou a requisição em todos os modelos.");
        }

        const rawJsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) throw new Error("Resposta vazia da IA.");

        // =========================================================================
        // 3. PARSE SEGURO E RETORNO (IDÊNTICO AO DA ABA ESTOQUE)
        // =========================================================================
        const cleanText = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let jsonResult;
        try {
            jsonResult = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("🚨 ERRO DE CONVERSÃO DO JSON:", cleanText);
            throw new Error("A IA não retornou um formato JSON válido.");
        }

        // Grava no banco sem travar a tela
        cacheRef.set({
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags,
            productName: productName,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('[Cache Error]:', err));

        // Retorna ao Frontend (A tela do Google junta a legenda e as hashtags na hora de exibir)
        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: `${jsonResult.instagram}\n\n${jsonResult.hashtags}` // Injeta hashtags pro Google SEO!
        });

    } catch (error) {
        console.error("🔴 Erro na Rota de IA (Promo):", error.message);
        return res.status(200).json({ success: false, error: 'Falha ao gerar texto. Tente novamente.' });
    }
}