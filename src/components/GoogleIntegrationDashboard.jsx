import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaStore, FaStar, FaImage, FaList, FaBullhorn } from 'react-icons/fa6';
import { Loader2, ExternalLink, Save, CheckCircle, Send, RefreshCw, MessageSquare, Search, Sparkles, UploadCloud, X, Edit3, Users, ShieldCheck, Clock } from 'lucide-react';

export default function GoogleIntegrationDashboard({ storeId, products, storeStatus, uploadImageToCloudinary }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    const [profileData, setProfileData] = useState({ title: '', description: '', phone: '', vouchers: [] });
    const [postData, setPostData] = useState({ summary: '', imageUrl: '', topicType: 'STANDARD', startDate: '', endDate: '' });    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [replyInputs, setReplyInputs] = useState({});
    const [reviewFilter, setReviewFilter] = useState('ALL');
    const [mediaItems, setMediaItems] = useState([]);
    const [mediaCategory, setMediaCategory] = useState('FOOD_AND_DRINK');
    const [mediaFile, setMediaFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    useEffect(() => {
        if (storeId) checkConnectionStatus();
    }, [storeId]);

    const checkConnectionStatus = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/google-gmb?action=checkStatus&storeId=${storeId}`);
            const data = await res.json();
            if (data.connected) {
                setIsConnected(true);
                fetchProfileData();
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProfileData = async () => {
        setIsFetchingProfile(true);
        try {
            const res = await fetch(`/api/google-gmb?action=getProfile&storeId=${storeId}`);
            const data = await res.json();
            
            if (data.success && data.profile) {
                let rawDescription = data.profile.profile?.description || '';
                let extractedVouchers = [];
                
                // Inteligência: Se a descrição já tiver os Vales injetados do salvamento anterior,
                // nós retiramos do texto limpo e usamos para marcar as caixinhas automaticamente!
                if (rawDescription.includes('💳 Aceitamos Vales e Benefícios:')) {
                    const parts = rawDescription.split('💳 Aceitamos Vales e Benefícios:');
                    rawDescription = parts[0].trim();
                    const vouchersString = parts[1].replace('.', '').trim();
                    extractedVouchers = vouchersString.split(',').map(v => v.trim());
                }

                setProfileData({
                    title: data.profile.title || '',
                    description: rawDescription,
                    phone: data.profile.primaryPhone || '',
                    vouchers: extractedVouchers
                });
            }
        } catch (error) { 
            console.error("Erro ao buscar perfil", error); 
        } finally {
            setIsFetchingProfile(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // AEO (Answer Engine Optimization) - Injeta os Vales no final da descrição para o Google indexar nos filtros
            let finalDescription = profileData.description;
            if (profileData.vouchers?.length > 0) {
                const voucherText = `\n\n💳 Aceitamos Vales e Benefícios: ${profileData.vouchers.join(', ')}.`;
                if (!finalDescription.includes('Aceitamos Vales e Benefícios')) {
                    finalDescription += voucherText;
                }
            }

            const res = await fetch('/api/google-gmb', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateBusinessInfo', storeId, ...profileData, description: finalDescription })
            });
            const data = await res.json();
            if (data.success) alert("✅ Perfil atualizado no Google!");
            else throw new Error(data.error);
        } catch (error) { 
            alert(`❌ Erro: ${error.message}`); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleGenerateAICopy = async () => {
        if (!selectedProduct) return alert("Selecione um produto primeiro.");
        setIsGeneratingAI(true);
        try {
            const res = await fetch('/api/generate-promo-copy', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: storeStatus?.name || 'Nossa Loja',
                    storeNiche: storeStatus?.storeNiche || 'delivery',
                    productName: selectedProduct.name,
                    productDesc: selectedProduct.description || '',
                    productPrice: selectedProduct.promotionalPrice > 0 ? selectedProduct.promotionalPrice : selectedProduct.price
                })
            });
            const data = await res.json();
            if (data.success) {
                setPostData({ ...postData, summary: data.instagram }); 
            } else throw new Error(data.error);
        } catch (error) { 
            alert("Erro ao gerar IA."); 
        } finally { 
            setIsGeneratingAI(false); 
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let finalImageUrl = postData.imageUrl;
            if (imageFile) {
                finalImageUrl = await uploadImageToCloudinary(imageFile);
            } else if (selectedProduct && !finalImageUrl) {
                finalImageUrl = selectedProduct.imageUrl;
            }

            // Descobre a URL base da loja e formata o slug do produto para o botão do Google
            let productUrl = null;
            if (selectedProduct) {
                const baseUrl = storeStatus?.customDomain ? `https://${storeStatus.customDomain}` : `https://${storeId}.velodelivery.com.br`;
                const safeSlug = selectedProduct.name.toString().toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9 -]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+/, '').replace(/-+$/, '');
                productUrl = `${baseUrl}/p/${safeSlug}`;
            }

            const res = await fetch('/api/google-gmb', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'createGooglePost', 
                    storeId, 
                    summary: postData.summary, 
                    imageUrl: finalImageUrl, 
                    topicType: postData.topicType,
                    startDate: postData.startDate,
                    endDate: postData.endDate,
                    productUrl: productUrl
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Postagem publicada!");
                setPostData({ summary: '', imageUrl: '', topicType: 'STANDARD', startDate: '', endDate: '' });
                setSelectedProduct(null);
                setImageFile(null);
            } else throw new Error(data.error);
        } catch (error) { 
            alert(`❌ Erro: ${error.message}`); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleFetchReviews = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/google-gmb?action=getReviews&storeId=${storeId}`);
            const data = await res.json();
            if (data.success && data.reviews?.reviews) {
                setReviews(data.reviews.reviews);
            } else {
                setReviews([]);
                alert("Nenhuma avaliação encontrada.");
            }
        } catch (error) { 
            alert("Erro ao buscar avaliações."); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleReplyReview = async (reviewId) => {
        const replyText = replyInputs[reviewId];
        if (!replyText) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/google-gmb', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'handleReviews', storeId, reviewId, replyText })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Resposta enviada!");
                handleFetchReviews();
            } else throw new Error(data.error);
        } catch (error) { 
            alert(`❌ Erro: ${error.message}`); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const renderStars = (ratingStr) => {
        const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
        const num = map[ratingStr] || 0;
        return '⭐'.repeat(num);
    };

    const handleFetchMedia = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/google-gmb?action=getMedia&storeId=${storeId}`);
            const data = await res.json();
            if (data.success && data.media?.mediaItems) setMediaItems(data.media.mediaItems);
            else setMediaItems([]);
        } catch (error) { 
            console.error("Erro ao buscar mídias"); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleUploadMedia = async () => {
        if (!mediaFile) return alert("Selecione uma imagem.");
        setIsSaving(true);
        try {
            const url = await uploadImageToCloudinary(mediaFile);
            const res = await fetch('/api/google-gmb', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'uploadGoogleMedia', storeId, mediaUrl: url, category: mediaCategory })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Imagem enviada ao Google!");
                setMediaFile(null);
                handleFetchMedia();
            } else throw new Error(data.error);
        } catch (error) { 
            alert(`❌ Erro: ${error.message}`); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleSyncCatalog = async () => {
        if (!window.confirm("Deseja sincronizar seu cardápio do Velo com o Google agora?")) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/google-gmb', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'syncVeloProducts', storeId })
            });
            const data = await res.json();
            if (data.success) alert(`✅ Catálogo sincronizado! ${data.syncedCount} produtos enviados.`);
            else throw new Error(data.error);
        } catch (error) { 
            alert(`❌ Erro ao sincronizar catálogo: ${error.message}`); 
        } finally { 
            setIsSaving(false); 
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    if (!isConnected) {
        return (
            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center shadow-xl max-w-3xl mx-auto mt-10">
                <FaGoogle size={48} className="text-blue-600 mx-auto mb-6" />
                <h2 className="text-4xl font-black text-slate-800 mb-2 uppercase italic">Google Meu Negócio</h2>
                <p className="text-slate-500 font-bold mb-8 text-sm">Conecte sua loja para sincronizar dados e dominar as buscas locais.</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => window.location.href = `/api/google-auth?storeId=${storeId}`} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-blue-700">
                        Conectar Conta Google
                    </button>
                    <a href="https://business.google.com/create" target="_blank" rel="noopener noreferrer" className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-black uppercase shadow-sm hover:bg-slate-200">
                        Criar Perfil no Google
                    </a>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'profile', label: 'Perfil & Dados', icon: <FaStore /> },
        { id: 'feed', label: 'Postagens (Feed)', icon: <FaBullhorn /> },
        { id: 'reviews', label: 'Avaliações', icon: <FaStar /> },
        { id: 'media', label: 'Mídias e Fotos', icon: <FaImage /> },
        { id: 'catalog', label: 'Cardápio', icon: <FaList /> }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><FaGoogle size={28} /></div>
                    <div>
                        <h1 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Google Meu Negócio</h1>
                        <p className="text-green-600 font-bold text-xs uppercase tracking-widest mt-1 flex items-center gap-1"><CheckCircle size={14}/> Conectado e Sincronizando</p>
                    </div>
                </div>
                <button 
                    onClick={() => alert("Para sua segurança, a desconexão deve ser feita na aba de Integrações do Painel Velo.")}
                    className="text-xs font-bold text-red-500 uppercase tracking-widest hover:underline"
                >
                    Desconectar
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-64 flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'media') handleFetchMedia(); if (tab.id === 'reviews') handleFetchReviews(); }} className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 min-h-[500px]">
                    <AnimatePresence mode="wait">
                        
                        {activeTab === 'profile' && (
                            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-2">
                                        <FaStore className="text-blue-600"/> Dados do Google
                                    </h2>
                                    <button 
                                        onClick={fetchProfileData} 
                                        disabled={isFetchingProfile} 
                                        className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
                                    >
                                        {isFetchingProfile ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} 
                                        {isFetchingProfile ? 'Buscando...' : 'Puxar do Google Agora'}
                                    </button>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-6 flex items-start gap-3 shadow-sm animate-in fade-in">
                                    <FaGoogle size={20} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Ficha Sincronizada ao Vivo</p>
                                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                                            Os dados abaixo foram puxados diretamente da sua ficha no Google Maps agora mesmo. Para atualizar qualquer informação, basta editar e clicar em Salvar.
                                        </p>
                                    </div>
                                </div>

                                {isFetchingProfile ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
                                        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                                        <p className="font-black uppercase text-sm text-slate-500 tracking-widest">Buscando na sua conta Google...</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

                                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Nome da Loja no Maps</label><input type="text" value={profileData.title} onChange={e => setProfileData({...profileData, title: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500" required /></div>
                                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Telefone de Contato</label><input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500" /></div>
                                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Descrição Oficial</label><textarea rows="4" value={profileData.description} onChange={e => setProfileData({...profileData, description: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium outline-none focus:ring-2 ring-blue-500 resize-none custom-scrollbar"></textarea></div>
                                    
                                    {/* UPDATE 2026: VALES E BENEFÍCIOS */}
                                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                        <div className="mb-3">
                                            <label className="text-xs font-black uppercase text-blue-800 flex items-center gap-2">🎟️ Vales e Benefícios (Filtro do Google)</label>
                                            <p className="text-[10px] font-bold text-slate-500 leading-tight mt-1">Marque os vales que você aceita. O sistema injetará tags invisíveis (AEO) no seu perfil para você ranquear primeiro quando o cliente pesquisar "aceita sodexo".</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['Alelo', 'Sodexo', 'Pluxee', 'Ticket', 'VR Benefícios', 'Ben Visa Vale', 'Caju'].map(voucher => {
                                                const isSelected = profileData.vouchers?.includes(voucher);
                                                return (
                                                    <label key={voucher} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border cursor-pointer flex items-center gap-2 select-none ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                let current = profileData.vouchers || [];
                                                                if (e.target.checked) current.push(voucher);
                                                                else current = current.filter(v => v !== voucher);
                                                                setProfileData({...profileData, vouchers: current});
                                                            }}
                                                        />
                                                        {isSelected && <CheckCircle size={12} className="text-white"/>}
                                                        {voucher}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"><Save size={18}/> Salvar Perfil e Atualizar Filtros</button>
                                </form>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'feed' && (
                            <motion.div key="feed" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-2 mb-6"><MessageSquare className="text-blue-600"/> Feed de Novidades</h2>
                                
                                {/* UPDATE 2026: FUNÇÃO SEGUIR NO MAPS */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl mb-6 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-black uppercase tracking-widest flex items-center gap-2 text-sm mb-1"><Users size={18} className="text-blue-200"/> Nutrição de Seguidores (Maps)</h3>
                                        <p className="text-[10px] font-medium text-blue-100 leading-relaxed max-w-lg">O Google Maps agora permite que clientes "Sigam" sua loja. Use este feed semanalmente para nutrir sua base com links do Clube VIP e cupons, transformando pesquisas em recorrência.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setPostData({
                                                ...postData,
                                                topicType: 'OFFER',
                                                summary: `🎁 Benefício Exclusivo para nossos Seguidores!\n\nVocê que acompanha a ${storeStatus?.name || 'nossa loja'} por aqui, acabou de ganhar acesso ao nosso Clube de Vantagens.\n\nFaça seu pedido no nosso app oficial e acumule pontos que valem descontos e produtos gratuitos na hora!\n\n👉 Acesse o link do nosso App, cadastre-se e aproveite!`,
                                                startDate: new Date().toISOString().split('T')[0],
                                                endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0] // +7 dias
                                            });
                                            alert("Template de nutrição de seguidores gerado! Selecione uma foto chamativa e publique.");
                                        }}
                                        className="bg-white text-blue-700 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Sparkles size={14}/> Gerar Post p/ Seguidores
                                    </button>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 mb-6">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-1">Vincular Produto (Ofertas e Combos)</label>
                                    <div className="relative mb-2">
                                        <input 
                                            type="text" 
                                            placeholder="Pesquisar no catálogo Velo..." 
                                            value={productSearch} 
                                            onChange={e => setProductSearch(e.target.value)} 
                                            className="w-full p-4 pl-12 bg-white rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 ring-blue-500 shadow-sm" 
                                        />
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    </div>
                                    
                                    {productSearch && (
    <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl p-2 shadow-xl absolute z-20 w-[calc(100%-4rem)] md:w-[calc(100%-8rem)] custom-scrollbar">
        {(products || []).filter(p => (p.name || '').toLowerCase().includes((productSearch || '').toLowerCase())).map(p => (
                                                <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(''); setPostData({...postData, topicType: 'OFFER'}) }} className="w-full text-left p-3 hover:bg-blue-50 text-sm font-bold rounded-xl flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0">
                                                    {p.imageUrl ? <img src={p.imageUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-100"/> : <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>} 
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedProduct && (
                                        <div className="bg-white border-2 border-blue-400 p-3 rounded-2xl flex items-center justify-between shadow-sm animate-in zoom-in mt-3">
                                            <div className="flex items-center gap-3">
                                                {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-50"/>}
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{selectedProduct.name}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 w-fit">R$ {Number(selectedProduct.promotionalPrice || selectedProduct.price).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedProduct(null)} className="text-slate-400 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Remover Produto"><X size={20}/></button>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleCreatePost} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-2">Tipo de Postagem</label>
                                            <select value={postData.topicType} onChange={e => setPostData({...postData, topicType: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500 cursor-pointer text-slate-700">
                                                <option value="STANDARD">Novidade (Atualização Padrão)</option>
                                                <option value="OFFER">Oferta / Promoção</option>
                                                <option value="EVENT">Evento</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-2">Imagem da Postagem</label>
                                            <label className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl font-bold text-xs text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all truncate block">
                                                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" />
                                                <div className="flex items-center justify-center gap-2">
                                                    <UploadCloud size={16}/> 
                                                    {imageFile ? imageFile.name : (selectedProduct?.imageUrl ? '✅ Usando Foto do Produto' : 'Upload do Computador')}
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {(postData.topicType === 'OFFER' || postData.topicType === 'EVENT') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-2">Data de Início *</label>
                                                <input type="date" value={postData.startDate} onChange={e => setPostData({...postData, startDate: e.target.value})} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-2">Data de Término *</label>
                                                <input type="date" value={postData.endDate} onChange={e => setPostData({...postData, endDate: e.target.value})} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="bg-slate-50 p-1 rounded-3xl border border-slate-200">
                                        <div className="flex justify-between items-end mb-2 px-3 pt-3">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                                                <Edit3 size={12}/> Texto da Postagem
                                            </label>
                                            
                                            {selectedProduct && (
                                                <button 
                                                    type="button"
                                                    onClick={handleGenerateAICopy} 
                                                    disabled={isGeneratingAI} 
                                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:from-purple-700 hover:to-indigo-700 shadow-md active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isGeneratingAI ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                                                    {isGeneratingAI ? 'Escrevendo...' : 'Gerar Copy com IA'}
                                                </button>
                                            )}
                                        </div>
                                        <textarea 
                                            rows="6" 
                                            required 
                                            placeholder="Escreva a novidade para seus clientes ou selecione um produto e clique em 'Gerar Copy com IA'..." 
                                            value={postData.summary} 
                                            onChange={e => setPostData({...postData, summary: e.target.value})} 
                                            className="w-full p-5 bg-white rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-2 ring-blue-500 resize-none custom-scrollbar"
                                        ></textarea>
                                    </div>
                                    
                                    <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>} 
                                        {isSaving ? 'Publicando...' : 'Publicar no Google Agora'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'reviews' && (
                            <motion.div key="reviews" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-2"><FaStar className="text-yellow-400"/> Gestão de Reputação</h2>
                                    <button onClick={handleFetchReviews} disabled={isSaving} className="bg-blue-50 text-blue-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 shadow-sm transition-all active:scale-95">
                                        {isSaving ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} Sincronizar
                                    </button>
                                </div>

                                {/* UPDATE 2026: MODERAÇÃO DE REVIEWS */}
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
                                    <ShieldCheck size={20} className="text-orange-500 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="text-xs font-black text-orange-800 uppercase tracking-widest mb-1">Aviso de Moderação de IA (Google)</p>
                                        <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
                                            Clientes agora podem avaliar usando pseudônimos/apelidos anônimos. <b>Nunca use o nome de quem avaliou na sua resposta</b> para não ser barrado. O Google agora demora de 10 minutos a 30 dias para publicar suas respostas caso a IA deles detecte linguagem repetitiva ou nomes inválidos. Foque em respostas limpas e objetivas sobre o produto (AEO).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-xl w-fit">
                                    <button onClick={() => setReviewFilter('ALL')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reviewFilter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Todas</button>
                                    <button onClick={() => setReviewFilter('UNREPLIED')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reviewFilter === 'UNREPLIED' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Pendente</button>
                                    <button onClick={() => setReviewFilter('REPLIED')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reviewFilter === 'REPLIED' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Respondidas</button>
                                </div>

                                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                    {reviews.filter(r => {
                                        if (reviewFilter === 'REPLIED') return r.reviewReply;
                                        if (reviewFilter === 'UNREPLIED') return !r.reviewReply;
                                        return true;
                                    }).map(review => (
                                        <div key={review.reviewId} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    {review.reviewer?.profilePhotoUrl ? <img src={review.reviewer.profilePhotoUrl} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black">{review.reviewer?.displayName?.charAt(0) || 'C'}</div>}
                                                    <div>
                                                        <p className="font-black text-slate-800">{review.reviewer?.displayName || 'Cliente'}</p>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(review.createTime).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                </div>
                                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">{renderStars(review.starRating)}</span>
                                            </div>
                                            
                                            <p className="text-sm text-slate-600 font-medium italic mb-4">"{review.comment || 'Avaliação sem texto.'}"</p>
                                            
                                            {review.reviewReply ? (
                                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl relative">
                                                    <div className="absolute top-4 right-4 bg-green-500/20 text-green-700 px-2 py-1 rounded text-[8px] font-black uppercase">Enviada p/ Moderação</div>
                                                    <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1">Resposta do Estabelecimento:</p>
                                                    <p className="text-sm font-bold text-blue-900">{review.reviewReply.comment}</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 relative">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Resposta profissional..." 
                                                                value={replyInputs[review.reviewId] || ''} 
                                                                onChange={(e) => setReplyInputs({...replyInputs, [review.reviewId]: e.target.value})} 
                                                                className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-blue-500 text-slate-700" 
                                                            />
                                                            {/* BOTÃO IA ANTI-SPAM (AEO Seguro) */}
                                                            <button 
                                                                type="button"
                                                                title="Gerar Resposta Segura (AEO)"
                                                                onClick={() => {
                                                                    const isPositive = review.starRating === 'FIVE' || review.starRating === 'FOUR';
                                                                    const storeName = storeStatus?.name || 'nossa loja';
                                                                    const niche = storeStatus?.storeNiche || 'delivery';
                                                                    
                                                                    let safeReply = '';
                                                                    if (isPositive) {
                                                                        // Sem usar nome. Focando no produto, nicho e local (SEO Puro)
                                                                        safeReply = `Olá! Agradecemos muito a sua avaliação positiva. Nosso time trabalha duro todos os dias para entregar a melhor experiência em ${niche}. Sempre que precisar, a equipe da ${storeName} estará à disposição!`;
                                                                    } else {
                                                                        safeReply = `Olá. Agradecemos o seu feedback, pois ele é fundamental para nossa evolução. Lamentamos que a sua experiência não tenha sido ideal. Prezamos muito pela qualidade do nosso serviço na ${storeName}. Por favor, entre em contato conosco pelos canais oficiais para entendermos o ocorrido.`;
                                                                    }
                                                                    setReplyInputs({...replyInputs, [review.reviewId]: safeReply});
                                                                }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                                                            >
                                                                <Sparkles size={16}/>
                                                            </button>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleReplyReview(review.reviewId)} 
                                                            disabled={isSaving || !replyInputs[review.reviewId]} 
                                                            className="bg-blue-600 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Enviar p/ Google
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {reviews.length === 0 && <p className="text-center text-slate-400 font-bold py-10">Nenhuma avaliação encontrada neste filtro.</p>}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'media' && (
                            <motion.div key="media" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-xl font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><FaImage className="text-purple-600"/> Atualizar Logomarca e Capa</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Onde a foto vai aparecer?</label>
                                        <select value={mediaCategory} onChange={e => setMediaCategory(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none cursor-pointer">
                                            <option value="PROFILE">Logomarca (Foto de Perfil)</option>
                                            <option value="COVER">Capa do Google Maps</option>
                                            <option value="INTERIOR">Foto do Interior da Loja</option>
                                            <option value="EXTERIOR">Foto da Fachada (Exterior)</option>
                                            <option value="FOOD_AND_DRINK">Foto de Produto / Prato</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Selecionar Imagem do PC</label>
                                        <label className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-all text-sm truncate">
                                            <input type="file" accept="image/*" onChange={(e) => setMediaFile(e.target.files[0])} className="hidden" />
                                            {mediaFile ? mediaFile.name : 'Clique para Escolher...'} <UploadCloud size={16}/>
                                        </label>
                                    </div>
                                    <button onClick={handleUploadMedia} disabled={!mediaFile || isSaving} className="md:col-span-2 w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-md hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-50">
                                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <UploadCloud size={18}/>} Enviar Imagem para o Google
                                    </button>
                                </div>

                                <h3 className="text-sm font-black uppercase text-slate-800 border-b border-slate-100 pb-2 mb-4">Galeria Atual no Google</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {mediaItems.map((media, idx) => (
                                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200">
                                            <img src={media.googleUrl} className="w-full h-32 object-cover" />
                                            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-[8px] font-black uppercase backdrop-blur-sm">
                                                {media.locationAssociation?.category || 'MÍDIA'}
                                            </div>
                                        </div>
                                    ))}
                                    {mediaItems.length === 0 && <p className="col-span-full text-center text-slate-400 text-xs font-bold py-6">Galeria vazia ou carregando...</p>}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'catalog' && (() => {
                            // Lógica de Trava (Cooldown) de 12 horas
                            let lastSyncDate = null;
                            if (storeStatus?.lastCatalogSync) {
                                if (typeof storeStatus.lastCatalogSync.toDate === 'function') {
                                    lastSyncDate = storeStatus.lastCatalogSync.toDate();
                                } else if (storeStatus.lastCatalogSync.seconds) {
                                    lastSyncDate = new Date(storeStatus.lastCatalogSync.seconds * 1000);
                                } else {
                                    lastSyncDate = new Date(storeStatus.lastCatalogSync);
                                }
                            }

                            const cooldownMs = 12 * 60 * 60 * 1000; // 12 horas em milissegundos
                            const isLocked = lastSyncDate && (new Date() - lastSyncDate) < cooldownMs;
                            const timeRemainingMs = isLocked ? cooldownMs - (new Date() - lastSyncDate) : 0;
                            const hoursRemaining = Math.ceil(timeRemainingMs / (1000 * 60 * 60));

                            return (
                                <motion.div key="catalog" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <div className="text-center py-16 flex flex-col items-center">
                                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-600'}`}>
                                            <FaList size={36}/> 
                                        </div>
                                        <h2 className="text-3xl font-black uppercase text-slate-800 mb-2">Sincronização de Cardápio</h2>
                                        <p className="text-sm font-bold text-slate-500 mb-8 max-w-md">
                                            Envie todos os produtos ativos do painel Velo Delivery diretamente para a aba "Produtos" do seu perfil no Google Maps.
                                        </p>
                                        
                                        <button 
                                            onClick={handleSyncCatalog} 
                                            disabled={isSaving || isLocked} 
                                            className={`px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-100 disabled:cursor-not-allowed ${isLocked ? 'bg-slate-200 text-slate-500 shadow-none' : 'bg-green-500 text-white shadow-xl shadow-green-200 hover:bg-green-600'}`}
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : (isLocked ? <CheckCircle size={20}/> : <RefreshCw size={20}/>)}
                                            {isSaving ? 'Sincronizando...' : (isLocked ? 'Catálogo Sincronizado' : 'Sincronizar Velo -> Google')}
                                        </button>

                                        {lastSyncDate && (
                                            <div className="mt-6 flex flex-col items-center gap-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                                    Última Sincronização: <span className="text-slate-700">{lastSyncDate.toLocaleString('pt-BR')}</span>
                                                </p>
                                                {isLocked && (
                                                    <p className="text-[9px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg mt-2 border border-orange-100 flex items-center gap-1 animate-pulse">
                                                        <Clock size={12}/> Nova sincronização liberada em aprox. {hoursRemaining}h (Prevenção Antispam)
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}