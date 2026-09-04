import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';
import { getStoreIdFromHostname } from '../utils/domainHelper';

export default function SEO({ title, description, image, productData }) {
    const { store } = useStore();

    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "/logo-square.png";

    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title}` : `${siteName} - App`;
    const finalDesc = description || store?.aboutText || store?.slogan || store?.description || defaultDesc;
    
    const finalImage = image || store?.storeLogoUrl || store?.logoUrl || defaultImage;
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : "https://app.velodelivery.com.br";
    const safeOrigin = typeof window !== 'undefined' ? window.location.origin : "https://app.velodelivery.com.br";
    const baseUrl = currentUrl.split('?')[0]; 

    // O MOTOR ORIGINAL DO SEU SITE VOLTOU (Agora limpo e no formato de Menu!)
    useEffect(() => {
        let isMounted = true;

        const injectSchemaForGoogle = async () => {
            try {
                const hostname = window.location.hostname;
                const storeId = getStoreIdFromHostname();
                
                const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zetesteapp'; 
                const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || ''; 
                const authParam = apiKey ? `?key=${apiKey}` : '';
                
                let data = null;
                try {
                    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${storeId}${authParam}`;
                    const response = await fetch(url);
                    if (response.ok) data = await response.json();
                } catch (e) { console.warn("Falha ao buscar loja no Firebase."); }

                let fallbackAddress = "Endereço não informado";
                if (typeof store?.address === 'string') fallbackAddress = store.address;
                else if (store?.address && typeof store.address === 'object') {
                    fallbackAddress = [store.address.street, store.address.number, store.address.city].filter(Boolean).join(', ');
                }

                if (!data || !data.fields) {
                    data = {
                        fields: {
                            name: { stringValue: store?.name || siteName },
                            storeLogoUrl: { stringValue: store?.storeLogoUrl || store?.logoUrl || finalImage },
                            slogan: { stringValue: store?.slogan || store?.message || finalDesc },
                            priceRange: { stringValue: store?.priceRange || "$$" },
                            seoCategory: { stringValue: store?.seoCategory || store?.storeNiche || "" },
                            address: { stringValue: fallbackAddress },
                            rating_aggregate: { doubleValue: store?.rating_aggregate || 0 },
                            rating_count: { integerValue: store?.rating_count || 0 }
                        }
                    };
                }

                const fields = data.fields;
                const fetchedName = fields.name?.stringValue || siteName;
                const fetchedImage = fields.storeLogoUrl?.stringValue || fields.logoUrl?.stringValue || finalImage;
                const fetchedDesc = fields.slogan?.stringValue || fields.message?.stringValue || finalDesc;
                const fetchedPriceRange = fields.priceRange?.stringValue || "$$";
                const ratingAvg = fields.rating_aggregate?.doubleValue || fields.rating_aggregate?.integerValue || 0;
                const ratingCount = fields.rating_count?.integerValue || 0;
                
                const ensureAbsoluteUrl = (path) => path?.startsWith('http') ? path : `${safeOrigin}${path}`;
                const absoluteFetchedImage = ensureAbsoluteUrl(fetchedImage);

                let niche = fields.seoCategory?.stringValue || fields.storeNiche?.stringValue || '';
                const schemaTypes = { 'burger': 'FastFoodRestaurant', 'pizza': 'Restaurant', 'sweet': 'IceCreamShop', 'restaurant': 'Restaurant' };
                const googleBusinessType = schemaTypes[niche] || 'Restaurant';

               let addressObj = { "@type": "PostalAddress", "addressCountry": "BR" };
                if (store?.address && typeof store.address === 'object') {
                    addressObj.streetAddress = [store.address.street, store.address.number].filter(Boolean).join(', ') || fields.address?.stringValue;
                    if (store.address.city) addressObj.addressLocality = store.address.city;
                    if (store.address.state) addressObj.addressRegion = store.address.state;
                    if (store.address.zipCode || store.address.cep) addressObj.postalCode = store.address.zipCode || store.address.cep;
                } else if (fields.address?.stringValue) {
                    addressObj.streetAddress = fields.address.stringValue;
                }

                // Busca os produtos direto no Client-Side (Seu plano original)
                let seoProducts = [];
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
                            if (pf.isActive?.booleanValue === false) return null; 
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
                } catch (e) { }

                // O GRANDE SEGREDO DO MENU (O que faltava no seu site original)
                let menuData = {};
                if (seoProducts.length > 0 && !productData) {
                    menuData = {
                        "hasMenu": {
                            "@type": "Menu",
                            "name": `Cardápio - ${fetchedName}`,
                            "url": `${safeOrigin}`,
                            "hasMenuSection": [{
                                "@type": "MenuSection",
                                "name": "Destaques do Cardápio",
                                "hasMenuItem": seoProducts.map((prod) => {
                                    const price = Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : (prod.price || 0)).toFixed(2);
                                    return {
                                        "@type": "MenuItem",
                                        "name": prod.name || "Produto",
                                        "description": prod.description || fetchedDesc,
                                        "image": ensureAbsoluteUrl(prod.imageUrl || fetchedImage),
                                        "offers": {
                                            "@type": "Offer",
                                            "price": price,
                                            "priceCurrency": "BRL",
                                            "availability": (prod.stock === undefined || Number(prod.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                            "url": `${safeOrigin}/p/${prod.id}`
                                        }
                                    };
                                })
                            }]
                        }
                    };
                }

                // ESTRUTURA PARA A PÁGINA INDIVIDUAL DO PRODUTO (Seu código preservado)
                let structuredData;
                if (productData) {
                    const rawPrice = productData.promotionalPrice > 0 ? productData.promotionalPrice : (productData.price || 0);
                    structuredData = {
                        "@context": "https://schema.org",
                        "@type": ["Product", "MenuItem"], // Força a compatibilidade
                        "@id": `${baseUrl}#product`,
                        "name": productData.name || "Produto",
                        "description": productData.description || "Produto oficial da loja.",
                        "image": productData.imageUrl ? [ensureAbsoluteUrl(productData.imageUrl)] : [absoluteFetchedImage],
                        "sku": productData.sku || productData.id || "SKU-PADRAO",
                        "brand": { "@type": "Brand", "name": productData.brand || fetchedName || "Marca Própria" },
                        "offers": {
                            "@type": "Offer",
                            "url": currentUrl,
                            "priceCurrency": "BRL",
                            "price": Number(rawPrice).toFixed(2),
                            "availability": (productData.stock === undefined || Number(productData.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                            "itemCondition": "https://schema.org/NewCondition"
                        }
                    };
                } else {
                    // ESTRUTURA DA PÁGINA INICIAL DA LOJA
                    structuredData = {
                        "@context": "https://schema.org",
                        "@id": `${safeOrigin}#store`,
                        "@type": googleBusinessType,
                        "name": fetchedName,
                        "image": absoluteFetchedImage,
                        "description": fetchedDesc,
                        "url": safeOrigin,
                        "telephone": store?.phone || store?.whatsapp || "+5500000000000",
                        "servesCuisine": store?.seoCategory || store?.storeNiche || "Fast Food",
                        "priceRange": fetchedPriceRange,
                        "address": addressObj,
                        ...menuData
                    };

                    // Recoloca as estrelinhas da loja
                    if (ratingCount > 0) {
                        structuredData.aggregateRating = {
                            "@type": "AggregateRating",
                            "ratingValue": Number(ratingAvg).toFixed(1),
                            "reviewCount": String(ratingCount)
                        };
                    }
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
            } catch (err) { console.error("Erro na injeção de SEO no cliente:", err); }
        };

        const timer = setTimeout(injectSchemaForGoogle, 1500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
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
        </Helmet>
    );
}