// 1. Importações necessárias do Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 2. Sua configuração específica do Firebase (com a URL do Realtime Database adicionada)
const firebaseConfig = {
  apiKey: "AIzaSyD_LdDobMQqltW6ejDwibcyoeUoX_BoHEs",
  authDomain: "zetesteapp.firebaseapp.com",
  projectId: "zetesteapp",
  storageBucket: "zetesteapp.appspot.com",
  messagingSenderId: "344839359009",
  appId: "1:344839359009:web:b32b55db00fde287d8f160",
  measurementId: "G-04P0556W47",
  databaseURL: "https://zetesteapp-default-rtdb.firebaseio.com"
};

// 3. Inicialização do Firebase
export const app = initializeApp(firebaseConfig);

// 4. Inicialização dos serviços que você precisa
const db = getFirestore(app);
const auth = getAuth(app);

// 5. Exportação dos serviços para serem usados em outros arquivos
export { db, auth };