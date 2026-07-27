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

    const { storeName, storeNiche, productName, productDesc, productPrice, productId } = req.body;

    if (!productName) {
        return res.status(400).json({ success: false, error: 'O nome do produto é obrigatório.' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(200).json({ success: false, error: 'Chave do Gemini não configurada na Vercel.' });
    }

    try {
        // CACHE
        if (productId) {
            const cacheRef = db.collection('ai_promo_cache').doc(productId);
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
        }

        const prompt = `Crie textos de vendas curtos para Delivery.
        Produto: ${productName} (R$ ${Number(productPrice).toFixed(2)}). Loja: ${storeName}. Nicho: ${storeNiche}.
        Retorne APENAS um JSON válido com 3 chaves:
        {"whatsapp": "1 frase com emojis", "instagram": "2 frases", "hashtags": "#delivery #promo"}`;

        console.log(`🟡 [API CALL] Acionando motor raiz para: ${productName}`);

        // 🚀 O SEGREDO: Modelos exatos que funcionam na sua conta (Copiado do Estoque)
        const modelsToTry = ['gemini-3.5-flash', 'gemini-3-pro'];
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
                break;
            }
        }

        if (!responseOk) {
            console.error("🚨 ERRO DO GOOGLE:", JSON.stringify(aiData));
            return res.status(200).json({ success: false, error: aiData.error?.message || "Erro no Google." });
        }

        const rawJsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) throw new Error("A IA retornou vazio.");

        // Limpa e faz o Parse do JSON
        const cleanText = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(cleanText);

        const instagramComHashtags = `${jsonResult.instagram}\n\n${jsonResult.hashtags}`;

        if (productId) {
            db.collection('ai_promo_cache').doc(productId).set({
                whatsapp: jsonResult.whatsapp,
                instagram: instagramComHashtags,
                hashtags: jsonResult.hashtags,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: instagramComHashtags,
            hashtags: jsonResult.hashtags
        });

    } catch (error) {
        console.error("🔴 Erro Catch:", error.message);
        return res.status(200).json({ success: false, error: 'Falha interna, tente novamente.' });
    }
}