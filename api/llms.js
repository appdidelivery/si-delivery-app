import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Singleton Pattern Seguro para Vercel Serverless (Igual ao sitemap.js)
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin no LLMS.", error);
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    // 1. Configuração de Cache (24 horas de cache, pois o nome da loja quase nunca muda)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // 2. Extração segura do host na Vercel
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const hostname = host.split(':')[0]; 
    
    // 3. LÓGICA DE RESOLUÇÃO DO STORE ID (Cópia exata da sua lógica do sitemap)
    let storeId = null;

    const customDomains = {
      'convenienciasantaisabel.com.br': 'csi',
      'www.convenienciasantaisabel.com.br': 'csi',
    };

    if (customDomains[hostname]) {
      storeId = customDomains[hostname];
    } else {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        storeId = parts[0] === 'www' ? parts[1] : parts[0];
      }
    }

    // 4. Fallback Padrão caso não ache a loja
    let title = "Velo Delivery";
    let description = "Plataforma de delivery online para restaurantes e lojas de conveniência.";

    // 5. Busca os dados reais da Loja no Firebase
    if (storeId) {
      const storeDoc = await db.collection('stores').doc(storeId).get();
      if (storeDoc.exists) {
        const storeData = storeDoc.data();
        title = storeData.name || title;
        // Tenta pegar o slogan, se não tiver, tenta a description, se não, usa o padrão
        description = storeData.slogan || storeData.description || description;
      }
    }

    // 6. Monta o texto no padrão Agêntico (LLM)
    let llmsTxt = `Title: ${title}\n`;
    llmsTxt += `Description: ${description}\n`;
    llmsTxt += `User-agent: *\n`;
    llmsTxt += `Allow: /\n`;

    res.status(200).send(llmsTxt);

  } catch (error) {
    console.error("Erro ao gerar llms.txt:", error);
    // Em caso de erro, devolve o genérico com status 200 para o Google não penalizar
    res.status(200).send(`Title: Velo Delivery\nDescription: Sistema de Pedidos\nUser-agent: *\nAllow: /\n`);
  }
}