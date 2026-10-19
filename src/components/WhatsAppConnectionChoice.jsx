import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, QrCode, ShieldCheck, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';

// Onboarding por loja: não modifica a API Cloud já ativa.
export default function WhatsAppConnectionChoice({ storeId, metaConnected, authenticatedFetch }) {
  const [method, setMethod] = useState('official');
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const api = useCallback(async action => {
    const response = await authenticatedFetch('/api/whatsapp-qr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, action })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível consultar a conexão.');
    return data;
  }, [storeId, authenticatedFetch]);

  useEffect(() => {
    let mounted = true;
    setQr(''); setConnected(false); setError(''); setScanning(false); setAvailable(null); setMethod('official');
    if (storeId) api('availability').then(data => {
      if (mounted) { setAvailable(data); setConnected(data.connectedMode === 'qr'); }
    }).catch(err => { if (mounted) setError(err.message); });
    return () => { mounted = false; };
  }, [storeId, metaConnected]);

  useEffect(() => {
    if (!scanning || method !== 'qr' || !storeId) return undefined;
    let alive = true;
    const interval = setInterval(async () => {
      try {
        const status = await api('status');
        if (alive && status.connected) {
          setConnected(true); setScanning(false); setQr(''); setError('');
        }
      } catch (err) { if (alive) setError(err.message); }
    }, 4000);
    return () => { alive = false; clearInterval(interval); };
  }, [scanning, method, storeId, api]);

  const run = async action => {
    setBusy(true); setError('');
    try {
      const result = await api(action);
      if (result.connected) {
        setConnected(true); setQr(''); setScanning(false);
      } else {
        setConnected(false);
        if (result.needsCreate) {
          setError('A instância ainda não foi criada. Clique em Gerar QR Code.');
        }
        if (result.qr) {
          setQr(result.qr);
          setScanning(true);
        } else if (action === 'create') {
          const second = await api('qr');
          if (second.qr) { setQr(second.qr); setScanning(true); }
          else setError('Aguardando o servidor gerar a imagem. Clique em Atualizar QR Code.');
        }
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!window.confirm('Desconectar este WhatsApp da Velo? Esta ação encerra a sessão vinculada ao número.')) return;
    setBusy(true); setError('');
    try { await api('disconnect'); setConnected(false); setScanning(false); setQr(''); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase">Conectar WhatsApp da loja</h2>
        <p className="text-xs text-slate-500 mt-1">Escolha como vincular o número. Cada loja possui sua própria conexão.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button type="button" onClick={() => { setMethod('official'); setScanning(false); }} className={`p-4 text-left rounded-2xl border-2 transition-all ${method === 'official' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-200'}`}>
          <div className="flex items-center gap-2 text-green-700 font-black"><ShieldCheck size={20}/> API oficial da Meta</div>
          <p className="text-xs text-slate-600 mt-2">Recomendada para chat, automações e campanhas com modelos aprovados.</p>
          {metaConnected && <span className="inline-block mt-2 text-[10px] text-green-700 font-black">CONECTADA NESTA LOJA</span>}
        </button>
        <button type="button" onClick={() => setMethod('qr')} className={`p-4 text-left rounded-2xl border-2 transition-all ${method === 'qr' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
          <div className="flex items-center gap-2 text-blue-700 font-black"><QrCode size={20}/> Conexão por QR Code</div>
          <p className="text-xs text-slate-600 mt-2">Vincula como aparelho conectado. O número continua no WhatsApp Business do celular.</p>
          {available?.connectedMode === 'qr' && <span className="inline-block mt-2 text-[10px] text-blue-700 font-black">SESSÃO VINCULADA</span>}
        </button>
      </div>
      {method === 'official' ? (
        <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-900">
          {metaConnected
            ? 'A API Oficial já está configurada. Nenhuma alteração será feita. Você pode gerenciar as credenciais e automações no cartão WhatsApp API abaixo.'
            : 'Para usar a API Oficial, abra o cartão WhatsApp API na seção de integrações abaixo. Essa opção exige configuração e aprovação junto à Meta.'}
        </div>
      ) : (
        <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 md:p-6 space-y-4">
          {metaConnected ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 font-bold text-sm">Esta loja já usa a API Oficial. O sistema não permite substituir automaticamente a conexão para evitar perda de atendimento.</p>
          ) : !available?.enabled ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 font-bold text-sm flex items-start gap-2">
              <AlertTriangle size={20} className="shrink-0"/> QR Code ainda depende da habilitação do servidor Evolution API pela equipe Velo. Nenhum número será desconectado.
            </p>
          ) : (
            <>
              {connected ? (
                <div className="flex flex-col gap-3">
                  <span className="flex items-center gap-2 text-green-700 font-black"><CheckCircle2/> WhatsApp vinculado ao painel Velo!</span>
                  <div className="flex gap-3 flex-wrap">
                    <button type="button" disabled={busy} onClick={() => run('status')} className="bg-white border rounded-xl px-4 py-3 font-bold text-xs text-blue-700">Verificar conexão</button>
                    <button type="button" disabled={busy} onClick={disconnect} className="bg-white border border-red-200 rounded-xl px-4 py-3 font-bold text-xs text-red-600">Desconectar sessão</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="flex items-center gap-2 font-black text-slate-800"><Smartphone size={20}/> Leia o QR com o WhatsApp Business</div>
                  {qr && <img src={qr} alt="QR Code para vincular WhatsApp ao painel Velo" className="w-56 h-56 bg-white rounded-xl p-2 border border-blue-100" />}
                  <p className="text-xs text-slate-600 max-w-md">No celular com o número da loja, abra WhatsApp Business → Aparelhos conectados → Conectar um aparelho e aponte a câmera para o código.</p>
                  {scanning && <p className="text-xs font-black text-blue-600 flex items-center gap-2"><Loader2 className="animate-spin" size={15}/> Aguardando leitura do QR...</p>}
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button type="button" disabled={busy} onClick={() => run('create')} className="bg-blue-600 rounded-xl text-white px-5 py-3 text-xs font-black uppercase flex gap-2 items-center disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : <QrCode size={16}/>} Gerar QR Code</button>
                    <button type="button" disabled={busy} onClick={() => run('qr')} className="bg-white border border-blue-200 rounded-xl text-blue-700 px-5 py-3 text-xs font-black uppercase flex gap-2 items-center disabled:opacity-50"><RefreshCw size={16}/> Atualizar QR</button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p role="alert" className="text-xs font-bold text-red-700 rounded-xl bg-red-50 border border-red-100 p-3">{error}</p>}
          <p className="text-[11px] text-slate-500">Esta modalidade usa uma sessão vinculada, não a API oficial. Pode exigir reconexão e não libera campanhas por modelos da Meta. A conexão só é marcada como ativa após confirmação do servidor.</p>
        </div>
      )}
    </section>
  );
}
