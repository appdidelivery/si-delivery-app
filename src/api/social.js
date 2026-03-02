// api/social.js
export default async function handler(req, res) {
    // 1. Identifica o cliente pelo subdomínio (ex: confrariadopeixe)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    // 2. Fallback: Dados genéricos do Velo Delivery caso a loja falhe
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://velodelivery.com.br/logo.png"; // Substitua pela URL real da logo do Velo

    try {
        // 3. Busca os dados no Firebase via REST API (Ultra rápido)
        // Substitua 'SEU_PROJECT_ID' pelo ID real do seu projeto Firebase (ex: velo-delivery-app)
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 4. Injeta os dados da loja se o documento existir no Firestore
        if (data && data.fields) {
            title = data.fields.name?.stringValue || title;
            description = data.fields.slogan?.stringValue || description;
            image = data.fields.storeLogoUrl?.stringValue || image;
        }
    } catch (error) {
        console.error("Erro ao buscar dados da loja para o WhatsApp:", error);
    }

    // 5. Monta o HTML puro focado SOMENTE nos robôs (OG Tags)
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="https://${host}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="${image}" />
    </head>
    <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <img src="${image}" alt="${title}" />
    </body>
    </html>
    `;

    // 6. Configura o cache na Edge Network da Vercel (1 hora)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
}