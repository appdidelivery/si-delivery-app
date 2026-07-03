import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import crypto from 'crypto';

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
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const { storeName, storeNiche, productName, productDesc, productPrice, productId } = req.body;

    if (!productName) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ success: false, error: 'Chave da API não configurada.' });
    }

    try {
        const cacheString = `${storeName}-${productId || productName}`.toLowerCase().trim();
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

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `Atue como Copywriter de Delivery. Crie copy de venda para:
Loja: ${storeName} (${storeNiche})
Produto: ${productName} (R$ ${productPrice ? Number(productPrice).toFixed(2) : 'A consultar'})
Detalhes: ${productDesc || 'Qualidade premium'}

REGRAS ESTRITAS DE RETORNO:
1. Retorne APENAS um JSON válido. É PROIBIDO usar marcadores markdown (\`\`\`json).
2. "whatsapp": Frase direta, com gatilho de escassez e 1 emoji. MÁX 150 caracteres.
3. "instagram": Legenda de desejo com CTA para o link da bio. MÁX 250 caracteres.
4. "hashtags": Exatamente 4 hashtags separadas por espaço.

Formato exigido:
{"whatsapp": "...", "instagram": "...", "hashtags": "..."}`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 250
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("A IA retornou resposta vazia.");

        const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(cleanText);

        cacheRef.set({
            ...jsonResult,
            productName: productName,
            storeName: storeName,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('[Cache Error]:', err));

        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags
        });

    } catch (error) {
        console.error("Erro Crítico na API do Gemini (Promo):", error);
        return res.status(200).json({ success: false, error: 'Falha ao processar com a IA. Tente novamente.' });
    }
}