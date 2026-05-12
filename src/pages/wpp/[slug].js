// pages/wpp/[slug].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase'; // Ajuste o path conforme o seu projeto
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WppWebview() {
  const router = useRouter();
  // Captura o slug da loja e o parâmetro 'u' (telefone do cliente) da URL
  const { slug, u: customerPhone } = router.query; 
  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Novo estado para o carrinho
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchStoreData();
    }
    
    // Log para verificar se o telefone foi capturado (remover em produção)
    if (customerPhone) {
      console.log("Cliente identificado via WhatsApp:", customerPhone);
    }
  }, [slug, customerPhone]);

  // Função para adicionar item ao carrinho
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

  // Cálculo do total do carrinho
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const fetchStoreData = async () => {
    // Lógica Multi-tenant: Busca loja pelo slug
    const storeRef = doc(db, "stores", slug);
    const storeSnap = await getDoc(storeRef);
    
    if (storeSnap.exists()) {
      setStore(storeSnap.data());
      // Busca produtos ativos
      const q = query(collection(db, "products"), where("storeId", "==", storeSnap.id), where("active", "==", true));
      const querySnapshot = await getDocs(q);
      setMenu(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-gray-500 text-sm">Carregando cardápio...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-orange-100">
      {/* Header Slim - Foco na Marca */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 p-4 flex items-center gap-3">
        {store?.logo && <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-full object-cover" />}
        <div>
          <h1 className="font-bold text-gray-900 leading-none">{store?.name}</h1>
          <span className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Aberto agora</span>
        </div>
      </header>

      <main className="p-4 pb-32">
        {/* Grid de Produtos - Estilo Mobile App */}
        <div className="grid grid-cols-1 gap-4">
          {menu.map((product) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-sm">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                <span className="text-orange-600 font-bold text-sm block mt-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
                )}
                {/* Botão de Adicionar ao Carrinho */}
                <button 
                  onClick={() => addToCart(product)}
                  className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-200"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Carrinho Flutuante Estilo App - Só aparece se tiver itens */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-50"
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

      {/* Modal de Checkout Nativo (VeloPay + Mercado Pago) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
          >
            {/* Header do Checkout */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
              <h2 className="font-bold text-lg text-gray-900">Resumo do Pedido</h2>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold text-xs hover:bg-gray-200"
              >
                Voltar
              </button>
            </div>
            
            {/* Lista de Itens */}
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
              
              {/* Área de Pagamento */}
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
                      // Altera o texto do botão (pode ser substituído por um estado de 'loading' depois)
                      console.log(`Iniciando pagamento MP para a loja: ${store.name}`);
                      
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
                        // Redireciona o cliente para o checkout seguro do MP
                        window.location.href = data.init_point;
                      } else {
                        alert('Erro ao gerar pagamento: ' + (data.error || 'Erro desconhecido'));
                      }
                    } catch (error) {
                      console.error('Falha na requisição:', error);
                      alert('Erro na conexão. Tente novamente.');
                    }
                  }}
                  className="w-full bg-[#009EE3] text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#0088C4] active:scale-[0.98] transition-all"
                >
                  {/* Ícone de Cadeado simples */}
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