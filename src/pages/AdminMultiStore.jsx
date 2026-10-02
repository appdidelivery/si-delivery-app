import React, { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Save, Trash2, Store, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';

const emptyUnit = () => ({
  name: '',
  storeId: '',
  frontendUrl: '',
  description: '',
  cepStart: '',
  cepEnd: '',
  enabled: true,
});

const normalizeConfig = (store) => {
  const existing = store?.multiStore || {};
  const initialUnits = Array.isArray(existing.units) && existing.units.length
    ? existing.units.map((unit) => ({
        ...emptyUnit(),
        ...unit,
        cepStart: unit.cepStart || unit.cepRanges?.[0]?.start || '',
        cepEnd: unit.cepEnd || unit.cepRanges?.[0]?.end || '',
      }))
    : [{
        ...emptyUnit(),
        name: store?.name || '',
        storeId: store?.slug || store?.id || '',
        frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
      }];

  return {
    enabled: Boolean(existing.enabled),
    networkName: existing.networkName || store?.name || '',
    subtitle: existing.subtitle || 'Informe seu CEP ou escolha a unidade onde deseja comprar.',
    routingMode: existing.routingMode || 'hybrid',
    rememberSelection: existing.rememberSelection !== false,
    units: initialUnits,
  };
};

export default function AdminMultiStore() {
  const navigate = useNavigate();
  const { store, loading } = useStore();
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (store) setConfig(normalizeConfig(store));
  }, [store]);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  const updateUnit = (index, field, value) => {
    setConfig((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) => unitIndex === index ? { ...unit, [field]: value } : unit),
    }));
  };

  const addUnit = () => {
    setConfig((current) => ({ ...current, units: [...current.units, emptyUnit()] }));
  };

  const removeUnit = (index) => {
    setConfig((current) => ({ ...current, units: current.units.filter((_, unitIndex) => unitIndex !== index) }));
  };

  const handleSave = async () => {
    setMessage('');

    const validUnits = config.units
      .filter((unit) => unit.name.trim() && unit.storeId.trim())
      .map((unit) => ({
        name: unit.name.trim(),
        storeId: unit.storeId.trim().toLowerCase(),
        frontendUrl: unit.frontendUrl.trim(),
        description: unit.description.trim(),
        enabled: unit.enabled !== false,
        cepRanges: unit.cepStart && unit.cepEnd
          ? [{ start: unit.cepStart, end: unit.cepEnd }]
          : [],
      }));

    if (config.enabled && validUnits.length < 2) {
      setMessage('Para ativar o MultiLojas, cadastre pelo menos duas unidades válidas.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        multiStore: {
          enabled: config.enabled,
          networkName: config.networkName.trim() || store.name || 'MultiLojas',
          subtitle: config.subtitle.trim(),
          routingMode: config.routingMode,
          rememberSelection: config.rememberSelection,
          units: validUnits,
          updatedAt: new Date().toISOString(),
        },
      });

      setMessage('Configuração MultiLojas salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar MultiLojas:', error);
      setMessage('Não foi possível salvar. Verifique sua sessão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-wide">
                  <Store size={18} />
                  Velo MultiLojas
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
                  Direcionamento de unidades
                </h1>
                <p className="text-slate-500 mt-2 max-w-2xl">
                  Use um único endereço de entrada e direcione o consumidor para o painel/loja correto por CEP ou escolha manual.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))}
                  className="w-5 h-5"
                />
                <span className="font-black text-slate-800">Ativar MultiLojas</span>
              </label>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <section className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">Nome da rede</span>
                <input
                  value={config.networkName}
                  onChange={(event) => setConfig((current) => ({ ...current, networkName: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">Modo de direcionamento</span>
                <select
                  value={config.routingMode}
                  onChange={(event) => setConfig((current) => ({ ...current, routingMode: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hybrid">Híbrido: CEP + escolha manual</option>
                  <option value="cep">Automático por CEP</option>
                  <option value="manual">Somente escolha manual</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-black text-slate-700">Texto de orientação</span>
                <input
                  value={config.subtitle}
                  onChange={(event) => setConfig((current) => ({ ...current, subtitle: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={config.rememberSelection}
                  onChange={(event) => setConfig((current) => ({ ...current, rememberSelection: event.target.checked }))}
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-black text-slate-800">Lembrar última unidade escolhida</p>
                  <p className="text-sm text-slate-500">Facilita a recompra sem retirar do consumidor a opção de trocar de loja.</p>
                </div>
              </label>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Unidades</h2>
                  <p className="text-sm text-slate-500">Cada unidade continua usando seu próprio painel e catálogo.</p>
                </div>
                <button
                  type="button"
                  onClick={addUnit}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 font-black"
                >
                  <Plus size={18} />
                  Unidade
                </button>
              </div>

              <div className="space-y-4">
                {config.units.map((unit, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-black text-slate-900">Unidade {index + 1}</p>
                      {config.units.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUnit(index)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Remover unidade"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <label>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome</span>
                        <input
                          value={unit.name}
                          onChange={(event) => updateUnit(index, 'name', event.target.value)}
                          placeholder="Ex.: Saco Grande"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">ID / slug da loja</span>
                        <input
                          value={unit.storeId}
                          onChange={(event) => updateUnit(index, 'storeId', event.target.value)}
                          placeholder="mercadomonteverdesacogrande"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">URL pública da unidade</span>
                        <input
                          value={unit.frontendUrl}
                          onChange={(event) => updateUnit(index, 'frontendUrl', event.target.value)}
                          placeholder="https://unidade.velodelivery.com.br"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">CEP inicial</span>
                        <input
                          value={unit.cepStart}
                          onChange={(event) => updateUnit(index, 'cepStart', event.target.value)}
                          placeholder="88000-000"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">CEP final</span>
                        <input
                          value={unit.cepEnd}
                          onChange={(event) => updateUnit(index, 'cepEnd', event.target.value)}
                          placeholder="88099-999"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Descrição opcional</span>
                        <input
                          value={unit.description}
                          onChange={(event) => updateUnit(index, 'description', event.target.value)}
                          placeholder="Ex.: entrega para Saco Grande e bairros próximos"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-slate-900 text-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Endereço de entrada atual</p>
              <p className="font-mono text-sm md:text-base mt-2 break-all">{publicUrl}</p>
              <p className="text-xs text-slate-400 mt-2">
                Ao ativar o MultiLojas neste painel, a página inicial deste domínio passa a exibir o seletor. O /admin continua normal.
              </p>
            </section>

            {message && (
              <div className={`rounded-xl p-4 text-sm font-bold ${message.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 font-black hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar MultiLojas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
