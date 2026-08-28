import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';
import { getStoreIdFromHostname } from '../utils/domainHelper';

export default function SEO({ title, description, image, productData }) {
    // 1. Pega os dados do Banco de Dados (SaaS) para uso na UI
    const { store } = useStore();

    // 2. Define valores padrão
    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "/logo-square.png";

    // 3. Decide quem manda
    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title}` : `${siteName} - App`;
    const finalDesc = description || store?.aboutText || store?.slogan || store?.description || defaultDesc;
    
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velodelivery.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velodelivery.com.br";
    const baseUrl = currentUrl.split('?')[0]; 

    // 4. MOTOR DE INJEÇÃO REST API (BLINDAGEM NÍVEL MILITAR)
    useEffect(() => {
        let isMounted = true;

        const injectSchemaForGoogle = async () => {
            try {
                const hostname = window.location.hostname;
                const storeId = getStoreIdFromHostname();
                
                const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
                const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || ''; 
                const authParam = apiKey ? `?key=${apiKey}` : '';
                const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
                
                // --- ISOLAMENTO DO FETCH DA LOJA ---
                let data = null;
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        data = await response.json();
                    } else {
                        console.warn(`SEO: API REST da loja falhou (Status ${response.status}).`);
                    }
                } catch (fetchErr) {
                    console.warn("SEO: Erro de rede ou bloqueio ao buscar loja. Acionando Fallback.", fetchErr);
                }

                // BLINDAGEM MÁXIMA: Se o fetch deu erro (ex: 429), cria os dados pela memória do App
                if (!data || !data.fields) {
                    let fallbackAddress = "Endereço não informado";
                    if (typeof store?.address === 'string') {
                        fallbackAddress = store.address;
                    } else if (store?.address && typeof store.address === 'object') {
                        fallbackAddress = [store.address.street, store.address.number, store.address.city].filter(Boolean).join(', ');
                    }

                    data = {
                        fields: {
                            name: { stringValue: store?.name || siteName },
                            storeLogoUrl: { stringValue: store?.storeLogoUrl || store?.logoUrl || finalImage },
                            slogan: { stringValue: store?.slogan || store?.message || finalDesc },
                            aboutText: { stringValue: store?.aboutText || "" },
                            authorityLinks: { stringValue: store?.authorityLinks || "" },
                            whatsapp: { stringValue: store?.whatsapp || "" },
                            instagramUrl: { stringValue: store?.instagramUrl || "" },
                            facebookUrl: { stringValue: store?.facebookUrl || "" },
                            priceRange: { stringValue: store?.priceRange || "$$" },
                            seoCategory: { stringValue: store?.seoCategory || store?.storeNiche || "" },
                            address: { stringValue: fallbackAddress },
                            delivery_fee: { doubleValue: store?.delivery_fee || 5.00 },
                            rating_aggregate: { doubleValue: store?.rating_aggregate || 0 },
                            rating_count: { integerValue: store?.rating_count || 0 }
                        }
                    };
                }

                const fields = data.fields;
                const fetchedName = fields.name?.stringValue || siteName;
                const fetchedImage = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || finalImage;
                const fetchedDesc = fields.slogan?.stringValue || fields.message?.stringValue || finalDesc;
                const fetchedAbout = fields.aboutText?.stringValue || "";
                const fetchedAuthLinks = fields.authorityLinks?.stringValue || "";
                const fetchedWhatsapp = fields.whatsapp?.stringValue || "";
                const fetchedInstagram = fields.instagramUrl?.stringValue || "";
                const fetchedFacebook = fields.facebookUrl?.stringValue || "";
                const fetchedPriceRange = fields.priceRange?.stringValue || "$$";
                const fetchedGoogleReview = fields.googleReviewLink?.stringValue || fields.reviewLink?.stringValue || fields.googleMapsUrl?.stringValue || "";
                
                const authLinksArray = fetchedAuthLinks ? fetchedAuthLinks.split(',').map(l => l.trim()).filter(l => l.startsWith('http')) : [];
                const socialProfiles = [fetchedInstagram, fetchedFacebook, fetchedGoogleReview, ...authLinksArray].filter(link => link !== "");
                
                const ratingAvg = fields.rating_aggregate?.doubleValue || fields.rating_aggregate?.integerValue || 0;
                const ratingCount = fields.rating_count?.integerValue || 0;

                const ensureAbsoluteUrl = (path) => path?.startsWith('http') ? path : `${safeOrigin}${path}`;
                const absoluteFetchedImage = ensureAbsoluteUrl(fetchedImage);

                let niche = fields.seoCategory?.stringValue || fields.storeNiche?.stringValue || '';
                if (!niche) {
                    const hostLower = hostname.toLowerCase();
                    if (hostLower.includes('burguer') || hostLower.includes('burger') || hostLower.includes('lanche')) niche = 'burger';
                    else if (hostLower.includes('acai') || hostLower.includes('açai') || hostLower.includes('sorvete') || hostLower.includes('doce')) niche = 'sweet';
                    else if (hostLower.includes('pizza') || hostLower.includes('massa')) niche = 'pizza';
                    else if (hostLower.includes('conveniencia') || hostLower.includes('csi') || hostLower.includes('adega')) niche = 'default';
                    else niche = 'restaurant';
                }

                const schemaTypes = {
                    'burger': 'FastFoodRestaurant', 'pizza': 'Restaurant', 'drinks': 'LiquorStore',
                    'sweet': 'IceCreamShop', 'natural': 'GroceryStore', 'default': 'ConvenienceStore',
                    'restaurant': 'Restaurant', 'custom': 'LocalBusiness'
                };
                const googleBusinessType = schemaTypes[niche] || 'Restaurant';

                let addressObj = { "@type": "PostalAddress", "addressCountry": "BR", "addressLocality": "Brasil" };
                if (fields.address?.stringValue) {
                    const fullAddressString = fields.address.stringValue;
                    addressObj.streetAddress = fullAddressString;
                    
                    // Busca inteligente pelo CEP (formato 00000-000 ou 00000000) dentro da string
                    const cepMatch = fullAddressString.match(/\b\d{5}-?\d{3}\b/);
                    if (cepMatch) {
                        addressObj.postalCode = cepMatch[0];
                    }
                } else if (fields.address?.mapValue?.fields) {
                    const addr = fields.address.mapValue.fields;
                    addressObj.streetAddress = `${addr.street?.stringValue || ''}, ${addr.number?.stringValue || ''}`.trim();
                    addressObj.addressLocality = addr.city?.stringValue || "Brasil";
                    addressObj.addressRegion = addr.state?.stringValue || "";
                    addressObj.postalCode = addr.zip?.stringValue || "";
                } else {
                    addressObj.streetAddress = "Endereço não informado";
                }

                const safeTelephone = fetchedWhatsapp ? `+${fetchedWhatsapp.replace(/\D/g, '')}` : "+5500000000000";

                // --- INJEÇÃO AVANÇADA 1: HORÁRIOS DE FUNCIONAMENTO ---
                let openingHoursSchema = [];
                if (store?.schedule) {
                    const daysMap = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
                    Object.keys(store.schedule).forEach(key => {
                        const dayData = store.schedule[key];
                        if (dayData.open && dayData.start && dayData.end) {
                            openingHoursSchema.push({ "@type": "OpeningHoursSpecification", "dayOfWeek": daysMap[key], "opens": dayData.start, "closes": dayData.end });
                            if (dayData.splitShift && dayData.start2 && dayData.end2) {
                                openingHoursSchema.push({ "@type": "OpeningHoursSpecification", "dayOfWeek": daysMap[key], "opens": dayData.start2, "closes": dayData.end2 });
                            }
                        }
                    });
                }

                // --- INJEÇÃO AVANÇADA 2: COORDENADAS GPS ---
                let geoSchema = null;
                if (store?.lat && store?.lng) {
                    geoSchema = { "@type": "GeoCoordinates", "latitude": Number(store.lat), "longitude": Number(store.lng) };
                }

                const defaultFaq = [
                    { question: 'Qual o horário de funcionamento?', answer: 'Para saber nossos turnos exatos de atendimento de hoje, verifique o status Aberto/Fechado e a seção de horários diretamente no nosso cardápio digital.' },
                    { question: 'Quais são as formas de pagamento aceitas?', answer: 'Para sua comodidade, aceitamos pagamento online e seguro (Cartão e PIX) ou pagamento na entrega/retirada. Consulte as opções no checkout.' },
                    { question: 'Vocês entregam no meu endereço?', answer: 'Atendemos uma vasta região. Basta adicionar os produtos ao carrinho e inserir seu CEP ou endereço para o sistema calcular a viabilidade e a taxa de frete automaticamente.' }
                ];

                let fetchedFaq = [];
                if (fields.faq && fields.faq.arrayValue && fields.faq.arrayValue.values) {
                    fetchedFaq = fields.faq.arrayValue.values.map(v => ({
                        question: v.mapValue?.fields?.question?.stringValue || '',
                        answer: v.mapValue?.fields?.answer?.stringValue || ''
                    })).filter(item => item.question && item.answer);
                }
                const finalFaq = [...defaultFaq, ...(store?.faq || fetchedFaq)];

                const isRetail = ['LiquorStore', 'GroceryStore', 'ConvenienceStore'].includes(googleBusinessType);
                
                // --- ISOLAMENTO DO FETCH DE PRODUTOS ---
                let seoProducts = [];
                const contextProducts = store?.products || store?.produtos || store?.produtosPrincipais || [];
                
                try {
                    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery${authParam}`;
                    const queryBody = {
                        structuredQuery: {
                            from: [{ collectionId: "products" }],
                            where: { fieldFilter: { field: { fieldPath: "storeId" }, op: "EQUAL", value: { stringValue: storeId } } },
                            limit: { value: 40 }
                        }
                    };
                    const prodRes = await fetch(queryUrl, { method: 'POST', body: JSON.stringify(queryBody) });
                    
                    if (prodRes.ok) {
                        const prodData = await prodRes.json();
                        seoProducts = prodData.map(item => {
                            if(!item.document) return null;
                            const pf = item.document.fields;
                            return {
                                id: item.document.name.split('/').pop(),
                                name: pf.name?.stringValue || '',
                                description: pf.description?.stringValue || '',
                                imageUrl: pf.imageUrl?.stringValue || '',
                                price: pf.price?.doubleValue || pf.price?.integerValue || 0,
                                promotionalPrice: pf.promotionalPrice?.doubleValue || pf.promotionalPrice?.integerValue || pf.promoPrice?.doubleValue || 0,
                                stock: pf.stock?.integerValue !== undefined ? pf.stock.integerValue : 1
                            };
                        }).filter(Boolean);
                    }
                } catch (e) { 
                    console.warn("SEO: Erro de rede ao buscar produtos. Acionando Fallback."); 
                }

                // BLINDAGEM MÁXIMA DE PRODUTOS
                if (seoProducts.length === 0 && contextProducts.length > 0) {
                    seoProducts = contextProducts;
                }

                const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                const baseDeliveryFee = data?.fields?.delivery_fee?.doubleValue || store?.delivery_fee || 5.00;
                
                const todayString = new Date().toISOString().split('T')[0];

                const merchantCenterRules = {
                    "validFrom": todayString,
                    "hasMerchantReturnPolicy": {
                        "@type": "MerchantReturnPolicy",
                        "applicableCountry": "BR",
                        "returnPolicyCategory": isRetail ? "https://schema.org/MerchantReturnFiniteReturnWindow" : "https://schema.org/MerchantReturnNotPermitted",
                        ...(isRetail ? { 
                            "merchantReturnDays": 7, 
                            "returnMethod": "https://schema.org/ReturnInStore",
                            "returnFees": "https://schema.org/FreeReturn"
                        } : {}),
                        "merchantReturnLink": `${safeBaseUrl}/politicas`,
                        "description": isRetail ? "Devolução em até 7 dias para produtos não perecíveis conforme CDC." : "Itens de alimentação e consumo imediato não permitem devolução, exceto avarias."
                    },
                    "shippingDetails": {
                        "@type": "OfferShippingDetails",
                        "shippingRate": { "@type": "MonetaryAmount", "value": baseDeliveryFee, "currency": "BRL" },
                        "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "BR" },
                        "deliveryTime": {
                            "@type": "ShippingDeliveryTime",
                            "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
                            "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" }
                        }
                    }
                };

                let menuData = {};
                if (!isRetail) {
                    if (seoProducts.length > 0 && !productData) {
                        menuData = {
                            "hasMenu": {
                                "@type": "Menu",
                                "name": `Cardápio - ${fetchedName}`,
                                "url": `${safeBaseUrl}/cardapio`,
                                "hasMenuSection": [
                                    {
                                        "@type": "MenuSection",
                                        "name": "Destaques do Cardápio",
                                        "hasMenuItem": seoProducts.slice(0, 40).map((prod) => {
                                            const itemPrice = Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || prod.preco || 0)).toFixed(2);
                                            // 🚨 CORREÇÃO: Usar apenas MenuItem. Google Rejeita Array misto aqui.
                                            return {
                                                "@type": "MenuItem",
                                                "name": prod.name || prod.nome || "",
                                                "description": prod.description || prod.descricao || fetchedDesc,
                                                "image": ensureAbsoluteUrl(prod.imageUrl || prod.fotoUrl || fetchedImage),
                                                "offers": {
                                                    "@type": "Offer",
                                                    "price": itemPrice,
                                                    "priceCurrency": "BRL",
                                                    "url": `${safeBaseUrl}/produto/${prod.id}`,
                                                    ...merchantCenterRules
                                                }
                                            };
                                        })
                                    }
                                ]
                            }
                        };
                    } else {
                        menuData = { "hasMenu": `${safeBaseUrl}/cardapio` };
                    }
                }

                const storeCuisine = { 'burger': 'Hamburgers, Fast Food, Lanches', 'pizza': 'Pizza, Massas, Italiana', 'sweet': 'Sobremesas, Doces, Açaí', 'restaurant': 'Brasileira, Marmitas, Pratos Feitos' }[niche] || 'Comida Rápida, Delivery';
                
                // MÁGICA DE CONCATENAÇÃO DE TEXTO PARA O GOOGLE LER TUDO
                const fullDescription = [fetchedDesc, fetchedAbout].filter(Boolean).join('. ').trim();

                const baseStoreSchema = {
                    "@id": `${safeBaseUrl}#store`,
                    "@type": googleBusinessType,
                    "name": fetchedName,
                    "image": absoluteFetchedImage,
                    "description": fullDescription,
                    "url": `https://${hostname}`,
                    "telephone": safeTelephone,
                    "priceRange": fetchedPriceRange,
                    "paymentAccepted": ["Cash", "Credit Card", "Pix"],
                    "address": addressObj,
                    ...(geoSchema ? { "geo": geoSchema } : {}),
                    ...(openingHoursSchema.length > 0 ? { "openingHoursSpecification": openingHoursSchema } : {}),
                    "acceptsReservations": store?.posPickupEnabled !== false ? "True" : "False",
                    "sameAs": socialProfiles,
                    ...( !isRetail ? { "servesCuisine": storeCuisine } : {} ),
                    ...menuData
                };

                if (isRetail && seoProducts.length > 0 && !productData) {
                    baseStoreSchema.containsPlace = seoProducts.slice(0, 30).map((prod) => ({
                        "@type": "Product",
                        "name": prod.name || prod.nome || "",
                        "image": ensureAbsoluteUrl(prod.imageUrl || prod.fotoUrl || fetchedImage),
                        "description": prod.description || prod.descricao || fetchedDesc,
                        "sku": prod.id || "SKU-PADRAO",
                        "identifierExists": false,
                        "brand": { "@type": "Brand", "name": fetchedName || "Marca Própria" },
                        "offers": {
                            "@type": "Offer",
                            "price": Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || prod.preco || 0)).toFixed(2),
                            "priceCurrency": "BRL",
                            "availability": (prod.stock === undefined || Number(prod.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                            "url": `${safeBaseUrl}/produto/${prod.id}`,
                            ...merchantCenterRules
                        }
                    }));
                }

                if (ratingCount > 0) {
                    baseStoreSchema.aggregateRating = {
                        "@type": "AggregateRating",
                        "ratingValue": Number(ratingAvg).toFixed(1),
                        "reviewCount": String(ratingCount)
                    };
                }

                let faqSchemaNode = null;
                if (finalFaq && finalFaq.length > 0) {
                    faqSchemaNode = {
                        "@type": "FAQPage",
                        "@id": `${safeBaseUrl}#faq`,
                        "mainEntity": finalFaq.map(item => ({
                            "@type": "Question",
                            "name": item.question,
                            "acceptedAnswer": { "@type": "Answer", "text": item.answer }
                        }))
                    };
                }

                let structuredData;

               if (productData) {
                    const rawPrice = productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0);

                    const relatedProductsSchema = seoProducts
                        .filter(prod => prod.id !== (productData.id || productData.sku))
                        .slice(0, 10)
                        .map(prod => ({
                            "@type": "Product",
                            "name": prod.name || prod.nome || "",
                            "image": ensureAbsoluteUrl(prod.imageUrl || prod.fotoUrl || fetchedImage),
                            "url": `${safeBaseUrl}/produto/${prod.id}`,
                            "offers": {
                                "@type": "Offer",
                                "price": Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || prod.preco || 0)).toFixed(2),
                                "priceCurrency": "BRL",
                                ...merchantCenterRules
                            }
                        }));

                    // 🚨 RETORNO DA TAG @graph (O Google ama isso)
                    structuredData = {
                        "@context": "https://schema.org",
                        "@graph": [
                            baseStoreSchema,
                            {
                                "@type": ["Product", "MenuItem"],
                                "@id": `${baseUrl}#product`,
                                "mainEntityOfPage": currentUrl,
                                ...(relatedProductsSchema.length > 0 ? { "isSimilarTo": relatedProductsSchema } : {}),
                                "name": productData.name || "Produto",
                                "description": productData.description || fullDescription || "Produto oficial da loja.",
                                "image": productData.imageUrl ? [ensureAbsoluteUrl(productData.imageUrl)] : [absoluteFetchedImage],
                                "sku": productData.sku || productData.id || "SKU-PADRAO",
                                ...(productData.gtin13 || productData.gtin ? { "gtin13": productData.gtin13 || productData.gtin } : { "identifierExists": false }),
                                "brand": { "@type": "Brand", "name": productData.brand || fetchedName || "Marca Própria" },
                                ...(productData.category ? { "category": productData.category } : {}),
                                ...(productData.prepTime ? { "prepTime": `PT${productData.prepTime}M` } : {}),
                                ...(productData.suitableForDiet && productData.suitableForDiet.length > 0 ? { "suitableForDiet": productData.suitableForDiet } : {}),
                                ...(productData.menuAddOn && productData.menuAddOn.length > 0 ? { "menuAddOn": productData.menuAddOn } : {}),
                                ...(productData.calories ? { "nutrition": { "@type": "NutritionInformation", "calories": `${productData.calories} kcal` } } : {}),
                                ...(productData.ratingValue && Number(productData.reviewCount) > 0 ? {
                                    "aggregateRating": {
                                        "@type": "AggregateRating",
                                        "ratingValue": Number(productData.ratingValue).toFixed(1),
                                        "reviewCount": Number(productData.reviewCount),
                                        "bestRating": "5",
                                        "worstRating": "1"
                                    }
                                } : {}),
                                "offers": {
                                    "@type": "Offer",
                                    "url": currentUrl,
                                    "priceCurrency": "BRL",
                                    "price": Number(rawPrice).toFixed(2),
                                    "availability": (productData.stock === undefined || Number(productData.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                    "validFrom": todayString,
                                    "priceValidUntil": productData.priceValidUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                                    "itemCondition": "https://schema.org/NewCondition",
                                    "seller": { "@type": "Organization", "name": fetchedName, "@id": `${baseUrl}#store` },
                                    "hasMerchantReturnPolicy": merchantCenterRules.hasMerchantReturnPolicy,
                                    "shippingDetails": {
                                        ...merchantCenterRules.shippingDetails,
                                        "deliveryTime": {
                                            "@type": "ShippingDeliveryTime",
                                            "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
                                            "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" }
                                        }
                                    }
                                }
                            },
                            {
                                "@type": "OrderAction",
                                "target": {
                                    "@type": "EntryPoint",
                                    "urlTemplate": `${safeOrigin}/loja/${storeId}/checkout?productId=${productData.id || ''}`,
                                    "inLanguage": "pt-BR",
                                    "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
                                },
                                "deliveryMethod": "http://purl.org/goodrelations/v1#DeliveryModeDirectDownload"
                            },
                            ...(faqSchemaNode ? [faqSchemaNode] : [])
                        ]
                    };
                } else {
                    // C) PÁGINA INICIAL DA LOJA COM @GRAPH
                    structuredData = {
                        "@context": "https://schema.org",
                        "@graph": [
                            baseStoreSchema,
                            ...(faqSchemaNode ? [faqSchemaNode] : [])
                        ]
                    };
                }

                if (isMounted) {
                    const safeJsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');
                    
                    let scriptTag = document.getElementById('velo-seo-schema');
                    if (!scriptTag) {
                        scriptTag = document.createElement('script');
                        scriptTag.id = 'velo-seo-schema';
                        scriptTag.type = 'application/ld+json';
                        document.head.appendChild(scriptTag);
                    }
                    scriptTag.text = safeJsonLd;
                }
            } catch (fatalError) {
                console.error("Erro fatal ao injetar schema REST:", fatalError);
            }
        };

        injectSchemaForGoogle();

        return () => {
            isMounted = false;
            const scriptTag = document.getElementById('velo-seo-schema');
            if (scriptTag) scriptTag.remove();
        };
    }, [productData, currentUrl, baseUrl, siteName, finalImage, finalDesc, safeOrigin, store]);

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />
            <link rel="canonical" href={baseUrl} />
            {store?.primaryColor && <meta name="theme-color" content={store.primaryColor} />}

            <meta property="og:type" content={productData ? "product" : "website"} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDesc} />
            <meta property="og:image" content={productData ? (productData.imageUrl || finalImage) : finalImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteName} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDesc} />
            <meta name="twitter:image" content={productData ? (productData.imageUrl || finalImage) : finalImage} />

            {productData && (
                <>
                    <meta property="product:price:amount" content={Number(productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0)).toFixed(2)} />
                    <meta property="product:price:currency" content="BRL" />
                    <meta property="product:availability" content={(productData.stock === undefined || Number(productData.stock) > 0) ? "instock" : "oos"} />
                </>
            )}
        </Helmet>
    );
}