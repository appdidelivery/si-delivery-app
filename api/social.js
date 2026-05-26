// Função para gerar o slug a partir do nome
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
    // 1. Identifica a loja de forma Híbrida e Blindada (Subdomínio e Custom Domain)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    
    const baseDomain = 'velodelivery.com.br';
    let storeId = 'velo'; // Fallback seguro para não vazar clientes
    
    if (cleanHost.includes('app.github.dev') || cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1')) {
        const queryStore = req.query.store;
        storeId = queryStore || 'loja-teste';
    } else if (cleanHost.endsWith('.vercel.app')) {
        storeId = cleanHost.split('.')[0];
    } else if (cleanHost === baseDomain) {
        storeId = 'main-app';
    } else if (cleanHost.endsWith(`.${baseDomain}`)) {
        const subdomains = cleanHost.replace(`.${baseDomain}`, '');
        const parts = subdomains.split('.');
        storeId = parts[parts.length - 1];
    } else if (cleanHost !== baseDomain && !cleanHost.endsWith(`.${baseDomain}`)) {
        // Mapeamento Multi-Tenant Correto
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

    // 2. Fallback de dados padrão
    let title = "Velo Delivery | O seu app de entregas";
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://app.velodelivery.com.br/logo-square.png"; 

    // 🚨 SUPER EXTRATOR DE URL V5 (Trata Rewrite da Vercel e Query Strings do Facebook)
    let rawPath = req.url || '';
    
    if (rawPath.includes('route=')) {
        rawPath = decodeURIComponent(rawPath.split('route=')[1].split('&')[0]);
    } else if (req.headers['x-forwarded-uri']) {
        rawPath = req.headers['x-forwarded-uri'];
    }

    if (!rawPath.startsWith('/')) {
        rawPath = '/' + rawPath;
    }

    const finalCleanUrl = `https://${host}${rawPath.split('?')[0]}`;

    let productSchema = "";
    let productMetaTags = "";
    let isProductPage = false;
    let fbDebugStatus = "fallback";

    try {
        // 3. Busca os dados da loja no Firebase via REST API (BLINDADO CONTRA 429)
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp';
        const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
        const authParam = apiKey ? `?key=${apiKey}` : '';
        
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            fbDebugStatus = "success";

            // 4. Injeta dados da loja
            if (data && data.fields) {
                title = data.fields.name?.stringValue || title;
                description = data.fields.slogan?.stringValue || data.fields.message?.stringValue || description;
                let fetchedImage = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                
               if (fetchedImage) {
                    if (fetchedImage.includes('cloudinary.com')) {
                        fetchedImage = fetchedImage.replace(/\.(webp|svg|png)$/i, '.jpg');
                        if (!fetchedImage.includes('/upload/c_pad')) {
                            fetchedImage = fetchedImage.replace('/upload/', '/upload/c_pad,w_600,h_600,b_white,f_jpg,q_80/');
                        }
                    }
                    if (fetchedImage.startsWith('http')) {
                        image = fetchedImage;
                    } else {
                        const cleanImage = fetchedImage.startsWith('/') ? fetchedImage.substring(1) : fetchedImage;
                        image = `https://${host}/${cleanImage}`;
                    }
                }
            }

            // --- INÍCIO: INTELIGÊNCIA DE COMPARTILHAMENTO DE PRODUTO (100% RESTAURADA) ---
            isProductPage = rawPath.includes('/p/');
            
            if (isProductPage) {
                const rawSlug = rawPath.split('/p/')[1];
                const productSlug = rawSlug.split('?')[0].split('&')[0].split('#')[0].replace(/\/$/, '');
                
                const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery${authParam}`;
                const queryBody = {
                    structuredQuery: {
                        from: [{ collectionId: "products" }],
                        where: {
                            fieldFilter: { field: { fieldPath: "storeId" }, op: "EQUAL", value: { stringValue: storeId } }
                        }
                    }
                };

                const prodRes = await fetch(queryUrl, { method: 'POST', body: JSON.stringify(queryBody) });

                if (prodRes.ok) {
                    const productsData = await prodRes.json();
                    
                    for (const item of productsData) {
                        if (item.document && item.document.fields) {
                            const pName = item.document.fields.name?.stringValue || '';
                            const generatedSlug = generateSlug(pName);
                            const savedSlug = item.document.fields.slug?.stringValue || '';
                            
                            const cleanStr = (s) => s ? s.replace(/[^a-z0-9]/g, '') : '';
                            
                            const isMatch = cleanStr(productSlug) === cleanStr(generatedSlug) || 
                                            (savedSlug !== '' && cleanStr(productSlug) === cleanStr(savedSlug)) ||
                                            productSlug.includes(generatedSlug) || 
                                            generatedSlug.includes(productSlug);
                            
                            if (isMatch) {
                                const pDesc = item.document.fields.description?.stringValue || '';
                                const pImg = item.document.fields.imageUrl?.stringValue || '';
                                
                                const pPrice = item.document.fields.price?.doubleValue || item.document.fields.price?.integerValue || 0;
                                const pPromoPrice = item.document.fields.promoPrice?.doubleValue || item.document.fields.promoPrice?.integerValue || 0;
                                const pBrand = item.document.fields.brand?.stringValue || title; 
                                const pGtin = item.document.fields.gtin?.stringValue || '';
                                const pIsPromo = item.document.fields.isPromo?.booleanValue || (pPromoPrice > 0);
                                const finalPrice = pIsPromo && pPromoPrice > 0 ? pPromoPrice : pPrice;

                                const pPrepTime = item.document.fields.prepTime?.integerValue || item.document.fields.prepTime?.doubleValue || null;
                                const pCalories = item.document.fields.calories?.integerValue || item.document.fields.calories?.doubleValue || null;
                                const pDeliveryTime = item.document.fields.deliveryLeadTime?.integerValue || item.document.fields.deliveryLeadTime?.doubleValue || null;
                                const pRatingValue = item.document.fields.ratingValue?.doubleValue || item.document.fields.ratingValue?.integerValue || null;
                                const pReviewCount = item.document.fields.reviewCount?.integerValue || item.document.fields.reviewCount?.doubleValue || null;

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
          "@id": "${finalCleanUrl}#product",
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
        } else {
            fbDebugStatus = `error-${response.status}`;
        }
    } catch (error) {
        fbDebugStatus = "crash";
        console.error(`Erro ao buscar dados para o WhatsApp:`, error);
    }

    // 5. Monta o HTML puro focado SOMENTE nos robôs
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <link rel="canonical" href="${finalCleanUrl}" />
        
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:image:secure_url" content="${image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        <meta property="og:url" content="${finalCleanUrl}" />
        <meta property="fb:app_id" content="966242223397117" />
        
        <meta property="og:type" content="${isProductPage ? 'product' : 'website'}" />
        ${productMetaTags ? productMetaTags : ''}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
        
        ${productSchema ? productSchema : ''}
    </head>
    <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <img src="${image}" alt="${title}" />
    </body>
    </html>
    `;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-SEO-Store', storeId); 
    res.setHeader('X-SEO-Firebase', fbDebugStatus); 
    
    res.status(200).send(html);
}