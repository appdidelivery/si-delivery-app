// Arquivo: /middleware.js (Raiz do projeto)

export const config = {
  // Executa o middleware APENAS em rotas de navegação (ignora imagens, js, css e apis)
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  
  // 1. Descobre a loja pela URL
  let storeId = host.split('.')[0];
  
  // Fallbacks de segurança para ambiente de teste ou domínio raiz
  if (storeId === 'app' || storeId === 'www' || host.includes('localhost')) {
      storeId = 'csi'; // Loja padrão de fallback
  }

  // 2. Pega o index.html original do seu build (SPA Vite)
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  // 3. Busca os dados da loja no Firestore via REST API (Edge Compatible)
  // CORREÇÃO: Fallback adicionado para 'zetesteapp' caso a Vercel não entregue a variável Edge
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp'; 
  
  if (projectId) {
      try {
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
          const dbRes = await fetch(firestoreUrl);
          
          if (dbRes.ok) {
              const data = await dbRes.json();
              const fields = data.fields;
              
              if (fields) {
                  // Extração segura dos campos do Firestore REST API
                  const name = fields.name?.stringValue || 'Velo Delivery';
                  const slogan = fields.slogan?.stringValue || 'Faça seu pedido online.';
                  let logo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || 'https://velodelivery.com.br/painel.jpg';

                  // CORREÇÃO: O WhatsApp bloqueia imagens se não forem links absolutos
                  if (!logo.startsWith('http')) {
                      logo = `https://${host}${logo.startsWith('/') ? '' : '/'}${logo}`;
                  }

                  // 4. Injeta as tags no HTML bruto via Regex ANTES de enviar pro WhatsApp
                  html = html.replace(/<title>(.*?)<\/title>/i, `<title>${name} | Delivery</title>`);
                  html = html.replace(/<meta property="og:title" content="(.*?)"/i, `<meta property="og:title" content="${name} | Delivery"`);
                  html = html.replace(/<meta property="og:description" content="(.*?)"/i, `<meta property="og:description" content="${slogan}"`);
                  html = html.replace(/<meta name="description" content="(.*?)"/i, `<meta name="description" content="${slogan}"`);
                  
                  // Atualiza as imagens (Open Graph e Twitter)
                  html = html.replace(/<meta property="og:image" content="(.*?)"/i, `<meta property="og:image" content="${logo}"`);
                  html = html.replace(/<meta property="og:image:secure_url" content="(.*?)"/i, `<meta property="og:image:secure_url" content="${logo}"`);
                  html = html.replace(/<meta name="twitter:image" content="(.*?)"/i, `<meta name="twitter:image" content="${logo}"`);
              }
          }
      } catch (err) {
          console.error("Vercel Edge Middleware Error:", err);
      }
  }

  // 5. Retorna o HTML alterado com Cache agressivo para não onerar o Firebase
  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Armazena no Edge Cache da Vercel por 10 minutos (600s)
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' 
      },
  });
}