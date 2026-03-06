// Arquivo: /middleware.js (Raiz do projeto)

export const config = {
  // Ignora arquivos estáticos e rotas de api
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  
  // 1. Descobre a loja pela URL
  let storeId = host.split('.')[0];
  if (storeId === 'app' || storeId === 'www' || host.includes('localhost')) {
      storeId = 'csi'; // Loja padrão de fallback
  }

  // 2. Identifica se quem está acessando é um robô de rede social
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|viber|SkypeUriPreview/i.test(userAgent);

  // 3. Busca os dados no Firestore (ID fixado com base no seu .env)
  const projectId = 'zetesteapp'; 
  
  // Variáveis padrão de segurança
  let name = 'Velo Delivery';
  let slogan = 'Peça online com rapidez e segurança. O melhor delivery da sua região.';
  let logo = 'https://velodelivery.com.br/painel.jpg';
  
  try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
      const dbRes = await fetch(firestoreUrl);
      
      if (dbRes.ok) {
          const data = await dbRes.json();
          if (data && data.fields) {
              name = data.fields.name?.stringValue || name;
              slogan = data.fields.slogan?.stringValue || data.fields.message?.stringValue || slogan;
              
              let fetchedImage = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
              if (fetchedImage) {
                  logo = fetchedImage.startsWith('http') ? fetchedImage : `https://${host}${fetchedImage.startsWith('/') ? '' : '/'}${fetchedImage}`;
              }
          }
      }
  } catch (err) {
      console.error("Vercel Edge Middleware Error:", err);
  }

  // 🚀 A GRANDE SACADA: SE FOR O WHATSAPP, ENTREGA O HTML PURO DIRETAMENTE
  if (isBot) {
      const botHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <title>${name}</title>
          <meta property="og:title" content="${name} | Delivery" />
          <meta property="og:description" content="${slogan}" />
          <meta property="og:image" content="${logo}" />
          <meta property="og:image:secure_url" content="${logo}" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content="https://${host}${request.url}" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${name} | Delivery" />
          <meta name="twitter:description" content="${slogan}" />
          <meta name="twitter:image" content="${logo}" />
      </head>
      <body>
          <h1>${name}</h1><p>${slogan}</p><img src="${logo}" />
      </body>
      </html>
      `;
      return new Response(botHtml, {
          headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 's-maxage=3600, stale-while-revalidate'
          }
      });
  }

  // 📦 SE FOR UM USUÁRIO NORMAL: Carrega o index.html do Vite e aplica os fallbacks
  const response = await fetch(new URL('/index.html', request.url));
  let html = await response.text();

  html = html.replace(/Velo Delivery \| O seu app de entregas/g, `${name} | Delivery`);
  html = html.replace(/Peça online com rapidez e segurança\. O melhor delivery da sua região\./g, slogan);
  html = html.replace(/\/api\/og/g, logo);

  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' 
      },
  });
}