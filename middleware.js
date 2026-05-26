// REMOVA O IMPORT DO NEXT/SERVER - ELE CAUSA O ERRO DE BUILD
// import { NextResponse } from 'next/server'; 

export const config = {
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export async function middleware(request) {
  const url = new URL(request.url);
  
  // Ignora rotas de API
  if (url.pathname.includes('/api/')) {
      return new Response(null, { status: 200 }); // Continua sem alterar
  }

  const host = request.headers.get('host') || '';
  const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
  const storeId = cleanHost.split('.')[0] || 'csi';

  // 1. Pega o index.html original
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 2. Limpeza das tags antigas
  html = html.replace(/<title>.*?<\/title>/gi, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

  // 3. Fallbacks
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  let name = storeId === 'csi' || storeId === 'main-app' ? 'Velo Delivery' : capitalize(storeId);
  let slogan = 'O seu app de entregas';
  let logo = `https://${host}/logo-square.png`; 

  // 4. Busca dados no Firebase (Tratamento de erro silencioso)
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
  
  try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
      const dbRes = await fetch(firestoreUrl);
      if (dbRes.ok) {
          const data = await dbRes.json();
          if (data.fields) {
              name = data.fields.name?.stringValue || name;
              slogan = data.fields.slogan?.stringValue || slogan;
              const fetchedLogo = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
              if (fetchedLogo) logo = fetchedLogo.startsWith('http') ? fetchedLogo : `https://${host}${fetchedLogo}`;
          }
      }
  } catch (err) {
      console.error("Middleware Firebase skip:", err.message);
  }

  // 5. Injeção das Tags
  const tagsSEO = `
    <title>${name} | Delivery</title>
    <meta name="description" content="${slogan}" />
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="${slogan}" />
    <meta property="og:image" content="${logo}" />
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
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      },
  });
}