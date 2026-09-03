import admin from 'firebase-admin';

// Inicializa o Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
    });
}
const db = admin.firestore();

// Função para gerar o slug
const generateSlug = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

export default async function handler(req, res) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    
    const domainMap = {
        "convenienciasantaisabel.com.br": "csi",
        "encantolilas.app.br": "encantolilas",
        "macanudorex.com.br": "macanudorex",
        "ngconveniencia.com.br": "ng",
        "coelhoscuca.com.br": "coelhoscuca"
    };

    let storeId = 'velo';
    if (domainMap[cleanHost]) storeId = domainMap[cleanHost];
    else if (cleanHost.endsWith('.velodelivery.com.br')) storeId = cleanHost.replace('.velodelivery.com.br', '');
    else if (req.query.store) storeId = req.query.store; 
    else storeId = cleanHost.split('.')[0];

    let rawPath = '/';
    if (req.query && req.query.route) rawPath = req.query.route; 
    else if (req.url) {
        const decodedUrl = decodeURIComponent(req.url);
        if (decodedUrl.includes('route=')) rawPath = decodedUrl.split('route=')[1].split('&')[0];
    }
    if (!rawPath.startsWith('/')) rawPath = '/' + rawPath;

    const safeOrigin = `https://${host}`;
    const finalCleanUrl = `${safeOrigin}${rawPath.split('?')[0]}`;

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    let title = `${capitalize(storeId)} - Delivery`;
    let description = "Peça online com rapidez e segurança. O melhor delivery da sua região.";
    let image = "https://app.velodelivery.com.br/logo-square.png"; 

    let mainSchema = "";
    let productMetaTags = "";
    let isProductPage = rawPath.includes('/p/');

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp';
        const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
        const authParam = apiKey ? `?key=${apiKey}` : '';
        
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();

            let ratingAvg = 0;
            let ratingCount = 0;

            if (data && data.fields) {
                title = data.fields.name?.stringValue || title;
                description = data.fields.slogan?.stringValue || data.fields.message?.stringValue || description;
                let fetchedImage = data.fields.storeLogoUrl?.stringValue || data.fields.logoUrl?.stringValue;
                
                ratingAvg = data.fields.rating_aggregate?.doubleValue || data.fields.rating_aggregate?.integerValue || 0;
                ratingCount = data.fields.rating_count?.integerValue || 0;
                
                if (fetchedImage) {
                    if (fetchedImage.includes('cloudinary.com')) {
                        fetchedImage = fetchedImage.replace(/\.(webp|svg|png)$/i, '.jpg').replace('/upload/', '/upload/c_pad,w_600,h_600,b_white,f_jpg,q_80/');
                    }
                    image = fetchedImage.startsWith('http') ? fetchedImage : `https://${host}/${fetchedImage.startsWith('/') ? fetchedImage.substring(1) : fetchedImage}`;
                }

                const niche = data.fields.storeNiche?.stringValue || 'restaurant';
                const schemaTypes = { 'burger': 'FastFoodRestaurant', 'pizza': 'Restaurant', 'sweet': 'IceCreamShop', 'restaurant': 'Restaurant' };
                const googleBusinessType = schemaTypes[niche] || 'Restaurant';
                const safeTelephone = data.fields.whatsapp?.stringValue ? `+55${data.fields.whatsapp.stringValue.replace(/\D/g, '')}` : "";
                
                let addressObj = { "@type": "PostalAddress", "addressCountry": "BR" };
                if (data.fields.address?.stringValue) addressObj.streetAddress = data.fields.address.stringValue;

                const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery${authParam}`;
                const queryBody = {
                    structuredQuery: {
                        from: [{ collectionId: "products" }],
                        where: { fieldFilter: { field: { fieldPath: "storeId" }, op: "EQUAL", value: { stringValue: storeId } } },
                        limit: { value: 40 }
                    }
                };

                const prodRes = await fetch(queryUrl, { method: 'POST', body: JSON.stringify(queryBody) });
                let productsData = [];
                if (prodRes.ok) productsData = await prodRes.json();

                // -------------------------------------------------------------------------
                // LÓGICA 1: PÁGINA DE PRODUTO INDIVIDUAL (RESTAURADA COM TODOS OS SEUS DADOS RICOS)
                // -------------------------------------------------------------------------
                if (isProductPage) {
                    const productSlug = rawPath.split('/p/')[1].split('?')[0].split('&')[0].split('#')[0].replace(/\/$/, '');
                    
                    for (const item of productsData) {
                        if (item.document && item.document.fields) {
                            const pName = item.document.fields.name?.stringValue || '';
                            const generatedSlug = generateSlug(pName);
                            if (item.document.name.split('/').pop() === productSlug || generatedSlug === productSlug) {
                                
                                const pDesc = item.document.fields.description?.stringValue || '';
                                const pPrice = item.document.fields.price?.doubleValue || item.document.fields.price?.integerValue || 0;
                                const pPromoPrice = item.document.fields.promoPrice?.doubleValue || item.document.fields.promoPrice?.integerValue || 0;
                                const finalPrice = pPromoPrice > 0 ? pPromoPrice : pPrice;
                                const pBrand = item.document.fields.brand?.stringValue || title; 
                                
                                // ATRIBUTOS RICOS RESTAURADOS DO SEU CÓDIGO ORIGINAL
                                const pGtin = item.document.fields.gtin?.stringValue || '';
                                const pPrepTime = item.document.fields.prepTime?.integerValue || item.document.fields.prepTime?.doubleValue || null;
                                const pCalories = item.document.fields.calories?.integerValue || item.document.fields.calories?.doubleValue || null;
                                const pDeliveryTime = item.document.fields.deliveryLeadTime?.integerValue || item.document.fields.deliveryLeadTime?.doubleValue || null;
                                const pRatingValue = item.document.fields.ratingValue?.doubleValue || item.document.fields.ratingValue?.integerValue || null;
                                const pReviewCount = item.document.fields.reviewCount?.integerValue || item.document.fields.reviewCount?.doubleValue || null;

                                let pDietSchema = "";
                                if (item.document.fields.suitableForDiet && item.document.fields.suitableForDiet.arrayValue && item.document.fields.suitableForDiet.arrayValue.values) {
                                    const dietArray = item.document.fields.suitableForDiet.arrayValue.values.map(v => `"${v.stringValue}"`);
                                    if (dietArray.length > 0) pDietSchema = `"suitableForDiet": [${dietArray.join(', ')}],`;
                                }

                                title = `${pName} | ${data.fields.name?.stringValue || 'Loja'}`; 
                                description = pDesc || `Compre ${pName} online!`;
                                if (item.document.fields.imageUrl?.stringValue) image = item.document.fields.imageUrl.stringValue;
                                
                                productMetaTags = `
                                <meta property="product:brand" content="${pBrand}" />
                                <meta property="product:availability" content="in stock" />
                                <meta property="product:price:amount" content="${finalPrice}" />
                                <meta property="product:price:currency" content="BRL" />
                                ${pGtin ? `<meta property="product:gtin" content="${pGtin}" />` : ''}`;

                                const isFoodItem = pPrepTime !== null || pCalories !== null || pDietSchema !== "";
                                const schemaType = isFoodItem ? "MenuItem" : "Product";

                                mainSchema = `
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
                                </script>`;
                                break; 
                            }
                        }
                    }
                } 
                // -------------------------------------------------------------------------
                // LÓGICA 2: PÁGINA INICIAL / CARDÁPIO (A MÁGICA DA VITRINE GOOGLE)
                // -------------------------------------------------------------------------
                else {
                    let menuItemsSchema = [];
                    productsData.forEach(item => {
                        if (item.document && item.document.fields && item.document.fields.isActive?.booleanValue !== false) {
                            const pName = item.document.fields.name?.stringValue || '';
                            const finalPrice = Number(item.document.fields.promoPrice?.doubleValue > 0 ? item.document.fields.promoPrice.doubleValue : (item.document.fields.price?.doubleValue || 0)).toFixed(2);
                            if (pName) {
                                menuItemsSchema.push({
                                    "@type": "MenuItem",
                                    "name": pName,
                                    "description": item.document.fields.description?.stringValue || description,
                                    "image": item.document.fields.imageUrl?.stringValue || image,
                                    "offers": {
                                        "@type": "Offer",
                                        "price": finalPrice,
                                        "priceCurrency": "BRL",
                                        "url": `${safeOrigin}/p/${item.document.name.split('/').pop()}`
                                    }
                                });
                            }
                        }
                    });

                    let menuNode = {};
                    if (menuItemsSchema.length > 0) {
                        menuNode = {
                            "hasMenu": {
                                "@type": "Menu",
                                "name": `Cardápio - ${title}`,
                                "url": safeOrigin,
                                "hasMenuSection": [{
                                    "@type": "MenuSection",
                                    "name": "Destaques do Cardápio",
                                    "hasMenuItem": menuItemsSchema
                                }]
                            }
                        };
                    }

                    let reviewNode = {};
                    if (ratingCount > 0) {
                        reviewNode = {
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": Number(ratingAvg).toFixed(1),
                                "reviewCount": String(ratingCount)
                            }
                        };
                    }

                    const storeSchemaObj = {
                        "@context": "https://schema.org",
                        "@type": googleBusinessType,
                        "name": title,
                        "image": image,
                        "description": description,
                        "url": safeOrigin,
                        "telephone": safeTelephone,
                        "address": addressObj,
                        ...reviewNode,
                        ...menuNode
                    };

                    mainSchema = `<script type="application/ld+json">${JSON.stringify(storeSchemaObj)}</script>`;
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao buscar dados para o Social.js:`, error);
    }

    const html = `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${finalCleanUrl}" />
        <meta property="og:type" content="${isProductPage ? 'product' : 'website'}" />
        ${productMetaTags}
        ${mainSchema}
    </head>
    <body>
        <p>Carregando dados estruturados de SEO...</p>
    </body>
    </html>`;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
}