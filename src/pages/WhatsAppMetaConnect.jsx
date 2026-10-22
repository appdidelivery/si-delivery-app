import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { authenticatedFetch } from '../utils/apiAuth';
import WhatsAppConnectionChoice from '../components/WhatsAppConnectionChoice';

// Isolated page: the legacy integrations dashboard initializes a different
// Facebook app for its other Meta integrations. Embedded Signup must use the
// WhatsApp-specific app ID in a fresh, dedicated page.
export default function WhatsAppMetaConnect() {
  const { store, loading } = useStore();
  const storeId = store?.id;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-green-700">
          <ArrowLeft size={18} /> Voltar ao painel da loja
        </Link>
        <header className="rounded-3xl border border-slate-200 bg-white p-6">
          <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900">
            <ShieldCheck className="text-green-700" /> WhatsApp Business oficial
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Autorize seu WhatsApp Business pelo ambiente oficial da Meta. A conexão atual de
            outras lojas não será modificada. O cadastro não usa QR Code não oficial.
          </p>
        </header>
        {loading ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600">Identificando sua loja...</p>
        ) : !storeId ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            Não foi possível identificar a loja autorizada. Volte ao painel da sua loja e acesse Integrações.
          </div>
        ) : (
          <WhatsAppConnectionChoice
            key={storeId}
            storeId={storeId}
            authenticatedFetch={authenticatedFetch}
            standalone
          />
        )}
      </div>
    </main>
  );
}
