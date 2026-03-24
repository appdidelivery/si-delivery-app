import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function SEO({ title, description, image, productData }) {
    const { store } = useStore();
    
    // --- NOVO: ESTADO PARA ARMAZENAR AS AVALIAÇÕES ---
    const [reviewStats, setReviewStats] = useState({ count: 0, average: 0 });

    // --- NOVO: BUSCA E CÁLCULO DE AVALIAÇÕES EM TEMPO REAL ---
    useEffect(() => {
        const fetchReviews = async () => {
            if (!store?.slug) return; // Garante que temos a loja
            
            try {
                const q = query(collection(db, "reviews"), where("storeId", "==", store.slug));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const totalReviews = snapshot.size;
                    const sumRatings = snapshot.docs.reduce((acc, doc) => acc + Number(doc.data().rating || 0), 0);
                    const avgRating = (sumRatings / totalReviews).toFixed(1);
                    
                    setReviewStats({
                        count: totalReviews,
                        average: avgRating
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar avaliações para o SEO:", error);
            }
        };

        fetchReviews();
    }, [store?.slug]);

    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "/logo-square.png";

    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title}` : `${siteName} - App`;
    const finalDesc = description || store?.description || defaultDesc;
    
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velo.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velo.com.br";
    const baseUrl = currentUrl.split('?')[0]; 

    // Base da Entidade da Loja (Atualizado para injetar reviewStats)
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
            "addressLocality": store.address.city || "",
            "addressRegion": store.address.state || "",
            "postalCode": store.address.zip || "",
            "addressCountry": "BR"
        } : undefined,
        
        // --- CORREÇÃO AQUI: Agora usamos reviewStats calculado no useEffect ---
        ...(reviewStats.count > 0 && {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": reviewStats.average.toString(),
                "reviewCount": reviewStats.count.toString()
            }
        })
    };

    let structuredData;

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
                    "description": productData.description || finalDesc || "",
                    "image": productData.imageUrl ? [productData.imageUrl] : [finalImage],
                    "sku": productData.sku || productData.id || "",
                    "gtin13": productData.gtin13 || productData.gtin || "",
                    "brand": {
                        "@type": "Brand",
                        "name": productData.brand || siteName || ""
                    },
                    "category": productData.category || "",
                    "prepTime": productData.prepTime || "",
                    "suitableForDiet": productData.suitableForDiet || [],
                    "menuAddOn": productData.menuAddOn || [],
                    "nutrition": {
                        "@type": "NutritionInformation",
                        "calories": productData.calories || ""
                    },
                    // Avaliação do Produto (se existir, usa a nota do produto; senão, remove o bloco para evitar erros no Google)
                    ...(productData.ratingValue ? {
                         "aggregateRating": {
                             "@type": "AggregateRating",
                             "ratingValue": productData.ratingValue.toString(),
                             "reviewCount": (productData.reviewCount || 1).toString()
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
                            "name": siteName,
                            "@id": `${baseUrl}#store` 
                        },
                        "deliveryLeadTime": {
                            "@type": "QuantitativeValue",
                            "value": productData.deliveryLeadTime || store?.deliveryLeadTime || "",
                            "unitCode": "MIN"
                        },
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
                                "addressLocality": store?.address?.city ? [store.address.city] : []
                            }
                        }
                    }
                },
                {
                    "@type": "OrderAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": `${safeOrigin}/loja/${store?.id || 'default'}/checkout?productId=${productData.id || ''}`,
                        "inLanguage": "pt-BR",
                        "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
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
            
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
        </Helmet>
    );
}