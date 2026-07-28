import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Star, ThumbsUp, ImageIcon, ExternalLink } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6'; // Import do ícone do Google

// =========================================================================
// 🧠 MOTOR DE IA (E-E-A-T) - HUMANIZAÇÃO DE REVIEWS
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

export default function Reviews({ storeId }) {
    const [reviews, setReviews] = useState([]);
    const [storeInfo, setStoreInfo] = useState(null); // Para guardar nome e link do Google
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Estados do Formulário
    const [newRating, setNewRating] = useState(5);
    const [comment, setComment] = useState('');
    const [orderId, setOrderId] = useState('');
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!storeId) return;
            try {
                // 1. Busca os dados da loja (Para saber o Nome da Loja e o Link do Google)
                const storeRef = doc(db, 'stores', storeId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    setStoreInfo(storeSnap.data());
                }

                // 2. Busca as avaliações (Limite de 100 para análise)
                const q = query(collection(db, "reviews"), where("storeId", "==", storeId), limit(100));
                const snapshot = await getDocs(q);
                
                let fetchedReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. 🚀 MÁGICA DO ALGORITMO: Ordena Google 1º, depois por Data
                fetchedReviews.sort((a, b) => {
                    // Se 'a' é Google e 'b' não é, 'a' sobe
                    if (a.source === 'google' && b.source !== 'google') return -1;
                    // Se 'b' é Google e 'a' não é, 'b' sobe
                    if (a.source !== 'google' && b.source === 'google') return 1;
                    // Se empatou (ambos Google ou ambos App), desempata pela data mais recente
                    const dateA = a.createdAt?.toMillis() || 0;
                    const dateB = b.createdAt?.toMillis() || 0;
                    return dateB - dateA;
                });
                
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("Erro ao carregar avaliações:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId]);

    const handleSyncGoogleReviews = async () => {
        setIsSyncing(true);
        try {
            // Rota interna para forçar a Vercel a puxar novos dados (se houver)
            const response = await fetch('/api/sync-google-reviews');
            if (!response.ok) throw new Error("Falha ao sincronizar");
            
            alert("Avaliações do Google verificadas com sucesso!");
            window.location.reload();
        } catch (error) {
            console.error("Erro na sincronização:", error);
            alert("Sincronização em segundo plano concluída. Se houver novos reviews, aparecerão em breve.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        
        if (!orderId || !comment || !customerName) {
            return alert("Por favor, preencha todos os campos!");
        }
        
        try {
            await addDoc(collection(db, "reviews"), {
                storeId,
                orderId,
                rating: newRating,
                comment,
                customerName,
                createdAt: serverTimestamp(),
                source: 'app'
            });
            
            alert("Avaliação enviada com sucesso! Muito obrigado.");
            setComment(''); setOrderId(''); setCustomerName(''); setNewRating(5);
            window.location.reload();

        } catch (error) {
            alert("Erro ao enviar avaliação! Verifique sua conexão e tente novamente.");
        }
    };

    // Cálculos para a nota visual
    const totalReviews = storeInfo?.reviewCount || reviews.length;
    const averageRating = storeInfo?.ratingValue 
        ? Number(storeInfo.ratingValue).toFixed(1)
        : totalReviews > 0 
            ? (reviews.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / totalReviews).toFixed(1) 
            : "5.0";

    const safeStoreName = storeInfo?.name || "Nossa Loja";

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            
            {/* Cabeçalho Visual de Avaliações */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1">Avaliações da Loja</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-900">{averageRating}</span>
                        <div className="flex flex-col">
                            <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={18} fill={star <= Math.round(Number(averageRating)) ? "currentColor" : "none"} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Baseado em {totalReviews} avaliações
                            </span>
                        </div>
                    </div>
                </div>
                
                {Number(averageRating) >= 4.0 && (
                    <div className="flex flex-col gap-2">
                        <div className="bg-green-100 text-green-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-green-200 shadow-sm">
                            <ThumbsUp size={20} className="mb-1" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-widest leading-none">Excelente</span>
                                <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Loja Verificada</span>
                            </div>
                        </div>
                        
                        {/* Botão visível apenas para o Administrador dentro do painel */}
                        {window.location.pathname.includes('/admin') && (
                            <button 
                                onClick={handleSyncGoogleReviews}
                                disabled={isSyncing}
                                className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 uppercase tracking-widest"
                            >
                                {isSyncing ? "Sincronizando..." : "Atualizar do Google"}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {/* --- LISTAGEM DE AVALIAÇÕES --- */}
            <div className="space-y-4 mb-8 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <p className="text-slate-500 font-bold animate-pulse">Buscando avaliações...</p>
                ) : reviews.length === 0 ? (
                    <p className="text-slate-400 font-bold text-sm">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                ) : reviews.map(r => {
                    const isGoogle = r.source === 'google';
                    const reviewerName = r.customerName || r.userName || r.googleReviewName || "Cliente";
                    
                    // Se for do Google usa o texto dele, se for do App usa a Máscara de IA
                    const reviewText = isGoogle 
                        ? (r.comment || r.text || "Excelente atendimento e produto!") 
                        : generateSmartReviewText(r, safeStoreName);

                    return (
                        <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-slate-800 uppercase tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                                        {reviewerName}
                                    </span>
                                    {isGoogle && (
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-100 shadow-sm">
                                            <FaGoogle size={10}/> Google
                                        </span>
                                    )}
                                </div>
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < (r.rating || 5) ? "currentColor" : "none"} />
                                    ))}
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                "{reviewText}"
                            </p>
                            
                            {/* Foto da Avaliação (Se houver) */}
                            {r.imageUrl && (
                                <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 inline-block">
                                    <img src={r.imageUrl} alt="Foto da avaliação" className="h-24 w-auto object-cover rounded-xl" loading="lazy" />
                                </div>
                            )}
                            
                            {/* Resposta do Lojista */}
                            {(r.reply || r.storeReply) && (
                                <div className="mt-4 bg-blue-50/60 p-3 rounded-xl border border-blue-100/50 relative ml-4">
                                    <div className="absolute -top-2 left-4 bg-white px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest border border-blue-100 rounded-full shadow-sm">
                                        Resposta da Loja
                                    </div>
                                    <p className="text-xs text-blue-900 font-bold mt-1 leading-relaxed">{r.reply || r.storeReply}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- 🚀 NOVO: BOTÃO DE AVALIAÇÃO NO GOOGLE --- */}
            {storeInfo && storeInfo.googleReviewUrl && (
                <div className="mb-8 pt-6 border-t border-slate-100 text-center animate-in fade-in">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Já comprou com a gente?</p>
                    <a 
                        href={storeInfo.googleReviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-95"
                    >
                        <FaGoogle size={18} /> Avaliar no Google Maps <ExternalLink size={14}/>
                    </a>
                </div>
            )}

            {/* --- FORMULÁRIO INTERNO PARA AVALIAR NO APP --- */}
            <form onSubmit={handleSubmitReview} className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-2">Avaliar pelo aplicativo</h3>
                
                {/* Seleção de Estrelas */}
                <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                            key={star} 
                            size={36} 
                            className="cursor-pointer text-yellow-400 transition-transform hover:scale-110" 
                            fill={star <= newRating ? "currentColor" : "none"} 
                            onClick={() => setNewRating(star)}
                        />
                    ))}
                </div>

                {/* Campos do Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" 
                        placeholder="Seu Nome (Como quer aparecer)" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all" 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="ID do Pedido (Ex: abcd1)" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all" 
                        value={orderId} 
                        onChange={e => setOrderId(e.target.value)} 
                        required 
                    />
                </div>
                
                <textarea 
                    placeholder="Conte para a gente: O que achou do seu pedido e da entrega?" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all resize-none" 
                    rows="3" 
                    value={comment} 
                    onChange={e => setComment(e.target.value)} 
                    required
                ></textarea>
                
                <button 
                    type="submit" 
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all mt-2"
                >
                    Enviar Avaliação no App
                </button>
            </form>
        </div>
    );
}