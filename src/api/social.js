// api/social.js
export default async function handler(req, res) {
    // Identificar a loja através do subdomínio (ex: confrariadopeixe)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    // Valores por defeito caso a loja não seja encontrada
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://velodelivery.com.br/logo.png"; // Coloque a URL do logótipo genérico do Velo aqui

    try {
        // Obter os dados diretamente via API REST do Firebase (super rápido e sem dependências)
        // Certifique-se de que a variável de ambiente VITE_FIREBASE_PROJECT_ID está configurada na Vercel
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID; 
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // Se o documento existir, substituímos os valores genéricos pelos do cliente
        if (data && data.fields) {
            title = data.fields.name?.stringValue || title;
            description = data.fields.slogan?.stringValue || description;
            image = data.fields.storeLogoUrl?.stringValue || image;
        }
    } catch (error) {
        console.error("Erro ao obter dados para partilha social:", error);
    }

    // Construção do HTML puro focado apenas em SEO/OG Tags
    const html = `
    <!DOCTYPE html>
    <html lang="pt-PT">
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

    // Cache Edge de 1 hora. Evita que o WhatsApp faça requisições constantes ao seu Firebase
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
}