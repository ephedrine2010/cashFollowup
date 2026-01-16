// Main App Orchestrator
// This file serves as the entry point and imports all modules

// Import all modules to initialize them
import './auth.js';
import './transactions.js';
import './sales.js';
import './utils.js';
import { initStartCashCount } from '../dialoges/start-cash-count/start-cash-count.js';
import { initExportData } from '../dialoges/export-data/export-data.js';

console.log('App orchestrator starting...');

// Initialize dialog logic directly since HTML is now in index.html
async function setupExportData() {
    console.log('Setting up Export Data...');
    try {
        // Load the export dialog HTML
        const exportContainer = document.getElementById('export-data-container');
        if (exportContainer) {
            const response = await fetch('dialoges/export-data/export-data.html');
            const html = await response.text();
            exportContainer.innerHTML = html;
            console.log('Export Data HTML loaded');
        }
        
        // Initialize the dialog logic
        initExportData();
        console.log('Export Data logic initialized');
        
        // Attach open listener to the button
        const exportBtn = document.getElementById('export-excel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Export Excel button clicked');
                if (typeof window.openExportDataDialog === 'function') {
                    window.openExportDataDialog();
                } else {
                    console.error('window.openExportDataDialog is not defined as a function');
                }
            });
        } else {
            console.error('Export Excel button NOT found in DOM during setup');
        }
    } catch (error) {
        console.error('Error initializing Export Data dialog:', error);
    }
}

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
    setupExportData();
    setupStartCashCount();
} else {
    console.log('Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        setupExportData();
        setupStartCashCount();
    });
}

// Fallback: also try after a short delay to ensure other scripts haven't interfered
setTimeout(() => {
    if (!window.openExportDataDialog) {
        console.log('Fallback: Initializing Export Data after timeout');
        setupExportData();
    }
    if (!window.openStartCashCount) {
        console.log('Fallback: Initializing Start Cash Count after timeout');
        setupStartCashCount();
    }
}, 1000);

console.log('💰 Cash Daily Followup App - All modules loaded successfully!');
console.log('App ready to use! 🚀');
