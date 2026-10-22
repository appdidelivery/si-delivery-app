export const config = {
    // Ignora chamadas de API, arquivos do Vercel e arquivos estáticos (css, js, imagens)
    matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'],
};

const SCHEMA_TYPES = {
    burger: 'FastFoodRestaurant',
    hamburguer: 'FastFoodRestaurant',
    hamburgueria: 'FastFoodRestaurant',
    fastfood: 'FastFoodRestaurant',
    lanches: 'FastFoodRestaurant',
    pizza: 'Restaurant',
    pizzaria: 'Restaurant',
    restaurant: 'Restaurant',
    restaurante: 'Restaurant',
    sweet: 'IceCreamShop',
    sorveteria: 'IceCreamShop',
    bakery: 'Bakery',
    padaria: 'Bakery',
    convenience: 'ConvenienceStore',
    conveniencia: 'ConvenienceStore',
    drinks: 'LiquorStore',
    adega: 'LiquorStore',
    bebidas: 'LiquorStore',
    market: 'GroceryStore',
    mercado: 'GroceryStore',
    supermercado: 'GroceryStore',
    minimercado: 'GroceryStore',
    mercearia: 'GroceryStore',
    hortifruti: 'GroceryStore',
    floricultura: 'Florist',
};

const FOOD_TYPES = new Set(['Restaurant', 'FastFoodRestaurant', 'IceCreamShop', 'Bakery']);

// Arte de compartilhamento do Mercado MV (imagem da própria unidade, não da Velo/CSI).
// JPG 1200x630 para leitura por WhatsApp, Facebook, Instagram e outros crawlers.
const MARKET_MV_SHARE_IMAGE = 'https://res.cloudinary.com/dud8fzi5r/image/upload/c_pad,w_1200,h_630,b_white,f_jpg,q_85/v1790159685/zz8ipv2xka9fudxcvgvu.jpg';
async function fetchMarketMVLogo() {
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
        const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
        const authParam = apiKey ? '?key=' + apiKey : '';
        const response = await fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/stores/mercadomonteverde' + authParam, { signal: AbortSignal.timeout(1800) });
        if (!response.ok) return null;
        const fields = (await response.json()).fields || {};
        const logo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue;
        if (!logo || !/^https:\/\//i.test(logo)) return null;
        return logo.includes('res.cloudinary.com') && logo.includes('/upload/')
            ? logo.replace('/upload/', '/upload/c_pad,w_1200,h_630,b_white,f_jpg,q_85/')
            : logo;
    } catch { return null; }
}


const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getStringField = (fields, key) => fields?.[key]?.stringValue || '';

const normalizeLogoUrl = (rawLogo, host) => {
    if (!rawLogo) return 'https://app.velodelivery.com.br/logo-square.png';
    const absolute = rawLogo.startsWith('http')
        ? rawLogo
        : `https://${host}/${rawLogo.replace(/^\//, '')}`;

    // Mantém a marca da loja, mas entrega uma imagem quadrada e rastreável quando ela está no Cloudinary.
    if (absolute.includes('res.cloudinary.com') && absolute.includes('/upload/')) {
        return absolute.replace('/upload/', '/upload/c_pad,w_192,h_192,b_white,f_auto,q_auto/');
    }
    return absolute;
};

export default async function middleware(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
        return fetch(request);
    }

    const host = request.headers.get('host') || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    const isMarketMVHub = cleanHost === 'mercadomv.com.br';

    // --- REGRA DE FALLBACK/REDIRECIONAMENTO LIMPO ---
    if (cleanHost === 'cowburguer.com.br' || cleanHost === 'cowburguer.velodelivery.com.br') {
        return Response.redirect('https://www.velodelivery.com.br', 301);
    }

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
            "encantolilas.app.br": "encantolilas",
            "macanudorex.com.br": "macanudorex",
            "ngconveniencia.com.br": "ng",
            "filial.convenienciasantaisabel.com.br": "filialsantaisabel",
            "coelhoscuca.com.br": "coelhoscuca",
            "monteverde.mercadomv.com.br": "mercadomonteverde",
            "sacogrande.mercadomv.com.br": "mercadomonteverdesacogrande",
        };
        storeId = domainMap[cleanHost] || cleanHost.split('.')[0];
    }

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    let name = isMarketMVHub ? 'Mercado MV | Escolha sua unidade' : capitalize(storeId);
    let slogan = isMarketMVHub
        ? 'Compre no Mercado MV. Escolha a unidade Monte Verde ou Saco Grande em Florianópolis.'
        : 'O seu app de entregas';
    let logo = isMarketMVHub
        ? 'https://www.mercadomv.com.br/mercadomv-icon.svg'
        : 'https://app.velodelivery.com.br/logo-square.png';
    let telephone = '';
    let address = '';
    let priceRange = '';
    let niche = '';

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';

    if (!isMarketMVHub) try {
        const authParam = apiKey ? `?key=${apiKey}` : '';
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const dbRes = await fetch(firestoreUrl, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (dbRes.ok) {
            const data = await dbRes.json();
            if (data && data.fields) {
                const fields = data.fields;
                name = getStringField(fields, 'name') || name;
                slogan = getStringField(fields, 'slogan') || getStringField(fields, 'message') || slogan;
                telephone = getStringField(fields, 'phone') || getStringField(fields, 'whatsapp');
                address = getStringField(fields, 'address');
                priceRange = getStringField(fields, 'priceRange');
                niche = (getStringField(fields, 'seoCategory') || getStringField(fields, 'storeNiche') || '').toLowerCase().trim();

                const fetchedLogo = getStringField(fields, 'storeLogoUrl') || getStringField(fields, 'logoUrl');
                logo = normalizeLogoUrl(fetchedLogo, host);
            }
        }
    } catch (err) {
        // Se o Firebase atrasar, preserva o HTML e os fallbacks sem derrubar a loja.
    }

    let html = '';
    try {
        const indexResponse = await fetch(new URL('/index.html', request.url));
        if (!indexResponse.ok) return fetch(request);
        html = await indexResponse.text();
    } catch (err) {
        return fetch(request);
    }

    const shareImage = isMarketMVHub ? (await fetchMarketMVLogo() || MARKET_MV_SHARE_IMAGE) : logo;
    const businessType = SCHEMA_TYPES[niche] || 'LocalBusiness';
    const canonicalUrl = `${url.origin}${url.pathname}`;
    const schema = {
        "@context": "https://schema.org",
        "@type": businessType,
        "@id": `${url.origin}/#store`,
        "name": name,
        "url": url.origin,
        "image": shareImage,
        "logo": logo,
        "description": slogan,
        ...(telephone ? { "telephone": telephone.startsWith('+') ? telephone : `+55${telephone.replace(/\D/g, '')}` } : {}),
        ...(priceRange ? { "priceRange": priceRange } : {}),
        ...(address ? {
            "address": {
                "@type": "PostalAddress",
                "streetAddress": address,
                "addressCountry": "BR"
            }
        } : {}),
        ...(FOOD_TYPES.has(businessType) ? { "menu": url.origin } : {})
    };

    html = html.replace(/<title[^>]*>.*?<\/title>/gis, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gis, '');
    html = html.replace(/<meta\s+(?:property|name)=["']og:[^>]*>/gis, '');
    html = html.replace(/<meta\s+(?:property|name)=["']twitter:[^>]*>/gis, '');
    html = html.replace(/<link\s+[^>]*rel=["'](?:shortcut\s+icon|icon|apple-touch-icon)["'][^>]*>/gis, '');
    html = html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gis, '');
    html = html.replace(/<script[^>]*id=["']velo-server-schema["'][^>]*>[\s\S]*?<\/script>/gis, '');

    const safeName = escapeHtml(name);
    const safeSlogan = escapeHtml(slogan);
    const safeLogo = escapeHtml(logo);
    const safeShareImage = escapeHtml(shareImage);
    const safeCanonical = escapeHtml(canonicalUrl);

    const tagsSEO = `
    <title>${safeName} | Delivery</title>
    <meta name="description" content="${safeSlogan}" />
    <link rel="canonical" href="${safeCanonical}" />
    <link rel="icon" href="${safeLogo}" />
    <link rel="apple-touch-icon" href="${safeLogo}" />
    <meta property="og:title" content="${safeName}" />
    <meta property="og:description" content="${safeSlogan}" />
    <meta property="og:image" content="${safeShareImage}" />
    <meta property="og:image:secure_url" content="${safeShareImage}" />
    ${isMarketMVHub ? '<meta property="og:image:type" content="image/jpeg" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />' : ''}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${safeCanonical}" />
    <meta property="og:site_name" content="${safeName}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeName}" />
    <meta name="twitter:description" content="${safeSlogan}" />
    <meta name="twitter:image" content="${safeShareImage}" />
    <script id="velo-server-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
    `;

    html = html.replace('<head>', `<head>\n${tagsSEO}`);

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': url.pathname.startsWith('/admin') || url.pathname === '/login'
                ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
                : 'public, s-maxage=300, stale-while-revalidate=600',
            'Vary': 'Host',
            'X-Store-Id': storeId
        },
    });
}
