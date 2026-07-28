import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';

export default function AggregatorStore() {
    const { slug } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [loading, setLoading] = useState(true);

    // =========================================================================
    // REGRA DO REACT: TODOS OS HOOKS (useEffect) DEVEM FICAR NO TOPO DO ARQUIVO!
    // =========================================================================

    // 1. FETCH NO FIREBASE BUSCANDO PELO SLUG DA LOJA
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

    // 2. INJEÇÃO BLINDADA DO JSON-LD NO <HEAD>
    useEffect(() => {
        // Se a loja ainda não carregou, aborta este efeito em silêncio.
        if (!storeData) return;

        let addressForSchema = "Endereço não cadastrado";
        if (typeof storeData.address === 'string') {
            addressForSchema = storeData.address;
        } else if (storeData.address && typeof storeData.address === 'object') {
            addressForSchema = [storeData.address.street, storeData.address.number, storeData.address.city].filter(Boolean).join(', ') || "Endereço não cadastrado";
        }

        const countForSchema = Number(storeData.rating_count || storeData.reviewCount || 0);
        const valueForSchema = Number(storeData.rating_aggregate || storeData.ratingValue || 0);

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": storeData.name || "Restaurante",
            "image": storeData.storeLogoUrl || storeData.logoUrl || "https://app.velodelivery.com.br/logo-padrao.png",
            "address": addressForSchema,
            "priceRange": storeData.priceRange || "$$",
            "url": `https://app.velodelivery.com.br/loja/${slug}`,
            ...(countForSchema > 0 ? {
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": valueForSchema.toFixed(1),
                    "reviewCount": countForSchema,
                    "bestRating": "5",
                    "worstRating": "1",
                    "author": { "@type": "Organization", "name": "Velo Delivery" },
                    "publisher": { "@type": "Organization", "name": "Velo Delivery" }
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
    }, [storeData, slug]);

    // =========================================================================
    // EARLY RETURNS (Telas de Carregamento e Erro - Somente APÓS os Hooks)
    // =========================================================================
    
    if (loading) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Carregando loja...</div>;
    }

    if (!storeData) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-sm">Loja não encontrada na Velo Delivery.</div>;
    }

    // =========================================================================
    // LÓGICA VISUAL DA UI (Para os humanos)
    // =========================================================================
    
    let formattedAddress = "Endereço não cadastrado";
    if (typeof storeData.address === 'string') {
        formattedAddress = storeData.address;
    } else if (storeData.address && typeof storeData.address === 'object') {
        formattedAddress = [storeData.address.street, storeData.address.number, storeData.address.city].filter(Boolean).join(', ') || "Endereço não cadastrado";
    }

    const ratingCount = Number(storeData.rating_count || storeData.reviewCount || 0);
    const ratingValue = Number(storeData.rating_aggregate || storeData.ratingValue || 0);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center pt-12 px-4 pb-10">
            {/* INJEÇÃO DO TÍTULO E META TAGS */}
            <Helmet>
                <title>{`${storeData.name} - Avaliações | Velo Delivery`}</title>
                <meta name="description" content={`Confira o cardápio, endereço e as avaliações de ${storeData.name} na Velo Delivery.`} />
            </Helmet>
            
            {/* Header Velo Delivery */}
            <div className="mb-8 text-center flex flex-col items-center">
                <img src="/logo retangular Velo Delivery.png" alt="Velo Delivery" className="h-6 opacity-40 grayscale mb-2" />
                <span className="bg-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Portal de Avaliações
                </span>
            </div>

            {/* Card Principal do Restaurante */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl text-center max-w-md w-full border border-slate-100">
                <div className="relative inline-block mb-4">
                    <img 
                        src={storeData.storeLogoUrl || storeData.logoUrl} 
                        alt={`Logo ${storeData.name}`} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-md" 
                        onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/606/606197.png'; }}
                    />
                    {/* Badge de Verificado */}
                    <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Loja Verificada Velo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>
                
                <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-2">
                    {storeData.name}
                </h1>
                
                <p className="text-sm font-medium text-slate-500 mb-6 px-4">
                    {storeData.slogan || storeData.aboutText || 'As melhores opções para o seu delivery.'}
                </p>

                {/* Bloco de Avaliação Visual (Obrigatório para o Google aprovar) */}
                {ratingCount > 0 ? (
                    <div className="inline-flex flex-col items-center justify-center p-5 bg-yellow-50 rounded-[1.5rem] border border-yellow-200 w-full mb-6 shadow-inner">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-4xl font-black text-yellow-600 tracking-tighter">{ratingValue.toFixed(1)}</span>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={i < Math.round(ratingValue) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={i < Math.round(ratingValue) ? "text-yellow-400" : "text-yellow-300"}>
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs font-black uppercase text-yellow-800 tracking-widest mb-3">
                            Baseado em {ratingCount} avaliações
                        </span>
                        <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-yellow-100 text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            Auditado por Velo Delivery
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full mb-6 text-sm font-bold text-slate-400">
                        Loja Nova - Sem avaliações ainda.
                    </div>
                )}

                {/* Informações da Loja (Obrigatório para o Google) */}
                <div className="flex flex-col gap-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8">
                    <div className="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mt-0.5 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span className="text-xs font-bold text-slate-600 leading-snug">{formattedAddress}</span>
                    </div>
                    {storeData.whatsapp && (
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span className="text-xs font-bold text-slate-600">{storeData.whatsapp}</span>
                        </div>
                    )}
                </div>

                {/* Botão de redirecionamento para o cardápio oficial */}
                <a 
                    href={`https://${storeData.domain || `${slug}.velodelivery.com.br`}`}
                    className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                    Ver Cardápio e Pedir
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </a>
            </div>
        </div>
    );
}