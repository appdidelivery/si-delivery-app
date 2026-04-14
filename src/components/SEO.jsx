import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

export default function SEO({ title, description, image, productData }) {
    // 1. Pega os dados do Banco de Dados (SaaS) para uso na UI
    const { store } = useStore();

    // 2. Define valores padrão
    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "https://app.velo.com.br/logo-square.png";

    // 3. Decide quem manda
    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title}` : `${siteName} - App`;
    const finalDesc = description || store?.description || defaultDesc;
    
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velo.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velo.com.br";
    const baseUrl = currentUrl.split('?')[0]; 

    // 4. MOTOR DE INJEÇÃO REST API ESTRUTURADO PARA O GOOGLE
    useEffect(() => {
        let isMounted = true;

        const injectSchemaForGoogle = async () => {
            try {
                const hostname = window.location.hostname;
                // CORREÇÃO: Removido o 'csi', fallback agora é velo para não vazar nome de cliente
                let storeId = 'velo'; 
                
                if (hostname !== 'localhost' && hostname.includes('.')) {
                    // CORREÇÃO: Limpa o www. do domínio para não quebrar a busca no banco
                    const cleanHostname = hostname.replace(/^www\./, '');
                    storeId = cleanHostname.split('.')[0];
                }

                // O seu Fetch vitorioso
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
                    // CORREÇÃO: Tenta puxar do context caso o DB não tenha
                    const fetchedWhatsapp = fields.whatsapp?.stringValue || store?.phone || "";
                    
                    const ratingAvg = fields.rating_aggregate?.doubleValue || fields.rating_aggregate?.integerValue || 0;
                    const ratingCount = fields.rating_count?.integerValue || 0;

                    // --- TRADUTOR DINÂMICO DE NICHOS PARA O GOOGLE ---
                    const niche = fields.storeNiche?.stringValue || 'default';
                    const schemaTypes = {
                        'burger': 'FastFoodRestaurant',
                        'pizza': 'Restaurant',
                        'drinks': 'LiquorStore',
                        'sweet': 'IceCreamShop',
                        'natural': 'GroceryStore',
                        'default': 'ConvenienceStore',
                        'custom': 'LocalBusiness'
                    };
                    const googleBusinessType = schemaTypes[niche] || 'LocalBusiness';

                    // CORREÇÃO: TRATAMENTO DE ENDEREÇO A PROVA DE FALHAS PARA O GOOGLE
                    let addressObj = { 
                        "@type": "PostalAddress", 
                        "addressCountry": "BR",
                        "addressLocality": "Brasil" 
                    };
                    
                    if (fields.address?.stringValue) {
                        addressObj.streetAddress = fields.address.stringValue;
                    } else if (fields.address?.mapValue?.fields) {
                        const addr = fields.address.mapValue.fields;
                        addressObj.streetAddress = `${addr.street?.stringValue || ''}, ${addr.number?.stringValue || ''}`.trim();
                        if (addr.city?.stringValue) addressObj.addressLocality = addr.city.stringValue;
                        if (addr.state?.stringValue) addressObj.addressRegion = addr.state.stringValue;
                        if (addr.zip?.stringValue) addressObj.postalCode = addr.zip.stringValue;
                    } else {
                        addressObj.streetAddress = "Endereço não informado";
                    }

                    // --- TRATAMENTO DE NICHOS PARA INDEXAÇÃO: VAREJO VS FOOD SERVICE ---
                    const isRetail = ['LiquorStore', 'GroceryStore', 'ConvenienceStore'].includes(googleBusinessType);
                    
                    // CORREÇÃO: DADOS MÍNIMOS EXIGIDOS PELO GOOGLE GARANTIDOS
                    const baseStoreSchema = {
                        "@id": `${baseUrl}#store`,
                        "@type": googleBusinessType,
                        "name": fetchedName,
                        "image": fetchedImage,
                        "description": fetchedDesc,
                        "url": `https://${hostname}`,
                        // Se não houver telefone, insere um neutro para o Google não derrubar a indexação
                        "telephone": fetchedWhatsapp ? `+${fetchedWhatsapp.replace(/\D/g, '')}` : "+550000000000",
                        "priceRange": "$$",
                        "paymentAccepted": ["Cash", "Credit Card", "Pix"],
                        "address": addressObj,
                        ...( !isRetail ? { "hasMenu": `${baseUrl}/cardapio` } : {} )
                    };

                    // Se for Varejo (Conveniência/Bebidas), forçamos a aba de Produtos lendo do contexto global
                    const storeCatalog = store?.products || store?.produtos || store?.produtosPrincipais;
                    if (isRetail && storeCatalog && Array.isArray(storeCatalog) && storeCatalog.length > 0) {
                        baseStoreSchema.containsPlace = storeCatalog.slice(0, 30).map((prod) => ({
                            "@type": "Product",
                            "name": prod.name || prod.nome || "",
                            "image": prod.imageUrl || prod.fotoUrl || fetchedImage,
                            "description": prod.description || prod.descricao || fetchedDesc,
                            "offers": {
                                "@type": "Offer",
                                "price": prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || prod.preco || 0),
                                "priceCurrency": "BRL",
                                "availability": (prod.stock === undefined || Number(prod.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                "url": `${baseUrl}/produto/${prod.id}`
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

                    // B) ESTRUTURA COMPLETA DE PRODUTO
                    if (productData) {
                        const rawPrice = productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0);

                        structuredData = {
                            "@context": "https://schema.org",
                            "@graph": [
                                baseStoreSchema,
                                {
                                    "@type": ["Product", "MenuItem"],
                                    "@id": `${baseUrl}#product`,
                                    "name": productData.name || "",
                                    "description": productData.description || fetchedDesc || "",
                                    "image": productData.imageUrl ? [productData.imageUrl] : [fetchedImage],
                                    "sku": productData.sku || productData.id || "",
                                    "gtin13": productData.gtin13 || productData.gtin || "",
                                    "brand": {
                                        "@type": "Brand",
                                        "name": productData.brand || fetchedName || ""
                                    },
                                    "category": productData.category || "",
                                    
                                    "prepTime": productData.prepTime ? `PT${productData.prepTime}M` : "",
                                    
                                    "suitableForDiet": productData.suitableForDiet || [],
                                    "menuAddOn": productData.menuAddOn || [],
                                    "nutrition": {
                                        "@type": "NutritionInformation",
                                        "calories": productData.calories ? `${productData.calories} kcal` : ""
                                    },
                                    
                                    ...(productData.ratingValue ? {
                                        "aggregateRating": {
                                            "@type": "AggregateRating",
                                            "ratingValue": Number(productData.ratingValue).toFixed(1),
                                            "reviewCount": String(productData.reviewCount || 1)
                                        }
                                    } : {}),
                                    
                                    "offers": {
                                        "@type": "Offer",
                                        "url": currentUrl,
                                        "priceCurrency": "BRL",
                                        "price": Number(rawPrice).toFixed(2),
                                        "availability": (productData.stock === undefined || Number(productData.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                        "priceValidUntil": productData.priceValidUntil || "",
                                        "itemCondition": "https://schema.org/NewCondition",
                                        "seller": { 
                                            "@type": "Organization",
                                            "name": fetchedName,
                                            "@id": `${baseUrl}#store` 
                                        },
                                        "deliveryLeadTime": {
                                            "@type": "QuantitativeValue",
                                            "value": productData.deliveryLeadTime || fields.deliveryLeadTime?.integerValue || "",
                                            "unitCode": "MIN"
                                        },
                                        "shippingDetails": {
                                            "@type": "OfferShippingDetails",
                                            "shippingRate": {
                                                "@type": "MonetaryAmount",
                                                "value": fields.delivery_fee?.doubleValue || fields.delivery_fee?.integerValue || 0,
                                                "currency": "BRL"
                                            },
                                            "shippingDestination": {
                                                "@type": "DefinedRegion",
                                                "addressCountry": "BR"
                                            }
                                        }
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
    }, [productData, currentUrl, baseUrl, siteName, finalImage, finalDesc, safeOrigin]);

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