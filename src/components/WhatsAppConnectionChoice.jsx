import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, Smartphone, Loader2, AlertTriangle } from 'lucide-react';

export default function WhatsAppConnectionChoice({ storeId, metaConnected, authenticatedFetch }) {
  const fetchRef = useRef(authenticatedFetch);
  fetchRef.current = authenticatedFetch;
  const session = useRef(null);
  const code = useRef(null);
  const started = useRef(false);
  const timer = useRef(null);
  const selectedMode = useRef('coexistence');
  const [config, setConfig] = useState(null);
  const [mode, setMode] = useState('coexistence');
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const api = useCallback(async (action, values = {}) => {
    const response = await fetchRef.current('/api/whatsapp-embedded-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, action, ...values })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Falha na conexão Meta.');
    return data;
  }, [storeId]);

  const refresh = useCallback(async () => {
    setConfig(await api('status'));
  }, [api]);

  useEffect(() => {
    let current = true;
    setConfig(null); setError(''); setMessage('');
    api('status').then(s => { if (current) setConfig(s); })
      .catch(e => { if (current) setError(e.message); });
    return () => { current = false; if (timer.current) clearTimeout(timer.current); };
  }, [api]);

  const complete = useCallback(async () => {
    if (!code.current || started.current) return;
    started.current = true;
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      const selected = session.current;
      const result = await api('complete', {
        code: code.current,
        wabaId: selected?.wabaId,
        phoneNumberId: selected?.phoneNumberId,
        coexistence: selectedMode.current === 'coexistence' && selected?.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
      });
      setMessage(result.active ? 'Conta oficial vinculada à Velo.' : 'Conta autorizada: conclua o registro do número.');
      code.current = null;
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [api, refresh]);
  const completeRef = useRef(complete);
  completeRef.current = complete;

  useEffect(() => {
    const listener = event => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return;
      let data = event.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      const name = String(data.event || '').toUpperCase();
      if (['FINISH', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(name)) {
        session.current = { wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id, event: name };
        if (code.current) void completeRef.current();
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  const connect = () => {
    setError(''); setMessage('');
    if (!config?.ready || !config.configId) return setError('Integração Meta pendente de configuração.');
    if (!window.FB?.login) return setError('SDK da Meta indisponível. Atualize a página e tente novamente.');
    code.current = null; session.current = null; started.current = false; selectedMode.current = mode;
    window.FB.init({ appId: config.appId, cookie: true, xfbml: false, version: 'v26.0' });
    window.FB.login(response => {
      if (!response?.authResponse?.code) return setError('Autorização cancelada ou não concluída.');
      code.current = response.authResponse.code;
      setBusy(true);
      if (session.current) void completeRef.current();
      else timer.current = setTimeout(() => void completeRef.current(), 1800);
    }, {
      config_id: config.configId, response_type: 'code', override_default_response_type: true,
      extras: mode === 'coexistence'
        ? { version: 'v4', featureType: 'whatsapp_business_app_onboarding' }
        : { version: 'v4' }
    });
  };

  const register = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('register', { pin }); setPin(''); setMessage('Número registrado com sucesso.'); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="text-green-600"/> Conectar WhatsApp Oficial — Meta</h2>
      <p className="text-sm text-slate-500">Vinculação pela Meta Cloud API, sem Evolution e sem copiar tokens.</p>
      {!config ? <p className="text-sm text-slate-500"><Loader2 size={18} className="animate-spin inline"/> Consultando configurações...</p> :
      (config.active || metaConnected) ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-green-800">
          <p className="font-black flex items-center gap-2"><CheckCircle2 size={20}/> WhatsApp oficial conectado</p>
          <p className="text-sm mt-1">{config.phone || 'A conexão atual será preservada.'}</p>
        </div>
      ) : config.pending ? (
        <form className="bg-blue-50 border border-blue-200 p-5 rounded-xl space-y-3" onSubmit={register}>
          <p className="font-black text-blue-800">Registrar número {config.phone}</p>
          <p className="text-sm text-blue-800">Informe o PIN de seis dígitos de verificação em duas etapas. Guarde esse PIN com segurança.</p>
          <input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} maxLength={6} inputMode="numeric" autoComplete="off" type="password" placeholder="PIN de 6 dígitos" className="block bg-white border rounded-lg p-3"/>
          <button type="submit" disabled={busy || pin.length!==6} className="bg-blue-700 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50">Concluir registro</button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" disabled={busy} onClick={()=>setMode('coexistence')} className={`text-left border-2 p-4 rounded-xl ${mode==='coexistence'?'border-green-500 bg-green-50':'border-slate-200'}`}>
              <p className="font-black flex items-center gap-2"><Smartphone size={18}/> Já uso WhatsApp Business</p>
              <p className="text-xs mt-2">Coexistência: manter aplicativo no celular quando elegível.</p>
            </button>
            <button type="button" disabled={busy} onClick={()=>setMode('new')} className={`text-left border-2 p-4 rounded-xl ${mode==='new'?'border-green-500 bg-green-50':'border-slate-200'}`}>
              <p className="font-black">Novo número para API</p>
              <p className="text-xs mt-2">Verificação e registro de número dedicado à Cloud API.</p>
            </button>
          </div>
          <button type="button" disabled={busy || !config.ready} onClick={connect} className="bg-green-600 text-white rounded-xl p-4 font-black disabled:opacity-50">{busy?'Autorizando...':'Conectar oficialmente com a Meta'}</button>
          {!config.ready && <p className="text-sm bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 flex items-start gap-2"><AlertTriangle size={20}/> Falta configurar: {(config.missing || []).join('; ')}. <a className="underline" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Meta Developers</a></p>}
          <p className="text-xs text-slate-500">O cadastro abre uma janela oficial da Meta. Não usa QR Code do WhatsApp Web.</p>
        </div>
      )}
      {error && <p role="alert" className="text-red-700 bg-red-50 rounded-xl p-3 text-sm">{error}</p>}
      {message && <p role="status" className="text-green-700 bg-green-50 rounded-xl p-3 text-sm">{message}</p>}
    </section>
  );
}
