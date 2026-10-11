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

// Função para gerar slugs limpos
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

// Evita que caracteres quebrem o XML
const escapeXml = (unsafe) => {
  if (!unsafe) return '';
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

// Extrator seguro de data do Firestore (com validação extra contra NaN)
const getSafeDate = (dateField) => {
  const today = new Date().toISOString().split('T')[0];
  if (!dateField) return today;
  if (typeof dateField.toDate === 'function') return dateField.toDate().toISOString().split('T')[0];
  try { 
    const d = new Date(dateField);
    if (isNaN(d.getTime())) return today; // Fallback se a data for inválida
    return d.toISOString().split('T')[0]; 
  } 
  catch (e) { return today; }
};

export default async function handler(req, res) {
  try {
    // 1. Configuração de Cache (Vercel Edge Cache) MANTIDA EXATAMENTE COMO PEDIDO
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/xml');

    // 2. Extração segura do host na Vercel
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const hostname = host.split(':')[0]; 
    const protocol = 'https://'; // Vercel força HTTPS
    
    // Identificador de Bifurcação: É o app agregador ou uma loja cliente?
    const isAggregator = hostname === 'app.velodelivery.com.br' || hostname === 'localhost';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // =========================================================================
    // ROTA A: LÓGICA DO APP AGREGADOR (Shopping)
    // =========================================================================
    if (isAggregator) {
      
      // Home do Agregador
      xml += '  <url>\n';
      xml += `    <loc>${protocol}${host}/</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';

      // Busca todas as Lojas para gerar as URLs das páginas de Reviews
      const storesSnapshot = await db.collection('stores').get();
      if (!storesSnapshot.empty) {
        storesSnapshot.forEach(doc => {
          const storeData = doc.data();
          // Ignora lojas bloqueadas (Anti-Chrun de indexação)
          if (storeData.billingStatus !== 'bloqueado') {
            const storeId = doc.id;
            // Cria a URL estruturada exigida (ex: app.velodelivery.com.br/loja/csi)
            const url = escapeXml(`${protocol}${host}/loja/${storeId}`);
            
            xml += '  <url>\n';
            xml += `    <loc>${url}</loc>\n`;
            // Tenta pegar a data de atualização da loja (quando ela mudou configs), senão usa hoje
            xml += `    <lastmod>${getSafeDate(storeData.updatedAt || new Date().toISOString())}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.9</priority>\n';
            xml += '  </url>\n';
          }
        });
      }

    } 
    // =========================================================================
    // ROTA B: LÓGICA DA LOJA INDIVIDUAL (Tenant)
    // =========================================================================
    else {
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

      if (!storeId) {
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      }

      // HOME DA LOJA
      xml += '  <url>\n';
      xml += `    <loc>${protocol}${host}/</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';

      // PRODUTOS
      const productsSnapshot = await db.collection('products').where('storeId', '==', storeId).get();
      if (!productsSnapshot.empty) {
        productsSnapshot.forEach(doc => {
          const product = doc.data();
          if (product.name) {
            const slug = slugify(product.name);
            const url = escapeXml(`${protocol}${host}/p/${slug}`);
            
            xml += '  <url>\n';
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${getSafeDate(product.updatedAt || product.createdAt)}</lastmod>\n`;
            xml += '    <priority>0.8</priority>\n';
            xml += '  </url>\n';
          }
        });
      }

      // CATEGORIAS
      const categoriesSnapshot = await db.collection('categories').where('storeId', '==', storeId).get();
      if (!categoriesSnapshot.empty) {
        categoriesSnapshot.forEach(doc => {
          const category = doc.data();
          if (category.name) {
            const slug = slugify(category.name);
            const url = escapeXml(`${protocol}${host}/categoria/${slug}`);
              
            xml += '  <url>\n';
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${getSafeDate(category.updatedAt || category.createdAt)}</lastmod>\n`;
            xml += '    <priority>0.7</priority>\n';
            xml += '  </url>\n';
          }
        });
      }
    }

    xml += '</urlset>';
    res.status(200).send(xml);

  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}