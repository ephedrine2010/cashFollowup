// Add Sales Record Dialog Handler
// Dedicated module for handling the add sales record functionality

import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, showLoading, hideLoading, db, registerAuthStateHandler } from '../auth.js';
import { formatNumber } from '../utils.js';
import { multipleValues } from './values-dialog.js';
import { getSelectedYear, getCurrentMonthValue } from '../sales-display.js';

// DOM Elements (like old version - initialized at top level)
const salesForm = document.getElementById('sales-form');
const salesDayNoInput = document.getElementById('sales-day-no');
const salesTotalInput = document.getElementById('sales-total');
const salesOnAccountInput = document.getElementById('sales-on-account');
const salesOnlineInput = document.getElementById('sales-online');
const salesStcInput = document.getElementById('sales-stc');
const salesRajhiInput = document.getElementById('sales-rajhi');
const salesGiftInput = document.getElementById('sales-gift');
const salesTamraInput = document.getElementById('sales-tamra');
const salesMadaInput = document.getElementById('sales-mada');
const salesVisaInput = document.getElementById('sales-visa');
const salesMasterInput = document.getElementById('sales-master');
const salesOtherInput = document.getElementById('sales-other');
const salesVarianceInput = document.getElementById('sales-variance');
const salesTotalPlasticInput = document.getElementById('sales-total-plastic');
const salesTotalCashInput = document.getElementById('sales-total-cash');
const salesNoteInput = document.getElementById('sales-note');

// Add sales record - like old version (attached at top level)
if (salesForm) {
    salesForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert('Please login first');
            return;
        }

        const storeCode = getStoreCode();
        if (!storeCode) {
            alert('Invalid user email format. Email must start with a 4-digit store code.');
            return;
        }

        const salesRecord = {
            dayNo: parseInt(salesDayNoInput.value),
            totalSales: parseFloat(salesTotalInput.value),
            onAccount: parseFloat(salesOnAccountInput.value) || 0,
            online: parseFloat(salesOnlineInput.value) || 0,
            stc: parseFloat(salesStcInput.value) || 0,
            rajhi: parseFloat(salesRajhiInput.value) || 0,
            gift: parseFloat(salesGiftInput.value) || 0,
            tamra: parseFloat(salesTamraInput.value) || 0,
            mada: parseFloat(salesMadaInput.value) || 0,
            visa: parseFloat(salesVisaInput.value) || 0,
            master: parseFloat(salesMasterInput.value) || 0,
            other: parseFloat(salesOtherInput.value) || 0,
            amanco: false, // Default to unchecked
            variance: parseFloat(salesVarianceInput.value) || 0,
            note: salesNoteInput.value.trim() || null,
            totalPlastic: calculateTotalPlastic(),
            totalCash: calculateTotalCash(),
            // Store multiple values for mada, visa, and master
            madaValues: multipleValues.mada.length > 0 ? multipleValues.mada : null,
            visaValues: multipleValues.visa.length > 0 ? multipleValues.visa : null,
            masterValues: multipleValues.master.length > 0 ? multipleValues.master : null,
            createdAt: serverTimestamp()
        };

        showLoading();
        try {
            // Firebase path: store-code/year/month/documents (like old version)
            const year = getSelectedYear();
            const month = getCurrentMonthValue();
            const monthCollectionPath = `${storeCode}/${year}/${month}`;
            
            await addDoc(collection(db, monthCollectionPath), salesRecord);
            
            // Reset form - like old version
            salesForm.reset();
            salesNoteInput.value = ''; // Clear the note field separately
            
            // Reset multiple values
            multipleValues.mada = [];
            multipleValues.visa = [];
            multipleValues.master = [];
            
            // Reset day number - like old version
            initializeDayNo();
            
            // Reset calculated fields
            updateCalculatedFields();
            
            alert('Sales record added successfully!');
        } catch (error) {
            console.error('Error adding sales record:', error);
            alert(`Failed to add sales record: ${error.message}`);
        } finally {
            hideLoading();
        }
    });
} else {
    console.error('Sales form not found!');
}

// Get store code from user email
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Calculate Total Plastic (Mada + Visa + Master + Other) - like old version
function calculateTotalPlastic() {
    const mada = parseFloat(salesMadaInput.value) || 0;
    const visa = parseFloat(salesVisaInput.value) || 0;
    const master = parseFloat(salesMasterInput.value) || 0;
    const other = parseFloat(salesOtherInput.value) || 0;
    
    return mada + visa + master + other;
}

// Calculate Total Cash - like old version
// Formula: Total Sales - (On Account + Online + STC + Rajhi + Gift + Tamra + Total Plastic) + Variance
function calculateTotalCash() {
    const totalSales = parseFloat(salesTotalInput.value) || 0;
    const onAccount = parseFloat(salesOnAccountInput.value) || 0;
    const online = parseFloat(salesOnlineInput.value) || 0;
    const stc = parseFloat(salesStcInput.value) || 0;
    const rajhi = parseFloat(salesRajhiInput.value) || 0;
    const gift = parseFloat(salesGiftInput.value) || 0;
    const tamra = parseFloat(salesTamraInput.value) || 0;
    const totalPlastic = calculateTotalPlastic();
    const variance = parseFloat(salesVarianceInput.value) || 0;
    
    return totalSales - (onAccount + online + stc + rajhi + gift + tamra + totalPlastic) + variance;
}

// Update calculated fields in real-time - like old version
function updateCalculatedFields() {
    // Update Total Plastic
    const totalPlastic = calculateTotalPlastic();
    if (salesTotalPlasticInput) {
        salesTotalPlasticInput.value = totalPlastic.toFixed(2);
    }
    
    // Update Total Cash
    const totalCash = calculateTotalCash();
    if (salesTotalCashInput) {
        salesTotalCashInput.value = totalCash.toFixed(2);
    }
}

// Add event listeners to all input fields for real-time calculation - like old version
[salesTotalInput, salesOnAccountInput, salesOnlineInput, salesStcInput, 
 salesRajhiInput, salesGiftInput, salesTamraInput, salesMadaInput, salesVisaInput, 
 salesMasterInput, salesOtherInput, salesVarianceInput].forEach(input => {
    if (input) {
        input.addEventListener('input', updateCalculatedFields);
    }
});

// Initialize Day No. with previous day - like old version
function initializeDayNo() {
    if (salesDayNoInput) {
        const today = new Date();
        const dayNo = today.getDate(); // Gets the day of the month (1-31)
        const previousDay = dayNo - 1; // Set to previous day
        salesDayNoInput.value = previousDay > 0 ? previousDay : 1; // If day is 1, set to 1 (minimum)
    }
}

// Initialize day number when user logs in - like old version
registerAuthStateHandler((user) => {
    if (user) {
        initializeDayNo(); // Set day number when user logs in
    }
});

// Export functions that might be needed by other modules
export { 
    updateCalculatedFields,
    calculateTotalPlastic,
    calculateTotalCash
};

console.log('Add Sales Record module loaded');