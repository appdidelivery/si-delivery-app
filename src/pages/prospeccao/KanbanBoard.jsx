import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Ajuste o caminho do seu firebase config

const COLUNAS = [
  { id: 'extraidos', titulo: 'Leads Extraídos (Serper)' },
  { id: 'abordagem', titulo: 'Abordagem Inicial' },
  { id: 'respondidos', titulo: 'Respondidos / Qualificados' },
  { id: 'fechados', titulo: 'Fechados (Impulso Velo)' }
];

export default function KanbanBoard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'leads_prospeccao'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(leadsData);
    });
    return () => unsubscribe();
  }, []);

  const moverLead = async (leadId, novaColuna) => {
    const leadRef = doc(db, 'leads_prospeccao', leadId);
    await updateDoc(leadRef, { status_funil: novaColuna });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Motor de Prospecção Velo</h1>
        <p className="text-gray-500">Gestão de contas do Google Meu Negócio e automação de WhatsApp</p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {COLUNAS.map(coluna => (
          <div key={coluna.id} className="min-w-[320px] bg-gray-200 rounded-lg p-4 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-700 flex justify-between items-center">
              {coluna.titulo}
              <span className="bg-gray-300 text-gray-700 text-xs py-1 px-2 rounded-full">
                {leads.filter(l => l.status_funil === coluna.id).length}
              </span>
            </h2>

            <div className="flex flex-col gap-3 min-h-[500px]">
              {leads.filter(lead => lead.status_funil === coluna.id).map(lead => (
                <motion.div
                  key={lead.id}
                  layoutId={lead.id}
                  className="bg-white p-4 rounded-md shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-sm">{lead.nome}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {lead.nicho}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{lead.telefone}</p>
                  
                  <div className="flex gap-2 mt-2">
                    {coluna.id === 'extraidos' && (
                      <button 
                        onClick={() => moverLead(lead.id, 'abordagem')}
                        className="w-full bg-green-500 text-white text-xs font-bold py-2 rounded hover:bg-green-600 transition-colors"
                      >
                        Disparar Áudio 1
                      </button>
                    )}
                    {coluna.id === 'abordagem' && (
                      <button 
                        onClick={() => moverLead(lead.id, 'respondidos')}
                        className="w-full bg-blue-500 text-white text-xs font-bold py-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Marcar Resposta
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}