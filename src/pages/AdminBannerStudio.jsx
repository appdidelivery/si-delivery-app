import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';
import VeloBannerStudio from '../components/VeloBannerStudio';

export default function AdminBannerStudio() {
  const { store, loading: loadingStore } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!store?.id) return;
    setLoading(true);
    setError('');
    getDocs(query(collection(db, 'products'), where('storeId', '==', store.id)))
      .then(snapshot => {
        if (active) setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.isActive !== false));
      })
      .catch(() => { if (active) setError('Não foi possível carregar os produtos desta loja.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [store?.id]);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
    <Link to="/admin" className="text-sm font-semibold text-emerald-700">← Voltar ao painel</Link>
    {loadingStore || loading ? <p>Carregando catálogo...</p> : error ? <p role="alert">{error}</p> : !store?.id ? <p>Loja não identificada.</p> :
      <VeloBannerStudio store={store} products={products} />}
    <p className="text-xs text-slate-500">Versão de testes: composição PNG. Geração criativa por IA, publicação e cotas diárias ainda não habilitadas.</p>
  </main>;
}
