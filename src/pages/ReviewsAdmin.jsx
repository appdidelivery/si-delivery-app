import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, updateDoc } from 'firebase/firestore';
import { Star, ChevronLeft, ChevronRight, MessageSquare, Loader2, X } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';

// Recebemos o storeId como prop (ex: 'csi') para filtrar só as avaliações dessa loja
export default function ReviewsAdmin({ storeId = 'csi' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Respostas (Google e Interno)
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState(false);

  // Paginação
  const itemsPerPage = 10;
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Histórico de cursores para o botão "Voltar"
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchReviews = async (direction = 'next') => {
    setLoading(true);
    try {
      let q;
      const baseQuery = [
        collection(db, 'reviews'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc'),
        limit(itemsPerPage)
      ];

      if (direction === 'next' && page > 0) {
        // Avançar: Usa o último documento da página atual como ponto de partida
        const lastDoc = lastVisibleDocs[page - 1];
        q = query(...baseQuery, startAfter(lastDoc));
      } else if (direction === 'prev' && page > 1) {
        // Voltar: Usa o cursor da página anterior
        const prevDoc = lastVisibleDocs[page - 3]; 
        q = prevDoc ? query(...baseQuery, startAfter(prevDoc)) : query(...baseQuery);
      } else {
        // Primeira página
        q = query(...baseQuery);
      }

      const querySnapshot = await getDocs(q);
      
      const fetchedReviews = [];
      querySnapshot.forEach((doc) => {
        fetchedReviews.push({ id: doc.id, ...doc.data() });
      });

      setReviews(fetchedReviews);

      // Controle de paginação
      if (querySnapshot.docs.length > 0) {
        const currentLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        if (direction === 'next') {
          setLastVisibleDocs(prev => [...prev, currentLastDoc]);
          setPage(p => p + 1);
        } else if (direction === 'prev') {
          setLastVisibleDocs(prev => prev.slice(0, -1));
          setPage(p => p - 1);
        } else {
          setLastVisibleDocs([currentLastDoc]);
          setPage(1);
        }
      }

      // Se trouxe menos itens que o limite, não tem próxima página
      setHasNextPage(querySnapshot.docs.length === itemsPerPage);

    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews('initial');
  }, [storeId]);

  // Função auxiliar para formatar a data do Firebase
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data indisponível';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 max-w-5xl mx-auto mt-6 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Gestão de Avaliações</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Clube VIP - Visão do Lojista</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm">
          Loja Ativa: {storeId.toUpperCase()}
        </div>
      </div>

      {loading && reviews.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="p-4 text-slate-400 font-black text-xs uppercase tracking-widest">Data</th>
                  <th className="p-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cliente (ID)</th>
                  <th className="p-4 text-slate-400 font-black text-xs uppercase tracking-widest">Nota</th>
                  <th className="p-4 text-slate-400 font-black text-xs uppercase tracking-widest">Comentário</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Nenhuma avaliação recebida ainda.</td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-slate-600">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-400 bg-slate-50/50 rounded-lg">
                        {review.userId.slice(0, 8)}...
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              size={16} 
                              className={star <= review.rating ? 'text-yellow-400 fill-current' : 'text-slate-200'} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-3">
                            {review.comment ? (
                              <div className="flex items-start gap-2 text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <MessageSquare size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <span className="italic">"{review.comment}"</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Sem comentário</span>
                            )}

                            {/* --- INÍCIO: MOTOR DE RESPOSTA (GOOGLE / INTERNO) --- */}
                            {review.reply ? (
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 relative">
                                    <button 
                                        onClick={async () => {
                                            if(window.confirm('Deseja apagar esta resposta? (Nota: Se for do Google, ela não será apagada lá, apenas no painel Velo)')) {
                                                await updateDoc(doc(db, "reviews", review.id), { reply: null });
                                                // Atualiza a tela em tempo real sem fazer reload
                                                setReviews(reviews.map(r => r.id === review.id ? {...r, reply: null} : r));
                                            }
                                        }} 
                                        className="absolute top-2 right-2 text-blue-400 hover:text-red-500 transition-colors"
                                        title="Apagar Resposta"
                                    >
                                        <X size={14}/>
                                    </button>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Você respondeu:</p>
                                    <p className="text-sm text-blue-800 font-bold">{review.reply}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col xl:flex-row gap-2 mt-1">
                                    <input 
                                        type="text" 
                                        placeholder={isGoogle ? "Escreva uma resposta pública para o Google Maps..." : "Escreva uma resposta visível no app..."} 
                                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 ring-blue-500"
                                        value={replyText[review.id] || ''}
                                        onChange={(e) => setReplyText({...replyText, [review.id]: e.target.value})}
                                    />
                                    <button 
                                        disabled={submittingReply || !replyText[review.id]}
                                        onClick={async () => {
                                            if(!replyText[review.id]) return;
                                            setSubmittingReply(true);
                                            
                                            // BLINDAGEM: Se for um review do Google, manda pro backend (API)
                                            if (isGoogle) {
                                                try {
                                                    const res = await fetch('/api/reply-google-review', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            storeId: storeId,
                                                            reviewId: review.id, // ID interno do Firebase
                                                            googleReviewName: review.googleReviewName, // ID oficial do Google (salvo pelo Cron)
                                                            replyText: replyText[review.id]
                                                        })
                                                    });
                                                    
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.error || 'Falha ao responder no Google.');
                                                    
                                                    // Se o Google aceitou, salva a cópia no Firebase para a tela atualizar
                                                    await updateDoc(doc(db, "reviews", review.id), { reply: replyText[review.id] });
                                                    setReviews(reviews.map(r => r.id === review.id ? {...r, reply: replyText[review.id]} : r));
                                                    alert("✅ Resposta publicada com sucesso no Google Maps!");
                                                    
                                                } catch (error) {
                                                    console.error("Erro ao responder Google:", error);
                                                    alert(`❌ Erro: ${error.message}`);
                                                }
                                            } else {
                                                // Fluxo Normal (Review do App Velo)
                                                try {
                                                    await updateDoc(doc(db, "reviews", review.id), { reply: replyText[review.id] });
                                                    setReviews(reviews.map(r => r.id === review.id ? {...r, reply: replyText[review.id]} : r));
                                                    alert("✅ Resposta enviada e visível no app Velo!");
                                                } catch(e) {
                                                    alert("Erro ao salvar resposta no banco de dados.");
                                                }
                                            }
                                            setSubmittingReply(false);
                                        }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {submittingReply ? 'Enviando...' : 'Responder'}
                                    </button>
                                </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => fetchReviews('prev')}
              disabled={page === 1 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              Página {page}
            </span>

            <button 
              onClick={() => fetchReviews('next')}
              disabled={!hasNextPage || loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}