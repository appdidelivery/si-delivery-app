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

    // 2. Extração segura do host na Vercel (Usa o header de proxy reverso da Vercel)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const hostname = host.split(':')[0]; 
    
    // 3. LÓGICA CORRIGIDA DE RESOLUÇÃO DO STORE ID
    let storeId = null;

    // A. Mapeamento de Domínios Próprios (Adicione futuros clientes aqui)
    const customDomains = {
      'convenienciasantaisabel.com.br': 'csi',
      'www.convenienciasantaisabel.com.br': 'csi',
      // 'outrocliente.com.br': 'id_do_banco',
    };

    if (customDomains[hostname]) {
      // Se for um domínio próprio mapeado, pega o ID correto.
      storeId = customDomains[hostname];
    } else {
      // B. Fallback: Lógica para subdomínios (ex: ng.velodelivery.com.br)
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        storeId = parts[0] === 'www' ? parts[1] : parts[0];
      }
    }

    // Se falhar completamente em descobrir quem é, retorna um sitemap vazio estruturado
    if (!storeId) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }

    // Iniciando construção do XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const protocol = 'https://'; // Vercel força HTTPS, não precisamos adivinhar

    // HOME
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
          // O formato exigido: https://dominio.com.br/p/slug-do-produto
          const url = escapeXml(`${protocol}${host}/p/${slug}`);
          
          xml += '  <url>\n';
          xml += `    <loc>${url}</loc>\n`;
          // Tenta updatedAt, se não existir, tenta createdAt
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

    xml += '</urlset>';
    res.status(200).send(xml);

  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);
    // IMPORTANTE PARA SEO: Retornar 200 com sitemap vazio em vez de 500 (Server Error). 
    // O Google Search Console penaliza erros 500 crônicos em sitemaps.
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}