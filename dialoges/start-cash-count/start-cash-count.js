/**
 * Start Cash Count Dialog Logic
 */

export function initStartCashCount() {
    const dialog = document.getElementById('start-cash-count-dialog');
    const closeBtn = document.getElementById('close-start-cash-btn');
    const cancelBtn = document.getElementById('cancel-start-cash-btn');
    const addDeliveryBtn = document.getElementById('scc-add-delivery-btn');
    const deliveryContainer = document.getElementById('scc-delivery-container');
    
    // Inputs
    const totalCashInput = document.getElementById('scc-total-cash');
    const startCashInput = document.getElementById('scc-start-cash');
    const totalExpectedInput = document.getElementById('scc-total-expected');
    const cashierCountInput = document.getElementById('scc-cashier-count');
    const safeCountInput = document.getElementById('scc-safe-count');
    const groupSummaryInput = document.getElementById('scc-group-summary');
    const deficitInput = document.getElementById('scc-deficit');

    // Main Page Reference
    const mainTotalCashInput = document.getElementById('sales-total-cash');

    // Initialize 6 delivery order inputs
    for (let i = 0; i < 6; i++) {
        addDeliveryInput();
    }

    // Event Listeners
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    addDeliveryBtn.addEventListener('click', () => addDeliveryInput());

    [startCashInput, cashierCountInput, safeCountInput].forEach(input => {
        input.addEventListener('input', calculateTotals);
    });

    function addDeliveryInput() {
        const row = document.createElement('div');
        row.className = 'delivery-input-row';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.min = '0';
        input.value = '0';
        input.placeholder = 'Order Value';
        input.className = 'delivery-order-input';
        
        input.addEventListener('input', calculateTotals);
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-delivery-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => {
            row.remove();
            calculateTotals();
        });
        
        row.appendChild(input);
        row.appendChild(removeBtn);
        deliveryContainer.appendChild(row);
    }

    function calculateTotals() {
        const totalCash = parseFloat(totalCashInput.value) || 0;
        const startCash = parseFloat(startCashInput.value) || 0;
        const cashierCount = parseFloat(cashierCountInput.value) || 0;
        const safeCount = parseFloat(safeCountInput.value) || 0;

        // Total Expected
        const totalExpected = totalCash + startCash;
        totalExpectedInput.value = totalExpected.toFixed(2);

        // Group Summary (Delivery Orders)
        let groupSummary = 0;
        const deliveryInputs = document.querySelectorAll('.delivery-order-input');
        deliveryInputs.forEach(input => {
            groupSummary += parseFloat(input.value) || 0;
        });
        groupSummaryInput.value = groupSummary.toFixed(2);

        // Deficit = start cash - (cashier count + safe count + group summary)
        // User's formula: start cash - (cashier count + safe count + group summary)
        const deficit = startCash - (cashierCount + safeCount + groupSummary);
        deficitInput.value = deficit.toFixed(2);

        // Styling for deficit
        deficitInput.classList.remove('deficit-negative', 'deficit-positive');
        if (deficit < 0) {
            deficitInput.classList.add('deficit-negative');
        } else if (deficit > 0) {
            deficitInput.classList.add('deficit-positive');
        }
    }

    function openDialog() {
        // Sync total cash from main page
        totalCashInput.value = mainTotalCashInput.value || "0.00";
        calculateTotals();
        dialog.classList.remove('hidden');
    }

    function closeDialog() {
        dialog.classList.add('hidden');
    }

    // Expose openDialog to the window or return it
    window.openStartCashCount = openDialog;
}
