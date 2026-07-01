// ---------------------------------------------------------------------------
// All data lives in the browser's localStorage as a JSON array of
// transactions: { id, date, description, category, type, amount }
// There is no server and no database — closing the tab keeps your data,
// but it only exists on this computer, in this browser.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "finance-tracker-transactions";

const CATEGORIES = [
  "Income", "Housing", "Groceries", "Transport", "Utilities",
  "Entertainment", "Health", "Shopping", "Dining Out", "Other",
];

// Keywords are matched case-insensitively against the transaction description.
// First category with a matching keyword wins.
const CATEGORY_KEYWORDS = {
  "Income": ["payroll", "paycheck", "salary", "direct dep"],
  "Housing": ["rent", "mortgage", "hoa"],
  "Groceries": ["grocery", "groceries", "whole foods", "trader joe", "safeway", "kroger", "supermarket"],
  "Transport": ["uber", "lyft", "gas station", "shell", "chevron", "exxon", "parking", "transit"],
  "Utilities": ["electric", "power co", "water bill", "internet", "comcast", "verizon", "at&t"],
  "Entertainment": ["netflix", "spotify", "hulu", "disney+", "cinema", "movie"],
  "Health": ["pharmacy", "cvs", "walgreens", "doctor", "clinic", "dental"],
  "Shopping": ["amazon", "target", "walmart", "mall"],
  "Dining Out": ["restaurant", "cafe", "coffee", "starbucks", "doordash", "uber eats", "grubhub", "pizza"],
};

function guessCategory(description) {
  const text = description.toLowerCase();
  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords && keywords.some(k => text.includes(k))) return category;
  }
  return "Other";
}

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

let transactions = loadTransactions();

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const balanceEl = document.getElementById("balance-amount");
const incomeEl = document.getElementById("income-amount");
const expenseEl = document.getElementById("expense-amount");
const form = document.getElementById("transaction-form");
const categorySelect = document.getElementById("input-category");
const filterCategorySelect = document.getElementById("filter-category");
const tableBody = document.getElementById("transactions-body");
const emptyState = document.getElementById("empty-state");

const csvInput = document.getElementById("csv-input");
const csvMapping = document.getElementById("csv-mapping");
const csvStatus = document.getElementById("csv-status");
const mapDate = document.getElementById("map-date");
const mapDescription = document.getElementById("map-description");
const mapAmount = document.getElementById("map-amount");
const csvConfirmBtn = document.getElementById("csv-confirm");

let parsedCsvRows = null; // rows waiting on column mapping before import

// ---------------------------------------------------------------------------
// Category dropdowns
// ---------------------------------------------------------------------------

function populateCategoryDropdowns() {
  categorySelect.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
  filterCategorySelect.innerHTML =
    `<option value="">All categories</option>` +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function money(n) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// ---------------------------------------------------------------------------
// Rendering: summary cards
// ---------------------------------------------------------------------------

function renderSummary() {
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  balanceEl.textContent = money(income - expense);
  incomeEl.textContent = money(income);
  expenseEl.textContent = money(expense);
}

// ---------------------------------------------------------------------------
// Rendering: transactions table
// ---------------------------------------------------------------------------

function renderTable() {
  const filter = filterCategorySelect.value;
  const rows = transactions
    .filter(t => !filter || t.category === filter)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  emptyState.classList.toggle("hidden", transactions.length > 0);

  tableBody.innerHTML = rows.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${escapeHtml(t.description)}</td>
      <td>${t.category}</td>
      <td class="amount-col ${t.type === "income" ? "row-income" : "row-expense"}">
        ${t.type === "income" ? "+" : "-"}${money(t.amount)}
      </td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${t.id}" title="Edit">✎</button>
        <button class="delete-btn" data-id="${t.id}" title="Delete">✕</button>
      </td>
    </tr>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

tableBody.addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    transactions = transactions.filter(t => t.id !== deleteBtn.dataset.id);
    saveTransactions(transactions);
    if (editingId === deleteBtn.dataset.id) exitEditMode();
    renderAll();
    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    enterEditMode(editBtn.dataset.id);
  }
});

filterCategorySelect.addEventListener("change", renderTable);

// ---------------------------------------------------------------------------
// Rendering: charts
// ---------------------------------------------------------------------------

let categoryChart = null;
let trendChart = null;

function renderCharts() {
  renderCategoryChart();
  renderTrendChart();
}

function renderCategoryChart() {
  const totals = {};
  transactions
    .filter(t => t.type === "expense")
    .forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("category-chart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: chartColors(labels.length) }],
    },
    options: { plugins: { legend: { position: "bottom", labels: { color: "#e8e9ec" } } } },
  });
}

function renderTrendChart() {
  const months = {}; // "2026-07" -> { income, expense }
  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!months[month]) months[month] = { income: 0, expense: 0 };
    months[month][t.type] += t.amount;
  });

  const labels = Object.keys(months).sort();
  const income = labels.map(m => months[m].income);
  const expense = labels.map(m => months[m].expense);

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById("trend-chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Income", data: income, backgroundColor: "#3ecf8e" },
        { label: "Expenses", data: expense, backgroundColor: "#f0616a" },
      ],
    },
    options: {
      scales: {
        x: { ticks: { color: "#9aa0ac" }, grid: { color: "#2a2e37" } },
        y: { ticks: { color: "#9aa0ac" }, grid: { color: "#2a2e37" } },
      },
      plugins: { legend: { labels: { color: "#e8e9ec" } } },
    },
  });
}

function chartColors(n) {
  const palette = ["#5b8def", "#3ecf8e", "#f0616a", "#f2b84b", "#a78bfa", "#38bdf8", "#fb923c", "#e879f9", "#94a3b8", "#4ade80"];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

// ---------------------------------------------------------------------------
// Render everything (call after any data change)
// ---------------------------------------------------------------------------

function renderAll() {
  renderSummary();
  renderTable();
  renderCharts();
}

// ---------------------------------------------------------------------------
// Manual add/edit transaction form
// ---------------------------------------------------------------------------

const formHeading = document.getElementById("form-heading");
const submitBtn = document.getElementById("form-submit-btn");
const cancelBtn = document.getElementById("form-cancel-btn");
const dateInput = document.getElementById("input-date");
const descriptionInput = document.getElementById("input-description");
const amountInput = document.getElementById("input-amount");
const typeInput = document.getElementById("input-type");

let editingId = null; // id of the transaction currently being edited, or null

function enterEditMode(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;

  editingId = id;
  dateInput.value = t.date;
  descriptionInput.value = t.description;
  amountInput.value = t.amount;
  typeInput.value = t.type;
  categorySelect.value = t.category;

  formHeading.textContent = "Edit Transaction";
  submitBtn.textContent = "Save Changes";
  cancelBtn.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  formHeading.textContent = "Add a Transaction";
  submitBtn.textContent = "Add Transaction";
  cancelBtn.classList.add("hidden");
  form.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
}

cancelBtn.addEventListener("click", exitEditMode);

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = dateInput.value;
  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;
  const category = categorySelect.value;

  if (!date || !description || !amount) return;

  if (editingId) {
    const t = transactions.find(t => t.id === editingId);
    Object.assign(t, { date, description, category, type, amount });
    saveTransactions(transactions);
    renderAll();
    exitEditMode();
    return;
  }

  transactions.push({
    id: crypto.randomUUID(),
    date, description, category, type, amount,
  });

  saveTransactions(transactions);
  renderAll();
  form.reset();
  dateInput.value = date; // keep the date for quick multi-entry
});

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

csvInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      parsedCsvRows = results.data;
      const columns = results.meta.fields || [];
      if (columns.length === 0 || parsedCsvRows.length === 0) {
        csvStatus.textContent = "Couldn't find any columns in that file.";
        return;
      }
      populateColumnSelect(mapDate, columns, guessColumn(columns, ["date"]));
      populateColumnSelect(mapDescription, columns, guessColumn(columns, ["description", "name", "memo", "payee"]));
      populateColumnSelect(mapAmount, columns, guessColumn(columns, ["amount", "value"]));
      csvMapping.classList.remove("hidden");
      csvStatus.textContent = `Found ${parsedCsvRows.length} rows. Check the column mapping below, then import.`;
    },
    error: (err) => {
      csvStatus.textContent = `Couldn't read that file: ${err.message}`;
    },
  });
});

function populateColumnSelect(select, columns, guessed) {
  select.innerHTML = columns.map(c => `<option value="${c}">${c}</option>`).join("");
  if (guessed) select.value = guessed;
}

function guessColumn(columns, keywords) {
  return columns.find(c => keywords.some(k => c.toLowerCase().includes(k)));
}

csvConfirmBtn.addEventListener("click", () => {
  if (!parsedCsvRows) return;

  const dateCol = mapDate.value;
  const descCol = mapDescription.value;
  const amountCol = mapAmount.value;

  let imported = 0;
  let autoCategorized = 0;
  parsedCsvRows.forEach(row => {
    const rawAmount = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, ""));
    const date = normalizeDate(row[dateCol]);
    if (!date || isNaN(rawAmount) || rawAmount === 0) return;

    const description = row[descCol] || "(no description)";
    const category = guessCategory(description);
    if (category !== "Other") autoCategorized++;

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      category,
      type: rawAmount < 0 ? "expense" : "income",
      amount: Math.abs(rawAmount),
    });
    imported++;
  });

  saveTransactions(transactions);
  renderAll();

  csvStatus.textContent = `Imported ${imported} transaction${imported === 1 ? "" : "s"}, auto-categorized ${autoCategorized} of them. Click the ✎ on any row to fix a category by hand.`;
  csvMapping.classList.add("hidden");
  parsedCsvRows = null;
  csvInput.value = "";
});

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

populateCategoryDropdowns();
document.getElementById("input-date").value = new Date().toISOString().slice(0, 10);
renderAll();
