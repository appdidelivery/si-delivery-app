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

  // 2. Identifica se quem está acessando é um robô de rede social (Porteiro VIP)
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|viber|SkypeUriPreview/i.test(userAgent);

  // 3. Busca os dados no Firestore (ID fixado com base no seu .env de produção)
  const projectId = 'zetesteapp'; 
  
  // Variáveis padrão para garantir que NUNCA fique em branco ou quebrado
  let name = 'Velo Delivery';
  let slogan = 'Plataforma de delivery rápido e fácil. Peça agora na sua loja favorita com o Velo App!';
  let logo = 'https://velodelivery.com.br/painel.jpg'; // Imagem genérica válida
  
  try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
      const dbRes = await fetch(firestoreUrl);
      
      if (dbRes.ok) {
          const data = await dbRes.json();
          const fields = data.fields;
          
          if (fields) {
              // Extração segura dos campos do Firestore REST API
              name = fields.name?.stringValue || name;
              slogan = fields.slogan?.stringValue || fields.message?.stringValue || slogan;
              
              let fetchedImage = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue;
              
              // Garante que o link da logo é absoluto (Exigência do WhatsApp)
              if (fetchedImage) {
                  logo = fetchedImage.startsWith('http') ? fetchedImage : `https://${host}${fetchedImage.startsWith('/') ? '' : '/'}${fetchedImage}`;
              }
          }
      } else {
          console.error("Firebase API Error:", dbRes.status);
      }
  } catch (err) {
      console.error("Vercel Edge Middleware Error:", err);
  }

  // 🚀 CARTA NA MANGA: SE FOR ROBÔ (WHATSAPP), DEVOLVE HTML PURO DIRETAMENTE
  if (isBot) {
      const botHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${name} | Delivery</title>
    <meta name="description" content="${slogan}" />
    <meta property="og:title" content="${name} | Delivery" />
    <meta property="og:description" content="${slogan}" />
    <meta property="og:image" content="${logo}" />
    <meta property="og:image:secure_url" content="${logo}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url.href}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${name} | Delivery" />
    <meta name="twitter:description" content="${slogan}" />
    <meta name="twitter:image" content="${logo}" />
</head>
<body>
    <h1>${name}</h1><p>${slogan}</p><img src="${logo}" alt="Logo" />
</body>
</html>`;

      return new Response(botHtml, {
          headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 's-maxage=3600, stale-while-revalidate'
          }
      });
  }

  // 📦 SE FOR UM USUÁRIO NORMAL (Ou View-Source): Puxa o React e aplica as Regex robustas
  try {
      // Usamos url.origin para garantir que a Vercel ache o próprio arquivo index.html na Edge
      const response = await fetch(new URL('/index.html', url.origin));
      let html = await response.text();

      // Regex à prova de falhas: Encontra a tag inteira e substitui, não importa o conteúdo anterior
      html = html.replace(/<title>.*?<\/title>/gi, `<title>${name} | Delivery</title>`);
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, `<meta name="description" content="${slogan}" />`);
      html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/gi, `<meta property="og:title" content="${name} | Delivery" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/gi, `<meta property="og:description" content="${slogan}" />`);
      html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/gi, `<meta property="og:image" content="${logo}" />`);
      html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/gi, `<meta name="twitter:image" content="${logo}" />`);

      return new Response(html, {
          headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' 
          },
      });
  } catch (error) {
      console.error("HTML Edge Replace Error:", error);
      // Fallback: se falhar, apenas deixa o tráfego passar normalmente
      return fetch(request);
  }
}