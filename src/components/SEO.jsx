import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

export default function SEO({ title, description }) {
    // 1. Pega os dados do Banco de Dados (SaaS)
    const { store } = useStore();

    // 2. Define valores padrão (caso o banco ainda esteja carregando ou falhe)
    const defaultName = "Velo Delivery";
    const defaultDesc = "O seu aplicativo de delivery.";
    const defaultImage = "/logo-square.png";

    // 3. Decide quem manda: O Banco (store) tem prioridade sobre o padrão
    const siteName = store?.name || defaultName;
    const finalTitle = title ? `${title} | ${siteName}` : `${siteName} - App`;
    const finalDesc = description || store?.description || defaultDesc;
    const finalImage = store?.logoUrl || defaultImage;
    const currentUrl = window.location.href;

    // 4. Monta o JSON-LD (Google) com segurança
    // O ?. previne a Tela Branca se a loja não tiver endereço cadastrado ainda
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": siteName,
        "image": finalImage,
        "description": finalDesc,
        "url": currentUrl,
        "telephone": store?.whatsapp ? `+${store.whatsapp}` : "",
        "address": store?.address ? {
            "@type": "PostalAddress",
            "streetAddress": `${store.address.street}, ${store.address.number}`,
            "addressLocality": store.address.city,
            "addressRegion": store.address.state,
            "postalCode": store.address.zip,
            "addressCountry": "BR"
        } : undefined
    };

    return (
        <Helmet>
            {/* Título e Descrição */}
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />
            
            {/* Configurações Visuais (Cor do navegador mobile) */}
            {store?.themeColor && <meta name="theme-color" content={store.themeColor} />}

            {/* Open Graph (WhatsApp / Facebook) */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDesc} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteName} />
            
            {/* JSON-LD Seguro */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
        </Helmet>
    );
}