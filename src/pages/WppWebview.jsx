import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { db } from '../services/firebase'; 
import { doc, getDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, increment, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Search } from 'lucide-react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";

// Fórmula de Haversine para Frete por KM
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
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

  // Estados do Produto
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

  // --- MOTOR DE TEMA DINÂMICO (MULTI-TENANT) ---
  const getThemeColor = () => {
      if (store?.useCustomTheme && store?.customColor) return store.customColor;
      const presets = { burger: '#ea580c', pizza: '#e11d48', sushi: '#be123c', floricultura: '#db2777', drinks: '#d97706', default: '#3b82f6' };
      return presets[store?.storeNiche] || presets.default;
  };
  const themeColor = getThemeColor();

  const categories = ['Todas', ...new Set(menu.map(p => p.category).filter(Boolean))];
  const filteredMenu = menu.filter(p => (selectedCategory === 'Todas' || p.category === selectedCategory) && p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    if (slug) { fetchStoreData(); fetchShippingRates(); }
  }, [slug]);

  useEffect(() => { localStorage.setItem(`veloCart_${slug}`, JSON.stringify(cart)); }, [cart, slug]);

  const fetchStoreData = async () => {
    try {
      const storeSnap = await getDoc(doc(db, "stores", slug));
      if (storeSnap.exists()) {
        setStore({ id: storeSnap.id, ...storeSnap.data() });
        const q = query(collection(db, "products"), where("storeId", "==", storeSnap.id), where("isActive", "==", true));
        const snap = await getDocs(q);
        setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { console.error("Erro cardápio:", e); } finally { setLoading(false); }
  };

  const fetchShippingRates = async () => {
      const snap = await getDocs(query(collection(db, "shipping_rates"), where("storeId", "==", slug)));
      setShippingRates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // Motor de Frete (Google Maps + Fallback CEP)
  useEffect(() => {
    const cep = customer.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setCepError(''); return; }

    const fetchDeliveryInfo = async () => {
      setIsCepLoading(true); setCepError(''); setDeliveryFee(0);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) throw new Error("CEP não encontrado.");
        
        setCustomer(c => ({...c, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf}));
        
        if (store?.lat && store?.lng && store?.delivery_zones?.length > 0 && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
            try {
                const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${data.logradouro}, ${data.localidade} - ${data.uf}, ${cep}, Brasil`)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
                const geoData = await geoRes.json();
                if (geoData.status === "OK" && geoData.results[0]) {
                    const customerLat = geoData.results[0].geometry.location.lat;
                    const customerLng = geoData.results[0].geometry.location.lng;

                    let distKm = null;
                    try {
                        // Frontend exige uso do JS SDK para evitar bloqueio de CORS
                        if (window.google && window.google.maps) {
                            const service = new window.google.maps.DistanceMatrixService();
                            distKm = await new Promise((resolve, reject) => {
                                service.getDistanceMatrix({
                                    origins: [{ lat: Number(store.lat), lng: Number(store.lng) }],
                                    destinations: [{ lat: customerLat, lng: customerLng }],
                                    travelMode: 'DRIVING'
                                }, (res, status) => {
                                    if (status === 'OK' && res.rows[0].elements[0].status === 'OK') {
                                        resolve(res.rows[0].elements[0].distance.value / 1000);
                                    } else {
                                        reject('Falha ao calcular rota real');
                                    }
                                });
                            });
                        } else {
                            throw new Error("Google Maps JS API indisponível.");
                        }
                    } catch (err) {
                        console.warn("Distance Matrix falhou no Webview. Usando fallback de linha reta + 30% de penalidade.", err);
                        const straightLine = calculateDistance(store.lat, store.lng, customerLat, customerLng);
                        if (straightLine !== null) distKm = straightLine * 1.3;
                    }

                    if (distKm !== null) {
                        const zone = [...store.delivery_zones].sort((a,b)=>a.radius_km - b.radius_km).find(z => distKm <= z.radius_km);
                        if (zone) {
                            return setDeliveryFee(parseFloat(String(zone.fee).replace(',','.')));
                        } else {
                            // TRAVA ABSOLUTA: Avisa o cliente e mata a função aqui para não ler o fallback antigo
                            setCepError(`Infelizmente seu endereço está fora da nossa área de cobertura (${distKm.toFixed(1)}km).`);
                            setDeliveryFee(0);
                            setIsCepLoading(false);
                            return; 
                        }
                    }
                }
            } catch (e) {}
        }

        const foundRate = shippingRates.find(r => {
            let currentCepNum = parseInt(cep);
            if (r.cepStart && r.cepEnd && currentCepNum >= parseInt(String(r.cepStart).replace(/\D/g,'').padEnd(8,'0')) && currentCepNum <= parseInt(String(r.cepEnd).replace(/\D/g,'').padEnd(8,'9'))) return true;
            const norm = s => s ? String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
            const rName = norm(r.neighborhood);
            return rName && (rName === norm(data.bairro) || rName === norm(data.localidade) || norm(data.bairro).includes(rName));
        });

        if (foundRate) setDeliveryFee(Number(foundRate.fee));
        else { setDeliveryFee(0); setCepError("Região não atendida."); }
      } catch (e) { setCepError(e.message); } finally { setIsCepLoading(false); }
    };
    const handler = setTimeout(fetchDeliveryInfo, 800);
    return () => clearTimeout(handler);
  }, [customer.cep, shippingRates, store]);

  // Gestão do Carrinho
  const handleOptionToggle = (group, opt) => {
    setSelectedOptions(prev => {
        const cur = prev[group.id] || [];
        if (cur.some(o => o.name === opt.name)) return { ...prev, [group.id]: cur.filter(o => o.name !== opt.name) };
        if (group.maxSelections === 1) return { ...prev, [group.id]: [opt] }; 
        if (cur.length < group.maxSelections) return { ...prev, [group.id]: [...cur, opt] }; 
        return prev;
    });
  };

  const calcTotal = () => {
    if (!selectedProduct) return 0;
    let t = Number(selectedProduct.promotionalPrice > 0 ? selectedProduct.promotionalPrice : selectedProduct.price);
    Object.values(selectedOptions).forEach(arr => arr.forEach(o => t += Number(o.price || 0)));
    return t;
  };

  const addToCart = () => {
    if (selectedProduct.complements) {
        for (const g of selectedProduct.complements) if (g.isRequired && (!selectedOptions[g.id] || selectedOptions[g.id].length===0)) return alert(`Selecione uma opção em: ${g.name}`);
    }
    const sig = `${selectedProduct.id}-${btoa(JSON.stringify(selectedOptions))}-${itemRemoved.join('-')}-${itemObservation}`;
    let name = selectedProduct.name;
    const opts = Object.values(selectedOptions).flat().map(o=>o.name).join(', ');
    if (opts) name += ` (${opts})`;
    if (itemRemoved.length > 0) name += ` (Sem: ${itemRemoved.join(', ')})`;
    
    setCart(prev => {
      const ex = prev.find(i => i.signature === sig);
      if (ex) return prev.map(i => i.signature === sig ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...selectedProduct, name, price: calcTotal(), signature: sig, quantity: 1, observation: itemObservation, removedItems: itemRemoved, selectedOptions }];
    });
    setSelectedProduct(null);
  };

  const updateQty = (sig, amt) => setCart(p => p.map(i => i.signature === sig ? { ...i, quantity: i.quantity + amt } : i).filter(i => i.quantity > 0));
  const remove = (sig) => setCart(p => p.filter(i => i.signature !== sig));

  // Salvamento Abandonado
  useEffect(() => {
    const t = setTimeout(async () => {
        if (!store || cart.length === 0) return;
        let cId = customerPhoneQuery || localStorage.getItem('veloVisitorId') || Math.random().toString(36).substring(2);
        localStorage.setItem('veloVisitorId', cId);
        try {
            await setDoc(doc(db, "abandoned_carts", `cart_${slug}_${cId}`), {
                storeId: slug, customerPhone: customerPhoneQuery || "", items: cart,
                subtotal: cart.reduce((a, i) => a + (i.price * i.quantity), 0),
                lastUpdated: serverTimestamp(), status: 'abandoned'
            }, { merge: true });
        } catch(e){}
    }, 3000);
    return () => clearTimeout(t);
  }, [cart, customerPhoneQuery, slug, store]);

  const cartSub = cart.reduce((a, i) => a + (i.price * i.quantity), 0);
  const cartTotal = Math.max(0, cartSub + (deliveryMethod === 'delivery' ? deliveryFee : 0));
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  // Finalização do Pedido
  const finalizeOrder = async () => {
      if (submitLock.current) return;
      if (!customer.name || !customer.phone) return alert("Preencha seu nome e WhatsApp.");
      if (deliveryMethod === 'delivery' && (!customer.street || !customer.number)) return alert("Preencha o endereço de entrega (CEP).");
      if (!customer.payment) return alert("Selecione uma forma de pagamento.");
      if (cart.length === 0) return alert("Carrinho vazio!");

      submitLock.current = true; setIsSubmitting(true);
      const addr = deliveryMethod === 'pickup' ? 'Retirada no Balcão' : `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
      
      try {
          const orderRef = doc(collection(db, "orders"));
          const oData = {
              customerName: customer.name, 
              customerAddress: addr, 
              customerPhone: customer.phone,
              paymentMethod: customer.payment, 
              paymentStatus: 'pending', 
              customerChangeFor: customer.changeFor || "",
              items: cart, 
              subtotal: cartSub, 
              shippingFee: deliveryMethod === 'pickup' ? 0 : deliveryFee, 
              total: cartTotal,
              status: 'pending', 
              createdAt: serverTimestamp(), 
              storeId: slug, 
              tipo: deliveryMethod === 'pickup' ? "retirada" : "delivery", 
              source: 'whatsapp_bot' // <--- ALTERADO PARA RECONHECIMENTO NO PAINEL
          };

          // === 🚨 VALIDAÇÃO DE ESTOQUE DA FICHA TÉCNICA (WEBVIEW) ===
          const requiredIngredients = {};
          cart.forEach(cartItem => {
              if (cartItem.consumedIngredients && cartItem.consumedIngredients.length > 0) {
                  cartItem.consumedIngredients.forEach(ci => {
                      if (!requiredIngredients[ci.ingredientId]) requiredIngredients[ci.ingredientId] = 0;
                      requiredIngredients[ci.ingredientId] += Number(cartItem.quantity) * Number(ci.qty);
                  });
              }
          });

          const ingredientIds = Object.keys(requiredIngredients);
          if (ingredientIds.length > 0) {
              let hasStockError = false;
              let stockErrorMsg = '';

              for (const ingId of ingredientIds) {
                  const ingSnap = await getDoc(doc(db, "ingredients", ingId));
                  if (ingSnap.exists()) {
                      const currentStock = Number(ingSnap.data().stock || 0);
                      if (currentStock < requiredIngredients[ingId]) {
                          hasStockError = true;
                          stockErrorMsg = `Infelizmente, um dos insumos do seu pedido esgotou agorinha (Restam: ${currentStock}).`;
                          break;
                      }
                  }
              }

              if (hasStockError) {
                  setIsSubmitting(false);
                  submitLock.current = false;
                  return alert(`⚠️ ESTOQUE INSUFICIENTE:\n\n${stockErrorMsg}\n\nPor favor, remova o item do carrinho.`);
              }
          }

          // Baixa de Estoque Ficha Técnica Segura
          const proms = [];
          cart.forEach(c => c.consumedIngredients?.forEach(ci => proms.push(updateDoc(doc(db, "ingredients", ci.ingredientId), { stock: increment(-(c.quantity * ci.qty)) }))));
          if(proms.length) await Promise.all(proms).catch(()=>{});
          // =========================================================

          // Offline
          if (['dinheiro', 'cardDelivery', 'cashDelivery', 'cardPickup', 'cashPickup'].includes(customer.payment)) {
              await setDoc(orderRef, { ...oData, paymentStatus: 'pending_on_delivery' });
              setCart([]); localStorage.removeItem(`veloCart_${slug}`);
              return window.location.href = `/track/${orderRef.id}`;
          }

          // VeloPay Pix
          if (customer.payment === 'velopay_pix') {
              await setDoc(orderRef, { ...oData, paymentStatus: 'processing' });
              const res = await fetch('/api/velopay-pix', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ storeId: slug, orderId: orderRef.id, totalAmount: cartTotal }) });
              if (!res.ok) throw new Error((await res.json()).error);
              setCart([]); localStorage.removeItem(`veloCart_${slug}`);
              return window.location.href = `/track/${orderRef.id}?payment=pix_pending`;
          }

          // Fluxo de Pagamento Online (PIX Transparente Direto)
          if (customer.payment === 'mercadopago_link') {
              try {
                  const res = await fetch('/api/processar-pagamento-transparente-velo', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          storeId: slug,
                          orderId: orderRef.id,
                          transaction_amount: cartTotal,
                          payment_method_id: 'pix',
                          payer: { 
                              email: 'cliente@velodelivery.com.br', 
                              first_name: customer.name,
                              phone: customer.phone // OBRIGATÓRIO PARA O ZAP FUNCIONAR
                          }
                      })
                  });

                  const data = await res.json();

                  if (res.ok && data.success) {
                      await setDoc(orderRef, oData);
                      setCart([]); 
                      localStorage.removeItem(`veloCart_${slug}`);
                      return window.location.href = `/track/${orderRef.id}?payment=pix_generated`;
                  } else {
                      throw new Error(data.error || "Falha ao gerar PIX Automático.");
                  }
              } catch (e) {
                  alert("Erro ao gerar PIX: " + e.message);
                  submitLock.current = false; setIsSubmitting(false);
                  return;
              }
          }
      } catch (e) { alert(`Erro: ${e.message}`); submitLock.current = false; setIsSubmitting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white font-bold animate-pulse">Carregando Velo Delivery...</div>;
  if (!store) return <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white font-bold">Loja não encontrada.</div>;

  const pmConfig = store?.acceptedPayments || { online: true, pix: true, cardDelivery: true, cashDelivery: true, cardPickup: true, cashPickup: true };

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans">
      {/* HEADER MULTI-TENANT */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-lg border-b border-slate-800 p-4 pb-2 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {store?.storeLogoUrl || store?.logo ? (
            <img src={store.storeLogoUrl || store.logo} className="w-12 h-12 rounded-full object-cover border-2 shadow-md" style={{ borderColor: themeColor }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ backgroundColor: themeColor }}>{store?.name?.charAt(0) || "V"}</div>
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
          <input type="text" placeholder="Buscar no cardápio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#1E293B] border border-slate-700 focus:border-transparent rounded-2xl py-3 px-11 text-sm text-white transition-all outline-none" style={{ focusRingColor: themeColor }} />
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        </div>
      </header>

      {/* CATEGORIAS */}
      <nav className="sticky top-[138px] z-30 bg-[#0F172A]/95 backdrop-blur-lg border-b border-slate-800 flex gap-2 p-4 pt-2 overflow-x-auto no-scrollbar shadow-sm">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-black transition-all ${selectedCategory === cat ? 'text-white shadow-lg' : 'bg-[#1E293B] text-slate-400'}`} style={selectedCategory === cat ? { backgroundColor: themeColor, boxShadow: `0 4px 15px -3px ${themeColor}60` } : {}}>
            {cat}
          </button>
        ))}
      </nav>

      {/* PRODUTOS */}
      <main className="p-4 pb-40">
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map(p => (
            <motion.div key={p.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedProduct(p); setItemObservation(''); setItemRemoved([]); setSelectedOptions({}); }} className="bg-[#1E293B] rounded-[32px] p-3 border border-slate-700/50 flex flex-col h-full shadow-sm cursor-pointer">
              <div className="relative mb-3 aspect-square w-full">
                <img src={p.image || p.imageUrl || p.img} className="w-full h-full rounded-[24px] object-cover bg-slate-800" />
                <button className="absolute -bottom-2 -right-1 text-white p-2.5 rounded-2xl shadow-xl z-20 border-4 border-[#1E293B]" style={{ backgroundColor: themeColor }}>
                  <Plus size={20} />
                </button>
              </div>
              <div className="px-1 flex flex-col flex-1">
                <h3 className="font-black text-white text-[11px] leading-tight line-clamp-2 mb-1 uppercase italic">{p.name}</h3>
                <span className="font-black text-sm mt-auto" style={{ color: themeColor }}>R$ {Number(p.promotionalPrice > 0 ? p.promotionalPrice : p.price).toFixed(2)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* MODAL PRODUTO */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/80 z-[80] backdrop-blur-sm flex flex-col justify-end">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full z-[90]"><X size={20} /></button>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0F172A] w-full rounded-t-[40px] flex flex-col max-h-[90vh] overflow-hidden">
              <img src={selectedProduct.image || selectedProduct.imageUrl} className="w-full h-56 object-cover bg-slate-800" />
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 -mt-4 bg-[#0F172A] rounded-t-[40px] relative z-10">
                  <h2 className="text-2xl font-black italic text-white uppercase leading-none mb-2">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs font-bold mb-6">{selectedProduct.description}</p>
                  
                  <div className="bg-white p-5 rounded-[2rem] space-y-6 text-slate-800">
                      {selectedProduct.complements?.map((g, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                                  <h4 className="font-black text-xs uppercase">{g.name}</h4>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${g.isRequired ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}>{g.isRequired ? 'Obrigatório' : 'Opcional'} • Máx: {g.maxSelections}</span>
                              </div>
                              <div className="p-2 space-y-1">
                                  {g.options.map((opt, oIdx) => {
                                      const isSel = (selectedOptions[g.id]||[]).some(o => o.name === opt.name);
                                      return (
                                          <label key={oIdx} className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer ${isSel ? 'bg-blue-50 border-blue-400' : 'border-transparent hover:bg-slate-50'}`}>
                                              <div className="flex items-center gap-3">
                                                  <input type={g.maxSelections===1?'radio':'checkbox'} checked={isSel} onChange={() => handleOptionToggle(g, opt)} className="w-4 h-4 accent-blue-600" />
                                                  <span className="text-sm font-bold">{opt.name}</span>
                                              </div>
                                              {opt.price > 0 && <span className="text-xs font-black text-blue-600">+ R$ {Number(opt.price).toFixed(2)}</span>}
                                          </label>
                                      )
                                  })}
                              </div>
                          </div>
                      ))}
                      {selectedProduct.removables?.length > 0 && (
                          <div>
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">Retirar Ingredientes</h4>
                              {selectedProduct.removables.map((item, idx) => (
                                  <label key={idx} className="flex items-center gap-3 cursor-pointer mb-2">
                                      <input type="checkbox" checked={itemRemoved.includes(item)} onChange={e => e.target.checked ? setItemRemoved([...itemRemoved, item]) : setItemRemoved(itemRemoved.filter(i=>i!==item))} className="w-5 h-5 accent-red-500 rounded" />
                                      <span className={`text-sm font-bold ${itemRemoved.includes(item) ? 'line-through text-slate-400' : 'text-slate-700'}`}>Remover {item}</span>
                                  </label>
                              ))}
                          </div>
                      )}
                      <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">Observação Extra</h4>
                          <textarea rows="2" placeholder="Ex: Maionese à parte..." value={itemObservation} onChange={e => setItemObservation(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 font-bold text-sm" style={{ focusRingColor: themeColor }} />
                      </div>
                  </div>
              </div>
              <div className="p-6 bg-white flex items-center justify-between gap-4">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                      <p className="text-2xl font-black italic" style={{ color: themeColor }}>R$ {calcTotal().toFixed(2)}</p>
                  </div>
                  <button onClick={addToCart} className="text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2" style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px -5px ${themeColor}80` }}>
                      <ShoppingCart size={20} /> Adicionar
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOAT BOTÃO SACOLA */}
      <AnimatePresence>
        {cartCount > 0 && !isCheckoutOpen && !selectedProduct && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-4 right-4 z-50">
            <button onClick={() => setIsCheckoutOpen(true)} className="w-full text-white p-5 rounded-[28px] shadow-2xl flex justify-between items-center px-8 border-2 border-white/20" style={{ backgroundColor: themeColor }}>
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-black" style={{ color: themeColor }}>{cartCount}</div>
                <span className="font-black tracking-widest uppercase text-sm italic">Ver Sacola</span>
              </div>
              <span className="font-black text-lg">R$ {cartSub.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0F172A] rounded-t-[40px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 shrink-0" />
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-white">
                
                <div className="bg-[#1E293B] p-5 rounded-[2rem] mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Sacola</h3>
                    <div className="space-y-4">
                      {cart.map((item, i) => (
                        <div key={i} className="flex flex-col border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold"><span style={{ color: themeColor }} className="font-black mr-1">{item.quantity}x</span> {item.name}</span>
                                <span className="font-black">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 ml-4">
                                <div className="flex bg-slate-800 rounded-lg p-1">
                                    <button onClick={() => updateQty(item.signature, -1)} className="p-1 text-slate-400"><Minus size={14}/></button>
                                    <span className="text-xs font-black w-6 text-center leading-relaxed">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.signature, 1)} className="p-1 text-slate-400"><Plus size={14}/></button>
                                </div>
                                <button onClick={() => remove(item.signature)} className="text-[10px] font-bold text-red-400">Remover</button>
                            </div>
                        </div>
                      ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setDeliveryMethod('delivery')} className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'delivery' ? 'bg-white/10 text-white border-white/20' : 'border-slate-700 text-slate-500'}`} style={deliveryMethod === 'delivery' ? { borderColor: themeColor, color: themeColor, backgroundColor: `${themeColor}20` } : {}}>🛵 Entregar</button>
                    <button onClick={() => { setDeliveryMethod('pickup'); setDeliveryFee(0); }} className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${deliveryMethod === 'pickup' ? 'bg-white/10 text-white border-white/20' : 'border-slate-700 text-slate-500'}`} style={deliveryMethod === 'pickup' ? { borderColor: themeColor, color: themeColor, backgroundColor: `${themeColor}20` } : {}}>🏪 Retirar</button>
                </div>

                <div className="space-y-3 mb-6">
                  <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Seu Nome Completo *" className="w-full bg-[#1E293B] border border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white" />
                  {deliveryMethod === 'delivery' && (
                      <div className="relative">
                          <input type="text" value={customer.cep} onChange={e => setCustomer({...customer, cep: e.target.value})} placeholder="CEP *" maxLength="8" className="w-full bg-[#1E293B] border border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white" />
                          {isCepLoading && <span className="absolute right-4 top-4 text-[10px] uppercase font-black text-blue-400 animate-pulse">Buscando...</span>}
                      </div>
                  )}
                  {cepError && <p className="text-red-400 text-xs font-bold px-2">{cepError}</p>}
                  {customer.street && deliveryMethod === 'delivery' && (
                      <div className="space-y-3 animate-in fade-in">
                          <input type="text" value={customer.street} disabled className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-400" />
                          <input type="text" value={customer.number} onChange={e => setCustomer({...customer, number: e.target.value})} placeholder="Número/Complemento *" className="w-full bg-[#1E293B] border border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white" />
                      </div>
                  )}
                </div>

                {/* FORMA DE PAGAMENTO BLINDADA */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Como deseja pagar?</label>
                    <div className="grid grid-cols-1 gap-2">
                        {(() => {
                            const pmConf = store?.acceptedPayments || {};
                            const hasVeloPix = store?.velopayStatus === 'active';
                            const hasMP = store?.integrations?.mercadopago?.accessToken;

                            let methods = [];

                            // REGRA DE NEGÓCIO: Webview do WhatsApp exige pagamento online obrigatório
                            if (pmConf.online !== false || pmConf.pix !== false) {
                                if (pmConf.pix !== false) {
                                    methods.push({ id: hasVeloPix ? 'velopay_pix' : 'mercadopago_link', label: '⚡ PIX Automático' });
                                }
                                if (pmConf.online !== false && hasMP) {
                                    if (!methods.some(m => m.id === 'mercadopago_link')) {
                                        methods.push({ id: 'mercadopago_link', label: '💳 Cartão de Crédito (Online)' });
                                    } else {
                                        methods.find(m => m.id === 'mercadopago_link').label = '💳 Cartão / Pix (Online)';
                                    }
                                }
                            }

                            if (methods.length === 0) {
                                return (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                                        <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Loja Indisponível</p>
                                        <p className="text-slate-400 text-[10px] mt-1">A loja não possui meios de pagamento online (Pix/Cartão) configurados para o fluxo automático do WhatsApp.</p>
                                    </div>
                                );
                            }

                            // Auto-seleciona a primeira opção se o pagamento atual não for mais válido
                            if (!methods.some(m => m.id === customer.payment)) {
                                setTimeout(() => setCustomer(prev => ({...prev, payment: methods[0].id, changeFor: ''})), 0);
                            }

                            return methods.map((pm, idx) => (
                                <button key={`${pm.id}_${idx}`} onClick={() => setCustomer({...customer, payment: pm.id, changeFor: ''})} className={`p-4 rounded-xl border text-sm font-bold text-left transition-all ${customer.payment === pm.id ? 'text-white shadow-md' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`} style={customer.payment === pm.id ? { borderColor: themeColor, backgroundColor: `${themeColor}20` } : {}}>
                                    {pm.label}
                                </button>
                            ));
                        })()}
                    </div>
                </div>

                <div className="bg-[#1E293B] rounded-[2rem] p-5 border border-slate-700">
                    <div className="flex justify-between items-center text-sm mb-3 font-bold text-slate-300"><span>Subtotal</span><span>R$ {cartSub.toFixed(2)}</span></div>
                    {deliveryMethod === 'delivery' && <div className="flex justify-between items-center text-sm mb-4 font-bold text-slate-300"><span>Frete</span><span>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span></div>}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700"><span className="text-xs font-black uppercase text-slate-400">Total</span><span className="text-3xl font-black italic" style={{ color: themeColor }}>R$ {cartTotal.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="p-4 bg-[#0F172A] border-t border-slate-800">
                  <button onClick={finalizeOrder} disabled={isSubmitting || isCepLoading} className="w-full text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-xl disabled:opacity-50" style={{ backgroundColor: themeColor }}>
                    {isSubmitting ? 'Processando...' : 'Confirmar Pedido'}
                  </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}