// Import necessary functions
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, registerAuthStateHandler, showLoading, hideLoading, db } from './auth.js';

// DOM Elements
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');
const salesDayNoInput = document.getElementById('sales-day-no');
const salesTotalInput = document.getElementById('sales-total');
const salesOnAccountInput = document.getElementById('sales-on-account');
const salesOnlineInput = document.getElementById('sales-online');
const salesStcInput = document.getElementById('sales-stc');
const salesRajhiInput = document.getElementById('sales-rajhi');
const salesTamraInput = document.getElementById('sales-tamra');
const salesMadaInput = document.getElementById('sales-mada');
const salesVisaInput = document.getElementById('sales-visa');
const salesMasterInput = document.getElementById('sales-master');
const salesOtherInput = document.getElementById('sales-other');
const salesVarianceInput = document.getElementById('sales-variance');
const salesTotalPlasticInput = document.getElementById('sales-total-plastic');
const salesTotalCashInput = document.getElementById('sales-total-cash');
const monthsTabContainer = document.getElementById('months-tab');

// State
let allSalesRecords = [];
let currentMonth = getCurrentMonth(); // Current selected month
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

// Extract store code from user email (first 4 characters)
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Generate month buttons for the current year
function generateMonthButtons() {
    if (!monthsTabContainer) return;
    
    const currentYear = new Date().getFullYear();
    const months = [];
    
    // Generate 12 months for the current year
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        months.push(`${currentYear}${monthStr}`);
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
// Formula: Total Sales - (On Account + Online + STC + Rajhi + Tamra + Total Plastic) + Variance
function calculateTotalCash() {
    const totalSales = parseFloat(salesTotalInput.value) || 0;
    const onAccount = parseFloat(salesOnAccountInput.value) || 0;
    const online = parseFloat(salesOnlineInput.value) || 0;
    const stc = parseFloat(salesStcInput.value) || 0;
    const rajhi = parseFloat(salesRajhiInput.value) || 0;
    const tamra = parseFloat(salesTamraInput.value) || 0;
    const totalPlastic = calculateTotalPlastic();
    const variance = parseFloat(salesVarianceInput.value) || 0;
    
    return totalSales - (onAccount + online + stc + rajhi + tamra + totalPlastic) + variance;
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

// Add event listeners to all input fields for real-time calculation
[salesTotalInput, salesOnAccountInput, salesOnlineInput, salesStcInput, 
 salesRajhiInput, salesTamraInput, salesMadaInput, salesVisaInput, 
 salesMasterInput, salesOtherInput, salesVarianceInput].forEach(input => {
    input.addEventListener('input', updateCalculatedFields);
});

// Initialize sales when user logs in
registerAuthStateHandler((user) => {
    if (user) {
        initializeDayNo(); // Set day number when user logs in
        generateMonthButtons(); // Generate month buttons
        loadSalesRecords();
    } else {
        allSalesRecords = [];
        if (monthsTabContainer) {
            monthsTabContainer.innerHTML = '';
        }
    }
});

// Add sales record
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
        tamra: parseFloat(salesTamraInput.value) || 0,
        mada: parseFloat(salesMadaInput.value) || 0,
        visa: parseFloat(salesVisaInput.value) || 0,
        master: parseFloat(salesMasterInput.value) || 0,
        other: parseFloat(salesOtherInput.value) || 0,
        amanco: false, // Default to unchecked
        variance: parseFloat(salesVarianceInput.value) || 0,
        totalPlastic: calculateTotalPlastic(),
        totalCash: calculateTotalCash(),
        createdAt: serverTimestamp()
    };

    showLoading();
    try {
        // New Firebase structure: store-code > cash-sheet > month > documents
        const monthCollectionPath = `${storeCode}/cash-sheet/${currentMonth}`;
        await addDoc(collection(db, monthCollectionPath), salesRecord);
        salesForm.reset();
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

    // New Firebase structure: store-code > cash-sheet > month > documents
    const monthCollectionPath = `${storeCode}/cash-sheet/${currentMonth}`;
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
                <td>${record.totalSales.toFixed(2)}</td>
                <td>${record.onAccount.toFixed(2)}</td>
                <td>${record.online.toFixed(2)}</td>
                <td>${record.stc.toFixed(2)}</td>
                <td>${record.rajhi.toFixed(2)}</td>
                <td>${record.tamra.toFixed(2)}</td>
                <td class="plastic-column">${record.mada.toFixed(2)}</td>
                <td class="plastic-column">${record.visa.toFixed(2)}</td>
                <td class="plastic-column">${record.master.toFixed(2)}</td>
                <td class="plastic-column">${record.other.toFixed(2)}</td>
                <td class="total-plastic-column">${totalPlastic.toFixed(2)}</td>
                <td class="${varianceClass}">${variance.toFixed(2)}</td>
                <td class="total-cash-column">${totalCash.toFixed(2)}</td>
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
        const monthCollectionPath = `${storeCode}/cash-sheet/${currentMonth}`;
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
        const monthCollectionPath = `${storeCode}/cash-sheet/${currentMonth}`;
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
