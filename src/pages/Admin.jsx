import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Loader2 } from 'lucide-react';

// Importamos APENAS o painel completo (que renomeamos para AdminLegacy, mas é o OFICIAL)
import AdminLegacy from './AdminLegacy'; 

export default function Admin() {
    const { store, loading } = useStore();

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
    return (
        <div className="relative">
            <div className="fixed bottom-6 right-6 z-50">
                <a 
                    href="/admin/prospeccao" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 border border-blue-500/30 active:scale-95 transition-all"
                >
                    <span>🚀 Prospecção Ativa</span>
                </a>
            </div>
            <AdminLegacy />
        </div>
    );
}