import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- DICIONÁRIO GEO & SEO (Configuração por Loja) ---
const STORE_SEO = {
    csi: {
        name: "Conveniência Santa Isabel",
        title: "Bebidas Geladas e Delivery Rápido | Conv St Isabel",
        description: "A cerveja mais gelada de Santa Isabel! Entrega de bebidas, gelo, carvão e destilados em minutos. Peça agora pelo App.",
        keywords: "delivery bebidas santa isabel, cerveja gelada viamão, tele entrega bebidas, conveniência aberta agora, gelo, carvão",
        url: "https://csi.velodelivery.com.br",
        image: "https://res.cloudinary.com/dgn627g1j/image/upload/v1/logo-csi-share.png", // Imagem padrão para compartilhamento
        address: {
            street: "R. Neida Maciel",
            number: "122",
            district: "Santa Isabel",
            city: "Viamão",
            state: "RS",
            zip: "94480-000",
            country: "BR"
        },
        geo: { lat: "-30.0722", lng: "-51.0975" },
        phone: "+5551981850978"
    },
    // Adicione outras lojas aqui (mamedes, soller, etc.) se precisar
    default: {
        name: "Velo Delivery",
        title: "Velo Delivery - Seu App de Entregas",
        description: "Plataforma de delivery rápido.",
        keywords: "delivery, app de entregas",
        image: "/logo-square.png",
        address: {},
        geo: {}
    }
};

export default function SEO({ title, description }) {
    // 1. Identifica qual loja é
    const storeId = getStoreIdFromHostname() || 'default';
    const data = STORE_SEO[storeId] || STORE_SEO.default;

    // 2. Define Título e Descrição (usa o padrão se não for passado nada)
    const finalTitle = title ? `${title} | ${data.name}` : data.title;
    const finalDesc = description || data.description;

    // 3. ESTRUTURA JSON-LD (O Segredo do SEO Local)
    // Isso "fala" a língua do Google Maps
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "LiquorStore", // Define como Loja de Bebidas
        "name": data.name,
        "image": data.image,
        "telephone": data.phone,
        "url": data.url,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": `${data.address.street}, ${data.address.number}`,
            "addressLocality": data.address.city,
            "addressRegion": data.address.state,
            "postalCode": data.address.zip,
            "addressCountry": data.address.country
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": data.geo.lat,
            "longitude": data.geo.lng
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "08:00",
                "closes": "23:00"
            }
        ],
        "priceRange": "$"
    };

    return (
        <HelmetProvider>
            <Helmet>
                {/* Meta Tags Básicas */}
                <title>{finalTitle}</title>
                <meta name="description" content={finalDesc} />
                <meta name="keywords" content={data.keywords} />
                <link rel="canonical" href={data.url} />

                {/* Open Graph (Para o Link ficar bonito no WhatsApp) */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content={finalTitle} />
                <meta property="og:description" content={finalDesc} />
                <meta property="og:image" content={data.image} />
                <meta property="og:url" content={data.url} />
                <meta property="og:site_name" content={data.name} />
                <meta property="og:locale" content="pt_BR" />

                {/* Tags GEO (Localização Antiga, mas útil) */}
                <meta name="geo.region" content={`BR-${data.address.state}`} />
                <meta name="geo.placename" content={`${data.address.district}, ${data.address.city}`} />
                <meta name="geo.position" content={`${data.geo.lat};${data.geo.lng}`} />
                <meta name="ICBM" content={`${data.geo.lat}, ${data.geo.lng}`} />

                {/* JSON-LD Injetado no Cabeçalho */}
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>
        </HelmetProvider>
    );
}