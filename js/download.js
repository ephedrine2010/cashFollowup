// Import necessary functions
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, db } from './auth.js';

// Import SheetJS library for Excel export
const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";

// Load SheetJS library dynamically
let xlsxLoaded = false;
function loadXLSX() {
    return new Promise((resolve, reject) => {
        if (xlsxLoaded && window.XLSX) {
            resolve(window.XLSX);
            return;
        }
        
        const script = document.createElement('script');
        script.src = XLSX_CDN;
        script.onload = () => {
            xlsxLoaded = true;
            resolve(window.XLSX);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Get store code from user email
function getStoreCode() {
    if (!currentUser || !currentUser.email) return null;
    return currentUser.email.substring(0, 4);
}

// Open download dialog
function openDownloadDialog() {
    const dialog = document.getElementById('download-dialog');
    if (!dialog) {
        alert('Download dialog not loaded yet. Please try again.');
        return;
    }
    
    // Get current selected year from the sales module
    const yearDisplay = document.getElementById('current-year');
    const currentYear = yearDisplay ? yearDisplay.textContent : new Date().getFullYear().toString();
    
    // Update year display in dialog
    const downloadYearDisplay = document.getElementById('download-year-display');
    if (downloadYearDisplay) {
        downloadYearDisplay.textContent = currentYear;
    }
    
    // Generate month checkboxes
    generateMonthCheckboxes(currentYear);
    
    // Show dialog
    dialog.classList.remove('hidden');
}

// Close download dialog
function closeDownloadDialog() {
    const dialog = document.getElementById('download-dialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
}

// Generate month checkboxes
function generateMonthCheckboxes(year) {
    const container = document.getElementById('month-checkboxes');
    if (!container) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    container.innerHTML = '';
    
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const monthValue = `${year}${monthStr}`;
        
        const label = document.createElement('label');
        label.className = 'download-option month-option';
        label.innerHTML = `
            <input type="checkbox" class="month-checkbox" value="${monthValue}">
            <span class="option-label">${monthNames[month - 1]} (${monthValue})</span>
        `;
        container.appendChild(label);
    }
}

// Toggle all months
function toggleAllMonths(checked) {
    const checkboxes = document.querySelectorAll('.month-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// Start download process
async function startDownload() {
    const selectedMonths = Array.from(document.querySelectorAll('.month-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedMonths.length === 0) {
        alert('Please select at least one month to download.');
        return;
    }
    
    const formatOption = document.querySelector('input[name="download-format"]:checked').value;
    const storeCode = getStoreCode();
    
    if (!storeCode) {
        alert('Invalid user email format. Email must start with a 4-digit store code.');
        return;
    }
    
    try {
        // Load XLSX library
        const XLSX = await loadXLSX();
        
        // Show loading
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) loadingDiv.classList.remove('hidden');
        
        if (formatOption === 'single') {
            await downloadSingleFile(XLSX, storeCode, selectedMonths);
        } else {
            await downloadSeparateFiles(XLSX, storeCode, selectedMonths);
        }
        
        closeDownloadDialog();
        
    } catch (error) {
        console.error('Error downloading data:', error);
        alert(`Failed to download data: ${error.message}`);
    } finally {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

// Download single file with all months
async function downloadSingleFile(XLSX, storeCode, selectedMonths) {
    const workbook = XLSX.utils.book_new();
    
    for (const month of selectedMonths) {
        const data = await fetchMonthData(storeCode, month);
        if (data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, month);
        }
    }
    
    const year = selectedMonths[0].substring(0, 4);
    const fileName = `Sales_${storeCode}_${year}_Multiple_Months.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

// Download separate files for each month
async function downloadSeparateFiles(XLSX, storeCode, selectedMonths) {
    for (const month of selectedMonths) {
        const data = await fetchMonthData(storeCode, month);
        if (data.length > 0) {
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
            
            const fileName = `Sales_${storeCode}_${month}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        }
    }
}

// Fetch data for a specific month
async function fetchMonthData(storeCode, month) {
    const year = month.substring(0, 4);
    const monthCollectionPath = `${storeCode}/${year}/${month}`;
    
    try {
        const q = query(collection(db, monthCollectionPath));
        const snapshot = await getDocs(q);
        
        const data = [];
        snapshot.forEach((docSnap) => {
            const record = docSnap.data();
            // Format data for Excel
            data.push({
                'Day No': record.dayNo || '',
                'Total Sales': record.totalSales || 0,
                'On Account': record.onAccount || 0,
                'Online': record.online || 0,
                'STC': record.stc || 0,
                'Rajhi': record.rajhi || 0,
                'Gift': record.gift || 0,
                'Tamra': record.tamra || 0,
                'Mada': record.mada || 0,
                'Visa': record.visa || 0,
                'Master': record.master || 0,
                'Other': record.other || 0,
                'Total Plastic': record.totalPlastic || 0,
                'Variance': record.variance || 0,
                'Total Cash': record.totalCash || 0,
                'Amanco': record.amanco ? 'Yes' : 'No'
            });
        });
        
        // Sort by day number
        data.sort((a, b) => a['Day No'] - b['Day No']);
        
        return data;
    } catch (error) {
        console.error(`Error fetching data for ${month}:`, error);
        return [];
    }
}

// Make functions available globally
window.openDownloadDialog = openDownloadDialog;
window.closeDownloadDialog = closeDownloadDialog;
window.toggleAllMonths = toggleAllMonths;
window.startDownload = startDownload;

console.log('Download functions exported to window');
