import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WppWebview() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerPhone = searchParams.get('u');

  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas'); 
  const [searchTerm, setSearchTerm] = useState('');

  // NOVOS ESTADOS: Cliente, Cupom e Desconto
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Lógica de categorias e motor de busca
  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];

  const filteredMenu = menu.filter(p => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Função simulada de validação de cupom
  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'VELO10') {
      setDiscount(10);
      alert('Cupom aplicado: R$ 10,00 de desconto!');
    } else {
      alert('Cupom inválido ou expirado.');
      setDiscount(0);
    }
  };

  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const deliveryFee = store?.deliveryFee || 0; 
  // O total agora respeita o desconto, não deixando ficar negativo
  const cartTotal = Math.max(0, cartSubtotal + deliveryFee - discount);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

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
        setMenu(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Puxa a taxa de entrega cadastrada no painel do Firebase (padrão 0 se não existir)
  const deliveryFee = store?.deliveryFee || 0; 
  const cartTotal = cartSubtotal + deliveryFee;
  
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-400 text-sm italic">Carregando Velo Delivery...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-400 text-sm italic">Loja não encontrada.</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans transition-colors duration-300">
      {/* HEADER COM LOGO E PESQUISA */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          {store?.storeLogoUrl || store?.logo || store?.logoUrl ? (
            <img 
              src={store.storeLogoUrl || store.logo || store.logoUrl} 
              alt={store.name} 
              className="w-12 h-12 rounded-2xl shadow-sm object-cover border border-gray-100 dark:border-slate-700 bg-white" 
            />
          ) : (
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {store?.name?.charAt(0).toUpperCase() || "V"}
            </div>
          )}
          <div>
            <h1 className="font-black text-gray-900 dark:text-white leading-none tracking-tight">{store?.name || "Velo Delivery"}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest">Aberto agora</span>
            </div>
          </div>
        </div>

        <div className="relative mb-2">
          <input 
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl py-3 px-11 text-sm text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      {/* NAVEGAÇÃO DE CATEGORIAS */}
      <nav className="sticky top-[138px] z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-50 dark:border-slate-800 overflow-x-auto flex gap-2 p-4 pt-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${
              selectedCategory === cat
                ? "bg-orange-600 text-white shadow-lg shadow-orange-200"
                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
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
              className="bg-gray-50 dark:bg-slate-800/60 rounded-[32px] p-3 border border-gray-100 dark:border-slate-800 flex flex-col h-full shadow-sm relative overflow-hidden"
            >
              <div className="relative mb-3 aspect-square w-full">
                <img 
                  src={product.image || product.imageUrl || product.img || 'https://via.placeholder.com/300?text=Sem+Foto'} 
                  alt={product.name} 
                  className="w-full h-full rounded-[24px] object-cover shadow-inner bg-slate-200 dark:bg-slate-700"
                />
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="absolute -bottom-2 -right-1 bg-orange-600 text-white p-2.5 rounded-2xl shadow-xl hover:bg-orange-700 active:scale-90 transition-all z-20 border-4 border-white dark:border-slate-800 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="px-1 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-[11px] leading-tight line-clamp-2 mb-1 uppercase tracking-tight italic">
                  {product.name}
                </h3>
                <span className="text-orange-600 dark:text-orange-400 font-black text-sm mt-auto">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* BOTÃO FLUTUANTE DA SACOLA */}
      <AnimatePresence>
        {cartItemCount > 0 && !isCheckoutOpen && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-4 right-4 z-50">
            <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-5 rounded-[32px] shadow-2xl flex justify-between items-center px-8 active:scale-95 transition-all">
              <div className="flex items-center gap-3">
                <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black">{cartItemCount}</div>
                <span className="font-bold tracking-tight uppercase text-xs">Ver sacola</span>
              </div>
              <span className="font-black text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT (BOTTOM SHEET) */}
      {/* MODAL DE CHECKOUT PROFISSIONAL */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-900 rounded-t-[40px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto my-3" />
              <div className="p-6 overflow-y-auto no-scrollbar">
                
                {/* BANNER GAMIFICAÇÃO: CLUBE VIP / CASHBACK */}
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-lg shadow-orange-500/20">
                  <div className="bg-white/20 p-2 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-wider">Clube VIP Velo</h4>
                    <p className="text-white/90 text-xs">Este pedido gera Cashback para a próxima compra!</p>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Dados da Entrega</h2>
                
                {/* FORMULÁRIO DO CLIENTE */}
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Seu Nome</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João Silva" 
                      className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-500 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Endereço Completo</label>
                    <textarea 
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Complemento" 
                      rows="2"
                      className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-500 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* LISTAGEM DE ITENS E CUPOM */}
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 tracking-tight">Resumo do Pedido</h2>
                <div className="space-y-3 mb-6 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-600 dark:text-slate-300 font-medium"><b className="text-orange-600 mr-1">{item.quantity}x</b> {item.name}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* CUPOM DE DESCONTO */}
                <div className="flex gap-2 mb-8">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Tem um cupom?" 
                    className="flex-1 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none uppercase font-bold"
                  />
                  <button onClick={handleApplyCoupon} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 rounded-xl font-bold text-sm hover:bg-orange-600 dark:hover:bg-orange-500 transition-colors">
                    Aplicar
                  </button>
                </div>

                {/* CÁLCULOS FINAIS */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-4 mb-6 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Taxa de Entrega</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">
                      {deliveryFee > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee) : 'Grátis'}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400 font-bold">
                      <span>Desconto Aplicado</span>
                      <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-8 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  <span className="text-xs font-black text-orange-800 dark:text-orange-500 uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-3xl font-black text-orange-600 dark:text-orange-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                </div>

                {/* BOTÃO DE PAGAMENTO + SALVAR NO FIREBASE */}
                <button 
                  onClick={async () => {
                    if (!customerName || !customerAddress) {
                      alert('Por favor, preencha seu nome e endereço para entrega.');
                      return;
                    }

                    try {
                      // 1. SALVA O PEDIDO NO FIREBASE (Status: Pendente)
                      const orderData = {
                        storeId: slug,
                        customerPhone: customerPhone || 'Não informado',
                        customerName,
                        customerAddress,
                        items: cart,
                        subtotal: cartSubtotal,
                        deliveryFee,
                        discount,
                        total: cartTotal,
                        couponUsed: discount > 0 ? couponCode : null,
                        status: 'pending_payment',
                        createdAt: serverTimestamp(),
                        source: 'whatsapp_webview'
                      };
                      
                      const orderRef = await addDoc(collection(db, 'orders'), orderData);
                      console.log('Pedido salvo com sucesso! ID:', orderRef.id);

                      // 2. CHAMA O VELOPAY PASSANDO O ID DO PEDIDO
                      const response = await fetch('/api/velopay/create-mp-preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          cart, 
                          storeId: slug, 
                          orderId: orderRef.id, // O webhook do MP vai usar esse ID
                          customerName,
                          customerPhone, 
                          total: cartTotal 
                        })
                      });
                      
                      const data = await response.json();
                      if (data.init_point) {
                        window.location.href = data.init_point;
                      } else {
                        alert('Erro ao gerar pagamento: ' + (data.error || 'Desconhecido'));
                      }
                    } catch (e) { 
                      console.error('Erro na transação:', e);
                      alert('Ocorreu um erro ao processar seu pedido. Tente novamente.'); 
                    }
                  }}
                  className="w-full bg-[#009EE3] text-white p-5 rounded-[24px] font-black text-lg shadow-xl shadow-[#009EE3]/30 active:scale-95 transition-all flex items-center justify-center gap-3 mb-6"
                >
                  Continuar para Pagamento
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}