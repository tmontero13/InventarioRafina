import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// 👇 Estos son tus datos reales de Firebase (recuerda poner los tuyos)
const firebaseConfig = {
  apiKey: "AIzaSyDRw9Yzr2IlS8dtj8oKOiTIf-eI9lpA_tY",
  authDomain: "inventario-rafina.firebaseapp.com",
  databaseURL: "https://inventario-rafina-default-rtdb.firebaseio.com",
  projectId: "inventario-rafina",
  storageBucket: "inventario-rafina.firebasestorage.app",
  messagingSenderId: "20295532001",
  appId: "1:20295532001:web:8ec0e6bd7acfdf1d7aa6a0"
};

// 👇 Primero inicializamos la app
const app = initializeApp(firebaseConfig);

// 👇 Luego inicializamos el Storage
const storage = getStorage(app);

// 👇 Y exportamos el storage correctamente
export { storage };

