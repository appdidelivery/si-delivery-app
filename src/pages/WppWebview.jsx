import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WppWebview() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerPhone = searchParams.get('u');

  // Estados Base
  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Filtros
  const [selectedCategory, setSelectedCategory] = useState('Todas'); 
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Detalhes do Produto (Remoções e Observações)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemObservation, setItemObservation] = useState('');
  const [itemRemoved, setItemRemoved] = useState([]);

  // Dados do Cliente e Logística
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  
  // Financeiro e Gamificação
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingFreight, setLoadingFreight] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lógica de Categorias e Busca
  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];

  const filteredMenu = menu.filter(p => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (slug) fetchStoreData();
  }, [slug]);

  const fetchStoreData = async () => {
    try {
      const storeRef = doc(db, "stores", slug);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        setStore({ id: storeSnap.id, ...storeSnap.data() });
        const q = query(collection(db, "products"), where("storeId", "==", storeSnap.id));
        const querySnapshot = await getDocs(q);
        // Traz apenas produtos ativos
        const fetchedProducts = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isActive !== false);
        setMenu(fetchedProducts);
      }
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carrinho Inteligente (Gera uma assinatura única se tiver observações diferentes)
  const addToCart = (product, obs = '', removed = []) => {
    const priceToUse = product.promotionalPrice > 0 ? product.promotionalPrice : product.price;
    const signature = `${product.id}-${obs.trim().toLowerCase()}-${removed.sort().join(',')}`;
    
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.signature === signature);
      if (existingItem) {
        return prevCart.map(item => 
          item.signature === signature ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, price: priceToUse, signature, quantity: 1, observation: obs, removedItems: removed }];
    });
  };

  // Calcula o Frete via API da Vercel + Google Maps
  const calculateRealFreight = async (address) => {
    if (!address || address.length < 10 || deliveryMethod === 'pickup') {
        setDeliveryFee(0);
        return;
    }
    setLoadingFreight(true);
    try {
      const response = await fetch('/api/velopay/calculate-freight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: slug, customerAddress: address })
      });
      const data = await response.json();
      
      if (response.ok) {
        setDeliveryFee(Number(data.deliveryFee));
      } else {
        alert(data.error || 'Não foi possível calcular o frete para este endereço.');
        setDeliveryFee(0);
      }
    } catch (e) {
      console.error('Erro no frete:', e);
      setDeliveryFee(0);
    } finally {
      setLoadingFreight(false);
    }
  };

  const handleApplyCoupon = () => {
    // Simulação de cupom básico. Para produção, você conectará com sua coleção `coupons` do Firebase.
    if (couponCode.toUpperCase() === 'VELO10') {
      setDiscount(10);
      alert('Cupom aplicado: R$ 10,00 de desconto!');
    } else {
      alert('Cupom inválido ou expirado.');
      setDiscount(0);
    }
  };

  // Matemática Financeira Blindada
  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal + (deliveryMethod === 'delivery' ? deliveryFee : 0) - discount);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm italic font-bold">Carregando Velo Delivery...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm italic font-bold">Loja não encontrada.</div>;

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans transition-colors duration-300">
      {/* HEADER DA LOJA (MODO ESCURO PREMIUM) */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 p-4 pb-2 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {store?.storeLogoUrl || store?.logo || store?.logoUrl ? (
            <img 
              src={store.storeLogoUrl || store.logo || store.logoUrl} 
              alt={store.name} 
              className="w-12 h-12 rounded-full shadow-md object-cover border-2 border-slate-700 bg-white" 
            />
          ) : (
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
              {store?.name?.charAt(0).toUpperCase() || "V"}
            </div>
          )}
          <div>
            <h1 className="font-black text-white leading-none tracking-tight">{store?.name || "Velo Delivery"}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Aberto agora</span>
            </div>
          </div>
        </div>

        <div className="relative mb-2">
          <input 
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1E293B] border-none rounded-2xl py-3 px-11 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      {/* CATEGORIAS HORIZONTAIS */}
      <nav className="sticky top-[138px] z-30 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 overflow-x-auto flex gap-2 p-4 pt-2 no-scrollbar shadow-sm">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-black transition-all ${
              selectedCategory === cat
                ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/20"
                : "bg-[#1E293B] text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* GRADE DE PRODUTOS */}
      <main className="p-4 pb-40">
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map((product) => (
            <motion.div 
              key={product.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedProduct(product);
                setItemObservation('');
                setItemRemoved([]);
              }}
              className="bg-[#1E293B] rounded-[32px] p-3 border border-slate-700/50 flex flex-col h-full shadow-sm relative overflow-hidden cursor-pointer"
            >
              <div className="relative mb-3 aspect-square w-full">
                <img 
                  src={product.image || product.imageUrl || product.img || 'https://via.placeholder.com/300?text=Sem+Foto'} 
                  alt={product.name} 
                  className="w-full h-full rounded-[24px] object-cover bg-slate-800"
                />
                <button 
                  className="absolute -bottom-2 -right-1 bg-[#F97316] text-white p-2.5 rounded-2xl shadow-xl z-20 border-4 border-[#1E293B] flex items-center justify-center pointer-events-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="px-1 flex flex-col flex-1">
                <h3 className="font-black text-white text-[11px] leading-tight line-clamp-2 mb-1 uppercase tracking-tight italic">
                  {product.name}
                </h3>
                <span className="text-[#F97316] font-black text-sm mt-auto">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.promotionalPrice > 0 ? product.promotionalPrice : product.price)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* MODAL DE DETALHES DO PRODUTO (Ingredientes, Observações) */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/80 z-[80] backdrop-blur-sm flex flex-col justify-end"
          >
            <div className="absolute top-4 right-4 z-[90]">
                <button onClick={() => setSelectedProduct(null)} className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0F172A] w-full rounded-t-[40px] flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Foto do Produto no Modal */}
              <div className="w-full h-56 relative bg-slate-800 shrink-0">
                  <img src={selectedProduct.image || selectedProduct.imageUrl || selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent"></div>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative -mt-10">
                  <h2 className="text-2xl font-black italic text-white uppercase tracking-tight mb-2 leading-none drop-shadow-md">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs font-bold mb-6 leading-relaxed">{selectedProduct.description}</p>
                  
                  <div className="bg-white p-5 rounded-[2rem] shadow-xl space-y-6">
                      
                      {/* O QUE PODE SER REMOVIDO? (Puxado do Painel Admin) */}
                      {selectedProduct.removables && selectedProduct.removables.length > 0 && (
                          <div>
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Retirar Ingredientes</h4>
                              <div className="space-y-3">
                                  {selectedProduct.removables.map((item, idx) => (
                                      <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                          <input 
                                            type="checkbox" 
                                            className="w-5 h-5 accent-[#F97316] rounded-md border-slate-200" 
                                            checked={itemRemoved.includes(item)}
                                            onChange={(e) => {
                                                if (e.target.checked) setItemRemoved([...itemRemoved, item]);
                                                else setItemRemoved(itemRemoved.filter(i => i !== item));
                                            }}
                                          />
                                          <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">Remover {item.toLowerCase()}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* OBSERVAÇÃO EXTRA */}
                      <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Alguma Observação Extra?</h4>
                          <textarea 
                              rows="2" 
                              placeholder="Ex: Maionese à parte, sem mostarda..." 
                              value={itemObservation}
                              onChange={(e) => setItemObservation(e.target.value)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm text-slate-700 resize-none transition-all"
                          />
                      </div>
                  </div>
              </div>

              {/* RODAPÉ DO MODAL (TOTAL E BOTÃO ADD) */}
              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Item</p>
                      <p className="text-2xl font-black italic text-[#F97316] leading-none">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.promotionalPrice > 0 ? selectedProduct.promotionalPrice : selectedProduct.price)}
                      </p>
                  </div>
                  <button 
                      onClick={() => {
                          addToCart(selectedProduct, itemObservation, itemRemoved);
                          setSelectedProduct(null);
                      }}
                      className="bg-[#FBC02D] hover:bg-[#F9A825] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-yellow-500/30 transition-all active:scale-95 flex items-center gap-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      Adicionar
                  </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÃO FLUTUANTE DA SACOLA */}
      <AnimatePresence>
        {cartItemCount > 0 && !isCheckoutOpen && !selectedProduct && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-4 right-4 z-50">
            <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-[#3B82F6] text-white p-5 rounded-[28px] shadow-2xl shadow-blue-500/30 flex justify-between items-center px-8 active:scale-95 transition-all border-2 border-blue-400">
              <div className="flex items-center gap-3">
                <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner">{cartItemCount}</div>
                <span className="font-black tracking-widest uppercase text-sm italic">Ver Sacola</span>
              </div>
              <span className="font-black text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartSubtotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT (CARRINHO E DADOS) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0F172A] rounded-t-[40px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                
                {/* BANNER VIP / CASHBACK */}
                <div className="bg-gradient-to-r from-[#F97316] to-[#EAB308] rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-lg">
                  <div className="bg-white/20 p-2 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-wider">Clube VIP Velo</h4>
                    <p className="text-white/90 text-[10px] font-bold">Este pedido gera Cashback para a próxima compra!</p>
                  </div>
                </div>

                {/* LISTAGEM DE ITENS DO CARRINHO */}
                <div className="bg-[#1E293B] p-5 rounded-[2rem] mb-6 border border-slate-700/50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Resumo da Sacola</h3>
                    <div className="space-y-4">
                      {cart.map((item, i) => (
                        <div key={i} className="flex flex-col border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-slate-300 font-bold max-w-[70%] leading-tight">
                                    <span className="text-[#F97316] font-black mr-2">{item.quantity}x</span> 
                                    {item.name}
                                </span>
                                <span className="font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</span>
                            </div>
                            
                            {/* Renderiza Remoções */}
                            {item.removedItems && item.removedItems.length > 0 && (
                                <p className="text-[10px] text-red-400 font-bold mt-1 ml-6">
                                    <span className="bg-red-500/20 px-1 rounded mr-1">S/</span>
                                    {item.removedItems.join(', ')}
                                </p>
                            )}
                            {/* Renderiza Observações Livres */}
                            {item.observation && (
                                <p className="text-[10px] text-orange-300 font-bold mt-1 ml-6 italic bg-orange-900/30 p-1.5 rounded-lg border border-orange-500/20">
                                    Obs: {item.observation}
                                </p>
                            )}
                        </div>
                      ))}
                    </div>
                </div>

                <h2 className="text-xl font-black text-white mb-4 tracking-tight uppercase italic">Dados para Entrega</h2>
                
                {/* FORMA DE RECEBIMENTO */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                        onClick={() => setDeliveryMethod('delivery')}
                        className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'delivery' ? 'border-[#3B82F6] bg-blue-600/20 text-blue-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}
                    >
                        🛵 Entregar
                    </button>
                    <button 
                        onClick={() => { setDeliveryMethod('pickup'); setDeliveryFee(0); }}
                        className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'pickup' ? 'border-[#3B82F6] bg-blue-600/20 text-blue-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}
                    >
                        🏪 Retirar
                    </button>
                </div>

                {/* FORMULÁRIO DO CLIENTE */}
                <div className="space-y-3 mb-8">
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu Nome Completo *" 
                    className="w-full bg-[#1E293B] border border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none transition-all placeholder-slate-500"
                  />
                  
                  {deliveryMethod === 'delivery' && (
                      <div className="relative">
                          <textarea 
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            onBlur={(e) => calculateRealFreight(e.target.value)}
                            placeholder="Endereço Completo (Rua, Número, Bairro) *" 
                            rows="2"
                            className={`w-full bg-[#1E293B] border-2 rounded-2xl p-4 text-sm font-bold text-white outline-none transition-all resize-none placeholder-slate-500 ${loadingFreight ? 'border-orange-500 animate-pulse' : 'border-slate-700 focus:border-blue-500'}`}
                          />
                          {loadingFreight && <span className="absolute bottom-2 right-4 text-[10px] text-orange-400 font-black uppercase">Calculando frete...</span>}
                      </div>
                  )}
                </div>

                {/* CUPOM DE DESCONTO */}
                <div className="flex gap-2 mb-8">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="CUPOM DE DESCONTO" 
                    className="flex-1 bg-[#1E293B] border-2 border-dashed border-slate-600 rounded-2xl p-4 text-sm text-white outline-none uppercase font-black text-center placeholder-slate-600"
                  />
                  <button onClick={handleApplyCoupon} className="bg-slate-700 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-colors">
                    Aplicar
                  </button>
                </div>

                {/* CÁLCULOS FINAIS */}
                <div className="bg-[#1E293B] rounded-[2rem] p-5 border border-slate-700">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold">Subtotal</span>
                        <span className="font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartSubtotal)}</span>
                      </div>
                      {deliveryMethod === 'delivery' && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold">Taxa de Entrega</span>
                            <span className="font-black text-white">
                              {deliveryFee > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee) : 'Grátis'}
                            </span>
                          </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-400 font-black">
                          <span>Desconto (Cupom)</span>
                          <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total</span>
                      <span className="text-3xl font-black italic text-[#F97316]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                    </div>
                </div>
              </div>

              {/* BOTÃO FINAL DE PAGAMENTO (BLINDADO) */}
              <div className="p-4 bg-[#0F172A] border-t border-slate-800 shrink-0">
                  <button 
                    onClick={async () => {
                      if (!customerName || (deliveryMethod === 'delivery' && !customerAddress)) {
                        alert('Por favor, preencha seu nome e endereço.');
                        return;
                      }

                      setIsSubmitting(true);
                      try {
                        // 1. SALVA O PEDIDO NO FIREBASE (Status: Pendente)
                        const orderData = {
                          storeId: slug,
                          customerPhone: customerPhone || 'Não informado',
                          customerName,
                          customerAddress: deliveryMethod === 'pickup' ? 'Retirada na Loja' : customerAddress,
                          deliveryMethod,
                          items: cart,
                          subtotal: cartSubtotal,
                          shippingFee: deliveryFee,
                          discountAmount: discount,
                          total: cartTotal,
                          couponCode: discount > 0 ? couponCode : null,
                          status: 'pending',
                          paymentStatus: 'pending',
                          paymentMethod: 'velopay_online',
                          createdAt: serverTimestamp(),
                          source: 'whatsapp_webview'
                        };
                        
                        const orderRef = await addDoc(collection(db, 'orders'), orderData);

                        // 2. CHAMA O VELOPAY PARA PROCESSAR CARTÃO/PIX PASSANDO O ID DO PEDIDO
                        const response = await fetch('/api/velopay/create-mp-preference', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            cart, 
                            storeId: slug, 
                            orderId: orderRef.id,
                            customerName,
                            customerPhone, 
                            subtotal: cartSubtotal,
                            deliveryFee: deliveryFee,
                            total: cartTotal 
                          })
                        });
                        
                        const data = await response.json();
                        
                        if (data.init_point) {
                          window.location.href = data.init_point;
                        } else {
                          console.error("Erro MP:", data);
                          alert('Erro ao gerar pagamento: ' + (data.error || 'Desconhecido. Verifique se o painel Mercado Pago está ativado.'));
                        }
                      } catch (e) { 
                        console.error('Erro Crítico no Checkout:', e);
                        alert('Ocorreu um erro de comunicação. Tente novamente.'); 
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting || loadingFreight}
                    className="w-full bg-[#3BAFDA] text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Gerando Pagamento Seguro...' : 'Confirmar Pagamento'}
                  </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}