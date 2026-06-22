// Import necessary functions
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, registerAuthStateHandler, showLoading, hideLoading, db } from './auth.js';
import { formatEmptyZero } from './utils.js';
import { ungzip } from './lib/pako.esm.mjs';

// DOM Elements
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');
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
const monthsTabContainer = document.getElementById('months-tab');

// State
let allSalesRecords = [];
let currentMonth = getCurrentMonth(); // Current selected month
let selectedYear = new Date().getFullYear(); // Selected year for viewing
let unsubscribeSnapshot = null; // To unsubscribe from previous snapshots
let multipleValues = {
    mada: [],
    visa: [],
    master: []
}; // Store multiple values for each field

// Geidea terminal links saved with the record (committed on "Save All").
// `pendingGeideaLinks` accumulates while the dialog is open; "Save All"
// commits it into `geideaLinks`, "Cancel" discards it.
let geideaLinks = [];
let pendingGeideaLinks = [];

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
    const dayNo = today.getDate();
    const previousDay = dayNo - 1;
    salesDayNoInput.value = previousDay > 0 ? previousDay : 1;
    updatePettyCashReminder();
}

// Show/hide petty cash reminder when Day No. is 10
function updatePettyCashReminder() {
    const reminder = document.getElementById('petty-cash-reminder');
    if (!reminder) return;
    const dayNo = parseInt(salesDayNoInput.value) || 0;
    reminder.classList.toggle('hidden', dayNo !== 10);
}

salesDayNoInput.addEventListener('input', updatePettyCashReminder);

// Calculate Total Plastic (Mada + Visa + Master + Other)
function calculateTotalPlastic() {
    const mada = parseFloat(salesMadaInput.value) || 0;
    const visa = parseFloat(salesVisaInput.value) || 0;
    const master = parseFloat(salesMasterInput.value) || 0;
    const other = parseFloat(salesOtherInput.value) || 0;
    
    return parseFloat((mada + visa + master + other).toFixed(2));
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
    
    return parseFloat((totalSales - (onAccount + online + stc + rajhi + gift + tamra + totalPlastic) + variance).toFixed(2));
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
 salesRajhiInput, salesGiftInput, salesTamraInput, salesMadaInput, salesVisaInput, 
 salesMasterInput, salesOtherInput, salesVarianceInput].forEach(input => {
    input.addEventListener('input', updateCalculatedFields);
});

// Initialize sales when user logs in
registerAuthStateHandler((user) => {
    if (user) {
        initializeDayNo(); // Set day number when user logs in
        generateMonthButtons(); // Generate month buttons
        loadSalesRecords();
        initializeMultipleValuesButtons(); // Initialize dialog buttons
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
        gift: parseFloat(salesGiftInput.value) || 0,
        tamra: parseFloat(salesTamraInput.value) || 0,
        mada: parseFloat(salesMadaInput.value) || 0,
        visa: parseFloat(salesVisaInput.value) || 0,
        master: parseFloat(salesMasterInput.value) || 0,
        other: parseFloat(salesOtherInput.value) || 0,
        amanco: false, // Default to unchecked
        variance: parseFloat(salesVarianceInput.value) || 0,
        totalPlastic: calculateTotalPlastic(),
        totalCash: calculateTotalCash(),
        note: salesNoteInput.value.trim() || '',
        // Store multiple values for mada, visa, and master
        madaValues: multipleValues.mada.length > 0 ? multipleValues.mada : null,
        visaValues: multipleValues.visa.length > 0 ? multipleValues.visa : null,
        masterValues: multipleValues.master.length > 0 ? multipleValues.master : null,
        // Scanned Geidea terminal links for this day
        geideaLinks: geideaLinks.length > 0 ? geideaLinks : null,
        createdAt: serverTimestamp()
    };

    showLoading();
    try {
        // New Firebase structure: store-code > year > month > documents
        // Use selectedYear for data operations
        const monthCollectionPath = `${storeCode}/${selectedYear}/${currentMonth}`;
        await addDoc(collection(db, monthCollectionPath), salesRecord);
        salesForm.reset();
        // Reset multiple values
        multipleValues = {
            mada: [],
            visa: [],
            master: []
        };
        // Reset Geidea terminal links
        geideaLinks = [];
        pendingGeideaLinks = [];
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
                <td colspan="19" class="empty-state">No sales records yet. Add your first record above!</td>
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
                <td>${formatEmptyZero(record.totalSales)}</td>
                <td>${formatEmptyZero(record.onAccount)}</td>
                <td>${formatEmptyZero(record.online)}</td>
                <td>${formatEmptyZero(record.stc)}</td>
                <td>${formatEmptyZero(record.rajhi)}</td>
                <td>${formatEmptyZero(record.gift)}</td>
                <td>${formatEmptyZero(record.tamra)}</td>
                <td class="plastic-column">${formatEmptyZero(record.mada)}</td>
                <td class="plastic-column">${formatEmptyZero(record.visa)}</td>
                <td class="plastic-column">${formatEmptyZero(record.master)}</td>
                <td class="plastic-column">${formatEmptyZero(record.other)}</td>
                <td class="total-plastic-column">${formatEmptyZero(totalPlastic)}</td>
                <td class="${varianceClass}">${formatEmptyZero(variance)}</td>
                <td class="total-cash-column">${formatEmptyZero(totalCash)}</td>
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
                <td>${record.note || ''}</td>
                <td>${(record.geideaLinks && record.geideaLinks.length)
                    ? `<button class="view-terminals-btn" onclick="openTerminalsDialog('${record.id}')">View</button>`
                    : ''}</td>
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
    
    totalCashSummaryElement.textContent = formatEmptyZero(totalCash) || "0.00";
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

// ============================================
// Terminals Dialog Functions
// ============================================

// Show the Geidea terminal links saved for a given record as a list of
// buttons; each opens its link in a new browser tab.
function openTerminalsDialog(recordId) {
    const record = allSalesRecords.find(r => r.id === recordId);
    const list = document.getElementById('terminals-list');
    list.innerHTML = '';

    const links = (record && record.geideaLinks) || [];
    if (links.length === 0) {
        list.innerHTML = '<p class="terminals-empty">No terminal links for this day.</p>';
    } else {
        links.forEach((link, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-primary terminal-link-btn';
            btn.textContent = `Terminal ${index + 1}`;
            btn.onclick = () => window.open(link, '_blank', 'noopener');
            list.appendChild(btn);
        });
    }

    document.getElementById('terminals-dialog').classList.remove('hidden');
}

// Close the terminals dialog
function closeTerminalsDialog() {
    document.getElementById('terminals-dialog').classList.add('hidden');
}

// ============================================
// Multiple Values Dialog Functions
// ============================================

// Open the unified values dialog for all card types
function openValuesDialog() {
    const dialog = document.getElementById('values-dialog');
    
    // Initialize all three groups (mada, visa, master)
    ['mada', 'visa', 'master'].forEach(fieldName => {
        const container = document.getElementById(`values-container-${fieldName}`);
        container.innerHTML = '';
        
        const values = multipleValues[fieldName];
        
        if (values && values.length > 0) {
            values.forEach((value, index) => {
                createValueInput(container, fieldName, value, index);
            });
        } else {
            // Create 5 initial empty inputs
            for (let i = 0; i < 5; i++) {
                createValueInput(container, fieldName, 0, i);
            }
        }
    });
    
    // Start this dialog session from the already-committed links, then
    // reset the input and render the scanned list from them
    pendingGeideaLinks = [...geideaLinks];
    resetGeideaLinks();

    // Show dialog
    dialog.classList.remove('hidden');
    updateDialogTotals();
}

// Close the dialog
function closeValuesDialog() {
    const dialog = document.getElementById('values-dialog');
    dialog.classList.add('hidden');
}

// Create a value input row for a specific field.
// Set `prepend` to insert the row at the top instead of the bottom.
function createValueInput(container, fieldName, value = 0, index = 0, prepend = false) {
    const row = document.createElement('div');
    row.className = 'value-input-row';
    row.dataset.index = index;
    row.dataset.field = fieldName;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.value = value;
    input.placeholder = `Value ${index + 1}`;
    input.className = 'value-input';
    input.addEventListener('input', () => updateDialogTotal(fieldName));
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-value-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeValueInput(row, fieldName);

    row.appendChild(input);
    row.appendChild(removeBtn);
    if (prepend) {
        container.insertBefore(row, container.firstChild);
    } else {
        container.appendChild(row);
    }
}

// Add more value inputs for a specific field
function addMoreValueInput(fieldName) {
    const container = document.getElementById(`values-container-${fieldName}`);
    const currentCount = container.children.length;
    
    // Add 5 more inputs
    for (let i = 0; i < 5; i++) {
        createValueInput(container, fieldName, 0, currentCount + i);
    }
}

// Remove a value input
function removeValueInput(row, fieldName) {
    row.remove();
    updateDialogTotal(fieldName);
}

// Update the dialog total for a specific field
function updateDialogTotal(fieldName) {
    const container = document.getElementById(`values-container-${fieldName}`);
    const inputs = container.querySelectorAll('.value-input');
    let total = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    document.getElementById(`dialog-total-${fieldName}`).textContent = total.toFixed(2);
}

// Update all dialog totals
function updateDialogTotals() {
    ['mada', 'visa', 'master'].forEach(fieldName => {
        updateDialogTotal(fieldName);
    });
}

// Save multiple values for all three fields
function saveMultipleValues() {
    // Process all three fields
    ['mada', 'visa', 'master'].forEach(fieldName => {
        const container = document.getElementById(`values-container-${fieldName}`);
        const inputs = container.querySelectorAll('.value-input');
        const values = [];
        let total = 0;
        
        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            if (value > 0) { // Only store non-zero values
                values.push(value);
                total += value;
            }
        });
        
        // Store the values
        multipleValues[fieldName] = values;
        
        // Update the corresponding input field on the main form
        const fieldInput = document.getElementById(`sales-${fieldName}`);
        if (fieldInput) {
            fieldInput.value = total.toFixed(2);
            // Trigger the input event to update calculated fields
            fieldInput.dispatchEvent(new Event('input'));
        }
    });

    // Commit the Geidea links parsed during this dialog session
    geideaLinks = [...pendingGeideaLinks];

    closeValuesDialog();
}

// ============================================
// Geidea scanned-link parsing
// ============================================

// Geidea scheme code -> card column in the dialog
const GEIDEA_SCHEME_MAP = { mada: 'P1', visa: 'VC', master: 'MC' };

// Decode a Geidea QR link (or raw `details` value) into its JSON payload.
// The data is url-safe base64 -> gzip -> UTF-8 JSON.
function decodeGeideaLink(raw) {
    let details = (raw || '').trim();
    if (!details) throw new Error('No link provided');

    // Pull out the details= param if a full URL/query string was pasted
    // ([^&] so a line-wrapped value isn't cut off at the first whitespace)
    const match = details.match(/details=([^&]+)/);
    if (match) details = match[1];

    // QR payloads are often line-wrapped — strip any whitespace
    details = details.replace(/\s+/g, '');

    // Handle percent-encoding, then convert url-safe base64 to standard
    details = decodeURIComponent(details);
    let b64 = details.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    let bytes;
    try {
        const binary = atob(b64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch (e) {
        throw new Error('Link is not valid base64');
    }

    try {
        const json = ungzip(bytes, { to: 'string' });
        return JSON.parse(json);
    } catch (e) {
        throw new Error('Link content is not a valid Geidea report');
    }
}

// Read per-scheme totals out of the `tr_ttl` CSV.
// Format: a leading scheme count, then groups of 11 fields per scheme,
// where the group's last field is the scheme's total amount.
function parseGeideaTotals(payload) {
    const ttl = payload && payload.tr_ttl;
    if (!ttl) throw new Error('Link has no transaction totals (tr_ttl)');

    const parts = ttl.split(',');
    const totals = {};
    for (let i = 1; i + 10 < parts.length; i += 11) {
        const code = parts[i];
        const amount = parseFloat(parts[i + 10]) || 0;
        totals[code] = amount;
    }
    return totals;
}

// Fetch a NearPay reconciliation receipt and read its per-scheme totals.
// Unlike Geidea, the data is not in the URL — it's a UUID the server holds,
// so this requires internet. The receipt's scheme codes (P1, VC, MC, ...)
// match Geidea's, so the result feeds the same column-mapping logic.
async function fetchNearpayTotals(rawUrl) {
    const m = rawUrl.match(/reconciliation_receipt\/([0-9a-fA-F-]{36})/);
    if (!m) throw new Error('Not a valid NearPay reconciliation link');

    // The JSON lives at the same path without the "/ui" segment
    const apiUrl = `https://sa-api.nearpay.io/reconciliation_receipt/${m[1]}`;

    let resp;
    try {
        resp = await fetch(apiUrl);
    } catch (e) {
        throw new Error('Could not reach NearPay (no internet?)');
    }
    if (!resp.ok) throw new Error(`NearPay returned ${resp.status}`);

    let data;
    try {
        data = await resp.json();
    } catch (e) {
        throw new Error('NearPay response was not valid JSON');
    }
    if (!Array.isArray(data.schemes)) {
        throw new Error('NearPay receipt has no scheme totals');
    }

    const totals = {};
    data.schemes.forEach(s => {
        const code = s && s.name && s.name.value;
        const amount = parseFloat(s && s.host && s.host.total && s.host.total.total) || 0;
        if (code) totals[code] = amount;
    });
    return totals;
}

// Resolve any supported link into a { schemeCode: amount } map.
// NearPay links are fetched; everything else is treated as a Geidea QR.
async function getLinkTotals(raw) {
    if (/nearpay\.io/i.test(raw)) {
        return fetchNearpayTotals(raw);
    }
    return parseGeideaTotals(decodeGeideaLink(raw));
}

// Render the running list of links scanned this session, so the user can
// confirm every one of them will be saved with the record on "Save All".
function renderScannedLinks() {
    const list = document.getElementById('geidea-scanned-list');
    if (!list) return;

    if (pendingGeideaLinks.length === 0) {
        list.innerHTML = '';
        return;
    }

    const chips = pendingGeideaLinks
        .map((_, i) => `<span class="scanned-chip">Terminal ${i + 1}</span>`)
        .join('');
    list.innerHTML =
        `<div class="scanned-title">Scanned terminals (${pendingGeideaLinks.length}) — all will be saved:</div>` +
        `<div class="scanned-chips">${chips}</div>`;
}

// Reset the single link input, the scanned list, and the status message.
function resetGeideaLinks() {
    const input = document.getElementById('geidea-link-input');
    const status = document.getElementById('geidea-link-status');
    if (input) input.value = '';
    if (status) {
        status.className = 'geidea-link-status';
        status.textContent = '';
    }
    renderScannedLinks();
}

// Scan ONE link at a time: parse it, append each card total to its column,
// remember the link, then clear the box ready for the next scan. All scanned
// links accumulate in `pendingGeideaLinks` and are committed on "Save All".
async function parseGeideaLink() {
    const input = document.getElementById('geidea-link-input');
    const status = document.getElementById('geidea-link-status');
    status.className = 'geidea-link-status';

    const raw = (input.value || '').trim();
    if (!raw) {
        status.classList.add('error');
        status.textContent = 'Enter a link to scan.';
        return;
    }

    status.textContent = 'Parsing…';

    let totals;
    try {
        totals = await getLinkTotals(raw);
    } catch (e) {
        status.classList.add('error');
        status.textContent = `Could not read link: ${e.message}`;
        return;
    }

    const mappedCodes = Object.values(GEIDEA_SCHEME_MAP);
    const addedCount = { mada: 0, visa: 0, master: 0 };
    const unmappedNotes = [];

    // Append one value to a card column (newest on top) and tally it
    const addValue = (field, amount) => {
        const col = document.getElementById(`values-container-${field}`);
        createValueInput(col, field, amount, col.children.length, true);
        updateDialogTotal(field);
        addedCount[field]++;
    };

    let anyAmount = false;

    // Mapped schemes go to their own columns
    Object.entries(GEIDEA_SCHEME_MAP).forEach(([field, code]) => {
        const amount = totals[code] || 0;
        if (amount > 0) {
            addValue(field, amount);
            anyAmount = true;
        }
    });

    // Any other scheme with a value is folded into Master, and noted
    Object.entries(totals).forEach(([code, amount]) => {
        if (amount > 0 && !mappedCodes.includes(code)) {
            addValue('master', amount);
            unmappedNotes.push(`${code} ${amount.toFixed(2)}`);
            anyAmount = true;
        }
    });

    if (!anyAmount) {
        status.classList.add('error');
        status.textContent = 'Link parsed, but no card amounts found.';
        return;
    }

    // Remember this link, clear the box for the next scan, refresh the list
    pendingGeideaLinks.push(raw);
    input.value = '';
    renderScannedLinks();

    const summary = Object.entries(addedCount)
        .filter(([, n]) => n > 0)
        .map(([field, n]) => `${field.charAt(0).toUpperCase() + field.slice(1)} +${n}`)
        .join(', ');
    const messages = [`Scanned link ${pendingGeideaLinks.length}: ${summary}`];
    if (unmappedNotes.length) {
        messages.push(`Unknown scheme(s) added to Master: ${unmappedNotes.join(', ')}`);
    }
    status.classList.add('success');
    status.textContent = messages.join(' — ');
}

// Initialize event listeners for '+' buttons
function initializeMultipleValuesButtons() {
    document.querySelectorAll('.add-values-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // All buttons open the same unified dialog
            openValuesDialog();
        });
    });
}

// Make functions available globally
window.deleteSalesRecord = deleteSalesRecord;
window.toggleAmanco = toggleAmanco;
window.openValuesDialog = openValuesDialog;
window.closeValuesDialog = closeValuesDialog;
window.addMoreValueInput = addMoreValueInput;
window.saveMultipleValues = saveMultipleValues;
window.removeValueInput = removeValueInput;
window.parseGeideaLink = parseGeideaLink;
window.openTerminalsDialog = openTerminalsDialog;
window.closeTerminalsDialog = closeTerminalsDialog;

console.log('Sales module initialized');
