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
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const hostname = host.split(':')[0]; 
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    
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

    if (storeId) {
      const storeDoc = await db.collection('stores').doc(storeId).get();
      if (storeDoc.exists) {
        const storeData = storeDoc.data();
        title = storeData.name || title;
        description = storeData.slogan || storeData.description || description;
      }
    }

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
    console.error("Erro ao gerar llms.txt:", error);
    
    const fallbackHost = req.headers['x-forwarded-host'] || req.headers.host || 'velodelivery.com';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    
    const fallbackTxt = `# Velo Delivery\n\n> Plataforma de delivery online para restaurantes e lojas de conveniência.\n\n## Navegação do App\n- [Acessar Loja](${protocol}://${fallbackHost}/)\n`;
    
    res.status(200).send(fallbackTxt);
  }
}
}