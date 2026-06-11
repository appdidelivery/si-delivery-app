import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Loader2, Send, Phone, MapPin, User, Settings, ArrowRight, ArrowLeft, Trash2, CheckCircle2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProspectChat from '../components/ProspectChat'; // <-- Importando o Chat

export default function ProspeccaoKanban() {
    const [leads, setLeads] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Filtros de Qualificação Velo
    const [filters, setFilters] = useState({
        onlyWithPhone: false,
        noWebsite: false,      // Ideal para vender a criação da loja
        noOrderLink: false,    // Identifica quem não tem cardápio digital
        hasInstagram: false    // Bom para saber se o lead é engajado
    });
    
    // Estado para controlar qual lead está com o Chat aberto
    const [activeChatLead, setActiveChatLead] = useState(null);
    
    // Carregar leads do Firebase
    useEffect(() => {
        const q = query(collection(db, 'leads_prospeccao'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordena os mais recentes primeiro
            leadsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setLeads(leadsData);
        });
        return () => unsubscribe();
    }, []);

    // 1. Buscar Leads no Google via Vercel Backend
    const handleSearchLeads = async (e) => {
        e.preventDefault();
        if (!searchTerm) return;
        setIsSearching(true);

        console.log(`🚀 [Frontend] Iniciando busca por: "${searchTerm}"`);

        try {
            const response = await fetch('/api/prospeccao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'prospeccao_serper', queryTerm: searchTerm })
            });
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Erro na API da Vercel. Formato de resposta inválido.");
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao buscar no Serper');
            }

            console.log(`📦 [Frontend] O backend entregou ${data.leads.length} restaurantes brutos.`);
            if (data.leads.length > 0) {
                 console.log(`🔍 [Raio-X] Estrutura completa do 1º lead:`, data.leads[0]);
            }

            let added = 0;
            for (const place of data.leads) {
                // Adicionado 'phone_number' (com underline) na malha de busca
                const rawPhone = place.phoneNumber || place.phone_number || place.formatted_phone_number || place.international_phone_number || place.phone || place.telefone;
                const leadName = place.title || place.name || 'Sem Nome';
                
                if (!rawPhone) {
                    // RAIO-X IMPRESSO: Mostra exatamente o que o Serper entregou
                    console.log(`❌ [Descartado] ${leadName} - Motivo: Chave de telefone ausente. As chaves recebidas foram: [ ${Object.keys(place).join(', ')} ]`);
                    continue; 
                }

                let cleanPhone = String(rawPhone).replace(/\D/g, ''); 
                
                if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
                    cleanPhone = `55${cleanPhone}`;
                }

                if (cleanPhone.length < 10) {
                     console.log(`❌ [Descartado] ${leadName} - Motivo: O telefone é muito curto/inválido (${cleanPhone}).`);
                     continue;
                }

                const isDuplicate = leads.some(l => l.phone === cleanPhone);
                
                if (isDuplicate) {
                    console.log(`🔁 [Descartado] ${leadName} - Motivo: O telefone ${cleanPhone} JÁ EXISTE no seu Kanban.`);
                } else {
                    console.log(`✅ [Adicionado] ${leadName} - Telefone limpo e válido: ${cleanPhone}`);
                    await addDoc(collection(db, 'leads_prospeccao'), {
                        name: leadName,
                        phone: cleanPhone,
                        address: place.address || place.formatted_address || '',
                        website: place.website || '',
                        orderUrl: place.orderUrl || '',
                        instagram: place.instagram || '',
                        status: 'extracted',
                        createdAt: serverTimestamp()
                    });
                    added++;
                }
            }
            
            if (added > 0) {
                alert(`🎯 Sucesso! ${added} novos restaurantes adicionados ao funil.`);
            } else {
                alert(`Nenhum lead NOVO foi adicionado. \nA pesquisa retornou ${data.leads.length} resultados, mas todos foram rejeitados. \nAbra o Inspecionar (F12) > Console para ver os detalhes!`);
            }
            
        } catch (error) {
            alert(`Erro na busca: ${error.message}`);
            console.error("Erro na busca de leads:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // 2. Mudar Status no Kanban
    const handleChangeStatus = async (leadId, newStatus) => {
        try {
            const updatePayload = { status: newStatus };

            // INTEGRAÇÃO WHATSAPP CLOUD API (META)
            // Se o card for movido para a coluna de "Abordagem Inicial" (contacted),
            // injetamos a flag para a Cloud Function fazer o disparo em background.
            // Proteção: não afeta as outras colunas.
            if (newStatus === 'contacted') {
                updatePayload.wppCloudStatus = 'pending_trigger';
                updatePayload.wppTriggeredAt = serverTimestamp();
            }

            await updateDoc(doc(db, 'leads_prospeccao', leadId), updatePayload);
        } catch (error) {
            alert('Erro ao atualizar status.');
        }
    };

    // 3. Disparar Mensagem Fria (Nova Arquitetura Assíncrona)
    const handleSendColdMessage = async (lead) => {
        try {
            // O frontend não faz mais requisições bloqueantes. 
            // Apenas atualiza o status do Firestore e a UI responde instantaneamente.
            // A Cloud Function cuidará de identificar a mudança e disparar o Template da Meta.
            await handleChangeStatus(lead.id, 'contacted');
        } catch (error) {
            alert(`Erro ao acionar abordagem: ${error.message}`);
        }
    };

    const handleDelete = async (leadId) => {
        if (window.confirm('Excluir este lead definitivamente?')) {
            await deleteDoc(doc(db, 'leads_prospeccao', leadId));
        }
    };

    // Estrutura das Colunas Kanban
    const COLUMNS = [
        { id: 'extracted', title: '🔍 Leads Extraídos', color: 'bg-slate-100', border: 'border-slate-200' },
        { id: 'contacted', title: '💬 Abordagem Inicial', color: 'bg-blue-50', border: 'border-blue-200' },
        { id: 'replied', title: '🔥 Responderam', color: 'bg-orange-50', border: 'border-orange-200' },
        { id: 'closed', title: '✅ Fechados', color: 'bg-green-50', border: 'border-green-200' }
    ];

    const LeadCard = ({ lead, colIndex }) => (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-2 relative group">
            <button onClick={() => handleDelete(lead.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
            <h4 className="font-black text-slate-800 text-sm leading-tight pr-6">{lead.name}</h4>
            
            {lead.phone && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Phone size={12} className="text-blue-500"/> {lead.phone}
                </div>
            )}
            {lead.address && (
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400 font-medium leading-tight">
                    <MapPin size={12} className="shrink-0 mt-0.5"/> {lead.address}
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                {/* Botões de Mover no Kanban */}
                <div className="flex gap-1">
                    {colIndex > 0 && (
                        <button onClick={() => handleChangeStatus(lead.id, COLUMNS[colIndex - 1].id)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><ArrowLeft size={14}/></button>
                    )}
                    {colIndex < COLUMNS.length - 1 && (
                        <button onClick={() => handleChangeStatus(lead.id, COLUMNS[colIndex + 1].id)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><ArrowRight size={14}/></button>
                    )}
                </div>

                {/* Botão de Ação Primária */}
                {lead.status === 'extracted' && lead.phone && (
                    <button onClick={() => handleSendColdMessage(lead)} className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 active:scale-95 shadow-sm">
                        <Send size={12}/> Abordar
                    </button>
                )}
                
                {/* Botão de Abrir o Chat (Aparece se o lead não estiver na primeira coluna) */}
                {lead.status !== 'extracted' && lead.phone && (
                    <button onClick={() => setActiveChatLead(lead)} className="bg-[#25D366] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#1ebd59] active:scale-95 shadow-sm">
                        <MessageCircle size={12}/> Chat
                    </button>
                )}

                {lead.status === 'replied' && (
                    <button onClick={() => handleChangeStatus(lead.id, 'closed')} className="bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-green-600 active:scale-95 shadow-sm">
                        <CheckCircle2 size={12}/> Vendeu
                    </button>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-md relative z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg">
                        <User size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase">Velo Máquina de Vendas</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Encontre restaurantes sem site</p>
                    </div>
                </div>

                <form onSubmit={handleSearchLeads} className="flex w-full md:w-auto gap-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Ex: Sushi em Florianópolis, SC"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 text-white border-none outline-none focus:ring-2 ring-blue-500 font-bold placeholder:text-slate-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={isSearching || !searchTerm} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center shrink-0">
                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Prospectar'}
                    </button>
                    </form>
            </header>

            {/* Painel Lateral do Chat (Abre por cima do Kanban) */}
            <AnimatePresence>
                {activeChatLead && (
                    <ProspectChat lead={activeChatLead} onClose={() => setActiveChatLead(null)} />
                )}
            </AnimatePresence>

            {/* Barra de Filtros Inteligentes */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 overflow-x-auto">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Search size={14}/> Filtros:
                </span>
                
                <button 
                    onClick={() => setFilters(f => ({ ...f, onlyWithPhone: !f.onlyWithPhone }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border ${filters.onlyWithPhone ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    <Phone size={12}/> Com Telefone
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, noWebsite: !f.noWebsite }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.noWebsite ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Sem Site Próprio
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, noOrderLink: !f.noOrderLink }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.noOrderLink ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Sem Cardápio Digital
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, hasInstagram: !f.hasInstagram }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.hasInstagram ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Tem Instagram
                </button>
            </div>

            {/* Kanban Board */}
            <main className="flex-1 p-6 overflow-x-auto relative">
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map((col, index) => {
                        // Aplica os filtros antes de renderizar as colunas
                        const colLeads = leads.filter(l => {
                            if (l.status !== col.id) return false;
                            if (filters.onlyWithPhone && !l.phone) return false;
                            if (filters.noWebsite && l.website) return false;
                            if (filters.noOrderLink && l.orderUrl) return false;
                            if (filters.hasInstagram && !l.instagram) return false;
                            return true;
                        });

                        return (
                            <div key={col.id} className={`w-80 flex flex-col rounded-3xl ${col.color} border ${col.border} overflow-hidden max-h-[calc(100vh-140px)] shadow-sm`}>
                                <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm flex justify-between items-center shrink-0">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">{col.title}</h3>
                                    <span className="bg-white text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{colLeads.length}</span>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                                    {colLeads.length === 0 && <p className="text-center text-xs font-bold text-slate-400 mt-4 opacity-50">Vazio</p>}
                                    {colLeads.map(lead => <LeadCard key={lead.id} lead={lead} colIndex={index} />)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}