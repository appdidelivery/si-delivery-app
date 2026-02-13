import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy, where, getDocs, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, Crown, MapPin, ExternalLink, QrCode, CreditCard, Banknote, Minus, Link, ImageIcon, Plus, Trash2, XCircle, Loader2, Truck, List, Package, Share, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

// REMOVIDO: IMPORTAÇÃO NOVA: BIBLIOTECA DO TOUR (Joyride)
// import Joyride, { STATUS, ACTIONS, EVENTS, LIFECYCLE } from 'react-joyride'; 

// Importa o componente Carousel e seus estilos
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 

// Importa o helper para obter o storeId
import { getStoreIdFromHostname } from '../utils/domainHelper';

// Função auxiliar para ícones de categoria
const getCategoryIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('cerveja')) return <Beer size={18}/>;
    if (n.includes('destilado') || n.includes('vinho') || n.includes('whisky')) return <Wine size={18}/>;
    if (n.includes('suco') || n.includes('refri') || n.includes('água') || n.includes('não-alcóolicos')) return <Refrigerator size={18}/>;
    if (n.includes('salgadinho')) return <Package size={18}/>; 
    return <List size={18}/>;
};

// NOVO: Função auxiliar para calcular o preço unitário com desconto de quantidade
const getPriceWithQuantityDiscount = (product, quantity) => {
    if (!product.quantityDiscounts || product.quantityDiscounts.length === 0) {
        return product.price; 
    }

    const applicableDiscount = product.quantityDiscounts
        .filter(qd => quantity >= qd.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0]; 

    if (applicableDiscount) {
        let discountedPrice = product.price; 
        if (applicableDiscount.type === 'percentage') {
            discountedPrice = product.price * (1 - applicableDiscount.value / 100);
        } else if (applicableDiscount.type === 'fixed') { 
            discountedPrice = product.price - applicableDiscount.value;
        }
        return discountedPrice > 0 ? discountedPrice : 0; 
    }

    return product.price; 
};


export default function Home() {
  const navigate = useNavigate();
  const storeId = window.location.hostname.includes('github') ? 'csi' : getStoreIdFromHostname();
  console.log("Home - storeId detectado:", storeId);

  // REMOVIDO: LÓGICA DO TOUR (ONBOARDING)
  // const [runTour, setRunTour] = useState(false);
  // const [tourStepIndex, setTourStepIndex] = useState(0);

  // const tourSteps = [...]
  // useEffect para hasSeenTour removido
  // handleJoyrideCallback removido

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);

  const [customer, setCustomer] = useState({
    name: '', cep: '', street: '', number: '', neighborhood: '', phone: '', payment: 'pix', changeFor: ''
  });
  const [showLastOrders, setShowLastOrders] = useState(false);
  const [lastOrders, setLastOrders] = useState([]);

  // Cupons
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const handlePhoneChange = (e) => {
    const phone = e.target.value;
    setCustomer({...customer, phone: phone});
    localStorage.setItem('customerPhone', phone);
  };
  const [marketingSettings, setMarketingSettings] = useState({
        promoActive: false,
        promoBannerUrls: []
    });
// --- LÓGICA DE EXIT INTENT (NÃO VÁ EMBORA) ---
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    // Se não estiver ativo no painel, nem roda o script
    if (!marketingSettings?.exitIntentActive) return;

    // Função para disparar o modal
    const triggerExitIntent = () => {
      // Verifica se já mostrou hoje (para não ser chato)
      const hasShown = localStorage.getItem('exitIntentShown');
      const today = new Date().toDateString();
      
      if (hasShown !== today) {
        setShowExitModal(true);
        localStorage.setItem('exitIntentShown', today); // Marca que mostrou hoje
      }
    };

    // 1. Desktop: Mouse sai da tela (cima)
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) triggerExitIntent();
    };

    // 2. Mobile: Timer de 30 segundos
    const timer = setTimeout(() => {
       triggerExitIntent();
    }, 30000); // 30 segundos

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [marketingSettings]);
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
        const q = query(collection(db, "orders"), where("customerPhone", "==", customerPhone), where("storeId", "==", storeId), orderBy("createdAt", "desc"));
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
  }, [showLastOrders, storeId]);

  const repeatOrder = (order) => {
    order.items.forEach(item => {
      addToCart({...item, id: item.id}, item.quantity); 
    });
    setShowLastOrders(false);
  };
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const [storeSettings, setStoreSettings] = useState({
    isOpen: true, openTime: '08:00', closeTime: '23:00',
    message: 'Aberto agora!', storeLogoUrl: '/logo-loja.png', storeBannerUrl: '/fachada.jpg',
    slogan: 'Os melhores produtos entregues na sua casa.',
    name: 'Minha Loja'
  });
    // --- FUNÇÃO DE COMPARTILHAR ---
  const handleShare = async () => {
    const shareData = {
      title: storeSettings.name,
      text: `Peça agora na ${storeSettings.name}!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Erro ao compartilhar', err);
      }
    } else {
      // Fallback para PC (Copia o Link)
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };
// --- LÓGICA DE FIDELIDADE ---
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    // Só calcula se a fidelidade estiver ATIVA e o cliente tiver telefone salvo
    if (marketingSettings?.loyaltyActive) {
      const phone = localStorage.getItem('customerPhone');
      if (phone) {
        // Busca pedidos CONCLUÍDOS (completed) deste telefone nesta loja
        const q = query(
          collection(db, "orders"),
          where("storeId", "==", storeId),
          where("customerPhone", "==", phone),
          where("status", "==", "completed") 
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          // Soma o total gasto
          const totalSpent = snapshot.docs.reduce((acc, doc) => acc + Number(doc.data().total || 0), 0);
          // Calcula pontos (Total * Fator configurado no Admin)
          const points = Math.floor(totalSpent * (marketingSettings.pointsPerReal || 1));
          setLoyaltyPoints(points);
        });
        return () => unsubscribe();
      }
    }
  }, [marketingSettings, storeId]);
    
  const [isStoreOpenNow, setIsStoreOpenNow] = useState(true);
  const [storeMessage, setStoreMessage] = useState('Verificando...');

  const [generalBanners, setGeneralBanners] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestsellingProducts, setBestsellingProducts] = useState([]);

  const [shippingRates, setShippingRates] = useState([]);
  const [shippingFee, setShippingFee] = useState(null);
  const [deliveryAreaMessage, setDeliveryAreaMessage] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);

    // --- INÍCIO DA CORREÇÃO (PWA Install Prompt) ---
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showiOSInstallMessage, setShowiOSInstallMessage] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setShowInstallPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isIos && isSafari && !isStandalone) {
            const hasDismissediOSPrompt = localStorage.getItem('dismissediOSInstallPrompt');
            if (!hasDismissediOSPrompt) {
                setShowiOSInstallMessage(true);
            }
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the A2HS prompt: ${outcome}`);
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        }
    };

    const handleDismissiOSInstallMessage = () => {
        setShowiOSInstallMessage(false);
        localStorage.setItem('dismissediOSInstallPrompt', 'true');
    };
    // --- FIM DA CORREÇÃO (PWA Install Prompt) ---


  useEffect(() => {
    const savedOrderId = localStorage.getItem('activeOrderId');
    if (savedOrderId) setActiveOrderId(savedOrderId);

    const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => {
        const fetchedProducts = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(fetchedProducts);
        setFeaturedProducts(fetchedProducts.filter(p => p.isFeatured && ((p.stock && parseInt(p.stock) > 0) || !p.stock)));
        setBestsellingProducts(fetchedProducts.filter(p => p.isBestSeller && ((p.stock && parseInt(p.stock) > 0) || !p.stock)));
    });

    const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("active", "==", true), where("storeId", "==", storeId)), (s) => {
        setAvailableCoupons(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubShippingRates = onSnapshot(query(collection(db, "shipping_rates"), where("storeId", "==", storeId)), (s) => {
      setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGeneralBanners = onSnapshot(query(collection(db, "banners"), where("storeId", "==", storeId), where("isActive", "==", true), orderBy("order", "asc")), (s) => {
      setGeneralBanners(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const storeSettingsRef = doc(db, "stores", storeId); 
    
    // Cria o documento se não existir (Fallback de segurança)
    getDoc(storeSettingsRef).then(s => {
      if (!s.exists()) {
        console.log("Home: Criando configuração padrão na coleção 'stores'...");
        setDoc(storeSettingsRef, {
          isOpen: true, openTime: '08:00', closeTime: '23:00',
          message: 'Aberto agora!', storeLogoUrl: '/logo-loja.png', storeBannerUrl: '/fachada.jpg',
          storeId: storeId,
          name: 'Minha Loja',
          slogan: 'Os melhores produtos entregues na sua casa.'
        }, { merge: true });
      }
    });

    const unsubStoreSettings = onSnapshot(storeSettingsRef, (d) => {
      if (d.exists()) {
        const data = d.data();
        console.log("🔥 Home recebeu atualização da Loja:", data); 
        setStoreSettings(data);

        // Lógica de Horário + Botão Manual do Admin
        let finalStatus = data.isOpen; 

        // Só verifica horário se o botão "Abrir Loja" estiver ativado
        if (data.isOpen && data.schedule) {
            const now = new Date();
            const todayDayId = now.getDay();
            const dayConfig = data.schedule[todayDayId];

            if (dayConfig && dayConfig.open) {
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [openHour, openMinute] = (dayConfig.start || '00:00').split(':').map(Number);
                const [closeHour, closeMinute] = (dayConfig.end || '23:59').split(':').map(Number);
                
                const scheduledOpenTime = openHour * 60 + openMinute;
                const scheduledCloseTime = closeHour * 60 + closeMinute;
                
                const isWithinHours = currentTime >= scheduledOpenTime && currentTime < scheduledCloseTime;
                
                finalStatus = isWithinHours;
            } else {
                finalStatus = false;
            }
        } else if (data.isOpen === false) {
            finalStatus = false;
        }

        setIsStoreOpenNow(finalStatus);
        
        const msgAberta = data.message || 'Aberto agora!';
        const msgFechada = 'Fechado no momento.';
        setStoreMessage(finalStatus ? msgAberta : msgFechada);
      }
    });

    // --- INÍCIO DA CORREÇÃO (Promo Relâmpago no Home.jsx) ---
    const marketingSettingsRef = doc(db, "settings", storeId); 
    const unsubMarketingSettings = onSnapshot(marketingSettingsRef, (d) => {
        if (d.exists()) {
            setMarketingSettings(d.data());
        }
    });
    // --- FIM DA CORREÇÃO (Promo Relâmpago no Home.jsx) ---


    return () => {
        unsubProducts();
        unsubCategories();
        unsubCoupons();
        unsubShippingRates();
        unsubGeneralBanners();
        unsubStoreSettings();
        // --- INÍCIO DA CORREÇÃO (Promo Relâmpago no Home.jsx) ---
        unsubMarketingSettings();
        // --- FIM DA CORREÇÃO (Promo Relâmpago no Home.jsx) ---
    };
  }, [storeId]);

  useEffect(() => {
    // --- INÍCIO DA CORREÇÃO (Nome dinâmico do PWA) ---
    if (storeSettings && storeSettings.storeLogoUrl && storeSettings.storeLogoUrl.startsWith('http')) {
      const logoUrl = storeSettings.storeLogoUrl;
      const storeNameForPWA = storeSettings.name || "Velo Delivery"; 

      const favicon = document.getElementById('dynamic-favicon');
      const appleIcon = document.getElementById('dynamic-apple-icon');
      if (favicon) favicon.href = logoUrl;
      if (appleIcon) appleIcon.href = logoUrl;

      const manifestTag = document.getElementById('manifest-tag');
      if (manifestTag) {
        const dynamicManifest = {
          "short_name": storeNameForPWA, 
          "name": storeNameForPWA,       
          "start_url": "/",
          "display": "standalone",
          "theme_color": "#1d4ed8",
          "background_color": "#ffffff",
          "orientation": "portrait", 
          "scope": "/",              
          "icons": [
            {
              "src": logoUrl,
              "sizes": "192x192",
              "type": "image/png",
              "purpose": "any"
            },
            {
              "src": logoUrl,
              "sizes": "512x512",
              "type": "image/png",
              "purpose": "any"
            }
          ]
        };

        const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);
        manifestTag.setAttribute('href', manifestURL);
      }
    }
  }, [storeSettings.storeLogoUrl, storeSettings.name]); 

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
        const currentCepNum = parseInt(cep); 

        const foundRate = shippingRates.find(rate => {
            // 1. TENTATIVA POR FAIXA DE CEP
            if (rate.cepStart && rate.cepEnd) {
                const start = parseInt(rate.cepStart.replace(/\D/g, ''));
                const end = parseInt(rate.cepEnd.replace(/\D/g, ''));
                if (currentCepNum >= start && currentCepNum <= end) return true; 
            }
            // 2. TENTATIVA POR NOME DO BAIRRO
            if (data.bairro && rate.neighborhood) {
                 return rate.neighborhood.toLowerCase().trim() === data.bairro.toLowerCase().trim();
            }
            return false;
        });
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
  }, [customer.cep, shippingRates, storeId]);

  const addToCart = (p, quantity = 1) => {
    if (!isStoreOpenNow) { alert(storeMessage); return; }
    if (p.stock && p.stock <= 0) { alert("Produto fora de estoque!"); return; }

    setCart(prev => {
      const existingItem = prev.find(i => i.id === p.id);
      let newQuantity = quantity;

      if (existingItem) {
        newQuantity += existingItem.quantity;
      }

      if (p.stock && (newQuantity > p.stock)) {
          alert("Limite de estoque atingido!");
          return prev;
      }
      
      const finalPricePerUnit = getPriceWithQuantityDiscount(p, newQuantity);

      if (existingItem) {
          return prev.map(i => i.id === p.id ? { ...i, quantity: newQuantity, price: finalPricePerUnit } : i);
      } else {
          return [...prev, { ...p, quantity: newQuantity, price: finalPricePerUnit }];
      }
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart(prevCart => {
        return prevCart.map(item => {
            if (item.id === productId) {
                const newQuantity = item.quantity + amount;
                if (newQuantity <= 0) return null;

                const productOriginal = products.find(p => p.id === productId);
                const priceWithDiscount = productOriginal ? getPriceWithQuantityDiscount(productOriginal, newQuantity) : item.price;

                return { ...item, quantity: newQuantity, price: priceWithDiscount };
            }
            return item;
        }).filter(item => item !== null);
    });
  };

  const removeFromCart = (pid) => setCart(p => p.filter(i => i.id !== pid));

  // --- CÁLCULOS TOTAIS (CORREÇÃO) ---
  // 1. Calcula o Subtotal (Soma dos itens)
  const subtotal = cart.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.quantity || 0)), 0);

  // 2. Verifica Meta de Frete Grátis
  const freeShippingThreshold = Number(storeSettings.freeShippingThreshold || 0);
  const isFreeShipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;

  // 3. Define o valor final do frete (0 se ganhou, ou o valor do CEP se não ganhou)
  const finalShippingFee = isFreeShipping ? 0 : Number(shippingFee || 0);

  // 4. Calcula o Total Final da Conta
  const finalTotal = Number(subtotal) + finalShippingFee - Number(discountAmount || 0);

  const applyCoupon = async () => {
    setCouponError('');
    setDiscountAmount(0);
    setAppliedCoupon(null);

    if (!couponCode) {
      setCouponError('Por favor, digite um código de cupom.');
      return;
    }

    const coupon = availableCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());

    if (!coupon) {
      setCouponError('Cupom inválido ou não encontrado.');
      return;
    }

    if (!coupon.active) {
      setCouponError('Este cupom não está ativo.');
      return;
    }

    const now = new Date();
    if (coupon.expirationDate && new Date(coupon.expirationDate) < now) {
      setCouponError('Este cupom expirou.');
      return;
    }

    if (coupon.usageLimit && coupon.currentUsage >= coupon.usageLimit) {
      setCouponError('Este cupom atingiu o limite máximo de usos.');
      return;
    }

    if (coupon.userUsageLimit) {
        const customerPhone = localStorage.getItem('customerPhone');
        if (customerPhone) {
            const customerOrdersWithCouponQuery = query(
                collection(db, "orders"),
                where("customerPhone", "==", customerPhone),
                where("couponCode", "==", coupon.code),
                where("status", "==", "completed"),
                where("storeId", "==", storeId)
            );
            const snapshot = await getDocs(customerOrdersWithCouponQuery);
            if (snapshot.size >= coupon.userUsageLimit) {
                setCouponError('Você já usou este cupom o número máximo de vezes.');
                return;
            }
        }
    }

    if (coupon.firstPurchaseOnly) {
        const customerPhone = localStorage.getItem('customerPhone');
        if (customerPhone) {
            const customerTotalOrdersQuery = query(
                collection(db, "orders"),
                where("customerPhone", "==", customerPhone),
                where("status", "==", "completed"),
                where("storeId", "==", storeId)
            );
            const snapshot = await getDocs(customerTotalOrdersQuery);
            if (snapshot.size > 0) {
                setCouponError('Este cupom é válido apenas para a primeira compra.');
                return;
            }
        }
    }

    if (coupon.minimumOrderValue > subtotal) {
      setCouponError(`Valor mínimo do pedido para este cupom é R$ ${coupon.minimumOrderValue.toFixed(2)}.`);
      return;
    }

    let calculatedDiscount = 0;
    if (coupon.type === 'percentage') {
      calculatedDiscount = subtotal * (coupon.value / 100);
    } else if (coupon.type === 'fixed_amount') {
      calculatedDiscount = coupon.value;
    }

    setAppliedCoupon(coupon);
    setDiscountAmount(calculatedDiscount);
    setCouponError('Cupom aplicado com sucesso!');
  };


  const finalizeOrder = async () => {
    // 1. Validações de Segurança
    if (!isStoreOpenNow) return alert(storeMessage);
    if(!customer.name || !customer.cep || !customer.street || !customer.number || !customer.phone) return alert("Preencha o endereço completo.");
    if(cart.length === 0) return alert("Carrinho vazio!");
    if (shippingFee === null) return alert("Frete não calculado.");

    const fullAddress = `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
    
    // 2. Salvar no Firebase
    try {
      const orderData = {
        customerName: customer.name, customerAddress: fullAddress, customerPhone: customer.phone,
        payment: customer.payment, customerChangeFor: customer.payment === 'dinheiro' ? customer.changeFor : '',
        items: cart, subtotal, shippingFee, total: finalTotal, status: 'pending', createdAt: serverTimestamp(),
        storeId: storeId
      };

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code;
        orderData.discountAmount = discountAmount;
      }

      const docRef = await addDoc(collection(db, "orders"), orderData);

      if (appliedCoupon) {
        await updateDoc(doc(db, "coupons", appliedCoupon.id), {
          currentUsage: (appliedCoupon.currentUsage || 0) + 1
        });
      }

      // --- AQUI ESTÁ A CORREÇÃO DA MENSAGEM ---
      // 3. Montar o texto BONITO para o WhatsApp
      const itemsList = cart.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
      const totalMsg = `*Total: R$ ${finalTotal.toFixed(2)}*`;
      const enderecoMsg = `\n📍 *Endereço:* ${fullAddress}`;
      const obsMsg = customer.payment === 'dinheiro' && customer.changeFor ? `\n💵 *Troco para:* ${customer.changeFor}` : `\n💳 *Pagamento:* ${customer.payment.toUpperCase()}`;
      
      // Usa window.location.host para o link funcionar tanto em localhost quanto na Vercel
      const linkAcompanhamento = `https://${window.location.host}/track/${docRef.id}`;

      const message = `🔔 *NOVO PEDIDO #${docRef.id.slice(-5).toUpperCase()}*\n\n👤 *Cliente:* ${customer.name}\n📱 *Tel:* ${customer.phone}\n${enderecoMsg}\n\n🛒 *RESUMO DO PEDIDO:*\n${itemsList}\n\n🚚 *Frete:* R$ ${(shippingFee || 0).toFixed(2)}\n${totalMsg}\n${obsMsg}\n\n🔗 *Acompanhar:* ${linkAcompanhamento}`;

      // 4. Pegar o número do Admin (ou usa um fallback se estiver vazio)
      const targetPhone = storeSettings.whatsapp || "5551999999999"; 

      // 5. Gerar o Link com o texto codificado (encodeURIComponent é essencial!)
      const whatsappUrl = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      // 6. Limpar tudo e Redirecionar
      localStorage.setItem('activeOrderId', docRef.id);
      setActiveOrderId(docRef.id);
      setCart([]);
      setShowCheckout(false);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');
      
      // Abre o WhatsApp e vai para o Tracking
      window.open(whatsappUrl, '_blank');
      navigate(`/track/${docRef.id}`);

    } catch (e) {
        alert("Erro ao processar. Tente novamente.");
        console.error("Erro ao finalizar pedido:", e);
    }
  };

  const displayCategories = [
      { id: 'all', name: 'Todos', icon: <Utensils size={18}/> },
      ...categories.map(c => ({ id: c.name, name: c.name, icon: getCategoryIcon(c.name) }))
  ];

  const recommendedIdsInCart = cart.flatMap(item => item.recommendedIds || []);

  // 2. Busca esses produtos (que não estejam no carrinho e tenham estoque)
  const smartUpsell = products.filter(p => 
      recommendedIdsInCart.includes(p.id) && 
      !cart.some(c => c.id === p.id) && 
      ((p.stock && parseInt(p.stock) > 0) || !p.stock)
  );

  // 3. Decide: Usa os inteligentes? Se não tiver, usa os Destaques (Fallback)
  const upsellProducts = smartUpsell.length > 0 
      ? smartUpsell 
      : products
          .filter(p => !cart.some(item => item.id === p.id) && ((p.stock && parseInt(p.stock) > 0) || !p.stock)) 
          .filter(p => p.isBestSeller || p.isFeatured) 
          .slice(0, 5); 

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <SEO title="Velo Delivery" description="Bebidas geladas." />
      
      {/* REMOVIDO: COMPONENTE DO TOUR (Joyride) */}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <img src={storeSettings.storeLogoUrl} className="h-12 w-12 rounded-full object-cover border-2 border-blue-600 shadow-sm" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-800 leading-none uppercase">{storeSettings.name || "Sua Loja"}</h1>
            {storeSettings.slogan && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{storeSettings.slogan}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          <button 
            onClick={handleShare} 
            className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 border border-blue-100 active:scale-95 transition-all"
          >
            <Share size={20} />
          </button>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isStoreOpenNow ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {isStoreOpenNow ? <Clock size={14}/> : <XCircle size={14}/>} <span className="text-[10px] font-black uppercase">{storeMessage}</span>
          </div>
        </div>
      </header>
      {/* --- TARJA DE FIDELIDADE (SÓ APARECE SE TIVER PONTOS) --- */}
      <AnimatePresence>
        {marketingSettings?.loyaltyActive && loyaltyPoints > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 text-white px-6 py-4 relative overflow-hidden shadow-lg border-b border-slate-800"
          >
            {/* Efeito de Fundo (Brilho) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>

            <div className="flex justify-between items-end relative z-10 mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-yellow-300 to-yellow-600 text-slate-900 p-2.5 rounded-xl shadow-lg shadow-yellow-900/20">
                   <Crown size={18} fill="currentColor" /> {/* Importe Crown do lucide-react */}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Clube VIP</p>
                  <p className="text-sm font-bold italic text-white leading-none">
                    Você tem <span className="text-2xl font-black text-yellow-400">{loyaltyPoints}</span> Pontos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Próxima Recompensa</p>
                <p className="text-xs font-bold text-purple-200 max-w-[150px] leading-tight truncate">
                  {marketingSettings.loyaltyReward || 'Prêmio Surpresa'}
                </p>
              </div>
            </div>
            
            {/* Barra de Progresso */}
            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((loyaltyPoints / (marketingSettings.loyaltyGoal || 100)) * 100, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-500"
              ></motion.div>
            </div>
            
            <p className="text-[9px] text-center text-slate-500 mt-2 font-medium">
              Faltam <span className="text-white font-bold">{Math.max(0, (marketingSettings.loyaltyGoal || 100) - loyaltyPoints)}</span> pontos para resgatar!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CÓDIGO DO CARROSSEL DE PROMOÇÃO RELÂMPAGO */}
      <AnimatePresence>
        {marketingSettings.promoActive && marketingSettings.promoBannerUrls && marketingSettings.promoBannerUrls.length > 0 && (
          <motion.div layout initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden p-6">
            <Carousel showThumbs={false} infiniteLoop={true} autoPlay={true} interval={3000} showStatus={false}>
              {marketingSettings.promoBannerUrls.map((url, index) => (
                <div key={index}>
                  <img src={url} alt={`Banner ${index + 1}`} className="w-full h-auto object-contain rounded-[2rem] shadow-xl border-4 border-white" />
                </div>
              ))}
            </Carousel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOVO: CARROSSEL DE BANNERS GERAIS / DE MARCAS */}
      <AnimatePresence>
        {generalBanners.length > 0 && (
          <motion.div layout initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden p-6 pt-0">
            <Carousel showThumbs={false} infiniteLoop={true} autoPlay={true} interval={5000} showStatus={false}>
              {generalBanners.map((banner) => (
                <div key={banner.id}>
                    <a href={banner.linkTo} target="_blank" rel="noopener noreferrer">
                        <img src={banner.imageUrl} alt={banner.linkTo} className="w-full h-auto object-contain rounded-[2rem] shadow-xl border-4 border-white" />
                    </a>
                </div>
              ))}
            </Carousel>
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

      {/* NOVO: SEÇÃO DE PRODUTOS EM DESTAQUE */}
      {featuredProducts.length > 0 && (
          <div className="px-6 mt-8">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 flex justify-between items-center">
                  Nossos Destaques
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AnimatePresence mode='popLayout'>
                      {featuredProducts.map(p => {
                          const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
                          return (
                              <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all ${!hasStock ? 'opacity-60 grayscale' : ''}`}>
                                  <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative">
                                      <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                      {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                      {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                              <>
                                                  <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                  <span className="text-blue-600 font-black text-lg italic leading-none block">R$ {Number(p.price)?.toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className="text-blue-600 font-black text-sm italic leading-none">R$ {Number(p.price)?.toFixed(2)}</span>
                                          )}
                                      </div>
                                      <button 
                                        onClick={() => addToCart(p)} 
                                        disabled={!isStoreOpenNow || !hasStock}
                                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95
                                            ${!isStoreOpenNow || !hasStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                        <span className="font-black text-[10px] uppercase tracking-widest">Adicionar</span>
                                        <ShoppingCart size={16} />
                                    </button>
                                  </div>
                              </motion.div>
                          );
                      })}
                  </AnimatePresence>
              </div>
          </div>
      )}

      {/* NOVO: SEÇÃO DE PRODUTOS MAIS VENDIDOS */}
      {bestsellingProducts.length > 0 && (
          <div className="px-6 mt-8">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 flex justify-between items-center">
                  Mais Vendidos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AnimatePresence mode='popLayout'>
                      {bestsellingProducts.map(p => {
                          const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
                          return (
                              <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all ${!hasStock ? 'opacity-60 grayscale' : ''}`}>
                                  <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative">
                                      <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                      {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                      {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                              <>
                                                  <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                  <span className="text-blue-600 font-black text-lg italic leading-none block">R$ {Number(p.price)?.toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className="text-blue-600 font-black text-sm italic leading-none">R$ {Number(p.price)?.toFixed(2)}</span>
                                          )}
                                      </div>
                                      <button onClick={() => addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                          <ShoppingCart size={16} />
                                      </button>
                                  </div>
                              </motion.div>
                          );
                      })}
                  </AnimatePresence>
              </div>
          </div>
      )}


      {/* PRODUTOS (VITRINE PRINCIPAL) */}
      <main className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 mt-8"> {/* Removido tour-vitrine */}
        <AnimatePresence mode='popLayout'>
          {products.filter(p => (activeCategory === 'all' || p.category === activeCategory) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
             const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
             return (
                <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all ${!hasStock ? 'opacity-60 grayscale' : ''}`}>
                <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative">
                    <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                    {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                    {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                </div>
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                <div className="flex justify-between items-center mt-auto">
                    <div>
                        {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                            <>
                                <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                <span className="text-blue-600 font-black text-lg italic leading-none block">R$ {Number(p.price)?.toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-blue-600 font-black text-sm italic leading-none">R$ {Number(p.price)?.toFixed(2)}</span>
                        )}
                    </div>
                    <button onClick={() => addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                    <ShoppingCart size={16} />
                    </button>
                </div>
                </motion.div>
             );
          })}
        </AnimatePresence>
      </main>

      {/* --- RODAPÉ DINÂMICO (Lê do Admin) --- */}
      <section className="px-6 py-10 bg-slate-100/50 text-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Estamos localizados em</h2>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm max-w-md mx-auto border border-white">
            {/* Nome da Loja Dinâmico */}
            <p className="font-black text-slate-800 uppercase tracking-tighter italic text-xl mb-1">{storeSettings.name || "Nossa Loja"}</p>
            
            {/* Endereço Dinâmico (Vem do Admin) */}
            <p className="text-slate-500 text-xs font-bold mb-6 uppercase tracking-widest px-4 leading-relaxed">
                {storeSettings.address || "Endereço não cadastrado"}
            </p>
            
            {/* Link do Maps Automático */}
            {storeSettings.address && (
                <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeSettings.address)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                    Ver no Google Maps <ExternalLink size={14}/>
                </a>
            )}
        </div>
      </section>

<footer className="p-12 text-center">
        <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] mb-6">Plataforma de Vendas</p>
        {/* CORREÇÃO AQUI: Trocamos <div> por <a> e adicionamos o href */}
        <a 
          href="https://velodelivery.com.br" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex flex-col items-center opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer"
        >
          {/* Certifique-se que o nome da imagem está correto na sua pasta public */}
          <img src="/logo retangular Velo Delivery.png" className="h-6 w-auto mb-2" alt="Velo Delivery" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
        </a>
      </footer>

      {/* Contêiner para os botões fixos (Acompanhar, Carrinho, Últimos Pedidos) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around z-50"> {/* Removido lg:hidden */}
        {/* Botão "Acompanhar Pedidos" */}
        <AnimatePresence>
          {activeOrderId && (
            <motion.button onClick={() => navigate(`/track/${activeOrderId}`)} className="bg-purple-600 text-white rounded-full p-4 shadow-xl hover:bg-purple-700 active:scale-90 flex items-center gap-2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <Truck size={24} /> <span className="font-bold text-sm pr-2">Acompanhar</span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative flex items-center justify-center">
            <motion.button 
                onClick={() => setShowCheckout(true)} 
                className="bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700 active:scale-90" 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
            >
                <ShoppingCart size={24} />
            </motion.button>
            
            <AnimatePresence>
                {cart.length > 0 && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm z-[60]"
                >
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    
                </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Botão "Últimos Pedidos" */}
        <motion.button
          onClick={() => setShowLastOrders(true)}
          className="bg-orange-600 text-white rounded-full p-4 shadow-xl hover:bg-orange-700 active:scale-90 flex items-center gap-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Clock size={24} /> <span className="font-bold text-sm pr-2">Últimos Pedidos</span>
        </motion.button>
      </div>

      {/* CHECKOUT COMPLETO */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SEU PEDIDO</h2>
              {/* --- BARRA DE FRETE GRÁTIS --- */}
              {storeSettings.freeShippingThreshold > 0 && (
                  <div className="mb-6 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      {(() => {
                          const currentTotal = cart.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
                          const goal = Number(storeSettings.freeShippingThreshold);
                          const missing = goal - currentTotal;
                          const progress = Math.min((currentTotal / goal) * 100, 100);

                          if (missing <= 0) {
                              return (
                                  <div className="flex items-center justify-center gap-2 text-green-600 font-black uppercase text-xs animate-bounce">
                                      <Crown size={16} /> Parabéns! Frete Grátis Conquistado!
                                  </div>
                              );
                          } else {
                              return (
                                  <>
                                      <p className="text-xs font-bold text-slate-500 mb-2 text-center">
                                          Faltam <span className="text-slate-900 font-black">R$ {missing.toFixed(2)}</span> para Frete Grátis
                                      </p>
                                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                          <div 
                                              style={{ width: `${progress}%` }}
                                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                                          />
                                      </div>
                                  </>
                              );
                          }
                      })()}
                  </div>
              )}

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
                  
                  {/* REMOVIDO: WRAPPER TOUR DADOS */}
                  <div>
                    <input type="text" placeholder="Seu Nome" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                    <input
                      type="tel"
                      placeholder="WhatsApp"
                      className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none"
                      value={customer.phone}
                      onChange={handlePhoneChange}
                    />
                    <div className="relative">
                      <input type="tel" placeholder="CEP" maxLength="9" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.cep} onChange={e => setCustomer({...customer, cep: e.target.value})} />
                      {isCepLoading && <Loader2 className="animate-spin absolute right-5 top-5 text-blue-500"/>}
                    </div>
                    {customer.street && (
                      <>
                          <input type="text" value={customer.street} disabled className="w-full p-5 bg-slate-200 text-slate-500 rounded-[2rem] mb-3 font-bold"/>
                          <input type="text" placeholder="Número / Complemento" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.number} onChange={e => setCustomer({...customer, number: e.target.value})}/>
                      </>
                    )}
                  </div>
                  {/* FIM REMOVIDO WRAPPER TOUR DADOS */}

                  {cepError && <p className="text-red-500 text-xs font-bold text-center">{cepError}</p>}
                  {deliveryAreaMessage && !cepError && <p className="text-blue-500 text-xs font-bold text-center">{deliveryAreaMessage}</p>}

                  {/* Cupom de Desconto */}
                  <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Cupom de Desconto:</p>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Insira o código do cupom"
                      className="flex-1 p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                    />
                    <button onClick={applyCoupon} className="bg-blue-600 text-white p-5 rounded-[2rem] font-black uppercase shadow-xl hover:bg-blue-700">Aplicar</button>
                  </div>
                  {couponError && <p className={`text-xs font-bold text-center mt-2 ${appliedCoupon ? 'text-green-500' : 'text-red-500'}`}>{couponError}</p>}

                  {/* NOVO: SEÇÃO "QUE TAL PEDIR TAMBÉM?" (UPSELL) */}
                  {upsellProducts.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                          <p className="font-black text-xs text-slate-400 uppercase ml-4 tracking-widest mb-4">Que tal pedir também?</p>
                          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                              {upsellProducts.map(p => (
                                  <div key={p.id} className="flex-shrink-0 w-36 bg-slate-50 rounded-2xl border border-slate-100 p-3 text-center relative">
                                      <img src={p.imageUrl} className="w-20 h-20 object-contain mx-auto mb-2" />
                                      <p className="font-bold text-sm leading-tight line-clamp-2 mb-1">{p.name}</p>
                                      <p className="text-blue-600 font-black text-sm">R$ {p.price?.toFixed(2)}</p>
                                      <button onClick={() => addToCart(p)} className="absolute bottom-3 right-3 p-1.5 bg-blue-600 text-white rounded-full"><Plus size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <p className="font-black text-xs text-slate-400 uppercase mt-4 ml-4 tracking-widest">Pagamento:</p>
                  
                  {/* REMOVIDO: WRAPPER TOUR PAGAMENTO */}
                  <div>
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
                        <div className="flex justify-between text-sm opacity-60 font-bold mb-2">
    <span>Frete</span>
    <span className={isFreeShipping ? "text-green-600 font-black" : ""}>
        {shippingFee !== null ? (isFreeShipping ? "GRÁTIS" : `R$ ${shippingFee.toFixed(2)}`) : '--'}
    </span>
</div>
                        {discountAmount > 0 && <div className="flex justify-between text-sm font-bold text-green-400 mb-2"><span>Desconto do Cupom</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-xl font-black italic"><span>TOTAL</span><span>R$ {finalTotal.toFixed(2)}</span></div>
                    </div>

                    <button onClick={finalizeOrder} disabled={!isStoreOpenNow || isCepLoading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black mt-6 uppercase text-xl shadow-xl hover:bg-blue-700 disabled:opacity-50">
                      {isCepLoading ? 'Calculando...' : 'Confirmar Pedido'}
                    </button>
                  </div>
                  {/* FIM REMOVIDO WRAPPER TOUR PAGAMENTO */}

                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ÚLTIMOS PEDIDOS */}
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

      {/* --- INÍCIO DA CORREÇÃO (PWA Install Prompt UI) --- */}
      <AnimatePresence>
        {showInstallPrompt && (
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl z-[100] rounded-t-3xl flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <img src={storeSettings.storeLogoUrl} className="h-10 w-10 rounded-full object-cover border-2 border-white" />
                    <div>
                        <p className="font-bold text-sm leading-tight">{storeSettings.name}</p>
                        <p className="text-xs opacity-80">Adicione à tela inicial para acesso rápido!</p>
                    </div>
                </div>
                <button
                    onClick={handleInstallClick}
                    className="flex-shrink-0 bg-white text-blue-600 px-4 py-2 rounded-full font-bold text-xs uppercase shadow-md hover:bg-blue-50 active:scale-95 transition-all"
                >
                    Instalar App
                </button>
                <button onClick={() => setShowInstallPrompt(false)} className="absolute top-2 right-2 text-white opacity-70 hover:opacity-100">
                    <X size={16} />
                </button>
            </motion.div>
        )}

        {showiOSInstallMessage && (
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-purple-600 to-pink-700 text-white shadow-xl z-[100] rounded-t-3xl flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <img src={storeSettings.storeLogoUrl} className="h-10 w-10 rounded-full object-cover border-2 border-white" />
                    <div>
                        <p className="font-bold text-sm leading-tight">Instale nosso App!</p>
                        <p className="text-xs opacity-80">
                            Toque no ícone <Share size={14} className="inline-block relative -top-0.5" /> e depois em "Adicionar à Tela de Início".
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDismissiOSInstallMessage}
                    className="flex-shrink-0 bg-white text-purple-600 px-4 py-2 rounded-full font-bold text-xs uppercase shadow-md hover:bg-purple-50 active:scale-95 transition-all"
                >
                    Entendi
                </button>
                <button onClick={() => setShowiOSInstallMessage(false)} className="absolute top-2 right-2 text-white opacity-70 hover:opacity-100">
                    <X size={16} />
                </button>
            </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExitModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setShowExitModal(false)} // Fecha ao clicar fora
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.8, y: 50 }} 
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center relative shadow-2xl border-4 border-rose-500 overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Não fecha ao clicar dentro
            >
              <button onClick={() => setShowExitModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all"><X size={20}/></button>
              
              <div className="bg-rose-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Gift size={40} className="text-rose-600" /> {/* Importe Gift */}
              </div>

              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">
                {marketingSettings.exitIntentMessage || "Espere! Não vá ainda!"}
              </h2>
              <p className="text-slate-500 font-medium text-sm mb-6">
                Preparamos um presente exclusivo para você finalizar seu pedido agora.
              </p>

              <div className="bg-slate-100 p-4 rounded-2xl border-2 border-dashed border-slate-300 mb-6 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group" onClick={() => {
                 navigator.clipboard.writeText(marketingSettings.exitIntentCoupon);
                 setCouponCode(marketingSettings.exitIntentCoupon); // Já preenche no input do carrinho
                 alert('Cupom COPIADO! Aproveite.');
                 setShowExitModal(false);
                 setShowCheckout(true); // Abre o carrinho na hora
              }}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seu Cupom</p>
                <p className="text-3xl font-black text-blue-600 uppercase tracking-widest group-hover:scale-110 transition-transform">
                  {marketingSettings.exitIntentCoupon || "VOLTA10"}
                </p>
                <p className="text-[9px] text-blue-400 font-bold mt-1">(Clique para Copiar)</p>
              </div>

              <button 
                onClick={() => {
                  setCouponCode(marketingSettings.exitIntentCoupon);
                  setShowExitModal(false);
                  setShowCheckout(true);
                }}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 transition-all"
              >
                Usar Cupom Agora
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- FIM DA CORREÇÃO (PWA Install Prompt UI) --- */}
    </div>
  );
}