import React, { useMemo, useState } from 'react';
import { Download, Package } from 'lucide-react';
import { buildProductSales, formatReportQuantity } from '../lib/productSalesReport';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProductSalesReport({ orders = [] }) {
  const [productKey, setProductKey] = useState('todos');
  const [search, setSearch] = useState('');
  const { rows, products } = useMemo(() => buildProductSales(orders), [orders]);
  const selected = products.find(p => p.key === productKey);
  const activeKey = selected ? productKey : 'todos';
  const filteredRows = activeKey === 'todos' ? rows : rows.filter(r => r.key === activeKey);
  const filteredProducts = selected ? [selected] : products;
  const matchesSearch = products.filter(p => p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) || p.key === activeKey);
  const revenue = filteredRows.reduce((sum, r) => sum + r.revenue, 0);
  const ordersCount = new Set(filteredRows.map(r => r.orderId)).size;
  const units = filteredRows.filter(r => r.unit === 'un').reduce((sum, r) => sum + r.quantity, 0);
  const kilos = filteredRows.filter(r => r.unit === 'kg').reduce((sum, r) => sum + r.quantity, 0);

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const escape = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const records = [['Pedido', 'Data', 'Produto', 'Quantidade', 'Unidade', 'Preco unitario (R$)', 'Receita (R$)']];
    filteredRows.forEach(row => records.push([
      row.orderId, row.date ? row.date.toLocaleString('pt-BR') : '', row.name,
      row.quantity.toFixed(3).replace('.', ','), row.unit,
      row.price.toFixed(2).replace('.', ','), row.revenue.toFixed(2).replace('.', ',')
    ]));
    const blob = new Blob(['\uFEFF' + records.map(record => record.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'velo-vendas-produtos-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center mb-4">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-black uppercase text-slate-800"><Package size={18} /> Vendas por Produto</h4>
          <p className="text-xs text-slate-500 mt-1">Consulte a quantidade e a receita dos itens vendidos no período escolhido.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!filteredRows.length} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40">
          <Download size={16} /> Exportar CSV
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <label className="block text-xs font-bold text-slate-600">
          Buscar produto
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do produto" className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-400"/>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Filtrar vendas do produto
          <select value={activeKey} onChange={e => setProductKey(e.target.value)} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-400">
            <option value="todos">Todos os produtos ({products.length})</option>
            {matchesSearch.map(p => <option key={p.key} value={p.key}>{p.name} ({p.unit})</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-900 text-white"><p className="text-[10px] font-black uppercase text-slate-300">Receita dos itens</p><p className="font-black text-lg text-emerald-300">{money(revenue)}</p></div>
        <div className="p-3 rounded-xl bg-blue-50"><p className="text-[10px] font-black uppercase text-blue-700">Pedidos</p><p className="font-black text-lg text-blue-900">{ordersCount}</p></div>
        <div className="p-3 rounded-xl bg-slate-100"><p className="text-[10px] font-black uppercase text-slate-600">Unidades</p><p className="font-black text-lg">{formatReportQuantity(units, 'un')}</p></div>
        <div className="p-3 rounded-xl bg-slate-100"><p className="text-[10px] font-black uppercase text-slate-600">Peso</p><p className="font-black text-lg">{formatReportQuantity(kilos, 'kg')}</p></div>
      </div>
      <div className="max-h-64 overflow-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-[10px]"><tr><th className="p-3">Produto</th><th className="p-3 text-right">Pedidos</th><th className="p-3 text-right">Quantidade</th><th className="p-3 text-right">Receita</th></tr></thead>
          <tbody>
            {filteredProducts.length ? filteredProducts.map(p => <tr key={p.key} className="border-t border-slate-100"><td className="p-3 font-bold">{p.name}</td><td className="p-3 text-right">{p.orderCount}</td><td className="p-3 text-right">{formatReportQuantity(p.quantity, p.unit)}</td><td className="p-3 text-right font-black text-emerald-600">{money(p.revenue)}</td></tr>) : <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum produto vendido no período.</td></tr>}
          </tbody>
        </table>
      </div>
      {selected && <div className="mt-4">
        <h5 className="font-black text-xs text-slate-700 uppercase mb-2">Pedidos com o produto selecionado</h5>
        <div className="max-h-52 overflow-auto border border-slate-200 rounded-xl"><table className="w-full text-xs text-left"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Pedido</th><th className="p-3">Data</th><th className="p-3 text-right">Quantidade</th><th className="p-3 text-right">Receita</th></tr></thead><tbody>
          {filteredRows.map((r, index) => <tr key={r.orderId + ':' + index} className="border-t border-slate-100"><td className="p-3 font-bold">#{r.orderId.slice(-5).toUpperCase()}</td><td className="p-3">{r.date ? r.date.toLocaleString('pt-BR') : '-'}</td><td className="p-3 text-right">{formatReportQuantity(r.quantity, r.unit)}</td><td className="p-3 text-right font-black">{money(r.revenue)}</td></tr>)}
        </tbody></table></div>
      </div>}
      <p className="mt-3 text-[10px] text-slate-500">Valores brutos dos itens, sem frete ou rateio de descontos gerais. Segue o mesmo critério de pedidos não cancelados do fechamento de caixa.</p>
    </section>
  );
}
