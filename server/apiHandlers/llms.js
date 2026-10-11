import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Singleton Pattern Seguro para Vercel Serverless
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

// Função auxiliar defensiva para lidar com headers
const getSafeHeader = (req, key) => {
  if (!req || !req.headers) return '';
  const value = req.headers[key];
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // 1. Extração Blindada de Headers
    const rawHost = getSafeHeader(req, 'x-forwarded-host') || getSafeHeader(req, 'host') || 'velodelivery.com';
    const hostname = rawHost.split(':')[0]; 
    const protocol = getSafeHeader(req, 'x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${hostname}`;
    
    // 2. Resolução do Store ID
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

    let title = "Velo Delivery";
    let description = "Plataforma de delivery online para restaurantes e lojas de conveniência focada em qualidade e rapidez.";

    // 3. Busca Segura no Firebase
    if (storeId && db) {
      const storeDoc = await db.collection('stores').doc(storeId).get();
      if (storeDoc.exists) {
        const storeData = storeDoc.data();
        title = storeData.name || title;
        description = storeData.slogan || storeData.description || description;
      }
    }

    // 4. Construção do Markdown (Template literals balanceados)
    const llmsTxt = `# ${title}

> ${description}

## Sobre Nós
Este é o catálogo e sistema de delivery oficial da loja ${title}. Oferecemos aos nossos clientes uma forma prática e segura de realizar pedidos online de maneira direta e transparente.

## Navegação e Estrutura
Agentes de IA e crawlers podem navegar pelo nosso ecossistema através dos links estruturados abaixo para descobrir produtos, menus e detalhes do nosso serviço de delivery:

- [Página Inicial e Cardápio](${baseUrl}/)
- [Carrinho e Checkout](${baseUrl}/)
- [Acompanhamento de Pedidos](${baseUrl}/)

## Informações Fatuais (E-E-A-T)
- **Operação:** Plataforma de delivery online (SaaS Multi-tenant).
- **Domínio Principal de Acesso:** ${hostname}
- **Foco do Negócio:** Atendimento direto ao consumidor final com foco em conveniência e eficiência.
`;

    res.status(200).send(llmsTxt);

  } catch (error) {
    console.error("CRITICAL ERROR no api/llms.js:", error);
    const fallbackTxt = `# Velo Delivery\n\n> Plataforma de delivery online para restaurantes e lojas de conveniência.\n\n## Navegação do App\n- [Acessar Loja](https://velodelivery.com/)\n`;
    if (res && res.status) {
      res.status(200).send(fallbackTxt);
    } else {
      res.end(fallbackTxt);
    }
  }
}