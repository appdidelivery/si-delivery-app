import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    addDoc, query, orderBy, serverTimestamp, setDoc, getDoc, where
} from 'firebase/firestore';
import {
    LayoutDashboard, Clock, ShoppingBag, Package, Users, Plus, Trash2, Edit3,
    Save, X, MessageCircle, Crown, Flame, Trophy, Printer, Bell, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, List, Image, Tags, Search, Calendar, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- CONFIGURAÇÕES DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// --- DIAS DA SEMANA PARA A AGENDA ---
const DAYS_OF_WEEK = [
  { id: 1, label: 'Segunda', short: 'SEG' },
  { id: 2, label: 'Terça', short: 'TER' },
  { id: 3, label: 'Quarta', short: 'QUA' },
  { id: 4, label: 'Quinta', short: 'QUI' },
  { id: 5, label: 'Sexta', short: 'SEX' },
  { id: 6, label: 'Sábado', short: 'SÁB' },
  { id: 0, label: 'Domingo', short: 'DOM' },
];

export default function Admin() {
    const navigate = useNavigate();
    const storeId = getStoreIdFromHostname();
    // --- PROTEÇÃO DE ROTA (SEGURANÇA) ---
    useEffect(() => {
        // Verifica se tem usuário logado. Se não tiver, chuta pro Login.
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) {
                console.warn("Acesso negado: Usuário não logado.");
                navigate('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [navigate]);
    // --- ESTADOS GERAIS ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ promoActive: false, promoBannerUrls: [] });
    const [generalBanners, setGeneralBanners] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    // Estado da Busca
    const [productSearch, setProductSearch] = useState('');
    // --- ESTADOS DE MODAIS E FORMULÁRIOS ---
    // Produtos
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ 
        name: '', price: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0,
        hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false,
        quantityDiscounts: [], recommendedIds: [] // <--- ADICIONE ISTO
    });
    const [editingId, setEditingId] = useState(null);
    // --- Estado para Edição de Pedido ---
    const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
    const [editingOrderData, setEditingOrderData] = useState(null);
    // Estado para o frete do pedido manual
    const [manualShippingFee, setManualShippingFee] = useState(0);
    // Categorias
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [catForm, setCatForm] = useState({ name: '' });
    const [editingCatId, setEditingCatId] = useState(null);

    // Banners
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkTo: '', order: 0, isActive: true });
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [bannerImageFile, setBannerImageFile] = useState(null);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

    // Pedido Manual
    const [manualCart, setManualCart] = useState([]);
    const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' });

    // Uploads
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Loja (Settings)
    const [storeStatus, setStoreStatus] = useState({
        isOpen: true, 
        name: 'Carregando...',
        message: '', // Mensagem de aviso
        storeLogoUrl: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', 
        storeBannerUrl: '/fachada.jpg',
        schedule: {} // Agenda Semanal
    });
    const [logoFile, setLogoFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Promoção Relâmpago
    const [promoBannerFile1, setPromoBannerFile1] = useState(null);
    const [promoBannerFile2, setPromoBannerFile2] = useState(null);
    const [promoBannerFile3, setPromoBannerFile3] = useState(null);
    const [uploadingPromoBanner, setUploadingPromoBanner] = useState(false);

    // Fretes
    const [shippingRates, setShippingRates] = useState([]);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [rateForm, setRateForm] = useState({ neighborhood: '', fee: '' });
    const [editingRateId, setEditingRateId] = useState(null);

    // Cupons
    const [coupons, setCoupons] = useState([]);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [couponForm, setCouponForm] = useState({
        code: '', type: 'percentage', value: 0, minimumOrderValue: 0,
        usageLimit: null, userUsageLimit: null, expirationDate: '',
        firstPurchaseOnly: false, active: true
    });
    const [editingCouponId, setEditingCouponId] = useState(null);

    const navItems = [
        { id: 'dashboard', name: 'Início', icon: <LayoutDashboard size={18} />, mobileIcon: <LayoutDashboard size={22} /> },
        { id: 'orders', name: 'Pedidos', icon: <ShoppingBag size={18} />, mobileIcon: <ShoppingBag size={22} /> },
        { id: 'products', name: 'Estoque', icon: <Package size={18} />, mobileIcon: <Package size={22} /> },
        { id: 'categories', name: 'Categorias', icon: <List size={18} />, mobileIcon: <List size={22} /> },
        { id: 'banners', name: 'Banners', icon: <Image size={18} />, mobileIcon: <Image size={22} /> },
        { id: 'customers', name: 'Clientes VIP', icon: <Users size={18} />, mobileIcon: <Users size={22} /> },
        { id: 'store_settings', name: 'Loja', icon: <Bell size={18} />, mobileIcon: <Bell size={22} /> },
    ];

    const handleLogout = async () => {
        try { await signOut(auth); navigate('/login'); } catch (error) { console.error("Erro logout:", error); }
    };

    // --- LISTENERS FIREBASE ---
    useEffect(() => {
        if (!storeId) return;

        // Pedidos
        const unsubOrders = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeId), orderBy("createdAt", "desc")), (s) => {
            s.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
                }
            });
            setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Produtos
        const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Categorias
        const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Banners
        const unsubGeneralBanners = onSnapshot(query(collection(db, "banners"), where("storeId", "==", storeId), orderBy("order", "asc")), (s) => setGeneralBanners(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Fretes
        const unsubShipping = onSnapshot(query(collection(db, "shipping_rates"), where("storeId", "==", storeId)), (s) => setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))));

        // Configurações (Promoção)
        const mkRef = doc(db, "settings", storeId);
        getDoc(mkRef).then(s => !s.exists() && setDoc(mkRef, { promoActive: false, promoBannerUrls: [], storeId: storeId }, { merge: true }));
        const unsubMk = onSnapshot(mkRef, (d) => d.exists() && setSettings(d.data()));

        // Status da Loja (Nome, Logo, Aberto/Fechado)
        const stRef = doc(db, "stores", storeId);
        getDoc(stRef).then(s => !s.exists() && setDoc(stRef, { 
            name: "Nova Loja", isOpen: true, schedule: {}, 
            message: 'Aberto!', storeLogoUrl: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', 
            storeBannerUrl: '/fachada.jpg', storeId: storeId 
        }, { merge: true }));
        
        const unsubSt = onSnapshot(stRef, (d) => {
            if (d.exists()) {
                const data = d.data();
                setStoreStatus({
                    ...data,
                    schedule: data.schedule || {} // Garante que schedule existe
                });
            } else {
                setStoreStatus(prev => ({...prev, name: storeId}));
            }
        });
        
        // Cupons
        const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("storeId", "==", storeId)), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { 
            unsubOrders(); unsubProducts(); unsubCategories(); unsubGeneralBanners();
            unsubShipping(); unsubMk(); unsubSt(); unsubCoupons();
        };
    }, [storeId]);

    // --- FUNÇÕES AUXILIARES ---
    const uploadImageToCloudinary = async (file) => {
        if (!file) throw new Error("Selecione um arquivo primeiro!");
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Falha no upload.');
        const data = await response.json();
        return data.secure_url;
    };

    const handleProductImageUpload = async () => {
        setUploading(true); setUploadError('');
        try {
            const url = await uploadImageToCloudinary(imageFile);
            setForm(prev => ({ ...prev, imageUrl: url }));
            setImageFile(null);
        } catch (error) { console.error(error); setUploadError('Erro ao enviar imagem.'); } 
        finally { setUploading(false); }
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return; setUploadingLogo(true);
        try {
            const url = await uploadImageToCloudinary(logoFile);
            await updateDoc(doc(db, "stores", storeId), { storeLogoUrl: url }); 
            setLogoFile(null); alert("Logo atualizada!");
        } catch (e) { alert("Erro upload logo"); } setUploadingLogo(false);
    };

    const handleBannerUpload = async () => {
        if (!bannerFile) return; setUploadingBanner(true);
        try {
            const url = await uploadImageToCloudinary(bannerFile);
            await updateDoc(doc(db, "stores", storeId), { storeBannerUrl: url }); 
            setBannerFile(null); alert("Banner atualizado!");
        } catch (e) { alert("Erro upload banner"); } setUploadingBanner(false);
    };

    const handlePromoBannerUpload = async () => {
        setUploadingPromoBanner(true);
        const bannerFiles = [promoBannerFile1, promoBannerFile2, promoBannerFile3].filter(file => file !== null);
        const uploadPromises = bannerFiles.map(file => uploadImageToCloudinary(file).catch(e => null));
        try {
            const bannerUrls = await Promise.all(uploadPromises);
            const filteredBannerUrls = bannerUrls.filter(url => url !== null);
            await updateDoc(doc(db, "settings", storeId), { promoBannerUrls: filteredBannerUrls }, { merge: true });
            setPromoBannerFile1(null); setPromoBannerFile2(null); setPromoBannerFile3(null);
            alert("Banners salvos!");
        } catch (e) { alert("Erro ao salvar banners"); } setUploadingPromoBanner(false);
    };

    const handleGeneralBannerImageUpload = async () => {
        setUploadingBannerImage(true);
        try {
            const url = await uploadImageToCloudinary(bannerImageFile);
            setBannerForm(prev => ({ ...prev, imageUrl: url }));
            setBannerImageFile(null);
        } catch (error) { alert('Erro ao enviar imagem.'); } finally { setUploadingBannerImage(false); }
    };

    // --- ATUALIZAÇÃO DA AGENDA SEMANAL ---
    const handleScheduleChange = (dayId, field, value) => {
        const currentSchedule = storeStatus.schedule || {};
        const newSchedule = {
            ...currentSchedule,
            [dayId]: {
                ...currentSchedule[dayId],
                [field]: value
            }
        };
        // Atualiza localmente para feedback rápido
        setStoreStatus(prev => ({ ...prev, schedule: newSchedule }));
        // Salva no Firebase
        updateDoc(doc(db, "stores", storeId), { schedule: newSchedule });
    };

    const printLabel = (o) => {
        const w = window.open('', '_blank');
        const itemsHtml = (o.items || []).map(i => `<li>• ${i.quantity}x ${i.name}</li>`).join('');
        const pagto = { pix: 'PIX', cartao: 'CARTÃO', dinheiro: 'DINHEIRO' }[o.paymentMethod] || o.paymentMethod || 'PIX';
        
        // Formata a data
        const dataPedido = o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

        const gerarVia = (titulo, temCorte) => `
            <div style="width: 280px; padding: 10px; font-family: sans-serif; border-bottom: ${temCorte ? '2px dashed #000' : 'none'}; padding-bottom: 20px; margin-bottom: 40px;">
                <center>
                    <small>-- ${titulo} --</small>
                    <h2>${storeStatus.name || 'DELIVERY'}</h2>
                    <small>${dataPedido}</small>
                </center>
                <hr>
                <strong>PEDIDO:</strong> #${o.id?.slice(-5).toUpperCase()}<br>
                <strong>CLIENTE:</strong> ${o.customerName}<br>
                <strong>TEL:</strong> ${o.customerPhone || o.phone || ''}<br>
                <strong>ENDEREÇO:</strong> ${o.address || o.customerAddress || 'Retirada'}<br>
                <strong>PAGTO:</strong> ${pagto}<br>
                ${o.customerChangeFor ? `<p><strong>TROCO PARA:</strong> ${o.customerChangeFor}</p>` : ''}
                <hr>
                <ul style="list-style:none; padding:0;">${itemsHtml}</ul>
                <hr>
                
                ${/* --- AQUI ESTÁ A CORREÇÃO DA OBSERVAÇÃO --- */ ''}
                ${o.observation ? `<div style="background:#eee; padding:5px; margin: 10px 0; border:1px solid #000;"><strong>OBS: ${o.observation}</strong></div>` : ''}

                <div style="text-align:right; font-size:18px;">
                    <small>Frete: R$ ${Number(o.shippingFee || 0).toFixed(2)}</small><br>
                    <strong>TOTAL: R$ ${Number(o.total || 0).toFixed(2)}</strong>
                </div>
                ${temCorte ? '<center><br>✂--- CORTE AQUI ---✂</center>' : ''}
            </div>
        `;
        w.document.write(`<html><body style="margin:0; padding:0;">${gerarVia('VIA DA LOJA', true)}${gerarVia('VIA DO ENTREGADOR', false)}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>`);
        w.document.close();
    };

    const updateStatusAndNotify = async (order, newStatus) => {
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        const lojaNome = storeStatus.name || "Velo Delivery";
        const messages = {
            preparing: `👨‍🍳 *PEDIDO EM PREPARO!* \n\nOlá ${order.customerName.split(' ')[0]}, seu pedido foi recebido e já está sendo preparado aqui na *${lojaNome}*.`,
            delivery: `🏍️ *SAIU PARA ENTREGA!* \n\nO motoboy já está a caminho com o seu pedido #${order.id.slice(-5).toUpperCase()}.`,
            completed: `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega. Muito obrigado pela preferência na *${lojaNome}*!`,
            canceled: `❌ *PEDIDO CANCELADO* \n\nO pedido #${order.id.slice(-5).toUpperCase()} foi cancelado.`
        };
        if (messages[newStatus]) {
            const phone = order.customerPhone.replace(/\D/g, '');
            if(phone) window.open(`https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${encodeURIComponent(messages[newStatus])}`, '_blank');
        }
    };

    const handleAddQuantityDiscount = () => setForm(prev => ({ ...prev, quantityDiscounts: [...prev.quantityDiscounts, { minQuantity: 1, type: 'percentage', value: 0, description: '' }] }));
    const handleUpdateQuantityDiscount = (index, field, value) => { const newDiscounts = [...form.quantityDiscounts]; newDiscounts[index][field] = value; setForm(prev => ({ ...prev, quantityDiscounts: newDiscounts })); };
    const handleRemoveQuantityDiscount = (index) => setForm(prev => ({ ...prev, quantityDiscounts: prev.quantityDiscounts.filter((_, i) => i !== index) }));

    const handleSaveGeneralBanner = async (e) => {
        e.preventDefault();
        const dataToSave = { ...bannerForm, order: Number(bannerForm.order), storeId: storeId };
        try {
            if (editingBannerId) await updateDoc(doc(db, "banners", editingBannerId), dataToSave);
            else await addDoc(collection(db, "banners"), dataToSave);
            setIsBannerModalOpen(false); alert("Banner salvo!");
        } catch (error) { alert("Erro ao salvar banner."); console.error(error); }
    };

    const handleInitialSetup = async () => {
        if (!window.confirm("Gerar loja completa AGORA?")) return;
        try {
            const batchPromises = [];
            const storeConfig = {
                name: "Minha Loja Digital", slug: storeId, logoUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
                primaryColor: "#2563eb", promoTitle: "Ofertas do App! 📲", promoBannerUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081395.png",
                whatsapp: "5511999999999"
            };
            await setDoc(doc(db, "stores", storeId), storeConfig, { merge: true });
            const cats = [{ name: "Cervejas", order: 1, storeId }, { name: "Destilados", order: 2, storeId }, { name: "Gelo e Carvão", order: 3, storeId }];
            for (const c of cats) batchPromises.push(addDoc(collection(db, "categories"), c));
            const prods = [
                { name: "Heineken Long Neck", price: 9.90, stock: 120, category: "Cervejas", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405597.png", storeId, description: "Cerveja gelada." },
                { name: "Vodka Premium", price: 89.90, stock: 15, category: "Destilados", imageUrl: "https://cdn-icons-png.flaticon.com/512/920/920582.png", storeId, description: "Vodka importada." },
                { name: "Gelo em Cubos", price: 12.00, stock: 50, category: "Gelo e Carvão", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405479.png", storeId, description: "Gelo filtrado." }
            ];
            for (const p of prods) batchPromises.push(addDoc(collection(db, "products"), p));
            alert("✨ Loja App Gerada!"); window.location.reload();
        } catch (e) { alert("Erro: " + e.message); }
    };

    const customers = Object.values(orders.reduce((acc, o) => {
        const p = o.customerPhone || 'N/A';
        if (!acc[p]) acc[p] = { name: o.customerName || 'Sem nome', phone: p, total: 0, count: 0 };
        acc[p].total += Number(o.total || 0); acc[p].count += 1; return acc;
    }, {})).sort((a, b) => b.total - a.total);

    // RENDERIZAÇÃO PRINCIPAL
    if (products.length === 0 && activeTab === 'dashboard') {
        const leadPhone = new URLSearchParams(window.location.search).get('phone');
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="animate-bounce mb-4 text-6xl">🚀</div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 italic tracking-tighter uppercase">Olá, {leadPhone ? 'Parceiro' : 'Empreendedor'}!</h1>
                    <p className="text-xl text-slate-600">O ambiente da sua loja <b>"{storeId}"</b> foi criado.<br/>Para começar a vender, precisamos gerar seu catálogo.</p>
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-blue-50 transform hover:scale-105 transition-all cursor-pointer" onClick={handleInitialSetup}>
                        <h2 className="text-2xl font-black text-blue-600 mb-2">⚡ Setup Automático</h2>
                        <p className="text-slate-400 mb-6 font-bold text-sm">Clique para gerar produtos e configurações.</p>
                        <button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700">Gerar Minha Loja Agora</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
            <aside className="w-64 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col sticky top-0 h-screen">
                <div className="flex flex-col items-center mb-10">
                    <img src={storeStatus.storeLogoUrl} className="h-16 w-16 rounded-full border-4 border-blue-50 mb-4 object-cover" onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
                    <p className="text-[10px] font-bold text-blue-600 uppercase text-center">{storeStatus.name}</p>
                </div>
                <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
                    {[...navItems, { id: 'manual', name: 'Lançar Pedido', icon: <PlusCircle size={18} /> }, { id: 'marketing', name: 'Marketing', icon: <Trophy size={18} /> }]
                        .map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                {item.icon} {item.name}
                            </button>
                        ))}
                </nav>
                <button onClick={handleLogout} className="mt-6 w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase"><LogOut size={18} /> Sair</button>
            </aside>

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Visão Geral</h1>
                            <button onClick={() => setIsReportModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95">
                                <Printer size={20}/> Fechar Caixa / Relatório
                            </button>
                        </div>
                        {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] animate-pulse">
                                <h3 className="text-red-600 font-black flex items-center gap-2"><Flame size={20} /> ALERTA: ESTOQUE CRÍTICO</h3>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).map(p => <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100">{p.name} ({p.stock} un)</span>)}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 z-10 relative">Faturamento Hoje</p>
                                <p className="text-4xl font-black text-green-500 italic z-10 relative">R$ {orders.filter(o => o.status !== 'canceled' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).reduce((a, b) => a + (Number(b.total) || 0), 0).toFixed(2)}</p>
                                <div className="absolute -right-4 -bottom-4 text-green-50 opacity-20"><Trophy size={120}/></div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Pedidos Hoje</p>
                                <p className="text-4xl font-black text-blue-600 italic">{orders.filter(o => new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).length}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Ticket Médio</p>
                                <p className="text-4xl font-black text-purple-500 italic">R$ {(orders.filter(o => o.status !== 'canceled').reduce((a, b) => a + (Number(b.total) || 0), 0) / (orders.filter(o => o.status !== 'canceled').length || 1)).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black italic uppercase mb-8">Pedidos</h1>
                        {orders.map(o => (
                            <div key={o.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex flex-col mb-2">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">#{o.id ? o.id.slice(-6).toUpperCase() : 'ID'}</span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} />{o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight">{o.customerName}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{typeof o.address === 'object' ? `${o.address.street}, ${o.address.number} - ${o.address.neighborhood}` : o.address}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-2xl font-black text-green-600 mr-4">R$ {Number(o.total).toFixed(2)}</p>
                                    <button 
                                        onClick={() => {
                                            setEditingOrderData(JSON.parse(JSON.stringify(o))); // Cria uma cópia segura
                                            setIsOrderEditModalOpen(true);
                                        }} 
                                        className="p-3 bg-slate-100 rounded-xl hover:bg-orange-100 text-orange-600 mr-2"
                                        title="Editar Pedido"
                                    >
                                        <Edit3 size={20} />
                                    </button>
                                    <button onClick={() => printLabel(o)} className="p-3 bg-slate-100 rounded-xl hover:bg-blue-100 text-blue-600"><Printer size={20} /></button>
                                    <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g, '')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl"><MessageCircle size={20} /></a>
                                    <select value={o.status} onChange={(e) => updateStatusAndNotify(o, e.target.value)} className="p-4 rounded-2xl font-black text-[10px] uppercase border-none outline-none cursor-pointer bg-blue-50 text-blue-800">
                                        <option value="pending">⏳ Pendente</option><option value="preparing">👨‍🍳 Preparando</option><option value="delivery">🏍️ Em Rota</option><option value="completed">✅ Entregue</option><option value="canceled">❌ Cancelado</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Categorias</h1>
                            <button onClick={() => { setEditingCatId(null); setCatForm({ name: '' }); setIsCatModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVA CATEGORIA</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {categories.map(c => (
                                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                                    <span className="font-bold text-lg">{c.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingCatId(c.id); setCatForm(c); setIsCatModalOpen(true); }} className="p-2 bg-slate-50 rounded-lg text-blue-600"><Edit3 size={16} /></button>
                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "categories", c.id))} className="p-2 bg-slate-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Banners Gerais</h1>
                            <button onClick={() => { setEditingBannerId(null); setBannerForm({ imageUrl: '', linkTo: '', order: 0, isActive: true }); setIsBannerModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO BANNER</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {generalBanners.map(b => (
                                <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                    <img src={b.imageUrl} className="w-24 h-24 object-contain rounded-2xl bg-slate-50 p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight mb-1">Ordem: {b.order}</p>
                                        <p className="text-blue-600 font-black break-all text-xs">Link: {b.linkTo}</p>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-2 inline-block ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.isActive ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setEditingBannerId(b.id); setBannerForm(b); setIsBannerModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>
                                        <button onClick={() => window.confirm("Excluir banner?") && deleteDoc(doc(db, "banners", b.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Estoque</h1>
                            <button onClick={() => { setEditingId(null); setForm({ name: '', price: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0, hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false, quantityDiscounts: [] }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
                        </div>
                        {/* --- BARRA DE BUSCA --- */}
                        <div className="mb-6 mt-6 relative">
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar produto por nome..." 
                                className="w-full p-4 pl-12 rounded-2xl border-none bg-white shadow-sm font-bold text-slate-600 focus:ring-2 ring-blue-500 outline-none"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                            {productSearch && (
                                <button onClick={() => setProductSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500">
                                    <X size={20}/>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{products.filter(p => 
                                p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                p.category.toLowerCase().includes(productSearch.toLowerCase())
                            ).map(p => (                                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                    <img src={p.imageUrl} className="w-20 h-20 object-contain rounded-2xl bg-slate-50 p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                                        <p className="text-blue-600 font-black">R$ {Number(p.price)?.toFixed(2)}</p>
                                        <p className={`text-xs font-bold mt-1 ${p.stock <= 2 ? 'text-red-500' : 'text-slate-400'}`}>Estoque: {p.stock !== undefined ? p.stock : 'N/A'}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setEditingId(p.id); setForm({ ...p, quantityDiscounts: p.quantityDiscounts || [] }); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>
                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "products", p.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 mb-10 text-center">RANKING VIP</h1>
                        <div className="grid gap-4 max-w-4xl mx-auto">
                            {customers.map((c, i) => (
                                <div key={i} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex items-center justify-between hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${i === 0 ? 'bg-amber-400 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>{i === 0 ? <Crown /> : i + 1}</div>
                                        <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{c.name}</h3><p className="text-slate-400 font-bold text-xs tracking-widest">{c.phone}</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Total Comprado</p><p className="text-3xl font-black text-blue-600 italic">R$ {c.total.toFixed(2)}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* --- COLUNA ESQUERDA: DADOS DO CLIENTE --- */}
                        <div className="space-y-6">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Novo Pedido</h1>
                            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-4 border border-slate-100">
                                <input type="text" placeholder="Nome do Cliente" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.name} onChange={e => setManualCustomer({ ...manualCustomer, name: e.target.value })} />
                                <input type="text" placeholder="Endereço (Rua e Número)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.address} onChange={e => setManualCustomer({ ...manualCustomer, address: e.target.value })} />
                                
                                {/* SELETOR DE FRETE */}
                                <select 
                                    className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600 cursor-pointer"
                                    onChange={(e) => {
                                        const selectedRate = shippingRates.find(r => r.neighborhood === e.target.value);
                                        setManualShippingFee(selectedRate ? parseFloat(selectedRate.fee) : 0);
                                        setManualCustomer({ ...manualCustomer, neighborhood: e.target.value });
                                    }}
                                >
                                    <option value="">Selecione o Bairro (Calcular Frete)</option>
                                    {shippingRates.map(rate => (
                                        <option key={rate.id} value={rate.neighborhood}>
                                            {rate.neighborhood} (+ R$ {Number(rate.fee).toFixed(2)})
                                        </option>
                                    ))}
                                </select>

                                <input type="tel" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.phone} onChange={e => setManualCustomer({ ...manualCustomer, phone: e.target.value })} />
                                
                                <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.payment} onChange={e => setManualCustomer({ ...manualCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? manualCustomer.changeFor : '' })}>
                                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
                                </select>
                                
                                {manualCustomer.payment === 'dinheiro' && <input type="text" placeholder="Troco para qual valor?" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.changeFor} onChange={e => setManualCustomer({ ...manualCustomer, changeFor: e.target.value })} />}
                                
                                <div className="pt-6 border-t border-slate-100">
                                    {/* LISTA DE ITENS NO CARRINHO */}
                                    {manualCart.length === 0 ? (
                                        <p className="text-center text-slate-400 font-bold text-sm py-4">Nenhum produto selecionado.</p>
                                    ) : (
                                        manualCart.map(i => (
                                            <div key={i.id} className="flex justify-between items-center mb-2 font-bold text-slate-600 text-sm bg-slate-50 p-2 rounded-lg">
                                                <span>{i.quantity}x {i.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span>R$ {(i.price * i.quantity).toFixed(2)}</span>
                                                    <button 
                                                        onClick={() => setManualCart(manualCart.filter(item => item.id !== i.id))}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    
                                    <div className="flex justify-between mb-2 font-bold text-blue-600 text-sm border-t border-dashed pt-4 mt-2">
                                        <span>Taxa de Entrega:</span>
                                        <span>R$ {manualShippingFee.toFixed(2)}</span>
                                    </div>

                                    <div className="text-3xl font-black text-slate-900 mt-4 italic">
                                        Total R$ {(manualCart.reduce((a, i) => a + (i.price * i.quantity), 0) + manualShippingFee).toFixed(2)}
                                    </div>
                                    
                                    <button onClick={async () => {
                                        if (!manualCustomer.name || !manualCustomer.address || !manualCustomer.phone || manualCart.length === 0) return alert("Preencha tudo e adicione produtos!");
                                        
                                        const subtotal = manualCart.reduce((a, i) => a + (i.price * i.quantity), 0);
                                        const totalWithShipping = subtotal + manualShippingFee;
                                        const finalAddress = `${manualCustomer.address} - ${manualCustomer.neighborhood || ''}`;

                                        await addDoc(collection(db, "orders"), { 
                                            ...manualCustomer, 
                                            customerName: manualCustomer.name, 
                                            customerAddress: finalAddress, 
                                            customerPhone: manualCustomer.phone, 
                                            items: manualCart, 
                                            shippingFee: manualShippingFee, 
                                            total: totalWithShipping, 
                                            status: 'pending', 
                                            createdAt: serverTimestamp(), 
                                            customerChangeFor: manualCustomer.payment === 'dinheiro' ? manualCustomer.changeFor : '', 
                                            storeId: storeId 
                                        });
                                        
                                        setManualCart([]); 
                                        setManualCustomer({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' }); 
                                        setManualShippingFee(0); 
                                        alert("Pedido Lançado com Sucesso!");
                                    }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase mt-6 shadow-xl hover:bg-blue-700 transition-all">
                                        Confirmar Pedido
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- COLUNA DIREITA: SELEÇÃO DE PRODUTOS --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-fit sticky top-6">
                            <h2 className="text-xl font-black uppercase mb-6 text-slate-300">Adicionar Produtos</h2>
                            
                            {/* Busca Rápida no Manual (Bônus) */}
                            <div className="mb-4 relative">
                                <input 
                                    type="text" 
                                    placeholder="Filtrar produtos..." 
                                    className="w-full p-3 pl-10 bg-slate-50 rounded-xl font-bold text-sm"
                                    onChange={(e) => {
                                        const term = e.target.value.toLowerCase();
                                        document.querySelectorAll('.manual-product-item').forEach(el => {
                                            const name = el.getAttribute('data-name').toLowerCase();
                                            el.style.display = name.includes(term) ? 'flex' : 'none';
                                        });
                                    }}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            </div>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {products.map(p => (
                                    <button 
                                        key={p.id} 
                                        className="manual-product-item w-full p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200 group"
                                        data-name={p.name}
                                        onClick={() => {
                                            const ex = manualCart.find(it => it.id === p.id);
                                            if (ex) setManualCart(manualCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it)); 
                                            else setManualCart([...manualCart, { ...p, quantity: 1 }]);
                                        }} 
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            {p.imageUrl && <img src={p.imageUrl} className="w-8 h-8 object-contain rounded-md bg-white"/>}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 leading-tight">{p.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">Estoque: {p.stock}</span>
                                            </div>
                                        </div>
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black group-hover:scale-110 transition-transform">
                                            R$ {Number(p.price).toFixed(2)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marketing' && (
                    <div className="mt-6 px-4">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 custom-scrollbar">
            {/* Banner 1 */}
            {storeSettings.promoBannerUrl && (
                <div className="snap-center shrink-0 w-full md:w-[400px]">
                    <img 
                        src={storeSettings.promoBannerUrl} 
                        className="w-full h-48 object-cover rounded-3xl shadow-lg border border-slate-100"
                        alt="Promoção 1"
                    />
                </div>
            )}
            
            {/* Banner 2 */}
            {storeSettings.promoBannerUrl2 && (
                <div className="snap-center shrink-0 w-full md:w-[400px]">
                    <img 
                        src={storeSettings.promoBannerUrl2} 
                        className="w-full h-48 object-cover rounded-3xl shadow-lg border border-slate-100"
                        alt="Promoção 2"
                    />
                </div>
            )}

            {/* Banner 3 */}
            {storeSettings.promoBannerUrl3 && (
                <div className="snap-center shrink-0 w-full md:w-[400px]">
                    <img 
                        src={storeSettings.promoBannerUrl3} 
                        className="w-full h-48 object-cover rounded-3xl shadow-lg border border-slate-100"
                        alt="Promoção 3"
                    />
                </div>
            )}
        </div>
                    </div>
                )}

                {activeTab === 'store_settings' && (
                    <div className="space-y-8">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Configurações</h1>
                        
                        {/* 1. Status Geral (Botão Gigante) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Controle Mestre</h2>
                            <button onClick={() => updateDoc(doc(db, "stores", storeId), { isOpen: !storeStatus.isOpen }, { merge: true })} className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-widest transition-all ${storeStatus.isOpen ? 'bg-green-500 text-white shadow-xl shadow-green-200' : 'bg-red-500 text-white shadow-xl shadow-red-200'}`}>{storeStatus.isOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}</button>
                            <p className="mt-4 text-xs font-bold text-slate-400">Isso abre ou fecha a loja manualmente, ignorando o horário.</p>
                        </div>

                        {/* 2. Informações e Mensagem */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Dados da Loja</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Nome da Loja</label>
                                    <input type="text" placeholder="Nome da Loja" value={storeStatus.name} onChange={(e) => updateDoc(doc(db, "stores", storeId), { name: e.target.value }, { merge: true })} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2"><MessageSquare size={14}/> Mensagem / Aviso (Aparece no Topo)</label>
                                    <input type="text" placeholder="Ex: Voltamos em 15min / Promoção de Carnaval" value={storeStatus.message || ''} onChange={(e) => updateDoc(doc(db, "stores", storeId), { message: e.target.value }, { merge: true })} className="w-full p-5 bg-blue-50 text-blue-700 rounded-2xl font-bold border-none placeholder-blue-300" />
                                    {/* --- NOVO CAMPO: Slogan / Descrição --- */}
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                    <Tags size={14}/> Slogan / Descrição do Banner
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Bebidas geladas, carvão e entrega rápida." 
                                    value={storeStatus.slogan || ''} 
                                    onChange={(e) => updateDoc(doc(db, "stores", storeId), { slogan: e.target.value }, { merge: true })} 
                                    className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600" 
                                />
                            </div>
                            {/* --- NOVO CAMPO: WhatsApp do Pedido --- */}
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <MessageCircle size={14}/> WhatsApp para Receber Pedidos
                                    </label>
                                    <input 
                                        type="tel" 
                                        placeholder="Ex: 5551999999999 (DDD + Número)" 
                                        value={storeStatus.whatsapp || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { whatsapp: e.target.value }, { merge: true })} 
                                        className="w-full p-5 bg-green-50 text-green-700 rounded-2xl font-bold border-none placeholder-green-300" 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Digite apenas números com DDD (ex: 55519...). É para esse número que o cliente será enviado.</p>
                                </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Horários da Semana (NOVO!) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                                <Calendar size={24}/> Horários de Funcionamento
                            </h2>
                            <div className="space-y-3">
                                {DAYS_OF_WEEK.map(day => {
                                    const dayConfig = (storeStatus.schedule && storeStatus.schedule[day.id]) || { open: false, start: '08:00', end: '23:00' };
                                    return (
                                        <div key={day.id} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border-2 transition-all ${dayConfig.open ? 'bg-white border-blue-100' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                            <div className="flex items-center gap-4 w-full md:w-32">
                                                <input 
                                                    type="checkbox" 
                                                    checked={dayConfig.open} 
                                                    onChange={(e) => handleScheduleChange(day.id, 'open', e.target.checked)}
                                                    className="w-6 h-6 rounded-md accent-blue-600 cursor-pointer"
                                                />
                                                <span className="font-black text-slate-700 uppercase">{day.label}</span>
                                            </div>
                                            
                                            {dayConfig.open && (
                                                <div className="flex items-center gap-2 flex-1 w-full">
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.start} 
                                                        onChange={(e) => handleScheduleChange(day.id, 'start', e.target.value)}
                                                        className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                    />
                                                    <span className="font-bold text-slate-300">até</span>
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.end} 
                                                        onChange={(e) => handleScheduleChange(day.id, 'end', e.target.value)}
                                                        className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Mídia da Loja</h2>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col items-center gap-4 border-b pb-6"><img src={logoFile ? URL.createObjectURL(logoFile) : storeStatus.storeLogoUrl} className="w-24 h-24 object-contain rounded-full border-2 border-blue-50" /><input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" id="logo-upload" /><label htmlFor="logo-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Logo</label>{logoFile && <button onClick={handleLogoUpload} disabled={uploadingLogo} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Logo</button>}</div>
                                <div className="flex flex-col items-center gap-4"><img src={bannerFile ? URL.createObjectURL(bannerFile) : storeStatus.storeBannerUrl} className="w-full h-32 object-cover rounded-xl" /><input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files[0])} className="hidden" id="banner-upload" /><label htmlFor="banner-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Banner</label>{bannerFile && <button onClick={handleBannerUpload} disabled={uploadingBanner} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Banner</button>}</div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 uppercase">Fretes</h2><button onClick={() => { setEditingRateId(null); setRateForm({ neighborhood: '', fee: '' }); setIsRateModalOpen(true); }} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-xs">+ TAXA</button></div>
                            <div className="space-y-2">{shippingRates.map(rate => (<div key={rate.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"><span className="font-bold text-slate-700">{rate.neighborhood}</span><div className="flex items-center gap-4"><span className="font-black text-blue-600">R$ {Number(rate.fee).toFixed(2)}</span><button onClick={() => { setEditingRateId(rate.id); setRateForm(rate); setIsRateModalOpen(true); }} className="p-2 text-blue-600"><Edit3 size={16} /></button><button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "shipping_rates", rate.id))} className="p-2 text-red-600"><Trash2 size={16} /></button></div></div>))}</div>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around lg:hidden z-50">
                {navItems.map(item => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>{item.mobileIcon} <span className="text-[10px] font-bold">{item.name}</span></button>))}
            </nav>

            {/* MODAIS (CÓDIGO MANTIDO IGUAL AO SEU) */}
            <AnimatePresence>
                {isCatModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
                            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X /></button>
                            <h2 className="text-2xl font-black uppercase mb-6">{editingCatId ? 'Editar' : 'Nova'} Categoria</h2>
                            <form onSubmit={async (e) => { e.preventDefault(); try { const dataToSave = { ...catForm, storeId: storeId }; if (editingCatId) await updateDoc(doc(db, "categories", editingCatId), dataToSave); else await addDoc(collection(db, "categories"), dataToSave); setIsCatModalOpen(false); alert("Categoria salva!"); } catch (error) { alert("Erro ao salvar."); } }}>
                                <input type="text" placeholder="Nome da Categoria" className="w-full p-4 bg-slate-50 rounded-xl font-bold mb-4" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                                <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Salvar</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isBannerModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsBannerModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingBannerId ? 'Editar' : 'Novo'} Banner</h2>
                            <form onSubmit={handleSaveGeneralBanner} className="space-y-6">
                                <input type="text" placeholder="Link do Banner" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.linkTo} onChange={e => setBannerForm({ ...bannerForm, linkTo: e.target.value })} required />
                                <input type="number" placeholder="Ordem" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.order} onChange={e => setBannerForm({ ...bannerForm, order: e.target.value })} required />
                                <div className="space-y-3">
                                    {(bannerImageFile || bannerForm.imageUrl) && <img src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : bannerForm.imageUrl} className="w-full h-40 object-contain rounded-2xl bg-slate-50" />}
                                    <input type="file" accept="image/*" onChange={(e) => setBannerImageFile(e.target.files[0])} className="hidden" id="banner-general-image-upload" />
                                    <label htmlFor="banner-general-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">{bannerImageFile ? bannerImageFile.name : (bannerForm.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20} /></label>
                                    {bannerImageFile && <button type="button" onClick={handleGeneralBannerImageUpload} disabled={uploadingBannerImage} className={`w-full p-4 rounded-3xl font-black text-white ${uploadingBannerImage ? 'bg-blue-400' : 'bg-blue-600'}`}>{uploadingBannerImage ? 'Enviando...' : 'Confirmar Upload'}</button>}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Banner</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingId ? 'Editar' : 'Novo'} Item</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock || 0), storeId: storeId };
                                if (editingId) { await updateDoc(doc(db, "products", editingId), data); } else { await addDoc(collection(db, "products"), data); }
                                setIsModalOpen(false); setImageFile(null);
                            }} className="space-y-6">
                                <input type="text" placeholder="Nome do Produto" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" step="0.01" placeholder="Preço" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                                    <input type="number" placeholder="Estoque" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                                </div>
                                <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Selecione a Categoria</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <div className="space-y-2 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Flame size={14} className="text-orange-500"/> Compre Junto (Upsell)
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold mb-2">Selecione produtos para sugerir no carrinho:</p>
                                    
                                    <div className="flex gap-2 flex-wrap bg-slate-50 p-4 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                                        {products.filter(p => p.id !== editingId).map(p => {
                                            const isSelected = (form.recommendedIds || []).includes(p.id);
                                            return (
                                                <button 
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = form.recommendedIds || [];
                                                        setForm({
                                                            ...form, 
                                                            recommendedIds: isSelected 
                                                                ? current.filter(id => id !== p.id) 
                                                                : [...current, p.id]
                                                        });
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center gap-2 ${
                                                        isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                    {p.name}
                                                </button>
                                            );
                                        })}
                                        {products.length <= 1 && <p className="text-xs text-slate-400 italic">Cadastre mais produtos para fazer recomendações.</p>}
                                    </div>
                                </div>
                                <div className="space-y-3 pt-6 border-t border-slate-100">
                                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" id="product-image-upload" />
                                    <label htmlFor="product-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">{imageFile ? imageFile.name : (form.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20} /></label>
                                    {imageFile && (<button type="button" onClick={handleProductImageUpload} disabled={uploading} className={`w-full p-4 rounded-3xl font-black text-white ${uploading ? 'bg-blue-400' : 'bg-blue-600'}`}>{uploading ? 'Enviando...' : 'Confirmar Upload'}</button>)}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Item</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isRateModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsRateModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingRateId ? 'Editar' : 'Nova'} Taxa</h2>
                            <form onSubmit={async (e) => { e.preventDefault(); try { const data = { neighborhood: rateForm.neighborhood, fee: parseFloat(rateForm.fee), storeId: storeId }; if (editingRateId) await updateDoc(doc(db, "shipping_rates", editingRateId), data); else await addDoc(collection(db, "shipping_rates"), data); setIsRateModalOpen(false); } catch (error) { alert(error.message); } }} className="space-y-4">
                                <input type="text" placeholder="Nome do Bairro" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.neighborhood} onChange={e => setRateForm({ ...rateForm, neighborhood: e.target.value })} required />
                                <input type="number" step="0.01" placeholder="Valor do Frete" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.fee} onChange={e => setRateForm({ ...rateForm, fee: e.target.value })} required />
                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase">Salvar</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCouponModalOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsCouponModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
                            <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingCouponId ? 'Editar' : 'Novo'} Cupom</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const dataToSave = { ...couponForm, code: couponForm.code.toUpperCase(), createdAt: serverTimestamp(), storeId: storeId };
                                try { if (editingCouponId) await updateDoc(doc(db, "coupons", editingCouponId), dataToSave); else await addDoc(collection(db, "coupons"), dataToSave); setIsCouponModalOpen(false); alert("Cupom salvo!"); } catch (error) { alert("Erro: " + error.message); }
                            }} className="space-y-4">
                                <input type="text" placeholder="Código (ex: VIP10)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} required />
                                <div className="flex gap-4"><select className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})}><option value="percentage">%</option><option value="fixed_amount">R$</option></select><input type="number" placeholder="Valor" className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.value} onChange={e => setCouponForm({...couponForm, value: e.target.value})} required /></div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase">Salvar Cupom</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl">
                            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-800"><X /></button>
                            <h2 className="text-3xl font-black italic uppercase mb-2 text-slate-900">Fechamento</h2>
                            {(() => {
                                const today = new Date().toDateString();
                                const filteredOrders = orders.filter(o => o.status !== 'canceled' && (reportPeriod === 'today' ? new Date(o.createdAt?.toDate()).toDateString() === today : true));
                                const total = filteredOrders.reduce((a, b) => a + (Number(b.total) || 0), 0);
                                return (
                                    <div className="space-y-6">
                                        <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-xl"><button onClick={() => setReportPeriod('today')} className={`flex-1 py-3 rounded-lg font-black text-[10px] uppercase transition-all ${reportPeriod === 'today' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Hoje</button><button onClick={() => setReportPeriod('all')} className={`flex-1 py-3 rounded-lg font-black text-[10px] uppercase transition-all ${reportPeriod === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Total</button></div>
                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200"><p className="text-[10px] font-black uppercase text-slate-400">Total Vendas</p><p className="text-3xl font-black text-slate-900">R$ {total.toFixed(2)}</p></div>
                                        <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl"><Printer size={18}/> Imprimir</button>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOrderEditModalOpen && editingOrderData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative max-h-[90vh] overflow-y-auto shadow-2xl">
                            <button onClick={() => setIsOrderEditModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-800"><X /></button>
                            <h2 className="text-3xl font-black italic uppercase mb-2 text-slate-900">Editar Pedido #{editingOrderData.id?.slice(-5).toUpperCase()}</h2>
                            <p className="text-slate-400 font-bold text-sm mb-6">Cliente: {editingOrderData.customerName}</p>

                            <div className="space-y-6">
                                {/* Lista de Itens */}
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h3 className="font-black text-slate-700 uppercase mb-4 text-sm">Itens do Pedido</h3>
                                    {editingOrderData.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center mb-3 bg-white p-3 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                                    <button 
                                                        onClick={() => {
                                                            const newItems = [...editingOrderData.items];
                                                            if (newItems[idx].quantity > 1) {
                                                                newItems[idx].quantity -= 1;
                                                                setEditingOrderData({...editingOrderData, items: newItems});
                                                            } else {
                                                                // Remove se for 0
                                                                setEditingOrderData({...editingOrderData, items: newItems.filter((_, i) => i !== idx)});
                                                            }
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center font-bold text-slate-500 hover:bg-white rounded"
                                                    >-</button>
                                                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                                    <button 
                                                        onClick={() => {
                                                            const newItems = [...editingOrderData.items];
                                                            newItems[idx].quantity += 1;
                                                            setEditingOrderData({...editingOrderData, items: newItems});
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center font-bold text-blue-600 hover:bg-white rounded"
                                                    >+</button>
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-slate-400 text-xs">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    
                                    {/* Adicionar Novo Item Rápido */}
                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 mb-2">Adicionar Produto:</p>
                                        <select 
                                            className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-slate-200"
                                            onChange={(e) => {
                                                if(!e.target.value) return;
                                                const productToAdd = products.find(p => p.id === e.target.value);
                                                if(productToAdd) {
                                                    // Verifica se já existe
                                                    const existingIdx = editingOrderData.items.findIndex(i => i.id === productToAdd.id);
                                                    let newItems = [...editingOrderData.items];
                                                    
                                                    if (existingIdx >= 0) {
                                                        newItems[existingIdx].quantity += 1;
                                                    } else {
                                                        newItems.push({ ...productToAdd, quantity: 1 });
                                                    }
                                                    setEditingOrderData({...editingOrderData, items: newItems});
                                                }
                                                e.target.value = ""; // Reseta select
                                            }}
                                        >
                                            <option value="">+ Selecione para incluir</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Edição de Frete e Dados */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Taxa de Entrega</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold"
                                            value={editingOrderData.shippingFee || 0}
                                            onChange={(e) => setEditingOrderData({...editingOrderData, shippingFee: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Observações</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold"
                                            value={editingOrderData.observation || ''}
                                            onChange={(e) => setEditingOrderData({...editingOrderData, observation: e.target.value})}
                                            placeholder="Ex: Sem cebola..."
                                        />
                                    </div>
                                </div>

                                {/* Resumo Financeiro */}
                                <div className="bg-slate-900 text-white p-6 rounded-3xl">
                                    <div className="flex justify-between text-sm opacity-60 font-bold mb-1">
                                        <span>Subtotal Itens</span>
                                        <span>R$ {editingOrderData.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm opacity-60 font-bold mb-4">
                                        <span>Frete</span>
                                        <span>R$ {Number(editingOrderData.shippingFee || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-2xl font-black italic border-t border-slate-700 pt-4">
                                        <span>NOVO TOTAL</span>
                                        <span>R$ {(editingOrderData.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + Number(editingOrderData.shippingFee || 0)).toFixed(2)}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={async () => {
                                        const newTotal = editingOrderData.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + Number(editingOrderData.shippingFee || 0);
                                        await updateDoc(doc(db, "orders", editingOrderData.id), {
                                            items: editingOrderData.items,
                                            shippingFee: editingOrderData.shippingFee,
                                            observation: editingOrderData.observation,
                                            total: newTotal
                                        });
                                        setIsOrderEditModalOpen(false);
                                        alert("Pedido atualizado com sucesso!");
                                    }}
                                    className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}