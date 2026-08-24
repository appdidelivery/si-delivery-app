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

    // ========================================================================
    // 🛡️ BLINDAGEM A2: MINI-CATRACA DE AUTENTICAÇÃO (PROTEÇÃO DE COTA IA)
    // ========================================================================
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`🚨 [SECURITY A2] Tentativa de gerar IA sem Token detectada.`);
        return res.status(401).json({ success: false, error: 'Acesso negado: Token ausente.' });
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        // O Firebase Admin verifica criptograficamente a autenticidade de quem pede
        await admin.auth().verifyIdToken(idToken);
    } catch (err) {
        console.error(`🚨 [SECURITY A2] Token Inválido na IA:`, err.message);
        return res.status(401).json({ success: false, error: 'Acesso negado: Token inválido ou expirado.' });
    }
    // ========================================================================
    // FIM DA BLINDAGEM A2
    // ========================================================================

    const { storeName, storeNiche, productName, productDesc, productPrice, productId } = req.body;

    if (!productName) {
        return res.status(400).json({ success: false, error: 'O nome do produto é obrigatório.' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(200).json({ success: false, error: 'Chave do Gemini não configurada na Vercel.' });
    }

   try {
        const hostForLink = req.headers['x-forwarded-host'] || req.headers.host || '';
        const protocolForLink = hostForLink.includes('localhost') ? 'http' : 'https';
        const exactProductLink = productId ? `${protocolForLink}://${hostForLink}/p/${productId}` : `${protocolForLink}://${hostForLink}`;

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

        const prompt = `Atue como um Especialista em SEO Local (E-E-A-T) e Copywriter de Alta Conversão.
Sua missão é criar uma postagem orgânica, autêntica e rica em detalhes para o Google Meu Negócio e WhatsApp.
O texto NÃO PODE parecer gerado por IA (proibido usar palavras clichês de robô como "mergulhe", "descubra", "eleve sua experiência", "jornada de sabor").

DADOS DA LOJA E PRODUTO:
- Loja: ${storeName}
- Nicho: ${storeNiche}
- Produto: ${productName}
- Preço: R$ ${Number(productPrice).toFixed(2)}
- Link de Compra: ${exactProductLink}

REGRAS DE CONTEÚDO:
1. "instagram": Será usado na vitrine do Google. Escreva 1 parágrafo (máximo de 350 caracteres). Aplique E-E-A-T: demonstre especialidade mencionando sutilmente a qualidade ou estado do produto (ex: trincando de gelado para bebidas, recém-preparado para lanches). O tom de voz DEVE se adaptar ao nicho da loja. Posicione a loja como a melhor opção local.
2. "whatsapp": 1 frase curta e magnética, soando como um vendedor humano mandando mensagem, contendo o preço e o gatilho de desejo.
3. "hashtags": 4 a 5 hashtags focadas especificamente no produto e no nicho, sem tags genéricas soltas.

Retorne APENAS um JSON válido.
Formato exigido:
{"whatsapp": "texto", "instagram": "texto", "hashtags": "#tag1 #tag2"}`;

        console.log(`🟡 [API CALL] Acionando motor raiz para: ${productName}`);

        // 🚀 CÓDIGO DE DIAGNÓSTICO E AUTO-CURA (Apenas Flash Gratuito)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const aiData = await response.json();

        // SE O GOOGLE BLOQUEAR, IMPRIME A VERDADE NUA E CRUA NO LOG DA VERCEL
        if (!response.ok) {
            console.error("🚨 ERRO REAL DO GOOGLE (FLASH):", {
                statusHttp: response.status,
                chaveUsada: GEMINI_KEY ? GEMINI_KEY.substring(0, 8) + '...' : 'CHAVE_AUSENTE',
                erroDetalhado: aiData
            });
            return res.status(200).json({ success: false, error: "Erro de permissão na chave do Google. Olhe o log da Vercel." });
        }

        const rawJsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) throw new Error("A IA retornou vazio.");

        // 🛡️ EXTRATOR DE JSON BLINDADO (Ignora qualquer lixo ou markdown ao redor)
        let cleanText = rawJsonText;
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("A IA não retornou um formato JSON válido.");
        }
        
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