// Sales Display Module
// Handles loading and displaying sales records (separated from form handling)

import { collection, query, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, registerAuthStateHandler, showLoading, hideLoading, db } from './auth.js';
import { formatNumber } from './utils.js';

// DOM Elements (like old version - initialized at top level)
const salesTableBody = document.getElementById('sales-table-body');
const monthsTabContainer = document.getElementById('months-tab');

// State (like old version - module-level variables)
let allSalesRecords = [];
let currentMonth = getCurrentMonth();
let selectedYear = new Date().getFullYear();
let unsubscribeSnapshot = null;

// Export getter functions to access selectedYear and currentMonth (like old version)
// This allows other modules to get the current values
export function getSelectedYear() {
    return selectedYear;
}

export function getCurrentMonthValue() {
    return currentMonth;
}

// Initialize sales when user logs in (like old version)
registerAuthStateHandler((user) => {
    if (user) {
        generateMonthButtons(); // Generate month buttons
        loadSalesRecords();
    } else {
        allSalesRecords = [];
        if (monthsTabContainer) {
            monthsTabContainer.innerHTML = '';
        }
    }
});

// Get current month in YYYYMM format
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}

// Extract store code from user email
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Generate month buttons for the current year (like old version)
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

// Select a month and load its data (like old version)
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

// Change year (delta: -1 for previous, +1 for next) (like old version)
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

// Load sales records from Firestore
function loadSalesRecords() {
    if (!currentUser) return;

    const storeCode = getStoreCode();
    if (!storeCode) {
        console.error('Invalid user email format');
        return;
    }

    // Unsubscribe from previous snapshot
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }

    // Firebase path: store-code/year/month/documents
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
        
        // Sort by dayNo
        allSalesRecords.sort((a, b) => a.dayNo - b.dayNo);
        displaySalesRecords();
    }, (error) => {
        console.error('Error loading sales records:', error);
        if (error.code !== 'permission-denied') {
            alert(`Failed to load sales records: ${error.message}`);
        } else {
            allSalesRecords = [];
            displaySalesRecords();
        }
    });
}

// Display sales records in table
function displaySalesRecords() {
    if (!salesTableBody) return;
    
    if (allSalesRecords.length === 0) {
        salesTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="17" class="empty-state">No sales records yet. Add your first record above!</td>
            </tr>
        `;
        updateTotalCashSummary();
        return;
    }

    salesTableBody.innerHTML = allSalesRecords.map(record => {
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
    
    updateTotalCashSummary();
}

// Update total cash summary
function updateTotalCashSummary() {
    const totalCashSummaryElement = document.getElementById('total-cash-summary');
    if (!totalCashSummaryElement) return;
    
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
window.selectMonth = selectMonth;
window.changeYear = changeYear;
window.deleteSalesRecord = deleteSalesRecord;
window.toggleAmanco = toggleAmanco;

console.log('Sales Display module loaded');