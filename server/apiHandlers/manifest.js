const DOMAIN_MAP = {
    "convenienciasantaisabel.com.br": "csi",
    "csi.com.br": "csi",
    "encantolilas.app.br": "encantolilas",
    "macanudorex.com.br": "macanudorex",
    "ngconveniencia.com.br": "ng",
    "filial.convenienciasantaisabel.com.br": "filialsantaisabel",
    "coelhoscuca.com.br": "coelhoscuca",
};

const resolveStoreId = (host) => {
    const cleanHost = (host || '').toLowerCase().trim().replace(/^www\./, '');
    if (DOMAIN_MAP[cleanHost]) return DOMAIN_MAP[cleanHost];
    if (cleanHost.endsWith('.velodelivery.com.br')) return cleanHost.replace('.velodelivery.com.br', '').split('.').pop();
    if (cleanHost.endsWith('.vercel.app')) return cleanHost.split('.')[0];
    return cleanHost.split('.')[0] || 'main-app';
};

const normalizeLogoUrl = (rawLogo, host, size) => {
    if (!rawLogo) return 'https://app.velodelivery.com.br/logo-square.png';
    const absolute = rawLogo.startsWith('http') ? rawLogo : `https://${host}/${rawLogo.replace(/^\//, '')}`;
    if (absolute.includes('res.cloudinary.com') && absolute.includes('/upload/')) {
        return absolute.replace('/upload/', `/upload/c_pad,w_${size},h_${size},b_white,f_png,q_auto/`);
    }
    return absolute;
};

export default async function handler(req, res) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = resolveStoreId(host);

    let name = 'Velo Delivery';
    let shortName = 'Velo';
    let themeColor = '#2563eb';
    let logo192 = 'https://app.velodelivery.com.br/logo-square.png';
    let logo512 = logo192;

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp';
        const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
        const authParam = apiKey ? `?key=${apiKey}` : '';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            const fields = data.fields || {};
            name = fields.name?.stringValue || name;
            shortName = (fields.shortName?.stringValue || name).slice(0, 20);
            themeColor = fields.primaryColor?.stringValue || themeColor;
            const rawLogo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue;
            logo192 = normalizeLogoUrl(rawLogo, host, 192);
            logo512 = normalizeLogoUrl(rawLogo, host, 512);
        }
    } catch (error) {
        // Fallback seguro: mantém o manifest válido mesmo se o Firebase estiver indisponível.
    }

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Vary', 'Host');
    return res.status(200).json({
        name,
        short_name: shortName,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: themeColor,
        background_color: '#ffffff',
        icons: [
            { src: logo192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: logo512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
    });
}
