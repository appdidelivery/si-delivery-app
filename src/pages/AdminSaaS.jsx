import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, arrayUnion, query, where, addDoc } from 'firebase/firestore';
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

    // --- ESTADOS DO MODAL DE REPASSE ---
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [selectedStoreForPayout, setSelectedStoreForPayout] = useState(null);
    const [storeWithdrawals, setStoreWithdrawals] = useState([]);
    const [receiptFile, setReceiptFile] = useState(null);
    const [uploadingReceiptId, setUploadingReceiptId] = useState(null);

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
            await updateDoc(doc(db, 'stores', storeId), {
                velopayStatus: 'active', 
                veloPayStatus: 'ativo', 
                efiStatus: 'ativo',
                pixStatus: 'ativo',
                veloPayApprovedAt: new Date()
            });
            alert('VeloPay ativado com sucesso!');
            await fetchSaaSData(); 
        } catch (error) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleUpdatePayout = async (storeId) => {
        const pixPlan = window.prompt("Plano de Repasse PIX (ex: d1, d14, d30):", "d30");
        if (!pixPlan) return;
        const creditPlan = window.prompt("Plano de Repasse CARTÃO (ex: d1, d14, d30):", "d30");
        if (!creditPlan) return;
        
        setActionLoading(`payout_${storeId}`);
        try {
            await updateDoc(doc(db, 'stores', storeId), {
                velopayPixPlan: pixPlan.toLowerCase(),
                velopayCreditPlan: creditPlan.toLowerCase()
            });
            alert('Planos de repasse atualizados com sucesso!');
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

    // --- FUNÇÕES DO MODAL DE REPASSE VELOPAY ---
    const handleOpenPayoutModal = async (store) => {
        setSelectedStoreForPayout(store);
        setIsPayoutModalOpen(true);
        setStoreWithdrawals([]); // Limpa o estado anterior por garantia
        
        try {
            // Busca apenas os saques da loja selecionada
            const q = query(collection(db, 'withdrawals'), where('storeId', '==', store.id));
            const querySnapshot = await getDocs(q);
            const withdrawals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Ordena para mostrar os mais recentes (ou os pendentes) primeiro
            withdrawals.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
            setStoreWithdrawals(withdrawals);
        } catch (error) {
            console.error("Erro ao buscar saques:", error);
            alert("Erro ao carregar o histórico de saques desta loja.");
        }
    };

   const handleUploadReceiptAndPay = async (withdrawalId) => {
        if (!receiptFile) return alert("Selecione o arquivo PDF do comprovante primeiro!");
        
        setUploadingReceiptId(withdrawalId);
        try {
            // 1. Upload do PDF para o Cloudinary
            const formData = new FormData();
            formData.append('file', receiptFile);
            // Usamos as mesmas credenciais que você já tem configuradas no projeto principal
            formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'velo_preset'); 
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { 
                method: 'POST', 
                body: formData 
            });
            
            if (!response.ok) throw new Error('Falha no upload do arquivo.');
            const data = await response.json();
            const fileUrl = data.secure_url;

            // 2. Atualiza o documento no Firestore
            await updateDoc(doc(db, 'withdrawals', withdrawalId), {
                status: 'paid',
                receiptUrl: fileUrl,
                paidAt: new Date()
            });

            // 3. Atualiza a lista na tela para o botão ficar verde
            setStoreWithdrawals(prev => prev.map(w => 
                w.id === withdrawalId ? { ...w, status: 'paid', receiptUrl: fileUrl } : w
            ));
            
            setReceiptFile(null);
            alert("✅ Comprovante anexado e saque marcado como pago com sucesso!");
            
        } catch (error) {
            console.error("Erro no repasse:", error);
            alert("Erro ao processar o comprovante: " + error.message);
        } finally {
            setUploadingReceiptId(null);
        }
    };

    const handleForceWithdrawalEntry = async () => {
        const amountStr = window.prompt("Qual o valor numérico deste repasse? (Ex: 192.80)");
        if (!amountStr) return;
        
        const amount = Number(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return alert("Valor inválido.");

        try {
            const newWithdrawal = {
                storeId: selectedStoreForPayout.id,
                storeName: selectedStoreForPayout.name || selectedStoreForPayout.velopayData?.legalName || 'Loja',
                amount: amount,
                status: 'pending', // Fica pendente para você poder fazer o upload do PDF
                pixKey: selectedStoreForPayout.velopayData?.pixKey || '',
                requestedAt: new Date(),
                plan: 'manual_admin'
            };

            const docRef = await addDoc(collection(db, 'withdrawals'), newWithdrawal);
            
            // Atualiza a lista na tela na mesma hora
            setStoreWithdrawals(prev => [{ id: docRef.id, ...newWithdrawal }, ...prev]);
            alert("Lançamento criado! Agora clique em 'Selecionar Comprovante' na caixinha dele.");
            
        } catch (error) {
            alert("Erro ao forçar lançamento: " + error.message);
        }
    };

    // --- MOTOR MÁGICO: GERAR FATURAS RETROATIVAS NO BANCO ---
    const handleSyncPastInvoices = async () => {
        if (!window.confirm("Isso vai varrer as lojas e gerar as faturas dos meses passados com CUSTOS REAIS. Confirmar?")) return;
        
        setActionLoading('sync_invoices');
        try {
            const batchPromises = [];
            const hoje = new Date();
            
            for (const loja of storesList) {
                let dataCriacao;
                let isFixingDate = false;

                if (!loja.createdAt) {
                    dataCriacao = new Date(2026, 0, 10); 
                    isFixingDate = true;
                } else {
                    dataCriacao = loja.createdAt.toDate ? loja.createdAt.toDate() : new Date(loja.createdAt);
                    if (isNaN(dataCriacao)) {
                        dataCriacao = new Date(2026, 0, 10);
                        isFixingDate = true;
                    }
                }

                const diaVencimento = dataCriacao.getDate();
                let historicoAtual = loja.faturasHistorico || [];
                let novasFaturas = [];

                // LÓGICA CIRÚRGICA DE CICLOS (Rolling Billing)
                let startOfCycle = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), diaVencimento);
                let endOfCycle = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth() + 1, diaVencimento);
                
                // Puxa todos os pedidos da loja de uma vez
                const ordersSnap = await getDocs(query(collection(db, 'orders'), where('storeId', '==', loja.id)));
                const todosPedidosLoja = ordersSnap.docs.map(d => d.data());

                // Enquanto a data de fim do ciclo for Menor ou Igual a Hoje, o ciclo fechou e gera fatura!
                while (endOfCycle <= hoje) {
                    const nomeMesAno = endOfCycle.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    const jaExiste = historicoAtual.some(f => f.month.toLowerCase().includes(nomeMesAno.split(' ')[0].toLowerCase()));
                    
                    if (!jaExiste) {
                        const pedidosNoCiclo = todosPedidosLoja.filter(oData => {
                            if (oData.status === 'canceled' || oData.status === 'cancelado') return false;
                            if (!oData.createdAt) return false;

                            let dt;
                            if (typeof oData.createdAt.toDate === 'function') dt = oData.createdAt.toDate();
                            else if (oData.createdAt.seconds) dt = new Date(oData.createdAt.seconds * 1000);
                            else if (oData.createdAt._seconds) dt = new Date(oData.createdAt._seconds * 1000);
                            else dt = new Date(oData.createdAt);
                            
                            if (isNaN(dt)) return false;
                            
                            // O pedido tem que ter acontecido EXATAMENTE dentro do ciclo daquele mês
                            return dt >= startOfCycle && dt < endOfCycle;
                        }).length;

                        const extraOrders = Math.max(0, pedidosNoCiclo - 100);
                        const extraCost = extraOrders * 0.25;
                        const isCortesia = loja.billingStatus === 'gratis_vitalicio';
                        const totalFatura = 49.90 + extraCost;

                        novasFaturas.push({
                            id: `auto_${loja.id}_${endOfCycle.getTime()}`,
                            month: nomeMesAno,
                            amount: `R$ ${totalFatura.toFixed(2).replace('.', ',')}`,
                            status: isCortesia ? 'ISENTO' : 'PAGO',
                            createdAt: endOfCycle.toISOString(), 
                            dueDate: endOfCycle.toISOString(),
                            isAuto: true,
                            breakdown: {
                                basePlan: 49.90,
                                extraOrdersCost: extraCost,
                                discount: isCortesia ? totalFatura : 0 
                            }
                        });
                    }
                    
                    // Avança para o próximo ciclo (ex: de Fev-Mar para Mar-Abr)
                    startOfCycle = new Date(endOfCycle);
                    endOfCycle = new Date(endOfCycle.getFullYear(), endOfCycle.getMonth() + 1, diaVencimento);
                }

                if (novasFaturas.length > 0 || isFixingDate) {
                    const lojaRef = doc(db, 'stores', loja.id);
                    const updateData = {};
                    if (novasFaturas.length > 0) {
                        updateData.faturasHistorico = [...historicoAtual, ...novasFaturas];
                    }
                    if (isFixingDate) {
                        updateData.createdAt = dataCriacao;
                    }
                    batchPromises.push(updateDoc(lojaRef, updateData));
                }
            }

            if (batchPromises.length > 0) {
                await Promise.all(batchPromises);
                alert(`✅ Mágica feita! Faturas retroativas com CUSTOS REAIS geradas.`);
                await fetchSaaSData();
            } else {
                alert("Tudo atualizado! Nenhuma fatura antiga estava faltando.");
            }
        } catch (error) {
            console.error("Erro na sincronização:", error);
            alert("Erro ao sincronizar faturas antigas.");
        } finally {
            setActionLoading(null);
        }
    };
    const handleAddInvoice = async (storeId) => {
        const month = window.prompt("Mês/Ano da fatura? (Ex: Abril/2026)");
        if (!month) return;
        const val = window.prompt("Valor numérico exato? (Ex: 97.00)");
        if (!val || isNaN(val.replace(',', '.'))) return alert("Por favor, digite um valor numérico válido.");
        const status = window.prompt("Status? (Digite: PAGO, PENDENTE ou ISENTO)").toUpperCase();
        
        let finalStatus = 'PENDENTE';
        if (status === 'PAGO') finalStatus = 'PAGO';
        if (status === 'ISENTO' || status === 'CORTESIA') finalStatus = 'ISENTO';

        setActionLoading(`invoice_${storeId}`);
        try {
            await updateDoc(doc(db, 'stores', storeId), {
                faturasHistorico: arrayUnion({ 
                    id: Date.now().toString(), 
                    month, 
                    amount: `R$ ${Number(val.replace(',', '.')).toFixed(2).replace('.', ',')}`, 
                    status: finalStatus, 
                    createdAt: new Date().toISOString() // Salva como ISO String para não quebrar
                })
            });
            await fetchSaaSData();
            alert("✅ Fatura adicionada ao histórico!");
        } catch (error) { alert('Erro: ' + error.message); }
        finally { setActionLoading(null); }
    };

    const handleImpersonate = (storeId) => {
        if (!window.confirm("Você entrará no painel deste cliente.\nIsso limpará sua sessão atual. Para voltar ao Master Admin depois, você precisará deslogar e logar novamente.\nDeseja continuar?")) return;
        
        localStorage.setItem('@velo:overrideStoreId', storeId);
        window.location.href = '/admin';
    };
// --- LÓGICA DE VENCIMENTO DINÂMICO ---
    const calculateDueDate = (createdAt) => {
        if (!createdAt) return 'Não Definido';
        try {
            // Lida com o formato Timestamp do Firebase ou com string ISO
            const creationDate = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
            if (isNaN(creationDate)) return 'Data Inválida';

            const dayOfCreation = creationDate.getDate();
            const now = new Date();
            
            // O vencimento é o dia da criação, no mês atual
            const dueDate = new Date(now.getFullYear(), now.getMonth(), dayOfCreation);
            
            // Se o dia de hoje for maior que o dia do vencimento, joga o próximo vencimento pro mês seguinte
            if (now.getDate() > dayOfCreation) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }

            return dueDate.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Erro na Data';
        }
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
                                            <h3 className="font-bold text-white text-lg">{loja.name || loja.velopayData?.legalName || 'Loja em Cadastro'}</h3>
                                            <p className="text-xs text-slate-500 mt-1">Status Atual: <span className="text-amber-500">{loja.velopayStatus || 'pending_review'}</span></p>
                                        </div>
                                    </div>
                                    <div className="mb-6 space-y-1">
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
                        <p className="text-slate-400">Ligar/desligar módulos, acessos, repasses e exclusões.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
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
                                            <p className="text-[10px] text-slate-600 mt-2">ID: {loja.id}</p>
                                            <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 inline-block">
                                                <p className="text-[10px] font-bold text-slate-400">Repasse Pix: <span className="text-emerald-400">{loja.velopayPixPlan?.toUpperCase() || 'D30'}</span></p>
                                                <p className="text-[10px] font-bold text-slate-400">Repasse Cartão: <span className="text-blue-400">{loja.velopayCreditPlan?.toUpperCase() || 'D30'}</span></p>
                                            </div>
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
                                                {loja.velopayStatus === 'active' ? (
                                                    <button 
                                                        onClick={async () => {
                                                            const password = window.prompt("⚠️ AÇÃO RESTRITA: Digite a senha master para desativar o VeloPay desta loja:");
                                                            if (password === "master123") { // Substitua pela sua senha de segurança real
                                                                setActionLoading(`disable_${loja.id}`);
                                                                try {
                                                                    await updateDoc(doc(db, "stores", loja.id), { 
                                                                        velopayStatus: 'inactive',
                                                                        velopayCreditStatus: 'inactive'
                                                                    });
                                                                    alert("VeloPay da loja foi bloqueado e resetado com sucesso!");
                                                                    await fetchSaaSData();
                                                                } catch (error) {
                                                                    alert("Erro ao bloquear: " + error.message);
                                                                } finally {
                                                                    setActionLoading(null);
                                                                }
                                                            } else if (password !== null) {
                                                                alert("Senha incorreta. Ação cancelada.");
                                                            }
                                                        }}
                                                        disabled={actionLoading === `disable_${loja.id}`}
                                                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                    >
                                                        {actionLoading === `disable_${loja.id}` ? <Loader2 size={14} className="animate-spin"/> : <Ban size={14}/>} 
                                                        Derrubar VeloPay
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleApprovePix(loja.id)} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle size={14}/> Aprovar Pix</button>
                                                )}
                                                
                                                <button onClick={() => handleOpenPayoutModal(loja)} className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CreditCard size={14} /> Repasse</button>
                                                <button onClick={() => handleImpersonate(loja.id)} className="bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Play size={14} /> Impersonate</button>
                                                <button onClick={() => handleUpdateBillingStatus(loja.id, loja.billingStatus === 'bloqueado' ? 'pago' : 'bloqueado')} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Lock size={14} /> Bloquear Loja</button>
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">Assinaturas e Histórico</h2>
                            <p className="text-slate-400">Controle pagamentos mensais e status financeiro.</p>
                        </div>
                        <button 
                            onClick={handleSyncPastInvoices} 
                            disabled={actionLoading === 'sync_invoices'}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {actionLoading === 'sync_invoices' ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16} className="text-yellow-400 fill-yellow-400"/>}
                            Sincronizar Faturas Antigas
                        </button>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {storesList.map(loja => (
                            <div key={loja.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b border-slate-800 pb-6 gap-4">
                                    <div>
                                        <h3 className="font-bold text-white text-xl uppercase">{loja.name || loja.velopayData?.legalName || '⚠️ LOJA FANTASMA'}</h3>
                                        <div className="mt-2 flex items-center gap-2">
                                            {renderBillingBadge(loja.billingStatus)}
                                            <span 
                                                onClick={async () => {
                                                    const novaData = window.prompt("Mudar a data de criação/vencimento desta loja? (Formato: YYYY-MM-DD)\nExemplo para Janeiro: 2026-01-10", "2026-01-10");
                                                    if (novaData) {
                                                        const dateObj = new Date(novaData + 'T12:00:00');
                                                        if (!isNaN(dateObj)) {
                                                            setActionLoading(`date_${loja.id}`);
                                                            await updateDoc(doc(db, 'stores', loja.id), { createdAt: dateObj });
                                                            alert("✅ Data alterada! Agora clique no botão 'Sincronizar Faturas Antigas' lá em cima.");
                                                            await fetchSaaSData();
                                                            setActionLoading(null);
                                                        } else {
                                                            alert("Formato inválido. Use YYYY-MM-DD");
                                                        }
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded cursor-pointer hover:bg-slate-700 hover:text-white transition-all border border-transparent hover:border-slate-600"
                                                title="Clique para alterar a data base da loja"
                                            >
                                                Vencimento: <span className="text-blue-400">{calculateDueDate(loja.createdAt)}</span> ✏️
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-right">
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pago')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${loja.billingStatus === 'pago' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}>Pago</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'pendente')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${loja.billingStatus === 'pendente' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}`}>Pendente</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'teste')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${loja.billingStatus === 'teste' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>Teste</button>
                                        <button onClick={() => handleUpdateBillingStatus(loja.id, 'bloqueado')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${loja.billingStatus === 'bloqueado' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>Bloquear</button>
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-slate-300 text-xs uppercase tracking-widest">Histórico de Faturas</h4>
                                        <button onClick={() => handleAddInvoice(loja.id)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                                            <Plus size={14}/> Lançar Fatura Antiga
                                        </button>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {(!loja.faturasHistorico || loja.faturasHistorico.length === 0) ? (
                                            <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-6 text-center">
                                                <p className="text-xs text-slate-500 font-bold">Nenhuma fatura registrada.</p>
                                                <p className="text-[10px] text-slate-600 mt-1">Clique no botão acima para adicionar o histórico (Ex: Jan, Fev, Mar).</p>
                                            </div>
                                        ) : (
                                            [...loja.faturasHistorico]
                                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Ordena da mais nova pra mais velha
                                                .map(fat => (
                                                <div key={fat.id} className="flex justify-between items-center bg-slate-950/80 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-200 uppercase">{fat.month}</p>
                                                        <p className="text-xs font-bold text-slate-500 mt-0.5">{fat.amount}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${fat.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                            {fat.status}
                                                        </span>
                                                        <button 
                                                            onClick={async () => {
                                                                if(window.confirm(`Excluir o registro da fatura de ${fat.month}?`)) {
                                                                    const novasFaturas = loja.faturasHistorico.filter(f => f.id !== fat.id);
                                                                    await updateDoc(doc(db, 'stores', loja.id), { faturasHistorico: novasFaturas });
                                                                    fetchSaaSData();
                                                                }
                                                            }} 
                                                            className="text-slate-600 hover:text-red-500 p-1 transition-colors"
                                                            title="Excluir Registro"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
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
            <main className="flex-1 overflow-y-auto bg-[#0B0F19] p-6 md:p-10 relative">
                <header className="md:hidden mb-6 flex justify-between"><button onClick={() => setIsMobileMenuOpen(true)} className="text-white"><Menu /></button></header>
                <div className="max-w-7xl mx-auto">{renderContent()}</div>

                {/* --- MODAL DE REPASSE (DARK OPS) --- */}
                {isPayoutModalOpen && selectedStoreForPayout && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            <button onClick={() => setIsPayoutModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={20}/></button>
                            
                            <div className="flex justify-between items-start mb-1 pr-8">
                                <h2 className="text-2xl font-black italic uppercase text-white flex items-center gap-3">
                                    <CreditCard className="text-purple-500" size={28}/> Saques da Loja
                                </h2>
                                <button onClick={handleForceWithdrawalEntry} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md">
                                    + Forçar Lançamento
                                </button>
                            </div>
                            <p className="text-xs font-bold text-slate-400 mb-6 border-b border-slate-800 pb-6 uppercase tracking-widest mt-2">
                                Loja: <span className="text-white">{selectedStoreForPayout.name || selectedStoreForPayout.velopayData?.legalName || 'N/A'}</span>
                                <br/><span className="text-emerald-400 mt-1 inline-block">Chave PIX: {selectedStoreForPayout.velopayData?.pixKey || 'Não cadastrada'}</span>
                            </p>

                            <div className="space-y-4 flex-1">
                                {storeWithdrawals.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum saque solicitado.</p>
                                    </div>
                                ) : (
                                    storeWithdrawals.map(w => (
                                        <div key={w.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                                            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                                                <div>
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Data da Solicitação</p>
                                                    <p className="text-sm font-bold text-slate-300">
                                                        {w.requestedAt?.toDate ? new Date(w.requestedAt.toDate()).toLocaleString('pt-BR') : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Valor do Saque</p>
                                                    <p className="text-2xl font-black text-white italic">R$ {Number(w.amount).toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                                                <div className="flex-1 w-full">
                                                    {w.status === 'paid' ? (
                                                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                                                <CheckCircle2 size={14}/> Saque Pago
                                                            </span>
                                                            {w.receiptUrl && (
                                                                <a href={w.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-white hover:text-emerald-300 underline">
                                                                    Ver Comprovante
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : w.status === 'rejected' ? (
                                                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
                                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                                                                <Ban size={14}/> Saque Recusado
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 w-full">
                                                            <input 
                                                                type="file" 
                                                                accept=".pdf,image/*" 
                                                                onChange={(e) => setReceiptFile(e.target.files[0])} 
                                                                className="hidden" 
                                                                id={`receipt-upload-${w.id}`} 
                                                            />
                                                            <label 
                                                                htmlFor={`receipt-upload-${w.id}`} 
                                                                className={`flex-1 p-3 rounded-xl font-bold text-[10px] uppercase text-center cursor-pointer border border-dashed transition-all ${receiptFile ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                                                            >
                                                                {receiptFile ? '📄 ' + receiptFile.name : '📎 Selecionar Comprovante (PDF)'}
                                                            </label>
                                                            
                                                            <button 
                                                                onClick={() => handleUploadReceiptAndPay(w.id)}
                                                                disabled={uploadingReceiptId === w.id || !receiptFile}
                                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
                                                            >
                                                                {uploadingReceiptId === w.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                                                                Pagar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}