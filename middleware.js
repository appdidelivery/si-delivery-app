export const config = {
    matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
        return fetch(request); 
    }

    const host = request.headers.get('host') || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    
    // 1. MOTOR DE ROTEAMENTO DE DOMÍNIOS
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
        };
        storeId = domainMap[cleanHost] || cleanHost.split('.')[0];
    }

    // 2. VALORES PADRÃO (FALLBACKS)
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    let name = capitalize(storeId);
    let slogan = 'O seu app de entregas';
    let logo = 'https://app.velodelivery.com.br/logo-square.png'; 
    let debugStatus = 'fallback-initialized';

    // 3. BUSCA NO FIREBASE (AGORA COM API KEY PARA EVITAR ERRO 429)
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
    // Puxa a chave de API das variáveis de ambiente da Vercel
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
    
    try {
        // Injeta a key na URL se ela existir
        const authParam = apiKey ? `?key=${apiKey}` : '';
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        debugStatus = `firebase-fetch-failed-${err.name}`;
    }

    // 4. LEITURA E INJEÇÃO NO INDEX.HTML
    let html = '';
    try {
        const indexResponse = await fetch(new URL('/index.html', request.url));
        if (!indexResponse.ok) return fetch(request);
        html = await indexResponse.text();
    } catch (err) {
        return fetch(request);
    }

    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
    html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
    html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

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
    `;

    html = html.replace('<head>', `<head>\n${tagsSEO}`);

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            // Aumentamos o cache para 5 minutos (300 segundos). Isso blinda o Firebase contra limite de requisições.
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-SEO-Debug': debugStatus,
            'X-Store-Id': storeId       
        },
    });
}