import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { 
    LayoutDashboard, Store, Radio, ShieldAlert, 
    LogOut, Menu, X, Loader2, CheckCircle, 
    ToggleRight, UserPlus, Activity, AlertTriangle, Play, Zap, CreditCard, Clock, CheckCircle2, Ban
} from 'lucide-react';

export default function AdminSaaS() {
    const navigate = useNavigate();
    const { store } = useStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- ESTADOS REAIS DAS FUNCIONALIDADES ---
    const [globalLoading, setGlobalLoading] = useState(true);
    const [pixQueue, setPixQueue] = useState([]);
    const [storesList, setStoresList] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

    // 🔒 TRAVA DE SEGURANÇA MULTI-CONTAS
    // Coloque aqui todos os emails que podem acessar o Velo Dark Ops (sempre em minúsculas)
    const MASTER_EMAILS = [
        'appdidelivery@gmail.com', 
        'email-da-agencia@gmail.com',
        'emaildacsi@gmail.com'
    ]; 

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) { navigate('/login'); return; }
            
            // Pega o email do usuário logado e garante que está tudo minúsculo para evitar erro de digitação
            const userEmail = user.email ? user.email.toLowerCase() : 'sem-email';

            // Verifica se o email da pessoa está na nossa lista VIP
            if (!MASTER_EMAILS.includes(userEmail)) {
                // Se não estiver, avisa EXATAMENTE qual email foi bloqueado
                alert(`ACESSO NEGADO!\n\nO sistema bloqueou o email: ${userEmail}\n\nSe este é o seu email, adicione ele na lista MASTER_EMAILS lá no código AdminSaaS.jsx.`);
                navigate('/admin'); 
                return;
            }

            await fetchSaaSData();
            setGlobalLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const fetchSaaSData = async () => {
        try {
            const storesSnap = await getDocs(collection(db, 'stores'));
            const allStores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const pendingPix = allStores.filter(s => s.veloPayStatus === 'pendente' || s.pixStatus === 'pendente');
            setPixQueue(pendingPix);
            setStoresList(allStores);
        } catch (error) {
            console.error("Erro ao buscar dados do SaaS:", error);
        }
    };

    const handleApprovePix = async (storeId) => {
        if (!window.confirm('Confirmar liberação do VeloPay para esta loja?')) return;
        setActionLoading(storeId);
        try {
            const storeRef = doc(db, 'stores', storeId);
            await updateDoc(storeRef, {
                veloPayStatus: 'ativo',
                pixStatus: 'ativo',
                veloPayApprovedAt: new Date()
            });
            alert('VeloPay ativado com sucesso!');
            await fetchSaaSData(); 
        } catch (error) { alert('Erro ao aprovar: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    // --- NOVA FUNÇÃO: GERENCIAR FATURA ---
    const handleUpdateBillingStatus = async (storeId, newStatus) => {
        if (!window.confirm(`Mudar o status financeiro desta loja para: ${newStatus.toUpperCase()}?`)) return;
        setActionLoading(`billing_${storeId}`);
        try {
            const storeRef = doc(db, 'stores', storeId);
            await updateDoc(storeRef, {
                billingStatus: newStatus, // Ex: 'pago', 'pendente', 'teste', 'gratis_vitalicio'
                billingUpdatedAt: new Date()
            });
            await fetchSaaSData(); 
        } catch (error) { alert('Erro ao atualizar fatura: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    // --- HELPER DE RENDERIZAÇÃO DE STATUS ---
    const renderBillingBadge = (status) => {
        switch (status) {
            case 'pago': return <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded"><CheckCircle2 size={12}/> Pago</span>;
            case 'pendente': return <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded"><Clock size={12}/> Vencido/Pendente</span>;
            case 'teste': return <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded"><Activity size={12}/> Em Teste</span>;
            case 'gratis_vitalicio': return <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 text-xs font-bold px-2 py-1 rounded"><ShieldAlert size={12}/> Cortesia (CSI)</span>;
            case 'bloqueado': return <span className="flex items-center gap-1 bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded"><Ban size={12}/> Bloqueado</span>;
            default: return <span className="text-xs text-slate-500">Sem status</span>;
        }
    };

    if (globalLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500 w-12 h-12"/></div>;

    const renderContent = () => {
        if (activeTab === 'dashboard') {
             return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Fila de Pix (Aprovações)</h2>
                        <p className="text-slate-400">Gerencie lojistas aguardando liberação do VeloPay.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pixQueue.length === 0 ? (
                            <div className="col-span-full p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 font-bold">
                                Nenhuma loja aguardando aprovação de VeloPay no momento.
                            </div>
                        ) : (
                            pixQueue.map(loja => (
                                <div key={loja.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{loja.name || 'Loja Sem Nome'}</h3>
                                            <p className="text-sm text-slate-500">Doc: {loja.cnpj || loja.documento || 'Não informado'}</p>
                                        </div>
                                        <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded">Pendente</span>
                                    </div>
                                    <div className="mb-6 space-y-1">
                                        <p className="text-sm text-slate-400">Responsável: {loja.responsavel || 'Não informado'}</p>
                                        <p className="text-sm text-slate-400">Chave Pix: {loja.chavePix || loja.pixKey || 'Não informada'}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleApprovePix(loja.id)}
                                        disabled={actionLoading === loja.id}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-3 rounded-xl font-bold transition-colors"
                                    >
                                        {actionLoading === loja.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                        {actionLoading === loja.id ? 'Aprovando...' : 'Aprovar VeloPay'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             );
        }

        if (activeTab === 'lojas') {
            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">Controle de Lojas</h2>
                            <p className="text-slate-400">Visão geral e acesso remoto.</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Loja & Plano</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Módulos (Toggling)</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Status Financeiro</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storesList.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-bold">Nenhuma loja encontrada.</td></tr>
                                ) : (
                                    storesList.map(loja => (
                                        <tr key={loja.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl overflow-hidden">
                                                        {loja.logoUrl ? <img src={loja.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : '🏪'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{loja.name || 'Loja Sem Nome'}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${loja.plano === 'pro' || loja.plan === 'pro' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                                            {loja.plano ? loja.plano.toUpperCase() : (loja.plan ? loja.plan.toUpperCase() : 'FREE')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <ToggleRight size={18} className={loja.veloGameEnabled ? "text-emerald-500" : "text-slate-600"} /> Velo Game
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <ToggleRight size={18} className={loja.veloPayStatus === 'ativo' ? "text-emerald-500" : "text-slate-600"} /> VeloPay
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {renderBillingBadge(loja.billingStatus)}
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => alert(`Acesso remoto para a loja ${loja.name} será configurado em breve!`)} className="flex items-center gap-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                                    <Play size={16} /> Impersonate
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // --- NOVA ABA: GESTÃO DE FATURAS ---
        if (activeTab === 'faturas') {
            return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Gestão de Assinaturas</h2>
                        <p className="text-slate-400">Controle manual de pagamentos, cortesias e bloqueios.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {storesList.map(loja => (
                            <div key={loja.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-white text-lg">{loja.name || 'Loja Sem Nome'}</h3>
                                        {renderBillingBadge(loja.billingStatus)}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-6">Altere o status para controlar o acesso ao painel do lojista.</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pago')} disabled={actionLoading === `billing_${loja.id}`} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 py-2 rounded-lg text-xs font-bold transition-colors">
                                            Marcar como Pago
                                        </button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pendente')} disabled={actionLoading === `billing_${loja.id}`} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-2 rounded-lg text-xs font-bold transition-colors">
                                            Cobrar (Pendente)
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'teste')} disabled={actionLoading === `billing_${loja.id}`} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2 rounded-lg text-xs font-bold transition-colors">
                                            Modo Teste
                                        </button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'gratis_vitalicio')} disabled={actionLoading === `billing_${loja.id}`} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 py-2 rounded-lg text-xs font-bold transition-colors">
                                            Cortesia (CSI)
                                        </button>
                                    </div>
                                    <button onClick={() => handleUpdateBillingStatus(loja.id, 'bloqueado')} disabled={actionLoading === `billing_${loja.id}`} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-bold transition-colors mt-2">
                                        Bloquear Acesso
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeTab === 'broadcast') {
            return (
                <div className="max-w-2xl space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">System Broadcast</h2>
                        <p className="text-slate-400">Envie um banner global para o painel de todos os lojistas.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Mensagem do Banner</label>
                            <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" rows="3" placeholder="Ex: Nova função de Cupom liberada! Atualize sua página."></textarea>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                            <Radio size={20} /> Disparar para todos
                        </button>
                    </div>
                </div>
            );
        }

        return <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <ShieldAlert size={48} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-slate-400">Módulo {activeTab} em construção</h3>
        </div>;
    };

    const menuItems = [
        { id: 'dashboard', label: 'Fila Pix', icon: LayoutDashboard },
        { id: 'lojas', label: 'Controle de Lojas', icon: Store },
        { id: 'faturas', label: 'Faturas & Status', icon: CreditCard }, // Nova Aba
        { id: 'broadcast', label: 'Broadcast', icon: Radio },
        { id: 'auditoria', label: 'Audit Log', icon: ShieldAlert },
    ];

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-300 selection:bg-blue-500/30">
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div>
                        <h2 className="font-black text-white text-xl tracking-tighter uppercase flex items-center gap-2">
                            <Zap size={24} className="text-blue-500 fill-blue-500" />
                            VELO DARK OPS
                        </h2>
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase ml-8">Master Admin</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X /></button>
                </div>
                
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} 
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
                        >
                            <item.icon size={20} className={activeTab === item.id ? 'text-blue-500' : 'text-slate-500'} /> 
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button onClick={async () => { await signOut(auth); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20">
                        <LogOut size={20} /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto relative bg-[#0B0F19]">
                <header className="md:hidden bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300"><Menu /></button>
                    <span className="font-black text-white text-sm tracking-widest">DARK OPS</span>
                    <div className="w-6"></div>
                </header>
                
                <div className="p-6 md:p-12 max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}