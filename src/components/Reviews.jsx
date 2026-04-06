import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, ThumbsUp, ImageIcon } from 'lucide-react';

export default function Reviews({ storeId }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRating, setNewRating] = useState(5);
    const[comment, setComment] = useState('');
    const [orderId, setOrderId] = useState('');
    const[customerName, setCustomerName] = useState('');

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Busca as avaliações da loja (sem orderBy para evitar erro de Index no Firebase)
                const q = query(
                    collection(db, "reviews"),
                    where("storeId", "==", storeId),
                    limit(100) // Aumentado para gerar uma média mais real
                );
                const snapshot = await getDocs(q);
                
                // Mapeia e ordena localmente usando JavaScript (resolve o problema do Firebase)
                const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedReviews.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("Erro ao carregar avaliações:", error);
            } finally {
                // Desliga o aviso de carregando, mesmo se der erro
                setLoading(false);
            }
        };

        if (storeId) fetchReviews();
    }, [storeId]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        
        if (!orderId || !comment || !customerName) {
            return alert("Por favor, preencha todos os campos!");
        }
        
        try {
            // Salva a avaliação no banco
            await addDoc(collection(db, "reviews"), {
                storeId,
                orderId,
                rating: newRating,
                comment,
                customerName,
                createdAt: serverTimestamp()
            });
            
            alert("Avaliação enviada com sucesso! Muito obrigado.");
            
            // Limpa o formulário
            setComment('');
            setOrderId('');
            setCustomerName('');
            setNewRating(5);
            
            // Opcional: Recarregar a página para ver a avaliação (ou você pode adicionar ao state manualmente)
            window.location.reload();

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao enviar avaliação! Verifique sua conexão e tente novamente.");
        }
    };

    // Cálculos para o SEO e para a nota visual
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / totalReviews).toFixed(1) 
        : 5.0;

    // Schema.org para o Google ler as estrelas nos resultados de pesquisa
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Velo Delivery Store",
        "aggregateRating": totalReviews > 0 ? {
            "@type": "AggregateRating",
            "ratingValue": averageRating,
            "reviewCount": totalReviews,
            "bestRating": "5",
            "worstRating": "1"
        } : undefined
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            {/* Script invisível para SEO (Rich Snippets no Google) */}
            {totalReviews > 0 && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            )}
            
            {/* Cabeçalho Visual de Avaliações */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1">Avaliações da Loja</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-900">{averageRating}</span>
                        <div className="flex flex-col">
                            <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={18} fill={star <= Math.round(averageRating) ? "currentColor" : "none"} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Baseado em {totalReviews} avaliações
                            </span>
                        </div>
                    </div>
                </div>
                
                {averageRating >= 4.0 && (
                    <div className="bg-green-100 text-green-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-green-200 shadow-sm">
                        <ThumbsUp size={20} className="mb-1" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Excelente</span>
                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Loja Verificada</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* --- LISTAGEM DE AVALIAÇÕES --- */}
            <div className="space-y-4 mb-8 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <p className="text-slate-500 font-bold animate-pulse">Buscando avaliações...</p>
                ) : reviews.length === 0 ? (
                    <p className="text-slate-400 font-bold">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                ) : reviews.map(r => (
                    <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{r.customerName}</span>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < r.rating ? "currentColor" : "none"} />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{r.comment}</p>
                        
                        {/* Foto da Avaliação (Se houver) */}
                        {r.imageUrl && (
                            <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 inline-block">
                                <img src={r.imageUrl} alt={`Foto da avaliação de ${r.customerName}`} className="h-24 w-auto object-cover rounded-xl" loading="lazy" />
                            </div>
                        )}
                        
                        {/* Resposta do Lojista */}
                        {r.reply && (
                            <div className="mt-4 bg-blue-50/60 p-3 rounded-xl border border-blue-100/50 relative ml-4">
                                <div className="absolute -top-2 left-4 bg-white px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest border border-blue-100 rounded-full shadow-sm">Resposta da Loja</div>
                                <p className="text-xs text-blue-900 font-bold mt-1 leading-relaxed">{r.reply}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* --- FORMULÁRIO PARA AVALIAR --- */}
            <form onSubmit={handleSubmitReview} className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-2">Deixe sua avaliação</h3>
                
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
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all mt-2"
                >
                    Enviar Avaliação
                </button>
            </form>
        </div>
    );
}