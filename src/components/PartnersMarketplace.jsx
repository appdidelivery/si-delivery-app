import React, { useState } from 'react';
import { Search, MessageCircle, Package, Camera, TrendingUp, Handshake, Ticket, Printer, Calculator, Truck, Lightbulb, Shield, Wrench, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ESTÁTICO (Parceiros do Ecossistema Food Service) ---
const mockPartners = [
  {
    id: 1,
    name: 'VeloPack Embalagens',
    category: 'Embalagens',
    description: 'Fábrica de caixas kraft térmicas para hambúrguer e pizza, sacolas personalizadas e papel acoplado anti-gordura.',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999991',
    badge: 'Fábrica Parceira',
    discount: '10% OFF na 1ª Compra'
  },
  {
    id: 2,
    name: 'Click Food Studio',
    category: 'Foto e Vídeo',
    description: 'Fotografia gastronômica profissional e vídeos para Reels. Deixe seu cardápio irresistível e aumente a conversão.',
    imageUrl: 'https://images.unsplash.com/photo-1542010589005-d1eabd3949f4?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999992',
    discount: '5 Fotos Extras de Brinde'
  },
  {
    id: 3,
    name: 'PrintTech Equipamentos',
    category: 'Equipamentos',
    description: 'Impressoras térmicas não fiscais, bobinas, PDVs Touch e tablets robustos para os garçons no salão.',
    imageUrl: 'https://images.unsplash.com/photo-1614064010375-9c0250cd77ea?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999993',
    badge: 'Pronta Entrega',
    discount: '1 Caixa de Bobina Grátis'
  },
  {
    id: 4,
    name: 'Contabiliza Food',
    category: 'Contabilidade',
    description: 'Escritório contábil exclusivo para restaurantes e delivery. Foco em ST, redução de impostos e folha de motoboys.',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999994',
    discount: 'Abertura de CNPJ Grátis'
  },
  {
    id: 5,
    name: 'MotoLinc Entregas',
    category: 'Logística',
    description: 'Cooperativa de motoboys sob demanda. Terceirize sua frota para dias de pico de pedidos sem dor de cabeça.',
    imageUrl: 'https://images.unsplash.com/photo-1558126319-c9fe1b0289f6?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999995',
    badge: 'Motoboys Express',
  },
  {
    id: 6,
    name: 'Chef Consultoria',
    category: 'Consultoria',
    description: 'Engenharia de cardápio, precificação estratégica de pratos, fichas técnicas e redução drástica de desperdício.',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a8720?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999996',
    discount: 'Análise de Cardápio Grátis'
  },
  {
    id: 7,
    name: 'Food Ads Agency',
    category: 'Tráfego',
    description: 'Gestão de anúncios no Instagram e Google focada em geolocalização (raio de entrega) para atrair clientes locais.',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
    whatsapp: '5511999999997',
    badge: 'Meta Partner',
    discount: 'Isenção da 1ª Mensalidade'
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
];

export default function PartnersMarketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Filtro Duplo: Busca por texto + Categoria
  const filteredPartners = mockPartners.filter((partner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          partner.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || partner.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppClick = (phone, partnerName) => {
    const msg = `Olá, sou parceiro do Velo Delivery! Gostaria de saber mais sobre os serviços da ${partnerName}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Hub de Parceiros
          </h1>
          <p className="text-slate-400 font-bold mt-2 text-sm">
            Toda a cadeia de suprimentos e serviços para alavancar seu restaurante.
          </p>
        </div>
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
      {filteredPartners.length === 0 ? (
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
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={partner.imageUrl}
                    alt={partner.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

                    {/* BOTÃO WHATSAPP */}
                    <button
                      onClick={() => handleWhatsAppClick(partner.whatsapp, partner.name)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} />
                      Falar com Parceiro
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}