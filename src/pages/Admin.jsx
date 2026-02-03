import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    addDoc, query, orderBy, serverTimestamp, setDoc, getDoc, where
} from 'firebase/firestore';
import {
    LayoutDashboard, ShoppingBag, Package, Users, Plus, Trash2, Edit3,
    Save, X, MessageCircle, Crown, Flame, Trophy, Printer, Bell, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, List, Image, Tags
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getStoreIdFromHostname } from '../utils/domainHelper'; // Importa o helper do domínio

// --- MAPEAMENTO DE NOMES DAS LOJAS ---
const NOMES_LOJAS = {
    csi: "Conv St Isabel",
    mamedes: "Mamedes Papéis",
    soller: "Soller Embalagens",
    futtalento: "FutTalento",
    default: "Velo Delivery"
};
// --- CONFIGURAÇÕES DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function Admin() {
    const navigate = useNavigate();
    const storeId = getStoreIdFromHostname();
    console.log("Admin - storeId detectado:", storeId);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ promoActive: false, promoBannerUrls: [] });
    const [generalBanners, setGeneralBanners] = useState([]); // NOVO: Estado para banners gerais
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportPeriod, setReportPeriod] = useState('today'); // 'today' ou 'all'

    // Modais Produto
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ 
        name: '', price: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0,
        hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false,
        quantityDiscounts: [] // NOVO: Descontos por quantidade
    });
    const [editingId, setEditingId] = useState(null);

    // Modais Categoria
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [catForm, setCatForm] = useState({ name: '' });
    const [editingCatId, setEditingCatId] = useState(null);

    // Modais Banners Gerais (NOVO)
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkTo: '', order: 0, isActive: true });
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [bannerImageFile, setBannerImageFile] = useState(null);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

    // Estados Pedido Manual
    const [manualCart, setManualCart] = useState([]);
    const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' });

    // Uploads
    const [imageFile, setImageFile] = useState(null); // Para imagem de produto
    const [uploading, setUploading] = useState(false); // Para imagem de produto
    const [uploadError, setUploadError] = useState('');

    // Loja
    const [storeStatus, setStoreStatus] = useState({
        isOpen: true, openTime: '08:00', closeTime: '23:00',
        message: 'Aberto agora!', storeLogoUrl: '/logo-loja.png', storeBannerUrl: '/fachada.jpg',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Banners de Promoção (Relâmpago)
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
        { id: 'banners', name: 'Banners', icon: <Image size={18} />, mobileIcon: <Image size={22} /> }, // NOVO ITEM DE NAVEGAÇÃO
        { id: 'customers', name: 'Clientes VIP', icon: <Users size={18} />, mobileIcon: <Users size={22} /> },
        { id: 'store_settings', name: 'Loja', icon: <Bell size={18} />, mobileIcon: <Bell size={22} /> },
    ];

    const handleLogout = async () => {
        try { await signOut(auth); navigate('/login'); } catch (error) { console.error("Erro logout:", error); }
    };

    useEffect(() => {
        // Pedidos - Filtrado por storeId
        const unsubOrders = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeId), orderBy("createdAt", "desc")), (s) => {
            s.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
                }
            });
            setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Produtos - Filtrado por storeId
        const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Categorias - Filtrado por storeId
        const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Banners Gerais - Filtrado por storeId (NOVO)
        const unsubGeneralBanners = onSnapshot(query(collection(db, "banners"), where("storeId", "==", storeId), orderBy("order", "asc")), (s) => setGeneralBanners(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Taxas de Frete - Filtrado por storeId
        const unsubShipping = onSnapshot(query(collection(db, "shipping_rates"), where("storeId", "==", storeId)), (s) => setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))));

        // Configurações de Marketing (promoções) - Usa storeId como ID do documento
        const mkRef = doc(db, "settings", storeId);
        getDoc(mkRef).then(s => !s.exists() && setDoc(mkRef, { promoActive: false, promoBannerUrls: [], storeId: storeId }, { merge: true }));
        const unsubMk = onSnapshot(mkRef, (d) => d.exists() && setSettings(d.data()));

        // Status da Loja - Usa storeId como ID do documento
        const stRef = doc(db, "settings", storeId);
        getDoc(stRef).then(s => !s.exists() && setDoc(stRef, { isOpen: true, openTime: '08:00', closeTime: '23:00', message: 'Aberto!', storeLogoUrl: '/logo-loja.png', storeBannerUrl: '/fachada.jpg', storeId: storeId }, { merge: true }));
        const unsubSt = onSnapshot(stRef, (d) => d.exists() && setStoreStatus(d.data()));
        
        // Cupons - Filtrado por storeId
        const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("storeId", "==", storeId)), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));


        return () => { 
            unsubOrders();
            unsubProducts();
            unsubCategories();
            unsubGeneralBanners(); // NOVO: Cleanup
            unsubShipping();
            unsubMk();
            unsubSt();
            unsubCoupons();
        };
    }, [storeId]); // Adicionado storeId como dependência

    // --- FUNÇÕES DE UPLOAD (COMPARTILHADAS) ---
    const uploadImageToCloudinary = async (file) => {
        if (!file) throw new Error("Selecione um arquivo primeiro!");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Falha no upload. Verifique conexão ou configurações.');
        }

        const data = await response.json();
        return data.secure_url;
    };

    const handleProductImageUpload = async () => {
        setUploading(true);
        setUploadError('');
        try {
            const url = await uploadImageToCloudinary(imageFile);
            setForm(prev => ({ ...prev, imageUrl: url }));
            setImageFile(null);
            alert("Imagem do produto enviada com sucesso!");
        } catch (error) {
            console.error("Erro upload:", error);
            setUploadError('Erro ao enviar imagem. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return;
        setUploadingLogo(true);
        try {
            const url = await uploadImageToCloudinary(logoFile);
            await updateDoc(doc(db, "settings", storeId), { storeLogoUrl: url }, { merge: true });
            setLogoFile(null);
            alert("Logo atualizada!");
        } catch (e) { alert("Erro upload logo"); console.error(e); }
        setUploadingLogo(false);
    };

    const handleBannerUpload = async () => {
        if (!bannerFile) return;
        setUploadingBanner(true);
        try {
            const url = await uploadImageToCloudinary(bannerFile);
            await updateDoc(doc(db, "settings", storeId), { storeBannerUrl: url }, { merge: true });
            setBannerFile(null);
            alert("Banner da loja atualizado!");
        } catch (e) { alert("Erro upload banner da loja"); console.error(e); }
        setUploadingBanner(false);
    };

    const handlePromoBannerUpload = async () => {
        setUploadingPromoBanner(true);
        const bannerFiles = [promoBannerFile1, promoBannerFile2, promoBannerFile3].filter(file => file !== null);
        const uploadPromises = bannerFiles.map(file => uploadImageToCloudinary(file).catch(e => {
            alert(`Erro upload promo banner: ${e.message}`);
            console.error(e);
            return null;
        }));

        try {
            const bannerUrls = await Promise.all(uploadPromises);
            const filteredBannerUrls = bannerUrls.filter(url => url !== null);
            await updateDoc(doc(db, "settings", storeId), { promoBannerUrls: filteredBannerUrls }, { merge: true });
            setPromoBannerFile1(null); setPromoBannerFile2(null); setPromoBannerFile3(null);
            alert("Banners da promoção relâmpago atualizados!");
        } catch (e) { alert("Erro ao salvar URLs dos banners da promoção"); console.error(e); }
        setUploadingPromoBanner(false);
    };

    // NOVO: Upload de Imagem para Banners Gerais
    const handleGeneralBannerImageUpload = async () => {
        setUploadingBannerImage(true);
        try {
            const url = await uploadImageToCloudinary(bannerImageFile);
            setBannerForm(prev => ({ ...prev, imageUrl: url }));
            setBannerImageFile(null);
            alert("Imagem do banner enviada com sucesso!");
        } catch (error) {
            console.error("Erro upload banner:", error);
            alert('Erro ao enviar imagem do banner. Tente novamente.');
        } finally {
            setUploadingBannerImage(false);
        }
    };
    // ------------------------------------------

    const printLabel = (o) => {
    const w = window.open('', '_blank');
    const itemsHtml = (o.items || []).map(i => `<li>• ${i.quantity}x ${i.name}</li>`).join('');
    const pagto = { pix: 'PIX', cartao: 'CARTÃO', dinheiro: 'DINHEIRO' }[o.paymentMethod] || o.paymentMethod || 'PIX';
    
    const gerarVia = (titulo, temCorte) => `
        <div style="width: 280px; padding: 10px; font-family: sans-serif; border-bottom: ${temCorte ? '2px dashed #000' : 'none'}; padding-bottom: 20px; margin-bottom: 40px;">
            <center><small>-- ${titulo} --</small><h2>CONVENIÊNCIA SI</h2></center>
            <hr>
            <strong>PEDIDO:</strong> #${o.id?.slice(-5).toUpperCase()}<br>
            <strong>CLIENTE:</strong> ${o.customerName}<br>
            <strong>ENDEREÇO:</strong> ${o.address || o.customerAddress || 'Retirada'}, ${o.number || ''}<br>
            <strong>BAIRRO:</strong> ${o.neighborhood || ''}<br>
            <strong>PAGTO:</strong> ${pagto}<br>
            ${o.customerChangeFor ? `<p><strong>TROCO PARA:</strong> ${o.customerChangeFor}</p>` : ''}
            <hr>
            <ul style="list-style:none; padding:0;">${itemsHtml}</ul>
            <hr>
            <div style="text-align:right; font-size:18px;"><strong>TOTAL: R$ ${Number(o.total || 0).toFixed(2)}</strong></div>
            ${temCorte ? '<center><br>✂--- CORTE AQUI ---✂</center>' : ''}
        </div>
    `;

    w.document.write(`<html><body style="margin:0; padding:0;">
        ${gerarVia('VIA DA LOJA', true)}
        ${gerarVia('VIA DO ENTREGADOR', false)}
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
    </body></html>`);
    w.document.close();
};

    const customers = Object.values(orders.reduce((acc, o) => {
        const p = o.customerPhone || 'N/A';
        if (!acc[p]) acc[p] = { name: o.customerName || 'Sem nome', phone: p, total: 0, count: 0 };
        acc[p].total += Number(o.total || 0); acc[p].count += 1; return acc;
    }, {})).sort((a, b) => b.total - a.total);
const updateStatusAndNotify = async (order, newStatus) => {
        // 1. Atualiza no Firebase
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });

        // 2. Prepara a mensagem
        const lojaNome = NOMES_LOJAS[storeId] || "Velo Delivery";
        const messages = {
            preparing: `👨‍🍳 *PEDIDO EM PREPARO!* \n\nOlá ${order.customerName.split(' ')[0]}, seu pedido foi recebido e já está sendo preparado aqui na *${lojaNome}*. \nEm breve avisaremos quando sair para entrega! 🍔🥤`,
            
            delivery: `🏍️ *SAIU PARA ENTREGA!* \n\nO motoboy já está a caminho com o seu pedido #${order.id.slice(-5).toUpperCase()}. \nPor favor, aguarde para receber. 💨`,
            
            completed: `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega do seu pedido. Muito obrigado pela preferência na *${lojaNome}*! \nEsperamos você na próxima! ⭐`,
            
            canceled: `❌ *ATUALIZAÇÃO DE STATUS* \n\nO pedido #${order.id.slice(-5).toUpperCase()} foi cancelado. \nCaso tenha dúvidas ou queira refazer, entre em contato conosco.`
        };

        // 3. Abre o WhatsApp se houver mensagem configurada
        if (messages[newStatus]) {
            const phone = order.customerPhone.replace(/\D/g, '');
            if(phone) {
                const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
                const text = encodeURIComponent(messages[newStatus]);
                window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
            }
        }
    };
    // --- LÓGICA PARA DESCONTOS POR QUANTIDADE ---
    const handleAddQuantityDiscount = () => {
        setForm(prev => ({ 
            ...prev, 
            quantityDiscounts: [...prev.quantityDiscounts, { minQuantity: 1, type: 'percentage', value: 0, description: '' }] 
        }));
    };

    const handleUpdateQuantityDiscount = (index, field, value) => {
        const newDiscounts = [...form.quantityDiscounts];
        newDiscounts[index][field] = value;
        setForm(prev => ({ ...prev, quantityDiscounts: newDiscounts }));
    };

    const handleRemoveQuantityDiscount = (index) => {
        setForm(prev => ({
            ...prev,
            quantityDiscounts: prev.quantityDiscounts.filter((_, i) => i !== index)
        }));
    };
    // ------------------------------------------

    // --- LÓGICA PARA BANNERS GERAIS ---
    const handleSaveGeneralBanner = async (e) => {
        e.preventDefault();
        const dataToSave = { ...bannerForm, order: Number(bannerForm.order), storeId: storeId };
        try {
            if (editingBannerId) await updateDoc(doc(db, "banners", editingBannerId), dataToSave);
            else await addDoc(collection(db, "banners"), dataToSave);
            setIsBannerModalOpen(false);
            alert("Banner salvo com sucesso!");
        } catch (error) {
            alert("Erro ao salvar banner: Verifique as Permissões (Regras) do Firebase!");
            console.error(error);
        }
    };
    // ----------------------------------


    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
            <aside className="w-64 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col sticky top-0 h-screen">
                <div className="flex flex-col items-center mb-10">
                    <img src={storeStatus.storeLogoUrl} className="h-16 w-16 rounded-full border-4 border-blue-50 mb-4 object-cover" onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
                    <p className="text-[10px] font-bold text-blue-600">Conveniência Santa Isabel</p>
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
                        {/* CABEÇALHO COM BOTÃO DE RELATÓRIO FINANCEIRO */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Visão Geral</h1>
                            <button 
                                onClick={() => setIsReportModalOpen(true)} 
                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Printer size={20}/> Fechar Caixa / Relatório
                            </button>
                        </div>

                        {/* ALERTA DE ESTOQUE (Mantido) */}
                        {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] animate-pulse">
                                <h3 className="text-red-600 font-black flex items-center gap-2"><Flame size={20} /> ALERTA: ESTOQUE CRÍTICO</h3>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).map(p => <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100">{p.name} ({p.stock} un)</span>)}
                                </div>
                            </div>
                        )}

                        {/* CARDS DE RESUMO FINANCEIRO (Atualizados) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 z-10 relative">Faturamento Hoje</p>
                                <p className="text-4xl font-black text-green-500 italic z-10 relative">
                                    R$ {orders
                                        .filter(o => o.status !== 'canceled' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString())
                                        .reduce((a, b) => a + (Number(b.total) || 0), 0).toFixed(2)}
                                </p>
                                <div className="absolute -right-4 -bottom-4 text-green-50 opacity-20"><Trophy size={120}/></div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Pedidos Hoje</p>
                                <p className="text-4xl font-black text-blue-600 italic">
                                    {orders.filter(o => new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).length}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Ticket Médio</p>
                                <p className="text-4xl font-black text-purple-500 italic">
                                    R$ {(orders.filter(o => o.status !== 'canceled').reduce((a, b) => a + (Number(b.total) || 0), 0) / (orders.filter(o => o.status !== 'canceled').length || 1)).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* RANKING DE VENDAS E BAIRROS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Top 5 Produtos */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><Crown size={20} className="text-amber-400"/> Campeões de Venda</h3>
                                <div className="space-y-4">
                                    {Object.values(orders.reduce((acc, order) => {
                                        if (order.status === 'canceled') return acc;
                                        (order.items || []).forEach(item => {
                                            if (!acc[item.name]) acc[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                                            acc[item.name].quantity += item.quantity;
                                            acc[item.name].revenue += item.quantity * item.price;
                                        });
                                        return acc;
                                    }, {}))
                                    .sort((a, b) => b.quantity - a.quantity)
                                    .slice(0, 5)
                                    .map((prod, idx) => (
                                        <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-slate-300 text-lg w-6">#{idx + 1}</span>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{prod.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{prod.quantity} un. vendidas</p>
                                                </div>
                                            </div>
                                            <p className="font-black text-blue-600 text-sm">R$ {prod.revenue.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Inteligência de Bairros */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><ExternalLink size={20} className="text-blue-400"/> Onde você mais vende</h3>
                                <div className="space-y-4">
                                    {Object.values(orders.reduce((acc, order) => {
                                        const bairro = order.neighborhood || 'Retirada/Outros';
                                        if (!acc[bairro]) acc[bairro] = { name: bairro, count: 0 };
                                        acc[bairro].count += 1;
                                        return acc;
                                    }, {}))
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 5)
                                    .map((local, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <p className="font-bold text-slate-700 text-sm">{local.name}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 md:w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(local.count / orders.length) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs font-black text-slate-400">{local.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black italic uppercase mb-8">Pedidos</h1>
                        {orders.map(o => (
                            <div key={o.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex-1">
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase mb-2 inline-block">#{o.id.slice(0, 6)}</span>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase leading-none mb-1">{o.customerName}</h3>
                                    <p className="text-xs text-slate-500">{o.customerAddress}</p>
                                    <div className="flex gap-2 flex-wrap mt-4">{o.items?.map((it, i) => <span key={i} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black">x{it.quantity} {it.name}</span>)}</div>
                                    {o.customerChangeFor && <div className="mt-2 text-xs bg-yellow-100 p-2 rounded text-yellow-800 font-bold">Troco para: {o.customerChangeFor}</div>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-2xl font-black text-green-600 mr-4">R$ {Number(o.total).toFixed(2)}</p>
                                    <button onClick={() => printLabel(o)} className="p-3 bg-slate-100 rounded-xl hover:bg-blue-100 text-blue-600"><Printer size={20} /></button>
                                    <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g, '')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl"><MessageCircle size={20} /></a>
                                    <select 
    value={o.status} 
    onChange={(e) => updateStatusAndNotify(o, e.target.value)} 
    className={`p-4 rounded-2xl font-black text-[10px] uppercase border-none outline-none cursor-pointer transition-all
        ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
        ${o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : ''}
        ${o.status === 'delivery' ? 'bg-purple-100 text-purple-700' : ''}
        ${o.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
        ${o.status === 'canceled' ? 'bg-red-100 text-red-700' : ''}
    `}
>
    <option value="pending">⏳ Pendente</option>
    <option value="preparing">👨‍🍳 Preparando</option>
    <option value="delivery">🏍️ Em Rota</option>
    <option value="completed">✅ Entregue</option>
    <option value="canceled">❌ Cancelado</option>
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
                        {/* LISTAGEM DE CATEGORIAS */}
                        {categories.length === 0 ? (
                            <div className="text-center p-10 text-slate-400">
                                <p>Nenhuma categoria encontrada.</p>
                                <p className="text-xs mt-2">Se você criou e não apareceu, verifique as REGRAS do Firebase.</p>
                            </div>
                        ) : (
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
                        )}
                    </div>
                )}

                {/* NOVO: ABA DE BANNERS GERAIS */}
                {activeTab === 'banners' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Banners Gerais</h1>
                            <button onClick={() => { setEditingBannerId(null); setBannerForm({ imageUrl: '', linkTo: '', order: 0, isActive: true }); setIsBannerModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO BANNER</button>
                        </div>
                        {generalBanners.length === 0 ? (
                            <p className="text-center py-10 text-slate-400 font-bold">Nenhum banner cadastrado.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {generalBanners.map(b => (
                                    <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                        <img src={b.imageUrl} className="w-24 h-24 object-contain rounded-2xl bg-slate-50 p-2" />
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 leading-tight mb-1">Ordem: {b.order}</p>
                                            <p className="text-blue-600 font-black break-all text-xs">Link: <a href={b.linkTo} target="_blank" rel="noopener noreferrer">{b.linkTo}</a></p>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-2 inline-block ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {b.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => { setEditingBannerId(b.id); setBannerForm(b); setIsBannerModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>
                                            <button onClick={() => window.confirm("Excluir banner?") && deleteDoc(doc(db, "banners", b.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Estoque</h1>
                            <button onClick={() => { 
                                setEditingId(null); 
                                setForm({ 
                                    name: '', price: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0,
                                    hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false, quantityDiscounts: []
                                }); 
                                setIsModalOpen(true); 
                            }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map(p => (
                                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                    <img src={p.imageUrl} className="w-20 h-20 object-contain rounded-2xl bg-slate-50 p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                                        {p.hasDiscount && p.originalPrice ? (
                                            <>
                                                <p className="text-slate-400 text-xs line-through">R$ {Number(p.originalPrice).toFixed(2)}</p>
                                                <p className="text-blue-600 font-black">R$ {Number(p.price)?.toFixed(2)}</p>
                                                {p.discountPercentage && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">-{p.discountPercentage}%</span>}
                                            </>
                                        ) : (
                                            <p className="text-blue-600 font-black">R$ {Number(p.price)?.toFixed(2)}</p>
                                        )}
                                        <p className={`text-xs font-bold mt-1 ${p.stock <= 2 ? 'text-red-500' : 'text-slate-400'}`}>Estoque: {p.stock !== undefined ? p.stock : 'N/A'}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                       <button onClick={() => { setEditingId(p.id); setForm({ ...p, quantityDiscounts: p.quantityDiscounts || [] }); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "products", p.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
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
                        <div className="space-y-6">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Novo Pedido</h1>
                            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-4 border border-slate-100">
                                <input type="text" placeholder="Nome do Cliente" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.name} onChange={e => setManualCustomer({ ...manualCustomer, name: e.target.value })} />
                                <input type="text" placeholder="Endereço Completo" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.address} onChange={e => setManualCustomer({ ...manualCustomer, address: e.target.value })} />
                                <input type="tel" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.phone} onChange={e => setManualCustomer({ ...manualCustomer, phone: e.target.value })} />
                                <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.payment} onChange={e => setManualCustomer({ ...manualCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? manualCustomer.changeFor : '' })}>
                                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
                                </select>
                                {manualCustomer.payment === 'dinheiro' && <input type="text" placeholder="Troco para qual valor?" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.changeFor} onChange={e => setManualCustomer({ ...manualCustomer, changeFor: e.target.value })} />}
                                <div className="pt-6 border-t border-slate-100">
                                    {manualCart.map(i => <div key={i.id} className="flex justify-between mb-2 font-bold text-slate-600 text-sm"><span>{i.quantity}x {i.name}</span><span>R$ {(i.price * i.quantity).toFixed(2)}</span></div>)}
                                    <div className="text-3xl font-black text-slate-900 mt-6 italic">Total R$ {manualCart.reduce((a, i) => a + (i.price * i.quantity), 0).toFixed(2)}</div>
                                    <button onClick={async () => {
                                        if (!manualCustomer.name || !manualCustomer.address || !manualCustomer.phone || manualCart.length === 0) return alert("Preencha tudo!");
                                        await addDoc(collection(db, "orders"), {
                                            ...manualCustomer,
                                            customerName: manualCustomer.name,
                                            customerAddress: manualCustomer.address,
                                            customerPhone: manualCustomer.phone,
                                            items: manualCart,
                                            total: manualCart.reduce((a, i) => a + (i.price * i.quantity), 0),
                                            status: 'pending',
                                            createdAt: serverTimestamp(),
                                            customerChangeFor: manualCustomer.payment === 'dinheiro' ? manualCustomer.changeFor : '',
                                            storeId: storeId // ADICIONADO: Associar pedido manual ao storeId
                                        });
                                        setManualCart([]); setManualCustomer({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' }); alert("Pedido Lançado!");
                                    }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase mt-8 shadow-xl">Salvar</button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h2 className="text-xl font-black uppercase mb-6 text-slate-300">Adicionar Produtos</h2>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {products.map(p => (
                                    <button key={p.id} onClick={() => {
                                        const ex = manualCart.find(it => it.id === p.id);
                                        if (ex) setManualCart(manualCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it)); else setManualCart([...manualCart, { ...p, quantity: 1 }]);
                                    }} className="w-full p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200">
                                        <span className="font-bold text-slate-700">{p.name}</span><span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black">R$ {p.price.toFixed(2)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marketing' && (
                    <div className="space-y-8"> {/* Adicionado um contêiner para espaçar as seções */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Promo Relâmpago */}
                            <div className={`p-12 rounded-[4rem] shadow-2xl transition-all border-4 ${settings.promoActive ? 'bg-orange-500 text-white border-orange-300' : 'bg-white border-transparent'}`}>
                                <Flame size={64} className={settings.promoActive ? 'animate-bounce' : 'text-orange-500'} />
                                <h2 className="text-4xl font-black italic mt-6 uppercase tracking-tighter leading-none">Promo Relâmpago</h2>
                                <button onClick={async () => {
                                    const s = !settings.promoActive; await setDoc(doc(db, "settings", storeId), { promoActive: s }, { merge: true });
                                }} className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-xl shadow-2xl mt-8 ${settings.promoActive ? 'bg-slate-900' : 'bg-orange-600 text-white'}`}>{settings.promoActive ? 'Encerrar Oferta' : 'Lançar Promoção'}</button>

                                {/* BANNERS DA PROMO RELÂMPAGO */}
                                <div className="mt-10 pt-6 border-t border-slate-100 space-y-4">
                                    <h3 className="text-xl font-black uppercase mb-4">Banners</h3>
                                    <div className="flex flex-col items-center gap-4">
                                        {/* Banner 1 */}
                                        {(promoBannerFile1 || (settings.promoBannerUrls && settings.promoBannerUrls[0])) && <img src={promoBannerFile1 ? URL.createObjectURL(promoBannerFile1) : settings.promoBannerUrls[0]} className="w-full max-w-lg h-40 object-cover rounded-2xl bg-slate-50"/>}
                                        <input type="file" accept="image/*" onChange={(e) => setPromoBannerFile1(e.target.files[0])} className="hidden" id="promo-banner-upload-1"/>
                                        <label htmlFor="promo-banner-upload-1" className="w-full max-w-lg p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">Upload Banner 1 <UploadCloud size={20}/></label>

                                        {/* Banner 2 */}
                                        {(promoBannerFile2 || (settings.promoBannerUrls && settings.promoBannerUrls[1])) && <img src={promoBannerFile2 ? URL.createObjectURL(promoBannerFile2) : settings.promoBannerUrls[1]} className="w-full max-w-lg h-40 object-cover rounded-2xl bg-slate-50"/>}
                                        <input type="file" accept="image/*" onChange={(e) => setPromoBannerFile2(e.target.files[0])} className="hidden" id="promo-banner-upload-2"/>
                                        <label htmlFor="promo-banner-upload-2" className="w-full max-w-lg p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">Upload Banner 2 <UploadCloud size={20}/></label>

                                        {/* Banner 3 */}
                                        {(promoBannerFile3 || (settings.promoBannerUrls && settings.promoBannerUrls[2])) && <img src={promoBannerFile3 ? URL.createObjectURL(promoBannerFile3) : settings.promoBannerUrls[2]} className="w-full max-w-lg h-40 object-cover rounded-2xl bg-slate-50"/>}
                                        <input type="file" accept="image/*" onChange={(e) => setPromoBannerFile3(e.target.files[0])} className="hidden" id="promo-banner-upload-3"/>
                                        <label htmlFor="promo-banner-upload-3" className="w-full max-w-lg p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">Upload Banner 3 <UploadCloud size={20}/></label>

                                        <button type="button" onClick={handlePromoBannerUpload} disabled={uploadingPromoBanner} className="w-full max-w-lg p-3 bg-blue-600 text-white rounded-2xl font-black">{uploadingPromoBanner ? 'Enviando...' : 'Salvar Banners'}</button>
                                    </div>
                                </div>
                            </div>
                            {/* Bloco de Fidelidade (EXISTENTE) */}
                            <div className="bg-white p-12 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col justify-center items-center text-center opacity-40"><Trophy size={64} className="text-slate-200 mb-4" /><p className="font-black text-slate-300 uppercase tracking-widest leading-tight text-xl">Fidelidade<br />EM BREVE</p></div>
                        </div>

                        {/* CUPONS DE DESCONTO */}
                        <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-4xl font-black italic tracking-tighter uppercase">Cupons de Desconto</h2>
                                <button onClick={() => { setEditingCouponId(null); setCouponForm({ code: '', type: 'percentage', value: 0, minimumOrderValue: 0, usageLimit: null, userUsageLimit: null, expirationDate: '', firstPurchaseOnly: false, active: true }); setIsCouponModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO CUPOM</button>
                            </div>

                            {coupons.length === 0 ? (
                                <p className="text-center py-10 text-slate-400 font-bold">Nenhum cupom cadastrado.</p>
                            ) : (
                                <div className="space-y-4">
                                    {coupons.map(c => (
                                        <div key={c.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-black text-slate-800 text-xl">{c.code} <span className={`text-xs font-bold px-2 py-1 rounded-md ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.active ? 'Ativo' : 'Inativo'}</span></p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {c.type === 'percentage' ? `${c.value}% de desconto` : `R$ ${c.value?.toFixed(2)} de desconto`}
                                                    {c.minimumOrderValue > 0 && ` (Min: R$ ${c.minimumOrderValue?.toFixed(2)})`}
                                                    {c.firstPurchaseOnly && ` (1ª Compra)`}
                                                    {c.expirationDate && ` (Expira: ${new Date(c.expirationDate.toDate()).toLocaleDateString('pt-BR')})`}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Usos: {c.currentUsage || 0} {c.usageLimit && ` / ${c.usageLimit}`}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingCouponId(c.id); setCouponForm({ ...c, expirationDate: c.expirationDate ? new Date(c.expirationDate.toDate()).toISOString().slice(0, 16) : '' }); setIsCouponModalOpen(true); }} className="p-2 bg-slate-100 rounded-xl text-blue-600 hover:bg-blue-200"><Edit3 size={18} /></button>
                                                <button onClick={() => window.confirm("Excluir cupom?") && deleteDoc(doc(db, "coupons", c.id))} className="p-2 bg-slate-100 rounded-xl text-red-600 hover:bg-red-200"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'store_settings' && (
                    <div className="space-y-8">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Configurações</h1>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Status da Loja</h2>
                            {/* Botão Aberto/Fechado */}
                            <button
                                onClick={() => updateDoc(doc(db, "settings", storeId), { isOpen: !storeStatus.isOpen }, { merge: true })}
                                className={`w-full p-4 rounded-2xl font-bold uppercase transition-all
                                        ${storeStatus.isOpen ? 'bg-green-500 text-white shadow-lg' : 'bg-red-500 text-white shadow-lg'}`}
                            >
                                {storeStatus.isOpen ? 'FECHAR LOJA' : 'ABRIR LOJA'}
                            </button>
                            {/* Horários (Opcional) */}
                            <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Horário de Funcionamento (Opcional)</p>
                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-slate-50 rounded-2xl">
                                    <span className="block font-bold text-slate-700 mb-2">Abre:</span>
                                    <input type="time" value={storeStatus.openTime} onChange={(e) => updateDoc(doc(db, "settings", storeId), { openTime: e.target.value }, { merge: true })} className="p-3 bg-white rounded-xl w-full font-bold" />
                                </div>
                                <div className="flex-1 p-4 bg-slate-50 rounded-2xl">
                                    <span className="block font-bold text-slate-700 mb-2">Fecha:</span>
                                    <input type="time" value={storeStatus.closeTime} onChange={(e) => updateDoc(doc(db, "settings", storeId), { closeTime: e.target.value }, { merge: true })} className="p-3 bg-white rounded-xl w-full font-bold" />
                                </div>
                            </div>
                            <input type="text" placeholder="Mensagem da Loja" value={storeStatus.message} onChange={(e) => updateDoc(doc(db, "settings", storeId), { message: e.target.value }, { merge: true })} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" />
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Mídia da Loja</h2>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col items-center gap-4 border-b pb-6">
                                    <img src={logoFile ? URL.createObjectURL(logoFile) : storeStatus.storeLogoUrl} className="w-24 h-24 object-contain rounded-full border-2 border-blue-50" />
                                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" id="logo-upload" />
                                    <label htmlFor="logo-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Logo</label>
                                    {logoFile && <button onClick={handleLogoUpload} disabled={uploadingLogo} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Logo</button>}
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <img src={bannerFile ? URL.createObjectURL(bannerFile) : storeStatus.storeBannerUrl} className="w-full h-32 object-cover rounded-xl" />
                                    <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files[0])} className="hidden" id="banner-upload" />
                                    <label htmlFor="banner-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Banner</label>
                                    {bannerFile && <button onClick={handleBannerUpload} disabled={uploadingBanner} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Banner</button>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black text-slate-800 uppercase">Fretes</h2>
                                <button onClick={() => { setEditingRateId(null); setRateForm({ neighborhood: '', fee: '' }); setIsRateModalOpen(true); }} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-xs">+ TAXA</button>
                            </div>
                            <div className="space-y-2">
                                {shippingRates.map(rate => (
                                    <div key={rate.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                        <span className="font-bold text-slate-700">{rate.neighborhood}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-blue-600">R$ {Number(rate.fee).toFixed(2)}</span>
                                            <button onClick={() => { setEditingRateId(rate.id); setRateForm(rate); setIsRateModalOpen(true); }} className="p-2 text-blue-600"><Edit3 size={16} /></button>
                                            <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "shipping_rates", rate.id))} className="p-2 text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around lg:hidden z-50">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
                        {item.mobileIcon} <span className="text-[10px] font-bold">{item.name}</span>
                    </button>
                ))}
            </nav>

            {/* MODAL CATEGORIA */}
            <AnimatePresence>
                {isCatModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
                            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X /></button>
                            <h2 className="text-2xl font-black uppercase mb-6">{editingCatId ? 'Editar' : 'Nova'} Categoria</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const dataToSave = { ...catForm, storeId: storeId };
                                    if (editingCatId) await updateDoc(doc(db, "categories", editingCatId), dataToSave);
                                    else await addDoc(collection(db, "categories"), dataToSave);
                                    setIsCatModalOpen(false);
                                    alert("Categoria salva com sucesso!");
                                } catch (error) {
                                    alert("Erro ao salvar: Verifique as Permissões (Regras) do Firebase!");
                                    console.error(error);
                                }
                            }}>
                                <input type="text" placeholder="Nome da Categoria" className="w-full p-4 bg-slate-50 rounded-xl font-bold mb-4" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                                <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Salvar</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NOVO: MODAL BANNER GERAL */}
            <AnimatePresence>
                {isBannerModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsBannerModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingBannerId ? 'Editar' : 'Novo'} Banner</h2>
                            <form onSubmit={handleSaveGeneralBanner} className="space-y-6">
                                <input type="text" placeholder="Link do Banner (URL ou /caminho)" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.linkTo} onChange={e => setBannerForm({ ...bannerForm, linkTo: e.target.value })} required />
                                <input type="number" placeholder="Ordem de exibição" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.order} onChange={e => setBannerForm({ ...bannerForm, order: e.target.value })} required />

                                <div className="space-y-3">
                                    {(bannerImageFile || bannerForm.imageUrl) && <img src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : bannerForm.imageUrl} className="w-full h-40 object-contain rounded-2xl bg-slate-50" />}
                                    <input type="file" accept="image/*" onChange={(e) => setBannerImageFile(e.target.files[0])} className="hidden" id="banner-general-image-upload" />
                                    <label htmlFor="banner-general-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">
                                        {bannerImageFile ? bannerImageFile.name : (bannerForm.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem do Banner')} <UploadCloud size={20} />
                                    </label>
                                    {bannerImageFile && (
                                        <button type="button" onClick={handleGeneralBannerImageUpload} disabled={uploadingBannerImage} className={`w-full p-4 rounded-3xl font-black text-white ${uploadingBannerImage ? 'bg-blue-400' : 'bg-blue-600'}`}>
                                            {uploadingBannerImage ? 'Enviando Imagem...' : 'Confirmar Upload da Imagem'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Banner Ativo:</span>
                                    <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm({ ...bannerForm, isActive: e.target.checked })} className="toggle toggle-sm toggle-primary" />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Banner</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL PRODUTO */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto"> {/* Adicionado overflow-y-auto */}
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingId ? 'Editar' : 'Novo'} Item</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const data = { 
                                    ...form, 
                                    price: parseFloat(form.price), 
                                    originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
                                    discountPercentage: form.discountPercentage ? parseFloat(form.discountPercentage) : null,
                                    stock: parseInt(form.stock || 0),
                                    // Limpar quantityDiscounts se estiver vazio para não salvar arrays vazios
                                    quantityDiscounts: form.quantityDiscounts.filter(qd => qd.minQuantity > 0 && qd.value >= 0),
                                    storeId: storeId 
                                };
                                if (editingId) { await updateDoc(doc(db, "products", editingId), data); }
                                else { await addDoc(collection(db, "products"), data); }
                                setIsModalOpen(false); setImageFile(null);
                            }} className="space-y-6">
                                <input type="text" placeholder="Nome do Produto" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" step="0.01" placeholder="Preço (COM desconto, se houver)" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                                    <input type="number" placeholder="Estoque" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                                </div>
                                <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Selecione a Categoria</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                
                                {/* Campos de Desconto Simples */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Produto em Promoção:</span>
                                    <input type="checkbox" checked={form.hasDiscount} onChange={e => setForm({...form, hasDiscount: e.target.checked})} className="toggle toggle-sm toggle-primary"/>
                                </div>
                                {form.hasDiscount && (
                                    <>
                                        <input type="number" step="0.01" placeholder="Preço ORIGINAL (antes do desconto)" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.originalPrice || ''} onChange={e => setForm({ ...form, originalPrice: e.target.value })} />
                                        <input type="number" step="0.01" placeholder="Porcentagem de Desconto (ex: 10 para 10%)" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.discountPercentage || ''} onChange={e => setForm({ ...form, discountPercentage: e.target.value })} />
                                    </>
                                )}

                                {/* Campos de Destaque e Mais Vendido */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Produto em Destaque:</span>
                                    <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({...form, isFeatured: e.target.checked})} className="toggle toggle-sm toggle-primary"/>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Produto Mais Vendido (Marcação Manual):</span>
                                    <input type="checkbox" checked={form.isBestSeller} onChange={e => setForm({...form, isBestSeller: e.target.checked})} className="toggle toggle-sm toggle-primary"/>
                                </div>

                                {/* Descontos por Quantidade (NOVO) */}
                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <h3 className="text-xl font-black uppercase flex justify-between items-center">
                                        Descontos por Quantidade
                                        <button type="button" onClick={handleAddQuantityDiscount} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-xs">+ ADICIONAR</button>
                                    </h3>
                                    {form.quantityDiscounts.length === 0 && (
                                        <p className="text-sm text-slate-400">Nenhum desconto por quantidade. Clique em + ADICIONAR.</p>
                                    )}
                                    {form.quantityDiscounts.map((qd, index) => (
                                        <div key={index} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 relative">
                                            <button type="button" onClick={() => handleRemoveQuantityDiscount(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X size={16}/></button>
                                            <input type="number" placeholder="Quantidade Mínima" className="w-full p-3 bg-white rounded-lg font-bold" value={qd.minQuantity} onChange={e => handleUpdateQuantityDiscount(index, 'minQuantity', parseInt(e.target.value))} required />
                                            <select className="w-full p-3 bg-white rounded-lg font-bold" value={qd.type} onChange={e => handleUpdateQuantityDiscount(index, 'type', e.target.value)}>
                                                <option value="percentage">Porcentagem (%)</option>
                                                <option value="fixed">Valor Fixo por Unidade (R$)</option>
                                            </select>
                                            <input type="number" step="0.01" placeholder="Valor do Desconto" className="w-full p-3 bg-white rounded-lg font-bold" value={qd.value} onChange={e => handleUpdateQuantityDiscount(index, 'value', parseFloat(e.target.value))} required />
                                            <input type="text" placeholder="Descrição (Ex: Leve 4, pague menos!)" className="w-full p-3 bg-white rounded-lg font-bold" value={qd.description} onChange={e => handleUpdateQuantityDiscount(index, 'description', e.target.value)} />
                                        </div>
                                    ))}
                                </div>

                                {/* Upload de Imagem do Produto */}
                                <div className="space-y-3 pt-6 border-t border-slate-100">
                                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" id="product-image-upload" />
                                    <label htmlFor="product-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">
                                        {imageFile ? imageFile.name : (form.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20} />
                                    </label>
                                    {imageFile && (
                                        <button type="button" onClick={handleProductImageUpload} disabled={uploading} className={`w-full p-4 rounded-3xl font-black text-white ${uploading ? 'bg-blue-400' : 'bg-blue-600'}`}>
                                            {uploading ? 'Enviando Imagem...' : 'Confirmar Upload da Imagem'}
                                        </button>
                                    )}
                                    {uploadError && <p className="text-red-500 text-sm font-bold text-center">{uploadError}</p>}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Item</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Taxa de Frete */}
            <AnimatePresence>
                {isRateModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsRateModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingRateId ? 'Editar' : 'Nova'} Taxa</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const feeValue = parseFloat(rateForm.fee);
                                if (isNaN(feeValue) || feeValue < 0) return alert("Valor inválido");
                                const data = { 
                                    neighborhood: rateForm.neighborhood, 
                                    fee: feeValue,
                                    storeId: storeId
                                };
                                try {
                                    if (editingRateId) await updateDoc(doc(db, "shipping_rates", editingRateId), data);
                                    else await addDoc(collection(db, "shipping_rates"), data);
                                    setIsRateModalOpen(false);
                                } catch (error) { alert(error.message); }
                            }} className="space-y-4">
                                <input type="text" placeholder="Nome do Bairro" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.neighborhood} onChange={e => setRateForm({ ...rateForm, neighborhood: e.target.value })} required />
                                <input type="number" step="0.01" placeholder="Valor do Frete" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.fee} onChange={e => setRateForm({ ...rateForm, fee: e.target.value })} required />
                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase">Salvar</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL CUPOM DE DESCONTO */}
            <AnimatePresence>
                {isCouponModalOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsCouponModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
                            <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingCouponId ? 'Editar' : 'Novo'} Cupom</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const dataToSave = {
                                    ...couponForm,
                                    value: parseFloat(couponForm.value),
                                    minimumOrderValue: parseFloat(couponForm.minimumOrderValue || 0),
                                    usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : null,
                                    userUsageLimit: couponForm.userUsageLimit ? parseInt(couponForm.userUsageLimit) : null,
                                    expirationDate: couponForm.expirationDate ? new Date(couponForm.expirationDate) : null,
                                    code: couponForm.code.toUpperCase(),
                                    currentUsage: couponForm.currentUsage || 0,
                                    createdAt: editingCouponId ? couponForm.createdAt : serverTimestamp(),
                                    storeId: storeId
                                };
                                try {
                                    if (editingCouponId) {
                                        await updateDoc(doc(db, "coupons", editingCouponId), dataToSave);
                                    } else {
                                        await addDoc(collection(db, "coupons"), dataToSave);
                                    }
                                    setIsCouponModalOpen(false);
                                    alert("Cupom salvo com sucesso!");
                                } catch (error) {
                                    alert("Erro ao salvar cupom: " + error.message);
                                    console.error(error);
                                }
                            }} className="space-y-4">
                                <input type="text" placeholder="Código do Cupom (ex: PRIMEIRACOMPRA)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} required />

                                <div className="flex gap-4">
                                    <select className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})}>
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed_amount">Valor Fixo (R$)</option>
                                    </select>
                                    <input type="number" step="0.01" placeholder="Valor (ex: 10 ou 5.50)" className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.value} onChange={e => setCouponForm({...couponForm, value: e.target.value})} required />
                                </div>

                                <input type="number" step="0.01" placeholder="Valor Mínimo do Pedido (opcional)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.minimumOrderValue || ''} onChange={e => setCouponForm({...couponForm, minimumOrderValue: e.target.value})} />

                                <div className="flex gap-4">
                                    <input type="number" placeholder="Limite de Usos Totais (opcional)" className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.usageLimit || ''} onChange={e => setCouponForm({...couponForm, usageLimit: e.target.value})} />
                                    <input type="number" placeholder="Limite de Usos por Cliente (opcional)" className="flex-1 p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.userUsageLimit || ''} onChange={e => setCouponForm({...couponForm, userUsageLimit: e.target.value})} />
                                </div>
                                
                                <label className="block text-slate-700 font-bold text-sm mb-2 mt-4">Data/Hora de Expiração (opcional):</label>
                                <input type="datetime-local" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.expirationDate} onChange={e => setCouponForm({...couponForm, expirationDate: e.target.value})} />
                                
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Apenas Primeira Compra:</span>
                                    <input type="checkbox" checked={couponForm.firstPurchaseOnly} onChange={e => setCouponForm({...couponForm, firstPurchaseOnly: e.target.checked})} className="toggle toggle-sm toggle-primary"/>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-700">Cupom Ativo:</span>
                                    <input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm({...couponForm, active: e.target.checked})} className="toggle toggle-sm toggle-primary"/>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase">Salvar Cupom</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}