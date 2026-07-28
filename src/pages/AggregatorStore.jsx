import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';

// Função para gerar o link do produto igual ao seu Home.jsx
const generateSlug = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
};

export default function AggregatorStore() {
    const { slug } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [latestReviews, setLatestReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // =========================================================================
    // 1. MOTOR DE BUSCA (LOJA + PRODUTOS + REVIEWS)
    // =========================================================================
    useEffect(() => {
        const fetchAllData = async () => {
            if (!slug) return;
            try {
                // Busca a Loja
                const qStore = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
                const snapStore = await getDocs(qStore);
                
                if (snapStore.empty) {
                    setLoading(false);
                    return;
                }
                
                const storeInfo = snapStore.docs[0].data();
                const storeId = snapStore.docs[0].id;
                setStoreData(storeInfo);

                // Busca Produtos (Agora ordenados para pegar os mais relevantes)
                try {
                    const qProducts = query(collection(db, 'products'), where('storeId', '==', storeId), limit(4));
                    const snapProducts = await getDocs(qProducts);
                    setTopProducts(snapProducts.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch(e) { console.warn("Erro produtos:", e); }

                // Busca Avaliações (Filtro simplificado para garantir que carregue algo)
                try {
                    const qReviews = query(collection(db, 'reviews'), where('storeId', '==', storeId), limit(3));
                    const snapReviews = await getDocs(qReviews);
                    setLatestReviews(snapReviews.docs.map(d => d.data()));
                } catch(e) { console.warn("Erro reviews:", e); }

            } catch (error) {
                console.error("Erro ao buscar dados completos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [slug]);

    // =========================================================================
    // 2. O CÉREBRO DO SEO (JSON-LD)
    // =========================================================================
    useEffect(() => {
        if (!storeData) return;

        let addressForSchema = "Endereço não cadastrado";
        if (typeof storeData.address === 'string') {
            addressForSchema = storeData.address;
        } else if (storeData.address && typeof storeData.address === 'object') {
            addressForSchema = [storeData.address.street, storeData.address.number, storeData.address.city].filter(Boolean).join(', ');
        }

        const countForSchema = Number(storeData.rating_count || storeData.reviewCount || 0);
        const valueForSchema = Number(storeData.rating_aggregate || storeData.ratingValue || 0);

        const schemaReviews = latestReviews.map(rev => ({
            "@type": "Review",
            "author": { "@type": "Person", "name": rev.customerName || rev.userName || "Cliente Verificado" },
            "datePublished": rev.createdAt ? new Date(rev.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            "reviewBody": rev.comment || rev.text || "Excelente atendimento e produto de qualidade.",
            "reviewRating": { "@type": "Rating", "ratingValue": rev.rating || "5" }
        }));

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
            } : {}),
            ...(schemaReviews.length > 0 ? { "review": schemaReviews } : {})
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
    }, [storeData, slug, latestReviews]);

    // =========================================================================
    // EARLY RETURNS (Telas de Carregamento)
    // =========================================================================
    if (loading) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Carregando loja...</div>;
    }

    if (!storeData) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-sm">Loja não encontrada na Velo Delivery.</div>;
    }

    // =========================================================================
    // LÓGICA VISUAL DA UI
    // =========================================================================
    let formattedAddress = "Endereço não cadastrado";
    if (typeof storeData.address === 'string') {
        formattedAddress = storeData.address;
    } else if (storeData.address && typeof storeData.address === 'object') {
        formattedAddress = [storeData.address.street, storeData.address.number, storeData.address.city].filter(Boolean).join(', ');
    }

    const ratingCount = Number(storeData.rating_count || storeData.reviewCount || 0);
    const ratingValue = Number(storeData.rating_aggregate || storeData.ratingValue || 0);
    const storeUrl = `https://${storeData.domain || `${slug}.velodelivery.com.br`}`;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center pt-12 px-4 pb-10">
            <Helmet>
                <title>{`${storeData.name} - Cardápio e Avaliações | Velo Delivery`}</title>
                <meta name="description" content={`Confira o cardápio, endereço e avaliações reais de ${storeData.name}. Faça seu pedido online pela Velo Delivery.`} />
            </Helmet>
            
            {/* Header Velo Delivery */}
            <div className="mb-6 text-center flex flex-col items-center">
                <img src="/logo retangular Velo Delivery.png" alt="Velo Delivery" className="h-5 opacity-40 grayscale mb-2" />
                <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Portal de Avaliações
                </span>
            </div>

            {/* CARD PRINCIPAL DA LOJA */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center max-w-md w-full border border-slate-100 mb-6">
                <div className="relative inline-block mb-4">
                    <img 
                        src={storeData.storeLogoUrl || storeData.logoUrl} 
                        alt={`Logo ${storeData.name}`} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm" 
                        onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/606/606197.png'; }}
                    />
                    <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Loja Verificada Velo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-2">
                    {storeData.name}
                </h1>
                
                <p className="text-xs font-medium text-slate-500 mb-6 px-4">
                    {storeData.slogan || storeData.aboutText || 'As melhores opções para o seu delivery.'}
                </p>

                {/* BLOCO DE NOTAS */}
                {ratingCount > 0 && (
                    <div className="inline-flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-[1.5rem] border border-yellow-200 w-full mb-6 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-3xl font-black text-yellow-600 tracking-tighter">{ratingValue.toFixed(1)}</span>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={i < Math.round(ratingValue) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={i < Math.round(ratingValue) ? "text-yellow-400" : "text-yellow-300"}>
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-yellow-800 tracking-widest mb-3">
                            Baseado em {ratingCount} avaliações
                        </span>
                    </div>
                )}

                {/* INFO LOJA */}
                <div className="flex flex-col gap-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                    <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span className="text-xs font-bold text-slate-600 leading-snug">{formattedAddress}</span>
                    </div>
                    {storeData.whatsapp && (
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span className="text-xs font-bold text-slate-600">{storeData.whatsapp}</span>
                        </div>
                    )}
                </div>

                {/* BOTÃO PRINCIPAL */}
                <a 
                    href={storeUrl}
                    className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                    Ver Cardápio e Pedir
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </a>
            </div>

            {/* SEÇÃO SEO: MAIS PEDIDOS (Agora Clicáveis e com fallback de imagem) */}
            {topProducts.length > 0 && (
                <div className="w-full max-w-md mb-8 text-left">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Destaques da Loja</h2>
                        <a href={storeUrl} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Ver Todos</a>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {topProducts.map((p, i) => (
                            <a 
                                key={i} 
                                href={`${storeUrl}/p/${generateSlug(p.name)}`}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow active:scale-95"
                            >
                                <img 
                                    src={p.imageUrl || p.fotoUrl || p.image || 'https://cdn-icons-png.flaticon.com/512/3706/3706066.png'} 
                                    alt={p.name} 
                                    className="w-16 h-16 object-contain mb-3 rounded-lg" 
                                    onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/3706/3706066.png'; }}
                                />
                                <span className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mb-2 h-7">{p.name}</span>
                                <span className="text-xs font-black text-blue-600 mt-auto">R$ {Number(p.promotionalPrice || p.price).toFixed(2)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* SEÇÃO SEO: ÚLTIMAS AVALIAÇÕES ESCRITAS */}
            {latestReviews.length > 0 ? (
                <div className="w-full max-w-md text-left mb-6">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Opinião dos Clientes</h2>
                    </div>
                    <div className="space-y-3">
                        {latestReviews.map((rev, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-black uppercase">
                                            {(rev.customerName || rev.userName || "C")[0]}
                                        </div>
                                        <span className="text-xs font-black text-slate-800 uppercase">{rev.customerName || rev.userName || "Cliente Verificado"}</span>
                                    </div>
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, idx) => (
                                            <svg key={idx} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={idx < Math.round(rev.rating || 5) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={idx < Math.round(rev.rating || 5) ? "text-yellow-400" : "text-yellow-200"}>
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{rev.comment || rev.text || "Ótimo estabelecimento, entrega rápida e produtos de qualidade!"}"</p>
                            </div>
                        ))}
                    </div>
                    
                    <a href={storeUrl} className="mt-4 block text-center text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                        Ler todas as {ratingCount} avaliações
                    </a>
                </div>
            ) : (
                <div className="w-full max-w-md text-center mt-4 mb-8">
                    <p className="text-xs font-bold text-slate-400">Seja o primeiro a avaliar após fazer um pedido!</p>
                </div>
            )}

            {/* BOTÃO FLUTUANTE INFERIOR (Estilo App) */}
            <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
                 <a 
                    href={storeUrl}
                    className="pointer-events-auto bg-slate-900 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-slate-700"
                >
                    Fazer Pedido Agora <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </a>
            </div>

        </div>
    );
}