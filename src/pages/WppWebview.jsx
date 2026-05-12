import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WppWebview() {
  // Substituindo useRouter do Next pelo React Router Dom (Padrão Vite)
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerPhone = searchParams.get('u');

  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas'); 

  // Extrai categorias dinâmicas dos seus produtos do Firebase
  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];

  // Filtra os produtos para a exibição na grade
  const filteredMenu = selectedCategory === 'Todas' 
    ? menu 
    : menu.filter(p => p.category === selectedCategory);

  useEffect(() => {
    if (slug) {
      fetchStoreData();
    }
    if (customerPhone) {
      console.log("Cliente identificado via WhatsApp:", customerPhone);
    }
  }, [slug, customerPhone]);

  const fetchStoreData = async () => {
    try {
      const storeRef = doc(db, "stores", slug);
      const storeSnap = await getDoc(storeRef);
      
      if (storeSnap.exists()) {
        setStore({ id: storeSnap.id, ...storeSnap.data() });
        
        // Removemos o filtro de 'active' temporariamente para forçar a exibição
        const q = query(collection(db, "products"), where("storeId", "==", storeSnap.id));
        const querySnapshot = await getDocs(q);
        
        const fetchedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Produtos encontrados para esta loja:", fetchedProducts.length);
        console.log("Dados do primeiro produto:", fetchedProducts[0]);
        
        // Se a sua base usa um campo diferente para ativo, podemos filtrar no map depois:
        // const activeProducts = fetchedProducts.filter(p => p.active !== false);
        setMenu(fetchedProducts);
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

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-gray-500 text-sm">Carregando cardápio...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-white text-gray-500 text-sm">Loja não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-orange-100">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Tenta carregar 'logo' ou 'logoUrl' do Firebase */}
          {store?.logo || store?.logoUrl ? (
            <img 
              src={store?.logo || store?.logoUrl} 
              alt={store.name} 
              className="w-12 h-12 rounded-2xl shadow-sm object-cover border border-gray-100 dark:border-slate-700 bg-white" 
            />
          ) : (
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {store?.name?.charAt(0) || "V"}
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
      </header>

      <nav className="sticky top-[81px] z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-50 dark:border-slate-800 overflow-x-auto flex gap-2 p-4 pt-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${
              selectedCategory === cat
                ? "bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

     <main className="p-4 pb-40">
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map((product) => (
            <motion.div 
              key={product.id}
              whileTap={{ scale: 0.97 }}
              className="bg-gray-50 dark:bg-slate-800/40 rounded-[32px] p-3 border border-gray-100 dark:border-slate-800 flex flex-col h-full"
            >
              <div className="relative mb-3">
                <motion.div 
              key={product.id}
              whileTap={{ scale: 0.95 }}
              className="bg-gray-50 dark:bg-slate-800/60 rounded-[32px] p-3 border border-gray-100 dark:border-slate-800 flex flex-col h-full shadow-sm"
            >
              <div className="relative mb-3 aspect-square w-full">
                <img 
                  src={product.image || product.imageUrl || product.img || 'https://via.placeholder.com/300?text=Sem+Foto'} 
                  alt={product.name} 
                  className="w-full h-full rounded-[24px] object-cover shadow-inner bg-slate-200 dark:bg-slate-700"
                />
                <button 
                  onClick={() => addToCart(product)}
                  className="absolute -bottom-2 -right-1 bg-orange-600 text-white p-2.5 rounded-2xl shadow-xl hover:bg-orange-700 active:scale-90 transition-all z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="px-1 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-xs leading-tight line-clamp-2 mb-1 uppercase tracking-tight italic">
                  {product.name}
                </h3>
                <span className="text-orange-600 dark:text-orange-400 font-black text-sm mt-auto">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
              </div>
            </motion.div>
                <button 
                  onClick={() => addToCart(product)}
                  className="absolute -bottom-2 -right-1 bg-orange-600 text-white p-2.5 rounded-2xl shadow-xl hover:bg-orange-700 active:scale-90 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-[13px] leading-tight line-clamp-2 px-1 flex-1">{product.name}</h3>
              <span className="text-orange-600 dark:text-orange-400 font-black text-sm mt-2 px-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </span>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-40"
          >
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full bg-orange-600 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center font-bold hover:bg-orange-700"
            >
              <div className="flex items-center gap-2">
                <span className="bg-orange-700 px-3 py-1 rounded-lg text-xs">{cartItemCount}</span>
                <span>Ver Pedido</span>
              </div>
              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="font-bold text-lg text-gray-900">Resumo do Pedido</h2>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold text-xs hover:bg-gray-200"
              >
                Voltar
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-md text-sm">{item.quantity}x</span>
                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              
              <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center font-black text-gray-900 mb-4 text-lg">
                  <span>Total:</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                </div>
                
                <p className="text-xs text-gray-500 mb-4 text-center">
                  Ambiente seguro. Transação protegida pelo Mercado Pago.
                </p>
                
                <button 
                  onClick={async () => {
                    try {
                      console.log(`Iniciando MP para loja: ${store.name}`);
                      // Rota apontando para a pasta /api raiz da Vercel
                      const response = await fetch('/api/velopay/create-mp-preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          cart,
                          storeId: slug,
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
                    } catch (error) {
                      console.error('Falha na requisição:', error);
                      alert('Erro na conexão. Tente novamente.');
                    }
                  }}
                  className="w-full bg-[#009EE3] text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#0088C4] active:scale-[0.98] transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Pagar com Mercado Pago
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}