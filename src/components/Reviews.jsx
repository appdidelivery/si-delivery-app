import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star } from 'lucide-react';

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
                    limit(10)
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

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4">
            <h2 className="text-2xl font-black italic uppercase mb-6 text-slate-800">Avaliações da Loja</h2>
            
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