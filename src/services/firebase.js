import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD_LdDobMQqltW6ejDwibcyoeUoX_BoHEs",
    authDomain: "zetesteapp.firebaseapp.com",
    projectId: "zetesteapp",
    storageBucket: "zetesteapp.appspot.com",
    messagingSenderId: "344839359009",
    appId: "1:344839359009:web:c5e4af43649c5a39d8f160"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
