import React, { useEffect, useRef, useState } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import { authenticatedFetch } from '../utils/apiAuth';

export default function GoogleConnectPanel({ storeId, service, saved, onComplete, advanced, onAdvanced }) {
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [notice, setNotice] = useState('');
  const session = useRef(null);
  const generation = useRef(0);
  const timeout = useRef(null);
  const popup = useRef(null);

  useEffect(() => () => {
    generation.current++;
    clearTimeout(timeout.current);
    popup.current?.close();
  }, [storeId, service]);

  async function request(action, extra = {}) {
    const response = await authenticatedFetch('/api/google-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, storeId, service, ...extra })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível conectar ao Google.');
    return data;
  }

  function cancel() {
    generation.current++;
    clearTimeout(timeout.current);
    popup.current?.close();
    session.current = null;
    setPhase('idle');
  }

  async function start() {
    clearTimeout(timeout.current);
    if (advanced) onAdvanced();
    setError('');
    setNotice('');
    setOptions([]);
    setSelected('');
    const attempt = ++generation.current;
    const win = window.open('about:blank', '_blank', 'popup,width=560,height=720');
    if (!win) {
      setError('Permita pop-ups neste site e tente novamente.');
      return;
    }
    win.opener = null;
    popup.current = win;
    setPhase('waiting');
    try {
      const data = await request('start');
      if (attempt !== generation.current) return;
      session.current = data.state;
      setDryRun(data.dryRun === true);
      win.location.href = data.url;
      const deadline = Date.now() + 10 * 60 * 1000;
      const poll = async () => {
        if (attempt !== generation.current) return;
        try {
          if (Date.now() > deadline) throw new Error('O tempo de autorização acabou. Tente novamente.');
          const result = await request('status', { state: data.state });
          if (attempt !== generation.current) return;
          if (result.status === 'error') throw new Error(result.error || 'Autorização não concluída.');
          if (result.status === 'ready') {
            const found = result.options || [];
            if (!found.length) throw new Error('Nenhum recurso compatível encontrado.');
            win.close();
            setOptions(found);
            setSelected(found.length === 1 ? found[0].id : '');
            setPhase('choose');
            return;
          }
          timeout.current = setTimeout(poll, 2500);
        } catch (err) {
          if (attempt !== generation.current) return;
          win.close();
          setError(err.message);
          setPhase('idle');
        }
      };
      timeout.current = setTimeout(poll, 1500);
    } catch (err) {
      win.close();
      if (attempt !== generation.current) return;
      setError(err.message);
      setPhase('idle');
    }
  }

  async function activate() {
    const attempt = generation.current;
    setPhase('saving');
    setError('');
    try {
      const result = await request('select', { state: session.current, optionId: selected });
      if (attempt !== generation.current) return;
      if (result.dryRun) {
        setNotice(result.verification === 'ga4-data-api' ? 'Homologação concluída: leitura GA4 validada pela Analytics Data API. Nenhuma configuração da loja foi alterada.' : 'Homologação concluída. Nenhuma configuração da loja foi alterada.');
        setPhase('idle');
        session.current = null;
        return;
      }
      onComplete();
    } catch (err) {
      if (attempt !== generation.current) return;
      setError(err.message);
      setPhase('choose');
    }
  }

  const connected = saved?.authMode === 'oauth';
  const existing = Boolean(saved?.measurementId || saved?.containerId || saved?.conversionId);
  return (
    <div className="space-y-4 mb-5">
      {existing && <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-sm text-green-800">
        <b>{connected ? 'Conectado com Google' : 'Configuração existente ativa'}</b>
        {connected && saved?.resourceName && <p className="mt-1 break-words">{saved.resourceName}</p>}
      </div>}
      <p className="text-sm text-slate-600">Autorize sua conta Google e escolha o recurso da sua empresa. Não é necessário copiar códigos.</p>
      {phase === 'idle' && <button type="button" onClick={start} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">
        <FaGoogle size={18} /> {existing ? 'Conectar outra conta Google' : 'Conectar com Google'}
      </button>}
      {phase === 'waiting' && <div role="status" className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-800">
        Conclua a autorização na janela do Google. A Velo localizará os recursos automaticamente.
        <button type="button" onClick={cancel} className="block mt-3 underline">Cancelar</button>
      </div>}
      {(phase === 'choose' || phase === 'saving') && <div className="space-y-3">
        <label htmlFor="velo-google-resource" className="block text-sm font-bold text-slate-700">Escolha o recurso da sua loja</label>
        <select id="velo-google-resource" value={selected} disabled={phase === 'saving'} onChange={e => setSelected(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm">
          <option value="">Selecione uma opção</option>
          {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <button type="button" onClick={activate} disabled={!selected || phase === 'saving'} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold disabled:opacity-50">
          {phase === 'saving' ? 'Validando...' : dryRun ? 'Validar seleção (teste)' : 'Confirmar e ativar'}
        </button>
        {phase !== 'saving' && <button type="button" onClick={cancel} className="text-sm underline text-slate-500">Cancelar</button>}
      </div>}
      {notice && <p role="status" className="p-3 bg-green-50 text-green-800 rounded-xl text-sm">{notice}</p>}
      {error && <p role="alert" className="p-3 bg-red-50 text-red-800 rounded-xl text-sm">{error}</p>}
      {service === 'gtm' && <p className="text-xs text-slate-500">A conexão instala o container selecionado. Tags e publicação são gerenciadas separadamente.</p>}
      {service === 'gads' && <p className="text-xs text-slate-500">Selecione uma ação de conversão de compra já configurada no Google Ads.</p>}
      <button type="button" disabled={phase !== 'idle'} onClick={onAdvanced} className="text-xs text-slate-500 underline disabled:opacity-40">
        {advanced ? 'Ocultar configuração manual' : 'Configuração avançada (IDs)'}
      </button>
    </div>
  );
}
