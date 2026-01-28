import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, MapPin, ExternalLink, QrCode, CreditCard, Banknote } from 'lucide-react';
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
  const [customer, setCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix' });
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(doc(db, "settings", "marketing"), (d) => d.exists() && setPromo(d.data()));
  }, []);

  const addToCart = (p) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      return ex ? prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i) : [...prev, {...p, quantity: 1}];
    });
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  const finalizeOrder = async () => {
    if(!customer.name || !customer.address || !customer.phone) return alert("Por favor, preencha todos os campos!");
    
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone,
        payment: customer.payment,
        items: cart,
        total: subtotal,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      navigate(`/track/${docRef.id}`);
      setCart([]);
      setShowCheckout(false);
    } catch (e) {
      alert("Erro ao processar pedido. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <SEO title="Conveniência Santa Isabel" description="Bebidas geladas e muito mais." />

      {/* 1. TOPO: LOGO E STATUS */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-loja.png" alt="Logo" className="h-12 w-12 rounded-full object-cover border-2 border-blue-600 shadow-sm" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"}/>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none uppercase">Conveniência</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Santa Isabel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-100">
          <Clock size={14}/>
          <span className="text-[10px] font-black uppercase">Aberto</span>
        </div>
      </header>

      {/* 2. BANNER DA FACHADA */}
      <div className="w-full h-48 md:h-64 relative overflow-hidden">
        <img 
          src="/fachada.jpg" 
          alt="Fachada" 
          className="w-full h-full object-cover brightness-75"
          onError={(e)=>e.target.src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1000"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 text-white text-xs font-bold mb-1 uppercase tracking-widest">
            <MapPin size={14} className="text-blue-400"/> Santa Isabel - SP
          </div>
          <p className="text-white text-sm opacity-80 font-medium">Bebidas geladas, gelo, carvão e lanches. Entregamos em toda cidade.</p>
        </div>
      </div>

      {/* PROMOÇÃO RELÂMPAGO DINÂMICA */}
      <AnimatePresence>
        {promo?.promoActive && (
          <motion.div initial={{height:0}} animate={{height:'auto'}} className="bg-orange-500 text-white p-3 text-center text-xs font-black uppercase italic tracking-tighter shadow-xl">
            🔥 Ofertas Relâmpago Ativas! Aproveite agora!
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUSCA E CATEGORIAS */}
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

      {/* GRID DE PRODUTOS */}
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
                <button onClick={() => addToCart(p)} className="bg-blue-600 text-white p-2.5 rounded-xl active:scale-90 shadow-lg shadow-blue-100">
                  <ShoppingCart size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* INFORMAÇÕES DO MAPA */}
      <section className="px-6 py-10 bg-slate-100/50 text-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Estamos localizados em</h2>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm max-w-md mx-auto border border-white">
            <p className="font-black text-slate-800 uppercase tracking-tighter italic text-xl mb-1">CONVENIÊNCIA SANTA ISABEL</p>
            <p className="text-slate-500 text-xs font-bold mb-6 uppercase tracking-widest">Avenida Principal, 123 - Centro</p>
            <a href="https://maps.google.com" target="_blank" className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all">
                Ver no Google Maps <ExternalLink size={14}/>
            </a>
        </div>
      </section>

      {/* RODAPÉ VELO DELIVERY (REFERRAL) */}
      <footer className="p-12 text-center">
        <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] mb-6">Plataforma de Vendas</p>
        <div className="flex flex-col items-center opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer">
          <img src="/logo-square.png" alt="Velo" className="h-6 w-auto mb-2" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
          <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Tecnologia em Logística de Bebidas</p>
        </div>
      </footer>

      {/* BARRA FLUTUANTE DO CARRINHO */}
      <AnimatePresence>
        {cart.length > 0 && !showCheckout && (
          <motion.div initial={{y:100}} animate={{y:0}} exit={{y:100}} className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-4 rounded-[2.5rem] shadow-2xl flex justify-between items-center z-[60] border border-white/10">
            <div className="flex items-center gap-4 ml-2">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg"><ShoppingCart size={20}/></div>
              <div>
                <p className="text-lg font-black italic">R$ {subtotal.toFixed(2)}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{cart.length} ITENS</p>
              </div>
            </div>
            <button onClick={() => setShowCheckout(true)} className="bg-blue-600 px-10 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-500 transition-all active:scale-95">Finalizar</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT (O QUE ESTAVA FALTANDO!) */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">CHECKOUT</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase mb-10 tracking-[0.2em]">Onde entregamos sua gelada?</p>
              
              <div className="space-y-6">
                <input type="text" placeholder="Seu Nome Completo" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" onChange={e => setCustomer({...customer, name: e.target.value})} />
                <input type="tel" placeholder="WhatsApp (00) 00000-0000" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" onChange={e => setCustomer({...customer, phone: e.target.value})} />
                <input type="text" placeholder="Endereço de Entrega Completo" className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold shadow-inner border-none transition-all focus:ring-4 ring-blue-50" onChange={e => setCustomer({...customer, address: e.target.value})} />
                
                <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Pagar na Entrega via:</p>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {id:'pix', name:'PIX', icon: <QrCode size={20}/>},
                        {id:'cartao', name:'CARTÃO', icon: <CreditCard size={20}/>},
                        {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>}
                    ].map(pay => (
                        <button key={pay.id} onClick={() => setCustomer({...customer, payment: pay.id})} className={`flex flex-col items-center gap-2 p-5 rounded-[2rem] border-2 transition-all ${customer.payment === pay.id ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105 shadow-xl' : 'border-slate-50 text-slate-400'}`}>
                            {pay.icon} <span className="text-[10px] font-black uppercase">{pay.name}</span>
                        </button>
                    ))}
                </div>
              </div>

              <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] flex justify-between items-center text-white shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Pedido</p>
                    <p className="text-4xl font-black italic">R$ {subtotal.toFixed(2)}</p>
                 </div>
                 <div className="bg-blue-600/20 p-4 rounded-full"><Navigation className="text-blue-500" size={32}/></div>
              </div>

              <button onClick={finalizeOrder} className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl mt-8 uppercase tracking-widest shadow-2xl hover:bg-blue-700 active:scale-95 transition-all">Confirmar Pedido</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}