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
    console.error("Erro ao inicializar Firebase Admin. Verifique a variável de ambiente.", error);
  }
}

const db = getFirestore();

// Função idêntica ao Frontend para gerar slugs limpos
const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/\s+/g, '-') // Espaços viram hífens
    .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
    .replace(/\-\-+/g, '-') // Previne hífens duplos
    .replace(/^-+/, '') // Remove hífen do início
    .replace(/-+$/, ''); // Remove hífen do final
};

// Evita que caracteres como "&" ou "<" quebrem o XML (Erro fatal no Google Search Console)
const escapeXml = (unsafe) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

// Extrator seguro de data do Firestore
const getSafeDate = (dateField) => {
  if (!dateField) return new Date().toISOString().split('T')[0];
  if (typeof dateField.toDate === 'function') return dateField.toDate().toISOString().split('T')[0];
  try { return new Date(dateField).toISOString().split('T')[0]; } 
  catch (e) { return new Date().toISOString().split('T')[0]; }
};

export default async function handler(req, res) {
  try {
    // 1. Configuração de Cache (Vercel Edge Cache)
    // s-maxage=43200 (12 horas de cache na CDN), stale-while-revalidate (Gera o novo em background)
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/xml');

    // 2. Extração do storeId (tratando localhost com porta e www)
    const host = req.headers.host || '';
    const hostname = host.split(':')[0]; 
    const parts = hostname.split('.');
    let storeId = parts[0] === 'www' ? parts[1] : parts[0];

    // Se não identificar tenant, retorna 404 controladamente
    if (!storeId || parts.length < 2) {
      return res.status(404).send('<error>Tenant not identified</error>');
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // HOME
    xml += '  <url>\n';
    xml += `    <loc>https://${host}/</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // PRODUTOS
    const productsSnapshot = await db.collection('products').where('storeId', '==', storeId).get();
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      if (product.name) {
        const slug = slugify(product.name);
        // loc recebe escapeXml no caso de IDs complexos ou slugs com falha
        const url = escapeXml(`https://${host}/produto/${slug}-${doc.id}`);
        
        xml += '  <url>\n';
        xml += `    <loc>${url}</loc>\n`;
        xml += `    <lastmod>${getSafeDate(product.updatedAt)}</lastmod>\n`;
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
    });

    // CATEGORIAS
    const categoriesSnapshot = await db.collection('categories').where('storeId', '==', storeId).get();
    categoriesSnapshot.forEach(doc => {
      const category = doc.data();
      if (category.name) {
        const slug = slugify(category.name);
        const url = escapeXml(`https://${host}/categoria/${slug}`);
          
        xml += '  <url>\n';
        xml += `    <loc>${url}</loc>\n`;
        xml += `    <lastmod>${getSafeDate(category.updatedAt)}</lastmod>\n`;
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';
    res.status(200).send(xml);

  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);
    // Em caso de erro, retornar 500 sem quebrar a renderização XML (SEO amigável)
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}