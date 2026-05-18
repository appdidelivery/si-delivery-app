import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function GmnGeneratorButton({ tenantData, productData }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const response = await fetch('/api/generate-gmn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBuffer: base64Image,
          tenantData: tenantData,
          productData: productData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar imagem no servidor.');
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha de conexão com a esteira de IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 mt-3 w-full">
      <label className="relative cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[9px] uppercase tracking-widest py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 block text-center w-full">
        {loading ? 'Processando IA...' : '⚡ Criar Post GMN (Beta)'}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload} 
          disabled={loading}
        />
      </label>

      {error && <p className="text-red-500 text-[10px] font-bold mt-1 bg-red-50 p-2 rounded-lg border border-red-100 w-full">{error}</p>}

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-4 border border-slate-200 rounded-2xl bg-white shadow-xl w-full"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imagem Otimizada (Fundo Removido):</p>
          <img 
            src={result.processedImage} 
            alt="Produto Processado" 
            className="w-full h-auto max-h-48 object-contain rounded-xl mb-3 border border-slate-100 bg-slate-50"
          />
          
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legenda Sugerida (E-E-A-T):</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-32 overflow-y-auto custom-scrollbar">
            <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{result.copy}</p>
          </div>

          <button 
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(result.copy);
              alert('Texto da postagem copiado com sucesso!');
            }}
            className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition-all"
          >
            Copiar Texto da Postagem
          </button>
        </motion.div>
      )}
    </div>
  );
}