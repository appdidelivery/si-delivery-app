import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit } from "firebase/firestore";

const sampleProducts = [
  // --- CERVEJAS ---
  { name: "Cerveja Heineken Long Neck 330ml", price: 6.49, imageUrl: "/images/heineken.png", category: "Cervejas", tag: "Mais Vendida" },
  { name: "Cerveja Stella Artois 330ml", price: 5.99, imageUrl: "/images/Cerveja Stella Artois 330ml.png", category: "Cervejas", tag: "Premium" },
  { name: "Cerveja Corona Extra 330ml", price: 6.99, imageUrl: "/images/Cerveja Corona Extra 330ml.png", category: "Cervejas", tag: "Gelada" },
  { name: "Cerveja Brahma Duplo Malte 350ml", price: 3.99, imageUrl: "/images/Cerveja Brahma Duplo Malte 350ml.png", category: "Cervejas", tag: "Oferta" },
  { name: "Cerveja Spaten Lata 350ml", price: 4.29, imageUrl: "/images/Cerveja Spaten Lata 350ml.png", category: "Cervejas", tag: "Puro Malte" },
  { name: "Cerveja Skol Lata 350ml", price: 3.29, imageUrl: "/images/Cerveja Skol Lata 350ml.png", category: "Cervejas", tag: "Refrescante" },

  // --- DESTILADOS ---
  { name: "Vodka Absolut Original 750ml", price: 89.90, imageUrl: "/images/absolut.png", category: "Destilados", tag: "Premium" },
  { name: "Whisky Johnnie Walker Black Label 1L", price: 169.90, imageUrl: "/images/Whisky Johnnie Walker Black Label 1L.png", category: "Destilados", tag: "Original" },
  { name: "Gin Tanqueray London Dry 750ml", price: 115.00, imageUrl: "/images/Gin Tanqueray London Dry 750ml.png", category: "Destilados", tag: "Trend" },
  { name: "Cachaça 51 Garrafa 965ml", price: 14.50, imageUrl: "/images/Cachaça 51 Garrafa 965ml.png", category: "Destilados", tag: "Clássica" },
  { name: "Vodka Smirnoff 998ml", price: 39.90, imageUrl: "/images/Vodka Smirnoff 998ml.png", category: "Destilados", tag: "Mix" },

  // --- VINHOS ---
  { name: "Vinho Tinto Casillero del Diablo Cabernet 750ml", price: 54.90, imageUrl: "/images/casillero.png", category: "Vinhos", tag: "Chile" },
  { name: "Vinho Branco Reservado Concha y Toro 750ml", price: 32.00, imageUrl: "/images/concha.png", category: "Vinhos", tag: "Leve" },
  { name: "Vinho Pérgola Tinto Suave 1L", price: 24.90, imageUrl: "/images/pergola.png", category: "Vinhos", tag: "Popular" },

  // --- REFRIGERANTES E SUCOS ---
  { name: "Coca-Cola Original 2L", price: 10.50, imageUrl: "/images/coca cola 2 litros.png", category: "Sem Álcool", tag: "Família" },
  { name: "Coca-Cola Lata 350ml", price: 4.50, imageUrl: "/images/coca cola lata 350ml.png", category: "Sem Álcool", tag: "Gelada" },
  { name: "Guaraná Antarctica 2L", price: 8.90, imageUrl: "/images/guarana antartica 2litros", category: "Sem Álcool", tag: "Tradicional" },
  { name: "Energético Monster Energy 473ml", price: 9.90, imageUrl: "/images/energético monster energy 473ml.png", category: "Sem Álcool", tag: "Energia" },
  { name: "Água Mineral sem Gás 500ml", price: 2.50, imageUrl: "/images/agua mineral sgas 500ml.png", category: "Sem Álcool", tag: "Essencial" },

  // --- GELO E CONVENIÊNCIA ---
  { name: "Gelo em Cubo Pacote 5kg", price: 12.00, imageUrl: "/images/agua mineral sgas 500ml.png", category: "Conveniência", tag: "Essencial" },
  { name: "Carvão Vegetal 3kg", price: 18.90, imageUrl: "/images/carvao.png", category: "Conveniência", tag: "Churrasco" },
  { name: "Snack Lay's Clássica 80g", price: 7.50, imageUrl: "/images/lays.png", category: "Conveniência", tag: "Petisco" },
  { name: "Gelo de Coco (Unidade)", price: 3.50, imageUrl: "/images/gelo-coco.png", category: "Conveniência", tag: "Para Drink" }
];

export const seedDatabase = async () => {
  try {
    const q = query(collection(db, "products"), limit(1));
    const s = await getDocs(q);

    // Só adiciona se o banco estiver vazio para evitar duplicatas infinitas
    if (s.empty) {
      console.log("Iniciando o cadastro de produtos base...");
      for (const p of sampleProducts) { 
        await addDoc(collection(db, "products"), p); 
      }
      console.log("Produtos cadastrados com sucesso!");
      window.location.reload();
    } else {
      console.log("O banco de dados já possui produtos.");
    }
  } catch (error) {
    console.error("Erro ao popular o banco:", error);
  }
};