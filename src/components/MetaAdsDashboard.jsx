import React, { useState, useEffect } from 'react';
import { FaFacebook, FaInstagram, FaRegChartBar } from 'react-icons/fa6';
import { Target, Megaphone, CheckCircle, X, Loader2, Plus, MapPin, DollarSign } from 'lucide-react';

export default function MetaAdsDashboard({ storeId, products, storeStatus, settings }) {
    const [metaStatus, setMetaStatus] = useState({ isConnected: false, userName: null, hasAccountIds: false });
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [selectedProduct, setSelectedProduct] = useState('');
    const [dailyBudget, setDailyBudget] = useState(10);
    const [radiusKm, setRadiusKm] = useState(5);

    useEffect(() => {
        const metaConfig = settings?.integrations?.meta;
        if (metaConfig?.marketingToken) {
            setMetaStatus({
                isConnected: true,
                userName: metaConfig.metaUserName || 'Usuário Conectado',
                hasAccountIds: !!metaConfig.adAccountId && !!metaConfig.pageId
            });
        } else {
            setMetaStatus({ isConnected: false, userName: null, hasAccountIds: false });
        }
    }, [storeStatus]);

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return alert("Selecione um produto para anunciar.");
        
        const product = products.find(p => p.id === selectedProduct);
        if (!product || (!product.imageUrl && !product.videoUrl)) {
            return alert("O produto selecionado precisa ter uma foto cadastrada.");
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
                    imageUrl: product.imageUrl || product.videoUrl, // Envia a foto
                    dailyBudget: dailyBudget,
                    radius: radiusKm
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert("✅ Campanha criada com sucesso!\n\nEla foi criada em modo 'Pausado' por segurança. Acesse seu Gerenciador de Anúncios no Facebook para revisar e ativar!");
                setIsCampaignModalOpen(false);
            } else {
                alert(`❌ Erro da Meta: ${data.error}`);
            }
        } catch (error) {
            alert("Erro de conexão ao tentar criar a campanha.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!metaStatus.isConnected) {
        return (
            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center shadow-sm max-w-2xl mx-auto mt-12">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaFacebook size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Meta Ads Desconectado</h3>
                <p className="text-slate-500 font-bold mb-8 text-sm">
                    Para automatizar seus anúncios no Instagram e Facebook direto do painel Velo, você precisa conectar sua Conta de Anúncios da Meta primeiro.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Megaphone size={150} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">Central de Anúncios</h2>
                    <p className="text-blue-100 font-bold text-sm flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-400" />
                        Conectado como: {metaStatus.userName}
                    </p>
                    {!metaStatus.hasAccountIds && (
                        <p className="text-orange-300 text-[10px] font-black uppercase tracking-widest mt-2 bg-orange-900/30 px-3 py-1 rounded-lg w-fit">
                            ⚠️ Falta preencher a Ad Account ID e Page ID na aba Integrações.
                        </p>
                    )}
                </div>
                <button 
                    onClick={() => setIsCampaignModalOpen(true)}
                    disabled={!metaStatus.hasAccountIds}
                    className="relative z-10 bg-white text-blue-700 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={18} /> Criar Campanha
                </button>
            </div>

            {/* DASHBOARD DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Target size={14}/> Status do Sistema</p>
                    <p className="text-2xl font-black text-slate-800 italic">Pronto para rodar</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><FaRegChartBar size={14}/> Automação Inteligente</p>
                    <p className="text-2xl font-black text-blue-600 italic">Ativa</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><FaInstagram size={14}/> Plataformas</p>
                    <p className="text-2xl font-black text-pink-600 italic">Insta & Facebook</p>
                </div>
            </div>

            {/* MODAL DE CRIAÇÃO DE CAMPANHA */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 md:p-10 shadow-2xl relative">
                        <button onClick={() => setIsCampaignModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors z-20">
                            <X size={20}/>
                        </button>

                        <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                            <Megaphone className="text-blue-600"/> Lançar Anúncio
                        </h2>
                        <p className="text-xs font-bold text-slate-500 mb-6">O sistema criará a campanha, o público na sua região e o criativo na Meta automaticamente.</p>

                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-2">Qual produto você quer impulsionar?</label>
                                <select 
                                    required
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-blue-500 border border-slate-100 cursor-pointer"
                                >
                                    <option value="">Selecione um produto...</option>
                                    {products.filter(p => p.isActive !== false && p.imageUrl).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (R$ {Number(p.price).toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-2 flex items-center gap-1"><DollarSign size={12}/> Orçamento Diário</label>
                                    <input 
                                        type="number" 
                                        min="6" 
                                        required
                                        value={dailyBudget}
                                        onChange={(e) => setDailyBudget(e.target.value)}
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg text-green-600 outline-none focus:ring-2 ring-blue-500 border border-slate-100 text-center"
                                    />
                                    <p className="text-[9px] text-slate-400 font-bold text-center mt-1">Mínimo R$ 6,00/dia</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 ml-2 flex items-center gap-1"><MapPin size={12}/> Raio de Alcance</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="50"
                                        required
                                        value={radiusKm}
                                        onChange={(e) => setRadiusKm(e.target.value)}
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg text-blue-600 outline-none focus:ring-2 ring-blue-500 border border-slate-100 text-center"
                                    />
                                    <p className="text-[9px] text-slate-400 font-bold text-center mt-1">KM ao redor da loja</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1 flex items-center gap-1">
                                    <CheckCircle size={14}/> Tudo Seguro
                                </p>
                                <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
                                    O anúncio será criado com o status <b>PAUSADO</b>. Você não será cobrado até abrir o seu aplicativo de anúncios do Facebook e revisar.
                                </p>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <Megaphone size={20}/>}
                                {isSubmitting ? 'Injetando na Meta...' : 'Criar Campanha Inteligente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}