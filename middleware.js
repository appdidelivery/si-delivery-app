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

                  // 4. ESTRATÉGIA BLINDADA DE INJEÇÃO ANTES DE ENVIAR PARA O WHATSAPP
                  // Remove tags antigas para não gerar conflito ou duplicidade
                  html = html.replace(/<title>.*?<\/title>/gi, '');
                  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
                  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
                  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

                  // Cria o bloco exato e validado que já funciona na sua api/social.js
                  const tagsSEO = `
                    <title>${name} | Delivery</title>
                    <meta name="description" content="${slogan}" />
                    <meta property="og:title" content="${name} | Delivery" />
                    <meta property="og:description" content="${slogan}" />
                    <meta property="og:image" content="${logo}" />
                    <meta property="og:image:secure_url" content="${logo}" />
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />
                    <meta property="og:type" content="website" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="${name} | Delivery" />
                    <meta name="twitter:description" content="${slogan}" />
                    <meta name="twitter:image" content="${logo}" />
                  `;

                  // Injeta com precisão cirúrgica antes de fechar o cabeçalho
                  html = html.replace('</head>', `${tagsSEO}\n</head>`);
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