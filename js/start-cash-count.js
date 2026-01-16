// Start Cash Count Dialog Logic
import { auth, db } from './auth.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { showLoading, hideLoading } from './auth.js';

// Make functions globally accessible
window.openStartCashCountDialog = openStartCashCountDialog;
window.closeStartCashCountDialog = closeStartCashCountDialog;
window.clearStartCashCountDialog = clearStartCashCountDialog;
window.addDeliveryOrderInput = addDeliveryOrderInput;
window.saveStartCashCount = saveStartCashCount;

console.log('Start Cash Count functions exported to window');

// DOM Elements
let dialogElement = null;
let totalCashInput = null;
let startCashInput = null;
let totalInput = null;
let cashierInput = null;
let safeInput = null;
let deliveryOrdersContainer = null;
let deliveryOrdersSummary = null;
let deficitInput = null;

// Initialize dialog elements when DOM is ready
function initializeDialogElements() {
    dialogElement = document.getElementById('start-cash-count-dialog');
    totalCashInput = document.getElementById('cash-count-total-cash');
    startCashInput = document.getElementById('cash-count-start-cash');
    totalInput = document.getElementById('cash-count-total');
    cashierInput = document.getElementById('cash-count-cashier');
    safeInput = document.getElementById('cash-count-safe');
    deliveryOrdersContainer = document.getElementById('delivery-orders-container');
    deliveryOrdersSummary = document.getElementById('delivery-orders-summary');
    deficitInput = document.getElementById('cash-count-deficit');
    
    // Add event listeners
    if (startCashInput) {
        startCashInput.addEventListener('input', calculateTotal);
        startCashInput.addEventListener('input', calculateDeficit);
    }
    if (cashierInput) {
        cashierInput.addEventListener('input', calculateDeficit);
    }
    if (safeInput) {
        safeInput.addEventListener('input', calculateDeficit);
    }
    
    // Initialize with 6 delivery order inputs
    initializeDeliveryOrders();
}

// Initialize delivery order inputs
function initializeDeliveryOrders() {
    if (!deliveryOrdersContainer) return;
    
    // Clear existing
    deliveryOrdersContainer.innerHTML = '';
    
    // Add 6 initial inputs
    for (let i = 0; i < 6; i++) {
        addDeliveryOrderInput();
    }
}

// Add delivery order input
function addDeliveryOrderInput() {
    if (!deliveryOrdersContainer) {
        initializeDialogElements();
    }
    
    const row = document.createElement('div');
    row.className = 'value-input-row';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.placeholder = 'Enter amount';
    input.className = 'delivery-order-input';
    input.addEventListener('input', calculateDeliveryOrdersSummary);
    input.addEventListener('input', calculateDeficit);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-value-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() {
        row.remove();
        calculateDeliveryOrdersSummary();
        calculateDeficit();
    };
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    deliveryOrdersContainer.appendChild(row);
}

// Calculate Start Cash + Total Cash
function calculateTotal() {
    const startCash = parseFloat(startCashInput.value) || 0;
    const totalCash = parseFloat(totalCashInput.value) || 0;
    
    totalInput.value = (startCash + totalCash).toFixed(2);
}

// Calculate delivery orders summary
function calculateDeliveryOrdersSummary() {
    const inputs = document.querySelectorAll('.delivery-order-input');
    let sum = 0;
    
    inputs.forEach(input => {
        sum += parseFloat(input.value) || 0;
    });
    
    deliveryOrdersSummary.value = sum.toFixed(2);
}

// Calculate deficit
// Deficit = Start Cash - (Safe Count + Cashier Count + Out for Delivery Summary)
function calculateDeficit() {
    const startCash = parseFloat(startCashInput.value) || 0;
    const safeCount = parseFloat(safeInput.value) || 0;
    const cashierCount = parseFloat(cashierInput.value) || 0;
    const deliverySummary = parseFloat(deliveryOrdersSummary.value) || 0;
    
    const deficit = startCash - (safeCount + cashierCount + deliverySummary);
    deficitInput.value = deficit.toFixed(2);
    
    // Color the deficit field based on value
    if (deficit > 0) {
        deficitInput.style.color = 'red';
    } else if (deficit < 0) {
        deficitInput.style.color = 'green';
    } else {
        deficitInput.style.color = '#666';
    }
}

// Open dialog
function openStartCashCountDialog() {
    if (!dialogElement) {
        initializeDialogElements();
    }
    
    // Get total cash value from main page
    const mainTotalCash = document.getElementById('sales-total-cash');
    if (mainTotalCash) {
        totalCashInput.value = mainTotalCash.value || '0.00';
    }
    
    // Load existing data if available
    loadStartCashCountData();
    
    // Calculate the total when dialog opens (Start Cash + Total Cash)
    calculateTotal();
    
    dialogElement.classList.remove('hidden');
}

// Close dialog
function closeStartCashCountDialog() {
    if (dialogElement) {
        dialogElement.classList.add('hidden');
    }
}

// Clear dialog (except start cash and total cash)
function clearStartCashCountDialog() {
    // Get total cash from main page again
    const mainTotalCash = document.getElementById('sales-total-cash');
    if (mainTotalCash) {
        totalCashInput.value = mainTotalCash.value || '0.00';
    }
    
    // Clear other fields
    cashierInput.value = '';
    safeInput.value = '';
    
    // Reset delivery orders
    initializeDeliveryOrders();
    
    // Reset calculated fields
    totalInput.value = '';
    deliveryOrdersSummary.value = '0.00';
    deficitInput.value = '0.00';
    deficitInput.style.color = '#666';
    
    // Recalculate if start cash exists
    if (startCashInput.value) {
        calculateTotal();
        calculateDeficit();
    }
}

// Get store code (first 4 digits of email)
function getStoreCode() {
    if (!auth.currentUser || !auth.currentUser.email) {
        return null;
    }
    
    // Extract first 4 characters from email (before the empId)
    const email = auth.currentUser.email;
    return email.substring(0, 4);
}

// Load existing data from Firebase
async function loadStartCashCountData() {
    try {
        const storeCode = getStoreCode();
        if (!storeCode) {
            console.error('No store code available');
            return;
        }
        
        showLoading();
        
        const docRef = doc(db, storeCode, 'start-cash-count');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Populate fields
            if (data.startCash !== undefined) {
                startCashInput.value = data.startCash;
            }
            if (data.cashierCount !== undefined) {
                cashierInput.value = data.cashierCount;
            }
            if (data.safeCount !== undefined) {
                safeInput.value = data.safeCount;
            }
            
            // Populate delivery orders
            if (data.deliveryOrders && Array.isArray(data.deliveryOrders)) {
                deliveryOrdersContainer.innerHTML = '';
                data.deliveryOrders.forEach(amount => {
                    addDeliveryOrderInput();
                    const inputs = deliveryOrdersContainer.querySelectorAll('.delivery-order-input');
                    const lastInput = inputs[inputs.length - 1];
                    lastInput.value = amount;
                });
            }
            
            // Recalculate
            calculateTotal();
            calculateDeliveryOrdersSummary();
            calculateDeficit();
        }
    } catch (error) {
        console.error('Error loading start cash count data:', error);
    } finally {
        hideLoading();
    }
}

// Save to Firebase
async function saveStartCashCount() {
    try {
        const storeCode = getStoreCode();
        if (!storeCode) {
            alert('Error: Unable to determine store code. Please log in again.');
            return;
        }
        
        // Validate required fields
        if (!startCashInput.value) {
            alert('Please enter Start Cash amount.');
            return;
        }
        
        // Collect delivery orders
        const deliveryInputs = document.querySelectorAll('.delivery-order-input');
        const deliveryOrders = [];
        deliveryInputs.forEach(input => {
            const value = parseFloat(input.value);
            if (value > 0) {
                deliveryOrders.push(value);
            }
        });
        
        // Prepare data
        const data = {
            totalCash: parseFloat(totalCashInput.value) || 0,
            startCash: parseFloat(startCashInput.value) || 0,
            total: parseFloat(totalInput.value) || 0,
            cashierCount: parseFloat(cashierInput.value) || 0,
            safeCount: parseFloat(safeInput.value) || 0,
            deliveryOrders: deliveryOrders,
            deliveryOrdersSummary: parseFloat(deliveryOrdersSummary.value) || 0,
            deficit: parseFloat(deficitInput.value) || 0,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.email
        };
        
        showLoading();
        
        // Save to Firebase: collection = storeCode, document = 'start-cash-count'
        const docRef = doc(db, storeCode, 'start-cash-count');
        await setDoc(docRef, data);
        
        hideLoading();
        alert('Start Cash Count saved successfully!');
        closeStartCashCountDialog();
        
    } catch (error) {
        console.error('Error saving start cash count:', error);
        hideLoading();
        alert(`Error saving data: ${error.message}`);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDialogElements);
} else {
    // If DOM is already loaded, wait a bit for the dialog HTML to be injected
    setTimeout(initializeDialogElements, 100);
}

console.log('Start Cash Count module initialized');
