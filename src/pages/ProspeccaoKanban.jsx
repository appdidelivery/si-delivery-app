import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Loader2, Send, Phone, MapPin, User, Settings, ArrowRight, ArrowLeft, Trash2, CheckCircle2, MessageCircle, Star, Store, Clock, Tag, MessageSquareText, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProspectChat from '../components/ProspectChat'; // <-- Importando o Chat
import CentralOmnichannel from '../components/CentralOmnichannel'; // <-- Importando a Central Omnichannel

export default function ProspeccaoKanban() {
    const [leads, setLeads] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeView, setActiveView] = useState('funil'); // <-- Novo Estado para controlar as Abas
    
    // Filtros de Qualificação Velo
    const [filters, setFilters] = useState({
        onlyWithPhone: false,
        noWebsite: false,      // Ideal para vender a criação da loja
        noOrderLink: false,    // Identifica quem não tem cardápio digital
        hasInstagram: false,   // Bom para saber se o lead é engajado
        maxReviews: '',        // NOVO: Filtrar quem tem poucas ou zero avaliações
        segment: ''            // NOVO: Filtrar por palavra-chave (ex: Pizza)
    });
    
    // Estado para controlar qual lead está com o Chat aberto
    const [activeChatLead, setActiveChatLead] = useState(null);

    // NOVO: Controle do Modal de Abordagem Manual
    const [approachLead, setApproachLead] = useState(null);

    // NOVO: Textos de Prospecção Prontos (Você pode editar esses textos aqui no código depois)
    const PROMO_TEMPLATES = [
        {
            title: "Tirar do iFood (Taxas)",
            text: "Opa [Nome], tudo bem? Vi a [Nicho] de vocês no iFood. Vocês já têm um link próprio para fugir daquelas taxas de 27% ou estão dependendo só do app deles?"
        },
        {
            title: "Sem Cardápio / WhatsApp",
            text: "Oi [Nome], tudo joia? Achei vocês aqui no Google, mas vi que não tem um cardápio com link direto. Vocês estão tirando os pedidos no texto mesmo? Tenho uma ferramenta que automatiza isso pra você."
        },
        {
            title: "Foco em SEO / Google",
            text: "Fala [Nome]! Vi a página de vocês aqui no Google, mas notei que estão com poucas avaliações. Sabia que isso derruba vocês nas buscas da cidade? Nosso sistema resolve isso no automático."
        }
    ];
    
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
                // aAdicionado 'phone_number' (com underline) na malha de busca
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
                    
                    // Lógica de Identificação de Marketplaces e Concorrentes
                    const allUrls = [place.website, place.orderUrl].filter(Boolean).join(' ').toLowerCase();
                    let detectedMarketplace = null;
                    if (allUrls.includes('ifood')) detectedMarketplace = 'iFood';
                    else if (allUrls.includes('rappi')) detectedMarketplace = 'Rappi';
                    else if (allUrls.includes('aiqfome')) detectedMarketplace = 'Aiqfome';
                    else if (allUrls.includes('goomer') || allUrls.includes('anotaai') || allUrls.includes('menudino') || allUrls.includes('ola.click')) detectedMarketplace = 'Usa App Terceiro';

                    // Busca a categoria principal fornecida pelo Apify/Google
                    const leadCategory = place.categoryName || place.category || (place.categories ? place.categories[0] : 'Desconhecido');

                    await addDoc(collection(db, 'leads_prospeccao'), {
                        name: leadName,
                        phone: cleanPhone,
                        address: place.address || place.formatted_address || '',
                        website: place.website || '',
                        orderUrl: place.orderUrl || '',
                        instagram: place.instagram || '',
                        rating: place.rating || null,
                        reviewsCount: place.reviewsCount || 0,
                        isOpen: place.isOpen !== undefined ? place.isOpen : null,
                        marketplace: detectedMarketplace,
                        category: leadCategory, // NOVO DADO GRAVADO
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

    // 3. Abrir Modal de Abordagem Manual
    const handleSendColdMessage = (lead) => {
        setApproachLead(lead);
    };

    // 4. Executar Redirecionamento para WhatsApp Web
    const executeManualApproach = async (templateText) => {
        if (!approachLead) return;

        try {
            // 1. Prepara o nome do cliente (pega o primeiro nome) e a categoria
            const firstName = approachLead.name ? approachLead.name.split(' ')[0] : 'pessoal';
            const categoryName = approachLead.category && approachLead.category !== 'Desconhecido' ? approachLead.category.toLowerCase() : 'loja';

            // 2. Substitui as variáveis mágicas no texto
            let finalMessage = templateText
                .replace(/\[Nome\]/gi, firstName)
                .replace(/\[Nicho\]/gi, categoryName);

            // 3. Codifica para o formato URL (converte espaços e emojis)
            const encodedMessage = encodeURIComponent(finalMessage);

            // 4. Limpa o telefone
            let cleanPhone = String(approachLead.phone).replace(/\D/g, '');
            if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

            // 5. Monta a URL oficial do WhatsApp (Abre o app no Mac ou o Web)
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

            // 6. Abre numa nova aba
            window.open(waUrl, '_blank');

            // 7. Move o card para "Abordagem Inicial" no Kanban automaticamente
            await handleChangeStatus(approachLead.id, 'contacted');

            // 8. Fecha o modal
            setApproachLead(null);
        } catch (error) {
            alert(`Erro ao redirecionar para o WhatsApp: ${error.message}`);
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
        { id: 'closed', title: '✅ Fechados', color: 'bg-green-50', border: 'border-green-200' },
        { id: 'discarded', title: '🗑️ DESCARTADOS', color: 'bg-slate-200/40', border: 'border-slate-400', headerBg: 'bg-slate-500/80', titleColor: 'text-white' }
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

            {/* NOVOS DADOS ENRIQUECIDOS (Marketplace, SEO e Disponibilidade) */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
                {lead.category && lead.category !== 'Desconhecido' && (
                    <div className="flex items-center gap-1 bg-purple-50 text-purple-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-purple-200 shadow-sm" title="Segmento no Google">
                        <Tag size={10} />
                        {lead.category}
                    </div>
                )}
                {lead.rating && (
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-yellow-200 shadow-sm" title="Avaliação no Google">
                        <Star size={10} className="fill-yellow-500 text-yellow-500" />
                        {lead.rating} ({lead.reviewsCount || 0})
                    </div>
                )}
                {lead.marketplace && (
                    <div className="flex items-center gap-1 bg-red-50 text-red-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-red-200 shadow-sm" title="Marketplace Detectado">
                        <Store size={10} />
                        {lead.marketplace}
                    </div>
                )}
                {lead.isOpen !== null && lead.isOpen !== undefined && (
                    <div className={`flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border shadow-sm ${lead.isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        <Clock size={10} />
                        {lead.isOpen ? 'Aberto Agora' : 'S.I / Fechado'}
                    </div>
                )}
            </div>

            {/* STATUS DE DESCARTE (Aparece apenas na 5ª coluna) */}
            {lead.status === 'discarded' && (
                <div className="mt-2 bg-slate-200 border border-slate-300 rounded-md p-2 flex items-center justify-center text-[10px] text-slate-700 font-bold w-full uppercase tracking-wider">
                    {lead.discardReason || 'Inviável / Sem Resposta'}
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

            {/* Abas de Navegação do CRM */}
            <div className="bg-white border-b border-slate-200 px-6 flex gap-6 shrink-0 relative z-20">
                <button 
                    onClick={() => setActiveView('funil')}
                    className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-colors ${activeView === 'funil' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Funil de Prospecção
                </button>
                <button 
                    onClick={() => setActiveView('inbox')}
                    className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${activeView === 'inbox' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Caixa de Entrada <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">Inbox</span>
                </button>
            </div>

            {/* Painel Lateral do Chat (Abre por cima do Kanban) */}
            <AnimatePresence>
                {activeChatLead && (
                    <ProspectChat lead={activeChatLead} onClose={() => setActiveChatLead(null)} />
                )}
            </AnimatePresence>

            {/* TELA DA CAIXA DE ENTRADA (Visível apenas na aba inbox) */}
            {activeView === 'inbox' && (
                <main className="flex-1 p-6 relative bg-slate-50">
                    <CentralOmnichannel storeId="main-app" />
                </main>
            )}

            {/* Barra de Filtros Inteligentes (Oculta na aba inbox) */}
            <div className={`bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 overflow-x-auto ${activeView === 'inbox' ? 'hidden' : ''}`}>
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

                {/* NOVO: Input de Máximo de Avaliações */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                    <input
                        type="number"
                        placeholder="Máx. Avaliações (Ex: 10)"
                        value={filters.maxReviews}
                        onChange={(e) => setFilters(f => ({ ...f, maxReviews: e.target.value }))}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-36 transition-all"
                        title="Restaurantes novos ou com pouca relevância no Google"
                    />

                    {/* NOVO: Input de Segmento */}
                    <input
                        type="text"
                        placeholder="Segmento (Ex: Pizza)"
                        value={filters.segment}
                        onChange={(e) => setFilters(f => ({ ...f, segment: e.target.value }))}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-32 transition-all"
                    />
                </div>
            </div>

            {/* Kanban Board (Oculto na aba inbox) */}
            <main className={`flex-1 p-6 overflow-x-auto relative ${activeView === 'inbox' ? 'hidden' : ''}`}>
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map((col, index) => {
                        // Aplica os filtros antes de renderizar as colunas
                        const colLeads = leads.filter(l => {
                            if (l.status !== col.id) return false;
                            if (filters.onlyWithPhone && !l.phone) return false;
                            if (filters.noWebsite && l.website) return false;
                            if (filters.noOrderLink && l.orderUrl) return false;
                            if (filters.hasInstagram && !l.instagram) return false;
                            
                            // NOVO: Filtro de Máximo de Avaliações (Invisíveis no Google)
                            if (filters.maxReviews !== '') {
                                const max = parseInt(filters.maxReviews, 10);
                                if (!isNaN(max) && (l.reviewsCount || 0) > max) return false;
                            }

                            // NOVO: Filtro de Segmento (Ex: Pizza, Sushi)
                            if (filters.segment !== '') {
                                if (!l.category || !l.category.toLowerCase().includes(filters.segment.toLowerCase())) {
                                    return false;
                                }
                            }

                            return true;
                        });

                        return (
                           <div key={col.id} className={`w-80 flex flex-col rounded-3xl ${col.color} border ${col.border} overflow-hidden max-h-[calc(100vh-140px)] shadow-sm`}>
                                <div className={`p-4 border-b border-black/5 ${col.headerBg || 'bg-white/50'} backdrop-blur-sm flex justify-between items-center shrink-0`}>
                                    <h3 className={`font-black uppercase text-xs tracking-widest ${col.titleColor || 'text-slate-800'}`}>{col.title}</h3>
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

            {/* MODAL DE ABORDAGEM MANUAL (WHATSAPP WEB) */}
            <AnimatePresence>
                {approachLead && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-slate-800 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                        <MessageSquareText size={16} className="text-blue-600" />
                                        Escolher Abordagem
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                                        Destino: <span className="text-blue-600">{approachLead.name}</span> ({approachLead.phone})
                                    </p>
                                </div>
                                <button onClick={() => setApproachLead(null)} className="text-slate-400 hover:text-slate-700 transition-colors bg-white p-2 rounded-full shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                            
                            {/* Templates de Mensagem */}
                            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-slate-500 font-medium mb-2">
                                    Clique em uma das mensagens abaixo. O sistema vai preencher os dados do lead e abrir seu WhatsApp Web ou App.
                                </p>

                                {PROMO_TEMPLATES.map((template, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => executeManualApproach(template.text)}
                                        className="text-left bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all group relative"
                                    >
                                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2 flex justify-between items-center">
                                            {template.title}
                                            <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {template.text
                                                .replace(/\[Nome\]/gi, `<strong class="text-blue-600">${approachLead.name?.split(' ')[0] || 'pessoal'}</strong>`)
                                                .replace(/\[Nicho\]/gi, `<strong class="text-blue-600">${approachLead.category !== 'Desconhecido' ? approachLead.category : 'loja'}</strong>`)
                                            }
                                        </p>
                                        {/* Apenas para renderizar o negrito nas variáveis dinâmicas */}
                                        <div dangerouslySetInnerHTML={{ __html: '' }} />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}