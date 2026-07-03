import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import crypto from 'crypto';

// Inicialização segura do Firebase Admin em ambiente Serverless
// Previne o erro "App already exists" nas chamadas em lote da Vercel
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

    // Incluímos 'productId' (já enviado pelo seu React) para fortalecer o Hash Multi-Tenant
    const { storeName, storeNiche, productName, productDesc, productPrice, productId } = req.body;

    if (!productName) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    if (!process.env.GEMINI_API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não configurada.");
        return res.status(200).json({ success: false, error: 'Chave da API não configurada no servidor.' });
    }

    try {
        // =========================================================================
        // 1. ESTRATÉGIA DE CACHE MULTI-TENANT (Reduz custo p/ R$ 0,00 e latência p/ ~150ms)
        // =========================================================================
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
                hashtags: cachedData.hashtags,
                _source: 'firestore_cache' // Tag analítica invisível para auditoria
            });
        }

        // =========================================================================
        // 2. INICIALIZAÇÃO DA IA E ENGENHARIA DE PROMPT CIRÚRGICA
        // =========================================================================
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Prompt comprimido: Removemos instruções verbosas para focar em regras de limite
        const prompt = `Atue como Copywriter de Delivery. Crie copy de venda para:
Loja: ${storeName} (${storeNiche})
Produto: ${productName} (R$ ${productPrice ? Number(productPrice).toFixed(2) : 'A consultar'})
Detalhes: ${productDesc || 'Qualidade premium'}

REGRAS ESTRITAS DE RETORNO:
1. Retorne APENAS um JSON válido. É TERMINANTEMENTE PROIBIDO usar marcadores markdown (\`\`\`json), saudações ou texto fora do JSON.
2. "whatsapp": Frase direta, com gatilho de escassez e 1 emoji. MÁXIMO 150 caracteres.
3. "instagram": Legenda de desejo com CTA para o link da bio. MÁXIMO 250 caracteres.
4. "hashtags": Exatamente 4 hashtags separadas por espaço.

Formato exigido:
{"whatsapp": "...", "instagram": "...", "hashtags": "..."}`;

        // =========================================================================
        // 3. DOWNSIZING DE MODELO E TRAVAS DE CUSTO (Output Limitado)
        // =========================================================================
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // Modelo validado e focado em custo/latência para estruturação
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 250 // 🚨 TRAVA DE CUSTO: Impede que a IA ignore a regra e gere textos longos
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("A IA retornou uma resposta vazia.");

        // Limpeza de redundância caso a IA, num comportamento anômalo, ainda envie Markdown
        const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(cleanText);

        // =========================================================================
        // 4. CACHE ASYNC (Fire-and-forget: salva no banco sem atrasar o retorno pro front)
        // =========================================================================
        cacheRef.set({
            ...jsonResult,
            productName: productName,
            storeName: storeName,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('[Velo Cache Error]:', err));

        // =========================================================================
        // 5. RETORNO OTIMIZADO
        // =========================================================================
        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags
        });

    } catch (error) {
        console.error("Erro Crítico na API do Gemini:", error);
        return res.status(200).json({ success: false, error: 'Falha ao processar a requisição com a IA. Tente novamente.' });
    }
}