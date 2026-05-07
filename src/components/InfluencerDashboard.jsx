import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Megaphone, ShoppingBag, TrendingUp, Copy, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';

export default function InfluencerDashboard() {
    const { partnerId } = useParams();
    const [partnerData, setPartnerData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!partnerId) return;

        const fetchPartnerData = async () => {
            try {
                // 1. Busca os dados do influenciador
                const partnerRef = doc(db, 'partners', partnerId);
                const partnerSnap = await getDoc(partnerRef);

                if (!partnerSnap.exists() || partnerSnap.data().category !== 'Influenciadores') {
                    setError("Perfil de parceiro não encontrado ou inativo.");
                    setIsLoading(false);
                    return;
                }

                const data = partnerSnap.data();
                setPartnerData({ id: partnerSnap.id, ...data });

                // 2. Busca os pedidos gerados por esse influenciador (Em tempo real!)
                // Lê a coleção de orders onde o affiliateId é o ID dele
                const q = query(collection(db, "orders"), where("affiliateId", "==", partnerSnap.id), where("status", "!=", "canceled"));
                
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setOrders(fetchedOrders);
                    setIsLoading(false);
                });

                return () => unsubscribe();

            } catch (err) {
                console.error("Erro ao carregar dashboard do parceiro:", err);
                setError("Erro de conexão. Tente atualizar a página.");
                setIsLoading(false);
            }
        };

        fetchPartnerData();
    }, [partnerId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando seus resultados...</p>
            </div>
        );
    }

    if (error || !partnerData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <ShieldCheck size={40} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 uppercase italic">Acesso Restrito</h1>
                <p className="text-slate-500 font-medium mt-2">{error}</p>
            </div>
        );
    }

    // Cálculos de Performance
    const totalSalesValue = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
    const trackingLink = `${window.location.origin}/?affiliate_id=${partnerData.id}`;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header Temático */}
            <div className="bg-slate-900 text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Megaphone size={150} />
                </div>
                
                <div className="max-w-3xl mx-auto relative z-10 flex items-center gap-6">
                    <img 
                        src={partnerData.imageUrl || 'https://cdn-icons-png.flaticon.com/512/8405/8405626.png'} 
                        alt={partnerData.name} 
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-indigo-500 object-cover shadow-lg bg-slate-800"
                    />
                    <div>
                        <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block shadow-md">
                            {partnerData.badge || 'Parceiro Oficial'}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-none truncate">
                            {partnerData.name}
                        </h1>
                        <p className="text-slate-400 font-bold mt-1 text-xs md:text-sm flex items-center gap-2">
                            Acordo: <span className="text-indigo-300">{partnerData.discount || 'Permuta Padrão'}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 -mt-12 relative z-20 space-y-6">
                
                {/* Link de Divulgação */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-auto flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Seu Link Exclusivo</p>
                        <p className="text-sm font-bold text-indigo-600 truncate bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            {trackingLink}
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(trackingLink);
                            alert('Seu link de indicação foi copiado! Cole no seu Instagram ou TikTok.');
                        }}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <Copy size={16} /> Copiar Link
                    </button>
                </div>

                {/* Dashboard de Resultados */}
                <h2 className="text-2xl font-black italic uppercase text-slate-800 mt-8 mb-4">Seus Resultados</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center">
                        <div className="bg-green-50 text-green-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vendas Geradas (R$)</p>
                        <p className="text-4xl font-black text-slate-800 italic">R$ {totalSalesValue.toFixed(2)}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center">
                        <div className="bg-orange-50 text-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <ShoppingBag size={24} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos Finalizados</p>
                        <p className="text-4xl font-black text-slate-800 italic">{orders.length} pedidos</p>
                    </div>
                </div>

                {/* Footer do Parceiro */}
                <div className="text-center mt-12 pb-8">
                    <p className="text-xs font-bold text-slate-400 mb-2">Transparência em tempo real.</p>
                    <a href="/" className="inline-flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">
                        Acessar Cardápio <ExternalLink size={12} />
                    </a>
                </div>

            </div>
        </div>
    );
}