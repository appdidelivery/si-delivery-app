import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // 1. Bloqueia qualquer método que não seja POST (Segurança)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    // 2. Recebe os dados da loja e do produto vindos do Frontend
    const { storeName, storeNiche, productName, productDesc, productPrice } = req.body;

    if (!productName) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    // 3. Valida a chave da API
    if (!process.env.GEMINI_API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não configurada nas variáveis de ambiente.");
        return res.status(200).json({ success: false, error: 'Chave da API não configurada no servidor.' });
    }

    try {
        // 4. Inicializa o SDK oficial do Google Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // 5. Engenharia de Prompt (Força formato JSON para o Frontend não quebrar)
        const prompt = `
        Atue como um Copywriter Sênior Especialista em Vendas (Foco em Delivery e Varejo).
        Preciso que você crie textos persuasivos e gatilhos mentais para divulgar um produto.

        DADOS DA LOJA:
        - Nome: ${storeName || 'Nossa Loja'}
        - Nicho: ${storeNiche || 'Varejo/Alimentação'}

        DADOS DO PRODUTO:
        - Nome: ${productName}
        - Preço: R$ ${productPrice ? Number(productPrice).toFixed(2) : 'A consultar'}
        - Descrição: ${productDesc || 'Produto de alta qualidade.'}

        REGRAS DE RETORNO:
        Retorne EXATAMENTE no formato JSON abaixo. NÃO adicione blocos de código Markdown (\`\`\`), não coloque explicações, APENAS o JSON puro.

        {
            "whatsapp": "Texto curto, muito engajador, com emojis e CTA (Call to Action) clara para o cliente fazer o pedido agora com link.",
            "instagram": "Legenda para o feed do Instagram. Focada em despertar desejo e urgência. Inclua uma CTA mandando clicar no link da bio.",
            "hashtags": "3 a 5 hashtags estratégicas baseadas no nicho (ex: #delivery #produto)."
        }
        `;

        // 6. Chama o modelo gemini-2.5-flash forçando a saída em JSON
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7 // Temperatura ideal para criatividade controlada
            }
        });

        // 7. Faz o parse da resposta e envia para o frontend
        // 🚨 A MÁGICA FOI AQUI: Tiramos os parênteses do text(). 
        const resultText = response.text;
        
        if (!resultText) {
            throw new Error("A IA retornou uma resposta vazia.");
        }

        const jsonResult = JSON.parse(resultText);

        return res.status(200).json({
            success: true,
            whatsapp: jsonResult.whatsapp,
            instagram: jsonResult.instagram,
            hashtags: jsonResult.hashtags
        });

    } catch (error) {
        console.error("Erro Crítico na API do Gemini:", error);
        // 🚨 DEVOLVEMOS 200 PRO REACT para que a telinha feche o carregamento (Loading) e mostre o aviso bonito, em vez de travar tudo.
        return res.status(200).json({ success: false, error: 'Falha ao processar a requisição com a IA. Tente novamente.' });
    }
}