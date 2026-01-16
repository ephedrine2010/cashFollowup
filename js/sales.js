// Import necessary functions
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, registerAuthStateHandler, showLoading, hideLoading, db } from './auth.js';
import { formatNumber } from './utils.js';
import { initializeMultipleValuesButtons, multipleValues } from './dialogs/values-dialog.js';

// DOM Elements
let salesForm, salesTableBody, salesDayNoInput, salesTotalInput, salesOnAccountInput;
let salesOnlineInput, salesStcInput, salesRajhiInput, salesGiftInput, salesTamraInput;
let salesMadaInput, salesVisaInput, salesMasterInput, salesOtherInput;
let salesVarianceInput, salesTotalPlasticInput, salesTotalCashInput, salesNoteInput;
let monthsTabContainer;

// Initialize DOM elements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    salesForm = document.getElementById('sales-form');
    console.log('Sales form element found:', !!salesForm);
    salesTableBody = document.getElementById('sales-table-body');
    salesDayNoInput = document.getElementById('sales-day-no');
    salesTotalInput = document.getElementById('sales-total');
    salesOnAccountInput = document.getElementById('sales-on-account');
    salesOnlineInput = document.getElementById('sales-online');
    salesStcInput = document.getElementById('sales-stc');
    salesRajhiInput = document.getElementById('sales-rajhi');
    salesGiftInput = document.getElementById('sales-gift');
    salesTamraInput = document.getElementById('sales-tamra');
    salesMadaInput = document.getElementById('sales-mada');
    salesVisaInput = document.getElementById('sales-visa');
    salesMasterInput = document.getElementById('sales-master');
    salesOtherInput = document.getElementById('sales-other');
    salesVarianceInput = document.getElementById('sales-variance');
    salesTotalPlasticInput = document.getElementById('sales-total-plastic');
    salesTotalCashInput = document.getElementById('sales-total-cash');
    salesNoteInput = document.getElementById('sales-note');
    monthsTabContainer = document.getElementById('months-tab');
    
    // Initialize event listeners after DOM elements are available
    initializeEventListeners();
});

// State
let allSalesRecords = [];
let currentMonth = getCurrentMonth(); // Current selected month
let selectedYear = new Date().getFullYear(); // Selected year for viewing
let unsubscribeSnapshot = null; // To unsubscribe from previous snapshots

// ============================================
// Sales Tracking Functions
// ============================================

// Get current month in YYYYMM format
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}

// Get current year
function getCurrentYear() {
    return new Date().getFullYear().toString();
}

// Extract store code from user email (first 4 characters)
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Generate month buttons for the current year
function generateMonthButtons() {
    if (!monthsTabContainer) return;
    
    const months = [];
    
    // Update year display
    const yearDisplay = document.getElementById('current-year');
    if (yearDisplay) {
        yearDisplay.textContent = selectedYear;
    }
    
    // Generate 12 months for the selected year
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        months.push(`${selectedYear}${monthStr}`);
    }
    
    monthsTabContainer.innerHTML = months.map(month => {
        const isActive = month === currentMonth ? 'active' : '';
        return `<button class="month-btn ${isActive}" data-month="${month}" onclick="selectMonth('${month}')">${month}</button>`;
    }).join('');
}

// Select a month and load its data
function selectMonth(month) {
    currentMonth = month;
    
    // Update active state of buttons
    document.querySelectorAll('.month-btn').forEach(btn => {
        if (btn.dataset.month === month) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Load sales records for selected month
    loadSalesRecords();
}

// Make selectMonth available globally
window.selectMonth = selectMonth;

// Change year (delta: -1 for previous, +1 for next)
function changeYear(delta) {
    selectedYear += delta;
    
    // Update the current month to match the selected year
    const monthPart = currentMonth.substring(4); // Get MM part
    currentMonth = `${selectedYear}${monthPart}`;
    
    // Regenerate month buttons for the new year
    generateMonthButtons();
    
    // Load sales records for the new year/month
    loadSalesRecords();
}

// Make changeYear available globally
window.changeYear = changeYear;

// Initialize Day No. with previous day
function initializeDayNo() {
    const today = new Date();
    const dayNo = today.getDate(); // Gets the day of the month (1-31)
    const previousDay = dayNo - 1; // Set to previous day
    salesDayNoInput.value = previousDay > 0 ? previousDay : 1; // If day is 1, set to 1 (minimum)
}

// Calculate Total Plastic (Mada + Visa + Master + Other)
function calculateTotalPlastic() {
    const mada = parseFloat(salesMadaInput.value) || 0;
    const visa = parseFloat(salesVisaInput.value) || 0;
    const master = parseFloat(salesMasterInput.value) || 0;
    const other = parseFloat(salesOtherInput.value) || 0;
    
    return mada + visa + master + other;
}

// Calculate Total Cash
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

// Update calculated fields in real-time
function updateCalculatedFields() {
    // Update Total Plastic
    const totalPlastic = calculateTotalPlastic();
    salesTotalPlasticInput.value = totalPlastic.toFixed(2);
    
    // Update Total Cash
    const totalCash = calculateTotalCash();
    salesTotalCashInput.value = totalCash.toFixed(2);
}

// Initialize event listeners
function initializeEventListeners() {
    // Add event listeners to all input fields for real-time calculation
    [salesTotalInput, salesOnAccountInput, salesOnlineInput, salesStcInput, 
     salesRajhiInput, salesGiftInput, salesTamraInput, salesMadaInput, salesVisaInput, 
     salesMasterInput, salesOtherInput, salesVarianceInput].forEach(input => {
        input.addEventListener('input', updateCalculatedFields);
    });

    // Add sales record form submit listener
    salesForm.addEventListener('submit', async (e) => {
        console.log('Form submit event triggered');
        e.preventDefault();
        
        console.log('Current user:', currentUser);
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        
        const storeCode = getStoreCode();
        console.log('Store code:', storeCode);
        if (!storeCode) {
            alert('Invalid user email format. Email must start with a 4-digit store code.');
            return;
        }
        
        console.log('Creating sales record...');

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
            note: salesNoteInput.value.trim() || null, // Add note field
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
            // New Firebase structure: store-code > year > month > documents
            // Use selectedYear for data operations
            const monthCollectionPath = `${storeCode}/${selectedYear}/${currentMonth}`;
            await addDoc(collection(db, monthCollectionPath), salesRecord);
            salesForm.reset();
            salesNoteInput.value = ''; // Clear the note field separately
            // Reset multiple values
            multipleValues = {
                mada: [],
                visa: [],
                master: []
            };
            initializeDayNo(); // Reset day number after form reset
            updateCalculatedFields(); // Reset calculated fields
            alert('Sales record added successfully!');
        } catch (error) {
            console.error('Error adding sales record:', error);
            alert(`Failed to add sales record: ${error.message}`);
        } finally {
            hideLoading();
        }
    });

    // Initialize sales when user logs in
    registerAuthStateHandler((user) => {
        if (user) {
            initializeDayNo(); // Set day number when user logs in
            generateMonthButtons(); // Generate month buttons
            loadSalesRecords();
            // Initialize dialog buttons after a longer delay to ensure DOM is ready
            setTimeout(() => {
                console.log('Calling initializeMultipleValuesButtons from auth handler');
                initializeMultipleValuesButtons();
            }, 500);
        } else {
            allSalesRecords = [];
            if (monthsTabContainer) {
                monthsTabContainer.innerHTML = '';
            }
        }
    });
}

// Load sales records
function loadSalesRecords() {
    if (!currentUser) return;

    const storeCode = getStoreCode();
    if (!storeCode) {
        console.error('Invalid user email format');
        return;
    }

    // Unsubscribe from previous snapshot if exists
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }

    // New Firebase structure: store-code > year > month > documents
    // Use selectedYear for data operations
    const monthCollectionPath = `${storeCode}/${selectedYear}/${currentMonth}`;
    const q = query(collection(db, monthCollectionPath));

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        allSalesRecords = [];
        snapshot.forEach((docSnap) => {
            allSalesRecords.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        // Sort by dayNo in JavaScript instead of Firestore
        allSalesRecords.sort((a, b) => a.dayNo - b.dayNo);
        displaySalesRecords();
    }, (error) => {
        console.error('Error loading sales records:', error);
        // Don't show alert for permission errors on empty collections
        if (error.code !== 'permission-denied') {
            alert(`Failed to load sales records: ${error.message}`);
        } else {
            // Just display empty table for permission denied (likely empty collection)
            allSalesRecords = [];
            displaySalesRecords();
        }
    });
}

// Display sales records
function displaySalesRecords() {
    if (allSalesRecords.length === 0) {
        salesTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="16" class="empty-state">No sales records yet. Add your first record above!</td>
            </tr>
        `;
        updateTotalCashSummary();
        return;
    }

    salesTableBody.innerHTML = allSalesRecords.map(record => {
        // Use stored calculated values
        const totalPlastic = record.totalPlastic || 0;
        const totalCash = record.totalCash || 0;
        const variance = record.variance || 0;

        let varianceClass = 'variance-zero';
        if (variance > 0) varianceClass = 'variance-positive';
        else if (variance < 0) varianceClass = 'variance-negative';

        return `
            <tr>
                <td class="day-no-column">${record.dayNo}</td>
                <td>${formatNumber(record.totalSales)}</td>
                <td>${formatNumber(record.onAccount)}</td>
                <td>${formatNumber(record.online)}</td>
                <td>${formatNumber(record.stc)}</td>
                <td>${formatNumber(record.rajhi)}</td>
                <td>${formatNumber(record.gift || 0)}</td>
                <td>${formatNumber(record.tamra)}</td>
                <td class="plastic-column">${formatNumber(record.mada)}</td>
                <td class="plastic-column">${formatNumber(record.visa)}</td>
                <td class="plastic-column">${formatNumber(record.master)}</td>
                <td class="plastic-column">${formatNumber(record.other)}</td>
                <td class="total-plastic-column">${formatNumber(totalPlastic)}</td>
                <td class="${varianceClass}">${formatNumber(variance)}</td>
                <td class="total-cash-column">${formatNumber(totalCash)}</td>
                <td>
                    <input type="checkbox" 
                           class="amanco-checkbox" 
                           data-record-id="${record.id}" 
                           ${record.amanco ? 'checked' : ''} 
                           onchange="toggleAmanco('${record.id}', this.checked)" />
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteSalesRecord('${record.id}')">Delete</button>
                </td>
                <td class="note-cell">${record.note || ''}</td>
            </tr>
        `;
    }).join('');
    
    // Update the summary
    updateTotalCashSummary();
}

// Calculate and update Total Cash summary for unchecked Amanco rows
function updateTotalCashSummary() {
    const totalCashSummaryElement = document.getElementById('total-cash-summary');
    
    if (!totalCashSummaryElement) return;
    
    // Calculate total cash for records where amanco is false (unchecked)
    const totalCash = allSalesRecords
        .filter(record => !record.amanco)
        .reduce((sum, record) => sum + (record.totalCash || 0), 0);
    
    totalCashSummaryElement.textContent = totalCash.toFixed(2);
}

// Delete sales record
async function deleteSalesRecord(recordId) {
    if (!confirm('Are you sure you want to delete this sales record?')) {
        return;
    }

    const storeCode = getStoreCode();
    if (!storeCode) {
        alert('Invalid user email format');
        return;
    }

    showLoading();
    try {
        const monthCollectionPath = `${storeCode}/${selectedYear}/${currentMonth}`;
        await deleteDoc(doc(db, monthCollectionPath, recordId));
    } catch (error) {
        console.error('Error deleting sales record:', error);
        alert(`Failed to delete sales record: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Toggle Amanco checkbox
async function toggleAmanco(recordId, isChecked) {
    const storeCode = getStoreCode();
    if (!storeCode) {
        alert('Invalid user email format');
        return;
    }

    showLoading();
    try {
        const monthCollectionPath = `${storeCode}/${selectedYear}/${currentMonth}`;
        await updateDoc(doc(db, monthCollectionPath, recordId), {
            amanco: isChecked
        });
    } catch (error) {
        console.error('Error updating Amanco status:', error);
        alert(`Failed to update Amanco status: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Make functions available globally
window.deleteSalesRecord = deleteSalesRecord;
window.toggleAmanco = toggleAmanco;

console.log('Sales module initialized');
