// Arquivo: /middleware.js (Raiz do projeto)

export const config = {
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  
  // 1. Descobre a loja pela URL
  let storeId = host.split('.')[0];
  if (storeId === 'app' || storeId === 'www' || host.includes('localhost')) {
      storeId = 'csi'; 
  }

  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 2. CORREÇÃO: Fallback de Variável de Ambiente para Vercel
  // Troque 'velodelivery-xxxx' pelo ID real do seu projeto Firebase se as variáveis falharem
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
  
  if (projectId) {
      try {
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
          const dbRes = await fetch(firestoreUrl);
          
          if (dbRes.ok) {
              const data = await dbRes.json();
              const fields = data.fields;
              
              if (fields) {
                  const name = fields.name?.stringValue || 'Velo Delivery';
                  const slogan = fields.slogan?.stringValue || 'Faça seu pedido online.';
                  const logo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || 'https://velodelivery.com.br/painel.jpg';

                  // 3. CORREÇÃO: Cria o bloco de tags dinâmicas
                  const dynamicTags = `
                      <title>${name} | Delivery</title>
                      <meta name="description" content="${slogan}" />
                      <meta property="og:title" content="${name} | Delivery" />
                      <meta property="og:description" content="${slogan}" />
                      <meta property="og:image" content="${logo}" />
                      <meta property="og:image:secure_url" content="${logo}" />
                      <meta property="og:type" content="website" />
                      <meta name="twitter:image" content="${logo}" />
                  `;

                  // 4. CORREÇÃO: Estratégia "Limpar e Injetar"
                  // Remove tags de título, description e open graph velhas geradas pelo Vite
                  html = html.replace(/<title>(.*?)<\/title>/gi, '');
                  html = html.replace(/<meta name="description"(.*?)>/gi, '');
                  html = html.replace(/<meta property="og:(.*?)>/gi, '');
                  
                  // Injeta as tags novinhas logo antes de fechar o head
                  html = html.replace('</head>', `${dynamicTags}\n</head>`);
              }
          }
      } catch (err) {
          console.error("Vercel Edge Middleware Error:", err);
      }
  }

  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' 
      },
  });
}