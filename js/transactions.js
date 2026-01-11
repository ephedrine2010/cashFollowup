// Import necessary functions
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { currentUser, registerAuthStateHandler, showLoading, hideLoading, db } from './auth.js';
import { formatDate } from './utils.js';

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const descriptionInput = document.getElementById('description');

const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const balanceEl = document.getElementById('balance');

const transactionsList = document.getElementById('transactions-list');
const filterDateInput = document.getElementById('filter-date');
const filterTypeSelect = document.getElementById('filter-type');
const clearFilterBtn = document.getElementById('clear-filter-btn');

// State
let allTransactions = [];

// Set today's date as default
dateInput.valueAsDate = new Date();

// ============================================
// Transaction Functions
// ============================================

// Initialize transactions when user logs in
registerAuthStateHandler((user) => {
    if (user) {
        loadTransactions();
    } else {
        allTransactions = [];
    }
});

// Add transaction
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const transaction = {
        userId: currentUser.uid,
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value.trim(),
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value.trim(),
        createdAt: serverTimestamp()
    };

    showLoading();
    try {
        await addDoc(collection(db, 'transactions'), transaction);
        transactionForm.reset();
        dateInput.valueAsDate = new Date();
        alert('Transaction added successfully!');
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert(`Failed to add transaction: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// Load transactions
function loadTransactions() {
    if (!currentUser) return;

    const q = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        allTransactions = [];
        snapshot.forEach((docSnap) => {
            allTransactions.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        displayTransactions();
        updateSummary();
    }, (error) => {
        console.error('Error loading transactions:', error);
        alert(`Failed to load transactions: ${error.message}`);
    });
}

// Display transactions
function displayTransactions() {
    const filterDate = filterDateInput.value;
    const filterType = filterTypeSelect.value;

    let filteredTransactions = allTransactions.filter(transaction => {
        let matchesDate = true;
        let matchesType = true;

        if (filterDate) {
            matchesDate = transaction.date === filterDate;
        }

        if (filterType) {
            matchesType = transaction.type === filterType;
        }

        return matchesDate && matchesType;
    });

    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = '<p class="empty-state">No transactions found.</p>';
        return;
    }

    transactionsList.innerHTML = filteredTransactions.map(transaction => `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-info">
                <div class="transaction-header">
                    <span class="transaction-type ${transaction.type}">${transaction.type}</span>
                    <span class="transaction-category">${transaction.category}</span>
                    <span class="transaction-date">${formatDate(transaction.date)}</span>
                </div>
                ${transaction.description ? `<div class="transaction-description">${transaction.description}</div>` : ''}
            </div>
            <span class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
            </span>
            <div class="transaction-actions">
                <button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Delete transaction
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    showLoading();
    try {
        await deleteDoc(doc(db, 'transactions', transactionId));
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert(`Failed to delete transaction: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Update summary
function updateSummary() {
    let totalIncome = 0;
    let totalExpenses = 0;

    allTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            totalExpenses += transaction.amount;
        }
    });

    const balance = totalIncome - totalExpenses;

    totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
    balanceEl.textContent = `$${balance.toFixed(2)}`;
}

// Filter functions
filterDateInput.addEventListener('change', displayTransactions);
filterTypeSelect.addEventListener('change', displayTransactions);

clearFilterBtn.addEventListener('click', () => {
    filterDateInput.value = '';
    filterTypeSelect.value = '';
    displayTransactions();
});

// Make deleteTransaction available globally
window.deleteTransaction = deleteTransaction;

console.log('Transactions module initialized');
