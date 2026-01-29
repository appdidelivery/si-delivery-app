// si-delivery-app-main/src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import { db, auth /* , storage */ } from '../services/firebase'; // <--- REMOVE 'storage' daqui
import { 
  collection, onSnapshot, doc, updateDoc, deleteDoc, 
  addDoc, query, orderBy, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Plus, Trash2, Edit3, 
  Save, X, MessageCircle, Crown, Flame, Trophy, Printer, Bell, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, Image // <--- Ícones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // <--- REMOVE ESTAS IMPORTAÇÕES DO STORAGE

// --- CONFIGURAÇÕES DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = 'dud8fzi5r'; // <--- SUBSTITUA PELO SEU CLOUD NAME
const CLOUDINARY_UPLOAD_PRESET = 'bzlpl7bj'; // <--- SUBSTITUA PELO SEU UPLOAD PRESET NAME
// ---------------------------------

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ promoActive: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', category: 'Cervejas', imageUrl: '', tag: '' });
  const [editingId, setEditingId] = useState(null);

  // Estados para Pedido Manual
  const [manualCart, setManualCart] = useState([]);
  const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix' });

  // --- Novos Estados para Upload de Imagem ---
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // Para exibir progresso do upload

  // Função para Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error.message);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsubOrders = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const isRecent = change.doc.data().createdAt?.toMillis() > Date.now() - 10000;
          if (isRecent) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log("Aguardando interação para tocar som"));
          }
        }
      });
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSettings = onSnapshot(doc(db, "settings", "marketing"), (d) => d.exists() && setSettings(d.data()));

    return () => { unsubOrders(); unsubProducts(); unsubSettings(); };
  }, []);

  // --- Função para Upload da Imagem para Cloudinary ---
  const handleImageUpload = async () => {
    if (!imageFile) {
      setUploadError("Nenhuma imagem selecionada.");
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setForm(prevForm => ({ ...prevForm, imageUrl: data.secure_url })); // Salva a URL segura
      setUploading(false);
      setImageFile(null); // Limpa o arquivo selecionado
      setUploadProgress(100); 

    } catch (error) {
      console.error("Erro no upload para Cloudinary:", error);
      setUploadError(`Falha no upload da imagem: ${error.message}. Verifique o Cloud Name e Upload Preset.`);
      setUploading(false);
    }
  };

  // --- Função de Impressão (Etiqueta Dupla) ---
  const printLabel = (o) => {
    const w = window.open('', '_blank');
    const itemsHtml = (o.items || []).map(i => `<li>${i.quantity}x ${i.name}</li>`).join('');
    const pagto = { pix: 'PIX', cartao: 'CARTÃO', dinheiro: 'DINHEIRO' }[o.payment] || 'PIX';
    
    w.document.write(`
      <html><body style="font-family:sans-serif;width:300px;padding:10px;color:#333;">
        <div style="border:2px solid #000;padding:15px;margin-bottom:20px;border-radius:10px;">
          <center><h2 style="margin:0">CONVENIÊNCIA SI - LOJA</h2></center><hr>
          <strong>PEDIDO:</strong> #${o.id.slice(0,6)}<br>
          <strong>CLIENTE:</strong> ${o.customerName}<br>
          <strong>FONE:</strong> ${o.customerPhone}<br>
          <strong>PAGTO:</strong> ${pagto}<br><hr>
          <ul style="padding-left:15px;">${itemsHtml}</ul><hr>
          <div style="text-align:right;font-size:18px;"><strong>TOTAL: R$ ${Number(o.total || 0).toFixed(2)}</strong></div>
        </div>
        <div style="border:2px dashed #666;padding:15px;border-radius:10px;">
          <center><h2 style="margin:0;color:#000;">VIA ENTREGADOR</h2></center><hr>
          <strong>NOME:</strong> ${o.customerName}<br>
          <strong>ENDEREÇO:</strong> ${o.customerAddress}<br>
          <strong>FONE:</strong> ${o.customerPhone}<br>
          <strong>PAGTO:</strong> ${pagto}<br><hr>
          <div style="text-align:right;font-size:18px;"><strong>COBRAR: R$ ${Number(o.total || 0).toFixed(2)}</strong></div>
        </div>
        <p style="text-align:center;font-size:8px;margin-top:20px;opacity:0.5;">Powered by Velo Delivery</p>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    w.document.close();
  };

  // --- Lógica de Ranking VIP ---
  const customers = Object.values(orders.reduce((acc, o) => {
    const p = o.customerPhone || 'N/A';
    if (!acc[p]) acc[p] = { name: o.customerName || 'Sem nome', phone: p, total: 0, count: 0 };
    acc[p].total += Number(o.total || 0);
    acc[p].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* SIDEBAR COM ASSINATURA VELO */}
      <aside className="w-64 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo retangular vero delivery.png" className="h-16 w-auto rounded-full border-4 border-blue-50 shadow-sm mb-4" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"}/>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Painel Gestão</h2>
          <p className="text-[10px] font-bold text-blue-600">Conveniência Santa Isabel</p>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', name: 'Início', icon: <LayoutDashboard size={18}/> },
            { id: 'orders', name: 'Pedidos', icon: <ShoppingBag size={18}/> },
            { id: 'manual', name: 'Lançar Pedido', icon: <PlusCircle size={18}/> },
            { id: 'products', name: 'Estoque', icon: <Package size={18}/> },
            { id: 'customers', name: 'Clientes VIP', icon: <Users size={18}/> },
            { id: 'marketing', name: 'Marketing', icon: <Trophy size={18}/> },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} {item.name}
            </button>
          ))}
        </nav>

        {/* Botão de Logout na Sidebar */}
        <button 
          onClick={handleLogout} 
          className="mt-6 w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={18}/> Sair
        </button>

        <div className="mt-auto pt-6 border-t border-slate-50 flex flex-col items-center opacity-30">
          <img src="/logo retangular Vero Delivery.png" className="h-6 w-auto grayscale mb-1" />
          <p className="text-[8px] font-black uppercase">Velo Admin Console</p>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Visão Geral</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Vendas Concluídas</p>
                  <p className="text-4xl font-black text-green-500 italic">R$ {orders.filter(o=>o.status==='completed').reduce((a,b)=>a+(Number(b.total)||0),0).toFixed(2)}</p>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Pedidos Ativos</p>
                  <p className="text-4xl font-black text-blue-600 italic">{orders.filter(o=>o.status!=='completed').length}</p>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Ticket Médio</p>
                  <p className="text-4xl font-black text-slate-800 italic">R$ {orders.length > 0 ? (orders.reduce((a,b)=>a+(Number(b.total)||0),0)/orders.length).toFixed(2) : '0,00'}</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-8">Pedidos Recebidos</h1>
            {orders.map(o => (
              <div key={o.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase mb-2 inline-block">#{o.id.slice(0,6)}</span>
                  <h3 className="text-2xl font-black text-slate-800 uppercase leading-none mb-1">{o.customerName}</h3>
                  <p className="text-blue-500 font-bold text-[10px] uppercase mb-2">Pago via: {String(o.payment).toUpperCase()}</p>
                  <p className="text-slate-500 font-medium italic text-sm">{o.customerAddress}</p>
                  <div className="flex gap-2 flex-wrap mt-4">{o.items?.map((it, i) => <span key={i} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black">x{it.quantity} {it.name}</span>)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-black text-green-600 mr-4">R$ {Number(o.total).toFixed(2)}</p>
                  <button onClick={() => printLabel(o)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Printer size={20}/></button>
                  <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g,'')}`} target="_blank" className="p-4 bg-green-500 text-white rounded-2xl shadow-lg"><MessageCircle size={20}/></a>
<select 
  value={o.status} 
  onChange={(e) => updateDoc(doc(db,"orders",o.id), {status: e.target.value})} 
  className="bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] outline-none border-none cursor-pointer"
>
    <option value="pending">🟡 Pendente</option>
    <option value="preparing">🟠 Preparando</option>
    <option value="delivery">🟣 Em Rota</option>
    <option value="completed">🟢 Entregue</option>
</select>
                </div>
              </div>
            ))}
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
                 <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" value={manualCustomer.payment} onChange={e=>setManualCustomer({...manualCustomer, payment: e.target.value})}>
                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
                 </select>
                 <div className="pt-6 border-t border-slate-100">
                    {manualCart.map(i => <div key={i.id} className="flex justify-between mb-2 font-bold text-slate-600 text-sm"><span>{i.quantity}x {i.name}</span><span>R$ {(i.price*i.quantity).toFixed(2)}</span></div>)}
                    <div className="text-3xl font-black text-slate-900 mt-6 italic">Total R$ {manualCart.reduce((a,i)=>a+(i.price*i.quantity),0).toFixed(2)}</div>
                    <button onClick={async () => {
                      if(!manualCustomer.name || !manualCustomer.address || !manualCustomer.phone || manualCart.length===0) return alert("Por favor, preencha o nome, endereço, telefone e adicione itens ao carrinho para salvar o pedido!");
                      await addDoc(collection(db,"orders"),{...manualCustomer, customerName: manualCustomer.name, customerAddress: manualCustomer.address, customerPhone: manualCustomer.phone, items: manualCart, total: manualCart.reduce((a,i)=>a+(i.price*i.quantity),0), status:'pending', createdAt: serverTimestamp()});
                      setManualCart([]); setManualCustomer({name:'', address:'', phone:'', payment:'pix'}); alert("Pedido Manual Lançado com sucesso!");
                    }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase mt-8 shadow-xl">Salvar no Sistema</button>
                 </div>
               </div>
            </div>
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
               <h2 className="text-xl font-black uppercase mb-6 text-slate-300">Produtos</h2>
               <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {products.map(p => (
                    <button key={p.id} onClick={()=>{
                      const ex = manualCart.find(it=>it.id===p.id);
                      if(ex) setManualCart(manualCart.map(it=>it.id===p.id?{...it, quantity: it.quantity+1}:it));
                      else setManualCart([...manualCart, {...p, quantity:1}]);
                    }} className="w-full p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200">
                       <span className="font-bold text-slate-700">{p.name}</span>
                       <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black">R$ {p.price.toFixed(2)}</span>
                    </button>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">Estoque</h1>
              <button onClick={() => { setEditingId(null); setForm({name:'', price:'', category:'Cervejas', imageUrl:'', tag:''}); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                  <img src={p.imageUrl} className="w-20 h-20 object-contain rounded-2xl bg-slate-50 p-2" />
                  <div className="flex-1"><p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p><p className="text-blue-600 font-black">R$ {Number(p.price)?.toFixed(2)}</p></div>
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

        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-12 rounded-[4rem] shadow-2xl transition-all border-4 ${settings.promoActive ? 'bg-orange-500 text-white border-orange-300' : 'bg-white border-transparent'}`}>
                <Flame size={64} className={settings.promoActive ? 'animate-bounce' : 'text-orange-500'}/>
                <h2 className="text-4xl font-black italic mt-6 uppercase tracking-tighter leading-none">Promo Relâmpago</h2>
                <p className="mt-4 font-medium opacity-80 leading-relaxed mb-10">Ativa o banner de urgência instantaneamente na loja para todos os clientes.</p>
                <button onClick={async () => {
                  const s = !settings.promoActive;
                  await setDoc(doc(db,"settings","marketing"), {promoActive: s}, {merge:true});
                  alert(s ? "🔥 PROMOÇÃO ATIVADA!" : "Promoção encerrada.");
                }} className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-xl shadow-2xl active:scale-95 transition-all ${settings.promoActive ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white'}`}>
                    {settings.promoActive ? 'Encerrar Oferta' : 'Lançar Promoção'}
                </button>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col justify-center items-center text-center opacity-40">
                <Trophy size={64} className="text-slate-200 mb-4"/>
                <p className="font-black text-slate-300 uppercase tracking-widest leading-tight text-xl">Módulo Fidelidade<br/>EM DESENVOLVIMENTO</p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRODUTO */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
              <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingId ? 'Editar' : 'Novo'} Item</h2>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  const data = { ...form, price: parseFloat(form.price) };
                  // Se uma nova imagem foi carregada, ela já estará em form.imageUrl
                  // Se não, form.imageUrl manterá a URL existente ou estará vazia
                  if (editingId) { await updateDoc(doc(db,"products",editingId), data); } 
                  else { await addDoc(collection(db,"products"), data); }
                  setIsModalOpen(false);
                  setImageFile(null); // Limpa o arquivo de imagem após salvar/atualizar
                  setUploadError('');
                  setUploadProgress(0);
              }} className="space-y-6">
                <input type="text" placeholder="Nome do Produto" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="0.01" placeholder="Preço" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required />
                  <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>
                    <option>Cervejas</option><option>Destilados</option><option>Sem Álcool</option><option>Gelo</option>
                  </select>
                </div>
                
                {/* --- CAMPO DE UPLOAD DE IMAGEM (Cloudinary) --- */}
                <div className="space-y-3">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setImageFile(e.target.files[0])} 
                        className="hidden" 
                        id="image-upload"
                    />
                    <label htmlFor="image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all">
                        {imageFile ? imageFile.name : (form.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20}/>
                    </label>

                    {imageFile && (
                        <button 
                            type="button" // Importante: type="button" para não submeter o form
                            onClick={handleImageUpload} 
                            disabled={uploading}
                            className={`w-full p-4 rounded-3xl flex items-center justify-center gap-2 font-black text-white transition-all ${uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                            {uploading ? `Enviando... (${uploadProgress.toFixed(0)}%)` : 'Fazer Upload da Imagem'}
                        </button>
                    )}
                    {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                </div>
                
                {/* Prévia da imagem carregada (ou URL existente) */}
                {(form.imageUrl && !imageFile) && ( // Mostra a URL existente se não houver arquivo novo selecionado
                    <div className="flex flex-col items-center gap-3">
                        <img src={form.imageUrl} alt="Prévia do Produto" className="w-32 h-32 object-contain rounded-xl border border-slate-100 p-2 bg-slate-50"/>
                        <a href={form.imageUrl} target="_blank" className="text-blue-500 text-xs font-medium flex items-center gap-1 hover:underline">Ver Imagem <ExternalLink size={12}/></a>
                    </div>
                )}
                {imageFile && ( // Mostra a prévia do arquivo selecionado antes do upload
                    <div className="flex flex-col items-center gap-3">
                        <img src={URL.createObjectURL(imageFile)} alt="Prévia do Arquivo" className="w-32 h-32 object-contain rounded-xl border border-slate-100 p-2 bg-slate-50"/>
                        <p className="text-slate-500 text-xs font-medium">Arquivo selecionado para upload</p>
                    </div>
                )}
                {/* --- FIM CAMPO DE UPLOAD DE IMAGEM --- */}

                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Item</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}