import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from "../services/firebase";
import { useStore } from '../context/StoreContext';
import { Search, MessageCircle, Package, Camera, TrendingUp, Handshake, Ticket, Printer, Calculator, Truck, Lightbulb, Shield, Wrench, Tag, Megaphone, Link, Plus, X, ShieldCheck, UploadCloud, CheckCircle, ExternalLink, Wallet, Banknote, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ESTÁTICO (Parceiros do Ecossistema Food Service) ---
const mockPartners = [
  { id: 1, name: 'Agência Marka', category: 'Tráfego', description: 'Transformando marcas em resultados com foco em performance.', imageUrl: '/Marka-logo-P1.png', whatsapp: '5551984687497', badge: 'Selo de Qualidade', discount: 'Auditoria Gratuita' },
  { id: 2, name: 'Mamedes Papéis', category: 'Embalagens', description: 'Encontre papéis de alta qualidade personalizados com sua logo.', imageUrl: '/mamedes-logo.png', whatsapp: '5541998989480', badge: 'Fábrica Parceira', discount: '5% OFF na 1ª Compra' },
  { id: 3, name: 'BGEstudio', category: 'Foto e Vídeo', description: 'Design estratégico, vídeos, gestão de redes e tecnologia.', imageUrl: '/bgestudio-logo.png', whatsapp: '5548984643809', badge: 'Agência Parceira', discount: '3 Banners Exclusivos' },
  { id: 4, name: 'PrintTech', category: 'Equipamentos', description: 'Impressoras térmicas, bobinas, PDVs Touch e tablets.', imageUrl: 'https://images.unsplash.com/photo-1614064010375-9c0250cd77ea?auto=format&fit=crop&w=400&q=80', whatsapp: '5511999999993', badge: 'Pronta Entrega', discount: '1 Caixa de Bobina Grátis' },
  { id: 11, name: 'Embalagens Original', category: 'Embalagens', description: 'Loja virtual especializada em embalagens plásticas e descartáveis.', imageUrl: '/embalagensoriginal-logo.png', whatsapp: '5511940097091', badge: 'Novo Parceiro', discount: '10% OFF cupom VELO10' }
];

const categories = [
  { id: 'Todos', icon: <Handshake size={16} /> },
  { id: 'Embalagens', icon: <Package size={16} /> },
  { id: 'Foto e Vídeo', icon: <Camera size={16} /> },
  { id: 'Equipamentos', icon: <Printer size={16} /> },
  { id: 'Tráfego', icon: <TrendingUp size={16} /> }
];

export default function PartnersMarketplace() {
  const { store } = useStore();
  
  // Estados de Abas e Busca
  const [subTab, setSubTab] = useState('meus_parceiros'); // 'vitrine', 'meus_parceiros', 'auditoria', 'pagamentos'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Estados de Dados (Firebase)
  const [influencers, setInfluencers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]); // NOVO: Saques pendentes
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', instagram: '', whatsapp: '', password: '', description: '', badge: 'Tier Bronze', discount: 'Permuta + 10% Venda' });

  useEffect(() => {
    if (!store?.slug) return;

    const qPartners = query(collection(db, 'partners'), where("storeId", "==", store.slug));
    const unsubPartners = onSnapshot(qPartners, (snapshot) => {
        setInfluencers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
    });

    const qMissions = query(collection(db, 'partner_missions'), where("storeId", "==", store.slug));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
        setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qOrders = query(collection(db, 'orders'), where("storeId", "==", store.slug), where("status", "!=", "canceled"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // NOVO: Lê os saques solicitados pelos parceiros
    const qWithdrawals = query(collection(db, 'partner_withdrawals'), where("storeId", "==", store.slug));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPartners(); unsubMissions(); unsubOrders(); unsubWithdrawals(); };
  }, [store?.slug]);

  const handleAddInfluencer = async (e) => {
    e.preventDefault();
    if (!store?.slug) return alert("Erro: Identidade da loja não encontrada.");
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'partners'), {
        ...formData,
        category: 'Influenciadores', 
        storeId: store.slug,
        termsAccepted: false,
        imageUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date().toISOString()
      });
      setFormData({ name: '', instagram: '', whatsapp: '', password: '', description: '', badge: 'Tier Bronze', discount: 'Permuta + 10% Venda' });
      setIsModalOpen(false);
      alert('✅ Influenciador cadastrado com sucesso!');
    } catch (error) { alert("Houve um erro ao tentar salvar no banco."); } 
    finally { setIsSubmitting(false); }
  };

  const handleCopyDashboardLink = async (e, partnerId) => {
    const btn = e.currentTarget;
    const originalHtml = btn.innerHTML;
    const baseUrl = window.location.hostname.includes('localhost') ? `http://localhost:5173` : `https://${store?.slug || 'app'}.velodelivery.com.br`;
    const dashboardUrl = `${baseUrl}/parceiro/${partnerId}`;
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      btn.innerHTML = '✅ PAINEL COPIADO!';
      btn.classList.replace('bg-slate-900', 'bg-green-500');
      setTimeout(() => { btn.innerHTML = originalHtml; btn.classList.replace('bg-green-500', 'bg-slate-900'); }, 3000);
    } catch (error) { prompt("Copie o link manualmente:", dashboardUrl); }
  };

  const handleCopyAffiliateLink = async (e, partnerId) => {
    const btn = e.currentTarget;
    const originalHtml = btn.innerHTML;
    const baseUrl = window.location.hostname.includes('localhost') ? `http://localhost:5173` : `https://${store?.slug || 'app'}.velodelivery.com.br`;
    const trackingUrl = `${baseUrl}/?affiliate_id=${partnerId}`;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      btn.innerHTML = '✅ LINK COPIADO!';
      btn.classList.replace('bg-blue-600', 'bg-green-500');
      btn.classList.replace('hover:bg-blue-700', 'hover:bg-green-600');
      setTimeout(() => { btn.innerHTML = originalHtml; btn.classList.replace('bg-green-500', 'bg-blue-600'); btn.classList.replace('hover:bg-green-600', 'hover:bg-blue-700'); }, 3000);
    } catch (error) { prompt("O seu navegador bloqueou a cópia. Copie o link abaixo manualmente:", trackingUrl); }
  };

  const handleAuditMission = async (missionId, action) => {
      if(!window.confirm(`Tem certeza que deseja ${action === 'approved' ? 'APROVAR' : 'RECUSAR'} esta comprovação?`)) return;
      try {
          await updateDoc(doc(db, "partner_missions", missionId), { status: action, auditedAt: new Date().toISOString() });
          alert(`✅ Missão ${action === 'approved' ? 'aprovada' : 'recusada'} com sucesso!`);
      } catch (e) { alert("Erro ao processar auditoria."); }
  };

  // NOVO: Ação de Pagar Saque
  const handlePayWithdrawal = async (wId, action) => {
      const isApproving = action === 'paid';
      const confirmMsg = isApproving ? "Confirma que você já transferiu o dinheiro via PIX para o influenciador?" : "Deseja RECUSAR este saque?";
      if(!window.confirm(confirmMsg)) return;

      try {
          await updateDoc(doc(db, "partner_withdrawals", wId), { status: action, processedAt: new Date().toISOString() });
          alert(isApproving ? "✅ Saque marcado como PAGO!" : "❌ Saque recusado e valor devolvido à carteira do parceiro.");
      } catch (e) { alert("Erro ao processar pagamento."); }
  };

  const pendingMissions = missions.filter(m => m.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const filteredB2BPartners = mockPartners.filter((partner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) || partner.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || partner.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Hub de Parceiros
          </h1>
          <p className="text-slate-400 font-bold mt-2 text-sm">
            Gerencie seus influenciadores, pague comissões e audite missões.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2">
          <Plus size={20} /> Novo Influenciador
        </button>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex bg-slate-200 p-1.5 rounded-2xl w-fit overflow-x-auto custom-scrollbar">
          <button onClick={() => setSubTab('meus_parceiros')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${subTab === 'meus_parceiros' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Megaphone size={16} /> Meus Parceiros ({influencers.length})
          </button>
          <button onClick={() => setSubTab('pagamentos')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${subTab === 'pagamentos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Banknote size={16} /> Saques (Contas a Pagar)
              {pendingWithdrawals.length > 0 && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">{pendingWithdrawals.length}</span>}
          </button>
          <button onClick={() => setSubTab('auditoria')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${subTab === 'auditoria' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <ShieldCheck size={16} /> Auditoria de Prints
              {pendingMissions.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">{pendingMissions.length}</span>}
          </button>
          <button onClick={() => setSubTab('vitrine')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${subTab === 'vitrine' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Handshake size={16} /> Vitrine B2B
          </button>
      </div>

      {isLoading ? (
          <div className="bg-white p-12 rounded-[3rem] text-center flex flex-col items-center justify-center space-y-6">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Hub...</p>
          </div>
      ) : (
          <>
            {/* ABA 1: MEUS PARCEIROS */}
            {subTab === 'meus_parceiros' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {influencers.length === 0 ? (
                        <div className="col-span-full bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                            <Megaphone size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold">Você ainda não tem influenciadores cadastrados.</p>
                            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 font-black text-xs uppercase hover:underline">Cadastrar o Primeiro</button>
                        </div>
                    ) : (
                        influencers.map(partner => (
                            <div key={partner.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xl shrink-0">
                                            {partner.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">
                                                {partner.badge}
                                            </span>
                                            <h3 className="font-black text-lg text-slate-800 leading-tight truncate mt-1">{partner.name}</h3>
                                            <p className="text-xs font-bold text-slate-400">Insta: {partner.instagram}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 mb-4 flex-1 line-clamp-2">{partner.description}</p>
                                    
                                    {/* CÁLCULO DE VENDAS DO PARCEIRO */}
                                    {(() => {
                                        const partnerOrders = orders.filter(o => o.affiliateId === partner.id);
                                        const totalSales = partnerOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
                                        return (
                                            <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vendas (ROI)</p>
                                                    <p className="text-lg font-black text-green-600 italic leading-none mt-1">R$ {totalSales.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Pedidos</p>
                                                    <p className="text-sm font-black text-slate-700 mt-1">{partnerOrders.length}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex flex-col gap-2 mt-auto">
                                        <button onClick={(e) => handleCopyAffiliateLink(e, partner.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                            <Link size={16} /> Link de Venda (Bio)
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => handleCopyDashboardLink(e, partner.id)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                                <TrendingUp size={14} /> Painel Dele
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm(`ATENÇÃO: Deseja realmente excluir o parceiro ${partner.name}? O painel e o link dele pararão de funcionar imediatamente.`)) {
                                                        try { await deleteDoc(doc(db, "partners", partner.id)); alert("Parceiro excluído."); } catch(e) { alert("Erro ao excluir."); }
                                                    }
                                                }} 
                                                className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 rounded-xl font-black transition-all active:scale-95 flex items-center justify-center border border-red-100"
                                                title="Excluir Influenciador"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ABA NOVA: CONTAS A PAGAR (SAQUES DOS INFLUENCIADORES) */}
            {subTab === 'pagamentos' && (
                <div className="animate-in fade-in space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex items-center gap-4 mb-6">
                        <Wallet size={32} className="text-emerald-500 shrink-0"/>
                        <div>
                            <h3 className="text-sm font-black text-emerald-800 uppercase">Acertos de Comissão</h3>
                            <p className="text-xs font-bold text-emerald-600 mt-1">Transfira o valor para a chave PIX do parceiro pelo seu aplicativo de banco e clique em "Marcar como Pago". O sistema é Ledger P2P para isentar a loja de taxas extras.</p>
                        </div>
                    </div>

                    {pendingWithdrawals.length === 0 ? (
                        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center flex flex-col items-center shadow-sm">
                            <CheckCircle size={48} className="text-emerald-400 mb-4" />
                            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Nenhuma Fatura Aberta</h3>
                            <p className="text-slate-500 font-bold mt-2">Você não deve comissões para nenhum parceiro no momento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingWithdrawals.map(w => (
                                <div key={w.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                        <div>
                                            <h4 className="font-black text-slate-800 uppercase text-lg leading-tight">{w.partnerName}</h4>
                                            <p className="text-[10px] font-bold text-slate-400">Solicitado: {new Date(w.createdAt?.toDate()).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                                            R$ {Number(w.amount).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Chave PIX Recebedora</p>
                                        <div className="flex justify-between items-center">
                                            <p className="font-black text-slate-700 text-sm select-all">{w.pixKey}</p>
                                            <button onClick={() => { navigator.clipboard.writeText(w.pixKey); alert("Chave copiada!"); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-all">
                                                <Copy size={16}/>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-2">
                                        <button onClick={() => handlePayWithdrawal(w.id, 'rejected')} className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl font-black hover:bg-red-100 transition-all flex justify-center items-center">
                                            <X size={16}/>
                                        </button>
                                        <button onClick={() => handlePayWithdrawal(w.id, 'paid')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2">
                                            <CheckCircle size={16}/> Marcar como Pago
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ABA 3: AUDITORIA DE MISSÕES */}
            {subTab === 'auditoria' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in">
                    {pendingMissions.length === 0 ? (
                        <div className="col-span-full bg-white p-12 rounded-[3rem] border border-slate-100 text-center flex flex-col items-center shadow-sm">
                            <CheckCircle size={48} className="text-green-400 mb-4" />
                            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Tudo Limpo!</h3>
                            <p className="text-slate-500 font-bold mt-2">Nenhum print pendente de auditoria no momento.</p>
                        </div>
                    ) : (
                        pendingMissions.map(m => (
                            <div key={m.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-purple-200">
                                            {m.missionType === 'google_review' ? 'Google Meu Negócio' : m.missionType === 'social_video' ? 'Métricas Instagram/TikTok' : 'Postagem'}
                                        </span>
                                        <h4 className="font-black text-slate-800 uppercase mt-2 text-lg leading-tight">{m.partnerName}</h4>
                                        <p className="text-[10px] font-bold text-slate-400">Enviado em: {new Date(m.createdAt?.toDate()).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                    <img src={m.proofUrl} alt="Comprovante" className="w-full h-48 object-cover rounded-xl" />
                                    <button onClick={() => window.open(m.proofUrl, '_blank')} className="w-full mt-2 bg-white text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 flex items-center justify-center gap-1">
                                        <ExternalLink size={14}/> Ver Imagem Original
                                    </button>
                                </div>

                                <div className="flex gap-2 mt-auto pt-2">
                                    <button onClick={() => handleAuditMission(m.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex justify-center items-center gap-1">
                                        <X size={16}/> Recusar
                                    </button>
                                    <button onClick={() => handleAuditMission(m.id, 'approved')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-md shadow-green-200 transition-all active:scale-95 flex justify-center items-center gap-1">
                                        <CheckCircle size={16}/> Aprovar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ABA 4: VITRINE B2B (MOCK) */}
            {subTab === 'vitrine' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                            <input type="text" placeholder="Buscar por contabilidade, embalagens, equipamentos..." className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                            {categories.map((cat) => (
                                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all border-2 flex-shrink-0 ${selectedCategory === cat.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200 hover:bg-blue-50'}`}>
                                    {cat.icon} {cat.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredB2BPartners.length === 0 ? (
                        <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                            <Handshake size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold">Nenhum parceiro encontrado com esses filtros.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {filteredB2BPartners.map((partner) => (
                                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} key={partner.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                                        <div className={`relative h-48 overflow-hidden flex items-center justify-center ${partner.id === 1 ? 'bg-slate-900 p-8' : 'bg-slate-100'}`}>
                                            <img src={partner.imageUrl} alt={partner.name} className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${partner.id === 1 ? 'object-contain drop-shadow-2xl' : 'object-cover'}`} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                                            {partner.badge && <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">⭐ {partner.badge}</div>}
                                            <div className="absolute bottom-4 left-4"><span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{partner.category}</span></div>
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            <h3 className="font-black text-xl text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{partner.name}</h3>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6 flex-1">{partner.description}</p>
                                            <div className="mt-auto flex flex-col gap-3">
                                                {partner.discount && (
                                                    <div className="bg-orange-50 border-2 border-dashed border-orange-200 text-orange-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-2">
                                                        <Ticket size={18} className="text-orange-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{partner.discount}</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-3">
                                                    <button onClick={() => window.open(`https://wa.me/${partner.whatsapp}?text=${encodeURIComponent('Olá! Sou lojista da Velo Delivery e vi vocês no Hub de Parceiros. Queria saber mais sobre seus serviços.')}`, '_blank')} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                        <MessageCircle size={18} /> Falar no WhatsApp
                                                    </button>
                                                    {partner.website && (
                                                        <a href={partner.website} target="_blank" rel="dofollow" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700">
                                                            <ExternalLink size={16} className="text-blue-400" /> Acessar Site
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}
          </>
      )}

      {/* MODAL DE CADASTRO DE INFLUENCIADOR */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"><X size={24} /></button>
              
              <div className="mb-8">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mb-2">Cadastrar Influenciador</h2>
                <p className="text-slate-500 font-bold text-sm">Adicione um novo parceiro local para gerar vendas via indicação e criar missões.</p>
              </div>

              <form onSubmit={handleAddInfluencer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">Nome / Perfil</label>
                  <input required type="text" placeholder="Ex: Casal Gastrô São José" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">Senha de Acesso do Parceiro</label>
                  <input required type="text" placeholder="Crie uma senha provisória" className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl font-bold text-orange-700 outline-none focus:ring-2 ring-orange-500 transition-all" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">@ Instagram</label>
                    <input type="text" placeholder="@" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 transition-all" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">WhatsApp</label>
                    <input required type="text" placeholder="DDD + Número" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 transition-all" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">Categoria (Tier)</label>
                    <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 cursor-pointer" value={formData.badge} onChange={(e) => setFormData({...formData, badge: e.target.value})}>
                      <option value="Tier Bronze">Tier Bronze</option>
                      <option value="Tier Prata">Tier Prata</option>
                      <option value="Tier Ouro">Tier Ouro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">Acordo</label>
                    <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 cursor-pointer" value={formData.discount} onChange={(e) => setFormData({...formData, discount: e.target.value})}>
                      <option value="Permuta Simples">Permuta Simples</option>
                      <option value="Permuta + 5% Venda">Permuta + 5%</option>
                      <option value="Permuta + 10% Venda">Permuta + 10%</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2">Breve Descrição / Nicho</label>
                  <textarea required rows="2" placeholder="Ex: Foco em lanches e rotina noturna." className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 resize-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Finalizar Cadastro'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}