import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import { Camera, Store, ShoppingBag, Star, CheckCircle, ExternalLink, ArrowRight, ArrowRightCircle } from 'lucide-react'; // <-- Importando ícones oficiais do seu projeto

// Função para gerar o link do produto
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
                const qStore = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
                const snapStore = await getDocs(qStore);
                
                if (snapStore.empty) {
                    setLoading(false);
                    return;
                }
                
                const storeInfo = snapStore.docs[0].data();
                const storeId = snapStore.docs[0].id;
                setStoreData(storeInfo);

                try {
                    const qProducts = query(collection(db, 'products'), where('storeId', '==', storeId), limit(4));
                    const snapProducts = await getDocs(qProducts);
                    setTopProducts(snapProducts.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch(e) { console.warn("Erro produtos:", e); }

                try {
                    const qReviews = query(collection(db, 'reviews'), where('storeId', '==', storeId), limit(3));
                    const snapReviews = await getDocs(qReviews);
                    setLatestReviews(snapReviews.docs.map(d => d.data()));
                } catch(e) { console.warn("Erro reviews:", e); }

            } catch (error) {
                console.error("Erro ao buscar dados:", error);
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
        <div className="min-h-screen bg-slate-100 flex flex-col items-center pt-12 px-4 pb-20">
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
                    {/* BLINDAGEM DE IMAGEM DA LOJA */}
                    {storeData.storeLogoUrl || storeData.logoUrl ? (
                        <img 
                            src={storeData.storeLogoUrl || storeData.logoUrl} 
                            alt={`Logo ${storeData.name}`} 
                            className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm bg-white" 
                            onError={(e) => { 
                                e.target.onerror = null; 
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTIgNyA0LjQxLTQuNDFBMiAyIDAgMCAxIDcuODMgMmguMzRhMiAyIDAgMCAxIDEuNDIuNTlMMjIgNyIvPjxwYXRoIGQ9Ik00IDEydjhhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0ydi04Ii8+PHBhdGggZD0iTTE1IDIydi00YTIgMiAwIDAgMC0yLTJoLTJhMiAyIDAgMCAwLTIgMnY0Ii8+PHBhdGggZD0iTTIgN2gyMCIvPjxwYXRoIGQ9Ik0yMiA3djNhMiAyIDAgMCAxLTIgMnYwYTIuNyAyLjcgMCAwIDEtMS41OS0uNjMuNy43IDAgMCAwLS44MiAwQTIuNyAyLjcgMCAwIDEgMTYgMTJhMi43IDIuNyAwIDAgMS0xLjU5LS42My43LjcgMCAwIDAtLjgyIDBBMi43IDIuNyAwIDAgMSAxMiAxMmEyLjcgMi43IDAgMCAxLTEuNTktLjYzLjcuNyAwIDAgMC0uODIgMEEyLjcgMi43IDAgMCAxIDggMTJhMi43IDIuNyAwIDAgMS0xLjU5LS42My43LjcgMCAwIDAtLjgyIDBBMi43IDIuNyAwIDAgMSA0IDEydjBhMiAyIDAgMCAxLTItMlY3Ii8+PC9zdmc+'; 
                            }}
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-sm bg-slate-100 flex items-center justify-center text-slate-300">
                            <Store size={36} />
                        </div>
                    )}

                    <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Loja Verificada Velo">
                        <CheckCircle size={14} />
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
                                    <Star key={i} size={20} fill={i < Math.round(ratingValue) ? "currentColor" : "none"} className={i < Math.round(ratingValue) ? "text-yellow-400" : "text-yellow-300"} />
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
                        <span className="text-xl shrink-0 mt-0.5">📍</span>
                        <span className="text-xs font-bold text-slate-600 leading-snug">{formattedAddress}</span>
                    </div>
                    {storeData.whatsapp && (
                        <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">📞</span>
                            <span className="text-xs font-bold text-slate-600">{storeData.whatsapp}</span>
                        </div>
                    )}
                </div>

                {/* BOTÃO PRINCIPAL */}
                <a 
                    href={storeUrl}
                    className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                    Ver Cardápio e Pedir <ArrowRight size={16} />
                </a>
            </div>

            {/* SEÇÃO SEO: MAIS PEDIDOS (COM BLINDAGEM DE IMAGEM) */}
            {topProducts.length > 0 && (
                <div className="w-full max-w-md mb-8 text-left">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Destaques da Loja</h2>
                        <a href={storeUrl} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">Ver Todos <ExternalLink size={10}/></a>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {topProducts.map((p, i) => {
                            const imgSource = p.imageUrl || p.fotoUrl || p.image;
                            
                            return (
                                <a 
                                    key={i} 
                                    href={`${storeUrl}/p/${generateSlug(p.name)}`}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow active:scale-95 group"
                                >
                                    {imgSource ? (
                                        <img 
                                            src={imgSource} 
                                            alt={p.name} 
                                            className="w-16 h-16 object-contain mb-3 rounded-lg group-hover:scale-110 transition-transform" 
                                            onError={(e) => { 
                                                e.target.onerror = null; 
                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f8fafc'/%3E%3Cpath d='M75 60a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 22.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM60 52.5h30l7.5 7.5h15v37.5H37.5V60h15l7.5-7.5z' fill='%23cbd5e1'/%3E%3C/svg%3E"; 
                                            }}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 mb-3 group-hover:bg-slate-100 transition-colors">
                                            <Camera size={24} />
                                        </div>
                                    )}
                                    <span className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mb-2 h-7">{p.name}</span>
                                    <span className="text-xs font-black text-blue-600 mt-auto">R$ {Number(p.promotionalPrice || p.price).toFixed(2)}</span>
                                </a>
                            );
                        })}
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
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {/* Aspas visuais de design */}
                                <span className="absolute top-2 right-4 text-4xl text-slate-100 font-serif">"</span>
                                <div className="flex items-center justify-between mb-2 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-black uppercase">
                                            {(rev.customerName || rev.userName || "C")[0]}
                                        </div>
                                        <span className="text-xs font-black text-slate-800 uppercase truncate max-w-[120px]">{rev.customerName || rev.userName || "Cliente"}</span>
                                    </div>
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, idx) => (
                                            <Star key={idx} size={12} fill={idx < Math.round(rev.rating || 5) ? "currentColor" : "none"} className={idx < Math.round(rev.rating || 5) ? "text-yellow-400" : "text-yellow-200"} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic relative z-10">"{rev.comment || rev.text || "Ótimo estabelecimento, entrega rápida e produtos de qualidade!"}"</p>
                            </div>
                        ))}
                    </div>
                    
                    <a href={storeUrl} className="mt-4 flex items-center justify-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                        Ler todas as {ratingCount} avaliações <ExternalLink size={10} />
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
                    Fazer Pedido Agora <ArrowRightCircle size={16} />
                </a>
            </div>

        </div>
    );
}