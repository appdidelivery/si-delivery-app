import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getMinWeightGrams, getWeightStepGrams } from '../lib/weightProducts';
import PromotionScheduleFields from './PromotionScheduleFields';
import { validatePromotion } from '../lib/promotions';

const BUSINESS_TYPES = [
  ['mercado', 'Mercado / Supermercado (GroceryStore)'],
  ['conveniencia', 'Conveniência'],
  ['restaurante', 'Restaurante'],
  ['hamburgueria', 'Hamburgueria'],
  ['pizzaria', 'Pizzaria'],
  ['padaria', 'Padaria'],
  ['floricultura', 'Floricultura'],
  ['outros', 'Outros negócios']
];
const parseNumber = (value) => Number(String(value).trim().replace(',', '.'));

export default function MarketCatalogSettings({ store, onClose }) {
  const storeId = store?.id || store?.slug;
  const [business, setBusiness] = useState(store?.seoCategory || store?.storeNiche || 'outros');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!storeId) return undefined;
    return onSnapshot(query(collection(db, 'products'), where('storeId', '==', store?.slug || storeId)), snapshot => {
      setProducts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, error => setMessage(`Não foi possível carregar o catálogo: ${error.message}`));
  }, [storeId, store?.slug]);

  const selectProduct = (product) => {
    setSelectedId(product.id);
    setEditing({
      saleUnit: product.saleUnit === 'kg' ? 'kg' : 'un',
      price: String(product.price ?? ''),
      promotionalPrice: String(product.promotionalPrice ?? 0),
      promotionStartAt: product.promotionStartAt || '',
      promotionEndAt: product.promotionEndAt || '',
      stock: String(product.stock ?? ''),
      weightStepGrams: String(getWeightStepGrams(product)),
      minWeightGrams: String(getMinWeightGrams(product))
    });
    setMessage('');
  };

  const saveBusiness = async () => {
    if (!storeId) return;
    setSaving(true); setMessage('');
    try {
      const category = business === 'outros' ? 'localbusiness' : business;
      await updateDoc(doc(db, 'stores', storeId), { storeNiche: category, seoCategory: category });
      setMessage('Categoria do negócio salva. O schema será atualizado conforme a loja.');
    } catch (error) {
      setMessage(`Erro ao salvar categoria: ${error.message}`);
    } finally { setSaving(false); }
  };

  const saveProduct = async () => {
    if (!selectedId || !storeId) return;
    setSaving(true); setMessage('');
    try {
      const price = parseNumber(editing.price);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Informe um preço válido.');
      const promotionalPrice = parseNumber(editing.promotionalPrice || '0');
      if (!Number.isFinite(promotionalPrice) || promotionalPrice < 0) throw new Error('Preço promocional inválido.');
      const scheduleError = validatePromotion({ price, promotionalPrice,
        promotionStartAt: editing.promotionStartAt, promotionEndAt: editing.promotionEndAt });
      if (scheduleError) throw new Error(scheduleError);
      const updates = {
        saleUnit: editing.saleUnit,
        price,
        promotionalPrice,
        promotionStartAt: editing.promotionStartAt || '',
        promotionEndAt: editing.promotionEndAt || ''
      };
      if (editing.saleUnit === 'kg') {
        const stock = parseNumber(editing.stock);
        const step = Number(editing.weightStepGrams);
        const min = Number(editing.minWeightGrams);
        if (!Number.isFinite(stock) || stock < 0) throw new Error('Informe estoque em kg (0 para esgotado).');
        if (!Number.isInteger(step) || step < 1 || step > 1000) throw new Error('Passo de peso deve estar entre 1 g e 1000 g.');
        if (!Number.isInteger(min) || min < step || min % step !== 0) throw new Error('O mínimo deve ser múltiplo do passo.');
        updates.stock = stock; // estoque do produto por peso é SEMPRE medido em kg
        updates.weightStepGrams = step;
        updates.minWeightGrams = min;
      }
      // Exige que o produto ainda pertença a esta loja: isolamento multi-tenant.
      const product = products.find(item => item.id === selectedId && item.storeId === (store?.slug || storeId));
      if (!product) throw new Error('Produto não pertence à loja atual.');
      await updateDoc(doc(db, 'products', selectedId), updates);
      setMessage('Produto atualizado. Na vitrine, o preço de itens por peso será exibido por kg.');
    } catch (error) {
      setMessage(`Não foi possível salvar: ${error.message}`);
    } finally { setSaving(false); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800';
  const filtered = products.filter(product => String(product.name || '').toLowerCase().includes(search.toLowerCase())).slice(0, 50);
  const field = (label, name, hint) => (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className={inputClass} value={editing[name] ?? ''} inputMode="decimal" onChange={e => setEditing(p => ({ ...p, [name]: e.target.value }))}/>
      {hint && <small className="font-normal text-slate-500">{hint}</small>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Configurações de mercado e produtos por peso">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 text-slate-800 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Mercado e venda por peso</h2>
            <p className="text-sm text-slate-500">Configuração de {store?.name || 'loja'} — produtos comuns continuam por unidade.</p>
          </div>
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>Fechar</button>
        </div>
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <label className="block text-sm font-bold">
            Categoria do negócio (Google / SEO)
            <select className={inputClass} value={business} onChange={e => setBusiness(e.target.value)}>
              {!BUSINESS_TYPES.some(([v]) => v === business) && <option value={business}>{business}</option>}
              {BUSINESS_TYPES.map(([v,label]) => <option value={v} key={v}>{label}</option>)}
            </select>
          </label>
          <button disabled={saving} onClick={saveBusiness} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">Salvar categoria</button>
          <p className="text-xs text-slate-500">Mercado usa schema.org/GroceryStore. Configuração por unidade, sem afetar outras lojas.</p>
        </section>
        <section className="space-y-3">
          <h3 className="font-bold text-lg">Precificação de produtos</h3>
          <p className="text-xs text-slate-600">Cadastre normalmente os produtos no painel. Aqui você configura se o preço é por unidade ou por kg. Para carnes, informe também o estoque em kg, o peso mínimo e os incrementos em gramas.</p>
          <input className={inputClass} placeholder="Buscar produto da loja..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100">
            {filtered.map(product => (
              <button key={product.id} type="button" className={`flex w-full items-center justify-between border-b p-3 text-left text-sm hover:bg-blue-50 ${product.id === selectedId ? 'bg-blue-50 font-bold' : ''}`} onClick={() => selectProduct(product)}>
                <span>{product.name}</span><span className="text-xs text-slate-500">{product.saleUnit === 'kg' ? 'por kg' : 'unidade'}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Nenhum produto encontrado.</p>}
          </div>
          {selectedId && <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <label className="block text-sm font-bold">Unidade de venda
              <select className={inputClass} value={editing.saleUnit} onChange={e => setEditing(p => ({ ...p, saleUnit: e.target.value }))}>
                <option value="un">Unidade (un.)</option>
                <option value="kg">Peso (g / kg)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {field(editing.saleUnit === 'kg' ? 'Preço por 1 kg (R$)' : 'Preço por unidade (R$)', 'price')}
              {field('Preço promocional (R$)', 'promotionalPrice', '0 = sem promoção')}
            </div>
            <PromotionScheduleFields product={editing} onChange={updates => setEditing(prev => ({ ...prev, ...updates }))} />
            {editing.saleUnit === 'kg' && <>
              {field('Estoque disponível (kg)', 'stock', 'Ao mudar de unidade para kg, informe o estoque em quilogramas.')}
              <div className="grid grid-cols-2 gap-3">
                {field('Incremento de peso (g)', 'weightStepGrams', 'Ex.: 100, 250 ou 500')}
                {field('Peso mínimo (g)', 'minWeightGrams', 'Ex.: 500')}
              </div>
              <p className="text-xs text-slate-600">Ex.: R$ 39,90/kg → 500 g = R$ 19,95; 1,5 kg = R$ 59,85.</p>
            </>}
            <button disabled={saving} onClick={saveProduct} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">Salvar unidade, preços e validade</button>
          </div>}
        </section>
        {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      </div>
    </div>
  );
}
