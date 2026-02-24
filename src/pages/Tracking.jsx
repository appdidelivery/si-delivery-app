import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../../src/services/firebase'; // Importar 'auth' para pegar o usuário logado
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; // Importar updateDoc
import { CheckCircle2, Clock, Truck, PackageCheck, ChevronLeft, Star, Loader2 } from 'lucide-react'; // Adicionado Star e Loader2
import { motion } from 'framer-motion';
import { enviarAvaliacao } from '../../src/services/reviewService';

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA O FORMULÁRIO DE AVALIAÇÃO ---
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0); // Para o efeito hover
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setOrder({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        console.error("Pedido não encontrado!");
        setOrder(null);
      }
      setLoading(false);
    });
    return () => unsub(); // Limpa o listener ao desmontar
  }, [orderId]);

  const handleSendReview = async () => {
    if (rating === 0) return alert("Por favor, selecione uma nota de 1 a 5 estrelas.");
    if (isSubmitting) return; // Previne cliques duplos

    setIsSubmitting(true);
    
    try {
      // Garantir que temos um usuário logado para associar a avaliação
      const user = auth.currentUser;
      if (!user) {
        alert("Você precisa estar logado para avaliar.");
        setIsSubmitting(false);
        return;
      }

      const reviewData = {
        userId: user.uid, // ID do usuário autenticado (mais seguro)
        storeId: order.storeId,
        orderId: order.id, // ID do pedido
        rating: rating,
        comment: comment
      };

      await enviarAvaliacao(reviewData);

      // CRUCIAL: Marca o pedido como avaliado no Firestore para persistir o estado
      await updateDoc(doc(db, "orders", orderId), {
        hasBeenReviewed: true
      });
      
      // O onSnapshot vai atualizar o estado 'order' automaticamente, escondendo o formulário.
      // Não precisamos mais do estado 'sent'.
      
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      alert("Ocorreu um erro ao enviar sua avaliação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }
  
  if (!order) {
    return <div className="p-10 text-center font-bold text-red-600 uppercase tracking-widest">Pedido não encontrado.</div>;
  }
  
  const steps = [
    { id: 'pending', label: 'Pedido Recebido', icon: <Clock /> },
    { id: 'preparing', label: 'Em Preparo', icon: <PackageCheck /> },
    { id: 'delivery', label: 'Saiu para Entrega', icon: <Truck /> },
    { id: 'completed', label: 'Entregue!', icon: <CheckCircle2 /> },
  ];

  const currentIdx = steps.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest">
        <ChevronLeft size={16}/> Voltar para Loja
      </Link>

      <motion.div initial={{y: 20, opacity:0}} animate={{y:0, opacity:1}} className="bg-white rounded-[3rem] p-8 shadow-2xl max-w-md mx-auto border border-white">
        <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2 uppercase">Status do Pedido</h2>
        <p className="text-slate-400 font-bold text-xs uppercase mb-10 tracking-widest">ID: #{orderId.slice(0,8)}</p>

        <div className="space-y-10 relative">
          <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-slate-100 -z-10"></div>
          {steps.map((step, idx) => (
            <div key={step.id} className={`flex items-center gap-6 transition-all ${idx <= currentIdx ? 'opacity-100' : 'opacity-20'}`}>
              <div className={`p-3 rounded-2xl shadow-lg ${idx <= currentIdx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {step.icon}
              </div>
              <div>
                <p className={`font-black text-lg leading-none ${idx <= currentIdx ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                {idx === currentIdx && <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 animate-pulse">Acontecendo agora</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ÁREA DE AVALIAÇÃO (VIP) */}
        {order.status === 'completed' && (
          <div className="mt-10 border-t border-slate-100 pt-8">
            {order.hasBeenReviewed ? (
              // Mensagem se JÁ FOI AVALIADO
              <div className="bg-green-500 p-6 rounded-[2rem] text-white text-center font-black italic shadow-xl shadow-green-200">
                Obrigado pelo seu feedback! 🎉
              </div>
            ) : (
              // Formulário se AINDA NÃO FOI AVALIADO
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100">
                <h3 className="text-blue-800 font-black italic tracking-tighter text-lg leading-tight mb-1">GOSTOU DA EXPERIÊNCIA?</h3>
                <p className="text-blue-600 text-[10px] font-bold uppercase mb-4 tracking-wider">Avalie o pedido e ganhe 50 pontos VIP!</p>
                
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setRating(star)} 
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <Star size={36} className={`cursor-pointer transition-all ${(hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>

                <textarea
                    className="w-full p-3 bg-white rounded-xl border border-blue-200 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-400 outline-none mb-4"
                    rows="2"
                    placeholder="Deixe um comentário (opcional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <button 
                  onClick={handleSendReview} 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 uppercase text-xs tracking-widest active:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Avaliar e ganhar pontos'}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}