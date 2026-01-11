// Import Firebase authentication functions
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Wait for firebase-config to load
await new Promise(resolve => setTimeout(resolve, 100));
const auth = window.auth;
const db = window.db;

// Export auth and db for other modules
export { auth, db };

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const header = document.querySelector('header');
const loginForm = document.getElementById('login-form');
const userInfo = document.getElementById('user-info');
const mainContent = document.getElementById('main-content');
const storeIdInput = document.getElementById('store-id');
const empIdInput = document.getElementById('emp-id');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');
const userEmailSpan = document.getElementById('user-email');
const loading = document.getElementById('loading');

// Current user state
export let currentUser = null;

// Auth state change handlers
const authStateHandlers = [];

export function registerAuthStateHandler(handler) {
    authStateHandlers.push(handler);
}

// Show/Hide functions
export function showLoading() {
    loading.classList.remove('hidden');
}

export function hideLoading() {
    loading.classList.add('hidden');
}

function showLoginInterface() {
    loginScreen.classList.remove('hidden');
    header.classList.add('hidden');
    mainContent.classList.add('hidden');
}

function showUserInterface() {
    loginScreen.classList.add('hidden');
    header.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    userEmailSpan.textContent = currentUser.email;
}

// Helper function to convert Store ID and Emp ID to email and password
function convertIdsToCredentials(storeId, empId) {
    const email = `${storeId}${empId}@cashfollowup.com`;
    const password = `${storeId}${empId}`;
    return { email, password };
}

// ============================================
// Authentication Functions
// ============================================

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showUserInterface();
        // Notify all registered handlers
        authStateHandlers.forEach(handler => handler(user));
    } else {
        currentUser = null;
        showLoginInterface();
    }
});

// Login
loginBtn.addEventListener('click', async () => {
    const storeId = storeIdInput.value.trim();
    const empId = empIdInput.value.trim();

    if (!storeId || !empId) {
        alert('Please enter Store ID and Emp ID');
        return;
    }

    const { email, password } = convertIdsToCredentials(storeId, empId);

    showLoading();
    try {
        await signInWithEmailAndPassword(auth, email, password);
        storeIdInput.value = '';
        empIdInput.value = '';
    } catch (error) {
        console.error('Login error:', error);
        alert(`Login failed: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// Sign up
signupBtn.addEventListener('click', async () => {
    const storeId = storeIdInput.value.trim();
    const empId = empIdInput.value.trim();

    if (!storeId || !empId) {
        alert('Please enter Store ID and Emp ID');
        return;
    }

    const { email, password } = convertIdsToCredentials(storeId, empId);

    if (password.length < 6) {
        alert('Store ID + Emp ID must be at least 6 characters combined');
        return;
    }

    showLoading();
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        storeIdInput.value = '';
        empIdInput.value = '';
        alert('Account created successfully!');
    } catch (error) {
        console.error('Signup error:', error);
        alert(`Signup failed: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        alert(`Logout failed: ${error.message}`);
    }
});

// Test Firebase Connection
testConnectionBtn.addEventListener('click', async () => {
    showLoading();
    
    const results = {
        firebase: '❌ Not initialized',
        auth: '❌ Not available',
        firestore: '❌ Not available',
        connection: '❌ Failed'
    };

    try {
        // Check if Firebase is initialized
        if (window.auth && window.db) {
            results.firebase = '✅ Initialized';
            results.auth = '✅ Available';
            results.firestore = '✅ Available';
        } else {
            throw new Error('Firebase not properly initialized');
        }

        // Test Firestore connection by reading from a test collection
        const testQuery = query(collection(db, 'transactions'), where('userId', '==', 'test'));
        await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(
                testQuery,
                () => {
                    results.connection = '✅ Connected';
                    unsubscribe();
                    resolve();
                },
                (error) => {
                    results.connection = `❌ Error: ${error.code}`;
                    unsubscribe();
                    reject(error);
                }
            );
        });

        // Show success message
        const message = `
🔥 Firebase Connection Test Results:

✅ Firebase SDK: ${results.firebase}
✅ Authentication: ${results.auth}
✅ Firestore Database: ${results.firestore}
✅ Connection Status: ${results.connection}

🎉 Everything is working perfectly!
        `;
        alert(message);
        console.log('Firebase connection test passed:', results);

    } catch (error) {
        // Show error message
        const message = `
🔥 Firebase Connection Test Results:

${results.firebase}
${results.auth}
${results.firestore}
${results.connection}

❌ Error Details:
${error.message}

💡 Make sure:
1. Firebase config is correct
2. Firestore is enabled in Firebase Console
3. Internet connection is stable
        `;
        alert(message);
        console.error('Firebase connection test failed:', error, results);
    } finally {
        hideLoading();
    }
});

console.log('Auth module initialized');
