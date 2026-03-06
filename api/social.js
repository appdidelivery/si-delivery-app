// api/social.js
export default async function handler(req, res) {
    // 1. Identifica a loja pelo subdomínio (ex: meudelivery)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    // 2. Fallback: Se der erro, mostra os dados padrão da Velo
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; // Coloque uma logo genérica válida aqui

    try {
        // 3. Busca os dados no Firebase via REST API
        // Certifique-se que VITE_FIREBASE_PROJECT_ID está cadastrado nas Environment Variables da Vercel!
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();

            // 4. A CORREÇÃO ESTÁ AQUI: Tudo agora é lido da raiz do documento!
            if (data && data.fields) {
                // Pega o nome
                title = data.fields.name?.stringValue || title;

                // Tenta pegar o slogan, se não tiver, tenta a mensagem de aviso
                description = data.fields.slogan?.stringValue || data.fields.message?.stringValue || description;

                // Tenta pegar a storeLogoUrl (novo padrão) ou logoUrl (padrão antigo)
                let fetchedImage = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                
                // GARANTIA WHATSAPP: Valida se a imagem é um link absoluto, exigência do WhatsApp
                if (fetchedImage) {
                    if (fetchedImage.startsWith('http')) {
                        image = fetchedImage;
                    } else {
                        image = `https://${host}${fetchedImage.startsWith('/') ? '' : '/'}${fetchedImage}`;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao buscar dados da loja ${storeId} para o WhatsApp:`, error);
    }

    // 5. Monta o HTML puro focado SOMENTE nos robôs
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:image:secure_url" content="${image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://${host}${req.url}" />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
    </head>
    <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <img src="${image}" alt="${title}" />
    </body>
    </html>
    `;

    // 6. Configura o cache na Vercel (Cache de 1 hora)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
}