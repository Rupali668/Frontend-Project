import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
const AUTH_STORAGE_KEY = "finance-tracker-auth-v1";

const CATEGORY_OPTIONS = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Education",
  "Travel",
  "Salary",
  "Freelance",
  "Investments",
  "Other",
];

const CATEGORY_COLORS = [
  "#ad7a72",
  "#6f8b72",
  "#b39267",
  "#8a7661",
  "#85718e",
  "#7f6a62",
  "#8b845d",
  "#79808e",
  "#638268",
  "#8f6b52",
  "#766b88",
  "#6f6a63",
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: GridIcon },
  { id: "transactions", label: "Transactions", icon: LedgerIcon },
  { id: "analytics", label: "Analytics", icon: ChartIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const initialForm = {
  title: "",
  amount: "",
  category: "Food",
  type: "expense",
  date: new Date().toISOString().slice(0, 10),
};

const initialSummary = {
  income: 0,
  expenses: 0,
  balance: 0,
};

const emptyAuthForm = {
  name: "",
  email: "",
  password: "",
};

const demoTransactions = [
  {
    id: "demo-1",
    title: "Studio rent",
    amount: 18000,
    category: "Bills",
    type: "expense",
    date: "2026-04-21",
  },
  {
    id: "demo-2",
    title: "Client retainer",
    amount: 52000,
    category: "Freelance",
    type: "income",
    date: "2026-04-19",
  },
  {
    id: "demo-3",
    title: "Dinner out",
    amount: 2150,
    category: "Entertainment",
    type: "expense",
    date: "2026-04-17",
  },
  {
    id: "demo-4",
    title: "Train pass",
    amount: 1350,
    category: "Transport",
    type: "expense",
    date: "2026-04-15",
  },
];

const demoTrend = [
  { month: "Jan", spend: 19000 },
  { month: "Feb", spend: 21400 },
  { month: "Mar", spend: 20500 },
  { month: "Apr", spend: 23900 },
  { month: "May", spend: 22200 },
  { month: "Jun", spend: 24700 },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatMetricValue(value) {
  return Number(value || 0) > 0 ? formatCurrency(value) : "\u2014";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    type: transaction.type.toLowerCase(),
  };
}

async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const error = new Error(
      errorPayload?.error || errorPayload?.message || "Something went wrong",
    );
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authState, setAuthState] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(initialSummary);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    category: "all",
  });
  const [isLoading, setIsLoading] = useState(Boolean(authState));
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [settings, setSettings] = useState({
    monthlyBudget: 65000,
    savingsGoal: 15000,
    reminders: true,
    compactMode: false,
  });

  const token = authState?.token;
  const hasTransactions = transactions.length > 0;
  const pageHeading = {
    dashboard: "Where did your money go today?",
    transactions: "Every entry, cleanly organized",
    analytics: "Understand the pattern behind your spending",
    settings: "Tune your ledger to your month",
  }[activeNav];

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    if (!authState) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setTransactions([]);
      setSummary(initialSummary);
      setIsLoading(false);
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  }, [authState]);

  useEffect(() => {
    const closeMenu = () => setAvatarMenuOpen(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(null);
    setTransactions([]);
    setSummary(initialSummary);
    setError("Your session expired. Please log in again.");
    setAuthMode("login");
  }, []);

  const loadTransactions = useCallback(async (sessionToken) => {
    const data = await apiRequest("/api/transactions", {}, sessionToken);
    setTransactions(data.map(normalizeTransaction));
  }, []);

  const loadSummary = useCallback(async (sessionToken) => {
    const data = await apiRequest("/api/transactions/summary", {}, sessionToken);
    setSummary({
      income: Number(data.income || 0),
      expenses: Number(data.expenses || 0),
      balance: Number(data.balance || 0),
    });
  }, []);

  const refreshDashboard = useCallback(async (sessionToken = token) => {
    if (!sessionToken) {
      return;
    }

    await Promise.all([loadTransactions(sessionToken), loadSummary(sessionToken)]);
  }, [loadSummary, loadTransactions, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError("");
        await apiRequest("/api/auth/me", {}, token);
        await refreshDashboard(token);
      } catch (requestError) {
        if (requestError.status === 401) {
          handleUnauthorized();
        } else {
          setError(requestError.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [handleUnauthorized, refreshDashboard, token]);

  const displayTransactions = hasTransactions ? transactions : demoTransactions;

  const expenseByCategory = useMemo(() => {
    const totals = displayTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((accumulator, transaction) => {
        accumulator[transaction.category] =
          (accumulator[transaction.category] || 0) + transaction.amount;
        return accumulator;
      }, {});

    return Object.entries(totals)
      .map(([name, value], index) => ({
        name,
        value,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((left, right) => right.value - left.value);
  }, [displayTransactions]);

  const topSpendingCategory = expenseByCategory[0];

  const monthlyTrend = useMemo(() => {
    if (!hasTransactions) {
      return demoTrend;
    }

    const totals = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((accumulator, transaction) => {
        const month = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(
          new Date(transaction.date),
        );
        accumulator[month] = (accumulator[month] || 0) + transaction.amount;
        return accumulator;
      }, {});

    return Object.entries(totals).map(([month, spend]) => ({ month, spend }));
  }, [hasTransactions, transactions]);

  const totalExpenseValue = expenseByCategory.reduce(
    (total, category) => total + category.value,
    0,
  );

  const topCategoryShare = topSpendingCategory
    ? Math.round((topSpendingCategory.value / totalExpenseValue) * 100)
    : 0;

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const query = filters.search.trim().toLowerCase();
        const matchesSearch =
          transaction.title.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query);
        const matchesType =
          filters.type === "all" || transaction.type === filters.type;
        const matchesCategory =
          filters.category === "all" || transaction.category === filters.category;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((left, right) => new Date(right.date) - new Date(left.date));
  }, [filters, transactions]);

  const displayIncome = hasTransactions ? summary.income : 52000;
  const displayExpenses = hasTransactions ? summary.expenses : totalExpenseValue;
  const budgetUsed = Math.min(
    100,
    Math.round((displayExpenses / Number(settings.monthlyBudget || 1)) * 100),
  );
  const savingsRate = displayIncome
    ? Math.max(0, Math.round(((displayIncome - displayExpenses) / displayIncome) * 100))
    : 0;
  const averageTransaction = displayTransactions.length
    ? displayTransactions.reduce((total, transaction) => total + transaction.amount, 0) /
      displayTransactions.length
    : 0;

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsAuthLoading(true);
      setAuthError("");
      const payload =
        authMode === "signup"
          ? {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            }
          : {
              email: authForm.email.trim(),
              password: authForm.password,
            };

      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuthState(response);
      setAuthForm(emptyAuthForm);
      setError("");
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(null);
    setAuthForm(emptyAuthForm);
    setError("");
    setAuthError("");
  };

  const addTransaction = async (event) => {
    event.preventDefault();

    if (!token) {
      setError("Please log in before adding a transaction.");
      return;
    }

    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid title and amount.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      await apiRequest(
        "/api/transactions",
        {
          method: "POST",
          body: JSON.stringify({
            title: form.title.trim(),
            amount: Number(form.amount),
            category: form.category,
            type: form.type.toUpperCase(),
            date: form.date,
          }),
        },
        token,
      );
      await refreshDashboard();
      setForm({ ...initialForm, date: form.date });
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
      } else {
        setError(requestError.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      setError("");
      await apiRequest(`/api/transactions/${transactionId}`, { method: "DELETE" }, token);
      await refreshDashboard();
    } catch (requestError) {
      if (requestError.status === 401) {
        handleUnauthorized();
      } else {
        setError(requestError.message);
      }
    }
  };

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-7 lg:px-10">
        {!authState ? (
          <AuthScreen
            authError={authError}
            authForm={authForm}
            authMode={authMode}
            isAuthLoading={isAuthLoading}
            onAuthFormChange={setAuthForm}
            onAuthModeChange={setAuthMode}
            onSubmit={handleAuthSubmit}
          />
        ) : (
          <div className="grid gap-8 xl:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="sidebar-shell rounded-[28px] border px-4 py-6">
              <div className="px-2">
                <p className="logo-mark text-3xl leading-none text-[#f2eadf]">LF</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Ledger Flow
                </p>
              </div>

              <nav className="mt-12 space-y-5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveNav(item.id)}
                      className={`sidebar-link w-full ${isActive ? "sidebar-link--active" : ""}`}
                    >
                      <span className="flex items-center gap-3">
                        {isActive ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <span className="text-lg leading-none text-[#8b7f72]">·</span>
                        )}
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <main className="space-y-8">
              <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm text-[#8f8376]">{greeting()}, {authState.name}</p>
                  <h1 className="hero-title mt-4 text-left text-[#f4eee6]">
                    {pageHeading}
                  </h1>
                </div>

                <div className="flex items-center gap-3 self-start">
                  <button type="button" className="icon-shell rounded-full border p-3">
                    <BellIcon className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAvatarMenuOpen((current) => !current);
                      }}
                      className="avatar-shell flex items-center gap-3 rounded-full border px-3 py-2"
                    >
                      <span className="avatar-circle">
                        {authState.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-[#c5b8aa]">{authState.name}</span>
                    </button>
                    {avatarMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-52 rounded-2xl border border-[#3a322b] bg-[#1f1a16] p-2 shadow-2xl">
                        <button
                          type="button"
                          className="menu-item"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className="menu-item"
                        >
                          Preferences
                        </button>
                        <button
                          type="button"
                          onClick={logout}
                          className="menu-item text-[#e39d8f]"
                        >
                          Log out
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </header>

              <div className="section-rule" />

              {error ? (
                <div className="rounded-2xl border border-[#4a2e2b] bg-[#2a1918] px-5 py-4 text-sm text-[#d7ada6]">
                  {error}
                </div>
              ) : null}

              {activeNav === "dashboard" ? (
                <>
              <section className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  className="md:col-span-2"
                  label="Available balance"
                  value={formatMetricValue(summary.balance)}
                  helper={
                    Number(summary.balance) > 0
                      ? "What’s left to work with"
                      : "Nothing logged yet"
                  }
                />
                <MetricCard
                  label="Income"
                  value={formatMetricValue(summary.income)}
                  helper={Number(summary.income) > 0 ? "Money in" : "Nothing logged yet"}
                />
                <MetricCard
                  label="Expenses"
                  value={formatMetricValue(summary.expenses)}
                  helper={Number(summary.expenses) > 0 ? "Money out" : "Nothing logged yet"}
                />
                <TopCategoryCard
                  label="Top spending"
                  category={topSpendingCategory?.name}
                  value={topSpendingCategory?.value}
                  share={topCategoryShare}
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
                <div className="space-y-6">
                  <ChartCard
                    title="Spending over time"
                    caption="Sample data · Updates as you log"
                  >
                    {isLoading ? (
                      <LoadingRows rows={5} />
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyTrend}>
                            <defs>
                              <linearGradient id="ledgerArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="month"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#8f8376", fontSize: 12 }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#8f8376", fontSize: 12 }}
                              tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                            />
                            <Tooltip
                              formatter={(value) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: "#1f1a16",
                                border: "1px solid #3a322b",
                                borderRadius: "12px",
                                color: "#f4eee6",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="spend"
                              stroke="#c9a84c"
                              strokeWidth={2.5}
                              fill="url(#ledgerArea)"
                              dot={false}
                              activeDot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </ChartCard>

                  <ChartCard
                    title="Expense mix"
                    caption="Sample data · Updates as you log"
                  >
                    {isLoading ? (
                      <LoadingRows rows={5} />
                    ) : (
                      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expenseByCategory}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={62}
                                outerRadius={95}
                                paddingAngle={3}
                              >
                                {expenseByCategory.map((entry) => (
                                  <Cell key={entry.name} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "#1f1a16",
                                  border: "1px solid #3a322b",
                                  borderRadius: "12px",
                                  color: "#f4eee6",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3 pt-4">
                          {expenseByCategory.map((entry) => (
                            <div
                              key={entry.name}
                              className="flex items-center justify-between rounded-2xl border border-[#332c26] bg-[#1d1915] px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: entry.fill }}
                                />
                                <span className="text-sm text-[#ddd3c8]">{entry.name}</span>
                              </div>
                              <span className="text-sm text-[#9d8f80]">
                                {formatCurrency(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ChartCard>

                  <FormCard
                    form={form}
                    isSaving={isSaving}
                    onFormChange={setForm}
                    onSubmit={addTransaction}
                  />
                </div>

                <div className="space-y-6">
                  <section className="panel-card rounded-[24px] border px-5 py-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">
                        Snapshot
                      </p>
                      <h2 className="mt-3 text-2xl text-[#f4eee6]">A quick read on your cash flow</h2>
                    </div>

                    <div className="mt-6 space-y-4">
                      <SnapshotCard
                        label="Recent expenses"
                        value={`${displayTransactions.filter((item) => item.type === "expense").length} entries`}
                        helper={
                          displayTransactions.find((item) => item.type === "expense")
                            ? `${displayTransactions.find((item) => item.type === "expense").title} on ${formatDate(
                                displayTransactions.find((item) => item.type === "expense").date,
                              )}`
                            : "Nothing logged yet"
                        }
                      />
                      <SnapshotCard
                        label="Top category"
                        value={topSpendingCategory?.name || "\u2014"}
                        helper={
                          topSpendingCategory
                            ? `${formatCurrency(topSpendingCategory.value)} spent here`
                            : "Nothing logged yet"
                        }
                      />
                    </div>
                  </section>

                  <section className="panel-card rounded-[24px] border px-5 py-5">
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                      <input
                        type="text"
                        placeholder="Search"
                        value={filters.search}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, search: event.target.value }))
                        }
                        className="feed-control rounded-md px-4 py-3 text-sm outline-none"
                      />
                      <select
                        value={filters.type}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, type: event.target.value }))
                        }
                        className="feed-control rounded-md px-4 py-3 text-sm outline-none"
                      >
                        <option value="all">All types</option>
                        <option value="expense">Only expenses</option>
                        <option value="income">Only income</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">
                        Latest activity
                      </p>
                    </div>

                    <div className="space-y-3">
                      {isLoading ? (
                        <LoadingRows rows={4} />
                      ) : filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <article
                            key={transaction.id}
                            className="feed-row flex items-start justify-between gap-4 rounded-[18px] border px-4 py-4"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-medium text-[#f0e8de]">
                                  {transaction.title}
                                </h3>
                                <span className="rounded-full border border-[#3a332d] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-[#9d8f80]">
                                  {transaction.category}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-[#8f8376]">
                                {formatDate(transaction.date)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <p
                                className={`text-sm font-medium ${
                                  transaction.type === "income"
                                    ? "text-[#8ecf8e]"
                                    : "text-[#d99687]"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "-"}
                                {formatCurrency(transaction.amount)}
                              </p>
                              <button
                                type="button"
                                onClick={() => deleteTransaction(transaction.id)}
                                className="text-xs uppercase tracking-[0.08em] text-[#8f8376] transition hover:text-[#f0e8de]"
                              >
                                Remove
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <FeedEmptyState />
                      )}
                    </div>
                  </section>
                </div>
              </section>
                </>
              ) : null}

              {activeNav === "transactions" ? (
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="panel-card rounded-[24px] border px-5 py-5">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">
                          Transactions
                        </p>
                        <h2 className="mt-2 text-2xl text-[#f4eee6]">
                          {filteredTransactions.length} saved entries
                        </h2>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          placeholder="Search title or category"
                          value={filters.search}
                          onChange={(event) =>
                            setFilters((current) => ({ ...current, search: event.target.value }))
                          }
                          className="feed-control rounded-md px-4 py-3 text-sm outline-none"
                        />
                        <select
                          value={filters.type}
                          onChange={(event) =>
                            setFilters((current) => ({ ...current, type: event.target.value }))
                          }
                          className="feed-control rounded-md px-4 py-3 text-sm outline-none"
                        >
                          <option value="all">All types</option>
                          <option value="expense">Expenses</option>
                          <option value="income">Income</option>
                        </select>
                        <select
                          value={filters.category}
                          onChange={(event) =>
                            setFilters((current) => ({ ...current, category: event.target.value }))
                          }
                          className="feed-control rounded-md px-4 py-3 text-sm outline-none"
                        >
                          <option value="all">All categories</option>
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {isLoading ? (
                        <LoadingRows rows={5} />
                      ) : filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            onDelete={deleteTransaction}
                          />
                        ))
                      ) : (
                        <FeedEmptyState />
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <MetricCard
                      label="Average entry"
                      value={formatMetricValue(averageTransaction)}
                      helper="Across visible activity"
                    />
                    <FormCard
                      form={form}
                      isSaving={isSaving}
                      onFormChange={setForm}
                      onSubmit={addTransaction}
                    />
                  </div>
                </section>
              ) : null}

              {activeNav === "analytics" ? (
                <section className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      label="Budget used"
                      value={`${budgetUsed}%`}
                      helper={`${formatCurrency(displayExpenses)} of ${formatCurrency(settings.monthlyBudget)}`}
                    />
                    <MetricCard
                      label="Savings rate"
                      value={`${savingsRate}%`}
                      helper="Income left after expenses"
                    />
                    <MetricCard
                      label="Average transaction"
                      value={formatMetricValue(averageTransaction)}
                      helper={`${displayTransactions.length} entries analyzed`}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <ChartCard title="Spending trend" caption="Uses your transactions when available">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyTrend}>
                            <defs>
                              <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8f8376", fontSize: 12 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8f8376", fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: "#1f1a16", border: "1px solid #3a322b", borderRadius: "12px", color: "#f4eee6" }} />
                            <Area type="monotone" dataKey="spend" stroke="#c9a84c" strokeWidth={2.5} fill="url(#analyticsArea)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>

                    <ChartCard title="Category split" caption="Largest expense categories first">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                              {expenseByCategory.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: "#1f1a16", border: "1px solid #3a322b", borderRadius: "12px", color: "#f4eee6" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <CategoryBreakdown data={expenseByCategory} total={totalExpenseValue} />
                    </ChartCard>
                  </div>
                </section>
              ) : null}

              {activeNav === "settings" ? (
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="panel-card rounded-[24px] border px-5 py-6">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">
                      Preferences
                    </p>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <Field label="MONTHLY BUDGET">
                        <input
                          type="number"
                          min="0"
                          value={settings.monthlyBudget}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              monthlyBudget: Number(event.target.value),
                            }))
                          }
                          className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
                        />
                      </Field>
                      <Field label="SAVINGS GOAL">
                        <input
                          type="number"
                          min="0"
                          value={settings.savingsGoal}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              savingsGoal: Number(event.target.value),
                            }))
                          }
                          className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
                        />
                      </Field>
                    </div>

                    <div className="mt-8 space-y-4">
                      <ToggleRow
                        label="Monthly reminders"
                        helper="Show prompts to review spending at month end"
                        checked={settings.reminders}
                        onChange={(checked) =>
                          setSettings((current) => ({ ...current, reminders: checked }))
                        }
                      />
                      <ToggleRow
                        label="Compact transaction rows"
                        helper="Use tighter rows when reviewing long ledgers"
                        checked={settings.compactMode}
                        onChange={(checked) =>
                          setSettings((current) => ({ ...current, compactMode: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section className="panel-card rounded-[24px] border px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">
                        Account
                      </p>
                      <div className="mt-5 flex items-center gap-4">
                        <span className="avatar-circle h-12 w-12 text-base">
                          {authState.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <h2 className="text-2xl text-[#f4eee6]">{authState.name}</h2>
                          <p className="text-sm text-[#8f8376]">{authState.email}</p>
                        </div>
                      </div>
                    </section>
                    <MetricCard
                      label="Goal progress"
                      value={`${Math.min(100, Math.round(((displayIncome - displayExpenses) / Number(settings.savingsGoal || 1)) * 100))}%`}
                      helper={`${formatCurrency(Math.max(0, displayIncome - displayExpenses))} saved toward ${formatCurrency(settings.savingsGoal)}`}
                    />
                  </div>
                </section>
              ) : null}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthScreen({
  authError,
  authForm,
  authMode,
  isAuthLoading,
  onAuthFormChange,
  onAuthModeChange,
  onSubmit,
}) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1120px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-8">
        <p className="logo-mark text-5xl text-[#f3ebe0]">LF</p>
        <div className="max-w-2xl">
          <h1 className="hero-title text-left text-[#f4eee6]">
            A ledger that feels calm, even when your month doesn&apos;t.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#9d8f80]">
            Sign in to keep every expense, payout, and bill in one warm, quiet place.
          </p>
        </div>
      </div>

      <section className="panel-card rounded-[28px] border px-7 py-8 sm:px-9">
        <div className="mb-8 flex rounded-[10px] border border-[#342d26] p-1">
          <button
            type="button"
            onClick={() => onAuthModeChange("login")}
            className={`auth-tab ${authMode === "login" ? "auth-tab--active" : ""}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onAuthModeChange("signup")}
            className={`auth-tab ${authMode === "signup" ? "auth-tab--active" : ""}`}
          >
            Signup
          </button>
        </div>

        <h2 className="text-4xl text-[#f4eee6]">
          {authMode === "login" ? "Welcome back" : "Create your account"}
        </h2>

        {authError ? (
          <div className="mt-5 rounded-[10px] border border-[#4a2e2b] bg-[#2a1918] px-4 py-3 text-sm text-[#d7ada6]">
            {authError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {authMode === "signup" ? (
            <Field label="FULL NAME">
              <input
                type="text"
                value={authForm.name}
                onChange={(event) =>
                  onAuthFormChange((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Rupali Tiwari"
                className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
              />
            </Field>
          ) : null}

          <Field label="EMAIL">
            <input
              type="email"
              value={authForm.email}
              onChange={(event) =>
                onAuthFormChange((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
            />
          </Field>

          <Field label="PASSWORD">
            <input
              type="password"
              value={authForm.password}
              onChange={(event) =>
                onAuthFormChange((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Minimum 4 characters"
              className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
            />
          </Field>

          <button
            type="submit"
            disabled={isAuthLoading}
            className="primary-wide-button mt-4 w-full rounded-[8px] px-5 py-4 text-left text-sm uppercase tracking-[0.08em] text-[#1a1612] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-between">
              <span>
                {isAuthLoading
                  ? authMode === "login"
                    ? "Logging in"
                    : "Creating account"
                  : authMode === "login"
                    ? "Log in"
                    : "Create account"}
              </span>
              <span aria-hidden="true">&rarr;</span>
            </span>
          </button>
        </form>
      </section>
    </section>
  );
}

function MetricCard({ className = "", label, value, helper }) {
  const isPlaceholder = value === "\u2014";

  return (
    <article className={`stat-card rounded-[22px] px-5 py-5 ${className}`}>
      <p className="stat-label">{label}</p>
      <p className={`mt-4 text-[2rem] leading-none ${isPlaceholder ? "italic text-[#9d8f80]" : "text-[#f4eee6]"}`}>
        {value}
      </p>
      <p className={`mt-3 text-sm ${isPlaceholder ? "italic text-[#7b7166]" : "text-[#8f8376]"}`}>
        {helper}
      </p>
    </article>
  );
}

function TopCategoryCard({ label, category, value, share }) {
  const hasValue = Boolean(category && value);

  return (
    <article className="stat-card rounded-[22px] px-5 py-5">
      <p className="stat-label">{label}</p>
      <p className={`mt-4 text-[2rem] leading-none ${hasValue ? "text-[#f4eee6]" : "italic text-[#9d8f80]"}`}>
        {hasValue ? category : "\u2014"}
      </p>
      <div className="mt-4">
        <div className="h-[5px] overflow-hidden rounded-full bg-[#342d26]">
          <div
            className="h-full rounded-full bg-[#c9a84c] transition-[width] duration-500"
            style={{ width: `${hasValue ? share : 0}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-[#8f8376]">
          <span>{hasValue ? formatCurrency(value) : "Nothing logged yet"}</span>
          <span>{hasValue ? `${share}%` : ""}</span>
        </div>
      </div>
    </article>
  );
}

function ChartCard({ title, caption, children }) {
  return (
    <section className="panel-card rounded-[24px] border px-5 py-5">
      <div className="mb-5">
        <h2 className="text-[1.65rem] text-[#f4eee6]">{title}</h2>
      </div>
      {children}
      <p className="mt-4 text-sm italic text-[#8f8376]">{caption}</p>
    </section>
  );
}

function FormCard({ form, isSaving, onFormChange, onSubmit }) {
  return (
    <section className="panel-card rounded-[24px] border px-5 py-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.14em] text-[#8f8376]">Add a new transaction</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Field label="WHAT WAS IT" className="xl:col-span-2">
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              onFormChange((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Studio rent, groceries, salary..."
            className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
          />
        </Field>

        <Field label="AMOUNT">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              onFormChange((current) => ({ ...current, amount: event.target.value }))
            }
            placeholder="2500"
            className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
          />
        </Field>

        <Field label="TYPE">
          <select
            value={form.type}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                type: event.target.value,
                category: event.target.value === "income" ? "Salary" : "Food",
              }))
            }
            className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </Field>

        <Field label="CATEGORY">
          <select
            value={form.category}
            onChange={(event) =>
              onFormChange((current) => ({ ...current, category: event.target.value }))
            }
            className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>

        <Field label="DATE">
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              onFormChange((current) => ({ ...current, date: event.target.value }))
            }
            className="editorial-input w-full rounded-[4px] px-0 py-3 text-base outline-none"
          />
        </Field>

        <div className="md:col-span-2 xl:col-span-5 pt-2">
          <button
            disabled={isSaving}
            className="primary-wide-button w-full rounded-[8px] px-5 py-4 text-left text-sm uppercase tracking-[0.08em] text-[#1a1612] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-between">
              <span>{isSaving ? "Saving transaction" : "Save transaction"}</span>
              <span aria-hidden="true">&rarr;</span>
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}

function SnapshotCard({ label, value, helper }) {
  return (
    <div className="rounded-[18px] border border-[#332c26] bg-[#1d1915] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[#8f8376]">{label}</p>
      <p className="mt-3 text-xl text-[#f0e8de]">{value}</p>
      <p className="mt-2 text-sm text-[#8f8376]">{helper}</p>
    </div>
  );
}

function TransactionRow({ transaction, onDelete }) {
  return (
    <article className="feed-row flex items-start justify-between gap-4 rounded-[18px] border px-4 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-[#f0e8de]">
            {transaction.title}
          </h3>
          <span className="rounded-full border border-[#3a332d] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-[#9d8f80]">
            {transaction.category}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#8f8376]">{formatDate(transaction.date)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <p
          className={`text-sm font-medium ${
            transaction.type === "income" ? "text-[#8ecf8e]" : "text-[#d99687]"
          }`}
        >
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </p>
        <button
          type="button"
          onClick={() => onDelete(transaction.id)}
          className="text-xs uppercase tracking-[0.08em] text-[#8f8376] transition hover:text-[#f0e8de]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function CategoryBreakdown({ data, total }) {
  return (
    <div className="mt-5 space-y-3">
      {data.map((entry) => {
        const share = total ? Math.round((entry.value / total) * 100) : 0;
        return (
          <div key={entry.name} className="rounded-[16px] border border-[#332c26] bg-[#1d1915] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-sm text-[#ddd3c8]">{entry.name}</span>
              </div>
              <span className="text-sm text-[#9d8f80]">{formatCurrency(entry.value)}</span>
            </div>
            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#342d26]">
              <div className="h-full rounded-full bg-[#c9a84c]" style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToggleRow({ label, helper, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[#332c26] bg-[#1d1915] px-4 py-4">
      <div>
        <p className="text-sm font-medium text-[#f0e8de]">{label}</p>
        <p className="mt-1 text-sm text-[#8f8376]">{helper}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full p-1 transition ${
          checked ? "bg-[#c9a84c]" : "bg-[#342d26]"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-[#f4eee6] transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function FeedEmptyState() {
  return (
    <div className="rounded-[18px] border border-[#332c26] px-4 py-8 text-sm text-[#8f8376]">
      <div className="border-t border-dashed border-[#4a4036]" />
      <p className="pt-5">No activity yet. Your transactions will start appearing here.</p>
    </div>
  );
}

function LoadingRows({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-[16px] bg-[#241f1b]"
        />
      ))}
    </div>
  );
}

function Field({ children, className = "", label }) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function GridIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </svg>
  );
}

function LedgerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M6 4.5h10A2.5 2.5 0 0 1 18.5 7v12.5H8A2 2 0 0 1 6 17.5Z" />
      <path d="M6 6.5h8.5" />
      <path d="M9 11h6" />
      <path d="M9 14.5h4.5" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M4 19V5" />
      <path d="M10 19V9" />
      <path d="M16 19v-5" />
      <path d="M22 19V3" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M12 8.7A3.3 3.3 0 1 0 12 15.3A3.3 3.3 0 1 0 12 8.7z" />
      <path d="m19.5 12-.9.5a1.7 1.7 0 0 0-.8 1.9l.3 1-1.7 1.7-1-.3a1.7 1.7 0 0 0-1.9.8l-.5.9h-2.4l-.5-.9a1.7 1.7 0 0 0-1.9-.8l-1 .3-1.7-1.7.3-1a1.7 1.7 0 0 0-.8-1.9L4.5 12l.5-2.4a1.7 1.7 0 0 0 .8-1.9l-.3-1 1.7-1.7 1 .3a1.7 1.7 0 0 0 1.9-.8l.5-.9h2.4l.5.9a1.7 1.7 0 0 0 1.9.8l1-.3 1.7 1.7-.3 1a1.7 1.7 0 0 0 .8 1.9Z" />
    </svg>
  );
}

function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M6.5 9.8a5.5 5.5 0 0 1 11 0c0 5.8 2.5 6.2 2.5 7.7h-15c0-1.5 2.5-1.9 2.5-7.7Z" />
      <path d="M10.2 19.5a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  );
}

export default App;
