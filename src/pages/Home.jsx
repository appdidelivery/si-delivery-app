// si-delivery-app-main/src/pages/Home.jsx
import { Clock, X } from 'lucide-react'; // Certifique-se de ter o X para fechar o modal
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, MapPin, ExternalLink, QrCode, CreditCard, Banknote, Minus, Plus, Trash2, XCircle, Loader2, Truck, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

// Função auxiliar para ícones de categoria
const getCategoryIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('cerveja')) return <Beer size={18}/>;
    if (n.includes('destilado') || n.includes('vinho') || n.includes('whisky')) return <Wine size={18}/>;
    if (n.includes('suco') || n.includes('refri') || n.includes('água')) return <Refrigerator size={18}/>;
    return <List size={18}/>; 
};

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Categorias do Banco
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [customer, setCustomer] = useState({ 
    name: '', cep: '', street: '', number: '', neighborhood: '', phone: '', payment: 'pix', changeFor: '' 
  });
  const [showLastOrders, setShowLastOrders] = useState(false);
  const [lastOrders, setLastOrders] = useState([]);

  const handlePhoneChange = (e) => {
    const phone = e.target.value;
    setCustomer({...customer, phone: phone});
    localStorage.setItem('customerPhone', phone);
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem('customerPhone');
    if (savedPhone) {
      setCustomer(prev => ({ ...prev, phone: savedPhone }));
    }
  }, []);

  useEffect(() => {
    if (showLastOrders) {
      const customerPhone = localStorage.getItem('customerPhone');
      if (customerPhone) {
        const q = query(collection(db, "orders"), where("customerPhone", "==", customerPhone), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLastOrders(orders);
        });
        return () => unsubscribe();
      } else {
        alert("Número de telefone não encontrado. Preencha seus dados para ver seus últimos pedidos.");
        setShowLastOrders(false);
      }
    }
  }, [showLastOrders]);

  const repeatOrder = (order) => {
    order.items.forEach(item => {
      addToCart({...item, id: item.id});
    });
    setShowLastOrders(false);
  };
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [promo, setPromo] = useState(null);
  const [storeConfig, setStoreConfig] = useState({ isOpen: true, openTime: '08:00', closeTime: '23:00', message: 'Aberto agora!', storeLogoUrl: '/logo-loja.png', storeBannerUrl: '/fachada.jpg' });
  const [isStoreOpenNow, setIsStoreOpenNow] = useState(true); 
  const [storeMessage, setStoreMessage] = useState('Verificando...');
  
  const [shippingRates, setShippingRates] = useState([]);
  const [shippingFee, setShippingFee] = useState(null);
  const [deliveryAreaMessage, setDeliveryAreaMessage] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);

  useEffect(() => {
    const savedOrderId = localStorage.getItem('activeOrderId');
    if (savedOrderId) setActiveOrderId(savedOrderId);

    // Carregar Produtos
    const unsubProducts = onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Carregar Categorias
    const unsubCategories = onSnapshot(collection(db, "categories"), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubPromo = onSnapshot(doc(db, "settings", "marketing"), (d) => d.exists() && setPromo(d.data()));
    
    const unsubStoreConfig = onSnapshot(doc(db, "settings", "store_status"), (d) => {
    if (d.exists()) {
      const data = d.data();
      setStoreConfig(data);

      let finalStatus = data.isOpen; // Assume que a loja está aberta por padrão

      // Se os horários estiverem preenchidos, verifique se está dentro do horário
      if (data.openTime && data.closeTime) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openHour, openMinute] = (data.openTime || '00:00').split(':').map(Number);
        const [closeHour, closeMinute] = (data.closeTime || '23:59').split(':').map(Number);
        const scheduledOpenTime = openHour * 60 + openMinute;
        const scheduledCloseTime = closeHour * 60 + closeMinute;
        const isCurrentlyOpenBySchedule = currentTime >= scheduledOpenTime && currentTime < scheduledCloseTime;
        finalStatus = data.isOpen && isCurrentlyOpenBySchedule; // Considera os horários se estiverem definidos
      }

      setIsStoreOpenNow(finalStatus);
      setStoreMessage(data.message || (finalStatus ? 'Aberto agora!' : 'Fechado no momento.'));
    }
  });

    const unsubShippingRates = onSnapshot(collection(db, "shipping_rates"), (s) => {
      setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProducts(); unsubCategories(); unsubPromo(); unsubStoreConfig(); unsubShippingRates(); };
  }, []);

  // Lógica de CEP (ViaCEP)
  useEffect(() => {
    const cep = customer.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setCepError(''); return; }
    const fetchCep = async () => {
      setIsCepLoading(true); setCepError(''); setShippingFee(null); setDeliveryAreaMessage('');
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) throw new Error("CEP não encontrado.");
        setCustomer(c => ({...c, street: data.logradouro, neighborhood: data.bairro}));
        const foundRate = shippingRates.find(rate => rate.neighborhood.toLowerCase() === data.bairro.toLowerCase());
        if (foundRate) {
          setShippingFee(foundRate.fee);
          setDeliveryAreaMessage(`Entrega para ${foundRate.neighborhood}: R$ ${foundRate.fee.toFixed(2)}`);
        } else {
          setShippingFee(null); setDeliveryAreaMessage("Infelizmente, não atendemos esta região."); setCepError("Região não atendida.");
        }
      } catch (error) { setCepError(error.message); setCustomer(c => ({ ...c, street: '', neighborhood: '' })); } finally { setIsCepLoading(false); }
    };
    const handler = setTimeout(() => fetchCep(), 500);
    return () => clearTimeout(handler);
  }, [customer.cep, shippingRates]);

  const addToCart = (p) => {
    if (!isStoreOpenNow) { alert(storeMessage); return; }
    // Validação de Estoque
    if (p.stock && p.stock <= 0) { alert("Produto fora de estoque!"); return; }
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex && p.stock && (ex.quantity + 1 > p.stock)) {
          alert("Limite de estoque atingido!");
          return prev;
      }
      return ex ? prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i) : [...prev, {...p, quantity: 1}];
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart(prevCart => prevCart.map(item => item.id === productId ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  };
  const removeFromCart = (pid) => setCart(p => p.filter(i => i.id !== pid));

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const finalTotal = subtotal + (shippingFee || 0);

  const finalizeOrder = async () => {
    if (!isStoreOpenNow) return alert(storeMessage);
    if(!customer.name || !customer.cep || !customer.street || !customer.number || !customer.phone) return alert("Preencha o endereço completo.");
    if(cart.length === 0) return alert("Carrinho vazio!");
    if (shippingFee === null) return alert("Frete não calculado.");

    const fullAddress = `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        customerName: customer.name, customerAddress: fullAddress, customerPhone: customer.phone,
        payment: customer.payment, customerChangeFor: customer.payment === 'dinheiro' ? customer.changeFor : '',
        items: cart, subtotal, shippingFee, total: finalTotal, status: 'pending', createdAt: serverTimestamp()
      });
      localStorage.setItem('activeOrderId', docRef.id);
      setActiveOrderId(docRef.id);
      navigate(`/track/${docRef.id}`);
      setCart([]); setShowCheckout(false);
    } catch (e) { alert("Erro ao processar. Tente novamente."); }
  };

  const displayCategories = [
      { id: 'all', name: 'Todos', icon: <Utensils size={18}/> },
      ...categories.map(c => ({ id: c.name, name: c.name, icon: getCategoryIcon(c.name) }))
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <SEO title="Velo Delivery" description="Bebidas geladas." />
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src={storeConfig.storeLogoUrl} className="h-12 w-12 rounded-full object-cover border-2 border-blue-600 shadow-sm" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
          <div><h1 className="text-xl font-black text-slate-800 leading-none uppercase">Conveniência</h1><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Santa Isabel</p></div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isStoreOpenNow ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {isStoreOpenNow ? <Clock size={14}/> : <XCircle size={14}/>} <span className="text-[10px] font-black uppercase">{storeMessage}</span>
        </div>
      </header>

      {/* BANNER */}
      <div className="w-full h-48 md:h-64 relative overflow-hidden">
        <img src={storeConfig.storeBannerUrl} className="w-full h-full object-cover brightness-75" onError={(e)=>e.target.src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1000"} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 text-white text-xs font-bold mb-1 uppercase tracking-widest"><MapPin size={14} className="text-blue-400"/> Santa Isabel - Loja principal</div>
          <p className="text-white text-sm opacity-80 font-medium">Bebidas geladas, gelo, carvão e destilados. Entregamos em toda cidade.</p>
        </div>
      </div>

      <AnimatePresence>
        {promo?.promoActive && promo?.promoBannerUrl && (
          <motion.div layout initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden p-6">
            <img src={promo.promoBannerUrl} className="w-full h-auto object-contain rounded-[2rem] shadow-xl border-4 border-white"/>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="O que você procura?" className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm outline-none focus:ring-2 ring-blue-600 font-medium" onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {/* CATEGORIAS DINÂMICAS */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {displayCategories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-6 py-3 rounded-full font-bold text-xs whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeCategory === c.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUTOS */}
      <main className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        <AnimatePresence mode='popLayout'>
          {products.filter(p => (activeCategory === 'all' || p.category === activeCategory) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
             const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock; 
             return (
                <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all ${!hasStock ? 'opacity-60 grayscale' : ''}`}>
                <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative">
                    <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                    {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                </div>
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                <div className="flex justify-between items-center mt-auto">
                    <span className="text-blue-600 font-black text-sm italic leading-none">R$ {p.price?.toFixed(2)}</span>
                    <button onClick={() => addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                    <ShoppingCart size={16} />
                    </button>
                </div>
                </motion.div>
             );
          })}
        </AnimatePresence>
      </main>
      
      <section className="px-6 py-10 bg-slate-100/50 text-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Estamos localizados em</h2>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm max-w-md mx-auto border border-white">
            <p className="font-black text-slate-800 uppercase tracking-tighter italic text-xl mb-1">CONVENIÊNCIA SANTA ISABEL</p>
            <p className="text-slate-500 text-xs font-bold mb-6 uppercase tracking-widest">R. Neida Maciel, 122 - Santa Isabel Viamão - RS</p>
            <a href="https://share.google/BM8tOiMLqp6yzxibm" target="_blank" className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all">
                Ver no Google Maps <ExternalLink size={14}/>
            </a>
        </div>
      </section>

      <footer className="p-12 text-center">
        <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] mb-6">Plataforma de Vendas</p>
        <div className="flex flex-col items-center opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer">
          <img src="/logo retangular Vero Delivery.png" className="h-6 w-auto mb-2" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
        </div>
      </footer>

      {/* Ícone Carrinho e Track */}
      <motion.button onClick={() => setShowCheckout(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-xl z-50 hover:bg-blue-700 active:scale-90" initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <ShoppingCart size={24} />
        {cart.length > 0 && <motion.div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{cart.reduce((acc, item) => acc + item.quantity, 0)}</motion.div>}
      </motion.button>
      
      <AnimatePresence>
        {activeOrderId && (
          <motion.button onClick={() => navigate(`/track/${activeOrderId}`)} className="fixed bottom-6 left-6 bg-purple-600 text-white rounded-full p-4 shadow-xl z-50 hover:bg-purple-700 active:scale-90 flex items-center gap-2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
            <Truck size={24} /> <span className="font-bold text-sm pr-2">Acompanhar</span>
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* CHECKOUT COMPLETO */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SEU PEDIDO</h2>
              
              {cart.length === 0 ? <p className="text-center py-10 font-bold text-slate-500">Carrinho vazio.</p> : (
                <>
                  <div className="space-y-4 mb-8 mt-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3"><img src={item.imageUrl} className="w-12 h-12 object-contain rounded-lg bg-white p-1"/><div className="text-sm font-bold">{item.name}</div></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus size={16}/></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus size={16}/></button>
                          <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Detalhes:</p>
                  <input type="text" placeholder="Seu Nome" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
<input
     type="tel"
     placeholder="WhatsApp"
     className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none"
     value={customer.phone}
     onChange={handlePhoneChange} // MODIFIQUE PARA handlePhoneChange
  />                  <div className="relative">
                     <input type="tel" placeholder="CEP" maxLength="9" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.cep} onChange={e => setCustomer({...customer, cep: e.target.value})} />
                     {isCepLoading && <Loader2 className="animate-spin absolute right-5 top-5 text-blue-500"/>}
                  </div>
                  {customer.street && (
                    <>
                        <input type="text" value={customer.street} disabled className="w-full p-5 bg-slate-200 text-slate-500 rounded-[2rem] mb-3 font-bold"/>
                        <input type="text" placeholder="Número / Complemento" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.number} onChange={e => setCustomer({...customer, number: e.target.value})}/>
                    </>
                  )}
                  {cepError && <p className="text-red-500 text-xs font-bold text-center">{cepError}</p>}
                  {deliveryAreaMessage && !cepError && <p className="text-blue-500 text-xs font-bold text-center">{deliveryAreaMessage}</p>}
                  
                  <p className="font-black text-xs text-slate-400 uppercase mt-4 ml-4 tracking-widest">Pagamento:</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                     {[ {id:'pix', name:'PIX', icon: <QrCode size={20}/>}, {id:'cartao', name:'CARTÃO', icon: <CreditCard size={20}/>}, {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>} ].map(m => (
                        <button key={m.id} onClick={()=>setCustomer({...customer, payment:m.id})} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${customer.payment===m.id?'bg-blue-50 border-blue-600 text-blue-600':'border-transparent bg-slate-50 text-slate-400'}`}>
                            {m.icon} <span className="text-[9px] font-black uppercase mt-1">{m.name}</span>
                        </button>
                     ))}
                  </div>
                  {customer.payment === 'dinheiro' && <input type="text" placeholder="Troco para..." className="w-full p-5 bg-slate-50 rounded-[2rem] mt-3 font-bold" value={customer.changeFor} onChange={e => setCustomer({...customer, changeFor: e.target.value})} />}

                  <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-xl">
                      <div className="flex justify-between text-sm opacity-60 font-bold mb-2"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm opacity-60 font-bold mb-4"><span>Frete</span><span>{shippingFee !== null ? `R$ ${shippingFee.toFixed(2)}` : '--'}</span></div>
                      <div className="flex justify-between text-xl font-black italic"><span>TOTAL</span><span>R$ {finalTotal.toFixed(2)}</span></div>
                  </div>

                  <button onClick={finalizeOrder} disabled={!isStoreOpenNow || isCepLoading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black mt-6 uppercase text-xl shadow-xl hover:bg-blue-700 disabled:opacity-50">
                     {isCepLoading ? 'Calculando...' : 'Confirmar Pedido'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLastOrders && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[101] p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowLastOrders(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32} /></button>
              <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter italic">SEUS PEDIDOS</h2>
              {lastOrders.length === 0 ? (
                <p className="text-center py-10 font-bold text-slate-500">Nenhum pedido encontrado.</p>
              ) : (
                <div className="space-y-4">
                  {lastOrders.map(order => (
                    <div key={order.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="font-bold text-sm text-slate-700">Pedido #{order.id.substring(0, 6)}</p>
                      <ul className="list-disc pl-5 text-sm text-slate-600">
                        {order.items.map(item => (
                          <li key={item.id}>{item.name} (x{item.quantity})</li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center mt-4">
                        <p className="font-black text-blue-600 italic">Total: R$ {order.total?.toFixed(2)}</p>
                        <button onClick={() => repeatOrder(order)} className="bg-orange-600 text-white py-2 px-4 rounded-xl font-bold uppercase text-xs">Repetir Pedido</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
  );
}