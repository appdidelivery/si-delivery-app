// api/social.js
export default async function handler(req, res) {
    // 1. Identifica o cliente pelo subdomínio (ex: confrariadopeixe ou csi)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    // 2. Fallback: Dados genéricos do Velo Delivery caso a loja falhe
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://velodelivery.com.br/logo.png"; 

    try {
        // 3. Busca os dados no Firebase via REST API
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 4. Injeta os dados mapeando a estrutura exata do seu Firestore
        if (data && data.fields) {
            // O nome está na raiz do documento
            title = data.fields.name?.stringValue || title;

            // O Firebase REST coloca mapas dentro de 'mapValue.fields'
            const settingsObj = data.fields.settings?.mapValue?.fields;

            // Pega o slogan de dentro do settings (se existir)
            description = settingsObj?.slogan?.stringValue || description;

            // Tenta pegar a logoUrl da raiz, se não tiver, tenta a storeLogoUrl de dentro do settings
            image = data.fields.logoUrl?.stringValue || settingsObj?.storeLogoUrl?.stringValue || image;
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