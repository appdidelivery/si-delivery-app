import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase'; // Usando sua conexão Firebase existente
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Plus, Target, Beaker, Zap, ArrowRight, Info, CheckCircle2, PhoneCall, ToggleRight, AlertCircle, XCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VeloLeanEngine() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('TODAS');
    const [features, setFeatures] = useState([]);
    
    // Estados do Modal de Nova Hipótese
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFeature, setNewFeature] = useState({ title: '', summary: '', kpi: '' });

    // 1. CARREGAR DADOS DO FIREBASE EM TEMPO REAL
    useEffect(() => {
        const q = query(collection(db, 'velo_lean_features'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const featuresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar por data de criação (mais recentes primeiro)
            featuresData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setFeatures(featuresData);
        });
        return () => unsubscribe();
    }, []);

    // 2. CRIAR NOVA HIPÓTESE (Salvar no Banco)
    const handleAddFeature = async (e) => {
        e.preventDefault();
        if (!newFeature.title || !newFeature.kpi) return;
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'velo_lean_features'), {
                title: newFeature.title,
                summary: newFeature.summary,
                kpi: newFeature.kpi,
                status: 'hipotese',
                impactStatus: 'Pendente',
                createdAt: serverTimestamp(),
                // Campos extras pré-iniciados para fases futuras
                activeStores: [],
                isFlagOn: false,
                checks: { dataCollected: false, callScheduled: false },
                decisionType: null
            });
            setIsModalOpen(false);
            setNewFeature({ title: '', summary: '', kpi: '' });
        } catch (error) {
            alert('Erro ao criar hipótese: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. MOVER CARD NO KANBAN (Atualizar Banco)
    const moveFeature = async (id, newStatus) => {
        try {
            const updateData = { status: newStatus };
            
            // Regras automáticas ao mudar de fase
            if (newStatus === 'rollout') updateData.isFlagOn = true;
            if (newStatus === 'decisao') updateData.decisionType = 'acelerada'; // Padrão, pode ser editado depois

            await updateDoc(doc(db, 'velo_lean_features', id), updateData);
        } catch (error) {
            alert('Erro ao mover card.');
        }
    };

    // 4. DELETAR CARD
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta funcionalidade?')) {
            await deleteDoc(doc(db, 'velo_lean_features', id));
        }
    };

    // Definição das Colunas
    const COLUMNS = [
        { id: 'hipotese', title: '💡 Hipótese & Blindagem', border: 'border-slate-200' },
        { id: 'rollout', title: '🚀 Rollout Controlado', border: 'border-blue-200' },
        { id: 'termometro', title: '📊 Termômetro & Dados', border: 'border-amber-200' },
        { id: 'decisao', title: '⚡ Decisão Cirúrgica', border: 'border-emerald-200' }
    ];

    const FILTERS = ['TODAS', 'EM BLINDAGEM', 'EM TESTE (COHORT)', 'CALL AGENDADA', 'ACELERADAS'];

    // Componente do Card (Lê do Firebase)
    const FeatureCard = ({ feature, colIndex }) => (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative group hover:shadow-md transition-shadow">
            
            {/* Botão Deletar (Visível no Hover) */}
            <button onClick={() => handleDelete(feature.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14}/>
            </button>

            {/* Header do Card */}
            <div className="pr-5">
                <h4 className="font-black text-slate-800 text-sm leading-tight">{feature.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-snug mt-1">{feature.summary}</p>
            </div>
            
            <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                    <Target size={10} /> KPI: {feature.kpi}
                </span>
            </div>

            {/* Renderização Condicional Específica por Coluna */}
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                {feature.status === 'hipotese' && (
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Análise de Impacto:</span>
                        <span className={`px-2 py-0.5 rounded-full ${feature.impactStatus === 'Aprovada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {feature.impactStatus || 'Pendente'}
                        </span>
                    </div>
                )}

                {feature.status === 'rollout' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500 flex items-center gap-1"><ToggleRight size={12} className={feature.isFlagOn ? "text-blue-500" : "text-slate-400"}/> Feature Flag</span>
                            <span className={`px-2 py-0.5 rounded-full ${feature.isFlagOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                {feature.isFlagOn ? 'LIGADO' : 'DESLIGADO'}
                            </span>
                        </div>
                        {feature.activeStores?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {feature.activeStores.map(store => (
                                    <span key={store} className="text-[9px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm">
                                        [{store}]
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {feature.status === 'termometro' && (
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                        <div className="flex items-center gap-1">
                            {feature.checks?.dataCollected ? <CheckCircle2 size={12} className="text-green-500"/> : <AlertCircle size={12} className="text-orange-400"/>}
                            Dados coletados (Mixpanel/GA4)
                        </div>
                        <div className="flex items-center gap-1">
                            {feature.checks?.callScheduled ? <CheckCircle2 size={12} className="text-green-500"/> : <AlertCircle size={12} className="text-slate-300"/>}
                            Entrevista/Call Realizada
                        </div>
                    </div>
                )}

                {feature.status === 'decisao' && (
                    <div className={`flex items-center justify-center gap-1 text-[10px] font-black uppercase p-1 rounded ${feature.decisionType === 'acelerada' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {feature.decisionType === 'acelerada' ? <Zap size={12}/> : <XCircle size={12}/>}
                        {feature.decisionType === 'acelerada' ? 'Acelerada (Main App)' : 'Pivotada (Descartada)'}
                    </div>
                )}
            </div>

            {/* Footer / Botões */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <button className="text-slate-500 text-[10px] font-black uppercase px-2 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-100 transition-colors">
                    {feature.status === 'termometro' ? <PhoneCall size={12}/> : <Info size={12}/>}
                    {feature.status === 'termometro' ? 'Call' : 'Detalhes'}
                </button>
                
                {colIndex < COLUMNS.length - 1 && (
                    <button 
                        onClick={() => moveFeature(feature.id, COLUMNS[colIndex + 1].id)} 
                        className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 active:scale-95 shadow-sm transition-all"
                    >
                        Avançar <ArrowRight size={12}/>
                    </button>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            {/* Modal de Nova Hipótese */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-slate-200">
                            <div className="bg-slate-900 p-5 flex justify-between items-center">
                                <div>
                                    <h2 className="text-white font-black italic uppercase">Nova Hipótese</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ciclo Construir-Medir-Aprender</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleAddFeature} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome da Feature (O que vamos testar?)</label>
                                    <input required type="text" placeholder="Ex: Botão Pagar Garçom" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newFeature.title} onChange={e => setNewFeature({...newFeature, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Resumo (Por que achamos que vai funcionar?)</label>
                                    <textarea required rows="2" placeholder="Ex: Clientes não querem esperar a conta na mesa..." className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" value={newFeature.summary} onChange={e => setNewFeature({...newFeature, summary: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Métrica Principal (KPI Alvo)</label>
                                    <input required type="text" placeholder="Ex: Tempo Médio de Atendimento" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={newFeature.kpi} onChange={e => setNewFeature({...newFeature, kpi: e.target.value})} />
                                </div>

                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-black uppercase text-sm tracking-widest transition-all mt-2 disabled:opacity-50">
                                    {isSubmitting ? 'Injetando no Kanban...' : 'Adicionar ao Funil de MVP'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header Dark */}
            <header className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-md relative z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg">
                        <Beaker size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase">Velo Lean Engine</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestão Enxuta de Funcionalidades e Tração</p>
                    </div>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar feature..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 text-white border-none outline-none focus:ring-2 ring-blue-500 font-bold placeholder:text-slate-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
                        <Plus size={16} className="mr-1"/> Nova Hipótese
                    </button>
                </div>
            </header>

            {/* Barra de Filtros Inteligentes */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 overflow-x-auto shrink-0 relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Search size={14}/> Filtros:
                </span>
                
                {FILTERS.map(filter => (
                    <button 
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border whitespace-nowrap ${
                            activeFilter === filter 
                                ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Kanban Board Principal */}
            <main className="flex-1 p-6 overflow-x-auto relative">
                <div className="flex gap-6 min-w-max h-full items-start">
                    {COLUMNS.map((col, index) => {
                        const colFeatures = features.filter(f => {
                            if (f.status !== col.id) return false;
                            if (searchTerm && !f.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                            
                            if (activeFilter === 'EM BLINDAGEM' && f.status !== 'hipotese') return false;
                            if (activeFilter === 'EM TESTE (COHORT)' && f.status !== 'rollout') return false;
                            if (activeFilter === 'ACELERADAS' && f.decisionType !== 'acelerada') return false;
                            if (activeFilter === 'CALL AGENDADA' && f.status !== 'termometro') return false;
                            
                            return true;
                        });

                        let colBgColor = 'bg-slate-100';
                        if (index === 1) colBgColor = 'bg-[#f0f7ff]';
                        if (index === 2) colBgColor = 'bg-[#fffbeb]';
                        if (index === 3) colBgColor = 'bg-[#f0fdf4]';

                        return (
                            <div key={col.id} className={`w-80 flex flex-col rounded-3xl ${colBgColor} border ${col.border} overflow-hidden max-h-[calc(100vh-140px)] shadow-sm`}>
                                <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm flex justify-between items-center shrink-0">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-1.5">
                                        {col.title}
                                    </h3>
                                    <span className="bg-white text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
                                        {colFeatures.length}
                                    </span>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                                    {colFeatures.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-24 text-slate-400 opacity-60">
                                            <p className="text-xs font-bold uppercase tracking-widest mt-2">Vazia</p>
                                        </div>
                                    )}
                                    {colFeatures.map(feature => (
                                        <FeatureCard key={feature.id} feature={feature} colIndex={index} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}