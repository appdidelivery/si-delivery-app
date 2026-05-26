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

                  // 🚨 CORREÇÃO CLOUDINARY PARA WHATSAPP/FACEBOOK: Transforma em JPG Quadrado
                  if (logo.includes('cloudinary.com')) {
                      logo = logo.replace(/\.(webp|svg|png)$/i, '.jpg');
                      if (!logo.includes('/upload/c_pad')) {
                          logo = logo.replace('/upload/', '/upload/c_pad,w_600,h_600,b_white,f_jpg,q_80/');
                      }
                  } else if (!logo.startsWith('http')) {
                      logo = `https://${host}${logo.startsWith('/') ? '' : '/'}${logo}`;
                  }

                  // 4. ESTRATÉGIA BLINDADA DE INJEÇÃO ANTES DE ENVIAR PARA O WHATSAPP
                  html = html.replace(/<title>.*?<\/title>/gi, '');
                  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
                  html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
                  html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

                  // Cria o bloco exato e validado (Removemos as tags de height/width rígidas)
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

                  // Injeta LOGO APÓS O <HEAD>! As redes sociais preguiçosas não leem até o final do arquivo.
                  html = html.replace('<head>', `<head>\n${tagsSEO}`);
              }
          }
      } catch (err) {
          console.error("Vercel Edge Middleware Error:", err);
      }
  }

  // 5. Retorna o HTML alterado com Cache agressivo
  return new Response(html, {
      headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Reduzi o tempo de cache no Edge para o WhatsApp não ficar pegando imagem antiga (5 minutos)
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Vary': 'Host'
      },
  });
}