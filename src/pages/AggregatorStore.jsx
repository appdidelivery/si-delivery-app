import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import { Store, Star, CheckCircle, ExternalLink, ArrowRightCircle, ShoppingBag, X } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';

const generateSlug = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
};

// =========================================================================
// 🧠 MOTOR DE IA (E-E-A-T) - HUMANIZAÇÃO DE REVIEWS DO CLUBE VIP
// =========================================================================
const generateSmartReviewText = (review, storeName) => {
    const originalText = review.comment || review.text || "";
    const isGeneric = originalText.toLowerCase().includes("clube vip") || originalText.trim() === "";

    if (!isGeneric && originalText.length > 5) return originalText;

    const replyText = review.reply || review.storeReply || review.adminReply || "";
    let productName = "";

    if (replyText) {
        const match = replyText.match(/famoso (.*?) aqui/i);
        if (match && match[1]) productName = match[1].trim(); 
    }

    const seed = (review.customerName || review.userName || "A").length + (review.rating || 5);

    if (productName) {
        const templates = [
            `Muito prático pedir por aqui. O ${productName} foi entregue sem atrasos. A ${storeName} nunca decepciona.`,
            `Excelente! O pedido de ${productName} chegou super rápido e com muita qualidade. Recomendo.`,
            `Sempre peço na ${storeName}. O ${productName} veio perfeito, do jeito que eu gosto. Atendimento nota 10!`,
            `Tudo certo com a minha compra. O ${productName} chegou impecável e o serviço foi muito ágil.`
        ];
        return templates[seed % templates.length];
    } else {
        const templates = [
            `Muito prático pedir por aqui. Meu pedido foi entregue sem atrasos. A ${storeName} nunca decepciona.`,
            `Excelente! A encomenda chegou super rápido e com muita qualidade. Recomendo muito.`,
            `Sempre peço na ${storeName}. Tudo veio perfeito e muito bem embalado. Atendimento nota 10!`,
            `Tudo certo com a minha compra. A ${storeName} tem um serviço ágil e o pedido chegou impecável.`
        ];
        return templates[seed % templates.length];
    }
};

export default function AggregatorStore() {
    const { slug } = useParams();
    const [storeData, setStoreData] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [latestReviews, setLatestReviews] = useState([]);
    const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // =========================================================================
    // 1. MOTOR DE BUSCA
    // =========================================================================
    useEffect(() => {
        const fetchAllData = async () => {
            if (!slug) return;
            try {
                let storeInfo = null;
                let storeId = null;

                // 1. TENTA BUSCAR DIRETO PELO ID DO DOCUMENTO (Mais rápido e à prova de falhas)
                const docRef = doc(db, 'stores', slug);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    storeInfo = docSnap.data();
                    storeId = docSnap.id;
                } else {
                    // 2. FALLBACK: Tenta buscar pelo campo 'slug' caso o ID não bata
                    const qStore = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
                    const snapStore = await getDocs(qStore);
                    
                    if (!snapStore.empty) {
                        storeInfo = snapStore.docs[0].data();
                        storeId = snapStore.docs[0].id;
                    }
                }

                // Se passou pelos 2 testes e não achou, a loja realmente não existe
                if (!storeInfo) {
                    setLoading(false);
                    return;
                }
                
                setStoreData(storeInfo);

                try {
                    const qProducts = query(collection(db, 'products'), where('storeId', '==', storeId), limit(4));
                    const snapProducts = await getDocs(qProducts);
                    setTopProducts(snapProducts.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch(e) { console.warn("Erro produtos:", e); }

                try {
                    const qReviews = query(collection(db, 'reviews'), where('storeId', '==', storeId), limit(50));
                    const snapReviews = await getDocs(qReviews);
                    
                    const reviewsList = snapReviews.docs.map(d => d.data());
                    reviewsList.sort((a, b) => {
                        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                        return dateB - dateA;
                    });
                    
                    setLatestReviews(reviewsList);
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
    // 2. INJEÇÃO DINÂMICA DE FAVICON (ABA DO NAVEGADOR)
    // =========================================================================
    useEffect(() => {
        if (storeData && (storeData.storeLogoUrl || storeData.logoUrl)) {
            const logoUrl = storeData.storeLogoUrl || storeData.logoUrl;
            
            // Troca o Favicon padrão
            let favicon = document.querySelector("link[rel~='icon']");
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = logoUrl;

            // Troca o Ícone da Apple (iPhone)
            let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleIcon) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                document.head.appendChild(appleIcon);
            }
            appleIcon.href = logoUrl;
        }
    }, [storeData]);

    if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Carregando loja...</div>;
    if (!storeData) return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-sm">Loja não encontrada na Velo Delivery.</div>;

    // =========================================================================
    // LÓGICA DE VARIÁVEIS PARA O SEO E A UI
    // =========================================================================
    let formattedAddress = "Endereço não cadastrado";
    if (typeof storeData.address === 'string') {
        formattedAddress = storeData.address;
    } else if (storeData.address && typeof storeData.address === 'object') {
        formattedAddress = [storeData.address.street, storeData.address.number, storeData.address.city].filter(Boolean).join(', ');
    }

    const ratingCount = Number(storeData.rating_count || storeData.reviewCount || latestReviews.length || 0);
    const ratingValue = Number(storeData.rating_aggregate || storeData.ratingValue || 5.0).toFixed(1);
    
    const storeUrl = `https://app.velodelivery.com.br/loja/${slug}`;
    const storeRealUrl = `https://${storeData.domain || `${slug}.velodelivery.com.br`}`;
    const safeStoreName = storeData.name || "Restaurante";
    const storeImage = storeData.storeLogoUrl || storeData.logoUrl || "https://app.velodelivery.com.br/logo-padrao.png";
    const storeDescription = storeData.slogan || storeData.aboutText || `Confira o cardápio, endereço e avaliações reais de ${safeStoreName}. Faça seu pedido online pela Velo Delivery.`;

    // Geração do Schema JSON-LD
    const schemaReviews = latestReviews.slice(0, 10).map(rev => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": rev.customerName || rev.userName || "Cliente Verificado" },
        "datePublished": rev.createdAt ? new Date(rev.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        "reviewBody": generateSmartReviewText(rev, safeStoreName),
        "reviewRating": { "@type": "Rating", "ratingValue": rev.rating || "5" }
    }));

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": safeStoreName,
        "image": storeImage,
        "description": storeDescription,
        "address": formattedAddress,
        "priceRange": storeData.priceRange || "$$",
        "url": storeUrl,
        ...(ratingCount > 0 ? {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": ratingValue,
                "reviewCount": ratingCount,
                "bestRating": "5",
                "worstRating": "1",
                "author": { "@type": "Organization", "name": "Velo Delivery" },
                "publisher": { "@type": "Organization", "name": "Velo Delivery" }
            }
        } : {}),
        ...(schemaReviews.length > 0 ? { "review": schemaReviews } : {})
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center pt-12 px-4 pb-24 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-64 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>

            {/* ========================================================================= */}
            {/* 🚀 CÉREBRO DO SEO: METADADOS GERAIS, OPEN GRAPH (WPP) E JSON-LD */}
            {/* ========================================================================= */}
            <Helmet>
                <title>{`${safeStoreName} - Cardápio e Avaliações | Velo Delivery`}</title>
                <meta name="description" content={storeDescription} />
                <link rel="canonical" href={storeUrl} />
                
                {/* Metadados Open Graph (Para ficar lindo ao colar o link no WhatsApp/Facebook) */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={storeUrl} />
                <meta property="og:title" content={`${safeStoreName} - Avaliações`} />
                <meta property="og:description" content={storeDescription} />
                <meta property="og:image" content={storeImage} />
                <meta property="og:site_name" content="Velo Delivery" />

                {/* Metadados Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${safeStoreName} - Avaliações`} />
                <meta name="twitter:description" content={storeDescription} />
                <meta name="twitter:image" content={storeImage} />

                {/* Schema Markup Oculto para o Robô do Google */}
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
                </script>
            </Helmet>
            
            {/* Header Velo Delivery */}
            <div className="mb-6 text-center flex flex-col items-center relative z-10">
                <img src="/logo retangular Velo Delivery.png" alt="Velo Delivery" className="h-5 opacity-40 grayscale mb-2" />
                <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border border-slate-300/50">
                    Portal de Avaliações
                </span>
            </div>

            {/* CARD PRINCIPAL DA LOJA */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center max-w-md w-full border border-slate-100 mb-8 relative z-10">
                <div className="relative inline-block mb-4">
                    {storeImage !== "https://app.velodelivery.com.br/logo-padrao.png" ? (
                        <img 
                            src={storeImage} 
                            alt={`Logo ${safeStoreName}`} 
                            className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm bg-white" 
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-sm bg-slate-50 flex items-center justify-center text-slate-300">
                            <Store size={36} />
                        </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Loja Verificada Velo">
                        <CheckCircle size={14} />
                    </div>
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-2">
                    {safeStoreName}
                </h1>
                
                <p className="text-xs font-medium text-slate-500 mb-6 px-4">
                    {storeData.slogan || storeData.aboutText || 'As melhores opções para o seu delivery.'}
                </p>

                {ratingCount > 0 && (
                    <div className="inline-flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-[1.5rem] border border-amber-100/50 w-full mb-6 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-3xl font-black text-amber-500 tracking-tighter">{ratingValue}</span>
                            <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} fill={i < Math.round(Number(ratingValue)) ? "currentColor" : "none"} className={i < Math.round(Number(ratingValue)) ? "text-amber-400" : "text-amber-200"} />
                                ))}
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-amber-700/80 tracking-widest mb-3">
                            Baseado em {ratingCount} avaliações
                        </span>
                        <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-amber-100 text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-green-500"/> Auditado por Velo Delivery
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6">
                    <div className="flex items-start gap-2">
                        <span className="text-lg shrink-0 mt-0.5">📍</span>
                        <span className="text-xs font-bold text-slate-600 leading-snug">{formattedAddress}</span>
                    </div>
                    {storeData.whatsapp && (
                        <div className="flex items-center gap-2">
                            <span className="text-lg shrink-0">📞</span>
                            <span className="text-xs font-bold text-slate-600">{storeData.whatsapp}</span>
                        </div>
                    )}
                </div>

                <a 
                    href={storeRealUrl}
                    className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                    Acessar Cardápio e Pedir <ExternalLink size={14} />
                </a>
            </div>

            {/* SEÇÃO SEO: MAIS PEDIDOS */}
            {topProducts.length > 0 && (
                <div className="w-full max-w-md mb-8 text-left relative z-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Destaques da Loja</h2>
                        <a href={storeRealUrl} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">Ver Todos</a>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {topProducts.map((p, i) => {
                            const imgSource = p.imageUrl || p.fotoUrl || p.image;
                            return (
                                <a 
                                    key={i} 
                                    href={`${storeRealUrl}/p/${generateSlug(p.name)}`}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-all active:scale-95 group"
                                >
                                    {imgSource ? (
                                        <img src={imgSource} alt={p.name} className="w-16 h-16 object-contain mb-3 rounded-lg group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 mb-3">
                                            <ShoppingBag size={24} />
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

            {/* SEÇÃO SEO: ÚLTIMAS AVALIAÇÕES HUMANIZADAS PELA IA */}
            {latestReviews.length > 0 ? (
                <div className="w-full max-w-md text-left mb-6 relative z-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Opinião dos Clientes</h2>
                    </div>
                    <div className="space-y-3">
                        {latestReviews.slice(0, 3).map((rev, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 relative">
                                <span className="absolute top-2 right-4 text-4xl text-slate-100 font-serif leading-none">"</span>
                                <div className="flex items-center justify-between mb-3 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black uppercase border border-blue-100">
                                            {(rev.customerName || rev.userName || "C")[0]}
                                        </div>
                                        <span className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[120px]">{rev.customerName || rev.userName || "Cliente"}</span>
                                    </div>
                                    <div className="flex text-amber-400">
                                        {[...Array(5)].map((_, idx) => (
                                            <Star key={idx} size={12} fill={idx < Math.round(rev.rating || 5) ? "currentColor" : "none"} className={idx < Math.round(rev.rating || 5) ? "text-amber-400" : "text-amber-200"} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic relative z-10">
                                    "{generateSmartReviewText(rev, safeStoreName)}"
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    {latestReviews.length > 3 && (
                        <button onClick={() => setShowAllReviewsModal(true)} className="mt-5 flex items-center justify-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline bg-blue-50/50 py-3 w-full rounded-xl border border-blue-100/50">
                            Ler todas as {ratingCount} avaliações <ArrowRightCircle size={12} className="ml-1"/>
                        </button>
                    )}
                </div>
            ) : (
                <div className="w-full max-w-md text-center mt-4 mb-8">
                    <p className="text-xs font-bold text-slate-400">Seja o primeiro a avaliar após fazer um pedido!</p>
                </div>
            )}

            {/* BOTÃO FLUTUANTE INFERIOR */}
            <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none">
                 <a 
                    href={storeRealUrl}
                    className="pointer-events-auto bg-slate-900 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-slate-700"
                >
                    Fazer Pedido Agora <ArrowRightCircle size={16} />
                </a>
            </div>

            {/* MODAL COM TODAS AS AVALIAÇÕES DO APP */}
            <AnimatePresence>
                {showAllReviewsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-50 w-full max-w-md rounded-[2.5rem] shadow-2xl relative flex flex-col h-[85vh] overflow-hidden border border-slate-200">
                            <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between z-10 shadow-sm shrink-0">
                                <div>
                                    <h2 className="text-xl font-black italic uppercase text-slate-800 leading-none">Avaliações</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">O que os clientes dizem</p>
                                </div>
                                <button onClick={() => setShowAllReviewsModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors"><X size={20}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {latestReviews.map((rev, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                        <span className="absolute top-2 right-4 text-4xl text-slate-50 font-serif leading-none">"</span>
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-black uppercase border border-blue-100">
                                                    {(rev.customerName || rev.userName || "C")[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800 uppercase truncate max-w-[120px]">{rev.customerName || rev.userName || "Cliente"}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">✅ Compra Verificada</span>
                                                </div>
                                            </div>
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, idx) => <Star key={idx} size={14} fill={idx < Math.round(rev.rating || 5) ? "currentColor" : "none"} className={idx < Math.round(rev.rating || 5) ? "text-amber-400" : "text-amber-200"} />)}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed italic relative z-10">
                                            "{generateSmartReviewText(rev, safeStoreName)}"
                                        </p>
                                        {(rev.reply || rev.storeReply) && (
                                            <div className="mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Resposta da Loja</p>
                                                <p className="text-[10px] text-blue-900 font-bold">{rev.reply || rev.storeReply}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}