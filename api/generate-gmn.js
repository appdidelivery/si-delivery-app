import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GMN_PROMPT_TEMPLATE = `
Você é um especialista em SEO Local e Copywriting de alta conversão para o ecossistema Velo Delivery.
Gere uma postagem para o Google Meu Negócio focada em Densidade Factual e E-E-A-T.

Lojista: {{tenantName}} ({{tenantCategory}} em {{tenantCity}})
Produto: {{productName}} - R$ {{productPrice}}
Descrição: {{productDescription}}

Detalhes da Foto (IA): {{visualAnalysis}}

Regras: Use os fatos reais, não faça SPAM de palavras-chave. Inclua CTA para pedir.
Formato: Retorne um JSON estrito com "copy" e "jsonLd".
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  try {
    const { imageBuffer, tenantData, productData } = req.body;
    if (!imageBuffer) return res.status(400).json({ error: 'Falta imagem.' });

    // 1. Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(`data:image/jpeg;base64,${imageBuffer}`, {
      folder: `velo/gmn_temp`,
      transformation: [
        { effect: "background_removal" },
        { width: 1080, height: 1080, crop: "pad", background: "auto" }
      ]
    });

    const finalImageUrl = cloudinaryResponse.secure_url;

    // 2. Gemini Visão
    const visionResponse = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [{ inlineData: { mimeType: 'image/jpeg', data: imageBuffer } }, 'Descreva os detalhes reais e apetitosos do produto nesta foto.']
    });

    // 3. Copy Final
    let prompt = GMN_PROMPT_TEMPLATE
      .replace('{{tenantName}}', tenantData.name)
      .replace('{{tenantCategory}}', tenantData.category)
      .replace('{{tenantCity}}', tenantData.city)
      .replace('{{productName}}', productData.name)
      .replace('{{productDescription}}', productData.description)
      .replace('{{productPrice}}', productData.price)
      .replace('{{visualAnalysis}}', visionResponse.text || '');

    const textResponse = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const result = JSON.parse(textResponse.text || '{}');

    return res.status(200).json({
      success: true,
      processedImage: finalImageUrl,
      copy: result.copy,
      jsonLd: result.jsonLd
    });

  } catch (error) {
    return res.status(500).json({ error: 'Falha na IA', details: error.message });
  }
}