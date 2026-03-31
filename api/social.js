// api/social.js
// Função para ler a URL do produto corretamente
const generateSlug = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
};

export default async function handler(req, res) {
    // 1. Identifica a loja pelo subdomínio (ex: meudelivery)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const storeId = host.split('.')[0]; 

    // 2. Fallback: Se der erro, mostra os dados padrão da Velo
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; // Coloque uma logo genérica válida aqui

    // 🚨 SUPER EXTRATOR DE URL V4 (Corrige a barra engolida pela Vercel)
    let rawPath = req.url || '';
    if (rawPath.includes('route=')) {
        rawPath = decodeURIComponent(rawPath.split('route=')[1].split('&')[0]);
    } else if (req.headers['x-forwarded-uri']) {
        rawPath = req.headers['x-forwarded-uri'];
    }

    // A MÁGICA: Força a barra no início se a Vercel tiver apagado
    if (!rawPath.startsWith('/')) rawPath = '/' + rawPath;

    // URL limpa para o Facebook não reclamar do og:url
    const finalCleanUrl = `https://${host}${rawPath.split('?')[0]}`;

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

           // --- INÍCIO: INTELIGÊNCIA DE COMPARTILHAMENTO DE PRODUTO ---
            let productSchema = "";
            let productMetaTags = "";
            
            const isProductPage = rawPath.includes('/p/');
            if (isProductPage) {
                const rawSlug = rawPath.split('/p/')[1];
                const productSlug = rawSlug.split('?')[0].split('&')[0].split('#')[0].replace(/\/$/, '');
                
                const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
                const queryBody = {
                    structuredQuery: {
                        from: [{ collectionId: "products" }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: "storeId" },
                                op: "EQUAL",
                                value: { stringValue: storeId }
                            }
                        }
                    }
                };

                const prodRes = await fetch(queryUrl, {
                    method: 'POST',
                    body: JSON.stringify(queryBody)
                });

                if (prodRes.ok) {
                    const productsData = await prodRes.json();
                    
                    for (const item of productsData) {
                        if (item.document && item.document.fields) {
                            const pName = item.document.fields.name?.stringValue || '';
                            const generatedSlug = generateSlug(pName);
                            const savedSlug = item.document.fields.slug?.stringValue || '';
                            
                            // 🚨 MATCH BLINDADO: Tolera variações na URL (ex: -delivery-em-casa)
                            const isMatch = productSlug === generatedSlug || 
                                            (savedSlug !== '' && productSlug === savedSlug) ||
                                            productSlug.includes(generatedSlug) || 
                                            generatedSlug.includes(productSlug);
                            
                            if (isMatch) {
                                const pDesc = item.document.fields.description?.stringValue || '';
                                const pImg = item.document.fields.imageUrl?.stringValue || '';
                                
                                const pPrice = item.document.fields.price?.numberValue || item.document.fields.price?.integerValue || 0;
                                const pPromoPrice = item.document.fields.promoPrice?.numberValue || item.document.fields.promoPrice?.integerValue || 0;
                                const pBrand = item.document.fields.brand?.stringValue || title; 
                                const pGtin = item.document.fields.gtin?.stringValue || '';
                                const pIsPromo = item.document.fields.isPromo?.booleanValue || (pPromoPrice > 0);
                                const finalPrice = pIsPromo && pPromoPrice > 0 ? pPromoPrice : pPrice;

                                const pPrepTime = item.document.fields.prepTime?.integerValue || item.document.fields.prepTime?.numberValue || null;
                                const pCalories = item.document.fields.calories?.integerValue || item.document.fields.calories?.numberValue || null;
                                const pDeliveryTime = item.document.fields.deliveryLeadTime?.integerValue || item.document.fields.deliveryLeadTime?.numberValue || null;
                                const pRatingValue = item.document.fields.ratingValue?.numberValue || item.document.fields.ratingValue?.integerValue || null;
                                const pReviewCount = item.document.fields.reviewCount?.integerValue || item.document.fields.reviewCount?.numberValue || null;

                                let pDietSchema = "";
                                if (item.document.fields.suitableForDiet && item.document.fields.suitableForDiet.arrayValue && item.document.fields.suitableForDiet.arrayValue.values) {
                                    const dietArray = item.document.fields.suitableForDiet.arrayValue.values.map(v => `"${v.stringValue}"`);
                                    if (dietArray.length > 0) {
                                        pDietSchema = `"suitableForDiet": [${dietArray.join(', ')}],`;
                                    }
                                }

                                const storeName = title; 
                                title = `${pName} | ${storeName}`; 
                                description = pDesc || `Compre ${pName} online na ${storeName}!`;
                                if (pImg) image = pImg;
                                
                                productMetaTags = `
        <meta property="product:brand" content="${pBrand}" />
        <meta property="product:availability" content="in stock" />
        <meta property="product:condition" content="new" />
        <meta property="product:price:amount" content="${finalPrice}" />
        <meta property="product:price:currency" content="BRL" />
        ${pGtin ? `<meta property="product:gtin" content="${pGtin}" />` : ''}
                                `;

                                const isFoodItem = pPrepTime !== null || pCalories !== null || pDietSchema !== "";
                                const schemaType = isFoodItem ? "MenuItem" : "Product";

                                productSchema = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "${schemaType}",
          "name": "${pName}",
          "image": "${image}",
          "description": "${description}",
          ${!isFoodItem ? `"brand": { "@type": "Brand", "name": "${pBrand}" },` : ''}
          ${pGtin ? `"gtin13": "${pGtin}",` : ''}
          ${pDietSchema}
          ${pCalories ? `"nutrition": { "@type": "NutritionInformation", "calories": "${pCalories} calories" },` : ''}
          ${pRatingValue && pReviewCount ? `"aggregateRating": { "@type": "AggregateRating", "ratingValue": "${pRatingValue}", "reviewCount": "${pReviewCount}" },` : ''}
          "offers": {
            "@type": "Offer",
            "url": "${finalCleanUrl}",
            "priceCurrency": "BRL",
            "price": "${finalPrice}",
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/NewCondition"
            ${pDeliveryTime ? `,"deliveryLeadTime": { "@type": "QuantitativeValue", "value": "${pDeliveryTime}", "unitCode": "MIN" }` : ''}
          }
        }
        </script>
                                `;
                                
                                break; 
                            }
                        }
                    }
                }
            }
            // --- FIM: INTELIGÊNCIA DE COMPARTILHAMENTO DE PRODUTO ---

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
        
        <meta property="og:url" content="${finalCleanUrl}" />
        <meta property="fb:app_id" content="966242223397117" />
        
        <meta property="og:type" content="${isProductPage ? 'product' : 'website'}" />
        ${productMetaTags}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
        
        ${productSchema}
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