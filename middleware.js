// Arquivo: /middleware.js (Raiz do projeto)

export const config = {
  // Executa o middleware APENAS em rotas de navegação (ignora imagens, js, css e apis)
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  
  // 🚀 A GRANDE SACADA: O Porteiro VIP para os robôs
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|viber/i.test(userAgent);
  
  // Se for o robô do WhatsApp/Meta, repassa DIRETO para a API que vimos que está 100% funcional!
  if (isBot) {
      return fetch(new URL('/api/social', request.url));
  }

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
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
  
  // Variáveis padrão para garantir que NUNCA fique em branco ou quebrado no WhatsApp
  let name = 'Velo Delivery';
  let slogan = 'Faça seu pedido online.';
  let logo = 'https://velodelivery.com.br/painel.jpg'; // Imagem de segurança válida
  
  if (projectId) {
      try {
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
          const dbRes = await fetch(firestoreUrl);
          
          if (dbRes.ok) {
              const data = await dbRes.json();
              const fields = data.fields;
              
              if (fields) {
                  // Extração segura dos campos do Firestore REST API
                  name = fields.name?.stringValue || name;
                  slogan = fields.slogan?.stringValue || slogan;
                  logo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || logo;
              }
          } else {
              console.error("Firebase API Error:", dbRes.status);
              // Injeta aviso no código fonte para facilitar nosso debug no futuro
              html = html.replace('<head>', `<head>\n\n`);
          }
      } catch (err) {
          console.error("Vercel Edge Middleware Error:", err);
      }
  }

  // 4. Injeção direta baseada EXATAMENTE no que está no seu view-source
  // Substituímos os textos genéricos encontrados no arquivo cru pelas variáveis dinâmicas
  html = html.replace(/Velo Delivery \| O seu app de entregas/g, `${name} | Delivery`);
  html = html.replace(/Plataforma de delivery rápido e fácil\. Peça agora na sua loja favorita com o Velo App!/g, slogan);
  html = html.replace(/Peça online com rapidez e segurança\. O melhor delivery da sua região\./g, slogan);
  
  // Remove o link quebrado que estava no seu view-source e coloca a logo do cliente (ou o fallback seguro)
  html = html.replace(/\/api\/og/g, logo);

  // 5. Retorna o HTML alterado com Cache agressivo para não onerar o Firebase
  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Armazena no Edge Cache da Vercel por 10 minutos (600s)
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' 
      },
  });
}