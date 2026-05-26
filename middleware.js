import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.includes('/api/')) return NextResponse.next();

  const host = request.headers.get('host') || '';
  const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
  
  // Detecção robusta do storeId
  let storeId = 'csi'; // Default de segurança
  if (cleanHost.includes('cowburguer')) storeId = 'cowburguer';
  else if (cleanHost.includes('macanudo')) storeId = 'macanudorex';
  else if (cleanHost.includes('convenienciasantaisabel')) storeId = 'csi';
  else if (cleanHost.endsWith('.vercel.app')) storeId = cleanHost.split('.')[0];
  else storeId = cleanHost.split('.')[0];

  // 1. Pega o template base
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 2. Limpeza profunda: Remove qualquer tag de SEO anterior
  html = html.replace(/<title>.*?<\/title>/gi, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

  // 3. Fallbacks Seguros (Reseta para cada requisição)
  let name = 'Velo Delivery';
  let slogan = 'Peça online com rapidez e segurança.';
  let logo = `https://${host}/logo-square.png`; 

  // 4. Busca dados no Firebase
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp';
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
      console.error("Middleware Firebase error:", err);
  }

  // 5. Injeção das tags corretas
  const tagsSEO = `
    <title>${name} | App de Delivery</title>
    <meta name="description" content="${slogan}" />
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="${slogan}" />
    <meta property="og:image" content="${logo}" />
    <meta property="og:url" content="${request.url}" />
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      },
  });
}