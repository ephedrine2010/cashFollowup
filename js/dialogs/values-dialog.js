// Values Dialog Module
// Handles the multiple values entry dialog for card transactions

let currentDialogField = null;
export let multipleValues = {
    mada: [],
    visa: [],
    master: []
};

// Open the values dialog for a specific field
function openValuesDialog(fieldName) {
    currentDialogField = fieldName;
    const dialog = document.getElementById('values-dialog');
    const dialogTitle = document.getElementById('dialog-title');
    const valuesContainer = document.getElementById('values-container');
    
    if (!dialog || !dialogTitle || !valuesContainer) {
        console.error('Dialog elements not found');
        return;
    }
    
    // Set dialog title
    dialogTitle.textContent = `Enter Multiple ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Values`;
    
    // Clear and populate with existing values or create 5 empty inputs
    valuesContainer.innerHTML = '';
    const values = multipleValues[fieldName];
    
    if (values && values.length > 0) {
        values.forEach((value, index) => {
            createValueInput(valuesContainer, value, index);
        });
    } else {
        // Create 5 initial empty inputs
        for (let i = 0; i < 5; i++) {
            createValueInput(valuesContainer, 0, i);
        }
    }
    
    // Show dialog
    dialog.classList.remove('hidden');
    updateDialogTotal();
}

// Close the dialog
function closeValuesDialog() {
    const dialog = document.getElementById('values-dialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
    currentDialogField = null;
}

// Create a value input row
function createValueInput(container, value = 0, index = 0) {
    const row = document.createElement('div');
    row.className = 'value-input-row';
    row.dataset.index = index;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.value = value;
    input.placeholder = `Value ${index + 1}`;
    input.className = 'value-input';
    input.addEventListener('input', updateDialogTotal);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-value-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeValueInput(row);
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

// Add more value inputs
function addMoreValueInput() {
    const container = document.getElementById('values-container');
    if (!container) return;
    
    const currentCount = container.children.length;
    
    // Add 5 more inputs
    for (let i = 0; i < 5; i++) {
        createValueInput(container, 0, currentCount + i);
    }
}

// Remove a value input
function removeValueInput(row) {
    row.remove();
    updateDialogTotal();
}

// Update the dialog total
function updateDialogTotal() {
    const inputs = document.querySelectorAll('.value-input');
    let total = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    const totalElement = document.getElementById('dialog-total');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Save multiple values
function saveMultipleValues() {
    if (!currentDialogField) return;
    
    const inputs = document.querySelectorAll('.value-input');
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
    multipleValues[currentDialogField] = values;
    
    // Update the corresponding input field
    const fieldInput = document.getElementById(`sales-${currentDialogField}`);
    if (fieldInput) {
        fieldInput.value = total.toFixed(2);
        // Trigger the input event to update calculated fields
        fieldInput.dispatchEvent(new Event('input'));
    }
    
    closeValuesDialog();
}

// Initialize event listeners for '+' buttons
function initializeMultipleValuesButtons() {
    console.log('Initializing multiple values buttons...');
    
    // Check if dialog is loaded
    const dialog = document.getElementById('values-dialog');
    console.log('Dialog element found:', !!dialog);
    
    const buttons = document.querySelectorAll('.add-values-btn');
    console.log(`Found ${buttons.length} add-values-btn buttons`);
    
    if (buttons.length === 0) {
        console.warn('No add-values-btn buttons found!');
        // Try again after a delay
        setTimeout(() => {
            console.log('Retrying button initialization...');
            initializeMultipleValuesButtons();
        }, 500);
        return;
    }
    
    buttons.forEach((btn, index) => {
        console.log(`Button ${index}: field=${btn.dataset.field}`);
        // Remove any existing event listeners to prevent duplicates
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-select buttons after cloning
    document.querySelectorAll('.add-values-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`Button clicked: ${btn.dataset.field}`);
            const fieldName = btn.dataset.field;
            openValuesDialog(fieldName);
        });
    });
    
    console.log('Multiple values buttons initialized successfully');
}

// Make functions available globally
window.openValuesDialog = openValuesDialog;
window.closeValuesDialog = closeValuesDialog;
window.addMoreValueInput = addMoreValueInput;
window.saveMultipleValues = saveMultipleValues;
window.removeValueInput = removeValueInput;
window.updateDialogTotal = updateDialogTotal;

// Global fallback initialization
window.initializeMultipleValuesButtons = initializeMultipleValuesButtons;

// Auto-initialize when DOM is ready as a backup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing buttons...');
        setTimeout(initializeMultipleValuesButtons, 1000);
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing buttons...');
    setTimeout(initializeMultipleValuesButtons, 1000);
}

// Export for module usage
export { 
    initializeMultipleValuesButtons, 
    multipleValues,
    openValuesDialog,
    closeValuesDialog
};