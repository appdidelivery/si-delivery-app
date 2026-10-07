import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Save, CheckCircle, AlertTriangle, Link2, Unplug, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/apiAuth';

const initialCredentials = {
  codigoLinvix: '',
  clientId: '',
  clientSecret: '',
};

const formatTimestamp = (value) => {
  if (!value) return 'Ainda não sincronizado';
  if (value?.toDate) return value.toDate().toLocaleString('pt-BR');
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString('pt-BR');
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('pt-BR');
  }
  return 'Sincronização registrada';
};

export default function LinvixIntegrationPanel({ storeId, settings }) {
  const saved = settings?.integrations?.linvix || {};
  const [credentials, setCredentials] = useState(initialCredentials);
  const [connected, setConnected] = useState(!!saved.connected);
  const [locations, setLocations] = useState(saved.availableLocations || []);
  const [selectedLocationId, setSelectedLocationId] = useState(saved.selectedLocation?.id || '');
  const [status, setStatus] = useState(saved);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => String(location.id) === String(selectedLocationId)) ||
      (saved.selectedLocation?.name ? saved.selectedLocation : null),
    [locations, selectedLocationId, saved.selectedLocation]
  );

  useEffect(() => {
    setConnected(!!saved.connected);
    setLocations(saved.availableLocations || []);
    setStatus(saved);
    if (saved.selectedLocation?.id) {
      setSelectedLocationId(saved.selectedLocation.id);
    }
  }, [saved.connected, saved.availableLocations, saved.selectedLocation, saved.lastSyncAt]);

  const callLinvix = async (action, payload = {}) => {
    const response = await authenticatedFetch('/api/linvix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, storeId, ...payload }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Falha na integração Linvix.');
    }
    return data;
  };

  const connect = async () => {
    if (!credentials.codigoLinvix || !credentials.clientId || !credentials.clientSecret) {
      return setMessage({ type: 'error', text: 'Preencha Código Linvix/Emitente, Client ID e Client Secret.' });
    }

    setBusy('connect');
    setMessage(null);
    try {
      const data = await callLinvix('connect', credentials);
      setConnected(true);
      setLocations(data.locations || []);
      setStatus((prev) => ({ ...prev, connected: true, autoSyncEnabled: false, healthStatus: 'healthy' }));
      setCredentials(initialCredentials);
      setMessage({
        type: 'success',
        text: `Conexão validada. ${(data.locations || []).length} estoque(s) local(is) encontrado(s).`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const refreshLocations = async () => {
    setBusy('locations');
    setMessage(null);
    try {
      const data = await callLinvix('refreshLocations');
      setLocations(data.locations || []);
      setMessage({ type: 'success', text: 'Locais de estoque atualizados pela Linvix.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const saveLocation = async () => {
    const location = locations.find(
      (item) => String(item.id) === String(selectedLocationId)
    );

    if (!location) {
      return setMessage({ type: 'error', text: 'Selecione o estoque correspondente a esta unidade.' });
    }

    setBusy('saveLocation');
    setMessage(null);
    try {
      await callLinvix('saveLocation', { selectedLocation: location });
      setStatus((prev) => ({ ...prev, selectedLocation: location }));
      setMessage({
        type: 'success',
        text: `Unidade vinculada ao estoque "${location.name}".`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const syncNow = async () => {
    setBusy('sync');
    setMessage(null);
    try {
      const data = await callLinvix('sync');
      setStatus((prev) => ({
        ...prev,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncStats: data.stats,
        healthStatus: 'healthy',
      }));

      setMessage({
        type: data.stats?.unmatchedProducts ? 'warning' : 'success',
        text: `Sincronização concluída: ${data.stats?.matchedProducts || 0} produtos encontrados e ${data.stats?.updatedProducts || 0} saldos atualizados.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Desconectar a Linvix desta unidade? O estoque da Velo deixará de receber atualizações do ERP.')) {
      return;
    }

    setBusy('disconnect');
    setMessage(null);
    try {
      await callLinvix('disconnect');
      setConnected(false);
      setLocations([]);
      setSelectedLocationId('');
      setStatus({ connected: false });
      setMessage({ type: 'success', text: 'Integração Linvix desconectada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const healthClass =
    status?.healthStatus === 'degraded'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : connected
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col gap-6 hover:shadow-lg transition-all lg:col-span-2">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <Database className="text-indigo-600" size={40} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Linvix ERP</h3>
              <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${healthClass}`}>
                {status?.healthStatus === 'degraded' ? 'Atenção' : connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-xl">
              Sincroniza o saldo disponível do Estoque Local da Linvix com esta unidade da Velo Delivery.
              Para o Mercado Monte Verde, configure uma vez em cada painel e selecione o estoque correspondente de cada loja.
            </p>
          </div>
        </div>

        {connected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={!!busy}
            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
          >
            <Unplug size={14} /> Desconectar
          </button>
        )}
      </div>

      {!connected ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={credentials.codigoLinvix}
            onChange={(e) => setCredentials((prev) => ({ ...prev, codigoLinvix: e.target.value.trim() }))}
            placeholder="Código Linvix / Emitente"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="text"
            value={credentials.clientId}
            onChange={(e) => setCredentials((prev) => ({ ...prev, clientId: e.target.value.trim() }))}
            placeholder="Client ID"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="password"
            value={credentials.clientSecret}
            onChange={(e) => setCredentials((prev) => ({ ...prev, clientSecret: e.target.value.trim() }))}
            placeholder="Client Secret"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <button
            type="button"
            onClick={connect}
            disabled={!!busy}
            className="md:col-span-3 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'connect' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Conectar e localizar estoques
          </button>
          <p className="md:col-span-3 text-[10px] text-slate-400 font-bold">
            As credenciais são gravadas apenas no backend privado da Velo. O Client Secret não fica exposto no painel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Estoque Linvix desta unidade
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
              >
                <option value="">Selecione o Estoque Local...</option>
                {locations.map((location) => (
                  <option key={location.id || location.name} value={location.id}>
                    {location.name}{location.code ? ` — ${location.code}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={refreshLocations}
              disabled={!!busy}
              className="px-5 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'locations' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar locais
            </button>

            <button
              type="button"
              onClick={saveLocation}
              disabled={!!busy || !selectedLocationId}
              className="px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'saveLocation' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar vínculo
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Local vinculado</p>
              <p className="text-sm font-black text-slate-700 mt-1 truncate">
                {status?.selectedLocation?.name || selectedLocation?.name || 'Pendente'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Última sincronização</p>
              <p className="text-xs font-bold text-slate-700 mt-1">
                {formatTimestamp(status?.lastSyncAt)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Produtos encontrados</p>
              <p className="text-xl font-black text-slate-800 mt-1">
                {status?.lastSyncStats?.matchedProducts ?? '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Sem correspondência</p>
              <p className="text-xl font-black text-slate-800 mt-1">
                {status?.lastSyncStats?.unmatchedProducts ?? '—'}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
            status?.autoSyncEnabled === true
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            {status?.autoSyncEnabled === true ? (
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">
                Automação: {status?.autoSyncEnabled === true ? 'Ativa' : 'Aguardando homologação'}
              </p>
              <p className="text-[10px] font-bold mt-1 leading-relaxed">
                {status?.autoSyncEnabled === true
                  ? 'O estoque desta unidade está habilitado para sincronização automática com a Linvix.'
                  : 'Primeiro validamos o saldo desta unidade e o fluxo de pedidos/baixa no ERP. Até lá, use a sincronização manual para homologação.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={syncNow}
            disabled={!!busy || !(status?.selectedLocation?.name || selectedLocation?.name)}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'sync' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sincronizar estoque agora
          </button>

          <div className="flex items-start gap-2 text-[10px] font-bold text-slate-500 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
            <CheckCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
            A Velo usa o <strong>estoque disponível</strong> retornado pela Linvix. O vínculo de produtos é feito primeiro pelo código de barras/GTIN; produtos sem correspondência ficam sinalizados para ajuste.
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-2 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : message.type === 'warning'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-green-50 text-green-700 border-green-100'
          }`}
        >
          {message.type === 'error' || message.type === 'warning' ? (
            <AlertTriangle size={16} className="shrink-0" />
          ) : (
            <CheckCircle size={16} className="shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {status?.lastError && !message && (
        <div className="p-4 rounded-2xl border bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{status.lastError}</span>
        </div>
      )}
    </div>
  );
}
