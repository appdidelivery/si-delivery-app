import React, { useState, useEffect } from 'react';
import { FaFacebook, FaInstagram, FaRegChartBar } from 'react-icons/fa6';
import { Target, Megaphone, CheckCircle, X, Loader2, Plus, MapPin, DollarSign, Users, ShoppingBag, Zap, RefreshCw } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function MetaAdsDashboard({ storeId, products, storeStatus, settings }) {
    const [metaStatus, setMetaStatus] = useState({ isConnected: false, userName: null, hasAccountIds: false });
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedObjective, setSelectedObjective] = useState(null); // 'followers', 'sales', 'smart'

    // Form states
    const [selectedProduct, setSelectedProduct] = useState('');
    const [dailyBudget, setDailyBudget] = useState(10);
const [radiusKm, setRadiusKm] = useState(5);
    const [isFetchingAssets, setIsFetchingAssets] = useState(false);
    const [campaignsList, setCampaignsList] = useState([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

    const handleFetchMetaAssets = async () => {
        const token = settings?.integrations?.meta?.marketingToken;
        if (!token) return alert("Token da Meta não encontrado. Conecte a conta novamente na aba Integrações.");
        
        setIsFetchingAssets(true);
        try {
            let fetchedAdAccountId = null;
            let fetchedAdAccountName = null;
            let fetchedPageId = null;
            let fetchedPageName = null;

            // 1. Busca Ad Accounts vinculadas ao usuário (Pedindo o Status da Conta)
            const adRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${token}`);
            const adData = await adRes.json();
            
            if (adData.error) {
                console.error("Erro Meta AdAccounts:", adData.error);
                throw new Error(`Meta recusou acesso: ${adData.error.message}`);
            }

            if (adData.data && adData.data.length > 0) {
                // MÁGICA: Procura a primeira conta que esteja ATIVA (account_status === 1)
                const activeAccount = adData.data.find(acc => acc.account_status === 1);
                
                if (activeAccount) {
                    fetchedAdAccountId = activeAccount.id; 
                    fetchedAdAccountName = activeAccount.name;
                } else {
                    // Se não achar nenhuma ativa, pega a primeira mesmo assim para mostrar o erro pro Lojista
                    fetchedAdAccountId = adData.data[0].id;
                    fetchedAdAccountName = adData.data[0].name;
                    alert("⚠️ AVISO: Detectamos que a sua Conta de Anúncios da Meta pode estar desativada ou com pendências financeiras. Recomendamos verificar no Facebook.");
                }
            }

            // 2. Busca Páginas do Facebook vinculadas
            const pageRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name&access_token=${token}`);
            const pageData = await pageRes.json();
            
            if (pageData.error) {
                console.error("Erro Meta Pages:", pageData.error);
                throw new Error(`Meta recusou acesso às páginas: ${pageData.error.message}`);
            }

            if (pageData.data && pageData.data.length > 0) {
                fetchedPageId = pageData.data[0].id;
                fetchedPageName = pageData.data[0].name;
            }

            // 3. Monta o Alerta Inteligente
            let alertaMsg = "✅ Retorno da Meta:\n\n";
            alertaMsg += fetchedAdAccountId ? `🎯 Conta: ${fetchedAdAccountName}\n` : `❌ Conta: NÃO ENCONTRADA\n`;
            alertaMsg += fetchedPageId ? `📄 Página: ${fetchedPageName}\n` : `❌ Página: NÃO ENCONTRADA\n`;

            if (!fetchedAdAccountId || !fetchedPageId) {
                alertaMsg += `\n⚠️ AVISO: O painel continuará bloqueado.\nMotivos comuns:\n1. Seu Facebook não tem Conta de Anúncios criada.\n2. O seu App na Meta não tem as permissões 'ads_management' e 'manage_pages'.`;
            }

            // 4. Salva no Firebase o que encontrou
            await updateDoc(doc(db, "settings", storeId), {
                "integrations.meta.adAccountId": fetchedAdAccountId || settings?.integrations?.meta?.adAccountId || null,
                "integrations.meta.adAccountName": fetchedAdAccountName || settings?.integrations?.meta?.adAccountName || null,
                "integrations.meta.pageId": fetchedPageId || settings?.integrations?.meta?.pageId || null,
                "integrations.meta.pageName": fetchedPageName || settings?.integrations?.meta?.pageName || null,
            });

            // 5. MÁGICA: Força a tela a destravar na mesma hora se os dados vieram corretos
            if (fetchedAdAccountId && fetchedPageId) {
                setMetaStatus(prev => ({ ...prev, hasAccountIds: true }));
            }

            alert(alertaMsg);

        } catch (error) {
            console.error("Erro ao buscar assets da Meta:", error);
            alert(`Falha na sincronização:\n${error.message}`);
        } finally {
            setIsFetchingAssets(false);
        }
    };
    
    useEffect(() => {
        const metaConfig = settings?.integrations?.meta;
        // Validação extra: Se o token for a string "null" ou vazio, trata como desconectado
        if (metaConfig && metaConfig.marketingToken && metaConfig.marketingToken !== "null") {
            setMetaStatus({
                isConnected: true,
                userName: metaConfig.metaUserName || 'Usuário Conectado',
                hasAccountIds: !!metaConfig.adAccountId && !!metaConfig.pageId
            });
        } else {
            setMetaStatus({ isConnected: false, userName: null, hasAccountIds: false });
        }
    }, [settings]); // Removido storeStatus para evitar loops desnecessários, já que os dados da Meta estão em 'settings'

    // 🚨 FUNÇÃO CORRIGIDA: Buscar campanhas agora está solta e livre!
    const fetchCampaigns = async () => {
        setIsLoadingCampaigns(true);
        try {
            const res = await fetch(`/api/meta-campaigns?storeId=${storeId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setCampaignsList(data.campaigns);
            }
        } catch (e) {
            console.error("Erro ao buscar campanhas", e);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    // Puxa as campanhas automaticamente quando a Meta estiver conectada
    useEffect(() => {
        if (metaStatus.isConnected) {
            fetchCampaigns();
        }
    }, [metaStatus.isConnected]);

    const handleOpenModal = (objectiveId) => {
        setSelectedObjective(objectiveId);
        setIsCampaignModalOpen(true);
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return alert("Selecione um produto para anunciar.");
        
        const product = products.find(p => p.id === selectedProduct);
        if (!product || (!product.imageUrl && !product.videoUrl)) {
            return alert("O produto selecionado precisa ter uma foto cadastrada no estoque.");
        }

        setIsSubmitting(true);

        // Monta o link do produto
        const domain = storeStatus?.customDomain ? `https://${storeStatus.customDomain}` : `https://${storeId}.velodelivery.com.br`;
        const safeSlug = product.name.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-');
        const productUrl = `${domain}/p/${safeSlug}`;

        try {
            const res = await fetch('/api/meta-create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId,
                    productId: product.id,
                    productName: product.name,
                    productUrl: productUrl,
                    imageUrl: product.imageUrl || product.videoUrl,
                    dailyBudget: dailyBudget,
                    radius: radiusKm,
                    objective: selectedObjective
                })
            });

            const data = await res.json();

            // Lógica rigorosa de tratamento de erros para não prender o loading
            if (res.ok && data.success) {
                // SALVA O ID DA CAMPANHA NO PRODUTO PARA FUTURA AUTO-PAUSA (ESTOQUE ZERO)
                try {
                    await updateDoc(doc(db, "products", product.id), {
                        metaCampaignId: data.campaignId,
                        hasActiveAd: true
                    });
                } catch (errDb) {
                    console.warn("Aviso: Campanha criada, mas falhou ao vincular ID ao produto localmente.", errDb);
                }

                alert("✅ Campanha gerada com sucesso!\n\nPor segurança, ela foi criada em modo 'Pausado'. Acesse o Gerenciador de Anúncios da Meta para inserir seu Cartão de Crédito e Ativar.");
                setIsCampaignModalOpen(false);
            } else {
                // Se a API devolveu erro (ex: Token Expirado, Sem Cartão, etc)
                console.error("Erro devolvido pelo servidor:", data);
                const errorMsg = data.error || "Erro desconhecido na Meta.";
                
                // Trata especificamente o erro de sessão expirada
                if (errorMsg.toLowerCase().includes("session has expired") || errorMsg.toLowerCase().includes("token")) {
                    alert(`⚠️ SESSÃO EXPIRADA!\n\nO seu acesso à Meta expirou por segurança. Por favor, vá à aba "Integrações", clique em "Desconectar" na Meta e faça login novamente para gerar uma nova chave.\n\nDetalhe do erro: ${errorMsg}`);
                } else {
                    alert(`❌ Falha ao Criar Campanha:\n\n${errorMsg}`);
                }
            }
        } catch (error) {
            console.error("Erro no fetch de criação de campanha:", error);
            alert("❌ Erro de comunicação com o servidor. A campanha não foi criada. Verifique a sua internet e tente novamente.");
        } finally {
            // GARANTE que o loading é desativado independentemente de sucesso ou erro
            setIsSubmitting(false);
        }
    };

    if (!metaStatus.isConnected) {
        return (
            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center shadow-sm max-w-2xl mx-auto mt-12 animate-in zoom-in">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaFacebook size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Meta Ads Desconectado</h3>
                <p className="text-slate-500 font-bold mb-8 text-sm">
                    Para automatizar seus anúncios no Instagram e Facebook direto do painel Velo, você precisa conectar sua Conta de Anúncios na aba Integrações.
                </p>
            </div>
        );
    }

    const objectivesMap = {
        'followers': { title: 'Atrair Seguidores e Leads', icon: <Users size={20}/>, color: 'text-pink-600', bg: 'bg-pink-100' },
        'sales': { title: 'Vender Mais (Promoções)', icon: <ShoppingBag size={20}/>, color: 'text-blue-600', bg: 'bg-blue-100' },
        'smart': { title: 'Piloto Automático Meta', icon: <Zap size={20}/>, color: 'text-purple-600', bg: 'bg-purple-100' }
    };

    return (
        <div className="space-y-8">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Megaphone size={180} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-3">Central de Anúncios</h2>
                    <p className="text-blue-100 font-bold text-sm flex items-center gap-2 mb-4">
                        <CheckCircle size={18} className="text-green-400" />
                        Conectado: <span className="text-white">{metaStatus.userName}</span>
                        <button 
                            onClick={async () => {
                                if (window.confirm("Deseja realmente desconectar a Meta? Suas automações pararão de funcionar.")) {
                                    try {
                                        // Limpeza PROFUNDA no Firebase. Remove todas as chaves associadas à Meta.
                                        await updateDoc(doc(db, "settings", storeId), {
                                            "integrations.meta": {
                                                marketingToken: null,
                                                userId: null,
                                                healthStatus: 'disconnected',
                                                adAccountId: null,
                                                adAccountName: null,
                                                pageId: null,
                                                pageName: null,
                                                metaUserName: null
                                            }
                                        });
                                        setMetaStatus({ isConnected: false, userName: null, hasAccountIds: false });
                                        alert("Desconectado com sucesso.");
                                    } catch (e) {
                                        console.error("Erro ao desconectar:", e);
                                        alert("Erro ao desconectar. Tente atualizar a página.");
                                    }
                                }
                            }}
                            className="ml-4 text-xs font-black uppercase tracking-widest text-red-300 hover:text-red-400 transition-colors"
                        >
                            Desconectar
                        </button>
                    </p>
                    
                    {!metaStatus.hasAccountIds && (
                        <div className="bg-orange-500/20 border border-orange-500/50 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 backdrop-blur-sm mt-4">
                            <div className="flex-1">
                                <p className="text-orange-300 font-black uppercase tracking-widest text-xs mb-1">⚠️ Configuração Incompleta</p>
                                <p className="text-orange-100 text-[10px] font-bold leading-relaxed">
                                    O sistema ainda não localizou o ID da sua Conta de Anúncios ou da sua Página. Clique no botão ao lado para que a inteligência da Velo busque esses dados automaticamente na Meta.
                                </p>
                            </div>
                            <button 
                                onClick={handleFetchMetaAssets}
                                disabled={isFetchingAssets}
                                className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-orange-400 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFetchingAssets ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {isFetchingAssets ? 'Consultando Meta...' : 'Puxar Dados Automaticamente'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* SELEÇÃO DE OBJETIVOS (3 CARDS GIGANTES) */}
            <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic mb-6">Qual seu objetivo hoje?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* CARD 1: SEGUIDORES */}
                    <button 
                        onClick={() => handleOpenModal('followers')}
                        disabled={!metaStatus.hasAccountIds}
                        className="group flex flex-col justify-between p-8 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                    >
                        <div className="absolute -top-10 -right-10 bg-gradient-to-br from-pink-400 to-rose-500 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
                        <div>
                            <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h4 className="text-2xl font-black uppercase text-slate-800 leading-tight mb-3">Atrair Seguidores e Leads</h4>
                            <p className="text-sm font-bold text-slate-500">Cresça a base local da sua loja. Anúncios focados em engajamento e visitas ao perfil do Instagram.</p>
                        </div>
                        <div className="mt-8 flex items-center text-pink-600 font-black uppercase tracking-widest text-xs gap-2">
                            Criar Campanha <Plus size={16} className="group-hover:translate-x-2 transition-transform"/>
                        </div>
                    </button>

                    {/* CARD 2: VENDAS E PROMOÇÕES */}
                    <button 
                        onClick={() => handleOpenModal('sales')}
                        disabled={!metaStatus.hasAccountIds}
                        className="group flex flex-col justify-between p-8 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                    >
                        <div className="absolute -top-10 -right-10 bg-gradient-to-br from-blue-400 to-cyan-500 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
                        <div>
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                <ShoppingBag size={32} />
                            </div>
                            <h4 className="text-2xl font-black uppercase text-slate-800 leading-tight mb-3">Vender Mais (Promoções)</h4>
                            <p className="text-sm font-bold text-slate-500">Direcione clientes com fome para um produto específico ou combo do seu cardápio online.</p>
                        </div>
                        <div className="mt-8 flex items-center text-blue-600 font-black uppercase tracking-widest text-xs gap-2">
                            Criar Campanha <Plus size={16} className="group-hover:translate-x-2 transition-transform"/>
                        </div>
                    </button>

                    {/* CARD 3: PILOTO AUTOMÁTICO */}
                    <button 
                        onClick={() => handleOpenModal('smart')}
                        disabled={!metaStatus.hasAccountIds}
                        className="group flex flex-col justify-between p-8 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-xl hover:shadow-2xl hover:border-purple-500 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                    >
                        <div className="absolute -top-10 -right-10 bg-gradient-to-br from-purple-500 to-indigo-600 w-32 h-32 rounded-full blur-[60px] opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none"></div>
                        <div>
                            <div className="w-16 h-16 bg-purple-900/50 text-purple-400 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                <Zap size={32} className="group-hover:animate-pulse"/>
                            </div>
                            <h4 className="text-2xl font-black uppercase text-white leading-tight mb-3">Piloto Automático (IA)</h4>
                            <p className="text-sm font-bold text-slate-400">A Inteligência da Meta testará formatos e públicos sozinha para encontrar clientes que convertem no WhatsApp e Site.</p>
                        </div>
                        <div className="mt-8 flex items-center text-purple-400 font-black uppercase tracking-widest text-xs gap-2">
                            Ativar Automação <Zap size={16} className="group-hover:translate-x-2 transition-transform"/>
                        </div>
                    </button>

                </div>
            </div>

            {/* MINHAS CAMPANHAS (DADOS REAIS DA META) */}
            <div className="pt-8 border-t border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Minhas Campanhas</h3>
                    <button 
                        onClick={fetchCampaigns}
                        disabled={isLoadingCampaigns}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                        {isLoadingCampaigns ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
                        Atualizar
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    {isLoadingCampaigns && campaignsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest">Buscando na Meta...</p>
                        </div>
                    ) : campaignsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                            <Megaphone size={40} className="mb-3 opacity-50" />
                            <p className="text-sm font-bold">Nenhuma campanha encontrada.</p>
                            <p className="text-xs mt-1">Crie a sua primeira campanha nos botões acima.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                                        <th className="p-5 font-black">Nome da Campanha</th>
                                        <th className="p-5 font-black text-center">Status</th>
                                        <th className="p-5 font-black text-center">Cliques</th>
                                        <th className="p-5 font-black text-center">Gasto</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-50">
                                    {campaignsList.map(camp => (
                                        <tr key={camp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-5">{camp.name}</td>
                                            <td className="p-5 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    camp.status.includes('ACTIVE') ? 'bg-green-100 text-green-700' : 
                                                    camp.status.includes('PAUSED') ? 'bg-orange-100 text-orange-700' : 
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {camp.status.replace('CAMPAIGN_', '')}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center text-blue-600">{camp.clicks || 0}</td>
                                            <td className="p-5 text-center text-red-500">R$ {Number(camp.spend || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="mt-4 text-center">
                    <a 
                        href="https://adsmanager.facebook.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline flex items-center justify-center gap-1"
                    >
                        Abrir Gerenciador de Anúncios Profissional <ExternalLink size={12} />
                    </a>
                </div>
            </div>

            {/* MODAL DE CRIAÇÃO DE CAMPANHA */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setIsCampaignModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors z-20">
                            <X size={20}/>
                        </button>

                        <div className="mb-8 border-b border-slate-100 pb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${objectivesMap[selectedObjective].bg} ${objectivesMap[selectedObjective].color}`}>
                                    {objectivesMap[selectedObjective].icon} {objectivesMap[selectedObjective].title}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black italic uppercase text-slate-900 flex items-center gap-2">
                                Configurar Campanha
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mt-2">O sistema vai formatar o público e o criativo na Meta automaticamente baseado nas suas escolhas.</p>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3 ml-2 flex items-center gap-2">
                                    <ShoppingBag size={14} className="text-blue-500"/> Qual produto será a isca?
                                </label>
                                <select 
                                    required
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    className="w-full p-4 bg-white rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-blue-500 border border-slate-200 cursor-pointer shadow-sm"
                                >
                                    <option value="">Selecione um produto atrativo do cardápio...</option>
                                    {products.filter(p => p.isActive !== false && (p.imageUrl || p.videoUrl)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (R$ {Number(p.promotionalPrice > 0 ? p.promotionalPrice : p.price).toFixed(2)})</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 font-bold ml-2 mt-2">Apenas produtos com foto cadastrada aparecem aqui.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3 ml-2 flex items-center gap-1">
                                        <DollarSign size={14} className="text-green-600"/> Orçamento Diário (R$)
                                    </label>
                                    <input 
                                        type="number" 
                                        min="6" 
                                        required
                                        value={dailyBudget}
                                        onChange={(e) => setDailyBudget(e.target.value)}
                                        className="w-full p-4 bg-white rounded-2xl font-black text-2xl text-green-600 outline-none focus:ring-2 ring-green-500 border border-slate-200 text-center shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold text-center mt-2">O valor sugerido é R$ 10,00/dia.</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3 ml-2 flex items-center gap-1">
                                        <MapPin size={14} className="text-red-500"/> Raio de Alcance (KM)
                                    </label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="50"
                                        required
                                        value={radiusKm}
                                        onChange={(e) => setRadiusKm(e.target.value)}
                                        className="w-full p-4 bg-white rounded-2xl font-black text-2xl text-blue-600 outline-none focus:ring-2 ring-blue-500 border border-slate-200 text-center shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold text-center mt-2">Distância em KM ao redor da loja.</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mt-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1 flex items-center gap-1">
                                    <CheckCircle size={14}/> Ambiente Seguro (Não gasta dinheiro)
                                </p>
                                <p className="text-[10px] font-bold text-blue-600 leading-relaxed mt-1">
                                    Para sua proteção, o anúncio será criado e enviado para a Meta com o status <b>PAUSADO</b>. Você não será cobrado em nada até abrir o Gerenciador de Anúncios da Meta, revisar a campanha e clicar em Ativar.
                                </p>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-6 text-sm"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <Megaphone size={24}/>}
                                {isSubmitting ? 'Construindo na Meta...' : 'Criar e Enviar para a Meta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}