import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Search, MapPin, CreditCard, Banknote, QrCode, Truck } from 'lucide-react';

// --- FÓRMULA DE DISTÂNCIA EM KM (Mapeada do seu Home.jsx) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
};

export default function WppWebview() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerPhoneQuery = searchParams.get('u');

  // Estados Base
  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [shippingRates, setShippingRates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Carrinho e Modais
  const [cart, setCart] = useState(() => {
      const saved = localStorage.getItem(`veloCart_${slug}`);
      return saved ? JSON.parse(saved) : [];
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todas'); 
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Produto (Adicionais e Remoções)
  const [itemObservation, setItemObservation] = useState('');
  const [itemRemoved, setItemRemoved] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});

  // Dados do Cliente e Logística
  const [customer, setCustomer] = useState({
      name: '', phone: customerPhoneQuery || '', cep: '', street: '', number: '', neighborhood: '', city: '', state: '', payment: '', changeFor: ''
  });
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  
  // Financeiro
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  // Categorias Dinâmicas
  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];
  const filteredMenu = menu.filter(p => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (slug) {
        fetchStoreData();
        fetchShippingRates();
    }
  }, [slug]);

  useEffect(() => {
      localStorage.setItem(`veloCart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  const fetchStoreData = async () => {
    try {
      const storeRef = doc(db, "stores", slug);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        setStore({ id: storeSnap.id, ...storeSnap.data() });
        const q = query(collection(db, "products"), where("storeId", "==", storeSnap.id));
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isActive !== false);
        setMenu(fetchedProducts);
      }
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingRates = async () => {
      const q = query(collection(db, "shipping_rates"), where("storeId", "==", slug));
      const snap = await getDocs(q);
      setShippingRates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // --- O CÉREBRO DA LOGÍSTICA (IDÊNTICO AO SEU PAINEL) ---
  useEffect(() => {
    const cep = customer.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setCepError(''); return; }

    const fetchDeliveryInfo = async () => {
      setIsCepLoading(true); setCepError(''); setDeliveryFee(0);
      
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) throw new Error("CEP não encontrado.");
        
        setCustomer(c => ({...c, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf}));
        
        const storeLat = store?.lat;
        const storeLng = store?.lng;
        const zones = store?.delivery_zones || [];
        const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        let distanceCalculated = false;

        // 1. Tenta calcular por KM via Google Maps
        if (storeLat && storeLng && zones.length > 0 && GOOGLE_API_KEY) {
            try {
                const addressString = encodeURIComponent(`${data.logradouro}, ${data.localidade} - ${data.uf}, ${cep}, Brasil`);
                const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${addressString}&key=${GOOGLE_API_KEY}`);
                const geoData = await geoRes.json();

                if (geoData.status === "OK" && geoData.results[0]) {
                    const customerLat = geoData.results[0].geometry.location.lat;
                    const customerLng = geoData.results[0].geometry.location.lng;
                    const distanceKm = calculateDistance(storeLat, storeLng, customerLat, customerLng);
                    
                    if (distanceKm !== null) {
                        distanceCalculated = true;
                        const matchedZone = [...zones].sort((a, b) => a.radius_km - b.radius_km).find(z => distanceKm <= z.radius_km);
                        if (matchedZone) {
                            setDeliveryFee(parseFloat(String(matchedZone.fee).replace(',', '.')));
                            return; 
                        } else {
                            throw new Error("Distância fora da área máxima de cobertura por KM.");
                        }
                    }
                }
            } catch (geoError) {
                console.warn("Falha no Google Maps, caindo para fallback (CEP/Bairro).");
            }
        }

        // 2. Fallback: Busca pela Tabela de CEP ou Bairro
        const currentCepNum = parseInt(cep); 
        const foundRate = shippingRates.find(rate => {
            if (rate.cepStart && rate.cepEnd) {
                let startStr = String(rate.cepStart).replace(/\D/g, '').padEnd(8, '0');
                let endStr = String(rate.cepEnd).replace(/\D/g, '').padEnd(8, '9');
                if (currentCepNum >= parseInt(startStr) && currentCepNum <= parseInt(endStr)) return true;
            }
            const removeAcentos = (str) => str ? String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
            const rateName = removeAcentos(rate.neighborhood);
            const viaCepBairro = removeAcentos(data.bairro);
            const viaCepCidade = removeAcentos(data.localidade);

            if (rateName) {
                if (rateName === viaCepBairro || rateName === viaCepCidade) return true;
                if (viaCepBairro && (viaCepBairro.includes(rateName) || rateName.includes(viaCepBairro))) return true;
            }
            return false;
        });

        if (foundRate) {
          setDeliveryFee(Number(foundRate.fee));
        } else {
          setDeliveryFee(0); 
          setCepError(distanceCalculated ? "Fora da área de cobertura." : "Região não atendida.");
        }

      } catch (error) { 
          setCepError(error.message); 
      } finally {
          setIsCepLoading(false); 
      }
    };

    const handler = setTimeout(() => fetchDeliveryInfo(), 800);
    return () => clearTimeout(handler);
  }, [customer.cep, shippingRates, store]);

  // --- GESTÃO DE CARRINHO (COMPLEMENTOS E REMOÇÕES) ---
  const handleOptionToggle = (group, option) => {
    setSelectedOptions(prev => {
        const currentGroupSelections = prev[group.id] || [];
        const isSelected = currentGroupSelections.some(o => o.name === option.name);
        if (isSelected) {
            return { ...prev, [group.id]: currentGroupSelections.filter(o => o.name !== option.name) };
        } else {
            if (group.maxSelections === 1) return { ...prev, [group.id]: [option] }; 
            else if (currentGroupSelections.length < group.maxSelections) return { ...prev, [group.id]: [...currentGroupSelections, option] }; 
            else return prev; 
        }
    });
  };

  const calculateModalTotal = () => {
    if (!selectedProduct) return 0;
    let total = Number(selectedProduct.promotionalPrice) > 0 ? Number(selectedProduct.promotionalPrice) : Number(selectedProduct.price);
    Object.values(selectedOptions).forEach(optionArray => {
        optionArray.forEach(opt => { total += Number(opt.price || 0); });
    });
    return total;
  };

  const addToCart = () => {
    if (selectedProduct.complements) {
        for (const group of selectedProduct.complements) {
            if (group.isRequired && (!selectedOptions[group.id] || selectedOptions[group.id].length === 0)) {
                return alert(`Por favor, selecione uma opção em: ${group.name}`);
            }
        }
    }
    
    const signature = `${selectedProduct.id}-${btoa(JSON.stringify(selectedOptions))}-${itemRemoved.join('-')}-${itemObservation}`;
    const priceToUse = calculateModalTotal();
    
    let cartName = selectedProduct.name;
    const optionsText = Object.values(selectedOptions).flat().map(o => o.name).join(', ');
    if (optionsText) cartName += ` (${optionsText})`;
    if (itemRemoved.length > 0) cartName += ` (Sem: ${itemRemoved.join(', ')})`;
    
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.signature === signature);
      if (existingItem) {
        return prevCart.map(item => item.signature === signature ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...selectedProduct, name: cartName, price: priceToUse, signature, quantity: 1, observation: itemObservation, removedItems: itemRemoved, selectedOptions }];
    });

    setSelectedProduct(null);
  };

  const updateQuantity = (signature, amount) => {
    setCart(prevCart => prevCart.map(item => {
        if (item.signature === signature) {
            const newQuantity = item.quantity + amount;
            if (newQuantity <= 0) return null;
            return { ...item, quantity: newQuantity };
        }
        return item;
    }).filter(item => item !== null));
  };

  const removeFromCart = (signature) => setCart(p => p.filter(i => i.signature !== signature));

  // Matemática Financeira
  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal + (deliveryMethod === 'delivery' ? deliveryFee : 0));
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // --- FINALIZAÇÃO E ROTEAMENTO PARA O BACKEND REAL ---
  const finalizeOrder = async () => {
      if (submitLock.current) return;
      if (!customer.name || !customer.phone) return alert("Preencha seu nome e WhatsApp.");
      if (deliveryMethod === 'delivery' && (!customer.street || !customer.number)) return alert("Preencha o endereço de entrega completo.");
      if (!customer.payment) return alert("Por favor, selecione uma forma de pagamento.");
      if (cart.length === 0) return alert("Carrinho vazio!");

      submitLock.current = true;
      setIsSubmitting(true);
      const fullAddress = deliveryMethod === 'pickup' ? 'Retirada no Balcão' : `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
      
      try {
          const newOrderRef = doc(collection(db, "orders"));
          const orderId = newOrderRef.id;

          const orderData = {
              customerName: customer.name, 
              customerAddress: fullAddress, 
              customerPhone: customer.phone,
              paymentMethod: customer.payment, 
              paymentStatus: 'pending',
              customerChangeFor: customer.payment === 'dinheiro' ? customer.changeFor : "",
              items: cart,
              subtotal: cartSubtotal, 
              shippingFee: deliveryMethod === 'pickup' ? 0 : deliveryFee, 
              total: cartTotal, 
              status: 'pending', 
              createdAt: serverTimestamp(),
              storeId: slug,
              tipo: deliveryMethod === 'pickup' ? "retirada" : "delivery",
              source: 'whatsapp_webview'
          };

          // Baixa na Ficha Técnica (Insumos)
          const promisesBaixa = [];
          cart.forEach(cartItem => {
              if (cartItem.consumedIngredients && cartItem.consumedIngredients.length > 0) {
                  cartItem.consumedIngredients.forEach(ci => {
                      promisesBaixa.push(updateDoc(doc(db, "ingredients", ci.ingredientId), { stock: increment(-(Number(cartItem.quantity) * Number(ci.qty))) }));
                  });
              }
          });
          if (promisesBaixa.length > 0) await Promise.all(promisesBaixa).catch(() => {});

          // Pagamentos Offline (Dinheiro, Maquininha)
          if (['dinheiro', 'cardDelivery', 'cashDelivery', 'cardPickup', 'cashPickup'].includes(customer.payment)) {
              await setDoc(newOrderRef, { ...orderData, paymentStatus: 'pending_on_delivery' });
              setCart([]); localStorage.removeItem(`veloCart_${slug}`);
              window.location.href = `/track/${orderId}`;
              return;
          }

          // VeloPay Pix Nativo
          if (customer.payment === 'velopay_pix') {
              await setDoc(newOrderRef, { ...orderData, paymentStatus: 'processing' });
              const res = await fetch('/api/velopay-pix', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ storeId: slug, orderId: orderId, totalAmount: cartTotal })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              setCart([]); localStorage.removeItem(`veloCart_${slug}`);
              window.location.href = `/track/${orderId}?payment=pix_pending`;
              return;
          }

          // Checkout Externo (Mercado Pago Link)
          if (customer.payment === 'mercadopago_link') {
              const res = await fetch('/api/create-mp-checkout', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      items: cart, storeId: slug, orderId: orderId,
                      customerEmail: 'cliente@velodelivery.com.br',
                      shippingFee: deliveryMethod === 'pickup' ? 0 : deliveryFee,
                      successUrl: `https://${window.location.host}/track/${orderId}?payment=success`,
                      cancelUrl: `https://${window.location.host}/track/${orderId}?payment=cancel`
                  })
              });
              const data = await res.json();
              if (data.url) {
                  await setDoc(newOrderRef, orderData);
                  setCart([]); localStorage.removeItem(`veloCart_${slug}`);
                  window.location.href = data.url;
              } else {
                  throw new Error(data.error || "Erro no Mercado Pago");
              }
          }

      } catch (err) {
          alert(`Erro ao processar pedido: ${err.message}`);
          submitLock.current = false;
          setIsSubmitting(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-bold">Carregando Velo Delivery...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-bold">Loja não encontrada.</div>;

  const pmConfig = store?.acceptedPayments || { online: true, pix: true, cardDelivery: true, cashDelivery: true };
  const hasVeloPix = store?.velopayStatus === 'active';
  const hasMP = store?.integrations?.mercadopago?.accessToken;

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans transition-colors duration-300">
      {/* HEADER DA LOJA */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 p-4 pb-2 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {store?.storeLogoUrl || store?.logo ? (
            <img src={store.storeLogoUrl || store.logo} alt={store.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 bg-white" />
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
          <input type="text" placeholder="Buscar no cardápio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1E293B] border-none rounded-2xl py-3 px-11 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        </div>
      </header>

      {/* CATEGORIAS HORIZONTAIS */}
      <nav className="sticky top-[138px] z-30 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 overflow-x-auto flex gap-2 p-4 pt-2 no-scrollbar shadow-sm">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-black transition-all ${selectedCategory === cat ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/20" : "bg-[#1E293B] text-slate-400"}`}>
            {cat}
          </button>
        ))}
      </nav>

      {/* GRADE DE PRODUTOS */}
      <main className="p-4 pb-40">
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map((product) => (
            <motion.div key={product.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedProduct(product); setItemObservation(''); setItemRemoved([]); setSelectedOptions({}); }} className="bg-[#1E293B] rounded-[32px] p-3 border border-slate-700/50 flex flex-col h-full shadow-sm relative overflow-hidden cursor-pointer">
              <div className="relative mb-3 aspect-square w-full">
                <img src={product.image || product.imageUrl || product.img || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full rounded-[24px] object-cover bg-slate-800" />
                <button className="absolute -bottom-2 -right-1 bg-[#F97316] text-white p-2.5 rounded-2xl shadow-xl z-20 border-4 border-[#1E293B] pointer-events-none">
                  <Plus size={20} />
                </button>
              </div>
              <div className="px-1 flex flex-col flex-1">
                <h3 className="font-black text-white text-[11px] leading-tight line-clamp-2 mb-1 uppercase tracking-tight">{product.name}</h3>
                <span className="text-[#F97316] font-black text-sm mt-auto">R$ {Number(product.promotionalPrice > 0 ? product.promotionalPrice : product.price).toFixed(2)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* MODAL DE DETALHES DO PRODUTO (COMPLEMENTOS E REMOÇÕES) */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[80] backdrop-blur-sm flex flex-col justify-end">
            <div className="absolute top-4 right-4 z-[90]">
                <button onClick={() => setSelectedProduct(null)} className="p-3 bg-black/50 text-white rounded-full"><X size={20} /></button>
            </div>
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0F172A] w-full rounded-t-[40px] flex flex-col max-h-[90vh] overflow-hidden">
              <div className="w-full h-56 relative bg-slate-800 shrink-0">
                  <img src={selectedProduct.image || selectedProduct.imageUrl || selectedProduct.img} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent"></div>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative -mt-10">
                  <h2 className="text-2xl font-black italic text-white uppercase tracking-tight mb-2 leading-none">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs font-bold mb-6 leading-relaxed">{selectedProduct.description}</p>
                  
                  <div className="bg-white p-5 rounded-[2rem] shadow-xl space-y-6">
                      
                      {/* COMPLEMENTOS */}
                      {selectedProduct.complements && selectedProduct.complements.length > 0 && (
                          <div className="space-y-4">
                              {selectedProduct.complements.map((group, idx) => (
                                  <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                                      <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">{group.name}</h4>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${group.isRequired ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                              {group.isRequired ? 'Obrigatório' : 'Opcional'} • Máx: {group.maxSelections}
                                          </span>
                                      </div>
                                      <div className="p-2 space-y-1">
                                          {group.options.map((opt, oIdx) => {
                                              const isSelected = (selectedOptions[group.id] || []).some(o => o.name === opt.name);
                                              return (
                                                  <label key={oIdx} className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50/50' : 'border-transparent hover:bg-slate-50'}`}>
                                                      <div className="flex items-center gap-3">
                                                          <input type={group.maxSelections === 1 ? 'radio' : 'checkbox'} checked={isSelected} onChange={() => handleOptionToggle(group, opt)} className="w-4 h-4 accent-blue-600" />
                                                          <span className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{opt.name}</span>
                                                      </div>
                                                      {opt.price > 0 && <span className="text-xs font-black text-blue-600">+ R$ {Number(opt.price).toFixed(2)}</span>}
                                                  </label>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}

                      {/* REMOÇÕES */}
                      {selectedProduct.removables && selectedProduct.removables.length > 0 && (
                          <div>
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Retirar Ingredientes</h4>
                              <div className="space-y-3">
                                  {selectedProduct.removables.map((item, idx) => (
                                      <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                          <input type="checkbox" className="w-5 h-5 accent-[#F97316] rounded-md" checked={itemRemoved.includes(item)} onChange={(e) => { e.target.checked ? setItemRemoved([...itemRemoved, item]) : setItemRemoved(itemRemoved.filter(i => i !== item)); }} />
                                          <span className={`font-bold text-sm transition-colors ${itemRemoved.includes(item) ? 'text-slate-400 line-through' : 'text-slate-700'}`}>Remover {item.toLowerCase()}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* OBSERVAÇÕES */}
                      <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Alguma Observação Extra?</h4>
                          <textarea rows="2" placeholder="Ex: Maionese à parte..." value={itemObservation} onChange={(e) => setItemObservation(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm text-slate-700 resize-none" />
                      </div>
                  </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Item</p>
                      <p className="text-2xl font-black italic text-[#F97316]">R$ {calculateModalTotal().toFixed(2)}</p>
                  </div>
                  <button onClick={addToCart} className="bg-[#FBC02D] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2">
                      <ShoppingCart size={20} /> Adicionar
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
            <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-[#3B82F6] text-white p-5 rounded-[28px] shadow-2xl flex justify-between items-center px-8 active:scale-95 transition-all border-2 border-blue-400">
              <div className="flex items-center gap-3">
                <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">{cartItemCount}</div>
                <span className="font-black tracking-widest uppercase text-sm italic">Ver Sacola</span>
              </div>
              <span className="font-black text-lg">R$ {cartSubtotal.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT (O ÚNICO LUGAR ONDE AS MATEMÁTICAS APARECEM) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0F172A] rounded-t-[40px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                
                {/* LISTAGEM DE ITENS E OPCIONAIS */}
                <div className="bg-[#1E293B] p-5 rounded-[2rem] mb-6 border border-slate-700/50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Resumo da Sacola</h3>
                    <div className="space-y-4">
                      {cart.map((item, i) => {
                          const optionsArr = item.selectedOptions ? Object.values(item.selectedOptions).flat() : [];
                          return (
                            <div key={i} className="flex flex-col border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start text-sm">
                                    <span className="text-slate-300 font-bold max-w-[70%] leading-tight">
                                        <span className="text-[#F97316] font-black mr-2">{item.quantity}x</span> {item.name}
                                    </span>
                                    <span className="font-black text-white">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                {optionsArr.length > 0 && (
                                    <div className="mt-1 ml-6 space-y-0.5">
                                        {optionsArr.map((opt, oIdx) => <p key={oIdx} className="text-[10px] text-slate-400 font-medium">+ {opt.name}</p>)}
                                    </div>
                                )}
                                {item.removedItems && item.removedItems.length > 0 && (
                                    <p className="text-[10px] text-red-400 font-bold mt-1 ml-6"><span className="bg-red-500/20 px-1 rounded mr-1">S/</span> {item.removedItems.join(', ')}</p>
                                )}
                                {item.observation && <p className="text-[10px] text-orange-300 font-bold mt-1 ml-6 italic bg-orange-900/30 p-1.5 rounded-lg border border-orange-500/20">Obs: {item.observation}</p>}
                                <div className="flex items-center gap-3 mt-3 ml-6">
                                    <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                                        <button onClick={() => updateQuantity(item.signature, -1)} className="p-1 text-slate-400 hover:text-white"><Minus size={14}/></button>
                                        <span className="text-xs font-black text-white w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.signature, 1)} className="p-1 text-slate-400 hover:text-white"><Plus size={14}/></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.signature)} className="text-[10px] font-bold text-red-400 hover:text-red-300 underline">Remover</button>
                                </div>
                            </div>
                          );
                      })}
                    </div>
                </div>

                <h2 className="text-xl font-black text-white mb-4 tracking-tight uppercase italic">Dados de Entrega e Pagamento</h2>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setDeliveryMethod('delivery')} className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'delivery' ? 'border-[#3B82F6] bg-blue-600/20 text-blue-400' : 'border-slate-700 text-slate-500'}`}>🛵 Entregar</button>
                    <button onClick={() => { setDeliveryMethod('pickup'); setDeliveryFee(0); }} className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'pickup' ? 'border-[#3B82F6] bg-blue-600/20 text-blue-400' : 'border-slate-700 text-slate-500'}`}>🏪 Retirar</button>
                </div>

                <div className="space-y-3 mb-6">
                  <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Seu Nome Completo *" className="w-full bg-[#1E293B] border border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none" />
                  {deliveryMethod === 'delivery' && (
                      <>
                        <div className="relative">
                            <input type="text" value={customer.cep} onChange={e => setCustomer({...customer, cep: e.target.value})} placeholder="CEP (Apenas números) *" maxLength="8" className="w-full bg-[#1E293B] border-2 border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none" />
                            {isCepLoading && <span className="absolute bottom-4 right-4 text-[10px] text-blue-400 font-black uppercase animate-pulse">Buscando...</span>}
                        </div>
                        {cepError && <p className="text-red-500 text-xs font-bold px-2">{cepError}</p>}
                        {customer.street && (
                            <div className="space-y-3 animate-in fade-in">
                                <input type="text" value={customer.street} disabled className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-400 outline-none" />
                                <input type="text" value={customer.number} onChange={e => setCustomer({...customer, number: e.target.value})} placeholder="Número / Complemento *" className="w-full bg-[#1E293B] border border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none" />
                            </div>
                        )}
                      </>
                  )}
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Como deseja pagar?</label>
                    <select value={customer.payment} onChange={e => setCustomer({...customer, payment: e.target.value})} className="w-full bg-[#1E293B] border border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none cursor-pointer">
                        <option value="">Selecione uma opção...</option>
                        {hasVeloPix && pmConfig.pix !== false && <option value="velopay_pix">💠 PIX (Aprovação Instantânea)</option>}
                        {!hasVeloPix && hasMP && pmConfig.online !== false && <option value="mercadopago_link">💳 Cartão / PIX (Pagar Online)</option>}
                        {pmConfig.cardDelivery !== false && deliveryMethod === 'delivery' && <option value="cardDelivery">💳 Cartão na Entrega (Maquininha)</option>}
                        {pmConfig.cashDelivery !== false && deliveryMethod === 'delivery' && <option value="dinheiro">💵 Dinheiro na Entrega</option>}
                        {pmConfig.cardPickup !== false && deliveryMethod === 'pickup' && <option value="cardPickup">💳 Cartão na Retirada (Balcão)</option>}
                        {pmConfig.cashPickup !== false && deliveryMethod === 'pickup' && <option value="dinheiro">💵 Dinheiro na Retirada (Balcão)</option>}
                    </select>
                    {customer.payment === 'dinheiro' && (
                        <input type="text" value={customer.changeFor} onChange={e => setCustomer({...customer, changeFor: e.target.value})} placeholder="Troco para quanto? (Deixe em branco se não precisar)" className="w-full bg-[#1E293B] border border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold text-white outline-none mt-3" />
                    )}
                </div>

                {/* ÚNICO BLOCO ONDE AS MATEMÁTICAS DEVEM APARECER */}
                <div className="bg-[#1E293B] rounded-[2rem] p-5 border border-slate-700">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold">Subtotal</span>
                        <span className="font-black text-white">R$ {cartSubtotal.toFixed(2)}</span>
                      </div>
                      {deliveryMethod === 'delivery' && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold">Taxa de Entrega</span>
                            <span className="font-black text-white">
                              {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}
                            </span>
                          </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total a Pagar</span>
                      <span className="text-3xl font-black italic text-[#F97316]">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                </div>
              </div>

              {/* BOTÃO FINAL DE PAGAMENTO (CUIDANDO DE TODAS AS ROTAS) */}
              <div className="p-4 bg-[#0F172A] border-t border-slate-800 shrink-0">
                  <button 
                    onClick={async () => {
                      if (submitLock.current) return;
                      if (!customer.name || !customer.phone) return alert("Preencha seu nome e WhatsApp.");
                      if (deliveryMethod === 'delivery' && (!customer.street || !customer.number)) return alert("Preencha o endereço de entrega completo digitando seu CEP.");
                      if (!customer.payment) return alert("Por favor, selecione uma forma de pagamento.");
                      if (cart.length === 0) return alert("Carrinho vazio!");

                      submitLock.current = true;
                      setIsSubmitting(true);
                      const finalAddress = deliveryMethod === 'pickup' ? 'Retirada no Balcão' : `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
                      
                      try {
                        const newOrderRef = doc(collection(db, "orders"));
                        const orderId = newOrderRef.id;

                        const orderData = {
                          storeId: slug,
                          customerPhone: customer.phone,
                          customerName: customer.name,
                          customerAddress: finalAddress,
                          deliveryMethod,
                          items: cart,
                          subtotal: cartSubtotal,
                          shippingFee: deliveryFee,
                          total: cartTotal,
                          status: 'pending',
                          paymentMethod: customer.payment,
                          paymentStatus: 'pending',
                          customerChangeFor: customer.payment === 'dinheiro' ? customer.changeFor : "",
                          createdAt: serverTimestamp(),
                          source: 'whatsapp_webview',
                          tipo: deliveryMethod === 'pickup' ? "retirada" : "delivery",
                        };

                        // Pagamentos Offline (Dinheiro, Maquininha na entrega)
                        if (['dinheiro', 'cardDelivery', 'cashDelivery', 'cardPickup', 'cashPickup'].includes(customer.payment)) {
                            await setDoc(newOrderRef, { ...orderData, paymentStatus: 'pending_on_delivery' });
                            setCart([]); localStorage.removeItem(`veloCart_${slug}`);
                            window.location.href = `/track/${orderId}`;
                            return;
                        }

                        // VeloPay Pix Nativo
                        if (customer.payment === 'velopay_pix') {
                            await setDoc(newOrderRef, { ...orderData, paymentStatus: 'processing' });
                            const res = await fetch('/api/velopay-pix', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ storeId: slug, orderId: orderId, totalAmount: cartTotal })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            setCart([]); localStorage.removeItem(`veloCart_${slug}`);
                            window.location.href = `/track/${orderId}?payment=pix_pending`;
                            return;
                        }

                        // Checkout Externo (Mercado Pago Link Genérico)
                        if (customer.payment === 'mercadopago_link') {
                            const res = await fetch('/api/create-mp-checkout', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    items: cart, storeId: slug, orderId: orderId,
                                    customerEmail: 'cliente@velodelivery.com.br',
                                    shippingFee: deliveryMethod === 'pickup' ? 0 : deliveryFee,
                                    successUrl: `https://${window.location.host}/track/${orderId}?payment=success`,
                                    cancelUrl: `https://${window.location.host}/track/${orderId}?payment=cancel`
                                })
                            });
                            const data = await res.json();
                            if (data.url) {
                                await setDoc(newOrderRef, orderData);
                                setCart([]); localStorage.removeItem(`veloCart_${slug}`);
                                window.location.href = data.url;
                            } else {
                                throw new Error(data.error || "Erro no Mercado Pago");
                            }
                        }

                      } catch (e) { 
                        console.error('Erro Crítico no Checkout:', e);
                        alert(`Erro ao processar: ${e.message}`); 
                        submitLock.current = false;
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting || isCepLoading}
                    className="w-full bg-[#3BAFDA] text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Finalizando...' : 'Confirmar Pedido'}
                  </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}