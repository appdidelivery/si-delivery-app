// api/social.js
export default async function handler(req, res) {
    // 1. Identifica a loja pelo subdomínio dinamicamente
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; 
    
    // Novas variáveis para o Schema (SEO Google)
    let ratingAggregate = 0;
    let ratingCount = 0;
    let address = null;
    let whatsapp = "";

    try {
        // 2. Busca os dados no Firebase via REST API
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();

            if (data && data.fields) {
                title = data.fields.name?.stringValue || title;
                description = data.fields.slogan?.stringValue || data.fields.message?.stringValue || description;

                let fetchedImage = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                if (fetchedImage) {
                    image = fetchedImage.startsWith('http') ? fetchedImage : `https://${host}${fetchedImage.startsWith('/') ? '' : '/'}${fetchedImage}`;
                }

                // 3. A MÁGICA DO SEO: Capturando os dados da sua Cloud Function
                ratingAggregate = data.fields.rating_aggregate?.doubleValue || data.fields.rating_aggregate?.integerValue || 0;
                ratingCount = data.fields.rating_count?.integerValue || 0;
                whatsapp = data.fields.whatsapp?.stringValue || "";

                if (data.fields.address?.mapValue?.fields) {
                    const addrFields = data.fields.address.mapValue.fields;
                    address = {
                        street: addrFields.street?.stringValue || "",
                        number: addrFields.number?.stringValue || "",
                        city: addrFields.city?.stringValue || "",
                        state: addrFields.state?.stringValue || "",
                        zip: addrFields.zip?.stringValue || ""
                    };
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao buscar dados da loja ${storeId} para o bot:`, error);
    }

    // 4. Montando os Dados Estruturados para o Googlebot (JSON-LD)
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "LiquorStore",
        "name": title,
        "image": image,
        "description": description,
        "url": `https://${host}`,
        "telephone": whatsapp ? `+${whatsapp.replace(/\D/g, '')}` : "",
        "priceRange": "$$",
        "paymentAccepted": ["Cash", "Credit Card", "Pix"]
    };

    if (address) {
        schemaData.address = {
            "@type": "PostalAddress",
            "streetAddress": `${address.street}, ${address.number}`.trim(),
            "addressLocality": address.city,
            "addressRegion": address.state,
            "postalCode": address.zip,
            "addressCountry": "BR"
        };
    }

    // Só injeta as estrelas se a Cloud Function já tiver contabilizado avaliações
    if (ratingCount > 0) {
        schemaData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": Number(ratingAggregate).toFixed(1),
            "reviewCount": ratingCount.toString()
        };
    }

    const safeJsonLd = JSON.stringify(schemaData).replace(/</g, '\\u003c');

    // 5. Monta o HTML entregando Meta Tags e JSON-LD direto do Servidor
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

        <script type="application/ld+json">
            ${safeJsonLd}
        </script>
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