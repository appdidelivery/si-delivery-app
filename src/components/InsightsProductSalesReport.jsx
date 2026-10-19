import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import ProductSalesReport from './ProductSalesReport';

const PERIODS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'personalizado', label: 'Período personalizado' }
];

const getDates = (period, customStart, customEnd) => {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  if (period === 'hoje') start.setHours(0, 0, 0, 0);
  else if (period === 'mes') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === 'personalizado') {
    if (!customStart || !customEnd) throw new Error('Informe as duas datas do período.');
    start = new Date(customStart + 'T00:00:00');
    const finalDate = new Date(customEnd + 'T23:59:59.999');
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(finalDate.getTime()) || start > finalDate) {
      throw new Error('O período informado é inválido.');
    }
    if (start > now) throw new Error('O início não pode estar no futuro.');
    return { start, end: finalDate > now ? now : finalDate };
  } else start.setDate(start.getDate() - Number(period));
  return { start, end };
};

export default function InsightsProductSalesReport({ storeId }) {
  const [period, setPeriod] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportOrders, setReportOrders] = useState([]);
  const [hasResults, setHasResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setReportOrders([]);
    setHasResults(false);
    setError('');
    setIsLoading(false);
  }, [storeId, period, customStart, customEnd]);

  useEffect(() => () => { requestId.current += 1; }, []);

  const loadReport = async () => {
    if (!storeId) return;
    const currentRequest = ++requestId.current;
    setHasResults(false);
    setIsLoading(true);
    setError('');
    try {
      const { start, end } = getDates(period, customStart, customEnd);
      const q = query(
        collection(db, 'orders'),
        where('storeId', '==', storeId),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      if (currentRequest !== requestId.current) return;
      setReportOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setHasResults(true);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      console.error('Erro no relatório por produto do Velo Insights:', err);
      setReportOrders([]);
      setError(err.message || 'Não foi possível carregar as vendas do período.');
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-8">
      <div className="mb-5">
        <h2 className="text-xl md:text-2xl font-black italic uppercase text-slate-800">Relatórios de Vendas</h2>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Analise os produtos vendidos, quantidade, faturamento por item e pedidos relacionados.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <label className="block text-xs uppercase font-black text-slate-600">
          Período das vendas
          <select value={period} onChange={event => setPeriod(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400">
            {PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {period === 'personalizado' && (
          <>
            <label className="block text-xs uppercase font-black text-slate-600">
              Data inicial
              <input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-400" />
            </label>
            <label className="block text-xs uppercase font-black text-slate-600">
              Data final
              <input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-400" />
            </label>
          </>
        )}
      </div>
      <button type="button" onClick={loadReport} disabled={isLoading || !storeId}
        className="rounded-xl bg-purple-600 px-6 py-3 font-black text-white text-xs uppercase hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading ? 'Consultando histórico...' : 'Gerar relatório por produto'}
      </button>
      {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-4 mt-4">{error}</p>}
      {hasResults && <ProductSalesReport orders={reportOrders} />}
      {!hasResults && !isLoading && !error && (
        <p className="text-xs text-slate-400 font-medium mt-4">Selecione o período e gere o relatório para consultar o histórico completo, sem o limite da lista de pedidos recentes.</p>
      )}
    </div>
  );
}
