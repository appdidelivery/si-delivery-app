import { useStore } from '../../src/context/StoreContext';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../src/services/firebase';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    addDoc, query, orderBy, serverTimestamp, setDoc, getDoc, where, increment
} from 'firebase/firestore';
import {
    Store, ShoppingCart, LayoutDashboard, Clock, ShoppingBag, Package, Users, Plus, Trash2, Edit3,
    Save, X, MessageCircle, Crown, Flame, Trophy, MapPin, ShieldCheck, Printer, Bell, Wallet, Server, Database, HardDrive, FileText, QrCode, Ghost, PlusCircle, ExternalLink, LogOut, UploadCloud, Loader2, List, Image, Tags, Search, Link, ImageIcon, Calendar, MessageSquare, PlusSquare, MinusSquare, TrendingUp, Landmark, Star, Globe, 
    CreditCard, Banknote, Pizza, Coffee, IceCream, Sandwich, Candy, Beer, Wine, Martini, Utensils, UserPlus, Shield, RefreshCw, Gift, Medal, Award, Share2, Copy, Eye, EyeOff, Truck, CheckCircle, XCircle, Palmtree, Handshake,
} from 'lucide-react';
 // Adicionado PlusSquare, MinusSquare, TrendingUp e Landmark
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getStoreIdFromHostname } from '../../src/utils/domainHelper';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import { getDatabase, ref as rtdbRef, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
// --- NOVOS ÍCONES GIGANTES (REACT-ICONS) ---
import { 
    GiHamburger, GiFrenchFries, GiShrimp, GiOyster, GiSushis, 
    GiSodaCan, GiPizzaSlice, GiTacos, GiHotDog, GiMeat, 
    GiCoffeeCup, GiIceCreamCone, GiNoodles, GiBeerBottle, GiMartini,
    GiCupcake, GiCroissant, GiSteak, GiChickenOven, GiBowlOfRice, 
    GiAvocado, GiCigarette, GiChocolateBar, GiWatermelon, GiFruitBowl, GiStrawberry,
    GiSandwich, GiKebabSpit
} from 'react-icons/gi';
import { 
    FaBoxOpen, FaBoltLightning, FaBottleWater, FaFishFins, 
    FaWineGlass, FaWineBottle, FaChampagneGlasses, FaMugHot, 
    FaBowlFood, FaCarrot, FaLeaf, FaAppleWhole, FaBasketShopping, 
    FaStore, FaCheese, FaPills, FaPrescriptionBottleMedical, 
    FaPaw, FaDog, FaBone, FaSnowflake, FaFireFlameSimple, 
    FaDroplet, FaDrumstickBite, FaIceCream, FaBreadSlice, FaStar,
    FaEgg, FaBacon, FaLemon, FaCakeCandles, FaPepperHot, FaBowlRice
} from 'react-icons/fa6';
import VeloSupportWidget from "../components/VeloSupportWidget";
import AdminChat from '../components/AdminChat'; // Ajuste o caminho se salvou em outro local
import { MissionTracker } from '../components/MissionTracker';
import PartnersMarketplace from '../components/PartnersMarketplace';

import { FaFacebook, FaGoogle, FaWhatsapp, FaTags } from 'react-icons/fa6';
import { Link as LinkIcon, Sparkles } from 'lucide-react'; // <-- ÍCONE SPARKLES ADICIONADO AQUI

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
// --- BIBLIOTECA DE ÍCONES PARA CATEGORIAS (TURBINADA - SUPER CATÁLOGO) ---
const AVAILABLE_ICONS = [
  { id: 'List', label: 'Padrão', component: <List size={24} /> },
  { id: 'Combo', label: 'Combos / Kits', component: <FaBoxOpen size={24} /> },
  { id: 'Star', label: 'Destaques / Promo', component: <FaStar size={24} /> },
  
  // Lanches e Fast Food
  { id: 'Hamburger', label: 'Hambúrguer', component: <GiHamburger size={24} /> },
  { id: 'Sandwich', label: 'Sanduíche / Lanches', component: <GiSandwich size={24} /> },
  { id: 'HotDog', label: 'Cachorro Quente', component: <GiHotDog size={24} /> },
  { id: 'Pizza', label: 'Pizzaria', component: <GiPizzaSlice size={24} /> },
  { id: 'Fries', label: 'Porções / Fritas', component: <GiFrenchFries size={24} /> },
  { id: 'Pastel', label: 'Pastel / Salgados', component: <FaCheese size={24} /> },
  { id: 'Tacos', label: 'Mexicana / Tacos', component: <GiTacos size={24} /> },
  { id: 'Kebab', label: 'Árabe / Esfirras', component: <GiKebabSpit size={24} /> },
  
  // Restaurante e Refeições
  { id: 'BowlFood', label: 'Marmita / PF', component: <FaBowlFood size={24} /> },
  { id: 'Steak', label: 'Churrasco / Espetinho', component: <GiSteak size={24} /> },
  { id: 'Meat', label: 'Açougue / Carnes', component: <GiMeat size={24} /> },
  { id: 'Chicken', label: 'Frango Assado', component: <GiChickenOven size={24} /> },
  { id: 'Drumstick', label: 'Frango Frito', component: <FaDrumstickBite size={24} /> },
  { id: 'Noodles', label: 'Massas / Italiana', component: <GiNoodles size={24} /> },
  { id: 'Soup', label: 'Sopas / Caldos', component: <FaBowlRice size={24} /> },
  { id: 'Sushi', label: 'Oriental / Sushi', component: <GiSushis size={24} /> },
  { id: 'Fish', label: 'Peixaria / Peixes', component: <FaFishFins size={24} /> },
  { id: 'Shrimp', label: 'Frutos do Mar', component: <GiShrimp size={24} /> },
  { id: 'Egg', label: 'Ovos / Omelete', component: <FaEgg size={24} /> },
  { id: 'Bacon', label: 'Bacon / Defumados', component: <FaBacon size={24} /> },
  
  // Bebidas Alcoólicas
  { id: 'Beer', label: 'Cervejas', component: <GiBeerBottle size={24} /> },
  { id: 'BeerGlass', label: 'Chopp / Artesanal', component: <FaMugHot size={24} /> },
  { id: 'Drink', label: 'Destilados / Drinks', component: <GiMartini size={24} /> },
  { id: 'WineGlass', label: 'Vinhos', component: <FaWineGlass size={24} /> },
  { id: 'Champagne', label: 'Espumantes', component: <FaChampagneGlasses size={24} /> },
  { id: 'WineBottle', label: 'Adega', component: <FaWineBottle size={24} /> },
  
  // Bebidas Sem Álcool
  { id: 'Soda', label: 'Refrigerantes', component: <GiSodaCan size={24} /> },
  { id: 'Juice', label: 'Sucos Naturais', component: <FaLemon size={24} /> },
  { id: 'Energy', label: 'Energéticos', component: <FaBoltLightning size={24} /> },
  { id: 'Water', label: 'Água / Sem Álcool', component: <FaBottleWater size={24} /> },
  { id: 'Coffee', label: 'Cafeteria / Chás', component: <GiCoffeeCup size={24} /> },
  
  // Doces, Sorvetes e Padaria
  { id: 'Acai', label: 'Açaí', component: <FaIceCream size={24} /> },
  { id: 'IceCream', label: 'Sorveteria', component: <GiIceCreamCone size={24} /> },
  { id: 'Cupcake', label: 'Doces / Sobremesas', component: <GiCupcake size={24} /> },
  { id: 'Chocolate', label: 'Chocolates', component: <GiChocolateBar size={24} /> },
  { id: 'Cake', label: 'Bolos / Tortas', component: <FaCakeCandles size={24} /> },
  { id: 'Bread', label: 'Padaria', component: <FaBreadSlice size={24} /> },
  { id: 'Croissant', label: 'Café da Manhã', component: <GiCroissant size={24} /> },
  
  // Saudável, Vegano e Mercado
  { id: 'Leaf', label: 'Vegano / Saudável', component: <FaLeaf size={24} /> },
  { id: 'Carrot', label: 'Hortifruti', component: <FaCarrot size={24} /> },
  { id: 'FruitBowl', label: 'Salada de Frutas', component: <GiFruitBowl size={24} /> },
  { id: 'Strawberry', label: 'Frutas Vermelhas', component: <GiStrawberry size={24} /> },
  { id: 'Watermelon', label: 'Melancia / Tropicais', component: <GiWatermelon size={24} /> },
  { id: 'Apple', label: 'Maçã / Pomar', component: <FaAppleWhole size={24} /> },
  { id: 'Cheese', label: 'Frios / Laticínios', component: <FaCheese size={24} /> },
  { id: 'Basket', label: 'Mercado / Mercearia', component: <FaBasketShopping size={24} /> },
  { id: 'Store', label: 'Conveniência', component: <FaStore size={24} /> },
  { id: 'Pepper', label: 'Condimentos', component: <FaPepperHot size={24} /> },
  
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
    { id: 'insights', name: 'Velo Insights (IA)', icon: <Sparkles size={18} className="text-purple-500" />, mobileIcon: <Sparkles size={22} className="text-purple-500" /> }, // <-- NOVA ABA DE IA
    { id: 'orders', name: 'Pedidos', icon: <ShoppingBag size={18} />, mobileIcon: <ShoppingBag size={22} /> },
    { id: 'fleet', name: 'Monitor de Frota', icon: <Truck size={18} />, mobileIcon: <Truck size={22} /> }, // <-- NOVA ABA
    { id: 'manual', name: 'Lançar Pedido', icon: <PlusCircle size={18} />, mobileIcon: <PlusCircle size={22} /> },
    { id: 'abandoned', name: 'Carrinhos (Perdidos)', icon: <ShoppingCart size={18} />, mobileIcon: <ShoppingCart size={22} /> },
    { id: 'products', name: 'Estoque', icon: <Package size={18} />, mobileIcon: <Package size={22} /> },
    { id: 'ingredients', name: 'Insumos (Pães)', icon: <Database size={18} />, mobileIcon: <Database size={22} /> },
    { id: 'categories', name: 'Categorias', icon: <List size={18} />, mobileIcon: <List size={22} /> },
    { id: 'banners', name: 'Banners', icon: <Image size={18} />, mobileIcon: <Image size={22} /> },
    { id: 'customers', name: 'Clientes VIP', icon: <Users size={18} />, mobileIcon: <Users size={22} /> },
    { id: 'marketing', name: 'Marketing', icon: <Trophy size={18} />, mobileIcon: <Trophy size={22} /> },
    { id: 'store_settings', name: 'Loja', icon: <Bell size={18} />, mobileIcon: <Bell size={22} /> },
    { id: 'integrations', name: 'Integrações', icon: <LinkIcon size={18} />, mobileIcon: <LinkIcon size={22} /> },
    { id: 'partners', name: 'Hub Parceiros', icon: <Handshake size={18} />, mobileIcon: <Handshake size={22} /> },
    { id: 'team', name: 'Equipe', icon: <UserPlus size={18} />, mobileIcon: <UserPlus size={22} /> },
    { id: 'finance', name: 'Financeiro', icon: <Wallet size={18} />, mobileIcon: <Wallet size={22} /> },
    { id: 'chat', name: 'Chat Whats', icon: <MessageCircle size={18} />, mobileIcon: <MessageCircle size={22} /> },
];

export default function Admin() {
    const navigate = useNavigate();
    
    // Estados do VeloPay
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawPlan, setWithdrawPlan] = useState('d0');
    const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
    const [velopayBalance, setVelopayBalance] = useState(0);
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
                ? '/api/pay-subscription-mp' 
                : 'https://app.velodelivery.com.br/api/pay-subscription-mp';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId, amount: invoiceData.total })
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
    // --- INTEGRAÇÃO MERCADO PAGO CONNECT (OAUTH) ---
    const handleConectarMercadoPago = () => {
        if (!storeId) return alert("Erro: Loja não identificada.");

        // ⚠️ COLOQUE AQUI O SEU CLIENT ID (ID do Aplicativo.) COPIADO DO PAINEL DO MP
        const clientId = "3333618086500697"; 
        
        // A Redirect URI deve apontar para o seu BACKEND (Next.js), pois ele fará a requisição segura
        // Ajuste a porta 3000 se o seu backend local rodar em outra porta.
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const redirectUri = isLocal 
            ? 'http://localhost:3000/api/mp-callback' 
            : 'https://app.velodelivery.com.br/api/mp-callback'; // ⚠️ Ajuste para o domínio real da sua API na Vercel

        // O 'state' é CRÍTICO: Passamos o ID da loja nele. Quando o MP redirecionar de volta, 
        // ele nos devolve esse state. Assim sabemos em qual loja salvar o token no banco!
        const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${storeId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        // Redireciona o lojista para a tela de aprovação do Mercado Pago
        window.location.href = authUrl;
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
    let cleanHost = hostname.toLowerCase().trim().replace(/^www\./, '');
    
    // MAPA DE DOMÍNIOS PERSONALIZADOS (Sincronizado com o Backend para não dar Bug)
    const domainMap = {
        "convenienciasantaisabel.com.br": "csi",
        "csi.com.br": "csi",
        "cowburguer.com.br": "cowburguer",
        "macanudorex.com.br": "macanudorex",
        "ngconveniencia.com.br": "ng"
    };

    let currentSubdomain = null;
    if (domainMap[cleanHost]) {
        currentSubdomain = domainMap[cleanHost];
    } else if (cleanHost !== 'localhost' && cleanHost.includes('.')) {
        currentSubdomain = cleanHost.split('.')[0];
    }

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
  // --- LÓGICA DE BLOQUEIO FINANCEIRO ATIVADA (SAAS) ---
    const [trialInfo, setTrialInfo] = useState({ isTrial: false, daysLeft: 999, isOverdue: false });
    // A variável isOverdue desceu para evitar o erro de tela branca!
    // ----------------------------------------------
    // --- ESTADOS GERAIS ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [orderViewMode, setOrderViewMode] = useState('list'); // NOVO: Controle de visualização (Lista ou Kanban)
    const [orderSearchTerm, setOrderSearchTerm] = useState(''); // Estado para busca de pedidos
    const [ordersPerPage, setOrdersPerPage] = useState(25); // NOVO: Limite de pedidos por página
    const [currentPage, setCurrentPage] = useState(1); // NOVO: Página atual dos pedidos
    const [currentTime, setCurrentTime] = useState(new Date()); // <-- ADICIONADO PARA CORRIGIR A TELA BRANCA
    const [orderFilterStatus, setOrderFilterStatus] = useState('all'); // NOVO: Filtro de Status
    const [orderFilterSource, setOrderFilterSource] = useState('all'); // NOVO: Filtro de Canal (App, PDV, Wpp)

   // NOVO: Reseta a página para 1 sempre que a busca, filtros, a aba ou a quantidade mudar
    useEffect(() => {
        setCurrentPage(1);
    }, [orderSearchTerm, activeTab, ordersPerPage, orderFilterStatus, orderFilterSource]);
    // Faz o relógio "bater" a cada 30 segundos para mudar as cores dos atrasos ao vivo
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 30000); 
        return () => clearInterval(interval);
    }, []);
    const [visitasHoje, setVisitasHoje] = useState(0);
    const [analyticsHistory, setAnalyticsHistory] = useState([]); // <-- NOVO ESTADO HISTÓRICO PARA O VELO INSIGHTS
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false); // IA Pensando
    const [insightsResponse, setInsightsResponse] = useState(null); // Resposta da IA
    const [orders, setOrders] = useState([]);
    const[abandonedCarts, setAbandonedCarts] = useState([]); // NOVO: Estado dos abandonados
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // --- ESTADOS DE INSUMOS GLOBAIS ---
    const [ingredients, setIngredients] = useState([]);
    const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
    const [editingIngredientId, setEditingIngredientId] = useState(null);
    const [ingredientForm, setIngredientForm] = useState({ name: '', stock: 0, unit: 'un' });
    const [settings, setSettings] = useState({ promoActive: false, promoBannerUrls: [] });
    const[generalBanners, setGeneralBanners] = useState([]);
    // --- ESTADOS DO MODAL DE RELATÓRIO ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState('hoje'); // 'hoje', '7dias', '30dias', 'mes', 'personalizado'
    const [reportSeller, setReportSeller] = useState('todos'); // 'todos', 'online', 'manual'
    const [showReportResults, setShowReportResults] = useState(false); 
    const [selectedInvoice, setSelectedInvoice] = useState(null); 
    
    // --- NOVOS ESTADOS PARA O RELATÓRIO E CUPOM ---
    const [reportCustomStart, setReportCustomStart] = useState('');
    const [reportCustomEnd, setReportCustomEnd] = useState('');
    const [couponProductSearch, setCouponProductSearch] = useState('');

    const handlePrintReport = () => {
        const w = window.open('', '_blank');
        const dataInicioFormatada = reportDateRange === 'personalizado' && reportCustomStart ? new Date(reportCustomStart).toLocaleString('pt-BR') : 'Início do Período';
        const dataFimFormatada = reportDateRange === 'personalizado' && reportCustomEnd ? new Date(reportCustomEnd).toLocaleString('pt-BR') : 'Fim do Período';
        const periodoTexto = reportDateRange === 'personalizado' ? `${dataInicioFormatada} até ${dataFimFormatada}` : reportDateRange.toUpperCase();
        
        w.document.write(`
            <html>
            <head>
                <title>Fechamento de Caixa - ${storeStatus.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .total { font-size: 24px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${storeStatus.name || 'LOJA'}</h2>
                    <h3>FECHAMENTO DE CAIXA</h3>
                    <p>Período: ${periodoTexto}</p>
                    <p>Vendedor/Filtro: ${reportSeller}</p>
                    <p>Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
                
                <h3>Resumo de Entradas</h3>
                <div class="row"><span>Via PIX (${reportTotals.pix.count} ped.):</span> <strong>R$ ${reportTotals.pix.total.toFixed(2)}</strong></div>
                <div class="row"><span>Cartão (${reportTotals.cartao.count} ped.):</span> <strong>R$ ${reportTotals.cartao.total.toFixed(2)}</strong></div>
                <div class="row"><span>Dinheiro (${reportTotals.dinheiro.count} ped.):</span> <strong>R$ ${reportTotals.dinheiro.total.toFixed(2)}</strong></div>
                <div class="row"><span>Outros/Mesa (${reportTotals.outros.count} ped.):</span> <strong>R$ ${reportTotals.outros.total.toFixed(2)}</strong></div>
                
                <div class="total"><span>TOTAL BRUTO:</span> <span>R$ ${reportTotals.totalGeral.toFixed(2)}</span></div>
                <div class="row" style="margin-top: 15px; border:none;"><span>Volume de Pedidos Pagos:</span> <strong>${reportTotals.qtdPedidos}</strong></div>
                
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                    <p>Relatório gerado pelo Veloapp</p>
                </div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
            </html>
        `);
        w.document.close();
    };
    // -------------------------------------
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [showAllCriticalStock, setShowAllCriticalStock] = useState(false);
    // NOVO: Estado que vai receber as novidades do Firebase em tempo real
    const [systemUpdate, setSystemUpdate] = useState({ 
        version: "7.1.0", 
        log: [
            { title: "🚀 Veloapp Dinâmico", desc: "Aguardando conexão com o servidor central..." }
        ] 
    });
    // --- ESTADOS DE EQUIPE / USUÁRIOS ---
    const [teamMembers, setTeamMembers] = useState([]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [teamForm, setTeamForm] = useState({
        name: '', email: '', permissions: { orders: false, products: false, customers: false, store_settings: false, integrations: false, marketing: false, finance: false, team: false }
    });
    const [posLogs, setPosLogs] = useState([]); // Guarda os logs de quem abriu/fechou o caixa
    const [isCaixaAberto, setIsCaixaAberto] = useState(() => localStorage.getItem('caixa_status') === 'aberto');

    const handleToggleCaixa = async () => {
        const newStatus = isCaixaAberto ? 'fechado' : 'aberto';
        const actionText = isCaixaAberto ? 'FECHAR O CAIXA' : 'ABRIR O CAIXA';
        
        if(!window.confirm(`Deseja registrar que você ${actionText} agora?`)) return;

        try {
            await addDoc(collection(db, "pos_logs"), {
                storeId: storeId,
                userEmail: auth.currentUser?.email || 'Desconhecido',
                userName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Equipe',
                action: isCaixaAberto ? 'FECHOU O CAIXA' : 'ABRIU O CAIXA',
                timestamp: serverTimestamp()
            });
            
            setIsCaixaAberto(!isCaixaAberto);
            localStorage.setItem('caixa_status', newStatus);
            alert(`✅ Sucesso: Registro salvo para auditoria do administrador!`);
        } catch (error) {
            alert("Erro ao registrar no caixa: " + error.message);
        }
    };

    // --- LÓGICA DE CONTROLE DE ACESSO (REATIVA E BLINDADA) ---
    const [userPermissions, setUserPermissions] = useState(null);

    useEffect(() => {
        if (auth.currentUser) {
            const member = teamMembers.find(m => m.email === auth.currentUser.email);
            if (member) {
                setUserPermissions(member.permissions || {}); // É funcionário, pega as regras
            } else {
                setUserPermissions('owner'); // Não está na equipe, assume acesso total (Dono)
            }
        }
    }, [auth.currentUser, teamMembers]);

    const hasPermission = (menuId) => {
        // Se ainda não carregou as regras, mostra só o início
        if (userPermissions === null) return menuId === 'dashboard'; 
        
        // Se for o dono, libera tudo
        if (userPermissions === 'owner') return true;

        // Se for funcionário, checa a permissão exata
        switch(menuId) {
            case 'dashboard': return true;
            
            case 'orders': 
            case 'manual': 
            case 'abandoned': 
            case 'fleet': // <-- ADICIONADO AQUI: Quem vê pedidos, vê a frota!
            case 'chat': return userPermissions.orders === true; 
            
            case 'products': 
            case 'categories': 
            case 'ingredients': return userPermissions.products === true; 
            
            case 'customers': return userPermissions.customers === true; 
            
            case 'store_settings': return userPermissions.store_settings === true; 
            
            case 'banners': 
            case 'marketing': 
            case 'partners': 
            case 'insights': return userPermissions.marketing === true; // <-- CORREÇÃO: Insights e Parceiros liberados junto com Marketing
            
            case 'finance': return userPermissions.finance === true;
            
            case 'team': return userPermissions.team === true; 
            
            case 'integrations': return userPermissions.integrations === true; 
            
            default: return false;
        }
    };
    const [unreadChatsCount, setUnreadChatsCount] = useState(0); // NOVO: Contador de notificações do WhatsApp
    // --- ESTADO DO MONITOR DE FROTA ---
    const [fleetLocations, setFleetLocations] = useState([]);
    const [withdrawalsList, setWithdrawalsList] = useState([]); // NOVO: Lista de Saques para abater do saldo

    const handleRequestWithdraw = async () => {
        if (velopayBalance <= 0) return alert("Saldo insuficiente para saque.");
        if (!window.confirm(`Deseja solicitar o saque de R$ ${velopayBalance.toFixed(2)}?`)) return;

        setIsProcessingWithdraw(true);
        try {
            await addDoc(collection(db, "withdrawals"), {
                storeId: storeId,
                storeName: storeStatus.name,
                amount: velopayBalance,
                status: 'pending',
                pixKey: storeStatus?.velopayData?.pixKey || '',
                requestedAt: serverTimestamp(),
                plan: storeStatus?.velopayPixPlan || 'd0'
            });
            alert("✅ Saque solicitado com sucesso! O valor será depositado na sua conta cadastrada.");
        } catch (error) {
            console.error("Erro ao solicitar saque:", error);
            alert("Erro ao solicitar saque. Tente novamente.");
        } finally {
            setIsProcessingWithdraw(false);
        }
    };

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
    // Estado da Busca e Filtros de Produtos
    const [productSearch, setProductSearch] = useState('');
    const [productsPerPage, setProductsPerPage] = useState(25);
    const [currentProductPage, setCurrentProductPage] = useState(1);
    const [productFilterCategory, setProductFilterCategory] = useState('all');
    const [productFilterStatus, setProductFilterStatus] = useState('all');

    useEffect(() => {
        setCurrentProductPage(1);
    }, [productSearch, activeTab, productsPerPage, productFilterCategory, productFilterStatus]);

    // --- NOVO: LÓGICA DE ATIVAÇÃO RÁPIDA E EM MASSA ---
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    const handleQuickToggleCategory = async (cat) => {
        try {
            await updateDoc(doc(db, "categories", cat.id), { isActive: cat.isActive === false ? true : false });
        } catch (e) { alert("Erro ao alterar status da categoria."); }
    };

    const handleQuickToggleProduct = async (product) => {
        try {
            await updateDoc(doc(db, "products", product.id), { isActive: product.isActive === false ? true : false });
        } catch (e) { alert("Erro ao alterar status do produto."); }
    };

    const handleBulkToggleProducts = async (newStatus) => {
        if (selectedProductIds.length === 0) return;
        if (!window.confirm(`Deseja ${newStatus ? 'ATIVAR' : 'OCULTAR'} os ${selectedProductIds.length} produtos selecionados?`)) return;
        
        try {
            const batchPromises = selectedProductIds.map(id => updateDoc(doc(db, "products", id), { isActive: newStatus }));
            await Promise.all(batchPromises);
            setSelectedProductIds([]); // Limpa a seleção após o sucesso
        } catch (e) { alert("Erro na atualização em massa."); }
    };
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
    const [loyaltyRedemptions, setLoyaltyRedemptions] = useState([]);
    const [reviewsList, setReviewsList] = useState([]);
    const [showAllVips, setShowAllVips] = useState(false); // CORREÇÃO: Estado que controla o limite da lista VIP
    const [replyText, setReplyText] = useState({});
    // --- ESTADOS DA CONFIGURAÇÃO DA ROLETA ---
    const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
    const [rouletteSlices, setRouletteSlices] = useState([]);
    
    // --- NOVO: ESTADOS DO VELOPAY ONBOARDING ---
    const [veloPayForm, setVeloPayForm] = useState({
        legalName: '', document: '', phone: '', pixKey: ''
    });
    const [isSubmittingVeloPay, setIsSubmittingVeloPay] = useState(false);

    // --- NOVOS ESTADOS (VIP / CADERNETA / MISSÕES) ---
    const [isVipModalOpen, setIsVipModalOpen] = useState(false);
    const [editingVip, setEditingVip] = useState(null);
    const [storeCustomersDB, setStoreCustomersDB] = useState([]);
    const [activeReviewTab, setActiveReviewTab] = useState('missions');
    const [vipMissions, setVipMissions] = useState([]);

// --- RESTAURANDO A LEITURA DA EQUIPE QUE SUMIU ---
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

    // Efeito para calcular a fatura em tempo real e Saldo VeloPay dinâmico
    useEffect(() => {
        if(orders.length > 0 || products.length > 0) {
            // --- LÓGICA DE CICLO ROTATIVO (SAAS) CORRIGIDA ---
            let diaVencimento = storeStatus?.billingDay || 9; // Fallback para o dia do seu ciclo
            
            // BLINDAGEM: Trava o dia de vencimento com base no histórico real salvo no banco, 
            // NUNCA mais usando a data de criação da loja para não resetar o excedente!
            if (storeStatus?.faturasHistorico && storeStatus.faturasHistorico.length > 0) {
                const faturaReferencia = storeStatus.faturasHistorico[storeStatus.faturasHistorico.length - 1];
                if (faturaReferencia.dueDate) {
                    const dataRef = new Date(faturaReferencia.dueDate);
                    if (!isNaN(dataRef)) diaVencimento = dataRef.getDate();
                }
            }

            const now = new Date();
            let startOfCycle, endOfCycle;
            
            // O pulo do gato: se o dia de hoje for Menor ou Igual ao Vencimento, 
            // significa que a loja AINDA está dentro do ciclo que fecha neste mês (Até as 23h59 de hoje).
            if (now.getDate() <= diaVencimento) {
                startOfCycle = new Date(now.getFullYear(), now.getMonth() - 1, diaVencimento);
                endOfCycle = new Date(now.getFullYear(), now.getMonth(), diaVencimento, 23, 59, 59);
            } else {
                startOfCycle = new Date(now.getFullYear(), now.getMonth(), diaVencimento);
                endOfCycle = new Date(now.getFullYear(), now.getMonth() + 1, diaVencimento, 23, 59, 59);
            }

            const franchiseLimit = 100;
            
            // BLINDAGEM DE DATAS: Garante que só pedidos deste ciclo exato sejam somados
            const currentMonthOrders = orders.filter(o => {
                if (o.status === 'canceled' || o.status === 'cancelado') return false;
                if (!o.createdAt) return false;

                let d;
                if (typeof o.createdAt.toDate === 'function') d = o.createdAt.toDate();
                else if (o.createdAt.seconds) d = new Date(o.createdAt.seconds * 1000);
                else if (o.createdAt._seconds) d = new Date(o.createdAt._seconds * 1000);
                else d = new Date(o.createdAt);
                
                if (isNaN(d)) return false;

                return d >= startOfCycle && d <= endOfCycle;
            }).length;

           const extraOrders = Math.max(0, currentMonthOrders - franchiseLimit);
            const extraCost = extraOrders * 0.25;
            
            // --- CÁLCULO DE DIAS PARA O VENCIMENTO (BASEADO NA FATURA PENDENTE OU NO CICLO) ---
            let daysUntilDue = 999;
            const faturasPendentes = (storeStatus?.faturasHistorico || []).filter(f => f.status === 'PENDENTE');
            
            if (faturasPendentes.length > 0) {
                // Se tem fatura pendente, os dias restantes são baseados nela (Pega a mais antiga)
                const faturaAtual = faturasPendentes.reduce((a, b) => new Date(a.dueDate) < new Date(b.dueDate) ? a : b); 
                const dueDate = new Date(faturaAtual.dueDate);
                const diffTime = dueDate.getTime() - now.getTime();
                daysUntilDue = Math.ceil(diffTime / (1000 * 3600 * 24));
            } else {
                // Se não tem fatura pendente, calcula o próximo ciclo normal
                let proximoVencimento = new Date(now.getFullYear(), now.getMonth(), diaVencimento);
                if (now.getDate() > diaVencimento) {
                    proximoVencimento = new Date(now.getFullYear(), now.getMonth() + 1, diaVencimento);
                }
                const diffTime = proximoVencimento.getTime() - now.getTime();
                daysUntilDue = Math.ceil(diffTime / (1000 * 3600 * 24));
            }
            // -----------------------------------------------

            // Verifica se a loja ainda possui o status de cortesia ativo NESTE EXATO MOMENTO
            const isCortesiaAtual = storeStatus?.billingStatus === 'gratis_vitalicio' || storeStatus?.billingStatus === 'cortesia' || storeStatus?.billingStatus === 'isento';

            // 🚨 CORREÇÃO: Se existe fatura fechada pendente, ela DITA o valor a pagar (Puxa o excedente real salvo no banco)
            let finalTotal = (isCortesiaAtual ? 0 : 49.90) + extraCost;
            let finalBasePlan = isCortesiaAtual ? 0 : 49.90;
            let finalExtraCost = extraCost;

            if (faturasPendentes.length > 0) {
                // Pega a fatura mais urgente
                const faturaAtual = faturasPendentes.reduce((a, b) => new Date(a.dueDate) < new Date(b.dueDate) ? a : b); 
                
                if (faturaAtual.amount) {
                    // Converte a string "R$ 150,50" gerada pelo CRON de volta para número 150.50
                    finalTotal = typeof faturaAtual.amount === 'number' 
                        ? faturaAtual.amount 
                        : Number(String(faturaAtual.amount).replace('R$ ', '').replace('.', '').replace(',', '.'));
                }
                if (faturaAtual.breakdown) {
                    finalBasePlan = faturaAtual.breakdown.basePlan || 49.90;
                    finalExtraCost = faturaAtual.breakdown.extraOrdersCost || 0;
                }
            }

            setInvoiceData({
                basePlan: finalBasePlan, 
                extraOrdersCost: finalExtraCost, 
                cycleOrdersCount: currentMonthOrders, 
                storageUsage: (products.length * 0.5) + (generalBanners.length * 2),
                dbUsage: products.length + orders.length + 50,
                total: finalTotal, 
                status: faturasPendentes.length > 0 ? 'overdue' : 'open',
                cycleStartStr: startOfCycle.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
                cycleEndStr: endOfCycle.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
                daysUntilDue: daysUntilDue // <-- Adicionado estado dos dias
            });

            // 🚨 NOVO: MOTOR DO SALDO VELOPAY BLINDADO (Calculado pelo Frontend)
            const totalPixRecebido = orders
                .filter(o => 
                    ['velopay_pix', 'velopay_credit'].includes(o.paymentMethod) && 
                    ['paid', 'approved', 'concluida', 'CONCLUIDA'].includes(o.paymentStatus) &&
                    o.source !== 'manual_pdv' && o.source !== 'manual' // Pega só vendas da loja online
                )
                .reduce((acc, o) => acc + Number(o.veloNetAmount || o.total || 0), 0); // Lê o valor com a taxa descontada

            const totalSacado = withdrawalsList
                .filter(w => w.status !== 'rejected') // Abate os saques pendentes ou aprovados
                .reduce((acc, w) => acc + Number(w.amount || 0), 0);

            setVelopayBalance(Math.max(0, totalPixRecebido - totalSacado));
        }
    }, [orders, products, generalBanners, withdrawalsList]);
    // --- ESTADOS DE MODAIS E FORMULÁRIOS ---
    // Produtos
    const[isModalOpen, setIsModalOpen] = useState(false);
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    // --- NOVO: ESTADOS PARA A IA DE PROMOÇÕES ---
    const [isPromoCopyModalOpen, setIsPromoCopyModalOpen] = useState(false);
    const [promoCopyProduct, setPromoCopyProduct] = useState(null);
    const [promoCopyResult, setPromoCopyResult] = useState({ whatsapp: '', instagram: '', hashtags: '' });
    const [isGeneratingPromoCopy, setIsGeneratingPromoCopy] = useState(false);
    // --- NOVO: ESTADOS PARA PREVISÃO DE ESTOQUE (IA) ---
    const [isGeneratingPredict, setIsGeneratingPredict] = useState(false);
    const [predictResult, setPredictResult] = useState(null);
    const [predictDays, setPredictDays] = useState(7);

    const handleGenerateStockPredict = async () => {
        setIsGeneratingPredict(true);
        setPredictResult(null);
        try {
            const res = await fetch('/api/stock-predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, daysToPredict: predictDays })
            });
            const data = await res.json();
            if (data.success) {
                setPredictResult(data.insight);
            } else {
                alert(`Erro na IA: ${data.error || 'Falha ao analisar estoque.'}`);
            }
        } catch (error) {
            console.error("Erro no Stock Predict:", error);
            alert("Erro de conexão ao tentar gerar a previsão de estoque.");
        } finally {
            setIsGeneratingPredict(false);
        }
    };
    // --- NOVO: ESTADOS PARA COPIAR COMPLEMENTOS ---
    const [isCopyComplementModalOpen, setIsCopyComplementModalOpen] = useState(false);
    const [complementToCopy, setComplementToCopy] = useState(null);
    const [productsToApplyComplement, setProductsToApplyComplement] = useState([]);
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
        gtin: '',
        brand: '',
        prepTime: '',
        deliveryLeadTime: '',
        calories: '',
        suitableForDiet:[],
        variations: '',
        isActive: true // <-- NOVO CAMPO ADICIONADO
    });

    const [editingId, setEditingId] = useState(null);
    // --- Estado para Edição de Pedido ---
    const[isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
    const [editingOrderData, setEditingOrderData] = useState(null);
    const [editOrderProductSearch, setEditOrderProductSearch] = useState(''); // Estado de busca para o modal de edição

    // --- [NOVO] Estados para Rastreio do Motoboy (Admin Radar) ---
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingOrder, setTrackingOrder] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);

    // Motor de leitura em tempo real do GPS (Ativa apenas com o modal aberto)
    useEffect(() => {
        let unsubscribe;
        if (isTrackingModalOpen && trackingOrder && trackingOrder.storeId && trackingOrder.id) {
            const database = getDatabase();
            const trackingRef = rtdbRef(database, `tracking/${trackingOrder.storeId}/${trackingOrder.id}`);
            
            unsubscribe = onValue(trackingRef, (snapshot) => {
                if (snapshot.exists()) {
                    const coords = snapshot.val();
                    setDriverLocation({ lat: Number(coords.lat), lng: Number(coords.lng) });
                } else {
                    setDriverLocation(null);
                }
            });
        }
        
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isTrackingModalOpen, trackingOrder]);
    // -------------------------------------------------------------
    const [upsellSearch, setUpsellSearch] = useState(''); // NOVO: Busca para o Compre Junto
    // Estado para o frete do pedido manual
    const [manualShippingFee, setManualShippingFee] = useState(0);
    const [manualExtraFee, setManualExtraFee] = useState(0);
    // Categorias
    const[isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', icon: 'List', order: 0, isActive: true });
    const [editingCatId, setEditingCatId] = useState(null);

    // Banners
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkTo: '', order: 0, isActive: true });
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [bannerImageFile, setBannerImageFile] = useState(null);
    const[uploadingBannerImage, setUploadingBannerImage] = useState(false);

    // Pedido Manual
    const[manualCart, setManualCart] = useState([]);
    const [manualCustomer, setManualCustomer] = useState({ name: '', address: '', phone: '', payment: 'pix', changeFor: '', deliveryMethod: 'delivery', splitPayments: [] });
    const[manualCouponCode, setManualCouponCode] = useState('');
    const [manualDiscountAmount, setManualDiscountAmount] = useState(0);
    const [isSubmittingPOS, setIsSubmittingPOS] = useState(false);

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

    // 🚨 TRAVA DO PAINEL: Verifica o histórico real de faturas para ver se há inadimplência
    const hasOverdueInvoice = (storeStatus?.faturasHistorico || []).some(fatura => {
        if (fatura.status !== 'PENDENTE') return false;
        if (!fatura.dueDate) return false;
        
        const dueDate = new Date(fatura.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignora a hora, foca apenas no dia
        
        return dueDate < today; // Se a data de vencimento já passou e está PENDENTE, bloqueia!
    });

    const isOverdue = storeStatus?.billingStatus === 'bloqueado' || 
        (storeStatus?.billingStatus !== 'gratis_vitalicio' && 
         storeStatus?.billingStatus !== 'isento' && 
         !trialInfo.isTrial && 
         hasOverdueInvoice);

    // --- CORREÇÃO SEO: FORÇA O NOME DA LOJA NA ABA DO NAVEGADOR ---
    useEffect(() => {
        if (storeStatus && storeStatus.name && storeStatus.name !== 'Carregando...' && storeStatus.name !== 'Nova Loja') {
            document.title = `${storeStatus.name} - Painel Velo`;
        } else if (store && store.name) {
            document.title = `${store.name} - Painel Velo`;
        } else {
            document.title = "Painel Lojista - Velo Delivery";
        }
    }, [storeStatus?.name, store?.name]);
    // --------------------------------------------------------------

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

    const handleResetPassword = async (emailUsuario) => {
        if (!emailUsuario) return alert("E-mail do usuário não encontrado.");
        try {
            auth.languageCode = 'pt'; // <-- FORÇA O FIREBASE A TRADUZIR O E-MAIL PADRÃO
            await sendPasswordResetEmail(auth, emailUsuario);
            alert(`E-mail de redefinição enviado com sucesso para ${emailUsuario}! Peça para o usuário checar a caixa de entrada e o lixo eletrônico (spam).`);
        } catch (error) {
            console.error("Erro ao enviar e-mail de redefinição:", error);
            alert("Ocorreu um erro ao tentar enviar o e-mail. Verifique se o e-mail está correto e cadastrado na aba Authentication do Firebase.");
        }
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
        let initialOrders = true;
        const unsubOrders = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeId), orderBy("createdAt", "desc")), (s) => {
            if (!initialOrders) {
                s.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
                    }
                });
            }
            initialOrders = false;
            setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

       // Carrinhos Abandonados (Com som de notificação macio e Filtro de Telefone)
       let initialCarts = true;
        const unsubAbandoned = onSnapshot(query(collection(db, "abandoned_carts"), where("storeId", "==", storeId), orderBy("lastUpdated", "desc")), (s) => {
            const validCarts = s.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(cart => cart.customerPhone && String(cart.customerPhone).replace(/\D/g, '').length >= 10);

            if (!initialCarts) {
                s.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    const hasPhone = data.customerPhone && String(data.customerPhone).replace(/\D/g, '').length >= 10;
                    if (change.type === "added" && hasPhone) {
                        new Audio('https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3').play().catch(() => { });
                    }
                });
            }
            initialCarts = false;
            setAbandonedCarts(validCarts);
        });

        // Produtos
        const unsubProducts = onSnapshot(query(collection(db, "products"), where("storeId", "==", storeId)), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
       // Categorias
        const unsubCategories = onSnapshot(query(collection(db, "categories"), where("storeId", "==", storeId)), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))));
        
        // Insumos Globais
        const unsubIngredients = onSnapshot(query(collection(db, "ingredients"), where("storeId", "==", storeId)), (s) => setIngredients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
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

        // --- VELO INSIGHTS: Busca os últimos 30 dias de comportamento do cliente ---
        const last30DaysDate = new Date();
        last30DaysDate.setDate(last30DaysDate.getDate() - 30);
        const minDateStr = last30DaysDate.toISOString().split('T')[0];

        const unsubAnalyticsHistory = onSnapshot(
            query(collection(db, "stores", storeId, "analytics"), where("date", ">=", minDateStr)),
            (s) => {
                setAnalyticsHistory(s.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        );

        // Cupons
       const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("storeId", "==", storeId)), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubLoyalty = onSnapshot(query(collection(db, "loyalty_redemptions"), where("storeId", "==", storeId)), (s) => setLoyaltyRedemptions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubReviews = onSnapshot(query(collection(db, "reviews"), where("storeId", "==", storeId)), (s) => {
            s.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3').play().catch(() => { });
                }
            });
            const fetched = s.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setReviewsList(fetched);
        });
        
        // --- NOVO: BUSCAR MISSÕES VIP (Com som de moeda) ---
        const unsubMissions = onSnapshot(query(collection(db, "loyalty_missions"), where("storeId", "==", storeId)), (s) => {
            s.docChanges().forEach((change) => {
                if (change.type === "added" && change.doc.data().createdAt?.toMillis() > Date.now() - 10000) {
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => { });
                }
            });
            const fetchedMissions = s.docs.map(d => ({ id: d.id, ...d.data() }));
            fetchedMissions.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setVipMissions(fetchedMissions);
        });

        // --- NOVO: BUSCAR CLIENTES (CADERNETA/FIADO) ---
        const unsubStoreCustomers = onSnapshot(query(collection(db, "store_customers"), where("storeId", "==", storeId)), (s) => {
            setStoreCustomersDB(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubPosLogs = onSnapshot(query(collection(db, "pos_logs"), where("storeId", "==", storeId), orderBy("timestamp", "desc")), (s) => setPosLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
// --- RESTAURANDO A LEITURA DA EQUIPE QUE SUMIU ---
        const unsubTeam = onSnapshot(query(collection(db, "team"), where("storeId", "==", storeId)), (s) => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
       // NOVO: Escuta as mensagens do WhatsApp para alertas de transbordo e som padrão
        let initialChat = true;
        const unsubWhatsApp = onSnapshot(query(collection(db, "whatsapp_inbound"), where("storeId", "==", storeId)), (s) => {
            let shouldPlaySound = false;
            let isHandoffAlert = false; // <-- NOVO: Flag de alerta crítico
            let senderName = "Cliente";
            let handoffMessageText = "";

            // Lê a exata string que o botão de "Falar com Humano" envia (ou assume um padrão)
            const handoffTriggerText = settings?.integrations?.whatsapp?.botOption2 || "Falar com Humano";

            // Descobre qual conversa o lojista está olhando agora
            const activeChatInScreen = localStorage.getItem('active_whatsapp_chat');

            if (!initialChat) {
                s.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    if (change.type === "added" && data.direction !== 'outbound' && data.status === 'unread') {
                        // Normaliza o número
                        let senderPhone = String(data.from || '').replace(/\D/g, '');
                        if (senderPhone.startsWith('55')) senderPhone = senderPhone.substring(2);

                        // VERIFICAÇÃO DE TRANSBORDO: Se a mensagem contiver a palavra-chave configurada
                        if (data.text && String(data.text).toLowerCase().includes(handoffTriggerText.toLowerCase())) {
                            isHandoffAlert = true;
                            handoffMessageText = data.text;
                            shouldPlaySound = true; // Força o som mesmo se a tela já estiver aberta!
                            senderName = data.pushName || data.name || "Cliente";
                        } else if (senderPhone !== activeChatInScreen) {
                            // REGRA MÁGICA NORMAL: Só toca o som se a mensagem for de ALGUÉM DIFERENTE da tela aberta
                            shouldPlaySound = true; 
                            senderName = data.pushName || data.name || "Cliente";
                        }
                    }
                });

                // Toca o som APENAS UMA VEZ
                if (shouldPlaySound) {
                    const isMuted = localStorage.getItem('mute_whatsapp_sound') === 'true';
                    if (!isMuted) {
                        // Se for alerta de humano, toca o sino de alerta (Sino alto). Se não, o som padrão.
                        const defaultSound = localStorage.getItem('custom_chat_sound') || 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
                        const urgentSound = 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3';
                        const ringtone = new Audio(isHandoffAlert ? urgentSound : defaultSound);
                        
                        ringtone.play().catch(e => console.warn("Navegador bloqueou áudio."));
                        
                        // DISPARA NOTIFICAÇÃO DO SISTEMA
                        if ("Notification" in window) {
                            if (Notification.permission === "granted") {
                                new Notification(isHandoffAlert ? "🚨 ATENDIMENTO HUMANO" : "💬 Nova Mensagem", {
                                    body: isHandoffAlert ? `${senderName} quer falar com você. Assuma o chat!` : `${senderName} enviou uma mensagem!`,
                                    icon: storeStatus?.storeLogoUrl || "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
                                    requireInteraction: isHandoffAlert // Trava a notificação na tela até o lojista fechar
                                });
                            } else if (Notification.permission !== "denied") {
                                Notification.requestPermission();
                            }
                        }
                    }
                }
            }
            initialChat = false; // Desativa a trava de load inicial

            // Conta quantas pessoas diferentes mandaram mensagem não lida
            const unreadDocs = s.docs.filter(d => d.data().direction !== 'outbound' && d.data().status === 'unread');
            const unreadSenders = new Set(unreadDocs.map(d => d.data().from));
            setUnreadChatsCount(unreadSenders.size);
        });

       // NOVO: Escuta a versão e changelog global do sistema
        const unsubSystem = onSnapshot(doc(db, "system", "updates"), (d) => {
            if (d.exists()) setSystemUpdate({ version: d.data().version, log: d.data().log || [] });
        });

        // NOVO: MOTOR DE SAQUES VELOPAY (Substitui o stats que não estava atualizando)
        const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), where("storeId", "==", storeId)), (s) => setWithdrawalsList(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // --- RADAR GLOBAL DA FROTA (ADMIN) ---
        const realtimeDb = getDatabase();
        const fleetRef = rtdbRef(realtimeDb, `tracking/${storeId}`);
        const unsubFleet = onValue(fleetRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Converte e blinda os dados para evitar mapa cinza
                const activeDrivers = Object.entries(data).map(([orderId, pos]) => ({
                    orderId,
                    lat: Number(pos.lat || pos.latitude || 0),
                    lng: Number(pos.lng || pos.longitude || 0),
                    driverId: pos.driverId
                }));
                setFleetLocations(activeDrivers);
            } else {
                setFleetLocations([]);
            }
        });

        // --- LIMPEZA GERAL CORRIGIDA ---
        return () => { 
            unsubOrders(); unsubAbandoned(); unsubProducts(); unsubCategories(); unsubIngredients(); unsubGeneralBanners();
            unsubShipping(); unsubMk(); unsubSt(); unsubCoupons(); unsubLoyalty(); unsubReviews(); unsubMissions(); unsubTeam(); unsubSystem(); unsubWithdrawals(); unsubWhatsApp(); unsubPosLogs();
            if (unsubFleet) unsubFleet();
            if (unsubAnalyticsHistory) unsubAnalyticsHistory(); // <-- LIMPEZA DO LISTENER DE IA
            if (unsubStoreCustomers) unsubStoreCustomers(); // <-- LIMPEZA DA CADERNETA
        };
    },[storeId]);
    // --- 🧹 ANTI-GHOST: LIXEIRO AUTOMÁTICO DE CARRINHOS FALSOS ---
    useEffect(() => {
        const cleanFakeCarts = async () => {
            if (!abandonedCarts || abandonedCarts.length === 0 || !orders || orders.length === 0) return;

            // Define o tempo de corte (Pega pedidos feitos nas últimas 12 horas)
            const cutoffTime = Date.now() - (12 * 60 * 60 * 1000);
            
            // Cria uma lista APENAS com os números de WhatsApp de quem efetivou a compra hoje
            const phonesThatBought = new Set(
                orders
                    .filter(o => {
                        const orderTime = o.createdAt?.toMillis ? o.createdAt.toMillis() : (o.createdAt?.seconds * 1000) || 0;
                        return orderTime > cutoffTime && o.status !== 'canceled';
                    })
                    .map(o => String(o.customerPhone || '').replace(/\D/g, ''))
                    .filter(phone => phone.length >= 10)
            );

            // Varre a lista de carrinhos abandonados
            for (const cart of abandonedCarts) {
                const cartPhone = String(cart.customerPhone || '').replace(/\D/g, '');
                
                // Se o dono desse carrinho ESTÁ na lista de quem comprou... DELETA O CARRINHO!
                if (cartPhone.length >= 10 && phonesThatBought.has(cartPhone)) {
                    try {
                        // Apaga do banco de dados para não ocupar espaço
                        await deleteDoc(doc(db, "abandoned_carts", cart.id));
                        
                        // Some com ele da tela instantaneamente
                        setAbandonedCarts(prev => prev.filter(c => c.id !== cart.id));
                    } catch (e) {
                        console.error("Erro ao limpar carrinho fantasma:", e);
                    }
                }
            }
        };

        cleanFakeCarts();
    }, [orders, abandonedCarts]);
    // --------------------------------------------------------------
    // --- FUNÇÕES AUXILIARES ---
    const uploadImageToCloudinary = async (file) => {
        if (!file) throw new Error("Selecione um arquivo primeiro!");
        
        const ext = file.name.split('.').pop();
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const sanitizedName = baseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        const safeFile = new File([file], `${sanitizedName}.${ext}`, { type: file.type });

        const formData = new FormData();
        formData.append('file', safeFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        // MUDANÇA AQUI: Alterado de /image/upload para /auto/upload para aceitar mp3
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
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
    const handleGeneratePromoCopy = async (product) => {
        setIsPromoCopyModalOpen(true);
        setPromoCopyProduct(product);
        setIsGeneratingPromoCopy(true);
        setPromoCopyResult({ whatsapp: '', instagram: '', hashtags: '' });

        try {
            const response = await fetch('/api/generate-promo-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: storeStatus.name,
                    storeNiche: storeStatus.storeNiche,
                    productName: product.name,
                    productDesc: product.description || '',
                    productPrice: product.promotionalPrice > 0 ? product.promotionalPrice : product.price
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                setPromoCopyResult({
                    whatsapp: data.whatsapp,
                    instagram: data.instagram,
                    hashtags: data.hashtags
                });
            } else {
                alert(`Erro na IA: ${data.error || 'Falha ao conectar com o servidor.'}`);
                setIsPromoCopyModalOpen(false);
            }
        } catch (error) {
            console.error("Erro ao gerar Copy:", error);
            alert("Falha de conexão. Verifique sua internet e tente novamente.");
            setIsPromoCopyModalOpen(false);
        } finally {
            setIsGeneratingPromoCopy(false);
        }
    };

    const handleProductImageUpload = async () => {
        if (!imageFile) return alert("Selecione uma imagem primeiro!");
        
        // NOVO: Validação de formato
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(imageFile.type)) {
            setUploadError('Formato inválido. Use .jpg, .png ou .webp');
            return alert("Formato de imagem inválido! Por favor, selecione arquivos .jpg, .jpeg, .png ou .webp.");
        }

        // NOVO: Limite de tamanho (2MB)
        const MAX_SIZE_MB = 2;
        if (imageFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setUploadError(`Imagem muito grande. O limite máximo é ${MAX_SIZE_MB}MB.`);
            return alert(`A imagem excede o tamanho máximo de ${MAX_SIZE_MB}MB. Por favor, comprima e tente novamente.`);
        }

        setUploading(true); setUploadError('');
        try {
            const url = await uploadImageToCloudinary(imageFile);
            setForm(prev => ({ ...prev, imageUrl: url })); // Só salva se o upload der certo
            setImageFile(null);
            alert("Imagem anexada com sucesso!");
        } catch (error) { 
            console.error(error); 
            setUploadError('Erro ao enviar imagem. O link não foi salvo.'); 
            alert('Falha ao enviar a imagem para o servidor. Tente novamente.');
        } 
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
        // Cria uma cópia do objeto específico antes de alterar (Evita Mutação Direta)
        currentZones[index] = { ...currentZones[index], [field]: Number(value) };
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
    const handleRefundMercadoPago = async (order) => {
        if (!window.confirm(`🚨 ATENÇÃO: Deseja realmente ESTORNAR o pagamento de R$ ${Number(order.total).toFixed(2)} do pedido #${order.id.slice(-5).toUpperCase()}?\n\nO dinheiro será devolvido ao cliente no Mercado Pago e o pedido será cancelado.`)) return;

        try {
            // Um toast simples para ele saber que tá carregando
            alert("Processando estorno no Mercado Pago. Por favor aguarde...");
            
            const res = await fetch('/api/refund-mp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId, orderId: order.id })
            });

            const data = await res.json();

            if (res.ok) {
                // Atualiza o banco de dados marcando como estornado
                await updateDoc(doc(db, "orders", order.id), { 
                    paymentStatus: 'refunded', 
                    status: 'canceled',
                    refundedAt: serverTimestamp()
                });
                alert("✅ Pagamento estornado e pedido cancelado com sucesso!");

                // Disparo de Comprovante via WhatsApp Oficial (Se configurado)
                if (settings?.integrations?.whatsapp?.apiToken && order.customerPhone) {
                    const phoneRaw = String(order.customerPhone).replace(/\D/g, '');
                    const cleanPhone = phoneRaw.startsWith('55') ? phoneRaw : `55${phoneRaw}`;
                    const refundMsg = `❌ *PEDIDO CANCELADO E ESTORNADO*\n\nOlá ${order.customerName.split(' ')[0]}, o seu pedido #${order.id.slice(-5).toUpperCase()} foi cancelado e o valor de *R$ ${Number(order.total).toFixed(2)}* foi integralmente devolvido para a sua conta/cartão via Mercado Pago.\n\n🧾 *ID do Comprovante de Estorno:* ${data.refundId}\n\nO prazo para constar na fatura depende da operadora do seu cartão.`;
                    
                    try {
                        const waRes = await fetch('/api/whatsapp-send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'chat_reply',
                                storeId: storeId,
                                toPhone: cleanPhone,
                                dynamicParams: { text: refundMsg }
                            })
                        });

                        if (waRes.ok) {
                            await addDoc(collection(db, 'whatsapp_inbound'), {
                                storeId: storeId,
                                to: cleanPhone,
                                text: refundMsg,
                                receivedAt: serverTimestamp(),
                                status: 'read',
                                direction: 'outbound'
                            });
                        }
                    } catch (e) {
                        console.error("Erro ao enviar comprovante de estorno via WhatsApp", e);
                    }
                }

            } else {
                alert(`❌ Erro ao estornar: ${data.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao estornar:", error);
            alert("Erro de conexão ao tentar realizar o estorno.");
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
        
        const printMode = storeStatus.printMode || 'both';
        const htmlContent = printMode === 'kitchen' 
            ? gerarVia('VIA DA LOJA (COZINHA)', false) 
            : `${gerarVia('VIA DA LOJA', true)}${gerarVia('VIA DO ENTREGADOR', false)}`;
            
        w.document.write(`<html><body style="margin:0; padding:0;">${htmlContent}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>`);
        w.document.close();
    };

    const updateStatusAndNotify = async (order, newStatus) => {
        // 1. Atualiza o status do pedido no banco de dados primeiro
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        
        // --- NOVO: AUTO IMPRESSÃO DINÂMICA ---
        const autoPrintTrigger = storeStatus?.autoPrintStatus || (storeStatus?.autoPrintCompleted ? 'completed' : 'none');
        if (newStatus === autoPrintTrigger) {
            printLabel(order);
        }
        
        // --- GAMIFICAÇÃO: CRÉDITO AUTOMÁTICO DE CASHBACK (WALLET REAL) ---
        if (newStatus === 'completed' && settings?.gamification?.cashback && order.customerPhone) {
            if (!order.cashbackAwarded) {
                try {
                    const percent = Number(settings.gamification.cashbackPercent || 2) / 100;
                    const cashbackEarned = (Number(order.total) || 0) * percent;
                    if (cashbackEarned > 0) {
                        const cleanPhone = String(order.customerPhone).replace(/\D/g, '');
                        const walletRef = doc(db, "wallets", `${storeId}_${cleanPhone}`);
                        const walletSnap = await getDoc(walletRef);
                        
                        if (walletSnap.exists()) {
                            await updateDoc(walletRef, { balance: increment(cashbackEarned), lastUpdated: serverTimestamp() });
                        } else {
                            await setDoc(walletRef, { storeId, customerPhone: cleanPhone, customerName: order.customerName, balance: cashbackEarned, lastUpdated: serverTimestamp() });
                        }
                        await updateDoc(doc(db, "orders", order.id), { cashbackAwarded: true });
                    }
                } catch (e) { console.error("Erro ao creditar cashback:", e); }
            }
        }
        // -----------------------------------------------------------------

        const lojaNome = storeStatus.name || "Velo Delivery";
        
        const messages = {
            preparing: `👨‍🍳 *PEDIDO EM PREPARO!* \n\nOlá ${order.customerName.split(' ')[0]}, seu pedido foi recebido e já está sendo preparado aqui na *${lojaNome}*.`,
            delivery: `🏍️ *SAIU PARA ENTREGA!* \n\nO motoboy já está a caminho com o seu pedido #${order.id.slice(-5).toUpperCase()}.\n\n📍 *Acompanhe a entrega no mapa ao vivo:* \nhttps://${window.location.host}/track/${order.id}`,
            completed: `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega. Muito obrigado pela preferência! ❤️ \n\n🎁 *Ganhe Prêmios e Descontos!* \nAcesse agora o nosso app e entre no Clube VIP para ganhar pontos na faixa: \n👉 https://${window.location.host}`,
            canceled: `❌ *PEDIDO CANCELADO* \n\nO pedido #${order.id.slice(-5).toUpperCase()} foi cancelado.`
        };

        if (messages[newStatus]) {
            const phone = String(order.customerPhone).replace(/\D/g, ''); 
            const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`;

            // DISPARO 100% PELA API OFICIAL E SALVAMENTO NO CHAT
            if (settings?.integrations?.whatsapp?.apiToken && settings?.integrations?.whatsapp?.autoOrderStatus) {
                try {
                    const res = await fetch('/api/whatsapp-send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'chat_reply',
                            storeId: storeId,
                            toPhone: cleanPhone,
                            dynamicParams: { text: messages[newStatus] }
                        })
                    });

                    // SE A API ENVIOU COM SUCESSO, SALVA NA TELA DE CHAT DO ADMIN
                    if (res.ok) {
                        await addDoc(collection(db, 'whatsapp_inbound'), {
                            storeId: storeId,
                            to: cleanPhone,
                            text: messages[newStatus],
                            receivedAt: serverTimestamp(),
                            status: 'read',
                            direction: 'outbound' // Isso faz o balão ficar verde (enviado por você)
                        });
                    }
                } catch (e) {
                    console.error("Erro na API WA", e);
                }
            }
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
                    createdAt: serverTimestamp(),
                    productId: mission.productId || null,
                    productName: mission.productName || null
                });

                // 🚀 MOTOR SEO: Atualiza a média de estrelas direto no Produto!
                // Tenta achar o produto pelo ID ou pelo Nome exato que veio da avaliação
                let targetProduct = null;
                if (mission.productId) {
                    targetProduct = products.find(p => p.id === mission.productId);
                } else if (mission.productName) {
                    targetProduct = products.find(p => p.name === mission.productName);
                }

                if (targetProduct) {
                    const currentCount = Number(targetProduct.reviewCount) || 0;
                    const currentRating = Number(targetProduct.ratingValue) || 0;
                    
                    const newCount = currentCount + 1;
                    // Fórmula da Média Ponderada: ((Média Atual * Quantidade Atual) + Nova Nota) / Nova Quantidade
                    const newRating = ((currentRating * currentCount) + Number(mission.rating)) / newCount;

                    const productRef = doc(db, "products", targetProduct.id);
                    await updateDoc(productRef, {
                        reviewCount: newCount,
                        ratingValue: Number(newRating.toFixed(1)) // Arredonda para 1 casa decimal (Ex: 4.8)
                    });
                }
            }

            // Atualiza a missão e credita os pontos (pointsAwarded)
            await updateDoc(doc(db, "loyalty_missions", mission.id), { 
                status: action,
                pointsAwarded: action === 'approved' ? mission.pointsExpected : 0,
                resolvedAt: serverTimestamp()
            });
            alert(`Missão ${action === 'approved' ? 'Aprovada! Pontos creditados e média do produto atualizada.' : 'Recusada.'}`);
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
        
        // 🛡️ BLINDAGEM ANTI-CLIQUE DUPLO
        const btn = e.nativeEvent.submitter;
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.innerText = 'Salvando...';
        }

        const dataToSave = { ...bannerForm, order: Number(bannerForm.order), storeId: storeId };
        try {
            if (editingBannerId) await updateDoc(doc(db, "banners", editingBannerId), dataToSave);
            else await addDoc(collection(db, "banners"), dataToSave);
            
            setIsBannerModalOpen(false); 
            alert("✅ Banner salvo com sucesso!");
        } catch (error) { 
            alert("❌ Erro ao salvar banner."); 
            console.error(error); 
            
            // Restaura o botão caso dê erro na rede
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                btn.innerText = 'Salvar Banner';
            }
        }
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
                acc[p] = { name: o.customerName || 'Sem nome', phone: p, totalSpent: 0, orderCount: 0, fiadoDebt: 0 };
            }
            acc[p].totalSpent += Number(o.total || 0);
            acc[p].orderCount += 1;
            
            // NOVO: Soma apenas o que foi comprado na Caderneta e ainda não foi pago
            if (o.paymentMethod === 'fiado' && o.paymentStatus !== 'paid') {
                acc[p].fiadoDebt += Number(o.total || 0);
            }
            
            return acc;
        }, {});

        // NOVO: Adiciona na lista os clientes que foram cadastrados manualmente (que ainda não têm pedidos)
        storeCustomersDB.forEach(dbCustomer => {
            if (dbCustomer.phone && !spendingByCustomer[dbCustomer.phone]) {
                spendingByCustomer[dbCustomer.phone] = {
                    name: dbCustomer.name || 'Sem nome',
                    phone: dbCustomer.phone,
                    totalSpent: 0,
                    orderCount: 0,
                    fiadoDebt: 0
                };
            }
        });

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

            // Busca os dados da caderneta salvos no banco
            const dbData = storeCustomersDB.find(c => c.phone === customer.phone) || {};

            return {
                ...customer,
                points: currentPoints,
                loyaltyGoal: loyaltyGoal, 
                fiadoEnabled: dbData.fiadoEnabled || false,
                billingDay: dbData.billingDay || 10,
                creditLimit: dbData.creditLimit || 0, // Puxa o limite do banco
                dbId: dbData.id || null
            };
        });

       // 4. Ordena por pontos se o clube estiver ativo, senão, por total gasto
        return customerList.sort((a, b) => loyaltyEnabled ? b.points - a.points : b.totalSpent - a.totalSpent);
        
    }, [orders, loyaltyRedemptions, settings, storeCustomersDB]);

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
                        // 🚨 BLINDAGEM DE PRECISÃO GEOGRÁFICA: Injeta o CEP exato do cliente!
                        const addressString = encodeURIComponent(`${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, CEP: ${cleanCep}, Brasil`);
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
            const isManualOrder = o.source === 'manual' || o.source === 'manual_pdv';

            if (reportSeller === 'online' && isManualOrder) return false;
            
            // Se escolheu um vendedor específico, ignora os pedidos do App (online) 
            // e filtra estritamente pelo email salvo no pedido (ou assume 'owner' se for um pedido antigo manual sem email)
            if (reportSeller !== 'todos' && reportSeller !== 'online') {
                if (!isManualOrder) return false;
                const orderEmail = o.sellerEmail || 'owner'; 
                if (orderEmail !== reportSeller) return false;
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
            } else if (reportDateRange === 'personalizado') {
                if (!reportCustomStart || !reportCustomEnd) return true;
                const start = new Date(reportCustomStart);
                const end = new Date(reportCustomEnd);
                return orderDate >= start && orderDate <= end;
            }
            return true;
        });
    };

    const filteredReportOrders = getFilteredOrdersForReport();
    
    // MODO INTELIGENTE E BLINDADO: Separa com exatidão e conta quantidades
    const reportTotals = {
        pix: { total: 0, count: 0 },
        cartao: { total: 0, count: 0 },
        dinheiro: { total: 0, count: 0 },
        outros: { total: 0, count: 0 },
        totalGeral: 0,
        qtdPedidos: filteredReportOrders.length
    };

    filteredReportOrders.forEach(o => {
        const valor = Number(o.total || 0);
        reportTotals.totalGeral += valor;
        
        const method = String(o.paymentMethod || '').toLowerCase();
        
        if (method.includes('pix') || method.includes('link')) {
            reportTotals.pix.total += valor;
            reportTotals.pix.count += 1;
        } else if (method.includes('cartao') || method.includes('card') || method.includes('stripe') || method.includes('online')) {
            reportTotals.cartao.total += valor;
            reportTotals.cartao.count += 1;
        } else if (method.includes('dinheiro') || method.includes('cash')) {
            reportTotals.dinheiro.total += valor;
            reportTotals.dinheiro.count += 1;
        } else {
            reportTotals.outros.total += valor;
            reportTotals.outros.count += 1;
        }
    });
    // --------------------------------------------------------
    
   // --- LÓGICA DO MISSION TRACKER (ONBOARDING VELO) ---
    // Mapeia o engajamento real do lojista nas ferramentas vitais do sistema.
    const completedMissionsList = React.useMemo(() => {
        const completed = [];
        
        // 1. Identidade (Nome, Logo e WhatsApp preenchidos)
        if (storeStatus?.name && storeStatus.name !== 'Nova Loja' && storeStatus?.storeLogoUrl && !storeStatus.storeLogoUrl.includes('3081840.png') && storeStatus?.whatsapp) {
            completed.push('identity');
        }
        
        // 2. Cardápio Digital (Fez o básico do setup: 1 categoria e 1 produto)
        if (categories?.length > 0 && products?.length > 0) {
            completed.push('catalog');
        }
        
        // 3. Logística Mapeada (Usou a função do Mapa do Google)
        if (storeStatus?.delivery_zones && storeStatus.delivery_zones.length > 0) {
            completed.push('logistics');
        }
        
        // 4. Dinheiro no Bolso (Ativou um método de cartão/pix)
        if (storeStatus?.velopayStatus === 'active' || storeStatus?.stripeConnectId || settings?.integrations?.mercadopago?.accessToken) {
            completed.push('payments');
        }
        
        // 5. Marketing & Fidelidade (O ouro da plataforma: Ativou Roleta, Cashback, Promos ou VIP)
        if (settings?.gamification?.roulette || settings?.gamification?.cashback || settings?.loyaltyActive || settings?.promoActive) {
            completed.push('marketing');
        }
        
        // 6. Profissionalização Máxima (Conectou WhatsApp Bot Oficial OU Solicitou Domínio)
        if ((settings?.integrations?.whatsapp?.apiToken && settings?.integrations?.whatsapp?.phoneNumberId) || storeStatus?.customDomain) {
            completed.push('launch');
        }
        
        return completed;
    }, [storeStatus, categories, products, settings]);
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

    // --- NOVA LÓGICA DE BADGES (BOLINHAS DE NOTIFICAÇÃO) ---
    const getBadgeCount = (menuId) => {
        switch (menuId) {
            case 'orders':
                // Bolinha de Novos Pedidos (Pendentes)
                return orders.filter(o => o.status === 'pending').length;
            case 'abandoned':
                // Bolinha de Carrinhos Abandonados
                return abandonedCarts.length;
            case 'customers':
                // Bolinha de Missões/Avaliações Pendentes
                return vipMissions.filter(m => m.status === 'pending').length;
           case 'products':
                // Bolinha de Estoque Crítico
                return products.filter(p => p.stock !== undefined && Number(p.stock) <= 2).length;
            case 'chat':
                // Bolinha do WhatsApp (Mensagens não lidas)
                return unreadChatsCount;
            default:
                return 0;
        }
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
    {allNavItems
        .filter(item => item.id !== 'ingredients' || settings?.enableIngredientsControl)
        .filter(item => hasPermission(item.id)) // <--- FILTRO DE PERMISSÃO APLICADO AQUI
        .map(item => {
        const badgeCount = getBadgeCount(item.id);
        const isManual = item.id === 'manual';
        return (
            <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all relative ${
                    isManual 
                    ? 'bg-blue-600 text-white shadow-xl hover:bg-blue-700 hover:-translate-y-1 my-3' 
                    : activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
                <div className="flex items-center gap-3 text-left overflow-hidden w-full">
                    <div className="flex-shrink-0">{item.icon}</div>
                    <span className="truncate whitespace-nowrap">{item.name}</span>
                </div>
                {badgeCount > 0 && (
                    <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black animate-pulse shadow-md flex-shrink-0">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </button>
        );
    })}
</nav>
                {/* Versão do App na barra lateral do desktop */}
                {/* Versão do App na barra lateral do desktop */}
                <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="text-[9px] font-medium text-slate-400 text-center">Veloapp V{systemUpdate.version}</div>
                    <button onClick={() => setIsUpdateModalOpen(true)} className="flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full transition-all">
                        <RefreshCw size={10} /> Atualizar Painel
                    </button>
                </div>
                <div className="mt-auto pt-4 flex flex-col gap-2"> {/* Empurra para o fundo */}
                    {storeId && (
                        <a 
                            href={`https://${storeId}.velodelivery.com.br`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                        >
                            <ExternalLink size={16} /> Ver Loja Online
                        </a>
                    )}
                    
                    {/* IDENTIFICADOR DO USUÁRIO LOGADO */}
                    <div className="w-full flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 mt-2 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0">
                                {auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : (auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U')}
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-[10px] font-black text-slate-800 uppercase truncate" title={auth.currentUser?.displayName || 'Usuário'}>
                                    {auth.currentUser?.displayName || 'Usuário'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 truncate" title={auth.currentUser?.email}>
                                    {auth.currentUser?.email}
                                </span>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all flex-shrink-0" title="Sair do Sistema">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
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

                    // --- NOVO: CÁLCULOS DE HISTÓRICO FINANCEIRO att(7, 30, 180 E 365 DIAS) ---
                    const nowMs = Date.now();
                    const dayMs = 24 * 60 * 60 * 1000;
                    
                    const calculateFinancials = (days) => {
                        const cutoff = nowMs - (days * dayMs);
                        return orders
                            .filter(o => o.status !== 'canceled' && o.createdAt && o.createdAt.toMillis() >= cutoff)
                            .reduce((acc, order) => {
                                acc.revenue += (Number(order.total) || 0);
                                const orderProfit = (order.items || []).reduce((itemAcc, item) => {
                                    return itemAcc + ((Number(item.price) || 0) - (Number(item.costPrice) || 0)) * (Number(item.quantity) || 0);
                                }, 0);
                                acc.profit += orderProfit;
                                return acc;
                            }, { revenue: 0, profit: 0 });
                    };

                    const fin7 = calculateFinancials(7);
                    const fin30 = calculateFinancials(30);
                    const fin180 = calculateFinancials(180);
                    const fin365 = calculateFinancials(365);

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

                            {isOverdue && (
                                <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm animate-pulse">
                                    <div>
                                        <h3 className="text-red-700 font-black flex items-center gap-2 text-lg"><Server size={20} /> FATURA EM ABERTO</h3>
                                        <p className="text-red-600 font-bold text-sm">Sua fatura está vencida. Regularize o pagamento para evitar a suspensão da loja.</p>
                                    </div>
                                    <button onClick={() => setActiveTab('finance')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap">
                                        Pagar Agora
                                    </button>
                                </div>
                            )}

                            {/* --- NOVO: AVISO DE FATURA PRÓXIMA (10 DIAS) --- */}
                            {!trialInfo.isTrial && !trialInfo.isOverdue && storeStatus?.billingStatus !== 'gratis_vitalicio' && invoiceData.daysUntilDue <= 10 && invoiceData.daysUntilDue >= 0 && (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                    <div>
                                        <h3 className="text-amber-800 font-black flex items-center gap-2 text-lg">
                                            <Clock size={20} className="text-amber-600"/> FATURA PRÓXIMA DO VENCIMENTO
                                        </h3>
                                        <p className="text-amber-700 font-bold text-sm">
                                            Sua fatura da Velo Delivery vence em <span className="font-black text-amber-900">{invoiceData.daysUntilDue} {invoiceData.daysUntilDue === 1 ? 'dia' : 'dias'}</span>. Garanta o pagamento para não pausar as suas vendas!
                                        </p>
                                    </div>
                                    <button onClick={() => setActiveTab('finance')} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap">
                                        Ver Financeiro
                                    </button>
                                </div>
                            )}
                            {/* -------------------------------------- */}
                            
                            {/* --- COMPONENTE ONBOARDING (MISSION TRACKER) --- */}
                            {/* Só exibe se o usuário ainda não tiver completado as 5 missões */}
                            {completedMissionsList.length < 5 && (
                                <MissionTracker completedMissions={completedMissionsList} />
                            )}

                            {(() => {
    const criticalProducts = products.filter(p => p.stock !== undefined && Number(p.stock) <= 2);
    if (criticalProducts.length === 0) return null;
    
    const displayedProducts = showAllCriticalStock ? criticalProducts : criticalProducts.slice(0, 5);
    
    return (
        <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem]">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-red-600 font-black flex items-center gap-2 animate-pulse"><Flame size={20} /> ALERTA: ESTOQUE CRÍTICO ({criticalProducts.length} itens)</h3>
                {criticalProducts.length > 5 && (
                    <button onClick={() => setShowAllCriticalStock(!showAllCriticalStock)} className="text-xs font-black text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-all">
                        {showAllCriticalStock ? 'Ocultar Lista' : `Ver todos os ${criticalProducts.length}`}
                    </button>
                )}
            </div>
            <div className="flex gap-2 flex-wrap">
                {displayedProducts.map(p => (
                    <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100 shadow-sm">
                        {p.name} <strong className="text-red-800 ml-1">({p.stock} un)</strong>
                    </span>
                ))}
                {!showAllCriticalStock && criticalProducts.length > 5 && (
                    <span className="bg-red-100 text-red-500 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">
                        + {criticalProducts.length - 5} ocultos...
                    </span>
                )}
            </div>
                </div>
            );
})()}

                            {/* --- NOVO: CHECKLIST DE SAÚDE GEO/SEO --- */}
                            {(() => {
                                const checks = [
                                    { id: 'slogan', title: 'Slogan/Descrição', done: !!storeStatus?.slogan && storeStatus.slogan.length > 5, action: 'Preencher Slogan', tab: 'store_settings' },
                                    { id: 'address', title: 'Endereço (NAP)', done: !!storeStatus?.address && storeStatus.address.length > 10, action: 'Configurar Endereço', tab: 'store_settings' },
                                    { id: 'schedule', title: 'Horários de Funcionamento', done: Object.values(storeStatus?.schedule || {}).some(d => d.open), action: 'Definir Horários', tab: 'store_settings' },
                                    { id: 'google', title: 'Link do Google', done: !!storeStatus?.googleReviewUrl, action: 'Vincular Maps', tab: 'store_settings' }
                                ];
                                
                                const completedCount = checks.filter(c => c.done).length;
                                const progress = (completedCount / checks.length) * 100;
                                
                                // Oculta o widget se a loja estiver 100% otimizada para manter a dashboard limpa
                                if (completedCount === checks.length) return null;

                                return (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-[2rem] mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1 w-full">
                                            <h3 className="text-blue-800 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-2">
                                                <Globe size={16}/> Saúde de Busca da Loja (GEO/SEO)
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-500 mb-3 leading-relaxed">
                                                Complete estes itens para que inteligências artificiais e motores de busca locais consigam recomendar o seu delivery.
                                            </p>
                                            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-blue-100">
                                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 md:max-w-[50%] justify-end">
                                            {checks.filter(c => !c.done).map(c => (
                                                <button 
                                                    key={c.id}
                                                    onClick={() => setActiveTab(c.tab)}
                                                    className="bg-white text-blue-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 active:scale-95"
                                                >
                                                    ⚠️ {c.action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

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

                            {/* --- NOVO: DESEMPENHO FINANCEIRO ESTENDIDO --- */}
                            <div className="pt-8 mt-8 border-t border-slate-100">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-slate-800 flex items-center gap-2">
                                    <Landmark size={24} className="text-emerald-500"/> Histórico Financeiro
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { title: 'Últimos 7 Dias', data: fin7 },
                                        { title: 'Últimos 30 Dias', data: fin30 },
                                        { title: 'Últimos 6 Meses', data: fin180 },
                                        { title: 'Último Ano', data: fin365 }
                                    ].map((period, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4">{period.title}</p>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Vendas (Faturamento)</p>
                                                    <p className="text-2xl font-black text-slate-800 italic truncate">R$ {period.data.revenue.toFixed(2)}</p>
                                                </div>
                                                <div className="pt-3 border-t border-slate-50">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Lucro Estimado</p>
                                                    <p className="text-xl font-black text-emerald-500 italic truncate">R$ {period.data.profit.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-4 text-center">
                                    * O Lucro Estimado é calculado apenas com base nos produtos que possuem o campo "Custo (R$)" preenchido no estoque.
                                </p>
                            </div>
                        </div>
                    );
                })()}

               {/* --- ABA VELO INSIGHTS (CONSULTORIA IA) --- */}
                {activeTab === 'insights' && (() => {
                    // Agrega os dados dos últimos 30 dias para exibir visualmente
                    let aggregatedSearches = {};
                    let aggregatedCategories = {};
                    let aggregatedProductViews = {};

                    analyticsHistory.forEach(day => {
                        if (day.searches) Object.entries(day.searches).forEach(([k, v]) => aggregatedSearches[k] = (aggregatedSearches[k] || 0) + v);
                        if (day.categoryClicks) Object.entries(day.categoryClicks).forEach(([k, v]) => aggregatedCategories[k] = (aggregatedCategories[k] || 0) + v);
                        if (day.productViews) Object.entries(day.productViews).forEach(([k, v]) => aggregatedProductViews[k] = (aggregatedProductViews[k] || 0) + v);
                    });

                    // Ordena para pegar os Top 5
                    const topSearches = Object.entries(aggregatedSearches).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    const topCategories = Object.entries(aggregatedCategories).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    
                    // Cruze o ID dos produtos mais vistos com os Nomes reais no catálogo
                    const topProductsRaw = Object.entries(aggregatedProductViews).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    const topProducts = topProductsRaw.map(([id, views]) => {
                        const p = products.find(prod => prod.id === id);
                        return { name: p ? p.name : 'Produto Excluído', views };
                    });

                    // --- FUNÇÃO PARA CHAMAR A IA DO BACKEND ---
                    const handleGenerateInsights = async () => {
                        if (topProducts.length === 0 && topSearches.length === 0) {
                            return alert("Ainda não há dados suficientes de clientes na sua loja para a IA analisar. Aguarde mais algumas visitas.");
                        }

                        setIsGeneratingInsights(true);
                        setInsightsResponse(null);

                        try {
                            // Calcula dados financeiros básicos para dar contexto à IA
                            const nowMs = Date.now();
                            const thirtyDaysAgo = nowMs - (30 * 24 * 60 * 60 * 1000);
                            const recentOrders = orders.filter(o => o.status !== 'canceled' && o.createdAt && o.createdAt.toMillis() >= thirtyDaysAgo);
                            const totalRevenue = recentOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

                            const response = await fetch('/api/velo-insights', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    storeName: storeStatus.name,
                                    storeNiche: storeStatus.storeNiche,
                                    topSearches: topSearches.map(t => `${t[0]} (${t[1]} buscas)`),
                                    topCategories: topCategories.map(c => `${c[0]} (${c[1]} cliques)`),
                                    topProducts: topProducts.map(p => `${p.name} (${p.views} visualizações)`),
                                    totalOrders30d: recentOrders.length,
                                    totalRevenue30d: totalRevenue
                                })
                            });

                            const data = await response.json();

                            if (response.ok && data.success) {
                                setInsightsResponse(data.insight);
                            } else {
                                alert(`Erro na IA: ${data.error || 'Falha ao conectar com o servidor.'}`);
                            }
                        } catch (error) {
                            console.error("Erro ao gerar Insights:", error);
                            alert("Falha de conexão. Verifique sua internet e tente novamente.");
                        } finally {
                            setIsGeneratingInsights(false);
                        }
                    };

                    return (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h1 className="text-4xl font-black italic uppercase text-slate-900 leading-none flex items-center gap-3">
                                        <Sparkles className="text-purple-600" size={36}/> Velo Insights
                                    </h1>
                                    <p className="text-slate-500 font-bold mt-2 text-sm">Inteligência Artificial que analisa os cliques da sua loja nos últimos 30 dias e gera estratégias.</p>
                                </div>
                                <button 
                                    onClick={handleGenerateInsights}
                                    disabled={isGeneratingInsights}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingInsights ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                    {isGeneratingInsights ? 'Analisando Dados...' : 'Gerar Consultoria IA'}
                                </button>
                            </div>

                            {/* GRÁFICOS VISUAIS CRUS (Dados Reais Coletados) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* O Que Mais Procuram */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Search size={14}/> Termos Mais Buscados
                                    </h3>
                                    {topSearches.length === 0 ? <p className="text-xs font-bold text-slate-300">Nenhum dado coletado.</p> : (
                                        <ul className="space-y-3">
                                            {topSearches.map(([term, count], i) => (
                                                <li key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="font-black text-slate-700 uppercase truncate pr-2">"{term}"</span>
                                                    <span className="text-[10px] font-black bg-white text-slate-400 px-2 py-1 rounded shadow-sm shrink-0">{count} buscas</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Produtos Mais Vistos */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Eye size={14}/> Produtos Mais Visualizados
                                    </h3>
                                    {topProducts.length === 0 ? <p className="text-xs font-bold text-slate-300">Nenhum dado coletado.</p> : (
                                        <ul className="space-y-3">
                                            {topProducts.map((p, i) => (
                                                <li key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="font-bold text-slate-700 text-xs truncate max-w-[150px]">{p.name}</span>
                                                    <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded shadow-sm shrink-0">{p.views} cliques</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Categorias Mais Clicadas */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <List size={14}/> Categorias Mais Clicadas
                                    </h3>
                                    {topCategories.length === 0 ? <p className="text-xs font-bold text-slate-300">Nenhum dado coletado.</p> : (
                                        <ul className="space-y-3">
                                            {topCategories.map(([cat, count], i) => (
                                                <li key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="font-black text-slate-700 uppercase truncate pr-2">{cat}</span>
                                                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded shadow-sm shrink-0">{count} views</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* CONTAINER ONDE A IA VAI RESPONDER */}
                            {insightsResponse ? (
                                <div className="bg-white border-2 border-purple-200 p-8 md:p-10 rounded-[3rem] shadow-xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                        <Sparkles size={150} className="text-purple-600"/>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                        <div className="bg-purple-100 text-purple-600 p-2 rounded-xl"><Award size={24}/></div>
                                        Plano de Ação Sugerido
                                    </h3>
                                    
                                    {/* Renderizador de texto formatado (Markdown básico) da OpenAI */}
                                    <div className="space-y-4 text-slate-600 font-medium leading-relaxed whitespace-pre-wrap relative z-10">
                                        {insightsResponse.split('\n').map((line, idx) => {
                                            if (line.startsWith('###')) return <h4 key={idx} className="text-lg font-black text-slate-800 mt-6 mb-2">{line.replace('###', '').trim()}</h4>;
                                            if (line.startsWith('- **') || line.startsWith('* **')) {
                                                const parts = line.split('**');
                                                return <p key={idx} className="flex items-start gap-2"><span className="text-purple-500 mt-1">•</span> <span><strong className="text-slate-800">{parts[1]}</strong>{parts[2]}</span></p>;
                                            }
                                            if (line.trim() === '') return <br key={idx} />;
                                            return <p key={idx}>{line}</p>;
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-purple-50 border-2 border-dashed border-purple-200 p-10 rounded-[3rem] text-center flex flex-col items-center justify-center">
                                    <Sparkles size={48} className="text-purple-300 mb-4 animate-pulse"/>
                                    <h3 className="text-xl font-black text-purple-800 uppercase italic">Aguardando Análise</h3>
                                    <p className="text-sm font-bold text-purple-600 mt-2 max-w-md">
                                        Clique no botão <strong>"Gerar Consultoria IA"</strong> no topo da página para que nosso robô processe as métricas acima e crie um plano de ação para a sua loja aumentar as vendas.
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* --- ABA: MONITOR DE FROTA AO VIVO --- */}
                {activeTab === 'fleet' && (
                    <div className="space-y-6 h-[calc(100vh-150px)] flex flex-col animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Monitor de Frota</h1>
                                <p className="text-slate-400 font-bold mt-2 text-sm italic">Acompanhe todos os seus entregadores em tempo real no mapa.</p>
                            </div>
                            <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
                                {fleetLocations.length} Motos em Rota
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden relative min-h-[400px]">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={{ lat: Number(storeStatus.lat) || -23.55, lng: Number(storeStatus.lng) || -46.63 }}
                                    zoom={14}
                                    options={{ 
                                        disableDefaultUI: false, 
                                        zoomControl: true,
                                        styles: [
                                            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                                        ]
                                    }}
                                >
                                    {/* Localização da Loja */}
                                    <Marker 
                                        position={{ lat: Number(storeStatus.lat), lng: Number(storeStatus.lng) }} 
                                        icon={{ 
                                            url: storeStatus.storeLogoUrl || "https://cdn-icons-png.flaticon.com/512/3081/3081840.png", 
                                            scaledSize: new window.google.maps.Size(45, 45)
                                        }}
                                        title="Minha Loja"
                                    />

                                    {/* Todos os Motoboys Ativos */}
                                        {fleetLocations.map((driver) => (
                                            <Marker 
                                                key={driver.orderId}
                                                position={{ lat: Number(driver.lat), lng: Number(driver.lng) }}
                                                options={{ optimized: false }}
                                                icon={{
                                                    // 🛡️ BLINDAGEM: Ícone SVG nativo gerado via código (Sem bloqueios CORS)
                                                    url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><text x="0" y="38" font-size="38">🛵</text></svg>`,
                                                    scaledSize: new window.google.maps.Size(46, 46),
                                                    anchor: new window.google.maps.Point(23, 23)
                                                }}
                                                label={{
                                                    text: `ENTREGA #${driver.orderId.slice(-5).toUpperCase()}`,
                                                    color: "#000000", // Fonte preta
                                                    fontWeight: "900", // Negrito máximo
                                                    fontSize: "12px",
                                                    // Estética: Fundo branco, borda azul 2px, cantos arredondados, empurrado para cima do ícone
                                                    className: "bg-white px-3 py-1.5 rounded-xl shadow-lg border-2 border-blue-500 mt-[-75px]"
                                                }}
                                            />
                                        ))}
                                </GoogleMap>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <Loader2 className="animate-spin" size={40} />
                                    <span className="font-black uppercase text-xs tracking-widest">Sincronizando Satélites...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'chat' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Chat e Suporte</h1>
                                <p className="text-slate-400 font-bold mt-2 text-sm">Atenda seus clientes via WhatsApp direto do painel.</p>
                            </div>
                        </div>
                        
                        {/* VALIDAÇÃO: Só exibe o Chat se o ID e o Token da Meta estiverem salvos */}
                        {settings?.integrations?.whatsapp?.phoneNumberId && settings?.integrations?.whatsapp?.apiToken ? (
                            <AdminChat />
                        ) : (
                            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center shadow-sm max-w-2xl mx-auto mt-12 animate-in zoom-in">
                                <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MessageCircle size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Chat Desconectado</h3>
                                <p className="text-slate-500 font-bold mb-8 text-sm">
                                    Para usar o Velo Web Chat e responder seus clientes por aqui, você precisa configurar as credenciais da API Oficial do WhatsApp (Meta).
                                </p>
                                <button 
                                    onClick={() => setActiveTab('integrations')} 
                                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    ⚙️ Ir para Integrações
                                </button>
                            </div>
                        )}
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
                                    
                                    // Identifica se a loja é de bebidas (default/drinks) ou comida
                                    const isBebida = ['default', 'drinks'].includes(storeStatus?.storeNiche);
                                    
                                    // TEXTOS EMPODERADORES E DIRETOS COM CUPOM
                                    const cupomNicho = isBebida ? 'SEDE5' : 'FOME5';
                                    const cupomForte = isBebida ? 'SEDE10' : 'FOME10';

                                    const msgPrimeira = `Fala ${firstName}, tudo bem? Aqui é da *${storeStatus.name}*! 👀\n\nVi que você deixou alguns itens deliciosos no carrinho e não finalizou. Para não te deixar passar vontade, o gerente liberou um cupom exclusivo de *5% OFF* para você fechar agora!\n\n🎟️ Use o cupom: *${cupomNicho}*\n👉 Clique e finalize: https://${storeId}.velodelivery.com.br`;
                                    
                                    const msgSegunda = `🚨 AINDA DÁ TEMPO, ${firstName}!\n\nSeu carrinho na *${storeStatus.name}* está quase expirando. Como sei que você quer muito esse pedido, acabei de dobrar seu desconto para *10% OFF*!\n\n🎟️ Use o cupom: *${cupomForte}*\n👉 Garanta antes que acabe: https://${storeId}.velodelivery.com.br`;

                                    const sendMsg = async (text) => {
                                        let phoneRaw = String(cart.customerPhone).replace(/\D/g, '');
                                        if (phoneRaw.length < 10) return alert("Número de cliente inválido.");
                                        
                                        // FORMATANDO NÚMERO (Apenas garantindo o código 55 do Brasil)
                                        if (phoneRaw.startsWith('55')) phoneRaw = phoneRaw.substring(2);
                                        const safePhone = `55${phoneRaw}`;
                                        
                                        if (settings?.integrations?.whatsapp?.apiToken) {
                                            try {
                                                const res = await fetch('/api/whatsapp-send', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        action: 'chat_reply',
                                                        storeId: storeId,
                                                        toPhone: safePhone,
                                                        dynamicParams: { text: text }
                                                    })
                                                });
                                                if (res.ok) {
                                                    // 🚨 CORREÇÃO CRÍTICA: Salva a mensagem no Firebase para a tela de Chat (AdminChat.jsx) ler na hora!
                                                    await addDoc(collection(db, 'whatsapp_inbound'), {
                                                        storeId: storeId,
                                                        to: safePhone,
                                                        text: text,
                                                        receivedAt: serverTimestamp(),
                                                        status: 'read',
                                                        direction: 'outbound'
                                                    });
                                                    
                                                    // Handoff: Pausa o bot automaticamente para o lojista assumir caso o cliente responda
                                                    let normalizedPhone = safePhone.substring(2); // Tira o 55 para o controle de sessão
                                                    
                                                    await setDoc(doc(db, 'whatsapp_sessions', `${storeId}_${normalizedPhone}`), {
                                                        storeId: storeId,
                                                        phone: normalizedPhone,
                                                        botPaused: true,
                                                        updatedAt: serverTimestamp()
                                                    }, { merge: true });

                                                    alert("✅ Mensagem e Cupom disparados com sucesso no WhatsApp do cliente!");
                                                } else {
                                                    throw new Error("Falha na API");
                                                }
                                            } catch (e) {
                                                alert("❌ O bot está offline ou o token expirou. Abrindo o WhatsApp Web...");
                                                window.open(`https://wa.me/${safePhone}?text=${encodeURIComponent(text)}`, '_blank');
                                            }
                                        } else {
                                            window.open(`https://wa.me/${safePhone}?text=${encodeURIComponent(text)}`, '_blank');
                                        }
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
                                                
                                                {/* NOVO GRID COM APENAS 2 BOTÕES */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => sendMsg(msgPrimeira)} className="flex flex-col items-center justify-center p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all border border-orange-100 group">
                                                        <Flame size={18} className="mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[9px] font-black uppercase text-center leading-tight">Enviar Cupom<br/>(5% OFF)</span>
                                                    </button>
                                                    <button onClick={() => sendMsg(msgSegunda)} className="flex flex-col items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all border border-red-100 group">
                                                        <Tags size={18} className="mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[9px] font-black uppercase text-center leading-tight">Última Chance<br/>(10% OFF)</span>
                                                    </button>
                                                </div>
                                                
                                                <button onClick={async () => {
                                                    if(window.confirm("Deseja realmente apagar este carrinho abandonado?")) {
                                                        await deleteDoc(doc(db, "abandoned_carts", cart.id));
                                                    }
                                                }} className="w-full mt-3 p-2 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl uppercase tracking-widest flex items-center justify-center gap-1 transition-all">
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-4xl font-black italic uppercase text-slate-900">Pedidos</h1>
                                <p className="text-slate-400 font-bold mt-1 text-sm">Gerencie o fluxo da sua operação.</p>
                            </div>
                            
                            <div className="flex-1 max-w-md relative">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Buscar por ID, Nome ou Telefone..." 
                                    className="w-full p-3 pl-10 bg-white rounded-xl font-bold text-sm border border-slate-200 outline-none focus:ring-2 ring-blue-500 shadow-sm"
                                    value={orderSearchTerm}
                                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                {orderSearchTerm && (
                                    <button onClick={() => setOrderSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                        <X size={18}/>
                                    </button>
                                )}
                            </div>
                            <div className="flex bg-slate-200 p-1 rounded-xl w-fit">
                                <button onClick={() => setOrderViewMode('list')} className={`px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${orderViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <List size={16} /> Lista Padrão
                                </button>
                                <button onClick={() => setOrderViewMode('grid')} className={`px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${orderViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <LayoutDashboard size={16} /> Kanban (PDV)
                                </button>
                            </div>
                        </div>

                        {/* --- NOVA BARRA DE FILTROS --- */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex w-full md:w-auto gap-4 flex-1">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                                    <select 
                                        className="w-full p-3 bg-white rounded-xl font-bold text-sm text-slate-700 border border-slate-200 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                        value={orderFilterStatus}
                                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="pending">⏳ Novos / Pendentes</option>
                                        <option value="preparing">👨‍🍳 Em Preparo</option>
                                        <option value="delivery">🏍️ Em Rota / Retirada</option>
                                        <option value="completed">✅ Concluídos</option>
                                        <option value="canceled">❌ Cancelados</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Canal de Venda</label>
                                    <select 
                                        className="w-full p-3 bg-white rounded-xl font-bold text-sm text-slate-700 border border-slate-200 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                        value={orderFilterSource}
                                        onChange={(e) => setOrderFilterSource(e.target.value)}
                                    >
                                        <option value="all">Todos os Canais</option>
                                        <option value="app">📱 Loja Online (App)</option>
                                        <option value="pdv">💻 PDV (Balcão/Mesa)</option>
                                        <option value="whatsapp">💬 WhatsApp / Bot</option>
                                        <option value="google">🌐 Google Maps</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm md:mt-5">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:inline">Itens:</span>
                                {[25, 50, 100].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => setOrdersPerPage(limit)}
                                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${ordersPerPage === limit ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* --- FIM DA BARRA DE FILTROS --- */}

                        {orderViewMode === 'list' ? (
                            <div className="space-y-4">
                                {(() => {
                                    // 🚨 NOVA LÓGICA DE FILTRAGEM TRIPLA (Busca + Status + Canal)
                                    const filteredOrdersList = orders.filter(o => {
                                        // 1. Filtro de Busca (Texto)
                                        const matchesSearch = !orderSearchTerm || 
                                            (o?.id || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) || 
                                            (o?.customerName || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) || 
                                            (o?.customerPhone || '').includes(orderSearchTerm);
                                        
                                        // 2. Filtro de Status
                                        const matchesStatus = orderFilterStatus === 'all' || o.status === orderFilterStatus;
                                        
                                        // 3. Filtro de Canal (Origem)
                                        let matchesSource = true;
                                        if (orderFilterSource !== 'all') {
                                            const isPDV = o.source === 'manual' || o.source === 'manual_pdv';
                                            const isGoogle = o.source === 'google_food_marketplace';
                                            const isWpp = o.source === 'whatsapp';
                                            const isApp = !isPDV && !isGoogle && !isWpp; // Tudo que não é os outros, é do App nativo
                                            
                                            if (orderFilterSource === 'pdv') matchesSource = isPDV;
                                            else if (orderFilterSource === 'google') matchesSource = isGoogle;
                                            else if (orderFilterSource === 'whatsapp') matchesSource = isWpp;
                                            else if (orderFilterSource === 'app') matchesSource = isApp;
                                        }

                                        return matchesSearch && matchesStatus && matchesSource;
                                    });

                                    const totalPagesList = Math.max(1, Math.ceil(filteredOrdersList.length / ordersPerPage));
                                    const paginatedOrdersList = filteredOrdersList.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

                                    if (filteredOrdersList.length === 0) {
                                        return (
                                            <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                                                <List size={48} className="text-slate-300 mb-4" />
                                                <p className="text-slate-500 font-bold">Nenhum pedido encontrado com esses filtros.</p>
                                                <button onClick={() => {setOrderFilterStatus('all'); setOrderFilterSource('all'); setOrderSearchTerm('');}} className="mt-4 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Limpar Filtros</button>
                                            </div>
                                        )
                                    }

                                    return (
                                        <>
                                            {paginatedOrdersList.map(o => (
                                                <div key={o.id} className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col gap-4 hover:shadow-md transition-all">
                                                    
                                                    {/* BLOCO 1: CABEÇALHO (Tags, Nome e Endereço) */}
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">#{o.id ? o.id.slice(-6).toUpperCase() : 'ID'}</span>
                                                            
                                                            {(() => {
                                                                const isPaid = o.paymentStatus === 'paid' || o.paymentStatus === 'approved' || o.paymentStatus === 'concluida' || o.paymentStatus === 'CONCLUIDA';
                                                                const isFailed = o.paymentStatus === 'failed' || o.paymentStatus === 'rejected';
                                                                const isOnlineMethod = ['stripe', 'cartao', 'pix', 'velopay_pix', 'velopay_credit', 'online', 'link_mp'].includes(o.paymentMethod);
                                                                const isPDV = o.source === 'manual' || o.source === 'manual_pdv';

                                                                const handleForcePay = async (e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (window.confirm("Confirmar o recebimento manual deste pedido?")) {
                                                                        try {
                                                                            await updateDoc(doc(db, "orders", o.id), { paymentStatus: 'paid' });
                                                                        } catch (err) {
                                                                            alert("Erro ao confirmar pagamento.");
                                                                        }
                                                                    }
                                                                };

                                                                if (isPaid) {
                                                                    return (
                                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm border border-green-200 cursor-default select-none">
                                                                            {isPDV ? '✅ PAGO' : '✅ PAGO ONLINE'}
                                                                        </span>
                                                                    );
                                                                }

                                                                if (isFailed) {
                                                                    return (
                                                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm border border-red-200 cursor-default select-none">
                                                                            ❌ RECUSADO
                                                                        </span>
                                                                    );
                                                                }

                                                                if (isOnlineMethod) {
                                                                    return (
                                                                        <button
                                                                            onClick={handleForcePay}
                                                                            title="Clique para dar baixa manual no pagamento"
                                                                            className="bg-orange-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse shadow-md hover:bg-orange-600 transition-all active:scale-95 cursor-pointer"
                                                                        >
                                                                            ⏳ AGUARDANDO PAGTO
                                                                        </button>
                                                                    );
                                                                }

                                                                return (
                                                                    <button
                                                                        onClick={handleForcePay}
                                                                        title="Clique para dar baixa manual no pagamento"
                                                                        className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-300 hover:bg-slate-300 transition-all cursor-pointer"
                                                                    >
                                                                        🏠 PAGAR NA ENTREGA/BALCÃO
                                                                    </button>
                                                                );
                                                            })()}

                                                            {o.status === 'pending' ? <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse shadow-md">Novo Pedido</span> :
                                                             o.status === 'preparing' ? <span className="bg-orange-400 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">Preparando</span> :
                                                             o.status === 'delivery' ? <span className="bg-blue-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">Saiu p/ Entrega</span> :
                                                             o.status === 'completed' ? <span className="bg-green-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">Concluído</span> :
                                                             <span className="bg-slate-800 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">Cancelado</span>}

                                                            {o.tipo === 'local' && (
                                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-purple-200">🍽️ MESA {o.mesa}</span>
                                                            )}
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} />{o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-black text-xl text-slate-800 leading-tight flex items-center gap-2 flex-wrap">
                                                                {o.customerName} 
                                                                {o.waiterName && <span className="text-xs text-purple-500 font-bold">(Garçom: {o.waiterName})</span>}
                                                                {o.source === 'manual' || o.source === 'manual_pdv' ? (
                                                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-purple-200 shadow-sm flex items-center gap-1">💻 PDV / BALCÃO</span>
                                                                ) : o.source === 'google_food_marketplace' ? (
                                                                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-orange-200 shadow-sm flex items-center gap-1">🌐 GOOGLE MAPS</span>
                                                                ) : (
                                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-blue-200 shadow-sm flex items-center gap-1">📱 APP (ONLINE)</span>
                                                                )}
                                                            </h3>
                                                            <p className="text-sm text-slate-500 font-medium mt-1">
                                                                {o.tipo === 'local' 
                                                                    ? `Atendimento no Salão - Mesa ${o.mesa}`
                                                                    : (typeof o.customerAddress === 'object' ? `${o.customerAddress.street}, ${o.customerAddress.number} - ${o.customerAddress.neighborhood}` : (o.customerAddress || o.address))
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* BLOCO 2: ITENS DO PEDIDO (Caixa separada para respiro) */}
                                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                                                        {o.items && Array.isArray(o.items) ? o.items.map((i, idx) => (
                                                            <div key={idx} className="flex flex-col border-b border-slate-200/50 last:border-0 pb-2 last:pb-0">
                                                                <div className="flex justify-between items-start text-sm">
                                                                    <span className="font-bold text-slate-700 pr-4">
                                                                        <span className="text-blue-500 mr-1">{i.quantity}x</span> {i.name}
                                                                    </span>
                                                                    <span className="text-slate-500 font-black whitespace-nowrap">
                                                                        R$ {(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                {i.observation && (
                                                                    <div className="text-[11px] text-orange-700 font-bold bg-orange-100 p-2 rounded-lg mt-1 border border-orange-200 italic leading-tight w-fit">
                                                                        Obs: {i.observation}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )) : (
                                                            <span className="text-xs text-slate-400 italic">Nenhum item encontrado</span>
                                                        )}
                                                    </div>

                                                    {/* BLOCO 3: RODAPÉ (Total e Ações) */}
                                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2 pt-4 border-t border-slate-100"> 
                                                        
                                                        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total:</span>
                                                            <p className="text-3xl font-black text-green-600 italic leading-none whitespace-nowrap">R$ {Number(o.total).toFixed(2)}</p>
                                                        </div>

                                                        <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 md:gap-3 w-full md:w-auto">
                                                            {/* RASTREIO */}
                                                            {o.status === 'delivery' && (
                                                                <div className="flex gap-1">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const driverUrl = `${window.location.origin}/driver/${storeId}/${o.id}`;
                                                                            const msg = `🛵 *NOVA CORRIDA DISPONÍVEL!*\n\n📦 *Pedido:* #${o.id.slice(-5).toUpperCase()}\n👤 *Cliente:* ${o.customerName}\n\n📍 *Clique no link abaixo para aceitar a corrida e iniciar a entrega:* \n${driverUrl}`;
                                                                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                                                        }} 
                                                                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                                                                        title="Enviar link para o Motoboy"
                                                                    >
                                                                        <Share2 size={20} />
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => {
                                                                            setTrackingOrder(o);
                                                                            setIsTrackingModalOpen(true);
                                                                        }} 
                                                                        className="p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-blue-600 font-bold flex items-center gap-1 shadow-sm transition-all"
                                                                        title="Ver no Mapa"
                                                                    >
                                                                        <MapPin size={20} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            
                                                            {/* BOTÕES DE AÇÃO PADRÃO */}
                                                            <button 
                                                                onClick={() => {
                                                                    const initialDataForModal = {
                                                                        ...o, 
                                                                        paymentMethod: o.paymentMethod || 'pix', 
                                                                        items: Array.isArray(o.items) ? o.items.map(item => ({ ...item })) : [], 
                                                                        shippingFee: o.shippingFee || 0,
                                                                        customerName: o.customerName || '',
                                                                        customerAddress: o.customerAddress || '',
                                                                        customerPhone: o.customerPhone || ''
                                                                    };
                                                                    setEditingOrderData(initialDataForModal);
                                                                    setIsOrderEditModalOpen(true);
                                                                }} 
                                                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 text-slate-500 transition-colors"
                                                                title="Editar Pedido"
                                                            >
                                                                <Edit3 size={20} />
                                                            </button>
                                                            
                                                            <button onClick={() => printLabel(o)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-colors" title="Imprimir">
                                                                <Printer size={20} />
                                                            </button>
                                                            
                                                            <a href={`https://wa.me/55${String(o.customerPhone).replace(/\D/g, '')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl shadow-md hover:bg-green-600 transition-colors" title="Chamar no WhatsApp">
                                                                <MessageCircle size={20} />
                                                            </a>
                                                            
                                                            {o.paymentStatus === 'paid' && settings?.integrations?.mercadopago?.accessToken && (
                                                                <button 
                                                                    onClick={() => handleRefundMercadoPago(o)} 
                                                                    className="p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 text-red-600 transition-colors" 
                                                                    title="Estornar Pagamento (Mercado Pago)"
                                                                >
                                                                    <RefreshCw size={20} />
                                                                </button>
                                                            )}
                                                            
                                                            {(o.paymentStatus === 'pending' || o.paymentStatus === 'pending_on_delivery') && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        const chavePixParaCobrar = o.pixCopiaECola || storeStatus?.velopayData?.pixKey || storeStatus?.pixKey || 'Chave não cadastrada';
                                                                        const tipoChaveText = o.pixCopiaECola ? 'nosso PIX Copia e Cola abaixo' : 'nosso PIX Oficial';
                                                                        const msg = `Olá ${o.customerName.split(' ')[0]}! Aqui é da *${storeStatus?.name || 'loja'}*.\n\nSeu pedido deu *R$ ${Number(o.total).toFixed(2)}*.\n\nPara agilizar a produção, pague pelo ${tipoChaveText}:\n\n${chavePixParaCobrar}\n\nAssim que pagar, nos avise aqui para liberarmos sua comanda! 🚀`;
                                                                        const phoneRaw = String(o.customerPhone || '').replace(/\D/g, '');
                                                                        const cleanPhone = phoneRaw.startsWith('55') ? phoneRaw : `55${phoneRaw}`;
                                                                        const waConfig = settings?.integrations?.whatsapp;

                                                                        if (waConfig && waConfig.phoneNumberId && waConfig.apiToken && cleanPhone.length >= 12) {
                                                                            try {
                                                                                const res = await fetch('/api/whatsapp-send', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({
                                                                                        action: 'chat_reply',
                                                                                        storeId: storeId,
                                                                                        toPhone: cleanPhone,
                                                                                        dynamicParams: { text: msg }
                                                                                    })
                                                                                });
                                                                                if (res.ok) alert("✅ Cobrança enviada direto pro WhatsApp do cliente!");
                                                                                else throw new Error("Falha na API da Meta");
                                                                            } catch(e) {
                                                                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                                            }
                                                                        } else {
                                                                            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                                        }
                                                                        
                                                                        await updateDoc(doc(db, "orders", o.id), { paymentStatus: 'aguardando_pix' });
                                                                    }}
                                                                    className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all shadow-sm flex items-center justify-center"
                                                                    title="Cobrar PIX no WhatsApp"
                                                                >
                                                                    <QrCode size={20}/>
                                                                </button>
                                                            )}

                                                            {/* SELETOR DE STATUS */}
                                                            <div className="w-full md:w-48 mt-2 md:mt-0">
                                                                <select value={o.status} onChange={(e) => updateStatusAndNotify(o, e.target.value)} className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase border border-slate-200 outline-none cursor-pointer bg-white text-slate-700 hover:bg-slate-50 focus:ring-2 ring-blue-500 transition-all shadow-sm">
                                                                    <option value="pending">⏳ Novo Pedido</option>
                                                                    <option value="preparing">👨‍🍳 Preparando</option>
                                                                    <option value="delivery">🏍️ Em Rota</option>
                                                                    <option value="completed">✅ Concluído</option>
                                                                    <option value="canceled">❌ Cancelado</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {totalPagesList > 1 && (
                                                <div className="flex justify-center items-center gap-4 mt-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                                    <button 
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        Anterior
                                                    </button>
                                                    <span className="text-sm font-black text-slate-700">
                                                        Página {currentPage} de {totalPagesList}
                                                    </span>
                                                    <button 
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesList))}
                                                        disabled={currentPage === totalPagesList}
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        Próxima
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-6 items-start custom-scrollbar min-h-[calc(100vh-250px)]">
                                {[
                                    { id: 'pending', title: '⏳ Novos (Pendentes)', color: 'bg-red-100 text-red-800 border-red-200', next: 'preparing', nextLabel: 'Aceitar (Cozinha)' },
                                    { id: 'preparing', title: '👨‍🍳 Em Preparo', color: 'bg-orange-100 text-orange-800 border-orange-200', next: 'delivery', nextLabel: 'Despachar (Rota)' },
                                    { id: 'delivery', title: '🏍️ Em Rota / Retirada', color: 'bg-blue-100 text-blue-800 border-blue-200', next: 'completed', nextLabel: 'Finalizar' }
                                ].map(col => (
                                    <div key={col.id} className="w-[340px] flex-shrink-0 bg-slate-100/50 p-4 rounded-[2rem] border border-slate-200 h-full flex flex-col shadow-inner">
                                        <h3 className={`font-black text-xs uppercase tracking-widest p-4 rounded-xl border mb-4 flex justify-between items-center shadow-sm ${col.color}`}>
                                            {col.title}
                                            <span className="bg-white/60 px-2.5 py-1 rounded-md shadow-sm">{orders.filter(o => o.status === col.id).length}</span>
                                        </h3>
                                        
                                        <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2 pb-20">
                                            {orders.filter(o => 
                                                o.status === col.id && (
                                                    !orderSearchTerm || 
                                                    (o?.id || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) || 
                                                    (o?.customerName || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) || 
                                                    (o?.customerPhone || '').includes(orderSearchTerm)
                                                )
                                            ).slice(0, ordersPerPage).map(o => {
                                                const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt?.seconds * 1000 || Date.now());
                                                const diffMin = Math.floor((currentTime - date) / 60000);
                                                
                                                let timerClass = 'text-green-700 bg-green-100 border-green-200';
                                                if (diffMin >= 10 && diffMin < 20) timerClass = 'text-orange-700 bg-orange-100 border-orange-200';
                                                if (diffMin >= 20) timerClass = 'text-white bg-red-500 border-red-600 shadow-md animate-pulse';

                                                return (
                                                    <div key={o.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-all flex flex-col">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="bg-slate-100 text-slate-500 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                                #{o.id.slice(-5).toUpperCase()}
                                                            </span>
                                                            <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${timerClass}`}>
                                                                <Clock size={12} className="inline mr-1 mb-0.5"/>
                                                                {diffMin} min
                                                            </span>
                                                        </div>
                                                        
                                                        <h4 className="font-black text-slate-800 text-sm leading-tight mb-1 truncate flex items-center gap-2">
                                                            {o.customerName}
                                                        </h4>
                                                        <div className="mb-2 flex flex-col gap-1 items-start">
                                                            {o.source === 'manual' || o.source === 'manual_pdv' ? (
                                                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-purple-200 shadow-sm inline-flex items-center gap-1">💻 PDV</span>
                                                            ) : o.source === 'google_food_marketplace' ? (
                                                                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-orange-200 shadow-sm inline-flex items-center gap-1">🌐 GOOGLE MAPS</span>
                                                            ) : (
                                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-blue-200 shadow-sm inline-flex items-center gap-1">📱 APP (ONLINE)</span>
                                                            )}
                                                            
                                                            {(() => {
                                                                const isPaid = o.paymentStatus === 'paid' || o.paymentStatus === 'approved' || o.paymentStatus === 'concluida' || o.paymentStatus === 'CONCLUIDA';
                                                                const isFailed = o.paymentStatus === 'failed' || o.paymentStatus === 'rejected';
                                                                const isOnlineMethod = ['stripe', 'cartao', 'pix', 'velopay_pix', 'velopay_credit', 'online', 'link_mp'].includes(o.paymentMethod);
                                                                const isPDV = o.source === 'manual' || o.source === 'manual_pdv';

                                                                const handleForcePay = async (e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (window.confirm("Confirmar o recebimento manual deste pedido?")) {
                                                                        try {
                                                                            await updateDoc(doc(db, "orders", o.id), { paymentStatus: 'paid' });
                                                                        } catch (err) {
                                                                            alert("Erro ao confirmar pagamento.");
                                                                        }
                                                                    }
                                                                };

                                                                if (isPaid) {
                                                                    return (
                                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm cursor-default select-none">
                                                                            {isPDV ? '✅ PAGO' : '✅ PAGO ONLINE'}
                                                                        </span>
                                                                    );
                                                                }

                                                                if (isFailed) {
                                                                    return (
                                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm cursor-default select-none">
                                                                            ❌ RECUSADO
                                                                        </span>
                                                                    );
                                                                }

                                                                if (isOnlineMethod) {
                                                                    return (
                                                                        <button
                                                                            onClick={handleForcePay}
                                                                            title="Clique para dar baixa manual no pagamento"
                                                                            className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-md animate-pulse hover:bg-orange-600 transition-all active:scale-95 cursor-pointer"
                                                                        >
                                                                            ⏳ AGUARDANDO PAGTO
                                                                        </button>
                                                                    );
                                                                }

                                                                return null;
                                                            })()}
                                                        </div>
                                                        
                                                        <div className="text-[10px] font-bold text-slate-500 mb-4 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg">
                                                            {o.tipo === 'local' ? (
                                                                <span className="text-purple-600 flex items-center gap-1"><Utensils size={12}/> Mesa {o.mesa}</span>
                                                            ) : (
                                                                <span className="flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0"/> {o.customerAddress?.street || o.customerAddress || 'Retirada no Balcão'}</span>
                                                            )}
                                                        </div>

                                                        <div className="mb-4 space-y-1">
                                                            {o.items?.slice(0, 3).map((i, idx) => (
                                                                <p key={idx} className="text-xs font-bold text-slate-700 truncate">
                                                                    <span className="text-blue-500 mr-1">{i.quantity}x</span> {i.name}
                                                                </p>
                                                            ))}
                                                            {o.items?.length > 3 && <p className="text-[10px] text-slate-400 font-bold italic mt-1">+{o.items.length - 3} itens (clique para editar)</p>}
                                                        </div>
                                                        
                                                        {o.observation && (
                                                            <p className="text-[10px] text-orange-700 bg-orange-50 p-2.5 rounded-xl font-bold mb-4 line-clamp-2 border border-orange-100">
                                                                Obs: {o.observation}
                                                            </p>
                                                        )}

                                                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                                                            <div className="flex gap-1">
                                                                {/* BOTÃO RASTREIO KANBAN */}
                                                                {o.status === 'delivery' && (
                                                <div className="flex gap-1">
                                                    {/* NOVO: BOTÃO PARA ENVIAR LINK AO MOTOBOY */}
                                                    <button 
                                                        onClick={() => {
                                                            const driverUrl = `${window.location.origin}/driver/${storeId}/${o.id}`;
                                                            const msg = `🛵 *VELO DELIVERY - NOVA CORRIDA*\n\nID: #${o.id.slice(-5).toUpperCase()}\nCliente: ${o.customerName}\n\n📍 *Link para Iniciar Rastreio:* \n${driverUrl}`;
                                                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                                        }} 
                                                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                                                        title="Enviar link para o Motoboy"
                                                    >
                                                        <Share2 size={20} />
                                                    </button>

                                                    {/* BOTÃO DE RASTREIO QUE JÁ att EXISTIA */}
                                                    <button 
                                                        onClick={() => {
                                                            setTrackingOrder(o);
                                                            setIsTrackingModalOpen(true);
                                                        }} 
                                                        className="p-3 bg-blue-50 rounded-xl hover:bg-blue-100 text-blue-600 font-bold flex items-center gap-1 shadow-sm transition-all"
                                                        title="Ver no Mapa"
                                                    >
                                                        <MapPin size={20} />
                                                    </button>
                                                </div>
                                            )}
                                                                <button onClick={() => printLabel(o)} className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors" title="Imprimir"><Printer size={16} /></button>
                                                                <button onClick={() => {
                                                                    const initialDataForModal = { ...o, paymentMethod: o.paymentMethod || 'pix', items: Array.isArray(o.items) ? o.items.map(item => ({ ...item })) : [], shippingFee: o.shippingFee || 0, customerName: o.customerName || '', customerAddress: o.customerAddress || '', customerPhone: o.customerPhone || '' };
                                                                    setEditingOrderData(initialDataForModal);
                                                                    setIsOrderEditModalOpen(true);
                                                                }} className="p-2 bg-slate-100 rounded-lg hover:bg-orange-100 text-orange-600 transition-colors" title="Ver Detalhes/Editar"><Edit3 size={16} /></button>
                                                                
                                                                {o.paymentStatus === 'paid' && settings?.integrations?.mercadopago?.accessToken && (
                                                                    <button 
                                                                        onClick={() => handleRefundMercadoPago(o)} 
                                                                        className="p-2 bg-red-50 rounded-lg hover:bg-red-100 text-red-600 transition-colors" 
                                                                        title="Estornar Pix/Cartão (Mercado Pago)"
                                                                    >
                                                                        <RefreshCw size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <button 
                                                                onClick={() => updateStatusAndNotify(o, col.next)}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                                            >
                                                                {col.nextLabel}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {orders.filter(o => o.status === col.id).length === 0 && (
                                                <div className="flex flex-col items-center justify-center p-8 opacity-50">
                                                    <LayoutDashboard size={40} className="text-slate-300 mb-2"/>
                                                    <p className="text-xs text-center text-slate-500 font-bold uppercase tracking-widest">Nenhum Pedido</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ingredients' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Insumos Globais</h1>
                                <p className="text-slate-400 font-bold mt-1 text-sm">Controle o estoque base (Ex: Pães, Carnes, Embalagens).</p>
                            </div>
                            <button onClick={() => { setEditingIngredientId(null); setIngredientForm({ name: '', stock: 0, unit: 'un' }); setIsIngredientModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">
                                + NOVO INSUMO
                            </button>
                        </div>

                        {/* --- INÍCIO: BANNER IA DE PREVISÃO DE ESTOQUE --- */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-6 md:p-8 rounded-[2rem] shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase text-purple-800 flex items-center gap-2"><Sparkles size={24}/> Velo Predict (IA)</h3>
                                    <p className="text-sm font-bold text-purple-600 mt-1 max-w-xl">Nossa IA cruza seus pedidos dos últimos 30 dias com a ficha técnica e projeta o quanto você precisa comprar.</p>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <select 
                                        value={predictDays} 
                                        onChange={(e) => setPredictDays(Number(e.target.value))}
                                        className="p-4 bg-white border border-purple-200 rounded-xl font-black text-sm text-purple-700 outline-none focus:ring-2 ring-purple-400 cursor-pointer shadow-sm"
                                    >
                                        <option value={7}>Previsão para 7 Dias</option>
                                        <option value={15}>Previsão para 15 Dias</option>
                                        <option value={30}>Previsão para 30 Dias</option>
                                    </select>
                                    <button 
                                        onClick={handleGenerateStockPredict}
                                        disabled={isGeneratingPredict}
                                        className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-purple-200 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingPredict ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        {isGeneratingPredict ? 'Analisando Vendas...' : 'Projetar Compras'}
                                    </button>
                                </div>
                            </div>

                            {predictResult && (
                                <div className="bg-white p-6 rounded-2xl border border-purple-100 text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 shadow-inner">
                                    {predictResult.split('\n').map((line, idx) => {
                                        if (line.startsWith('**') || line.startsWith('* **') || line.startsWith('##')) {
                                            return <p key={idx} className="font-black text-slate-900 mt-3 mb-1">{line.replace(/[*#]/g, '')}</p>;
                                        }
                                        return <p key={idx}>{line}</p>;
                                    })}
                                </div>
                            )}
                        </div>
                        {/* --- FIM: BANNER IA DE PREVISÃO DE ESTOQUE --- */}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {ingredients.length === 0 && <p className="text-slate-400 font-bold col-span-full bg-slate-50 p-8 rounded-3xl text-center border-2 border-dashed border-slate-200">Nenhum insumo cadastrado ainda.</p>}
                            {ingredients.map(ing => (
                                <div key={ing.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-lg leading-tight uppercase">{ing.name}</span>
                                        <span className={`text-sm font-bold mt-1 ${ing.stock <= 10 ? 'text-red-500' : 'text-slate-400'}`}>
                                            Estoque: {ing.stock} {ing.unit}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingIngredientId(ing.id); setIngredientForm(ing); setIsIngredientModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600 hover:bg-blue-100 transition-all"><Edit3 size={18} /></button>
                                        <button onClick={() => window.confirm("Excluir Insumo?") && deleteDoc(doc(db, "ingredients", ing.id))} className="p-2 bg-slate-50 rounded-xl text-red-600 hover:bg-red-100 transition-all"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Categorias</h1>
                           <button onClick={() => { setEditingCatId(null); setCatForm({ name: '', icon: 'List', order: 0, isActive: true }); setIsCatModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVA CATEGORIA</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {categories.map(c => (
                                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
    <span className={`font-bold text-lg leading-tight ${c.isActive === false ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.name}</span>
    {c.isActive === false && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-slate-200">Oculta</span>}
</div>
                                        <span className="text-xs font-bold text-slate-400 mt-1">Ordem: {c.order || 0}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleQuickToggleCategory(c)} className={`p-2 rounded-lg transition-all ${c.isActive === false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`} title={c.isActive === false ? 'Oculto (Clique para Ativar)' : 'Ativo (Clique para Ocultar)'}>
                                            {c.isActive === false ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button onClick={() => { setEditingCatId(c.id); setCatForm({ name: c.name, icon: c.icon || 'List', order: c.order || 0, isActive: c.isActive !== false }); setIsCatModalOpen(true); }} className="p-2 bg-slate-50 rounded-lg text-blue-600 hover:bg-blue-100"><Edit3 size={16} /></button>
                                        <button onClick={() => window.confirm("Excluir?") && deleteDoc(doc(db, "categories", c.id))} className="p-2 bg-slate-50 rounded-lg text-red-600 hover:bg-red-100"><Trash2 size={16} /></button>
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
                            <div className="flex gap-4">
                                {/* BOTÃO DE SINCRONIZAÇÃO RETROATIVA DE AVALIAÇÕES REAIS */}
                                <button onClick={async () => {
                                    if(!window.confirm("Deseja recalcular as notas de todos os produtos com base no histórico de avaliações reais recebidas?")) return;
                                    try {
                                        const ratingsMap = {};
                                        
                                        // Varre todas as avaliações já feitas na loja
                                        reviewsList.forEach(r => {
                                            let pId = r.productId;
                                            
                                            // Fallback: se a avaliação antiga não salvou o ID, tenta achar pelo Nome exato
                                            if(!pId && r.productName) {
                                                const found = products.find(p => p.name === r.productName);
                                                if(found) pId = found.id;
                                            }
                                            
                                            // Agrupa as notas e conta quantas vezes o produto foi avaliado
                                            if(pId && r.rating) {
                                                if(!ratingsMap[pId]) ratingsMap[pId] = { sum: 0, count: 0 };
                                                ratingsMap[pId].sum += Number(r.rating);
                                                ratingsMap[pId].count += 1;
                                            }
                                        });

                                        // Atualiza o banco de dados (Firebase) com a média real de cada produto
                                        const batchPromises = Object.keys(ratingsMap).map(pId => {
                                            const avg = ratingsMap[pId].sum / ratingsMap[pId].count;
                                            return updateDoc(doc(db, "products", pId), {
                                                ratingValue: Number(avg.toFixed(1)),
                                                reviewCount: ratingsMap[pId].count
                                            });
                                        });

                                        await Promise.all(batchPromises);
                                        alert(`✅ Mágica Feita! ${batchPromises.length} produtos foram atualizados com as notas e históricos reais para o Google.`);
                                    } catch(e) {
                                        alert("Erro ao sincronizar notas: " + e.message);
                                    }
                                }} className="bg-green-500 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-green-100 flex items-center gap-2 hover:bg-green-600 active:scale-95 transition-all uppercase tracking-widest text-sm">
                                    ⭐ Puxar Notas Antigas
                                </button>

                                {/* PASSO 1 (continuação): Resetar os novos campos ao criar item novo */}
                               <button onClick={() => { setEditingId(null); setForm({ name: '', description: '', price: '', costPrice: '', promotionalPrice: '', originalPrice: '', category: '', imageUrl: '', tag: '', stock: 0, hasDiscount: false, discountPercentage: null, isFeatured: false, isBestSeller: false, quantityDiscounts:[], recommendedIds:[], complements:[], isChilled: false, gtin: '', brand: '', prepTime: '', deliveryLeadTime: '', calories: '', suitableForDiet:[], variations: '', removables: '', ratingValue: '', reviewCount: '', isActive: true }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100">+ NOVO ITEM</button>
                            </div>
                        </div>
                        {/* --- BARRA DE FILTROS E BUSCA (ESTOQUE) --- */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex-1 w-full relative">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Buscar produto..." 
                                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-sm text-slate-600 focus:ring-2 ring-blue-500 outline-none"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                {productSearch && (
                                    <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                        <X size={18}/>
                                    </button>
                                )}
                            </div>

                            <div className="flex w-full md:w-auto gap-4 flex-1 md:flex-none">
                                <div className="flex-1 md:w-48">
                                    <select 
                                        className="w-full p-3 bg-white rounded-xl font-bold text-sm text-slate-700 border border-slate-200 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                        value={productFilterCategory}
                                        onChange={(e) => setProductFilterCategory(e.target.value)}
                                    >
                                        <option value="all">Todas as Categorias</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 md:w-48">
                                    <select 
                                        className="w-full p-3 bg-white rounded-xl font-bold text-sm text-slate-700 border border-slate-200 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                        value={productFilterStatus}
                                        onChange={(e) => setProductFilterStatus(e.target.value)}
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="active">✅ Ativos</option>
                                        <option value="inactive">🚫 Ocultos</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto justify-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:inline">Itens:</span>
                                {[25, 50, 100].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => setProductsPerPage(limit)}
                                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${productsPerPage === limit ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* BARRA DE AÇÕES EM MASSA (PRODUTOS) */}
                        {selectedProductIds.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-top-2 mb-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-lg font-black">{selectedProductIds.length}</span>
                                    <span className="font-bold text-blue-800 text-sm uppercase tracking-widest hidden md:inline">Selecionados</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleBulkToggleProducts(true)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center gap-2"><Eye size={16} className="hidden md:block"/> Ativar</button>
                                    <button onClick={() => handleBulkToggleProducts(false)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center gap-2"><EyeOff size={16} className="hidden md:block"/> Ocultar</button>
                                    <button onClick={() => setSelectedProductIds([])} className="px-3 py-2 bg-white text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs uppercase border border-slate-200 ml-2">Cancelar</button>
                                </div>
                            </div>
                        )}

                        {(() => {
                            const filteredProductsList = products.filter(p => {
                                const matchesSearch = !productSearch || 
                                    (p?.name || '').toLowerCase().includes(productSearch.toLowerCase()) || 
                                    (p?.category || '').toLowerCase().includes(productSearch.toLowerCase());
                                
                                const matchesCategory = productFilterCategory === 'all' || p.category === productFilterCategory;
                                const matchesStatus = productFilterStatus === 'all' || (productFilterStatus === 'active' ? p.isActive !== false : p.isActive === false);
                                
                                return matchesSearch && matchesCategory && matchesStatus;
                            });

                            const totalProductPagesList = Math.max(1, Math.ceil(filteredProductsList.length / productsPerPage));
                            const paginatedProductsList = filteredProductsList.slice((currentProductPage - 1) * productsPerPage, currentProductPage * productsPerPage);

                            return (
                                <>
                                    {filteredProductsList.length === 0 ? (
                                        <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                                            <Package size={48} className="text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-bold">Nenhum produto encontrado com esses filtros.</p>
                                            <button onClick={() => {setProductFilterCategory('all'); setProductFilterStatus('all'); setProductSearch('');}} className="mt-4 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Limpar Filtros</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                           {paginatedProductsList.map(p => (                             
                                                <div key={p.id} className={`bg-white p-5 md:p-6 rounded-[2.5rem] border-2 flex items-stretch gap-4 shadow-sm group hover:shadow-md transition-all relative overflow-hidden ${selectedProductIds.includes(p.id) ? 'border-blue-400 bg-blue-50/20' : 'border-slate-100'}`}>
                                    
                                                    {/* COLUNA 1: Checkbox + Foto (Tamanho Fixo para não amassar) */}
                                                    <div className="flex flex-col items-center gap-3 flex-shrink-0 w-16 md:w-20">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedProductIds.includes(p.id)}
                                                            onChange={(e) => {
                                                                if(e.target.checked) setSelectedProductIds(prev => [...prev, p.id]);
                                                                else setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                            }}
                                                            className="w-5 h-5 accent-blue-600 cursor-pointer shadow-sm relative z-10"
                                                        />
                                                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-sm">
                                                            <img src={p.imageUrl || "https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} className="max-w-full max-h-full object-contain rounded-xl" onError={(e) => e.target.src="https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} />
                                                        </div>
                                                    </div>

                                                    {/* COLUNA 2: Textos (Pode crescer, mas se for muito longo vira ... e corta pra não empurrar os botões) */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <h3 className={`font-black text-sm md:text-base leading-tight truncate ${p.isActive === false ? 'text-slate-400 line-through' : 'text-slate-800'}`} title={p.name}>
                                                                {p.name}
                                                            </h3>
                                                            {p.isActive === false && (
                                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 shrink-0">
                                                                    Pausado
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className='flex items-center gap-2 mt-1'>
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
                                                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                                 Custo: <span className="text-slate-500">R$ {Number(p.costPrice).toFixed(2)}</span>
                                                             </p>
                                                        )}
                                                        <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${p.stock <= 2 ? 'text-red-500' : 'text-slate-400'}`}>
                                                            Estoque: <span className={p.stock <= 2 ? 'text-red-600' : 'text-slate-500'}>{p.stock !== undefined ? p.stock : 'N/A'}</span>
                                                        </p>
                                                    </div>

                                                    {/* COLUNA 3: Botões de Ação (Tamanho Fixo à direita, nunca são esmagados) */}
                                                    <div className="flex flex-col justify-center gap-2 flex-shrink-0 relative z-10 w-10">
                                                        <button onClick={() => handleGeneratePromoCopy(p)} className="p-2.5 bg-purple-50 rounded-xl text-purple-600 border border-purple-100 hover:bg-purple-100 transition-all shadow-sm" title="Criar Copy de Promoção (IA)">
                                                            <Sparkles size={18} className="mx-auto" />
                                                        </button>
                                                        <button onClick={() => handleQuickToggleProduct(p)} className={`p-2.5 rounded-xl transition-all shadow-sm ${p.isActive === false ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'}`} title={p.isActive === false ? 'Oculto (Clique para Ativar)' : 'Ativo (Clique para Ocultar)'}>
                                                            {p.isActive === false ? <EyeOff size={18} className="mx-auto" /> : <Eye size={18} className="mx-auto" />}
                                                        </button>
                                                        <button onClick={() => { setEditingId(p.id); setForm({ ...p, consumedIngredients: p.consumedIngredients || [], quantityDiscounts: p.quantityDiscounts || [], recommendedIds: p.recommendedIds ||[], gtin: p.gtin || '', brand: p.brand || '', prepTime: p.prepTime || '', deliveryLeadTime: p.deliveryLeadTime || '', calories: p.calories || '', suitableForDiet: p.suitableForDiet ||[], variations: p.variations ? p.variations.join(', ') : '', removables: p.removables ? p.removables.join(', ') : '', isActive: p.isActive !== false }); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 rounded-xl text-blue-600 border border-slate-100 hover:bg-blue-100 transition-all shadow-sm">
                                                            <Edit3 size={18} className="mx-auto" />
                                                        </button>
                                                        <button onClick={() => window.confirm("Deseja excluir este produto?") && deleteDoc(doc(db, "products", p.id))} className="p-2.5 bg-slate-50 rounded-xl text-red-500 border border-slate-100 hover:bg-red-100 transition-all shadow-sm">
                                                            <Trash2 size={18} className="mx-auto" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {totalProductPagesList > 1 && (
                                        <div className="flex justify-center items-center gap-4 mt-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                            <button 
                                                onClick={() => setCurrentProductPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentProductPage === 1}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Anterior
                                            </button>
                                            <span className="text-sm font-black text-slate-700">
                                                Página {currentProductPage} de {totalProductPagesList}
                                            </span>
                                            <button 
                                                onClick={() => setCurrentProductPage(prev => Math.min(prev + 1, totalProductPagesList))}
                                                disabled={currentProductPage === totalProductPagesList}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Próxima
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div className="text-center md:text-left">
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                    {settings?.enableFiado 
                                        ? (settings.loyaltyActive ? 'FIDELIDADE E FIADO' : 'CLIENTES E CADERNETA')
                                        : (settings.loyaltyActive ? 'CLUBE FIDELIDADE' : 'RANKING VIP')
                                    }
                                </h1>
                                {!settings.loyaltyActive && <p className="text-slate-400 font-bold mt-2 text-sm">O Clube Fidelidade está desativado. Ative na aba 'Marketing'.</p>}
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingVip({ name: '', phone: '', fiadoEnabled: false, billingDay: 10, creditLimit: 0, isNew: true });
                                    setIsVipModalOpen(true);
                                }} 
                                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm uppercase tracking-widest whitespace-nowrap"
                            >
                                + NOVO CLIENTE
                            </button>
                        </div>

                        {/* --- PAINEL FINANCEIRO DA CADERNETA (RELATÓRIO DE DEVEDORES) --- */}
                        {settings?.enableFiado && (() => {
                            const totalReceivable = customers.reduce((acc, c) => acc + (c.fiadoDebt || 0), 0);
                            const debtorsCount = customers.filter(c => (c.fiadoDebt || 0) > 0).length;
                            const totalCreditLimit = customers.reduce((acc, c) => acc + (c.fiadoEnabled ? (c.creditLimit || 0) : 0), 0);
                            const topDebtors = customers.filter(c => (c.fiadoDebt || 0) > 0).sort((a, b) => b.fiadoDebt - a.fiadoDebt);

                            return (
                                <div className="max-w-4xl mx-auto mb-10 animate-in fade-in slide-in-from-top-2">
                                    <h2 className="text-xl font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
                                        📒 Relatório da Caderneta (Fiado)
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black uppercase text-orange-800 tracking-widest mb-1 flex items-center gap-2"><Users size={14}/> Inadimplentes</p>
                                            <p className="text-4xl font-black text-orange-600 italic">{debtorsCount}</p>
                                        </div>
                                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black uppercase text-red-800 tracking-widest mb-1 flex items-center gap-2"><Banknote size={14}/> Total a Receber</p>
                                            <p className="text-4xl font-black text-red-600 italic">R$ {totalReceivable.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 flex items-center gap-2"><Shield size={14}/> Risco (Limite Usado)</p>
                                            <p className="text-xl font-black text-slate-700 italic">
                                                R$ {totalReceivable.toFixed(2)} <span className="text-sm font-bold text-slate-400">/ R$ {totalCreditLimit.toFixed(2)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {topDebtors.length > 0 && (
                                        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">🚨 Maiores Devedores Atuais:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {topDebtors.slice(0, 5).map((d, idx) => (
                                                    <span key={idx} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200">
                                                        {d.name.split(' ')[0]}: R$ {d.fiadoDebt.toFixed(2)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="grid gap-4 max-w-4xl mx-auto">
                            <h2 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2 mt-4 mb-2">
                                🏆 Ranking de Clientes (Geral)
                            </h2>
                            {customers.slice(0, showAllVips ? undefined : 5).map((c, i) => {
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
                                            <h3 className="font-black text-xl text-slate-800 uppercase leading-none mb-1">{c.name}</h3>
                                            <p className="text-xs font-bold text-slate-400 tracking-widest">{c.phone}</p>
                                            <div className="flex gap-2 mt-2">
                                                <button 
                                                    onClick={() => {
                                                        setEditingVip(c);
                                                        setIsVipModalOpen(true);
                                                    }}
                                                    className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                                                >
                                                    ⚙️ Gerenciar
                                                </button>
                                                {/* Botão de Excluir (Só aparece se o cliente foi salvo na Caderneta) */}
                                                {c.dbId && (
                                                    <button 
                                                        onClick={async () => {
                                                            if(window.confirm(`Tem certeza que deseja apagar o cadastro de ${c.name}? (O histórico de pedidos será mantido).`)) {
                                                                try {
                                                                    await deleteDoc(doc(db, "store_customers", c.dbId));
                                                                    alert("Cliente removido com sucesso!");
                                                                } catch(e) {
                                                                    alert("Erro ao remover: " + e.message);
                                                                }
                                                            }
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                                                        title="Excluir Cliente"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
                                        
                                        {/* NOVO: BLOCO DA CADERNETA (FIADO) */}
                                        {settings?.enableFiado && c.fiadoEnabled && (
                                            <div className="mt-4 pt-4 border-t border-slate-100/50 flex flex-col md:flex-row items-end justify-between gap-4 w-full">
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Status Caderneta (Vence dia {c.billingDay})</p>
                                                    <p className="text-sm font-bold text-slate-500">
                                                        Em Aberto: <span className="text-red-500 font-black">R$ {c.fiadoDebt.toFixed(2)}</span> / Limite: R$ {c.creditLimit?.toFixed(2) || '0.00'}
                                                    </p>
                                                </div>
                                                
                                                {c.fiadoDebt > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            const lojaName = storeStatus.name || "Nossa Loja";
                                                            const chavePix = storeStatus.velopayData?.pixKey || storeStatus.pixKey || "SUA_CHAVE_AQUI";
                                                            const msg = `Olá, ${c.name.split(' ')[0]}! Tudo bem? Aqui é da *${lojaName}*.\n\nSua caderneta (fiado) fechou neste ciclo no valor de *R$ ${c.fiadoDebt.toFixed(2)}*.\n\n💳 Para facilitar, você pode pagar direto no nosso PIX:\n*${chavePix}*\n\nAssim que pagar, é só mandar o comprovante aqui que já liberamos seu limite novamente! Muito obrigado pela preferência.`;
                                                            
                                                            const phoneRaw = String(c.phone).replace(/\D/g, '');
                                                            const cleanPhone = phoneRaw.startsWith('55') ? phoneRaw : `55${phoneRaw}`;
                                                            
                                                            // Se a API estiver configurada, dispara por baixo dos panos, senão abre o App
                                                            if (settings?.integrations?.whatsapp?.apiToken) {
                                                                fetch('/api/whatsapp-send', { 
                                                                    method: 'POST', 
                                                                    headers: { 'Content-Type': 'application/json' }, 
                                                                    body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: cleanPhone, dynamicParams: { text: msg } }) 
                                                                }).then(() => alert("✅ Fatura enviada no WhatsApp do cliente via Bot!")).catch(() => window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank'));
                                                            } else {
                                                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                            }
                                                        }}
                                                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-orange-200"
                                                    >
                                                        💸 Cobrar Fatura (Whats)
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                            {customers.length > 5 && (
                                <button 
                                    onClick={() => setShowAllVips(!showAllVips)} 
                                    className="w-full py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs rounded-3xl hover:bg-slate-200 transition-all mt-4"
                                >
                                    {showAllVips ? 'Ver Menos' : `Ver todos os ${customers.length} Clientes VIP`}
                                </button>
                            )}
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
                                    {/* BOTÃO PARA FORÇAR A SINCRONIZAÇÃO DO GOOGLE MANUALMENTE */}
                                    {activeReviewTab === 'reviews' && (
                                        <button 
                                            onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                const oldText = btn.innerHTML;
                                                btn.innerHTML = '⏳ Puxando...';
                                                btn.disabled = true;
                                                try {
                                                    const res = await fetch('/api/sync-google-reviews');
                                                    if(res.ok) alert("✅ Busca concluída! Se houverem novas avaliações no Google, elas aparecerão na tela em instantes.");
                                                    else alert("❌ Erro ao buscar. Verifique a integração na aba Configurações.");
                                                } catch(err) {
                                                    alert("Erro de conexão.");
                                                }
                                                btn.innerHTML = oldText;
                                                btn.disabled = false;
                                            }}
                                            className="flex-1 md:flex-none px-6 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-blue-200"
                                        >
                                            🔄 Buscar do Google
                                        </button>
                                    )}
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
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-800 uppercase text-lg">{r.customerName}</span>
                                                    {r.source === 'google' && (
                                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-100">
                                                            <FaGoogle size={10} /> Avaliação do Google
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                                                    {r.source === 'google' ? 'Importado do Maps' : `Pedido: #${r.orderId}`}
                                                </p>
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
                                                {/* CAMPO DE RESPOSTA ATUALIZADO */}
                                                <div className="flex-1 relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Escreva uma resposta pública..." 
                                                        className="w-full p-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-2 ring-blue-500 transition-all text-slate-700"
                                                        value={replyText[r.id] || ''}
                                                        onChange={(e) => setReplyText({...replyText,[r.id]: e.target.value})}
                                                    />
                                                    
                                                    {/* BOTÃO MÁGICO DE RESPOSTA IA (INJETADO DENTRO DO INPUT) */}
                                                    <button 
                                                        type="button"
                                                        title="Sugerir resposta otimizada com IA"
                                                        onClick={async () => {
                                                            // Gera um copy rápido baseado na nota e no produto (se existir)
                                                            const isPositive = r.rating >= 4;
                                                            const itemMention = r.productName ? ` o nosso famoso ${r.productName}` : ' o seu pedido';
                                                            const localeMention = storeStatus.address ? ` aqui na região` : '';
                                                            
                                                            let suggestedReply = '';
                                                            if (isPositive) {
                                                                suggestedReply = `Olá ${r.customerName.split(' ')[0]}! Que alegria saber que você curtiu${itemMention}${localeMention}. Muito obrigado pela avaliação 5 estrelas! Sempre que precisar de um delivery de qualidade, a ${storeStatus.name} está à disposição.`;
                                                            } else {
                                                                suggestedReply = `Olá ${r.customerName.split(' ')[0]}. Lamentamos que a sua experiência com${itemMention} não tenha sido ideal. Trabalhamos duro na ${storeStatus.name} para manter a excelência e adoraríamos entender melhor o que houve. Por favor, nos chame no WhatsApp para resolvermos isso.`;
                                                            }
                                                            
                                                            setReplyText({...replyText, [r.id]: suggestedReply});
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all active:scale-95"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                </div>
                                                
                                                <button 
                                                    onClick={async (e) => {
                                                        if(!replyText[r.id]) return;
                                                        
                                                        const btn = e.currentTarget;
                                                        const oldText = btn.innerHTML;
                                                        btn.innerHTML = "Enviando...";
                                                        btn.disabled = true;

                                                        try {
                                                            // Se a avaliação veio do Google, dispara para a API do backend
                                                            if (r.source === 'google') {
                                                                const res = await fetch('/api/reply-google-review', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        storeId: storeId,
                                                                        reviewId: r.id,
                                                                        googleReviewName: r.googleReviewName,
                                                                        replyText: replyText[r.id]
                                                                    })
                                                                });
                                                                
                                                                const data = await res.json();
                                                                
                                                                if (!res.ok) {
                                                                    alert(`❌ Erro no Google: ${data.error || 'Falha ao responder.'}`);
                                                                    btn.innerHTML = oldText;
                                                                    btn.disabled = false;
                                                                    return; // Trava aqui e não salva no Firebase se o Google recusar
                                                                }
                                                            }

                                                            // Salva no banco de dados local (Para avaliações do App e do Google)
                                                            await updateDoc(doc(db, "reviews", r.id), { reply: replyText[r.id] });
                                                            
                                                            alert(r.source === 'google' ? "✅ Resposta publicada no Google Maps com sucesso!" : "✅ Resposta enviada e visível no app!");
                                                            
                                                        } catch(err) {
                                                            alert("Erro de conexão ao tentar enviar a resposta.");
                                                        }
                                                        
                                                        btn.innerHTML = oldText;
                                                        btn.disabled = false;
                                                    }}
                                                    className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
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
                
                {/* ✅ NOVO PDV (FRENTE DE CAIXA RÁPIDA) */}
                {activeTab === 'manual' && (
    !isCaixaAberto ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-in zoom-in">
            <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-200">
                <Store size={64} className="text-slate-300" />
            </div>
            <h2 className="text-3xl font-black italic text-slate-800 uppercase mb-2">Caixa Fechado</h2>
            <p className="text-slate-500 font-bold mb-8 text-center max-w-md">Para iniciar as vendas no Balcão e registrar pedidos, você precisa abrir o caixa com o seu usuário.</p>
            <button 
                onClick={handleToggleCaixa}
                className="bg-green-500 hover:bg-green-600 text-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-green-200 transition-all active:scale-95 flex items-center gap-3 animate-bounce"
            >
                <CheckCircle size={24} /> Abrir Meu Caixa Agora
            </button>
        </div>
    ) : (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* COLUNA ESQUERDA: CATÁLOGO PDV */}
                        <div className="flex-1 flex flex-col bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                            {/* Cabeçalho de Busca e Categorias */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black italic uppercase text-slate-800 flex items-center gap-2">
                                        <Store size={28} className="text-blue-600"/> Frente de Caixa
                                    </h2>
                                    <button 
                                        onClick={handleToggleCaixa}
                                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center gap-2 ${isCaixaAberto ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600 animate-pulse'}`}
                                    >
                                        {isCaixaAberto ? <><XCircle size={16}/> Fechar Meu Caixa</> : <><CheckCircle size={16}/> Abrir Meu Caixa</>}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar produto por nome ou código..." 
                                        className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 transition-all shadow-sm"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                    {productSearch && (
                                        <button onClick={() => setProductSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={20}/>
                                        </button>
                                    )}
                                </div>
                                {/* Filtro Rápido de Categorias */}
                                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                    <button onClick={() => setProductSearch('')} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase whitespace-nowrap shadow-md">Todas</button>
                                    {categories.map(c => (
                                        <button key={c.id} onClick={() => setProductSearch(c.name)} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 whitespace-nowrap transition-all">
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grade de Produtos */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {products.filter(p => 
                                        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                        p.category.toLowerCase().includes(productSearch.toLowerCase())
                                    ).map(p => {
                                        const isOutOfStock = p.stock !== undefined && Number(p.stock) <= 0;
                                        return (
                                            <div 
                                                key={p.id} 
                                                onClick={() => {
                                                    if (isOutOfStock) return;
                                                    const ex = manualCart.find(it => it.id === p.id);
                                                    if (ex) {
                                                        if (ex.quantity >= Number(p.stock)) return alert(`Estoque máximo: ${p.stock}`);
                                                        setManualCart(manualCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                                                    } else {
                                                        const productToAdd = { 
                                                            ...p, 
                                                            quantity: 1, 
                                                            price: p.promotionalPrice > 0 ? p.promotionalPrice : p.price 
                                                        };
                                                        setManualCart([...manualCart, productToAdd]);
                                                    }
                                                }}
                                                className={`bg-white rounded-3xl p-4 border-2 transition-all flex flex-col justify-between h-44 group select-none ${isOutOfStock ? 'border-slate-100 opacity-50 cursor-not-allowed grayscale' : 'border-transparent hover:border-blue-400 cursor-pointer shadow-sm hover:shadow-md active:scale-95'}`}
                                            >
                                                <div className="flex justify-between items-start gap-1 mb-2">
                                                    {p.imageUrl ? (
                                                        <img src={p.imageUrl || "https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl bg-slate-50 shrink-0" onError={(e) => e.target.src="https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} />
                                                    ) : (
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 shrink-0"><Package size={20}/></div>
                                                    )}
                                                    <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-1 rounded-md whitespace-nowrap shrink-0 ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {isOutOfStock ? 'Esgotado' : `Estoque: ${p.stock || '∞'}`}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 text-xs leading-tight line-clamp-2 mb-1">{p.name}</p>
                                                    <p className="font-black text-blue-600 text-sm">R$ {Number(p.promotionalPrice > 0 ? p.promotionalPrice : p.price).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: O TICKET / COMANDA (CARRINHO) */}
                        <div className="w-full xl:w-[450px] flex flex-col bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex-shrink-0 relative">
                            {/* Topo do Ticket */}
                            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black italic uppercase tracking-tighter text-2xl">Comanda</h3>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-200">{manualCart.reduce((a, b) => a + b.quantity, 0)} Itens</span>
                                </div>
                                {/* Toggle Balcão / Delivery */}
                                <div className="flex bg-slate-800 rounded-xl p-1">
                                    {storeStatus.posPickupEnabled !== false && (
                                        <button 
                                            onClick={() => { setManualCustomer({ ...manualCustomer, deliveryMethod: 'pickup' }); setManualShippingFee(0); }}
                                            className={`flex-1 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${manualCustomer.deliveryMethod === 'pickup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            🏪 Balcão/Mesa
                                        </button>
                                    )}
                                    {storeStatus.posDeliveryEnabled !== false && (
                                        <button 
                                            onClick={() => setManualCustomer({ ...manualCustomer, deliveryMethod: 'delivery' })}
                                            className={`flex-1 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${manualCustomer.deliveryMethod === 'delivery' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            🛵 Delivery
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ÁREA DE SCROLL UNIFICADA (ITENS + PAGAMENTO) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 flex flex-col">
                                {/* Lista de Itens (Cresce livremente) */}
                                <div className="p-4 flex-1">
                                {manualCart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
                                        <ShoppingCart size={64} />
                                        <p className="text-sm font-bold uppercase tracking-widest">Caixa Livre</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {manualCart.map(i => (
                                            <div key={i.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-black text-slate-700 text-xs flex-1 pr-2 leading-tight">{i.name}</span>
                                                    <span className="font-black text-blue-600 text-sm whitespace-nowrap">R$ {(i.price * i.quantity).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    {/* Botoes de Quantidade */}
                                                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                                        <button onClick={() => {
                                                            if (i.quantity <= 1) setManualCart(manualCart.filter(item => item.id !== i.id));
                                                            else setManualCart(manualCart.map(item => item.id === i.id ? { ...item, quantity: item.quantity - 1 } : item));
                                                        }} className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-red-500 font-bold active:scale-95">-</button>
                                                        <span className="font-black text-slate-800 text-xs w-4 text-center">{i.quantity}</span>
                                                        <button onClick={() => {
                                                            if (i.quantity >= Number(i.stock)) return alert('Estoque máximo atingido!');
                                                            setManualCart(manualCart.map(item => item.id === i.id ? { ...item, quantity: item.quantity + 1 } : item));
                                                        }} className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-blue-600 font-bold active:scale-95">+</button>
                                                    </div>
                                                    <button onClick={() => setManualCart(manualCart.filter(item => item.id !== i.id))} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 px-2 py-1 rounded-lg transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Área de Cliente e Totais (Agora no fluxo da rolagem) */}
                            <div className="p-6 border-t-2 border-slate-200 bg-white mt-auto flex-shrink-0">
                                {/* Acordeão de Cliente/Entrega (Só aparece se tiver item) */}
                                {manualCart.length > 0 && (
                                    <div className="mb-6 space-y-3">
                                        {/* LINHA 1: NOME E MESA / WHATSAPP */}
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder={manualCustomer.deliveryMethod === 'pickup' ? "Nome do Cliente (Opcional)" : "Nome do Cliente *"} 
                                                className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 border border-slate-100" 
                                                value={manualCustomer.name || ''} 
                                                onChange={e => setManualCustomer({ ...manualCustomer, name: e.target.value })} 
                                            />
                                            {manualCustomer.deliveryMethod === 'pickup' && (
                                                <input 
                                                    type="text" 
                                                    placeholder="Mesa/Comanda (Ex: 05)" 
                                                    className="w-40 p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 border border-slate-100 text-center" 
                                                    value={manualCustomer.mesa || ''} 
                                                    onChange={e => setManualCustomer({ ...manualCustomer, mesa: e.target.value })} 
                                                />
                                            )}
                                            {manualCustomer.deliveryMethod === 'delivery' && (
                                                <input 
                                                    type="tel" 
                                                    placeholder="WhatsApp" 
                                                    className="w-32 p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 border border-slate-100" 
                                                    value={manualCustomer.phone || ''} 
                                                    onChange={e => setManualCustomer({ ...manualCustomer, phone: e.target.value })} 
                                                />
                                            )}
                                        </div>
                                        
                                        {/* LINHA 2: ENDEREÇO E FRETE (SÓ DELIVERY) */}
                                        {manualCustomer.deliveryMethod === 'delivery' && (
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Endereço Completo *" 
                                                    className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 border border-slate-100" 
                                                    value={manualCustomer.address || ''} 
                                                    onChange={e => setManualCustomer({ ...manualCustomer, address: e.target.value })} 
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Frete R$" 
                                                    className="w-24 p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 text-center border border-slate-100" 
                                                    value={manualShippingFee || ''} 
                                                    onChange={e => setManualShippingFee(Number(e.target.value))} 
                                                />
                                            </div>
                                        )}

                                      {/* LINHA 3: FORMA DE PAGAMENTO E TROCO */}
<div className="flex flex-col gap-2">
    {(manualCustomer.splitPayments && manualCustomer.splitPayments.length > 0) ? (
        <div className="space-y-2 border border-blue-100 p-3 rounded-2xl bg-blue-50/50">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase text-blue-800 tracking-widest">Pagamento Dividido</span>
                <button onClick={() => setManualCustomer({ ...manualCustomer, splitPayments: [] })} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Cancelar Divisão</button>
            </div>
            {manualCustomer.splitPayments.map((pag, index) => (
                <div key={index} className="flex gap-2 items-center w-full">
                    <select
                        className="w-1/2 p-3 bg-white text-slate-800 rounded-xl font-black text-[10px] sm:text-xs uppercase outline-none focus:ring-2 ring-blue-500 cursor-pointer border border-slate-200 shadow-sm"
                        value={pag.method}
                        onChange={e => {
                            const newSplit = [...manualCustomer.splitPayments];
                            newSplit[index].method = e.target.value;
                            setManualCustomer({ ...manualCustomer, splitPayments: newSplit });
                        }}
                    >
                        <option value="pix">💠 PIX</option>
                        <option value="cartao">💳 Cartão</option>
                        <option value="voucher">🎟️ Vale Refeição</option>
                        <option value="dinheiro">💵 Dinheiro</option>
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="R$ 0.00"
                        className="flex-1 min-w-[70px] p-3 bg-white rounded-xl font-black text-xs outline-none focus:ring-2 ring-blue-500 text-center border border-slate-200 shadow-sm"
                        value={pag.amount || ''}
                        onChange={e => {
                            const newSplit = [...manualCustomer.splitPayments];
                            newSplit[index].amount = parseFloat(e.target.value) || 0;
                            setManualCustomer({ ...manualCustomer, splitPayments: newSplit });
                        }}
                    />
                    <button onClick={() => {
                        const newSplit = manualCustomer.splitPayments.filter((_, i) => i !== index);
                        setManualCustomer({ ...manualCustomer, splitPayments: newSplit });
                    }} className="p-3 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors shrink-0"><Trash2 size={16}/></button>
                </div>
            ))}
            <button onClick={() => setManualCustomer({ ...manualCustomer, splitPayments: [...manualCustomer.splitPayments, { method: 'cartao', amount: 0 }] })} className="w-full py-2 bg-blue-100 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-colors mt-2 shadow-sm">+ Adicionar Forma</button>
        </div>
    ) : (
        <div className="flex gap-2">
           <select 
                className="flex-1 p-4 bg-blue-50 text-blue-800 rounded-xl font-black text-xs uppercase outline-none focus:ring-2 ring-blue-500 cursor-pointer border border-blue-100 shadow-sm" 
                value={manualCustomer.payment || 'pix'} 
                onChange={e => setManualCustomer({ ...manualCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? manualCustomer.changeFor : '' })}
            >
                <option value="pix">💠 PIX</option>
                <option value="cartao">💳 Cartão (Maquininha)</option>
                <option value="voucher">🎟️ Vale Refeição</option>
                <option value="dinheiro">💵 Dinheiro (Espécie)</option>
                {settings?.enableFiado && <option value="fiado">📒 Caderneta (Fiado)</option>}
            </select>

            {manualCustomer.payment === 'dinheiro' && (
                <input 
                    type="number" 
                    placeholder="Troco p/ R$?" 
                    className="w-32 p-4 bg-green-50 text-green-800 rounded-xl font-black text-xs outline-none focus:ring-2 ring-green-500 text-center border border-green-100 placeholder:text-green-300 shadow-sm" 
                    value={manualCustomer.changeFor || ''} 
                    onChange={e => setManualCustomer({ ...manualCustomer, changeFor: e.target.value })} 
                />
            )}
            
            <button onClick={() => setManualCustomer({ ...manualCustomer, splitPayments: [{ method: manualCustomer.payment || 'pix', amount: 0 }, { method: 'cartao', amount: 0 }] })} className="px-3 bg-blue-100 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-colors flex items-center justify-center text-center leading-tight shadow-sm shrink-0">
                Dividir<br/>Pagto
            </button>
        </div>
    )}
</div>

                                        {/* LINHA 4: CONTROLE DE STATUS (COZINHA E PAGAMENTO) */}
                                        <div className="flex gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                            <div className="flex-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cozinha/Estoque</label>
    <select 
        className="w-full bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer"
        value={manualCustomer.status || (['default', 'drinks'].includes(storeStatus?.storeNiche) ? 'completed' : 'preparing')}
        onChange={e => setManualCustomer({ ...manualCustomer, status: e.target.value })}
    >
        {['default', 'drinks'].includes(storeStatus?.storeNiche) ? (
            <>
                <option value="completed">✅ Entregar na Hora</option>
                <option value="preparing">👨‍🍳 Mandar p/ Preparo</option>
            </>
        ) : (
            <>
                <option value="preparing">👨‍🍳 Mandar p/ Preparo</option>
                <option value="completed">✅ Entregar na Hora</option>
            </>
        )}
    </select>
</div>
                                            <div className="w-px bg-slate-200 mx-2"></div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Caixa</label>
                                                <select 
                                                    className="w-full bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer"
                                                    value={manualCustomer.paymentStatus || 'pending'}
                                                    onChange={e => setManualCustomer({ ...manualCustomer, paymentStatus: e.target.value })}
                                                >
                                                    <option value="pending">⏳ Deixar Pendente</option>
                                                    <option value="paid">✅ Já Recebido (Pago)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Resumo Final Integrado com o Botão para garantir Validação */}
{(() => {
    // 1. Calcula o total do pedido
    const cartSubtotal = manualCart.reduce((a, i) => a + (i.price * i.quantity), 0);
    const cartTotal = Math.max(0, cartSubtotal + (manualCustomer.deliveryMethod === 'delivery' ? manualShippingFee : 0) - manualDiscountAmount);
    
    // 2. Calcula o troco e as Divisões Híbridas
    const amountGiven = Number(manualCustomer.changeFor?.toString().replace(',', '.') || 0);
    const isSplitActive = manualCustomer.splitPayments && manualCustomer.splitPayments.length > 0;
    const isDinheiro = manualCustomer.payment === 'dinheiro' && !isSplitActive;
    const changeValue = amountGiven - cartTotal;

    // Lógica do Pagamento Dividido
    const splitTotal = isSplitActive ? manualCustomer.splitPayments.reduce((a, p) => a + (Number(p.amount) || 0), 0) : 0;
    const splitDiff = cartTotal - splitTotal;
    
    // Impede o Lançamento se o pagamento misto não for exato (Diferença > 0.01 pra ignorar dízimas float)
    const isSplitInvalid = isSplitActive && Math.abs(splitDiff) > 0.01;

    return (
        <>
        <div className="flex flex-col gap-3 mb-6 pt-4 border-t border-dashed border-slate-200">
            {/* CAMPO DE DESCONTO PDV */}
            <div className="flex justify-between items-center bg-green-50 p-3 rounded-2xl border border-green-100 mb-2">
                <span className="font-black text-green-700 uppercase tracking-widest text-[10px]">Desconto Extra R$</span>
                <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-24 p-2 bg-white rounded-lg font-black text-xs text-green-700 outline-none text-right focus:ring-2 ring-green-400 shadow-sm"
                    value={manualDiscountAmount || ''}
                    onChange={(e) => setManualDiscountAmount(Number(e.target.value))}
                />
            </div>

            {/* Total Principal */}
            <div className="flex justify-between items-end">
                <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Total A Pagar</span>
                <span className="text-4xl font-black text-slate-900 italic leading-none">
                    R$ {cartTotal.toFixed(2)}
                </span>
            </div>

            {/* Display do Troco (Dinheiro Único) */}
            {isDinheiro && amountGiven > 0 && (
                <div className={`flex justify-between items-center p-3 rounded-2xl border-2 transition-all ${changeValue >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                    <span className={`font-black text-[10px] uppercase tracking-widest ${changeValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {changeValue >= 0 ? 'Troco a Devolver:' : 'Valor Insuficiente (Falta):'}
                    </span>
                    <span className={`text-2xl font-black italic ${changeValue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        R$ {Math.abs(changeValue).toFixed(2)}
                    </span>
                </div>
            )}

            {/* Display Validação da Divisão de Pagamento */}
                    {isSplitActive && (
                        <div className={`flex justify-between items-center p-3 rounded-2xl border-2 transition-all ${!isSplitInvalid ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-orange-50 border-orange-200 animate-pulse'}`}>
                            <span className={`font-black text-[10px] uppercase tracking-widest ${!isSplitInvalid ? 'text-green-700' : 'text-orange-600'}`}>
                                {!isSplitInvalid ? 'Valores Conferem:' : (splitDiff > 0 ? `Falta Lançar:` : 'Valor Excedente:')}
                            </span>
                            <span className={`text-2xl font-black italic ${!isSplitInvalid ? 'text-green-600' : 'text-orange-500'}`}>
                                R$ {Math.abs(splitDiff).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                <button 
                    onClick={async () => {
                        const isPickup = manualCustomer.deliveryMethod === 'pickup';
                        const finalAddress = isPickup ? 'Retirada na Loja / Balcão' : manualCustomer.address;
                const finalName = manualCustomer.name || 'Cliente Avulso (Balcão)';

                const sellerName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Equipe';
                const sellerEmail = auth.currentUser?.email || 'owner';

                try {
                    // === BAIXA DE INSUMOS (PDV BALCÃO) ===
                    const promisesBaixa = [];
                    manualCart.forEach(cartItem => {
                        if (cartItem.consumedIngredients && cartItem.consumedIngredients.length > 0) {
                            cartItem.consumedIngredients.forEach(ci => {
                                const ingRef = doc(db, "ingredients", ci.ingredientId);
                                const totalGasto = Number(cartItem.quantity) * Number(ci.qty);
                                promisesBaixa.push(updateDoc(ingRef, { stock: increment(-totalGasto) }));
                            });
                        }
                    });
                    if (promisesBaixa.length > 0) {
                        await Promise.all(promisesBaixa).catch(e => console.error("Erro ao baixar insumo:", e));
                    }

                    await addDoc(collection(db, "orders"), { 
                        ...manualCustomer,
                        customerName: finalName, 
                        customerAddress: finalAddress, 
                        customerPhone: manualCustomer.phone || '', 
                        items: manualCart,
                        subtotal: cartSubtotal,
                        shippingFee: isPickup ? 0 : manualShippingFee,
                        extraFee: 0,
                        discountAmount: manualDiscountAmount,
                        couponCode: manualDiscountAmount > 0 ? 'DESCONTO_PDV' : '',
                        total: cartTotal,
                        
                        // ✅ SALVAMENTO DO PAGAMENTO MISTO
                        paymentMethod: isSplitActive ? 'misto' : (manualCustomer.payment || 'pix'),
                        pagamentosSplit: isSplitActive ? manualCustomer.splitPayments : null,
                        
                        status: manualCustomer.status || (['default', 'drinks'].includes(storeStatus?.storeNiche) ? 'completed' : 'preparing'),
                        paymentStatus: manualCustomer.paymentStatus || 'pending',
                        changeFor: isDinheiro ? manualCustomer.changeFor : null,
                        tipo: isPickup ? 'local' : 'delivery',
                        createdAt: serverTimestamp(), 
                        storeId: storeId,
                        source: 'manual_pdv',
                        vendedor: sellerName,
                        sellerEmail: sellerEmail 
                    });

                    // Limpeza Final
                    setManualCart([]);
                    setManualCustomer({ 
                        name: '', address: '', phone: '', payment: 'pix', changeFor: '', deliveryMethod: 'pickup', mesa: '', 
                        status: (['default', 'drinks'].includes(storeStatus?.storeNiche) ? 'completed' : 'preparing'), 
                        paymentStatus: 'pending',
                        splitPayments: [] // Zera o split state
                    });
                    setManualShippingFee(0);
                    setManualDiscountAmount(0);
                    alert("✅ Comanda lançada com sucesso!");
                } catch (e) {
                    alert("Erro ao lançar venda no PDV.");
                    console.error(e);
                } finally {
                    setIsSubmittingPOS(false);
                }
            }} 
            disabled={manualCart.length === 0 || isSubmittingPOS || isSplitInvalid}
            className="w-full bg-green-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-200 uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {isSubmittingPOS && <Loader2 className="animate-spin" size={24} />}
            {isSubmittingPOS ? 'Processando...' : (manualCart.length > 0 ? `Lançar Pedido (R$ ${cartTotal.toFixed(2)})` : 'Lançar Pedido')}
        </button>
        </>
    );
})()}
                            </div>
                            {/* FIM DA ÁREA DE SCROLL UNIFICADA */}
                            </div>
                        </div>
                    </div>
                    )
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

                                    {/* --- MÚLTIPLAS TARJAS (SMART BANNERS) --- */}
                                    <div className="space-y-4 mb-6">
                                        {(settings.smartBanners || []).map((banner, index) => (
                                            <div key={index} className={`p-4 rounded-2xl border transition-all relative ${settings.promoActive ? 'bg-orange-600/50 border-orange-400' : 'bg-slate-50 border-slate-200'}`}>
                                                <button onClick={async () => {
                                                    const newBanners = [...(settings.smartBanners || [])];
                                                    newBanners.splice(index, 1);
                                                    await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                }} className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${settings.promoActive ? 'bg-orange-500 text-white hover:bg-red-500' : 'bg-white text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                                
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${settings.promoActive ? 'text-orange-100' : 'text-slate-400'}`}>
                                                    ⏱️ Regras de Exibição (Tarja {index + 1})
                                                </p>
                                                {/* Recorrência */}
                                                <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/20">
                                                    <div>
                                                        <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Repete Quando?</label>
                                                        <select value={banner.recurringDay || 'all'} onChange={async (e) => {
                                                            const newBanners = [...(settings.smartBanners || [])];
                                                            newBanners[index].recurringDay = e.target.value;
                                                            await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                        }} className={`w-full p-3 rounded-xl font-bold outline-none text-xs cursor-pointer ${settings.promoActive ? 'bg-orange-700 text-white border-none focus:ring-2 ring-orange-300' : 'bg-white text-slate-700 border border-slate-200'}`}>
                                                            <option value="all">Todos os Dias</option>
                                                            <option value="1">Toda Segunda</option>
                                                            <option value="2">Toda Terça</option>
                                                            <option value="3">Toda Quarta</option>
                                                            <option value="4">Toda Quinta</option>
                                                            <option value="5">Toda Sexta</option>
                                                            <option value="6">Todo Sábado</option>
                                                            <option value="0">Todo Domingo</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Hora Início</label>
                                                        <input type="time" value={banner.recurringStart || ''} onChange={async (e) => {
                                                            const newBanners = [...(settings.smartBanners || [])];
                                                            newBanners[index].recurringStart = e.target.value;
                                                            await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                        }} className={`w-full p-3 rounded-xl font-bold outline-none text-xs ${settings.promoActive ? 'bg-orange-700 text-white border-none' : 'bg-white text-slate-700 border border-slate-200'}`} />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Hora Fim</label>
                                                        <input type="time" value={banner.recurringEnd || ''} onChange={async (e) => {
                                                            const newBanners = [...(settings.smartBanners || [])];
                                                            newBanners[index].recurringEnd = e.target.value;
                                                            await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                        }} className={`w-full p-3 rounded-xl font-bold outline-none text-xs ${settings.promoActive ? 'bg-orange-700 text-white border-none' : 'bg-white text-slate-700 border border-slate-200'}`} />
                                                    </div>
                                                </div>

                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 mt-4 ${settings.promoActive ? 'text-orange-100' : 'text-slate-400'}`}>
                                                    <Tags size={14}/> Dados da Tarja (Estilo iFood)
                                                </p>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Frase de Destaque</label>
                                                        <input type="text" placeholder="Ex: TERÇA EM DOBRO! 2º Lanche com 50% OFF" value={banner.topBarText || ''} onChange={async (e) => {
                                                            const newBanners = [...(settings.smartBanners || [])];
                                                            newBanners[index].topBarText = e.target.value;
                                                            await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                        }} className={`w-full p-3 rounded-xl font-bold outline-none text-sm ${settings.promoActive ? 'bg-orange-700 text-white border-none focus:ring-2 ring-orange-300 placeholder-orange-400' : 'bg-white text-slate-700 border border-slate-200 focus:ring-2 ring-blue-500'}`} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Código do Cupom</label>
                                                            <input type="text" placeholder="Ex: TERCA50" value={banner.topBarCoupon || ''} onChange={async (e) => {
                                                                const newBanners = [...(settings.smartBanners || [])];
                                                                newBanners[index].topBarCoupon = e.target.value.toUpperCase();
                                                                await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                            }} className={`w-full p-3 rounded-xl font-black uppercase outline-none text-sm ${settings.promoActive ? 'bg-orange-700 text-yellow-300 border-none focus:ring-2 ring-orange-300 placeholder-orange-400' : 'bg-white text-slate-700 border border-slate-200 focus:ring-2 ring-blue-500'}`} />
                                                        </div>
                                                        <div>
                                                            <label className={`text-[9px] font-bold uppercase mb-1 block ${settings.promoActive ? 'text-orange-200' : 'text-slate-500'}`}>Cor da Tarja</label>
                                                            <select value={banner.topBarColor || 'bg-red-600'} onChange={async (e) => {
                                                                const newBanners = [...(settings.smartBanners || [])];
                                                                newBanners[index].topBarColor = e.target.value;
                                                                await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                                            }} className={`w-full p-3 rounded-xl font-bold outline-none text-sm cursor-pointer ${settings.promoActive ? 'bg-orange-700 text-white border-none focus:ring-2 ring-orange-300' : 'bg-white text-slate-700 border border-slate-200'}`}>
                                                                <option value="bg-red-600">🔴 Vermelho</option>
                                                                <option value="bg-blue-600">🔵 Azul</option>
                                                                <option value="bg-green-600">🟢 Verde</option>
                                                                <option value="bg-purple-600">🟣 Roxo</option>
                                                                <option value="bg-slate-900">⚫ Preto</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {(settings.smartBanners || []).length < 5 && (
                                            <button onClick={async () => {
                                                const newBanners = [...(settings.smartBanners || []), {
                                                    recurringDay: 'all', recurringStart: '', recurringEnd: '', topBarText: '', topBarCoupon: '', topBarColor: 'bg-red-600'
                                                }];
                                                await setDoc(doc(db, "settings", storeId), { smartBanners: newBanners }, { merge: true });
                                            }} className={`w-full p-4 rounded-2xl border-2 border-dashed font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${settings.promoActive ? 'border-orange-300 text-orange-100 hover:bg-orange-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                                                <Plus size={16} /> Adicionar Nova Tarja ({5 - (settings.smartBanners || []).length} restantes)
                                            </button>
                                        )}
                                    </div>

                                    <button onClick={async () => { const s = !settings.promoActive; await setDoc(doc(db, "settings", storeId), { promoActive: s }, { merge: true }); }} className={`w-full py-5 lg:py-6 rounded-2xl lg:rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-xl ${settings.promoActive ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-orange-600 text-white hover:bg-orange-700'} transition-all active:scale-95`}>
                                        {settings.promoActive ? 'Desativar Visibilidade (Ocultar Todas)' : 'Ativar Visibilidade (Ligar Tarjas)'}
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
                                                { file: promoBannerFile1, setFile: setPromoBannerFile1, url: settings.promoBannerUrls?.[0], id: 1, index: 0 },
                                                { file: promoBannerFile2, setFile: setPromoBannerFile2, url: settings.promoBannerUrls?.[1], id: 2, index: 1 },
                                                { file: promoBannerFile3, setFile: setPromoBannerFile3, url: settings.promoBannerUrls?.[2], id: 3, index: 2 }
                                            ].map((b) => (
                                                <div key={b.id} className="w-full relative">
                                                    {(b.file || b.url) && (
                                                        <div className="relative mb-2">
                                                            <img src={b.file ? URL.createObjectURL(b.file) : b.url} className="w-full h-24 object-cover rounded-xl bg-slate-100"/>
                                                            <button 
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (b.file) {
                                                                        b.setFile(null); // Remove o preview local antes de salvar
                                                                    } else if (b.url) {
                                                                        if(window.confirm("Deseja apagar este banner definitivamente?")) {
                                                                            const newUrls = [...(settings.promoBannerUrls || [])];
                                                                            newUrls.splice(b.index, 1);
                                                                            await updateDoc(doc(db, "settings", storeId), { promoBannerUrls: newUrls }, { merge: true });
                                                                        }
                                                                    }
                                                                }}
                                                                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 shadow-md transition-all active:scale-95"
                                                                title="Remover Banner"
                                                            >
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </div>
                                                    )}
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

                                {/* --- 3. PROVA SOCIAL (LIVE SALES) --- */}
                                <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl border-4 transition-all ${settings.socialProofActive ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-white border-slate-100'}`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-full">
                                                <Users size={32} className={settings.socialProofActive ? 'text-white animate-bounce' : 'text-slate-300'} /> 
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none ${settings.socialProofActive ? 'text-white' : 'text-slate-800'}`}>Prova Social</h2>
                                                <p className={`text-xs font-bold mt-1 ${settings.socialProofActive ? 'text-emerald-100' : 'text-slate-400'}`}>Pop-up de compras ao vivo.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => { const newState = !settings.socialProofActive; await setDoc(doc(db, "settings", storeId), { socialProofActive: newState }, { merge: true }); }} 
                                            className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all w-full md:w-auto ${settings.socialProofActive ? 'bg-white text-emerald-600 hover:bg-emerald-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                        >
                                            {settings.socialProofActive ? 'Desativar' : 'Ativar Módulo'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* COLUNA DIREITA: FIDELIDADE E CUPONS GERAIS */}
                            <div className="space-y-6 lg:space-y-8">
                                {/* --- NOVO: COMPRE E GANHE (BOGO) --- */}
                                <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl border-4 transition-all h-fit ${settings.buyAndGetPromo?.active ? 'bg-teal-600 text-white border-teal-400' : 'bg-white border-slate-100'}`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <Gift size={48} className={settings.buyAndGetPromo?.active ? 'text-teal-300 animate-bounce' : 'text-slate-200'} />
                                            <div>
                                                <h2 className={`text-2xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none ${settings.buyAndGetPromo?.active ? 'text-white' : 'text-slate-800'}`}>Compre & Ganhe</h2>
                                                <p className={`text-xs font-bold mt-1 ${settings.buyAndGetPromo?.active ? 'text-teal-100' : 'text-slate-400'}`}>Brinde automático no carrinho.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const current = settings.buyAndGetPromo || {};
                                                await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...current, active: !current.active } }, { merge: true });
                                            }}
                                            className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all w-full md:w-auto ${settings.buyAndGetPromo?.active ? 'bg-white text-teal-600 hover:bg-teal-50' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                                        >
                                            {settings.buyAndGetPromo?.active ? 'Desativar' : 'Ativar Promo'}
                                        </button>
                                    </div>

                                    {settings.buyAndGetPromo?.active && (
                                        <div className="pt-6 border-t border-teal-500/50 space-y-4 animate-in fade-in slide-in-from-top-4">
                                            
                                            {/* NOVO: Texto Opcional da Promoção */}
                                            <div className="bg-teal-900/30 p-4 rounded-2xl border border-teal-500/50">
                                                <label className="text-[10px] font-black uppercase text-teal-200 tracking-widest mb-2 flex items-center gap-2"><Edit3 size={14}/> Texto da Promoção (Opcional)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: Compre 2 Baly e Ganhe 1 Vodka" 
                                                    value={settings.buyAndGetPromo?.promoText || ''} 
                                                    onChange={async (e) => await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, promoText: e.target.value } }, { merge: true })} 
                                                    className="w-full p-3 rounded-xl font-bold outline-none text-sm bg-teal-800 text-white border-none focus:ring-2 ring-teal-400 placeholder-teal-600/50" 
                                                />
                                                <p className="text-[9px] text-teal-300 mt-2 font-medium">Se preenchido, este texto aparecerá em destaque na vitrine para o cliente saber da regra.</p>
                                            </div>

                                            {/* Regras de Horário e Dia (Agendamento) */}
                                            <div className="bg-teal-800/40 p-4 rounded-2xl border border-teal-500/50">
                                                <p className="text-[10px] font-black uppercase text-teal-200 tracking-widest mb-3 flex items-center gap-2">
                                                    <Clock size={14}/> Regras de Exibição
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold uppercase mb-1 block text-teal-300">Repete Quando?</label>
                                                        <select 
                                                            value={settings.buyAndGetPromo?.recurringDay || 'all'} 
                                                            onChange={async (e) => await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, recurringDay: e.target.value } }, { merge: true })} 
                                                            className="w-full p-3 rounded-xl font-bold outline-none text-xs cursor-pointer bg-teal-700 text-white border-none focus:ring-2 ring-teal-400"
                                                        >
                                                            <option value="all">Todos os Dias</option>
                                                            <option value="1">Toda Segunda</option>
                                                            <option value="2">Toda Terça</option>
                                                            <option value="3">Toda Quarta</option>
                                                            <option value="4">Toda Quinta</option>
                                                            <option value="5">Toda Sexta</option>
                                                            <option value="6">Todo Sábado</option>
                                                            <option value="0">Todo Domingo</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold uppercase mb-1 block text-teal-300">Hora Início</label>
                                                        <input 
                                                            type="time" 
                                                            value={settings.buyAndGetPromo?.recurringStart || ''} 
                                                            onChange={async (e) => await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, recurringStart: e.target.value } }, { merge: true })} 
                                                            className="w-full p-3 rounded-xl font-bold outline-none text-xs bg-teal-700 text-white border-none focus:ring-2 ring-teal-400" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold uppercase mb-1 block text-teal-300">Hora Fim</label>
                                                        <input 
                                                            type="time" 
                                                            value={settings.buyAndGetPromo?.recurringEnd || ''} 
                                                            onChange={async (e) => await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, recurringEnd: e.target.value } }, { merge: true })} 
                                                            className="w-full p-3 rounded-xl font-bold outline-none text-xs bg-teal-700 text-white border-none focus:ring-2 ring-teal-400" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Configuração dos Produtos (Gatilho + Brinde) */}
                                            <div className="bg-teal-700/50 p-4 rounded-2xl border border-teal-500 space-y-4">
                                                
                                                {/* 1. SELEÇÃO DE GATILHOS (O QUE ELE PRECISA COMPRAR) */}
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-teal-200 tracking-widest mb-2 flex items-center gap-2">
                                                        <ShoppingCart size={14}/> 1. O que o cliente precisa comprar? (Gatilhos)
                                                    </p>
                                                    <div className="bg-teal-800/50 p-3 rounded-xl max-h-32 overflow-y-auto custom-scrollbar space-y-1 border border-teal-600/50">
                                                        {products.map(p => {
                                                            const isTrigger = (settings.buyAndGetPromo?.triggerProductIds || []).includes(p.id);
                                                            return (
                                                                <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isTrigger ? 'bg-teal-600 border border-teal-400' : 'hover:bg-teal-700/50 border border-transparent'}`}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isTrigger}
                                                                        onChange={async (e) => {
                                                                            const currentTriggers = settings.buyAndGetPromo?.triggerProductIds || [];
                                                                            let newTriggers;
                                                                            if (e.target.checked) {
                                                                                newTriggers = [...currentTriggers, p.id];
                                                                            } else {
                                                                                newTriggers = currentTriggers.filter(id => id !== p.id);
                                                                            }
                                                                            await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, triggerProductIds: newTriggers } }, { merge: true });
                                                                        }}
                                                                        className="w-4 h-4 accent-teal-400 cursor-pointer"
                                                                    />
                                                                    <span className="text-xs font-bold text-white leading-tight">{p.name}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                    <p className="text-[9px] text-teal-300 mt-1 font-medium ml-1">Selecione 1 ou mais produtos. Qualquer um deles ativará o brinde.</p>
                                                </div>

                                                <div className="w-full h-px bg-teal-500/50 my-2"></div>

                                                {/* 2. SELEÇÃO DO BRINDE (O QUE ELE VAI GANHAR) */}
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-teal-200 tracking-widest mb-2 flex items-center gap-2">
                                                        <Gift size={14}/> 2. O que ele vai ganhar? (Brinde)
                                                    </p>
                                                    <select 
                                                        value={settings.buyAndGetPromo?.rewardProductId || ''} 
                                                        onChange={async (e) => await setDoc(doc(db, "settings", storeId), { buyAndGetPromo: { ...settings.buyAndGetPromo, rewardProductId: e.target.value } }, { merge: true })} 
                                                        className="w-full p-3 rounded-xl font-bold outline-none text-sm bg-white text-teal-900 cursor-pointer focus:ring-2 ring-teal-400"
                                                    >
                                                        <option value="">Selecione o Brinde...</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <p className="text-[9px] text-teal-300 mt-2 font-medium">Este item será adicionado automaticamente ao carrinho por R$ 0,00 quando o cliente colocar um dos "Gatilhos" acima.</p>
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-green-500/20 p-2 rounded-xl text-green-400 mt-1"><Wallet size={20}/></div>
                                                    <div className="pr-4">
                                                        <p className="font-black text-white text-sm uppercase">Carteira de Cashback</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">Cliente usa saldo acumulado na compra.</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" className="w-5 h-5 accent-green-500 cursor-pointer flex-shrink-0 mt-1" checked={settings.gamification?.cashback || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, cashback: e.target.checked } }, { merge: true })} />
                                            </div>

                                            {settings.gamification?.cashback && (
                                                <div className="mt-4 pt-4 border-t border-slate-700 animate-in fade-in">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-end">
                                                        Porcentagem de Retorno (%)
                                                        <span className="text-green-400 font-black text-xs">{settings.gamification?.cashbackPercent || 2}%</span>
                                                    </label>
                                                    <input 
                                                        type="range" 
                                                        min="1" max="20" step="1"
                                                        value={settings.gamification?.cashbackPercent || 2} 
                                                        onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, cashbackPercent: Number(e.target.value) } }, { merge: true })}
                                                        className="w-full mt-2 accent-green-500 cursor-pointer"
                                                    />

                                                    {/* --- NOVO CAMPO: VALIDADE DO SALDO --- */}
                                                    <div className="mt-4">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                                                            Validade do Saldo (Em Dias)
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                placeholder="Ex: 30"
                                                                value={settings.gamification?.cashbackValidityDays || ''} 
                                                                onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, cashbackValidityDays: Number(e.target.value) } }, { merge: true })}
                                                                className="w-24 p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-green-500 text-sm text-center placeholder-slate-600"
                                                            />
                                                            <span className="text-[10px] text-slate-500 font-bold">Dias (0 = Nunca expira)</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 bg-green-900/30 p-3 rounded-xl border border-green-800/50">
                                                        <p className="text-[10px] text-green-400 font-bold leading-relaxed">
                                                            💡 <strong className="text-white">Automação Ativa:</strong> Ao marcar o pedido como "✅ Entregue", o sistema irá depositar <strong>{settings.gamification?.cashbackPercent || 2}% do valor</strong> na Carteira Digital do cliente, válido por <strong>{settings.gamification?.cashbackValidityDays > 0 ? `${settings.gamification.cashbackValidityDays} dias` : 'tempo indeterminado'}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
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
                                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 mt-1"><Share2 size={20}/></div>
                                                    <div className="pr-4">
                                                        <p className="font-black text-white text-sm uppercase">Indique e Ganhe</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">Link único para o cliente convidar amigos.</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer flex-shrink-0 mt-1" checked={settings.gamification?.referral || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, referral: e.target.checked } }, { merge: true })} />
                                            </div>
                                            
                                            {/* Configurações da Indicação (Só aparece se estiver ativo) */}
                                            {settings.gamification?.referral && (
                                                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 animate-in fade-in">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Pontos p/ Indicação</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="Ex: 50" 
                                                            value={settings.gamification?.referralPoints || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, referralPoints: Number(e.target.value) } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-blue-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Limite de Convites</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="0 = Ilimitado" 
                                                            value={settings.gamification?.referralLimit || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, referralLimit: Number(e.target.value) } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-blue-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
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

                                        {/* --- INÍCIO: SMART BUNDLING (MARKET BASKET ANALYSIS) --- */}
                                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-indigo-500/30 hover:border-indigo-400 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-indigo-500/20 w-32 h-32 blur-3xl rounded-full pointer-events-none"></div>
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400"><Sparkles size={20}/></div>
                                                    <div>
                                                        <p className="font-black text-white text-sm uppercase">Smart Bundling (IA)</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">Mineração de dados p/ sugerir combos.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    // Motor de Market Basket Analysis (Algoritmo Apriori Simplificado)
                                                    let pairs = {};
                                                    orders.forEach(o => {
                                                        if (o.status !== 'canceled' && o.items && o.items.length > 1) {
                                                            const names = o.items.map(i => i.name).sort();
                                                            for (let i = 0; i < names.length; i++) {
                                                                for (let j = i + 1; j < names.length; j++) {
                                                                    const key = `${names[i]} + ${names[j]}`;
                                                                    pairs[key] = (pairs[key] || 0) + 1;
                                                                }
                                                            }
                                                        }
                                                    });
                                                    const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]);
                                                    
                                                    if (sorted.length > 0) {
                                                        const topPair = sorted[0];
                                                        if(window.confirm(`🤖 Velo IA detectou um padrão!\n\nSeus clientes costumam comprar juntos:\n👉 "${topPair[0]}" (${topPair[1]} vezes detectadas).\n\nDeseja criar o produto "Combo Perfeito" com esses itens agora?`)) {
                                                            setForm({
                                                                name: `Combo IA: ${topPair[0]}`,
                                                                description: `Combo gerado por inteligência artificial baseado no que nossos clientes mais amam pedir juntos!`,
                                                                price: '', costPrice: '', promotionalPrice: '', originalPrice: '', category: 'Combos', imageUrl: '', tag: '', stock: 100, hasDiscount: true, discountPercentage: 10, isFeatured: true, isBestSeller: true, quantityDiscounts: [], recommendedIds: [], complements: [], isChilled: false, gtin: '', brand: '', prepTime: '', deliveryLeadTime: '', calories: '', suitableForDiet: [], variations: '', removables: '', ratingValue: '', reviewCount: '', isActive: true
                                                            });
                                                            setActiveTab('products');
                                                            setIsModalOpen(true);
                                                        }
                                                    } else {
                                                        alert("Ainda não há histórico suficiente de pedidos com múltiplos itens na sua loja para a IA minerar padrões.");
                                                    }
                                                }}
                                                className="w-full bg-indigo-600/30 text-indigo-300 hover:text-white hover:bg-indigo-600 border border-indigo-500/50 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all relative z-10"
                                            >
                                                Analisar Pedidos e Sugerir Combo
                                            </button>
                                        </div>
                                        {/* --- FIM: SMART BUNDLING --- */}

                                        {/* --- INÍCIO: FLASH DEALS (MODO TURBO) --- */}
                                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-red-500/30 hover:border-red-400 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-red-500/20 p-2 rounded-xl text-red-400 mt-1"><FaBoltLightning size={20}/></div>
                                                    <div className="pr-4">
                                                        <p className="font-black text-white text-sm uppercase">Oferta Turbo (Urgência)</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">Gera um gatilho de escassez com ofertas agressivas no app.</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" className="w-5 h-5 accent-red-500 cursor-pointer flex-shrink-0 mt-1" checked={settings.gamification?.flashDeals?.active || false} onChange={async (e) => await setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, flashDeals: { ...settings.gamification?.flashDeals, active: e.target.checked } } }, { merge: true })} />
                                            </div>
                                            
                                            {settings.gamification?.flashDeals?.active && (
                                                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 animate-in fade-in">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hora de Baixa (Início)</label>
                                                        <input 
                                                            type="time" 
                                                            value={settings.gamification?.flashDeals?.startTime || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, flashDeals: { ...settings.gamification?.flashDeals, startTime: e.target.value } } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-red-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hora de Volta (Fim)</label>
                                                        <input 
                                                            type="time" 
                                                            value={settings.gamification?.flashDeals?.endTime || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, flashDeals: { ...settings.gamification?.flashDeals, endTime: e.target.value } } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-red-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Desconto (%)</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="Ex: 30"
                                                            value={settings.gamification?.flashDeals?.discountPercent || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, flashDeals: { ...settings.gamification?.flashDeals, discountPercent: Number(e.target.value) } } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-red-400 font-black outline-none focus:border-red-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cupom Ativado</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ex: TURBO30"
                                                            value={settings.gamification?.flashDeals?.couponCode || ''} 
                                                            onChange={(e) => setDoc(doc(db, "settings", storeId), { gamification: { ...settings.gamification, flashDeals: { ...settings.gamification?.flashDeals, couponCode: e.target.value.toUpperCase() } } }, { merge: true })}
                                                            className="w-full p-3 mt-1 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold uppercase outline-none focus:border-red-500 text-sm"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] text-red-400 font-bold bg-red-900/20 p-2 rounded-lg border border-red-900/50 text-center">
                                                            Durante o período acima, a loja exibirá um banner vermelho interativo forçando o cliente a comprar antes que o cronômetro expire.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* --- FIM: FLASH DEALS --- */}

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- 5. GESTÃO DE CUPONS (Abaixo das colunas) --- */}
                        <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[4rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <h2 className="text-2xl lg:text-4xl font-black italic tracking-tighter uppercase">Cupons</h2>
                               <button onClick={() => { setEditingCouponId(null); setCouponForm({ code: '', type: 'percentage', value: 0, minimumOrderValue: 0, usageLimit: null, userUsageLimit: null, expirationDate: '', firstPurchaseOnly: false, active: true, recurringDay: 'all', recurringStart: '', recurringEnd: '' }); setIsCouponModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm">+ NOVO CUPOM</button>
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
                {/* --- ABA DE PARCEIROS VELO (B2B) --- */}
                {activeTab === 'partners' && (
                    <PartnersMarketplace />
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
                                                    const labels = { orders: 'Pedidos', products: 'Cardápio', customers: 'Clientes', store_settings: 'Loja', integrations: 'Integrações', marketing: 'Marketing', finance: 'Financeiro', team: 'Equipe' };
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
                                        <div className="flex flex-col gap-2 border-t border-slate-50 pt-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingTeamId(member.id); setTeamForm(member); setIsTeamModalOpen(true); }} className="flex-1 p-2 bg-slate-50 rounded-xl text-blue-600 font-bold text-xs uppercase hover:bg-blue-100 transition-all flex justify-center items-center gap-2"><Edit3 size={16} /> Editar</button>
                                                <button onClick={() => window.confirm("Remover usuário?") && deleteDoc(doc(db, "team", member.id))} className="flex-1 p-2 bg-slate-50 rounded-xl text-red-600 font-bold text-xs uppercase hover:bg-red-100 transition-all flex justify-center items-center gap-2"><Trash2 size={16} /> Excluir</button>
                                            </div>
                                            <button onClick={() => handleResetPassword(member.email)} className="w-full p-2 bg-slate-50 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-all flex justify-center items-center gap-2"><RefreshCw size={16} /> Enviar Nova Senha</button>
                                        </div>
                                   </div>
                                ))
                            )}
                        </div>

                        {/* NOVO: AUDITORIA DE CAIXA (SÓ ADMIN VÊ) */}
                        <div className="mt-12 pt-8 border-t border-slate-200">
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <Clock size={24} className="text-blue-600"/> Auditoria de Caixa (Log de PDV)
                            </h2>
                            <p className="text-slate-400 font-bold mb-6 text-sm">Monitore a que horas seus funcionários abriram e fecharam o sistema.</p>
                            
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden max-h-96 overflow-y-auto custom-scrollbar p-2">
                                {posLogs.length === 0 ? (
                                    <p className="text-center text-slate-400 font-bold p-8">Nenhum registro de caixa encontrado.</p>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50">
                                                <th className="p-4 rounded-tl-xl">Data / Hora</th>
                                                <th className="p-4">Funcionário</th>
                                                <th className="p-4">E-mail</th>
                                                <th className="p-4 rounded-tr-xl">Ação no Sistema</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-slate-700">
                                            {posLogs.map(log => (
                                                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="p-4">
                                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : 'Agora mesmo...'}
                                                    </td>
                                                    <td className="p-4 flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] uppercase">
                                                            {log.userName.charAt(0)}
                                                        </div>
                                                        {log.userName}
                                                    </td>
                                                    <td className="p-4 text-xs text-slate-500">{log.userEmail}</td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.action === 'ABRIU O CAIXA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
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
                                <p className="text-[10px] font-black uppercase text-slate-400">Status do Plano</p>
                                {(() => {
                                    const status = storeStatus?.billingStatus || 'pendente';
                                    if (status === 'pago') return <span className="bg-green-500 text-white px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1 shadow-lg shadow-green-200">✅ PAGO / PRO</span>;
                                    if (status === 'gratis_vitalicio') return <span className="bg-purple-500 text-white px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1 shadow-lg shadow-purple-200">🎁 CORTESIA VIP</span>;
                                    if (status === 'teste') return <span className="bg-blue-500 text-white px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1 shadow-lg shadow-blue-200">🧪 EM TESTE</span>;
                                    if (status === 'bloqueado') return <span className="bg-red-500 text-white px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1 shadow-lg shadow-red-200 animate-pulse">🚫 BLOQUEADO</span>;
                                    return <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full font-black text-xs uppercase inline-block mt-1">⚠️ FATURA PENDENTE</span>;
                                })()}
                            </div>
                        </div>
{/* --- DESTAQUE: VELOPAY NATIVO --- */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[3rem] shadow-2xl border-4 border-blue-500/30 flex flex-col justify-between mb-8 relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 bg-blue-500 w-64 h-64 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-lg"><Landmark size={28}/></div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase text-white italic leading-none">VeloPay <span className="text-blue-400">Bank</span></h3>
                                        <p className="text-xs font-medium text-slate-300 mt-1">Sua conta digital nativa (As menores taxas do Brasil).</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-700 items-center gap-1 shadow-inner">
                                    <ShieldCheck size={12} className="text-blue-400"/> Efí Bank
                                </div>
                            </div>

                            {!storeStatus?.velopayStatus || storeStatus?.velopayStatus === 'unconfigured' ? (
                                <div className="relative z-10 bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-md">
                                    <div className="mb-10 bg-slate-900/50 rounded-[2rem] border border-white/10 p-6 shadow-inner animate-in fade-in zoom-in">
                                        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-5 flex items-center gap-2">
                                            <Wallet size={16} className="text-blue-400"/> Taxas e Condições do VeloPay
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* CARD TAXA PIX */}
                                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-blue-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-1"><QrCode size={14}/> PIX NATIVO</span>
                                                        <span className="bg-green-500/20 text-green-400 text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest border border-green-500/30">Ativo Padrão</span>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-end mb-2 mt-4">
                                                        <p className="text-slate-400 text-[10px] font-bold uppercase">Taxa Aplicada</p>
                                                        <select 
                                                            disabled={storeStatus?.velopayStatus !== 'active'}
                                                            className={`bg-slate-900 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-slate-700 px-2 py-1 outline-none ${storeStatus?.velopayStatus !== 'active' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            value={storeStatus?.velopayPixPlan || 'd0'}
                                                            onChange={async (e) => {
                                                                await updateDoc(doc(db, "stores", storeId), { velopayPixPlan: e.target.value });
                                                            }}
                                                        >
                                                            <option value="d30">Receber em 30 dias</option>
                                                            <option value="d14">Receber em 15 dias</option>
                                                            <option value="d1">Receber em 24h (D+1)</option>
                                                        </select>
                                                </div>

                                                <div className="flex items-end gap-1 mt-3">
                                                    <p className="text-white font-black text-3xl italic leading-none">
                                                        {storeStatus?.velopayPixPlan === 'd30' ? '1,49%' : storeStatus?.velopayPixPlan === 'd14' ? '2,00%' : '2,59%'}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] mt-4 font-bold bg-white/5 p-2 rounded-lg flex justify-between items-center text-blue-300">
                                               <span>Saque disponível {storeStatus?.velopayPixPlan === 'd30' ? 'em 30 dias' : storeStatus?.velopayPixPlan === 'd14' ? 'em 15 dias' : 'no mesmo dia (D+0)'}.</span>
                                            </p>
                                        </div>

                                        {/* CARD TAXA CARTÃO E TOGGLE (Opcional) */}
                                        <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${storeStatus?.velopayCreditStatus === 'active' ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-white/5'}`}>
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className={`${storeStatus?.velopayCreditStatus === 'active' ? 'text-blue-400' : 'text-slate-400'} font-black text-[10px] uppercase tracking-widest flex items-center gap-1 transition-colors`}><CreditCard size={14}/> CARTÃO DE CRÉDITO</span>
                                                    
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            disabled={storeStatus?.velopayStatus !== 'active'}
                                                            className="sr-only peer disabled:cursor-not-allowed"
                                                            checked={storeStatus?.velopayCreditStatus === 'active'}
                                                            onChange={async (e) => {
                                                                if (storeStatus?.velopayStatus !== 'active') return alert("Ative sua conta VeloPay primeiro!");
                                                                const newVal = e.target.checked ? 'active' : 'inactive';
                                                                await updateDoc(doc(db, "stores", storeId), { velopayCreditStatus: newVal });
                                                            }}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                                    </label>
                                                </div>
                                                
                                                <div className="flex justify-between items-end mb-2 mt-4">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase">Taxa Aplicada</p>
                                                    <select 
                                                        disabled={storeStatus?.velopayStatus !== 'active'}
                                                        className={`bg-slate-900 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-slate-700 px-2 py-1 outline-none ${storeStatus?.velopayStatus !== 'active' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        value={storeStatus?.velopayCreditPlan || 'd30'}
                                                        onChange={async (e) => {
                                                            await updateDoc(doc(db, "stores", storeId), { velopayCreditPlan: e.target.value });
                                                        }}
                                                    >
                                                        <option value="d30">Receber em 30 dias</option>
                                                        <option value="d14">Receber em 15 dias</option>
                                                        <option value="d1">Receber em 24h (D+1)</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-end gap-1 mt-3">
                                                    <p className={`font-black text-3xl italic leading-none transition-colors ${storeStatus?.velopayCreditStatus === 'active' ? 'text-white' : 'text-slate-500'}`}>
                                                        {storeStatus?.velopayCreditPlan === 'd1' ? '5,99%' : storeStatus?.velopayCreditPlan === 'd14' ? '5,49%' : '4,99%'}
                                                    </p>
                                                    <span className="text-xs font-bold text-slate-500 mb-1">+ R$ 0,39</span>
                                                </div>
                                            </div>
                                            <div className={`mt-4 bg-white/5 p-2 rounded-lg flex flex-col gap-1 transition-colors ${storeStatus?.velopayCreditStatus === 'active' ? 'text-blue-300' : 'text-slate-500'}`}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-[10px] font-bold">Saque disponível {storeStatus?.velopayPixPlan === 'd30' ? 'em 30 dias' : storeStatus?.velopayPixPlan === 'd14' ? 'em 15 dias' : 'no mesmo dia (D+0)'}.</span>
                                                    {storeStatus?.velopayCreditStatus === 'active' && <span className="text-[10px] font-bold">Ativado ✅</span>}
                                                </div>
                                                <span className="text-white/50 text-[8px] uppercase font-bold">⚠️ Taxa mínima de R$ 1,50 por transação.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* ========================================== */}
                                    <h4 className="text-white font-black uppercase tracking-widest text-sm mb-6 border-b border-white/10 pb-4">Ativar Recebimento Nativo</h4>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setIsSubmittingVeloPay(true);
                                        // Simulação de delay de envio
                                        setTimeout(async () => {
                                            await updateDoc(doc(db, "stores", storeId), {
                                                velopayStatus: 'pending_review',
                                                velopayData: veloPayForm
                                            }, { merge: true });
                                            setIsSubmittingVeloPay(false);
                                            alert("📄 Documentação enviada! Em breve sua conta VeloPay será ativada pela Efí Bank.");
                                        }, 1500);
                                    }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Razão Social / Nome Completo</label>
                                            <input 
                                                type="text" required
                                                value={veloPayForm.legalName} onChange={e => setVeloPayForm({...veloPayForm, legalName: e.target.value})}
                                                className="w-full p-4 bg-slate-800/50 text-white rounded-2xl font-bold border border-slate-700 focus:ring-2 ring-blue-500 outline-none transition-all placeholder-slate-600" 
                                                placeholder="Conforme documento oficial" 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">CPF ou CNPJ</label>
                                            <input 
                                                type="text" required
                                                value={veloPayForm.document} onChange={e => setVeloPayForm({...veloPayForm, document: e.target.value})}
                                                className="w-full p-4 bg-slate-800/50 text-white rounded-2xl font-bold border border-slate-700 focus:ring-2 ring-blue-500 outline-none transition-all placeholder-slate-600" 
                                                placeholder="Apenas números" 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">WhatsApp de Contato</label>
                                            <input 
                                                type="tel" required
                                                value={veloPayForm.phone} onChange={e => setVeloPayForm({...veloPayForm, phone: e.target.value})}
                                                className="w-full p-4 bg-slate-800/50 text-white rounded-2xl font-bold border border-slate-700 focus:ring-2 ring-blue-500 outline-none transition-all placeholder-slate-600" 
                                                placeholder="(DD) 90000-0000" 
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-2 pt-4 mt-2 border-t border-slate-700">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">Dados de Saque (Recebimento)</h3>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Chave PIX Recebedora</label>
                                            <div className="relative">
                                                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" size={18} />
                                                <input 
                                                    type="text" required
                                                    value={veloPayForm.pixKey} onChange={e => setVeloPayForm({...veloPayForm, pixKey: e.target.value})}
                                                    className="w-full p-4 pl-12 bg-green-900/20 text-green-100 rounded-2xl font-black border border-green-800/50 focus:ring-2 ring-green-500 outline-none transition-all placeholder-green-700/50" 
                                                    placeholder="Sua chave PIX cadastrada no CNPJ/CPF acima" 
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 mt-4">
                                            <button 
                                                type="submit"
                                                disabled={isSubmittingVeloPay}
                                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/50 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isSubmittingVeloPay ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18}/>}
                                                {isSubmittingVeloPay ? 'Enviando Dados Seguros...' : 'Solicitar Ativação VeloPay'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : storeStatus?.velopayStatus === 'pending_review' ? (
                                <div className="relative z-10 bg-orange-500/10 border border-orange-500/20 p-8 rounded-3xl backdrop-blur-md text-center">
                                    <Loader2 className="animate-spin text-orange-400 mx-auto mb-4" size={32} />
                                    <h4 className="text-orange-400 font-black uppercase tracking-widest mb-2">Conta em Análise</h4>
                                    <p className="text-orange-200/70 text-sm font-medium">Sua documentação foi enviada com segurança para a Efí Bank. Em breve o Pix Nativo estará liberado.</p>
                                </div>
                            ) : (
                                /* Conta Ativa / Pausada - Dashboard Interno */
                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Coluna 1: Saldo e Saque */}
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between">
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Total VeloPay</p>
                                        <h2 className="text-4xl font-black italic text-white mb-2">R$ {velopayBalance.toFixed(2)}</h2>
                                        
                                        <div className="flex flex-col gap-2 mb-4">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ciclo de Repasse (Pix)</label>
                                            <select 
                                                className="bg-slate-900 text-blue-400 text-xs font-black uppercase rounded-xl border border-slate-700 p-3 outline-none cursor-pointer w-full shadow-inner disabled:opacity-50"
                                                disabled={storeStatus?.velopayStatus !== 'active'}
                                                value={storeStatus?.velopayPixPlan || 'd30'}
                                                onChange={async (e) => {
                                                    if(window.confirm("Alterar o ciclo mudará a taxa cobrada por transação. Confirmar?")) {
                                                        await updateDoc(doc(db, "stores", storeId), { velopayPixPlan: e.target.value }, { merge: true });
                                                    }
                                                }}
                                            >
                                                <option value="d30">Em 30 dias (Taxa 2,59%)</option>
                                                <option value="d14">Em 15 dias (Taxa 2,99%)</option>
                                                <option value="d1">Em 24h/D+1 (Taxa 3,59%)</option>
                                                <option value="d0">Na Hora / D+0 (Taxa 3,99%)</option>
                                            </select>
                                        </div>

                                        <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-2xl mb-6">
                                            <p className="text-orange-400 text-xs font-bold flex items-center gap-2">
                                                <Shield size={16}/> Atenção: Repasse Manual
                                            </p>
                                            <p className="text-slate-400 text-[10px] mt-1">
                                                Para sua segurança, os pedidos são auditados. Seu saque será enviado para a chave PIX cadastrada ({storeStatus?.velopayData?.pixKey}) conforme o prazo do seu plano.
                                            </p>
                                        </div>

                                        <button 
                                            onClick={handleRequestWithdraw}
                                            disabled={storeStatus?.velopayPixPlan !== 'd0' || isProcessingWithdraw}
                                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30"
                                        >
                                            {isProcessingWithdraw ? 'Processando...' : (storeStatus?.velopayPixPlan !== 'd0' ? 'Bloqueado p/ Ciclo' : 'Confirmar Saque Agora')}
                                        </button>
                                    </div>
                                    
                                    {/* Coluna 2: Status do VeloPay (Ativo ou Pausado) */}
                                    {storeStatus?.velopayStatus === 'active' ? (
                                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col justify-center items-center text-center">
                                            <p className="text-green-400 font-black flex items-center gap-2 uppercase tracking-widest text-sm mb-2">✅ VeloPay Ativo</p>
                                            <p className="text-slate-300 text-xs font-medium mb-4">As transações via Pix já estão sendo processadas nativamente pela sua conta.</p>
                                            
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm("⚠️ Tem certeza que deseja desativar o VeloPay? \n\nSua loja perderá as taxas reduzidas e o checkout nativo instantâneo.")) {
                                                        await updateDoc(doc(db, "stores", storeId), { 
                                                            velopayStatus: 'inactive',
                                                            velopayCreditStatus: 'inactive'
                                                        });
                                                        alert("VeloPay desativado com sucesso.");
                                                    }
                                                }}
                                                className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <X size={14}/> Desativar VeloPay
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-3xl backdrop-blur-md flex flex-col justify-center items-center text-center">
                                            <p className="text-slate-400 font-black flex items-center gap-2 uppercase tracking-widest text-sm mb-2">⏸️ VeloPay Pausado</p>
                                            <p className="text-slate-500 text-xs font-medium mb-6">Sua conta está inativa. Seus clientes não poderão usar o checkout nativo.</p>
                                            
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm("Deseja reativar o VeloPay para receber pagamentos novamente?")) {
                                                        await updateDoc(doc(db, "stores", storeId), { 
                                                            velopayStatus: 'active'
                                                        });
                                                        alert("VeloPay reativado com sucesso!");
                                                    }
                                                }}
                                                className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all active:scale-95"
                                            >
                                                Reativar VeloPay
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* --- HISTÓRICO DE SAQUES VELOPAY --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
                            <h3 className="text-2xl font-black uppercase text-slate-800 italic mb-6 flex items-center gap-2"><Banknote size={24} className="text-blue-600"/> Histórico de Repasses</h3>
                            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                {withdrawalsList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                        <p className="font-bold text-slate-500">Nenhum saque solicitado ainda.</p>
                                    </div>
                                ) : (
                                    withdrawalsList.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0)).map(withdrawal => (
                                        <div key={withdrawal.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${withdrawal.status === 'paid' ? 'bg-green-100 text-green-600' : withdrawal.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    <Wallet size={20}/>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-700 uppercase">Saque VeloPay</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                        Solicitado: {withdrawal.requestedAt?.toDate ? new Date(withdrawal.requestedAt.toDate()).toLocaleDateString('pt-BR') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="font-black text-lg text-slate-800">R$ {Number(withdrawal.amount).toFixed(2)}</p>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${withdrawal.status === 'paid' ? 'text-green-600' : withdrawal.status === 'rejected' ? 'text-red-600' : 'text-amber-500'}`}>
                                                        {withdrawal.status === 'paid' ? '✅ CONCLUÍDO' : withdrawal.status === 'rejected' ? '❌ RECUSADO' : '⏳ PENDENTE'}
                                                    </p>
                                                </div>
                                                {/* Botão de Comprovante - Só aparece se o Admin colar o link lá no Firebase */}
                                                {withdrawal.receiptUrl && (
                                                    <a href={withdrawal.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors" title="Ver Comprovante">
                                                        <FileText size={20} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        {/* NOVO CARD: STRIPE CONNECT */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                            <div className="flex items-center gap-2 mb-6">
                                <Landmark size={24} className="text-blue-600"/>
                                <h3 className="text-2xl font-black uppercase text-slate-800 italic">Recebimento de Vendas <span className="text-xs not-italic font-medium text-slate-400 normal-case ml-2">(Stripe Connect)</span></h3>
                            </div>

                            {/* --- INFO DE TAXAS STRIPE --- */}
                            <div className="grid grid-cols-1 gap-4 mb-6">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 mb-3"><CreditCard size={14}/> CARTÃO DE CRÉDITO</p>
                                    <p className="font-black text-3xl italic text-slate-800 leading-none">5,99% <span className="text-xs text-slate-500 not-italic font-bold">+ R$ 0,39</span></p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2">Recebimento padrão em 30 dias (D+30).</p>
                                </div>
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
                                    <div className="flex gap-2">
    <button 
        onClick={handleOpenStripeDashboard} 
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2"
    >
        Ver Extrato e Saques <ExternalLink size={16} />
    </button>
    
    {/* NOVO BOTÃO PARA DESCONECTAR A STRIPE */}
    <button 
        onClick={async () => {
            if(window.confirm("Deseja desconectar a Stripe?")) {
                await updateDoc(doc(db, "stores", storeId), {
                    stripeConnectId: null
                });
                alert("Stripe desconectada com sucesso.");
            }
        }} 
        className="bg-red-100 hover:bg-red-200 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase shadow-sm transition-all active:scale-95 flex items-center gap-2"
    >
        Desconectar
    </button>
</div>
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
                       {/* NOVO CARD: MERCADO PAGO CONNECT */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                            <div className="flex items-center gap-2 mb-6">
                                <Landmark size={24} className="text-blue-600"/>
                                <h3 className="text-2xl font-black uppercase text-slate-800 italic">Recebimento via Mercado Pago <span className="text-xs not-italic font-medium text-slate-400 normal-case ml-2">(PIX e Cartão)</span></h3>
                            </div>

                            {/* --- INFO DE TAXAS MERCADO PAGO --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 mb-3"><QrCode size={14}/> PIX MERCADO PAGO</p>
                                    <p className="font-black text-3xl italic text-blue-800 leading-none">4,99%</p>
                                    <p className="text-[10px] font-bold text-blue-500 mt-2">Recebimento na hora.</p>
                                </div>
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 mb-3"><CreditCard size={14}/> CARTÃO DE CRÉDITO</p>
                                    <div className="flex items-end gap-2">
                                        <p className="font-black text-3xl italic text-blue-800 leading-none">5,49%</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-blue-500 mt-2">Recebimento padrão da plataforma (D+30).</p>
                                </div>
                            </div>
                            
                            {settings?.integrations?.mercadopago?.accessToken ? (
                                <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <p className="text-green-800 font-black flex items-center gap-2 uppercase tracking-widest text-sm">✅ Conta Mercado Pago Conectada</p>
                                        <p className="text-green-600 font-bold text-xs mt-1">UserID do Lojista: {settings.integrations.mercadopago.userId}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={async () => {
                                            if(window.confirm("Deseja desconectar o Mercado Pago? O lojista perderá o PIX/Cartão até conectar de novo.")) {
                                                await updateDoc(doc(db, "settings", storeId), {
                                                    "integrations.mercadopago": null
                                                });
                                                alert("Mercado Pago desconectado.");
                                            }
                                        }} 
                                        className="bg-red-100 hover:bg-red-200 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center flex flex-col items-center justify-center gap-4">
                                    <p className="text-slate-500 font-bold text-sm">Autorize a Velo Delivery a processar pagamentos de Cartão e PIX direto na sua conta do Mercado Pago.</p>
                                    <button 
                                        onClick={handleConectarMercadoPago} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Landmark size={20}/> 🤝 Integrar Mercado Pago
                                    </button>
                                </div>
                           )}
                        </div>

                        {/* --- CARD ATUALIZADO: CONTROLE DE MEIOS DE PAGAMENTO (ENTREGA E BALCÃO) --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="bg-slate-50 p-3 rounded-2xl text-slate-600"><CreditCard size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase text-slate-800 italic leading-none">Opções de Pagamento</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1">Quais métodos de pagamento você aceita na sua loja?</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* CANAL 1: PAGAMENTOS ONLINE (APP) */}
                                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                                    <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <ExternalLink size={16} className="text-blue-500"/> Pagamentos Online (App)
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        
                                        {/* --- INÍCIO: GUIA EDUCATIVO VALE REFEIÇÃO --- */}
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 flex items-center gap-2 mb-2">
                                                <ShieldCheck size={14} className="text-blue-600"/> Como aceitar Vale Refeição?
                                            </h4>
                                            <ol className="text-[10px] text-blue-700 font-medium mb-4 space-y-1.5 ml-3 list-decimal marker:font-black">
                                                <li>Sua conta do Mercado Pago precisa ter o <strong>CNAE de Alimentação</strong> (Restaurante, Lanchonete, etc).</li>
                                                <li>Você precisa ser credenciado nas bandeiras (Alelo, Sodexo, Ticket).</li>
                                                <li>Vincule o seu código de afiliação dentro do painel do Mercado Pago.</li>
                                            </ol>
                                            <a 
                                                href="https://www.mercadopago.com.br/vouchers" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                            >
                                                Configurar no Mercado Pago <ExternalLink size={12}/>
                                            </a>
                                        </div>
                                        {/* --- FIM: GUIA EDUCATIVO VALE REFEIÇÃO --- */}

                                        {[
                                            { id: 'online', label: '💳 CARTÃO DE CRÉDITO' },
                                            { id: 'pix', label: '⚡ PIX AUTOMÁTICO' },
                                            { id: 'offline_pix', label: '💠 PIX COPIA E COLA' },
                                            { id: 'voucherOnline', label: '🎟️ VALE REFEIÇÃO (APP)' },
                                        ].map(pm => {
                                            const isActive = storeStatus.acceptedPayments?.[pm.id] ?? true; 
                                            return (
                                                <label key={pm.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isActive ? 'bg-white border-blue-400 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${isActive ? 'text-blue-800' : 'text-slate-500'}`}>{pm.label}</span>
                                                    <input type="checkbox" checked={isActive} onChange={async (e) => {
                                                        const currentPayments = storeStatus.acceptedPayments || { online: true, pix: true, cardDelivery: true, cashDelivery: true, cardPickup: true, cashPickup: true };
                                                        const newPayments = { ...currentPayments, [pm.id]: e.target.checked };
                                                        setStoreStatus(prev => ({...prev, acceptedPayments: newPayments}));
                                                        await updateDoc(doc(db, "stores", storeId), { acceptedPayments: newPayments }, { merge: true });
                                                    }} className="w-5 h-5 rounded-md accent-blue-600 cursor-pointer" />
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* CANAL 2: NA ENTREGA */}
                                <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100">
                                    <h3 className="text-[11px] font-black text-orange-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Truck size={16} className="text-orange-500"/> Na Entrega (Motoboy)
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { id: 'cardDelivery', label: '💳 MÁQUINA DE CARTÃO' },
                                            { id: 'cashDelivery', label: '💵 DINHEIRO EM ESPÉCIE' },
                                            { id: 'voucherDelivery', label: '🎟️ VALE REFEIÇÃO (MÁQUINA)' },
                                        ].map(pm => {
                                            const isActive = storeStatus.acceptedPayments?.[pm.id] ?? true; 
                                            return (
                                                <label key={pm.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isActive ? 'bg-white border-orange-400 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${isActive ? 'text-orange-800' : 'text-slate-500'}`}>{pm.label}</span>
                                                    <input type="checkbox" checked={isActive} onChange={async (e) => {
                                                        const currentPayments = storeStatus.acceptedPayments || { online: true, pix: true, cardDelivery: true, cashDelivery: true, cardPickup: true, cashPickup: true };
                                                        const newPayments = { ...currentPayments, [pm.id]: e.target.checked };
                                                        setStoreStatus(prev => ({...prev, acceptedPayments: newPayments}));
                                                        await updateDoc(doc(db, "stores", storeId), { acceptedPayments: newPayments }, { merge: true });
                                                    }} className="w-5 h-5 rounded-md accent-orange-600 cursor-pointer" />
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* CANAL 3: NA RETIRADA */}
                                <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
                                    <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Store size={16} className="text-emerald-500"/> Na Retirada (Balcão)
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { id: 'cardPickup', label: '💳 MÁQUINA DE CARTÃO' },
                                            { id: 'cashPickup', label: '💵 DINHEIRO EM ESPÉCIE' },
                                            { id: 'voucherPickup', label: '🎟️ VALE REFEIÇÃO (MÁQUINA)' },
                                        ].map(pm => {
                                            const isActive = storeStatus.acceptedPayments?.[pm.id] ?? true; 
                                            return (
                                                <label key={pm.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isActive ? 'bg-white border-emerald-400 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${isActive ? 'text-emerald-800' : 'text-slate-500'}`}>{pm.label}</span>
                                                    <input type="checkbox" checked={isActive} onChange={async (e) => {
                                                        const currentPayments = storeStatus.acceptedPayments || { online: true, pix: true, cardDelivery: true, cashDelivery: true, cardPickup: true, cashPickup: true };
                                                        const newPayments = { ...currentPayments, [pm.id]: e.target.checked };
                                                        setStoreStatus(prev => ({...prev, acceptedPayments: newPayments}));
                                                        await updateDoc(doc(db, "stores", storeId), { acceptedPayments: newPayments }, { merge: true });
                                                    }} className="w-5 h-5 rounded-md accent-emerald-600 cursor-pointer" />
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Card da Fatura */}
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                                <div className="absolute top-0 right-0 p-12 opacity-10"><Wallet size={200}/></div>
                                
                                <div className="relative z-10">
                                    {(() => {
                                        let diaVencimento = 10; 
                                        if (storeStatus?.createdAt) {
                                            const dataCriacao = storeStatus.createdAt.toDate ? storeStatus.createdAt.toDate() : new Date(storeStatus.createdAt);
                                            if (!isNaN(dataCriacao)) diaVencimento = dataCriacao.getDate();
                                        }
                                        return <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Fatura Atual (Venc. dia {diaVencimento})</p>;
                                    })()}
                                    
                                    <h2 className="text-6xl font-black italic tracking-tighter">
                                        {storeStatus?.billingStatus === 'gratis_vitalicio' ? 'R$ 0,00' : `R$ ${invoiceData.total.toFixed(2)}`}
                                    </h2>
                                    
                                    <div className="mt-8 space-y-3">
                                        <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                                            <span className="text-slate-400">Manutenção Base (SaaS)</span>
                                            <span className="font-bold">{storeStatus?.billingStatus === 'gratis_vitalicio' ? <span className="text-purple-400">Cortesia VIP</span> : `R$ ${invoiceData.basePlan.toFixed(2)}`}</span>
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

                                {storeStatus?.billingStatus === 'gratis_vitalicio' ? (
                                    <div className="w-full bg-purple-600/20 text-purple-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-purple-500/30">
                                        🎁 Plano Cortesia Ativo
                                    </div>
                                ) : storeStatus?.billingStatus === 'pago' ? (
                                    <div className="w-full bg-green-600/20 text-green-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-green-500/30">
                                        ✅ Fatura Paga
                                    </div>
                                ) : (
                                    <button onClick={() => setShowPixModal(true)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <QrCode size={20}/> Pagar Fatura via PIX
                                    </button>
                                )}
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
                                                {invoiceData.cycleOrdersCount || 0} / 100 Req.
                                            </span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, ((invoiceData.cycleOrdersCount || 0) / 100) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Ciclo atual ({invoiceData.cycleStartStr} a {invoiceData.cycleEndStr}). Acima de 100, custo de R$ 0,25/req.</p>
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
                                        <p className="text-lg font-black text-slate-800">
                                            {invoiceData.cycleStartStr || '--/--'} a {invoiceData.cycleEndStr || '--/--'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Histórico de Faturas (Gerado Dinamicamente) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><FileText size={20}/> Histórico de Faturas</h3>
                            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                {(() => {
                                    let history = [...(storeStatus?.faturasHistorico || [])];
                                    
                                    if (storeStatus?.createdAt) {
                                        const dataCriacao = storeStatus.createdAt.toDate ? storeStatus.createdAt.toDate() : new Date(storeStatus.createdAt);
                                        if (!isNaN(dataCriacao)) {
                                            let diaVencimento = storeStatus?.billingDay || 9;
                                            if (history.length > 0 && history[history.length - 1].dueDate) {
                                                const dataRef = new Date(history[history.length - 1].dueDate);
                                                if (!isNaN(dataRef)) diaVencimento = dataRef.getDate();
                                            }
                                            
                                            const hoje = new Date();
                                            let iteradorMes = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth() + 1, 1);
                                            
                                            while (iteradorMes < hoje && (iteradorMes.getMonth() !== hoje.getMonth() || iteradorMes.getFullYear() !== hoje.getFullYear())) {
                                                const nomeMesAno = iteradorMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                                const dataVencimentoReal = new Date(iteradorMes.getFullYear(), iteradorMes.getMonth(), Math.min(diaVencimento, 28)); 
                                                const jaExiste = history.some(f => f.month.toLowerCase().includes(nomeMesAno.split(' ')[0].toLowerCase()));
                                                
                                                if (!jaExiste) {
                                                    const isCortesia = storeStatus?.billingStatus === 'gratis_vitalicio';
                                                    history.push({
                                                        id: `auto_${iteradorMes.getTime()}`,
                                                        month: nomeMesAno,
                                                        amount: isCortesia ? 'R$ 0,00' : 'R$ 49,90',
                                                        status: isCortesia ? 'ISENTO' : 'PAGO',
                                                        dueDate: dataVencimentoReal,
                                                        isAuto: true,
                                                        breakdown: { basePlan: 49.90, extraOrdersCost: 0, discount: isCortesia ? 49.90 : 0 }
                                                    });
                                                }
                                                iteradorMes.setMonth(iteradorMes.getMonth() + 1);
                                            }
                                        }
                                    }

                                    history.sort((a, b) => {
                                        const dateA = a.dueDate || (a.createdAt ? new Date(a.createdAt) : new Date(0));
                                        const dateB = b.dueDate || (b.createdAt ? new Date(b.createdAt) : new Date(0));
                                        return dateB - dateA;
                                    });

                                    if (history.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                                <p className="font-bold text-slate-500">Nenhum histórico de fatura.</p>
                                                <p className="text-xs text-slate-400 mt-1">As faturas dos meses anteriores aparecerão aqui.</p>
                                            </div>
                                        );
                                    }

                                    return history.map(fat => {
                                        let displayDate = 'Sem data';
                                        try {
                                            if (fat.dueDate) displayDate = new Date(fat.dueDate).toLocaleDateString('pt-BR');
                                            else if (fat.createdAt) displayDate = new Date(fat.createdAt).toLocaleDateString('pt-BR');
                                        } catch(e) {}
                                        
                                        return (
                                            <div key={fat.id} onClick={() => setSelectedInvoice(fat)} className="cursor-pointer flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl transition-colors ${fat.status === 'PAGO' ? 'bg-green-100 text-green-600 group-hover:bg-green-200' : fat.status === 'ISENTO' ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-200' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'}`}>
                                                        <FileText size={20}/>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-700 uppercase group-hover:text-blue-600 transition-colors">{fat.month}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                            Vencimento: <span className="text-slate-600">{displayDate}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div>
                                                        <p className={`font-black text-lg ${fat.status === 'ISENTO' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                            {fat.status === 'ISENTO' && (fat.amount === 'R$ 0,00' || fat.amount === 'R$ 0.00') ? 'R$ 49,90' : fat.amount}
                                                        </p>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${fat.status === 'PAGO' ? 'text-green-600' : fat.status === 'ISENTO' ? 'text-purple-600' : 'text-amber-500'}`}>
                                                            {fat.status}
                                                        </p>
                                                    </div>
                                                    <ExternalLink size={16} className="text-slate-300 group-hover:text-blue-500" />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'store_settings' && (
                    <div className="space-y-8">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Configurações</h1>
                        
                        {/* NOVO: MÓDULOS AVANÇADOS (ATIVAÇÃO DE INSUMOS) */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2 mb-4">
                                ⚙️ Módulos Avançados
                            </h2>
                            <label className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 hover:bg-slate-100 transition-all rounded-2xl border border-slate-200">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-700 uppercase">Controle de Insumos (Ficha Técnica)</span>
                                    <span className="text-xs text-slate-500 font-bold mt-0.5">Ativa a aba de gestão de matérias-primas e a Ficha Técnica nos produtos.</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={settings?.enableIngredientsControl || false}
                                    onChange={async (e) => {
                                        await updateDoc(doc(db, "settings", storeId), { enableIngredientsControl: e.target.checked }, { merge: true });
                                    }}
                                    className="w-6 h-6 accent-blue-600 cursor-pointer"
                                />
                            </label>

                            {/* NOVO: ATIVAR/DESATIVAR GESTÃO DE FIADO */}
                            <label className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 hover:bg-slate-100 transition-all rounded-2xl border border-slate-200 mt-4">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-700 uppercase">Gestão de Fiado (Caderneta)</span>
                                    <span className="text-xs text-slate-500 font-bold mt-0.5">Ativa a opção de fiado no PDV e o relatório de devedores na aba Clientes VIP.</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={settings?.enableFiado || false}
                                    onChange={async (e) => {
                                        await updateDoc(doc(db, "settings", storeId), { enableFiado: e.target.checked }, { merge: true });
                                    }}
                                    className="w-6 h-6 accent-blue-600 cursor-pointer"
                                />
                            </label>
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

                        {/* --- INÍCIO: SOM DE NOTIFICAÇÃO DO CHAT (NOVO) --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                <Bell size={24} className="text-blue-600"/> Som do Chat (WhatsApp)
                            </h2>
                            <p className="text-xs font-bold text-slate-400 mb-4">Escolha qual música/efeito sonoro tocará quando um cliente mandar mensagem.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sons Padrões do Sistema</label>
                                    <select 
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 cursor-pointer text-slate-700"
                                        value={settings?.chatSound || 'default'}
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            let url = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
                                            if (val === 'bell') url = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
                                            if (val === 'cash') url = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
                                            
                                            // Se não for customizado, salva no banco e no localStorage
                                            if (val !== 'custom') {
                                                localStorage.setItem('custom_chat_sound', url);
                                                await updateDoc(doc(db, "settings", storeId), { chatSound: val, chatSoundUrl: url }, { merge: true });
                                                new Audio(url).play(); // Toca uma prévia
                                                alert("Som atualizado!");
                                            } else {
                                                await updateDoc(doc(db, "settings", storeId), { chatSound: 'custom' }, { merge: true });
                                            }
                                        }}
                                    >
                                        <option value="default">🔔 Padrão (Suave)</option>
                                        <option value="bell">🛎️ Sino de Loja</option>
                                        <option value="cash">🪙 Moeda (Cash)</option>
                                        <option value="custom">🎵 Meu Próprio MP3 (Upload)</option>
                                    </select>
                                </div>

                                {settings?.chatSound === 'custom' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                        <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Upload do seu MP3</label>
                                        
                                        <input type="file" accept=".mp3,audio/mpeg" id="chat-sound-upload" className="hidden" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if(!file) return;
                                            
                                            // Valida tamanho (máx 2MB pra não pesar)
                                            if (file.size > 2 * 1024 * 1024) return alert("O áudio deve ter no máximo 2MB.");
                                            
                                            try {
                                                // Mostra um aviso pro lojista
                                                const btn = document.getElementById('btn-upload-sound');
                                                const oldText = btn.innerText;
                                                btn.innerText = "Enviando...";
                                                btn.disabled = true;

                                                // Sobe pro Cloudinary
                                                const url = await uploadImageToCloudinary(file);
                                                
                                                // Salva no Banco e no Cache local da máquina
                                                await updateDoc(doc(db, "settings", storeId), { chatSoundUrl: url }, { merge: true });
                                                localStorage.setItem('custom_chat_sound', url);
                                                
                                                btn.innerText = oldText;
                                                btn.disabled = false;
                                                
                                                // Toca o som pra confirmar
                                                new Audio(url).play();
                                                alert("✅ Seu toque personalizado foi salvo!");
                                            } catch (err) {
                                                alert("Erro ao enviar o MP3. Tente novamente.");
                                            }
                                        }}/>
                                        
                                        <div className="flex items-center gap-3">
                                            <label id="btn-upload-sound" htmlFor="chat-sound-upload" className="flex-1 bg-white border-2 border-dashed border-blue-300 text-blue-600 p-3 rounded-xl font-bold text-xs text-center cursor-pointer hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                                                <UploadCloud size={16}/> Escolher Arquivo MP3
                                            </label>
                                            {settings?.chatSoundUrl && settings?.chatSound === 'custom' && (
                                                <button onClick={() => new Audio(settings.chatSoundUrl).play()} className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700" title="Ouvir Toque">
                                                    ▶️
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-blue-500 mt-2 font-bold">Dica: Escolha trechos curtos (1 a 3 segundos) para não enjoar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* --- FIM: SOM DE NOTIFICAÇÃO DO CHAT --- */}
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

{/* --- NOVO SELETOR DE TIPOGRAFIA (FONTE DA LOJA) --- */}
<div className="mt-8 pt-8 border-t border-slate-100">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">✍️ Tipografia da Loja (Estilo da Fonte)</label>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
       {[
            { id: 'default', label: 'Padrão', font: 'Sistema', desc: 'Original do App' },
            { id: 'modern', label: 'Moderna', font: 'Montserrat', desc: 'Conveniência / Tech' },
            { id: 'robust', label: 'Robusta', font: 'Oswald', desc: 'Burger / Carnes' },
            { id: 'elegant', label: 'Elegante', font: 'Playfair Display', desc: 'Adega / Vinhos' },
            { id: 'custom', label: 'Personalizado', font: 'Aa', desc: 'Google Fonts' }
        ].map(tipografia => (
            <button
                key={tipografia.id}
                onClick={() => updateDoc(doc(db, "stores", storeId), { storeFont: tipografia.id }, { merge: true })}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${storeStatus.storeFont === tipografia.id || (!storeStatus.storeFont && tipografia.id === 'default') ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
            >
                <span className="text-2xl font-black text-slate-700" style={{ fontFamily: tipografia.font !== 'Aa' ? tipografia.font : 'inherit' }}>{tipografia.font}</span>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase block">{tipografia.label}</span>
                    <span className="text-[8px] text-slate-500 font-bold">{tipografia.desc}</span>
                </div>
            </button>
        ))}
    </div>

    <AnimatePresence>
        {storeStatus.storeFont === 'custom' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                <h4 className="text-sm font-black text-slate-700 uppercase mb-4">🔤 Nome da Fonte (Google Fonts)</h4>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Digite o nome exato de qualquer fonte gratuita do Google Fonts (Ex: Roboto, Poppins, Lato)</label>
                    <input 
                        type="text" 
                        value={storeStatus.customFont || ''}
                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { customFont: e.target.value }, { merge: true })}
                        className="w-full p-4 bg-white rounded-2xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700"
                        placeholder="Ex: Poppins"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-bold">
                        O sistema fará o download da fonte automaticamente para a loja do cliente. Verifique o nome exato no site <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">fonts.google.com</a>.
                    </p>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
</div>
{/* --- NOVO: CONFIGURAÇÕES DE CHECKOUT E ESTOQUE (CLIENTE) --- */}
<div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
    <h2 className="text-2xl font-black text-slate-800 uppercase mb-4 flex items-center gap-2">🛒 Experiência de Compra (App Cliente)</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COMPORTAMENTO DO CARRINHO */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-blue-500"/> Ação ao Adicionar Produto</h3>
            <select 
                value={storeStatus.addToCartBehavior || 'stay'} 
                onChange={(e) => updateDoc(doc(db, "stores", storeId), { addToCartBehavior: e.target.value }, { merge: true })}
                className="w-full p-4 bg-white rounded-xl font-bold text-sm outline-none border border-slate-200 focus:ring-2 ring-blue-500 cursor-pointer"
            >
                <option value="stay">Exibir Pop-up "Continuar Comprando"</option>
                <option value="redirect">Ir direto para a tela do Carrinho</option>
            </select>
            <p className="text-[10px] text-slate-400 font-bold mt-2">Define o que acontece no app quando o cliente clica em "Adicionar ao Carrinho".</p>
        </div>

       {/* PESQUISA DE ENDEREÇO (CHECKOUT) */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={16} className="text-red-500"/> Método de Busca no Checkout</h3>
            
            <div className="flex flex-col gap-2">
                <select 
                    value={storeStatus.checkoutSearchMethod || 'cep'} 
                    onChange={(e) => updateDoc(doc(db, "stores", storeId), { checkoutSearchMethod: e.target.value }, { merge: true })}
                    className="w-full p-4 bg-white rounded-xl font-bold text-sm outline-none border border-slate-200 focus:ring-2 ring-blue-500 cursor-pointer text-slate-700"
                >
                    <option value="cep">📍 Busca por CEP (Correios)</option>
                    <option value="address">🗺️ Busca por Nome da Rua/Bairro</option>
                </select>
                <p className="text-[10px] text-slate-400 font-bold ml-1">Define como o cliente deve encontrar o endereço de entrega no App.</p>
            </div>

            <label className="flex items-center justify-between cursor-pointer bg-white p-3 rounded-xl border border-slate-200 mt-2">
                <span className="font-bold text-xs text-slate-700">Tornar Nº da Residência Obrigatório</span>
                <input type="checkbox" checked={storeStatus.checkoutRequireNumber !== false} onChange={(e) => updateDoc(doc(db, "stores", storeId), { checkoutRequireNumber: e.target.checked }, { merge: true })} className="w-5 h-5 accent-blue-600 cursor-pointer" />
            </label>
        </div>

       {/* CAMPO DE PONTO DE ESTOQUE */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-2"><Package size={16} className="text-orange-500"/> Ponto de Estoque Ativo</h3>
                <p className="text-[10px] text-slate-400 font-bold">Digite o número ou nome do ponto de estoque (Ex: 1, 2, 10, Matriz).</p>
            </div>
            <input 
                type="text"
                placeholder="Ex: 1"
                value={storeStatus.stockLocation || ''} 
                onChange={(e) => {
                    // Atualiza a tela imediatamente e salva no Firebase
                    setStoreStatus(prev => ({...prev, stockLocation: e.target.value}));
                    updateDoc(doc(db, "stores", storeId), { stockLocation: e.target.value }, { merge: true });
                }}
                className="w-full md:w-64 p-4 bg-white rounded-xl font-black text-sm uppercase outline-none border border-slate-200 focus:ring-2 ring-orange-400 text-slate-700 placeholder-slate-300"
            />
        </div>

    </div>
</div>
                        {/* 2. Informações e Mensagem */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
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

                                {/* NOVO CAMPO: CHAVE PIX INDEPENDENTE (COBRANÇAS) */}
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <QrCode size={14} className="text-blue-500"/> Chave PIX da Loja (Para Cobranças)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Sua chave PIX (CNPJ, Telefone, E-mail ou Aleatória)" 
                                        value={storeStatus.pixKey || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { pixKey: e.target.value }, { merge: true })} 
                                        className="w-full p-5 bg-blue-50 text-blue-700 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-400 placeholder-blue-300" 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 ml-2">Usada para gerar cobranças no WhatsApp (Clientes VIP/Fiado).</p>
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

                                {/* --- NOVOS CAMPOS: SEO E REDES SOCIAIS --- */}
                                <div className="pt-6 mt-6 border-t border-slate-100">
                                    <h3 className="text-sm font-black text-slate-700 uppercase mb-4 flex items-center gap-2">
                                        <Globe size={16} className="text-blue-500" /> Presença Online e SEO
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Categoria no Google (SEO)</label>
                                            <select 
                                                value={storeStatus.seoCategory || 'restaurant'} 
                                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { seoCategory: e.target.value }, { merge: true })}
                                                className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                            >
                                                <option value="burger">Hamburgueria / Fast Food</option>
                                                <option value="pizza">Pizzaria / Massas</option>
                                                <option value="sweet">Açaiteria / Doceria</option>
                                                <option value="restaurant">Restaurante / Marmitaria</option>
                                                <option value="default">Conveniência / Bebidas</option>
                                                <option value="natural">Hortifruti / Natural</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Faixa de Preço no Google</label>
                                            <select 
                                                value={storeStatus.priceRange || '$$'} 
                                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { priceRange: e.target.value }, { merge: true })}
                                                className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600 outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                                            >
                                                <option value="$">$ (Barato)</option>
                                                <option value="$$">$$ (Moderado)</option>
                                                <option value="$$$">$$$ (Caro)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Link do Instagram</label>
                                            <input 
                                                type="url" 
                                                placeholder="Ex: https://instagram.com/sualoja" 
                                                value={storeStatus.instagramUrl || ''} 
                                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { instagramUrl: e.target.value }, { merge: true })} 
                                                className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600 outline-none focus:ring-2 ring-blue-500" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-2">Link do Facebook</label>
                                            <input 
                                                type="url" 
                                                placeholder="Ex: https://facebook.com/sualoja" 
                                                value={storeStatus.facebookUrl || ''} 
                                                onChange={(e) => updateDoc(doc(db, "stores", storeId), { facebookUrl: e.target.value }, { merge: true })} 
                                                className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none text-slate-600 outline-none focus:ring-2 ring-blue-500" 
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                        {/* --- NOVO: DOMÍNIO PRÓPRIO (WHITE-LABEL) --- */}
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-700 space-y-6 mt-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Globe size={150}/></div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-white uppercase mb-2 flex items-center gap-3">
                                            <Globe className="text-blue-400"/> Domínio Próprio
                                        </h2>
                                        <p className="text-sm font-medium text-slate-300 mb-6">Use seu próprio endereço (ex: www.sualoja.com.br) para passar mais autoridade e decolar seu ranqueamento no Google.</p>

                                        <div className="bg-slate-800/50 border border-slate-600 p-6 md:p-8 rounded-3xl">
                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Qual domínio você deseja conectar?</label>
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: cowburguer.com.br" 
                                                    value={storeStatus.customDomain || ''} 
                                                    onChange={(e) => setStoreStatus(prev => ({...prev, customDomain: e.target.value.toLowerCase().replace(/\s/g, '')}))}
                                                    className="flex-1 p-5 bg-slate-900 rounded-2xl font-bold border border-slate-700 text-white outline-none focus:ring-2 ring-blue-500 transition-all placeholder-slate-600" 
                                                    disabled={storeStatus.domainStatus === 'ativo'}
                                                />
                                                <button 
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        if(!storeStatus.customDomain) return alert("Digite o domínio que você deseja configurar!");
                                                        if(!storeStatus.customDomain.includes('.')) return alert("O formato do domínio está incorreto. Use ponto (ex: seudelivery.com.br)");
                                                        
                                                        try {
                                                            await updateDoc(doc(db, "stores", storeId), { 
                                                                customDomain: storeStatus.customDomain,
                                                                domainStatus: 'pendente_dns'
                                                            });
                                                            alert("Domínio reservado! Veja as instruções de configuração que apareceram na tela.");
                                                        } catch(err) {
                                                            alert("Erro ao salvar domínio.");
                                                        }
                                                    }}
                                                    className={`px-8 py-5 rounded-2xl font-black uppercase tracking-widest transition-all text-xs ${storeStatus.domainStatus === 'ativo' ? 'bg-green-500/20 text-green-400 cursor-not-allowed border border-green-500/30' : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/50'}`}
                                                    disabled={storeStatus.domainStatus === 'ativo'}
                                                >
                                                    {storeStatus.domainStatus === 'ativo' ? '✅ Domínio Ativo' : 'Solicitar Ativação'}
                                                </button>
                                            </div>

                                            {/* INSTRUÇÕES DE DNS DINÂMICAS */}
                                            {storeStatus.domainStatus === 'pendente_dns' && (
                                                <div className="mt-6 bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                    <h4 className="text-blue-400 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><Server size={16}/> Configuração Obrigatória de DNS</h4>
                                                    <p className="text-xs text-slate-300 mb-6 leading-relaxed">Para que o seu site carregue no novo domínio, acesse o painel onde você comprou o domínio (Registro.br, Hostinger, Locaweb, etc) e crie os dois apontamentos abaixo na Zona de DNS:</p>
                                                    
                                                    <div className="space-y-3 font-mono text-[10px] md:text-xs">
                                                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                                            <span className="text-slate-400">TIPO: <strong className="text-white bg-slate-800 px-2 py-1 rounded">A</strong></span>
                                                            <span className="text-slate-400">NOME (HOST): <strong className="text-white bg-slate-800 px-2 py-1 rounded">@</strong> <span className="text-[9px]">(ou deixe em branco)</span></span>
                                                            <span className="text-slate-400">VALOR (DESTINO): <strong className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded select-all">76.76.21.21</strong></span>
                                                        </div>
                                                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                                            <span className="text-slate-400">TIPO: <strong className="text-white bg-slate-800 px-2 py-1 rounded">CNAME</strong></span>
                                                            <span className="text-slate-400">NOME (HOST): <strong className="text-white bg-slate-800 px-2 py-1 rounded">www</strong></span>
                                                            <span className="text-slate-400">VALOR (DESTINO): <strong className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded select-all">cname.vercel-dns.com</strong></span>
                                                        </div>
                                                    </div>
                                                   <div className="mt-6 flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl">
                                                        <div className="animate-pulse"><Clock size={20} className="text-orange-400"/></div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed flex-1">
                                                            A propagação do DNS pode levar até 24h. Após configurar no seu provedor, clique no botão abaixo para o sistema verificar se a internet já reconheceu o seu novo domínio.
                                                        </p>
                                                    </div>

                                                    <button 
    id="btn-check-dns"
    onClick={async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="flex items-center gap-2 justify-center"><svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Consultando Satélites...</span>';
        btn.disabled = true;

        try {
            // 1. Limpa o domínio caso o cliente tenha colado "https://" ou "www." ou "/"
            let rawDomain = storeStatus.customDomain || '';
            rawDomain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

            // 2. Consulta a API Pública do Google DNS
            const resA = await fetch(`https://dns.google/resolve?name=${rawDomain}&type=A`);
            const dataA = await resA.json();

            const resCname = await fetch(`https://dns.google/resolve?name=www.${rawDomain}&type=CNAME`);
            const dataCname = await resCname.json();

            // 3. Analisa as respostas
            const hasA = dataA.Answer && dataA.Answer.length > 0;
            const hasCname = dataCname.Answer && dataCname.Answer.length > 0;

            const isVercelA = hasA && dataA.Answer.some(r => r.data === '76.76.21.21');
            const isVercelCname = hasCname && dataCname.Answer.some(r => String(r.data).includes('vercel'));
            
            // Verifica se o IP retornado é da rede da Cloudflare (104.x ou 172.x)
            const isCloudflare = hasA && dataA.Answer.some(r => r.data.startsWith('104.') || r.data.startsWith('172.'));

            const aprovarDominio = async () => {
                await updateDoc(doc(db, "stores", storeId), { domainStatus: 'ativo', customDomain: rawDomain });
                setStoreStatus(prev => ({...prev, domainStatus: 'ativo', customDomain: rawDomain})); 
                alert("✅ SUCESSO! Domínio ativado. Sua loja já está rodando no novo endereço!");
            };

            // 4. Árvore de Decisão Lógica
            if (isVercelA || isVercelCname) {
                // Cenário 1: Apontamento Perfeito para a Vercel (Passa Direto)
                await aprovarDominio();
            } else if (isCloudflare) {
                // Cenário 2: Proxy da Cloudflare mascarando o IP
                if(window.confirm(`⚠️ Detectamos que você usa a Cloudflare.\n\nSeu domínio está com IP mascarado. Se a sua loja JÁ ESTÁ ABRINDO normalmente ao digitar 'www.${rawDomain}' no navegador, clique em [OK] para forçar a ativação.`)) {
                    await aprovarDominio();
                }
            } else if (hasA || hasCname) {
                // Cenário 3: O domínio responde, mas com IP diferente do esperado (Pode ser provedor local ou delay de cache)
                const ipEncontrado = hasA ? dataA.Answer[0].data : 'CNAME diferente';
                if(window.confirm(`⚠️ O domínio responde pelo destino [${ipEncontrado}], que não é o IP padrão da plataforma.\n\nSe você tem certeza que a configuração foi feita corretamente e a loja JÁ ESTÁ ABRINDO no seu celular, clique em [OK] para Forçar a Ativação.`)) {
                    await aprovarDominio();
                }
            } else {
                // Cenário 4: NXDOMAIN (Não propagou nada de fato em nenhum lugar do mundo)
                alert(`⏳ O domínio '${rawDomain}' ainda não está respondendo na rede mundial.\n\nAguarde a propagação dos servidores do seu provedor (Registro.br, Hostinger, Locaweb) e tente novamente em algumas horas.`);
            }
        } catch(err) {
            // Cenário 5: Erro de Rede ou Navegador/AdBlock bloqueando a API do Google
            if(window.confirm(`🚨 Erro de comunicação com o verificador de DNS (Pode ser o seu AdBlock).\n\nSe você TEM CERTEZA que a loja já está acessível no seu domínio personalizado, clique em [OK] para forçar a ativação no sistema.`)) {
                await updateDoc(doc(db, "stores", storeId), { domainStatus: 'ativo' });
                setStoreStatus(prev => ({...prev, domainStatus: 'ativo'})); 
            }
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }}
    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
>
    <Globe size={16} /> Verificar Propagação Agora
</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            {/* --- NOVO BLOCO: LOCALIZAÇÃO E REGRAS --- */}
                            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 mt-6">
                                <h2 className="text-2xl font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <MapPin size={24}/> Localização e Regras
                                </h2>

                                {/* --- NOVO: CONTROLE MESTRE DE LOGÍSTICA (SEPARADO POR CANAL) --- */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-100">
                                    {/* CANAL 1: LOJA ONLINE (APP) */}
                                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                                        <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <ExternalLink size={16} className="text-blue-500"/> Loja Online (App Cliente)
                                        </h3>
                                        <div className="flex flex-col gap-3">
                                            <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${storeStatus.deliveryEnabled !== false ? 'bg-white border-blue-400 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                                <div>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${storeStatus.deliveryEnabled !== false ? 'text-blue-800' : 'text-slate-500'}`}>🛵 Habilitar Delivery</span>
                                                </div>
                                                <input type="checkbox" checked={storeStatus.deliveryEnabled !== false} onChange={(e) => updateDoc(doc(db, "stores", storeId), { deliveryEnabled: e.target.checked }, { merge: true })} className="w-5 h-5 rounded-md accent-blue-600 cursor-pointer" />
                                            </label>

                                            <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${storeStatus.pickupEnabled !== false ? 'bg-white border-blue-400 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                                <div>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${storeStatus.pickupEnabled !== false ? 'text-blue-800' : 'text-slate-500'}`}>🏪 Habilitar Retirada</span>
                                                </div>
                                                <input type="checkbox" checked={storeStatus.pickupEnabled !== false} onChange={(e) => updateDoc(doc(db, "stores", storeId), { pickupEnabled: e.target.checked }, { merge: true })} className="w-5 h-5 rounded-md accent-blue-600 cursor-pointer" />
                                            </label>
                                        </div>
                                    </div>

                                    {/* CANAL 2: FRENTE DE CAIXA (PDV/BALCÃO) */}
                                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                                        <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Store size={16} className="text-slate-500"/> Frente de Caixa (Painel PDV)
                                        </h3>
                                        <div className="flex flex-col gap-3">
                                            <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${storeStatus.posDeliveryEnabled !== false ? 'bg-white border-slate-400 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`}>
                                                <div>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${storeStatus.posDeliveryEnabled !== false ? 'text-slate-800' : 'text-slate-500'}`}>🛵 Lançar Delivery</span>
                                                </div>
                                                <input type="checkbox" checked={storeStatus.posDeliveryEnabled !== false} onChange={(e) => updateDoc(doc(db, "stores", storeId), { posDeliveryEnabled: e.target.checked }, { merge: true })} className="w-5 h-5 rounded-md accent-slate-600 cursor-pointer" />
                                            </label>

                                            <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${storeStatus.posPickupEnabled !== false ? 'bg-white border-slate-400 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`}>
                                                <div>
                                                    <span className={`font-black uppercase tracking-tight text-xs ${storeStatus.posPickupEnabled !== false ? 'text-slate-800' : 'text-slate-500'}`}>🏪 Lançar Balcão/Mesa</span>
                                                </div>
                                                <input type="checkbox" checked={storeStatus.posPickupEnabled !== false} onChange={(e) => updateDoc(doc(db, "stores", storeId), { posPickupEnabled: e.target.checked }, { merge: true })} className="w-5 h-5 rounded-md accent-slate-600 cursor-pointer" />
                                            </label>

                                            {/* NOVO: AUTOMAÇÃO DE IMPRESSÃO E VIAS */}
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className={`p-4 rounded-2xl border-2 transition-all ${(storeStatus.autoPrintStatus && storeStatus.autoPrintStatus !== 'none') || (storeStatus.autoPrintCompleted && !storeStatus.autoPrintStatus) ? 'bg-white border-blue-400 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`}>
                                                    <div className="flex flex-col gap-3">
                                                        <div>
                                                            <span className={`font-black uppercase tracking-tight text-xs ${(storeStatus.autoPrintStatus && storeStatus.autoPrintStatus !== 'none') || (storeStatus.autoPrintCompleted && !storeStatus.autoPrintStatus) ? 'text-blue-800' : 'text-slate-500'}`}>🖨️ Auto-imprimir Pedido</span>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1">Imprime o ticket assim que o pedido atingir o status abaixo:</p>
                                                        </div>
                                                        <select 
                                                            value={storeStatus.autoPrintStatus || (storeStatus.autoPrintCompleted ? 'completed' : 'none')} 
                                                            onChange={(e) => {
                                                                setStoreStatus(prev => ({...prev, autoPrintStatus: e.target.value}));
                                                                updateDoc(doc(db, "stores", storeId), { autoPrintStatus: e.target.value }, { merge: true });
                                                            }} 
                                                            className="w-full p-3 bg-white rounded-xl font-bold text-xs text-slate-700 outline-none border border-slate-200 focus:ring-2 ring-blue-500 cursor-pointer"
                                                        >
                                                            <option value="none">🚫 Desativado</option>
                                                            <option value="pending">⏳ Ao Receber (Novo Pedido)</option>
                                                            <option value="preparing">👨‍🍳 Ao Marcar como Preparando</option>
                                                            <option value="delivery">🏍️ Ao Despachar (Em Rota)</option>
                                                            <option value="completed">✅ Ao Concluir (Entregue)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Formato de Impressão (Vias)</label>
                                                    <select 
                                                        value={storeStatus.printMode || 'both'} 
                                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { printMode: e.target.value }, { merge: true })}
                                                        className="w-full p-3 bg-white rounded-xl font-bold text-xs text-slate-700 outline-none border border-slate-200 focus:ring-2 ring-blue-500 cursor-pointer"
                                                    >
                                                        <option value="both">📄 Imprimir 2 Vias (Loja + Entregador)</option>
                                                        <option value="kitchen">🍳 Imprimir 1 Via (Apenas Cozinha)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
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

                               {/* --- VALOR MÍNIMO DO PEDIDO --- */}
                                <div className="pt-4 border-t border-slate-100 mt-4 mb-4">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-2 flex items-center gap-2">
                                        <Banknote size={14} className="text-green-500"/> Valor Mínimo do Pedido (R$)
                                    </label>
                                    <input 
                                        type="number" step="0.01" 
                                        placeholder="Ex: 20.00 (Deixe 0 para aceitar qualquer valor)" 
                                        className="w-full p-5 bg-slate-50 rounded-2xl font-black text-slate-700 border-none outline-none focus:ring-2 ring-green-400"
                                        value={storeStatus.minOrderValue || ''} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { minOrderValue: Number(e.target.value) }, { merge: true })}
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">Impede que o cliente finalize o pedido se o subtotal (sem frete) for menor que este valor.</p>
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

                        {/* --- INÍCIO: MODO FÉRIAS / FERIADO --- */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mt-6 mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
                                        <Palmtree size={24} className="text-emerald-500"/> Modo Férias / Feriado
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1">
                                        Programe dias em que a loja estará fechada. O robô avisará os clientes automaticamente.
                                    </p>
                                </div>
                                <label className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${storeStatus.vacationMode?.active ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-slate-50 border-transparent opacity-60 hover:bg-slate-100'}`}>
                                    <span className={`font-black uppercase tracking-tight text-xs ${storeStatus.vacationMode?.active ? 'text-emerald-800' : 'text-slate-500'}`}>
                                        {storeStatus.vacationMode?.active ? 'Férias Programadas' : 'Ativar Modo Férias'}
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={storeStatus.vacationMode?.active || false} 
                                        onChange={(e) => updateDoc(doc(db, "stores", storeId), { "vacationMode.active": e.target.checked }, { merge: true })}
                                        className="w-6 h-6 accent-emerald-600 cursor-pointer"
                                    />
                                </label>
                            </div>

                            {storeStatus.vacationMode?.active && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                                    <div>
                                        <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-2 ml-1">Início (Data e Hora)</label>
                                        <input 
                                            type="datetime-local" 
                                            value={storeStatus.vacationMode?.start || ''} 
                                            onChange={(e) => updateDoc(doc(db, "stores", storeId), { "vacationMode.start": e.target.value }, { merge: true })}
                                            className="w-full p-4 bg-white rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-emerald-400 border border-emerald-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-2 ml-1">Retorno (Data e Hora)</label>
                                        <input 
                                            type="datetime-local" 
                                            value={storeStatus.vacationMode?.end || ''} 
                                            onChange={(e) => updateDoc(doc(db, "stores", storeId), { "vacationMode.end": e.target.value }, { merge: true })}
                                            className="w-full p-4 bg-white rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-emerald-400 border border-emerald-100"
                                        />
                                    </div>
                                    <div className="md:col-span-2 mt-2">
                                        <p className="text-[10px] text-emerald-700 font-bold bg-emerald-100 p-3 rounded-xl border border-emerald-200">
                                            💡 O Robô do WhatsApp enviará a sua mensagem de "Loja Fechada" automaticamente para qualquer cliente que mandar mensagem entre o Início e o Retorno configurados acima.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* --- FIM: MODO FÉRIAS / FERIADO --- */}

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
                                                <div className="flex flex-col gap-2 flex-1 w-full">
                                                    {/* Primeiro Turno */}
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input 
                                                            type="time" 
                                                            value={dayConfig.start || ''} 
                                                            onChange={(e) => handleScheduleChange(day.id, 'start', e.target.value)}
                                                            className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                        />
                                                        <span className="font-bold text-slate-300">até</span>
                                                        <input 
                                                            type="time" 
                                                            value={dayConfig.end || ''} 
                                                            onChange={(e) => handleScheduleChange(day.id, 'end', e.target.value)}
                                                            className="p-3 bg-slate-100 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                                                        />
                                                        {/* Botão de Adicionar/Remover 2º Turno */}
                                                        <button 
                                                            onClick={() => handleScheduleChange(day.id, 'splitShift', !dayConfig.splitShift)} 
                                                            className={`p-3 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${dayConfig.splitShift ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} 
                                                            title={dayConfig.splitShift ? "Remover 2º Turno" : "Adicionar 2º Turno (Ex: Almoço e Janta)"}
                                                        >
                                                            {dayConfig.splitShift ? <MinusSquare size={18}/> : <PlusSquare size={18}/>}
                                                        </button>
                                                    </div>

                                                    {/* Segundo Turno (Visível apenas se o botão de + for clicado) */}
                                                    {dayConfig.splitShift && (
                                                        <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase w-4 text-center">E</span>
                                                            <input 
                                                                type="time" 
                                                                value={dayConfig.start2 || ''} 
                                                                onChange={(e) => handleScheduleChange(day.id, 'start2', e.target.value)}
                                                                className="p-3 bg-orange-50 text-orange-700 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-orange-200"
                                                            />
                                                            <span className="font-bold text-slate-300">até</span>
                                                            <input 
                                                                type="time" 
                                                                value={dayConfig.end2 || ''} 
                                                                onChange={(e) => handleScheduleChange(day.id, 'end2', e.target.value)}
                                                                className="p-3 bg-orange-50 text-orange-700 rounded-xl font-bold text-sm w-full outline-none focus:ring-2 ring-orange-200"
                                                            />
                                                            <div className="w-[42px] flex-shrink-0"></div> {/* Espaçador para manter alinhamento simétrico */}
                                                        </div>
                                                    )}
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
                            id: 'google_my_business', 
                            name: 'Google Meu Negócio', 
                            desc: 'Sincronize avaliações e poste ofertas direto do painel Velo.', 
                            icon: <FaStore className="text-blue-500" size={40}/>, 
                            fields:[
                                {key: 'locationId', label: 'ID do Local (Google Location ID)'},
                                {key: 'accessToken', label: 'Token de Acesso (Gerado pelo Backend)'}
                            ],
                            helpUrl: 'https://business.google.com/locations',
                            helpText: 'Conectar Conta Google e Buscar ID'
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
                                                <p className="text-xs text-slate-400 mt-2 font-medium line-clamp-2">
                                                    {app.desc}
                                                </p>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    // BLINDAGEM OAUTH: Se for o Google, ignora o Modal manual e faz o fluxo automático
                                                    if (app.id === 'google_my_business' && !isConnected) {
                                                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                                        const authUrl = isLocal 
                                                            ? `http://localhost:3000/api/google-auth?storeId=${storeId}` 
                                                            : `https://app.velodelivery.com.br/api/google-auth?storeId=${storeId}`;
                                                        window.location.href = authUrl;
                                                        return;
                                                    }
                                                    
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

            {/* --- RODAPÉ MOBILE:1 ESTRUTURA REVISADA --- */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-0 flex flex-col lg:hidden z-50"> 
               {/* Barra da Versão e Atualização Mobile */}
               <div className="w-full flex justify-between items-center px-3 pt-1.5 pb-1 border-b border-slate-50/10">
                    <span className="text-[8px] font-medium text-slate-300">Veloapp V{systemUpdate.version}</span>
                    <button onClick={() => setIsUpdateModalOpen(true)} className="flex items-center gap-1 text-[8px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full transition-all">
                        <RefreshCw size={10} /> Atualizar Painel
                    </button>
                </div>
                {/* Botões de Navegação */}
                <div className="flex justify-around overflow-x-auto whitespace-nowrap p-2 gap-2">
                    {allNavItems
                        .filter(item => item.id !== 'ingredients' || settings?.enableIngredientsControl)
                        .filter(item => hasPermission(item.id)) // <--- FILTRO DE PERMISSÃO APLICADO AQUI
                        .map(item => {
                        const badgeCount = getBadgeCount(item.id);
                        return (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center relative px-3 py-1 rounded-lg flex-shrink-0 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
                                <div className="relative">
                                    {item.mobileIcon}
                                    {badgeCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-white animate-pulse">
                                            {badgeCount > 99 ? '99+' : badgeCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold mt-1">{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* MODAIS (CÓDIGO MANTIDO IGUAL AO SEU) */}
           <AnimatePresence>
                {isIngredientModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl">
                            <button onClick={() => setIsIngredientModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-6">{editingIngredientId ? 'Editar' : 'Novo'} Insumo</h2>
                            <form onSubmit={async (e) => { 
                                e.preventDefault(); 
                                try { 
                                    const dataToSave = { ...ingredientForm, stock: Number(ingredientForm.stock), storeId: storeId }; 
                                    if (editingIngredientId) await updateDoc(doc(db, "ingredients", editingIngredientId), dataToSave); 
                                    else await addDoc(collection(db, "ingredients"), dataToSave); 
                                    setIsIngredientModalOpen(false); 
                                    alert("Insumo salvo com sucesso!"); 
                                } catch (error) { 
                                    alert("Erro ao salvar: " + error.message); 
                                } 
                            }} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-2">Nome do Insumo (Ex: Pão sem Glúten)</label>
                                    <input type="text" placeholder="Nome" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={ingredientForm.name} onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-2">Quantidade em Estoque</label>
                                        <input type="number" placeholder="Ex: 50" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={ingredientForm.stock} onChange={e => setIngredientForm({ ...ingredientForm, stock: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-2">Medida (un, kg, g)</label>
                                        <input type="text" placeholder="Ex: un" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={ingredientForm.unit} onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value })} required />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl mt-4 hover:bg-blue-700 active:scale-95 transition-all">Salvar Insumo</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCatModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
                            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X /></button>
                            <h2 className="text-2xl font-black uppercase mb-6">{editingCatId ? 'Editar' : 'Nova'} Categoria</h2>
                           <form onSubmit={async (e) => { e.preventDefault(); try { const dataToSave = { 
    ...catForm, 
    order: Number(catForm.order) || 0, 
    isActive: catForm.isActive !== false,
    storeId: storeId 
}; if (editingCatId) await updateDoc(doc(db, "categories", editingCatId), dataToSave); else await addDoc(collection(db, "categories"), dataToSave); setIsCatModalOpen(false); alert("Categoria salva!"); } catch (error) { alert("Erro ao salvar."); } }}>
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
                                <label className={`flex items-center justify-between p-4 rounded-2xl border-2 mb-4 cursor-pointer transition-all ${catForm.isActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
    <div className="flex flex-col">
        <span className={`font-black uppercase text-xs ${catForm.isActive ? 'text-green-700' : 'text-slate-500'}`}>
            {catForm.isActive ? '✅ Categoria Ativa' : '🚫 Categoria Oculta'}
        </span>
        <span className="text-[10px] font-bold text-slate-400">Clientes não verão categorias ocultas no App.</span>
    </div>
    <input 
        type="checkbox" 
        checked={catForm.isActive} 
        onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
        className="w-6 h-6 accent-green-600 cursor-pointer"
    />
</label>
                                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl mt-4 hover:bg-blue-700 active:scale-95 transition-all">
                                    Salvar Categoria
                                </button>
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
                                    removables: form.removables ? form.removables.split(',').map(v => v.trim()).filter(v => v) :[],
                                    isActive: form.isActive !== false,
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
                                            placeholder="Breve Descrição do Produto (Ex: Hambúrguer artesanal com blend bovino grelhado...)" 
                                            className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none focus:ring-2 ring-blue-500 transition-all" 
                                            value={form.description} 
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        ></textarea>
                                        
                                        {/* MEDIDOR DE FORÇA DE SEO / IA */}
                                        {(() => {
                                            const desc = form.description || '';
                                            const length = desc.length;
                                            
                                            // Análise Semântica Básica para IA (Entity Resolution)
                                            const hasKeywords = /(artesanal|grelhado|fresco|blend|caseiro|especial|tradicional|premium|bairro|região)/i.test(desc);
                                            
                                            let score = 0;
                                            let color = 'bg-slate-200';
                                            let text = 'Oculto para Buscas (Muito Curto)';
                                            let textColor = 'text-slate-500';

                                            if (length > 10) { score = 33; color = 'bg-red-400'; text = 'Fraco (Cardápio Mudo)'; textColor = 'text-red-600'; }
                                            if (length > 30) { score = 66; color = 'bg-orange-400'; text = 'Bom (Aceitável)'; textColor = 'text-orange-600'; }
                                            if (length > 50 && hasKeywords) { score = 100; color = 'bg-green-500'; text = 'Excelente (Pronto para IAs)'; textColor = 'text-green-600'; }

                                            return (
                                                <div className="mt-3 px-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                            <Sparkles size={12}/> Força para o Google/IAs:
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase ${textColor}`}>
                                                            {text}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${color} transition-all duration-500`} 
                                                            style={{ width: `${score}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-1.5 leading-tight">
                                                        {score < 100 ? "IAs preferem descrições longas contendo os ingredientes, tipo de preparo (ex: artesanal, grelhado) e relevância local." : "Perfeito! As inteligências artificiais têm contexto rico para recomendar este produto."}
                                                    </p>
                                                </div>
                                            );
                                        })()}
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


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 ml-2">Estoque Disponível</label>
                                        <input type="number" placeholder="Ex: 100" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                                    </div>
                                    <label className="flex items-center gap-3 p-6 bg-cyan-50 rounded-3xl cursor-pointer border border-cyan-100 hover:bg-cyan-100 transition-all h-[72px]">
                                        <input type="checkbox" checked={form.isChilled || false} onChange={e => setForm({ ...form, isChilled: e.target.checked })} className="w-6 h-6 accent-cyan-600 cursor-pointer" />
                                        <span className="font-black text-cyan-800 uppercase tracking-widest text-sm">❄️ Entregar Gelada</span>
                                    </label>
                                </div>

                               <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold border-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Selecione a Categoria</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-blue-600 ml-2 flex items-center gap-2">
                                        <Tags size={14} className="text-blue-500"/> Tags Semânticas (Atributos para IA)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Contém Lactose, Serve 2 pessoas, Apimentado, Artesanal..." 
                                        className="w-full p-6 bg-blue-50 text-blue-800 rounded-3xl outline-none font-bold border-none mt-1 focus:ring-2 ring-blue-400 transition-all placeholder-blue-300 shadow-sm" 
                                        value={form.tag || ''} 
                                        onChange={e => setForm({ ...form, tag: e.target.value })} 
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2 ml-4 font-bold">
                                        Separado por vírgula. Estas tags viram código estruturado (Schema) para o Google e IAs recomendarem o seu prato com precisão.
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100">
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

                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <label className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-1 ml-2">
                                        <MinusSquare size={14}/> O que pode ser removido? (Separado por vírgula)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Alface, Tomate, Milho, Maionese" 
                                        className="w-full p-6 bg-red-50 text-red-800 rounded-3xl outline-none font-bold border-none mt-1 focus:ring-2 ring-red-300 transition-all placeholder-red-300" 
                                        value={form.removables || ''} 
                                        onChange={e => setForm({ ...form, removables: e.target.value })} 
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 ml-4 font-bold">Cria uma lista para o cliente marcar o que deseja TIRAR do lanche.</p>
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
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Flame size={14} className="text-orange-500"/> Compre Junto (Upsell)
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-2">Selecione produtos para sugerir no carrinho:</p>
                                    
                                    <div className="mb-3 relative">
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Buscar produto para indicar..." 
                                            className="w-full p-3 pl-10 bg-slate-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 ring-orange-300"
                                            value={upsellSearch}
                                            onChange={(e) => setUpsellSearch(e.target.value)}
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    </div>
                                    
                                    <div className="flex gap-2 flex-wrap bg-slate-50 p-4 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                                        {products.filter(p => p.id !== editingId && p.name.toLowerCase().includes(upsellSearch.toLowerCase())).map(p => {
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
                               {/* --- INÍCIO: FICHA TÉCNICA (BAIXA DE INSUMOS) --- */}
                                {settings?.enableIngredientsControl && (
                                    <div className="pt-6 border-t border-slate-100 mt-4">
                                        <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-1 ml-2">
                                            📦 Ficha Técnica (Baixa Automática)
                                        </label>
                                        <p className="text-[10px] text-slate-400 mt-1 mb-3 ml-2 font-bold">Marque os insumos que compõem este lanche. Ao vender, o sistema descontará do estoque global invisivelmente.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            {ingredients.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum insumo global cadastrado na aba de Insumos.</span>}
                                            {ingredients.map(ing => {
                                                const selected = (form.consumedIngredients || []).find(ci => ci.ingredientId === ing.id);
                                                const isChecked = !!selected;
                                                return (
                                                    <div key={ing.id} className={`flex items-center justify-between bg-white p-3 rounded-xl border transition-all ${isChecked ? 'border-blue-400 shadow-sm' : 'border-slate-200 hover:border-blue-200'}`}>
                                                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    let current = form.consumedIngredients || [];
                                                                    if (e.target.checked) {
                                                                        current.push({ ingredientId: ing.id, qty: 1 });
                                                                    } else {
                                                                        current = current.filter(ci => ci.ingredientId !== ing.id);
                                                                    }
                                                                    setForm({...form, consumedIngredients: current});
                                                                }}
                                                                className="accent-blue-600 w-5 h-5 cursor-pointer"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700 leading-tight">{ing.name}</span>
                                                                <span className="text-[9px] text-slate-400 font-black uppercase mt-0.5">Estoque: {ing.stock} {ing.unit}</span>
                                                            </div>
                                                        </label>
                                                        {isChecked && (
                                                            <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd:</span>
                                                                <input 
                                                                    type="number" 
                                                                    min="0.01"
                                                                    step="any"
                                                                    value={selected.qty}
                                                                    onChange={(e) => {
                                                                        const current = [...form.consumedIngredients];
                                                                        const index = current.findIndex(ci => ci.ingredientId === ing.id);
                                                                        if(index !== -1) {
                                                                            current[index].qty = Number(e.target.value);
                                                                            setForm({...form, consumedIngredients: current});
                                                                        }
                                                                    }}
                                                                    className="w-14 p-1.5 text-center bg-blue-50 rounded-lg text-xs font-black text-blue-700 outline-none focus:ring-2 ring-blue-500"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {/* --- FIM: FICHA TÉCNICA --- */}

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
                                            {/* Ações do Grupo (Copiar e Excluir) */}
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <button type="button" onClick={() => {
                                                    setComplementToCopy(cat);
                                                    setProductsToApplyComplement([]);
                                                    setIsCopyComplementModalOpen(true);
                                                }} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all">
                                                    <Copy size={14}/> Copiar
                                                </button>
                                                <button type="button" onClick={() => {
                                                    const newComps = [...form.complements];
                                                    newComps.splice(catIndex, 1);
                                                    setForm(prev => ({ ...prev, complements: newComps }));
                                                }} className="text-red-400 p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                            
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
                                    <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" id="product-image-upload" />
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
                                <label className={`flex items-center justify-between p-6 rounded-3xl border-2 mb-4 cursor-pointer transition-all ${form.isActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
    <div className="flex flex-col">
        <span className={`font-black uppercase text-sm ${form.isActive ? 'text-green-700' : 'text-slate-500'}`}>
            {form.isActive ? '✅ Produto Visível na Loja' : '🚫 Produto Oculto (Pausado)'}
        </span>
        <span className="text-xs font-bold text-slate-400 mt-1">Quando oculto, o item não aparece para o cliente comprar.</span>
    </div>
    <input 
        type="checkbox" 
        checked={form.isActive} 
        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        className="w-8 h-8 accent-green-600 cursor-pointer"
    />
</label>
                                <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl mt-8 uppercase tracking-widest active:scale-95 transition-all">Salvar Item</button>
                           </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- NOVO: MODAL DE COPIAR COMPLEMENTOS PARA OUTROS PRODUTOS --- */}
            <AnimatePresence>
                {isCopyComplementModalOpen && complementToCopy && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative max-h-[80vh] flex flex-col">
                            <button onClick={() => setIsCopyComplementModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2">Duplicar Complemento</h2>
                            <p className="text-xs font-bold text-blue-600 bg-blue-50 p-3 rounded-xl mb-6 truncate border border-blue-100">
                                📋 {complementToCopy.name} ({complementToCopy.options.length} opções)
                            </p>
                            
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Aplicar em quais produtos?</p>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 mb-6">
                                {products.filter(p => p.id !== editingId).map(p => {
                                    const isSelected = productsToApplyComplement.includes(p.id);
                                    return (
                                        <label key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={(e) => {
                                                    if(e.target.checked) setProductsToApplyComplement([...productsToApplyComplement, p.id]);
                                                    else setProductsToApplyComplement(productsToApplyComplement.filter(id => id !== p.id));
                                                }} 
                                                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer flex-shrink-0"
                                            />
                                            {p.imageUrl && <img src={p.imageUrl} className="w-8 h-8 object-cover rounded-lg bg-white" />}
                                            <span className="font-bold text-slate-700 text-sm truncate flex-1">{p.name}</span>
                                        </label>
                                    );
                                })}
                                {products.length <= 1 && <p className="text-xs text-center text-slate-400 italic py-4">Você precisa ter mais produtos cadastrados.</p>}
                            </div>

                            <button 
                                onClick={async () => {
                                    if(productsToApplyComplement.length === 0) return alert("Selecione pelo menos um produto na lista!");
                                    try {
                                        const batchPromises = productsToApplyComplement.map(async (pid) => {
                                            const productToUpdate = products.find(p => p.id === pid);
                                            if(productToUpdate) {
                                                const existingComplements = productToUpdate.complements || [];
                                                // Gera um ID novo para o grupo não dar conflito
                                                const newComplement = { ...complementToCopy, id: Date.now().toString() + Math.random().toString(36).substring(2, 5) };
                                                await updateDoc(doc(db, "products", pid), { complements: [...existingComplements, newComplement] });
                                            }
                                        });
                                        await Promise.all(batchPromises);
                                        setIsCopyComplementModalOpen(false);
                                        alert("✅ Complemento copiado com sucesso para os produtos selecionados!");
                                    } catch (error) {
                                        alert("Erro ao copiar complemento.");
                                    }
                                }}
                                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                            >
                                Confirmar e Salvar Cópias
                            </button>
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
                                    const vipData = {
                                        name: vipForm.name,
                                        phone: vipForm.phone,
                                        cpf: vipForm.cpf || "", 
                                        allowTab: vipForm.allowTab || false,
                                        tabLimit: Number(vipForm.tabLimit) || 0,
                                        tabDueDate: Number(vipForm.tabDueDate) || 10,
                                        storeId: storeId,
                                        updatedAt: new Date()
                                    };

                                    if (editingVipId) {
                                        await updateDoc(doc(db, "customers", editingVipId), vipData);
                                    } else {
                                        vipData.createdAt = new Date();
                                        await addDoc(collection(db, "customers"), vipData);
                                    }

                                    setIsVipModalOpen(false);
                                    setVipForm({ name: '', phone: '', cpf: '', allowTab: false, tabLimit: '', tabDueDate: 10 });
                                    alert("Cliente salvo com sucesso!");
                                } catch (error) {
                                    alert("ERRO NOVO: " + error.message);
                                    console.error("Erro completo:", error);
                                }
                            }} className="space-y-6">

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
                                    recurringDay: couponForm.recurringDay || 'all',
                                    recurringStart: couponForm.recurringStart || null,
                                    recurringEnd: couponForm.recurringEnd || null,
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
                                
                                <div className="space-y-4">
                                    {/* LINHA 1: Código do Cupom (Ocupa 100% da largura para respirar) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 ml-2">Código do Cupom</label>
                                        <input type="text" placeholder="Ex: FOME10" className="w-full p-5 bg-slate-50 rounded-2xl font-bold uppercase outline-none focus:ring-2 ring-blue-500 transition-all text-slate-700" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} required />
                                    </div>

                                    {/* LINHA 2: Tipo e Valor (Dividem meio a meio no desktop) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 ml-2">Tipo de Desconto</label>
                                            <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer outline-none focus:ring-2 ring-blue-500 transition-all text-slate-700" value={couponForm.type} onChange={e => {
                                                const newType = e.target.value;
                                                // Se mudou para frete grátis ou bogo, zera o valor automaticamente
                                                if (['bogo_50', 'free_shipping'].includes(newType)) {
                                                    setCouponForm({...couponForm, type: newType, value: 0});
                                                } else {
                                                    setCouponForm({...couponForm, type: newType});
                                                }
                                            }}>
                                                <option value="percentage">% (Porcentagem)</option>
                                                <option value="fixed_amount">R$ (Valor Fixo)</option>
                                                <option value="free_shipping">🚚 Frete Grátis</option>
                                                <option value="bogo_50">🔥 2º Item c/ 50% OFF</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 ml-2">
                                                {['bogo_50', 'free_shipping'].includes(couponForm.type) ? 'Valor Não Aplicável' : 'Valor do Desconto'}
                                            </label>
                                            <input 
                                                type="number" 
                                                placeholder={couponForm.type === 'percentage' ? "Ex: 10 (%)" : "Ex: 15.00 (R$)"} 
                                                className={`w-full p-5 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500 transition-all text-slate-700 ${['bogo_50', 'free_shipping'].includes(couponForm.type) ? 'bg-slate-200 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                                                value={couponForm.value} 
                                                onChange={e => setCouponForm({...couponForm, value: e.target.value})} 
                                                required={!['bogo_50', 'free_shipping'].includes(couponForm.type)} 
                                                disabled={['bogo_50', 'free_shipping'].includes(couponForm.type)} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* --- NOVO: PRODUTOS ELEGÍVEIS PARA O CUPOM --- */}
                                <div className="p-4 border border-slate-100 rounded-3xl space-y-3 bg-slate-50/50">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Itens Válidos para este Cupom</label>
                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-bold">Vazio = Vale para a Loja Toda</span>
                                    </div>
                                    
                                    {/* NOVA BARRA DE BUSCA DE CUPOM */}
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Filtrar produtos..." 
                                            className="w-full p-3 pl-10 bg-white rounded-xl font-bold text-xs border border-slate-200 outline-none focus:ring-2 ring-blue-300"
                                            value={couponProductSearch}
                                            onChange={(e) => setCouponProductSearch(e.target.value)}
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                    </div>

                                    <div className="max-h-32 overflow-y-auto custom-scrollbar border border-slate-200 rounded-2xl p-2 bg-white flex flex-col gap-1">
                                        {products.filter(p => p.name.toLowerCase().includes(couponProductSearch.toLowerCase())).map(p => {
                                            const isSelected = (couponForm.applicableProducts || []).includes(p.id);
                                            return (
                                                <label key={p.id} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const current = couponForm.applicableProducts || [];
                                                            if (e.target.checked) {
                                                                setCouponForm({ ...couponForm, applicableProducts: [...current, p.id] });
                                                            } else {
                                                                setCouponForm({ ...couponForm, applicableProducts: current.filter(id => id !== p.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                                </label>
                                            );
                                        })}
                                        {products.length === 0 && <p className="text-xs text-center text-slate-400 italic">Cadastre produtos primeiro.</p>}
                                    </div>
                                </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Pedido Mínimo (R$)</label>
                                        <input type="number" placeholder="0.00" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={couponForm.minimumOrderValue} onChange={e => setCouponForm({...couponForm, minimumOrderValue: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Data Limite Final (Opcional)</label>
                                        <input type="date" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-600" value={couponForm.expirationDate || ''} onChange={e => setCouponForm({...couponForm, expirationDate: e.target.value})} />
                                    </div>
                                </div>

                                {/* --- NOVO: RECORRÊNCIA DO CUPOM --- */}
                                <div className="p-4 border border-orange-100 rounded-3xl space-y-3 bg-orange-50/50">
                                    <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-1"><Clock size={12}/> Recorrência (Ativação Automática)</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={couponForm.recurringDay || 'all'} onChange={(e) => setCouponForm({...couponForm, recurringDay: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer">
                                            <option value="all">Todos os Dias</option>
                                            <option value="1">Só Segunda</option>
                                            <option value="2">Só Terça</option>
                                            <option value="3">Só Quarta</option>
                                            <option value="4">Só Quinta</option>
                                            <option value="5">Só Sexta</option>
                                            <option value="6">Só Sábado</option>
                                            <option value="0">Só Domingo</option>
                                        </select>
                                        <input type="time" placeholder="Início" value={couponForm.recurringStart || ''} onChange={(e) => setCouponForm({...couponForm, recurringStart: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none" />
                                        <input type="time" placeholder="Fim" value={couponForm.recurringEnd || ''} onChange={(e) => setCouponForm({...couponForm, recurringEnd: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none" />
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

            {/* --- INÍCIO: MODAL DE RASTREIO DO MOTOBOY (RADAR) --- */}
            <AnimatePresence>
                {isTrackingModalOpen && trackingOrder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
                            <button 
                                onClick={() => {
                                    setIsTrackingModalOpen(false);
                                    setTrackingOrder(null);
                                    setDriverLocation(null);
                                }} 
                                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"
                            >
                                <X size={20}/>
                            </button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <MapPin className="text-blue-600"/> Radar de Entrega
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                Acompanhando o pedido <strong className="text-blue-600">#{trackingOrder.id.slice(-5).toUpperCase()}</strong> do cliente <strong className="text-slate-800">{trackingOrder.customerName}</strong>.
                            </p>

                            <div className="w-full h-[400px] rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-inner relative bg-slate-50 flex flex-col items-center justify-center">
                                {!isLoaded ? (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Loader2 className="animate-spin" size={32} />
                                        <span className="text-xs font-black uppercase tracking-widest">Carregando Mapas...</span>
                                    </div>
                                ) : driverLocation ? (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={driverLocation}
                                        zoom={16}
                                        options={{ 
                                            disableDefaultUI: true, 
                                            zoomControl: true,
                                            gestureHandling: 'cooperative'
                                        }}
                                    >
                                        <Marker 
                                            position={driverLocation}
                                            animation={window.google.maps.Animation.DROP}
                                            icon={{
                                                url: "https://cdn-icons-png.flaticon.com/512/7543/7543160.png",
                                                scaledSize: new window.google.maps.Size(40, 40)
                                            }}
                                        />
                                    </GoogleMap>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                                        <MapPin size={48} className="text-slate-300 opacity-50" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Aguardando sinal do GPS...</p>
                                        <p className="text-xs font-medium">O motoboy precisa estar com o App de Entregas ativo para transmitir a localização.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE RASTREIO --- */}

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
                                        paymentMethod: editingOrderData.paymentMethod ?? 'pix', 
                                        observation: editingOrderData.observation || '',
                                        status: editingOrderData.status || 'pending',
                                        paymentStatus: editingOrderData.paymentStatus || 'pending', // Garante que o status do pagamento seja salvo
                                        shippingFee: Number(editingOrderData.shippingFee || 0),
                                        items: editingOrderData.items ||[],
                                        total: newTotal,
                                    };
                                    
                                    dataParaSalvar.changeFor = dataParaSalvar.paymentMethod === 'dinheiro' 
                                        ? (editingOrderData.changeFor || '') 
                                        : '';

                                    // Descobre se os status mudaram antes de salvar
                                    const pedidoAntigo = orders.find(o => o.id === editingOrderData.id) || {};
                                    const mudouStatusPedido = pedidoAntigo.status !== dataParaSalvar.status;
                                    const mudouStatusPagamento = pedidoAntigo.paymentStatus !== dataParaSalvar.paymentStatus;

                                    await updateDoc(doc(db, "orders", editingOrderData.id), dataParaSalvar);

                                    // --- DISPARO AUTOMÁTICO VIA API (MODAL) ---
                                    if (settings?.integrations?.whatsapp?.apiToken && settings?.integrations?.whatsapp?.autoOrderStatus) {
                                        const phone = String(dataParaSalvar.customerPhone || '').replace(/\D/g, '');
                                        const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`;
                                        const lojaNome = storeStatus?.name || "Velo Delivery";

                                        if (cleanPhone.length >= 10) {
                                            // 1. Notifica mudança de Pedido (Cozinha/Entrega)
                                            if (mudouStatusPedido) {
                                                const msgsPedido = {
                                                    preparing: `👨‍🍳 *PEDIDO EM PREPARO!*\n\nOlá ${dataParaSalvar.customerName.split(' ')[0]}, seu pedido foi recebido e já está sendo preparado aqui na *${lojaNome}*.`,
                                                    delivery: `🏍️ *SAIU PARA ENTREGA!*\n\nO motoboy já está a caminho com o seu pedido #${editingOrderData.id.slice(-5).toUpperCase()}.`,
                                                    completed: `✅ *PEDIDO ENTREGUE!*\n\nConfirmamos a entrega. Muito obrigado pela preferência! ❤️\n\n🎁 *Ganhe Prêmios e Descontos!*\nAcesse agora o nosso app e entre no Clube VIP para ganhar pontos na faixa:\n👉 https://${window.location.host}`,
                                                    canceled: `❌ *PEDIDO CANCELADO*\n\nO pedido #${editingOrderData.id.slice(-5).toUpperCase()} foi cancelado.`
                                                };
                                                if (msgsPedido[dataParaSalvar.status]) {
                                                    fetch('/api/whatsapp-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: cleanPhone, dynamicParams: { text: msgsPedido[dataParaSalvar.status] } }) }).catch(()=>{});
                                                }
                                            }

                                            // 2. Notifica mudança de Pagamento
                                            if (mudouStatusPagamento) {
                                                let msgPagamento = "";
                                                if (dataParaSalvar.paymentStatus === 'paid') {
                                                    msgPagamento = `✅ *Pagamento Confirmado!*\n\nOlá ${dataParaSalvar.customerName.split(' ')[0]}, recebemos o pagamento do pedido #${editingOrderData.id.slice(-5).toUpperCase()} com sucesso. Obrigado!`;
                                                } else if (dataParaSalvar.paymentStatus === 'failed') {
                                                    msgPagamento = `❌ *Aviso de Pagamento*\n\nOlá ${dataParaSalvar.customerName.split(' ')[0]}, houve um problema e o pagamento do pedido #${editingOrderData.id.slice(-5).toUpperCase()} consta como recusado ou pendente. Por favor, entre em contato conosco.`;
                                                }
                                                
                                                if (msgPagamento) {
                                                    fetch('/api/whatsapp-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: cleanPhone, dynamicParams: { text: msgPagamento } }) }).catch(()=>{});
                                                }
                                            }
                                        }
                                    }
                                    // ------------------------------------------
                                    
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
                                    <input type="tel" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.customerPhone || ''} onChange={e => setEditingOrderData({...editingOrderData, customerPhone: e.target.value})}  />
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Cozinha / Entrega</label>
                                        <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer outline-none focus:ring-2 ring-blue-500" value={editingOrderData.status || 'pending'} onChange={e => setEditingOrderData({...editingOrderData, status: e.target.value})}>
                                            <option value="pending">⏳ Novo / Pendente</option>
                                            <option value="preparing">👨‍🍳 Preparando</option>
                                            <option value="delivery">🏍️ Saiu p/ Entrega</option>
                                            <option value="completed">✅ Concluído / Entregue</option>
                                            <option value="canceled">❌ Cancelado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Status do Pagamento</label>
                                        <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer outline-none focus:ring-2 ring-green-500" value={editingOrderData.paymentStatus || 'pending'} onChange={e => setEditingOrderData({...editingOrderData, paymentStatus: e.target.value})}>
                                            <option value="pending">⏳ Aguardando Pagto</option>
                                            <option value="pending_on_delivery">🏠 Pagar na Entrega</option>
                                            <option value="paid">✅ Pago (Confirmado)</option>
                                            <option value="failed">❌ Recusado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-400 ml-2">Observação</label>
                                        <input type="text" placeholder="Observações do pedido" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={editingOrderData.observation || ''} onChange={e => setEditingOrderData({...editingOrderData, observation: e.target.value})} />
                                    </div>
                                </div>
                                       <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold cursor-pointer" value={editingOrderData.status || 'pending'} onChange={e => setEditingOrderData({...editingOrderData, status: e.target.value})}>
                                            <option value="pending">⏳ Pendente</option>
                                            <option value="preparing">👨‍🍳 Preparando</option>
                                            <option value="delivery">🏍️ Em Rota</option>
                                            <option value="completed">✅ Entregue</option>
                                            <option value="paid">✅ Pago (Mesa/Balcão)</option>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative text-center shadow-2xl">
                            <button onClick={() => setShowPixModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X size={24}/></button>
                            
                            <div className="bg-emerald-100 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode size={40} />
                            </div>

                            <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-2">Pagamento PIX</h2>
                            <p className="text-slate-500 font-bold mb-6">Realize a transferência para liberar seu painel.</p>
                            
                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl mb-6">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Valor Exato da Fatura</p>
                                <p className="text-4xl font-black text-emerald-600 italic">R$ {invoiceData.total.toFixed(2)}</p>
                            </div>
                            
                            <div className="text-left bg-blue-50 border border-blue-100 p-6 rounded-3xl mb-8">
                                <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-3 border-b border-blue-200 pb-2">Dados para Transferência</p>
                                <p className="text-sm font-bold text-slate-700 mb-2"><span className="text-slate-500">Chave PIX (CNPJ):</span><br/> <span className="text-blue-700 font-black text-lg select-all">53.620.109/0001-98</span></p>
                                <p className="text-sm font-bold text-slate-700 mb-2"><span className="text-slate-500">Instituição:</span><br/> Efí S.A</p>
                                <p className="text-sm font-bold text-slate-700"><span className="text-slate-500">Beneficiário:</span><br/> Velo Delivery Tecnologia</p>
                            </div>

                            <button onClick={() => {
                                navigator.clipboard.writeText("53620109000198");
                                alert("Chave PIX (CNPJ) copiada! Após realizar o pagamento, chame o suporte no WhatsApp enviando o comprovante para a liberação da sua loja.");
                            }} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Copy size={18}/> Copiar Chave PIX
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
                        <button onClick={handleAssinarPro} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                            <QrCode size={20}/> Pagar via Mercado Pago
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
                                {/* Renderiza os inputs com Blindagem Híbrida para OAuth */}
                                {selectedIntegration.fields.map((field) => {
                                    // BLINDAGEM MESTRA: Se for o Token do Google, troca o Input por um Botão de Login!
                                    if (selectedIntegration.id === 'google_my_business' && field.key === 'accessToken') {
                                        return (
                                            <div key={field.key} className="space-y-3 mt-4 p-5 bg-blue-50 border border-blue-100 rounded-[2rem]">
                                                <label className="text-xs font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                                                    <FaGoogle size={16}/> Autenticação Segura
                                                </label>
                                                {integrationForm.accessToken ? (
                                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100">
                                                        <span className="text-xs font-black text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Conectado</span>
                                                        <button type="button" onClick={async () => {
                                                            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                                            window.location.href = isLocal ? `/api/google-auth?storeId=${storeId}` : `/api/google-auth?storeId=${storeId}`;
                                                        }} className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline">Reconectar</button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        type="button"
                                                        onClick={async () => {
                                                            // Salva o Location ID no banco ANTES de sair da página para não perder o que o lojista digitou
                                                            if (integrationForm.locationId) {
                                                                await setDoc(doc(db, "settings", storeId), {
                                                                    integrations: { google_my_business: { locationId: integrationForm.locationId } }
                                                                }, { merge: true });
                                                            }
                                                            // Dispara o fluxo OAuth do backend
                                                            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                                            window.location.href = isLocal ? `/api/google-auth?storeId=${storeId}` : `/api/google-auth?storeId=${storeId}`;
                                                        }}
                                                        className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex justify-center items-center gap-2 shadow-md active:scale-95"
                                                    >
                                                        Fazer Login com o Google
                                                    </button>
                                                )}
                                                <p className="text-[10px] text-blue-600/70 font-bold leading-tight">Obrigatório. O Google gerará seu Token automaticamente após o login.</p>
                                            </div>
                                        );
                                    }

                                    return (
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
                                    );
                                })}

                                {/* --- MOTOR DE 1AUTOMAÇÕES DO WHATSAPP --- */}
                                {selectedIntegration.id === 'whatsapp' && (
                                    <div className="pt-4 border-t border-slate-100 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                        {(!integrationForm.phoneNumberId || !integrationForm.apiToken) ? (
                                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3">
                                                <ShieldCheck className="text-orange-500 mt-1 flex-shrink-0" size={20} />
                                                <div>
                                                    <p className="text-sm font-black text-orange-800 uppercase">Conexão Pendente</p>
                                                    <p className="text-xs text-orange-700 font-medium mt-1">
                                                        Preencha o <b>ID do Telefone</b> e o <b>Token da API</b> acima e clique em "Salvar e Ativar" para validar suas credenciais e liberar o Chatbot.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* 1. GATILHOS E AUTOMAÇÕES */}
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                    🤖 Gatilhos e Automações
                                                </h3>
                                                
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                                    {/* Alerta Loja */}
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaStore className="text-blue-500"/> Alerta de Novo Pedido (Loja)</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Seu WhatsApp apita ao receber pedidos.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoOwnerAlert || false} onChange={e => setIntegrationForm({...integrationForm, autoOwnerAlert: e.target.checked})} />
                                                    </label>

                                                    {/* Status Pedido */}
                                                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaBoxOpen className="text-orange-500"/> Status do Pedido (Cliente)</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Avisa quando sai para entrega.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoOrderStatus || false} onChange={e => setIntegrationForm({...integrationForm, autoOrderStatus: e.target.checked})} />
                                                    </label>

                                                    {/* Carrinho Abandonado */}
                                                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><ShoppingCart size={12} className="text-red-500"/> Carrinho Abandonado</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Dispara resgate 1h após inatividade.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoAbandonedCart || false} onChange={e => setIntegrationForm({...integrationForm, autoAbandonedCart: e.target.checked})} />
                                                    </label>

                                                    {/* NPS */}
                                                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><FaStar className="text-yellow-400"/> Avaliação (Pós-Entrega)</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Pede nota ao cliente horas depois.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoNps || false} onChange={e => setIntegrationForm({...integrationForm, autoNps: e.target.checked})} />
                                                    </label>

                                                    {/* Clube VIP */}
                                                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><Crown size={12} className="text-purple-500"/> Notificação Clube VIP</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Informa pontos ganhos após compra.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoLoyalty || false} onChange={e => setIntegrationForm({...integrationForm, autoLoyalty: e.target.checked})} />
                                                    </label>

                                                    {/* Mensagem de Ausência */}
                                                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-200">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1"><Clock size={12} className="text-orange-500"/> Mensagem de Ausência</p>
                                                            <p className="text-[9px] text-slate-500 leading-tight mt-1">Responde sozinho quando a loja está fechada.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-green-500 flex-shrink-0 cursor-pointer" checked={integrationForm.autoAwayMessage || false} onChange={e => setIntegrationForm({...integrationForm, autoAwayMessage: e.target.checked})} />
                                                    </label>

                                                    {integrationForm.autoAwayMessage && (
                                                        <div className="space-y-3 animate-in fade-in pt-2 pb-2">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Texto de Loja Fechada</label>
                                                                <textarea rows="2" placeholder="Ex: Olá! No momento estamos fechados. Nosso horário de atendimento é..." className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500" value={integrationForm.awayMessageText || ''} onChange={e => setIntegrationForm({...integrationForm, awayMessageText: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. CHATBOT E BOTÕES */}
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mt-6">
                                                    💬 Menu do Chatbot Automático
                                                </h3>
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                                    <label className="flex items-center justify-between cursor-pointer border-b border-slate-200 pb-4">
                                                        <div className="pr-4">
                                                            <p className="text-xs font-black text-slate-700 uppercase">Ativar Menu Automático</p>
                                                            <p className="text-[10px] text-slate-500 leading-tight mt-1">Envia opções com botões interativos para o cliente.</p>
                                                        </div>
                                                        <input type="checkbox" className="w-5 h-5 accent-blue-600 flex-shrink-0 cursor-pointer" checked={integrationForm.botEnabled || false} onChange={e => setIntegrationForm({...integrationForm, botEnabled: e.target.checked})} />
                                                    </label>

                                                    {integrationForm.botEnabled && (
                                                        <div className="space-y-3 animate-in fade-in">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Mensagem de Saudação</label>
                                                                <textarea rows="3" placeholder="Ex: Olá! Sou o assistente virtual..." className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500" value={integrationForm.botGreeting || ''} onChange={e => setIntegrationForm({...integrationForm, botGreeting: e.target.value})} />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Botão 1 (Abre o Cardápio)</label>
                                                                <input type="text" maxLength="20" placeholder="Ex: 🍔 Ver Cardápio" className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none" value={integrationForm.botOption1 || ''} onChange={e => setIntegrationForm({...integrationForm, botOption1: e.target.value})} />
                                                                <p className="text-[8px] text-slate-400 mt-1">Máx. 20 caracteres (Exigência do WhatsApp).</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Botão 2 (Chama Atendente)</label>
                                                                <input type="text" maxLength="20" placeholder="Ex: 👨‍💻 Falar com Humano" className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none" value={integrationForm.botOption2 || ''} onChange={e => setIntegrationForm({...integrationForm, botOption2: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 4. SINCRONIZAR PERFIL COMERCIAL */}
                                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mt-6">
                                                    <h4 className="text-xs font-black text-blue-800 uppercase mb-2">🏪 Sincronizar Perfil do WhatsApp</h4>
                                                    <p className="text-[10px] text-blue-700 mb-3">Envia os dados da sua loja (Endereço, Descrição, Site) preenchidos no Velo direto para o perfil do WhatsApp.</p>
                                                    <button type="button" onClick={async () => {
                                                        if(!integrationForm.phoneNumberId || !integrationForm.apiToken) return alert("Salve as credenciais primeiro!");
                                                        if(window.confirm("Atualizar o WhatsApp com Endereço, Slogan e Site cadastrados aqui no Velo?")){
                                                            try {
                                                                const res = await fetch('/api/whatsapp-send', {
                                                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ 
                                                                        action: 'update_profile', 
                                                                        storeId: storeId,
                                                                        address: storeStatus.address,
                                                                        description: storeStatus.slogan || 'Atendimento automatizado Velo Delivery',
                                                                        email: storeStatus.ownerEmail || '',
                                                                        website: `https://${storeId}.velodelivery.com.br`
                                                                    })
                                                                });
                                                                if(res.ok) alert("✅ Perfil do WhatsApp atualizado! (Lembrete: A Foto da Loja deve ser trocada direto no painel da Meta).");
                                                                else alert("❌ Erro ao atualizar perfil na Meta.");
                                                            } catch(e) { alert("Erro de conexão com o servidor."); }
                                                        }
                                                    }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                                                        🔄 Enviar Dados para o WhatsApp
                                                    </button>
                                                    <p className="text-[9px] text-blue-500 mt-2 font-bold text-center">Para alterar a Logo, acesse o WhatsApp Manager na Meta.</p>
                                                </div>
                                            </>
                                        )}
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
                                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Versão {systemUpdate.version}</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 max-h-60 overflow-y-auto custom-scrollbar">
                                <ul className="space-y-4">
                                    {systemUpdate.log.map((item, idx) => (
                                        <li key={idx} className="text-left">
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
                        {/* 🚨 CORREÇÃO DE LAYOUT AQUI: max-h-[90vh] overflow-y-auto custom-scrollbar 🚨 */}
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-none">{editingTeamId ? 'Editar' : 'Novo'} Usuário</h2>
                                <button onClick={() => setIsTeamModalOpen(false)} className="p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors flex-shrink-0">
                                    <X size={20}/>
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                  // 1. CHAMA O BACKEND PARA CRIAR/MUDAR A SENHA
                                    if (teamForm.newPassword) {
                                        const res = await fetch('/api/change-team-password', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                email: teamForm.email, 
                                                newPassword: teamForm.newPassword,
                                                name: teamForm.name
                                            })
                                        });
                                        const result = await res.json();
                                        if (!res.ok) throw new Error(result.error || "Erro ao salvar a senha no servidor.");
                                    }

                                    // 2. SALVA AS PERMISSÕES NO FIRESTORE
                                    const { newPassword, ...restFormData } = teamForm;
                                    const dataToSave = { ...restFormData, storeId: storeId, updatedAt: serverTimestamp() };
                                    
                                    if (editingTeamId) {
                                        await updateDoc(doc(db, "team", editingTeamId), dataToSave);
                                    } else {
                                        await addDoc(collection(db, "team"), { ...dataToSave, createdAt: serverTimestamp() });
                                    }
                                    
                                    setIsTeamModalOpen(false);
                                    alert("Usuário e acessos salvos com sucesso!");
                                } catch (error) {
                                    alert("Erro ao salvar: " + error.message);
                                }
                            }} className="space-y-4 flex-1">
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-2">Nome do Colaborador</label>
                                    <input type="text" placeholder="Ex: João Silva" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-2">E-mail de Acesso</label>
                                    <input type="email" placeholder="joao@email.com" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} />
                                </div>

                                <div className="space-y-1 mt-4 p-4 bg-orange-50 border border-orange-100 rounded-3xl">
                                    <label className="text-xs font-black uppercase tracking-widest text-orange-600 ml-2 flex items-center gap-2">
                                        🔒 Definição de Senha
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Mínimo de 6 caracteres..." 
                                        className="w-full p-4 mt-2 bg-white rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-400 text-slate-700" 
                                        value={teamForm.newPassword || ''} 
                                        onChange={e => setTeamForm({ ...teamForm, newPassword: e.target.value })} 
                                    />
                                    <p className="text-[10px] text-orange-500/70 font-bold mt-2 ml-2">
                                        Digite a senha para este usuário acessar o painel. Se estiver editando e deixar vazio, a senha atual será mantida.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">Permissões de Acesso</label>
                                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        {[
                                            { key: 'orders', label: 'Gestão de Pedidos', desc: 'Ver pedidos, lançar manuais e chat' },
                                            { key: 'products', label: 'Cardápio / Estoque', desc: 'Adicionar produtos, insumos e categorias' },
                                            { key: 'customers', label: 'Clientes VIP', desc: 'Ver clientes e Clube Fidelidade' },
                                            { key: 'store_settings', label: 'Loja / Status', desc: 'Abrir/fechar loja, horários e endereço' },
                                            { key: 'marketing', label: 'Marketing / Banners', desc: 'Gerenciar cupons, roleta e destaques' },
                                            { key: 'finance', label: 'Financeiro', desc: 'Ver saldo, saques e faturas' },
                                            { key: 'team', label: 'Equipe', desc: 'Adicionar ou remover funcionários' },
                                            { key: 'integrations', label: 'Integrações', desc: 'Pixel, GA4, GTM e WhatsApp API' }
                                        ].map(perm => (
                                            <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                                <input 
                                                    type="checkbox" 
                                                    checked={teamForm.permissions[perm.key] || false}
                                                    onChange={() => setTeamForm(prev => ({ ...prev, permissions: { ...prev.permissions, [perm.key]: !prev.permissions[perm.key] } }))}
                                                    className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer flex-shrink-0"
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 leading-none">{perm.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">{perm.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 mt-2 sticky bottom-0 bg-white pb-2">
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
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {[
                                        { id: 'hoje', label: 'Hoje (Diário)' },
                                        { id: '7dias', label: 'Últimos 7 Dias' },
                                        { id: 'mes', label: 'Este Mês Atual' },
                                        { id: '30dias', label: 'Últimos 30 Dias' },
                                        { id: 'personalizado', label: '⏱️ Horário Personalizado' },
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
                                
                                {reportDateRange === 'personalizado' && (
                                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Início (Data e Hora)</label>
                                            <input 
                                                type="datetime-local" 
                                                value={reportCustomStart} 
                                                onChange={(e) => { setReportCustomStart(e.target.value); setShowReportResults(false); }}
                                                className="w-full p-3 rounded-xl border-none outline-none font-bold text-sm text-slate-700 focus:ring-2 ring-blue-400"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Fim (Data e Hora)</label>
                                            <input 
                                                type="datetime-local" 
                                                value={reportCustomEnd} 
                                                onChange={(e) => { setReportCustomEnd(e.target.value); setShowReportResults(false); }}
                                                className="w-full p-3 rounded-xl border-none outline-none font-bold text-sm text-slate-700 focus:ring-2 ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}
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
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">3. Resultados do Período</label>
                                            <button onClick={handlePrintReport} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                <Printer size={16}/> Imprimir
                                            </button>
                                        </div>
                                        
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
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                            <div className="bg-cyan-50 p-4 rounded-3xl border border-cyan-100 text-center">
                                                <QrCode size={20} className="text-cyan-600 mx-auto mb-1"/>
                                                <p className="text-[9px] font-black uppercase text-cyan-800 tracking-widest">Via PIX</p>
                                                <p className="text-lg font-black text-cyan-600 italic">R$ {reportTotals.pix.total.toFixed(2)}</p>
                                                <span className="text-[9px] font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-md">{reportTotals.pix.count} pedidos</span>
                                            </div>
                                            
                                            <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 text-center">
                                                <CreditCard size={20} className="text-blue-600 mx-auto mb-1"/>
                                                <p className="text-[9px] font-black uppercase text-blue-800 tracking-widest">Via Cartão</p>
                                                <p className="text-lg font-black text-blue-600 italic">R$ {reportTotals.cartao.total.toFixed(2)}</p>
                                                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">{reportTotals.cartao.count} pedidos</span>
                                            </div>
                                            
                                            <div className="bg-green-50 p-4 rounded-3xl border border-green-100 text-center">
                                                <Banknote size={20} className="text-green-600 mx-auto mb-1"/>
                                                <p className="text-[9px] font-black uppercase text-green-800 tracking-widest">Em Dinheiro</p>
                                                <p className="text-lg font-black text-green-600 italic">R$ {reportTotals.dinheiro.total.toFixed(2)}</p>
                                                <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">{reportTotals.dinheiro.count} pedidos</span>
                                            </div>

                                            <div className="bg-slate-100 p-4 rounded-3xl border border-slate-200 text-center">
                                                <Package size={20} className="text-slate-500 mx-auto mb-1"/>
                                                <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Outros/Mesa</p>
                                                <p className="text-lg font-black text-slate-600 italic">R$ {reportTotals.outros.total.toFixed(2)}</p>
                                                <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">{reportTotals.outros.count} pedidos</span>
                                            </div>
                                        </div>

                                        {/* LISTAGEM DETALHADA DOS PEDIDOS DO CAIXA */}
                                        <div className="mt-6 border-t border-slate-200 pt-6">
                                            <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                                <List size={18}/> Lista de Pedidos ({reportSeller === 'todos' ? 'Geral' : reportSeller})
                                            </h4>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-50 rounded-2xl border border-slate-200 p-2">
                                                {filteredReportOrders.length === 0 ? (
                                                    <p className="text-center text-slate-400 font-bold p-4 text-xs">Nenhum pedido encontrado neste filtro.</p>
                                                ) : (
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                                                <th className="p-2">ID</th>
                                                                <th className="p-2">Hora</th>
                                                                <th className="p-2">Cliente</th>
                                                                <th className="p-2">Pagamento</th>
                                                                <th className="p-2 text-right">Valor</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-xs font-bold text-slate-700">
                                                            {filteredReportOrders.map(o => (
                                                                <tr key={o.id} className="border-b border-slate-100 hover:bg-white">
                                                                    <td className="p-2 text-blue-600">#{o.id.slice(-5).toUpperCase()}</td>
                                                                    <td className="p-2">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                                    <td className="p-2 truncate max-w-[100px]">{o.customerName}</td>
                                                                    <td className="p-2 text-[9px] uppercase">{o.paymentMethod}</td>
                                                                    <td className="p-2 text-right text-green-600">R$ {Number(o.total || 0).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
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
            {/* --- MODAL DA FATURA DETALHADA --- */}
            <AnimatePresence>
                {selectedInvoice && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl relative">
                            <button onClick={() => setSelectedInvoice(null)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><X size={20}/></button>
                            
                            <div className="text-center mb-8 border-b border-slate-100 pb-6">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} />
                                </div>
                                <h2 className="text-2xl font-black uppercase text-slate-900 leading-none">Fatura Detalhada</h2>
                                <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">{selectedInvoice.month}</p>
                                <span className={`mt-3 inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedInvoice.status === 'PAGO' ? 'bg-green-100 text-green-700' : selectedInvoice.status === 'ISENTO' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Status: {selectedInvoice.status}
                                </span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold">Plano Base (SaaS)</span>
                                    <span className="font-black text-slate-800">R$ {selectedInvoice.breakdown?.basePlan?.toFixed(2) || '49.90'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold">Excedente de Pedidos</span>
                                    <span className="font-black text-slate-800">R$ {selectedInvoice.breakdown?.extraOrdersCost?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold">Armazenamento (Mídia)</span>
                                    <span className="font-black text-green-500">Incluso</span>
                                </div>
                                {(selectedInvoice.breakdown?.discount > 0 || selectedInvoice.status === 'ISENTO') && (
                                    <div className="flex justify-between items-center text-sm text-purple-600 border-t border-slate-100 pt-3">
                                        <span className="font-bold uppercase text-[10px] tracking-widest">Desconto (Cortesia Velo)</span>
                                        <span className="font-black text-base">- R$ {selectedInvoice.breakdown?.discount?.toFixed(2) || '49.90'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total da Fatura</p>
                                    <p className="text-xs font-bold text-slate-500">Venc. {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                </div>
                                <p className={`text-3xl font-black italic ${selectedInvoice.status === 'ISENTO' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    {selectedInvoice.amount === 'R$ 0,00' || selectedInvoice.status === 'ISENTO' ? 'R$ 0,00' : selectedInvoice.amount}
                                </p>
                            </div>
                            
                            {selectedInvoice.status === 'PENDENTE' && (
                                <button onClick={handleAssinarPro} className="w-full mt-4 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                    <QrCode size={18} /> Pagar Fatura (Mercado Pago)
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
           {/* --- INÍCIO: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}
            <AnimatePresence>
                {isPromoCopyModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            <button 
                                onClick={() => setIsPromoCopyModalOpen(false)} 
                                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"
                            >
                                <X size={20}/>
                            </button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <Sparkles className="text-purple-600"/> Gerador de Promoções IA
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                Criando textos focados em conversão para o produto: <strong className="text-purple-700">{promoCopyProduct?.name}</strong>.
                            </p>

                            {isGeneratingPromoCopy ? (
                                <div className="flex flex-col items-center justify-center py-12 text-purple-500 gap-4">
                                    <Loader2 className="animate-spin" size={48} />
                                    <p className="font-black uppercase tracking-widest text-sm">O Cérebro da IA está escrevendo...</p>
                                    <p className="text-xs text-slate-400 font-bold">Analisando o nicho da loja e as características do produto.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* WhatsApp Copy */}
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-green-800 uppercase flex items-center gap-2">
                                                <FaWhatsapp size={16} /> Disparo para WhatsApp
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.whatsapp);
                                                    alert("Texto de WhatsApp copiado!");
                                                }} 
                                                className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-green-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar"
                                            value={promoCopyResult.whatsapp}
                                        />
                                    </div>

                                    {/* Instagram Copy */}
                                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-pink-800 uppercase flex items-center gap-2">
                                                <ImageIcon size={16} /> Legenda para Instagram
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.instagram + "\n\n" + promoCopyResult.hashtags);
                                                    alert("Legenda e Hashtags copiadas!");
                                                }} 
                                                className="bg-white text-pink-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-pink-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar Tudo
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-pink-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar mb-3"
                                            value={promoCopyResult.instagram}
                                        />
                                        <div className="bg-white p-3 rounded-xl border border-pink-100">
                                            <p className="text-[10px] font-black uppercase text-pink-500 mb-1">Hashtags Estratégicas</p>
                                            <p className="text-xs font-bold text-slate-600">{promoCopyResult.hashtags}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Google Meu Negócio - Publicação Direta */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-blue-800 uppercase flex items-center gap-2">
                                                <FaGoogle size={16} /> Postar Oferta no Google
                                            </h3>
                                            <button 
                                                onClick={async () => {
                                                    if (!settings?.integrations?.google_my_business?.locationId) {
                                                        return alert("Configure o ID do seu Google Meu Negócio na aba de Integrações primeiro.");
                                                    }
                                                    if (!promoCopyProduct?.imageUrl) {
                                                        return alert("O produto precisa de uma imagem para ser postado no Google.");
                                                    }
                                                    
                                                    // Simulando chamada para sua API Route que vai lidar com o Google
                                                    try {
                                                        const res = await fetch('/api/post-google-update', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                storeId: storeId,
                                                                locationId: settings.integrations.google_my_business.locationId,
                                                                summary: promoCopyResult.instagram, // Usa a copy do insta como base
                                                                imageUrl: promoCopyProduct.imageUrl,
                                                                productUrl: `https://${storeId}.velodelivery.com.br`
                                                            })
                                                        });
                                                        
                                                        if (res.ok) alert("✅ Oferta postada com sucesso no perfil do Google!");
                                                        else alert("❌ Erro ao postar. Verifique as configurações de integração.");
                                                    } catch (e) {
                                                        alert("Erro de conexão ao tentar postar no Google.");
                                                    }
                                                }} 
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                <UploadCloud size={14}/> Publicar Agora
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">
                                            Cria uma postagem de "Novidade/Oferta" no mapa do Google usando a imagem do seu produto e a Copy gerada acima. O botão do post levará o cliente para o seu cardápio Velo.
                                        </p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleGeneratePromoCopy(promoCopyProduct)}
                                        className="w-full bg-purple-100 text-purple-700 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16}/> Gerar Outra Opção
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}

            {/* --- INÍCIO: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}
            <AnimatePresence>
                {isPromoCopyModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            <button 
                                onClick={() => setIsPromoCopyModalOpen(false)} 
                                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"
                            >
                                <X size={20}/>
                            </button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <Sparkles className="text-purple-600"/> Gerador de Promoções IA
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                Criando textos focados em conversão para o produto: <strong className="text-purple-700">{promoCopyProduct?.name}</strong>.
                            </p>

                            {isGeneratingPromoCopy ? (
                                <div className="flex flex-col items-center justify-center py-12 text-purple-500 gap-4">
                                    <Loader2 className="animate-spin" size={48} />
                                    <p className="font-black uppercase tracking-widest text-sm">O Cérebro da IA está escrevendo...</p>
                                    <p className="text-xs text-slate-400 font-bold">Analisando o nicho da loja e as características do produto.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* WhatsApp Copy */}
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-green-800 uppercase flex items-center gap-2">
                                                <FaWhatsapp size={16} /> Disparo para WhatsApp
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.whatsapp);
                                                    alert("Texto de WhatsApp copiado!");
                                                }} 
                                                className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-green-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar"
                                            value={promoCopyResult.whatsapp}
                                        />
                                    </div>

                                    {/* Instagram Copy */}
                                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-pink-800 uppercase flex items-center gap-2">
                                                <ImageIcon size={16} /> Legenda para Instagram
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.instagram + "\n\n" + promoCopyResult.hashtags);
                                                    alert("Legenda e Hashtags copiadas!");
                                                }} 
                                                className="bg-white text-pink-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-pink-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar Tudo
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-pink-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar mb-3"
                                            value={promoCopyResult.instagram}
                                        />
                                       <div className="bg-white p-3 rounded-xl border border-pink-100">
                                            <p className="text-[10px] font-black uppercase text-pink-500 mb-1">Hashtags Estratégicas</p>
                                            <p className="text-xs font-bold text-slate-600">{promoCopyResult.hashtags}</p>
                                        </div>
                                    </div>

                                    {/* --- INÍCIO: GOOGLE MEU NEGÓCIO COPY E POSTAGEM --- */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-blue-800 uppercase flex items-center gap-2">
                                                <FaGoogle size={16} /> Postar Oferta no Google
                                            </h3>
                                            <button 
                                                onClick={async () => {
                                                    // 1. Trava: Verifica se o Lojista configurou o Google na aba Integrações
                                                    if (!settings?.integrations?.google_my_business?.locationId) {
                                                        return alert("⚠️ Configure o ID da sua loja do Google Meu Negócio na aba de 'Integrações' primeiro.");
                                                    }
                                                    // 2. Trava: O Google exige uma imagem para postar ofertas
                                                    if (!promoCopyProduct?.imageUrl) {
                                                        return alert("⚠️ O produto precisa ter uma imagem cadastrada para ser postado no Google.");
                                                    }
                                                    
                                                    // 3. Chamada para o Backend (que falará com a API do Google)
                                                    try {
                                                        const res = await fetch('/api/post-google-update', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                storeId: storeId,
                                                                locationId: settings.integrations.google_my_business.locationId,
                                                                summary: promoCopyResult.instagram, // Usa o texto do Insta como base para o Google
                                                                imageUrl: promoCopyProduct.imageUrl,
                                                                productUrl: `https://${storeId}.velodelivery.com.br/p/${promoCopyProduct.id}`
                                                            })
                                                        });
                                                        
                                                        const data = await res.json();
                                                        
                                                        if (res.ok) {
                                                            alert("✅ Oferta postada com sucesso no seu Perfil do Google!");
                                                        } else {
                                                            alert(`❌ Erro ao postar: ${data.error || 'Falha na comunicação com o Google.'}`);
                                                        }
                                                    } catch (e) {
                                                        alert("Erro de conexão ao tentar postar no Google.");
                                                    }
                                                }} 
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                <UploadCloud size={14}/> Publicar Agora
                                            </button>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 leading-tight">
                                            Isso criará uma postagem de "Oferta" no mapa do Google usando a imagem do seu produto e a Copy gerada acima. O cliente verá um botão de comprar que levará direto para o seu cardápio.
                                        </p>
                                    </div>
                                    {/* --- FIM: GOOGLE MEU NEGÓCIO --- */}
                                    
                                    <button 
                                        onClick={() => handleGeneratePromoCopy(promoCopyProduct)}
                                        className="w-full bg-purple-100 text-purple-700 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16}/> Gerar Outra Opção
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}

            {/* --- INÍCIO: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}
            <AnimatePresence>
                {isPromoCopyModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            <button 
                                onClick={() => setIsPromoCopyModalOpen(false)} 
                                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"
                            >
                                <X size={20}/>
                            </button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <Sparkles className="text-purple-600"/> Gerador de Promoções IA
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                Criando textos focados em conversão para o produto: <strong className="text-purple-700">{promoCopyProduct?.name}</strong>.
                            </p>

                            {isGeneratingPromoCopy ? (
                                <div className="flex flex-col items-center justify-center py-12 text-purple-500 gap-4">
                                    <Loader2 className="animate-spin" size={48} />
                                    <p className="font-black uppercase tracking-widest text-sm">O Cérebro da IA está escrevendo...</p>
                                    <p className="text-xs text-slate-400 font-bold">Analisando o nicho da loja e as características do produto.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* WhatsApp Copy */}
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-green-800 uppercase flex items-center gap-2">
                                                <FaWhatsapp size={16} /> Disparo para WhatsApp
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.whatsapp);
                                                    alert("Texto de WhatsApp copiado!");
                                                }} 
                                                className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-green-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar"
                                            value={promoCopyResult.whatsapp}
                                        />
                                    </div>

                                    {/* Instagram Copy */}
                                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-pink-800 uppercase flex items-center gap-2">
                                                <ImageIcon size={16} /> Legenda para Instagram
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.instagram + "\n\n" + promoCopyResult.hashtags);
                                                    alert("Legenda e Hashtags copiadas!");
                                                }} 
                                                className="bg-white text-pink-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-pink-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar Tudo
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-pink-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar mb-3"
                                            value={promoCopyResult.instagram}
                                        />
                                        <div className="bg-white p-3 rounded-xl border border-pink-100">
                                            <p className="text-[10px] font-black uppercase text-pink-500 mb-1">Hashtags Estratégicas</p>
                                            <p className="text-xs font-bold text-slate-600">{promoCopyResult.hashtags}</p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleGeneratePromoCopy(promoCopyProduct)}
                                        className="w-full bg-purple-100 text-purple-700 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16}/> Gerar Outra Opção
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}

            {/* --- INÍCIO: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}
            <AnimatePresence>
                {isPromoCopyModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                            <button 
                                onClick={() => setIsPromoCopyModalOpen(false)} 
                                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"
                            >
                                <X size={20}/>
                            </button>
                            
                            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2 flex items-center gap-2">
                                <Sparkles className="text-purple-600"/> Gerador de Promoções IA
                            </h2>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                Criando textos focados em conversão para o produto: <strong className="text-purple-700">{promoCopyProduct?.name}</strong>.
                            </p>

                            {isGeneratingPromoCopy ? (
                                <div className="flex flex-col items-center justify-center py-12 text-purple-500 gap-4">
                                    <Loader2 className="animate-spin" size={48} />
                                    <p className="font-black uppercase tracking-widest text-sm">O Cérebro da IA está escrevendo...</p>
                                    <p className="text-xs text-slate-400 font-bold">Analisando o nicho da loja e as características do produto.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* WhatsApp Copy */}
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-green-800 uppercase flex items-center gap-2">
                                                <FaWhatsapp size={16} /> Disparo para WhatsApp
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.whatsapp);
                                                    alert("Texto de WhatsApp copiado!");
                                                }} 
                                                className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-green-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar"
                                            value={promoCopyResult.whatsapp}
                                        />
                                    </div>

                                    {/* Instagram Copy */}
                                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-pink-800 uppercase flex items-center gap-2">
                                                <ImageIcon size={16} /> Legenda para Instagram
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promoCopyResult.instagram + "\n\n" + promoCopyResult.hashtags);
                                                    alert("Legenda e Hashtags copiadas!");
                                                }} 
                                                className="bg-white text-pink-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-pink-100 transition-all flex items-center gap-1"
                                            >
                                                <Copy size={12}/> Copiar Tudo
                                            </button>
                                        </div>
                                        <textarea 
                                            readOnly
                                            className="w-full bg-white border border-pink-100 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none h-32 custom-scrollbar mb-3"
                                            value={promoCopyResult.instagram}
                                        />
                                        <div className="bg-white p-3 rounded-xl border border-pink-100">
                                            <p className="text-[10px] font-black uppercase text-pink-500 mb-1">Hashtags Estratégicas</p>
                                            <p className="text-xs font-bold text-slate-600">{promoCopyResult.hashtags}</p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleGeneratePromoCopy(promoCopyProduct)}
                                        className="w-full bg-purple-100 text-purple-700 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16}/> Gerar Outra Opção
                                    </button>

                                    {/* --- GOOGLE MEU NEGÓCIO COPY E POSTAGEM --- */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-black text-blue-800 uppercase flex items-center gap-2">
                                                <FaGoogle size={16} /> Publicar Oferta no Google Maps
                                            </h3>
                                            <button 
                                                onClick={async (e) => {
                                                    // 1. Trava: Verifica se o Lojista configurou o Google
                                                    if (!settings?.integrations?.google_my_business?.locationId) {
                                                        return alert("⚠️ Configure o ID da sua loja do Google Meu Negócio na aba de 'Integrações' primeiro.");
                                                    }
                                                    // 2. Trava: O Google exige uma imagem
                                                    if (!promoCopyProduct?.imageUrl) {
                                                        return alert("⚠️ O produto precisa ter uma imagem cadastrada para ser postado no Google.");
                                                    }
                                                    
                                                    try {
                                                        // Botão visual de carregamento
                                                        const btn = e.currentTarget;
                                                        const oldText = btn.innerHTML;
                                                        btn.innerHTML = '⏳ Publicando...';
                                                        btn.disabled = true;

                                                        const res = await fetch('/api/post-google-update', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                storeId: storeId,
                                                                locationId: settings.integrations.google_my_business.locationId,
                                                                summary: promoCopyResult.instagram, 
                                                                imageUrl: promoCopyProduct.imageUrl,
                                                                productUrl: `https://${storeId}.velodelivery.com.br/p/${promoCopyProduct.id}`
                                                            })
                                                        });
                                                        
                                                        const data = await res.json();
                                                        
                                                        btn.innerHTML = oldText;
                                                        btn.disabled = false;

                                                        if (res.ok) {
                                                            alert("✅ Oferta postada com sucesso no seu Perfil do Google Maps!");
                                                        } else {
                                                            alert(`❌ Erro ao postar: ${data.error || 'Falha na comunicação com o Google.'}`);
                                                        }
                                                    } catch (e) {
                                                        alert("Erro de conexão ao tentar postar no Google.");
                                                    }
                                                }} 
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                <UploadCloud size={14}/> Publicar Agora
                                            </button>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 leading-tight">
                                            Isso criará uma postagem de "Oferta" no mapa do Google usando a imagem do seu produto e a Copy gerada acima. O cliente verá um botão "Fazer Pedido" que levará direto para o seu cardápio.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE IA PARA COPY DE PROMOÇÕES --- */}

            {/* --- INÍCIO: MODAL DE GESTÃO VIP (CADERNETA/FIADO) --- */}
            <AnimatePresence>
                {isVipModalOpen && editingVip && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl relative">
                            <button onClick={() => setIsVipModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors z-10"><X size={20}/></button>
                            
                            {editingVip.isNew ? (
                                <div className="space-y-3 mb-6 pr-6">
                                    <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-4">Novo Cliente</h2>
                                    <input 
                                        type="text" placeholder="Nome Completo *" required 
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500 text-slate-700" 
                                        value={editingVip.name || ''} 
                                        onChange={e => setEditingVip({...editingVip, name: e.target.value})} 
                                    />
                                    <input 
                                        type="tel" placeholder="WhatsApp (Ex: 5511999999999) *" required 
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500 text-slate-700" 
                                        value={editingVip.phone || ''} 
                                        onChange={e => setEditingVip({...editingVip, phone: String(e.target.value).replace(/\D/g, '')})} 
                                    />
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-1">{editingVip.name}</h2>
                                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-6">{editingVip.phone}</p>
                                </>
                            )}

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                   const payload = {
                                        storeId: storeId,
                                        name: editingVip.name,
                                        phone: editingVip.phone,
                                        fiadoEnabled: editingVip.fiadoEnabled,
                                        billingDay: Number(editingVip.billingDay),
                                        creditLimit: Number(editingVip.creditLimit) || 0,
                                        updatedAt: serverTimestamp()
                                    };
                                    
                                    if (editingVip.dbId) {
                                        await updateDoc(doc(db, "store_customers", editingVip.dbId), payload);
                                    } else {
                                        await addDoc(collection(db, "store_customers"), { ...payload, createdAt: serverTimestamp() });
                                    }
                                    
                                    setIsVipModalOpen(false);
                                    alert("✅ Configurações salvas com sucesso!");
                                } catch (error) {
                                    console.error("Erro completo:", error);
                                    alert("ERRO: " + error.message);
                                }
                            }} className="space-y-6">
                                
                                {settings?.enableFiado && (
                                    <div className="bg-orange-50 border border-orange-100 p-5 rounded-3xl mb-4">
                                        <label className="flex items-center justify-between cursor-pointer mb-4 border-b border-orange-200/50 pb-4">
                                            <div>
                                                <span className="font-black uppercase tracking-tight text-xs text-orange-800">Liberar Fiado (PDV)</span>
                                                <p className="text-[9px] text-orange-600/80 font-bold mt-1 leading-tight">Permite que a loja lance pedidos na caderneta para este número.</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={editingVip.fiadoEnabled || false} 
                                                onChange={(e) => setEditingVip({ ...editingVip, fiadoEnabled: e.target.checked })} 
                                                className="w-5 h-5 rounded-md accent-orange-600 cursor-pointer flex-shrink-0" 
                                            />
                                        </label>

                                        {editingVip.fiadoEnabled && (
                                            <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-orange-700 tracking-widest mb-2 block">Vencimento</label>
                                                    <select 
                                                        value={editingVip.billingDay} 
                                                        onChange={(e) => setEditingVip({ ...editingVip, billingDay: Number(e.target.value) })}
                                                        className="w-full p-4 bg-white rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-orange-400 cursor-pointer border border-orange-200"
                                                    >
                                                        <option value={5}>Dia 05</option>
                                                        <option value={10}>Dia 10</option>
                                                        <option value={15}>Dia 15</option>
                                                        <option value={20}>Dia 20</option>
                                                        <option value={25}>Dia 25</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-orange-700 tracking-widest mb-2 block">Limite de Crédito (R$)</label>
                                                    <input 
                                                        type="number" step="0.01" placeholder="Ex: 300.00"
                                                        value={editingVip.creditLimit || ''} 
                                                        onChange={(e) => setEditingVip({ ...editingVip, creditLimit: Number(e.target.value) })}
                                                        className="w-full p-4 bg-white rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-orange-400 border border-orange-200"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl">
                                    Salvar Ajustes
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- FIM: MODAL DE GESTÃO VIP --- */}

            <VeloSupportWidget />
        </div>
    );
}