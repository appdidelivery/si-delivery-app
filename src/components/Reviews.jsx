import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Star, ThumbsUp, ExternalLink } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';

// Converte as estrelas do Google para Número
const mapGoogleRating = (ratingStr) => {
    const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return map[ratingStr] || Number(ratingStr) || 5;
};

export default function Reviews({ storeId }) {
    const [reviews, setReviews] = useState([]);
    const [storeInfo, setStoreInfo] = useState(null);
    
    // NOVO: Estados para guardar a nota real absoluta do Google
    const [globalGoogleMetrics, setGlobalGoogleMetrics] = useState({ rating: null, count: null });
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGoogleReviews = async () => {
            const finalStoreId = storeId === 'loja-teste' ? 'csi' : storeId;

            if (!finalStoreId) {
                setLoading(false); return;
            }

            try {
                let finalReviewsArray = [];

                // 1. Busca configurações básicas da Loja no Firebase
                const storeRef = doc(db, 'stores', finalStoreId);
                const storeSnap = await getDoc(storeRef);
                
                if (storeSnap.exists()) {
                    const data = storeSnap.data();
                    setStoreInfo(data);
                    
                    // Seta as notas globais do Google que já resolvemos
                    const cachedRating = data.rating_aggregate || data.googleRatingValue || data.googleData?.averageRating;
                    const cachedCount = data.rating_count || data.googleReviewCount || data.googleData?.totalReviewCount;
                    if (cachedRating || cachedCount) {
                        setGlobalGoogleMetrics({ rating: cachedRating, count: cachedCount });
                    }
                }

                // 2. BUSCA AS AVALIAÇÕES INTERNAS DO APP VELO (Prioridade)
                try {
                    const internalReviewsQuery = query(
                        collection(db, 'reviews'),
                        where('storeId', '==', finalStoreId),
                        orderBy('createdAt', 'desc'),
                        limit(10)
                    );
                    const internalSnap = await getDocs(internalReviewsQuery);
                    
                    const internalReviews = internalSnap.docs.map(d => {
                        const data = d.data();
                        return {
                            id: d.id,
                            customerName: data.customerName || 'Cliente VIP',
                            photoUrl: null, // Clientes do app não tem foto do Google
                            comment: data.comment || '',
                            rating: Number(data.rating) || 5,
                            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
                            isAppReview: true // Flag para identificar a origem
                        };
                    });
                    
                    finalReviewsArray = [...internalReviews];
                } catch (internalErr) {
                    console.warn("Erro ao buscar avaliações internas do App:", internalErr);
                }

                // 3. TENTA BUSCAR AVALIAÇÕES DO GOOGLE PELA API
                try {
                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    const apiUrl = isLocal 
                        ? `https://app.velodelivery.com.br/api/google-gmb?action=getReviews&storeId=${finalStoreId}`
                        : `/api/google-gmb?action=getReviews&storeId=${finalStoreId}`;

                    const res = await fetch(apiUrl);
                    if (res.ok) {
                        const data = await res.json();
                        
                        if (data.success && data.reviews) {
                            if (data.reviews.averageRating || data.reviews.totalReviewCount) {
                                setGlobalGoogleMetrics(prev => ({
                                    rating: data.reviews.averageRating || prev.rating,
                                    count: data.reviews.totalReviewCount || prev.count
                                }));
                            }

                            if (data.reviews.reviews && data.reviews.reviews.length > 0) {
                                const googleReviews = data.reviews.reviews.map(r => {
                                    let cleanComment = r.comment || '';
                                    cleanComment = cleanComment.split('(Translated by Google)')[0];
                                    cleanComment = cleanComment.split('(Traduzido pelo Google)')[0];
                                    cleanComment = cleanComment.trim();

                                    return {
                                        id: r.reviewId,
                                        customerName: r.reviewer?.displayName || 'Cliente Google',
                                        photoUrl: r.reviewer?.profilePhotoUrl,
                                        comment: cleanComment,
                                        rating: mapGoogleRating(r.starRating),
                                        createdAt: new Date(r.createTime).getTime(),
                                        isAppReview: false
                                    };
                                });
                                // Junta as do App com as do Google
                                finalReviewsArray = [...finalReviewsArray, ...googleReviews];
                            }
                        }
                    }
                } catch (googleErr) {
                    console.warn("API do Google indisponível. Usando apenas avaliações do App.");
                }

                // 4. FILTRA, ORDENA E RENDERIZA O RESULTADO FINAL
                const validReviews = finalReviewsArray.filter(r => r.comment && r.comment.trim() !== '');
                validReviews.sort((a, b) => b.createdAt - a.createdAt);
                
                setReviews(validReviews.slice(0, 10)); // Exibe as 10 mais recentes (App + Google)

            } catch (error) {
                console.error("Erro Crítico no carregamento de avaliações:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGoogleReviews();
    }, [storeId]);

    if (!loading && reviews.length === 0 && !storeInfo?.googleReviewUrl) {
        return null;
    }

    // =========================================================================
    // 🧮 LÓGICA BLINDADA DO CONTADOR E DA NOTA
    // =========================================================================
    const averageRating = globalGoogleMetrics.rating 
        ? Number(globalGoogleMetrics.rating).toFixed(1)
        : storeInfo?.rating_aggregate 
            ? Number(storeInfo.rating_aggregate).toFixed(1) 
            : "5.0";

    const totalReviews = globalGoogleMetrics.count 
        || storeInfo?.rating_count 
        || reviews.length;

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1 flex items-center gap-2">
                        <FaGoogle className="text-blue-500" size={24}/> Avaliações no Google
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-900">{averageRating}</span>
                        <div className="flex flex-col">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} fill={i < Math.round(Number(averageRating)) ? "currentColor" : "none"} className={i < Math.round(Number(averageRating)) ? "text-yellow-400" : "text-yellow-200"} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {loading ? 'Calculando...' : `${totalReviews} avaliações no Maps`}
                            </span>
                        </div>
                    </div>
                </div>
                
                {Number(averageRating) >= 4.0 && totalReviews > 0 && (
                    <div className="bg-blue-50 text-blue-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-blue-200 shadow-sm">
                        <ThumbsUp size={20} className="mb-1" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Verificado</span>
                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Pelo Google</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <FaGoogle size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-bold text-sm">Seja o primeiro a nos avaliar no Google Maps!</p>
                    </div>
                ) : reviews.map(r => (
                    <div key={r.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                {r.photoUrl ? (
                                    <img src={r.photoUrl} alt={r.customerName} className="w-10 h-10 rounded-full shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-full flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-sm">
                                        {(r.customerName || "G")[0]}
                                    </div>
                                )}
                                
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-slate-800 tracking-tight leading-none max-w-[150px] truncate">{r.customerName}</span>
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 mt-1">
                                        <FaGoogle size={10} /> Google Review
                                    </span>
                                </div>
                            </div>
                            <div className="flex text-yellow-400 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "text-yellow-400" : "text-yellow-200"}/>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{r.comment}"</p>
                    </div>
                ))}
            </div>

            {storeInfo?.googleReviewUrl && (
                <div className="pt-6 border-t border-slate-100 text-center animate-in fade-in">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Sua opinião é muito importante para nós!</p>
                    <a 
                        href={storeInfo.googleReviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-95 border border-blue-700"
                    >
                        <FaGoogle size={18} /> Avaliar no Google Maps <ExternalLink size={14}/>
                    </a>
                </div>
            )}
        </div>
    );
}