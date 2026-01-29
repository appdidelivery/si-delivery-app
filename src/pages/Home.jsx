// si-delivery-app-main/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, MapPin, ExternalLink, QrCode, CreditCard, Banknote, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: <Utensils size={18}/> },
  { id: 'Cervejas', name: 'Cervejas', icon: <Beer size={18}/> },
  { id: 'Destilados', name: 'Destilados', icon: <Wine size={18}/> },
  { id: 'Sem Álcool', name: 'Sucos/Refris', icon: <Refrigerator size={18}/> },
];

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [customer, setCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' });
  
  const [cartAnimationKey, setCartAnimationKey] = useState(0); 
  const [promo, setPromo] = useState(null);

  const [storeConfig, setStoreConfig] = useState({
    isOpen: true,
    openTime: '08:00',
    closeTime: '23:00',
    message: 'Aberto agora!',
    storeLogoUrl: '/logo-loja.png',
    storeBannerUrl: '/fachada.jpg',
  });
  const [isStoreOpenNow, setIsStoreOpenNow] = useState(true); 
  const [storeMessage, setStoreMessage] = useState('Verificando status...');

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPromo = onSnapshot(doc(db, "settings", "marketing"), (d) => d.exists() && setPromo(d.data()));
    
    const unsubStoreConfig = onSnapshot(doc(db, "settings", "store_status"), (d) => {
      if (d.exists()) {
        const data = d.data();
        setStoreConfig(data);

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); 

        const [openHour, openMinute] = (data.openTime || '00:00').split(':').map(Number);
        const [closeHour, closeMinute] = (data.closeTime || '23:59').split(':').map(Number);

        const scheduledOpenTime = openHour * 60 + openMinute;
        const scheduledCloseTime = closeHour * 60 + closeMinute;

        // Verifica se a hora atual está dentro do horário de funcionamento agendado
        const isCurrentlyOpenBySchedule = currentTime >= scheduledOpenTime && currentTime < scheduledCloseTime;
        
        // O status final da loja depende tanto da configuração manual (isOpen) quanto do horário agendado
        const finalStatus = data.isOpen && isCurrentlyOpenBySchedule;

        setIsStoreOpenNow(finalStatus);
        setStoreMessage(data.message || (finalStatus ? 'Aberto agora!' : 'Fechado no momento.'));

      } else {
        // Se o documento de configuração não existir, assume-se aberto com mensagem padrão
        setIsStoreOpenNow(true);
        setStoreMessage('Aberto agora!');
      }
    });

    return () => { 
      unsubProducts(); 
      unsubPromo(); 
      unsubStoreConfig();
    };
  }, []);

  const addToCart = (p) => {
    // Apenas alerte se a loja não estiver aberta e retorne
    if (!isStoreOpenNow) {
      alert(storeMessage); 
      return;
    }
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      return ex ? prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i) : [...prev, {...p, quantity: 1}];
    });
    setCartAnimationKey(prev => prev + 1); 
  };

  const updateQuantity = (productId, amount) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity + amount } : item
      ).filter(item => item.quantity > 0); 
      return updatedCart;
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  const finalizeOrder = async () => {
    // Apenas alerte se a loja não estiver aberta e retorne
    if (!isStoreOpenNow) { 
      alert(storeMessage);
      return;
    }
    if(!customer.name || !customer.address || !customer.phone) return alert("Por favor, preencha todos os campos!");
    if(cart.length === 0) return alert("Seu carrinho está vazio!");
    
    // Se o pagamento for em dinheiro e o campo de troco não for preenchido, alerte.
    if (customer.payment === 'dinheiro' && !customer.changeFor) {
      const confirmWithoutChange = window.confirm("Você selecionou 'Dinheiro' mas não especificou o valor para troco. Deseja continuar mesmo assim? Caso precise de troco, por favor, volte e preencha.");
      if (!confirmWithoutChange) {
        return; 
      }
    }


    try {
      const docRef = await addDoc(collection(db, "orders"), {
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone,
        payment: customer.payment,
        customerChangeFor: customer.payment === 'dinheiro' ? customer.changeFor : '', // Envia o troco apenas se for dinheiro
        items: cart,
        total: subtotal,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      navigate(`/track/${docRef.id}`);
      setCart([]);
      setShowCheckout(false);
      setCustomer({ name: '', address: '', phone: '', payment: 'pix', changeFor: '' }); // Limpa o formulário do cliente
    } catch (e) {
      console.error("Erro ao processar pedido:", e);
      alert("Erro ao processar pedido. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <SEO title="Conveniência Santa Isabel" description="Bebidas geladas e muito mais." />

      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src={storeConfig.storeLogoUrl} alt="Logo" className="h-12 w-12 rounded-full object-cover border-2 border-blue-600 shadow-sm" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none uppercase">Conveniência</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Santa Isabel</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isStoreOpenNow ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {isStoreOpenNow ? <Clock size={14}/> : <XCircle size={14}/>}
          <span className="text-[10px] font-black uppercase">{storeMessage}</span>
        </div>
      </header>

      <div className="w-full h-48 md:h-64 relative overflow-hidden">
        <img src={storeConfig.storeBannerUrl} alt="Fachada" className="w-full h-full object-cover brightness-75" onError={(e)=>e.target.src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1000"} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 text-white text-xs font-bold mb-1 uppercase tracking-widest">
            <MapPin size={14} className="text-blue-400"/> Santa Isabel - Loja principal
          </div>
          <p className="text-white text-sm opacity-80 font-medium">Bebidas geladas, gelo, carvão e destilados. Entregamos em toda cidade.</p>
        </div>
      </div>

      <AnimatePresence>
        {promo?.promoActive && promo?.promoBannerUrl && (
          <motion.div layout initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="overflow-hidden p-6">
            <img src={promo.promoBannerUrl} alt="Banner de Promoção Relâmpago" className="w-full h-auto object-contain rounded-[2rem] shadow-xl border-4 border-white"/>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="O que você procura?" className="w-full p-4 pl-12 rounded-2xl bg-white border-none shadow-sm outline-none focus:ring-2 ring-blue-600 font-medium transition-all" onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-6 py-3 rounded-full font-bold text-xs whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeCategory === c.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        <AnimatePresence mode='popLayout'>
          {products.filter(p => (activeCategory === 'all' || p.category === activeCategory) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all">
              <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden">
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-blue-600 font-black text-sm italic leading-none">R$ {p.price?.toFixed(2)}</span>
                <button onClick={() => addToCart(p)} disabled={!isStoreOpenNow} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                  <ShoppingCart size={16} />
                </button>
              </div>
            </motion.div>
          ))}
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
          <img src="/logo retangular Vero Delivery.png" alt="Velo" className="h-6 w-auto mb-2" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
          <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Tecnologia em Logística de Bebidas</p>
        </div>
      </footer>

      {/* --- Ícone do carrinho fixo --- */}
      <motion.button onClick={() => setShowCheckout(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-xl z-50 hover:bg-blue-700 transition-all active:scale-90" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}>
        <ShoppingCart size={24} />
        {cart.length > 0 && (
          <motion.div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            {cart.reduce((acc, item) => acc + item.quantity, 0)}
          </motion.div>
        )}
      </motion.button>
      
      {/* MODAL DE CHECKOUT */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SEU PEDIDO</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase mb-10 tracking-[0.2em]">Revise e finalize</p>
              
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <ShoppingCart size={48} className="mx-auto mb-4"/>
                  <p className="font-bold text-lg">Seu carrinho está vazio.</p>
                  <button onClick={() => setShowCheckout(false)} className="mt-4 text-blue-600 font-bold">Continuar comprando</button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {cart.map(item => (
                      <motion.div key={item.id} layout initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-white p-1"/>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                            <p className="text-blue-600 font-black text-xs">R$ {(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 bg-white rounded-lg text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100"><Minus size={16}/></button>
                          <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 bg-white rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-slate-100"><Plus size={16}/></button>
                          <button onClick={() => removeFromCart(item.id)} className="p-1.5 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition-colors border border-red-100 ml-2"><Trash2 size={16}/></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Detalhes da Entrega:</p>
                  <div className="space-y-6 mt-4">
                    <input type="text" placeholder="Seu Nome Completo" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                    <input type="tel" placeholder="WhatsApp (00) 00000-0000" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
                    <input type="text" placeholder="Endereço de Entrega Completo" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                    
                    <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Pagar na Entrega via:</p>
                    <div className="grid grid-cols-3 gap-3">
                        {[ {id:'pix', name:'PIX', icon: <QrCode size={20}/>}, {id:'cartao', name:'CARTÃO', icon: <CreditCard size={20}/>}, {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>} ].map(pay => (
                            <button key={pay.id} onClick={() => setCustomer({...customer, payment: pay.id, changeFor: ''})} className={`flex flex-col items-center gap-2 p-5 rounded-[2rem] border-2 transition-all ${customer.payment === pay.id ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105 shadow-xl' : 'border-slate-50 text-slate-400'}`}>
                                {pay.icon} <span className="text-[10px] font-black uppercase">{pay.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* --- CAMPO DE TROCO CONDICIONAL --- */}
                    <AnimatePresence>
                      {customer.payment === 'dinheiro' && (
                        <motion.div initial={{opacity:0, height: 0}} animate={{opacity:1, height: 'auto'}} exit={{opacity:0, height: 0}} className="overflow-hidden">
                          <input 
                            type="text" 
                            placeholder="Precisa de troco? Para qual valor?" 
                            className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" 
                            value={customer.changeFor} 
                            onChange={e => setCustomer({...customer, changeFor: e.target.value})} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] flex justify-between items-center text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Total</p>
                        <p className="text-4xl font-black italic">R$ {subtotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-600/20 p-4 rounded-full"><Navigation className="text-blue-500" size={32}/></div>
                  </div>

                  <button onClick={finalizeOrder} disabled={!isStoreOpenNow} className={`w-full py-8 rounded-[2.5rem] font-black text-xl mt-8 uppercase tracking-widest shadow-2xl transition-all ${isStoreOpenNow ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white' : 'bg-slate-500 text-slate-300 cursor-not-allowed'}`}>
                    Confirmar Pedido
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}