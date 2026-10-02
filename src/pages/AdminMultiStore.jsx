import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Save, Trash2, Store, Loader2, MapPin, RefreshCw, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { useStore } from '../context/StoreContext';

const maxRadiusFromZones = (zones = []) => {
  if (!Array.isArray(zones) || !zones.length) return '';
  const values = zones
    .map((zone) => Number(String(zone?.radius_km ?? '').replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? Math.max(...values) : '';
};

const buildFrontendUrl = (storeData, storeId) => {
  if (storeData?.customDomain) {
    const domain = String(storeData.customDomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${domain}`;
  }

  return storeId ? `https://${storeId}.velodelivery.com.br` : '';
};

const emptyUnit = () => ({
  name: '',
  storeId: '',
  frontendUrl: '',
  description: '',
  address: '',
  lat: '',
  lng: '',
  radiusKm: 5,
  enabled: true,
});

const normalizeConfig = (store) => {
  const existing = store?.multiStore || {};
  const existingMode = existing.routingMode === 'cep' ? 'geo' : existing.routingMode;

  const initialUnits = Array.isArray(existing.units) && existing.units.length
    ? existing.units.map((unit) => ({
        ...emptyUnit(),
        ...unit,
        radiusKm: unit.radiusKm || 5,
      }))
    : [{
        ...emptyUnit(),
        name: store?.name || '',
        storeId: store?.slug || store?.id || '',
        frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
        address: store?.address || '',
        lat: store?.lat || '',
        lng: store?.lng || '',
        radiusKm: maxRadiusFromZones(store?.delivery_zones) || 5,
      }];

  return {
    enabled: Boolean(existing.enabled),
    networkName: existing.networkName || store?.name || '',
    subtitle: existing.subtitle || 'Informe seu endereço e encontraremos a melhor unidade para você.',
    routingMode: existingMode || 'hybrid',
    rememberSelection: existing.rememberSelection !== false,
    units: initialUnits,
  };
};

export default function AdminMultiStore() {
  const navigate = useNavigate();
  const { store, loading } = useStore();
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingUnitIndex, setLoadingUnitIndex] = useState(null);
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
      units: current.units.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, [field]: value } : unit
      ),
    }));
  };

  const patchUnit = (index, values) => {
    setConfig((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, ...values } : unit
      ),
    }));
  };

  const addUnit = () => {
    setConfig((current) => ({ ...current, units: [...current.units, emptyUnit()] }));
  };

  const removeUnit = (index) => {
    setConfig((current) => ({
      ...current,
      units: current.units.filter((_, unitIndex) => unitIndex !== index),
    }));
  };

  const loadStoreData = async (index) => {
    const storeId = config.units[index]?.storeId?.trim().toLowerCase();

    if (!storeId) {
      setMessage('Informe primeiro o ID/slug da unidade.');
      return;
    }

    setMessage('');
    setLoadingUnitIndex(index);

    try {
      const storeSnap = await getDoc(doc(db, 'stores', storeId));

      if (!storeSnap.exists()) {
        setMessage(`Não encontramos a unidade "${storeId}" no Firestore.`);
        return;
      }

      const data = storeSnap.data();
      patchUnit(index, {
        name: data.name || config.units[index].name || storeId,
        frontendUrl: buildFrontendUrl(data, storeId),
        address: data.address || config.units[index].address || '',
        lat: data.lat ?? config.units[index].lat ?? '',
        lng: data.lng ?? config.units[index].lng ?? '',
        radiusKm:
          maxRadiusFromZones(data.delivery_zones) ||
          config.units[index].radiusKm ||
          5,
      });

      setMessage('Dados da unidade carregados do painel. Confira localização e raio antes de salvar.');
    } catch (error) {
      console.error('Erro ao carregar unidade MultiLojas:', error);
      setMessage('Não foi possível carregar os dados dessa unidade.');
    } finally {
      setLoadingUnitIndex(null);
    }
  };

  const geocodeUnitAddress = async (index) => {
    const address = config.units[index]?.address?.trim();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!address) {
      setMessage('Informe o endereço completo da unidade antes de localizar no mapa.');
      return;
    }

    if (!apiKey) {
      setMessage('A chave do Google Maps não está disponível neste ambiente.');
      return;
    }

    setMessage('');
    setLoadingUnitIndex(index);

    try {
      const query = address.toLowerCase().includes('brasil') ? address : `${address}, Brasil`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.[0]) {
        setMessage('Não conseguimos localizar esse endereço. Informe rua, número, bairro, cidade e estado.');
        return;
      }

      const result = data.results[0];
      patchUnit(index, {
        address: result.formatted_address || address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      });

      setMessage('Endereço localizado com sucesso. Coordenadas atualizadas.');
    } catch (error) {
      console.error('Erro ao localizar unidade no mapa:', error);
      setMessage('Falha ao localizar o endereço da unidade.');
    } finally {
      setLoadingUnitIndex(null);
    }
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
        address: unit.address.trim(),
        lat: Number(String(unit.lat).replace(',', '.')),
        lng: Number(String(unit.lng).replace(',', '.')),
        radiusKm: Number(String(unit.radiusKm).replace(',', '.')),
        enabled: unit.enabled !== false,
      }));

    if (config.enabled && validUnits.length < 2) {
      setMessage('Para ativar o MultiLojas, cadastre pelo menos duas unidades válidas.');
      return;
    }

    const invalidGeo = validUnits.find(
      (unit) =>
        !Number.isFinite(unit.lat) ||
        !Number.isFinite(unit.lng) ||
        !Number.isFinite(unit.radiusKm) ||
        unit.radiusKm <= 0
    );

    if (config.enabled && config.routingMode !== 'manual' && invalidGeo) {
      setMessage(
        `Revise localização e raio da unidade "${invalidGeo.name}". O roteamento geográfico precisa de latitude, longitude e raio válido.`
      );
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
                  Direcionamento geográfico de unidades
                </h1>
                <p className="text-slate-500 mt-2 max-w-2xl">
                  Um único endereço de entrada, com cada unidade mantendo seu painel, catálogo e pedidos independentes.
                  A Velo recomenda a loja pela localização real do consumidor.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, enabled: event.target.checked }))
                  }
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
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, networkName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">Modo de direcionamento</span>
                <select
                  value={config.routingMode}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, routingMode: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hybrid">Híbrido: localização + escolha manual</option>
                  <option value="geo">Geográfico: endereço/GPS</option>
                  <option value="manual">Somente escolha manual</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-black text-slate-700">Texto de orientação</span>
                <input
                  value={config.subtitle}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, subtitle: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={config.rememberSelection}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, rememberSelection: event.target.checked }))
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-black text-slate-800">Lembrar última unidade escolhida</p>
                  <p className="text-sm text-slate-500">
                    Facilita a recompra, mantendo a opção de alterar a loja quando necessário.
                  </p>
                </div>
              </label>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Unidades e áreas de atendimento</h2>
                  <p className="text-sm text-slate-500">
                    O MVP usa latitude/longitude + raio. Polígonos personalizados entram na próxima evolução.
                  </p>
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <p className="font-black text-slate-900">Unidade {index + 1}</p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadStoreData(index)}
                          disabled={loadingUnitIndex === index}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-xs font-black hover:bg-slate-200 disabled:opacity-60"
                        >
                          {loadingUnitIndex === index
                            ? <Loader2 className="animate-spin" size={15} />
                            : <RefreshCw size={15} />}
                          Carregar do painel
                        </button>

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

                      <div className="md:col-span-2 rounded-2xl bg-blue-50 border border-blue-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin size={17} className="text-blue-600" />
                          <p className="font-black text-blue-900">Área geográfica</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <label className="md:col-span-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Endereço da unidade</span>
                            <div className="mt-1.5 flex gap-2">
                              <input
                                value={unit.address}
                                onChange={(event) => updateUnit(index, 'address', event.target.value)}
                                placeholder="Rua, número, bairro, cidade - UF"
                                className="flex-1 min-w-0 rounded-xl border border-blue-200 bg-white px-3 py-2.5"
                              />
                              <button
                                type="button"
                                onClick={() => geocodeUnitAddress(index)}
                                disabled={loadingUnitIndex === index}
                                className="rounded-xl bg-blue-600 text-white px-3 py-2.5 font-black disabled:opacity-60"
                                title="Localizar endereço no mapa"
                              >
                                {loadingUnitIndex === index
                                  ? <Loader2 className="animate-spin" size={18} />
                                  : <LocateFixed size={18} />}
                              </button>
                            </div>
                          </label>

                          <label>
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Latitude</span>
                            <input
                              value={unit.lat}
                              onChange={(event) => updateUnit(index, 'lat', event.target.value)}
                              inputMode="decimal"
                              placeholder="-27.000000"
                              className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5"
                            />
                          </label>

                          <label>
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Longitude</span>
                            <input
                              value={unit.lng}
                              onChange={(event) => updateUnit(index, 'lng', event.target.value)}
                              inputMode="decimal"
                              placeholder="-48.000000"
                              className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5"
                            />
                          </label>

                          <label className="md:col-span-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Raio máximo de atendimento</span>
                            <div className="mt-1.5 flex items-center gap-2">
                              <input
                                value={unit.radiusKm}
                                onChange={(event) => updateUnit(index, 'radiusKm', event.target.value)}
                                inputMode="decimal"
                                placeholder="5"
                                className="w-32 rounded-xl border border-blue-200 bg-white px-3 py-2.5"
                              />
                              <span className="font-black text-blue-900">km</span>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">
                              Se a unidade já usa Zonas de Entrega, "Carregar do painel" aproveita automaticamente o maior raio configurado.
                            </p>
                          </label>
                        </div>
                      </div>

                      <label className="md:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Descrição opcional</span>
                        <input
                          value={unit.description}
                          onChange={(event) => updateUnit(index, 'description', event.target.value)}
                          placeholder="Ex.: atende Saco Grande e região"
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
                Quando MultiLojas estiver ativo, a página inicial exibe o localizador. O /admin e os painéis das unidades continuam independentes.
              </p>
            </section>

            {message && (
              <div
                className={
                  `rounded-xl p-4 text-sm font-bold ${
                    message.includes('sucesso') || message.includes('carregados') || message.includes('localizado')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`
                }
              >
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
