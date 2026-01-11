// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCsNhNFl3kvPKPtyKasaDAF2Kv7vcbAiV8",
    authDomain: "cashfollowup.firebaseapp.com",
    projectId: "cashfollowup",
    storageBucket: "cashfollowup.firebasestorage.app",
    messagingSenderId: "297999980788",
    appId: "1:297999980788:web:ab609eae4a331feacb66a1",
    measurementId: "G-NTR66XSRLK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other files
window.auth = auth;
window.db = db;

console.log('Firebase initialized successfully!');
