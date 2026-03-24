import { useStore } from '../../src/context/StoreContext';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../src/services/firebase';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    addDoc, query, orderBy, serverTimestamp, setDoc, getDoc, where, increment
} from 'firebase/firestore';
import {
    ShoppingCart, LayoutDashboard, Clock, ShoppingBag, Package, Users, Plus, Trash2, Edit3,
    Save, X, MessageCircle, Crown, Flame, Trophy, MapPin, ShieldCheck, Printer, Bell, Wallet, Server, Database, HardDrive, FileText, QrCode, Ghost, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, List, Image, Tags, Search, Link, ImageIcon, Calendar, MessageSquare, PlusSquare, MinusSquare, TrendingUp, Landmark, Star,
    CreditCard, Banknote, Pizza, Coffee, IceCream, Sandwich, Candy, Beer, Wine, Martini, Utensils, UserPlus, Shield, RefreshCw, Gift, Medal, Award, Share2,
} from 'lucide-react';
 // Adicionado PlusSquare, MinusSquare, TrendingUp e Landmark
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getStoreIdFromHostname } from '../../src/utils/domainHelper';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
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
import VeloSupportWidget from "../components/VeloSupportWidget";
import AdminChat from '../components/AdminChat'; // Ajuste o caminho se salvou em outro local

import { FaFacebook, FaGoogle, FaWhatsapp, FaTags } from 'react-icons/fa6';
import { Link as LinkIcon } from 'lucide-react'; // Usamos o alias LinkIcon para evitar conflito com o react-router

const libraries = ['places']; // Define a biblioteca de lugares para a busca funcionar
// --- FÓRMULA DE HAVERSINE (CALCULA DISTÂNCIA EM KM) ---
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
    return R * c; 
};
// --- BIBLIOTECA DE ÍCONES PARA CATEGORIAS (TURBINADA s- SUPER CATÁLOGO) ---
const AVAILABLE_ICONS = [
  { id: 'List', label: 'Padrão', component: <List size={24} /> },
  { id: 'Combo', label: 'Combos / Kits', component: <FaBoxOpen size={24} /> },
  { id: 'Star', label: 'Destaques', component: <FaStar size={24} /> },
  // Lanches e Fast Food
  { id: 'Hamburger', label: 'Hambúrguer', component: <GiHamburger size={24} /> },
  { id: 'Fries', label: 'Porções / Fritas', component: <GiFrenchFries size={24} /> },
  { id: 'Pizza', label: 'Pizzaria', component: <GiPizzaSlice size={24} /> },
  { id: 'HotDog', label: 'Cachorro Quente', component: <GiHotDog size={24} /> },
  { id: 'Tacos', label: 'Mexicano', component: <GiTacos size={24} /> },
  // Restaurante e Refeições
  { id: 'BowlFood', label: 'Marmita / PF', component: <FaBowlFood size={24} /> },
  { id: 'Steak', label: 'Espetinho / Churrasco', component: <GiSteak size={24} /> },
  { id: 'Meat', label: 'Açougue / Carnes', component: <GiMeat size={24} /> },
  { id: 'Chicken', label: 'Frango / Aves', component: <GiChickenOven size={24} /> },
  { id: 'Noodles', label: 'Massas / Italiana', component: <GiNoodles size={24} /> },
  { id: 'Sushi', label: 'Oriental / Sushi', component: <GiSushis size={24} /> },
  { id: 'Fish', label: 'Peixaria', component: <FaFishFins size={24} /> },
  { id: 'Shrimp', label: 'Frutos do Mar', component: <GiShrimp size={24} /> },
  // Bebidas Alcoólicas
  { id: 'Beer', label: 'Cervejas', component: <GiBeerBottle size={24} /> },
  { id: 'Drink', label: 'Destilados', component: <GiMartini size={24} /> },
  { id: 'WineGlass', label: 'Vinhos', component: <FaWineGlass size={24} /> },
  { id: 'Champagne', label: 'Espumantes', component: <FaChampagneGlasses size={24} /> },
  // Bebidas Sem Álcool
  { id: 'Soda', label: 'Refrigerantes', component: <GiSodaCan size={24} /> },
  { id: 'Energy', label: 'Energéticos', component: <FaBoltLightning size={24} /> },
  { id: 'Water', label: 'Água / Sem Álcool', component: <FaBottleWater size={24} /> },
  { id: 'Coffee', label: 'Cafeteria', component: <GiCoffeeCup size={24} /> },
  // Doces, Sorvetes e Padaria
  { id: 'Acai', label: 'Açaí', component: <FaIceCream size={24} /> },
  { id: 'IceCream', label: 'Sorveteria', component: <GiIceCreamCone size={24} /> },
  { id: 'Cupcake', label: 'Doces / Bolos', component: <GiCupcake size={24} /> },
  { id: 'Chocolate', label: 'Chocolates', component: <GiChocolateBar size={24} /> },
  { id: 'Bread', label: 'Padaria', component: <FaBreadSlice size={24} /> },
  { id: 'Croissant', label: 'Salgados', component: <GiCroissant size={24} /> },
  // Saudável e Mercado
  { id: 'Leaf', label: 'Vegano / Saudável', component: <FaLeaf size={24} /> },
  { id: 'Carrot', label: 'Hortifruti', component: <FaCarrot size={24} /> },
  { id: 'Cheese', label: 'Frios / Laticínios', component: <FaCheese size={24} /> },
  { id: 'Basket', label: 'Mercado / Conveniência', component: <FaBasketShopping size={24} /> },
  { id: 'Store', label: 'Empório / Adega', component: <FaStore size={24} /> },
  // Farmácia e Pet Shop
  { id: 'Pills', label: 'Farmácia', component: <FaPills size={24} /> },
  { id: 'Paw', label: 'Pet Shop', component: <FaPaw size={24} /> },
  { id: 'Bone', label: 'Petiscos Pet', component: <FaBone size={24} /> },
  // Utilidades e Outros
  { id: 'Snowflake', label: 'Gelo', component: <FaSnowflake size={24} /> },
  { id: 'Fire', label: 'Gás / Carvão', component: <FaFireFlameSimple size={24} /> },
  { id: 'Cigarette', label: 'Tabacaria / Vape', component: <GiCigarette size={24} /> }
];

// --- CONFIGURAÇÕES DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// --- DIAS DA SEMANA PARA A AGENDA ---
const DAYS_OF_WEEK =[
  { id: 1, label: 'Segunda', short: 'SEG' },
  { id: 2, label: 'Terça', short: 'TER' },
  { id: 3, label: 'Quarta', short: 'QUA' },
  { id: 4, label: 'Quinta', short: 'QUI' },
  { id: 5, label: 'Sexta', short: 'SEX' },
  { id: 6, label: 'Sábado', short: 'SÁB' },
  { id: 0, label: 'Domingo', short: 'DOM' },
];

// --- ITENS DE NAVEGAÇÃO COMPLETA (USADO PARA DESKTOP E MOBILE) ---
const allNavItems =[
    { id: 'dashboard', name: 'Início', icon: <LayoutDashboard size={18} />, mobileIcon: <LayoutDashboard size={22} /> },
    { id: 'orders', name: 'Pedidos', icon: <ShoppingBag size={18} />, mobileIcon: <ShoppingBag size={22} /> },
    { id: 'abandoned', name: 'Carrinhos (Perdidos)', icon: <ShoppingCart size={18} />, mobileIcon: <ShoppingCart size={22} /> },
    { id: 'products', name: 'Estoque', icon: <Package size={18} />, mobileIcon: <Package size={22} /> },
    { id: 'categories', name: 'Categorias', icon: <List size={18} />, mobileIcon: <List size={22} /> },
    { id: 'banners', name: 'Banners', icon: <Image size={18} />, mobileIcon: <Image size={22} /> },
    { id: 'customers', name: 'Clientes VIP', icon: <Users size={18} />, mobileIcon: <Users size={22} /> },
    { id: 'manual', name: 'Lançar Pedido', icon: <PlusCircle size={18} />, mobileIcon: <PlusCircle size={22} /> },
    { id: 'marketing', name: 'Marketing', icon: <Trophy size={18} />, mobileIcon: <Trophy size={22} /> },
    { id: 'store_settings', name: 'Loja', icon: <Bell size={18} />, mobileIcon: <Bell size={22} /> },
    { id: 'integrations', name: 'Integrações', icon: <LinkIcon size={18} />, mobileIcon: <LinkIcon size={22} /> },
    { id: 'team', name: 'Equipe', icon: <UserPlus size={18} />, mobileIcon: <UserPlus size={22} /> },
    { id: 'finance', name: 'Financeiro', icon: <Wallet size={18} />, mobileIcon: <Wallet size={22} /> },
    { id: 'chat', name: 'Chat Whats', icon: <MessageCircle size={18} />, mobileIcon: <MessageCircle size={22} /> },
];

export default function Admin() {
    const navigate = useNavigate();
    // --- (Cole logo abaixo de const navigate = useNavigate();) ---
    
    const { store, loading } = useStore(); // Pega a loja do usuário logado
    // --- CARREGAMENTO DO GOOGLE MAPS ---
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: libraries,
        language: 'pt-BR', // Força o idioma para Português do Brasil
        region: 'BR'       // Foca a busca de endereços no Brasil
    });

    // Funções para a Barra de Busca do Lojista
    const[adminMapAutocomplete, setAdminMapAutocomplete] = useState(null);
    
    const onAdminPlaceChanged = () => {
        if (adminMapAutocomplete !== null) {
            const place = adminMapAutocomplete.getPlace();
            if (place && place.geometry) {
                // Move o pino automaticamente para o endereço buscado
                setStoreStatus(prev => ({
                    ...prev, 
                    lat: place.geometry.location.lat(), 
                    lng: place.geometry.location.lng()
                }));
            }
        }
    };

    // --- PROTEÇÃO DE ROTA ---
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) {
                // Pequeno delay para garantir que não é apenas lentidão da internet
                setTimeout(() => {
                    if (!auth.currentUser) navigate('/login');
                }, 1000);
            }
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    const handleAssinarPro = async () => {
        try {
            if (!storeId) return alert("Erro: Loja não identificada.");

            // Em localhost (desenvolvimento) bate relativo. Em produção, força o domínio principal para evitar erros de subdomínio.
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = isLocal 
                ? '/api/checkout-pro' 
                : 'https://app.velodelivery.com.br/api/checkout-pro';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Erro ao gerar link de pagamento: " + (data.error || "Desconhecido"));
            }
        } catch (error) {
            console.error("Erro na cobrança SaaS:", error);
            alert("Erro de conexão ao tentar gerar a fatura. Tente novamente em instantes.");
        }
    };

    // --- INTEGRAÇÃO STRIPE CONNECT EXPRESS ---
    const handleConectarBanco = async () => {
        try {
            if (!storeId) return alert("Erro: Loja não identificada.");

            const response = await fetch('/api/create-connect-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Erro ao conectar com a Stripe: " + (data.error || "Erro desconhecido"));
            }
        } catch (error) {
            console.error("Erro ao conectar banco:", error);
            alert("Erro de conexão ao tentar configurar recebimentos.");
        }
    };
    // --- ABRIR PAINEL FINANCEIRO DO LOJISTA (BLINDADO) ---
    const handleOpenStripeDashboard = async () => {
        try {
            if (!storeId) return alert("Erro: Loja não identificada na URL.");
            
            // BLINDAGEM: Busca a verdade no banco de dados na hora do clique
            const storeRef = doc(db, "stores", storeId);
            const storeSnap = await getDoc(storeRef);
            
            if (!storeSnap.exists()) {
                return alert("Erro: Loja não encontrada.");
            }

            const currentStripeId = storeSnap.data().stripeConnectId;

            if (!currentStripeId) {
                return alert("Esta loja ainda não conectou uma conta bancária na Stripe.");
            }
            
            const response = await fetch('/api/create-login-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stripeConnectId: currentStripeId })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                alert("Erro ao abrir o painel financeiro: " + (data.error || "Desconhecido"));
            }
        } catch (error) {
            console.error("Erro Crítico de Segurança Financeira:", error);
            alert("Falha de conexão ao tentar abrir o painel financeiro.");
        }
    };

   // 🚨 NOVA LÓGICA DE PRIORIDADE CORRIGIDA (SaaS MULTI-TENANT) 🚨
    const hostname = window.location.hostname;
    const currentSubdomain = (hostname !== 'localhost' && hostname.includes('.')) 
        ? hostname.split('.')[0] 
        : null;

    const searchParams = new URLSearchParams(window.location.search);
    const urlStoreId = searchParams.get('store');

    // 1. PRIORIDADE MÁXIMA: Tenta definir a loja pela URL
    let resolvedFromUrl = urlStoreId || currentSubdomain;

    // Bloqueia subdomínios de sistema para não serem tratados como lojas
    if (resolvedFromUrl === 'app' || resolvedFromUrl === 'www') {
        resolvedFromUrl = null;
    }

    // 2. Define o storeId final: A URL ganha. Se não houver loja na URL, usa o usuário logado.
    let storeId = resolvedFromUrl || (store ? store.slug : null);

    // TELA DE CARREGAMENTO
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-slate-500 font-bold">Identificando sua loja...</p>
            </div>
        );
    }

    // TELA DE ERRO REAL (Se não conseguiu ler NENHUM subdomínio)
    if (!storeId || storeId === 'app' || storeId === 'www') {
         return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8 bg-slate-50">
                <h1 className="text-2xl font-black text-slate-800">Loja não encontrada</h1>
                <p className="text-slate-500 max-w-md">
                    Verifique se o link da loja está digitado corretamente.
                </p>
                <div className="flex gap-2 justify-center mt-4">
                    <button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Voltar ao Início</button>
                    <button onClick={async () => { await signOut(auth); navigate('/login'); }} className="bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold">Sair / Trocar Conta</button>
                </div>
            </div>
         );
    }
   // --- LÓGICA DE 30 DIAS DE TESTE E VENCIMENTO ---
    const [trialInfo, setTrialInfo] = useState({ isTrial: true, daysLeft: 30, isOverdue: false });

    useEffect(() => {
        if (store?.createdAt) {
            // Converte a data do Firebase para o formato nativo do JS
            const createdDate = store.createdAt.toDate ? store.createdAt.toDate() : new Date(store.createdAt);
            const now = new Date();
            
            // Calcula a diferença de dias
            const diffTime = Math.abs(now - createdDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const daysLeft = Math.max(0, 30 - diffDays);
            const isTrial = diffDays <= 30;
            
            // Fatura vence APENAS se não for Trial E o pagamento não estiver pago
const overdue = storeStatus.paymentStatus === 'overdue' || (!isTrial && storeStatus.paymentStatus !== 'paid');
            setTrialInfo({ isTrial, daysLeft, isOverdue: overdue });
        } else {
            // Se a loja não tem createdAt (recém criada), garante o trial!
            setTrialInfo({ isTrial: true, daysLeft: 30, isOverdue: false });
        
        }
    }, [store?.createdAt, store?.paymentStatus]);

const isOverdue = (storeStatus.paymentStatus === 'overdue') || (trialInfo.isOverdue && storeStatus.paymentStatus !== 'paid');    // ----------------------------------------------
    // --- ESTADOS GERAIS ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [visitasHoje, setVisitasHoje] = useState(0);
    const [orders, setOrders] = useState([]);
    const[abandonedCarts, setAbandonedCarts] = useState([]); // NOVO: Estado dos abandonados
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ promoActive: false, promoBannerUrls: [] });
    const[generalBanners, setGeneralBanners] = useState([]);
    // --- ESTADOS DO MODAL DE RELATÓRIO ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState('hoje'); // 'hoje', '7dias', '30dias', 'mes'
    const [reportSeller, setReportSeller] = useState('todos'); // 'todos', 'online', 'manual'
    const [showReportResults, setShowReportResults] = useState(false); // NOVO: Controla a exibição
    // -------------------------------------
    const[isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const changelog =[
        { id: 1, title: "🚀 Nova Aba de Financeiro", desc: "Controle seus lucros, visualize faturas e receba via Stripe." },
        { id: 2, title: "🤖 Assistente de Vendas IA", desc: "Gere nomes e descrições automáticas de produtos usando IA." },
        { id: 3, title: "🎁 Clube de Fidelidade", desc: "Novo sistema de pontos com resgate de recompensas automático." },
        { id: 4, title: "⚡ Otimização de Performance", desc: "Melhorias de velocidade e limpeza inteligente de cache." }
    ];
    // --- ESTADOS DE EQUIPE / USUÁRIOS ---
    const [teamMembers, setTeamMembers] = useState([]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const[editingTeamId, setEditingTeamId] = useState(null);
    const [teamForm, setTeamForm] = useState({
        name: '', email: '', permissions: { orders: false, products: false, customers: false, store_settings: false, integrations: false }
    });

    const handleUpdateAndClearCache = async () => {
        try {
            // 1. Destruir os Service Workers (PWA) que interceptam os arquivos antigos
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Limpar o Cache Storage (Arquivos JS/CSS retidos no navegador)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            // 3. Limpar a sessão atual
            sessionStorage.clear();
            // Mantemos o localStorage para não derrubar o login do Firebase (que salva no IndexedDB/Local)

            // 4. Forçar o Hard Reload ignorando o cache de disco injetando um timestamp único na URL
            const url = new URL(window.location.href);
            url.searchParams.set('force_update', new Date().getTime());
            window.location.href = url.toString();

        } catch (error) {
            console.error("Erro ao limpar cache, forçando fallback:", error);
            // Fallback direto de cache-busting
            window.location.href = window.location.pathname + '?v=' + new Date().getTime();
        }
    };

    // --- ESTADOS DE INTEGRAÇÕES ---
    const[isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
    const[selectedIntegration, setSelectedIntegration] = useState(null);
    const [integrationForm, setIntegrationForm] = useState({});
    // Estado da Busca
    const [productSearch, setProductSearch] = useState('');
    // --- ESTADOS FINANCEIROS (NOVO) ---
    const [invoiceData, setInvoiceData] = useState({
        basePlan: 49.90,
        extraOrdersCost: 0,
        storageUsage: 0,
        dbUsage: 0,
        total: 49.90,
        status: 'open'
    });
    const [showPixModal, setShowPixModal] = useState(false);
    const[loyaltyRedemptions, setLoyaltyRedemptions] = useState([]);
    const [reviewsList, setReviewsList] = useState([]);
    const [replyText, setReplyText] = useState({});
    // --- ESTADOS DA CONFIGURAÇÃO DA ROLETA ---
    const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
    const [rouletteSlices, setRouletteSlices] = useState([]);
    
    // --- NOVO: ESTADOS DAS MISSÕES VIP ---
    const [vipMissions, setVipMissions] = useState([]);
    const [activeReviewTab, setActiveReviewTab] = useState('missions'); // Controla Aba Prints vs Avaliações

    // --- 🚨 CÓDIGO DE RESGATE AUTOMÁTICO (COLE AQUI) 🚨 ---
    useEffect(() => {
        const rescueLostUser = async () => {
            // Se a loja não foi identificada (está null) MAS existe usuário logado
            if (!storeId && auth.currentUser) {
                console.log("Admin: Usuário logado em limbo. Tentando resgatar...");
                try {
                    // 1. Busca o cadastro do usuário no banco
                    const userDocRef = doc(db, "users", auth.currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        
                        // 2. Descobre qual é a loja dele
                        const targetStore = userData.storeId || userData.currentStore;

                        if (targetStore) {
                            console.log("Admin: Loja encontrada! Redirecionando para:", targetStore);
                            
                            // 3. Monta o endereço correto
                            const protocol = window.location.protocol; 
                            const baseDomain = window.location.hostname.includes('localhost') 
                                ? 'localhost:5173' 
                                : 'velodelivery.com.br';

                            // 4. FORÇA O REDIRECIONAMENTO (Sai do erro e vai para a loja certa)
                            if (!window.location.hostname.includes(targetStore)) {
                                window.location.href = `${protocol}//${targetStore}.${baseDomain}/admin`;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Erro no resgate automático:", error);
                }
            }
        };

        rescueLostUser();
    },[storeId, navigate]); 
    // --- FIM DO CÓDIGO DE RESGATE ---

    // --- RETORNO DO ONBOARDING STRIPE ---
    useEffect(() => {
        const checkStripeOnboarding = async () => {
            const params = new URLSearchParams(window.location.search);
            const stripeConnectedId = params.get('stripe_connected');

            if (stripeConnectedId && storeId) {
                try {
                    await updateDoc(doc(db, "stores", storeId), {
                        stripeConnectId: stripeConnectedId,
                        paymentsEnabled: true
                    });
                    alert("✅ Conta bancária conectada com sucesso!");
                    navigate('/admin', { replace: true });
                } catch (error) {
                    console.error("Erro ao salvar conta Stripe:", error);
                    alert("Erro ao confirmar integração com a Stripe.");
                }
            }
        };

        checkStripeOnboarding();
    }, [storeId, navigate]);

    // Efeito para calcular a fatura em tempo real (Cole isso logo abaixo do useEffect principal dos Pedidos)
    useEffect(() => {
        if(orders.length > 0 || products.length > 0) {
            // Lógica simples de cálculo baseada no manifesto
            const franchiseLimit = 100; // Franquia de pedidos
            
            // Conta pedidos deste mês
            const currentMonthOrders = orders.filter(o => {
                if(!o.createdAt) return false;
                const d = o.createdAt.toDate();
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length;

            const extraOrders = Math.max(0, currentMonthOrders - franchiseLimit);
            const extraCost = extraOrders * 0.25;

            setInvoiceData({
                basePlan: 49.90,
                extraOrdersCost: extraCost,
                storageUsage: (products.length * 0.5) + (generalBanners.length * 2), // Estimativa MB
                dbUsage: products.length + orders.length + 50, // Estimativa Registros
                total: 49.90 + extraCost,
                status: 'open'
            });
        }
    }, [orders, products, generalBanners]);
    // --- ESTADOS DE MODAIS E FORMULÁRIOS ---
    // Produtos
    const[isModalOpen, setIsModalOpen] = useState(false);
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    const [termoIA, setTermoIA] = useState('');
    // PASSO 1: Atualização do Estado do Formulário (form)
    const[form, setForm] = useState({ 
        name: '', 
        description: '', 
        price: '', 
        costPrice: '', 
        promotionalPrice: '', 
        originalPrice: '', 
        category: '', 
        imageUrl: '', 
        tag: '', 
        stock: 0,
        hasDiscount: false, 
        discountPercentage: null, 
        isFeatured: false, 
        isBestSeller: false,
        quantityDiscounts:[], 
        recommendedIds:[],
        complements:[],
        isChilled: false,
        // --- NOVOS CAMPOS SEO / LOGÍSTICA ---
        gtin: '',
        brand: '',
        prepTime: '',
        deliveryLeadTime: '',
        calories: '',
        suitableForDiet:[],
        variations: ''
    });

    const [editingId, setEditingId] = useState(null);
    // --- Estado para Edição de Pedido ---
    const[isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
    const [editingOrderData, setEditingOrderData] = useState(null);
    const [editOrderProductSearch, setEditOrderProductSearch] = useState(''); // Estado de busca para o modal de edição
    // Estado para o frete do pedido manual
    const [manualShippingFee, setManualShippingFee] = useState(0);
    const [manualExtraFee, setManualExtraFee] = useState(0);
    // Categorias
    const[isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', icon: 'List', order: 0 });
    const [editingCatId, setEditingCatId] = useState(null);

    // Banners
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkTo: '', order: 0, isActive: true });
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [bannerImageFile, setBannerImageFile] = useState(null);
    const[uploadingBannerImage, setUploadingBannerImage] = useState(false);

    // Pedido Manual
    const[manualCart, setManualCart] = useState([]);
    const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '', deliveryMethod: 'delivery' });
    const[manualCouponCode, setManualCouponCode] = useState('');
    const [manualDiscountAmount, setManualDiscountAmount] = useState(0);

    // Uploads
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Loja (Settings)
    const [storeStatus, setStoreStatus] = useState({
        isOpen: true, 
        name: 'Carregando...',
        message: '', // Mensagem de aviso
        storeLogoUrl: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', 
        storeBannerUrl: '/fachada.jpg', // Este URL será mantido, mas o banner em si não será mais exibido no Admin
        schedule: {}, // Agenda Semanal
        slogan: '', // Adicionado para consistência
        whatsapp: '', // Adicionado para consistência
        cnpj: '', // CNPJ da Loja
    });
    const[logoFile, setLogoFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null); // Manter este para upload, mesmo que não seja exibido em settings
    const[uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false); // Manter este
    
    // Novos estados para o Nicho Personalizado
    const[customBgFile, setCustomBgFile] = useState(null);
    const[uploadingCustomBg, setUploadingCustomBg] = useState(false);

    // Promoção Relâmpago
    const [promoBannerFile1, setPromoBannerFile1] = useState(null);
    const [promoBannerFile2, setPromoBannerFile2] = useState(null);
    const[promoBannerFile3, setPromoBannerFile3] = useState(null);
    const[uploadingPromoBanner, setUploadingPromoBanner] = useState(false);

    // Fretes
    const[manualCep, setManualCep] = useState('');
    const [shippingRates, setShippingRates] = useState([]);
    const[isRateModalOpen, setIsRateModalOpen] = useState(false);
    const[rateForm, setRateForm] = useState({ neighborhood: '', fee: '', cepStart: '', cepEnd: '' });
    const[editingRateId, setEditingRateId] = useState(null);

    // Cupons
    const[coupons, setCoupons] = useState([]);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [couponForm, setCouponForm] = useState({
        code: '', type: 'percentage', value: 0, minimumOrderValue: 0,
        usageLimit: null, userUsageLimit: null, expirationDate: '',
        firstPurchaseOnly: false, active: true
    });
    const [editingCouponId, setEditingCouponId] = useState(null);

    const handleLogout = async () => {
        try { await signOut(auth); navigate('/login'); } catch (error) { console.error("Erro logout:", error); }
    };

    // --- LISTENERS FIREBASE ---
   useEffect(() => {
        if (!storeId) return;

        // PREVENÇÃO DE VAZAMENTO VISUAL: Limpa tudo antes de buscar a loja nova
        setOrders([]);
        setProducts([]);
        setCategories([]);
        setGeneralBanners([]);
        setShippingRates([]);
        setCoupons([]);
        setLoyaltyRedemptions([]);
        setReviewsList([]);
        setTeamMembers([]);

        // Pedidos
        const unsubOrders = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeId), orderBy("createdAt", "desc")), (s) => {
            s.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
                }
            });
            setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Carrinhos Abandonados
        const unsubAbandoned = onSnapshot(query(collection(db, "abandoned_carts"), where("storeId", "==", storeId), orderBy("lastUpdated", "desc")), (s) => {
            setAbandonedCarts(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Produtos
        const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Categorias
        const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))));
        
        // Banners
        const unsubGeneralBanners = onSnapshot(query(collection(db, "banners"), where("storeId", "==", storeId), orderBy("order", "asc")), (s) => setGeneralBanners(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        

        // Fretes
        const unsubShipping = onSnapshot(query(collection(db, "shipping_rates"), where("storeId", "==", storeId)), (s) => setShippingRates(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))));

        // Configurações (Promoção)
        const mkRef = doc(db, "settings", storeId);
        getDoc(mkRef).then(s => !s.exists() && setDoc(mkRef, { promoActive: false, promoBannerUrls:[], storeId: storeId }, { merge: true }));
        const unsubMk = onSnapshot(mkRef, (d) => d.exists() && setSettings(d.data()));

        // Status da Loja (Nome, Logo, Aberto/Fechado)
        const stRef = doc(db, "stores", storeId);
        getDoc(stRef).then(s => !s.exists() && setDoc(stRef, { 
            name: "Nova Loja", isOpen: true, schedule: {}, 
            message: 'Aberto!', storeLogoUrl: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', 
            storeBannerUrl: '/fachada.jpg', storeId: storeId,
            slogan: '', // Inicializa o slogan aqui também
            whatsapp: '', // Inicializa o whatsapp aqui também
        }, { merge: true }));
        
        const unsubSt = onSnapshot(stRef, (d) => {
            if (d.exists()) {
                const data = d.data();
                setStoreStatus({
                    ...data,
                    schedule: data.schedule || {}, // Garante que schedule existe
                    slogan: data.slogan || '', // Garante que slogan existe
                    whatsapp: data.whatsapp || '', // Garante que whatsapp existe
                    message: data.message || '', // Garante que message existe
                    cnpj: data.cnpj || '',
                });
            } else {
                setStoreStatus(prev => ({...prev, name: storeId}));
            }
        });
        // Monitor de Visitas de Hoje (Velo Analytics Nativo)
        const hojeAnalytics = new Date().toISOString().split('T')[0];
        const unsubVisitas = onSnapshot(doc(db, "stores", storeId, "analytics", hojeAnalytics), (d) => {
            if (d.exists()) {
                setVisitasHoje(d.data().pageViews || 0);
            } else {
                setVisitasHoje(0);
            }
        });
        // Cupons
       const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("storeId", "==", storeId)), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubLoyalty = onSnapshot(query(collection(db, "loyalty_redemptions"), where("storeId", "==", storeId)), (s) => setLoyaltyRedemptions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubReviews = onSnapshot(query(collection(db, "reviews"), where("storeId", "==", storeId)), (s) => {
            const fetched = s.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setReviewsList(fetched);
        });
        
        // --- NOVO: BUSCAR MISSÕES VIP ---
        const unsubMissions = onSnapshot(query(collection(db, "loyalty_missions"), where("storeId", "==", storeId)), (s) => {
            const fetchedMissions = s.docs.map(d => ({ id: d.id, ...d.data() }));
            fetchedMissions.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setVipMissions(fetchedMissions);
        });

        const unsubTeam = onSnapshot(query(collection(db, "team"), where("storeId", "==", storeId)), (s) => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { 
            unsubOrders(); unsubAbandoned(); unsubProducts(); unsubCategories(); unsubGeneralBanners();
            unsubShipping(); unsubMk(); unsubSt(); unsubCoupons(); unsubLoyalty(); unsubReviews(); unsubMissions(); unsubTeam();
        };
    },[storeId]);
    
    // --- FUNÇÕES AUXILIARES ---
    const uploadImageToCloudinary = async (file) => {
        if (!file) throw new Error("Selecione um arquivo primeiro!");
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Falha no upload.');
        const data = await response.json();
        return data.secure_url;
    };
const handleGenerateProductCopy = async () => {
    if (!termoIA) return alert("Digite o nome básico do produto primeiro!");
    setIsGeneratingCopy(true);
    
    try {
        const functions = getFunctions(getApp(), 'southamerica-east1');
        const gerarCopy = httpsCallable(functions, 'gerarCopyProduto'); 
        
        const result = await gerarCopy({ 
            termoRaw: termoIA, 
            lojaNome: storeStatus.name,
            lojaNicho: storeStatus.storeNiche,
            lojaLocalizacao: storeStatus.address
        });
        
        setForm(prev => ({
            ...prev,
            name: result.data.nome || prev.name,
            description: result.data.descricao || prev.description
        }));
        
        setTermoIA(''); 
    } catch (error) {
        console.error("Erro na IA:", error);
        alert("Erro ao otimizar produto. Tente novamente.");
    } finally {
        setIsGeneratingCopy(false);
    }
};
    const handleProductImageUpload = async () => {
        setUploading(true); setUploadError('');
        try {
            const url = await uploadImageToCloudinary(imageFile);
            setForm(prev => ({ ...prev, imageUrl: url }));
            setImageFile(null);
        } catch (error) { console.error(error); setUploadError('Erro ao enviar imagem.'); } 
        finally { setUploading(false); }
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return; setUploadingLogo(true);
        try {
            const url = await uploadImageToCloudinary(logoFile);
            await updateDoc(doc(db, "stores", storeId), { storeLogoUrl: url }); 
            setLogoFile(null); alert("Logo atualizada!");
        } catch (e) { alert("Erro upload logo"); } setUploadingLogo(false);
    };

    const handleCustomBgUpload = async () => {
        if (!customBgFile) return; 
        setUploadingCustomBg(true);
        try {
            const url = await uploadImageToCloudinary(customBgFile);
            await updateDoc(doc(db, "stores", storeId), { customBackgroundUrl: url }, { merge: true }); 
            setCustomBgFile(null); 
            alert("Imagem de fundo personalizada salva com sucesso!");
        } catch (e) { alert("Erro no upload do fundo personalizado"); } 
        setUploadingCustomBg(false);
    };

    const handlePromoBannerUpload = async () => {
        setUploadingPromoBanner(true);
        const currentUrls = [...(settings.promoBannerUrls || [])];
        const newUrls =[...currentUrls]; 

        const uploadPromises =[];

        const processSlot = async (file, index) => {
            if (file) { 
                try {
                    const url = await uploadImageToCloudinary(file);
                    newUrls[index] = url; 
                } catch (e) {
                    console.error(`Erro ao enviar banner ${index + 1}:`, e);
                }
            } else { 
                 if (newUrls[index] === undefined) {
                    newUrls[index] = null; 
                }
            }
        };

        uploadPromises.push(processSlot(promoBannerFile1, 0));
        uploadPromises.push(processSlot(promoBannerFile2, 1));
        uploadPromises.push(processSlot(promoBannerFile3, 2));

        await Promise.all(uploadPromises); 

        const finalPromoBannerUrls = newUrls.filter(url => url !== null && url !== undefined);

        try {
            await updateDoc(doc(db, "settings", storeId), { promoBannerUrls: finalPromoBannerUrls }, { merge: true });
            setPromoBannerFile1(null);
            setPromoBannerFile2(null);
            setPromoBannerFile3(null);
            alert("Banners de promoção salvos!");
        } catch (e) {
            console.error("Erro ao salvar banners de promoção no Firestore:", e);
            alert("Erro ao salvar banners de promoção.");
        } finally {
            setUploadingPromoBanner(false);
        }
    };

    const handleGeneralBannerImageUpload = async () => {
        setUploadingBannerImage(true);
        try {
            const url = await uploadImageToCloudinary(bannerImageFile);
            setBannerForm(prev => ({ ...prev, imageUrl: url }));
            setBannerImageFile(null);
        } catch (error) { alert('Erro ao enviar imagem.'); } finally { setUploadingBannerImage(false); }
    };

    // --- ATUALIZAÇÃO DA AGENDA SEMANAL ---
    const handleScheduleChange = (dayId, field, value) => {
        const currentSchedule = storeStatus.schedule || {};
        const newSchedule = {
            ...currentSchedule,[dayId]: {
                ...currentSchedule[dayId],
                [field]: value
            }
        };
        // Atualiza localmente para feedback rápido
        setStoreStatus(prev => ({ ...prev, schedule: newSchedule }));
        // Salva no Firebase
        updateDoc(doc(db, "stores", storeId), { schedule: newSchedule });
    };
// --- GERENCIAMENTO DE ZONAS POR RAIO (KM) ---
    const handleAddDeliveryZone = () => {
        const currentZones = storeStatus.delivery_zones ||[];
        const newZone = { radius_km: '', fee: '' };
        const updatedZones = [...currentZones, newZone];
        setStoreStatus(prev => ({ ...prev, delivery_zones: updatedZones }));
    };

    const handleUpdateDeliveryZone = (index, field, value) => {
        const currentZones = [...(storeStatus.delivery_zones || [])];
        currentZones[index][field] = Number(value);
        setStoreStatus(prev => ({ ...prev, delivery_zones: currentZones }));
    };

    const handleRemoveDeliveryZone = (index) => {
        const currentZones = [...(storeStatus.delivery_zones || [])];
        currentZones.splice(index, 1);
        setStoreStatus(prev => ({ ...prev, delivery_zones: currentZones }));
    };

    const handleSaveDeliveryZones = async () => {
        try {
            // Ordena do menor raio para o maior (Fundamental para a lógica do frontend)
            const sortedZones = [...(storeStatus.delivery_zones || [])]
                .filter(z => z.radius_km > 0 && z.fee >= 0)
                .sort((a, b) => a.radius_km - b.radius_km);
            
            await updateDoc(doc(db, "stores", storeId), { 
                delivery_zones: sortedZones,
                lat: Number(storeStatus.lat) || null,
                lng: Number(storeStatus.lng) || null
            });
            setStoreStatus(prev => ({ ...prev, delivery_zones: sortedZones }));
            alert("Zonas de entrega e localização salvas com sucesso!");
        } catch (error) {
            alert("Erro ao salvar zonas: " + error.message);
        }
    };
    const printLabel = (o) => {
        const w = window.open('', '_blank');
        const itemsHtml = (o.items ||[]).map(i => `<li style="margin-bottom: 4px;">• <strong>${i.quantity}x ${i.name} (R$ ${Number(i.price || 0).toFixed(2)} un)</strong> ${i.observation ? `<br><span style="font-size: 12px; border: 1px solid #000; padding: 2px 4px; display: inline-block; margin-top: 2px;"><strong>OBS:</strong> ${i.observation}</span>` : ''}</li>`).join('');
        const pagto = { pix: 'PIX', cartao: 'CARTÃO', dinheiro: 'DINHEIRO' }[o.paymentMethod] || o.paymentMethod || 'PIX';
        
        // Formata a data
        const dataPedido = o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

        const gerarVia = (titulo, temCorte) => `
            <div style="width: 280px; padding: 10px; font-family: sans-serif; border-bottom: ${temCorte ? '2px dashed #000' : 'none'}; padding-bottom: 20px; margin-bottom: 40px;">
                <center>
                    <small>-- ${titulo} --</small>
                    <h2>${storeStatus.name || 'DELIVERY'}</h2>
                    <small>${dataPedido}</small>
                </center>
                <hr>
                <strong>PEDIDO:</strong> #${o.id?.slice(-5).toUpperCase()}<br>
                <strong>CLIENTE:</strong> ${o.customerName}<br>
                ${o.tipo === 'local' ? `<strong>MESA:</strong> ${o.mesa}<br><strong>GARÇOM:</strong> ${o.waiterName || 'Não identificado'}<br>` : `<strong>TEL:</strong> ${o.customerPhone || o.phone || ''}<br><strong>ENDEREÇO:</strong> ${o.address || o.customerAddress || 'Retirada'}<br>`}
                <strong>PAGTO:</strong> ${pagto}<br>
                ${o.customerChangeFor ? `<p><strong>TROCO PARA:</strong> ${o.customerChangeFor}</p>` : ''}
                <hr>
                <ul style="list-style:none; padding:0;">${itemsHtml}</ul>
                <hr>
                
                ${o.observation ? `<div style="background:#eee; padding:5px; margin: 10px 0; border:1px solid #000;"><strong>OBS: ${o.observation}</strong></div>` : ''}

                <div style="text-align:right; font-size:18px;">
                    <small>Frete: R$ ${Number(o.shippingFee || 0).toFixed(2)}</small><br>
                    ${o.discountAmount > 0 ? `<small>Desconto: - R$ ${Number(o.discountAmount).toFixed(2)}</small><br>` : ''}
                    <strong>TOTAL: R$ ${Number(o.total || 0).toFixed(2)}</strong>
                </div>
                ${temCorte ? '<center><br>✂--- CORTE AQUI ---✂</center>' : ''}
            </div>
        `;
        w.document.write(`<html><body style="margin:0; padding:0;">${gerarVia('VIA DA LOJA', true)}${gerarVia('VIA DO ENTREGADOR', false)}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>`);
        w.document.close();
    };

    const updateStatusAndNotify = async (order, newStatus) => {
    await updateDoc(doc(db, "orders", order.id), { status: newStatus });
    
    // --- GAMIFICAÇÃO: CRÉDITO AUTOMÁTICO DE CASHBACK (WALLET REAL) ---
    if (newStatus === 'completed' && settings?.gamification?.cashback && order.customerPhone) {
        if (!order.cashbackAwarded) {
            try {
                const cashbackEarned = (Number(order.total) || 0) * 0.02; // Fração de 2%
                if (cashbackEarned > 0) {
                    const cleanPhone = String(order.customerPhone).replace(/\D/g, '');
                    const walletRef = doc(db, "wallets", `${storeId}_${cleanPhone}`);
                    const walletSnap = await getDoc(walletRef);
                    
                    if (walletSnap.exists()) {
                        await updateDoc(walletRef, { balance: increment(cashbackEarned), lastUpdated: serverTimestamp() });
                    } else {
                        await setDoc(walletRef, { storeId, customerPhone: cleanPhone, customerName: order.customerName, balance: cashbackEarned, lastUpdated: serverTimestamp() });
                    }
                    // Trava de segurança para não dar cashback duas vezes no mesmo pedido
                    await updateDoc(doc(db, "orders", order.id), { cashbackAwarded: true });
                }
            } catch (e) { console.error("Erro ao creditar cashback:", e); }
        }
    }
    // -----------------------------------------------------------------

    const lojaNome = storeStatus.name || "Velo Delivery";
    
    // Cria o link dinâmico de avaliação direto para o app do cliente
    const reviewLink = `https://${window.location.host}/track/${order.id}`;

    const messages = {
        preparing: `👨‍🍳 *PEDIDO EM PREPARO!* \n\nOlá ${order.customerName.split(' ')[0]}, seu pedido foi recebido e já está sendo preparado aqui na *${lojaNome}*.`,
        delivery: `🏍️ *SAIU PARA ENTREGA!* \n\nO motoboy já está a caminho com o seu pedido #${order.id.slice(-5).toUpperCase()}.`,
        
        // MENSAGEM NOVA: Focada em conversão para o Clube VIP
        completed: `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega. Muito obrigado pela preferência! ❤️ \n\n🎁 *Ganhe Prêmios e Descontos!* \nAcesse agora o nosso app e entre no Clube VIP para ganhar pontos na faixa: \n👉 https://${window.location.host}`,
        
        canceled: `❌ *PEDIDO CANCELADO* \n\nO pedido #${order.id.slice(-5).toUpperCase()} foi cancelado.`
    };

    if (messages[newStatus]) {
        const phone = String(order.customerPhone).replace(/\D/g, ''); 
        if(phone) window.open(`https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${encodeURIComponent(messages[newStatus])}`, '_blank');
    }
};

    // --- NOVAS FUNÇÕES: APROVAR/RECUSAR MISSÕES VIP ---
    const handleMissionAction = async (mission, action) => {
        const confirmMsg = action === 'approved' ? "Aprovar missão e creditar pontos ao cliente?" : "Recusar esta missão?";
        if (!window.confirm(confirmMsg)) return;

        try {
            // Se for avaliação no app e foi aprovada, publica o review na loja!
            if (action === 'approved' && mission.missionType === 'internal_review') {
                await addDoc(collection(db, "reviews"), {
                    storeId: mission.storeId,
                    orderId: mission.orderId,
                    customerName: mission.customerName,
                    rating: mission.rating,
                    comment: mission.comment || 'Avaliação via Clube VIP',
                    createdAt: serverTimestamp()
                });
            }

            // Atualiza a missão e credita os pontos (pointsAwarded)
            await updateDoc(doc(db, "loyalty_missions", mission.id), { 
                status: action,
                pointsAwarded: action === 'approved' ? mission.pointsExpected : 0,
                resolvedAt: serverTimestamp()
            });
            alert(`Missão ${action === 'approved' ? 'Aprovada! Pontos creditados.' : 'Recusada.'}`);
        } catch (error) {
            alert("Erro ao processar a missão.");
            console.error(error);
        }
    };

    const handleAddQuantityDiscount = () => setForm(prev => ({ ...prev, quantityDiscounts:[...prev.quantityDiscounts, { minQuantity: 1, type: 'percentage', value: 0, description: '' }] }));
    const handleUpdateQuantityDiscount = (index, field, value) => { const newDiscounts = [...form.quantityDiscounts]; newDiscounts[index][field] = value; setForm(prev => ({ ...prev, quantityDiscounts: newDiscounts })); };
    const handleRemoveQuantityDiscount = (index) => setForm(prev => ({ ...prev, quantityDiscounts: prev.quantityDiscounts.filter((_, i) => i !== index) }));

    const handleSaveGeneralBanner = async (e) => {
        e.preventDefault();
        const dataToSave = { ...bannerForm, order: Number(bannerForm.order), storeId: storeId };
        try {
            if (editingBannerId) await updateDoc(doc(db, "banners", editingBannerId), dataToSave);
            else await addDoc(collection(db, "banners"), dataToSave);
            setIsBannerModalOpen(false); alert("Banner salvo!");
        } catch (error) { alert("Erro ao salvar banner."); console.error(error); }
    };

    const handleInitialSetup = async () => {
        if (!window.confirm("Isso vai criar todos os dados iniciais da sua loja. Confirmar?")) return;
        
        try {
            const batchPromises =[];
            
            // --- CORREÇÃO DE SEGURANÇA (FIX) ---
            // Se 'store' for null (loja nova), usamos o storeId da URL para gerar o nome
            const safeName = (store && store.name) ? store.name : (storeId ? storeId.replace(/-/g, ' ').toUpperCase() : "Minha Loja Nova");
            const safePhone = (store && store.phone) ? store.phone : "";
            // -----------------------------------

            // 1. Configurações da Loja (Base CSI)
            const storeConfig = {
                name: safeName, // Usamos a variável segura aqui
                slug: storeId,
                logoUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png", 
                storeBannerUrl: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1200&q=80", 
                primaryColor: "#2563eb",
                whatsapp: safePhone, // Usamos a variável segura aqui
                slogan: "Sua adega online 24h.",
                message: "🎉 Loja Aberta! Aproveite as ofertas.",
                isOpen: true,
                schedule: {
                    0: { open: true, start: "10:00", end: "22:00" }, 
                    1: { open: false, start: "08:00", end: "23:00" }, 
                    2: { open: true, start: "08:00", end: "23:00" }, 
                    3: { open: true, start: "08:00", end: "23:00" }, 
                    4: { open: true, start: "08:00", end: "23:00" }, 
                    5: { open: true, start: "08:00", end: "02:00" }, 
                    6: { open: true, start: "08:00", end: "02:00" }  
                }
            };
            
            // Salva/Cria a loja no Firestore
            await setDoc(doc(db, "stores", storeId), storeConfig, { merge: true });

            // 2. Configurações de Marketing (Promoção Ativa)
            await setDoc(doc(db, "settings", storeId), {
                promoActive: true,
                promoBannerUrls:[
                    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80", 
                    "https://images.unsplash.com/photo-1600216496561-122972989e27?auto=format&fit=crop&w=800&q=80"  
                ]
            }, { merge: true });

            // 3. Categorias
            const cats =[
                { name: "Cervejas", order: 1, storeId },
                { name: "Destilados", order: 2, storeId },
                { name: "Gelo e Carvão", order: 3, storeId },
                { name: "Combos", order: 4, storeId }
            ];
            for (const c of cats) batchPromises.push(addDoc(collection(db, "categories"), c));

            // 4. Produtos (Catálogo Base)
            const prods =[
                { name: "Heineken Long Neck 330ml", price: 9.90, costPrice: 4.50, promotionalPrice: 8.90, stock: 120, category: "Cervejas", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405597.png", storeId, description: "Cerveja Premium gelada." },
                { name: "Cerveja Corona Extra 330ml", price: 8.50, costPrice: 4.00, promotionalPrice: 0, stock: 60, category: "Cervejas", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405597.png", storeId, description: "Com limão fica melhor." },
                { name: "Vodka Absolut 1L", price: 119.90, costPrice: 70.00, promotionalPrice: 0, stock: 15, category: "Destilados", imageUrl: "https://cdn-icons-png.flaticon.com/512/920/920582.png", storeId, description: "Vodka importada original." },
                { name: "Whisky Red Label 1L", price: 139.90, costPrice: 85.00, promotionalPrice: 0, stock: 10, category: "Destilados", imageUrl: "https://cdn-icons-png.flaticon.com/512/920/920582.png", storeId, description: "O clássico." },
                { name: "Gelo em Cubos 5kg", price: 15.00, costPrice: 8.00, promotionalPrice: 0, stock: 50, category: "Gelo e Carvão", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405479.png", storeId, description: "Gelo filtrado." },
                { name: "Carvão Vegetal 4kg", price: 22.00, costPrice: 12.00, promotionalPrice: 0, stock: 30, category: "Gelo e Carvão", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405479.png", storeId, description: "Acende fácil." },
                { name: "Combo Esquenta (Vodka + Energético)", price: 149.90, costPrice: 95.00, promotionalPrice: 139.90, stock: 20, category: "Combos", imageUrl: "https://cdn-icons-png.flaticon.com/512/2405/2405597.png", storeId, description: "1 Absolut + 4 Energéticos 2L" }
            ];
            for (const p of prods) batchPromises.push(addDoc(collection(db, "products"), p));

            // 5. Taxas de Entrega (Bairros Exemplo)
            const rates =[
                { neighborhood: "Centro", fee: 5.00, storeId },
                { neighborhood: "Bairro Norte", fee: 8.00, storeId },
                { neighborhood: "Bairro Sul", fee: 10.00, storeId },
                { neighborhood: "Zona Rural", fee: 20.00, storeId }
            ];
            for (const r of rates) batchPromises.push(addDoc(collection(db, "shipping_rates"), r));

            // 6. Banners Gerais (Carrossel)
            const banners =[
                { imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80", linkTo: "#", order: 1, isActive: true, storeId },
                { imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1000&q=80", linkTo: "#", order: 2, isActive: true, storeId }
            ];
            for (const b of banners) batchPromises.push(addDoc(collection(db, "banners"), b));

            // Executa tudo
            await Promise.all(batchPromises);
            
            alert("✨ LOJA GERADA COM SUCESSO! \nRecarregando para você ver a mágica...");
            window.location.reload();

        } catch (e) {
            console.error(e);
            alert("Erro ao gerar loja: " + e.message);
        }
    };
    const handleRedeemPoints = async (customer) => {
        // Pega a meta de pontos das configurações, com um fallback seguro
        const loyaltyGoal = settings.loyaltyGoal || 1000; 

        const confirmationMessage = `Confirma o resgate de ${loyaltyGoal} pontos para o cliente ${customer.name}? 
Esta ação registrará o prêmio como "pago" e não pode ser desfeita.`;

        if (window.confirm(confirmationMessage)) {
            try {
                // Adiciona um novo documento na coleção de resgates
                await addDoc(collection(db, "loyalty_redemptions"), {
                    storeId: storeId,
                    customerPhone: customer.phone, // Usamos o telefone como ID único do cliente
                    customerName: customer.name,
                    pointsRedeemed: loyaltyGoal,
                    redeemedAt: serverTimestamp()
                });
                alert("Resgate de prêmio registrado com sucesso!");
            } catch (error) {
                console.error("Erro ao registrar resgate de fidelidade:", error);
                alert("Ocorreu uma falha ao registrar o resgate. Tente novamente.");
            }
        }
    };
    // ✅ LÓGICA DE CLIENTES REFEITA PARA INTEGRAR CLUBE FIDELIDADE
    const customers = React.useMemo(() => {
        const loyaltyEnabled = settings.loyaltyActive;
        const pointsPerReal = settings.pointsPerReal || 1;
        const loyaltyGoal = settings.loyaltyGoal || 1000;

        const spendingByCustomer = orders.reduce((acc, o) => {

            if (o.status === 'canceled') return acc; // Ignora pedidos cancelados
            const p = o.customerPhone || 'N/A';
            if (p === 'N/A') return acc;

            if (!acc[p]) {
                acc[p] = { name: o.customerName || 'Sem nome', phone: p, totalSpent: 0, orderCount: 0 };
            }
            acc[p].totalSpent += Number(o.total || 0);
            acc[p].orderCount += 1;
            return acc;
        }, {});

        // 2. Agrega o total de pontos já resgatados por cliente
        const redemptionsByCustomer = loyaltyRedemptions.reduce((acc, r) => {
            const phone = r.customerPhone || 'N/A';
            acc[phone] = (acc[phone] || 0) + r.pointsRedeemed;
            return acc;
        }, {});

        // 3. Combina os dados, calcula os pontos atuais e retorna o array final
        const customerList = Object.values(spendingByCustomer).map(customer => {
            const totalEarnedPoints = Math.floor(customer.totalSpent * pointsPerReal);
            const totalRedeemedPoints = redemptionsByCustomer[customer.phone] || 0;
            const currentPoints = totalEarnedPoints - totalRedeemedPoints;

            return {
                ...customer,
                points: currentPoints,
                loyaltyGoal: loyaltyGoal, // Adiciona a meta ao objeto para fácil acesso no JSX
            };
        });

        // 4. Ordena por pontos se o clube estiver ativo, senão, por total gasto
        return customerList.sort((a, b) => loyaltyEnabled ? b.points - a.points : b.totalSpent - a.totalSpent);
        
    }, [orders, loyaltyRedemptions, settings]);

    // --- ALTERAÇÃO INICIADA: FUNÇÕES PARA MANIPULAR ITENS NO MODAL DE EDIÇÃO ---
    const handleAddProductToEditingOrder = (productToAdd) => {
        // 1. Trava inicial: Verifica se tem estoque
        if (productToAdd.stock === undefined || Number(productToAdd.stock) <= 0) {
            return alert(`⚠️ O produto ${productToAdd.name} está esgotado!`);
        }

        setEditingOrderData(prevOrder => {
            if (!prevOrder) return null;
            const existingItem = prevOrder.items.find(item => item.id === productToAdd.id);
            
            let newItems;
            if (existingItem) {
                // 2. Trava de incremento: Verifica se já atingiu o limite do estoque
                if (existingItem.quantity >= Number(productToAdd.stock)) {
                    alert(`⚠️ Estoque máximo atingido! Restam apenas ${productToAdd.stock} unid. deste item.`);
                    return prevOrder; 
                }

                newItems = prevOrder.items.map(item =>
                    item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                newItems =[...prevOrder.items, { ...productToAdd, quantity: 1 }];
            }
            return { ...prevOrder, items: newItems };
        });
    };

    const handleUpdateItemQuantityInEditingOrder = (itemId, newQuantity) => {
        setEditingOrderData(prevOrder => {
            if (!prevOrder) return null;

            // Busca o produto original na lista de estoque para validar o limite real
            const originalProduct = products.find(p => p.id === itemId);

            // Trava para o botão de "+"
            if (originalProduct && newQuantity > Number(originalProduct.stock)) {
                alert(`⚠️ Estoque máximo atingido! Restam apenas ${originalProduct.stock} unid. de ${originalProduct.name}.`);
                return prevOrder; 
            }

            let newItems;
            if (newQuantity <= 0) {
                newItems = prevOrder.items.filter(item => item.id !== itemId);
            } else {
                newItems = prevOrder.items.map(item =>
                    item.id === itemId ? { ...item, quantity: newQuantity } : item
                );
            }
            return { ...prevOrder, items: newItems };
        });
    };

    const handleRemoveItemFromEditingOrder = (itemId) => {
        setEditingOrderData(prevOrder => {
            if (!prevOrder) return null;
            return {
                ...prevOrder,
                items: prevOrder.items.filter(item => item.id !== itemId)
            };
        });
    };
    // --- ALTERAÇÃO FINALIZADA ---

    // ✅ FUNÇÃO MOVIDA PARA O ESCOPO CORRETO E GLOBAL (ATUALIZADA COM MAPAS)
    const handleManualCepSearch = async () => {
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            // 1. Busca os dados da rua no ViaCEP
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setManualCustomer(prev => ({
                    ...prev,
                    address: `${data.logradouro}, `, 
                    neighborhood: data.bairro
                }));

                // 2. TENTA USAR O CÁLCULO POR KM (GOOGLE MAPS)
                const storeLat = storeStatus?.lat;
                const storeLng = storeStatus?.lng;
                const zones = storeStatus?.delivery_zones || [];
                const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
                                const matchedZone = [...zones]
                                    .sort((a, b) => a.radius_km - b.radius_km)
                                    .find(z => distanceKm <= z.radius_km);

                                if (matchedZone) {
                                    setManualShippingFee(Number(matchedZone.fee));
                                    alert(`🗺️ Frete de R$ ${Number(matchedZone.fee).toFixed(2)} calculado pelo Mapa! (Distância: ${distanceKm.toFixed(1)}km)`);
                                    return; // Para a execução aqui se achou no mapa!
                                } else {
                                    alert(`⚠️ Cliente está a ${distanceKm.toFixed(1)}km. Fora das zonas de entrega configuradas no mapa.`);
                                    setManualShippingFee(0);
                                    return;
                                }
                            }
                        }
                    } catch (geoError) {
                        console.warn("Falha no Google Maps, tentando Fallback para Tabela de CEPs...");
                    }
                }

                // 3. FALLBACK: SE O MAPA FALHAR OU NÃO TIVER ZONAS, USA A TABELA ANTIGA
                const cepNum = parseInt(cleanCep);
                const rateByRange = shippingRates.find(r => {
                    if (r.cepStart && r.cepEnd) {
                        let startStr = String(r.cepStart).replace(/\D/g, '');
                        let endStr = String(r.cepEnd).replace(/\D/g, '');
                        if (startStr && endStr) {
                            startStr = startStr.padEnd(8, '0');
                            endStr = endStr.padEnd(8, '9');
                            const start = parseInt(startStr);
                            const end = parseInt(endStr);
                            if (cepNum >= start && cepNum <= end) return true;
                        }
                    }
                    return false;
                });

                if (rateByRange) {
                    setManualShippingFee(parseFloat(rateByRange.fee));
                    alert(`✅ Frete de R$ ${parseFloat(rateByRange.fee).toFixed(2)} encontrado por Faixa de CEP!`);
                    return;
                }

                const removeAcentos = (str) => str ? String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
                const rateByName = shippingRates.find(r => {
                    const rateName = removeAcentos(r.neighborhood);
                    const viaCepBairro = removeAcentos(data.bairro);
                    const viaCepCidade = removeAcentos(data.localidade);
                    if (rateName) {
                        if (rateName === viaCepBairro || rateName === viaCepCidade) return true;
                        if (viaCepBairro && (viaCepBairro.includes(rateName) || rateName.includes(viaCepBairro))) return true;
                    }
                    return false;
                });

                if (rateByName) {
                    setManualShippingFee(parseFloat(rateByName.fee));
                    alert(`✅ Frete de R$ ${parseFloat(rateByName.fee).toFixed(2)} encontrado por Nome do Bairro!`);
                } else {
                    setManualShippingFee(0);
                    alert("⚠️ Endereço carregado, mas nenhuma taxa foi encontrada nem no Mapa nem na Tabela.");
                }
            } else {
                alert("CEP não encontrado!");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            alert("Ocorreu um erro ao consultar o CEP.");
        }
    };
// --- LÓGICA GLOBAL DO FECHAMENTO DE CAIXA / RELATÓRIO ---
    const getFilteredOrdersForReport = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return orders.filter(o => {
            // Ignora cancelados
            if (o.status === 'canceled' || !o.createdAt) return false;

            // FILTRO 1: VENDEDOR / ORIGEM
            if (reportSeller === 'online' && o.source === 'manual') return false;
            
            // Se escolheu um vendedor específico (incluindo o dono), ignora os pedidos do App (online) 
            // e os pedidos manuais que não foram feitos por aquele email
            if (reportSeller !== 'todos' && reportSeller !== 'online') {
                if (o.source !== 'manual') return false;
                if (o.sellerEmail !== reportSeller) return false;
            }
            
            // FILTRO 2: DATA
            const orderDate = o.createdAt.toDate();
            
            if (reportDateRange === 'hoje') {
                return orderDate >= startOfToday;
            } else if (reportDateRange === '7dias') {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                return orderDate >= sevenDaysAgo;
            } else if (reportDateRange === '30dias') {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                return orderDate >= thirtyDaysAgo;
            } else if (reportDateRange === 'mes') {
                return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const filteredReportOrders = getFilteredOrdersForReport();
    
    const reportTotals = {
        pix: filteredReportOrders.filter(o => o.paymentMethod === 'pix' || o.paymentMethod === 'offline_pix').reduce((acc, o) => acc + Number(o.total || 0), 0),
        cartao: filteredReportOrders.filter(o => o.paymentMethod === 'cartao' || o.paymentMethod === 'offline_credit_card' || o.paymentMethod === 'motoboy_card').reduce((acc, o) => acc + Number(o.total || 0), 0),
        dinheiro: filteredReportOrders.filter(o => o.paymentMethod === 'dinheiro').reduce((acc, o) => acc + Number(o.total || 0), 0),
        totalGeral: filteredReportOrders.reduce((acc, o) => acc + Number(o.total || 0), 0),
        qtdPedidos: filteredReportOrders.length
    };
    // --------------------------------------------------------
    // RENDERIZAÇÃO PRINCIPAL
    if (products.length === 0 && activeTab === 'dashboard') {
        const leadPhone = new URLSearchParams(window.location.search).get('phone');
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="animate-bounce mb-4 text-6xl">🚀</div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 italic tracking-tighter uppercase">Olá, {leadPhone ? 'Parceiro' : 'Empreendedor'}!</h1>
                    <p className="text-xl text-slate-600">O ambiente da sua loja <b>"{storeId}"</b> foi criado.<br/>Para começar a vender, precisamos gerar seu catálogo.</p>
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-blue-50 transform hover:scale-105 transition-all cursor-pointer" onClick={handleInitialSetup}>
                        <h2 className="text-2xl font-black text-blue-600 mb-2">⚡ Setup Automático</h2>
                        <p className="text-slate-400 mb-6 font-bold text-sm">Clique para gerar produtos e configurações.</p>
                        <button 
                                onClick={async (e) => {
                                    e.stopPropagation(); // Impede que o clique na div externa seja acionado
                                    const user = auth.currentUser;
                                    // 1. SEGURANÇA: Se não estiver logado, manda pro login
                                    if (!user) {
                                        alert("Por favor, faça login ou crie uma conta para salvar sua loja!");
                                        // Manda pro login levando o ID da loja junto para não perder
                                        window.location.href = `/login?store=${storeId || ''}&redirect=admin`;
                                        return;
                                    }

                                    // 2. SE ESTIVER LOGADO, CRIA A LOJA (Código Original Protegido)
                                    try {
                                        
                                        await setDoc(doc(db, "stores", storeId), {
                                            name: storeId.replace(/-/g, ' ').toUpperCase(), // Gera nome bonito baseado no ID
                                            ownerId: user.uid,
                                            ownerEmail: user.email,
                                            ownerName: user.displayName || user.email || "Empreendedor",
                                            createdAt: serverTimestamp(),
                                            products:[], // Começa sem produtos para não bugar
                                            // ... configurações padrão ...
                                            settings: {
                                                primaryColor: '#60a5fa',
                                                storeType: 'conveniencia'
                                            }
                                        }, { merge: true });

                                        // Atualiza o perfil do usuário para dizer que ele é dono dessa loja
                                        await setDoc(doc(db, "users", user.uid), {
                                            storeId: storeId,
                                            isOwner: true
                                        }, { merge: true });

                                        handleInitialSetup();

                                    } catch (error) {
                                        console.error("Erro ao criar:", error);
                                        alert("Erro ao criar loja: " + error.message);
                                        
                                    }
                                }}
                                className="w-full py-4 bg-indigo-900 text-white font-black rounded-xl hover:bg-indigo-800 transition-all shadow-lg text-lg uppercase tracking-widest"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto"/> : "CRIAR E GERAR CATÁLOGO 🚀"}
                            </button>
                    </div>
                </div>
            </div>
        );
    }
    // --- FUNÇÃO DE ACEITE DOS TERMOS (NOVO) ---
    const handleAcceptTerms = async () => {
        if (!storeId) return;
        try {
            await updateDoc(doc(db, "stores", storeId), {
                termsAccepted: true,
                termsAcceptedAt: serverTimestamp(),
                termsVersion: "v1.0-manifesto"
            });
           // Atualiza o estado local para fechar o modal na hora
            setStoreStatus(prev => ({ ...prev, termsAccepted: true }));
            alert("Termos aceitos! Bem-vindo à Velo.");
            window.location.reload(); // Força o reload para limpar o modal e entrar no Dashboard
        } catch (error) {
            console.error("Erro ao aceitar termos:", error);
            alert("Erro ao salvar aceite via banco de dados.");
        }
    };
    
   // --- NOVA LÓGICA DE UX PARA SEO / LOGÍSTICA ---
    const isFoodCategory = (categoryName) => {
        if (!categoryName) return true; 
        const convenienceKeywords =['bebida', 'bebidas', 'energético', 'energetico', 'cerveja', 'cervejas', 'chopp', 'destilado', 'destilados', 'vodka', 'gin', 'água', 'agua', 'suco', 'sucos', 'refrigerante', 'snack', 'snacks', 'bomboniere', 'conveniência', 'conveniencia', 'gelo', 'tabacaria', 'cigarro', 'vape', 'doce', 'doces', 'chocolate', 'padaria', 'mercado', 'empório', 'adega'];
        const normalizedCategory = categoryName.toLowerCase().trim();
        return !convenienceKeywords.some(keyword => normalizedCategory.includes(keyword));
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
            <aside className="w-64 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col sticky top-0 h-screen">
                <div className="flex flex-col items-center mb-10">
                    <img src={storeStatus.storeLogoUrl} className="h-16 w-16 rounded-full border-4 border-blue-50 mb-4 object-cover" onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/606/606197.png"} />
                    <p className="text-[10px] font-bold text-blue-600 uppercase text-center">{storeStatus.name}</p>
                    {storeStatus.slogan && <p className="text-[9px] text-slate-400 font-medium text-center mt-1">{storeStatus.slogan}</p>}
                </div>
                <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
                    {allNavItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                {item.icon} {item.name}
                            </button>
                        ))}
                </nav>
                {/* Versão do App na barra lateral do desktop */}
                {/* Versão do App na barra lateral do desktop */}
                <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="text-[9px] font-medium text-slate-400 text-center">Veloapp V7.1</div>
                    <button onClick={() => setIsUpdateModalOpen(true)} className="flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full transition-all">
                        <RefreshCw size={10} /> Atualizar Painel
                    </button>
                </div>
                <div className="mt-auto pt-4"> {/* Empurra para o fundo */}
                    {storeId && (
                        <a 
                            href={`https://${storeId}.velodelivery.com.br`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold text-[10px] uppercase hover:bg-blue-100 transition-all mb-2"
                        >
                            <ExternalLink size={18} /> Ver Loja Online
                        </a>
                    )}
                </div>
                <button onClick={handleLogout} className="mt-6 w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase"><LogOut size={18} /> Sair</button>
            </aside>

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
                {storeId && (
                    <div className="lg:hidden mb-6">
                        <a 
                            href={`https://${storeId}.velodelivery.com.br`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            <ExternalLink size={20} /> Acessar Minha Loja
                        </a>
                    </div>
                )}
                {activeTab === 'dashboard' && (() => {
                    const totalProducts = products.length;
                    const totalOrders = orders.length;
                    const totalCustomers = customers.length;
                    const manualOrdersCount = orders.filter(o => o.source === 'manual').length;
                    const storefrontOrdersCount = orders.filter(o => o.source !== 'manual').length; 

                    // PASSO 5: Cálculo do Lucro Real (RESTAURADO)
                    const todaysProfit = orders
                        .filter(o => o.status !== 'canceled' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString())
                        .reduce((totalProfit, order) => {
                            const orderProfit = (order.items ||[]).reduce((itemProfit, item) => {
                                const salePrice = item.price || 0;
                                const costPrice = item.costPrice || 0;
                                const quantity = item.quantity || 0;
                                return itemProfit + (salePrice - costPrice) * quantity;
                            }, 0);
                            return totalProfit + orderProfit;
                        }, 0);

                    return (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase">Visão Geral</h1>
                                <button onClick={() => setIsReportModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95">
                                    <Printer size={20}/> Fechar Caixa / Relatório
                                </button>
                            </div>
                            {/* --- BANNER DE AVISO: TESTE OU FATURA --- */}
                            {trialInfo.isTrial && storeStatus.paymentStatus !== 'paid' && (
                                <div className="bg-blue-50 border border-blue-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                    <div>
                                        <h3 className="text-blue-800 font-black flex items-center gap-2 text-lg"><Clock size={20} /> PERÍODO DE TESTE ATIVO</h3>
                                        <p className="text-blue-600 font-bold text-sm">Você tem {trialInfo.daysLeft} dias restantes de uso gratuito. Adicione um cartão para não pausar suas vendas.</p>
                                    </div>
                                    <button onClick={() => setActiveTab('finance')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap">
                                        Ver Fatura
                                    </button>
                                </div>
                            )}

                            {trialInfo.isOverdue && (
                                <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm animate-pulse">
                                    <div>
                                        <h3 className="text-red-700 font-black flex items-center gap-2 text-lg"><Server size={20} /> FATURA EM ABERTO</h3>
                                        <p className="text-red-600 font-bold text-sm">Seu período de teste expirou. Regularize sua fatura para evitar a suspensão da loja.</p>
                                    </div>
                                    <button onClick={() => setActiveTab('finance')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap">
                                        Pagar Agora
                                    </button>
                                </div>
                            )}
                            {/* -------------------------------------- */}
                            {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).length > 0 && (
                                <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] animate-pulse">
                                    <h3 className="text-red-600 font-black flex items-center gap-2"><Flame size={20} /> ALERTA: ESTOQUE CRÍTICO</h3>
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).map(p => <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100">{p.name} ({p.stock} un)</span>)}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 z-10 relative">Visitas Hoje</p>
    <p className="text-4xl font-black text-indigo-500 italic z-10 relative">{visitasHoje}</p>
    <div className="absolute -right-4 -bottom-4 text-indigo-50 opacity-30"><ExternalLink size={120}/></div>
    {/* Taxa de Conversão Rápida */}
    <p className="text-[10px] font-bold text-slate-400 mt-2">
        Conversão: {visitasHoje > 0 ? ((orders.filter(o => o.status !== 'canceled' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).length / visitasHoje) * 100).toFixed(1) : 0}%
    </p>
</div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 z-10 relative">Faturamento Hoje</p>
                                    <p className="text-4xl font-black text-green-500 italic z-10 relative">R$ {orders.filter(o => o.status !== 'canceled' && new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).reduce((a, b) => a + (Number(b.total) || 0), 0).toFixed(2)}</p>
                                    <div className="absolute -right-4 -bottom-4 text-green-50 opacity-20"><Trophy size={120}/></div>
                                </div>
                                 {/* PASSO 5: Card de Lucro Real */}
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 z-10 relative">Lucro Hoje</p>
                                    <p className="text-4xl font-black text-cyan-500 italic z-10 relative">R$ {todaysProfit.toFixed(2)}</p>
                                    <div className="absolute -right-4 -bottom-4 text-cyan-50 opacity-20"><TrendingUp size={120}/></div>
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Pedidos Hoje</p>
                                    <p className="text-4xl font-black text-blue-600 italic">{orders.filter(o => new Date(o.createdAt?.toDate()).toDateString() === new Date().toDateString()).length}</p>
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1">Ticket Médio</p>
                                    <p className="text-4xl font-black text-purple-500 italic">R$ {(orders.filter(o => o.status !== 'canceled').reduce((a, b) => a + (Number(b.total) || 0), 0) / (orders.filter(o => o.status !== 'canceled').length || 1)).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="pt-8 mt-8 border-t border-slate-100">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-slate-800">Estatísticas Gerais</h2>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col justify-center">
                                        <div className="flex justify-center mb-2"><Package size={32} className="text-slate-400"/></div>
                                        <p className="text-3xl font-black text-slate-800 italic">{totalProducts}</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Produtos</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col justify-center">
                                        <div className="flex justify-center mb-2"><ShoppingBag size={32} className="text-slate-400"/></div>
                                        <p className="text-3xl font-black text-slate-800 italic">{totalOrders}</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Pedidos Totais</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col justify-center">
                                        <div className="flex justify-center mb-2"><Users size={32} className="text-slate-400"/></div>
                                        <p className="text-3xl font-black text-slate-800 italic">{totalCustomers}</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Clientes VIP</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col justify-center">
                                        <div className="flex justify-center mb-2"><ExternalLink size={32} className="text-green-500"/></div>
                                        <p className="text-3xl font-black text-green-600 italic">{storefrontOrdersCount}</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Pedidos (Loja)</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center flex flex-col justify-center">
                                        <div className="flex justify-center mb-2"><PlusCircle size={32} className="text-blue-500"/></div>
                                        <p className="text-3xl font-black text-blue-600 italic">{manualOrdersCount}</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Pedidos (Manual)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {activeTab === 'chat' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Chat e Suporte</h1>
                                <p className="text-slate-400 font-bold mt-2 text-sm">Atenda seus clientes via WhatsApp direto do painel.</p>
                            </div>
                        </div>
                        <AdminChat />
                    </div>
                )}
{activeTab === 'abandoned' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                            <div>
                                <h1 className="text-4xl font-black italic uppercase text-slate-900">Carrinhos Abandonados</h1>
                                <p className="text-slate-500 font-bold mt-2 text-sm">Recupere vendas chamando os clientes no WhatsApp. Use táticas baseadas no tempo.</p>
                            </div>
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 border border-red-100 shadow-sm">
                                <Ghost size={18} /> {abandonedCarts.length} Clientes Perdidos
                            </div>
                        </div>

                        {abandonedCarts.length === 0 ? (
                            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center shadow-sm">
                                <ShoppingCart size={64} className="text-slate-200 mx-auto mb-4" />
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Nenhum carrinho abandonado!</h3>
                                <p className="text-slate-500 font-medium">Seus clientes estão finalizando todas as compras ou ainda não iniciaram. Ótimo trabalho!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {abandonedCarts.map(cart => {
                                    const dateObj = cart.lastUpdated?.toDate ? cart.lastUpdated.toDate() : new Date();
                                    const minutesAgo = Math.floor((new Date() - dateObj) / 60000);
                                    let timeTag = '';
                                    let timeColor = '';
                                    if (minutesAgo < 60) { timeTag = `Há ${minutesAgo} min`; timeColor = 'bg-red-100 text-red-700 border-red-200'; }
                                    else if (minutesAgo < 1440) { timeTag = `Há ${Math.floor(minutesAgo/60)} horas`; timeColor = 'bg-orange-100 text-orange-700 border-orange-200'; }
                                    else { timeTag = `Há ${Math.floor(minutesAgo/1440)} dias`; timeColor = 'bg-slate-100 text-slate-600 border-slate-200'; }

                                    const firstName = cart.customerName ? cart.customerName.split(' ')[0] : 'Cliente';
                                    
                                    const msg30min = `Olá ${firstName}! Tudo bem? Vi que você começou um pedido na *${storeStatus.name}* mas não finalizou. Aconteceu algum erro no site ou faltou alguma coisa? Se precisar de ajuda, estou por aqui! 😊`;
                                    
                                    const msg1hora = `Oi ${firstName}! Bateu aquela fome? 🍔 Vi que seu carrinho está te esperando. Finalize seu pedido agora e ganhe 5% OFF usando o cupom *VOLTA5*! \n👉 https://${storeId}.velodelivery.com.br`;
                                    
                                    const msg24horas = `Última chance, ${firstName}! 🚨 Seu carrinho na *${storeStatus.name}* vai expirar. Para fechar agora, criamos um cupom muito especial pra você com 10% OFF, use: *VOLTA10* no app. Aproveite! \n👉 https://${storeId}.velodelivery.com.br`;

                                    const sendMsg = (text) => {
                                        const phone = String(cart.customerPhone).replace(/\D/g, '');
                                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                    };

                                    return (
                                        <div key={cart.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter leading-none mb-1">{cart.customerName}</h3>
                                                        <p className="text-slate-500 font-bold text-xs">{cart.customerPhone}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${timeColor}`}>
                                                        ⏳ {timeTag}
                                                    </span>
                                                </div>
                                                
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">Itens Esquecidos</p>
                                                    <ul className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-2">
                                                        {(cart.items ||[]).map((i, idx) => (
                                                            <li key={idx} className="text-sm font-bold text-slate-700 flex justify-between">
                                                                <span>{i.quantity}x {i.name}</span>
                                                                <span className="text-blue-600">R$ {(i.price * i.quantity).toFixed(2)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                                                        <span className="text-xs font-black text-slate-500 uppercase">Subtotal Perdido:</span>
                                                        <span className="text-lg font-black text-slate-800 italic">R$ {Number(cart.subtotal).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 text-center">Táticas de Recuperação (WhatsApp)</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button onClick={() => sendMsg(msg30min)} className="flex flex-col items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all border border-red-100 group">
                                                        <MessageCircle size={18} className="mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[9px] font-black uppercase text-center leading-tight">Suporte<br/>(30 min)</span>
                                                    </button>
                                                    <button onClick={() => sendMsg(msg1hora)} className="flex flex-col items-center justify-center p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all border border-orange-100 group">
                                                        <Flame size={18} className="mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[9px] font-black uppercase text-center leading-tight">Desconto<br/>(1 Hora)</span>
                                                    </button>
                                                    <button onClick={() => sendMsg(msg24horas)} className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all border border-green-100 group">
                                                        <Tags size={18} className="mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[9px] font-black uppercase text-center leading-tight">Última Chance<br/>(24 Horas)</span>
                                                    </button>
                                                </div>
                                                <button onClick={() => window.confirm("Deseja apagar este carrinho?") && deleteDoc(doc(db, "abandoned_carts", cart.id))} className="w-full mt-3 p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-1">
                                                    <Trash2 size={12} /> Descartar Carrinho
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black italic uppercase mb-8">Pedidos</h1>
                        {orders.map(o => (
                            <div key={o.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 md:flex-row md:justify-between md:items-center md:gap-6 md:p-8 md:rounded-[3rem]">
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">#{o.id ? o.id.slice(-6).toUpperCase() : 'ID'}</span>
{(() => {
    const isOnline = ['stripe', 'cartao', 'pix'].includes(o.paymentMethod);
    if (isOnline) {
        if (o.paymentStatus === 'paid') return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">✅ PAGO</span>;
        if (o.paymentStatus === 'failed') return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">❌ RECUSADO</span>;
        return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">⏳ PENDENTE</span>;
    }
    return <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">🏠 PAGTO NA ENTREGA</span>;
})()}
{o.tipo === 'local' && (
    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">🍽️ MESA {o.mesa}</span>
)}
<span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} />{o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight flex items-center gap-2 flex-wrap">
                                        {o.customerName} 
                                        {o.waiterName && <span className="text-xs text-purple-500 font-bold">(Garçom: {o.waiterName})</span>}
                                        {o.source === 'google_food_marketplace' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-orange-200 shadow-sm flex items-center gap-1">🌐 Via Google Maps</span>}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {o.tipo === 'local' 
                                            ? `Atendimento no Salão - Mesa ${o.mesa}`
                                            : (typeof o.customerAddress === 'object' ? `${o.customerAddress.street}, ${o.customerAddress.number} - ${o.customerAddress.neighborhood}` : (o.customerAddress || o.address))
                                        }
                                    </p>
                                </div>
                                {/* LISTAGEM SEGURA DE ITENS NO PEDIDO */}
                <div className="py-3 my-2 border-y border-slate-50 space-y-2">
                    {o.items && Array.isArray(o.items) ? o.items.map((i, idx) => (
                        <div key={idx} className="flex flex-col">
                            <div className="flex justify-between items-start text-sm">
                                <span className="font-bold text-slate-700">
                                    {i.quantity}x {i.name}
                                </span>
                                <span className="text-slate-400 font-medium">
                                    R$ {(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}
                                </span>
                            </div>
                            
                            {/* MOSTRAR OBSERVAÇÃO COM SEGURANÇA */}
                            {i.observation && (
                                <div className="text-[11px] text-orange-600 font-bold bg-orange-50 p-2 rounded-lg mt-1 border border-orange-100 italic leading-tight">
                                    ↳ Obs: {i.observation}
                                </div>
                            )}
                        </div>
                    )) : (
                        <span className="text-xs text-slate-400 italic">Nenhum item encontrado</span>
                    )}
                </div>
                                <div className="flex flex-col gap-2 items-end md:flex-row md:items-center md:gap-3"> 
                                    <p className="text-2xl font-black text-green-600 mb-2 md:mb-0 whitespace-nowrap">R$ {Number(o.total).toFixed(2)}</p>
                                    <div className="flex flex-wrap justify-end gap-2 md:gap-3">
                                        <button 
                                            onClick={() => {
                                                
                                                const initialDataForModal = {
                                                    ...o, // Começa com os dados originais do pedido
                                                    paymentMethod: o.paymentMethod || 'pix', // Define um fallback caso o campo não exista
                                                    items: Array.isArray(o.items) ? o.items.map(item => ({ ...item })) :[], // Garante que 'items' é um array
                                                    shippingFee: o.shippingFee || 0,
                                                    customerName: o.customerName || '',
                                                    customerAddress: o.customerAddress || '',
                                                    customerPhone: o.customerPhone || ''
                                                };
                                                setEditingOrderData(initialDataForModal);
                                                setIsOrderEditModalOpen(true);
                                            }} 
                                            className="p-3 bg-slate-100 rounded-xl hover:bg-orange-100 text-orange-600"
                                            title="Editar Pedido"
                                        >
                                            <Edit3 size={20} />
                                        </button>
                                        <button onClick={() => printLabel(o)} className="p-3 bg-slate-100 rounded-xl hover:bg-blue-100 text-blue-600"><Printer size={20} /></button>
                                        <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g, '')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl"><MessageCircle size={20} /></a>
                                        <select value={o.status} onChange={(e) => updateStatusAndNotify(o, e.target.value)} className="py-2 px-3 rounded-xl font-black text-xs uppercase border-none outline-none cursor-pointer bg-blue-50 text-blue-800">
                                            <option value="pending">⏳ Pendente</option><option value="preparing">👨‍🍳 Preparando</option><option value="delivery">🏍️ Em Rota</option><option value="completed">✅ Entregue</option><option value="canceled">❌ Cancelado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Categorias</h1>
                           <button onClick={() => { setEditingCatId(null); setCatForm({ name: '', icon: 'List', order: 0 }); setIsCatModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVA CATEGORIA</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {categories.map(c => (
                                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg leading-tight">{c.name}</span>
                                        <span className="text-xs font-bold text-slate-400 mt-1">Ordem: {c.order || 0}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingCatId(c.id); setCatForm({ name: c.name, icon: c.icon || 'List', order: c.order || 0 }); setIsCatModalOpen(true); }} className="p-2 bg-slate-50 rounded-lg text-blue-600"><Edit3 size={16} /></button>
                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "categories", c.id))} className="p-2 bg-slate-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Banners Gerais</h1>
                            <button onClick={() => { setEditingBannerId(null); setBannerForm({ imageUrl: '', linkTo: '', order: 0, isActive: true }); setIsBannerModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO BANNER</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {generalBanners.map(b => (
                                <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                    <img src={b.imageUrl} className="w-24 h-24 object-contain rounded-2xl bg-slate-50 p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight mb-1">Ordem: {b.order}</p>
                                        <p className="text-blue-600 font-black break-all text-xs">Link: {b.linkTo}</p>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-2 inline-block ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.isActive ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setEditingBannerId(b.id); setBannerForm(b); setIsBannerModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>
                                        <button onClick={() => window.confirm("Excluir banner?") && deleteDoc(doc(db, "banners", b.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Estoque</h1>
                            {/* PASSO 1 (continuação): Resetar os novos campos ao criar item novo */}
                           <button onClick={() => { setEditingId(null); setForm({ name: '', description: '', price: '', costPrice: '', promotionalPrice: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0, hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false, quantityDiscounts:[], recommendedIds:[], complements:[], isChilled: false, gtin: '', brand: '', prepTime: '', deliveryLeadTime: '', calories: '', suitableForDiet:[], variations: '' }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
                        </div>
                        {/* --- BARRA DE BUSCA --- */}
                        <div className="mb-6 mt-6 relative">
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar produto por nome..." 
                                className="w-full p-4 pl-12 rounded-2xl border-none bg-white shadow-sm font-bold text-slate-600 focus:ring-2 ring-blue-500 outline-none"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                            {productSearch && (
                                <button onClick={() => setProductSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500">
                                    <X size={20}/>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.filter(p => 
                                p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                p.category.toLowerCase().includes(productSearch.toLowerCase())
                            ).map(p => (                                
                                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                                    <img src={p.imageUrl} className="w-20 h-20 object-contain rounded-2xl bg-slate-50 p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                                        {/* PASSO 4: Exibição dos novos preços na listagem */}
                                        <div className='flex items-end gap-2'>
                                            <p className={`text-blue-600 font-black text-lg ${p.promotionalPrice > 0 ? 'line-through text-slate-400 text-sm' : ''}`}>
                                                R$ {Number(p.price)?.toFixed(2)}
                                            </p>
                                            {p.promotionalPrice > 0 && (
                                                <p className="text-orange-500 font-black text-lg">
                                                    R$ {Number(p.promotionalPrice)?.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                        {p.costPrice > 0 && (
                                             <p className="text-xs font-bold text-slate-400">Custo: R$ {Number(p.costPrice).toFixed(2)}</p>
                                        )}
                                        <p className={`text-xs font-bold mt-1 ${p.stock <= 2 ? 'text-red-500' : 'text-slate-400'}`}>Estoque: {p.stock !== undefined ? p.stock : 'N/A'}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* PASSO 1 (continuação): Carregar dados existentes ao editar */}
                                        <button onClick={() => { setEditingId(p.id); setForm({ ...p, quantityDiscounts: p.quantityDiscounts || [], recommendedIds: p.recommendedIds ||[], gtin: p.gtin || '', brand: p.brand || '', prepTime: p.prepTime || '', deliveryLeadTime: p.deliveryLeadTime || '', calories: p.calories || '', suitableForDiet: p.suitableForDiet ||[], variations: p.variations ? p.variations.join(', ') : '' }); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100"><Edit3 size={18} /></button>
                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "products", p.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div className="space-y-6">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                                {settings.loyaltyActive ? 'CLUBE FIDELIDADE' : 'RANKING VIP'}
                            </h1>
                            {!settings.loyaltyActive && <p className="text-slate-400 font-bold mt-2">O Clube Fidelidade está desativado. Ative na aba 'Marketing' para ver os pontos.</p>}
                        </div>

                        <div className="grid gap-4 max-w-4xl mx-auto">
                            {customers.map((c, i) => {
                                const progressPercentage = Math.min(100, (c.points / (c.loyaltyGoal || 1)) * 100);
                                const hasReachedGoal = c.points >= c.loyaltyGoal;

                                return (
                                <div key={i} className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-lg transition-all">
                                    {/* Informações do Cliente */}
                                    <div className="flex items-center gap-4 md:gap-6 self-start md:self-center">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl ${i === 0 ? 'bg-amber-400 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>
                                            {i === 0 ? <Crown /> : i + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{c.name}</h3>
                                            <p className="text-slate-400 font-bold text-xs tracking-widest">{c.phone}</p>
                                        </div>
                                    </div>

                                    {/* Lógica de Exibição: Pontos ou Total Gasto */}
                                    <div className="w-full md:w-auto md:min-w-[250px] text-right">
                                        {settings.loyaltyActive ? (
                                            <>
                                                <div className="flex justify-end items-baseline gap-2 mb-2">
                                                    <p className="text-3xl font-black text-purple-600 italic">{c.points}</p>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase leading-none">PONTOS</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 relative">
                                                    <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1">Meta: {c.points} / {c.loyaltyGoal}</p>
                                                
                                                {/* Botão de Resgate Condicional */}
                                                {hasReachedGoal && (
                                                    <button 
                                                        onClick={() => handleRedeemPoints(c)}
                                                        className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-green-600 transition-all active:scale-95 animate-pulse"
                                                    >
                                                        ✅ Resgatar Prêmio
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Total Comprado</p>
                                                <p className="text-3xl font-black text-blue-600 italic">R$ {c.totalSpent.toFixed(2)}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>

                        {/* --- NOVA GESTÃO DE AVALIAÇÕES E MISSÕES VIP --- */}
                        <div className="mt-16 pt-12 border-t border-slate-200">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 mb-2">Engajamento VIP</h2>
                                    <p className="text-slate-400 font-bold text-sm">Aprove missões com prints ou responda avaliações do App.</p>
                                </div>
                                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                                    <button onClick={() => setActiveReviewTab('missions')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeReviewTab === 'missions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        📸 Prints Pendentes {vipMissions.filter(m => m.status === 'pending').length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full ml-1 animate-pulse">{vipMissions.filter(m => m.status === 'pending').length}</span>}
                                    </button>
                                    <button onClick={() => setActiveReviewTab('reviews')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeReviewTab === 'reviews' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        ⭐ Avaliações do App
                                    </button>
                                </div>
                            </div>
                            
                            {activeReviewTab === 'missions' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                                    {vipMissions.filter(m => m.status === 'pending').length === 0 ? (
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-center col-span-full">
                                            <p className="text-slate-400 font-bold">Ufa! Nenhuma missão pendente de aprovação no momento.</p>
                                        </div>
                                    ) : vipMissions.filter(m => m.status === 'pending').map(m => (
                                        <div key={m.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-800 uppercase text-lg">{m.customerName}</span>
                                                    <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">WhatsApp: {m.customerPhone}</p>
                                                </div>
                                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                    🪙 +{m.pointsExpected} Pts
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-xs font-bold text-slate-500 mb-3">
                                                    Missão: <strong className="text-slate-800">
                                                        {m.missionType === 'google_simple' ? 'Avaliação Simples (Google)' : 
                                                         m.missionType === 'google_photo' ? 'Avaliação c/ Foto (Google)' : 
                                                         m.missionType === 'internal_review' ? 'Avaliação no App' : 'Post Instagram'}
                                                    </strong>
                                                </p>
                                                
                                                {m.missionType === 'internal_review' ? (
                                                    <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 text-center">
                                                        <div className="flex justify-center text-yellow-400 mb-1">
                                                            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < m.rating ? "currentColor" : "none"} />)}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase truncate">{m.productName}</span>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => window.open(m.proofUrl, '_blank')} className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white p-3 rounded-xl font-black text-xs uppercase hover:bg-slate-800 transition-all shadow-md">
                                                        <ImageIcon size={16}/> Ver Print Enviado
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                <button onClick={() => handleMissionAction(m, 'rejected')} className="flex-1 bg-red-50 text-red-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100">
                                                    ❌ Recusar
                                                </button>
                                                <button onClick={() => handleMissionAction(m, 'approved')} className="flex-1 bg-green-500 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-200 active:scale-95">
                                                    ✅ Aprovar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeReviewTab === 'reviews' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                                    {reviewsList.length === 0 ? (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-center col-span-full">
                                        <p className="text-slate-400 font-bold">Nenhuma avaliação recebida ainda.</p>
                                    </div>
                                ) : reviewsList.map(r => (
                                    <div key={r.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-black text-slate-800 uppercase text-lg">{r.customerName}</span>
                                                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Pedido: #{r.orderId}</p>
                                            </div>
                                            <div className="flex text-yellow-400">
                                                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < r.rating ? "currentColor" : "none"} />)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium italic bg-slate-50 p-4 rounded-2xl border border-slate-100">"{r.comment}"</p>
                                        
                                        {r.reply ? (
                                            <div className="bg-blue-50 p-4 rounded-2xl mt-2 border border-blue-100 relative">
                                                <button onClick={() => updateDoc(doc(db, "reviews", r.id), { reply: null })} className="absolute top-4 right-4 text-blue-400 hover:text-red-500"><Trash2 size={16}/></button>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Você respondeu:</p>
                                                <p className="text-sm text-blue-800 font-bold">{r.reply}</p>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex flex-col md:flex-row gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Escreva uma resposta pública..." 
                                                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-2 ring-blue-500"
                                                    value={replyText[r.id] || ''}
                                                    onChange={(e) => setReplyText({...replyText,[r.id]: e.target.value})}
                                                />
                                                <button 
                                                    onClick={async () => {
                                                        if(!replyText[r.id]) return;
                                                        await updateDoc(doc(db, "reviews", r.id), { reply: replyText[r.id] });
                                                        alert("Resposta enviada e visível no app!");
                                                    }}
                                                    className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all"
                                                >
                                                    Responder
                                                </button>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-50 pt-3 mt-1">
                                            <button onClick={() => window.confirm("Deseja mesmo apagar esta avaliação?") && deleteDoc(doc(db, "reviews", r.id))} className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1 hover:text-red-700"><X size={14}/> Excluir Avaliação do App</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>
                    </div>
                )}
                
                {/* ✅ ABA MANUAL CORRIGIDA E REFEITA */}
                {activeTab === 'manual' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* --- COLUNA ESQUERDA: DADOS DO CLIENTE --- */}
                        <div className="space-y-6">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Novo Pedido Manual</h1>
                            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-4 border border-slate-100">
                                {/* MODO DE ENTREGA / RETIRADA */}
                                <div className="flex gap-4 mb-4 bg-slate-50 p-2 rounded-2xl">
                                    <button 
                                        type="button"
                                        onClick={() => { setManualCustomer({ ...manualCustomer, deliveryMethod: 'delivery' }); }}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${manualCustomer.deliveryMethod === 'delivery' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        🛵 Entrega
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setManualCustomer({ ...manualCustomer, deliveryMethod: 'pickup' }); setManualShippingFee(0); }}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${manualCustomer.deliveryMethod === 'pickup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        🏪 Retirada / Balcão
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Nome do Cliente (Opcional no Balcão)</label>
                                        <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" value={manualCustomer.name} onChange={e => setManualCustomer({ ...manualCustomer, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">WhatsApp (Opcional)</label>
                                        <input type="tel" placeholder="(DDD + Número)" className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" value={manualCustomer.phone} onChange={e => setManualCustomer({ ...manualCustomer, phone: e.target.value })} />
                                    </div>
                                </div>
                                
                                {manualCustomer.deliveryMethod === 'delivery' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 mt-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 ml-2">CEP (Opcional - Busca Automática)</label>
                                            <input
                                                type="text"
                                                placeholder="00000-000"
                                                className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none"
                                                value={manualCep}
                                                onChange={e => setManualCep(e.target.value)}
                                                onBlur={handleManualCepSearch}
                                                maxLength="9"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 ml-2">Endereço Completo (Livre digitação)</label>
                                            <input 
                                                type="text" 
                                                placeholder="Rua, Número, Bairro" 
                                                className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" 
                                                value={manualCustomer.address} 
                                                onChange={e => setManualCustomer({ ...manualCustomer, address: e.target.value })} 
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <select className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" value={manualCustomer.payment} onChange={e => setManualCustomer({ ...manualCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? manualCustomer.changeFor : '' })}>
                                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
                                </select>
                                
                                {manualCustomer.payment === 'dinheiro' && <input type="text" placeholder="Troco para qual valor?" className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" value={manualCustomer.changeFor} onChange={e => setManualCustomer({ ...manualCustomer, changeFor: e.target.value })} />}
                                
                                <div className="pt-6 border-t border-slate-100">
                                    {manualCart.length === 0 ? (
                                        <p className="text-center text-slate-400 font-bold text-sm py-4">Nenhum produto selecionado.</p>
                                    ) : (
                                        manualCart.map(i => (
                                            <div key={i.id} className="flex justify-between items-center mb-2 font-bold text-slate-600 text-sm bg-slate-50 p-2 rounded-lg">
                                                <span>{i.quantity}x {i.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span>R$ {(i.price * i.quantity).toFixed(2)}</span>
                                                    <button onClick={() => setManualCart(manualCart.filter(item => item.id !== i.id))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                                </div>
                                                {i.observation && (
                <div className="text-xs text-orange-600 font-bold bg-orange-50 p-1.5 rounded-lg mt-1 border border-orange-100">
                    ⚠️ Obs: {i.observation}
                </div>
            )}
                                            </div>
                                        ))
                                    )}
                                    
                                    <div className="flex justify-between mb-2 font-bold text-blue-600 text-sm border-t border-dashed pt-4 mt-2">
                                        <span>Taxa de Entrega:</span>
                                        <span>R$ {manualShippingFee.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-2 font-bold text-orange-500 text-sm">
                                        <span>Taxa Adicional (Ex: Extra):</span>
                                        <div className="flex items-center gap-1">
                                            <span>R$</span>
                                            <input type="number" step="0.01" className="w-20 p-1 text-right bg-orange-50 border border-orange-200 rounded-md outline-none focus:ring-2 ring-orange-300" placeholder="0.00" value={manualExtraFee} onChange={e => setManualExtraFee(Number(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    {/* CAMPO DE CUPOM E DESCONTO MANUAL */}
                                    <div className="flex items-center gap-2 mb-4 border-b border-dashed border-slate-200 pb-4 mt-4">
                                        <input 
                                            type="text" 
                                            placeholder="Cupom de Desconto" 
                                            className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-sm uppercase outline-none" 
                                            value={manualCouponCode} 
                                            onChange={e => setManualCouponCode(e.target.value)} 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (!manualCouponCode) return setManualDiscountAmount(0);
                                                const coupon = coupons.find(c => c.code.toUpperCase() === manualCouponCode.toUpperCase() && c.active);
                                                if (!coupon) return alert("Cupom inválido ou inativo.");
                                                
                                                const subtotal = manualCart.reduce((a, i) => a + (i.price * i.quantity), 0);
                                                if (coupon.minimumOrderValue > subtotal) return alert(`Pedido mínimo para este cupom é R$ ${coupon.minimumOrderValue.toFixed(2)}`);
                                                
                                                let calcDiscount = 0;
                                                if (coupon.type === 'percentage') calcDiscount = subtotal * (coupon.value / 100);
                                                else if (coupon.type === 'fixed_amount') calcDiscount = coupon.value;
                                                
                                                setManualDiscountAmount(calcDiscount);
                                                alert("Cupom aplicado com sucesso!");
                                            }}
                                            className="bg-slate-900 text-white px-4 py-3 rounded-xl font-black text-xs uppercase"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                    
                                    {manualDiscountAmount > 0 && (
                                        <div className="flex justify-between mb-2 font-bold text-green-500 text-sm">
                                            <span>Desconto:</span>
                                            <span>- R$ {manualDiscountAmount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="text-3xl font-black text-slate-900 mt-4 italic">
                                        Total R$ {Math.max(0, (manualCart.reduce((a, i) => a + (i.price * i.quantity), 0) + manualShippingFee + Number(manualExtraFee) - manualDiscountAmount)).toFixed(2)}
                                    </div>
                                    
                                    <button onClick={async () => {
                                        if (manualCart.length === 0) return alert("Adicione produtos ao pedido!");
                                        if (manualCustomer.deliveryMethod === 'delivery' && !manualCustomer.address) return alert("Preencha o endereço para entrega!");
                                        
                                        const subtotal = manualCart.reduce((a, i) => a + (i.price * i.quantity), 0);
                                        const extraFeeNum = Number(manualExtraFee) || 0;
                                        const discountNum = Number(manualDiscountAmount) || 0;
                                        const finalTotal = Math.max(0, subtotal + manualShippingFee + extraFeeNum - discountNum);
                                        
                                        const isPickup = manualCustomer.deliveryMethod === 'pickup';
                                        const finalAddress = isPickup ? 'Retirada na Loja / Balcão' : manualCustomer.address;
                                        const finalName = manualCustomer.name || 'Cliente Balcão';

                                        // Dados do vendedor logado
                                        const sellerName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Equipe';
                                        const sellerEmail = auth.currentUser?.email || 'owner';

                                        await addDoc(collection(db, "orders"), { 
                                            ...manualCustomer, 
                                            customerName: finalName, 
                                            customerAddress: finalAddress, 
                                            customerPhone: manualCustomer.phone || '', 
                                            items: manualCart,
                                            subtotal: subtotal,
                                            shippingFee: isPickup ? 0 : manualShippingFee,
                                            extraFee: extraFeeNum,
                                            discountAmount: discountNum,
                                            couponCode: manualCouponCode,
                                            total: finalTotal, 
                                            status: isPickup ? 'completed' : 'pending', // Se for balcão, já cai como concluído/entregue
                                            tipo: isPickup ? 'local' : 'delivery',
                                            createdAt: serverTimestamp(), 
                                            customerChangeFor: manualCustomer.payment === 'dinheiro' ? manualCustomer.changeFor : '', 
                                            storeId: storeId,
                                            source: 'manual',
                                            vendedor: sellerName,
                                            sellerEmail: sellerEmail 
                                        });
                                        
                                        setManualCart([]); 
                                        setManualCustomer({ name: '', address: '', phone: '', payment: 'pix', changeFor: '', deliveryMethod: 'delivery' }); 
                                        setManualCep('');
                                        setManualShippingFee(0);
                                        setManualExtraFee(0);
                                        setManualCouponCode('');
                                        setManualDiscountAmount(0);
                                        alert("Pedido Lançado com Sucesso!");
                                    }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase mt-6 shadow-xl hover:bg-blue-700 transition-all">
                                        Confirmar Pedido
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- COLUNA DIREITA: SELEÇÃO DE PRODUTOS --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-fit sticky top-6">
                            <h2 className="text-xl font-black uppercase mb-6 text-slate-300">Adicionar Produtos</h2>
                            <div className="mb-4 relative">
                                <input 
                                    type="text" 
                                    placeholder="Filtrar produtos..." 
                                    className="w-full p-3 pl-10 bg-slate-50 rounded-xl font-bold text-sm"
                                    onChange={(e) => {
                                        const term = e.target.value.toLowerCase();
                                        document.querySelectorAll('.manual-product-item').forEach(el => {
                                            const name = el.getAttribute('data-name').toLowerCase();
                                            el.style.display = name.includes(term) ? 'flex' : 'none';
                                        });
                                    }}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            </div>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {products.map(p => {
                                    // 1. Verifica se o estoque é zero ou inválido
                                    const isOutOfStock = p.stock === undefined || Number(p.stock) <= 0;

                                    return (
                                        <button 
                                            key={p.id} 
                                            data-name={p.name}
                                            disabled={isOutOfStock} // 2. Desativa o botão nativamente
                                            className={`manual-product-item w-full p-4 rounded-2xl flex justify-between items-center transition-all border group ${
                                                isOutOfStock 
                                                ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' // Visual de esgotado
                                                : 'bg-slate-50 hover:bg-blue-50 border-transparent hover:border-blue-200' // Visual normal
                                            }`}
                                            onClick={() => {
                                                if (isOutOfStock) return; // Trava extra de segurança

                                                const ex = manualCart.find(it => it.id === p.id);
                                                if (ex) {
                                                    // 3. Trava de quantidade máxima baseada no estoque
                                                    if (ex.quantity >= Number(p.stock)) {
                                                        return alert(`⚠️ Estoque máximo atingido! Restam apenas ${p.stock} unid. de ${p.name}.`);
                                                    }
                                                    setManualCart(manualCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                                                } else {
                                                    // PASSO 5 (continuação): Salvar o costPrice no item do carrinho
                                                    const productToAdd = { 
                                                        ...p, 
                                                        quantity: 1, 
                                                        // Usar preço promocional se houver, senão o normal
                                                        price: p.promotionalPrice > 0 ? p.promotionalPrice : p.price 
                                                    };
                                                    setManualCart([...manualCart, productToAdd]);
                                                }
                                            }} 
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                {p.imageUrl && <img src={p.imageUrl} className={`w-8 h-8 object-contain rounded-md bg-white ${isOutOfStock ? 'grayscale' : ''}`}/>}
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 leading-tight">{p.name}</span>
                                                    {/* 4. Exibição da TAG Esgotado ou da Quantidade */}
                                                    {isOutOfStock ? (
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">Esgotado</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400">Estoque: {p.stock}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black transition-transform ${
                                                isOutOfStock 
                                                ? 'bg-slate-300 text-white' // Cor cinza para o preço se esgotado
                                                : p.promotionalPrice > 0 ? 'bg-orange-500 text-white group-hover:scale-110' : 'bg-blue-600 text-white group-hover:scale-110'
                                            }`}>
                                                R$ {Number(p.promotionalPrice > 0 ? p.promotionalPrice : p.price).toFixed(2)}
                                            </span>
                                        </button>
                                    ); 
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marketing' && (
                    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Marketing</h1>
                                <p className="text-slate-400 font-bold mt-2 text-sm">Gerencie suas campanhas, cupons e fidelização.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                            
                            {/* COLUNA ESQUERDA: PROMOÇÃO E RESGATE */}
                            <div className="space-y-6 lg:space-y-8">
                                
                                {/* --- 1. PROMO RELÂMPAGO --- */}
                                <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl transition-all border-4 ${settings.promoActive ? 'bg-orange-500 text-white border-orange-300' : 'bg-white border-slate-100'}`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <Flame size={48} className={settings.promoActive ? 'animate-bounce text-white' : 'text-orange-500'} />
                                        <div>
                                            <h2 className={`text-2xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none ${settings.promoActive ? 'text-white' : 'text-slate-800'}`}>Promo Relâmpago</h2>
                                            <p className={`text-xs font-bold mt-1 ${settings.promoActive ? 'text-orange-100' : 'text-slate-400'}`}>Banners rotativos no topo da loja.</p>
                                        </div>
                                    </div>

                                    {/* NOVO: CAMPO DE AGENDAMENTO (DESATIVAÇÃO AUTOMÁTICA) */}
                                    <div className={`p-4 rounded-2xl mb-6 border ${settings.promoActive ? 'bg-orange-600 border-orange-400' : 'bg-slate-50 border-slate-200'}`}>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${settings.promoActive ? 'text-orange-100' : 'text-slate-400'}`}>
                                            ⏱️ Desativar automaticamente em: (Opcional)
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            value={settings.promoExpiresAt || ''} 
                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { promoExpiresAt: e.target.value }, { merge: true })}
                                            className={`w-full p-3 rounded-xl font-bold outline-none text-sm ${settings.promoActive ? 'bg-orange-700 text-white border-none' : 'bg-white text-slate-700 border border-slate-200'}`}
                                        />
                                    </div>

                                    <button onClick={async () => { const s = !settings.promoActive; await setDoc(doc(db, "settings", storeId), { promoActive: s }, { merge: true }); }} className={`w-full py-5 lg:py-6 rounded-2xl lg:rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-xl ${settings.promoActive ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-orange-600 text-white hover:bg-orange-700'} transition-all active:scale-95`}>
                                        {settings.promoActive ? 'Encerrar Oferta' : 'Lançar Promoção'}
                                    </button>
                                    
                                    {/* EXIBIÇÃO DE BANNERS ATIVOS */}
                                    {settings.promoBannerUrls && settings.promoBannerUrls.length > 0 && (
                                        <div className={`mt-8 pt-6 border-t ${settings.promoActive ? 'border-orange-400' : 'border-slate-100'} space-y-4`}>
                                            <h3 className={`text-sm font-black uppercase ${settings.promoActive ? 'text-white' : 'text-slate-600'}`}>Banners Atuais</h3>
                                            <div className="space-y-4">
                                                {settings.promoBannerUrls.map((url, index) => (
                                                    url ? <img key={index} src={url} className="w-full h-32 object-cover rounded-2xl shadow-sm bg-slate-100" alt={`Promo Banner ${index + 1}`} /> : null
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* UPLOAD DE BANNERS */}
                                    <div className={`mt-8 pt-6 border-t ${settings.promoActive ? 'border-orange-400' : 'border-slate-100'} space-y-4`}>
                                        <h3 className={`text-sm font-black uppercase ${settings.promoActive ? 'text-white' : 'text-slate-600'}`}>Gerenciar Banners</h3>
                                        <div className="flex flex-col gap-4">
                                            {/* Banners Inputs (Mantido a lógica original, ajustado layout) */}
                                            {[
                                                { file: promoBannerFile1, setFile: setPromoBannerFile1, url: settings.promoBannerUrls?.[0], id: 1 },
                                                { file: promoBannerFile2, setFile: setPromoBannerFile2, url: settings.promoBannerUrls?.[1], id: 2 },
                                                { file: promoBannerFile3, setFile: setPromoBannerFile3, url: settings.promoBannerUrls?.[2], id: 3 }
                                            ].map((b) => (
                                                <div key={b.id} className="w-full">
                                                    {(b.file || b.url) && <img src={b.file ? URL.createObjectURL(b.file) : b.url} className="w-full h-24 object-cover rounded-xl mb-2 bg-slate-100"/>}
                                                    <input type="file" accept="image/*" onChange={(e) => b.setFile(e.target.files[0])} className="hidden" id={`promo-banner-upload-${b.id}`}/>
                                                    <label htmlFor={`promo-banner-upload-${b.id}`} className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm cursor-pointer border-2 border-dashed ${settings.promoActive ? 'bg-orange-600 border-orange-400 text-orange-50 hover:bg-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'} transition-all`}>
                                                        Upload Banner {b.id} <UploadCloud size={16}/>
                                                    </label>
                                                </div>
                                            ))}
                                            <button type="button" onClick={handlePromoBannerUpload} disabled={uploadingPromoBanner} className={`w-full p-4 mt-2 rounded-xl font-black shadow-lg transition-all ${settings.promoActive ? 'bg-white text-orange-600 hover:bg-orange-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                                {uploadingPromoBanner ? 'Enviando...' : 'Salvar Banners'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* --- 2. RECUPERAÇÃO DE VENDAS (EXIT INTENT) --- */}
                                <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl border-4 transition-all ${settings.exitIntentActive ? 'bg-rose-600 text-white border-rose-400' : 'bg-white border-slate-100'}`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-full">
                                                <Ghost size={32} className={settings.exitIntentActive ? 'text-white animate-bounce' : 'text-slate-300'} /> 
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl font-black italic uppercase tracking-tighter leading-none ${settings.exitIntentActive ? 'text-white' : 'text-slate-800'}`}>Resgate de Clientes</h2>
                                                <p className={`text-xs font-bold mt-1 ${settings.exitIntentActive ? 'text-rose-100' : 'text-slate-400'}`}>Pop-up de retenção.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => { const newState = !settings.exitIntentActive; await setDoc(doc(db, "settings", storeId), { exitIntentActive: newState }, { merge: true }); }} 
                                            className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all w-full md:w-auto ${settings.exitIntentActive ? 'bg-white text-rose-600 hover:bg-rose-50' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                                        >
                                            {settings.exitIntentActive ? 'Desativar' : 'Ativar Resgate'}
                                        </button>
                                    </div>

                                    {settings.exitIntentActive && (
                                        <div className="pt-4 border-t border-rose-500/50 grid grid-cols-1 gap-4 animate-in fade-in">
                                            <div>
                                                <label className="text-rose-100 font-bold text-[10px] uppercase mb-1 block">Cupom a Oferecer (Crie na aba Cupons)</label>
                                                <input 
                                                    type="text" placeholder="Ex: VOLTA10" value={settings.exitIntentCoupon || ''} 
                                                    onChange={(e) => setDoc(doc(db, "settings", storeId), { exitIntentCoupon: e.target.value.toUpperCase() }, { merge: true })}
                                                    className="w-full p-3 rounded-xl bg-white text-rose-900 font-black text-center uppercase outline-none placeholder-rose-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-rose-100 font-bold text-[10px] uppercase mb-1 block">Frase de Impacto</label>
                                                <input 
                                                    type="text" placeholder="Ex: Espere! Ganhe 5% OFF agora." value={settings.exitIntentMessage || ''} 
                                                    onChange={(e) => setDoc(doc(db, "settings", storeId), { exitIntentMessage: e.target.value }, { merge: true })}
                                                    className="w-full p-3 rounded-xl bg-white text-rose-900 font-bold outline-none placeholder-rose-200 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COLUNA DIREITA: FIDELIDADE E CUPONS GERAIS */}
                            <div className="space-y-6 lg:space-y-8">
                                
                                {/* --- 3. CLUBE DE FIDELIDADE --- */}
                                <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl border-4 transition-all h-fit ${settings.loyaltyActive ? 'bg-purple-600 text-white border-purple-400' : 'bg-white border-slate-100'}`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <Crown size={48} className={settings.loyaltyActive ? 'text-yellow-300 animate-pulse' : 'text-slate-200'} />
                                            <div>
                                                <h2 className={`text-2xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none ${settings.loyaltyActive ? 'text-white' : 'text-slate-800'}`}>Clube Fidelidade</h2>
                                                <p className={`text-xs font-bold mt-1 ${settings.loyaltyActive ? 'text-purple-200' : 'text-slate-400'}`}>Gamificação e pontos.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => { const newState = !settings.loyaltyActive; await setDoc(doc(db, "settings", storeId), { loyaltyActive: newState }, { merge: true }); }} 
                                            className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all w-full md:w-auto ${settings.loyaltyActive ? 'bg-white text-purple-600 hover:bg-purple-50' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                        >
                                            {settings.loyaltyActive ? 'Desativar Clube' : 'Ativar Clube'}
                                        </button>
                                    </div>

                                    {settings.loyaltyActive && (
                                        <div className="pt-6 border-t border-purple-500/50 space-y-4 animate-in fade-in slide-in-from-top-4">
                                            <div className="bg-purple-700/50 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-purple-500">
                                                <label className="text-purple-200 font-bold text-[10px] uppercase mb-2 flex items-center gap-1"><Edit3 size={12}/> Texto do Prêmio</label>
                                                <textarea rows="2" placeholder="Ex: Ganhe uma Heineken!" value={settings.loyaltyReward || ''} onChange={(e) => setDoc(doc(db, "settings", storeId), { loyaltyReward: e.target.value }, { merge: true })} className="w-full p-3 rounded-xl bg-white text-purple-900 font-bold outline-none placeholder-purple-300 text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- NOVO: CENTRO DE GAMIFICAÇÃO AVANÇADA --- */}
                                <div className="bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-2xl border-4 border-slate-800 transition-all h-fit">
                                    <div className="mb-6 border-b border-slate-800 pb-6">
                                        <h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none text-white flex items-center gap-3">
                                            <Award className="text-yellow-400" size={36}/> Velo Game
                                        </h2>
                                        <p className="text-xs font-bold mt-2 text-slate-400">Ative gatilhos psicológicos para fidelizar e reter mais clientes.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Roleta */}
                                        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-pink-500/20 p-2 rounded-xl text-pink-400"><Gift size={20}/></div>
                                                <div className="flex items-center gap-2">
                                                        <p className="font-black text-white text-sm uppercase">Roleta Pós-Checkout</p>
                                                        {settings.gamification?.roulette && (
                                                            <button 
                                                                onClick={() => {
                                                                    const defaultSlices = [
                                                                        { id: '1', label: '10% OFF', type: 'discount_percent', value: 10, probability: 10, stock: 50, color: '#ef4444' },
                                                                        { id: '2', label: 'R$ 5 Cashback', type: 'cashback', value: 5, probability: 15, stock: 100, color: '#f59e0b' },
                                                                        { id: '3', label: 'Nada 😭', type: 'empty', value: 0, probability: 25, stock: 9999, color: '#10b981' },
                                                                        { id: '4', label: '5% OFF', type: 'discount_percent', value: 5, probability: 15, stock: 100, color: '#3b82f6' },
                                                                        { id: '5', label: 'R$ 2 Cashback', type: 'cashback', value: 2, probability: 10, stock: 100, color: '#8b5cf6' },
                                                                        { id: '6', label: 'Tente na Próxima', type: 'empty', value: 0, probability: 25, stock: 9999, color: '#ec4899' }
                                                                    ];
                                                                    setRouletteSlices(settings.rouletteConfig?.slices || defaultSlices);
                                                                    setIsRouletteModalOpen(true);
                                                                }}
                                                                className="bg-pink-500/20 text-pink-300 hover:text-pink-100 hover:bg-pink-500/40 px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all"
                                                            >
                                                                ⚙️ Configurar Prêmios
                                                            </button>
                                                        )}
                                                    </div>
                                            </div>
                                            <input type="checkbox" className="w-5 h-5 accent-pink-500 cursor-pointer" checked={settings.gamification?.roulette || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, roulette: e.target.checked } }, { merge: true })} />
                                        </div>

                                        {/* Cashback */}
                                        <div className="flex items-start justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-green-500/20 p-2 rounded-xl text-green-400 mt-1"><Wallet size={20}/></div>
                                                <div className="pr-4">
                                                    <p className="font-black text-white text-sm uppercase">Carteira de Cashback</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Cliente usa saldo acumulado na compra.</p>
                                                    {settings.gamification?.cashback && (
                                                        <div className="mt-3 bg-green-900/30 p-3 rounded-xl border border-green-800/50">
                                                            <p className="text-[10px] text-green-400 font-bold leading-relaxed">
                                                                💡 <strong className="text-white">Automação Ativa:</strong> Toda vez que você marcar um pedido como "✅ Entregue", o sistema irá depositar automaticamente <strong>2% do valor</strong> na Carteira Digital atrelada ao WhatsApp do cliente.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <input type="checkbox" className="w-5 h-5 accent-green-500 cursor-pointer mt-1" checked={settings.gamification?.cashback || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, cashback: e.target.checked } }, { merge: true })} />
                                        </div>

                                        {/* Tiers VIP */}
                                        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400"><Crown size={20}/></div>
                                                <div>
                                                    <p className="font-black text-white text-sm uppercase">Níveis VIP (Bronze a Diamante)</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Barra de progresso de gastos no Perfil.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" className="w-5 h-5 accent-orange-500 cursor-pointer" checked={settings.gamification?.tiers || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, tiers: e.target.checked } }, { merge: true })} />
                                        </div>

                                        {/* Indique e Ganhe */}
                                        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400"><Share2 size={20}/></div>
                                                <div>
                                                    <p className="font-black text-white text-sm uppercase">Indique e Ganhe</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Link único para o cliente convidar amigos.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer" checked={settings.gamification?.referral || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, referral: e.target.checked } }, { merge: true })} />
                                        </div>

                                        {/* Selos (Badges) */}
                                        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400"><Medal size={20}/></div>
                                                <div>
                                                    <p className="font-black text-white text-sm uppercase">Selos de Conquista</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Badges liberadas via comportamento.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" className="w-5 h-5 accent-purple-500 cursor-pointer" checked={settings.gamification?.badges || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, badges: e.target.checked } }, { merge: true })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- 5. GESTÃO DE CUPONS (Abaixo das colunas) --- */}
                        <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[4rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <h2 className="text-2xl lg:text-4xl font-black italic tracking-tighter uppercase">Cupons</h2>
                                <button onClick={() => { setEditingCouponId(null); setCouponForm({ code: '', type: 'percentage', value: 0, minimumOrderValue: 0, usageLimit: null, userUsageLimit: null, expirationDate: '', firstPurchaseOnly: false, active: true }); setIsCouponModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm">+ NOVO CUPOM</button>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {coupons.map(c => (
                                    <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors">
                                        <div>
                                            <p className="font-black text-slate-800 text-lg uppercase">{c.code}</p>
                                            <p className="text-[10px] font-bold text-slate-500">{c.type === 'percentage' ? `${c.value}% OFF` : `R$ ${c.value} OFF`} {c.minimumOrderValue > 0 && `| Min: R$ ${c.minimumOrderValue}`}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingCouponId(c.id); setCouponForm(c); setIsCouponModalOpen(true); }} className="p-2 bg-white rounded-lg text-blue-600 shadow-sm hover:bg-blue-50"><Edit3 size={16} /></button>
                                            <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "coupons", c.id))} className="p-2 bg-white rounded-lg text-red-600 shadow-sm hover:bg-red-50"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                                {coupons.length === 0 && <p className="text-center text-slate-400 font-bold py-6 text-sm">Nenhum cupom criado ainda.</p>}
                            </div>
                        </div>
                    </div>
                )}
                {/* --- ABA DE EQUIPE E USUÁRIOS --- */}
                {activeTab === 'team' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Equipe</h1>
                                <p className="text-slate-400 font-bold mt-2">Gerencie os acessos e permissões da sua loja.</p>
                            </div>
                            <button onClick={() => { setEditingTeamId(null); setTeamForm({ name: '', email: '', permissions: { orders: false, products: false, customers: false, store_settings: false, integrations: false } }); setIsTeamModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center gap-2 transition-all active:scale-95">
                                <UserPlus size={20}/> NOVO USUÁRIO
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teamMembers.length === 0 ? (
                                <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                                    <Shield size={48} className="text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold">Sua equipe está vazia. Convide usuários para gerenciar a loja.</p>
                                </div>
                            ) : (
                                teamMembers.map(member => (
                                    <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                                                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-lg leading-tight truncate">{member.name}</h3>
                                                    <p className="text-xs font-bold text-slate-400 truncate">{member.email}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="mb-2">
                                                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Permissões:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {Object.entries(member.permissions || {}).filter(([_, v]) => v).map(([key]) => {
                                                    const labels = { orders: 'Pedidos', products: 'Cardápio', customers: 'Clientes', store_settings: 'Loja', integrations: 'Integrações' };
                                                    return (
                                                        <span key={key} className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-green-100">
                                                            {labels[key] || key}
                                                        </span>
                                                    );
                                                })}
                                                {Object.values(member.permissions || {}).every(v => !v) && (
                                                    <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200">Nenhuma</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 border-t border-slate-50 pt-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingTeamId(member.id); setTeamForm(member); setIsTeamModalOpen(true); }} className="flex-1 p-2 bg-slate-50 rounded-xl text-blue-600 font-bold text-xs uppercase hover:bg-blue-100 transition-all flex justify-center items-center gap-2"><Edit3 size={16} /> Editar</button>
                                            <button onClick={() => window.confirm("Remover usuário?") && deleteDoc(doc(db, "team", member.id))} className="flex-1 p-2 bg-slate-50 rounded-xl text-red-600 font-bold text-xs uppercase hover:bg-red-100 transition-all flex justify-center items-center gap-2"><Trash2 size={16} /> Excluir</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
{/* --- ABA FINANCEIRO (NOVA) --- */}
                {activeTab === 'finance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Financeiro & <br/>Infraestrutura</h1>
                                <p className="text-slate-400 font-bold mt-2">Monitore o consumo de recursos da sua loja.</p>
                            </div>
                            <div className="text-right">
    <p className="text-[10px] font-black uppercase text-slate-400">Status da Fatura</p>
    {storeStatus.paymentStatus === 'paid' ? (
        <span className="bg-green-500 text-white px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1 shadow-lg shadow-green-200">
            ✅ PAGO / PRO
        </span>
    ) : (
        <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1">
            ⚠️ EM ABERTO
        </span>
    )}
</div>
                        </div>

                        {/* NOVO CARD: STRIPE CONNECT */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                            <div className="flex items-center gap-2 mb-6">
                                <Landmark size={24} className="text-blue-600"/>
                                <h3 className="text-2xl font-black uppercase text-slate-800 italic">Recebimento de Vendas <span className="text-xs not-italic font-medium text-slate-400 normal-case ml-2">(Stripe Connect)</span></h3>
                            </div>
                            
                            {storeStatus.stripeConnectId ? (
                                <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <p className="text-green-800 font-black flex items-center gap-2 uppercase tracking-widest text-sm">✅ Conta Bancária Conectada</p>
                                        <p className="text-green-600 font-bold text-xs mt-1">ID: {storeStatus.stripeConnectId}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={handleOpenStripeDashboard} 
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        Ver Extrato e Saques <ExternalLink size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center flex flex-col items-center justify-center gap-4">
                                    <p className="text-slate-500 font-bold text-sm">Você ainda não configurou sua conta bancária para receber os pagamentos das suas vendas online via cartão e Pix.</p>
                                    <button 
                                        onClick={handleConectarBanco} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Landmark size={20}/> 🏦 Configurar Recebimento (Stripe)
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Card da Fatura */}
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                                <div className="absolute top-0 right-0 p-12 opacity-10"><Wallet size={200}/></div>
                                
                                <div className="relative z-10">
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Fatura Atual (Venc. 10/Próx)</p>
                                    <h2 className="text-6xl font-black italic tracking-tighter">R$ {invoiceData.total.toFixed(2)}</h2>
                                    
                                    <div className="mt-8 space-y-3">
                                        <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                                            <span className="text-slate-400">Manutenção Base (SaaS)</span>
                                            <span className="font-bold">R$ {invoiceData.basePlan.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                                            <span className="text-slate-400">Excedente de Processamento</span>
                                            <span className="font-bold text-orange-400">+ R$ {invoiceData.extraOrdersCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pb-2">
                                            <span className="text-slate-400">Storage & Database</span>
                                            <span className="font-bold text-green-400">Incluso</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleAssinarPro} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-900/50 transition-all active:scale-95 flex items-center justify-center gap-2">
        💳 Assinar com Cartão
    </button>
                            </div>

                            {/* Monitor de Infraestrutura */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-6">
                                    <Server size={24} className="text-slate-300"/>
                                    <h3 className="text-2xl font-black uppercase text-slate-800 italic">Velo Data Fuel <span className="text-xs not-italic font-medium text-slate-400 normal-case ml-2">(Consumo de Recursos)</span></h3>
                                </div>

                                <div className="space-y-8">
                                    {/* 1. Processamento (Pedidos) */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><Trophy size={14}/> Franquia de Processamento</label>
                                            <span className="text-xs font-bold text-blue-600">
                                                {orders.filter(o => {
                                                    if(!o.createdAt) return false;
                                                    const d = o.createdAt.toDate();
                                                    const now = new Date();
                                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                }).length} / 100 Req.
                                            </span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (orders.filter(o => {
                                                    if(!o.createdAt) return false;
                                                    const d = o.createdAt.toDate();
                                                    const now = new Date();
                                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                }).length / 100) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Requisições de pedidos, status e integrações. Acima de 100, custo de R$ 0,25/req.</p>
                                    </div>

                                    {/* 2. Storage (Imagens) */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><HardDrive size={14}/> Storage (Imagens/Mídia)</label>
                                            <span className="text-xs font-bold text-purple-600">{invoiceData.storageUsage.toFixed(1)} MB / 5 GB</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${(invoiceData.storageUsage / 5000) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* 3. Database (Clientes/Produtos) */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><Database size={14}/> Banco de Dados (Registros)</label>
                                            <span className="text-xs font-bold text-green-600">{invoiceData.dbUsage} / Ilimitado</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full w-full opacity-20"></div> {/* Ilimitado visualmente preenchido suave */}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Clientes e Produtos ilimitados no plano Infinity.</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Economia Gerada</p>
                                        <p className="text-xl font-black text-slate-800">R$ 0,00 <span className="text-[10px] font-normal text-slate-400">(Zero % Comissão)</span></p>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ciclo Atual</p>
                                        <p className="text-xl font-black text-slate-800">{new Date().toLocaleString('default', { month: 'long' })}/26</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Histórico de Faturas */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><FileText size={20}/> Histórico de Faturas</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-100 p-2 rounded-lg text-green-600"><FileText size={18}/></div>
                                        <div>
                                            <p className="font-bold text-slate-700">
                                                Fatura de Adesão ({storeStatus?.createdAt ? new Date(storeStatus.createdAt.toDate ? storeStatus.createdAt.toDate() : storeStatus.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Atual'})
                                            </p>
                                            <p className="text-xs font-bold text-slate-400">
                                                {storeStatus?.paymentStatus === 'paid' ? 'Pagamento Confirmado' : `Vence após 30 dias de teste`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-700">R$ 49,90</p>
                                        <p className="text-[10px] font-bold text-green-600 uppercase">Pago</p>
                                    </div>
                                </div>
                                <p className="text-center text-xs text-slate-400 font-bold py-4">Faturas anteriores arquivadas.</p>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'store_settings' && (
                    <div className="space-y-8">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Configurações</h1>
                        
                        {/* 1. Status Geral (Botão Gigante) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Controle Mestre</h2>
                            <button onClick={() => updateDoc(doc(db, "stores", storeId), { isOpen: !storeStatus.isOpen }, { merge: true })} className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-widest transition-all ${storeStatus.isOpen ? 'bg-green-500 text-white shadow-xl shadow-green-200' : 'bg-red-500 text-white shadow-xl shadow-red-200'}`}>{storeStatus.isOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}</button>
                            <p className="mt-4 text-xs font-bold text-slate-400">Isso abre ou fecha a loja manualmente, ignorando o horário.</p>
                        </div>
                        {/* --- BLOCO: RESTRIÇÃO DE IDADE (+18) --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mt-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
                                        <ShieldCheck size={24} className="text-red-500"/> Barreira de Idade (+18)
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1">
                                        Exija confirmação de idade ao entrar na loja (Obrigatório pelo Google Merchant).
                                    </p>
                                </div>
                                <label className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl cursor-pointer border border-red-100 hover:bg-red-100 transition-all">
                                    <input 
                                        type="checkbox" 
                                        checked={storeStatus.ageGateEnabled || false} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { ageGateEnabled: e.target.checked })}
                                        className="w-6 h-6 accent-red-600 cursor-pointer"
                                    />
                                    <span className="font-black text-red-800 uppercase tracking-widest text-sm">Ativar Restrição</span>
                                </label>
                            </div>
                        </div>
                        {/* --- NOVO: ESTILO DA VITRINE --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">🎨 Estilo da Vitrine</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => updateDoc(doc(db, "stores", storeId), { layoutTheme: 'grid' }, { merge: true })}
                                    className={`p-6 rounded-3xl border-4 font-bold flex flex-col items-center gap-4 transition-all ${storeStatus.layoutTheme === 'grid' || !storeStatus.layoutTheme ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-lg' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <span className="text-lg">🏪 Grade (Conveniência)</span>
                                    <span className="text-xs font-normal text-center">Lado a lado, foto pequena, focado em compra rápida (Bebidas/Mercado).</span>
                                </button>
                                
                                <button
                                    onClick={() => updateDoc(doc(db, "stores", storeId), { layoutTheme: 'list' }, { merge: true })}
                                    className={`p-6 rounded-3xl border-4 font-bold flex flex-col items-center gap-4 transition-all ${storeStatus.layoutTheme === 'list' ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-lg' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <span className="text-lg">🍔 Lista (Restaurante)</span>
                                    <span className="text-xs font-normal text-center">Cardápio vertical, abre foto gigante (Lanches/Sushi/Porções).</span>
                                </button>
                            </div>
                        </div>
                        {/* --- SELETOR DE NICHO (CORES E IDENTIDADE) --- */}
<div className="mt-8 pt-8 border-t border-slate-100">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">🎯 Nicho da Loja (Personaliza Cores)</label>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
       {[
            { id: 'default', label: 'Conveniência', color: '#2563eb' },
            { id: 'pizza', label: 'Pizzaria', color: '#e11d48' },
            { id: 'oriental', label: 'Oriental', color: '#111827' },
            { id: 'natural', label: 'Hortifruti', color: '#16a34a' },
            { id: 'sweet', label: 'Doceria/Açaí', color: '#9333ea' },
            { id: 'burger', label: 'Hamburgueria', color: '#ea580c' },
            { id: 'drinks', label: 'Adega', color: '#f59e0b' },
            { id: 'custom', label: 'Personalizado', color: storeStatus.customColor || '#475569' }
        ].map(nicho => (
            <button
                key={nicho.id}
                onClick={() => updateDoc(doc(db, "stores", storeId), { storeNiche: nicho.id }, { merge: true })}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${storeStatus.storeNiche === nicho.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white'}`}
            >
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: nicho.color }}></div>
                <span className="text-[10px] font-black uppercase">{nicho.label}</span>
            </button>
        ))}
    </div>

    <AnimatePresence>
        {storeStatus.storeNiche === 'custom' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 overflow-hidden">
                <h4 className="text-sm font-black text-slate-700 uppercase">🎨 Personalização Avançada</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Cor Principal (HEX)</label>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200">
                            <input 
                                type="color" 
                                value={storeStatus.customColor || '#2563eb'} 
                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { customColor: e.target.value }, { merge: true })}
                                className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                            />
                            <input 
                                type="text" 
                                value={storeStatus.customColor || '#2563eb'}
                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { customColor: e.target.value }, { merge: true })}
                                className="flex-1 font-bold bg-transparent outline-none text-slate-700 uppercase"
                                placeholder="#HEX"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Imagem de Fundo (Opcional)</label>
                        <input type="file" accept="image/*" onChange={(e) => setCustomBgFile(e.target.files[0])} className="hidden" id="custom-bg-upload" />
                        <div className="flex items-center gap-2">
                            <label htmlFor="custom-bg-upload" className="flex-1 p-4 bg-white rounded-2xl font-bold text-slate-600 cursor-pointer border border-slate-200 text-center hover:bg-slate-100 transition-all text-sm truncate">
                                {customBgFile ? customBgFile.name : (storeStatus.customBackgroundUrl ? 'Alterar Fundo' : 'Selecionar Imagem')}
                            </label>
                            {customBgFile && (
                                <button onClick={handleCustomBgUpload} disabled={uploadingCustomBg} className="p-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">
                                    {uploadingCustomBg ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                </button>
                            )}
                        </div>
                        {storeStatus.customBackgroundUrl && (
                            <button onClick={() => updateDoc(doc(db, "stores", storeId), { customBackgroundUrl: null }, { merge: true })} className="mt-3 text-[10px] text-red-500 font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                                <Trash2 size={12}/> Remover Fundo Atual
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
</div>
                        {/* 2. Informações e Mensagem */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Dados da Loja</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Nome da Loja</label>
                                    <input type="text" placeholder="Nome da Loja" value={storeStatus.name} onChange={(e) => updateDoc(doc(db, "stores", storeId), { name: e.target.value }, { merge: true })} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">CNPJ da Loja (Opcional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 00.000.000/0001-00" 
                                        value={storeStatus.cnpj || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { cnpj: e.target.value }, { merge: true })} 
                                        className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600" 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Exibido no rodapé da sua loja para maior transparência e credibilidade.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2"><MessageSquare size={14}/> Mensagem / Aviso (Aparece no Topo)</label>
                                    <input type="text" placeholder="Ex: Voltamos em 15min / Promoção de Carnaval" value={storeStatus.message || ''} onChange={(e) => updateDoc(doc(db, "stores", storeId), { message: e.target.value }, { merge: true })} className="w-full p-5 bg-blue-50 text-blue-700 rounded-2xl font-bold border-none placeholder-blue-300" />
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                    <Tags size={14}/> Slogan / Descrição
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Bebidas geladas, carvão e entrega rápida." 
                                    value={storeStatus.slogan || ''} 
                                    onChange={(e) => updateDoc(doc(db, "stores", storeId), { slogan: e.target.value }, { merge: true })} 
                                    className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600" 
                                />
                            </div>
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <MessageCircle size={14}/> WhatsApp para Receber Pedidos
                                    </label>
                                    <input 
                                        type="tel" 
                                        placeholder="Ex: 5551999999999 (DDD + Número)" 
                                        value={storeStatus.whatsapp || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { whatsapp: e.target.value }, { merge: true })} 
                                        className="w-full p-5 bg-green-50 text-green-700 rounded-2xl font-bold border-none placeholder-green-300" 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Digite apenas números com DDD (ex: 55519...). É para esse número que o cliente será enviado.</p>
                                </div>
                                {/* NOVO CAMPO: LINK DO GOOGLE MEU NEGÓCIO */}
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <Star size={14} className="text-yellow-500"/> Link de Avaliação (Google Meu Negócio)
                                    </label>
                                    <input 
                                        type="url" 
                                        placeholder="Ex: https://g.page/r/SUA_LOJA/review" 
                                        value={storeStatus.googleReviewUrl || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { googleReviewUrl: e.target.value }, { merge: true })} 
                                        className="w-full p-5 bg-yellow-50 text-yellow-700 rounded-2xl font-bold border-none placeholder-yellow-300 outline-none focus:ring-2 ring-yellow-400" 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Cole aqui o link do Google para seus clientes ganharem pontos avaliando SUA loja.</p>
                                </div>
                                </div>
                                {/* NOVO CAMPO: GOOGLE ANALYTICS */}
<div className="mt-4 border-t border-slate-100 pt-4">
    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
        <TrendingUp size={14} className="text-blue-500"/> ID de Rastreamento (Google Analytics 4)
    </label>
    <input 
        type="text" 
        placeholder="Ex: G-XXXXXXXXXX" 
        value={storeStatus.gaTrackingId || ''} 
        onChange={(e) => updateDoc(doc(db, "stores", storeId), { gaTrackingId: e.target.value.toUpperCase().trim() }, { merge: true })} 
        className="w-full p-5 bg-blue-50/50 text-blue-800 rounded-2xl font-black border border-blue-100 placeholder-blue-300 outline-none focus:ring-2 ring-blue-400 uppercase" 
    />
    <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">
        Opcional: Cole seu código G- do Analytics. Os relatórios completos de origem de tráfego, cidades e eventos aparecerão direto no seu painel oficial do Google.
    </p>
</div>
                            </div>
                            {/* --- NOVO BLOCO: LOCALIZAÇÃO E REGRAS --- */}
                            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                                <h2 className="text-2xl font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <MapPin size={24}/> Localização e Regras
                                </h2>
                                
                                {/* 1. Endereço Físico (Para o Rodapé) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Endereço Completo</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Av. Ipiranga, 1200 - Porto Alegre/RS" 
                                            className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-bold border-none"
                                            value={storeStatus.address || ''} 
                                            onChange={(e) => updateDoc(doc(db, "stores", storeId), { address: e.target.value }, { merge: true })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Dica: Esse endereço vai gerar o link do Google Maps no site.</p>
                                </div>

                                {/* --- MODO GARÇOM --- */}
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <Utensils size={14} className="text-purple-500"/> PIN do Modo Garçom (Salão)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 1234 (Padrão)" 
                                        className="w-full p-5 bg-slate-50 rounded-2xl font-black text-slate-700 border-none outline-none focus:ring-2 ring-purple-400"
                                        value={storeStatus.waiterPin || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { waiterPin: e.target.value }, { merge: true })}
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">Senha para os garçons acessarem o sistema no rodapé da loja. (Se vazio, o padrão é 1234).</p>
                                </div>

                                {/* 2. Meta de Frete Grátis (Para a Barra de Progresso) */}
                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <Trophy size={14} className="text-yellow-500"/> Meta para Frete Grátis (R$)
                                    </label>
                                    <input 
                                        type="number" step="0.01" 
                                        placeholder="Ex: 100.00 (Deixe 0 para desativar)" 
                                        className="w-full p-5 bg-slate-50 rounded-2xl font-black text-slate-700 border-none outline-none focus:ring-2 ring-yellow-400"
                                        value={storeStatus.freeShippingThreshold || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { freeShippingThreshold: Number(e.target.value) }, { merge: true })}
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">Ativa a barrinha de progresso no carrinho. Deixe 0 se não quiser oferecer frete grátis.</p>
                                </div>

                                {/* 3. Coordenadas (Latitude e Longitude) */}
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Coordenadas da Loja (Latitude e Longitude)</label>
                                    <p className="text-[10px] text-slate-400 mb-3 ml-2">Clique com botão direito na sua loja no Google Maps e copie os números. Essencial para o frete por KM.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input 
                                            type="number" step="any" placeholder="Latitude (Ex: -27.59)" 
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none"
                                            value={storeStatus.lat || ''} 
                                            onChange={(e) => setStoreStatus(prev => ({...prev, lat: e.target.value}))}
                                        />
                                        <input 
                                            type="number" step="any" placeholder="Longitude (Ex: -48.54)" 
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none"
                                            value={storeStatus.lng || ''} 
                                            onChange={(e) => setStoreStatus(prev => ({...prev, lng: e.target.value}))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Horários da Semana (NOVO!) */}
                        {/* 3. Horários da Semana (NOVO!) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                                <Calendar size={24}/> Horários de Funcionamento
                            </h2>
                            <div className="space-y-3">
                                {DAYS_OF_WEEK.map(day => {
                                    const dayConfig = (storeStatus.schedule && storeStatus.schedule[day.id]) || { open: false, start: '08:00', end: '23:00' };
                                    return (
                                        <div key={day.id} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border-2 transition-all ${dayConfig.open ? 'bg-white border-blue-100' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                            <div className="flex items-center gap-4 w-full md:w-32">
                                                <input 
                                                    type="checkbox" 
                                                    checked={dayConfig.open} 
                                                    onChange={(e) => handleScheduleChange(day.id, 'open', e.target.checked)}
                                                    className="w-6 h-6 rounded-md accent-blue-600 cursor-pointer"
                                                />
                                                <span className="font-black text-slate-700 uppercase">{day.label}</span>
                                            </div>
                                            
                                            {dayConfig.open && (
                                                <div className="flex items-center gap-2 flex-1 w-full">
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.start} 
                                                        onChange={(e) => handleScheduleChange(day.id, 'start', e.target.value)}
                                                        className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                    />
                                                    <span className="font-bold text-slate-300">até</span>
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.end} 
                                                        onChange={(e) => handleScheduleChange(day.id, 'end', e.target.value)}
                                                        className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 4. Mídia da Loja */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Mídia da Loja</h2>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col items-center gap-4 border-b pb-6">
                                    <img src={logoFile ? URL.createObjectURL(logoFile) : storeStatus.storeLogoUrl} className="w-24 h-24 object-contain rounded-full border-2 border-blue-50" />
                                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" id="logo-upload" />
                                    <label htmlFor="logo-upload" className="p-3 bg-slate-50 rounded-xl font-bold cursor-pointer text-sm">Selecionar Logo</label>
                                    {logoFile && <button onClick={handleLogoUpload} disabled={uploadingLogo} className="p-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Enviar Logo</button>}
                                </div>
                            </div>
                        </div>

                        {/* --- INÍCIO DO BLOCO DE FRETES COM MAPA INTERATIVO --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
                            
                            {/* FRETES POR RAIO (KM) - COM MAPA */}
                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2"><MapPin size={24} className="text-blue-600"/> Zonas de Entrega (Mapa)</h2>
                                        <p className="text-xs font-bold text-slate-400 mt-1">Busque o endereço da sua loja para centralizar o mapa, depois adicione os raios de entrega.</p>
                                    </div>
                                    <button onClick={handleAddDeliveryZone} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">+ Adicionar Zona</button>
                                </div>
                                
                                {/* O MAPA INTERATIVO COM BUSCA */}
                                {isLoaded ? (
                                    <div className="space-y-4 mb-6">
                                        
                                        {/* BARRA DE BUSCA DO LOJISTA */}
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                                            <Autocomplete
                                                onLoad={setAdminMapAutocomplete}
                                                onPlaceChanged={onAdminPlaceChanged}
                                                options={{ componentRestrictions: { country: "br" } }}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Digite o endereço ou CEP da sua loja aqui..."
                                                    className="w-full p-4 pl-12 bg-blue-50/50 border-2 border-blue-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-200 transition-all"
                                                />
                                            </Autocomplete>
                                        </div>

                                        {/* O MAPA EM SI */}
                                        <div className="w-full h-[400px] rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-inner relative">
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={{ 
                                                    lat: Number(storeStatus.lat) || -23.5505,
                                                    lng: Number(storeStatus.lng) || -46.6333 
                                                }}
                                                zoom={14}
                                                options={{ disableDefaultUI: true, zoomControl: true }}
                                            >
                                                {/* Pino da Loja (Arrastável caso ele queira ajustar o detalhe) */}
                                                <Marker 
                                                    position={{ lat: Number(storeStatus.lat) || -23.5505, lng: Number(storeStatus.lng) || -46.6333 }} 
                                                    draggable={true} 
                                                    onDragEnd={(e) => {
                                                        setStoreStatus(prev => ({...prev, lat: e.latLng.lat(), lng: e.latLng.lng()}));
                                                    }}
                                                />

                                                {/* Desenho dos Círculos (Raios de KM) */}
                                                {(storeStatus.delivery_zones || []).map((zone, idx) => {
                                                    const colors =['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                                                    return zone.radius_km > 0 && (
                                                        <Circle 
                                                            key={idx}
                                                            center={{ lat: Number(storeStatus.lat) || -23.5505, lng: Number(storeStatus.lng) || -46.6333 }}
                                                            radius={zone.radius_km * 1000} // Transforma KM em Metros
                                                            options={{
                                                                fillColor: colors[idx % colors.length],
                                                                fillOpacity: 0.15,
                                                                strokeColor: colors[idx % colors.length],
                                                                strokeOpacity: 0.8,
                                                                strokeWeight: 2,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </GoogleMap>
                                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 shadow-lg">
                                                📍 Lat: {Number(storeStatus.lat || 0).toFixed(4)} | Lng: {Number(storeStatus.lng || 0).toFixed(4)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-[400px] rounded-[2rem] bg-slate-50 flex items-center justify-center font-bold text-slate-400 mb-6 border-2 border-dashed border-slate-200 animate-pulse">
                                        Conectando ao Google Maps...
                                    </div>
                                )}

                                {/* LISTA DE ZONAS PARA EDITAR */}
                                <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    {(!storeStatus.delivery_zones || storeStatus.delivery_zones.length === 0) ? (
                                        <p className="text-sm font-bold text-slate-400 text-center">Nenhuma zona configurada. Clique em "+ Adicionar Zona" para começar.</p>
                                    ) : (
                                        storeStatus.delivery_zones.map((zone, idx) => (
                                            <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex-1 flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-400 uppercase">Raio Máximo</span>
                                                    <input type="number" placeholder="Ex: 5" value={zone.radius_km} onChange={e => handleUpdateDeliveryZone(idx, 'radius_km', e.target.value)} className="w-20 p-3 bg-slate-50 rounded-xl outline-none font-black text-slate-800 text-center focus:ring-2 ring-blue-500" />
                                                    <span className="text-xs font-black text-slate-400 uppercase">KM</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-400 uppercase">Frete: R$</span>
                                                    <input type="number" placeholder="Valor" value={zone.fee} onChange={e => handleUpdateDeliveryZone(idx, 'fee', e.target.value)} className="w-24 p-3 bg-green-50 rounded-xl outline-none font-black text-green-700 text-center focus:ring-2 ring-green-500" />
                                                </div>
                                                <button onClick={() => handleRemoveDeliveryZone(idx)} className="p-3 text-red-500 hover:text-red-700 bg-red-50 rounded-xl transition-all" title="Remover Zona"><Trash2 size={18}/></button>
                                            </div>
                                        ))
                                    )}
                                    <button onClick={handleSaveDeliveryZones} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">
                                        Salvar Mapa e Zonas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* --- ABA DE INTEGRAÇÕES --- */}
                {activeTab === 'integrations' && (() => {
                    // Dicionário das integrações com Links Oficiais de Ajuda
                    const integrationList =[
                        { 
                            id: 'meta', 
                            name: 'Meta Ads', 
                            desc: 'Pixel de Rastreamento e Conversions API (CAPI).', 
                            icon: <FaFacebook className="text-blue-600" size={40}/>, 
                            fields:[
                                {key: 'pixelId', label: 'ID do Pixel (Dataset ID)'}, 
                                {key: 'apiToken', label: 'Token da API de Conversões (Opcional)'}
                            ],
                            helpUrl: 'https://business.facebook.com/settings/pixels',

                            helpText: 'Descobrir meu ID do Meta Pixel'
                        },
                        { 
                            id: 'ga4', 
                            name: 'Google Analytics 4', 
                            desc: 'Métricas avançadas de tráfego e funil.', 
                            icon: <FaGoogle className="text-orange-500" size={40}/>, 
                            fields:[
                                {key: 'measurementId', label: 'Measurement ID (Ex: G-XXXXX)'}
                            ],
                            helpUrl: 'https://analytics.google.com/analytics/web/',
                            helpText: 'Encontrar meu ID (G-XXXX)'
                        },
                        { 
                            id: 'gads', 
                            name: 'Google Ads', 
                            desc: 'Acompanhamento de conversões de campanhas.', 
                            icon: <FaGoogle className="text-blue-500" size={40}/>, 
                            fields:[
                                {key: 'conversionId', label: 'ID de Conversão (Ex: AW-XXXX)'}, 
                                {key: 'conversionLabel', label: 'Rótulo de Conversão (Label)'}
                            ],
                            helpUrl: 'https://ads.google.com/aw/conversions',
                            helpText: 'Ver minhas Conversões no Google Ads'
                        },
                        { 
                            id: 'order_with_google', 
                            name: 'Google Maps (Pedidos)', 
                            desc: 'Botão "Fazer Pedido" direto na Busca e Maps.', 
                            icon: <FaStore className="text-orange-500" size={40}/>, 
                            fields:[
                                {key: 'merchantId', label: 'ID da sua Loja no Google Actions'}
                            ],
                            helpUrl: 'https://partnerdash.google.com/',
                            helpText: 'Acessar o Actions Center'
                        },
                        { 
                            id: 'gtm', 
                            name: 'Google Tag Manager', 
                            desc: 'Gerenciador de tags do Google.', 
                            icon: <FaTags className="text-blue-400" size={40}/>, 
                            fields:[
                                {key: 'containerId', label: 'ID do Container (Ex: GTM-XXXX)'}
                            ],
                            helpUrl: 'https://tagmanager.google.com/',
                            helpText: 'Encontrar meu GTM ID'
                        },
                        { 
                            id: 'whatsapp', 
                            name: 'WhatsApp API', 
                            desc: 'Disparos automáticos pela API Oficial Cloud.', 
                            icon: <FaWhatsapp className="text-green-500" size={40}/>, 
                            fields:[
                                {key: 'phoneNumberId', label: 'ID do Número de Telefone'}, 
                                {key: 'apiToken', label: 'Token de Acesso Permanente'}
                            ],
                            helpUrl: 'https://developers.facebook.com/apps/',
                            helpText: 'Acessar o Painel de Desenvolvedor (Meta)'
                        }
                    ];

                    return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Integrações & API</h1>
                                    <p className="text-slate-400 font-bold mt-2">Conecte sua loja às principais ferramentas de marketing e vendas.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {integrationList.map((app) => {
                                    // Verifica se esta integração já tem dados salvos no Firebase
                                    const savedData = settings?.integrations?.[app.id] || {};
                                    // Consideramos 'Conectado' se a primeira chave obrigatória não estiver vazia
                                    const isConnected = !!savedData[app.fields[0].key];

                                    return (
                                        <div key={app.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all group relative overflow-hidden">
                                            {isConnected && <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-[3rem] -z-0"></div>}
                                            
                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
                                                    {app.icon}
                                                </div>
                                                {isConnected ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">✅ Ativo</span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Desconectado</span>
                                                )}
                                            </div>
                                            
                                            <div className="mb-8 relative z-10">
                                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{app.name}</h3>
                                                <p className="text-xs text-slate-400 mt-2 font-medium">
        CNPJ: {store.cnpj}
    </p>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    setSelectedIntegration(app);
                                                    setIntegrationForm(savedData); // Carrega os dados existentes pro input
                                                    setIsIntegrationModalOpen(true);
                                                }}
                                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'}`}
                                            >
                                                {isConnected ? '⚙️ Configurar' : '+ Conectar API'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </main>

            {/* --- RODAPÉ MOBILE: ESTRUTURA REVISADA --- */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-0 flex flex-col lg:hidden z-50"> 
               {/* Barra da Versão e Atualização Mobile */}
                <div className="w-full flex justify-between items-center px-3 pt-1.5 pb-1 border-b border-slate-50/10">
                    <span className="text-[8px] font-medium text-slate-300">Veloapp V7.1</span>
                    <button onClick={() => setIsUpdateModalOpen(true)} className="flex items-center gap-1 text-[8px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full transition-all">
                        <RefreshCw size={10} /> Atualizar Painel
                    </button>
                </div>
                {/* Botões de Navegação */}
                <div className="flex justify-around overflow-x-auto whitespace-nowrap p-2">
                    {allNavItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center px-2 py-1 rounded-lg flex-shrink-0 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
                            {item.mobileIcon} <span className="text-[10px] font-bold">{item.name}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* MODAIS (CÓDIGO MANTIDO IGUAL AO SEU) */}
            <AnimatePresence>
                {isCatModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
                            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X /></button>
                            <h2 className="text-2xl font-black uppercase mb-6">{editingCatId ? 'Editar' : 'Nova'} Categoria</h2>
                           <form onSubmit={async (e) => { e.preventDefault(); try { const dataToSave = { ...catForm, order: Number(catForm.order) || 0, storeId: storeId }; if (editingCatId) await updateDoc(doc(db, "categories", editingCatId), dataToSave); else await addDoc(collection(db, "categories"), dataToSave); setIsCatModalOpen(false); alert("Categoria salva!"); } catch (error) { alert("Erro ao salvar."); } }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input type="text" placeholder="Nome da Categoria" className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                                    <input type="number" placeholder="Ordem (Ex: 1, 2, 3)" className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={catForm.order} onChange={e => setCatForm({ ...catForm, order: e.target.value })} required />
                                </div>
                                {/* NOVO: SELETOR DE ÍCONES */}
<label className="text-xs font-bold text-slate-400 mb-2 block">Selecione um Ícone</label>
<div className="grid grid-cols-4 gap-2 mb-6 max-h-40 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar">
    {AVAILABLE_ICONS.map(iconDef => (
        <button
            type="button"
            key={iconDef.id}
            onClick={() => setCatForm({ ...catForm, icon: iconDef.id })}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${catForm.icon === iconDef.id ? 'border-blue-600 bg-blue-100 text-blue-700' : 'border-transparent bg-white text-slate-400 hover:bg-slate-200'}`}
        >
            {iconDef.component}
            <span className="text-[8px] font-black uppercase mt-1 text-center truncate w-full">{iconDef.label}</span>
        </button>
    ))}
</div>
                                <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Salvar</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isBannerModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsBannerModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingBannerId ? 'Editar' : 'Novo'} Banner</h2>
                            <form onSubmit={handleSaveGeneralBanner} className="space-y-6">
                                <input type="text" placeholder="Link do Banner" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.linkTo} onChange={e => setBannerForm({ ...bannerForm, linkTo: e.target.value })} required />
                                <input type="number" placeholder="Ordem" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={bannerForm.order} onChange={e => setBannerForm({ ...bannerForm, order: e.target.value })} required /> {/* Corrigido 'setForm' para 'setBannerForm' aqui */}
                                <div className="space-y-3">
                                    {(bannerImageFile || bannerForm.imageUrl) && <img src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : bannerForm.imageUrl} className="w-full h-40 object-contain rounded-2xl bg-slate-50" />}
                                    <input type="file" accept="image/*" onChange={(e) => setBannerImageFile(e.target.files[0])} className="hidden" id="banner-general-image-upload" />
                                    <label htmlFor="banner-general-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-center gap-3 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200">{bannerImageFile ? bannerImageFile.name : (bannerForm.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} <UploadCloud size={20} /></label>
                                    {bannerImageFile && <button type="button" onClick={handleGeneralBannerImageUpload} disabled={uploadingBannerImage} className={`w-full p-4 rounded-3xl font-black text-white ${uploadingBannerImage ? 'bg-blue-400' : 'bg-blue-600'}`}>{uploadingBannerImage ? 'Enviando...' : 'Confirmar Upload'}</button>}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Banner</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-4xl font-black italic mb-10 uppercase text-slate-900 tracking-tighter leading-none">{editingId ? 'Editar' : 'Novo'} Item</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                
                                const isFood = isFoodCategory(form.category);
                                
                                // PASSO 3: Parse dos novos campos antes de salvar, com proteção de UX
                                const data = { 
                                    ...form, 
                                    price: parseFloat(form.price) || 0, 
                                    costPrice: parseFloat(form.costPrice) || 0,
                                    promotionalPrice: parseFloat(form.promotionalPrice) || 0,
                                    stock: parseInt(form.stock || 0), 
                                    // Zera preparo, caloria e dieta se não for comida
                                    prepTime: isFood && form.prepTime ? parseInt(form.prepTime) : null,
                                    calories: isFood && form.calories ? parseInt(form.calories) : null,
                                    suitableForDiet: isFood ? (form.suitableForDiet || []) :[],
                                    deliveryLeadTime: form.deliveryLeadTime ? parseInt(form.deliveryLeadTime) : '',
                                    variations: form.variations ? form.variations.split(',').map(v => v.trim()).filter(v => v) :[],
                                    storeId: storeId 
                                };
                                if (editingId) { await updateDoc(doc(db, "products", editingId), data); } else { await addDoc(collection(db, "products"), data); }
                                setIsModalOpen(false); setImageFile(null);
                            }} className="space-y-6">
                                {/* --- INÍCIO: CAMPOS COM NUDGES DE SEO E EXEMPLO VISUAL --- */}
                                <div className="space-y-4">
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Nome do Produto" 
                                            className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none focus:ring-2 ring-blue-500 transition-all" 
                                            value={form.name} 
                                            onChange={e => setForm({ ...form, name: e.target.value })} 
                                            required 
                                        />
                                        <p className="text-[11px] text-blue-600 font-bold mt-2 ml-4 flex items-center gap-1">
                                            <Search size={12} /> O nome exato que o seu cliente digitaria na busca do Google.
                                        </p>
                                        {/* --- GERADOR DE IA --- */}
<div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-3xl border border-purple-100 mb-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
    <div className="flex-1 w-full">
        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
            ✨ Assistente de Vendas IA
        </label>
        <input 
            type="text" 
            placeholder="Ex: hamburguer de costela, heineken gelada..." 
            className="w-full p-4 bg-white rounded-2xl border border-purple-200 outline-none text-sm font-bold focus:ring-2 ring-purple-400 text-slate-700"
            value={termoIA}
            onChange={(e) => setTermoIA(e.target.value)}
        />
    </div>
    <button 
        type="button" 
        onClick={handleGenerateProductCopy}
        disabled={isGeneratingCopy}
        className="w-full md:w-auto mt-2 md:mt-0 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 active:scale-95 flex-shrink-0"
    >
        {isGeneratingCopy ? 'Mágica...' : 'Gerar IA'}
    </button>
</div>
{/* --------------------- */}
                                    </div>

                                    <div>
                                        <textarea 
                                            rows="2" 
                                            placeholder="Breve Descrição do Produto (Opcional mas recomendado)" 
                                            className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none focus:ring-2 ring-blue-500 transition-all" 
                                            value={form.description} 
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        ></textarea>
                                        <p className="text-[11px] text-slate-400 font-bold mt-2 ml-4">
                                            Detalhes atrativos ajudam a vender mais e melhoram seu posicionamento orgânico.
                                        </p>
                                    </div>

                                    {/* BOX DE EXEMPLO PERFEITO DE SEO */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 shadow-sm mt-2">
                                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Flame size={14} className="text-orange-500" /> O que mais vende no Google
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Exemplo Ruim */}
                                            <div className="bg-white/60 p-4 rounded-2xl border border-red-100">
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">❌ Cadastro Ruim (Invisível)</p>
                                                <p className="text-sm font-bold text-slate-400 line-through decoration-red-400">Heineken</p>
                                                <p className="text-xs text-slate-400 mt-1 italic">"Cerveja gelada."</p>
                                            </div>
                                            
                                            {/* Exemplo Bom */}
                                            <div className="bg-white p-4 rounded-2xl border-2 border-green-400 shadow-md relative overflow-hidden">
                                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-lg uppercase">Ideal</div>
                                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">✅ Cadastro Perfeito (Vende muito)</p>
                                                <p className="text-sm font-black text-slate-800">Cerveja Heineken Long Neck 330ml Gelada</p>
                                                <p className="text-xs text-slate-600 mt-1 italic font-medium">"Cerveja Premium Puro Malte em garrafa de vidro 330ml. Entregue trincando de gelada na sua porta em minutos."</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* --- FIM: CAMPOS COM NUDGES DE SEO E EXEMPLO VISUAL --- */}
                                
                                {/* PASSO 2: Atualização da UI do Modal de Produto */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Custo (R$)</label>
                                        <input type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold border-none" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Venda (R$)</label>
                                        <input type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold border-none" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 ml-2">Promo (R$)</label>
                                        <input type="number" step="0.01" placeholder="Opcional" className="w-full p-4 bg-orange-50 text-orange-600 rounded-xl outline-none font-bold border-none" value={form.promotionalPrice} onChange={e => setForm({ ...form, promotionalPrice: e.target.value })} />
                                    </div>
                                </div>
                                
                                {/* PASSO 2 (continuação): Badge de cálculo de lucro */}
                                {(() => {
                                    const cost = parseFloat(form.costPrice) || 0;
                                    const salePrice = parseFloat(form.promotionalPrice) > 0 ? parseFloat(form.promotionalPrice) : parseFloat(form.price) || 0;
                                    if (cost > 0 && salePrice > 0) {
                                        const profitValue = salePrice - cost;
                                        const profitMargin = (profitValue / salePrice) * 100;
                                        return (
                                            <div className="text-center bg-slate-50 p-2 rounded-xl text-xs font-bold text-slate-500">
                                                Lucro: <span className="text-green-600">R$ {profitValue.toFixed(2)}</span> ({profitMargin.toFixed(1)}%)
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="number" placeholder="Estoque" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                                    <label className="flex items-center gap-3 p-6 bg-cyan-50 rounded-3xl cursor-pointer border border-cyan-100 hover:bg-cyan-100 transition-all">
                                        <input type="checkbox" checked={form.isChilled || false} onChange={e => setForm({ ...form, isChilled: e.target.checked })} className="w-6 h-6 accent-cyan-600 cursor-pointer" />
                                        <span className="font-black text-cyan-800 uppercase tracking-widest text-sm">❄️ Entregar Gelada</span>
                                    </label>
                                </div>

                               <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Selecione a Categoria</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 ml-2">Variações Simples (Separadas por vírgula)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Morango, Limão, Maracujá" 
                                        className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none mt-1 focus:ring-2 ring-blue-500 transition-all" 
                                        value={form.variations} 
                                        onChange={e => setForm({ ...form, variations: e.target.value })} 
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 ml-4 font-bold">Opcional. Se preenchido, o cliente será obrigado a escolher uma opção.</p>
                                </div>

                               {/* --- INÍCIO: NOVOS CAMPOS SEO, LOGÍSTICA E NUTRIÇÃO --- */}
                               {/* --- INÍCIO: NOVOS CAMPOS SEO, LOGÍSTICA E NUTRIÇÃO --- */}
                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        🚀 SEO, Logística e Nutrição
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold mb-2">Esses dados alimentam o Google e melhoram a conversão do app.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 ml-2">Código de Barras (GTIN)</label>
                                            <input type="text" placeholder="Ex: 7894900011517" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-sm border-none" value={form.gtin} onChange={e => setForm({...form, gtin: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 ml-2">Marca / Fabricante</label>
                                            <input type="text" placeholder="Ex: Coca-Cola" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-sm border-none" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 ml-2">Tempo de Entrega (min)</label>
                                            <input type="number" placeholder="Ex: 30" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-sm border-none" value={form.deliveryLeadTime} onChange={e => setForm({...form, deliveryLeadTime: e.target.value})} />
                                        </div>
                                    </div>

                                    {/* CONDICIONAL: APENAS SE FOR COMIDA PREPARADA */}
                                    {isFoodCategory(form.category) && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 ml-2">Tempo de Preparo (min)</label>
                                                    <input type="number" placeholder="Ex: 15" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-sm border-none" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 ml-2">Calorias (Kcal)</label>
                                                    <input type="number" placeholder="Ex: 350" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-sm border-none" value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} />
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <label className="text-[10px] font-bold text-slate-400 mb-2 block ml-2">Restrições Alimentares / Dieta</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { label: '🌿 Vegano', value: 'https://schema.org/VeganDiet' },
                                                        { label: '🥗 Vegetariano', value: 'https://schema.org/VegetarianDiet' },
                                                        { label: '🌾 Sem Glúten', value: 'https://schema.org/GlutenFreeDiet' },
                                                        { label: '☪️ Halal', value: 'https://schema.org/HalalDiet' },
                                                        { label: '✡️ Kosher', value: 'https://schema.org/KosherDiet' },
                                                    ].map(diet => {
                                                        const isSelected = form.suitableForDiet.includes(diet.value);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={diet.value}
                                                                onClick={() => {
                                                                    const current = form.suitableForDiet;
                                                                    setForm({
                                                                        ...form,
                                                                        suitableForDiet: isSelected
                                                                            ? current.filter(d => d !== diet.value)
                                                                            : [...current, diet.value]
                                                                    });
                                                                }}
                                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                                                    isSelected 
                                                                    ? 'bg-green-600 text-white border-green-600 shadow-md' 
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-green-300'
                                                                }`}
                                                            >
                                                                {diet.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* --- FIM: NOVOS CAMPOS SEO, LOGÍSTICA E NUTRIÇÃO --- */}
                                <div className="space-y-2 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Flame size={14} className="text-orange-500"/> Compre Junto (Upsell)
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold mb-2">Selecione produtos para sugerir no carrinho:</p>
                                    
                                    <div className="flex gap-2 flex-wrap bg-slate-50 p-4 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                                        {products.filter(p => p.id !== editingId).map(p => {
                                            const isSelected = (form.recommendedIds ||[]).includes(p.id);
                                            return (
                                                <button 
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = form.recommendedIds ||[];
                                                        setForm({
                                                            ...form, 
                                                            recommendedIds: isSelected 
                                                                ? current.filter(id => id !== p.id) 
                                                                :[...current, p.id]
                                                        });
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center gap-2 ${
                                                        isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                    {p.name}
                                                </button>
                                            );
                                        })}
                                        {products.length <= 1 && <p className="text-xs text-slate-400 italic">Cadastre mais produtos para fazer recomendações.</p>}
                                    </div>
                                </div>
                                {/* --- INÍCIO: CRIADOR DE COMPLEMENTOS --- */}
                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <PlusSquare size={14} className="text-purple-500"/> Complementos / Adicionais
                                        </label>
                                        <button 
                                            type="button" 
                                            onClick={() => setForm(prev => ({ ...prev, complements: [...(prev.complements || []), { id: Date.now().toString(), name: '', isRequired: false, maxSelections: 1, options:[] }] }))}
                                            className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-purple-100 transition-all"
                                        >
                                            + Novo Grupo
                                        </button>
                                    </div>
                                    
                                    {(form.complements ||[]).map((cat, catIndex) => (
                                        <div key={cat.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative animate-in fade-in slide-in-from-top-2">
                                            {/* Botão de Excluir Grupo */}
                                            <button type="button" onClick={() => {
                                                const newComps = [...form.complements];
                                                newComps.splice(catIndex, 1);
                                                setForm(prev => ({ ...prev, complements: newComps }));
                                            }} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            
                                            {/* Nome do Grupo */}
                                            <input type="text" placeholder="Nome do Grupo (Ex: Escolha o Molho, Ponto da Carne)" className="w-11/12 p-3 bg-white rounded-xl font-bold border border-slate-100 mb-3 text-sm outline-none focus:ring-2 ring-purple-200" value={cat.name} onChange={(e) => {
                                                const newComps = [...form.complements];
                                                newComps[catIndex].name = e.target.value;
                                                setForm(prev => ({ ...prev, complements: newComps }));
                                            }} />
                                            
                                            {/* Regras (Obrigatório e Máximo) */}
                                            <div className="flex flex-wrap gap-4 mb-4">
                                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-white p-2 rounded-lg border border-slate-100">
                                                    <input type="checkbox" checked={cat.isRequired} onChange={(e) => {
                                                        const newComps =[...form.complements];
                                                        newComps[catIndex].isRequired = e.target.checked;
                                                        setForm(prev => ({ ...prev, complements: newComps }));
                                                    }} className="accent-purple-600 w-4 h-4 cursor-pointer" /> É Obrigatório?
                                                </label>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                                                    Máx. de opções permitidas: 
                                                    <input type="number" min="1" className="w-16 p-1 rounded-md text-center border outline-none" value={cat.maxSelections} onChange={(e) => {
                                                        const newComps = [...form.complements];
                                                        newComps[catIndex].maxSelections = parseInt(e.target.value) || 1;
                                                        setForm(prev => ({ ...prev, complements: newComps }));
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Opções do Grupo */}
                                            <div className="space-y-2">
                                                {cat.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex gap-2 items-center">
                                                        <input type="text" placeholder="Ex: Bacon Extra" className="flex-1 p-3 bg-white rounded-lg text-xs font-bold border border-slate-100 outline-none" value={opt.name} onChange={(e) => {
                                                            const newComps = [...form.complements];
                                                            newComps[catIndex].options[optIndex].name = e.target.value;
                                                            setForm(prev => ({ ...prev, complements: newComps }));
                                                        }} />
                                                        <input type="number" placeholder="Valor (+ R$)" className="w-24 p-3 bg-white rounded-lg text-xs font-bold border border-slate-100 outline-none text-blue-600" value={opt.price} onChange={(e) => {
                                                            const newComps =[...form.complements];
                                                            newComps[catIndex].options[optIndex].price = parseFloat(e.target.value) || 0;
                                                            setForm(prev => ({ ...prev, complements: newComps }));
                                                        }} />
                                                        <button type="button" onClick={() => {
                                                            const newComps = [...form.complements];
                                                            newComps[catIndex].options.splice(optIndex, 1);
                                                            setForm(prev => ({ ...prev, complements: newComps }));
                                                        }} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-all"><X size={16}/></button>
                                                    </div>
                                                ))}
                                                
                                                <button type="button" onClick={() => {
                                                    const newComps = [...form.complements];
                                                    newComps[catIndex].options.push({ name: '', price: '' });
                                                    setForm(prev => ({ ...prev, complements: newComps }));
                                                }} className="text-xs font-black text-purple-600 mt-2 px-2 py-1 hover:bg-purple-50 rounded-lg transition-all">
                                                    + Adicionar Opção
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* --- FIM: CRIADOR DE COMPLEMENTOS --- */}
                                <div className="space-y-3 pt-6 border-t border-slate-100">
                                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" id="product-image-upload" />
                                    <label htmlFor="product-image-upload" className="w-full p-6 bg-slate-50 rounded-3xl flex flex-col items-center justify-center gap-2 font-bold text-slate-600 cursor-pointer border-2 border-dashed border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
                                        <div className="flex items-center gap-3">
                                            {imageFile ? imageFile.name : (form.imageUrl ? 'Mudar Imagem' : 'Selecionar Imagem')} 
                                            <UploadCloud size={20} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium">PNG ou JPG (Evite .webp ou .svg)</p>
                                    </label>
                                    
                                    {/* DICA DE FOTO PARA SEO E CONVERSÃO */}
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3">
                                        <div className="bg-emerald-500 text-white p-2 rounded-xl h-fit">
                                            <ImageIcon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-emerald-800 font-black uppercase tracking-wider mb-1">Dica de Especialista:</p>
                                            <p className="text-[11px] text-emerald-700 leading-tight">
                                                <b>Fotos originais (tiradas na loja)</b> valem mais que fotos da internet. 
                                                O Google prioriza imagens reais! <br/>
                                                <span className="italic opacity-80 text-[10px]">Dica: Renomeie o arquivo para <b>{form.name ? form.name.toLowerCase().replace(/\s+/g, '-') : 'nome-do-produto'}.jpg</b> antes de subir.</span>
                                            </p>
                                        </div>
                                    </div>

                                    {imageFile && (<button type="button" onClick={handleProductImageUpload} disabled={uploading} className={`w-full p-4 rounded-3xl font-black text-white ${uploading ? 'bg-blue-400' : 'bg-blue-600'}`}>{uploading ? 'Enviando...' : 'Confirmar Upload'}</button>)}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Item</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* ✅ MODAL DE TAXAS CORRIGIDO */}
            <AnimatePresence>
                {isRateModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative">
                            <button onClick={() => setIsRateModalOpen(false)} className="absolute top-10 right-10 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>
                            <h2 className="text-3xl font-black italic mb-8 uppercase text-slate-900">{editingRateId ? 'Editar' : 'Nova'} Taxa</h2>
                            <form onSubmit={async (e) => { 
                                e.preventDefault(); 
                                try { 
                                    const cleanStart = rateForm.cepStart ? rateForm.cepStart.replace(/\D/g, '') : '';
                                    const cleanEnd = rateForm.cepEnd ? rateForm.cepEnd.replace(/\D/g, '') : '';

                                    const data = { 
                                        neighborhood: rateForm.neighborhood, 
                                        fee: parseFloat(rateForm.fee), 
                                        cepStart: cleanStart,
                                        cepEnd: cleanEnd,
                                        storeId: storeId 
                                    }; 
                                    
                                    if (editingRateId) await updateDoc(doc(db, "shipping_rates", editingRateId), data); 
                                    else await addDoc(collection(db, "shipping_rates"), data); 
                                    
                                    setIsRateModalOpen(false); 
                                    alert("Taxa salva com sucesso!");
                                } catch (error) { alert(error.message); } 
                            }} className="space-y-4">

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 ml-2">Nome de Identificação (Ex: Centro Expandido)</label>
                                    <input type="text" placeholder="Nome da Região" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.neighborhood} onChange={e => setRateForm({ ...rateForm, neighborhood: e.target.value })} required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 ml-2">CEP Inicial</label>
                                        <input type="text" placeholder="00000000" maxLength="9" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.cepStart || ''} onChange={e => setRateForm({ ...rateForm, cepStart: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 ml-2">CEP Final</label>
                                        <input type="text" placeholder="00000000" maxLength="9" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={rateForm.cepEnd || ''} onChange={e => setRateForm({ ...rateForm, cepEnd: e.target.value })} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 px-2 font-bold text-center">Deixe os CEPs em branco se quiser cobrar apenas pelo Nome do Bairro.</p>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 ml-2">Valor da Entrega (R$)</label>
                                    <input type="number" step="0.01" placeholder="0.00" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-blue-600 text-xl" value={rateForm.fee} onChange={e => setRateForm({ ...rateForm, fee: e.target.value })} required />
                                </div>

                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-6 uppercase hover:bg-blue-700 transition-all">Salvar Regra de Frete</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCouponModalOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <button onClick={() => setIsCouponModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X/></button>
                            
                            <h2 className="text-3xl font-black italic mb-6 uppercase text-slate-900">{editingCouponId ? 'Editar' : 'Novo'} Cupom</h2>
                            
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                
                                const dataToSave = { 
                                    ...couponForm, 
                                    code: couponForm.code.toUpperCase(),
                                    storeId: storeId,
                                    value: Number(couponForm.value), 
                                    minimumOrderValue: Number(couponForm.minimumOrderValue || 0),
                                    usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null, 
                                    userUsageLimit: couponForm.userUsageLimit ? Number(couponForm.userUsageLimit) : null,
                                    currentUsage: editingCouponId ? (couponForm.currentUsage || 0) : 0, 
                                    expirationDate: couponForm.expirationDate || null, 
                                    firstPurchaseOnly: couponForm.firstPurchaseOnly === true, 
                                    active: true,
                                    createdAt: editingCouponId ? couponForm.createdAt : serverTimestamp(), 
                                };

                                try { 
                                    if (editingCouponId) await updateDoc(doc(db, "coupons", editingCouponId), dataToSave); 
                                    else await addDoc(collection(db, "coupons"), dataToSave); 
                                    setIsCouponModalOpen(false); 
                                    alert("Cupom salvo com sucesso!"); 
                                } catch (error) { 
                                    alert("Erro: " + error.message); 
                                }
                            }} className="space-y-4">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 ml-2">Código do Cupom</label>
                                        <input type="text" placeholder="Ex: PROMO10" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} required />
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="space-y-1 w-1/3">
                                            <label className="text-xs font-bold text-slate-400 ml-2">Tipo</label>
                                            <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer" value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})}>
                                                <option value="percentage">%</option>
                                                <option value="fixed_amount">R$</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs font-bold text-slate-400 ml-2">Valor do Desconto</label>
                                            <input type="number" placeholder="Valor" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.value} onChange={e => setCouponForm({...couponForm, value: e.target.value})} required />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Pedido Mínimo (R$)</label>
                                        <input type="number" placeholder="0.00" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.minimumOrderValue} onChange={e => setCouponForm({...couponForm, minimumOrderValue: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Data de Validade</label>
                                        <input type="date" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-600" value={couponForm.expirationDate || ''} onChange={e => setCouponForm({...couponForm, expirationDate: e.target.value})} />
                                    </div>
                                </div>

                                <div className="p-4 border border-slate-100 rounded-3xl space-y-4 bg-slate-50/50">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Limites de Uso (Deixe vazio para ilimitado)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 ml-2">Uso Total Global</label>
                                            <input type="number" placeholder="Ilimitado" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-slate-100" value={couponForm.usageLimit || ''} onChange={e => setCouponForm({...couponForm, usageLimit: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 ml-2">Uso Por Pessoa</label>
                                            <input type="number" placeholder="Ilimitado" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-slate-100" value={couponForm.userUsageLimit || ''} onChange={e => setCouponForm({...couponForm, userUsageLimit: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-2 ml-2 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <input 
                                        type="checkbox" 
                                        id="firstPurchase"
                                        checked={couponForm.firstPurchaseOnly || false} 
                                        onChange={(e) => setCouponForm({...couponForm, firstPurchaseOnly: e.target.checked})}
                                        className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer"
                                    />
                                    <label htmlFor="firstPurchase" className="font-bold text-slate-700 text-sm cursor-pointer select-none">
                                        Válido apenas para <span className="text-blue-600 font-black">Primeira Compra</span>
                                    </label>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-4 uppercase hover:bg-blue-700 transition-all">
                                    Salvar Configurações
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOrderEditModalOpen && editingOrderData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-3xl rounded-[3.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <button onClick={() => setIsOrderEditModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X /></button>

                            <h2 className="text-3xl font-black italic mb-6 uppercase text-slate-900">Editar Pedido #{editingOrderData.id?.slice(-5).toUpperCase()}</h2>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const currentSubtotal = editingOrderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                                    const newTotal = currentSubtotal + Number(editingOrderData.shippingFee || 0);

                                    // --- CORREÇÃO DEFINITIVA (BLINDAGEM DO PAYLOAD) ---
                                    // Este objeto será enviado para o Firestore, então garantimos
                                    // que NENHUM campo seja 'undefined'.

                                    const dataParaSalvar = {
                                        customerName: editingOrderData.customerName || '',
                                        customerAddress: editingOrderData.customerAddress || '',
                                        customerPhone: editingOrderData.customerPhone || '',
                                        // **FIX CRÍTICO**: Se paymentMethod for nulo ou undefined, usa 'pix' como um padrão seguro.
                                        paymentMethod: editingOrderData.paymentMethod ?? 'pix', 
                                        observation: editingOrderData.observation || '',
                                        status: editingOrderData.status || 'pending',
                                        shippingFee: Number(editingOrderData.shippingFee || 0),
                                        items: editingOrderData.items ||[],
                                        total: newTotal,
                                    };
                                    
                                    // O campo 'troco' depende do método de pagamento já sanitizado
                                    dataParaSalvar.changeFor = dataParaSalvar.paymentMethod === 'dinheiro' 
                                        ? (editingOrderData.changeFor || '') 
                                        : '';

                                    await updateDoc(doc(db, "orders", editingOrderData.id), dataParaSalvar);
                                    
                                    setIsOrderEditModalOpen(false);
                                    alert("Pedido atualizado com sucesso!");
                                } catch (error) {
                                    console.error("Erro ao atualizar pedido:", error);
                                    alert("Erro ao atualizar pedido: " + error.message);
                                }
                            }} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-400 ml-2">Nome do Cliente</label>
                                    <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.customerName || ''} onChange={e => setEditingOrderData({...editingOrderData, customerName: e.target.value})} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-400 ml-2">Endereço (Rua, Número, Bairro)</label>
                                    <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.customerAddress || ''} onChange={e => setEditingOrderData({...editingOrderData, customerAddress: e.target.value})} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-400 ml-2">WhatsApp</label>
                                    <input type="tel" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.customerPhone || ''} onChange={e => setEditingOrderData({...editingOrderData, customerPhone: e.target.value})} required />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Método de Pagamento</label>
                                        <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer" value={editingOrderData.paymentMethod || 'pix'} onChange={e => setEditingOrderData({...editingOrderData, paymentMethod: e.target.value})}>
                                            <option value="pix">PIX</option>
                                            <option value="cartao">Cartão</option>
                                            <option value="dinheiro">Dinheiro</option>
                                        </select>
                                    </div>
                                    {editingOrderData.paymentMethod === 'dinheiro' && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-400 ml-2">Troco para</label>
                                            <input type="text" placeholder="Qual valor?" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.changeFor || ''} onChange={e => setEditingOrderData({...editingOrderData, changeFor: e.target.value})} />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Taxa de Entrega (R$)</label>
                                        <input type="number" step="0.01" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={Number(editingOrderData.shippingFee || 0).toFixed(2)} onChange={e => setEditingOrderData({...editingOrderData, shippingFee: e.target.value})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Status do Pedido</label>
                                        <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer" value={editingOrderData.status || 'pending'} onChange={e => setEditingOrderData({...editingOrderData, status: e.target.value})}>
                                            <option value="pending">⏳ Pendente</option>
                                            <option value="preparing">👨‍🍳 Preparando</option>
                                            <option value="delivery">🏍️ Em Rota</option>
                                            <option value="completed">✅ Entregue</option>
                                            <option value="canceled">❌ Cancelado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Observação</label>
                                        <input type="text" placeholder="Observações do pedido" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.observation || ''} onChange={e => setEditingOrderData({...editingOrderData, observation: e.target.value})} />
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Itens do Pedido:</h3>
                                    {editingOrderData.items?.length > 0 ? (
                                        <div className="space-y-2">
                                            {editingOrderData.items.map((item, index) => (
                                                <div key={`${item.id}-${index}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-sm font-medium">
                                                    <span className="flex-1">{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <button type="button" onClick={() => handleUpdateItemQuantityInEditingOrder(item.id, item.quantity - 1)} className="text-slate-400 hover:text-red-500"><MinusSquare size={20} /></button>
                                                        <span className="font-black text-slate-700 w-6 text-center">{item.quantity}</span>
                                                        <button type="button" onClick={() => handleUpdateItemQuantityInEditingOrder(item.id, item.quantity + 1)} className="text-slate-400 hover:text-green-500"><PlusSquare size={20} /></button>
                                                    </div>
                                                    <span className="w-24 text-right font-bold text-blue-600">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                    <button type="button" onClick={() => handleRemoveItemFromEditingOrder(item.id)} className="ml-4 text-red-500 hover:bg-red-50 p-1 rounded-full"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-center text-slate-400 p-4 bg-slate-50 rounded-xl">Nenhum item no pedido. Adicione produtos abaixo.</p>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Adicionar Produtos ao Pedido:</h3>
                                    <div className="mb-4 relative">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar produto para adicionar..." 
                                            className="w-full p-3 pl-10 bg-slate-100 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 ring-blue-300"
                                            value={editOrderProductSearch}
                                            onChange={(e) => setEditOrderProductSearch(e.target.value)}
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    </div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border p-2 rounded-xl">
                                        {products.filter(p => p.name.toLowerCase().includes(editOrderProductSearch.toLowerCase())).map(p => (
                                            <button 
                                                key={p.id} 
                                                type="button"
                                                onClick={() => handleAddProductToEditingOrder(p)}
                                                className="w-full p-3 bg-white hover:bg-blue-50 rounded-xl flex justify-between items-center transition-all border"
                                            >
                                                <span className="font-bold text-slate-700">{p.name}</span>
                                                <span className="font-black text-blue-600">R$ {Number(p.price).toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-2xl font-black text-slate-900 mt-6 italic text-right">
                                    Total Pedido: R$ {(editingOrderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) + Number(editingOrderData.shippingFee || 0)).toFixed(2)}
                                </div>

                                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-4 uppercase hover:bg-blue-700 transition-all">
                                    Salvar Alterações
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {/* MODAL DE CONFIGURAÇÃO DA ROLETA (LOJISTA) */}
            <AnimatePresence>
                {isRouletteModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 w-full max-w-4xl rounded-[3rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-700 custom-scrollbar">
                            <button onClick={() => setIsRouletteModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={24}/></button>
                            
                            <h2 className="text-3xl font-black italic uppercase text-white mb-2 flex items-center gap-3">
                                <Gift className="text-pink-500" size={32}/> Roleta de Prêmios
                            </h2>
                            <p className="text-sm font-bold text-slate-400 mb-6">Configure exatamente o que o cliente pode ganhar. A soma das probabilidades deve ser sempre 100%.</p>

                            <div className="bg-slate-800 p-4 rounded-3xl mb-6">
                                <div className="grid grid-cols-12 gap-2 px-4 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                                    <div className="col-span-3 text-left">Texto na Roleta</div>
                                    <div className="col-span-3">Tipo de Prêmio</div>
                                    <div className="col-span-2">Valor (R$ ou %)</div>
                                    <div className="col-span-2">Estoque</div>
                                    <div className="col-span-2">Probabilidade %</div>
                                </div>
                                
                                {rouletteSlices.map((slice, index) => (
                                    <div key={slice.id} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded-2xl mb-2 border border-slate-700">
                                        <div className="col-span-3 flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></div>
                                            <input type="text" value={slice.label} onChange={(e) => {
                                                const newSlices = [...rouletteSlices]; newSlices[index].label = e.target.value; setRouletteSlices(newSlices);
                                            }} className="w-full bg-slate-800 text-white text-xs font-bold p-2 rounded-lg outline-none" />
                                        </div>
                                        <div className="col-span-3">
                                            <select value={slice.type} onChange={(e) => {
                                                const newSlices = [...rouletteSlices]; newSlices[index].type = e.target.value; setRouletteSlices(newSlices);
                                            }} className="w-full bg-slate-800 text-white text-xs font-bold p-2 rounded-lg outline-none border-none">
                                                <option value="empty">Sem Prêmio (Perdeu)</option>
                                                <option value="cashback">Saldo na Carteira (R$)</option>
                                                <option value="discount_percent">Cupom (% OFF)</option>
                                                <option value="discount_fixed">Cupom (R$ OFF)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" disabled={slice.type === 'empty'} value={slice.value} onChange={(e) => {
                                                const newSlices = [...rouletteSlices]; newSlices[index].value = Number(e.target.value); setRouletteSlices(newSlices);
                                            }} className="w-full bg-slate-800 text-white text-xs font-bold p-2 rounded-lg outline-none text-center disabled:opacity-50" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" value={slice.stock} onChange={(e) => {
                                                const newSlices = [...rouletteSlices]; newSlices[index].stock = Number(e.target.value); setRouletteSlices(newSlices);
                                            }} className="w-full bg-slate-800 text-white text-xs font-bold p-2 rounded-lg outline-none text-center" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" value={slice.probability} onChange={(e) => {
                                                const newSlices = [...rouletteSlices]; newSlices[index].probability = Number(e.target.value); setRouletteSlices(newSlices);
                                            }} className="w-full bg-slate-800 text-white text-xs font-bold p-2 rounded-lg outline-none text-center text-pink-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(() => {
                                const totalProb = rouletteSlices.reduce((acc, curr) => acc + (Number(curr.probability) || 0), 0);
                                return (
                                    <div className="flex justify-between items-center mt-6">
                                        <p className={`text-sm font-black uppercase ${totalProb === 100 ? 'text-green-400' : 'text-red-500'}`}>
                                            Soma das Chances: {totalProb}% {totalProb !== 100 && '(Ajuste para dar 100%)'}
                                        </p>
                                        <button 
                                            onClick={async () => {
                                                if (totalProb !== 100) return alert("A soma das probabilidades deve ser exatamente 100%.");
                                                await setDoc(doc(db, "settings", storeId), { rouletteConfig: { slices: rouletteSlices } }, { merge: true });
                                                alert("Roleta configurada e salva com sucesso!");
                                                setIsRouletteModalOpen(false);
                                            }}
                                            className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                        >
                                            Salvar Roleta
                                        </button>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
                {showPixModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative text-center">
                            <button onClick={() => setShowPixModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X /></button>
                            <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-2">Pagar Fatura</h2>
                            <p className="text-slate-500 font-bold mb-8">Valor Total: R$ {invoiceData.total.toFixed(2)}</p>
                            
                            <div className="bg-slate-100 p-6 rounded-2xl mb-6 flex items-center justify-center">
                                <QrCode size={180} className="text-slate-800"/>
                            </div>
                            
                            <p className="text-xs text-slate-400 font-bold uppercase mb-2">Código Copia e Cola</p>
                            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500 break-all mb-6 font-mono border border-slate-200">
                                00020126360014BR.GOV.BCB.PIX0114+554899999999520400005303986540549.905802BR5925VELO DELIVERY TECNOLOGIA6009SAO PAULO62070503***6304E2CA
                            </div>

                            <button onClick={() => alert("Código copiado!")} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">
                                Copiar Código Pix
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FLUXO DE BLOQUEIOS (ONBOARDING E FATURA) --- */}
            {/* 1. SE A FATURA ESTIVER VENCIDA E OS TERMOS JÁ TIVEREM SIDO ACEITOS */}
            {isOverdue && storeStatus?.termsAccepted && (
                <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 text-center shadow-2xl relative overflow-hidden border-4 border-red-500">
                        <div className="absolute top-0 left-0 w-full h-4 bg-red-500 animate-pulse"></div>
                        <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Server size={48} className="text-red-600" />
                        </div>
                        <h2 className="text-3xl font-black uppercase text-slate-800 mb-2">Acesso Suspenso</h2>
                        <p className="text-slate-500 font-bold mb-8">
                            Fatura pendente. Regularize sua conta para continuar.
                        </p>
                        <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400 mb-1">Valor Pendente</p>
                            <p className="text-5xl font-black text-slate-800">R$ {invoiceData?.total?.toFixed(2) || '0.00'}</p>
                        </div>
                        <button onClick={handleAssinarPro} className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl font-black uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                            <CreditCard size={20}/> Pagar com Cartão
                        </button>
                    </div>
                </div>
            )}

            {/* 2. SE OS TERMOS AINDA NÃO FORAM ACEITOS (MESMO NO PERÍODO DE TESTE) */}
            {!storeStatus?.termsAccepted && (
                <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-slate-900 p-8 text-white">
                            <h2 className="text-2xl font-black italic uppercase flex items-center gap-3">
                                <ShieldCheck className="text-blue-500" size={28} /> 
                                Termos de Uso e Cobrança
                            </h2>
                            <p className="text-slate-400 text-sm mt-2">Para continuar, precisamos que você entenda como nossa infraestrutura funciona.</p>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar text-slate-600 space-y-6 text-sm leading-relaxed">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                                <p className="font-bold text-blue-900">
                                    Resumo: Não cobramos % sobre suas vendas. Cobramos pelo uso técnico (Hardware/Dados) que sua loja consome.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-black text-slate-800 uppercase mb-2">1. Modelo de Cobrança (Infrastructure as a Service)</h3>
                                <p>Diferente de marketplaces que cobram comissão (take-rate), a Velo Delivery cobra pelo consumo de recursos computacionais ("Velo Data Fuel"). Sua fatura é composta por:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Assinatura Base (R$ 49,90):</strong> Garante licença de software e atualizações.</li>
                                    <li><strong>Franquia de Processamento:</strong> Inclui até 100 pedidos/mês grátis.</li>
                                    <li><strong>Custo Variável:</strong> R$ 0,25 por pedido excedente à franquia.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-black text-slate-800 uppercase mb-2">2. Inadimplência e Bloqueio</h3>
                                <p>O não pagamento da fatura de infraestrutura até o dia 10 de cada mês resultará na <strong>suspensão temporária</strong> do acesso ao painel administrativo até a regularização, conforme exibido na tela de "Acesso Suspenso".</p>
                            </div>

                            <div>
                                <h3 className="font-black text-slate-800 uppercase mb-2">3. Transparência</h3>
                                <p>Você terá acesso a um monitor em tempo real (Aba Financeiro) detalhando seu consumo de Storage (imagens), Banco de Dados e Requisições.</p>
                            </div>

                            <p className="text-xs text-slate-400 mt-4 border-t pt-4">
                                Ao clicar em "Concordo", você declara ter lido e aceitado as condições comerciais acima descritas para a operação da loja <strong>{storeStatus.name}</strong>.
                            </p>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={handleAcceptTerms}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                            >
                                Li, Entendi Concordo
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* -------------------------------------------------------- */}

            {/* MODAL DE INTEGRAÇÕES */}
            <AnimatePresence>
                {isIntegrationModalOpen && selectedIntegration && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    {/* AQUI ESTÁ A CORREÇÃO: Adicionado max-h-[90vh], overflow-y-auto e ajustado o padding */}
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setIsIntegrationModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors z-50"><X size={20}/></button>
                            
                            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                                {selectedIntegration.icon}
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">{selectedIntegration.name}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Setup de Conexão</p>
                                </div>
                            </div>

                            {/* --- BOTÃO MÁGICO DE DIRECIONAMENTO (HÍBRIDO) --- */}
                            {selectedIntegration.helpUrl && (
                                <div className="mb-6">
                                    <a 
                                        href={selectedIntegration.helpUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-200"
                                    >
                                        👉 {selectedIntegration.helpText}
                                    </a>
                                </div>
                            )}

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    // Validação Específica para WhatsApp Cloud API (Graph API)
                                    if (selectedIntegration.id === 'whatsapp' && integrationForm.phoneNumberId && integrationForm.apiToken) {
                                        // Bate no endpoint da Meta para validar credenciais antes de salvar
                                        const verifyUrl = `https://graph.facebook.com/v19.0/${integrationForm.phoneNumberId}`;
                                        const verifyRes = await fetch(verifyUrl, {
                                            method: 'GET',
                                            headers: { 'Authorization': `Bearer ${integrationForm.apiToken}` }
                                        });
                                        
                                        if (!verifyRes.ok) {
                                            const errorData = await verifyRes.json();
                                            alert(`❌ Erro de Autenticação na Meta: ${errorData.error?.message || 'Verifique seu Token Permanente e ID do Telefone.'}`);
                                            return; // Trava o salvamento para evitar falsos "Conectados"
                                        }
                                    }

                                    // Salva no Firebase Firestore dentro do documento 'settings' do lojista
                                    await setDoc(doc(db, "settings", storeId), {
                                        integrations: {
                                            [selectedIntegration.id]: integrationForm 
                                        }
                                    }, { merge: true });
                                    
                                    setIsIntegrationModalOpen(false);
                                    alert(`✅ ${selectedIntegration.name} configurado com sucesso!`);
                                } catch (error) {
                                    console.error("Erro na integração:", error);
                                    alert("Erro ao salvar configuração.");
                                }
                            }} className="space-y-4">
                                {/* Guia Passo a Passo WhatsApp API */}
{selectedIntegration.id === 'whatsapp' && (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2">
        <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-5.16V14a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1 2 2 0 1 0-2-2 1 1 0 0 1-2 0 4 4 0 1 1 5 3.84z"></path>
            </svg>
            Como conectar a API Oficial
        </h3>
        <p className="text-xs font-bold text-slate-500 mb-5">
            Siga as etapas abaixo no Portal da Meta e cole as credenciais para ativar o bot.
        </p>

        <ol className="list-decimal ml-5 text-xs font-medium text-slate-700 space-y-4 marker:text-green-500 marker:font-black">
            <li>
                <b>Criar o App:</b> Acesse o <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Facebook Developers</a> e crie um aplicativo do tipo <b>Empresa (Business)</b>.
            </li>
            <li>
                <b>Ativar o WhatsApp:</b> Dentro do seu app na Meta, encontre o card <b>WhatsApp</b> e clique em <b>Configurar</b>.
            </li>
            <li>
                <b>Pegar o ID do Número:</b> Vá em <i>WhatsApp {'>'} Configuração da API</i> e copie o <b>ID do número de telefone</b>. Cole no primeiro campo abaixo.
            </li>
            <li>
                <b>Gerar Token Permanente (Crítico):</b> Acesse o <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Gerenciador de Negócios (Usuários do Sistema)</a>, crie um <b>Usuário do Sistema</b>, adicione o App como ativo e gere um novo token marcando a permissão <code className="bg-slate-200 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold">whatsapp_business_messaging</code>. Copie esse token e cole no segundo campo abaixo.
            </li>
        </ol>
    </div>
)}
                                {/* Renderiza os inputs */}
                                {selectedIntegration.fields.map((field) => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-2">{field.label}</label>
                                        <input 
                                            type="text" 
                                            placeholder={`Cole aqui seu ${field.label}...`}
                                            className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 placeholder-slate-300" 
                                            value={integrationForm[field.key] || ''} 
                                            onChange={e => setIntegrationForm({ ...integrationForm,[field.key]: e.target.value.trim() })} 
                                        />
                                    </div>
                                ))}

                                {/* MOTOR DE AUTOMAÇÕES DO WHATSAPP (Sempre Visível) */}
                                {selectedIntegration.id === 'whatsapp' && (
                                    <div className="pt-4 border-t border-slate-100 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            🤖 Gatilhos (Velo Bot)
                                        </h3>
                                        
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3">
                                            
                                            {/* Alerta para o Lojista */}
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <div className="pr-2">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaStore className="text-blue-500"/> Alerta de Novo Pedido (Loja)</p>
                                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Seu WhatsApp apita ao receber pedidos.</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoOwnerAlert || false} onChange={e => setIntegrationForm({...integrationForm, autoOwnerAlert: e.target.checked})} />
                                            </label>

                                            {/* Avisos para o Cliente (Transacional) */}
                                            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                <div className="pr-2">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaBoxOpen className="text-orange-500"/> Status do Pedido (Cliente)</p>
                                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Avisa quando sai para entrega.</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoOrderStatus || false} onChange={e => setIntegrationForm({...integrationForm, autoOrderStatus: e.target.checked})} />
                                            </label>

                                            {/* Carrinho Abandonado */}
                                            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                <div className="pr-2">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><ShoppingCart size={12} className="text-red-500"/> Carrinho Abandonado</p>
                                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Alerta 1h após produtos no carrinho.</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoAbandonedCart || false} onChange={e => setIntegrationForm({...integrationForm, autoAbandonedCart: e.target.checked})} />
                                            </label>

                                            {/* Pesquisa de Satisfação NPS */}
                                            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                <div className="pr-2">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaStar className="text-yellow-400"/> Avaliação (Pós-Entrega)</p>
                                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Pede nota ao cliente horas depois.</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoNps || false} onChange={e => setIntegrationForm({...integrationForm, autoNps: e.target.checked})} />
                                            </label>

                                            {/* Aviso Clube VIP */}
                                            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                <div className="pr-2">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><Crown size={12} className="text-purple-500"/> Notificação Clube VIP</p>
                                                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Informa pontos ganhos após a compra.</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoLoyalty || false} onChange={e => setIntegrationForm({...integrationForm, autoLoyalty: e.target.checked})} />
                                            </label>
                                        </div>
                                        {/* --- INÍCIO: CONFIGURAÇÃO DO CHATBOT --- */}
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mt-6">
                                            💬 Menu do Chatbot Automático
                                        </h3>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                            <label className="flex items-center justify-between cursor-pointer border-b border-slate-200 pb-4">
                                                <div className="pr-4">
                                                    <p className="text-xs font-black text-slate-700 uppercase">Ativar Menu Automático</p>
                                                    <p className="text-[10px] text-slate-500 leading-tight mt-1">Responde automaticamente com um menu de opções quando o cliente manda mensagem.</p>
                                                </div>
                                                <input type="checkbox" className="w-5 h-5 accent-blue-600 flex-shrink-0" checked={integrationForm.botEnabled || false} onChange={e => setIntegrationForm({...integrationForm, botEnabled: e.target.checked})} />
                                            </label>

                                            {integrationForm.botEnabled && (
                                                <div className="space-y-3 animate-in fade-in">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Mensagem de Saudação</label>
                                                        <textarea 
                                                            rows="3" 
                                                            placeholder="Ex: Olá! Sou o assistente virtual. Como posso ajudar?" 
                                                            className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500"
                                                            value={integrationForm.botGreeting || ''}
                                                            onChange={e => setIntegrationForm({...integrationForm, botGreeting: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Texto da Opção 1 (Cardápio)</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ex: 🍔 Ver Cardápio e Fazer Pedido" 
                                                            className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none"
                                                            value={integrationForm.botOption1 || ''}
                                                            onChange={e => setIntegrationForm({...integrationForm, botOption1: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Texto da Opção 2 (Falar com Atendente)</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ex: 👨‍💻 Falar com Humano" 
                                                            className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none"
                                                            value={integrationForm.botOption2 || ''}
                                                            onChange={e => setIntegrationForm({...integrationForm, botOption2: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* --- FIM: CONFIGURAÇÃO DO CHATBOT --- */}

                                        {/* Lista de Transmissão / Marketing */}
                                        <div className="bg-green-50 p-5 rounded-2xl border border-green-200 relative overflow-hidden">
                                            <div className="absolute -right-4 -top-4 opacity-10"><FaWhatsapp size={100} /></div>
                                            <h4 className="text-xs font-black text-green-800 uppercase mb-2 relative z-10">📢 Disparo em Massa (Base VIP)</h4>
                                            <p className="text-[10px] text-green-700 mb-4 relative z-10">Envie um Template (ex: promoções) aprovado na Meta para todos os clientes ativos.</p>
                                            
                                            <div className="relative z-10">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome exato do Template na Meta (ex: promo_fds)" 
                                                    className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-green-200 mb-3 focus:ring-2 ring-green-400"
                                                    value={integrationForm.broadcastTemplate || ''}
                                                    onChange={e => setIntegrationForm({...integrationForm, broadcastTemplate: e.target.value.trim()})}
                                                />
                                                
                                                <button 
                                                    type="button"
                                                    onClick={async () => {
                                                        if(!integrationForm.phoneNumberId || !integrationForm.apiToken) return alert("Salve suas credenciais da API primeiro!");
                                                        if(!integrationForm.broadcastTemplate) return alert("Digite o nome do Template aprovado na Meta!");
                                                        
                                                        if(window.confirm(`Iniciar disparo do template '${integrationForm.broadcastTemplate}' para sua base de clientes? Isso consumirá créditos da sua conta Meta.`)){
                                                            try {
                                                                const res = await fetch('/api/whatsapp-send', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        action: 'broadcast',
                                                                        storeId: storeId,
                                                                        templateName: integrationForm.broadcastTemplate
                                                                    })
                                                                });
                                                                if(res.ok) alert("✅ Disparo iniciado em background! O envio pode levar alguns minutos.");
                                                                else alert("❌ Erro ao solicitar o disparo. Verifique se o nome do Template está correto.");
                                                            } catch(e) { alert("Erro de conexão com o servidor da Velo."); }
                                                        }
                                                    }}
                                                    className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    ▶️ Iniciar Disparo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* NOVO: Motor de Automações do WhatsApp (Exibe apenas se conectado) */}
                                {selectedIntegration.id === 'whatsapp' && integrationForm.phoneNumberId && integrationForm.apiToken && (
                                    <div className="pt-6 border-t border-slate-100 space-y-4 mt-6 animate-in fade-in">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            🤖 Gatilhos e Automações
                                        </h3>
                                        
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                            {/* Status de Pedido */}
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <div className="pr-4">
                                                    <p className="text-xs font-black text-slate-700 uppercase">Avisos de Pedido (Status)</p>
                                                    <p className="text-[10px] text-slate-500 leading-tight mt-1">Notifica o cliente via API quando o status muda (Saiu p/ Entrega, etc).</p>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 accent-green-500 flex-shrink-0"
                                                    checked={integrationForm.autoOrderStatus || false}
                                                    onChange={e => setIntegrationForm({...integrationForm, autoOrderStatus: e.target.checked})}
                                                />
                                            </label>

                                            {/* Carrinho Abandonado */}
                                            <label className="flex items-center justify-between cursor-pointer pt-4 border-t border-slate-200">
                                                <div className="pr-4">
                                                    <p className="text-xs font-black text-slate-700 uppercase">Carrinhos Abandonados</p>
                                                    <p className="text-[10px] text-slate-500 leading-tight mt-1">Dispara um Template de resgate 1h após inatividade no carrinho.</p>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 accent-green-500 flex-shrink-0"
                                                    checked={integrationForm.autoAbandonedCart || false}
                                                    onChange={e => setIntegrationForm({...integrationForm, autoAbandonedCart: e.target.checked})}
                                                />
                                            </label>
                                        </div>

                                        {/* Lista de Transmissão / Marketing */}
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                                            <h4 className="text-xs font-black text-green-800 uppercase mb-2">📢 Disparo em Massa (Base VIP)</h4>
                                            <p className="text-[10px] text-green-700 mb-3">Envie um Template aprovado na Meta para todos os clientes ativos.</p>
                                            
                                            <input 
                                                type="text" 
                                                placeholder="Nome do Template (ex: promo_fds)" 
                                                className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-green-200 mb-3"
                                                value={integrationForm.broadcastTemplate || ''}
                                                onChange={e => setIntegrationForm({...integrationForm, broadcastTemplate: e.target.value.trim()})}
                                            />
                                            
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    if(!integrationForm.broadcastTemplate) return alert("Digite o nome exato do Template cadastrado no seu Meta Business!");
                                                    if(window.confirm(`Disparar o template '${integrationForm.broadcastTemplate}' para toda a base? Essa ação enviará mensagens através da sua API e consumirá créditos da Meta.`)){
                                                        try {
                                                            const res = await fetch('/api/whatsapp-send', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    action: 'broadcast',
                                                                    storeId: storeId,
                                                                    templateName: integrationForm.broadcastTemplate
                                                                })
                                                            });
                                                            if(res.ok) alert("✅ Disparo iniciado em background! Verifique os relatórios no Meta Business.");
                                                            else alert("❌ Erro ao solicitar o disparo. Verifique os logs.");
                                                        } catch(e) { alert("Erro de conexão com a API Serverless."); }
                                                    }
                                                }}
                                                className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-green-700 active:scale-95 transition-all"
                                            >
                                                ▶️ Iniciar Disparo para Clientes
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 mt-2">
                                    <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Save size={18}/> Salvar e Ativar
                                    </button>
                                </div>
                            </form>
                            
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* MODAL DE ATUALIZAÇÃO E CACHE */}
            <AnimatePresence>
                {isUpdateModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl relative">
                            <button onClick={() => setIsUpdateModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                                    <RefreshCw size={32} />
                                </div>
                                <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">Novidades da Atualização</h2>
                                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Versão 7.1</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 max-h-60 overflow-y-auto custom-scrollbar">
                                <ul className="space-y-4">
                                    {changelog.map(item => (
                                        <li key={item.id} className="text-left">
                                            <h4 className="text-sm font-black text-slate-800">{item.title}</h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">{item.desc}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button 
                                onClick={handleUpdateAndClearCache}
                                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Aplicar Atualização
                            </button>
                            <p className="text-[10px] text-center text-slate-400 font-bold mt-4">Isso irá limpar o cache do seu navegador e recarregar a página para aplicar as melhorias.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* MODAL DE EQUIPE (USUÁRIOS) */}
            <AnimatePresence>
                {isTeamModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
                            <button onClick={() => setIsTeamModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            
                            <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-6">{editingTeamId ? 'Editar' : 'Novo'} Usuário</h2>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const dataToSave = { ...teamForm, storeId: storeId, updatedAt: serverTimestamp() };
                                    if (editingTeamId) {
                                        await updateDoc(doc(db, "team", editingTeamId), dataToSave);
                                    } else {
                                        await addDoc(collection(db, "team"), { ...dataToSave, createdAt: serverTimestamp() });
                                    }
                                    setIsTeamModalOpen(false);
                                    alert("Usuário salvo com sucesso!");
                                } catch (error) {
                                    alert("Erro ao salvar: " + error.message);
                                }
                            }} className="space-y-4">
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-2">Nome do Colaborador</label>
                                    <input type="text" placeholder="Ex: João Silva" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-2">E-mail de Acesso</label>
                                    <input type="email" placeholder="joao@email.com" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} />
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">Permissões de Acesso</label>
                                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        {[
                                            { key: 'orders', label: 'Gestão de Pedidos', desc: 'Ver, aceitar e cancelar pedidos' },
                                            { key: 'products', label: 'Cardápio / Estoque', desc: 'Adicionar produtos e categorias' },
                                            { key: 'customers', label: 'Clientes VIP', desc: 'Ver clientes e Clube Fidelidade' },
                                            { key: 'store_settings', label: 'Loja / Status', desc: 'Abrir/fechar loja e alterar regras' },
                                            { key: 'integrations', label: 'Integrações', desc: 'Pixel, GA4, GTM e WhatsApp API' }
                                        ].map(perm => (
                                            <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                                <input 
                                                    type="checkbox" 
                                                    checked={teamForm.permissions[perm.key] || false}
                                                    onChange={() => setTeamForm(prev => ({ ...prev, permissions: { ...prev.permissions, [perm.key]: !prev.permissions[perm.key] } }))}
                                                    className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 leading-none">{perm.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">{perm.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 mt-2">
                                    <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Save size={18}/> Salvar Usuário
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- MODAL DE FECHAMENTO DE CAIXA / RELATÓRIO --- */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            
                            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                                <div className="bg-slate-900 text-white p-4 rounded-2xl">
                                    <Printer size={28} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Fechamento de Caixa</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Resumo Financeiro da Loja</p>
                                </div>
                            </div>

                            {/* FILTROS DE PERÍODO */}
                            <div className="mb-8">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">1. Selecione o Período</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { id: 'hoje', label: 'Hoje (Diário)' },
                                        { id: '7dias', label: 'Últimos 7 Dias' },
                                        { id: 'mes', label: 'Este Mês Atual' },
                                        { id: '30dias', label: 'Últimos 30 Dias' },
                                    ].map(period => (
                                        <button 
                                            key={period.id}
                                            onClick={() => { setReportDateRange(period.id); setShowReportResults(false); }}
                                            className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                                                reportDateRange === period.id 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                        >
                                            {period.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                           {/* FILTRO DE VENDEDOR / EQUIPE */}
                            <div className="mb-8">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">2. Filtrar por Vendedor</label>
                                <select 
                                    value={reportSeller} 
                                    onChange={(e) => { setReportSeller(e.target.value); setShowReportResults(false); }}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                >
                                    <option value="todos">📊 Todos os Pedidos (App + Balcão Geral)</option>
                                    <option value="online">📱 Pedidos do App (Sem Vendedor)</option>
                                    <optgroup label="Vendedores (Lançamento Manual)">
                                        <option value="owner">👑 Lojista Principal (Dono)</option>
                                        {teamMembers.map(member => (
                                            <option key={member.id} value={member.email}>
                                                🧑‍💻 {member.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            {/* BOTÃO PARA GERAR O RELATÓRIO NA TELA */}
                            <button 
                                onClick={() => setShowReportResults(true)}
                                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mb-8"
                            >
                                <Printer size={18}/> Gerar Relatório
                            </button>

                            {/* RESULTADOS SÓ APARECEM SE O BOTÃO FOR CLICADO */}
                            <AnimatePresence>
                                {showReportResults && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: 'auto' }} 
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 border-t border-slate-100 pt-8"
                                    >
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">3. Resultados do Período</label>
                                        
                                        {/* DESTAQUE TOTAL GERAL */}
                                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Faturamento Bruto</p>
                                                <p className="text-4xl font-black italic text-green-400">R$ {reportTotals.totalGeral.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Volume</p>
                                                <p className="text-3xl font-black text-white">{reportTotals.qtdPedidos}</p>
                                                <p className="text-slate-500 font-bold text-[9px] uppercase">Pedidos Pagos</p>
                                            </div>
                                        </div>

                                        {/* DIVISÃO POR MÉTODO DE PAGAMENTO */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                            {/* PIX */}
                                            <div className="bg-cyan-50 p-6 rounded-3xl border border-cyan-100 flex flex-col justify-center items-center text-center">
                                                <QrCode size={24} className="text-cyan-600 mb-2"/>
                                                <p className="text-[10px] font-black uppercase text-cyan-800 tracking-widest mb-1">Via PIX</p>
                                                <p className="text-2xl font-black text-cyan-600 italic">R$ {reportTotals.pix.toFixed(2)}</p>
                                            </div>
                                            
                                            {/* CARTÃO */}
                                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col justify-center items-center text-center">
                                                <CreditCard size={24} className="text-blue-600 mb-2"/>
                                                <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1">Via Cartão</p>
                                                <p className="text-2xl font-black text-blue-600 italic">R$ {reportTotals.cartao.toFixed(2)}</p>
                                            </div>
                                            
                                            {/* DINHEIRO */}
                                            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex flex-col justify-center items-center text-center">
                                                <Banknote size={24} className="text-green-600 mb-2"/>
                                                <p className="text-[10px] font-black uppercase text-green-800 tracking-widest mb-1">Em Dinheiro</p>
                                                <p className="text-2xl font-black text-green-600 italic">R$ {reportTotals.dinheiro.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">Valores baseados em pedidos não cancelados. Taxas de entrega inclusas.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* WIDGET DE IA ADICIONADO AQUI */}
            <VeloSupportWidget />
        </div>
    );
}