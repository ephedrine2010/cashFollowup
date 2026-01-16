// Card Transaction Buttons Handler
// Dedicated module for handling the + buttons beside Mada, Visa, and Master fields

import { formatNumber } from '../utils.js';

// DOM Elements cache
let elements = {};
let dialogElements = {};

// State
let currentDialogField = null;

// Multiple values storage
export let multipleValues = {
    mada: [],
    visa: [],
    master: []
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDialogElements();
    initializeElements(); // This now includes button listener initialization
    console.log('Card Transaction Buttons module initialized');
});

// Cache DOM elements
function initializeElements() {
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        elements = {
            madaInput: document.getElementById('sales-mada'),
            visaInput: document.getElementById('sales-visa'),
            masterInput: document.getElementById('sales-master'),
            madaBtn: document.querySelector('[data-field="mada"]'),
            visaBtn: document.querySelector('[data-field="visa"]'),
            masterBtn: document.querySelector('[data-field="master"]')
        };
        
        console.log('Card transaction elements found:', {
            madaInput: !!elements.madaInput,
            visaInput: !!elements.visaInput,
            masterInput: !!elements.masterInput,
            madaBtn: !!elements.madaBtn,
            visaBtn: !!elements.visaBtn,
            masterBtn: !!elements.masterBtn
        });
        
        // Initialize button listeners after elements are confirmed
        if (elements.madaBtn || elements.visaBtn || elements.masterBtn) {
            initializeButtonListeners();
        } else {
            console.error('Card transaction buttons not found!');
        }
    }, 100);
}

// Initialize dialog elements
function initializeDialogElements() {
    dialogElements = {
        dialog: document.getElementById('values-dialog'),
        container: document.getElementById('values-container'),
        title: document.getElementById('dialog-title'),
        total: document.getElementById('dialog-total'),
        addMoreBtn: document.querySelector('.btn-add-more')
    };
    
    if (dialogElements.dialog) {
        console.log('Dialog elements initialized');
    }
}

// Initialize button listeners
function initializeButtonListeners() {
    // Add event listeners to the + buttons
    if (elements.madaBtn) {
        elements.madaBtn.addEventListener('click', () => openValuesDialog('mada'));
    }
    
    if (elements.visaBtn) {
        elements.visaBtn.addEventListener('click', () => openValuesDialog('visa'));
    }
    
    if (elements.masterBtn) {
        elements.masterBtn.addEventListener('click', () => openValuesDialog('master'));
    }
    
    console.log('Button listeners attached');
}

// Open values dialog
export function openValuesDialog(field) {
    console.log(`Opening dialog for field: ${field}`);
    
    if (!dialogElements.dialog) {
        console.error('Dialog element not found');
        return;
    }
    
    currentDialogField = field;
    
    // Set dialog title
    if (dialogElements.title) {
        const fieldNames = {
            mada: 'Mada',
            visa: 'Visa',
            master: 'Master'
        };
        dialogElements.title.textContent = `Enter ${fieldNames[field]} Values`;
    }
    
    // Clear previous values
    if (dialogElements.container) {
        dialogElements.container.innerHTML = '';
    }
    
    // Add initial input fields
    addValueInput();
    addValueInput();
    
    // Show dialog
    dialogElements.dialog.classList.remove('hidden');
    
    // Update total
    updateDialogTotal();
}

// Close values dialog
export function closeValuesDialog() {
    console.log('Closing dialog');
    
    if (dialogElements.dialog) {
        dialogElements.dialog.classList.add('hidden');
    }
    
    currentDialogField = null;
}

// Add a new value input field
export function addValueInput() {
    if (!dialogElements.container) return;
    
    const inputDiv = document.createElement('div');
    inputDiv.className = 'value-input-container';
    
    inputDiv.innerHTML = `
        <input type="number" 
               class="value-input" 
               placeholder="Enter amount" 
               step="0.01" 
               min="0"
               oninput="updateDialogTotal()" />
        <button type="button" class="btn-remove-value" onclick="this.parentElement.remove(); updateDialogTotal();">✕</button>
    `;
    
    dialogElements.container.appendChild(inputDiv);
    
    // Focus the new input
    const newInput = inputDiv.querySelector('.value-input');
    if (newInput) {
        newInput.focus();
    }
}

// Update dialog total
export function updateDialogTotal() {
    if (!dialogElements.container || !dialogElements.total) return;
    
    const inputs = dialogElements.container.querySelectorAll('.value-input');
    let total = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    dialogElements.total.textContent = total.toFixed(2);
}

// Save multiple values
export function saveMultipleValues() {
    if (!currentDialogField) return;
    
    const inputs = dialogElements.container.querySelectorAll('.value-input');
    const values = [];
    let total = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        if (value > 0) {
            values.push(value);
            total += value;
        }
    });
    
    // Store the values
    multipleValues[currentDialogField] = values;
    
    // Update the corresponding input field
    const fieldInput = elements[`${currentDialogField}Input`];
    if (fieldInput) {
        fieldInput.value = total.toFixed(2);
        // Trigger input event to update calculated fields
        fieldInput.dispatchEvent(new Event('input'));
    }
    
    closeValuesDialog();
    console.log(`Saved values for ${currentDialogField}:`, values);
}

// Make functions available globally for inline event handlers
window.addValueInput = addValueInput;
window.updateDialogTotal = updateDialogTotal;
window.closeValuesDialog = closeValuesDialog;
window.saveMultipleValues = saveMultipleValues;

// Fallback initialization function
window.initializeCardButtons = function() {
    console.log('Manual initialization of card buttons');
    initializeElements();
};

console.log('Card Transaction Buttons module loaded');