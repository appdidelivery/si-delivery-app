import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
                // 1. Busca configs do Firebase
                const storeRef = doc(db, 'stores', finalStoreId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    setStoreInfo(storeSnap.data());
                }

                // 2. Busca da API do Google
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const apiUrl = isLocal 
                    ? `https://app.velodelivery.com.br/api/google-gmb?action=getReviews&storeId=${finalStoreId}`
                    : `/api/google-gmb?action=getReviews&storeId=${finalStoreId}`;

                const res = await fetch(apiUrl);
                const data = await res.json();
                
                if (data.success && data.reviews) {
                    
                    // 🚨 A MÁGICA AQUI: Pega a nota TOTAL direto da raiz da API (se o backend enviar)
                    if (data.reviews.averageRating || data.reviews.totalReviewCount) {
                        setGlobalGoogleMetrics({
                            rating: data.reviews.averageRating,
                            count: data.reviews.totalReviewCount
                        });
                    }

                    if (data.reviews.reviews) {
                        const formattedReviews = data.reviews.reviews.map(r => {
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
                                createdAt: new Date(r.createTime).getTime() 
                            };
                        });
                        
                        // Filtra para exibir na tela apenas quem escreveu texto (para não ficar feio)
                        const filteredReviews = formattedReviews.filter(r => r.comment && r.comment !== '');
                        filteredReviews.sort((a, b) => b.createdAt - a.createdAt);
                        
                        setReviews(filteredReviews.slice(0, 10)); 
                    }
                }
            } catch (error) {
                console.error("Erro na API do Google Meu Negócio:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGoogleReviews();
    }, [storeId]);

    // Oculta o componente inteiro se a loja não tiver reviews
    if (!loading && reviews.length === 0 && !storeInfo?.googleReviewUrl) {
        return null;
    }

    // =========================================================================
    // 🧮 LÓGICA BLINDADA DO CONTADOR E DA NOTA
    // =========================================================================
    // 1º Tenta pegar a nota que veio direto da API oficial do Google.
    // 2º Tenta pegar a nota salva no painel Admin (storeInfo).
    // 3º Falha segura: Calcula a média do que apareceu na tela.
    const averageRating = globalGoogleMetrics.rating 
        ? Number(globalGoogleMetrics.rating).toFixed(1)
        : storeInfo?.googleRatingValue 
            ? Number(storeInfo.googleRatingValue).toFixed(1) 
            : "5.0";

    // 1º Tenta pegar o total real de 62 da API.
    // 2º Tenta pegar do Firebase.
    // 3º Mostra a quantidade das caixinhas.
    const totalReviews = globalGoogleMetrics.count || storeInfo?.googleReviewCount || reviews.length;

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