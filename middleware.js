// Arquivo: /middleware.js (Raiz do projeto)

export const config = {
  // Executa o middleware APENAS em rotas de navegação (ignora imagens, js, css e apis)
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  
  // 🚨 CORREDOR EXCLUSIVO PARA PRODUTOS (Risco Zero para a Loja)
  // Se for página de produto, o middleware não injeta a loja e deixa o api/social assumir o SEO.
  if (url.pathname.includes('/p/')) {
      return; 
  }

  const host = request.headers.get('host') || '';
  const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
  const baseDomain = 'velodelivery.com.br';
  
  // 1. Descobre a loja pela URL (Lógica blindada idêntica à API)
  let storeId = 'csi'; // Loja padrão de fallback
  
  if (cleanHost === 'app' || cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1') || cleanHost.includes('github.dev')) {
      storeId = 'csi';
  } else if (cleanHost.endsWith('.vercel.app')) {
      storeId = cleanHost.split('.')[0];
  } else if (cleanHost === baseDomain) {
      storeId = 'main-app';
  } else if (cleanHost.endsWith(`.${baseDomain}`)) {
      const subdomains = cleanHost.replace(`.${baseDomain}`, '');
      const parts = subdomains.split('.');
      storeId = parts[parts.length - 1];
  } else {
      // Dicionário Híbrido para Domínios Próprios
      // CÓDIGO NOVO (Copie e cole por cima)
       const domainMap = {
          "convenienciasantaisabel.com.br": "csi",
          "csi.com.br": "csi",
          "cowburguer.com.br": "cowburguer",
          "encantolilas.app.br": "encantolilas",
          "macanudorex.com.br": "macanudorex",
          "ngconveniencia.com.br": "ng",
       };
      storeId = domainMap[cleanHost] || cleanHost.split('.')[0];
  }

  // 2. Pega o index.html original do seu build (SPA Vite)
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

 // 2. Pega o index.html original do seu build (SPA Vite)
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 🚨 LIMPEZA OBRIGATÓRIA (Tirado de dentro do Try/Catch)
  // Independente do Firebase funcionar ou não, varremos as tags quebradas do index.html
  html = html.replace(/<title>.*?<\/title>/gi, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

  // Valores dinâmicos de Fallback. Se o banco falhar, usamos o domínio capitalizado (ex: Cowburguer)
  let name = storeId === 'csi' || storeId === 'main-app' ? 'Velo Delivery' : storeId.charAt(0).toUpperCase() + storeId.slice(1);
  let slogan = 'O seu app de entregas';
  let logo = 'https://velodelivery.com.br/logo-square.png'; 
  
  // 3. Busca os dados da loja no Firestore via REST API (Edge Compatible)
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp'; 
  
  if (projectId) {
      try {
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
          const dbRes = await fetch(firestoreUrl);
          
          if (dbRes.ok) {
              const data = await dbRes.json();
              const fields = data.fields;
              
              if (fields) {
                  name = fields.name?.stringValue || name;
                  slogan = fields.slogan?.stringValue || slogan;
                  let fetchedLogo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue;

                  if (fetchedLogo) {
                      if (fetchedLogo.includes('cloudinary.com')) {
                          fetchedLogo = fetchedLogo.replace(/\.(webp|svg|png)$/i, '.jpg');
                          if (!fetchedLogo.includes('/upload/c_pad')) {
                              fetchedLogo = fetchedLogo.replace('/upload/', '/upload/c_pad,w_600,h_600,b_white,f_jpg,q_80/');
                          }
                      } else if (!fetchedLogo.startsWith('http')) {
                          const cleanLogo = fetchedLogo.startsWith('/') ? fetchedLogo.substring(1) : fetchedLogo;
                          fetchedLogo = `https://${cleanHost}/${cleanLogo}`;
                      }
                      logo = fetchedLogo;
                  }
              }
          }
      } catch (err) {
          console.error("Vercel Edge Middleware Error:", err);
      }
  }

  // 4. ESTRATÉGIA BLINDADA DE INJEÇÃO
  const tagsSEO = `
    <title>${name} | Delivery</title>
    <meta name="description" content="${slogan}" />
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="${slogan}" />
    <meta property="og:image" content="${logo}" />
    <meta property="og:image:secure_url" content="${logo}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${name}" />
    <meta name="twitter:description" content="${slogan}" />
    <meta name="twitter:image" content="${logo}" />
  `;

  // Injeta LOGO APÓS O <HEAD>! 
  html = html.replace('<head>', `<head>\n${tagsSEO}`);

  // 5. Retorna o HTML alterado com Cache agressivo
  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Vary': 'Host'
      },
  });
}