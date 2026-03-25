import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

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
    
    // Prioridade absoluta para a imagem passada por prop (Produto)
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    // Tratamento de segurança para SSR (Evita erro 'window is not defined')
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velo.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velo.com.br";
    const baseUrl = currentUrl.split('?')[0]; // Remove parâmetros de URL para os IDs do Schema

    // 4. MOTOR DE INJEÇÃO REST API (BYPASS NO BLOQUEIO DE WEBSOCKET DO GOOGLEBOT)
    useEffect(() => {
        let isMounted = true;

        const injectSchemaForGoogle = async () => {
            try {
                // Identifica a loja pelo subdomínio
                const hostname = window.location.hostname;
                let storeId = 'csi'; 
                
                if (hostname !== 'localhost' && hostname.includes('.')) {
                    storeId = hostname.split('.')[0];
                }

                // Faz um Fetch HTTP tradicional (Googlebot espera isso terminar)
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
                    
                    const ratingAvg = fields.rating_aggregate?.doubleValue || fields.rating_aggregate?.integerValue || 0;
                    const ratingCount = fields.rating_count?.integerValue || 0;

                    // TRATAMENTO DE ENDEREÇO (Garante que não quebra se for String)
                    let addressObj = { "@type": "PostalAddress", "addressCountry": "BR" };
                    if (fields.address?.stringValue) {
                        addressObj.streetAddress = fields.address.stringValue;
                    } else if (fields.address?.mapValue?.fields) {
                        const addr = fields.address.mapValue.fields;
                        addressObj.streetAddress = `${addr.street?.stringValue || ''}, ${addr.number?.stringValue || ''}`.trim();
                        addressObj.addressLocality = addr.city?.stringValue || "";
                        addressObj.addressRegion = addr.state?.stringValue || "";
                        addressObj.postalCode = addr.zip?.stringValue || "";
                    }

                    // A) BASE DA ENTIDADE DA LOJA (LiquorStore / LocalBusiness)
                    const baseStoreSchema = {
                        "@id": `${baseUrl}#store`,
                        "@type": "LiquorStore",
                        "name": fetchedName,
                        "image": fetchedImage,
                        "description": fetchedDesc,
                        "url": currentUrl,
                        "telephone": fetchedWhatsapp ? `+${fetchedWhatsapp.replace(/\D/g, '')}` : "",
                        "priceRange": "$$",
                        "paymentAccepted": ["Cash", "Credit Card", "Pix"],
                        "address": addressObj
                    };

                    // Injeta a nota apenas se existir
                    if (ratingCount > 0) {
                        baseStoreSchema.aggregateRating = {
                            "@type": "AggregateRating",
                            "ratingValue": Number(ratingAvg).toFixed(1),
                            "reviewCount": String(ratingCount)
                        };
                    }

                    let structuredData;

                    // B) ESTRUTURA COMPLETA DE PRODUTO (Mantendo TODAS as suas 170+ linhas intactas)
                    if (productData) {
                        const rawPrice = productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0);

                        structuredData = {
                            "@context": "https://schema.org",
                            "@graph": [
                                baseStoreSchema,
                                {
                                    "@type": ["Product", "MenuItem"],
                                    "@id": `${baseUrl}#product`,
                                    // 1. DADOS BASE DO PRODUTO
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
                                    
                                    // 3. LOGÍSTICA E PREPARO (Food/Delivery)
                                    "prepTime": productData.prepTime ? `PT${productData.prepTime}M` : "",
                                    
                                    // 4. ALIMENTAÇÃO E CUSTOMIZAÇÃO (MenuItem)
                                    "suitableForDiet": productData.suitableForDiet || [],
                                    "menuAddOn": productData.menuAddOn || [],
                                    "nutrition": {
                                        "@type": "NutritionInformation",
                                        "calories": productData.calories ? `${productData.calories} kcal` : ""
                                    },
                                    
                                    // 5. PROVA SOCIAL DO PRODUTO
                                    ...(productData.ratingValue ? {
                                        "aggregateRating": {
                                            "@type": "AggregateRating",
                                            "ratingValue": Number(productData.ratingValue).toFixed(1),
                                            "reviewCount": String(productData.reviewCount || 1)
                                        }
                                    } : {}),
                                    
                                    // 2. OFERTA E VENDA
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
                                // Ação de Pedido Direto (Acelera AEO e Google Actions)
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
                        // C) PÁGINA INICIAL DA LOJA (Apenas os dados do LocalBusiness/LiquorStore)
                        structuredData = {
                            "@context": "https://schema.org",
                            ...baseStoreSchema
                        };
                    }

                    if (isMounted) {
                        // Sanitização de Segurança contra XSS
                        const safeJsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');
                        
                        // Injeção forçada direto no Head (O Googlebot lê isso perfeitamente)
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

    // 5. O HELMET AGORA FICA RESPONSÁVEL APENAS PELO SOCIAL (OG, TWITTER, ETC)
    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />
            {store?.primaryColor && <meta name="theme-color" content={store.primaryColor} />}

            <meta property="og:type" content={productData ? "product" : "website"} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDesc} />
            <meta property="og:image" content={productData ? (productData.imageUrl || finalImage) : finalImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteName} />
        </Helmet>
    );
}