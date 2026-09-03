import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

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
    const baseUrl = currentUrl.split('?')[0]; 

    // Removemos qualquer lixo antigo de Schema que possa ter ficado no navegador do cliente
    useEffect(() => {
        const existingSchema = document.getElementById('velo-seo-schema');
        if (existingSchema) {
            existingSchema.remove();
        }
    }, []);

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />
            <link rel="canonical" href={baseUrl} />
            {store?.primaryColor && <meta name="theme-color" content={store.primaryColor} />}

            {/* MANTIDO: Garantia de funcionamento das tags visuais para o Frontend */}
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