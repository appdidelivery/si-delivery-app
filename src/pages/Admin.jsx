// si-delivery-app-main/src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, onSnapshot, doc, updateDoc, deleteDoc, 
  addDoc, query, orderBy, serverTimestamp, setDoc, getDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Plus, Trash2, Edit3, 
  Save, X, MessageCircle, Crown, Flame, Trophy, Printer, Bell, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, List 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURAÇÕES DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [settings, setSettings] = useState({ promoActive: false, promoBannerUrl: '' });
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', category: '', imageUrl: '', tag: '', stock: 0 }); 
  const [editingId, setEditingId] = useState(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '' });
  const [editingCatId, setEditingCatId] = useState(null);

  // Estados Pedido Manual
  const [manualCart, setManualCart] = useState([]);
  const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' });

  // Uploads
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  const [promoBannerFile, setPromoBannerFile] = useState(null);
  const [uploadingPromoBanner, setUploadingPromoBanner] = useState(false);

  const [shippingRates, setShippingRates] = useState([]);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState({ neighborhood: '', fee: '' });
  const [editingRateId, setEditingRateId] = useState(null);

  const navItems = [
    { id: 'dashboard', name: 'Início', icon: <LayoutDashboard size={18}/>, mobileIcon: <LayoutDashboard size={22}/> },
    { id: 'orders', name: 'Pedidos', icon: <ShoppingBag size={18}/>, mobileIcon: <ShoppingBag size={22}/> },
    { id: 'products', name: 'Estoque', icon: <Package size={18}/>, mobileIcon: <Package size={22}/> },
    { id: 'categories', name: 'Categorias', icon: <List size={18}/>, mobileIcon: <List size={22}/> },
    { id: 'customers', name: 'Clientes VIP', icon: <Users size={18}/>, mobileIcon: <Users size={22}/> },
    { id: 'store_settings', name: 'Loja', icon: <Bell size={18}/>, mobileIcon: <Bell size={22}/> },
  ];
  
  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } catch (error) { console.error("Erro logout:", error); }
  };

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) => {
      s.docChanges().forEach((change) => {
        if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        }
      });
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    // IMPORTANTE: Se o Firebase bloquear, isso aqui dá erro no console e a lista fica vazia.
    const unsubCategories = onSnapshot(collection(db, "categories"), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubShipping = onSnapshot(collection(db, "shipping_rates"), (s) => setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))));
    
    const mkRef = doc(db, "settings", "marketing");
    getDoc(mkRef).then(s => !s.exists() && setDoc(mkRef, { promoActive: false }));
    const unsubMk = onSnapshot(mkRef, (d) => d.exists() && setSettings(d.data()));

    const stRef = doc(db, "settings", "store_status");
    getDoc(stRef).then(s => !s.exists() && setDoc(stRef, { isOpen:true, openTime:'08:00', closeTime:'23:00', message:'Aberto!' }));
    const unsubSt = onSnapshot(stRef, (d) => d.exists() && setStoreStatus(d.data()));

    return () => { unsubOrders(); unsubProducts(); unsubCategories(); unsubShipping(); unsubMk(); unsubSt(); };
  }, []);

  // --- FUNÇÃO DE UPLOAD ROBUSTA (Corrigida) ---
  const handleProductImageUpload = async () => {
    if (!imageFile) { alert("Selecione um arquivo primeiro!"); return; }
    
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload. Verifique conexão ou configurações.');
      }

      const data = await response.json();
      setForm(prev => ({ ...prev, imageUrl: data.secure_url }));
      setImageFile(null);
      alert("Imagem enviada com sucesso!");

    } catch (error) {
      console.error("Erro upload:", error);
      setUploadError('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };
  // ---------------------------------------------

  const handleLogoUpload = async () => {
    if(!logoFile) return;
    setUploadingLogo(true);
    const fd = new FormData(); fd.append('file', logoFile); fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
        const data = await res.json();
        await updateDoc(doc(db, "settings", "store_status"), { storeLogoUrl: data.secure_url });
        setLogoFile(null);
    } catch(e) { alert("Erro upload logo"); }
    setUploadingLogo(false);
  };

  const handleBannerUpload = async () => {
    if(!bannerFile) return;
    setUploadingBanner(true);
    const fd = new FormData(); fd.append('file', bannerFile); fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
        const data = await res.json();
        await updateDoc(doc(db, "settings", "store_status"), { storeBannerUrl: data.secure_url });
        setBannerFile(null);
    } catch(e) { alert("Erro upload banner"); }
    setUploadingBanner(false);
  };

  const handlePromoBannerUpload = async () => {
    if(!promoBannerFile) return;
    setUploadingPromoBanner(true);
    const fd = new FormData(); fd.append('file', promoBannerFile); fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
        const data = await res.json();
        await updateDoc(doc(db, "settings", "marketing"), { promoBannerUrl: data.secure_url });
        setPromoBannerFile(null);
    } catch(e) { alert("Erro upload promo"); }
    setUploadingPromoBanner(false);
  };

  const printLabel = (o) => {
    const w = window.open('', '_blank');
    const itemsHtml = (o.items || []).map(i => `<li>${i.quantity}x ${i.name}</li>`).join('');
    const pagto = { pix: 'PIX', cartao: 'CARTÃO', dinheiro: 'DINHEIRO' }[o.payment] || 'PIX';
    w.document.write(`<html><body style="font-family:sans-serif;width:300px;padding:10px;"><center><h2>CONVENIÊNCIA SI</h2></center><hr><strong>PEDIDO:</strong> #${o.id.slice(0,6)}<br><strong>CLIENTE:</strong> ${o.customerName}<br><strong>ENDEREÇO:</strong> ${o.customerAddress}<br><strong>PAGTO:</strong> ${pagto}<br>${o.customerChangeFor ? `<p><strong>TROCO PARA:</strong> ${o.customerChangeFor}</p>` : ''}<hr><ul>${itemsHtml}</ul><hr><div style="text-align:right;font-size:18px;"><strong>TOTAL: R$ ${Number(o.total || 0).toFixed(2)}</strong></div><script>window.print();window.close();</script></body></html>`);
    w.document.close();
  };

  const customers = Object.values(orders.reduce((acc, o) => {
    const p = o.customerPhone || 'N/A';
    if (!acc[p]) acc[p] = { name: o.customerName || 'Sem nome', phone: p, total: 0, count: 0 };
    acc[p].total += Number(o.total || 0); acc[p].count += 1; return acc;
  }, {})).sort((a, b) => b.total - a.total);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="flex flex-col items-center mb-10">
          <img src={storeStatus.storeLogoUrl} className="h-16 w-16 rounded-full border-4 border-blue-50 mb-4 object-cover" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"}/>
          <p className="text-[10px] font-bold text-blue-600">Conveniência Santa Isabel</p>
        </div>
        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {[...navItems, { id: 'manual', name: 'Lançar Pedido', icon: <PlusCircle size={18}/> }, { id: 'marketing', name: 'Marketing', icon: <Trophy size={18}/> }]
           .map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} {item.name}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-6 w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase"><LogOut size={18}/> Sair</button>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Visão Geral</h1>
            {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).length > 0 && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] animate-pulse">
                    <h3 className="text-red-600 font-black flex items-center gap-2"><Flame size={20}/> ALERTA: ESTOQUE CRÍTICO</h3>
                    <div className="flex gap-2 flex-wrap mt-2">
                        {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).map(p => <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100">{p.name} ({p.stock} un)</span>)}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Vendas Hoje</p>
                  <p className="text-4xl font-black text-green-500 italic">R$ {orders.filter(o => o.status === 'completed' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).reduce((a,b) => a + (Number(b.total)||0), 0).toFixed(2)}</p>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Pedidos Hoje</p>
                  <p className="text-4xl font-black text-blue-600 italic">{orders.filter(o => new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).length}</p>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Novos Clientes</p>
                  <p className="text-4xl font-black text-purple-500 italic">{customers.filter(c => c.count === 1).length}</p>
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
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase mb-2 inline-block">#{o.id.slice(0,6)}</span>
                  <h3 className="text-2xl font-black text-slate-800 uppercase leading-none mb-1">{o.customerName}</h3>
                  <p className="text-xs text-slate-500">{o.customerAddress}</p>
                  <div className="flex gap-2 flex-wrap mt-4">{o.items?.map((it, i) => <span key={i} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black">x{it.quantity} {it.name}</span>)}</div>
                  {o.customerChangeFor && <div className="mt-2 text-xs bg-yellow-100 p-2 rounded text-yellow-800 font-bold">Troco para: {o.customerChangeFor}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-black text-green-600 mr-4">R$ {Number(o.total).toFixed(2)}</p>
                  <button onClick={() => printLabel(o)} className="p-3 bg-slate-100 rounded-xl hover:bg-blue-100 text-blue-600"><Printer size={20}/></button>
                  <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g,'')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl"><MessageCircle size={20}/></a>
                  <select value={o.status} onChange={(e) => updateDoc(doc(db,"orders",o.id), {status: e.target.value})} className="bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px]">
                    <option value="pending">Pendente</option><option value="preparing">Preparando</option><option value="delivery">Em Rota</option><option value="completed">Entregue</option>
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
                    <button onClick={() => { setEditingCatId(null); setCatForm({name:''}); setIsCatModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVA CATEGORIA</button>
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
                                    <button onClick={() => { setEditingCatId(c.id); setCatForm(c); setIsCatModalOpen(true); }} className="p-2 bg-slate-50 rounded-lg text-blue-600"><Edit3 size={16}/></button>
                                    <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db,"categories",c.id))} className="p-2 bg-slate-50 rounded-lg text-red-600"><Trash2 size={16}/></button>
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
              <button onClick={() => { setEditingId(null); setForm({name:'', price:'', category:'', imageUrl:'', tag:'', stock:0}); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                  <img src={p.imageUrl} className="w-20 h-20 object-contain rounded-2xl bg-slate-50 p-2" />
                  <div className="flex-1">
                      <p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                      <p className="text-blue-600 font-black">R$ {Number(p.price)?.toFixed(2)}</p>
                      <p className={`text-xs font-bold mt-1 ${p.stock <= 2 ? 'text-red-500' : 'text-slate-400'}`}>Estoque: {p.stock !== undefined ? p.stock : 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setEditingId(p.id); setForm(p); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18}/></button>
                    <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db,"products",p.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18}/></button>
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
                 <input type="text" placeholder="Nome do Cliente" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.name} onChange={e=>setManualCustomer({...manualCustomer, name: e.target.value})}/>
                 <input type="text" placeholder="Endereço Completo" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.address} onChange={e=>setManualCustomer({...manualCustomer, address: e.target.value})}/>
                 <input type="tel" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.phone} onChange={e=>setManualCustomer({...manualCustomer, phone: e.target.value})}/>
                 <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.payment} onChange={e=>setManualCustomer({...manualCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? manualCustomer.changeFor : ''})}>
                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
                 </select>
                 {manualCustomer.payment === 'dinheiro' && <input type="text" placeholder="Troco para qual valor?" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.changeFor} onChange={e=>setManualCustomer({...manualCustomer, changeFor: e.target.value})}/>}
                 <div className="pt-6 border-t border-slate-100">
                    {manualCart.map(i => <div key={i.id} className="flex justify-between mb-2 font-bold text-slate-600 text-sm"><span>{i.quantity}x {i.name}</span><span>R$ {(i.price*i.quantity).toFixed(2)}</span></div>)}
                    <div className="text-3xl font-black text-slate-900 mt-6 italic">Total R$ {manualCart.reduce((a,i)=>a+(i.price*i.quantity),0).toFixed(2)}</div>
                    <button onClick={async () => {
                      if(!manualCustomer.name || !manualCustomer.address || !manualCustomer.phone || manualCart.length===0) return alert("Preencha tudo!");
                      await addDoc(collection(db,"orders"),{
                        ...manualCustomer, customerName: manualCustomer.name, customerAddress: manualCustomer.address, customerPhone: manualCustomer.phone, items: manualCart, total: manualCart.reduce((a,i)=>a+(i.price*i.quantity),0), status:'pending', createdAt: serverTimestamp(),
                        customerChangeFor: manualCustomer.payment === 'dinheiro' ? manualCustomer.changeFor : ''
                      });
                      setManualCart([]); setManualCustomer({name:'', address:'', phone:'', payment:'pix', changeFor: ''}); alert("Pedido Lançado!");
                    }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase mt-8 shadow-xl">Salvar</button>
                 </div>
               </div>
            </div>
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
               <h2 className="text-xl font-black uppercase mb-6 text-slate-300">Adicionar Produtos</h2>
               <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {products.map(p => (
                    <button key={p.id} onClick={()=>{
                      const ex = manualCart.find(it=>it.id===p.id);
                      if(ex) setManualCart(manualCart.map(it=>it.id===p.id?{...it, quantity: it.quantity+1}:it)); else setManualCart([...manualCart, {...p, quantity:1}]);
                    }} className="w-full p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200">
                       <span className="font-bold text-slate-700">{p.name}</span><span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black">R$ {p.price.toFixed(2)}</span>
                    </button>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-12 rounded-[4rem] shadow-2xl transition-all border-4 ${settings.promoActive ? 'bg-orange-500 text-white border-orange-300' : 'bg-white border-transparent'}`}>
                <Flame size={64} className={settings.promoActive ? 'animate-bounce' : 'text-orange-500'}/>
                <h2 className="text-4xl font-black italic mt-6 uppercase tracking-tighter leading-none">Promo Relâmpago</h2>
                <button onClick={async () => {
                  const s = !settings.promoActive; await setDoc(doc(db,"settings","marketing"), {promoActive: s}, {merge:true});
                }} className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-xl shadow-2xl mt-8 ${settings.promoActive ? 'bg-slate-900' : 'bg-orange-600 text-white'}`}>{settings.promoActive ? 'Encerrar Oferta' : 'Lançar Promoção'}</button>
                <div className="mt-10 pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-xl font-black uppercase mb-4">Banner</h3>
                    <div className="flex flex-col items-center gap-4">
                        {(promoBannerFile || settings.promoBannerUrl) && <img src={promoBannerFile ? URL.createObjectURL(promoBannerFile) : settings.promoBannerUrl} className="w-full max-w-lg h-40 object-cover rounded-2xl bg-slate-50"/>}
                        <input type="file" accept="image/*" onChange={(e) => setPromoBannerFile(e.target.files[0])} className="hidden" id="promo-banner-upload"/>
                        <label htmlFor="promo-banner-upload" className="w-full max-w-lg p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">Upload Banner <UploadCloud size={20}/></label>
                        {promoBannerFile && <button type="button" onClick={handlePromoBannerUpload} disabled={uploadingPromoBanner} className="w-full max-w-lg p-3 bg-blue-600 text-white rounded-2xl font-black">{uploadingPromoBanner ? 'Enviando...' : 'Confirmar Upload'}</button>}
                    </div>
                </div>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col justify-center items-center text-center opacity-40"><Trophy size={64} className="text-slate-200 mb-4"/><p className="font-black text-slate-300 uppercase tracking-widest leading-tight text-xl">Fidelidade<br/>EM BREVE</p></div>
          </div>
        )}

        {activeTab === 'store_settings' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Configurações</h1>
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Status e Horário</h2>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="font-bold text-slate-700">Loja Aberta:</span>
                <input type="checkbox" checked={storeStatus.isOpen} onChange={(e) => updateDoc(doc(db, "settings", "store_status"), { isOpen: e.target.checked })} className="toggle toggle-lg toggle-primary"/>
              </div>
              <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-slate-50 rounded-2xl"><span className="block font-bold text-slate-700 mb-2">Abre:</span><input type="time" value={storeStatus.openTime} onChange={(e) => updateDoc(doc(db, "settings", "store_status"), { openTime: e.target.value })} className="p-3 bg-white rounded-xl w-full font-bold"/></div>
                  <div className="flex-1 p-4 bg-slate-50 rounded-2xl"><span className="block font-bold text-slate-700 mb-2">Fecha:</span><input type="time" value={storeStatus.closeTime} onChange={(e) => updateDoc(doc(db, "settings", "store_status"), { closeTime: e.target.value })} className="p-3 bg-white rounded-xl w-full font-bold"/></div>
              </div>
              <input type="text" placeholder="Mensagem da Loja" value={storeStatus.message} onChange={(e) => updateDoc(doc(db, "settings", "store_status"), { message: e.target.value })} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none"/>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Mídia da Loja</h2>
              <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-4 border-b pb-6">
                      <img src={logoFile ? URL.createObjectURL(logoFile) : storeStatus.storeLogoUrl} className="w-24 h-24 object-contain rounded-full border-2 border-blue-50"/>
                      <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" id="logo-upload"/>
                      <label htmlFor="logo-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Logo</label>
                      {logoFile && <button onClick={handleLogoUpload} disabled={uploadingLogo} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Logo</button>}
                  </div>
                  <div className="flex flex-col items-center gap-4">
                      <img src={bannerFile ? URL.createObjectURL(bannerFile) : storeStatus.storeBannerUrl} className="w-full h-32 object-cover rounded-xl"/>
                      <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files[0])} className="hidden" id="banner-upload"/>
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
                      <button onClick={() => { setEditingRateId(rate.id); setRateForm(rate); setIsRateModalOpen(true); }} className="p-2 text-blue-600"><Edit3 size={16}/></button>
                      <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "shipping_rates", rate.id))} className="p-2 text-red-600"><Trash2 size={16}/></button>
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

      {/* MODAL CATEGORIA (Com alert de erro se falhar) */}
      <AnimatePresence>
        {isCatModalOpen && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
                <button onClick={() => setIsCatModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X/></button>
                <h2 className="text-2xl font-black uppercase mb-6">{editingCatId ? 'Editar' : 'Nova'} Categoria</h2>
                <form onSubmit={async(e) => {
                    e.preventDefault();
                    try {
                      if(editingCatId) await updateDoc(doc(db,"categories",editingCatId), catForm);
                      else await addDoc(collection(db,"categories"), catForm);
                      setIsCatModalOpen(false);
                      alert("Categoria salva com sucesso!"); // FEEDBACK VISUAL
                    } catch (error) {
                      alert("Erro ao salvar: Verifique as Permissões (Regras) do Firebase!");
                      console.error(error);
                    }
                }}>
                    <input type="text" placeholder="Nome da Categoria" className="w-full p-4 bg-slate-50 rounded-xl font-bold mb-4" value={catForm.name} onChange={e=>setCatForm({...catForm, name:e.target.value})} required/>
                    <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Salvar</button>
                </form>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PRODUTO */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
              <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingId ? 'Editar' : 'Novo'} Item</h2>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock || 0) };
                  if (editingId) { await updateDoc(doc(db,"products",editingId), data); } 
                  else { await addDoc(collection(db,"products"), data); }
                  setIsModalOpen(false); setImageFile(null);
              }} className="space-y-6">
                <input type="text" placeholder="Nome do Produto" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="0.01" placeholder="Preço" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required />
                  <input type="number" placeholder="Estoque" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.stock} onChange={e=>setForm({...form, stock: e.target.value})} required />
                </div>
                <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>
                    <option value="">Selecione a Categoria</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="space-y-3">
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" id="product-image-upload"/>
                    <label htmlFor="product-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">
                        {imageFile ? imageFile.name : (form.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20}/>
                    </label>
                    {/* Botão de Upload com estado visual de carregando */}
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
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative">
              <button onClick={() => setIsRateModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
              <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingRateId ? 'Editar' : 'Nova'} Taxa</h2>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  const feeValue = parseFloat(rateForm.fee);
                  if (isNaN(feeValue) || feeValue < 0) return alert("Valor inválido");
                  const data = { neighborhood: rateForm.neighborhood, fee: feeValue };
                  try {
                      if (editingRateId) await updateDoc(doc(db, "shipping_rates", editingRateId), data);
                      else await addDoc(collection(db, "shipping_rates"), data);
                      setIsRateModalOpen(false);
                  } catch (error) { alert(error.message); }
              }} className="space-y-4">
                <input type="text" placeholder="Nome do Bairro" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.neighborhood} onChange={e => setRateForm({...rateForm, neighborhood: e.target.value})} required />
                <input type="number" step="0.01" placeholder="Valor do Frete" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.fee} onChange={e => setRateForm({...rateForm, fee: e.target.value})} required />
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase">Salvar</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}