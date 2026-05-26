// ATENÇÃO: NENHUMA IMPORTAÇÃO DO 'next/server' DEVE SER FEITA AQUI.

export const config = {
    // O matcher ignora a pasta /api/, arquivos estáticos e internos da Vercel
    matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'], 
};

export default async function middleware(request) {
    const url = new URL(request.url);

    // 1. Pass-through de Segurança
    // Se a requisição burlar o matcher e for uma API ou um arquivo (ex: .png, .js),
    // apenas repassa a requisição sem tentar injetar HTML.
    if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
        return fetch(request); 
    }

    const host = request.headers.get('host') || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    const storeId = cleanHost.split('.')[0] || 'csi';

    // 2. Variáveis Declaradas Localmente (Impede vazamento de dados entre clientes)
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    let name = (storeId === 'csi' || storeId === 'main-app') ? 'Velo Delivery' : capitalize(storeId);
    let slogan = 'O seu app de entregas';
    let logo = `https://${host}/logo-square.png`; 

    // 3. Busca de Dados no Firebase (Com Tratamento de Erro e Timeout)
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
    
    try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        // Timeout de proteção: Evita que o site fique lento se o Firebase travar (1.5s max)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const dbRes = await fetch(firestoreUrl, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);

        if (dbRes.ok) {
            const data = await dbRes.json();
            if (data && data.fields) {
                name = data.fields.name?.stringValue || name;
                slogan = data.fields.slogan?.stringValue || slogan;
                
                const fetchedLogo = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                if (fetchedLogo) {
                    logo = fetchedLogo.startsWith('http') ? fetchedLogo : `https://${host}${fetchedLogo}`;
                }
            }
        }
    } catch (err) {
        // Se cair aqui (Timeout, erro 403, banco fora do ar), o código IGNORA o erro silenciosamente
        // e segue usando os valores de Fallback declarados na Etapa 2.
        console.warn(`[Edge SEO] Firebase lookup skip para a loja '${storeId}': ${err.message}`);
    }

    // 4. Carrega o index.html estático gerado pelo seu Build (Vite)
    let html = '';
    try {
        const indexResponse = await fetch(new URL('/index.html', request.url));
        if (!indexResponse.ok) {
            return fetch(request); // Fallback: Apenas entrega a requisição intacta
        }
        html = await indexResponse.text();
    } catch (err) {
        return fetch(request);
    }

    // 5. Destruição das Meta Tags Antigas (Regex varredor)
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
    html = html.replace(/<meta\s+property="og:[^>]*>/gi, '');
    html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, '');
    html = html.replace(/<meta\s+name="og:[^>]*>/gi, ''); // Prevenção extra

    // 6. Construção e Injeção das Meta Tags Vivas
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

    // Injeta logo após a abertura do <head>
    html = html.replace('<head>', `<head>\n${tagsSEO}`);

    // 7. Entrega o pacote modificado com API Response Web Standard
    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            // Permite cache rápido na borda para melhorar performance, validando após 5 minutos.
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' 
        },
    });
}