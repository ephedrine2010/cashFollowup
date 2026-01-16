// Add Sales Record Dialog Handler
// Dedicated module for handling the add sales record functionality

import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, showLoading, hideLoading, db } from '../auth.js';
import { formatNumber } from '../utils.js';

// DOM Elements cache
let elements = {};

// State
let multipleValues = {
    mada: [],
    visa: [],
    master: []
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initializeEventListeners();
    console.log('Add Sales Record module initialized');
});

// Cache DOM elements
function initializeElements() {
    elements = {
        form: document.getElementById('sales-form'),
        dayNo: document.getElementById('sales-day-no'),
        total: document.getElementById('sales-total'),
        onAccount: document.getElementById('sales-on-account'),
        online: document.getElementById('sales-online'),
        stc: document.getElementById('sales-stc'),
        rajhi: document.getElementById('sales-rajhi'),
        gift: document.getElementById('sales-gift'),
        tamra: document.getElementById('sales-tamra'),
        mada: document.getElementById('sales-mada'),
        visa: document.getElementById('sales-visa'),
        master: document.getElementById('sales-master'),
        other: document.getElementById('sales-other'),
        variance: document.getElementById('sales-variance'),
        totalPlastic: document.getElementById('sales-total-plastic'),
        totalCash: document.getElementById('sales-total-cash'),
        note: document.getElementById('sales-note')
    };
    
    console.log('DOM elements cached:', Object.keys(elements).filter(key => elements[key]));
}

// Initialize event listeners
function initializeEventListeners() {
    // Ensure form exists and attach submit listener
    if (elements.form) {
        // Remove any existing listeners first
        elements.form.removeEventListener('submit', handleFormSubmit);
        // Add the submit listener
        elements.form.addEventListener('submit', handleFormSubmit);
        console.log('Form submit listener attached');
    } else {
        console.error('Sales form not found!');
    }
    
    // Add real-time calculation listeners
    const calculationInputs = [
        elements.total, elements.onAccount, elements.online, elements.stc,
        elements.rajhi, elements.gift, elements.tamra, elements.mada,
        elements.visa, elements.master, elements.other, elements.variance
    ].filter(input => input);
    
    calculationInputs.forEach(input => {
        input.addEventListener('input', updateCalculatedFields);
    });
    
    console.log('Real-time calculation listeners attached');
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Add Sales Record form submitted');
    
    // Validate user
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    // Validate required fields
    if (!validateForm()) {
        return;
    }
    
    // Get store code
    const storeCode = getStoreCode();
    if (!storeCode) {
        alert('Invalid user email format. Email must start with a 4-digit store code.');
        return;
    }
    
    // Create sales record
    const salesRecord = createSalesRecord();
    
    // Save to database
    await saveSalesRecord(salesRecord, storeCode);
}

// Validate form data
function validateForm() {
    if (!elements.dayNo || !elements.dayNo.value) {
        alert('Please enter Day No.');
        elements.dayNo?.focus();
        return false;
    }
    
    if (!elements.total || !elements.total.value) {
        alert('Please enter Total Sales.');
        elements.total?.focus();
        return false;
    }
    
    return true;
}

// Get store code from user email
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Create sales record object
function createSalesRecord() {
    const record = {
        dayNo: parseInt(elements.dayNo.value),
        totalSales: parseFloat(elements.total.value),
        onAccount: parseFloat(elements.onAccount?.value) || 0,
        online: parseFloat(elements.online?.value) || 0,
        stc: parseFloat(elements.stc?.value) || 0,
        rajhi: parseFloat(elements.rajhi?.value) || 0,
        gift: parseFloat(elements.gift?.value) || 0,
        tamra: parseFloat(elements.tamra?.value) || 0,
        mada: parseFloat(elements.mada?.value) || 0,
        visa: parseFloat(elements.visa?.value) || 0,
        master: parseFloat(elements.master?.value) || 0,
        other: parseFloat(elements.other?.value) || 0,
        variance: parseFloat(elements.variance?.value) || 0,
        note: elements.note?.value.trim() || null,
        amanco: false,
        totalPlastic: calculateTotalPlastic(),
        totalCash: calculateTotalCash(),
        madaValues: multipleValues.mada.length > 0 ? multipleValues.mada : null,
        visaValues: multipleValues.visa.length > 0 ? multipleValues.visa : null,
        masterValues: multipleValues.master.length > 0 ? multipleValues.master : null,
        createdAt: serverTimestamp()
    };
    
    console.log('Created sales record:', record);
    return record;
}

// Calculate total plastic
function calculateTotalPlastic() {
    const mada = parseFloat(elements.mada?.value) || 0;
    const visa = parseFloat(elements.visa?.value) || 0;
    const master = parseFloat(elements.master?.value) || 0;
    const other = parseFloat(elements.other?.value) || 0;
    return mada + visa + master + other;
}

// Calculate total cash
function calculateTotalCash() {
    const totalSales = parseFloat(elements.total?.value) || 0;
    const onAccount = parseFloat(elements.onAccount?.value) || 0;
    const online = parseFloat(elements.online?.value) || 0;
    const stc = parseFloat(elements.stc?.value) || 0;
    const rajhi = parseFloat(elements.rajhi?.value) || 0;
    const gift = parseFloat(elements.gift?.value) || 0;
    const tamra = parseFloat(elements.tamra?.value) || 0;
    const totalPlastic = calculateTotalPlastic();
    const variance = parseFloat(elements.variance?.value) || 0;
    
    return totalSales - (onAccount + online + stc + rajhi + gift + tamra + totalPlastic) + variance;
}

// Update calculated fields in real-time
function updateCalculatedFields() {
    if (elements.totalPlastic) {
        elements.totalPlastic.value = calculateTotalPlastic().toFixed(2);
    }
    
    if (elements.totalCash) {
        elements.totalCash.value = calculateTotalCash().toFixed(2);
    }
}

// Save sales record to database
async function saveSalesRecord(record, storeCode) {
    showLoading();
    
    try {
        // Get current year and month
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonth = `${year}${month}`;
        
        // Firebase path: store-code/year/month/documents
        const monthCollectionPath = `${storeCode}/${year}/${currentMonth}`;
        
        console.log('Saving to path:', monthCollectionPath);
        console.log('Record data:', record);
        
        const docRef = await addDoc(collection(db, monthCollectionPath), record);
        console.log('Document written with ID:', docRef.id);
        
        // Reset form
        resetForm();
        
        alert('Sales record added successfully!');
        
    } catch (error) {
        console.error('Error adding sales record:', error);
        alert(`Failed to add sales record: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Reset form after successful submission
function resetForm() {
    if (elements.form) {
        elements.form.reset();
    }
    
    // Reset note field specifically
    if (elements.note) {
        elements.note.value = '';
    }
    
    // Reset multiple values
    multipleValues = {
        mada: [],
        visa: [],
        master: []
    };
    
    // Reset calculated fields
    updateCalculatedFields();
    
    // Set day number to previous day
    if (elements.dayNo) {
        const today = new Date();
        const dayNo = today.getDate();
        const previousDay = dayNo - 1;
        elements.dayNo.value = previousDay > 0 ? previousDay : 1;
    }
    
    console.log('Form reset completed');
}

// Export functions that might be needed by other modules
export { 
    multipleValues, 
    updateCalculatedFields,
    calculateTotalPlastic,
    calculateTotalCash
};

console.log('Add Sales Record module loaded');