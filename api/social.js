import admin from 'firebase-admin';
import { effectiveUnitPrice } from '../src/lib/promotions.js';

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

const SCHEMA_TYPES = {
    burger: 'FastFoodRestaurant',
    hamburguer: 'FastFoodRestaurant',
    hamburgueria: 'FastFoodRestaurant',
    fastfood: 'FastFoodRestaurant',
    lanches: 'FastFoodRestaurant',
    pizza: 'Restaurant',
    pizzaria: 'Restaurant',
    restaurant: 'Restaurant',
    restaurante: 'Restaurant',
    sweet: 'IceCreamShop',
    sorveteria: 'IceCreamShop',
    bakery: 'Bakery',
    padaria: 'Bakery',
    convenience: 'ConvenienceStore',
    conveniencia: 'ConvenienceStore',
    drinks: 'LiquorStore',
    adega: 'LiquorStore',
    bebidas: 'LiquorStore',
    market: 'GroceryStore',
    mercado: 'GroceryStore',
    supermercado: 'GroceryStore',
    minimercado: 'GroceryStore',
    mercearia: 'GroceryStore',
    hortifruti: 'GroceryStore',
    floricultura: 'Florist',
};
const FOOD_TYPES = new Set(['Restaurant', 'FastFoodRestaurant', 'IceCreamShop', 'Bakery']);
const MARKET_MV_SHARE_IMAGE = 'https://res.cloudinary.com/dud8fzi5r/image/upload/c_pad,w_1200,h_630,b_white,f_jpg,q_85/v1790159685/zz8ipv2xka9fudxcvgvu.jpg';
async function fetchMarketMVLogo() {
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
        const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
        const authParam = apiKey ? '?key=' + apiKey : '';
        const response = await fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/stores/mercadomonteverde' + authParam, { signal: AbortSignal.timeout(1800) });
        if (!response.ok) return null;
        const fields = (await response.json()).fields || {};
        const logo = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue;
        if (!logo || !/^https:\/\//i.test(logo)) return null;
        return logo.includes('res.cloudinary.com') && logo.includes('/upload/')
            ? logo.replace('/upload/', '/upload/c_pad,w_1200,h_630,b_white,f_jpg,q_85/')
            : logo;
    } catch { return null; }
}


export default async function handler(req, res) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const cleanHost = host.toLowerCase().trim().replace(/^www\./, '');
    if (['ngconveniencia.com.br', 'ng.velodelivery.com.br', 'ngconveniencia.velodelivery.com.br'].includes(cleanHost)) {
        return res.status(410).json({error:'Loja indisponível.'});
    }
    const isMarketMVHub = cleanHost === 'mercadomv.com.br';
    
    const domainMap = {
        "convenienciasantaisabel.com.br": "csi",
        "encantolilas.app.br": "encantolilas",
        "macanudorex.com.br": "macanudorex",        "coelhoscuca.com.br": "coelhoscuca",
        "monteverde.mercadomv.com.br": "mercadomonteverde",
        "sacogrande.mercadomv.com.br": "mercadomonteverdesacogrande"
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
    let title = cleanHost === 'mercadomv.com.br' ? 'Mercado MV | Escolha sua unidade' : `${capitalize(storeId)} - Delivery`;
    let description = cleanHost === 'mercadomv.com.br' ? 'Escolha a unidade do Mercado MV: Monte Verde ou Saco Grande, em Florianópolis.' : 'Peça online com rapidez e segurança. O melhor delivery da sua região.';
    let image = isMarketMVHub ? (await fetchMarketMVLogo() || MARKET_MV_SHARE_IMAGE) : 'https://app.velodelivery.com.br/logo-square.png'; 

    let mainSchema = "";
    let productMetaTags = "";
    let isProductPage = rawPath.includes('/p/');

    if (!isMarketMVHub) try {
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

                const niche = (data.fields.seoCategory?.stringValue || data.fields.storeNiche?.stringValue || '').toLowerCase().trim();
                const googleBusinessType = SCHEMA_TYPES[niche] || 'LocalBusiness';
                const isFoodBusiness = FOOD_TYPES.has(googleBusinessType);
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
                                const pPromoPrice = item.document.fields.promotionalPrice?.doubleValue || item.document.fields.promotionalPrice?.integerValue || item.document.fields.promoPrice?.doubleValue || item.document.fields.promoPrice?.integerValue || 0;
                                const finalPrice = effectiveUnitPrice({ price: pPrice, promotionalPrice: pPromoPrice, promotionStartAt: item.document.fields.promotionStartAt?.stringValue || '', promotionEndAt: item.document.fields.promotionEndAt?.stringValue || '' });
                                const pSaleUnit = item.document.fields.saleUnit?.stringValue || 'un';
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

                                const isFoodItem = isFoodBusiness && (pPrepTime !== null || pCalories !== null || pDietSchema !== "");
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
                                    ${pSaleUnit === 'kg' ? `"priceSpecification": { "@type": "UnitPriceSpecification", "price": "${finalPrice}", "priceCurrency": "BRL", "referenceQuantity": { "@type": "QuantitativeValue", "value": 1, "unitCode": "KGM" } },` : ''}
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
                    const menuSectionsMap = {};
                    if (isFoodBusiness) {
                        productsData.forEach(item => {
                            if (item.document && item.document.fields && item.document.fields.isActive?.booleanValue !== false) {
                                const fields = item.document.fields;
                                const pName = fields.name?.stringValue || '';
                                const promoPrice = fields.promotionalPrice?.doubleValue || fields.promotionalPrice?.integerValue || fields.promoPrice?.doubleValue || fields.promoPrice?.integerValue || 0;
                                const basePrice = fields.price?.doubleValue || fields.price?.integerValue || 0;
                                const finalPrice = effectiveUnitPrice({ price: basePrice, promotionalPrice: promoPrice, promotionStartAt: fields.promotionStartAt?.stringValue || '', promotionEndAt: fields.promotionEndAt?.stringValue || '' }).toFixed(2);
                                const category = fields.category?.stringValue || 'Destaques';

                                if (pName) {
                                    if (!menuSectionsMap[category]) menuSectionsMap[category] = [];
                                    menuSectionsMap[category].push({
                                        "@type": "MenuItem",
                                        "@id": `${safeOrigin}/p/${item.document.name.split('/').pop()}#menu-item`,
                                        "name": pName,
                                        "description": fields.description?.stringValue || description,
                                        "image": fields.imageUrl?.stringValue || image,
                                        "offers": {
                                            "@type": "Offer",
                                            "price": finalPrice,
                                            "priceCurrency": "BRL",
                                            "availability": fields.stock?.integerValue === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                                            "url": `${safeOrigin}/p/${item.document.name.split('/').pop()}`
                                        }
                                    });
                                }
                            }
                        });
                    }

                    let menuNode = {};
                    if (isFoodBusiness) {
                        const hasMenuSection = Object.entries(menuSectionsMap).map(([category, items]) => ({
                            "@type": "MenuSection",
                            "name": category,
                            "hasMenuItem": items
                        }));

                        menuNode = {
                            "menu": safeOrigin,
                            ...(hasMenuSection.length > 0 ? {
                                "hasMenu": {
                                    "@type": "Menu",
                                    "@id": `${safeOrigin}/#menu`,
                                    "name": `Cardápio - ${title}`,
                                    "url": safeOrigin,
                                    "hasMenuSection": hasMenuSection
                                }
                            } : {})
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
        <meta property="og:image:secure_url" content="${image}" />
        ${isMarketMVHub ? '<meta property="og:image:type" content="image/jpeg" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />' : ''}
        <meta property="og:url" content="${finalCleanUrl}" />
        <meta property="og:type" content="${isProductPage ? 'product' : 'website'}" />
        ${productMetaTags}
        ${mainSchema}
    </head>
    <body>
        <p>Carregando dados estruturados de SEO...</p>
    </body>
    </html>`;

    res.setHeader('Cache-Control', isMarketMVHub
        ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=60'
        : 's-maxage=86400, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
}