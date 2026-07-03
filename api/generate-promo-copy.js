import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import crypto from 'crypto'; // Usando import global para evitar o erro "require is not defined"

// =========================================================================
// INICIALIZAÇÃO FIREBASE ADMIN (Padrão Serverless Vercel)
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

    if (!process.env.GEMINI_API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não configurada.");
        return res.status(200).json({ success: false, error: 'Chave da API não configurada no servidor.' });
    }

    try {
        // =========================================================================
        // 1. ESTRATÉGIA DE CACHE MULTI-TENANT (Redução Máxima de Custos e Latência)
        // =========================================================================
        const safeStoreName = storeName || 'loja';
        const cacheString = `${safeStoreName}-${productName}`.toLowerCase().trim();
        const cacheKey = crypto.createHash('md5').update(cacheString).digest('hex');
        const cacheRef = db.collection('ai_promo_cache').doc(cacheKey);

        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists) {
            const cachedData = cacheSnap.data();
            console.log(`🟢 [CACHE HIT] Copy de marketing recuperada do banco para: ${productName}`);
            return res.status(200).json({
                success: true,
                whatsapp: cachedData.whatsapp,
                instagram: cachedData.instagram,
                hashtags: cachedData.hashtags,
                _source: 'firestore_cache' 
            });
        }

        // =========================================================================
        // 2. INICIALIZAÇÃO DA IA E ENGENHARIA DE PROMPT CIRÚRGICA (DOWNSIZING)
        // =========================================================================
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Prompt minimalista focado em limites de tokens e formato JSON restrito
        const prompt = `Atue como Copywriter de Delivery. Crie copy de venda para:
Loja: ${storeName || 'Delivery'} (${storeNiche || 'Alimentação'})
Produto: ${productName} (R$ ${productPrice ? Number(productPrice).toFixed(2) : 'A consultar'})
Detalhes: ${productDesc || 'Premium'}

REGRAS ESTRITAS:
1. Retorne APENAS um JSON válido. É TERMINANTEMENTE PROIBIDO usar marcadores markdown (\`\`\`json), saudações ou texto fora do JSON.
2. "whatsapp": Frase direta com gatilho de escassez. MÁXIMO 150 caracteres.
3. "instagram": Legenda de desejo focada no produto. MÁXIMO 250 caracteres.
4. "hashtags": Exatamente 4 hashtags separadas por espaço.

Formato:
{"whatsapp": "...", "instagram": "...", "hashtags": "..."}`;

        console.log(`🟡 [API CALL] Acionando gemini-1.5-flash para gerar copy de: ${productName}`);

        // =========================================================================
        // 3. DOWNSIZING DE MODELO E TRAVAS DE CUSTO
        // Usamos gemini-1.5-flash (Mais barato/rápido) em vez do 2.5/Pro
        // =========================================================================
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 250 // 🚨 TRAVA DE CUSTO: Impede alucinação longa
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("A IA retornou uma resposta vazia.");

        // =========================================================================
        // 4. PARSE SEGURO DO JSON E CACHE ASYNC
        // =========================================================================
        const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let jsonResult;
        try {
            jsonResult = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("🔴 ERRO DE CONVERSÃO DO JSON DA IA:", cleanText);
            throw new Error("A IA quebrou o formato JSON de saída.");
        }

        // Grava no banco sem travar a thread (Fire-and-forget)
        cacheRef.set({
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags,
            productName: productName,
            storeName: safeStoreName,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('🔴 [Firestore Cache Error]:', err));

        // Retorna ao Frontend
        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags
        });

    } catch (error) {
        console.error("🔴 Erro Crítico na Rota de IA (Promo):", error.message);
        return res.status(200).json({ success: false, error: 'Falha de comunicação com a IA. Tente novamente.' });
    }
}