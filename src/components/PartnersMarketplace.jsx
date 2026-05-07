import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from "../services/firebase"; // ATENÇÃO: Ajuste este caminho de importação conforme a estrutura do seu projeto Velo
import { Search, MessageCircle, Package, Camera, TrendingUp, Handshake, Ticket, Printer, Calculator, Truck, Lightbulb, Shield, Wrench, Tag, Megaphone, Link, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ESTÁTICO (Parceiros do Ecossistema Food Service) ---
const mockPartners = [
  {
    id: 1,
    name: 'Agência Marka',
    category: 'Tráfego',
    description: 'Transformando marcas em resultados com foco em performance (Meta & Google Ads). Cases: Solary Metais, Airo Energia e Cleo Moraes.',
    imageUrl: '/Marka-logo-P1.png', 
    whatsapp: '5551984687497',
    website: 'https://agenciamarka.com.br', 
    badge: 'Selo de Qualidade Velo',
    discount: 'Auditoria de Conta Gratuita'
  },
  {
    id: 2,
    name: 'Mamedes Papéis',
    category: 'Embalagens',
    description: 'Encontre papéis de alta qualidade: parafinado, impermeável, kraft, manteiga, interfolha e papéis personalizados com sua logo para hambúrguer e frios.',
    imageUrl: '/mamedes-logo.png',
    whatsapp: '5541998989480',
    website: 'https://loja.mamedes.com.br',
    badge: 'Fábrica Parceira',
    discount: '5% OFF na 1ª Compra cupom PRIM05'
  },
  {
    id: 3,
    name: 'BGEstudio',
    category: 'Foto e Vídeo', /* Como você só tem as categorias padrão que mandou antes, encaixei na mais próxima, mas você pode mudar para "Marketing" se adicionar essa categoria no filtro depois */
    description: 'Transformamos a presença digital do seu delivery com design estratégico, vídeos, gestão de redes e tecnologia para atrair mais clientes.',
    imageUrl: '/bgestudio-logo.png', 
    whatsapp: '5548984643809',
    badge: 'Agência Parceira',
    discount: '3 Banners Exclusivos Grátis'
  },
  {
    id: 4,
    name: 'PrintTech Equipamentos',
    category: 'Equipamentos',
    description: 'Impressoras térmicas não fiscais, bobinas, PDVs Touch e tablets robustos para os garçons no salão.',
    imageUrl: 'https://images.unsplash.com/photo-1614064010375-9c0250cd77ea?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999993',
    badge: 'Pronta Entrega',
    discount: '1 Caixa de Bobina Grátis'
  },
  {
    id: 5,
    name: 'Contabiliza Food',
    category: 'Contabilidade',
    description: 'Escritório contábil exclusivo para restaurantes e delivery. Foco em ST, redução de impostos e folha de motoboys.',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999994',
    discount: 'Abertura de CNPJ Grátis'
  },
  {
    id: 6,
    name: 'MotoLinc Entregas',
    category: 'Logística',
    description: 'Cooperativa de motoboys sob demanda. Terceirize sua frota para dias de pico de pedidos sem dor de cabeça.',
    imageUrl: 'https://images.unsplash.com/photo-1558126319-c9fe1b0289f6?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999995',
    badge: 'Motoboys Express',
  },
  {
    id: 7,
    name: 'Chef Consultoria',
    category: 'Consultoria',
    description: 'Engenharia de cardápio, precificação estratégica de pratos, fichas técnicas e redução drástica de desperdício.',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a8720?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999996',
    discount: 'Análise de Cardápio Grátis'
  },
  {
    id: 8,
    name: 'Registro Seguro',
    category: 'Jurídico',
    description: 'Assessoria jurídica para Registro de Marca no INPI. Proteja o nome da sua hamburgueria/pizzaria de copiadores.',
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999998',
  },
  {
    id: 9,
    name: 'Mestre da Chapa Frio/Quente',
    category: 'Manutenção',
    description: 'Consertos express e manutenção preventiva de freezers, chapas, coifas, fritadeiras e fornos industriais.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999999',
    discount: 'Visita Técnica com 50% OFF'
  },
  {
    id: 10,
    name: 'Aventais & Cia',
    category: 'Uniformes',
    description: 'Confecção de dolmãs, aventais de lona/couro rústicos, bonés e camisetas personalizadas com a logo do seu delivery.',
    imageUrl: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999990',
  },
  {
    id: 11,
    name: 'Embalagens Original',
    category: 'Embalagens',
    description: 'Loja virtual especializada em embalagens plásticas, de isopor e descartáveis para doces, bolos, salgados e assados. A QUALIDADE FAZ A DIFERENÇA.',
    imageUrl: '/embalagensoriginal-logo.png',
    whatsapp: '5511940097091',
    website: 'https://www.embalagensoriginal.com.br/',
    badge: 'Novo Parceiro',
    discount: '10% off prmeira compra, use o cupom: VELO10 - Desconto exclusivo Velo Delivery'
  },
  {
    id: 12,
    name: 'Casal Gastrô São José',
    category: 'Influenciadores',
    description: 'Foco em reviews de hambúrgueres e noites no Kobrasol/Forquilhas. Audiência altamente engajada para delivery noturno.',
    imageUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5548999999999',
    badge: 'Tier Ouro',
    discount: 'Permuta + 10% Venda'
  },
  {
    id: 13,
    name: 'Resenha Viamão',
    category: 'Influenciadores',
    description: 'Humor, futebol e resenha local. Linguagem coloquial ideal para conveniências, bebidas e esquenta de festas na Santa Isabel.',
    imageUrl: 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5551999999999',
    badge: 'Tier Prata',
    discount: 'Permuta Fixa'
  }
];

const categories = [
  { id: 'Todos', icon: <Handshake size={16} /> },
  { id: 'Embalagens', icon: <Package size={16} /> },
  { id: 'Foto e Vídeo', icon: <Camera size={16} /> },
  { id: 'Equipamentos', icon: <Printer size={16} /> },
  { id: 'Contabilidade', icon: <Calculator size={16} /> },
  { id: 'Logística', icon: <Truck size={16} /> },
  { id: 'Consultoria', icon: <Lightbulb size={16} /> },
  { id: 'Tráfego', icon: <TrendingUp size={16} /> },
  { id: 'Jurídico', icon: <Shield size={16} /> },
  { id: 'Manutenção', icon: <Wrench size={16} /> },
  { id: 'Uniformes', icon: <Tag size={16} /> },
  { id: 'Influenciadores', icon: <Megaphone size={16} /> },
];

export default function PartnersMarketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [partnersList, setPartnersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    instagram: '',
    whatsapp: '',
    description: '',
    badge: 'Tier Bronze',
    discount: 'Permuta Simples'
  });

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        // Alvo: Puxar a coleção 'partners' do Firebase.
        // Dica estrutural: Quando ativarmos os influenciadores por lojista, 
        // adicionaremos um where("tenantId", "==", currentStoreId) aqui para garantir o isolamento.
        const partnersRef = collection(db, 'partners');
        const snapshot = await getDocs(partnersRef);
        
        const fetchedPartners = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Blindagem: Se não houver nada no banco ainda, carrega o mock para não deixar a tela vazia nos testes
        if (fetchedPartners.length === 0) {
          setPartnersList(mockPartners);
        } else {
          setPartnersList(fetchedPartners);
        }
      } catch (error) {
        console.error("Erro ao buscar parceiros no Firebase:", error);
        setPartnersList(mockPartners); // Fallback de segurança em caso de erro
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
  }, []);

  const handleAddInfluencer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // BLINDAGEM MULTI-TENANT: Substitua esta string pelo ID real da loja vindo do seu Auth/Contexto (ex: user.uid)
      const currentTenantId = "LOJA_ID_DINAMICO"; 

      const newPartnerData = {
        ...formData,
        category: 'Influenciadores', // Hardcoded de segurança
        tenantId: currentTenantId,
        // Imagem padrão (avatar genérico) caso ele não tenha foto ainda
        imageUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date().toISOString()
      };

      // 1. Salva no Firebase
      const docRef = await addDoc(collection(db, 'partners'), newPartnerData);

      // 2. Atualiza a lista na tela imediatamente (sem precisar dar refresh)
      const partnerWithId = { id: docRef.id, ...newPartnerData };
      setPartnersList((prev) => [...prev, partnerWithId]);

      // 3. Limpa e fecha o modal
      setFormData({ name: '', instagram: '', whatsapp: '', description: '', badge: 'Tier Bronze', discount: 'Permuta Simples' });
      setIsModalOpen(false);
      alert('Influenciador cadastrado com sucesso!');

    } catch (error) {
      console.error("Erro ao cadastrar influenciador:", error);
      alert("Houve um erro ao tentar salvar o influenciador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtro Duplo: Busca por texto + Categoria (agora consumindo do state 'partnersList')
  const filteredPartners = partnersList.filter((partner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          partner.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || partner.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppClick = (phone, partnerName) => {
    const msg = `Olá, sou parceiro do Velo Delivery! Gostaria de saber mais sobre os serviços da ${partnerName}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyAffiliateLink = (partnerId) => {
    // Na fase 2 (Firebase), substituiremos "sualoja" pelo tenantId dinâmico do lojista logado
    const trackingUrl = `https://sualoja.velodelivery.com/?affiliate_id=${partnerId}`;
    navigator.clipboard.writeText(trackingUrl);
    alert(`Link de indicação copiado com sucesso!\n\nEnvie este link para o influenciador: ${trackingUrl}`);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Hub de Parceiros
          </h1>
          <p className="text-slate-400 font-bold mt-2 text-sm">
            Toda a cadeia de suprimentos e serviços para alavancar seu restaurante.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Influenciador
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por contabilidade, embalagens, equipamentos..."
            className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all border-2 flex-shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {cat.icon} {cat.id}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE PARCEIROS */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-[3rem] text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Carregando Hub de Parceiros...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
          <Handshake size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold">Nenhum parceiro encontrado com esses filtros.</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPartners.map((partner) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={partner.id}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl hover:border-blue-200 transition-all duration-300"
              >
                {/* IMAGEM E BADGE */}
                <div className={`relative h-48 overflow-hidden flex items-center justify-center ${partner.id === 1 ? 'bg-slate-900 p-8' : 'bg-slate-100'}`}>
                  <img
                    src={partner.imageUrl}
                    alt={partner.name}
                    className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${partner.id === 1 ? 'object-contain drop-shadow-2xl' : 'object-cover'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  
                  {partner.badge && (
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                      ⭐ {partner.badge}
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {partner.category}
                    </span>
                  </div>
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-black text-xl text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {partner.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6 flex-1">
                    {partner.description}
                  </p>

                  <div className="mt-auto flex flex-col gap-3">
                    {/* TARJA DE DESCONTO */}
                    {partner.discount && (
                      <div className="bg-orange-50 border-2 border-dashed border-orange-200 text-orange-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-2">
                        <Ticket size={18} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                          {partner.discount}
                        </span>
                      </div>
                    )}

                   {/* BOTÕES DE AÇÃO (WhatsApp e Site) */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          const msg = `Olá! Sou lojista da Velo Delivery e vi vocês no Hub de Parceiros. Queria saber mais sobre seus serviços.`;
                          window.open(`https://wa.me/${partner.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        Falar no WhatsApp
                      </button>

                      {/* BOTÃO DO SITE (SEO Link Building - Dofollow) */}
                      {partner.website && partner.category !== 'Influenciadores' && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="dofollow" 
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9"></path></svg>
                          Acessar Site
                        </a>
                      )}

                      {/* BOTÃO GERADOR DE LINK (Apenas para Influenciadores) */}
                      {partner.category === 'Influenciadores' && (
                        <button
                          onClick={() => handleCopyAffiliateLink(partner.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Link size={18} />
                          Copiar Link de Indicação
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* MODAL DE CADASTRO DE INFLUENCIADOR */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mb-2">Cadastrar Influenciador</h2>
                <p className="text-slate-500 font-bold text-sm">Adicione um novo parceiro local para gerar vendas via indicação.</p>
              </div>

              <form onSubmit={handleAddInfluencer} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nome / Perfil</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Casal Gastrô São José"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">@ Instagram</label>
                    <input
                      type="text"
                      placeholder="@"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all"
                      value={formData.instagram}
                      onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">WhatsApp</label>
                    <input
                      required
                      type="text"
                      placeholder="Somente números"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Categoria (Tier)</label>
                    <select
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all cursor-pointer"
                      value={formData.badge}
                      onChange={(e) => setFormData({...formData, badge: e.target.value})}
                    >
                      <option value="Tier Bronze">Tier Bronze</option>
                      <option value="Tier Prata">Tier Prata</option>
                      <option value="Tier Ouro">Tier Ouro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Acordo</label>
                    <select
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all cursor-pointer"
                      value={formData.discount}
                      onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    >
                      <option value="Permuta Simples">Permuta Simples</option>
                      <option value="Permuta + 5% Venda">Permuta + 5%</option>
                      <option value="Permuta + 10% Venda">Permuta + 10%</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Breve Descrição / Nicho</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Ex: Foco em lanches e rotina noturna em Viamão."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-300 transition-all resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Salvando...' : 'Finalizar Cadastro'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}