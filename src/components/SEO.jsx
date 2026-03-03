import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

// Adicione a prop 'image' na desestruturação
export default function SEO({ title, description, image, productData }) {
    // 1. Pega os dados do Banco de Dados (SaaS)
    const { store } = useStore();

    // 2. Define valores padrão
    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "/logo-square.png";

    // 3. Decide quem manda
    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title}` : `${siteName} - App`;
    const finalDesc = description || store?.description || defaultDesc;
    
    // AQUI ESTÁ A CORREÇÃO DA IMAGEM: A prop image tem prioridade!
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    // Tratamento de segurança para SSR (Evita erro 'window is not defined')
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velo.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velo.com.br";
    const baseUrl = currentUrl.split('?')[0]; // Remove parâmetros de URL para os IDs do Schema

    // 4. Base da Entidade da Loja (Evoluído para LiquorStore/AEO)
    const baseStoreSchema = {
        "@id": `${baseUrl}#store`,
        "@type": "LiquorStore",
        "name": siteName,
        "image": finalImage,
        "description": finalDesc,
        "url": currentUrl,
        "telephone": store?.whatsapp ? `+${store.whatsapp.replace(/\D/g, '')}` : "",
        "priceRange": "$$",
        "paymentAccepted": ["Cash", "Credit Card", "Pix"],
        "address": store?.address ? {
            "@type": "PostalAddress",
            "streetAddress": `${store.address.street || ''}, ${store.address.number || ''}`.trim(),
            "addressLocality": store.address.city,
            "addressRegion": store.address.state,
            "postalCode": store.address.zip,
            "addressCountry": "BR"
        } : undefined,
        
        // Avaliações
        ...(store?.rating_count > 0 && {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": Number(store.rating_aggregate).toFixed(1),
                "reviewCount": store.rating_count
            }
        })
    };

    // 5. Montagem Dinâmica do JSON-LD
    let structuredData;

    if (productData) {
        structuredData = {
            "@context": "https://schema.org",
            "@graph":[
                baseStoreSchema,
                {
                    "@type": "Product",
                    "@id": `${baseUrl}#product`,
                    "name": productData.name,
                    "image": productData.imageUrl || finalImage,
                    "description": productData.description || finalDesc,
                    "sku": productData.sku || productData.id,
                    "offers": {
                        "@type": "Offer",
                        "url": currentUrl,
                        "priceCurrency": "BRL",
                        "price": Number(productData.promotionalPrice > 0 ? productData.promotionalPrice : productData.price).toFixed(2),
                        "availability": (productData.stock === undefined || Number(productData.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                        "seller": { "@id": `${baseUrl}#store` },
                        "shippingDetails": {
                            "@type": "OfferShippingDetails",
                            "shippingRate": {
                                "@type": "MonetaryAmount",
                                "value": store?.delivery_fee || 0,
                                "currency": "BRL"
                            },
                            "shippingDestination": {
                                "@type": "DefinedRegion",
                                "addressCountry": "BR",
                                "addressRegion": store?.address?.state || "BR",
                                "addressLocality": store?.address?.city ? [store.address.city] :[]
                            }
                        }
                    }
                },
                {
                    "@type": "OrderAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": `${safeOrigin}/loja/${store?.id}/checkout?productId=${productData.id}`,
                        "inLanguage": "pt-BR",
                        "actionPlatform":["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
                    },
                    "deliveryMethod": "http://purl.org/goodrelations/v1#DeliveryModeDirectDownload"
                }
            ]
        };
    } else {
        structuredData = {
            "@context": "https://schema.org",
            ...baseStoreSchema
        };
    }

    // 6. Sanitização de Segurança contra XSS (O SEGREDO SÊNIOR)
    const safeJsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');

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
            
            {/* Injeção Blindada do Schema */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
        </Helmet>
    );
}