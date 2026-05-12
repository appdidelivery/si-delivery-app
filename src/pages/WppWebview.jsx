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
  const [searchTerm, setSearchTerm] = useState(''); // <-- NOVO: Estado da pesquisa

  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];

  // Motor de busca combinado: Categoria + Nome do Produto
  const filteredMenu = menu.filter(p => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

  // Lógica de categorias e busca
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

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-500 text-sm italic">Carregando cardápio...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-500 text-sm italic">Loja não encontrada.</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          {store?.logo || store?.logoUrl || store?.image ? (
            <img 
              src={store.logo || store.logoUrl || store.image} 
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
                  onClick={() => addToCart(product)}
                  className="absolute -bottom-2 -right-1 bg-orange-600 text-white p-2.5 rounded-2xl shadow-xl hover:bg-orange-700 active:scale-90 transition-all z-20 border-4 border-white dark:border-slate-800"
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

      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-900 rounded-t-[40px] max-h-[92vh] overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto my-3" />
              <div className="p-6 overflow-y-auto">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 tracking-tight text-center uppercase italic">Finalizar Pedido</h2>
                <div className="space-y-4 mb-8">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-slate-800 pb-3">
                      <span className="text-gray-600 dark:text-slate-400 font-bold uppercase text-[10px]"><b className="text-orange-600 mr-1">{item.quantity}x</b> {item.name}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mb-8 bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-orange-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/velopay/create-mp-preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cart, storeId: slug, customerPhone, total: cartTotal })
                      });
                      const data = await response.json();
                      if (data.init_point) window.location.href = data.init_point;
                    } catch (e) { alert('Erro na conexão com Mercado Pago'); }
                  }}
                  className="w-full bg-[#009EE3] text-white p-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 mb-6"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}