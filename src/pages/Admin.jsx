import React, { useEffect, useState } from 'react';
import MarketCatalogSettings from '../components/MarketCatalogSettings';
import { useStore } from '../context/StoreContext';
import { Loader2 } from 'lucide-react';

// Importamos APENAS o painel completo (que renomeamos para AdminLegacy, mas é o OFICIAL)
import AdminLegacy from './AdminLegacy'; 

export default function Admin() {
    const { store, loading } = useStore();
    const [showMarketSettings, setShowMarketSettings] = useState(false);

    useEffect(() => {
        // Log para confirmar que está carregando o painel certo
        console.log("🚦 Admin Unificado: Carregando Painel Completo para:", store?.slug);
    }, [store]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            </div>
        );
    }

    // SEMPRE carrega o Painel Completo (as 1400 linhas).
    // A lógica de mostrar o "Botão Mágico" está DENTRO dele (quando não tem produtos).
    return <>
        <AdminLegacy />
        {store && <button type="button" onClick={() => setShowMarketSettings(true)} className="fixed bottom-5 right-5 z-[90] rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-emerald-800" aria-label="Configurar mercado e produtos por peso">⚖️ Mercado / Peso</button>}
        {showMarketSettings && store && <MarketCatalogSettings store={store} onClose={() => setShowMarketSettings(false)} />}
    </>;
}