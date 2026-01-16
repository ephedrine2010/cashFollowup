// Main App Orchestrator
// This file serves as the entry point and imports all modules

// Import all modules to initialize them
import './auth.js';
import './transactions.js';
import './sales.js';
import './utils.js';
import { initStartCashCount } from '../dialoges/start-cash-count/start-cash-count.js';

console.log('App orchestrator starting...');

// Initialize dialog logic directly since HTML is now in index.html
function setupStartCashCount() {
    console.log('Setting up Start Cash Count...');
    try {
        // Initialize the dialog logic
        initStartCashCount();
        console.log('Start Cash Count logic initialized');
        
        // Attach open listener to the button
        const startBtn = document.getElementById('start-cash-count-btn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start Cash Count button clicked');
                if (typeof window.openStartCashCount === 'function') {
                    window.openStartCashCount();
                } else {
                    console.error('window.openStartCashCount is not defined as a function');
                }
            });
        } else {
            console.error('Start Cash Count button NOT found in DOM during setup');
        }
    } catch (error) {
        console.error('Error initializing Start Cash Count dialog:', error);
    }
}

// Ensure execution
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Document already ready, executing setup immediately');
    setupStartCashCount();
} else {
    console.log('Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', setupStartCashCount);
}

// Fallback: also try after a short delay to ensure other scripts haven't interfered
setTimeout(() => {
    if (!window.openStartCashCount) {
        console.log('Fallback: Initializing Start Cash Count after timeout');
        setupStartCashCount();
    }
}, 1000);

console.log('💰 Cash Daily Followup App - All modules loaded successfully!');
console.log('App ready to use! 🚀');
