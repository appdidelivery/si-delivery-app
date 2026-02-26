import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy, where, getDocs, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, Crown, MapPin, ExternalLink, QrCode, CreditCard, Banknote, Minus, Link, ImageIcon, Plus, Trash2, XCircle, Loader2, Truck, List, Package, Share, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 

import { getStoreIdFromHostname } from '../utils/domainHelper';

const getCategoryIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('cerveja')) return <Beer size={18}/>;
    if (n.includes('destilado') || n.includes('vinho') || n.includes('whisky')) return <Wine size={18}/>;
    if (n.includes('suco') || n.includes('refri') || n.includes('água') || n.includes('não-alcóolicos')) return <Refrigerator size={18}/>;
    if (n.includes('salgadinho')) return <Package size={18}/>; 
    return <List size={18}/>;
};

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
  const storeId = (window.location.hostname.includes('github') || window.location.hostname.includes('localhost')) ? (import.meta.env.VITE_LOJA_LOCAL || 'csi') : getStoreIdFromHostname();
  
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [selectedOptions, setSelectedOptions] = useState({}); 
  const [itemObservation, setItemObservation] = useState(''); 

  const handleOpenProduct = (p) => {
      setSelectedProduct(p);
      setSelectedOptions({});
      setItemObservation('');
  };

  const handleOptionToggle = (group, option) => {
      setSelectedOptions(prev => {
          const currentGroupSelections = prev[group.id] || [];
          const isSelected = currentGroupSelections.some(o => o.name === option.name);

          if (isSelected) {
              return { ...prev, [group.id]: currentGroupSelections.filter(o => o.name !== option.name) };
          } else {
              if (group.maxSelections === 1) {
                  return { ...prev, [group.id]: [option] }; 
              } else if (currentGroupSelections.length < group.maxSelections) {
                  return { ...prev, [group.id]: [...currentGroupSelections, option] }; 
              } else {
                  return prev; 
              }
          }
      });
  };

  const calculateModalTotal = () => {
      if (!selectedProduct) return 0;
      let total = Number(selectedProduct.price);
      Object.values(selectedOptions).forEach(optionArray => {
          optionArray.forEach(opt => { total += Number(opt.price || 0); });
      });
      return total;
  };

  const handleAddCustomToCart = () => {
      if (selectedProduct.complements) {
          for (const group of selectedProduct.complements) {
              if (group.isRequired) {
                  const selectedCount = (selectedOptions[group.id] || []).length;
                  if (selectedCount === 0) {
                      alert(`Por favor, selecione uma opção em: ${group.name}`);
                      return;
                  }
              }
          }
      }
      const customId = `${selectedProduct.id}-${btoa(JSON.stringify(selectedOptions))}`;
      const optionsText = Object.values(selectedOptions).flat().map(o => o.name).join(', ');
      const cartName = optionsText ? `${selectedProduct.name} (${optionsText})` : selectedProduct.name;
      const itemToAdd = {
          ...selectedProduct,
          cartItemId: customId,
          name: cartName,
          observation: itemObservation,
          price: calculateModalTotal() 
      };
      addToCart(itemToAdd, 1);
      setSelectedProduct(null); 
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); 
  const [showCheckout, setShowCheckout] = useState(false);
  const[isFinalizing, setIsFinalizing] = useState(false);

  const [customer, setCustomer] = useState({
    name: '', email: '', cep: '', street: '', number: '', neighborhood: '', phone: '', payment: 'pix', changeFor: ''
  });
  const [showLastOrders, setShowLastOrders] = useState(false);
  const [lastOrders, setLastOrders] = useState([]);

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const savedCustomer = localStorage.getItem('veloCustomerData');
    if (savedCustomer) {
      setCustomer(JSON.parse(savedCustomer));
    } else {
      const savedPhone = localStorage.getItem('customerPhone');
      if (savedPhone) setCustomer(prev => ({ ...prev, phone: savedPhone }));
    }
  }, []);

  const handleCustomerChange = (field, value) => {
    const updatedCustomer = { ...customer, [field]: value };
    setCustomer(updatedCustomer);
    const { payment, changeFor, ...dataToSave } = updatedCustomer;
    localStorage.setItem('veloCustomerData', JSON.stringify(dataToSave));
    if (field === 'phone') localStorage.setItem('customerPhone', value);
  };
  const [marketingSettings, setMarketingSettings] = useState({
        promoActive: false,
        promoBannerUrls: []
    });
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!marketingSettings?.exitIntentActive) return;
    const triggerExitIntent = () => {
      const hasShown = localStorage.getItem('exitIntentShown');
      const today = new Date().toDateString();
      if (hasShown !== today) {
        setShowExitModal(true);
        localStorage.setItem('exitIntentShown', today); 
      }
    };
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) triggerExitIntent();
    };
    const timer = setTimeout(() => {
       triggerExitIntent();
    }, 30000); 
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [marketingSettings]);

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

  const scrollToCategory = (categoryId) => {
    if (storeSettings?.layoutTheme === 'list') {
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        const offset = 90; 
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
    setActiveCategory(categoryId); 
  };
  
  const handleShare = async () => {
    const shareData = {
      title: storeSettings.name,
      text: `Peça agora na ${storeSettings.name}!`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    if (marketingSettings?.loyaltyActive) {
      const phone = localStorage.getItem('customerPhone');
      if (phone) {
        const q = query(
          collection(db, "orders"),
          where("storeId", "==", storeId),
          where("customerPhone", "==", phone),
          where("status", "==", "completed") 
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const totalSpent = snapshot.docs.reduce((acc, doc) => acc + Number(doc.data().total || 0), 0);
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
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        }
    };

    const handleDismissiOSInstallMessage = () => {
        setShowiOSInstallMessage(false);
        localStorage.setItem('dismissediOSInstallPrompt', 'true');
    };

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

    const unsubStoreSettings = onSnapshot(storeSettingsRef, (d) => {
      if (d.exists()) {
        const data = d.data();
        setStoreSettings(data);
        let finalStatus = data.isOpen; 

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
        
      } else {
        setStoreSettings({ name: 'Loja Não Encontrada', storeLogoUrl: 'https://cdn-icons-png.flaticon.com/512/606/606197.png' });
        setIsStoreOpenNow(false);
        setStoreMessage('Loja Inativa ou Inexistente');
      }
    });

    const marketingSettingsRef = doc(db, "settings", storeId); 
    const unsubMarketingSettings = onSnapshot(marketingSettingsRef, (d) => {
        if (d.exists()) {
            setMarketingSettings(d.data());
        }
    });

    return () => {
        unsubProducts(); unsubCategories(); unsubCoupons(); unsubShippingRates();
        unsubGeneralBanners(); unsubStoreSettings(); unsubMarketingSettings();
    };
  }, [storeId]);

  useEffect(() => {
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
          "short_name": storeNameForPWA, "name": storeNameForPWA, "start_url": "/",
          "display": "standalone", "theme_color": "#1d4ed8", "background_color": "#ffffff",
          "orientation": "portrait", "scope": "/",             
          "icons": [
            { "src": logoUrl, "sizes": "192x192", "type": "image/png", "purpose": "any" },
            { "src": logoUrl, "sizes": "512x512", "type": "image/png", "purpose": "any" }
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
            if (rate.cepStart && rate.cepEnd) {
                const start = parseInt(rate.cepStart.replace(/\D/g, ''));
                const end = parseInt(rate.cepEnd.replace(/\D/g, ''));
                if (currentCepNum >= start && currentCepNum <= end) return true; 
            }
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
    
    // 1. TRAVA INICIAL
    if (p.stock !== undefined && Number(p.stock) <= 0) { 
        alert(`O produto ${p.name} está esgotado!`); 
        return; 
    }

    setCart(prev => {
      const existingItem = prev.find(i => i.id === p.id);
      let newQuantity = quantity;

      if (existingItem) {
        newQuantity += existingItem.quantity;
      }

      // 2. TRAVA DE CARRINHO
      if (p.stock !== undefined && (newQuantity > Number(p.stock))) {
          alert(`⚠️ Desculpe, só temos ${p.stock} unidades de ${p.name} disponíveis no momento.`);
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

                // 3. TRAVA DO BOTÃO +
                if (amount > 0 && productOriginal && productOriginal.stock !== undefined) {
                    if (newQuantity > Number(productOriginal.stock)) {
                        alert(`⚠️ Limite atingido! Temos apenas ${productOriginal.stock} unidades de ${productOriginal.name}.`);
                        return item; 
                    }
                }

                const priceWithDiscount = productOriginal ? getPriceWithQuantityDiscount(productOriginal, newQuantity) : item.price;
                return { ...item, quantity: newQuantity, price: priceWithDiscount };
            }
            return item;
        }).filter(item => item !== null);
    });
  };

  const removeFromCart = (pid) => setCart(p => p.filter(i => i.id !== pid));

  const subtotal = cart.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  const freeShippingThreshold = Number(storeSettings.freeShippingThreshold || 0);
  const isFreeShipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
  const finalShippingFee = isFreeShipping ? 0 : Number(shippingFee || 0);
  const finalTotal = Number(subtotal) + finalShippingFee - Number(discountAmount || 0);

  const applyCoupon = async () => {
    setCouponError(''); setDiscountAmount(0); setAppliedCoupon(null);
    if (!couponCode) { setCouponError('Por favor, digite um código de cupom.'); return; }
    const coupon = availableCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
    if (!coupon) { setCouponError('Cupom inválido ou não encontrado.'); return; }
    if (!coupon.active) { setCouponError('Este cupom não está ativo.'); return; }
    const now = new Date();
    if (coupon.expirationDate && new Date(coupon.expirationDate) < now) { setCouponError('Este cupom expirou.'); return; }
    if (coupon.usageLimit && coupon.currentUsage >= coupon.usageLimit) { setCouponError('Este cupom atingiu o limite máximo de usos.'); return; }

    if (coupon.userUsageLimit) {
        const customerPhone = localStorage.getItem('customerPhone');
        if (customerPhone) {
            const customerOrdersWithCouponQuery = query(collection(db, "orders"), where("customerPhone", "==", customerPhone), where("couponCode", "==", coupon.code), where("status", "==", "completed"), where("storeId", "==", storeId));
            const snapshot = await getDocs(customerOrdersWithCouponQuery);
            if (snapshot.size >= coupon.userUsageLimit) { setCouponError('Você já usou este cupom o número máximo de vezes.'); return; }
        }
    }

    if (coupon.firstPurchaseOnly) {
        const customerPhone = localStorage.getItem('customerPhone');
        if (customerPhone) {
            const customerTotalOrdersQuery = query(collection(db, "orders"), where("customerPhone", "==", customerPhone), where("status", "==", "completed"), where("storeId", "==", storeId));
            const snapshot = await getDocs(customerTotalOrdersQuery);
            if (snapshot.size > 0) { setCouponError('Este cupom é válido apenas para a primeira compra.'); return; }
        }
    }

    if (coupon.minimumOrderValue > subtotal) { setCouponError(`Valor mínimo do pedido para este cupom é R$ ${coupon.minimumOrderValue.toFixed(2)}.`); return; }

    let calculatedDiscount = 0;
    if (coupon.type === 'percentage') { calculatedDiscount = subtotal * (coupon.value / 100);
    } else if (coupon.type === 'fixed_amount') { calculatedDiscount = coupon.value; }

    setAppliedCoupon(coupon); setDiscountAmount(calculatedDiscount); setCouponError('Cupom aplicado com sucesso!');
  };

  const finalizeOrder = async () => {
    if (isFinalizing) return; 
    if (!isStoreOpenNow) return alert(storeMessage);
    if (!customer.name || !customer.email || !customer.cep || !customer.street || !customer.number || !customer.phone) return alert("Preencha todos os dados, incluindo seu e-mail.");
    if (cart.length === 0) return alert("Carrinho vazio!");
    if (shippingFee === null) return alert("Frete não calculado.");

    setIsFinalizing(true); 
    const fullAddress = `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
    
    try {
      const sanitizedCart = cart.map(item => ({ ...item, observation: item.observation || "" }));
      const newOrderRef = doc(collection(db, "orders"));
      const orderId = newOrderRef.id;

      const orderData = {
        customerName: customer.name || "", 
        customerAddress: fullAddress || "", 
        customerPhone: customer.phone || "",
        paymentMethod: customer.payment || "", 
        customerChangeFor: customer.payment === 'dinheiro' ? (customer.changeFor || "") : "",
        items: sanitizedCart, 
        subtotal: subtotal || 0, 
        shippingFee: shippingFee || 0, 
        total: finalTotal || 0, 
        status: 'pending', 
        createdAt: serverTimestamp(),
        storeId: storeId || ""
      };

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code || "";
        orderData.discountAmount = discountAmount || 0;
      }

      if (customer.payment === 'dinheiro' || customer.payment === 'motoboy_card') {
          await setDoc(newOrderRef, orderData);
          if (appliedCoupon) {
            await updateDoc(doc(db, "coupons", appliedCoupon.id), { currentUsage: (appliedCoupon.currentUsage || 0) + 1 });
          }

          const itemsList = cart.map(i => {
                let text = `🔸 ${i.quantity}x *${i.name}* - R$ ${(i.price * i.quantity).toFixed(2)}`;
                if (i.observation) text += `\n      _Obs: ${i.observation}_`;
                return text;
            }).join('\n');
          const totalMsg = `*Total: R$ ${finalTotal.toFixed(2)}*`;
          const enderecoMsg = `\n📍 *Endereço:* ${fullAddress}`;
          
          // Define a mensagem do WhatsApp dependendo se é dinheiro ou cartão com motoboy
          const obsMsg = customer.payment === 'dinheiro' 
              ? `\n💵 *Pagamento:* Dinheiro\n🪙 *Troco para:* ${customer.changeFor || 'Não precisa'}`
              : `\n💳 *Pagamento:* Cartão na Entrega (Levar maquininha)`;

          const linkAcompanhamento = `https://${window.location.host}/track/${orderId}`;
          const message = `🔔 *NOVO PEDIDO #${orderId.slice(-5).toUpperCase()}*\n\n👤 *Cliente:* ${customer.name}\n📱 *Tel:* ${customer.phone}\n${enderecoMsg}\n\n🛒 *RESUMO DO PEDIDO:*\n${itemsList}\n\n🚚 *Frete:* R$ ${(shippingFee || 0).toFixed(2)}\n${totalMsg}\n${obsMsg}\n\n🔗 *Acompanhar:* ${linkAcompanhamento}`;

          const targetPhone = storeSettings.whatsapp || "5551999999999";
          const whatsappUrl = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
          
          localStorage.setItem('activeOrderId', orderId);
          setActiveOrderId(orderId);
          setCart([]); setShowCheckout(false); setAppliedCoupon(null); setDiscountAmount(0); setCouponCode('');
          setIsFinalizing(false); 
          
          window.open(whatsappUrl, '_blank');
          navigate(`/track/${orderId}`);
          return;
      }

      if (customer.payment === 'cartao' || customer.payment === 'pix') {
          if (!storeSettings.stripeConnectId) {
              alert("⚠️ Esta loja ainda não configurou pagamentos online. Escolha a opção 'Dinheiro'.");
              setIsFinalizing(false); 
              return;
          }

          const response = await fetch('/api/create-marketplace-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  items: sanitizedCart,
                  orderId: orderId, 
                  storeConnectId: storeSettings.stripeConnectId,
                  customerEmail: customer.email || 'cliente@padrao.com',
                  shippingFee: shippingFee || 0,
                  discountAmount: discountAmount || 0,
                  successUrl: `https://${window.location.host}/track/${orderId}?payment=success`,
                  cancelUrl: `https://${window.location.host}/track/${orderId}?payment=cancel`
              })
          });

          const data = await response.json();
          
          if (data.url) {
              await setDoc(newOrderRef, orderData);
              localStorage.setItem('activeOrderId', orderId);
              setActiveOrderId(orderId);
              setCart([]); setShowCheckout(false);
              window.location.href = data.url;
          } else {
              alert("Erro ao gerar link de pagamento: " + (data.error || "Desconhecido"));
              setIsFinalizing(false); 
          }
      }

    } catch (e) {
        alert("Erro ao processar. Tente novamente.");
        console.error("Erro ao finalizar pedido:", e);
        setIsFinalizing(false); 
    }
  };

  const displayCategories = [
      { id: 'all', name: 'Todos', icon: <Utensils size={18}/> },
      ...categories.map(c => ({ id: c.name, name: c.name, icon: getCategoryIcon(c.name) }))
  ];

  const recommendedIdsInCart = cart.flatMap(item => item.recommendedIds || []);
  const smartUpsell = products.filter(p => 
      recommendedIdsInCart.includes(p.id) && 
      !cart.some(c => c.id === p.id) && 
      ((p.stock && parseInt(p.stock) > 0) || !p.stock)
  );

  const upsellProducts = smartUpsell.length > 0 
      ? smartUpsell 
      : products
          .filter(p => !cart.some(item => item.id === p.id) && ((p.stock && parseInt(p.stock) > 0) || !p.stock)) 
          .filter(p => p.isBestSeller || p.isFeatured) 
          .slice(0, 5); 

  const layoutTheme = storeSettings?.layoutTheme || 'grid';
  
  const themePresets = {
    default: { primary: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', shadow: 'shadow-blue-100', hoverPrimary: 'hover:bg-blue-700', lightBg: 'bg-blue-50', hoverLightBg: 'hover:bg-blue-100', accent: 'accent-blue-600', darkText: 'text-blue-900', gradientFrom: 'from-blue-400', gradientTo: 'to-blue-600', ringColor: 'blue-500' },
    burger: { primary: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600', shadow: 'shadow-orange-100', hoverPrimary: 'hover:bg-orange-700', lightBg: 'bg-orange-50', hoverLightBg: 'hover:bg-orange-100', accent: 'accent-orange-600', darkText: 'text-orange-900', gradientFrom: 'from-orange-400', gradientTo: 'to-orange-600', ringColor: 'orange-500' },
    pizza: { primary: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', shadow: 'shadow-rose-100', hoverPrimary: 'hover:bg-rose-700', lightBg: 'bg-rose-50', hoverLightBg: 'hover:bg-rose-100', accent: 'accent-rose-600', darkText: 'text-rose-900', gradientFrom: 'from-rose-400', gradientTo: 'to-rose-600', ringColor: 'rose-500' },
    oriental: { primary: 'bg-slate-900', text: 'text-slate-900', border: 'border-slate-900', shadow: 'shadow-slate-200', hoverPrimary: 'hover:bg-slate-800', lightBg: 'bg-slate-800', hoverLightBg: 'hover:bg-slate-700', accent: 'accent-slate-900', darkText: 'text-slate-900', gradientFrom: 'from-slate-700', gradientTo: 'to-slate-900', ringColor: 'slate-600' },
    natural: { primary: 'bg-green-600', text: 'text-green-600', border: 'border-green-600', shadow: 'shadow-green-100', hoverPrimary: 'hover:bg-green-700', lightBg: 'bg-green-50', hoverLightBg: 'hover:bg-green-100', accent: 'accent-green-600', darkText: 'text-green-900', gradientFrom: 'from-green-400', gradientTo: 'to-green-600', ringColor: 'green-500' },
    sweet: { primary: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', shadow: 'shadow-purple-100', hoverPrimary: 'hover:bg-purple-700', lightBg: 'bg-purple-50', hoverLightBg: 'hover:bg-purple-100', accent: 'accent-purple-600', darkText: 'text-purple-900', gradientFrom: 'from-purple-400', gradientTo: 'to-purple-600', ringColor: 'purple-500' },
    drinks: { primary: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-100', hoverPrimary: 'hover:bg-amber-600', lightBg: 'bg-amber-50', hoverLightBg: 'hover:bg-amber-100', accent: 'accent-amber-500', darkText: 'text-amber-900', gradientFrom: 'from-amber-300', gradientTo: 'to-amber-500', ringColor: 'amber-500' }
  };

  const currentTheme = themePresets[storeSettings?.storeNiche] || themePresets.default;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <SEO title="Velo Delivery" description="Bebidas geladas." />
      
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <img src={storeSettings.storeLogoUrl} className={`h-12 w-12 rounded-full object-cover border-2 ${currentTheme.border} shadow-sm`} onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-800 leading-none uppercase">{storeSettings.name || "Sua Loja"}</h1>
            {storeSettings.slogan && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{storeSettings.slogan}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleShare} className={`p-2 ${currentTheme.lightBg} ${currentTheme.text} rounded-full ${currentTheme.hoverLightBg} border ${currentTheme.lightBg.replace('bg-','border-').replace('50','100')} active:scale-95 transition-all`}>
            <Share size={20} />
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isStoreOpenNow ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {isStoreOpenNow ? <Clock size={14}/> : <XCircle size={14}/>} <span className="text-[10px] font-black uppercase">{storeMessage}</span>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {marketingSettings?.loyaltyActive && loyaltyPoints > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-900 text-white px-6 py-4 relative overflow-hidden shadow-lg border-b border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
            <div className="flex justify-between items-end relative z-10 mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-yellow-300 to-yellow-600 text-slate-900 p-2.5 rounded-xl shadow-lg shadow-yellow-900/20">
                   <Crown size={18} fill="currentColor" /> 
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
            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((loyaltyPoints / (marketingSettings.loyaltyGoal || 100)) * 100, 100)}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-500"></motion.div>
            </div>
            <p className="text-[9px] text-center text-slate-500 mt-2 font-medium">
              Faltam <span className="text-white font-bold">{Math.max(0, (marketingSettings.loyaltyGoal || 100) - loyaltyPoints)}</span> pontos para resgatar!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
          <input type="text" placeholder="O que você procura?" className={`w-full p-4 pl-12 rounded-2xl bg-white shadow-sm outline-none focus:ring-2 ring-${currentTheme.ringColor} font-medium`} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {displayCategories.map(c => (
            <button key={c.id} onClick={() => scrollToCategory(c.id)} className={`px-6 py-3 rounded-full font-bold text-xs whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeCategory === c.id ? `${currentTheme.primary} text-white` : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

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
                                      {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-sm z-10">OFERTA 🔥</span>}
                                      {p.isChilled && <span className="absolute bottom-2 right-2 bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-cyan-200 z-10">❄️ GELADA</span>}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                              <>
                                                  <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                  <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className={`${currentTheme.text} font-black text-sm italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                          )}
                                      </div>
                                      <button onClick={() => hasStock && addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? `${currentTheme.primary} text-white ${currentTheme.shadow}` : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
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
                                      {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-sm z-10">OFERTA 🔥</span>}
                                      {p.isChilled && <span className="absolute bottom-2 right-2 bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-cyan-200 z-10">❄️ GELADA</span>}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3">{p.name}</h3>
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                              <>
                                                  <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                  <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className={`${currentTheme.text} font-black text-sm italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                          )}
                                      </div>
                                      <button onClick={() => hasStock && addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? `${currentTheme.primary} text-white ${currentTheme.shadow}` : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
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

      <main className="px-6 mb-20 mt-8">
        {layoutTheme === 'grid' ? (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
                <AnimatePresence mode='popLayout'>
                    {products.filter(p => (activeCategory === 'all' || p.category === activeCategory) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                        const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
                        return (
                            <motion.div layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} key={p.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col group hover:shadow-md transition-all ${!hasStock ? 'opacity-60 grayscale' : ''}`}>
                                <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative" onClick={() => hasStock ? setSelectedProduct(p) : null}>
                                    <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500 cursor-pointer" />
                                    {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                    {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                    {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-sm z-10">OFERTA 🔥</span>}
                                    {p.isChilled && <span className="absolute bottom-2 right-2 bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-cyan-200 z-10">❄️ GELADA</span>}
                                </div>
                                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-3 cursor-pointer" onClick={() => hasStock ? setSelectedProduct(p) : null}>{p.name}</h3>
                                <div className="flex justify-between items-center mt-auto">
                                    <div>
                                        {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                            <>
                                                <span className="text-sm font-bold text-slate-400 line-through block">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                            </>
                                        ) : (
                                            <span className={`${currentTheme.text} font-black text-sm italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <button onClick={() => hasStock && addToCart(p)} disabled={!isStoreOpenNow || !hasStock} className={`p-2.5 rounded-xl active:scale-90 shadow-lg ${isStoreOpenNow && hasStock ? `${currentTheme.primary} text-white ${currentTheme.shadow}` : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                        <ShoppingCart size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        ) : ( 
            <div className="flex flex-col gap-8">
                {displayCategories
                    .filter(c => c.id !== 'all') 
                    .map(cat => {
                        const categoryProducts = products.filter(p => 
                            p.category === cat.name && 
                            p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                            ((p.stock && parseInt(p.stock) > 0) || !p.stock)
                        );
                        if (activeCategory !== 'all' && activeCategory !== cat.id) {
                            return null;
                        }
                        if (categoryProducts.length === 0) {
                            return null;
                        }

                        return (
                            <section key={cat.id} id={`category-${cat.id}`} className="flex flex-col gap-4">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-4 sticky top-20 bg-slate-50 z-40 py-2">
                                    {cat.name}
                                </h2>
                                <AnimatePresence mode='popLayout'>
                                    {categoryProducts.map(p => {
                                        const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
                                        return (
                                            <motion.div layout initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} key={p.id} 
                                                onClick={() => hasStock ? setSelectedProduct(p) : null}
                                                className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${!hasStock ? 'opacity-60 grayscale' : ''}`}
                                            >
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <h3 className="font-black text-slate-800 text-sm leading-tight mb-1">{p.name}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                                        {p.description || "Clique para ver mais detalhes e opções."}
                                                    </p>
                                                    <div className="mt-auto">
                                                        {p.hasDiscount && p.originalPrice && p.price < p.originalPrice ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                                                <span className="text-xs font-bold text-slate-400 line-through">R$ {Number(p.originalPrice).toFixed(2)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-28 h-28 flex-shrink-0 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                                                    <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                                                    {p.hasDiscount && p.discountPercentage && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl">-{p.discountPercentage}%</span>}
                                                    {!hasStock && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center font-black text-white text-[10px] uppercase tracking-widest backdrop-blur-sm">Esgotado</div>}
                                                    {p.isChilled && <span className="absolute bottom-1 right-1 bg-cyan-100 text-cyan-800 text-[10px] p-1 rounded-full leading-none shadow-sm z-10">❄️</span>}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </section>
                        );
                    })}
            </div>
        )}
      </main>

      <section className="px-6 py-10 bg-slate-100/50 text-center">
        <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Estamos localizados em</h2>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm max-w-md mx-auto border border-white">
            <p className="font-black text-slate-800 uppercase tracking-tighter italic text-xl mb-1">{storeSettings.name || "Nossa Loja"}</p>
            <p className="text-slate-500 text-xs font-bold mb-6 uppercase tracking-widest px-4 leading-relaxed">
                {storeSettings.address || "Endereço não cadastrado"}
            </p>
            {storeSettings.address && (
                <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeSettings.address)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 ${currentTheme.lightBg} ${currentTheme.text} px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest ${currentTheme.hoverLightBg} transition-all`}
                >
                    Ver no Google Maps <ExternalLink size={14}/>
                </a>
            )}
        </div>
      </section>

      <footer className="p-12 text-center">
        <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] mb-6">Plataforma de Vendas</p>
        <a 
          href="https://velodelivery.com.br" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex flex-col items-center opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer"
        >
          <img src="/logo retangular Velo Delivery.png" className="h-6 w-auto mb-2" alt="Velo Delivery" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
        </a>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around z-50"> 
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
                className={`${currentTheme.primary} text-white rounded-full p-4 shadow-xl ${currentTheme.hoverPrimary} active:scale-90`} 
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

        <motion.button
          onClick={() => setShowLastOrders(true)}
          className="bg-orange-600 text-white rounded-full p-4 shadow-xl hover:bg-orange-700 active:scale-90 flex items-center gap-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Clock size={24} /> <span className="font-bold text-sm pr-2">Últimos Pedidos</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SEU PEDIDO</h2>
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
                                              className={`h-full bg-gradient-to-r ${currentTheme.gradientFrom} ${currentTheme.gradientTo} transition-all duration-500`}
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
                        {item.observation && (
    <span className="block text-[10px] text-orange-600 font-bold leading-tight mt-1 bg-orange-50 p-1.5 rounded-md border border-orange-100">
        Obs: {item.observation}
    </span>
)}
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus size={16}/></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus size={16}/></button>
                          <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Detalhes:</p>
                  <div>
                    <input type="text" placeholder="Seu Nome Completo" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.name} onChange={e => handleCustomerChange('name', e.target.value)} />
                    <input type="email" placeholder="Seu E-mail (Para recibo seguro)" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.email} onChange={e => handleCustomerChange('email', e.target.value)} />
                    <input type="tel" placeholder="WhatsApp (DDD + Número)" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.phone} onChange={e => handleCustomerChange('phone', e.target.value)} />
                    <div className="relative">
                      <input type="tel" placeholder="CEP" maxLength="9" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.cep} onChange={e => handleCustomerChange('cep', e.target.value)} />
                      {isCepLoading && <Loader2 className={`animate-spin absolute right-5 top-5 text-${currentTheme.ringColor}`}/>}
                    </div>
                    {customer.street && (
                      <>
                          <input type="text" value={customer.street} disabled className="w-full p-5 bg-slate-200 text-slate-500 rounded-[2rem] mb-3 font-bold"/>
                          <input type="text" placeholder="Número / Complemento" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.number} onChange={e => handleCustomerChange('number', e.target.value)}/>
                      </>
                    )}
                  </div>

                  {cepError && <p className="text-red-500 text-xs font-bold text-center">{cepError}</p>}
                  {deliveryAreaMessage && !cepError && <p className={`${currentTheme.text} text-xs font-bold text-center`}>{deliveryAreaMessage}</p>}

                  <p className="font-black text-xs text-slate-400 uppercase mt-8 ml-4 tracking-widest">Cupom de Desconto:</p>
                  <div className="flex gap-2 mt-2">
                    <input type="text" placeholder="Insira o código do cupom" className="flex-1 p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                    <button onClick={applyCoupon} className={`${currentTheme.primary} text-white p-5 rounded-[2rem] font-black uppercase shadow-xl ${currentTheme.hoverPrimary}`}>Aplicar</button>
                  </div>
                  {couponError && <p className={`text-xs font-bold text-center mt-2 ${appliedCoupon ? 'text-green-500' : 'text-red-500'}`}>{couponError}</p>}

                  {upsellProducts.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                          <p className="font-black text-xs text-slate-400 uppercase ml-4 tracking-widest mb-4">Que tal pedir também?</p>
                          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                              {upsellProducts.map(p => (
                                  <div key={p.id} className="flex-shrink-0 w-36 bg-slate-50 rounded-2xl border border-slate-100 p-3 text-center relative">
                                      <img src={p.imageUrl} className="w-20 h-20 object-contain mx-auto mb-2" />
                                      <p className="font-bold text-sm leading-tight line-clamp-2 mb-1">{p.name}</p>
                                      <p className={`${currentTheme.text} font-black text-sm`}>R$ {p.price?.toFixed(2)}</p>
                                      <button onClick={() => hasStock && addToCart(p)} className={`absolute bottom-3 right-3 p-1.5 ${currentTheme.primary} text-white rounded-full`}><Plus size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <p className="font-black text-xs text-slate-400 uppercase mt-4 ml-4 tracking-widest">Pagamento:</p>
                  <div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[ 
                        {id:'pix', name:'PIX', icon: <QrCode size={20}/>}, 
                        {id:'cartao', name:'CARTÃO', icon: <CreditCard size={20}/>}, 
                        {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>}, 
                        {id:'motoboy_card', name:'COM MOTOBOY', icon: <Truck size={20}/>} 
                      ].map(m => (
                          <button key={m.id} onClick={()=>setCustomer({...customer, payment:m.id})} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${customer.payment===m.id?`${currentTheme.lightBg} ${currentTheme.border} ${currentTheme.text}`:'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                              {m.icon} <span className="text-[9px] font-black uppercase mt-1 text-center">{m.name}</span>
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
                        <div className="flex justify-between text-xl font-black italic"><span>TOTAL</span><span className={`${currentTheme.text} italic`}>R$ {finalTotal.toFixed(2)}</span></div>
                    </div>

                   <button 
                        onClick={finalizeOrder} 
                        disabled={!isStoreOpenNow || isCepLoading || isFinalizing} 
                        className={`w-full ${currentTheme.primary} text-white py-6 rounded-[2rem] font-black mt-6 uppercase text-xl shadow-xl ${currentTheme.hoverPrimary} disabled:opacity-50`}
                    >
                        {isFinalizing ? 'Processando...' : (isCepLoading ? 'Calculando...' : 'Confirmar Pedido')}
                    </button>
                  </div>

                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        <p className={`${currentTheme.text} italic`}>Total: R$ {order.total?.toFixed(2)}</p>
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

      <AnimatePresence>
        {showInstallPrompt && (
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-r ${currentTheme.gradientFrom} ${currentTheme.gradientTo.replace(/\d{2,3}/,'700')} text-white shadow-xl z-[100] rounded-t-3xl flex items-center justify-between gap-4`}
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
                    className={`flex-shrink-0 bg-white ${currentTheme.text} px-4 py-2 rounded-full font-bold text-xs uppercase shadow-md ${currentTheme.hoverLightBg.replace('hover:bg-', 'hover:bg-')} active:scale-95 transition-all`}
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
            onClick={() => setShowExitModal(false)} 
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.8, y: 50 }} 
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center relative shadow-2xl border-4 border-rose-500 overflow-hidden"
              onClick={(e) => e.stopPropagation()} 
            >
              <button onClick={() => setShowExitModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all"><X size={20}/></button>
              
              <div className="bg-rose-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Gift size={40} className="text-rose-600" /> 
              </div>

              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">
                {marketingSettings.exitIntentMessage || "Espere! Não vá ainda!"}
              </h2>
              <p className="text-slate-500 font-medium text-sm mb-6">
                Preparamos um presente exclusivo para você finalizar seu pedido agora.
              </p>

              <div className="bg-slate-100 p-4 rounded-2xl border-2 border-dashed border-slate-300 mb-6 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group" onClick={() => {
                 navigator.clipboard.writeText(marketingSettings.exitIntentCoupon);
                 setCouponCode(marketingSettings.exitIntentCoupon); 
                 alert('Cupom COPIADO! Aproveite.');
                 setShowExitModal(false);
                 setShowCheckout(true); 
              }}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seu Cupom</p>
                <p className={`text-3xl font-black ${currentTheme.text} uppercase tracking-widest group-hover:scale-110 transition-transform`}>
                  {marketingSettings.exitIntentCoupon || "VOLTA10"}
                </p>
                <p className={`text-[9px] ${currentTheme.text.replace(/\d{2,3}/,'400')} font-bold mt-1`}>(Clique para Copiar)</p>
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
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setSelectedProduct(null)} 
          >
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full z-10 backdrop-blur-md hover:bg-black/60 transition-all"
              >
                <X size={20} />
              </button>

              <div className="w-full h-64 bg-slate-50 relative flex-shrink-0">
                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" alt={selectedProduct.name} />
                {selectedProduct.hasDiscount && selectedProduct.discountPercentage && (
                  <span className="absolute bottom-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-xl shadow-lg z-10">
                    -{selectedProduct.discountPercentage}% OFF
                  </span>
                )}
                {selectedProduct.isChilled && (
                  <span className="absolute bottom-4 right-4 bg-cyan-100 text-cyan-800 text-xs font-black px-3 py-1 rounded-xl shadow-lg border border-cyan-200 z-10">
                    ❄️ Entregue Gelada
                  </span>
                )}
              </div>

              <div className="p-6 overflow-y-auto pb-32 custom-scrollbar flex-1">
                <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{selectedProduct.name}</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  {selectedProduct.description || "Sem descrição adicional detalhada."}
                </p>

                {selectedProduct.complements && selectedProduct.complements.length > 0 && (
                    <div className="border-t border-slate-100 pt-2 mt-4 space-y-4">
                        {selectedProduct.complements.map(group => (
                            <div key={group.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-slate-800 text-sm uppercase">{group.name}</h4>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${group.isRequired ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {group.isRequired ? 'Obrigatório' : 'Opcional'} • Máx: {group.maxSelections}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {group.options.map((opt, i) => {
                                        const isSelected = (selectedOptions[group.id] || []).some(o => o.name === opt.name);
                                        return (
                                            <label key={i} className={`flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? `${currentTheme.border} ${currentTheme.lightBg}/50` : 'border-transparent bg-white hover:border-slate-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type={group.maxSelections === 1 ? 'radio' : 'checkbox'} 
                                                        checked={isSelected}
                                                        onChange={() => handleOptionToggle(group, opt)}
                                                        className={`${currentTheme.accent} w-4 h-4 cursor-pointer`}
                                                    />
                                                    <span className={`text-sm font-bold ${isSelected ? `${currentTheme.darkText}` : 'text-slate-600'}`}>{opt.name}</span>
                                                </div>
                                                {opt.price > 0 && <span className={`text-xs font-black ${isSelected ? `${currentTheme.text}` : 'text-slate-400'}`}>+ R$ {Number(opt.price).toFixed(2)}</span>}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Alguma observação?</label>
                    <textarea 
                        rows="2" 
                        placeholder="Ex: Tirar cebola, maionese à parte..." 
                        className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-${currentTheme.ringColor} transition-all`}
                        value={itemObservation}
                        onChange={(e) => setItemObservation(e.target.value)}
                    ></textarea>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex items-center justify-between gap-4 z-20">
                 <div className="flex flex-col pl-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total do Item</span>
                    <span className={`text-2xl font-black ${currentTheme.text} italic leading-none`}>R$ {calculateModalTotal().toFixed(2)}</span>
                 </div>
                 
                 <button 
                    onClick={handleAddCustomToCart} 
                    className={`flex-1 ${currentTheme.primary} text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl ${currentTheme.shadow.replace('100', '200')} ${currentTheme.hoverPrimary} transition-all flex items-center justify-center gap-2`}
                 >
                    <ShoppingCart size={20} /> Adicionar
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}