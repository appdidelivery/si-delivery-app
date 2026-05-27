import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Megaphone, ShoppingBag, TrendingUp, Copy, ExternalLink, ShieldCheck, Loader2, Target, Link, Ticket, CheckCircle, AlertTriangle, Package, UploadCloud, Image as ImageIcon, X, Lock, Settings, Sparkles, Wallet, Banknote, QrCode } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function InfluencerDashboard() {
    const { partnerId } = useParams();
    const storeContext = useStore(); 
    const store = storeContext?.store; 

    const [partnerData, setPartnerData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]); 
    const [withdrawals, setWithdrawals] = useState([]); // NOVO: Saques solicitados
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [activeTab, setActiveTab] = useState('resultados'); 
    const [showTermsModal, setShowTermsModal] = useState(false);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputPassword, setInputPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    // NOVO: Adicionado pixKey no perfil
    const [profileForm, setProfileForm] = useState({ password: '', instagram: '', whatsapp: '', pixKey: '' });

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiResult, setAiResult] = useState({ script: '', caption: '', hashtags: '' });

    const [missionModal, setMissionModal] = useState({ isOpen: false, type: '', title: '' });
    const [proofFile, setProofFile] = useState(null);
    const [uploadingProof, setUploadingProof] = useState(false);

    const [selectedCampaignProduct, setSelectedCampaignProduct] = useState(null);
    const [utmSource, setUtmSource] = useState('instagram');

    const generateSlug = (text) => {
        return text.toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    };

    useEffect(() => {
        if (!partnerId) return;
        if (storeContext?.loading) return; 

        const savedAuth = localStorage.getItem(`partner_auth_${partnerId}`);
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
        }

        const fetchPartnerData = async () => {
            try {
                if (partnerId === "12" || partnerId === "13") {
                    setPartnerData({
                        id: partnerId,
                        name: partnerId === "12" ? 'Casal Gastrô São José' : 'Resenha Viamão',
                        badge: partnerId === "12" ? 'Tier Ouro' : 'Tier Prata',
                        discount: partnerId === "12" ? 'Permuta + 10% Venda' : 'Permuta Fixa',
                        termsAccepted: true, 
                        password: '123', 
                        instagram: '@teste',
                        whatsapp: '551199999999',
                        pixKey: 'teste@pix.com',
                        imageUrl: partnerId === "12" 
                            ? 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=400&q=80'
                            : 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&w=400&q=80'
                    });
                    setProfileForm({ password: '123', instagram: '@teste', whatsapp: '551199999999', pixKey: 'teste@pix.com' });
                    setOrders([]); 
                    setCoupons([{ id: 'mock', code: `${partnerId === "12" ? 'CASAL10' : 'RESENHA10'}`, type: 'percentage', value: 10 }]);
                    setWithdrawals([]);
                    setIsLoading(false);
                    return;
                }

                const partnerRef = doc(db, 'partners', partnerId);
                const partnerSnap = await getDoc(partnerRef);

                if (!partnerSnap.exists() || partnerSnap.data().category !== 'Influenciadores') {
                    setError("Perfil de parceiro não encontrado ou inativo.");
                    setIsLoading(false); return;
                }

                const data = partnerSnap.data();
                setPartnerData({ id: partnerSnap.id, ...data });
                setProfileForm({ password: data.password || '', instagram: data.instagram || '', whatsapp: data.whatsapp || '', pixKey: data.pixKey || '' });
                
                if (!data.termsAccepted && savedAuth === 'true') setShowTermsModal(true);
                if (!store?.slug) { setIsLoading(false); return; }

                // 1. Pedidos
                const qOrders = query(collection(db, "orders"), where("storeId", "==", store.slug), where("affiliateId", "==", partnerSnap.id), where("status", "!=", "canceled"));
                onSnapshot(qOrders, (snapshot) => { setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

                // 2. Cupons
                const qCoupons = query(collection(db, "coupons"), where("storeId", "==", store.slug), where("active", "==", true));
                onSnapshot(qCoupons, (snapshot) => {
                    const allCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const firstName = data.name.split(' ')[0].toUpperCase();
                    setCoupons(allCoupons.filter(c => c.assignedTo === partnerSnap.id || c.code.includes(firstName)));
                });

                // 3. Produtos
                const qProducts = query(collection(db, "products"), where("storeId", "==", store.slug), where("isActive", "==", true));
                onSnapshot(qProducts, (snapshot) => { setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

                // 4. NOVO: Saques Financeiros
                const qWithdrawals = query(collection(db, "partner_withdrawals"), where("storeId", "==", store.slug), where("partnerId", "==", partnerSnap.id));
                onSnapshot(qWithdrawals, (snapshot) => { 
                    setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
                    setIsLoading(false);
                });

            } catch (err) {
                setError("Erro de conexão. Tente atualizar a página.");
                setIsLoading(false);
            }
        };

        fetchPartnerData();
    }, [partnerId, storeContext?.loading, store?.slug]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (partnerData?.password === inputPassword) {
            setIsAuthenticated(true);
            localStorage.setItem(`partner_auth_${partnerId}`, 'true');
            if (!partnerData.termsAccepted) setShowTermsModal(true);
        } else {
            setLoginError('Senha incorreta. Tente novamente.');
            setTimeout(() => setLoginError(''), 3000);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            if (partnerId === "12" || partnerId === "13") return alert("Modo de teste não salva no banco.");
            await updateDoc(doc(db, "partners", partnerId), {
                password: profileForm.password, instagram: profileForm.instagram, whatsapp: profileForm.whatsapp, pixKey: profileForm.pixKey
            });
            setPartnerData(prev => ({...prev, ...profileForm}));
            setIsProfileOpen(false);
            alert("✅ Perfil atualizado com sucesso!");
        } catch(err) { alert("Erro ao atualizar perfil."); }
    };

    const handleAcceptTerms = async () => {
        try {
            await updateDoc(doc(db, "partners", partnerId), { termsAccepted: true, termsAcceptedAt: new Date().toISOString() });
            setPartnerData(prev => ({ ...prev, termsAccepted: true }));
            setShowTermsModal(false);
        } catch (error) { alert("Erro ao assinar termo."); }
    };

    const submitMissionProof = async () => {
        if (!proofFile) return alert("Selecione a imagem do print!");
        setUploadingProof(true);
        try {
            const formData = new FormData();
            formData.append('file', proofFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const uploadData = await res.json();
            
            await addDoc(collection(db, "partner_missions"), {
                storeId: store?.slug, partnerId: partnerData.id, partnerName: partnerData.name, missionType: missionModal.type,
                proofUrl: uploadData.secure_url, status: 'pending', createdAt: serverTimestamp()
            });
            
            alert("✅ Missão concluída com sucesso! Seu print foi enviado para a auditoria da loja.");
            setMissionModal({ isOpen: false, type: '', title: '' }); setProofFile(null);
        } catch (e) { alert("Erro ao enviar comprovante. Tente novamente."); } finally { setUploadingProof(false); }
    };

    const handleGenerateScript = async () => {
        if (!selectedCampaignProduct) return alert("Selecione um produto na lista de Campanhas primeiro!");
        const prod = products.find(p => p.id === selectedCampaignProduct);
        const linkCampanha = generateTrackingLink(selectedCampaignProduct, utmSource);
        setIsAiModalOpen(true); setIsGeneratingAi(true); setAiResult({ script: '', caption: '', hashtags: '' });
        try {
            const res = await fetch('/api/generate-promo-copy', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeName: store?.name || 'nossa loja', storeNiche: store?.storeNiche || 'delivery', productName: prod.name, productDesc: prod.description || '', productPrice: prod.promotionalPrice > 0 ? prod.promotionalPrice : prod.price, productId: prod.id })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const roteiroFalado = `🎥 DICA DE GRAVAÇÃO:\n1. Mostre a embalagem fechada.\n2. Abra mostrando a textura de ${prod.name}.\n3. Fale a frase abaixo:\n\n🗣️ "Gente, olha a qualidade desse ${prod.name} da ${store?.name}! É super recheado e chega quentinho. E o melhor: consegui um desconto/link especial pra vocês, tá aqui na minha Bio!"`;
                const legendaPronta = `${data.instagram}\n\n👇 Peça agora com o meu link exclusivo:\n🔗 ${linkCampanha}`;
                setAiResult({ script: roteiroFalado, caption: legendaPronta, hashtags: data.hashtags });
            } else { throw new Error(data.error); }
        } catch (err) { alert("Erro na IA. Verifique sua internet."); setIsAiModalOpen(false); } finally { setIsGeneratingAi(false); }
    };

    if (isLoading || storeContext?.loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Acessando Hub B2B...</p>
            </div>
        );
    }

    if (error || !partnerData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4"><ShieldCheck size={40} /></div>
                <h1 className="text-2xl font-black text-slate-800 uppercase italic">Acesso Restrito</h1>
                <p className="text-slate-500 font-medium mt-2">{error}</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Megaphone size={250} /></div>
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative z-10 text-center animate-in zoom-in-95">
                    <img src={partnerData.imageUrl} alt={partnerData.name} className="w-24 h-24 rounded-full border-4 border-slate-100 object-cover shadow-md mx-auto mb-4 bg-slate-100" />
                    <h1 className="text-2xl font-black italic uppercase leading-none text-slate-800 mb-2">{partnerData.name}</h1>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Painel do Parceiro</span>
                    <form onSubmit={handleLogin} className="space-y-4 text-left">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Senha de Acesso</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="password" placeholder="Digite sua senha..." className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-bold border border-slate-200 outline-none focus:ring-2 ring-indigo-500 text-slate-700 transition-all" value={inputPassword} onChange={e => setInputPassword(e.target.value)} />
                            </div>
                            {loginError && <p className="text-red-500 text-[10px] font-bold mt-2 ml-2 text-center animate-pulse">{loginError}</p>}
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">Entrar no Painel</button>
                    </form>
                </div>
            </div>
        );
    }

    // --- LÓGICA FINANCEIRA (COMISSÕES E SAQUE) ---
    const totalSalesValue = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
    
    // Calcula comissão com base na String de Acordo (Ex: "Permuta + 10% Venda")
    let commissionRate = 0;
    if (partnerData.discount?.includes('5%')) commissionRate = 0.05;
    if (partnerData.discount?.includes('10%')) commissionRate = 0.10;
    if (partnerData.discount?.includes('15%')) commissionRate = 0.15;
    if (partnerData.discount?.includes('20%')) commissionRate = 0.20;

    const totalCommissionEarned = totalSalesValue * commissionRate;
    
    // Abate os saques (Pendentes e Pagos) para mostrar o saldo disponível
    const totalWithdrawn = withdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
    const availableBalance = Math.max(0, totalCommissionEarned - totalWithdrawn);

    const handleRequestWithdraw = async () => {
        if (!partnerData.pixKey) return alert("⚠️ Você precisa cadastrar sua Chave PIX no botão de Engrenagem (Meu Perfil) antes de sacar.");
        if (availableBalance < 20) return alert("⚠️ O valor mínimo para saque é de R$ 20,00.");
        
        if(window.confirm(`Deseja solicitar o saque de R$ ${availableBalance.toFixed(2)} para sua conta?`)) {
            try {
                await addDoc(collection(db, "partner_withdrawals"), {
                    storeId: store?.slug,
                    partnerId: partnerData.id,
                    partnerName: partnerData.name,
                    pixKey: partnerData.pixKey,
                    amount: availableBalance,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                alert("✅ Saque solicitado! O lojista fará o PIX em breve.");
            } catch (e) { alert("Erro ao solicitar saque."); }
        }
    };

    const baseUrl = window.location.hostname.includes('localhost') ? `http://localhost:5173` : `https://${store?.slug || 'app'}.velodelivery.com.br`;
    const generateTrackingLink = (productId = null, source = 'instagram') => {
        let link = baseUrl;
        if (productId) {
            const prod = products.find(p => p.id === productId);
            if (prod) link += `/p/${generateSlug(prod.name)}`;
        }
        return `${link}?affiliate_id=${partnerData.id}&utm_source=${source}&utm_medium=influencer`;
    };
    const mainTrackingLink = generateTrackingLink();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
            
            {showTermsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32} /></div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-center text-slate-900 mb-2">Termo de Parceria</h2>
                        <p className="text-slate-500 font-bold text-xs text-center mb-6">Leia atentamente as diretrizes da marca antes de prosseguir.</p>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-4 mb-6 leading-relaxed">
                            <p><strong>1. Ética e Conduta:</strong> O parceiro compromete-se a não divulgar a marca associada a conteúdos ofensivos.</p>
                            <p><strong>2. Qualidade:</strong> As publicações devem seguir os roteiros sugeridos nas "Missões", garantindo iluminação adequada e informações reais.</p>
                            <p><strong>3. Transparência:</strong> As vendas são rastreadas através do Link Exclusivo UTM. Suas métricas estarão sempre visíveis neste painel.</p>
                        </div>
                        <button onClick={handleAcceptTerms} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95">Li e Aceito as Condições</button>
                    </div>
                </div>
            )}

            {isProfileOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
                        <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                        <div className="flex items-center gap-3 mb-6">
                            <Settings className="text-indigo-500"/>
                            <h2 className="text-xl font-black italic uppercase text-slate-900 leading-none">Meu Perfil</h2>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nova Senha</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Instagram (@)</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500" value={profileForm.instagram} onChange={e => setProfileForm({...profileForm, instagram: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">WhatsApp de Contato</label>
                                <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500" value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} />
                            </div>
                            <div className="pt-2">
                                <label className="text-[10px] font-black uppercase text-green-500 block mb-1 flex items-center gap-1"><QrCode size={12}/> Minha Chave PIX (Para Receber Saques)</label>
                                <input type="text" placeholder="CPF, Celular, E-mail..." className="w-full p-3 bg-green-50/50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-green-500 border border-green-100" value={profileForm.pixKey} onChange={e => setProfileForm({...profileForm, pixKey: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all mt-2">Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}

            {isAiModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setIsAiModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="text-purple-600"/>
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">Roteiro Mágico IA</h2>
                        </div>
                        {isGeneratingAi ? (
                            <div className="flex flex-col items-center justify-center py-10 text-purple-600 gap-3">
                                <Loader2 className="animate-spin" size={40}/>
                                <p className="font-black uppercase tracking-widest text-xs">Criando roteiro magnético...</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl">
                                    <h3 className="text-xs font-black text-orange-800 uppercase mb-2 flex items-center gap-1">🎥 O que falar no Vídeo</h3>
                                    <textarea readOnly className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs font-bold text-slate-700 h-28 resize-none custom-scrollbar outline-none" value={aiResult.script} />
                                </div>
                                <div className="bg-pink-50 border border-pink-200 p-5 rounded-2xl">
                                    <h3 className="text-xs font-black text-pink-800 uppercase mb-2 flex items-center justify-between">
                                        <span>📝 Legenda do Post</span>
                                        <button onClick={() => { navigator.clipboard.writeText(aiResult.caption); alert("Legenda Copiada!"); }} className="text-[10px] bg-white text-pink-600 px-2 py-1 rounded-md shadow-sm border border-pink-100 active:scale-95 transition-all">Copiar</button>
                                    </h3>
                                    <textarea readOnly className="w-full bg-white border border-pink-100 rounded-xl p-3 text-xs font-medium text-slate-700 h-32 resize-none custom-scrollbar outline-none" value={aiResult.caption} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {missionModal.isOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative flex flex-col text-center">
                        <button onClick={() => { setMissionModal({ isOpen: false }); setProofFile(null); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                        <div className="bg-purple-100 text-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon size={32} /></div>
                        <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 mb-2">{missionModal.title}</h2>
                        <p className="text-slate-500 font-bold text-xs mb-6 px-4">Faça o upload do Print Screen comprovando a tarefa.</p>

                        <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} className="hidden" id="proof-upload" />
                        <label htmlFor="proof-upload" className="w-full p-6 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200 hover:border-purple-400 transition-all mb-6">
                            <UploadCloud size={24} className={proofFile ? 'text-green-500' : 'text-slate-400'} />
                            <span className="text-xs">{proofFile ? '✅ Print Selecionado' : 'Toque para anexar o Print'}</span>
                        </label>

                        <button onClick={submitMissionProof} disabled={uploadingProof || !proofFile} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${proofFile ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            {uploadingProof ? 'Enviando...' : 'Enviar para Auditoria'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 text-white pt-10 pb-20 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Megaphone size={150} /></div>
                <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <img src={partnerData.imageUrl} alt={partnerData.name} className="w-20 h-20 rounded-full border-4 border-indigo-500 object-cover shadow-lg bg-slate-800" />
                        <div>
                            <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
                                {partnerData.badge || 'Parceiro Oficial'}
                            </span>
                            <h1 className="text-2xl md:text-3xl font-black italic uppercase leading-none truncate">{partnerData.name}</h1>
                            <p className="text-slate-400 font-bold mt-1 text-xs">Acordo: <span className="text-indigo-300">{partnerData.discount}</span></p>
                        </div>
                    </div>
                    <button onClick={() => setIsProfileOpen(true)} className="p-3 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 hover:text-white transition-all shadow-md">
                        <Settings size={20}/>
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 -mt-8 relative z-20 space-y-6">

                {/* ABA 1: RESULTADOS (Com Carteira Financeira) */}
                {activeTab === 'resultados' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="w-full md:w-auto flex-1 overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Link size={12}/> Link Global (Bio do Instagram)</p>
                                <p className="text-sm font-bold text-indigo-600 truncate bg-indigo-50 p-3 rounded-xl border border-indigo-100">{mainTrackingLink}</p>
                            </div>
                            <button onClick={(e) => { 
                                navigator.clipboard.writeText(mainTrackingLink); 
                                e.currentTarget.innerHTML = '✅ COPIADO!';
                                e.currentTarget.classList.replace('bg-indigo-600', 'bg-green-500');
                                setTimeout(() => {
                                    e.target.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copiar Link';
                                    e.target.classList.replace('bg-green-500', 'bg-indigo-600');
                                }, 3000);
                            }} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0">
                                <Copy size={16} /> Copiar Link
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div className="bg-green-50 text-green-600 w-10 h-10 rounded-xl flex items-center justify-center mb-3"><TrendingUp size={20} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vendas Geradas</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-800 italic">R$ {totalSalesValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div className="bg-orange-50 text-orange-600 w-10 h-10 rounded-xl flex items-center justify-center mb-3"><ShoppingBag size={20} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos Feitos</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-800 italic">{orders.length}</p>
                            </div>
                        </div>

                        {/* NOVO: CARTEIRA DE COMISSÕES */}
                        {commissionRate > 0 && (
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[3rem] shadow-2xl border-4 border-emerald-500/30 relative overflow-hidden mt-6">
                                <div className="absolute -top-12 -right-12 bg-emerald-500 w-40 h-40 rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg"><Wallet size={24}/></div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase text-white italic leading-none">Minha Carteira</h3>
                                            <p className="text-[10px] font-medium text-emerald-300 mt-1 uppercase tracking-widest">Comissão: {commissionRate * 100}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                                    <div className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Disponível</p>
                                        <p className="text-3xl font-black text-emerald-400 italic">R$ {availableBalance.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Já Sacado</p>
                                        <p className="text-3xl font-black text-slate-300 italic">R$ {totalWithdrawn.toFixed(2)}</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleRequestWithdraw}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 relative z-10"
                                >
                                    <Banknote size={16}/> Solicitar Saque PIX
                                </button>

                                {withdrawals.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-slate-700 relative z-10">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Histórico de Saques</p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                            {withdrawals.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).map(w => (
                                                <div key={w.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                                    <span className="text-white font-bold text-sm">R$ {Number(w.amount).toFixed(2)}</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${w.status === 'paid' ? 'bg-green-500/20 text-green-400' : w.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {w.status === 'paid' ? 'PAGO' : w.status === 'rejected' ? 'RECUSADO' : 'PENDENTE'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 2: FERRAMENTAS (Cupons e Campanhas) */}
                {activeTab === 'ferramentas' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h3 className="font-black text-slate-800 uppercase flex items-center gap-2 mb-2"><Ticket className="text-indigo-500" size={18} /> Seus Cupons</h3>
                            <p className="text-[10px] text-slate-500 font-bold mb-4">Divulgue este código para seus seguidores garantirem o desconto.</p>
                            
                            {coupons.length === 0 ? (
                                <p className="text-xs font-bold text-slate-400 bg-slate-50 p-4 rounded-xl text-center">Nenhum cupom exclusivo vinculado a você ainda.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {coupons.map(c => (
                                        <div key={c.id} className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-black text-indigo-900 text-lg uppercase leading-none">{c.code}</p>
                                                <p className="text-[10px] font-black uppercase text-indigo-600 mt-1 tracking-widest">
                                                    {c.type === 'percentage' ? `${c.value}% OFF` : `R$ ${c.value} OFF`} 
                                                </p>
                                            </div>
                                            <button onClick={(e) => { 
                                                navigator.clipboard.writeText(c.code); 
                                                e.currentTarget.innerHTML = '<span class="text-[9px]">✅</span>';
                                            }} className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-100 transition-all">
                                                <Copy size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h3 className="font-black text-slate-800 uppercase flex items-center gap-2 mb-2"><Package className="text-orange-500" size={18} /> Gerador de Campanhas</h3>
                            <p className="text-[10px] text-slate-500 font-bold mb-4">Mostre um produto no Stories e gere o link direto para ele com UTM.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">1. Qual produto você vai postar?</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 ring-indigo-500 cursor-pointer"
                                        value={selectedCampaignProduct || ''}
                                        onChange={(e) => setSelectedCampaignProduct(e.target.value)}
                                    >
                                        <option value="">Selecione um produto do cardápio...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {Number(p.price).toFixed(2)})</option>)}
                                    </select>
                                </div>

                                {selectedCampaignProduct && (
                                    <div className="animate-in fade-in zoom-in-95">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">2. Origem do tráfego</label>
                                        <div className="flex gap-2 mb-4">
                                            <button onClick={() => setUtmSource('instagram')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${utmSource === 'instagram' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-slate-400 border-slate-200'}`}>Instagram</button>
                                            <button onClick={() => setUtmSource('tiktok')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${utmSource === 'tiktok' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>TikTok</button>
                                            <button onClick={() => setUtmSource('google')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${utmSource === 'google' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}>Google</button>
                                        </div>

                                        <div className="bg-slate-900 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                            <div className="w-full md:w-auto flex-1 overflow-hidden">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Link Final da Campanha</p>
                                                <p className="text-xs font-bold text-white truncate bg-slate-800 p-2 rounded-lg border border-slate-700">
                                                    {generateTrackingLink(selectedCampaignProduct, utmSource)}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={(e) => { 
                                                    navigator.clipboard.writeText(generateTrackingLink(selectedCampaignProduct, utmSource)); 
                                                    e.currentTarget.innerHTML = '✅ COPIADO';
                                                    e.currentTarget.classList.replace('bg-indigo-500', 'bg-green-500');
                                                    setTimeout(() => {
                                                        e.target.innerHTML = 'Copiar Link';
                                                        e.target.classList.replace('bg-green-500', 'bg-indigo-500');
                                                    }, 3000);
                                                }}
                                                className="w-full md:w-auto bg-indigo-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-400 transition-all flex items-center justify-center gap-1 flex-shrink-0"
                                            >
                                                Copiar Link
                                            </button>
                                        </div>

                                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-xs font-black text-purple-800 uppercase flex items-center gap-1"><Sparkles size={14}/> Travou na Criatividade?</h4>
                                                <p className="text-[10px] text-purple-600 font-bold mt-1">A Inteligência Artificial cria o roteiro do vídeo e a legenda para você.</p>
                                            </div>
                                            <button 
                                                onClick={handleGenerateScript}
                                                className="w-full md:w-auto bg-purple-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-purple-700 active:scale-95 transition-all whitespace-nowrap"
                                            >
                                                Gerar Roteiro Mágico
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 3: MURAL DE MISSÕES */}
                {activeTab === 'missoes' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-700">
                            <h3 className="font-black uppercase italic text-xl mb-2 flex items-center gap-2"><Target className="text-yellow-400"/> Mural de Missões</h3>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                Complete as tarefas abaixo para garantir a qualidade da parceria. Siga os roteiros sugeridos, poste nas redes e envie o print para validação da loja.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">Local SEO</span>
                                    <h4 className="font-black text-slate-800 uppercase mt-2 text-lg leading-tight">Avaliação 5 Estrelas no Google Maps</h4>
                                </div>
                            </div>
                            <div className="space-y-3 text-xs text-slate-600 font-medium mb-6">
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <b>Nota:</b> Marque sempre 5 estrelas no Maps.</p>
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <b>Foto:</b> Anexe uma foto real do lanche recebido.</p>
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <b>Texto Estratégico:</b> Mencione o nome da loja, a qualidade (quente, bem embalado) e a rapidez.</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-2">
                                <button onClick={() => setMissionModal({ isOpen: true, type: 'google_review', title: 'Comprovar Avaliação Google' })} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
                                    <UploadCloud size={14}/> Enviar Print
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">Vídeo Curto</span>
                                    <h4 className="font-black text-slate-800 uppercase mt-2 text-lg leading-tight">Reels ou TikTok (Unboxing)</h4>
                                </div>
                            </div>
                            <div className="space-y-3 text-xs text-slate-600 font-medium mb-6">
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <b>Gancho (3 segs):</b> Comece mostrando a embalagem fechada para gerar curiosidade.</p>
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <b>Ação (Bite):</b> Mostre a textura (cortando a pizza, esticando o queijo, ou a bebida suando).</p>
                                <p className="flex items-start gap-2"><AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5"/> <b>Call to Action:</b> Finalize dizendo "Tem link com desconto na minha bio".</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-2">
                                <button onClick={() => setMissionModal({ isOpen: true, type: 'social_video', title: 'Comprovar Postagem de Vídeo' })} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
                                    <UploadCloud size={14}/> Enviar Print do Post
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-700 flex flex-col h-full mt-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><TrendingUp size={100}/></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">Análise de Dados</span>
                                    <h4 className="font-black text-white uppercase mt-2 text-lg leading-tight">Métricas do Vídeo (Após 48h)</h4>
                                </div>
                            </div>
                            <div className="space-y-3 text-xs text-slate-400 font-medium mb-6 relative z-10">
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-indigo-400 shrink-0 mt-0.5"/> <b>Prazo:</b> Aguarde 2 dias após a postagem do Reels/TikTok.</p>
                                <p className="flex items-start gap-2"><CheckCircle size={16} className="text-indigo-400 shrink-0 mt-0.5"/> <b>O que enviar:</b> Vá em "Ver Insights" no seu vídeo e tire um print mostrando a quantidade de <b>Visualizações, Curtidas e Compartilhamentos</b>.</p>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-700 flex flex-col md:flex-row gap-2 relative z-10">
                                <button onClick={() => setMissionModal({ isOpen: true, type: 'social_metrics', title: 'Comprovar Alcance (Insights)' })} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex justify-center items-center gap-2 shadow-lg active:scale-95">
                                    <TrendingUp size={14}/> Enviar Print das Métricas
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* NAVBAR INFERIOR (Fixo) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center z-40 max-w-3xl mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:rounded-t-3xl md:bottom-2">
                <button onClick={() => setActiveTab('resultados')} className={`flex flex-col items-center gap-1 ${activeTab === 'resultados' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <TrendingUp size={24} className={activeTab === 'resultados' ? 'scale-110 transition-transform' : ''}/>
                    <span className="text-[9px] font-black uppercase tracking-widest">Painel</span>
                </button>
                <button onClick={() => setActiveTab('ferramentas')} className={`flex flex-col items-center gap-1 ${activeTab === 'ferramentas' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Link size={24} className={activeTab === 'ferramentas' ? 'scale-110 transition-transform' : ''}/>
                    <span className="text-[9px] font-black uppercase tracking-widest">Campanhas</span>
                </button>
                <button onClick={() => setActiveTab('missoes')} className={`flex flex-col items-center gap-1 ${activeTab === 'missoes' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Target size={24} className={activeTab === 'missoes' ? 'scale-110 transition-transform' : ''}/>
                    <span className="text-[9px] font-black uppercase tracking-widest">Missões</span>
                </button>
            </div>
        </div>
    );
}