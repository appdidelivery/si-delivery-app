import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { 
    LayoutDashboard, Store, Radio, ShieldAlert, LogOut, Menu, X, Loader2, 
    CheckCircle, ToggleRight, ToggleLeft, Play, Zap, CreditCard, Clock, 
    CheckCircle2, Ban, Trash2, Lock, Plus, Activity
} from 'lucide-react';

export default function AdminSaaS() {
    const navigate = useNavigate();
    const { store } = useStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- ESTADOS ---
    const [globalLoading, setGlobalLoading] = useState(true);
    const [pixQueue, setPixQueue] = useState([]);
    const [storesList, setStoresList] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

    // 🔒 TRAVA DE SEGURANÇA MULTI-CONTAS
    const MASTER_EMAILS = [
        'projetosdiego.l@gmail.com', 
        'appdidelivery@gmail.com'
    ]; 

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) { navigate('/login'); return; }
            const userEmail = user.email ? user.email.toLowerCase() : 'sem-email';

            if (!MASTER_EMAILS.includes(userEmail)) {
                alert(`ACESSO NEGADO!\n\nEmail bloqueado: ${userEmail}\nAdicione na lista MASTER_EMAILS no código.`);
                navigate('/admin'); return;
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

            // FILTRO CORRIGIDO: Agora busca o "pending_review" e o "velopayStatus" minúsculo
            const pendingPix = allStores.filter(s => 
                s.velopayStatus === 'pending_review' || 
                s.veloPayStatus === 'pendente' || 
                s.efiStatus === 'em_analise' || 
                s.pixStatus === 'pendente'
            );
            
            setPixQueue(pendingPix);
            setStoresList(allStores);
        } catch (error) { console.error("Erro:", error); }
    };

    // --- AÇÕES DO FIREBASE ---
    const handleApprovePix = async (storeId) => {
        if (!window.confirm('Aprovar e liberar o VeloPay para esta loja?')) return;
        setActionLoading(storeId);
        try {
            // CORREÇÃO: Atualiza os dois padrões para garantir que o app do lojista leia certo
            await updateDoc(doc(db, 'stores', storeId), {
                velopayStatus: 'active', // O que a CSI usa
                veloPayStatus: 'ativo',  // Legado
                efiStatus: 'ativo',
                pixStatus: 'ativo',
                veloPayApprovedAt: new Date()
            });
            alert('VeloPay ativado com sucesso!');
            await fetchSaaSData(); 
        } catch (error) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleToggleModule = async (storeId, moduleName, currentValue) => {
        setActionLoading(`toggle_${storeId}_${moduleName}`);
        try {
            await updateDoc(doc(db, 'stores', storeId), { [moduleName]: !currentValue });
            await fetchSaaSData();
        } catch (error) { alert('Erro ao alterar módulo: ' + error.message); }
        finally { setActionLoading(null); }
    };

    const handleUpdateBillingStatus = async (storeId, newStatus) => {
        if (!window.confirm(`Mudar status financeiro para: ${newStatus.toUpperCase()}?`)) return;
        setActionLoading(`billing_${storeId}`);
        try {
            await updateDoc(doc(db, 'stores', storeId), { billingStatus: newStatus, billingUpdatedAt: new Date() });
            await fetchSaaSData(); 
        } catch (error) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        const displayName = storeName || 'LOJA SEM NOME';
        if (!window.confirm(`⚠️ DELETAR "${displayName}"? Isso apaga os dados do banco permanentemente!`)) return;
        if (window.prompt(`Digite DELETAR para confirmar a exclusão:`) !== 'DELETAR') return;
        setActionLoading(`delete_${storeId}`);
        try {
            await deleteDoc(doc(db, 'stores', storeId));
            alert('Loja excluída.'); await fetchSaaSData();
        } catch (error) { alert('Erro: ' + error.message); }
        finally { setActionLoading(null); }
    };

    const handleAddInvoice = async (storeId) => {
        const month = window.prompt("Mês/Ano da fatura? (Ex: Abril/2026)");
        if (!month) return;
        const val = window.prompt("Valor? (Ex: R$ 97,00)");
        if (!val) return;
        const status = window.prompt("Status? (PAGO ou PENDENTE)").toUpperCase();
        
        setActionLoading(`invoice_${storeId}`);
        try {
            await updateDoc(doc(db, 'stores', storeId), {
                faturasHistorico: arrayUnion({ id: Date.now().toString(), month, amount: val, status, createdAt: new Date() })
            });
            await fetchSaaSData();
        } catch (error) { alert('Erro: ' + error.message); }
        finally { setActionLoading(null); }
    };

    const handleImpersonate = (storeId) => {
        if (!window.confirm("Você entrará no painel deste cliente.\nIsso limpará sua sessão atual. Para voltar ao Master Admin depois, você precisará deslogar e logar novamente.\nDeseja continuar?")) return;
        
        localStorage.setItem('@velo:overrideStoreId', storeId);
        window.location.href = '/admin';
    };

    // --- HELPERS VISUAIS ---
    const renderBillingBadge = (status) => {
        switch (status) {
            case 'pago': return <span className="flex w-fit items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded"><CheckCircle2 size={12}/> Pago</span>;
            case 'pendente': return <span className="flex w-fit items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded"><Clock size={12}/> Pendente</span>;
            case 'teste': return <span className="flex w-fit items-center gap-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded"><Activity size={12}/> Teste</span>;
            case 'gratis_vitalicio': return <span className="flex w-fit items-center gap-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-1 rounded"><ShieldAlert size={12}/> Cortesia</span>;
            case 'bloqueado': return <span className="flex w-fit items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded"><Ban size={12}/> Bloqueado</span>;
            default: return <span className="text-[10px] text-slate-500">Sem status</span>;
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
                                Nenhuma loja aguardando aprovação na fila automática. (Use o Controle de Lojas para forçar).
                            </div>
                        ) : (
                            pixQueue.map(loja => (
                                <div key={loja.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            {/* CORREÇÃO: Puxa o nome jurídico se não tiver nome fantasia */}
                                            <h3 className="font-bold text-white text-lg">{loja.name || loja.velopayData?.legalName || 'Loja em Cadastro'}</h3>
                                            <p className="text-xs text-slate-500 mt-1">Status Atual: <span className="text-amber-500">{loja.velopayStatus || 'pending_review'}</span></p>
                                        </div>
                                    </div>
                                    <div className="mb-6 space-y-1">
                                        {/* CORREÇÃO: Lê os dados corretos de dentro do velopayData */}
                                        <p className="text-sm text-slate-400">Doc: {loja.velopayData?.document || loja.cnpj || 'Não informado'}</p>
                                        <p className="text-sm text-slate-400">Pix: {loja.velopayData?.pixKey || loja.chavePix || 'Não informada'}</p>
                                    </div>
                                    <button onClick={() => handleApprovePix(loja.id)} disabled={actionLoading === loja.id} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-3 rounded-xl font-bold">
                                        {actionLoading === loja.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} Aprovar VeloPay
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
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Controle de Lojas</h2>
                        <p className="text-slate-400">Ligar/desligar módulos, acessos e exclusões.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Loja & Status</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Módulos (Clique p/ Mudar)</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storesList.map(loja => (
                                    <tr key={loja.id} className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${loja.billingStatus === 'bloqueado' ? 'opacity-50' : ''}`}>
                                        <td className="p-4 min-w-[200px]">
                                            <p className="font-bold text-white">{loja.name || loja.velopayData?.legalName || '⚠️ [LOJA VAZIA]'}</p>
                                            <div className="mt-1">{renderBillingBadge(loja.billingStatus)}</div>
                                            <p className="text-[10px] text-slate-600 mt-1">ID: {loja.id}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                                                <button onClick={() => handleToggleModule(loja.id, 'veloGameEnabled', loja.veloGameEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.veloGameEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    Velo Game
                                                </button>
                                                <button onClick={() => handleToggleModule(loja.id, 'veloPayEnabled', loja.veloPayEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.veloPayEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    VeloPay
                                                </button>
                                                <button onClick={() => handleToggleModule(loja.id, 'pdvEnabled', loja.pdvEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.pdvEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    PDV (Garçom)
                                                </button>
                                                <button onClick={() => handleToggleModule(loja.id, 'aiCopyEnabled', loja.aiCopyEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.aiCopyEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    IA p/ Copy
                                                </button>
                                                <button onClick={() => handleToggleModule(loja.id, 'whatsappRecoveryEnabled', loja.whatsappRecoveryEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.whatsappRecoveryEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    Wpp Recovery
                                                </button>
                                                <button onClick={() => handleToggleModule(loja.id, 'dataFuelEnabled', loja.dataFuelEnabled)} disabled={actionLoading?.includes(loja.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
                                                    {loja.dataFuelEnabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-600" />} 
                                                    Data Fuel
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end flex-wrap items-center gap-2">
                                                <button onClick={() => handleApprovePix(loja.id)} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Aprovar Pix</button>
                                                <button onClick={() => handleImpersonate(loja.id)} className="bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Play size={14} /> Impersonate</button>
                                                <button onClick={() => handleUpdateBillingStatus(loja.id, loja.billingStatus === 'bloqueado' ? 'pago' : 'bloqueado')} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Lock size={14} /> Bloquear</button>
                                                <button onClick={() => handleDeleteStore(loja.id, loja.name)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (activeTab === 'faturas') {
            return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Assinaturas e Histórico</h2>
                        <p className="text-slate-400">Controle pagamentos mensais e status financeiro.</p>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {storesList.map(loja => (
                            <div key={loja.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                                    <div>
                                        <h3 className="font-bold text-white text-xl">{loja.name || loja.velopayData?.legalName || '⚠️ LOJA FANTASMA'}</h3>
                                        <div className="mt-2">{renderBillingBadge(loja.billingStatus)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-right">
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pago')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded text-xs font-bold">Pago</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pendente')} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1 rounded text-xs font-bold">Pendente</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'teste')} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-bold">Teste</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'gratis_vitalicio')} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1 rounded text-xs font-bold">Cortesia</button>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-300 text-sm">Histórico de Faturas</h4>
                                        <button onClick={() => handleAddInvoice(loja.id)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> Nova</button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {(!loja.faturasHistorico || loja.faturasHistorico.length === 0) ? (
                                            <p className="text-xs text-slate-500 italic">Nenhum registro de pagamento adicionado.</p>
                                        ) : (
                                            loja.faturasHistorico.slice().reverse().map(fat => (
                                                <div key={fat.id} className="flex justify-between items-center bg-slate-950/50 border border-slate-800 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-200">{fat.month}</p>
                                                        <p className="text-xs text-slate-500">{fat.amount}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${fat.status === 'PAGO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {fat.status}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return <div className="flex items-center justify-center h-64 text-slate-500"><ShieldAlert size={48} className="opacity-20" /></div>;
    };

    const menuItems = [
        { id: 'dashboard', label: 'Fila Pix', icon: LayoutDashboard },
        { id: 'lojas', label: 'Controle de Lojas', icon: Store },
        { id: 'faturas', label: 'Faturas & Status', icon: CreditCard },
    ];

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-300">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="font-black text-white text-xl flex items-center gap-2"><Zap size={20} className="text-blue-500 fill-blue-500" /> DARK OPS</h2>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400"><X /></button>
                </div>
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button onClick={async () => { await signOut(auth); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={18} /> Sair</button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-[#0B0F19] p-6 md:p-10">
                <header className="md:hidden mb-6 flex justify-between"><button onClick={() => setIsMobileMenuOpen(true)} className="text-white"><Menu /></button></header>
                <div className="max-w-7xl mx-auto">{renderContent()}</div>
            </main>
        </div>
    );
}