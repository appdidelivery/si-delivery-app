import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Loader2 } from 'lucide-react';

// Importa os dois painéis
import AdminLegacy from './AdminLegacy';
import AdminSaaS from './AdminSaaS';

export default function Admin() {
    const { store, loading } = useStore();
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    const storeParam = searchParams.get('s') || searchParams.get('store');

    // Estado para capturar erros no SaaS (para não dar tela branca total)
    const [saasError, setSaasError] = useState(null);

    // Logs para Debug (Olhe no Console F12 se der erro)
    useEffect(() => {
        console.log("🚦 Roteador Admin Iniciado");
        console.log("📍 Hostname:", hostname);
        console.log("🔗 Parametro URL (?s=):", storeParam);
        console.log("🏪 Loja Contexto:", store?.slug);
    }, [store, hostname, storeParam]);

    // 1. Carregando
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="ml-2 font-bold text-slate-500">Carregando...</p>
            </div>
        );
    }

    // 2. LÓGICA DE DECISÃO (Quem vai ver o Legacy?)
    // Regra:
    // A. Se o banco de dados diz que é 'csi'
    // B. Se o link tem 'csi' no nome (ex: csi.velodelivery.com.br)
    // C. Se tem ?s=csi na URL (Para seus testes no GitHub!)
    const isLegacyStore = 
        (store?.slug === 'csi') || 
        (store?.slug === 'conv-st-isabel') ||
        hostname.includes('csi') || 
        hostname.includes('santa') ||
        (storeParam === 'csi');

    // 3. Renderização Condicional
    if (isLegacyStore) {
        console.log("🔒 MODO LEGADO ATIVADO (CSI)");
        return <AdminLegacy />;
    }

    // 4. Se não for CSI, tenta carregar o SaaS
    console.log("🚀 MODO SAAS ATIVADO (Lojas Novas)");
    
    // Se o AdminSaaS der erro, mostramos na tela em vez de ficar tudo branco
    try {
        return <AdminSaaS />;
    } catch (error) {
        console.error("ERRO NO PAINEL SAAS:", error);
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar Painel Novo</h1>
                <p className="bg-slate-100 p-4 rounded text-left font-mono text-sm">{error.message}</p>
                <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Tentar Novamente</button>
            </div>
        );
    }
}