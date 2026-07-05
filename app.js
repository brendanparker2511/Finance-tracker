// ---------------------------------------------------------------------------
// All data lives in the browser's localStorage as a JSON array of
// transactions: { id, date, description, category, type, amount }
// There is no server and no database — closing the tab keeps your data,
// but it only exists on this computer, in this browser.
// ---------------------------------------------------------------------------

// Small stroke-style SVG icons, used instead of emoji for a consistent,
// professional look regardless of OS/font emoji rendering.
const ICONS = {
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

const STORAGE_KEY = "finance-tracker-transactions";
const BUDGET_KEY = "finance-tracker-budgets";
const INVESTMENTS_KEY = "finance-tracker-investments";
const BILLS_KEY = "finance-tracker-bills";
const SAVINGS_KEY = "finance-tracker-savings";

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

function loadBudgets() {
  const raw = localStorage.getItem(BUDGET_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveBudgets(budgets) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

function loadInvestments() {
  const raw = localStorage.getItem(INVESTMENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveInvestments(investments) {
  localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(investments));
}

function loadBills() {
  const raw = localStorage.getItem(BILLS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveBills(bills) {
  localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
}

function loadSavings() {
  const raw = localStorage.getItem(SAVINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSavings(savings) {
  localStorage.setItem(SAVINGS_KEY, JSON.stringify(savings));
}

let transactions = loadTransactions();
let budgets = loadBudgets(); // { categoryName: monthlyLimit }
let investments = loadInvestments(); // [{ id, date, accountName, balance }]
let bills = loadBills(); // [{ id, name, category, amount, dueDay }]
let savings = loadSavings(); // [{ id, date, balance, interest }]

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
const budgetsBody = document.getElementById("budgets-body");
const budgetMonthLabel = document.getElementById("budget-month-label");
const trajectoryHint = document.getElementById("trajectory-hint");

const investmentForm = document.getElementById("investment-form");
const investmentDateInput = document.getElementById("investment-date");
const investmentAccountInput = document.getElementById("investment-account");
const investmentBalanceInput = document.getElementById("investment-balance");
const investmentsBody = document.getElementById("investments-body");
const investmentsEmpty = document.getElementById("investments-empty");
const networthCashEl = document.getElementById("networth-cash");
const networthInvestmentsEl = document.getElementById("networth-investments");
const networthTotalEl = document.getElementById("networth-total");
const networthSavingsEl = document.getElementById("networth-savings");

const savingsForm = document.getElementById("savings-form");
const savingsDateInput = document.getElementById("savings-date");
const savingsBalanceInput = document.getElementById("savings-balance");
const savingsInterestInput = document.getElementById("savings-interest");
const savingsBody = document.getElementById("savings-body");
const savingsEmpty = document.getElementById("savings-empty");
const savingsInterestTotal = document.getElementById("savings-interest-total");

const billForm = document.getElementById("bill-form");
const billNameInput = document.getElementById("bill-name");
const billCategorySelect = document.getElementById("bill-category");
const billAmountInput = document.getElementById("bill-amount");
const billDayInput = document.getElementById("bill-day");
const billsBody = document.getElementById("bills-body");
const billsEmpty = document.getElementById("bills-empty");
const billsMonthlyTotalEl = document.getElementById("bills-monthly-total");
const billsYearlyTotalEl = document.getElementById("bills-yearly-total");
const billsUpcomingTotalEl = document.getElementById("bills-upcoming-total");
const billsUpcomingListEl = document.getElementById("bills-upcoming-list");
const billsUpcomingEmptyEl = document.getElementById("bills-upcoming-empty");
const billsCalendarEl = document.getElementById("bills-calendar");
const billsCalendarLabelEl = document.getElementById("bills-calendar-label");
const billsCalPrevBtn = document.getElementById("bills-cal-prev");
const billsCalNextBtn = document.getElementById("bills-cal-next");

const dashboardNetworthEl = document.getElementById("dashboard-networth");
const dashboardUpcomingBillsEl = document.getElementById("dashboard-upcoming-bills");
const dashboardBillsEmptyEl = document.getElementById("dashboard-bills-empty");
const dashboardRecentTransactionsEl = document.getElementById("dashboard-recent-transactions");
const dashboardTransactionsEmptyEl = document.getElementById("dashboard-transactions-empty");

const themePicker = document.getElementById("theme-picker");
const accentPicker = document.getElementById("accent-picker");
const exportDataBtn = document.getElementById("export-data-btn");
const importDataInput = document.getElementById("import-data-input");
const importStatus = document.getElementById("import-status");
const setCashInput = document.getElementById("set-cash-input");
const setCashBtn = document.getElementById("set-cash-btn");
const setInvestAccount = document.getElementById("set-invest-account");
const setInvestBalance = document.getElementById("set-invest-balance");
const setInvestBtn = document.getElementById("set-invest-btn");
const setSavingsInput = document.getElementById("set-savings-input");
const setSavingsBtn = document.getElementById("set-savings-btn");
const setBalancesStatus = document.getElementById("set-balances-status");
const eraseAllBtn = document.getElementById("erase-all-btn");

// ---------------------------------------------------------------------------
// Sidebar page navigation
// ---------------------------------------------------------------------------

document.getElementById("sidebar-nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  showPage(btn.dataset.page);
});

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === `page-${pageName}`));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === pageName));
  initScrollReveal();
}

// Fades/slides cards in as they scroll into view — mainly noticeable on
// longer pages (Transactions, Bills) where content extends past the fold.
const scrollRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      scrollRevealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

function initScrollReveal() {
  document.querySelectorAll(".page.active .card").forEach(card => {
    if (card.classList.contains("reveal") || card.classList.contains("visible")) return;
    card.classList.add("reveal");
    scrollRevealObserver.observe(card);
  });
}

const csvInput = document.getElementById("csv-input");
const csvMapping = document.getElementById("csv-mapping");
const csvStatus = document.getElementById("csv-status");
const mapDate = document.getElementById("map-date");
const mapDescription = document.getElementById("map-description");
const mapAmount = document.getElementById("map-amount");
const csvConfirmBtn = document.getElementById("csv-confirm");

let parsedCsvRows = null; // rows waiting on column mapping before import

const pdfInput = document.getElementById("pdf-input");
const pdfStatus = document.getElementById("pdf-status");
const pdfPreview = document.getElementById("pdf-preview");
const pdfPreviewBody = document.getElementById("pdf-preview-body");
const pdfConfirmBtn = document.getElementById("pdf-confirm-btn");
const pdfPasswordPrompt = document.getElementById("pdf-password-prompt");
const pdfPasswordInput = document.getElementById("pdf-password-input");
const pdfPasswordSubmit = document.getElementById("pdf-password-submit");

// ---------------------------------------------------------------------------
// Theme + accent color
// ---------------------------------------------------------------------------

const THEME_KEY = "finance-tracker-theme";
const ACCENT_KEY = "finance-tracker-accent";

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll(".theme-option").forEach(el => {
    el.classList.toggle("active", el.dataset.theme === theme);
  });
}

function applyAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
  localStorage.setItem(ACCENT_KEY, color);
  document.querySelectorAll(".accent-swatch").forEach(el => {
    el.classList.toggle("active", el.dataset.color === color);
  });
}

themePicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".theme-option");
  if (!btn) return;
  applyTheme(btn.dataset.theme);
  renderAll(); // charts read colors from CSS variables, so they need a fresh render
});

accentPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".accent-swatch");
  if (!btn) return;
  applyAccent(btn.dataset.color);
  renderAll();
});

// ---------------------------------------------------------------------------
// Backup & restore (export/import all data as a JSON file)
// ---------------------------------------------------------------------------

const DATA_KEYS = [STORAGE_KEY, BUDGET_KEY, INVESTMENTS_KEY, BILLS_KEY, SAVINGS_KEY];

exportDataBtn.addEventListener("click", () => {
  const backup = { exportedAt: new Date().toISOString() };
  DATA_KEYS.forEach(key => { backup[key] = localStorage.getItem(key); });

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

importDataInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      DATA_KEYS.forEach(key => {
        if (backup[key] != null) localStorage.setItem(key, backup[key]);
      });

      transactions = loadTransactions();
      budgets = loadBudgets();
      investments = loadInvestments();
      bills = loadBills();
      savings = loadSavings();
      renderAll();

      importStatus.textContent = `Backup restored (exported ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : "unknown date"}).`;
    } catch (err) {
      importStatus.textContent = "Couldn't read that file — make sure it's a backup exported from this app.";
    }
  };
  reader.readAsText(file);
  importDataInput.value = "";
});

// ---------------------------------------------------------------------------
// Set current balances (Settings)
//
// Rather than editing the calculated balance directly, we record a one-time
// adjustment transaction for the difference — that keeps every number in the
// app explainable by the transaction list.
// ---------------------------------------------------------------------------

setCashBtn.addEventListener("click", () => {
  const target = parseFloat(setCashInput.value);
  if (isNaN(target)) {
    setBalancesStatus.textContent = "Enter your actual bank balance first.";
    return;
  }

  const current = cashBalance();
  const diff = Math.round((target - current) * 100) / 100;

  if (diff === 0) {
    setBalancesStatus.textContent = "Cash balance already matches — nothing to adjust.";
    return;
  }

  transactions.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    description: "Balance adjustment",
    category: "Other",
    type: diff > 0 ? "income" : "expense",
    amount: Math.abs(diff),
  });

  saveTransactions(transactions);
  renderAll();
  setCashInput.value = "";
  setBalancesStatus.textContent = `Cash balance set to ${money(target)} (recorded a ${money(Math.abs(diff))} adjustment).`;
});

setInvestBtn.addEventListener("click", () => {
  const accountName = setInvestAccount.value.trim();
  const balance = parseFloat(setInvestBalance.value);

  if (!accountName || isNaN(balance)) {
    setBalancesStatus.textContent = "Enter both an account name and its current value.";
    return;
  }

  investments.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    accountName,
    balance,
  });

  saveInvestments(investments);
  renderAll();
  setInvestAccount.value = "";
  setInvestBalance.value = "";
  setBalancesStatus.textContent = `${accountName} set to ${money(balance)}.`;
});

setSavingsBtn.addEventListener("click", () => {
  const balance = parseFloat(setSavingsInput.value);

  if (isNaN(balance)) {
    setBalancesStatus.textContent = "Enter your current savings balance first.";
    return;
  }

  savings.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    balance,
    interest: 0,
  });

  saveSavings(savings);
  renderAll();
  setSavingsInput.value = "";
  setBalancesStatus.textContent = `Savings set to ${money(balance)}.`;
});

// ---------------------------------------------------------------------------
// Erase all data (Settings danger zone)
// ---------------------------------------------------------------------------

eraseAllBtn.addEventListener("click", () => {
  const confirmed = confirm(
    "Erase ALL transactions, budgets, bills, and investment snapshots from this browser?\n\nThis cannot be undone. Export a backup first if you might want this data back."
  );
  if (!confirmed) return;

  DATA_KEYS.forEach(key => localStorage.removeItem(key));
  transactions = [];
  budgets = {};
  investments = [];
  bills = [];
  savings = [];
  renderAll();
  setBalancesStatus.textContent = "";
  importStatus.textContent = "All data erased.";
});

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
  return n.toLocaleString(undefined, { style: "currency", currency: "AED" });
}

// ---------------------------------------------------------------------------
// Rendering: summary cards
// ---------------------------------------------------------------------------

function cashBalance() {
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return income - expense;
}

function renderSummary() {
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  balanceEl.textContent = money(income - expense);
  incomeEl.textContent = money(income);
  expenseEl.textContent = money(expense);
}

// ---------------------------------------------------------------------------
// Rendering: monthly budgets
// ---------------------------------------------------------------------------

function currentMonthSpending() {
  const month = new Date().toISOString().slice(0, 7);
  const totals = {};
  transactions
    .filter(t => t.type === "expense" && t.date.slice(0, 7) === month)
    .forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  return totals;
}

function renderBudgets() {
  budgetMonthLabel.textContent = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const spending = currentMonthSpending();
  const budgetCategories = CATEGORIES.filter(c => c !== "Income");

  budgetsBody.innerHTML = budgetCategories.map(category => {
    const budget = budgets[category] || 0;
    const spent = spending[category] || 0;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const over = budget > 0 && spent > budget;

    return `
      <tr>
        <td>${category}</td>
        <td>
          <input type="number" class="budget-input" data-category="${category}"
                 min="0" step="1" placeholder="No limit" value="${budget || ""}" />
        </td>
        <td class="amount-col">${money(spent)}</td>
        <td>
          <div class="budget-bar" title="${budget > 0 ? `${money(spent)} of ${money(budget)}` : "No budget set"}">
            <div class="budget-bar-fill ${over ? "over" : ""}" style="width: ${pct}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

budgetsBody.addEventListener("change", (e) => {
  const input = e.target.closest(".budget-input");
  if (!input) return;

  const category = input.dataset.category;
  const value = parseFloat(input.value);

  if (!value || value <= 0) {
    delete budgets[category];
  } else {
    budgets[category] = value;
  }

  saveBudgets(budgets);
  renderBudgets();
});

// ---------------------------------------------------------------------------
// Rendering: investments / net worth
// ---------------------------------------------------------------------------

// The latest logged balance for each account, as of its most recent snapshot.
function latestBalancePerAccount() {
  const latest = {}; // accountName -> { date, balance }
  investments.forEach(s => {
    const current = latest[s.accountName];
    if (!current || s.date >= current.date) latest[s.accountName] = { date: s.date, balance: s.balance };
  });
  return latest;
}

function totalInvestments() {
  const latest = latestBalancePerAccount();
  return Object.values(latest).reduce((sum, a) => sum + a.balance, 0);
}

// The current savings balance is whatever the most recent entry says.
function totalSavings() {
  if (savings.length === 0) return 0;
  const latest = savings.reduce((a, b) => (b.date >= a.date ? b : a));
  return latest.balance;
}

function totalInterestEarned() {
  return savings.reduce((sum, s) => sum + (s.interest || 0), 0);
}

function renderNetWorthSummary() {
  const cash = cashBalance();
  const savingsTotal = totalSavings();
  const investmentsTotal = totalInvestments();
  networthCashEl.textContent = money(cash);
  networthSavingsEl.textContent = money(savingsTotal);
  networthInvestmentsEl.textContent = money(investmentsTotal);
  networthTotalEl.textContent = money(cash + savingsTotal + investmentsTotal);
}

// ---------------------------------------------------------------------------
// Rendering: savings
// ---------------------------------------------------------------------------

function renderSavings() {
  savingsEmpty.classList.toggle("hidden", savings.length > 0);

  const interestTotal = totalInterestEarned();
  savingsInterestTotal.textContent = interestTotal > 0
    ? `Interest earned to date: ${money(interestTotal)}.`
    : "";

  const rows = savings.slice().sort((a, b) => b.date.localeCompare(a.date));
  savingsBody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.date}</td>
      <td class="amount-col">${money(s.balance)}</td>
      <td class="amount-col">${s.interest ? money(s.interest) : "—"}</td>
      <td class="row-actions">
        <button class="icon-btn delete-savings-btn" data-id="${s.id}" title="Delete">${ICONS.trash}</button>
      </td>
    </tr>
  `).join("");
}

savingsBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-savings-btn");
  if (!btn) return;
  savings = savings.filter(s => s.id !== btn.dataset.id);
  saveSavings(savings);
  renderAll();
});

savingsForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = savingsDateInput.value;
  const balance = parseFloat(savingsBalanceInput.value);
  const interest = parseFloat(savingsInterestInput.value) || 0;

  if (!date || isNaN(balance)) return;

  savings.push({ id: crypto.randomUUID(), date, balance, interest });
  saveSavings(savings);
  renderAll();

  savingsForm.reset();
  savingsDateInput.value = date;
});

function renderInvestmentsTable() {
  const rows = investments.slice().sort((a, b) => b.date.localeCompare(a.date));
  investmentsEmpty.classList.toggle("hidden", investments.length > 0);

  investmentsBody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.date}</td>
      <td>${escapeHtml(s.accountName)}</td>
      <td class="amount-col">${money(s.balance)}</td>
      <td class="row-actions">
        <button class="icon-btn delete-investment-btn" data-id="${s.id}" title="Delete">${ICONS.trash}</button>
      </td>
    </tr>
  `).join("");
}

investmentsBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-investment-btn");
  if (!btn) return;
  investments = investments.filter(s => s.id !== btn.dataset.id);
  saveInvestments(investments);
  renderInvestments();
});

investmentForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = investmentDateInput.value;
  const accountName = investmentAccountInput.value.trim();
  const balance = parseFloat(investmentBalanceInput.value);

  if (!date || !accountName || isNaN(balance)) return;

  investments.push({ id: crypto.randomUUID(), date, accountName, balance });
  saveInvestments(investments);
  renderInvestments();

  investmentForm.reset();
  investmentDateInput.value = date;
});

let investmentChart = null;

function renderInvestmentChart() {
  const dates = [...new Set(investments.map(s => s.date))].sort();
  const accounts = [...new Set(investments.map(s => s.accountName))];

  if (investmentChart) investmentChart.destroy();

  if (dates.length === 0) {
    investmentChart = null;
    return;
  }

  // For each date, sum each account's latest known balance as of that date
  // (accounts don't necessarily get a snapshot on every date).
  const totals = dates.map(date => {
    let total = 0;
    accounts.forEach(account => {
      const upToDate = investments
        .filter(s => s.accountName === account && s.date <= date)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (upToDate.length) total += upToDate[upToDate.length - 1].balance;
    });
    return total;
  });

  investmentChart = new Chart(document.getElementById("investment-chart"), {
    type: "line",
    data: {
      labels: dates,
      datasets: [{ label: "Total investments", data: totals, borderColor: cssVar("--accent"), backgroundColor: "transparent", tension: 0.2 }],
    },
    options: {
      scales: {
        x: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
        y: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
      },
      plugins: { legend: { labels: { color: cssVar("--text") } } },
    },
  });
}

function renderInvestments() {
  renderNetWorthSummary();
  renderInvestmentsTable();
  renderInvestmentChart();
}

// ---------------------------------------------------------------------------
// Rendering: bills & subscriptions
// ---------------------------------------------------------------------------

function populateBillCategoryDropdown() {
  billCategorySelect.innerHTML = CATEGORIES.filter(c => c !== "Income").map(c => `<option value="${c}">${c}</option>`).join("");
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Finds the next date (on or after `from`) that a bill with this due-day recurs on,
// clamping to the last day of shorter months (e.g. a "31st" bill lands on Feb 28/29).
function nextBillDueDate(dueDay, from = new Date()) {
  const year = from.getFullYear();
  const month = from.getMonth();
  if (dueDay >= from.getDate()) {
    return new Date(year, month, Math.min(dueDay, daysInMonth(year, month)));
  }
  return new Date(year, month + 1, Math.min(dueDay, daysInMonth(year, month + 1)));
}

function billsMonthlyTotal() {
  return bills.reduce((sum, b) => sum + b.amount, 0);
}

function renderBillsSummary() {
  const monthly = billsMonthlyTotal();
  billsMonthlyTotalEl.textContent = money(monthly);
  billsYearlyTotalEl.textContent = money(monthly * 12);

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const upcomingTotal = bills
    .filter(b => nextBillDueDate(b.dueDay, now) <= in30Days)
    .reduce((sum, b) => sum + b.amount, 0);
  billsUpcomingTotalEl.textContent = money(upcomingTotal);
}

function renderBillsTable() {
  billsEmpty.classList.toggle("hidden", bills.length > 0);
  const rows = bills.slice().sort((a, b) => a.dueDay - b.dueDay);

  billsBody.innerHTML = rows.map(b => `
    <tr>
      <td>${escapeHtml(b.name)}</td>
      <td>${b.category}</td>
      <td>${b.dueDay}</td>
      <td class="amount-col">${money(b.amount)}</td>
      <td class="row-actions"><button class="icon-btn delete-bill-btn" data-id="${b.id}" title="Delete">${ICONS.trash}</button></td>
    </tr>
  `).join("");
}

billsBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-bill-btn");
  if (!btn) return;
  bills = bills.filter(b => b.id !== btn.dataset.id);
  saveBills(bills);
  renderBills();
});

billForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = billNameInput.value.trim();
  const category = billCategorySelect.value;
  const amount = parseFloat(billAmountInput.value);
  const dueDay = parseInt(billDayInput.value, 10);

  if (!name || !amount || !dueDay || dueDay < 1 || dueDay > 31) return;

  bills.push({ id: crypto.randomUUID(), name, category, amount, dueDay });
  saveBills(bills);
  renderBills();
  billForm.reset();
});

// Shared by the Bills page and the Dashboard widget, just with different list sizes.
function renderUpcomingBillsList(targetEl, emptyEl, limit) {
  const now = new Date();
  const upcoming = bills
    .map(b => ({ ...b, next: nextBillDueDate(b.dueDay, now) }))
    .sort((a, b) => a.next - b.next)
    .slice(0, limit);

  emptyEl.classList.toggle("hidden", bills.length > 0);
  targetEl.innerHTML = upcoming.map(b => `
    <li>
      <div>
        <div>${escapeHtml(b.name)}</div>
        <div class="mini-sub">${b.next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
      </div>
      <span>${money(b.amount)}</span>
    </li>
  `).join("");
}

let billsCalendarDate = new Date(); // which month the calendar is currently showing

function renderBillsCalendar() {
  const year = billsCalendarDate.getFullYear();
  const month = billsCalendarDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();

  billsCalendarLabelEl.textContent = billsCalendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const billsByDay = {};
  bills.forEach(b => {
    const day = Math.min(b.dueDay, totalDays);
    if (!billsByDay[day]) billsByDay[day] = [];
    billsByDay[day].push(b);
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map(d => `<div class="calendar-day-label">${d}</div>`).join("");

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) cells += `<div class="calendar-cell empty"></div>`;
  for (let day = 1; day <= totalDays; day++) {
    const dayBills = billsByDay[day] || [];
    cells += `
      <div class="calendar-cell">
        <div class="day-num">${day}</div>
        ${dayBills.map(b => `<div class="bill-chip" title="${escapeHtml(b.name)} – ${money(b.amount)}">${escapeHtml(b.name)}</div>`).join("")}
      </div>
    `;
  }

  billsCalendarEl.innerHTML = dayLabels + cells;
}

billsCalPrevBtn.addEventListener("click", () => {
  billsCalendarDate = new Date(billsCalendarDate.getFullYear(), billsCalendarDate.getMonth() - 1, 1);
  renderBillsCalendar();
});

billsCalNextBtn.addEventListener("click", () => {
  billsCalendarDate = new Date(billsCalendarDate.getFullYear(), billsCalendarDate.getMonth() + 1, 1);
  renderBillsCalendar();
});

function renderBills() {
  renderBillsSummary();
  renderBillsTable();
  renderUpcomingBillsList(billsUpcomingListEl, billsUpcomingEmptyEl, 8);
  renderBillsCalendar();
}

// ---------------------------------------------------------------------------
// Rendering: dashboard
// ---------------------------------------------------------------------------

function renderDashboard() {
  dashboardNetworthEl.textContent = money(cashBalance() + totalSavings() + totalInvestments());
  renderUpcomingBillsList(dashboardUpcomingBillsEl, dashboardBillsEmptyEl, 5);
  renderDashboardRecentTransactions();
}

function renderDashboardRecentTransactions() {
  const recent = transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  dashboardTransactionsEmptyEl.classList.toggle("hidden", transactions.length > 0);

  dashboardRecentTransactionsEl.innerHTML = recent.map(t => `
    <li>
      <div>
        <div>${escapeHtml(t.description)}</div>
        <div class="mini-sub">${t.date} · ${t.category}</div>
      </div>
      <span class="${t.type === "income" ? "row-income" : "row-expense"}">${t.type === "income" ? "+" : "-"}${money(t.amount)}</span>
    </li>
  `).join("");
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
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">${ICONS.edit}</button>
        <button class="icon-btn delete-btn" data-id="${t.id}" title="Delete">${ICONS.trash}</button>
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
let trajectoryChart = null;

function renderCharts() {
  renderCategoryChart();
  renderTrendChart();
  renderTrajectoryChart();
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
    options: { plugins: { legend: { position: "bottom", labels: { color: cssVar("--text") } } } },
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
        { label: "Income", data: income, backgroundColor: cssVar("--income") },
        { label: "Expenses", data: expense, backgroundColor: cssVar("--expense") },
      ],
    },
    options: {
      scales: {
        x: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
        y: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
      },
      plugins: { legend: { labels: { color: cssVar("--text") } } },
    },
  });
}

// Projects future balance by assuming the average net (income - expense) from
// recent months continues going forward.
function renderTrajectoryChart() {
  const monthlyNet = {}; // "2026-07" -> income minus expenses that month
  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    monthlyNet[month] = (monthlyNet[month] || 0) + (t.type === "income" ? t.amount : -t.amount);
  });

  const months = Object.keys(monthlyNet).sort();

  if (trajectoryChart) trajectoryChart.destroy();

  if (months.length === 0) {
    trajectoryHint.textContent = "Add some transactions to see your projected savings trajectory.";
    trajectoryChart = null;
    return;
  }

  let running = 0;
  const actualBalances = months.map(m => (running += monthlyNet[m]));

  const recentMonths = months.slice(-6);
  const avgNet = recentMonths.reduce((sum, m) => sum + monthlyNet[m], 0) / recentMonths.length;

  const PROJECTION_MONTHS = 6;
  const futureMonths = [];
  let [year, month] = months[months.length - 1].split("-").map(Number);
  for (let i = 0; i < PROJECTION_MONTHS; i++) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    futureMonths.push(`${year}-${String(month).padStart(2, "0")}`);
  }

  let projected = actualBalances[actualBalances.length - 1];
  const projectedBalances = futureMonths.map(() => (projected += avgNet));

  const labels = [...months, ...futureMonths];
  const actualData = [...actualBalances, ...Array(PROJECTION_MONTHS).fill(null)];
  const projectedData = [
    ...Array(months.length - 1).fill(null),
    actualBalances[actualBalances.length - 1],
    ...projectedBalances,
  ];

  const finalProjected = projectedBalances[projectedBalances.length - 1];
  const lastLabel = formatMonthLabel(futureMonths[futureMonths.length - 1]);
  trajectoryHint.textContent = avgNet >= 0
    ? `Averaging ${money(avgNet)}/month saved over the last ${recentMonths.length} month${recentMonths.length === 1 ? "" : "s"} — projected to reach ${money(finalProjected)} by ${lastLabel}.`
    : `Averaging ${money(avgNet)}/month over the last ${recentMonths.length} month${recentMonths.length === 1 ? "" : "s"} (spending more than earning) — projected ${money(finalProjected)} by ${lastLabel}.`;

  trajectoryChart = new Chart(document.getElementById("trajectory-chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Actual balance", data: actualData, borderColor: cssVar("--accent"), backgroundColor: "transparent", tension: 0.2 },
        { label: "Projected", data: projectedData, borderColor: cssVar("--muted"), borderDash: [6, 4], backgroundColor: "transparent", tension: 0.2 },
      ],
    },
    options: {
      scales: {
        x: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
        y: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--border") } },
      },
      plugins: { legend: { labels: { color: cssVar("--text") } } },
    },
  });
}

function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
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
  renderBudgets();
  renderInvestments();
  renderSavings();
  renderBills();
  renderDashboard();
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

  csvStatus.textContent = `Imported ${imported} transaction${imported === 1 ? "" : "s"}, auto-categorized ${autoCategorized} of them. Click the edit icon on any row to fix a category by hand.`;
  csvMapping.classList.add("hidden");
  parsedCsvRows = null;
  csvInput.value = "";
});

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  // Build the date string from local components, not .toISOString() (which
  // converts to UTC and can silently shift the date by a day depending on
  // the browser's timezone).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// PDF statement import
//
// Bank statement PDFs don't have a standard layout, so this is a best-effort
// text extraction: pull lines of text out of the PDF, then look for lines
// that contain both a date and a dollar-style amount. Everything lands in an
// editable preview table — nothing is imported until the user confirms.
// ---------------------------------------------------------------------------

const PDF_DATE_PATTERNS = [
  /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/i,
];

const PDF_AMOUNT_PATTERN = /\(?-?\d{1,3}(?:,\d{3})*\.\d{2}\)?\s*(CR|DR|Cr|Dr)?/g;

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// JS's Date parser assumes MM/DD/YYYY for slash-separated dates, but most
// non-US bank statements use DD/MM/YYYY. When a number is unambiguous
// (greater than 12), trust it; otherwise assume day-first.
function parsePdfDate(text) {
  const slashMatch = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!slashMatch) return normalizeDate(text);

  let [, first, second, yearStr] = slashMatch;
  first = parseInt(first, 10);
  second = parseInt(second, 10);
  const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);

  let day = first, month = second;
  if (first <= 12 && second > 12) { day = second; month = first; } // only fits as MM/DD

  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function extractPdfLines(pdf) {
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Text items come with x/y positions, not clean lines — group items
    // that share a y-coordinate (rounded, since it's rarely pixel-exact).
    const rows = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x, str: item.str });
    });

    Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a) // top of page first
      .forEach(y => {
        const line = rows[y]
          .sort((a, b) => a.x - b.x)
          .map(i => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (line) lines.push(line);
      });
  }

  return lines;
}

function extractTransactionCandidates(lines) {
  const candidates = [];

  lines.forEach(line => {
    let dateMatch = null;
    for (const pattern of PDF_DATE_PATTERNS) {
      dateMatch = line.match(pattern);
      if (dateMatch) break;
    }
    if (!dateMatch) return;

    const amounts = [...line.matchAll(PDF_AMOUNT_PATTERN)];
    if (amounts.length === 0) return;

    // If a line has a transaction amount *and* a running balance, the
    // balance is usually the last number and the amount the one before it.
    const chosen = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
    const raw = chosen[0];
    const numeric = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (!numeric) return;

    const date = parsePdfDate(dateMatch[1]);
    if (!date) return;

    let description = line.replace(dateMatch[1], "");
    amounts.forEach(a => { description = description.replace(a[0], ""); });
    description = description.replace(/\s+/g, " ").trim() || "(no description)";

    const isExplicitCredit = /CR/i.test(raw);
    const isExplicitDebit = /DR/i.test(raw) || /^\(|^-/.test(raw.trim());

    candidates.push({
      date,
      description,
      amount: numeric,
      type: isExplicitCredit && !isExplicitDebit ? "income" : "expense",
    });
  });

  return candidates;
}

function renderPdfPreview(candidates) {
  if (candidates.length === 0) {
    pdfPreview.classList.add("hidden");
    return;
  }

  pdfPreview.classList.remove("hidden");
  pdfPreviewBody.innerHTML = candidates.map(c => `
    <tr>
      <td><input type="checkbox" class="pdf-row-include" checked /></td>
      <td><input type="date" class="pdf-row-date" value="${c.date}" /></td>
      <td><input type="text" class="pdf-row-description" value="${escapeHtml(c.description)}" /></td>
      <td><input type="number" step="0.01" class="pdf-row-amount" value="${c.amount}" /></td>
      <td>
        <select class="pdf-row-type">
          <option value="expense" ${c.type === "expense" ? "selected" : ""}>Expense</option>
          <option value="income" ${c.type === "income" ? "selected" : ""}>Income</option>
        </select>
      </td>
    </tr>
  `).join("");
}

let pendingPasswordCallback = null; // PDF.js's updatePassword(), stashed while we wait on the user

let pendingPdfFile = null; // held onto so a password retry doesn't need the file re-picked

async function runPdfExtraction(file, password) {
  pdfStatus.textContent = "Reading PDF…";
  pdfPreview.classList.add("hidden");

  try {
    // Read a fresh ArrayBuffer for every attempt, and issue a brand new
    // getDocument() call rather than retrying via PDF.js's built-in
    // onPassword/updatePassword mechanism — that path reuses its original
    // (by-then-transferred, now-detached) buffer internally and reliably
    // fails with "Cannot perform Construct on a detached ArrayBuffer".
    const bytes = await file.arrayBuffer();
    const options = { data: bytes };
    if (password) options.password = password;
    const pdf = await pdfjsLib.getDocument(options).promise;

    pendingPdfFile = null;
    pdfPasswordPrompt.classList.add("hidden");

    const lines = await extractPdfLines(pdf);
    const candidates = extractTransactionCandidates(lines);
    if (candidates.length === 0) {
      pdfStatus.textContent = "Couldn't find any transaction-looking rows in that PDF. It may be a scanned image rather than text, which this can't read.";
      return;
    }

    renderPdfPreview(candidates);
    pdfStatus.textContent = `Found ${candidates.length} possible transaction${candidates.length === 1 ? "" : "s"}. Double-check dates especially — review every row below, then import.`;
  } catch (err) {
    if (err.name === "PasswordException") {
      pendingPdfFile = file;
      pdfPasswordPrompt.classList.remove("hidden");
      pdfStatus.textContent = err.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD
        ? "That password didn't work — try again."
        : "This PDF is password-protected. Enter the password your bank gave you for statements.";
      return;
    }
    pdfStatus.textContent = `Couldn't read that PDF: ${err.message}`;
  }
}

pdfInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pdfPasswordPrompt.classList.add("hidden");
  pdfPasswordInput.value = "";
  runPdfExtraction(file);
});

pdfPasswordSubmit.addEventListener("click", () => {
  if (!pendingPdfFile) return;
  runPdfExtraction(pendingPdfFile, pdfPasswordInput.value);
});

pdfConfirmBtn.addEventListener("click", () => {
  const rows = [...pdfPreviewBody.querySelectorAll("tr")];
  let imported = 0;

  rows.forEach(row => {
    if (!row.querySelector(".pdf-row-include").checked) return;

    const date = row.querySelector(".pdf-row-date").value;
    const description = row.querySelector(".pdf-row-description").value.trim();
    const amount = parseFloat(row.querySelector(".pdf-row-amount").value);
    const type = row.querySelector(".pdf-row-type").value;

    if (!date || !description || isNaN(amount) || amount <= 0) return;

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      category: guessCategory(description),
      type,
      amount,
    });
    imported++;
  });

  saveTransactions(transactions);
  renderAll();

  pdfStatus.textContent = `Imported ${imported} transaction${imported === 1 ? "" : "s"}.`;
  pdfPreview.classList.add("hidden");
  pdfPreviewBody.innerHTML = "";
  pdfInput.value = "";
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

applyTheme(localStorage.getItem(THEME_KEY) || "dark");
applyAccent(localStorage.getItem(ACCENT_KEY) || "#5b8def");
populateCategoryDropdowns();
populateBillCategoryDropdown();
document.getElementById("input-date").value = new Date().toISOString().slice(0, 10);
investmentDateInput.value = new Date().toISOString().slice(0, 10);
savingsDateInput.value = new Date().toISOString().slice(0, 10);
renderAll();
initScrollReveal();

// Registering a service worker lets the app be installed on a phone home
// screen and keep working without a network connection.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
