import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { signOut } from 'firebase/auth'; // A função vem daqui!
import { auth, db } from '../services/firebase'; // As instâncias vêm daqui!
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { 
    LayoutDashboard, Package, ShoppingBag, Users, 
    Settings, LogOut, Store, Megaphone, Menu, X, Loader2 
} from 'lucide-react';

export default function AdminSaaS() {
    // --- HOOKS ---
    const navigate = useNavigate();
    const { store, loading } = useStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);

    // Proteção de Rota
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) navigate('/login');
        });
        return () => unsubscribe();
    }, [navigate]);

    // --- SETUP AUTOMÁTICO (BOTÃO MÁGICO) ---
    const handleInitialSetup = async () => {
        if (!store || !store.slug) return;
        if (!window.confirm("Gerar loja de exemplo?")) return;
        
        setSetupLoading(true);
        try {
            const storeId = store.slug;
            // 1. Configurações
            await setDoc(doc(db, "stores", storeId), {
                name: store.name || "Nova Loja",
                slug: storeId,
                logoUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
                primaryColor: "#2563eb",
                createdAt: new Date(),
                isOpen: true
            }, { merge: true });

            // 2. Categorias
            await addDoc(collection(db, "categories"), { name: "Promoções", order: 1, storeId });
            await addDoc(collection(db, "categories"), { name: "Bebidas", order: 2, storeId });

            // 3. Produto Teste
            await addDoc(collection(db, "products"), { 
                name: "Produto Exemplo", 
                price: 19.90, 
                stock: 10, 
                category: "Promoções", 
                storeId 
            });

            alert("Loja configurada!");
            window.location.reload();
        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            setSetupLoading(false);
        }
    };

    // --- RENDERIZAÇÃO DE CONTEÚDO ---
    const renderContent = () => {
        if (activeTab === 'dashboard') {
             return (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-800 mb-4">Painel Velo SaaS 🚀</h2>
                    <p className="text-slate-500 mb-6">Este é o ambiente novo. Se você vê isso, o roteamento funcionou!</p>
                    <button onClick={handleInitialSetup} disabled={setupLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
                        {setupLoading ? 'Criando...' : '🪄 Gerar Loja Teste'}
                    </button>
                </div>
             );
        }
        return <div className="p-10 text-slate-400 font-bold">Módulo {activeTab} em construção.</div>;
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;

    // --- LAYOUT ---
    const menuItems = [
        { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
        { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
        { id: 'products', label: 'Estoque', icon: Package },
        { id: 'settings', label: 'Loja', icon: Store },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="font-black text-slate-800 tracking-tighter uppercase">{store?.name || 'Velo App'}</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden"><X /></button>
                </div>
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <item.icon size={20} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t"><button onClick={async () => { await signOut(auth); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl"><LogOut size={20} /> Sair</button></div>
            </aside>
            <main className="flex-1 overflow-y-auto relative">
                <header className="md:hidden bg-white p-4 flex items-center justify-between border-b sticky top-0 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)}><Menu /></button>
                    <span className="font-bold">{store?.name}</span>
                    <div className="w-6"></div>
                </header>
                <div className="p-6 md:p-10 max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}