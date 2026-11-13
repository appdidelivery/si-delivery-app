import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Loader2 } from 'lucide-react';

// Painel completo da loja (mantido sem alterações).
import AdminLegacy from './AdminLegacy';

export default function Admin() {
    const { store, loading } = useStore();

    useEffect(() => {
        console.log("🚦 Admin Unificado: Carregando Painel Completo para:", store?.slug);
    }, [store]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            </div>
        );
    }

    return <AdminLegacy />;
}
