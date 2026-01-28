import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle2, Clock, Truck, PackageCheck, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, "orders", orderId), (d) => setOrder(d.data()));
  }, [orderId]);

  if (!order) return <div className="p-10 text-center font-bold text-blue-600">Buscando pedido...</div>;

  const steps = [
    { id: 'pending', label: 'Pedido Recebido', icon: <Clock />, color: 'text-amber-500' },
    { id: 'preparing', label: 'Preparando Gelada', icon: <PackageCheck />, color: 'text-blue-500' },
    { id: 'delivery', label: 'Em Rota de Entrega', icon: <Truck />, color: 'text-purple-500' },
    { id: 'completed', label: 'Entregue! Aproveite', icon: <CheckCircle2 />, color: 'text-green-500' },
  ];

  const currentIdx = steps.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest">
        <ChevronLeft size={16}/> Voltar para Loja
      </Link>

      <motion.div initial={{y: 20, opacity:0}} animate={{y:0, opacity:1}} className="bg-white rounded-[3rem] p-8 shadow-2xl max-w-md mx-auto border border-white">
        <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">STATUS DO PEDIDO</h2>
        <p className="text-slate-400 font-bold text-xs uppercase mb-10 tracking-widest">ID: #{orderId.slice(0,8)}</p>

        <div className="space-y-10 relative">
          <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-slate-100 -z-10"></div>
          
          {steps.map((step, idx) => (
            <div key={step.id} className={`flex items-center gap-6 transition-all ${idx <= currentIdx ? 'opacity-100 scale-105' : 'opacity-20'}`}>
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

        <div className="mt-12 pt-8 border-t border-slate-50">
            <p className="text-slate-400 font-bold text-[10px] uppercase mb-2">Endereço de Entrega</p>
            <p className="font-bold text-slate-700">{order.customerAddress}</p>
        </div>
      </motion.div>
    </div>
  );
}