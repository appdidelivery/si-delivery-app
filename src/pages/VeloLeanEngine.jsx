import React, { useState } from 'react';
import { Search, Plus, Target, Beaker, BarChart, Zap, ArrowRight, Info, CheckCircle2, PhoneCall, ToggleRight, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VeloLeanEngine() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('TODAS');

    // MOCK DATA: Ecossistema Velo Delivery
    const [features, setFeatures] = useState([
        {
            id: '1',
            title: 'Modo Garçom Status Pago',
            summary: 'Sinalização visual imediata na tela do PDV para pedidos pagos na mesa.',
            kpi: 'Tempo Médio de Atendimento',
            status: 'hipotese',
            impactStatus: 'Pendente',
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Alerta Sonoro VIP',
            summary: 'Tocar som diferenciado quando um cliente top 10% faz pedido.',
            kpi: 'Retenção de Clientes Ouro',
            status: 'rollout',
            activeStores: ['Cowburguer', 'CSI', 'Confraria'],
            isFlagOn: true,
            createdAt: new Date().toISOString()
        },
        {
            id: '3',
            title: 'Recuperação WhatsApp Cloud API',
            summary: 'Abandono de carrinho disparando template nativo da Meta em 15 min.',
            kpi: 'Conversão Checkout',
            status: 'termometro',
            checks: { dataCollected: true, callScheduled: false },
            createdAt: new Date().toISOString()
        },
        {
            id: '4',
            title: 'Upsell Inteligente no Carrinho',
            summary: 'Sugestão de bebida baseada no prato principal via algoritmo simples.',
            kpi: 'Ticket Médio (AOV)',
            status: 'decisao',
            decisionType: 'acelerada',
            createdAt: new Date().toISOString()
        },
        {
            id: '5',
            title: 'Login por Biometria',
            summary: 'Permitir que o lojista acesse o painel SaaS com FaceID/TouchID.',
            kpi: 'Fricção de Login',
            status: 'decisao',
            decisionType: 'pivotada',
            createdAt: new Date().toISOString()
        }
    ]);

    // Lógica de Movimentação do Kanban
    const moveFeature = (id, newStatus) => {
        setFeatures(features.map(f => f.id === id ? { ...f, status: newStatus } : f));
    };

    // Definição das Colunas
    const COLUMNS = [
        { id: 'hipotese', title: '💡 Hipótese & Blindagem', color: 'bg-slate-50', border: 'border-slate-200' },
        { id: 'rollout', title: '🚀 Rollout Controlado', color: 'bg-blue-50', border: 'border-blue-200' },
        { id: 'termometro', title: '📊 Termômetro & Dados', color: 'bg-amber-50', border: 'border-amber-200' },
        { id: 'decisao', title: '⚡ Decisão Cirúrgica', color: 'bg-emerald-50', border: 'border-emerald-200' }
    ];

    const FILTERS = ['TODAS', 'EM BLINDAGEM', 'EM TESTE (COHORT)', 'CALL AGENDADA', 'ACELERADAS'];

    // Componente do Card (Dinâmico por Fase)
    const FeatureCard = ({ feature, colIndex }) => (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative group hover:shadow-md transition-shadow">
            
            {/* Header do Card */}
            <div>
                <h4 className="font-black text-slate-800 text-sm leading-tight pr-6">{feature.title}</h4>
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
                            {feature.impactStatus}
                        </span>
                    </div>
                )}

                {feature.status === 'rollout' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500 flex items-center gap-1"><ToggleRight size={12} className="text-blue-500"/> Feature Flag</span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">LIGADO</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {feature.activeStores?.map(store => (
                                <span key={store} className="text-[9px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm">
                                    [{store}]
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {feature.status === 'termometro' && (
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
                        <div className="flex items-center gap-1">
                            {feature.checks?.dataCollected ? <CheckCircle2 size={12} className="text-green-500"/> : <AlertCircle size={12} className="text-orange-400"/>}
                            Dados GA4/Console coletados
                        </div>
                        <div className="flex items-center gap-1">
                            {feature.checks?.callScheduled ? <CheckCircle2 size={12} className="text-green-500"/> : <AlertCircle size={12} className="text-slate-300"/>}
                            Call Quinzenal realizada
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
            {/* Header Dark (Padrão Prospecção) */}
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
                            placeholder="Ex: Botão Pagar Garçom"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 text-white border-none outline-none focus:ring-2 ring-blue-500 font-bold placeholder:text-slate-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
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
                        // Aplicação de filtro visual simples para o MVP
                        const colFeatures = features.filter(f => {
                            if (f.status !== col.id) return false;
                            if (searchTerm && !f.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                            
                            // Mock de filtros
                            if (activeFilter === 'EM BLINDAGEM' && f.status !== 'hipotese') return false;
                            if (activeFilter === 'EM TESTE (COHORT)' && f.status !== 'rollout') return false;
                            if (activeFilter === 'ACELERADAS' && f.decisionType !== 'acelerada') return false;
                            if (activeFilter === 'CALL AGENDADA' && f.status !== 'termometro') return false;
                            
                            return true;
                        });

                        // Cores de fundo específicas conforme a solicitação
                        let colBgColor = 'bg-slate-100';
                        if (index === 1) colBgColor = 'bg-[#f0f7ff]'; // Azulado leve
                        if (index === 2) colBgColor = 'bg-[#fffbeb]'; // Amarelado/Âmbar leve
                        if (index === 3) colBgColor = 'bg-[#f0fdf4]'; // Verde leve

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
                                            <p className="text-xs font-bold uppercase tracking-widest mt-2">Vazio</p>
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