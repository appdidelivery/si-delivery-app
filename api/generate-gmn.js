import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

// Configuração do Cloudinary (Requer as variáveis em produção)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Inicialização do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Prompt Mestre Blindado contra MUVERA
const GMN_PROMPT_TEMPLATE = `
Você é um especialista em SEO Local e Copywriting de alta conversão para o ecossistema Velo Delivery.
Sua tarefa é gerar uma postagem para o Google Meu Negócio (Google Business Profile) com altíssima Densidade Factual e autoridade (E-E-A-T), totalmente livre de manipulação forçada de GEO (anti-spam de IA / Atualização MUVERA).

Contexto do Lojista:
- Nome da Loja: {{tenantName}}
- Categoria/Nicho: {{tenantCategory}}
- Cidade/Região de Atuação: {{tenantCity}}

Dados do Produto:
- Nome do Produto: {{productName}}
- Descrição Real: {{productDescription}}
- Preço: R$ {{productPrice}}

Instruções Visuais (Baseado na análise da imagem fornecida):
{{visualAnalysis}}

Regras de Conteúdo:
1. Priorize fatos reais: ingredientes, pontos fortes do produto e utilidade para o cliente local.
2. Proibido termos genéricos, adjetivos vazios em excesso ("o melhor", "incrível", "delicioso") ou repetição exaustiva da cidade/bairro.
3. Inclua uma chamada para ação (CTA) natural direcionando para o link de pedidos do delivery.

Formato de Saída Obrigatório:
A resposta deve ser estritamente um objeto JSON válido, contendo duas chaves principais: "copy" (o texto da postagem) e "jsonLd" (os dados estruturados do produto).

Exemplo de formato de saída:
{
  "copy": "Texto focado na realidade do produto...",
  "jsonLd": {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "{{productName}}",
    "image": "{{cloudinaryImageUrl}}",
    "description": "{{productDescription}}",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "BRL",
      "price": "{{productPrice}}"
    }
  }
}
`;

export default async function handler(req, res) {
  // 1. Liberação de CORS (Garante comunicação limpa)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 2. Preflight request (Opções para o CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Trava de segurança: apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { imageBuffer, tenantData, productData } = req.body;

    if (!imageBuffer || !tenantData || !productData) {
      return res.status(400).json({ error: 'Faltam dados obrigatórios no payload.' });
    }

    // 1. Cloudinary: Remoção de Fundo
    const cloudinaryResponse = await cloudinary.uploader.upload(`data:image/jpeg;base64,${imageBuffer}`, {
      folder: `velo/${tenantData.name.replace(/\s+/g, '-').toLowerCase()}/gmn`,
      transformation: [
        { effect: "background_removal" },
        { width: 1080, height: 1080, crop: "pad", background: "auto" }
      ]
    });

    const finalImageUrl = cloudinaryResponse.secure_url;

    // 2. Gemini 1.5 Pro: Análise Visual da Imagem
    const visionResponse = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer
          }
        },
        'Descreva detalhadamente os aspectos visuais reais deste produto para fins de copywriting comercial rigoroso. Foque em texturas, cores e apresentação real, sem inventar dados.'
      ]
    });

    const visualAnalysis = visionResponse.text || '';

    // 3. Montagem do Prompt Dinâmico
    let prompt = GMN_PROMPT_TEMPLATE
      .replace('{{tenantName}}', tenantData.name)
      .replace('{{tenantCategory}}', tenantData.category)
      .replace('{{tenantCity}}', tenantData.city)
      .replace('{{productName}}', productData.name)
      .replace('{{productDescription}}', productData.description)
      .replace('{{productPrice}}', productData.price.toString())
      .replace('{{cloudinaryImageUrl}}', finalImageUrl)
      .replace('{{visualAnalysis}}', visualAnalysis);

    // 4. Geração do Texto (Copy e JSON-LD)
    const textGenerationResponse = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const contentResult = JSON.parse(textGenerationResponse.text || '{}');

    // 5. Devolve o pacote para a interface
    return res.status(200).json({
      success: true,
      processedImage: finalImageUrl,
      copy: contentResult.copy,
      jsonLd: contentResult.jsonLd
    });

  } catch (error) {
    console.error('Erro na esteira GMN:', error);
    return res.status(500).json({ 
      error: 'Falha ao processar campanha via automação.', 
      details: error.message 
    });
  }
}