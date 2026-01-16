/**
 * Export Data Dialog Logic
 */

import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, showLoading, hideLoading, db } from '../../js/auth.js';

const MONTHS_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function initExportData() {
    const dialog = document.getElementById('export-data-dialog');
    const closeBtn = document.getElementById('close-export-dialog-btn');
    const cancelBtn = document.getElementById('cancel-export-btn');
    const exportBtn = document.getElementById('export-to-excel-btn');
    const selectAllBtn = document.getElementById('select-all-months-btn');
    const deselectAllBtn = document.getElementById('deselect-all-months-btn');
    const yearSelect = document.getElementById('export-year-select');
    const monthsContainer = document.getElementById('export-months-container');

    // Event Listeners
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    exportBtn.addEventListener('click', exportToExcel);
    selectAllBtn.addEventListener('click', selectAllMonths);
    deselectAllBtn.addEventListener('click', deselectAllMonths);
    yearSelect.addEventListener('change', populateMonths);

    function openDialog() {
        populateYears();
        populateMonths();
        dialog.classList.remove('hidden');
    }

    function closeDialog() {
        dialog.classList.add('hidden');
    }

    function populateYears() {
        const currentYear = new Date().getFullYear();
        const years = [];
        
        // Generate years from 2020 to current year + 1
        for (let year = 2020; year <= currentYear + 1; year++) {
            years.push(year);
        }

        yearSelect.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    function populateMonths() {
        const selectedYear = yearSelect.value;
        monthsContainer.innerHTML = '';

        for (let month = 1; month <= 12; month++) {
            const monthStr = String(month).padStart(2, '0');
            const monthValue = `${selectedYear}${monthStr}`;
            const monthName = MONTHS_NAMES[month - 1];

            const item = document.createElement('div');
            item.className = 'month-checkbox-item';
            item.dataset.month = monthValue;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `month-${monthValue}`;
            checkbox.value = monthValue;
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `month-${monthValue}`;
            label.textContent = `${monthName} (${monthValue})`;

            // Make entire item clickable
            item.addEventListener('click', function(e) {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            item.appendChild(checkbox);
            item.appendChild(label);
            monthsContainer.appendChild(item);
        }
    }

    function selectAllMonths() {
        const checkboxes = monthsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        });
    }

    function deselectAllMonths() {
        const checkboxes = monthsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        });
    }

    function getStoreCode() {
        if (!currentUser || !currentUser.email) return null;
        return currentUser.email.substring(0, 4);
    }

    async function exportToExcel() {
        const selectedCheckboxes = monthsContainer.querySelectorAll('input[type="checkbox"]:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one month to export');
            return;
        }

        const selectedMonths = Array.from(selectedCheckboxes).map(cb => cb.value);
        const storeCode = getStoreCode();
        
        if (!storeCode) {
            alert('Invalid user email format');
            return;
        }

        showLoading();
        try {
            // Fetch data for selected months
            const allData = [];
            
            for (const monthValue of selectedMonths) {
                const year = monthValue.substring(0, 4);
                const monthCollectionPath = `${storeCode}/${year}/${monthValue}`;
                
                try {
                    const querySnapshot = await getDocs(collection(db, monthCollectionPath));
                    
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        allData.push({
                            Month: monthValue,
                            'Day No': data.dayNo || '',
                            'Total Sales': data.totalSales || 0,
                            'On Account': data.onAccount || 0,
                            'Online': data.online || 0,
                            'STC': data.stc || 0,
                            'Rajhi': data.rajhi || 0,
                            'Tamra': data.tamra || 0,
                            'Mada': data.mada || 0,
                            'Visa': data.visa || 0,
                            'Master': data.master || 0,
                            'Other': data.other || 0,
                            'Total Plastic': data.totalPlastic || 0,
                            'Variance': data.variance || 0,
                            'Total Cash': data.totalCash || 0,
                            'Amanco': data.amanco ? 'Yes' : 'No'
                        });
                    });
                } catch (error) {
                    console.warn(`No data found for month ${monthValue}`);
                }
            }

            if (allData.length === 0) {
                alert('No data found for the selected months');
                hideLoading();
                return;
            }

            // Sort by month and day
            allData.sort((a, b) => {
                if (a.Month !== b.Month) {
                    return a.Month.localeCompare(b.Month);
                }
                return a['Day No'] - b['Day No'];
            });

            // Convert to CSV
            const csv = convertToCSV(allData);
            
            // Download CSV file
            downloadCSV(csv, `sales_data_${storeCode}_${selectedMonths[0]}_to_${selectedMonths[selectedMonths.length - 1]}.csv`);
            
            alert(`Successfully exported ${allData.length} records!`);
            closeDialog();
        } catch (error) {
            console.error('Error exporting data:', error);
            alert(`Failed to export data: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    function convertToCSV(data) {
        if (data.length === 0) return '';

        // Get headers
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Handle values that might contain commas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            // Create a link to the file
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Expose openDialog to the window
    window.openExportDataDialog = openDialog;
}
