import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../../src/services/firebase'; 
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { CheckCircle2, Clock, Truck, PackageCheck, ChevronLeft, Star, Loader2, ExternalLink, Award, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { enviarAvaliacao } from '../../src/services/reviewService';

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    return () => unsub();
  }, [orderId]);

  // FUNÇÃO NOVA: GAMIFICAÇÃO GOOGLE
  const handleGoogleReview = async () => {
    const produtoDestaque = order?.items?.[0] ? order.items[0].name : "meu pedido";
    const textoPronto = `Comprei ${produtoDestaque} e a entrega foi super rápida!`;

    try {
      await navigator.clipboard.writeText(textoPronto);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);

      await updateDoc(doc(db, "orders", orderId), {
        googleReviewClicked: true
      });

      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
           loyaltyPoints: increment(150)
        });
      }

      setTimeout(() => {
        window.open('https://g.page/r/CTEL4f6nFgE_EBE/review', '_blank');
      }, 1000);

    } catch (err) {
      console.error("Erro ao abrir Google:", err);
      window.open('https://g.page/r/CTEL4f6nFgE_EBE/review', '_blank');
    }
  };

  const handleSendReview = async () => {
    if (rating === 0) return alert("Por favor, selecione uma nota de 1 a 5 estrelas.");
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Você precisa estar logado para avaliar.");
        setIsSubmitting(false);
        return;
      }

      const reviewData = {
        userId: user.uid,
        storeId: order.storeId,
        orderId: order.id,
        rating: rating,
        comment: comment
      };

      await enviarAvaliacao(reviewData);

      await updateDoc(doc(db, "orders", orderId), {
        hasBeenReviewed: true
      });
      
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

        {/* ÁREA DE AVALIAÇÃO (VIP + GOOGLE) */}
        {order.status === 'completed' && (
          <div className="mt-10 border-t border-slate-100 pt-8 space-y-6">
            
            {/* MISSÃO GOOGLE */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-[2rem] border-2 border-yellow-200 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10"><Award size={100}/></div>
              
              <h3 className="text-yellow-800 font-black italic tracking-tighter text-xl leading-tight mb-2 flex items-center gap-2 relative z-10">
                <Star className="fill-yellow-500 text-yellow-500" size={24}/> MISSÃO VIP
              </h3>
              
              <p className="text-yellow-900 text-sm font-medium mb-4 relative z-10">
                Ganhe <b>+150 Pontos</b> instantâneos avaliando nossa entrega no Google! 
                <br/><br/>
                <span className="bg-white p-2 rounded-lg text-xs font-bold border border-yellow-200 block text-center">
                  💡 Dica: Ao clicar, copiaremos o texto <b>"Comprei {order?.items?.[0]?.name || "aqui"}..."</b>. Cole lá para nos ajudar!
                </span>
              </p>

              <button 
                onClick={handleGoogleReview}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-yellow-200 uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10"
              >
                {copiedText ? <><CheckCircle2 size={18}/> TEXTO COPIADO! ABRINDO...</> : <><ExternalLink size={18}/> AVALIAR NO GOOGLE</>}
              </button>
            </motion.div>

            {/* AVALIAÇÃO INTERNA */}
            {order.hasBeenReviewed ? (
              <div className="bg-slate-100 p-6 rounded-[2rem] text-slate-500 text-center font-bold text-sm">
                Sua avaliação interna já foi recebida. Obrigado!
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
                <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4 text-center">Feedback Interno Rápido</h3>
                
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setRating(star)} 
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <Star size={32} className={`cursor-pointer transition-all ${(hoverRating || rating) >= star ? 'text-blue-500 fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm focus:ring-2 focus:ring-blue-400 outline-none mb-4 font-medium"
                    rows="2"
                    placeholder="Deixe um comentário..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <button 
                  onClick={handleSendReview} 
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enviar Feedback'}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}