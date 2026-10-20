import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { exportProductCatalogCsv, parseProductCatalogCsv } from '../lib/productCatalogCsv';

// O painel e multi-tenant: NUNCA escolhemos a loja pelo arquivo importado.
export default function ProductCatalogImportExport({ storeId, storeName, products = [], categories = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [preview, setPreview] = useState(null);
  const [readError, setReadError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [publishNew, setPublishNew] = useState(false);
  const [updateStock, setUpdateStock] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(false);

  const storeLabel = storeName || storeId || 'Loja nao identificada';

  async function chooseCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPreview(null);
    setReadError('');
    setResult(null);
    setConfirmed(false);
    setSelectedName(file?.name || '');
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setReadError('Selecione um arquivo CSV. Arquivos Excel (.xlsx) devem ser exportados como CSV UTF-8.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setReadError('Arquivo muito grande. Divida a importacao em blocos menores que 12 MB.');
      return;
    }
    try {
      setPreview(parseProductCatalogCsv(await file.text()));
    } catch (error) {
      setReadError(error.message || 'Nao foi possivel ler o arquivo.');
    }
  }

  function exportCsv() {
    if (!storeId || !products.length) {
      window.alert('Esta loja nao possui produtos para exportar.');
      return;
    }
    // A lista recebida e a mesma colecao filtrada por storeId pelo painel.
    const scoped = products.filter(product => product.storeId === storeId);
    const blob = new Blob([exportProductCatalogCsv(scoped)], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'catalogo_' + storeId + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importCsv() {
    if (!storeId || !auth.currentUser || importing || !preview?.rows?.length ||
        preview.errors.length || !confirmed) return;
    if (!window.confirm('IMPORTAR NA LOJA: ' + storeLabel + '\n\n' +
      preview.rows.length + ' produtos serao criados ou atualizados. ' +
      'Produtos ja existentes mantem imagens, promocoes e configuracoes nao presentes no CSV. Continuar?')) return;
    setImporting(true);
    setResult(null);
    setReadError('');
    setProgress({ done: 0, total: preview.rows.length });
    let created = 0;
    let updated = 0;
    try {
      const existingProducts = products.filter(product => product.storeId === storeId);
      const byId = new Map(existingProducts.map(product => [product.id, product]));
      const byCode = new Map();
      existingProducts.forEach(product => {
        [product.sku, product.linvixCode, product.erpCode, product.code].forEach(code => {
          if (code !== undefined && code !== null && String(code).trim()) {
            byCode.set(String(code).trim(), product);
          }
        });
      });

      const existingCategories = new Set(
        categories.filter(cat => cat.storeId === storeId)
          .map(cat => String(cat.name || '').trim().toLocaleLowerCase('pt-BR'))
      );
      const newCategories = Array.from(new Set(preview.rows.map(row => row.category)))
        .filter(name => !existingCategories.has(name.toLocaleLowerCase('pt-BR')));
      // Geramos IDs estaveis para que uma repeticao de importacao seja segura.
      for (let i = 0; i < newCategories.length; i += 250) {
        const batch = writeBatch(db);
        newCategories.slice(i, i + 250).forEach(name => {
          const categoryId = 'csvcat_' + storeId + '_' + encodeURIComponent(name.toLocaleLowerCase('pt-BR'));
          batch.set(doc(db, 'categories', categoryId), {
            storeId, name, isActive: true, order: 999
          }, { merge: true });
        });
        await batch.commit();
      }

      // Lotes abaixo do limite de 500 gravacoes do Firestore.
      for (let i = 0; i < preview.rows.length; i += 250) {
        const batch = writeBatch(db);
        const slice = preview.rows.slice(i, i + 250);
        slice.forEach(row => {
          const previous = (row.idVelo && byId.get(row.idVelo)) || byCode.get(row.code);
          const isNew = !previous;
          const documentId = isNew ? 'catalog_' + storeId + '_' + encodeURIComponent(row.code) : previous.id;
          const reference = doc(db, 'products', documentId);
          const fields = {
            storeId,
            sku: row.code,
            linvixCode: row.code,
            name: row.name,
            category: row.category,
            price: row.price,
            saleUnit: row.saleUnit,
            updatedAt: serverTimestamp()
          };
          if (row.costPrice !== null) fields.costPrice = row.costPrice;
          if (row.saleUnit === 'kg') fields.weightStepGrams = previous?.weightStepGrams || 100;
          if (updateStock && row.stock !== null) fields.stock = row.stock;
          if (updateStatus && row.active !== null) fields.isActive = row.active;
          if (isNew) {
            Object.assign(fields, {
              createdAt: serverTimestamp(),
              description: '',
              imageUrl: '',
              promotionalPrice: 0,
              stock: row.stock !== null && updateStock ? row.stock : '',
              isActive: updateStatus && row.active !== null ? row.active : publishNew
            });
            created++;
          } else {
            updated++;
          }
          batch.set(reference, fields, { merge: true });
          byCode.set(row.code, { ...fields, id: documentId });
        });
        await batch.commit();
        setProgress({ done: Math.min(i + slice.length, preview.rows.length), total: preview.rows.length });
      }
      setResult({ created, updated });
      setConfirmed(false);
    } catch (error) {
      console.error('Falha na importacao de catalogo:', error);
      setReadError('Importacao interrompida: ' + (error.message || 'erro desconhecido') +
        '. Os lotes ja confirmados permanecem salvos. Reimporte o mesmo arquivo para continuar sem duplicar os codigos.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="bg-sky-700 text-white px-4 py-3 rounded-xl font-black shadow-sm flex items-center gap-2 hover:bg-sky-800 uppercase tracking-widest text-[10px]">
        <span aria-hidden="true">⇅</span> Importar / Exportar Produtos
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Importar e exportar produtos"
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-3 md:p-6">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 md:p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Importar / Exportar Produtos</h2>
                <p className="text-xs font-bold text-slate-600 mt-1">Loja atual: {storeLabel}</p>
                <p className="text-[11px] text-slate-400">ID da loja: {storeId || 'nao identificado'}</p>
              </div>
              <button type="button" disabled={importing} onClick={() => setOpen(false)}
                className="bg-slate-100 rounded-full px-3 py-2 font-bold text-slate-700 disabled:opacity-40"
                aria-label="Fechar">✕</button>
            </div>
            <section className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <h3 className="font-black text-slate-800">1. Fazer backup ou copiar o catalogo</h3>
              <p className="text-xs text-slate-600">Exporta somente os produtos desta loja em CSV. O arquivo pode ser reimportado no mesmo painel.</p>
              <button type="button" onClick={exportCsv} disabled={importing || !storeId || !products.length}
                className="rounded-xl bg-emerald-700 text-white px-4 py-3 text-xs font-black disabled:opacity-40">Exportar catalogo CSV ({products.filter(p => p.storeId === storeId).length})</button>
            </section>
            <section className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-black text-slate-800">2. Escolher CSV e revisar antes de importar</h3>
              <label className="block cursor-pointer border-2 border-dashed border-sky-300 rounded-xl bg-sky-50 p-4 text-center text-sky-800 font-black text-sm">
                Selecionar arquivo CSV
                <input type="file" accept=".csv,text/csv" className="sr-only"
                  onChange={chooseCsv} disabled={importing} />
              </label>
              {selectedName && <p className="text-xs text-slate-500 break-all">Arquivo: {selectedName}</p>}
              {preview && (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-3 font-bold text-slate-800">
                    <span>{preview.rows.length.toLocaleString('pt-BR')} validos</span>
                    <span>{preview.errors.length} erros exibidos</span>
                    <span>{preview.duplicateCount} codigos repetidos ignorados</span>
                  </div>
                  {preview.uncategorizedCount > 0 && (
                    <p className="text-amber-800 text-xs">{preview.uncategorizedCount} itens sem categoria serao marcados como A CLASSIFICAR.</p>
                  )}
                  <div className="max-h-36 overflow-y-auto text-xs bg-slate-50 rounded-lg p-2">
                    {preview.rows.slice(0, 8).map(row => (
                      <div key={row.code} className="border-b border-slate-200 py-1">
                        {row.code} — {row.name} — R$ {row.price.toFixed(2)} — {row.category} ({row.saleUnit})
                      </div>
                    ))}
                  </div>
                  {preview.errors.length > 0 && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
                      <strong>Corrija o arquivo antes da importacao:</strong>
                      {preview.errors.slice(0, 8).map((error, i) => <p key={i}>{error}</p>)}
                    </div>
                  )}
                </div>
              )}
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={publishNew} disabled={importing}
                  onChange={e => setPublishNew(e.target.checked)} />
                Publicar imediatamente produtos novos. Desmarcado: novos produtos ficam inativos ate conferir precos e disponibilidade.
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={updateStock} disabled={importing}
                  onChange={e => setUpdateStock(e.target.checked)} />
                Aplicar estoque quando informado no CSV. Campos de estoque vazios nunca alteram o estoque atual.
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={updateStatus} disabled={importing}
                  onChange={e => setUpdateStatus(e.target.checked)} />
                Aplicar status ativo/inativo quando informado no CSV.
              </label>
              <label className="flex items-start gap-2 text-xs font-black text-slate-800 bg-amber-50 p-3 rounded-xl">
                <input type="checkbox" checked={confirmed} disabled={importing}
                  onChange={e => setConfirmed(e.target.checked)} />
                Confirmo que estou no painel da loja correta ({storeLabel}) e revisei os valores. Os codigos existentes serao atualizados, nao duplicados.
              </label>
              {readError && <p role="alert" className="text-xs text-red-700 bg-red-50 rounded-xl p-3">{readError}</p>}
              {importing && (
                <div className="space-y-1">
                  <p className="text-xs font-black text-sky-900">Importando: {progress.done.toLocaleString('pt-BR')} / {progress.total.toLocaleString('pt-BR')}</p>
                  <progress className="w-full" value={progress.done} max={progress.total || 1} />
                  <p className="text-xs text-slate-500">Nao feche esta tela ate a conclusao.</p>
                </div>
              )}
              {result && (
                <p role="status" className="text-sm text-emerald-800 font-black bg-emerald-50 p-3 rounded-xl">
                  Concluido nesta loja: {result.created} criados e {result.updated} atualizados. Revise o catalogo antes de publicar.
                </p>
              )}
              <button type="button" onClick={importCsv}
                disabled={!storeId || !preview?.rows?.length || !!preview?.errors?.length || !confirmed || importing}
                className="w-full rounded-xl bg-sky-700 text-white p-4 font-black disabled:opacity-40">
                {importing ? 'Importando produtos...' : 'Confirmar importacao nesta loja'}
              </button>
            </section>
            <p className="text-[11px] text-slate-500">Importe o mesmo CSV separadamente no painel de cada unidade. O sistema nao publica nem altera dados em outras lojas automaticamente. Arquivos Excel devem ser salvos em CSV UTF-8.</p>
          </div>
        </div>
      )}
    </>
  );
}
