import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';

export default function AggregatorStore() {
    const { slug } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. FETCH NO FIREBASE BUSCANDO PELO SLUG
    useEffect(() => {
        const fetchStoreBySlug = async () => {
            if (!slug) return;
            try {
                const q = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    setStoreData(snapshot.docs[0].data());
                }
            } catch (error) {
                console.error("Erro ao buscar dados da loja para o agregador:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStoreBySlug();
    }, [slug]);

    // 2. INJEÇÃO BLINDADA DO JSON-LD NO <HEAD> (Regra Velo Delivery como Publisher)
    useEffect(() => {
        if (!storeData) return;

        // Formatação segura de endereço
        let formattedAddress = "Endereço não informado";
        if (typeof storeData.address === 'string') {
            formattedAddress = storeData.address;
        } else if (storeData.address && typeof storeData.address === 'object') {
            formattedAddress = `${storeData.address.street || ''}, ${storeData.address.city || ''} - ${storeData.address.state || ''}`.trim();
        }

        const ratingCount = Number(storeData.rating_count || storeData.reviewCount || 0);
        const ratingValue = Number(storeData.rating_aggregate || storeData.ratingValue || 0);

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": storeData.name || "Restaurante",
            "image": storeData.storeLogoUrl || storeData.logoUrl || "https://app.velodelivery.com.br/logo-padrao.png",
            "address": formattedAddress,
            "priceRange": storeData.priceRange || "$$",
            ...(ratingCount > 0 ? {
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": ratingValue.toFixed(1),
                    "reviewCount": ratingCount,
                    "bestRating": "5",
                    "worstRating": "1",
                    "author": {
                        "@type": "Organization",
                        "name": "Velo Delivery"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "Velo Delivery"
                    }
                }
            } : {})
        };

        const scriptId = 'velo-aggregator-schema';
        let scriptTag = document.getElementById(scriptId);

        if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.id = scriptId;
            scriptTag.type = 'application/ld+json';
            document.head.appendChild(scriptTag);
        }
        
        scriptTag.text = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) existingScript.remove();
        };
    }, [storeData]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando loja...</div>;
    }

    if (!storeData) {
        return <div className="min-h-screen flex items-center justify-center">Loja não encontrada na Velo Delivery.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20">
            <Helmet>
                <title>{`${storeData.name} | Velo Delivery`}</title>
                <meta name="description" content={`Peça no ${storeData.name} através da Velo Delivery.`} />
            </Helmet>
            
            {/* UI Básica de Exibição (Você pode estilizar com Tailwind depois) */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center max-w-md w-full">
                <img 
                    src={storeData.storeLogoUrl || storeData.logoUrl} 
                    alt={storeData.name} 
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100" 
                />
                <h1 className="text-2xl font-black text-slate-800">{storeData.name}</h1>
                <p className="text-sm text-slate-500 mt-2">{storeData.slogan || 'Faça seu pedido online.'}</p>
                
                {Number(storeData.rating_count) > 0 && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-yellow-50 text-yellow-600 px-4 py-2 rounded-xl font-bold border border-yellow-200">
                        ⭐ {Number(storeData.rating_aggregate).toFixed(1)} 
                        <span className="text-xs text-yellow-700">({storeData.rating_count} avaliações na Velo)</span>
                    </div>
                )}
            </div>
        </div>
    );
}