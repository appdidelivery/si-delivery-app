// api/sitemap.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANTE: Configure o Firebase Admin SDK para usar em serverless functions.
// NÃO use o SDK do cliente (firebase/firestore) aqui!
// Você precisará de uma conta de serviço do Firebase.
// Coloque o JSON da sua chave de serviço em uma variável de ambiente Vercel
// ou diretamente no código se for um arquivo seguro no build (menos comum).
// Ex: process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(YOUR_FIREBASE_ADMIN_CREDENTIALS);
// Ou carregue de um arquivo, se o build permitir.

// Para Vercel, o ideal é usar um JSON em uma variável de ambiente (stringificada)
// ou importar diretamente o caminho do arquivo JSON se ele estiver na raiz e for um segredo de build.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa o Firebase Admin SDK uma única vez
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  const host = req.headers.host; // Ex: lojadobeto.velodelivery.com.br

  // Extrai o storeId do subdomínio
  const parts = host.split('.');
  const storeId = parts.length > 2 && parts[0] !== 'www' ? parts[0] : null;

  res.setHeader('Content-Type', 'application/xml');

  // Se não conseguir extrair um storeId válido ou for o subdomínio admin, retorna 404
  if (!storeId || storeId === 'csi') {
    res.status(404).send('<error>Sitemap not found or not allowed for this subdomain.</error>');
    return;
  }

  try {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. URL da Home da Loja
    xml += '  <url>\n';
    xml += `    <loc>https://${host}/</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`; // Data atual da geração
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // 2. URLs dos Produtos da Loja
    const productsRef = db.collection('products');
    const productsSnapshot = await productsRef.where('storeId', '==', storeId).get();

    productsSnapshot.forEach(doc => {
      const product = doc.data();
      if (product.name) { // Verifica se o produto tem nome para gerar URL
        const slug = product.name
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        xml += '  <url>\n';
        xml += `    <loc>https://${host}/produto/${slug}-${doc.id}</loc>\n`; // Supondo esta estrutura de URL para produtos
        xml += `    <lastmod>${product.updatedAt?.toDate()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
    });

    // 3. URLs das Categorias da Loja
    const categoriesRef = db.collection('categories');
    const categoriesSnapshot = await categoriesRef.where('storeId', '==', storeId).get();

    categoriesSnapshot.forEach(doc => {
      const category = doc.data();
      if (category.name) {
        const slug = category.name
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
          
        xml += '  <url>\n';
        xml += `    <loc>https://${host}/categoria/${slug}</loc>\n`; // Supondo esta estrutura de URL para categorias
        xml += `    <lastmod>${category.updatedAt?.toDate()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';
    res.send(xml);

  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send('<error>Failed to generate sitemap.</error>');
  }
}