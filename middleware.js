export const config = {
  // Executa o middleware APENAS em rotas de navegação (ignora imagens, js, css e apis)
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/p/')) {
      return; 
  }

  const host = request.headers.get('host') || '';
  const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
  const baseDomain = 'velodelivery.com.br';
  
  let storeId = 'csi'; 
  
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

  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 🚨 1. LIMPEZA INCONDICIONAL: Apaga as tags genéricas e o erro /api/og do index.html
  html = html.replace(/<title>.*?<\/title>/gi, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

  // 🚨 2. FALLBACK INTELIGENTE: Pega o nome do domínio e capitaliza se o banco falhar
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  let name = storeId === 'csi' || storeId === 'main-app' ? 'Velo Delivery' : capitalize(storeId);
  let slogan = 'O seu app de entregas';
  let logo = `https://${host}/logo-square.png`; 

  // 3. Tenta buscar dados ricos no Firebase
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
          console.error("Vercel Edge Middleware Firebase block:", err);
      }
  }

  // 🚨 4. INJEÇÃO BLINDADA: Injeta fora do Try/Catch para garantir a leitura social
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

  html = html.replace('<head>', `<head>\n${tagsSEO}`);

  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Vary': 'Host'
      },
  });
}