import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAPlx3DZ0OLQ6WzyvHzY1NpbJeXne-Eft0",
    authDomain: "vehitrack-d13b4.firebaseapp.com",
    projectId: "vehitrack-d13b4",
    storageBucket: "vehitrack-d13b4.firebasestorage.app",
    messagingSenderId: "178666171059",
    appId: "1:178666171059:web:e1a8fcdfef38a537945ec6",
    measurementId: "G-EQ5FGP82XM"
  };
  
  const app = initializeApp(firebaseConfig);
let auth;
if (typeof window !== "undefined") {
  auth = getAuth(app); // Hanya dijalankan di client-side
}

export { app, auth };