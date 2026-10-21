// Ícones adicionais de categorias: IDs persistidos em categories/{id}.icon.
// Compartilhado entre o editor administrativo e a vitrine pública.
import {
  BookOpen, SprayCan, Wrench, Package, ShoppingBag, Gamepad2,
  Droplets, Boxes, Bug, Shirt, Lightbulb, Candy, Scissors,
  PartyPopper, Sparkles, GlassWater, ClipboardList, PackageOpen,
  Pencil, Recycle, Hammer, Refrigerator
} from 'lucide-react';

export const ADDITIONAL_CATEGORY_ICONS = [
  { id: 'Stationery', label: 'Papelaria / Material escolar', Icon: BookOpen },
  { id: 'Perfume', label: 'Perfumaria / Cosméticos', Icon: Sparkles },
  { id: 'Cleaning', label: 'Limpeza / Produtos de limpeza', Icon: SprayCan },
  { id: 'Hygiene', label: 'Higiene pessoal', Icon: Droplets },
  { id: 'Hardware', label: 'Ferragens / Ferramentas', Icon: Wrench },
  { id: 'Packaging', label: 'Embalagens', Icon: Package },
  { id: 'Disposables', label: 'Descartáveis / Copos e pratos', Icon: Boxes },
  { id: 'Party', label: 'Festas / Decoração', Icon: PartyPopper },
  { id: 'Games', label: 'Entretenimento / Jogos', Icon: Gamepad2 },
  { id: 'GeneralGoods', label: 'Bazar / Utilidades', Icon: ShoppingBag },
  { id: 'Chilled', label: 'Refrigerados', Icon: Refrigerator },
  { id: 'Containers', label: 'Vasilhames / Garrafas', Icon: GlassWater },
  { id: 'InternalUse', label: 'Consumo interno da loja', Icon: ClipboardList },
  { id: 'PestControl', label: 'Controle de pragas', Icon: Bug },
  { id: 'Confectionery', label: 'Confeitaria', Icon: Candy },
  { id: 'School', label: 'Livraria / Educação', Icon: Pencil },
  { id: 'Electric', label: 'Elétrica / Iluminação', Icon: Lightbulb },
  { id: 'Textiles', label: 'Roupas / Tecidos', Icon: Shirt },
  { id: 'Recycling', label: 'Reciclagem', Icon: Recycle },
  { id: 'Crafts', label: 'Artesanato / Armarinho', Icon: Scissors },
  { id: 'DIY', label: 'Casa / Reforma', Icon: Hammer },
  { id: 'Parcel', label: 'Caixas / Pacotes', Icon: PackageOpen }
];

const ICON_BY_CATEGORY = Object.freeze({
  'A CLASSIFICAR': 'List',
  'ACENDEDORES': 'Fire',
  'ACOUGUE': 'Meat',
  'AGUA': 'Water',
  'BAZAR': 'GeneralGoods',
  'BEBIDA': 'Soda',
  'BEBIDAS': 'Soda',
  'CIGARRO': 'Cigarette',
  'CONGELADOS': 'Snowflake',
  'CONSUMO LOJA': 'InternalUse',
  'DESCARTAVEIS': 'Disposables',
  'DOCES': 'Cupcake',
  'ENERGETICO': 'Energy',
  'ENTRETENIMENTO': 'Games',
  'FERRAGEM': 'Hardware',
  'FESTA': 'Party',
  'GELO': 'Snowflake',
  'HIGIENE E PERFUMARIA': 'Hygiene',
  'HORTIFRUTI': 'Carrot',
  'LACTICINIOS': 'Cheese',
  'LIMPEZA': 'Cleaning',
  'MERCEARIA': 'Basket',
  'PADARIA': 'Bread',
  'PADARIA EMBALAGEM': 'Packaging',
  'PAPELARIA': 'Stationery',
  'PERFUMARIA': 'Perfume',
  'PET': 'Paw',
  'RACAO': 'Paw',
  'REFRIGERADOS': 'Chilled',
  'REFRIGERANTES': 'Soda',
  'SORVETE': 'IceCream',
  'VASILHAME': 'Containers',
  'VENENO': 'PestControl',
  // Sinônimos para lojas que não utilizam os nomes do Monte Verde.
  'EMBALAGENS': 'Packaging',
  'MATERIAL ESCOLAR': 'Stationery',
  'LIVRARIA': 'School',
  'COSMETICOS': 'Perfume',
  'HIGIENE': 'Hygiene',
  'PRODUTOS DE LIMPEZA': 'Cleaning',
  'FERRAMENTAS': 'Hardware',
  'UTILIDADES': 'GeneralGoods',
  'CONFEITARIA': 'Confectionery',
  'JOGOS': 'Games',
  'BRINQUEDOS': 'Games',
  'ELETRICA': 'Electric',
  'TECIDOS': 'Textiles',
  'ARMARINHO': 'Crafts',
  'DESCARTAVEIS E EMBALAGENS': 'Disposables',
  'RECICLAGEM': 'Recycling',
  'CONTROLE DE PRAGAS': 'PestControl'
});

// Apenas sugere um ícone na vitrine quando nenhum foi selecionado no banco.
// Nunca sobrescreve manualmente a escolha de uma categoria.
export function getSuggestedCategoryIconId(name) {
  const key = String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  return ICON_BY_CATEGORY[key] || null;
}
