export const config = {
    // Ignora chamadas de API, arquivos do Vercel e arquivos estáticos (css, js, imagens)
    matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // 1. O SEGREDO DO WHATSAPP: REDIRECIONAR O ROBÔ DIRETO NO MIDDLEWARE
    // REMOVIDO Googlebot e buscadores. Eles PRECISAM ver o site inteiro para indexar SEO e Favicon.
    const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|viber/i.test(userAgent);

    if (isBot) {
        // Redireciona a requisição do bot internamente para o api/social.js de forma transparente
        const apiSocialUrl = new URL(`/api/social`, request.url);
        apiSocialUrl.searchParams.set('route', url.pathname);
        
        return fetch(apiSocialUrl.toString(), {
            method: 'GET',
            headers: request.headers // Repassa os headers originais
        });
    }

    if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
        return fetch(request); 
    }

    const host = request.headers.get('host') || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    
    // 2. MOTOR DE ROTEAMENTO DE DOMÍNIOS
    const baseDomain = 'velodelivery.com.br';
    let storeId = 'csi'; 

    if (cleanHost.endsWith('.vercel.app')) {
        storeId = cleanHost.split('.')[0];
    } else if (cleanHost === baseDomain) {
        storeId = 'main-app';
    } else if (cleanHost.endsWith(`.${baseDomain}`)) {
        const parts = cleanHost.replace(`.${baseDomain}`, '').split('.');
        storeId = parts[parts.length - 1];
    } else {
        const domainMap = {
            "convenienciasantaisabel.com.br": "csi",
            "csi.com.br": "csi",
            "cowburguer.com.br": "cowburguer",
            "encantolilas.app.br": "encantolilas",
            "macanudorex.com.br": "macanudorex",
            "ngconveniencia.com.br": "ng",
            "filial.convenienciasantaisabel.com.br": "filialsantaisabel",
        };
        storeId = domainMap[cleanHost] || cleanHost.split('.')[0];
    }

    // 3. VALORES PADRÃO (FALLBACKS)
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    let name = capitalize(storeId);
    let slogan = 'O seu app de entregas';
    let logo = 'https://app.velodelivery.com.br/logo-square.png'; 
    let debugStatus = 'fallback-initialized';

    // 4. BUSCA NO FIREBASE (EDGE COMPATIBLE)
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
    
    try {
        const authParam = apiKey ? `?key=${apiKey}` : '';
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout no Edge

        const dbRes = await fetch(firestoreUrl, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);

        if (dbRes.ok) {
            const data = await dbRes.json();
            if (data && data.fields) {
                name = data.fields.name?.stringValue || name;
                slogan = data.fields.slogan?.stringValue || data.fields.message?.stringValue || slogan;
                
                const fetchedLogo = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                if (fetchedLogo) {
                    logo = fetchedLogo.startsWith('http') ? fetchedLogo : `https://${host}${fetchedLogo}`;
                }
                debugStatus = 'firebase-success';
            } else {
                debugStatus = 'firebase-document-empty';
            }
        } else {
            debugStatus = `firebase-error-${dbRes.status}`;
        }
    } catch (err) {
        debugStatus = `firebase-fetch-failed`;
    }

    // 5. LEITURA E INJEÇÃO NO INDEX.HTML DO VITE
    let html = '';
    try {
        const indexResponse = await fetch(new URL('/index.html', request.url));
        if (!indexResponse.ok) return fetch(request);
        html = await indexResponse.text();
    } catch (err) {
        return fetch(request);
    }

    // 6. LIMPEZA VORAZ DE META-TAGS ANTIGAS
    // Usamos a flag 'gis' para garantir que ele apague mesmo se a tag quebrar linha
    html = html.replace(/<title[^>]*>.*?<\/title>/gis, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gis, '');
    html = html.replace(/<meta\s+(?:property|name)=["']og:[^>]*>/gis, '');
    html = html.replace(/<meta\s+(?:property|name)=["']twitter:[^>]*>/gis, '');
    // NOVO: Remove os favicons genéricos originais do index.html
    html = html.replace(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gis, '');
    html = html.replace(/<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gis, '');

    // NOVO: Força o Cloudinary a entregar a logo exata em 96x96 para o Google aceitar o Favicon
    let optimizedFavicon = logo;
    if (logo && logo.includes('cloudinary.com')) {
        optimizedFavicon = logo.replace(/\/upload\/([a-zA-Z0-9_,]+\/)?v/, `/upload/f_auto,q_auto:good,w_96,c_limit/v`);
    }

    const tagsSEO = `
    <title>${name} | Delivery</title>
    <meta name="description" content="${slogan}" />
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="${slogan}" />
    <meta property="og:image" content="${logo}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${request.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${name}" />
    <meta name="twitter:description" content="${slogan}" />
    <meta name="twitter:image" content="${logo}" />
    <!-- INJEÇÃO DO FAVICON DINÂMICO NO MIDDLEWARE -->
    <link rel="icon" type="image/png" href="${optimizedFavicon}" />
    <link rel="apple-touch-icon" href="${optimizedFavicon}" />
    `;

    html = html.replace('<head>', `<head>\n${tagsSEO}`);

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'Vary': 'Host', // CRÍTICO: Previne que o cache da loja A apareça na loja B
            'X-SEO-Debug': debugStatus,
            'X-Store-Id': storeId       
        },
    });
}