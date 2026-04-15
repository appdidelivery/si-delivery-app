import React, { useState } from 'react';
import { HelpCircle, X, Search, ChevronRight, MessageCircle, BookOpen, Rocket, ShoppingCart, CreditCard, Gamepad2, MapPin, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const helpCategories = [
    {
        id: 'start',
        title: '🚀 Primeiros Passos',
        icon: <Rocket size={20} />,
        articles: [
            {
                title: 'Como configurar o Domínio Próprio?',
                content: 'Acesse a aba "Configurações" e desça até "Domínio Próprio". Digite seu domínio (ex: sualoja.com.br). Após solicitar a ativação, vá no painel onde comprou o domínio (Registro.br, Hostinger, etc) e crie os dois apontamentos DNS indicados na tela (Tipo A e CNAME). Aguarde a propagação e chame o suporte para emitir o SSL.'
            },
            {
                title: 'Como alterar o Estilo e a Tipografia?',
                content: 'Na aba "Configurações", você pode escolher o Nicho da Loja (que muda a cor principal), o layout da vitrine (Grade para Conveniência ou Lista para Restaurantes) e a Tipografia (Fontes do Google Fonts). Você também pode subir uma imagem de fundo personalizada.'
            }
        ]
    },
    {
        id: 'pdv',
        title: '🛒 PDV e Modo Garçom',
        icon: <ShoppingCart size={20} />,
        articles: [
            {
                title: 'Como lançar pedidos manuais no Balcão?',
                content: 'Na aba "Lançar Pedido" (Frente de Caixa), você pode buscar produtos rapidamente, aplicar descontos, inserir o endereço (com cálculo automático de frete via mapa ou CEP) e definir se o pagamento já foi recebido ou se ficará pendente.'
            },
            {
                title: 'O que é o Modo Garçom?',
                content: 'Seus garçons podem acessar o sistema diretamente pelo celular. Basta configurar o "PIN do Modo Garçom" na aba Configurações. Com isso, eles lançam produtos direto na "Mesa" sem precisar acessar o painel financeiro.'
            }
        ]
    },
    {
        id: 'finance',
        title: '💳 VeloPay e Recebimentos',
        icon: <CreditCard size={20} />,
        articles: [
            {
                title: 'Como funciona o VeloPay Bank?',
                content: 'O VeloPay é a nossa integração nativa via Efí Bank para você receber Pix diretamente na sua conta, com baixíssimas taxas. Configure na aba "Financeiro". Você pode escolher o prazo de repasse (Na Hora D+0, D+14 ou D+30). Os saques são auditados e transferidos para a Chave PIX vinculada ao seu CNPJ.'
            },
            {
                title: 'Posso usar Stripe ou Mercado Pago?',
                content: 'Sim! Na aba "Financeiro", você pode conectar sua conta da Stripe para processar cartões de crédito via VeloPay, ou plugar o Mercado Pago para gerenciar tanto Pix quanto Cartão com as taxas do próprio MP.'
            },
            {
                title: 'Como funciona a Fatura do Veloapp?',
                content: 'Cobramos apenas pela infraestrutura (Velo Data Fuel). Sua mensalidade cobre até 100 pedidos/mês. Pedidos extras custam R$ 0,25/cada. Se a fatura atrasar (após o dia do vencimento), o sistema é bloqueado automaticamente.'
            }
        ]
    },
    {
        id: 'game',
        title: '🎮 Gamificação e Clube VIP',
        icon: <Gamepad2 size={20} />,
        articles: [
            {
                title: 'Como ativar a Roleta Pós-Checkout?',
                content: 'Na aba "Marketing", vá em "Velo Game" e ative a Roleta. Clique em "Configurar Prêmios" para definir fatias com Cupons (% ou R$), Cashback ou fatias vazias. O cliente roda a roleta logo após finalizar o pedido.'
            },
            {
                title: 'Como funciona a Carteira de Cashback?',
                content: 'Ative o Cashback na aba "Marketing". Toda vez que um pedido é marcado como "✅ Entregue", o sistema credita a % configurada na carteira digital do cliente vinculada ao WhatsApp dele.'
            },
            {
                title: 'Como gerenciar as Missões VIP?',
                content: 'Na aba "Clientes VIP", clique em "Engajamento VIP". Lá você aprova missões que os clientes cumpriram (como avaliar no Google e mandar o print) e libera os pontos para eles resgatarem prêmios.'
            }
        ]
    },
    {
        id: 'whatsapp',
        title: '💬 WhatsApp e Automações',
        icon: <Smartphone size={20} />,
        articles: [
            {
                title: 'Como conectar a API Oficial do WhatsApp?',
                content: 'Na aba "Integrações", selecione WhatsApp API. Você precisará do ID do Número e de um Token de Acesso Permanente gerado no Facebook Developers. Isso libera os disparos automáticos em background.'
            },
            {
                title: 'Recuperação de Carrinho Abandonado',
                content: 'Com a API conectada, ative a automação em "Integrações". O Veloapp enviará mensagens (com opções de desconto) 1 hora após o cliente abandonar o carrinho. Você também pode disparar mensagens manuais na aba "Carrinhos".'
            },
            {
                title: 'Chatbot e Mensagem de Ausência',
                content: 'Você pode ligar o "Menu do Chatbot Automático" para enviar botões interativos aos clientes (Ex: Ver Cardápio, Falar com Humano). O robô também envia aviso de "Loja Fechada" caso o cliente mande mensagem fora do expediente ou durante o Modo Férias.'
            }
        ]
    },
    {
        id: 'delivery',
        title: '🛵 Logística e Insumos',
        icon: <MapPin size={20} />,
        articles: [
            {
                title: 'Como configurar Frete por KM no Mapa?',
                content: 'Na aba "Configurações", vá em "Zonas de Entrega". Busque seu endereço na barra de pesquisa para cravar o pino da loja. Depois, adicione raios em KM e o valor do frete correspondente. O sistema calcula a distância exata em linha reta via Google Maps.'
            },
            {
                title: 'Como funciona a Ficha Técnica (Baixa de Insumos)?',
                content: 'Ative o "Controle de Insumos" nas Configurações. Crie insumos globais (ex: Pão, Hambúrguer, Coca-Cola) na aba "Insumos". Depois, edite um Produto e vincule os ingredientes. Ao vender o produto, o estoque dos insumos é deduzido automaticamente.'
            }
        ]
    }
];

export default function VeloSupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeArticle, setActiveArticle] = useState(null);

    // Filtragem de Busca
    const filteredCategories = helpCategories.map(category => {
        const filteredArticles = category.articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return { ...category, articles: filteredArticles };
    }).filter(category => category.articles.length > 0);

    const handleBack = () => {
        if (activeArticle) {
            setActiveArticle(null);
        } else if (activeCategory) {
            setActiveCategory(null);
        }
    };

    return (
        <>
            {/* Botão Flutuante */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-[90] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 flex items-center justify-center border-4 border-slate-100"
                    >
                        <HelpCircle size={32} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Painel do Widget */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-32px)] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 text-white p-6 relative flex-shrink-0">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-blue-200 hover:text-white transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                            
                            <h2 className="text-xl font-black italic uppercase tracking-tighter mb-1">Central de Ajuda</h2>
                            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Guia de Uso Veloapp</p>

                            {!activeCategory && !activeArticle && (
                                <div className="mt-4 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por dúvidas..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-blue-700/50 text-white placeholder-blue-300 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:ring-2 ring-white border-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Corpo de Conteúdo */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-2 custom-scrollbar">
                            
                            {/* ESTADO 1: Lista de Categorias ou Busca */}
                            {!activeCategory && !activeArticle && (
                                <div className="space-y-2">
                                    {searchTerm && filteredCategories.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Search size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="font-bold text-sm">Nenhum resultado encontrado.</p>
                                        </div>
                                    ) : (
                                        filteredCategories.map(category => (
                                            <div key={category.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                                {!searchTerm ? (
                                                    // Modo Normal: Clica na categoria para ver artigos
                                                    <button 
                                                        onClick={() => setActiveCategory(category)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-blue-600 bg-blue-50 p-2 rounded-xl">
                                                                {category.icon}
                                                            </div>
                                                            <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{category.title}</span>
                                                        </div>
                                                        <ChevronRight size={18} className="text-slate-300" />
                                                    </button>
                                                ) : (
                                                    // Modo Busca: Mostra os artigos diretamente
                                                    <div className="p-2">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">{category.title}</p>
                                                        {category.articles.map((article, idx) => (
                                                            <button 
                                                                key={idx}
                                                                onClick={() => setActiveArticle(article)}
                                                                className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-all"
                                                            >
                                                                <p className="font-bold text-slate-700 text-sm">{article.title}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* ESTADO 2: Visualizando uma Categoria */}
                            {activeCategory && !activeArticle && (
                                <div className="p-2">
                                    <button 
                                        onClick={handleBack}
                                        className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 mb-4 px-2"
                                    >
                                        <ChevronRight size={14} className="rotate-180" /> Voltar
                                    </button>
                                    <div className="flex items-center gap-2 mb-4 px-2">
                                        <div className="text-blue-600">{activeCategory.icon}</div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{activeCategory.title}</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {activeCategory.articles.map((article, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveArticle(article)}
                                                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <BookOpen size={16} className="text-slate-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0" />
                                                    <span className="font-bold text-slate-700 text-sm leading-snug">{article.title}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ESTADO 3: Lendo um Artigo */}
                            {activeArticle && (
                                <div className="p-2 animate-in fade-in slide-in-from-right-4">
                                    <button 
                                        onClick={handleBack}
                                        className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 mb-4 px-2"
                                    >
                                        <ChevronRight size={14} className="rotate-180" /> Voltar
                                    </button>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h3 className="font-black text-lg text-slate-800 leading-tight mb-4">{activeArticle.title}</h3>
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {activeArticle.content}
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer - Suporte Humano */}
                        <div className="bg-white p-4 border-t border-slate-100 flex-shrink-0">
                            <a 
                                href="https://wa.me/5548999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Veloapp" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                <MessageCircle size={16} /> Chamar Suporte Humano
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}