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
    const finalDesc = description || store?.description || defaultDesc;
    
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velodelivery.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velodelivery.com.br";
    const baseUrl = currentUrl.split('?')[0]; 

    // 4. MOTOR DE INJEÇÃO REST API
    useEffect(() => {
        let isMounted = true;

        const injectSchemaForGoogle = async () => {
            try {
                const hostname = window.location.hostname;
                
                // CORREÇÃO 1: Usa a função oficial para pegar o ID da loja, suportando domínios customizados (ex: cowburguer)
                const storeId = getStoreIdFromHostname();
                
                const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
                const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}`;
                
                const response = await fetch(url);
                if (!response.ok) return;
                
                const data = await response.json();

                if (data && data.fields) {
                    const fields = data.fields;
                    const fetchedName = fields.name?.stringValue || siteName;
                    const fetchedImage = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || finalImage;
                    const fetchedDesc = fields.slogan?.stringValue || fields.message?.stringValue || finalDesc;
                    const fetchedWhatsapp = fields.whatsapp?.stringValue || "";
                    const fetchedInstagram = fields.instagramUrl?.stringValue || "";
                    const fetchedFacebook = fields.facebookUrl?.stringValue || "";
                    const fetchedPriceRange = fields.priceRange?.stringValue || "$$";
                    
                    // Monta a lista de redes sociais para o Google associar
                    const socialProfiles = [fetchedInstagram, fetchedFacebook].filter(link => link !== "");
                    
                    const ratingAvg = fields.rating_aggregate?.doubleValue || fields.rating_aggregate?.integerValue || 0;
                    const ratingCount = fields.rating_count?.integerValue || 0;

                    // CORREÇÃO 2: Garante que todas as URLs de imagem sejam absolutas (Obrigatório para o Google)
                    const ensureAbsoluteUrl = (path) => path?.startsWith('http') ? path : `${safeOrigin}${path}`;
                    const absoluteFetchedImage = ensureAbsoluteUrl(fetchedImage);

                   // --- TRADUTOR DINÂMICO DE NICHOS PARA O GOOGLE ---
                    // Prioridade MÁXIMA para o novo campo seoCategory criado no painel. Se não existir, tenta o antigo storeNiche.
                    let niche = fields.seoCategory?.stringValue || fields.storeNiche?.stringValue || '';
                    
                    // Fallback de Segurança (Dedução pelo domínio) apenas se a loja for muito antiga e não tiver salvo nada
                    if (!niche) {
                        const hostLower = hostname.toLowerCase();
                        if (hostLower.includes('burguer') || hostLower.includes('burger') || hostLower.includes('lanche') || hostLower.includes('macanudo') || hostLower.includes('dog')) {
                            niche = 'burger';
                        } else if (hostLower.includes('acai') || hostLower.includes('açai') || hostLower.includes('sorvete') || hostLower.includes('doce')) {
                            niche = 'sweet';
                        } else if (hostLower.includes('pizza') || hostLower.includes('massa')) {
                            niche = 'pizza';
                        } else if (hostLower.includes('conveniencia') || hostLower.includes('csi') || hostLower.includes('ng') || hostLower.includes('adega') || hostLower.includes('bebida')) {
                            niche = 'default';
                        } else {
                            niche = 'restaurant';
                        }
                    }

                    const schemaTypes = {
                        'burger': 'FastFoodRestaurant',
                        'pizza': 'Restaurant',
                        'drinks': 'LiquorStore',
                        'sweet': 'IceCreamShop',
                        'natural': 'GroceryStore',
                        'default': 'ConvenienceStore',
                        'restaurant': 'Restaurant',
                        'custom': 'LocalBusiness'
                    };
                    // Se mesmo com tudo isso não achar, o padrão absoluto agora é Restaurant (para forçar o Menu nativo do Google)
                    const googleBusinessType = schemaTypes[niche] || 'Restaurant';

                    // CORREÇÃO 3: TRATAMENTO DE ENDEREÇO BLINDADO PARA O GOOGLE
                    let addressObj = { "@type": "PostalAddress", "addressCountry": "BR", "addressLocality": "Brasil" };
                    if (fields.address?.stringValue) {
                        addressObj.streetAddress = fields.address.stringValue;
                    } else if (fields.address?.mapValue?.fields) {
                        const addr = fields.address.mapValue.fields;
                        addressObj.streetAddress = `${addr.street?.stringValue || ''}, ${addr.number?.stringValue || ''}`.trim();
                        addressObj.addressLocality = addr.city?.stringValue || "Brasil";
                        addressObj.addressRegion = addr.state?.stringValue || "";
                        addressObj.postalCode = addr.zip?.stringValue || "";
                    } else {
                        addressObj.streetAddress = "Endereço não informado";
                    }

                    // CORREÇÃO 4: TELEFONE DE SEGURANÇA
                    const safeTelephone = fetchedWhatsapp ? `+${fetchedWhatsapp.replace(/\D/g, '')}` : "+5500000000000";

                    // --- TRATAMENTO DE NICHOS PARA INDEXAÇÃO: VAREJO VS FOOD SERVICE ---
                    const isRetail = ['LiquorStore', 'GroceryStore', 'ConvenienceStore'].includes(googleBusinessType);
                    
                    // --- BUSCA DIRETA DE PRODUTOS PARA O GOOGLEBOT (BLINDAGEM CONTRA RACE CONDITION) ---
                    let seoProducts = [];
                    const contextProducts = store?.products || store?.produtos || store?.produtosPrincipais;
                    
                    if (contextProducts && Array.isArray(contextProducts) && contextProducts.length > 0) {
                        seoProducts = contextProducts;
                    } else {
                        // Resgate Direto REST API: Se o robô for mais rápido que o React, buscamos os produtos à força!
                        try {
                            const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
                            const queryBody = {
                                structuredQuery: {
                                    from: [{ collectionId: "products" }],
                                    where: { fieldFilter: { field: { fieldPath: "storeId" }, op: "EQUAL", value: { stringValue: storeId } } },
                                    limit: { value: 30 }
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
                                        promotionalPrice: pf.promoPrice?.doubleValue || pf.promoPrice?.integerValue || 0,
                                        stock: pf.stock?.integerValue !== undefined ? pf.stock.integerValue : 1
                                    };
                                }).filter(Boolean);
                            }
                        } catch (e) { console.error("Erro no resgate de produtos pro SEO:", e); }
                    }

                    const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                    
                   // --- REGRAS PADRÃO DO MERCHANT CENTER (FRETE E DEVOLUÇÃO) ---
                    const baseDeliveryFee = fields.delivery_fee?.doubleValue || fields.delivery_fee?.integerValue || 5.00; // Taxa de entrega padrão de segurança
                   const merchantCenterRules = {
                        "hasMerchantReturnPolicy": {
                            "@type": "MerchantReturnPolicy",
                            "applicableCountry": "BR",
                            "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
                            "merchantReturnLink": `${safeBaseUrl}/politicas`,
                            "description": "Itens de alimentação e consumo imediato não permitem devolução, exceto avarias."
                        },
                        "shippingDetails": {
                            "@type": "OfferShippingDetails",
                            "shippingRate": {
                                "@type": "MonetaryAmount",
                                "value": baseDeliveryFee,
                                "currency": "BRL"
                            },
                            "shippingDestination": {
                                "@type": "DefinedRegion",
                                "addressCountry": "BR"
                            },
                            "deliveryTime": {
                                "@type": "ShippingDeliveryTime",
                                "handlingTime": {
                                    "@type": "QuantitativeValue",
                                    "minValue": 0,
                                    "maxValue": 15,
                                    "unitCode": "MIN"
                                },
                                "transitTime": {
                                    "@type": "QuantitativeValue",
                                    "minValue": 15,
                                    "maxValue": 60,
                                    "unitCode": "MIN"
                                }
                            }
                        }
                    };

                    // Constrói o objeto do Cardápio (Menu) se for Restaurante/Hamburgueria
                    let menuData = {};
                    if (!isRetail) {
                        if (seoProducts.length > 0) {
                            menuData = {
                                "hasMenu": {
                                    "@type": "Menu",
                                    "name": `Cardápio - ${fetchedName}`,
                                    "url": `${safeBaseUrl}/cardapio`,
                                    "hasMenuSection": [
                                        {
                                            "@type": "MenuSection",
                                            "name": "Destaques do Cardápio",
                                            "hasMenuItem": seoProducts.slice(0, 40).map((prod) => ({
                                                "@type": "MenuItem",
                                                "name": prod.name || prod.nome || "",
                                                "description": prod.description || prod.descricao || fetchedDesc,
                                                "image": ensureAbsoluteUrl(prod.imageUrl || prod.fotoUrl || fetchedImage),
                                                "offers": {
                                                    "@type": "Offer",
                                                    "price": Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || prod.preco || 0)).toFixed(2),
                                                    "priceCurrency": "BRL",
                                                    ...merchantCenterRules
                                                }
                                            }))
                                        }
                                    ]
                                }
                            };
                        } else {
                            menuData = { "hasMenu": `${safeBaseUrl}/cardapio` };
                        }
                    }

                    // --- MAPA DE COZINHAS PARA RESTAURANTES (servesCuisine) ---
                    const cuisineMap = {
                        'burger': 'Hamburgers, Fast Food, Lanches',
                        'pizza': 'Pizza, Massas, Italiana',
                        'sweet': 'Sobremesas, Doces, Açaí',
                        'restaurant': 'Brasileira, Marmitas, Pratos Feitos'
                    };
                    const storeCuisine = cuisineMap[niche] || 'Comida Rápida, Delivery';

                   // A) BASE DA ENTIDADE DA LOJA 
                    const baseStoreSchema = {
                        "@id": `${safeBaseUrl}#store`,
                        "@type": googleBusinessType,
                        "name": fetchedName,
                        "image": absoluteFetchedImage,
                        "description": fetchedDesc,
                        "url": `https://${hostname}`,
                        "telephone": safeTelephone,
                        "priceRange": fetchedPriceRange, // Agora dinâmico!
                        "paymentAccepted": ["Cash", "Credit Card", "Pix"],
                        "address": addressObj,
                        "sameAs": socialProfiles, // Associa as redes sociais ao site
                        ...( !isRetail ? { "servesCuisine": storeCuisine } : {} ),
                        ...menuData
                    };

                    // Se for Varejo (Conveniência/Bebidas), mantém a aba genérica de Produtos (containsPlace)
                    if (isRetail && seoProducts.length > 0) {
                        baseStoreSchema.containsPlace = seoProducts.slice(0, 30).map((prod) => ({
                            "@type": "Product",
                            "name": prod.name || prod.nome || "",
                            "image": ensureAbsoluteUrl(prod.imageUrl || prod.fotoUrl || fetchedImage),
                            "description": prod.description || prod.descricao || fetchedDesc,
                            "sku": prod.id || "SKU-PADRAO",
                            "identifierExists": false,
                            "brand": {
                                "@type": "Brand",
                                "name": fetchedName || "Marca Própria"
                            },
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

                    // Injeta a nota da loja apenas se existir
                    if (ratingCount > 0) {
                        baseStoreSchema.aggregateRating = {
                            "@type": "AggregateRating",
                            "ratingValue": Number(ratingAvg).toFixed(1),
                            "reviewCount": String(ratingCount)
                        };
                    }

                    let structuredData;

                    // B) ESTRUTURA COMPLETA DE PRODUTO (RESTAURADA 100% ORIGINAL)
                    if (productData) {
                        const rawPrice = productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0);

                        structuredData = {
                            "@context": "https://schema.org",
                            "@graph": [
                                baseStoreSchema,
                               {
                                    "@type": ["Product", "MenuItem"],
                                    "@id": `${baseUrl}#product`,
                                    // DADOS BASE DO PRODUTO
                                    "name": productData.name || "Produto",
                                    "description": productData.description || fetchedDesc || "Produto oficial da loja.",
                                   "image": productData.imageUrl ? [ensureAbsoluteUrl(productData.imageUrl)] : [absoluteFetchedImage],
                                    "sku": productData.sku || productData.id || "SKU-PADRAO",
                                    // Evita o erro fatal de "gtin" vazio e avisa o Google que o produto é de fabricação própria
                                    ...(productData.gtin13 || productData.gtin ? { 
                                        "gtin13": productData.gtin13 || productData.gtin 
                                    } : { 
                                        "identifierExists": false 
                                    }),
                                    "brand": {
                                        "@type": "Brand",
                                        "name": productData.brand || fetchedName || "Marca Própria"
                                    },
                                    ...(productData.category ? { "category": productData.category } : {}),
                                    
                                    // LOGÍSTICA E PREPARO
                                    ...(productData.prepTime ? { "prepTime": `PT${productData.prepTime}M` } : {}),
                                    
                                    // ALIMENTAÇÃO E CUSTOMIZAÇÃO
                                    ...(productData.suitableForDiet && productData.suitableForDiet.length > 0 ? { "suitableForDiet": productData.suitableForDiet } : {}),
                                    ...(productData.menuAddOn && productData.menuAddOn.length > 0 ? { "menuAddOn": productData.menuAddOn } : {}),
                                    ...(productData.calories ? {
                                        "nutrition": {
                                            "@type": "NutritionInformation",
                                            "calories": `${productData.calories} kcal`
                                        }
                                    } : {}),
                                    
                                    // PROVA SOCIAL DO PRODUTO
                                    ...(productData.ratingValue ? {
                                        "aggregateRating": {
                                            "@type": "AggregateRating",
                                            "ratingValue": Number(productData.ratingValue).toFixed(1),
                                            "reviewCount": String(productData.reviewCount || 1)
                                        }
                                    } : {}),
                                    
                                    // OFERTA E VENDA
                                    "offers": {
                                        "@type": "Offer",
                                        "url": currentUrl,
                                        "priceCurrency": "BRL",
                                        "price": Number(rawPrice).toFixed(2),
                                        "availability": (productData.stock === undefined || Number(productData.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                        // Google OBRIGA a ter data de validade. Se não tiver, jogamos para o ano que vem.
                                        "priceValidUntil": productData.priceValidUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                                        "itemCondition": "https://schema.org/NewCondition",
                                        "seller": { 
                                            "@type": "Organization",
                                            "name": fetchedName,
                                            "@id": `${baseUrl}#store` 
                                        },
                                        // Puxamos a política de frete de devolução mestre gerada lá em cima
                                        ...merchantCenterRules
                                    }
                                },
                                // Ação de Pedido Direto
                                {
                                    "@type": "OrderAction",
                                    "target": {
                                        "@type": "EntryPoint",
                                        "urlTemplate": `${safeOrigin}/loja/${storeId}/checkout?productId=${productData.id || ''}`,
                                        "inLanguage": "pt-BR",
                                        "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
                                    },
                                    "deliveryMethod": "http://purl.org/goodrelations/v1#DeliveryModeDirectDownload"
                                }
                            ]
                        };
                    } else {
                        // C) PÁGINA INICIAL DA LOJA
                        structuredData = {
                            "@context": "https://schema.org",
                            ...baseStoreSchema
                        };
                    }

                    if (isMounted) {
                        const safeJsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');
                        
                        const scriptId = 'google-schema-forced';
                        let scriptTag = document.getElementById(scriptId);
                        
                        if (!scriptTag) {
                            scriptTag = document.createElement('script');
                            scriptTag.type = 'application/ld+json';
                            scriptTag.id = scriptId;
                            document.head.appendChild(scriptTag);
                        }
                        
                        scriptTag.innerHTML = safeJsonLd;
                    }
                }
            } catch (error) {
                console.error("Erro ao injetar schema REST:", error);
            }
        };

        injectSchemaForGoogle();

        return () => {
            isMounted = false;
            const existingScript = document.getElementById('google-schema-forced');
            if (existingScript) existingScript.remove();
        };
    }, [productData, currentUrl, baseUrl, siteName, finalImage, finalDesc, safeOrigin, store]);

    // O HELMET CUIDA AGORA DE TODAS AS META TAGS (SEO, SOCIAL, CANONICAL E TWITTER)
    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />
            <link rel="canonical" href={baseUrl} />
            {store?.primaryColor && <meta name="theme-color" content={store.primaryColor} />}

            {/* OPEN GRAPH (FACEBOOK, WHATSAPP, LINKEDIN) */}
            <meta property="og:type" content={productData ? "product" : "website"} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDesc} />
            <meta property="og:image" content={productData ? (productData.imageUrl || finalImage) : finalImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteName} />

            {/* TWITTER CARDS (MUITO IMPORTANTE PARA PREVIEWS ATUAIS) */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDesc} />
            <meta name="twitter:image" content={productData ? (productData.imageUrl || finalImage) : finalImage} />

            {/* TAGS ESPECÍFICAS DE E-COMMERCE (PRODUTO) */}
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