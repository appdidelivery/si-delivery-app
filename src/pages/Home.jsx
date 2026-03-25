
import Reviews from '../components/Reviews';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy, where, getDocs, updateDoc, getDoc, setDoc, increment } from 'firebase/firestore';
import { ShoppingCart, Search, Flame, X, Utensils, Beer, Wine, Refrigerator, Navigation, Clock, Star, Crown, MapPin, ExternalLink, QrCode, CreditCard, Banknote, Minus, Link, ImageIcon, Plus, Trash2, XCircle, Loader2, Truck, List, Package, Share, Gift, Zap, CupSoda, Martini, Candy, Snowflake, Pizza, Coffee, IceCream, UploadCloud, Sandwich, Wallet, Medal, Award, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import AgeGate from '../components/AgeGate';

import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 

import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- NOVOS ÍCONES GIGANTES (REACT-ICONS) ---
import { 
    GiHamburger, GiFrenchFries, GiShrimp, GiOyster, GiSushis, 
    GiSodaCan, GiPizzaSlice, GiTacos, GiHotDog, GiMeat, 
    GiCoffeeCup, GiIceCreamCone, GiNoodles, GiBeerBottle, GiMartini,
    GiCupcake, GiCroissant, GiSteak, GiChickenOven, GiBowlOfRice, 
    GiAvocado, GiCigarette, GiChocolateBar
} from 'react-icons/gi';
import { 
    FaBoxOpen, FaBoltLightning, FaBottleWater, FaFishFins, 
    FaWineGlass, FaWineBottle, FaChampagneGlasses, FaMugHot, 
    FaBowlFood, FaCarrot, FaLeaf, FaAppleWhole, FaBasketShopping, 
    FaStore, FaCheese, FaPills, FaPrescriptionBottleMedical, 
    FaPaw, FaDog, FaBone, FaSnowflake, FaFireFlameSimple, 
    FaDroplet, FaDrumstickBite, FaIceCream, FaBreadSlice, FaStar 
} from 'react-icons/fa6';

const renderCategoryIcon = (iconName, categoryName) => {
    if (iconName) {
        switch (iconName) {
            case 'Combo': return <FaBoxOpen size={18} />;
            case 'Star': return <FaStar size={18} />;
            case 'Hamburger': return <GiHamburger size={18} />;
            case 'Fries': return <GiFrenchFries size={18} />;
            case 'Pizza': return <GiPizzaSlice size={18} />;
            case 'HotDog': return <GiHotDog size={18} />;
            case 'Tacos': return <GiTacos size={18} />;
            case 'BowlFood': return <FaBowlFood size={18} />;
            case 'Steak': return <GiSteak size={18} />;
            case 'Meat': return <GiMeat size={18} />;
            case 'Chicken': return <GiChickenOven size={18} />;
            case 'Noodles': return <GiNoodles size={18} />;
            case 'Sushi': return <GiSushis size={18} />;
            case 'Fish': return <FaFishFins size={18} />;
            case 'Shrimp': return <GiShrimp size={18} />;
            case 'Beer': return <GiBeerBottle size={18} />;
            case 'Drink': return <GiMartini size={18} />;
            case 'WineGlass': return <FaWineGlass size={18} />;
            case 'Champagne': return <FaChampagneGlasses size={18} />;
            case 'Soda': return <GiSodaCan size={18} />;
            case 'Energy': return <FaBoltLightning size={18} />;
            case 'Water': return <FaBottleWater size={18} />;
            case 'Coffee': return <GiCoffeeCup size={18} />;
            case 'Acai': return <FaIceCream size={18} />;
            case 'IceCream': return <GiIceCreamCone size={18} />;
            case 'Cupcake': return <GiCupcake size={18} />;
            case 'Chocolate': return <GiChocolateBar size={18} />;
            case 'Bread': return <FaBreadSlice size={18} />;
            case 'Croissant': return <GiCroissant size={18} />;
            case 'Leaf': return <FaLeaf size={18} />;
            case 'Carrot': return <FaCarrot size={18} />;
            case 'Cheese': return <FaCheese size={18} />;
            case 'Basket': return <FaBasketShopping size={18} />;
            case 'Store': return <FaStore size={18} />;
            case 'Pills': return <FaPills size={18} />;
            case 'Paw': return <FaPaw size={18} />;
            case 'Bone': return <FaBone size={18} />;
            case 'Snowflake': return <FaSnowflake size={18} />;
            case 'Fire': return <FaFireFlameSimple size={18} />;
            case 'Cigarette': return <GiCigarette size={18} />;
            case 'List': return <List size={18} />;
            default: return <List size={18} />;
        }
    }

    const n = (categoryName || '').toLowerCase();
    if (n.includes('cerveja') || n.includes('chopp')) return <GiBeerBottle size={18}/>;
    if (n.includes('vinho') || n.includes('espumante')) return <FaWineGlass size={18}/>;
    if (n.includes('destilado') || n.includes('vodka') || n.includes('gin')) return <GiMartini size={18}/>;
    if (n.includes('energético') || n.includes('energetico')) return <FaBoltLightning size={18}/>;
    if (n.includes('sem álcool') || n.includes('água') || n.includes('suco')) return <FaBottleWater size={18}/>;
    if (n.includes('combo') || n.includes('kit')) return <FaBoxOpen size={18}/>;
    if (n.includes('fritas') || n.includes('porções') || n.includes('porcoes')) return <GiFrenchFries size={18}/>;
    if (n.includes('hamburguer') || n.includes('lanche') || n.includes('burger')) return <GiHamburger size={18}/>;
    if (n.includes('pizza')) return <GiPizzaSlice size={18}/>;
    if (n.includes('camarão') || n.includes('camarao') || n.includes('frutos')) return <GiShrimp size={18}/>;
    if (n.includes('peixe')) return <FaFishFins size={18}/>;
    if (n.includes('sushi') || n.includes('oriental')) return <GiSushis size={18}/>;
    if (n.includes('marmita') || n.includes('prato') || n.includes('refeição')) return <FaBowlFood size={18}/>;
    if (n.includes('carne') || n.includes('açougue')) return <GiMeat size={18}/>;
    if (n.includes('espeto') || n.includes('churrasco')) return <GiSteak size={18}/>;
    if (n.includes('doce') || n.includes('sobremesa') || n.includes('bolo')) return <GiCupcake size={18}/>;
    if (n.includes('açaí') || n.includes('acai')) return <FaIceCream size={18}/>;
    if (n.includes('sorvete')) return <GiIceCreamCone size={18}/>;
    if (n.includes('padaria') || n.includes('pão')) return <FaBreadSlice size={18}/>;
    if (n.includes('farmácia') || n.includes('drogaria')) return <FaPills size={18}/>;
    if (n.includes('pet') || n.includes('ração') || n.includes('cachorro')) return <FaPaw size={18}/>;
    if (n.includes('gelo')) return <FaSnowflake size={18}/>;
    if (n.includes('gás') || n.includes('gas') || n.includes('carvão')) return <FaFireFlameSimple size={18}/>;
    if (n.includes('tabaca') || n.includes('vape') || n.includes('cigarro')) return <GiCigarette size={18}/>;

    return <List size={18}/>;
};

const getPriceWithQuantityDiscount = (product, quantity) => {
    // 1. Define o preço base: Se tem promocional usa ele, senão usa o normal.
    const basePrice = Number(product.promotionalPrice) > 0 ? Number(product.promotionalPrice) : Number(product.price);
    
    if (!product.quantityDiscounts || product.quantityDiscounts.length === 0) {
        return basePrice; 
    }
    
    const applicableDiscount = product.quantityDiscounts
        .filter(qd => quantity >= qd.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0]; 
        
    if (applicableDiscount) {
        let discountedPrice = basePrice; 
        if (applicableDiscount.type === 'percentage') {
            discountedPrice = basePrice * (1 - applicableDiscount.value / 100);
        } else if (applicableDiscount.type === 'fixed') { 
            discountedPrice = basePrice - applicableDiscount.value;
        }
        return discountedPrice > 0 ? discountedPrice : 0; 
    }
    return basePrice; 
};

// --- FÓRMULA DE HAVERSINE (CALCULA DISTÂNCIA EM LINHA RETA) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Raio da Terra em KM
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distância em KM
};

export default function Home() {
  const { productSlug } = useParams();
  const navigate = useNavigate();

  const generateSlug = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
  };
  
  const storeId = (window.location.hostname.includes('github') || window.location.hostname.includes('localhost')) ? (import.meta.env.VITE_LOJA_LOCAL || 'csi') : getStoreIdFromHostname();
  
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const[selectedOptions, setSelectedOptions] = useState({}); 
  const [itemObservation, setItemObservation] = useState(''); 
  const [selectedVariation, setSelectedVariation] = useState(''); // NOVO: Estado da Variação

  const handleOpenProduct = (p) => {
      setSelectedProduct(p);
      setSelectedOptions({});
      setItemObservation('');
      setSelectedVariation(''); // Reseta a variação sempre que abrir um item novo
      const slug = generateSlug(p.name);
      navigate(`/p/${slug}`, { replace: true });
  };

  // --- FUNÇÕES DA ÁREA VIP E MISSÕES ---
  const submitInternalReview = async () => {
      if (!pendingReviewOrder) return;
      try {
          // Grava a missão de avaliação (Vai para o Painel Admin aprovar)
          await addDoc(collection(db, "loyalty_missions"), {
              storeId,
              customerPhone: customer.phone || '',
              customerName: customer.name || 'Cliente',
              missionType: 'internal_review',
              orderId: pendingReviewOrder.id,
              productName: pendingReviewOrder.items?.[0]?.name || 'Pedido Completo',
              rating: reviewRating,
              comment: 'Avaliação via Clube VIP',
              pointsExpected: 10,
              status: 'pending',
              createdAt: serverTimestamp()
          });

          // Bloqueia reavaliação deste pedido
          await updateDoc(doc(db, "orders", pendingReviewOrder.id), { hasBeenReviewed: true });

          alert("✅ Avaliação enviada! Seus 10 Pontos estão aguardando aprovação da loja.");
          setShowReviewPopup(false);
          setPendingReviewOrder(null);
      } catch(e) {
          console.error("ERRO AO ENVIAR AVALIAÇÃO VIP:", e);
          alert(`Erro ao enviar avaliação: ${e.message}`);
      }
  };

  const submitMissionProof = async () => {
      if (!proofFile) return alert("Selecione a imagem do print/comprovante!");
      setUploadingProof(true);
      try {
          const formData = new FormData();
          formData.append('file', proofFile);
          formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
          const uploadData = await res.json();
          
          await addDoc(collection(db, "loyalty_missions"), {
              storeId,
              customerPhone: customer.phone,
              customerName: customer.name || "Cliente VIP",
              missionType: missionModal.type,
              pointsExpected: missionModal.points,
              proofUrl: uploadData.secure_url,
              status: 'pending',
              createdAt: serverTimestamp()
          });
          
          alert("✅ Comprovante enviado com sucesso! Seus pontos estão pendentes e serão creditados assim que a loja aprovar.");
          setMissionModal({ isOpen: false, type: '', title: '', points: 0 });
          setProofFile(null);
      } catch (e) {
          alert("Erro ao enviar comprovante. Tente novamente.");
      } finally {
          setUploadingProof(false);
      }
  };

  const handleOptionToggle = (group, option) => {
      setSelectedOptions(prev => {
          const currentGroupSelections = prev[group.id] ||[];
          const isSelected = currentGroupSelections.some(o => o.name === option.name);

          if (isSelected) {
              return { ...prev, [group.id]: currentGroupSelections.filter(o => o.name !== option.name) };
          } else {
              if (group.maxSelections === 1) {
                  return { ...prev,[group.id]: [option] }; 
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
      // Pega o promocional se houver, senão o normal
      let total = Number(selectedProduct.promotionalPrice) > 0 ? Number(selectedProduct.promotionalPrice) : Number(selectedProduct.price);
      Object.values(selectedOptions).forEach(optionArray => {
          optionArray.forEach(opt => { total += Number(opt.price || 0); });
      });
      return total;
  };

  const handleAddCustomToCart = () => {
      // TRAVA DA VARIAÇÃO SIMPLES
      if (selectedProduct.variations && selectedProduct.variations.length > 0 && !selectedVariation) {
          alert("Por favor, escolha uma opção obrigatória antes de adicionar ao carrinho.");
          return;
      }

      if (selectedProduct.complements) {
          for (const group of selectedProduct.complements) {
              if (group.isRequired) {
                  const selectedCount = (selectedOptions[group.id] ||[]).length;
                  if (selectedCount === 0) {
                      alert(`Por favor, selecione uma opção em: ${group.name}`);
                      return;
                  }
              }
          }
      }
      
      const customId = `${selectedProduct.id}-${btoa(JSON.stringify(selectedOptions))}-${selectedVariation}`;
      const optionsText = Object.values(selectedOptions).flat().map(o => o.name).join(', ');
      
      // Concatena a Variação Simples + Nome + Complementos
      let cartName = selectedProduct.name;
      if (selectedVariation) cartName += ` - Sabor/Tipo: ${selectedVariation}`;
      if (optionsText) cartName += ` (${optionsText})`;
      const itemToAdd = {
          ...selectedProduct,
          cartItemId: customId,
          name: cartName,
          observation: itemObservation,
          price: calculateModalTotal() 
      };
      addToCart(itemToAdd, 1);
      setSelectedProduct(null); 
      navigate('/', { replace: true });
  };

  const [products, setProducts] = useState([]);
  const[categories, setCategories] = useState([]);
  
  // 1. CARREGA O CARRINHO SALVO NO NAVEGADOR E IMPEDE QUE ESVAZIE
  const [cart, setCart] = useState(() => {
      const saved = localStorage.getItem(`veloCart_${storeId}`);
      return saved ? JSON.parse(saved) :[];
  });

  // 2. SALVA O CARRINHO AUTOMATICAMENTE SEMPRE QUE UM ITEM É ADICIONADO/REMOVIDO
  useEffect(() => {
      localStorage.setItem(`veloCart_${storeId}`, JSON.stringify(cart));
  }, [cart, storeId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); 
  const [showCheckout, setShowCheckout] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [customer, setCustomer] = useState({
    name: '', email: '', cep: '', street: '', number: '', neighborhood: '', phone: '', payment: 'pix', changeFor: ''
  });
  const[showLastOrders, setShowLastOrders] = useState(false);
  const[lastOrders, setLastOrders] = useState([]);

  // --- ESTADOS MODO GARÇOM ---
  const [isWaiterMode, setIsWaiterMode] = useState(false);
  const [showWaiterLogin, setShowWaiterLogin] = useState(false);
  const[waiterPin, setWaiterPin] = useState('');
  const [waiterName, setWaiterName] = useState('');
  const[tableNumber, setTableNumber] = useState('');

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const[couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const[discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const savedCustomer = localStorage.getItem('veloCustomerData');
    if (savedCustomer) {
      // O "prev =>" garante que o método de pagamento padrão não seja apagado pela memória
      setCustomer(prev => ({ ...prev, ...JSON.parse(savedCustomer) }));
    } else {
      const savedPhone = localStorage.getItem('customerPhone');
      if (savedPhone) setCustomer(prev => ({ ...prev, phone: savedPhone }));
    }
  },[]);

  const handleCustomerChange = (field, value) => {
    const updatedCustomer = { ...customer,[field]: value };
    setCustomer(updatedCustomer);
    const { payment, changeFor, ...dataToSave } = updatedCustomer;
    localStorage.setItem('veloCustomerData', JSON.stringify(dataToSave));
    if (field === 'phone') localStorage.setItem('customerPhone', value);
  };
// --- SISTEMA DE CARRINHO ABANDONADO (SALVA SILENCIOSAMENTE) ---
  useEffect(() => {
      const phoneStr = customer?.phone?.replace(/\D/g, '') || '';
      
      // Gera um ID de visitante temporário se o cliente ainda não digitou o telefone
      let visitorId = localStorage.getItem('veloVisitorId');
      if (!visitorId) {
          visitorId = Math.random().toString(36).substring(2, 15);
          localStorage.setItem('veloVisitorId', visitorId);
      }

      // Salva assim que adicionar 1 item no carrinho OU se digitar o WhatsApp
      if (cart.length > 0 || phoneStr.length >= 10) {
          const saveAbandonedCart = async () => {
              try {
                  // Usa o telefone como ID (se existir), senão usa o ID do visitante
                  const cartId = phoneStr.length >= 10 ? `cart_${storeId}_${phoneStr}` : `cart_${storeId}_${visitorId}`;
                  
                  await setDoc(doc(db, "abandoned_carts", cartId), {
                      storeId: storeId,
                      customerName: customer?.name || "Visitante (Sem nome)",
                      customerPhone: customer?.phone || "",
                      items: cart,
                      subtotal: cart.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.quantity || 0)), 0),
                      lastUpdated: serverTimestamp(),
                      status: 'abandoned'
                  }, { merge: true }); // merge: true atualiza sem apagar os dados existentes
              } catch (e) { console.error("Erro ao salvar carrinho abandonado:", e); }
          };
          // Espera 2 segundos sem digitar para não sobrecarregar o banco
          const timeout = setTimeout(saveAbandonedCart, 2000);
          return () => clearTimeout(timeout);
      }
  }, [cart, customer.phone, customer.name, storeId]);
     
  const[marketingSettings, setMarketingSettings] = useState({
        promoActive: false,
        promoBannerUrls:[]
  });
  const[showExitModal, setShowExitModal] = useState(false);

  // --- ESTADOS DA ÁREA VIP E GAMIFICAÇÃO ---
  const[showVipArea, setShowVipArea] = useState(false);
  const[showReviewPopup, setShowReviewPopup] = useState(false);
  const [pendingReviewOrder, setPendingReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  
  const[missionModal, setMissionModal] = useState({ isOpen: false, type: '', title: '', points: 0 });
  const [proofFile, setProofFile] = useState(null);
  const[uploadingProof, setUploadingProof] = useState(false);

  // --- ESTADOS DA ROLETA PÓS-CHECKOUT (GAMIFICAÇÃO) ---
  const [showRoulette, setShowRoulette] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [pendingRedirect, setPendingRedirect] = useState(null);
 const [rouletteRotation, setRouletteRotation] = useState(0); // Controla a rotação visual
  
  // Memoiza os prêmios direto do banco, ou usa um fallback visual de 6 fatias.
  const dynamicRouletteSlices = React.useMemo(() => {
      if (marketingSettings?.rouletteConfig?.slices && marketingSettings.rouletteConfig.slices.length > 0) {
          return marketingSettings.rouletteConfig.slices;
      }
      return [
          { id: '1', label: '10% OFF', type: 'discount_percent', value: 10, probability: 10, stock: 50, color: '#ef4444' },
          { id: '2', label: 'R$ 5 Cashback', type: 'cashback', value: 5, probability: 15, stock: 100, color: '#f59e0b' },
          { id: '3', label: 'Nada 😭', type: 'empty', value: 0, probability: 25, stock: 9999, color: '#10b981' },
          { id: '4', label: '5% OFF', type: 'discount_percent', value: 5, probability: 15, stock: 100, color: '#3b82f6' },
          { id: '5', label: 'R$ 2 Cashback', type: 'cashback', value: 2, probability: 10, stock: 100, color: '#8b5cf6' },
          { id: '6', label: 'Tente na Próxima', type: 'empty', value: 0, probability: 25, stock: 9999, color: '#ec4899' }
      ];
  }, [marketingSettings?.rouletteConfig]);

  // --- NOVOS ESTADOS GAMIFICAÇÃO (Cashback, Tiers, Badges) ---
  const [useCashback, setUseCashback] = useState(false);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [userTier, setUserTier] = useState({ name: 'Visitante', next: 'Bronze', missing: 0, progress: 0, color: 'text-slate-400' });
  const [userBadges, setUserBadges] = useState([]);

  // CAPTURA DO LINK DE INDICAÇÃO NO LOAD INICIAL
  useEffect(() => {
      const refParam = new URLSearchParams(window.location.search).get('ref');
      if (refParam) {
          localStorage.setItem('veloReferredBy', refParam);
      }
  }, []);

  // --- LEITURA REAL DA CARTEIRA (WALLET) NO BANCO DE DADOS ---
  useEffect(() => {
      if (marketingSettings?.gamification?.cashback) {
          const phone = customer.phone || localStorage.getItem('customerPhone');
          if (phone && phone.length >= 10) {
              const cleanPhone = phone.replace(/\D/g, '');
              const walletRef = doc(db, "wallets", `${storeId}_${cleanPhone}`);
              
              const unsubWallet = onSnapshot(walletRef, (docSnap) => {
                  if (docSnap.exists()) {
                      setCashbackBalance(docSnap.data().balance || 0);
                  } else {
                      setCashbackBalance(0);
                  }
              });
              return () => unsubWallet();
          }
      }
  }, [marketingSettings?.gamification?.cashback, storeId, customer.phone]);

  const spinRoulette = async () => {
      if (isSpinning) return;
      setIsSpinning(true);
      setRouletteResult(null);

      const slices = dynamicRouletteSlices;
      
      // Lógica de Random Ponderado (Weighted Random)
      let rand = Math.random() * 100;
      let cumulative = 0;
      let winningIndex = 0;
      
      for (let i = 0; i < slices.length; i++) {
          cumulative += Number(slices[i].probability);
          // Se caiu na chance E tem estoque, ele ganha.
          if (rand <= cumulative && Number(slices[i].stock) > 0) {
              winningIndex = i;
              break;
          }
      }
      
      // Fallback: Se por algum motivo o sorteado não tem estoque, acha o primeiro 'empty'
      if (Number(slices[winningIndex].stock) <= 0) {
          winningIndex = slices.findIndex(s => s.type === 'empty') || 0;
      }

      const winningSlice = slices[winningIndex];

      // Cálculo Visual Matemático Perfeito
      // Cada fatia ocupa (360 / numero de fatias) graus.
      const degreesPerSlice = 360 / slices.length;
      // Para o topo apontar exatamente para o meio da fatia vencedora, calculamos o deslocamento
      const baseRotation = 3600; // 10 voltas completas para emoção
      // A fórmula ajusta o ângulo para parar perfeitamente com a seta (topo) apontando pro meio do índice
      const targetRotation = baseRotation + (360 - (winningIndex * degreesPerSlice)); 
      
      setRouletteRotation(targetRotation);

      // Espera a animação visual da roleta terminar (3s configurados no CSS)
      setTimeout(async () => {
          setRouletteResult(winningSlice.label);
          setIsSpinning(false);
          
          try {
              const cleanPhone = customer.phone.replace(/\D/g, '');
              
              if (winningSlice.type !== 'empty' && cleanPhone) {
                  // 1. Desconta 1 do estoque global da fatia vencedora
                  const updatedSlices = [...slices];
                  updatedSlices[winningIndex].stock -= 1;
                  await setDoc(doc(db, "settings", storeId), { rouletteConfig: { slices: updatedSlices } }, { merge: true });

                  // 2. Credita o prêmio ao usuário
                  if (winningSlice.type === 'cashback') {
                      const walletRef = doc(db, "wallets", `${storeId}_${cleanPhone}`);
                      await setDoc(walletRef, { balance: increment(winningSlice.value) }, { merge: true });
                  } 
                  else if (winningSlice.type.includes('discount')) {
                      // Cria um cupom de uso único para este cliente
                      const uniqueCode = `VIP${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                      await addDoc(collection(db, "coupons"), {
                          storeId: storeId,
                          code: uniqueCode,
                          type: winningSlice.type === 'discount_percent' ? 'percentage' : 'fixed_amount',
                          value: winningSlice.value,
                          minimumOrderValue: 0,
                          usageLimit: 1,
                          userUsageLimit: 1,
                          firstPurchaseOnly: false,
                          active: true,
                          assignedTo: cleanPhone // Exclusivo dele
                      });
                      setRouletteResult(`Cupom Gerado: ${uniqueCode} (${winningSlice.label})`);
                  }
              }
          } catch (e) {
              console.error("Erro ao salvar prêmio da roleta:", e);
          }
      }, 3000);
  };

  const closeRouletteAndRedirect = () => {
      setShowRoulette(false);
      if (pendingRedirect) {
          window.open(pendingRedirect.url, '_blank');
          navigate(pendingRedirect.track);
      }
  };

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
  },[showLastOrders, storeId]);

  const repeatOrder = (order) => {
    order.items.forEach(item => {
      addToCart({...item, id: item.id}, item.quantity); 
    });
    setShowLastOrders(false);
  };
  
  const [isCepLoading, setIsCepLoading] = useState(false);
  const[cepError, setCepError] = useState('');

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

  const[loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    if (marketingSettings?.loyaltyActive) {
      const phone = localStorage.getItem('customerPhone');
      if (phone) {
        // 1. Calcula Pontos das Compras
        const qOrders = query(collection(db, "orders"), where("storeId", "==", storeId), where("customerPhone", "==", phone), where("status", "==", "completed"));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
          const totalSpent = snapshot.docs.reduce((acc, doc) => acc + Number(doc.data().total || 0), 0);
          const basePoints = Math.floor(totalSpent * (marketingSettings.pointsPerReal || 1));
          
          // 2. Calcula Pontos das Missões (Bônus)
          const qMissions = query(collection(db, "loyalty_missions"), where("storeId", "==", storeId), where("customerPhone", "==", phone), where("status", "==", "approved"));
          getDocs(qMissions).then((missionSnap) => {
              const bonusPoints = missionSnap.docs.reduce((acc, doc) => acc + Number(doc.data().pointsAwarded || 0), 0);
              setLoyaltyPoints(basePoints + bonusPoints);
          });
          
          // --- GAMIFICAÇÃO: NÍVEIS VIP (TIERS) ---
          if (marketingSettings?.gamification?.tiers) {
              let tier = { name: 'Bronze', next: 'Prata', missing: 200 - totalSpent, progress: (totalSpent/200)*100, color: 'text-amber-600', bg: 'bg-amber-100' };
              if (totalSpent >= 200 && totalSpent < 1000) tier = { name: 'Prata', next: 'Ouro', missing: 1000 - totalSpent, progress: ((totalSpent-200)/800)*100, color: 'text-slate-400', bg: 'bg-slate-200' };
              if (totalSpent >= 1000 && totalSpent < 3000) tier = { name: 'Ouro', next: 'Diamante', missing: 3000 - totalSpent, progress: ((totalSpent-1000)/2000)*100, color: 'text-yellow-500', bg: 'bg-yellow-100' };
              if (totalSpent >= 3000) tier = { name: 'Diamante 💎', next: 'Máximo', missing: 0, progress: 100, color: 'text-cyan-500', bg: 'bg-cyan-100' };
              setUserTier(tier);
          }

          // --- GAMIFICAÇÃO: SELOS DE CONQUISTA (BADGES) ---
          if (marketingSettings?.gamification?.badges) {
              const badges = [];
              const ordersList = snapshot.docs.map(d => d.data());
              if (ordersList.length >= 1) badges.push({ icon: '🎉', name: 'Primeira Compra' });
              if (ordersList.length >= 5) badges.push({ icon: '🏆', name: 'Fiel (5+)' });
              
              const hasNightOrder = ordersList.some(o => {
                  if(!o.createdAt) return false;
                  const h = o.createdAt.toDate().getHours();
                  return h >= 22 || h <= 4;
              });
              if (hasNightOrder) badges.push({ icon: '🦉', name: 'Coruja' });
              setUserBadges(badges);
          }

          // A leitura do Cashback Real agora é feita em um useEffect independente abaixo.

          // 3. Gatilho da Avaliação Interna (Acha o último não avaliado)
          const unreviewed = snapshot.docs.find(doc => !doc.data().hasBeenReviewed);
          if (unreviewed && !sessionStorage.getItem(`review_skipped_${unreviewed.id}`)) {
              setPendingReviewOrder({ id: unreviewed.id, ...unreviewed.data() });
              setShowReviewPopup(true);
          }
        });
        return () => unsubOrders();
      }
    }
  }, [marketingSettings, storeId]);
    
  const[isStoreOpenNow, setIsStoreOpenNow] = useState(true);
  const [storeMessage, setStoreMessage] = useState('Verificando...');

  const [generalBanners, setGeneralBanners] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const[bestsellingProducts, setBestsellingProducts] = useState([]);

  const [shippingRates, setShippingRates] = useState([]);
  const[shippingFee, setShippingFee] = useState(null);
  const [deliveryAreaMessage, setDeliveryAreaMessage] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);

  const[deferredPrompt, setDeferredPrompt] = useState(null);
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
  },[]);

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
  },[]);

  const handleInstallClick = async () => {
      if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
          setShowInstallPrompt(false);
      }
  };

  const handleDismissiOSInstallMessage = () => {
      setShowiOSInstallMessage(false);
      localStorage.setItem('dismissediOSInstallPrompt', 'true');
  };

  // --- INÍCIO: SISTEMA INTEGRADO DE PIXELS E ANALYTICS ---
  useEffect(() => {
      const integrations = marketingSettings?.integrations;

      // 1. Google Tag Manager (GTM)
      if (integrations?.gtm?.containerId && !document.getElementById('gtm-script')) {
          const script = document.createElement('script');
          script.id = 'gtm-script';
          script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= 'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); })(window,document,'script','dataLayer','${integrations.gtm.containerId}');`;
          document.head.appendChild(script);
      }

      // 2. Meta Pixel (Facebook)
      if (integrations?.meta?.pixelId && !document.getElementById('meta-pixel-script')) {
          const script = document.createElement('script');
          script.id = 'meta-pixel-script';
          script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${integrations.meta.pixelId}'); fbq('track', 'PageView');`;
          document.head.appendChild(script);
      }

      // 3. Google Analytics 4 (GA4) e Google Ads
      const ga4Id = integrations?.ga4?.measurementId || storeSettings?.gaTrackingId; 
      const gadsId = integrations?.gads?.conversionId;

      if ((ga4Id || gadsId) && !document.getElementById('google-gtag-script')) {
          const script = document.createElement('script');
          script.id = 'google-gtag-script';
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id || gadsId}`;
          document.head.appendChild(script);

          const script2 = document.createElement('script');
          script2.id = 'google-gtag-config';
          let configHtml = `window.dataLayer = window.dataLayer ||[]; function gtag(){dataLayer.push(arguments);} gtag('js', new Date());`;
          if (ga4Id) configHtml += ` gtag('config', '${ga4Id}');`;
          if (gadsId) configHtml += ` gtag('config', '${gadsId}');`;
          script2.innerHTML = configHtml;
          document.head.appendChild(script2);
      }

      // 4. Contador Nativo Velo (Para o Painel Admin)
      const registrarVisitaNativa = async () => {
          if (!storeId || storeId === 'csi') return;
          const hoje = new Date().toISOString().split('T')[0];
          const visitaRef = doc(db, "stores", storeId, "analytics", hoje);
          const sessionKey = `visit_${storeId}_${hoje}`;
          if (!sessionStorage.getItem(sessionKey)) {
              try {
                  const snap = await getDoc(visitaRef);
                  if (snap.exists()) {
                      await updateDoc(visitaRef, { pageViews: increment(1) });
                  } else {
                      await setDoc(visitaRef, { pageViews: 1, date: hoje });
                  }
                  sessionStorage.setItem(sessionKey, 'true');
              } catch (e) { console.error("Erro Analytics Velo:", e); }
          }
      };

      registrarVisitaNativa();
  },[marketingSettings?.integrations, storeSettings?.gaTrackingId, storeId]);
  // --- FIM: SISTEMA INTEGRADO DE PIXELS E ANALYTICS ---

  // --- INICIA A BUSCA DE DADOS DO BANCO ---
  useEffect(() => {
    const savedOrderId = localStorage.getItem('activeOrderId');
    if (savedOrderId) setActiveOrderId(savedOrderId);

    const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => {
        const fetchedProducts = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(fetchedProducts);
        setFeaturedProducts(fetchedProducts.filter(p => p.isFeatured && ((p.stock && parseInt(p.stock) > 0) || !p.stock)));
        setBestsellingProducts(fetchedProducts.filter(p => p.isBestSeller && ((p.stock && parseInt(p.stock) > 0) || !p.stock)));
    });

    const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))));

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
            const currentTime = now.getHours() * 60 + now.getMinutes(); // Hora atual em minutos do dia
            
            // 1. Pega a configuração de HOJE e de ONTEM
            const todayDayId = now.getDay();
            const yesterdayDayId = todayDayId === 0 ? 6 : todayDayId - 1; // Se hoje for domingo (0), ontem foi sábado (6)

            const todayConfig = data.schedule[todayDayId];
            const yesterdayConfig = data.schedule[yesterdayDayId];

            let isOpenToday = false;
            let isOpenFromYesterday = false;

            // 2. VERIFICA O TURNO DE HOJE (Ex: 09:00 às 23:59 ou 18:00 às 04:00 de amanhã)
            if (todayConfig && todayConfig.open) {
                const [openHourToday, openMinuteToday] = (todayConfig.start || '00:00').split(':').map(Number);
                const [closeHourToday, closeMinuteToday] = (todayConfig.end || '23:59').split(':').map(Number);
                
                const openTimeToday = openHourToday * 60 + openMinuteToday;
                const closeTimeToday = closeHourToday * 60 + closeMinuteToday;

                // Lógica de hoje: Se fechar *antes* de abrir, significa que vira a noite.
                if (closeTimeToday <= openTimeToday) {
                    // OVERNIGHT: Para a loja estar aberta HOJE com o turno de HOJE, basta a hora atual ser maior que a hora de abertura.
                    // (Ex: Abriu 18:00 e vai até 04:00 amanhã. Agora são 21h. 21h >= 18h).
                    if (currentTime >= openTimeToday) {
                        isOpenToday = true;
                    }
                } else {
                    // TURNO NORMAL: Abre e fecha no mesmo dia (Ex: 08:00 às 22:00)
                    if (currentTime >= openTimeToday && currentTime < closeTimeToday) {
                        isOpenToday = true;
                    }
                }
            }

            // 3. VERIFICA A MADRUGADA DO TURNO DE ONTEM (A Mágica acontece aqui)
            // Precisamos saber se ontem teve um turno que invadiu a madrugada de hoje.
            if (yesterdayConfig && yesterdayConfig.open) {
                const [openHourYest, openMinuteYest] = (yesterdayConfig.start || '00:00').split(':').map(Number);
                const [closeHourYest, closeMinuteYest] = (yesterdayConfig.end || '23:59').split(':').map(Number);
                
                const openTimeYest = openHourYest * 60 + openMinuteYest;
                const closeTimeYest = closeHourYest * 60 + closeMinuteYest;

                // Se ontem era um turno overnight (ex: abriu 18h de sábado e vai até as 04h de domingo)
                if (closeTimeYest <= openTimeYest) {
                    // Para a loja estar aberta devido ao turno de ontem, a hora de HOJE (domingo na madrugada) 
                    // tem que ser MENOR que a hora de fechamento (04h). (Ex: Agora é 02:00. 02:00 < 04:00)
                    if (currentTime < closeTimeYest) {
                        isOpenFromYesterday = true;
                    }
                }
            }

            // A loja está aberta se o turno de hoje a abrir, ou se a madrugada do turno de ontem a manter aberta.
            finalStatus = isOpenToday || isOpenFromYesterday;

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
  },[storeId]);

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
          "icons":[
            { "src": logoUrl, "sizes": "192x192", "type": "image/png", "purpose": "any" },
            { "src": logoUrl, "sizes": "512x512", "type": "image/png", "purpose": "any" }
          ]
        };
        const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);
        manifestTag.setAttribute('href', manifestURL);
      }
    }
  },[storeSettings.storeLogoUrl, storeSettings.name]); 

  useEffect(() => {
    const cep = customer.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setCepError(''); return; }

    const fetchDeliveryInfo = async () => {
      setIsCepLoading(true); setCepError(''); setShippingFee(null); setDeliveryAreaMessage('');
      
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) throw new Error("CEP não encontrado.");
        
        setCustomer(c => ({...c, street: data.logradouro, neighborhood: data.bairro}));
        
        const storeLat = storeSettings?.lat;
        const storeLng = storeSettings?.lng;
        const zones = storeSettings?.delivery_zones ||[];
        const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        let distanceCalculated = false;

        if (storeLat && storeLng && zones.length > 0 && GOOGLE_API_KEY) {
            try {
                const addressString = encodeURIComponent(`${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`);
                const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${addressString}&key=${GOOGLE_API_KEY}`);
                const geoData = await geoRes.json();

                if (geoData.status === "OK" && geoData.results[0]) {
                    const customerLat = geoData.results[0].geometry.location.lat;
                    const customerLng = geoData.results[0].geometry.location.lng;

                    const distanceKm = calculateDistance(storeLat, storeLng, customerLat, customerLng);
                    
                    if (distanceKm !== null) {
                        distanceCalculated = true;
                        const matchedZone = [...zones]
                            .sort((a, b) => a.radius_km - b.radius_km)
                            .find(z => distanceKm <= z.radius_km);

                        if (matchedZone) {
                            setShippingFee(Number(matchedZone.fee));
                            setDeliveryAreaMessage(`Taxa de Entrega: R$ ${Number(matchedZone.fee).toFixed(2)}`);
                            return; 
                        } else {
                            throw new Error("Distância fora da área máxima de cobertura por KM.");
                        }
                    }
                } else {
                    console.error("ERRO GOOGLE MAPS API:", geoData.status, geoData.error_message);
                    if (geoData.status === "REQUEST_DENIED") {
                        alert("⚠️ AVISO PARA O LOJISTA: O frete falhou porque a 'Geocoding API' do Google não está ativada no seu Google Cloud Platform, ou a chave API está restrita.");
                    }
                }
            } catch (geoError) {
                console.warn("Falha no cálculo por KM, caindo para fallback (CEP).", geoError);
            }
        }

        const currentCepNum = parseInt(cep); 
        const foundRate = shippingRates.find(rate => {
            // 1. BLINDAGEM DE FAIXA DE CEP (Preenche zeros e ignora traços)
            if (rate.cepStart && rate.cepEnd) {
                let startStr = String(rate.cepStart).replace(/\D/g, '');
                let endStr = String(rate.cepEnd).replace(/\D/g, '');
                
                if (startStr && endStr) {
                    startStr = startStr.padEnd(8, '0'); // vira 88100000 se o lojista botou só 88100
                    endStr = endStr.padEnd(8, '9');     // vira 88100999
                    
                    const start = parseInt(startStr);
                    const end = parseInt(endStr);
                    if (currentCepNum >= start && currentCepNum <= end) return true;
                }
            }
            
            // 2. BLINDAGEM DE NOME DE BAIRRO E CIDADE (Ignora acentos e maiúsculas/minúsculas)
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
          setShippingFee(Number(foundRate.fee));
          setDeliveryAreaMessage(`Entrega para ${foundRate.neighborhood}: R$ ${Number(foundRate.fee).toFixed(2)}`);
        } else {
          setShippingFee(null); 
          setDeliveryAreaMessage("Fora da área de entrega."); 
          setCepError(distanceCalculated ? "Fora da área de cobertura por KM e sem taxa fixa." : "Região não atendida.");
        }

      } catch (error) { 
          setCepError(error.message); 
          setCustomer(c => ({ ...c, street: '', neighborhood: '' })); 
      } finally { 
          setIsCepLoading(false); 
      }
    };

    const handler = setTimeout(() => fetchDeliveryInfo(), 600);
    return () => clearTimeout(handler);
  },[customer.cep, shippingRates, storeSettings]);

  const addToCart = (p, quantity = 1) => {
    if (!isStoreOpenNow) { alert(storeMessage); return; }
    
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

      if (p.stock !== undefined && (newQuantity > Number(p.stock))) {
          alert(`⚠️ Desculpe, só temos ${p.stock} unidades de ${p.name} disponíveis no momento.`);
          return prev; 
      }
      
      // 1. PRIMEIRO: Calculamos o preço final (A CORREÇÃO ESTÁ AQUI)
      const finalPricePerUnit = getPriceWithQuantityDiscount(p, newQuantity);

      // 2. SEGUNDO: Disparamos os Pixels (Agora a variável finalPricePerUnit já existe!)
      if (window.fbq) { 
          window.fbq('track', 'AddToCart', { content_name: p.name, content_ids: [p.id], value: finalPricePerUnit, currency: 'BRL' }); 
      }
      if (window.gtag) { 
          window.gtag('event', 'add_to_cart', { currency: 'BRL', value: finalPricePerUnit, items:[{ item_id: p.id, item_name: p.name, price: finalPricePerUnit, quantity: quantity }] }); 
      }

      // 3. TERCEIRO: Atualizamos o carrinho
      if (existingItem) {
          return prev.map(i => i.id === p.id ? { ...i, quantity: newQuantity, price: finalPricePerUnit } : i);
      } else {
          return[...prev, { ...p, quantity: newQuantity, price: finalPricePerUnit }];
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
  // Zera o frete automaticamente se o Modo Garçom estiver ativo
  const finalShippingFee = (isFreeShipping || isWaiterMode) ? 0 : Number(shippingFee || 0);
  
  const baseTotal = Number(subtotal) + finalShippingFee - Number(discountAmount || 0);
  // Cálculo do Cashback dinâmico: Não pode abater mais do que o total do pedido.
  const cashbackDiscount = (marketingSettings?.gamification?.cashback && useCashback) ? Math.min(cashbackBalance, baseTotal) : 0;
  const finalTotal = baseTotal - cashbackDiscount;

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

    // Trava de segurança: Obriga o cliente a selecionar como vai pagar
    if (!customer.payment) {
        return alert("Por favor, selecione uma forma de pagamento para continuar.");
    }
    
    // Validação condicional: Garçom x Delivery Padrão
    if (isWaiterMode) {
        if (!customer.name || !tableNumber) return alert("Preencha o nome do cliente e o número da mesa.");
    } else {
        if (!customer.name || !customer.email || !customer.cep || !customer.street || !customer.number || !customer.phone) return alert("Preencha todos os dados, incluindo seu e-mail.");
        if (shippingFee === null) return alert("Frete não calculado.");
        if (!customer.payment) return alert("Por favor, selecione uma forma de pagamento para continuar.");
    }

   if (cart.length === 0) return alert("Carrinho vazio!");

    // Trava de Valor Mínimo de Pedido
    if (!isWaiterMode && storeSettings?.minOrderValue > 0) {
        if (subtotal < storeSettings.minOrderValue) {
            setIsFinalizing(false);
            return alert(`⚠️ O valor mínimo para pedidos é R$ ${storeSettings.minOrderValue.toFixed(2)}. Adicione mais itens ao carrinho.`);
        }
    }

  const hasOnlinePayments = storeSettings?.stripeConnectId || marketingSettings?.integrations?.mercadopago?.accessToken;
    if (!isWaiterMode && !hasOnlinePayments &&['pix', 'cartao'].includes(customer.payment)) {
        setIsFinalizing(false);
        return alert("Por favor, selecione uma das formas de pagamento disponíveis abaixo para a entrega.");
    }

    setIsFinalizing(true); 
    const fullAddress = `${customer.street}, ${customer.number} - ${customer.neighborhood}`;
    
    try {
      const sanitizedCart = cart.map(item => ({ ...item, observation: item.observation || "" }));
      const newOrderRef = doc(collection(db, "orders"));
      const orderId = newOrderRef.id;

      // No modo Garçom, força o envio direto e ignora a Stripe para não travar
      const isOfflinePayment = isWaiterMode ||['dinheiro', 'motoboy_card', 'offline_credit_card', 'offline_pix'].includes(customer.payment);

      const orderData = {
        customerName: customer.name || "", 
        customerAddress: isWaiterMode ? `Mesa ${tableNumber}` : (fullAddress || ""), 
        customerPhone: customer.phone || "",
        paymentMethod: customer.payment || "", 
        paymentStatus: isOfflinePayment ? 'pending_on_delivery' : 'pending',
        customerChangeFor: customer.payment === 'dinheiro' ? (customer.changeFor || "") : "",
        items: sanitizedCart,
        subtotal: subtotal || 0, 
        shippingFee: isWaiterMode ? 0 : (shippingFee || 0), 
        total: finalTotal || 0, 
        status: 'pending', 
        createdAt: serverTimestamp(),
        storeId: storeId || "",
        // Adicionando as TAGs para o Modo Garçom:
        tipo: isWaiterMode ? "local" : "delivery",
        mesa: isWaiterMode ? tableNumber : null,
        waiterName: isWaiterMode ? waiterName : null,
        // Gamificação Info:
        usedCashback: cashbackDiscount > 0 ? cashbackDiscount : 0,
        referredBy: localStorage.getItem('veloReferredBy') || null
      };

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code || "";
        orderData.discountAmount = discountAmount || 0;
      }
if (window.fbq) { 
          window.fbq('track', 'Purchase', { value: finalTotal, currency: 'BRL' }); 
      }
      if (window.gtag) { 
          window.gtag('event', 'purchase', { 
              transaction_id: orderId, 
              value: finalTotal, 
              currency: 'BRL', 
              items: sanitizedCart.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })) 
          }); 
          
          // Se tiver o rótulo de conversão específico do Google Ads (ex: AW-XXX/AbCDefg...)
          const gadsLabel = marketingSettings?.integrations?.gads?.conversionLabel;
          const gadsId = marketingSettings?.integrations?.gads?.conversionId;
          if (gadsLabel && gadsId) {
              window.gtag('event', 'conversion', { 
                  'send_to': `${gadsId}/${gadsLabel}`, 
                  'value': finalTotal, 
                  'currency': 'BRL', 
                  'transaction_id': orderId 
              });
          }
      }
      if (isOfflinePayment) {
          await setDoc(newOrderRef, orderData);

          // --- GAMIFICAÇÃO: ABATER SALDO REAL DA CARTEIRA ---
          if (cashbackDiscount > 0) {
              const cleanPhone = customer.phone.replace(/\D/g, '');
              try { await updateDoc(doc(db, "wallets", `${storeId}_${cleanPhone}`), { balance: increment(-cashbackDiscount) }); } catch(e){}
          }
          // --------------------------------------------------

          // O Cliente fechou a compra! Removemos dos abandonados
          try { await deleteDoc(doc(db, "abandoned_carts", `cart_${storeId}_${customer.phone.replace(/\D/g, '')}`)); } catch(e){}
          
          if (appliedCoupon) {
            await updateDoc(doc(db, "coupons", appliedCoupon.id), { currentUsage: (appliedCoupon.currentUsage || 0) + 1 });
          }

          const itemsList = cart.map(i => {
                let text = `🔸 ${i.quantity}x *${i.name}* - R$ ${(i.price * i.quantity).toFixed(2)}`;
                if (i.observation) text += `\n      _Obs: ${i.observation}_`;
                return text;
            }).join('\n');
          const totalMsg = `*Total: R$ ${finalTotal.toFixed(2)}*`;
          const enderecoMsg = isWaiterMode ? `\n🍽️ *Mesa:* ${tableNumber}` : `\n📍 *Endereço:* ${fullAddress}`;
          
         let obsMsg = '';
          if (isWaiterMode) {
              obsMsg = `\n💳 *Pagamento:* A combinar no Caixa / Salão`;
          } else if (customer.payment === 'dinheiro') {
              obsMsg = `\n💵 *Pagamento:* Dinheiro\n🪙 *Troco para:* ${customer.changeFor || 'Não precisa'}`;
          } else if (customer.payment === 'offline_pix') {
              obsMsg = `\n📱 *Pagamento:* PIX (Na Entrega / Chave da Loja)`;
          } else {
              obsMsg = `\n💳 *Pagamento:* Cartão na Entrega (Levar maquininha)`;
          }

          const linkAcompanhamento = `https://${window.location.host}/track/${orderId}`;
          const freteTexto = isWaiterMode ? "" : `\n🚚 *Frete:* R$ ${(shippingFee || 0).toFixed(2)}`;
          const message = `🔔 *NOVO PEDIDO #${orderId.slice(-5).toUpperCase()}*\n\n👤 *Cliente:* ${customer.name}\n📱 *Tel:* ${customer.phone || 'Não informado'}\n${enderecoMsg}\n\n🛒 *RESUMO DO PEDIDO:*\n${itemsList}${freteTexto}\n${totalMsg}\n${obsMsg}\n\n🔗 *Acompanhar:* ${linkAcompanhamento}`;

          const targetPhone = storeSettings.whatsapp || "5551999999999";
          const whatsappUrl = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
          
          localStorage.setItem('activeOrderId', orderId);
          setActiveOrderId(orderId);
          setCart([]); setShowCheckout(false); setAppliedCoupon(null); setDiscountAmount(0); setCouponCode('');
          setIsFinalizing(false); 

          // BLINDAGEM MODO GARÇOM: Não envia WhatsApp, não abre roleta, não muda de tela. Apenas zera o carrinho.
          if (isWaiterMode) {
              alert("✅ Pedido enviado para a cozinha com sucesso!");
              return; // Para a execução aqui mesmo!
          }
          
          // GATILHO DA GAMIFICAÇÃO: Intercepta o redirecionamento se a Roleta estiver ativa
          if (marketingSettings?.gamification?.roulette) {
              setPendingRedirect({ url: whatsappUrl, track: `/track/${orderId}` });
              setShowRoulette(true);
          } else {
              window.open(whatsappUrl, '_blank');
              navigate(`/track/${orderId}`);
          }
          return;
      }

     if (customer.payment === 'cartao' || customer.payment === 'pix') {
          const hasStripe = storeSettings?.stripeConnectId;
          const hasMP = marketingSettings?.integrations?.mercadopago?.accessToken;

          if (!hasStripe && !hasMP) {
              alert("⚠️ Esta loja ainda não configurou pagamentos online. Escolha a opção 'Dinheiro'.");
              setIsFinalizing(false); 
              return;
          }

          // Dá preferência ao Mercado Pago se ambos estiverem conectados.
          const gateway = hasMP ? 'mercadopago' : 'stripe';
          const apiUrl = gateway === 'mercadopago' ? '/api/create-mp-checkout' : '/api/create-marketplace-checkout';

          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  items: sanitizedCart,
                  storeId: storeId, // MP precisa do storeId
                  orderId: orderId, 
                  storeConnectId: storeSettings.stripeConnectId, // Stripe precisa disso
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

              // --- GAMIFICAÇÃO: ABATER SALDO REAL DA CARTEIRA ---
              if (cashbackDiscount > 0) {
                  const cleanPhone = customer.phone.replace(/\D/g, '');
                  try { await updateDoc(doc(db, "wallets", `${storeId}_${cleanPhone}`), { balance: increment(-cashbackDiscount) }); } catch(e){}
              }
              // --------------------------------------------------

              // O Cliente fechou a compra online! Removemos dos abandonados
              try { await deleteDoc(doc(db, "abandoned_carts", `cart_${storeId}_${customer.phone.replace(/\D/g, '')}`)); } catch(e){}
              
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

  useEffect(() => {
      if (productSlug && products.length > 0 && !selectedProduct) {
          const productFromUrl = products.find(p => generateSlug(p.name) === productSlug);
          if (productFromUrl) {
              setSelectedOptions({});
              setItemObservation('');
          } else {
              navigate('/', { replace: true });
          }
      }
  },[selectedProduct?.id, productSlug, products, navigate]);

  const displayCategories =[
      { id: 'all', name: 'Todos', icon: <Utensils size={18}/> },
      ...categories.map(c => ({ 
          id: c.name, 
          name: c.name, 
          icon: renderCategoryIcon(c.icon, c.name)
      }))
  ];

  const recommendedIdsInCart = cart.flatMap(item => item.recommendedIds ||[]);
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
    default: { primary: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', shadow: 'shadow-blue-100', hoverPrimary: 'hover:bg-blue-700', lightBg: 'bg-blue-50', hoverLightBg: 'hover:bg-blue-100', accent: 'accent-blue-600', darkText: 'text-blue-900', gradientFrom: 'from-blue-500', gradientTo: 'to-blue-800', ringColor: 'blue-500', headerBg: 'url(https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=1000&auto=format&fit=crop)' },
    burger: { primary: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600', shadow: 'shadow-orange-100', hoverPrimary: 'hover:bg-orange-700', lightBg: 'bg-orange-50', hoverLightBg: 'hover:bg-orange-100', accent: 'accent-orange-600', darkText: 'text-orange-900', gradientFrom: 'from-orange-500', gradientTo: 'to-orange-800', ringColor: 'orange-500', headerBg: 'url(https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop)' },
    pizza: { primary: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', shadow: 'shadow-rose-100', hoverPrimary: 'hover:bg-rose-700', lightBg: 'bg-rose-50', hoverLightBg: 'hover:bg-rose-100', accent: 'accent-rose-600', darkText: 'text-rose-900', gradientFrom: 'from-rose-500', gradientTo: 'to-rose-800', ringColor: 'rose-500', headerBg: 'url(https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop)' },
    oriental: { primary: 'bg-slate-900', text: 'text-slate-900', border: 'border-slate-900', shadow: 'shadow-slate-200', hoverPrimary: 'hover:bg-slate-800', lightBg: 'bg-slate-800', hoverLightBg: 'hover:bg-slate-700', accent: 'accent-slate-900', darkText: 'text-slate-900', gradientFrom: 'from-slate-700', gradientTo: 'to-slate-900', ringColor: 'slate-600', headerBg: 'url(https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000&auto=format&fit=crop)' },
    natural: { primary: 'bg-green-600', text: 'text-green-600', border: 'border-green-600', shadow: 'shadow-green-100', hoverPrimary: 'hover:bg-green-700', lightBg: 'bg-green-50', hoverLightBg: 'hover:bg-green-100', accent: 'accent-green-600', darkText: 'text-green-900', gradientFrom: 'from-green-500', gradientTo: 'to-green-800', ringColor: 'green-500', headerBg: 'url(https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=1000&auto=format&fit=crop)' },
    sweet: { primary: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', shadow: 'shadow-purple-100', hoverPrimary: 'hover:bg-purple-700', lightBg: 'bg-purple-50', hoverLightBg: 'hover:bg-purple-100', accent: 'accent-purple-600', darkText: 'text-purple-900', gradientFrom: 'from-purple-500', gradientTo: 'to-purple-800', ringColor: 'purple-500', headerBg: 'url(https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1000&auto=format&fit=crop)' },
    drinks: { primary: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-100', hoverPrimary: 'hover:bg-amber-600', lightBg: 'bg-amber-50', hoverLightBg: 'hover:bg-amber-100', accent: 'accent-amber-500', darkText: 'text-amber-900', gradientFrom: 'from-amber-400', gradientTo: 'to-amber-600', ringColor: 'amber-500', headerBg: 'url(https://images.unsplash.com/photo-1563223771-383790515286?q=80&w=1000&auto=format&fit=crop)' },
    custom: { 
        primary: 'bg-[var(--custom-color)]', 
        text: 'text-[var(--custom-color)]', 
        border: 'border-[var(--custom-color)]', 
        shadow: 'shadow-md', 
        hoverPrimary: 'opacity-90', 
        lightBg: 'bg-[var(--custom-color)]/10', 
        hoverLightBg: 'hover:bg-[var(--custom-color)]/20', 
        accent: 'accent-[var(--custom-color)]', 
        darkText: 'text-[var(--custom-color)]', 
        gradientFrom: 'from-[var(--custom-color)]', 
        gradientTo: 'to-slate-900', 
        ringColor: '[var(--custom-color)]', 
        headerBg: 'none' 
    }
  };

  const currentTheme = themePresets[storeSettings?.storeNiche] || themePresets.default;

 return (
  <div 
    className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 relative"
    style={storeSettings?.storeNiche === 'custom' && storeSettings.customColor ? { '--custom-color': storeSettings.customColor } : {}}
  >
    {storeSettings?.storeNiche === 'custom' && storeSettings.customBackgroundUrl && (
        <div 
            className="fixed inset-0 z-0 pointer-events-none" 
            style={{ 
                backgroundImage: `url(${storeSettings.customBackgroundUrl})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center', 
                backgroundAttachment: 'fixed',
                opacity: 0.15 
            }} 
        />
    )}
    <div className="relative z-10">
    <SEO
        title={selectedProduct ? `${selectedProduct.name} | ${storeSettings.name || 'Velo Delivery'}` : `${storeSettings.name || 'Carregando...'} | Delivery`} 
        description={selectedProduct ? (selectedProduct.description || `Compre ${selectedProduct.name} com entrega rápida na ${storeSettings.name}.`) : (storeSettings.slogan || 'Faça seu pedido online.')} 
        image={selectedProduct ? selectedProduct.imageUrl : storeSettings.storeLogoUrl}
        productData={selectedProduct} 
    />
    <AgeGate enabled={storeSettings?.ageGateEnabled} />

    <header className="relative pt-12 pb-8 px-6 overflow-hidden rounded-b-[2.5rem] shadow-md mb-2">
        <div className={`absolute inset-0 z-0 bg-gradient-to-br ${currentTheme.gradientFrom} ${currentTheme.gradientTo}`}>
            <div 
              className="absolute inset-0 opacity-[0.15]" 
              style={{ 
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3C!-- Martini --%3E%3Cpath d='M15 20l10 0l-5 8zM20 28l0 8M16 36l8 0'/%3E%3C!-- Cerveja --%3E%3Crect x='50' y='50' width='10' height='14' rx='2'/%3E%3Cpath d='M60 54a3 3 0 0 1 0 6'/%3E%3C!-- Vinho --%3E%3Cpath d='M50 15a6 6 0 0 1 12 0c0 4-3 8-6 8s-6-4-6-8zM56 23l0 7M52 30l8 0'/%3E%3C!-- Copo Whisky com Gelo --%3E%3Cpath d='M10 60l2 10l12 0l2 -10z'/%3E%3Crect x='13' y='64' width='3' height='3'/%3E%3C/g%3E%3C/svg%3E\")",
                backgroundSize: '90px',
                transform: 'rotate(-15deg) scale(1.5)',
              }}
            ></div>
        </div>

        <div className="relative z-10 flex flex-col gap-5">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <img src={storeSettings.storeLogoUrl} className="h-16 w-16 rounded-full object-cover border-4 border-white/30 shadow-xl" onError={(e)=>e.target.src="https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
                    <div className="text-left">
                        <h1 className="text-2xl font-black text-white leading-none uppercase drop-shadow-md">{storeSettings.name || "Sua Loja"}</h1>
                        {storeSettings.slogan && <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1 drop-shadow-sm">{storeSettings.slogan}</p>}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <button onClick={handleShare} className="p-2.5 bg-white/20 text-white rounded-full backdrop-blur-sm border border-white/30 hover:bg-white/30 active:scale-95 transition-all shadow-sm">
                        <Share size={18} />
                    </button>
                </div>
            </div>

            <div className={`inline-flex self-start items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md border ${isStoreOpenNow ? 'bg-green-500/20 text-green-100 border-green-400/50' : 'bg-red-500/20 text-red-100 border-red-400/50'} shadow-inner`}>
                {isStoreOpenNow ? <Clock size={16}/> : <XCircle size={16}/>} 
                <span className="text-xs font-black uppercase tracking-wider">{storeMessage}</span>
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
        {marketingSettings.promoActive && 
         marketingSettings.promoBannerUrls && 
         marketingSettings.promoBannerUrls.length > 0 && 
         (!marketingSettings.promoExpiresAt || new Date() < new Date(marketingSettings.promoExpiresAt)) && (
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

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-2 snap-x px-2">
          {displayCategories.map(c => (
            <button 
                key={c.id} 
                onClick={() => scrollToCategory(c.id)} 
                className="flex flex-col items-center gap-2 min-w-[85px] snap-center group"
            >
              <div className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 ${activeCategory === c.id ? `${currentTheme.primary} text-white scale-105 shadow-md` : 'bg-white text-slate-500 border border-slate-100 group-hover:border-slate-300 group-hover:bg-slate-50'}`}>
                {React.cloneElement(c.icon, { size: activeCategory === c.id ? 32 : 28 })}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tight text-center leading-none px-1 ${activeCategory === c.id ? currentTheme.text : 'text-slate-500'}`}>
                {c.name}
              </span>
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
                                  <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>
                                      <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                      {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                      {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                      {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && (
                                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse z-10">
                                              OFERTA 🔥
                                          </div>
                                      )}
                                      {p.isChilled && (
                                          <div className="absolute bottom-2 right-2 bg-cyan-100 border border-cyan-300 text-[14px] p-1.5 rounded-full shadow-md flex items-center justify-center z-10 backdrop-blur-sm bg-opacity-90">
                                              ❄️
                                          </div>
                                      )}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-1 cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>{p.name}</h3>
                                  {p.description && <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight mb-2">{p.description}</p>}
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {Number(p.promotionalPrice) > 0 ? (
                                              <>
                                                  <span className="text-[11px] font-bold text-slate-400 line-through block">R$ {Number(p.price).toFixed(2)}</span>
                                                  <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.promotionalPrice).toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
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
                                  <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>
                                      <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                      {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                      {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                      {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && (
                                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse z-10">
                                              OFERTA 🔥
                                          </div>
                                      )}
                                      {p.isChilled && (
                                          <div className="absolute bottom-2 right-2 bg-cyan-100 border border-cyan-300 text-[14px] p-1.5 rounded-full shadow-md flex items-center justify-center z-10 backdrop-blur-sm bg-opacity-90">
                                              ❄️
                                          </div>
                                      )}
                                  </div>
                                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-1 cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>{p.name}</h3>
                                  {p.description && <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight mb-2">{p.description}</p>}
                                  <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {Number(p.promotionalPrice) > 0 ? (
                                              <>
                                                  <span className="text-[11px] font-bold text-slate-400 line-through block">R$ {Number(p.price).toFixed(2)}</span>
                                                  <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.promotionalPrice).toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
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
                                <div className="aspect-square rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>
                                    <img src={p.imageUrl} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                    {!hasStock && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center font-black text-white text-xs uppercase">Esgotado</div>}
                                    {p.hasDiscount && p.discountPercentage && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">-{p.discountPercentage}%</span>}
                                    {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && (
                                        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse z-10">
                                            OFERTA 🔥
                                        </div>
                                    )}
                                    {p.isChilled && (
                                        <div className="absolute bottom-2 right-2 bg-cyan-100 border border-cyan-300 text-[14px] p-1.5 rounded-full shadow-md flex items-center justify-center z-10 backdrop-blur-sm bg-opacity-90">
                                            ❄️
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-1 cursor-pointer" onClick={() => hasStock ? handleOpenProduct(p) : null}>{p.name}</h3>
                                {p.description && <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight mb-2">{p.description}</p>}
                                <div className="flex justify-between items-center mt-auto">
                                      <div>
                                          {Number(p.promotionalPrice) > 0 ? (
                                              <>
                                                  <span className="text-[11px] font-bold text-slate-400 line-through block">R$ {Number(p.price).toFixed(2)}</span>
                                                  <span className={`${currentTheme.text} font-black text-lg italic leading-none block`}>R$ {Number(p.promotionalPrice).toFixed(2)}</span>
                                              </>
                                          ) : (
                                              <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
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
                                                onClick={() => hasStock ? handleOpenProduct(p) : null}
                                                className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${!hasStock ? 'opacity-60 grayscale' : ''}`}
                                            >
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <h3 className="font-black text-slate-800 text-sm leading-tight mb-1">{p.name}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                                        {p.description || "Clique para ver mais detalhes e opções."}
                                                    </p>
                                                    <div className="mt-auto">
                                                        {Number(p.promotionalPrice) > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.promotionalPrice).toFixed(2)}</span>
                                                                <span className="text-xs font-bold text-slate-400 line-through">R$ {Number(p.price).toFixed(2)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className={`${currentTheme.text} font-black text-base italic leading-none`}>R$ {Number(p.price)?.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-28 h-28 flex-shrink-0 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                                                    <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                                                    {(Number(p.promotionalPrice) > 0 || p.hasDiscount) && <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-br-xl shadow-sm z-10">OFERTA 🔥</span>}
                                                    {p.hasDiscount && p.discountPercentage && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl z-10">-{p.discountPercentage}%</span>}
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

      <section className="px-6 pb-10 max-w-2xl mx-auto">
          <Reviews storeId={storeId} customerPhone={customer.phone} />
      </section>

      <footer className="p-12 text-center">
        {/* --- INÍCIO: EXIBIÇÃO DO CNPJ --- */}
        {storeSettings.cnpj && (
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6">
                CNPJ: {storeSettings.cnpj}
            </p>
        )}
        {/* --- FIM: EXIBIÇÃO DO CNPJ --- */}
        
        <p 
            className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] mb-6 cursor-pointer"
            onClick={() => setShowWaiterLogin(true)}
        >
            Plataforma de Vendas {isWaiterMode ? ' (Modo Garçom ATIVO)' : ''}
        </p>
        <a 
          href="https://velodelivery.com.br"
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex flex-col items-center opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer"
        >
          <img src="/logo retangular Velo Delivery.png" className="h-6 w-auto mb-2" alt="Velo Delivery" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by VELO DELIVERY</p>
        </a>
        <div className="flex gap-4 justify-center text-sm text-gray-500 mt-8 mb-4">
            <a href="/politicas" className="hover:underline">Política de Privacidade</a>
            <a href="/politicas" className="hover:underline">Trocas e Devoluções</a>
            <a href="/politicas" className="hover:underline">Política de Entrega</a>
        </div>
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
          <Clock size={24} /> <span className="font-bold text-sm pr-2 hidden md:inline">Últimos Pedidos</span>
        </motion.button>

        <motion.button
          onClick={() => setShowVipArea(true)}
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900 rounded-full p-4 shadow-xl hover:from-yellow-300 hover:to-yellow-500 active:scale-90 flex items-center gap-2 border-2 border-yellow-300"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Crown size={24} fill="currentColor" /> <span className="font-black text-sm pr-2">VIP</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-6">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} className="bg-white w-full max-w-lg rounded-t-[3.5rem] md:rounded-[3.5rem] p-10 relative max-h-[95vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"><X size={32}/></button>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SEU PEDIDO</h2>
              {!isWaiterMode && storeSettings.freeShippingThreshold > 0 && (
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
                    <input type="text" placeholder="Nome do Cliente" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.name} onChange={e => handleCustomerChange('name', e.target.value)} />
                    
                    {isWaiterMode ? (
                        <>
                            <input type="tel" placeholder="WhatsApp (Opcional)" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold mb-3 shadow-inner border-none" value={customer.phone} onChange={e => handleCustomerChange('phone', e.target.value)} />
                            <div className="bg-yellow-50 p-4 rounded-[2rem] border border-yellow-200 mb-3">
                                <label className="text-xs font-black uppercase text-yellow-700 ml-2 mb-1 block">Número da Mesa *</label>
                                <input type="number" placeholder="Ex: 12" className="w-full p-4 bg-white rounded-xl font-black text-xl text-center shadow-inner border-none outline-none focus:ring-2 ring-yellow-400" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                  </div>

                  {!isWaiterMode && cepError && <p className="text-red-500 text-xs font-bold text-center">{cepError}</p>}
                  {!isWaiterMode && deliveryAreaMessage && !cepError && <p className={`${currentTheme.text} text-xs font-bold text-center`}>{deliveryAreaMessage}</p>}

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
                                      <p className={`${currentTheme.text} font-black text-sm`}>
                                          R$ {Number(p.promotionalPrice) > 0 ? Number(p.promotionalPrice).toFixed(2) : Number(p.price).toFixed(2)}
                                      </p>
                                      <button onClick={() => addToCart(p)} className={`absolute bottom-3 right-3 p-1.5 ${currentTheme.primary} text-white rounded-full`}><Plus size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {!isWaiterMode && (
                      <>
                          <p className="font-black text-xs text-slate-400 uppercase mt-4 ml-4 tracking-widest">Pagamento:</p>
                          <div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {((storeSettings?.stripeConnectId || marketingSettings?.integrations?.mercadopago?.accessToken) ?[ 
                                {id:'pix', name:'PIX ONLINE', icon: <QrCode size={20}/>}, 
                                {id:'cartao', name:'CARTÃO ONLINE', icon: <CreditCard size={20}/>}, 
                                {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>}, 
                                {id:'offline_credit_card', name:'MÁQUINA NA ENTREGA', icon: <Truck size={20}/>} 
                              ] :[
                                {id:'offline_pix', name:'PIX (NA ENTREGA)', icon: <QrCode size={20}/>}, 
                                {id:'offline_credit_card', name:'CARTÃO (MAQUININHA)', icon: <CreditCard size={20}/>}, 
                                {id:'dinheiro', name:'DINHEIRO', icon: <Banknote size={20}/>}
                              ]).map(m => (
                                  <button key={m.id} onClick={() => setCustomer({...customer, payment: m.id})} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${customer.payment === m.id ? `${currentTheme.lightBg} ${currentTheme.border} ${currentTheme.text}` : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                      {m.icon} <span className="text-[9px] font-black uppercase mt-1 text-center">{m.name}</span>
                                  </button>
                              ))}
                            </div>
                            {customer.payment === 'dinheiro' && (
                                <input type="text" placeholder="Troco para..." className="w-full p-5 bg-slate-50 rounded-[2rem] mt-3 font-bold" value={customer.changeFor} onChange={e => setCustomer({...customer, changeFor: e.target.value})} />
                            )}
                          </div>
                      </>
                  )}

                  <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-xl">
                     {!isWaiterMode && (
                          <div className="flex justify-between text-sm opacity-60 font-bold mb-2">
                              <span>Frete</span>
                              <span className={isFreeShipping ? "text-green-600 font-black" : ""}>
                                  {shippingFee !== null ? (isFreeShipping ? "GRÁTIS" : `R$ ${shippingFee.toFixed(2)}`) : '--'}
                              </span>
                          </div>
                      )}
                      {discountAmount > 0 && <div className="flex justify-between text-sm font-bold text-green-400 mb-2"><span>Desconto do Cupom</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                      
                      {/* TOGGLE DA CARTEIRA DE CASHBACK NO CHECKOUT */}
                      {marketingSettings?.gamification?.cashback && cashbackBalance > 0 && (
                          <label className="flex items-center justify-between bg-green-500/10 p-3 rounded-xl border border-green-500/20 cursor-pointer my-3 hover:bg-green-500/20 transition-all">
                              <div className="flex items-center gap-2">
                                  <Wallet size={18} className="text-green-400" />
                                  <span className="text-xs font-bold text-green-100">Usar Saldo de Cashback</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-green-400">- R$ {Math.min(cashbackBalance, baseTotal).toFixed(2)}</span>
                                  <input type="checkbox" checked={useCashback} onChange={e => setUseCashback(e.target.checked)} className="w-5 h-5 accent-green-500 rounded cursor-pointer" />
                              </div>
                          </label>
                      )}

                      <div className="flex justify-between text-xl font-black italic mt-2"><span>TOTAL</span><span className={`${currentTheme.text} italic`}>R$ {finalTotal.toFixed(2)}</span></div>
                  </div>

                  <button 
                      onClick={finalizeOrder} 
                      disabled={!isStoreOpenNow || isCepLoading || isFinalizing} 
                      className={`w-full ${currentTheme.primary} text-white py-6 rounded-[2rem] font-black mt-6 uppercase text-xl shadow-xl ${currentTheme.hoverPrimary} disabled:opacity-50`}
                  >
                      {isFinalizing ? 'Processando...' : (isCepLoading ? 'Calculando...' : 'Confirmar Pedido')}
                  </button>

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
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`fixed bottom-24 left-4 right-4 p-5 bg-gradient-to-r ${currentTheme.gradientFrom} ${currentTheme.gradientTo.replace(/\d{2,3}/,'700')} text-white shadow-2xl z-[100] rounded-3xl flex items-center justify-between gap-3 border border-white/20`}
            >
                <div className="flex items-center gap-3 pr-2">
                    <img src={storeSettings.storeLogoUrl} className="h-12 w-12 rounded-2xl object-cover border-2 border-white/50 shadow-sm" />
                    <div>
                        <p className="font-black text-sm leading-tight">{storeSettings.name}</p>
                        <p className="text-xs opacity-90 font-medium mt-0.5 leading-tight">Adicione à tela inicial para acesso rápido!</p>
                    </div>
                </div>
                <button
                    onClick={handleInstallClick}
                    className={`flex-shrink-0 bg-white ${currentTheme.text} px-5 py-3 rounded-full font-black text-xs uppercase shadow-xl ${currentTheme.hoverLightBg.replace('hover:bg-', 'hover:bg-')} active:scale-95 transition-all`}
                >
                    Instalar
                </button>
                <button onClick={() => setShowInstallPrompt(false)} className="absolute -top-3 -right-2 bg-slate-900 text-white p-2 rounded-full shadow-xl border-2 border-white hover:bg-slate-800 transition-all z-10">
                    <X size={20} strokeWidth={3} />
                </button>
            </motion.div>
        )}

        {showiOSInstallMessage && (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="fixed bottom-24 left-4 right-4 p-5 bg-gradient-to-r from-purple-600 to-pink-700 text-white shadow-2xl z-[100] rounded-3xl flex items-center justify-between gap-3 border border-white/20"
            >
                <div className="flex items-center gap-3 pr-2">
                    <img src={storeSettings.storeLogoUrl} className="h-12 w-12 rounded-2xl object-cover border-2 border-white/50 shadow-sm" />
                    <div>
                        <p className="font-black text-sm leading-tight">Instale nosso App!</p>
                        <p className="text-xs opacity-90 font-medium mt-0.5 leading-tight">
                            Toque em <Share size={14} className="inline-block relative -top-0.5 mx-0.5" /> e depois "Adicionar à Tela de Início".
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDismissiOSInstallMessage}
                    className="flex-shrink-0 bg-white text-purple-600 px-5 py-3 rounded-full font-black text-xs uppercase shadow-xl hover:bg-purple-50 active:scale-95 transition-all"
                >
                    Entendi
                </button>
                <button onClick={() => setShowiOSInstallMessage(false)} className="absolute -top-3 -right-2 bg-slate-900 text-white p-2 rounded-full shadow-xl border-2 border-white hover:bg-slate-800 transition-all z-10">
                    <X size={20} strokeWidth={3} />
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
            onClick={() => {
                setSelectedProduct(null);
                navigate('/', { replace: true });
            }} 
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
                onClick={() => {
                    setSelectedProduct(null);
                    navigate('/', { replace: true });
                }} 
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
                {/* --- INÍCIO: BADGES DE SEO E NUTRIÇÃO VISUAIS --- */}
                {(selectedProduct.brand || selectedProduct.prepTime || selectedProduct.calories || (selectedProduct.suitableForDiet && selectedProduct.suitableForDiet.length > 0)) && (
                  <div className="flex flex-wrap gap-2 mb-6 border-t border-slate-100 pt-4">
                    {selectedProduct.brand && (
                      <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        🏷️ {selectedProduct.brand}
                      </span>
                    )}
                    {selectedProduct.prepTime && (
                      <span className="flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        ⏱️ Prepara em {selectedProduct.prepTime} min
                      </span>
                    )}
                    {selectedProduct.calories && (
                      <span className="flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        🔥 {selectedProduct.calories} Kcal
                      </span>
                    )}
                    {selectedProduct.suitableForDiet && selectedProduct.suitableForDiet.map((dietUrl, index) => {
                       // Converte URL do schema.org em Label bonito
                       const dietLabels = {
                          'https://schema.org/VeganDiet': '🌿 Vegano',
                          'https://schema.org/VegetarianDiet': '🥗 Vegetariano',
                          'https://schema.org/GlutenFreeDiet': '🌾 Sem Glúten',
                          'https://schema.org/HalalDiet': '☪️ Halal',
                          'https://schema.org/KosherDiet': '✡️ Kosher'
                       };
                       return dietLabels[dietUrl] ? (
                         <span key={index} className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            {dietLabels[dietUrl]}
                         </span>
                       ) : null;
                    })}
                  </div>
                )}
                {/* --- FIM: BADGES DE SEO E NUTRIÇÃO VISUAIS --- */}

                {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                    <div className="border-t border-slate-100 pt-4 mt-4">
                        <h4 className="font-black text-slate-800 text-sm uppercase mb-3 flex items-center justify-between">
                            Escolha uma Opção <span className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md">Obrigatório</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {selectedProduct.variations.map((varOption, idx) => (
                                <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedVariation === varOption ? `border-${currentTheme.ringColor} ${currentTheme.lightBg}` : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                    <input 
                                        type="radio" 
                                        name="productVariation" 
                                        value={varOption}
                                        checked={selectedVariation === varOption}
                                        onChange={() => setSelectedVariation(varOption)}
                                        className={`${currentTheme.accent} w-4 h-4 cursor-pointer flex-shrink-0`}
                                    />
                                    <span className={`text-sm font-bold leading-tight ${selectedVariation === varOption ? currentTheme.darkText : 'text-slate-600'}`}>{varOption}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {selectedProduct.complements && selectedProduct.complements.length > 0 && (
                    <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
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
                                        const isSelected = (selectedOptions[group.id] ||[]).some(o => o.name === opt.name);
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
{/* --- ÁREA VIP & MISSÕES --- */}
      <AnimatePresence>
        {showVipArea && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowVipArea(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={24} /></button>
              
             <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-6 rounded-3xl text-center mb-6 shadow-xl shadow-yellow-200 relative overflow-hidden">
                  <Crown size={48} className="mx-auto text-slate-900 mb-2 relative z-10" fill="currentColor" />
                  <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-none relative z-10">Clube VIP</h2>
                  <p className="text-slate-800 font-bold mt-2 relative z-10">Você possui <span className="text-2xl font-black bg-slate-900 text-yellow-400 px-3 py-1 rounded-xl mx-1 shadow-inner">{loyaltyPoints}</span> pontos!</p>
                  
                  {/* TIER VIP PROGRESS */}
                  {marketingSettings?.gamification?.tiers && (
                      <div className="mt-6 pt-4 border-t border-yellow-600/20 relative z-10 text-left">
                          <div className="flex justify-between items-end mb-2">
                              <span className={`font-black uppercase tracking-widest text-[10px] ${userTier.bg} ${userTier.color} px-2 py-1 rounded-md`}>Nível {userTier.name}</span>
                              {userTier.missing > 0 && <span className="text-[10px] font-bold text-yellow-900 uppercase">Faltam R$ {userTier.missing.toFixed(2)} p/ {userTier.next}</span>}
                          </div>
                          <div className="w-full bg-yellow-600/30 h-2 rounded-full overflow-hidden">
                              <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${userTier.progress}%` }}></div>
                          </div>
                      </div>
                  )}
              </div>

              {/* MÓDULOS DE GAMIFICAÇÃO */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* BADGES (SELOS) */}
                  {marketingSettings?.gamification?.badges && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                          <Medal size={24} className="text-purple-500 mb-2"/>
                          <h4 className="font-black text-slate-800 text-xs uppercase mb-2">Minhas Conquistas</h4>
                          <div className="flex flex-wrap justify-center gap-1">
                              {userBadges.length > 0 ? userBadges.map((b, i) => (
                                  <span key={i} className="bg-white border border-slate-200 text-[10px] px-2 py-1 rounded-lg font-bold shadow-sm" title={b.name}>{b.icon}</span>
                              )) : <span className="text-[9px] text-slate-400 font-bold">Faça pedidos para ganhar.</span>}
                          </div>
                      </div>
                  )}

                  {/* REFERRAL (INDIQUE E GANHE) */}
                  {marketingSettings?.gamification?.referral && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center justify-center">
                          <Share2 size={24} className="text-blue-600 mb-2"/>
                          <h4 className="font-black text-blue-900 text-xs uppercase mb-1">Indique Amigos</h4>
                          <button 
                              onClick={() => {
                                  const refLink = `${window.location.origin}/?ref=${customer.phone || 'GUEST'}`;
                                  navigator.clipboard.writeText(refLink);
                                  alert("✅ Link de indicação copiado! Envie para seus amigos.");
                              }} 
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:bg-blue-700 active:scale-95 shadow-sm mt-1"
                          >
                              <Copy size={12}/> Copiar Link
                          </button>
                      </div>
                  )}
              </div>

              <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4 pl-2">Missões Disponíveis (Ganhe Pontos)</h3>
              
              <div className="space-y-4">
                {/* Missão Nova: Avaliar Produto do App */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center hover:border-yellow-400 transition-all">
                      <div className="flex-1 pr-2">
                          <h4 className="font-black text-slate-800 text-sm">Avaliar Produto</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Dê 5 estrelas para o seu último pedido.</p>
                      </div>
                      <button 
                          onClick={() => {
                              if (pendingReviewOrder) {
                                  setShowVipArea(false);
                                  setShowReviewPopup(true);
                              } else {
                                  alert("Você não possui pedidos recentes pendentes de avaliação no momento.");
                              }
                          }} 
                          className={`${pendingReviewOrder ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-400'} px-4 py-2 rounded-xl font-black text-xs uppercase shadow-sm`}
                      >
                          10 Pontos
                      </button>
                  </div>
                  {/* Missão 1: Google Simples */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center hover:border-yellow-400 transition-all">
                      <div className="flex-1">
                          <h4 className="font-black text-slate-800 text-sm">Avaliar no Google</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Dê 5 estrelas e cole o texto sugerido.</p>
                      </div>
                      <button onClick={() => setMissionModal({ isOpen: true, type: 'google_simple', title: 'Avaliação Google', points: 20 })} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-black text-xs uppercase shadow-sm">20 Pontos</button>
                  </div>

                  {/* Missão 2: Google com Foto */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center hover:border-yellow-400 transition-all">
                      <div className="flex-1">
                          <h4 className="font-black text-slate-800 text-sm">Avaliar com Foto</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">GMB: Poste uma foto linda do seu pedido.</p>
                      </div>
                      <button onClick={() => setMissionModal({ isOpen: true, type: 'google_photo', title: 'Google + Foto', points: 30 })} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-black text-xs uppercase shadow-sm">30 Pontos</button>
                  </div>

                  {/* Missão 3: Instagram */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center hover:border-yellow-400 transition-all">
                      <div className="flex-1">
                          <h4 className="font-black text-slate-800 text-sm">Postar no Instagram</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Tire uma foto e marque nosso @oficial.</p>
                      </div>
                      <button onClick={() => setMissionModal({ isOpen: true, type: 'instagram', title: 'Post Instagram', points: 40 })} className="bg-pink-100 text-pink-700 px-4 py-2 rounded-xl font-black text-xs uppercase shadow-sm">40 Pontos</button>
                  </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DA MISSÃO (UPLOAD DE COMPROVANTE) --- */}
      <AnimatePresence>
        {missionModal.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-8 relative shadow-2xl">
              <button onClick={() => { setMissionModal({ isOpen: false }); setProofFile(null); }} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24} /></button>
              
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mb-2">{missionModal.title}</h2>
              <p className="text-xs font-bold text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Para ganhar os <strong className="text-yellow-600">{missionModal.points} pontos</strong>, clique no botão abaixo para ir até a página, faça a ação, tire um Print (Screenshot) e envie aqui para validação.
              </p>

              <div className="space-y-3 mb-6">
                  {storeSettings.googleReviewUrl && missionModal.type.includes('google') && (
                      <a href={storeSettings.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95">
                          <ExternalLink size={16}/> Abrir Página do Google
                      </a>
                  )}
                  <button onClick={() => { navigator.clipboard.writeText("Excelente atendimento e qualidade! Recomendo muito a loja."); alert("Texto copiado!"); }} className="w-full flex justify-center items-center gap-2 bg-slate-100 text-slate-700 p-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-200">
                      Copiar Texto Sugerido
                  </button>
                  {missionModal.type === 'google_photo' && lastOrders.length > 0 && lastOrders[0].items[0]?.imageUrl && (
                      <button onClick={() => window.open(lastOrders[0].items[0].imageUrl, '_blank')} className="w-full flex justify-center items-center gap-2 bg-purple-100 text-purple-700 p-4 rounded-2xl font-black text-xs uppercase hover:bg-purple-200">
                          <ImageIcon size={16}/> Ver Foto do Último Pedido
                      </button>
                  )}
              </div>

              <div className="border-t border-slate-100 pt-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Enviar Comprovante (Print)</label>
                  <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} className="hidden" id="proof-upload" />
                  <label htmlFor="proof-upload" className="w-full p-4 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all">
                      <UploadCloud size={24} className={proofFile ? 'text-green-500' : 'text-slate-400'} />
                      <span className="text-xs text-center">{proofFile ? '✅ Arquivo Selecionado' : 'Toque para anexar o Print'}</span>
                  </label>
              </div>
              
              <button onClick={submitMissionProof} disabled={uploadingProof || !proofFile} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl mt-4 transition-all ${proofFile ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {uploadingProof ? 'Enviando...' : 'Solicitar Pontos'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- POP-UP AVALIAÇÃO INTERNA (AUTOMÁTICA 10 PTS) --- */}
      <AnimatePresence>
        {showReviewPopup && pendingReviewOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-8 relative shadow-2xl text-center">
              <button onClick={() => { setShowReviewPopup(false); sessionStorage.setItem(`review_skipped_${pendingReviewOrder.id}`, 'true'); }} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24} /></button>
              
              <div className="bg-yellow-100 text-yellow-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Star size={40} fill="currentColor" />
              </div>
              
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2 text-slate-900">Ganhe 10 Pontos!</h2>
              <p className="text-sm font-bold text-slate-500 mb-6">Como foi o seu último pedido? Avalie agora e credite os pontos na hora.</p>
              
              <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110 active:scale-95">
                          <Star size={40} className={star <= reviewRating ? 'text-yellow-400' : 'text-slate-200'} fill={star <= reviewRating ? "currentColor" : "none"} />
                      </button>
                  ))}
              </div>
              
              <button onClick={submitInternalReview} className="w-full bg-green-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-green-200 active:scale-95">
                  Confirmar & Ganhar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODO GARÇOM LOGIN --- */}
      <AnimatePresence></AnimatePresence>
      {/* --- MODO GARÇOM LOGIN --- */}
      <AnimatePresence>
        {showWaiterLogin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-8 relative shadow-2xl text-center">
              <button onClick={() => setShowWaiterLogin(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X size={24}/></button>
              
              <div className="bg-yellow-100 text-yellow-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Utensils size={40} />
              </div>
              
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Acesso Garçom</h2>
              <p className="text-sm font-bold text-slate-500 mb-6">Identifique-se e insira o PIN da loja.</p>
              
              <input 
                type="text" 
                placeholder="Seu Nome (Ex: João)" 
                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-center mb-3 outline-none focus:ring-2 ring-yellow-400"
                value={waiterName}
                onChange={e => setWaiterName(e.target.value)}
              />

              <input 
                type="password" 
                placeholder="PIN da Loja" 
                className="w-full p-4 bg-slate-50 rounded-xl font-black text-center text-2xl tracking-[0.5em] mb-4 outline-none focus:ring-2 ring-yellow-400"
                value={waiterPin}
                onChange={e => setWaiterPin(e.target.value)}
              />
              
              <button 
                onClick={() => {
                  const correctPin = storeSettings?.waiterPin || '1234';
                  if (!waiterName) return alert("Digite seu nome para identificar a venda!");
                  if (waiterPin === correctPin) {
                    setIsWaiterMode(true);
                    setShowWaiterLogin(false);
                    setWaiterPin('');
                    alert(`✅ Bem-vindo(a), ${waiterName}! O Modo Garçom está ativado.`);
                  } else {
                    alert("❌ PIN Incorreto.");
                    setWaiterPin('');
                  }
                }} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Entrar no Salão
              </button>

             {isWaiterMode && (
                  <button 
                    onClick={() => {
                      setIsWaiterMode(false);
                      setShowWaiterLogin(false);
                      alert("Modo Garçom desativado. O sistema voltou para o Delivery normal.");
                    }} 
                    className="w-full mt-3 py-3 text-red-500 font-bold uppercase text-xs tracking-widest"
                  >
                    Desativar Garçom
                  </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DA ROLETA PÓS-CHECKOUT --- */}
      <AnimatePresence>
        {showRoulette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[300] p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center relative shadow-2xl overflow-hidden">
              <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-2">Gire e Ganhe!</h2>
              <p className="text-slate-500 font-bold mb-8 text-sm">Você finalizou seu pedido e ganhou uma chance na nossa roleta.</p>

              <div className="relative w-64 h-64 mx-auto mb-8">
                  {/* Seta indicadora centralizada no topo */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-20 text-red-500 drop-shadow-md">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L20 20L12 16L4 20L12 2Z"/></svg>
                  </div>
                  
                  {/* Disco da Roleta com Conic Gradient (Fatias perfeitas via CSS) */}
                  <motion.div 
                      className="w-full h-full rounded-full border-8 border-slate-900 shadow-inner relative overflow-hidden"
                      style={{
                          background: `conic-gradient(
                              ${dynamicRouletteSlices.map((slice, i) => {
                                  const step = 360 / dynamicRouletteSlices.length;
                                  return `${slice.color} ${i * step}deg ${(i + 1) * step}deg`;
                              }).join(', ')}
                          )`
                      }}
                      animate={{ rotate: isSpinning ? rouletteRotation : (rouletteRotation > 0 ? rouletteRotation : 0) }}
                      transition={{ duration: 3, ease: "circOut" }}
                  >
                      {dynamicRouletteSlices.map((slice, index) => {
                          const step = 360 / dynamicRouletteSlices.length;
                          // A rotação posiciona o texto no centro exato da fatia.
                          const rotation = (index * step) + (step / 2); 
                          return (
                              <div key={index} className="absolute top-0 left-0 w-full h-full text-center origin-center" style={{ transform: `rotate(${rotation}deg)` }}>
                                  <div className="w-full h-1/2 flex justify-center pt-3">
                                      <span className="font-black text-[10px] uppercase text-white drop-shadow-md max-w-[60px] leading-tight break-words">
                                          {slice.label}
                                      </span>
                                  </div>
                              </div>
                          );
                      })}
                      {/* Centro Fixo da Roleta */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-slate-900 rounded-full z-10 border-4 border-white flex items-center justify-center shadow-lg">
                          <Gift size={24} className="text-yellow-400" />
                      </div>
                  </motion.div>
              </div>

              {rouletteResult ? (
                  <div className="animate-in zoom-in">
                      <p className="text-lg font-black text-slate-900 uppercase mb-4">
                         {rouletteResult === "Nada 😭" || rouletteResult === "Tente na Próxima" ? "Ah, que pena! Tente na próxima." : `🎉 Você ganhou: ${rouletteResult}`}
                      </p>
                      <button onClick={closeRouletteAndRedirect} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                          Continuar para o Pedido
                      </button>
                  </div>
              ) : (
                  <button onClick={spinRoulette} disabled={isSpinning} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isSpinning ? 'bg-slate-200 text-slate-400' : 'bg-green-500 text-white hover:bg-green-600 active:scale-95'}`}>
                      {isSpinning ? 'Girando...' : 'Girar Roleta Agora'}
                  </button>
              )}
              
              {!isSpinning && !rouletteResult && (
                  <button onClick={closeRouletteAndRedirect} className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                      Pular
                  </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

    </div>
  );
}