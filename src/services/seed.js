import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit } from "firebase/firestore";

const sampleProducts = [
  { 
    name: "Cerveja Heineken 330ml", 
    price: 6.49, 
    imageUrl: "/images/heineken.png", // AJUSTE O NOME DO ARQUIVO AQUI
    category: "Cervejas", 
    tag: "Mais Vendida" 
  },
  { 
    name: "Brahma Duplo Malte 350ml", 
    price: 3.99, 
    imageUrl: "/images/brahma.jpg", 
    category: "Cervejas", 
    tag: "Gelada" 
  },
  { 
    name: "Vodka Absolut Original 750ml", 
    price: 89.90, 
    imageUrl: "/images/absolut.png", 
    category: "Destilados", 
    tag: "Oferta" 
  },
  { 
    name: "Coca-Cola Original 2L", 
    price: 10.50, 
    imageUrl: "/images/coca.png", 
    category: "Sem Álcool", 
    tag: "Família" 
  }
];

export const seedDatabase = async () => {
  const q = query(collection(db, "products"), limit(1));
  const s = await getDocs(q);
  if (s.empty) {
    for (const p of sampleProducts) { await addDoc(collection(db, "products"), p); }
    window.location.reload();
  }
};