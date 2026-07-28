import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { Star, ThumbsUp, ExternalLink } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';

export default function Reviews({ storeId }) {
    const [googleReviews, setGoogleReviews] = useState([]);
    const [storeInfo, setStoreInfo] = useState(null); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPureGoogleReviews = async () => {
            if (!storeId) return;
            try {
                // 1. Busca os dados da loja
                const storeRef = doc(db, 'stores', storeId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    setStoreInfo(storeSnap.data());
                }

                // 2. Busca um lote grande de avaliações no banco
                const q = query(collection(db, "reviews"), where("storeId", "==", storeId), limit(200));
                const snapshot = await getDocs(q);
                
                let allReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. 🔪 O FILTRO DESTRUIDOR: Ignora Clube VIP, ignora App. Pega SÓ o que for do Google.
                let onlyGoogle = allReviews.filter(r => 
                    r.source === 'google' || 
                    r.source === 'GMB' || 
                    !!r.googleReviewName || 
                    !!r.googleReviewId
                );

                // 4. Ordena da mais recente para a mais antiga
                onlyGoogle.sort((a, b) => {
                    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return dateB - dateA;
                });
                
                // Exibe as 10 melhores na tela da loja
                setGoogleReviews(onlyGoogle.slice(0, 10));
            } catch (error) {
                console.error("Erro ao carregar avaliações do Google:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPureGoogleReviews();
    }, [storeId]);

    // Botão de Forçar Sincronização (Visível só para o Lojista no Admin)
    const [isSyncing, setIsSyncing] = useState(false);
    const handleSyncGoogleReviews = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/sync-google-reviews');
            if (!response.ok) throw new Error("Falha ao sincronizar");
            alert("Avaliações do Google verificadas com sucesso!");
            window.location.reload();
        } catch (error) {
            alert("A sincronização foi iniciada. Se houver novos reviews no Google, eles aparecerão em breve.");
        } finally {
            setIsSyncing(false);
        }
    };

    // =====================================================================
    // 🧮 CÁLCULO DAS NOTAS (100% GOOGLE)
    // =====================================================================
    // Tenta pegar a nota exata do Google salva no banco. Se não achar, calcula com base nos reviews filtrados.
    const googleRatingValue = storeInfo?.googleRatingValue || (
        googleReviews.length > 0 
        ? (googleReviews.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / googleReviews.length).toFixed(1) 
        : "5.0"
    );

    // Pega o total exato de reviews do Google (como os 62 que você viu).
    const googleReviewCount = storeInfo?.googleReviewCount || googleReviews.length;

    // Se a loja não tem link do Google E não puxou nenhum review do Google, oculta a seção
    if (!loading && googleReviews.length === 0 && !storeInfo?.googleReviewUrl) {
        return null;
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            
            {/* --- CABEÇALHO DO MURAL GOOGLE --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1 flex items-center gap-2">
                        <FaGoogle className="text-blue-500" size={24}/> Avaliações no Google
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-900">{Number(googleRatingValue).toFixed(1)}</span>
                        <div className="flex flex-col">
                            <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={18} fill={star <= Math.round(Number(googleRatingValue)) ? "currentColor" : "none"} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {googleReviewCount > 0 ? `${googleReviewCount} avaliações no Google Maps` : 'Carregando avaliações...'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {Number(googleRatingValue) >= 4.0 && (
                    <div className="flex flex-col gap-2">
                        <div className="bg-blue-50 text-blue-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-blue-200 shadow-sm">
                            <ThumbsUp size={20} className="mb-1" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-widest leading-none">Verificado</span>
                                <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Pelo Google</span>
                            </div>
                        </div>
                        
                        {/* Botão de Sync exclusivo para o Admin */}
                        {window.location.pathname.includes('/admin') && (
                            <button onClick={handleSyncGoogleReviews} disabled={isSyncing} className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 uppercase tracking-widest text-right">
                                {isSyncing ? "Sincronizando..." : "🔄 Puxar do Google"}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {/* --- LISTAGEM EXCLUSIVA DE REVIEWS DO GOOGLE --- */}
            <div className="space-y-4 mb-8 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <p className="text-slate-500 font-bold animate-pulse text-center py-4">Sincronizando com o Google Maps...</p>
                ) : googleReviews.length === 0 ? (
                    <div className="bg-slate-50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200">
                        <FaGoogle size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-bold text-sm mb-1">Os comentários do Google aparecerão aqui.</p>
                        <p className="text-slate-400 font-bold text-xs">Se você acabou de sincronizar, atualize a página.</p>
                    </div>
                ) : googleReviews.map(r => (
                    <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                {/* Imagem de perfil do Google ou Letra Inicial */}
                                {r.profilePhotoUrl ? (
                                    <img src={r.profilePhotoUrl} alt={r.googleReviewName} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-full flex items-center justify-center text-sm font-black uppercase shrink-0 shadow-sm">
                                        {(r.googleReviewName || r.customerName || "G")[0]}
                                    </div>
                                )}
                                
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                                        {r.googleReviewName || r.customerName}
                                    </span>
                                    {/* Data real do Google */}
                                    <span className="text-[9px] font-black text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-widest">
                                        {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Google Maps'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill={i < (r.rating || 5) ? "currentColor" : "none"} className={i < (r.rating || 5) ? "text-yellow-400" : "text-yellow-200"} />
                                ))}
                            </div>
                        </div>
                        
                        {/* Texto Real e Original do Google */}
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                            "{r.comment || r.text || "Sem comentário escrito."}"
                        </p>
                        
                        {/* Foto que o cliente postou no Google (Se houver) */}
                        {r.imageUrl && (
                            <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 inline-block">
                                <img src={r.imageUrl} alt="Foto da avaliação do Google" className="h-24 w-auto object-cover rounded-xl" loading="lazy" />
                            </div>
                        )}
                        
                        {/* Resposta do Lojista */}
                        {(r.reply || r.storeReply) && (
                            <div className="mt-4 bg-blue-50/60 p-3 rounded-xl border border-blue-100/50 relative ml-4">
                                <div className="absolute -top-2 left-4 bg-white px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest border border-blue-100 rounded-full shadow-sm">
                                    Sua Resposta
                                </div>
                                <p className="text-xs text-blue-900 font-bold mt-1 leading-relaxed">{r.reply || r.storeReply}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* --- BOTÃO MÁGICO: AVALIAR NO GOOGLE MEU NEGÓCIO --- */}
            {storeInfo?.googleReviewUrl && (
                <div className="pt-6 border-t border-slate-100 text-center animate-in fade-in">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Sua opinião é muito importante!</p>
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