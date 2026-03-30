import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STORAGE_KEY = "finance-tracker-transactions-v2";
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
  "#0f766e",
  "#f97316",
  "#6366f1",
  "#dc2626",
  "#14b8a6",
  "#8b5cf6",
  "#d97706",
  "#0891b2",
  "#16a34a",
  "#2563eb",
  "#9333ea",
  "#475569",
];

const initialForm = {
  title: "",
  amount: "",
  category: "Food",
  type: "expense",
  date: new Date().toISOString().slice(0, 10),
};

const seedTransactions = [];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}


function App() {
  const [transactions, setTransactions] = useState(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY);

    if (!savedTransactions) {
      return seedTransactions;
    }

    try {
      const parsedTransactions = JSON.parse(savedTransactions);
      return Array.isArray(parsedTransactions) ? parsedTransactions : seedTransactions;
    } catch {
      return seedTransactions;
    }
  });
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    category: "all",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);

    const expenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const totals = transactions
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
  }, [transactions]);

  const topSpendingCategory = expenseByCategory[0];

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const matchesSearch =
          transaction.title
            .toLowerCase()
            .includes(filters.search.trim().toLowerCase()) ||
          transaction.category
            .toLowerCase()
            .includes(filters.search.trim().toLowerCase());

        const matchesType =
          filters.type === "all" || transaction.type === filters.type;

        const matchesCategory =
          filters.category === "all" || transaction.category === filters.category;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((left, right) => new Date(right.date) - new Date(left.date));
  }, [filters, transactions]);

  const recentExpenses = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.type === "expense")
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 5);
  }, [transactions]);

  const addTransaction = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0) {
      return;
    }

    const newTransaction = {
      id: Date.now(),
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category,
      type: form.type,
      date: form.date,
    };

    setTransactions((currentTransactions) => [
      newTransaction,
      ...currentTransactions,
    ]);
    setForm({
      ...initialForm,
      date: form.date,
    });
  };

  const deleteTransaction = (transactionId) => {
    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== transactionId),
    );
  };

  const clearAllTransactions = () => {
    setTransactions([]);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.15),_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#ecfeff_45%,_#eff6ff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {/* <p className="mb-3 inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
                Personal Finance Dashboard
              </p> */}
              <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                Track spending, manage expenses, and spot where your money goes.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
                Add income and expense entries, review category-wise spending,
                and filter your history to understand your money better.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <StatCard
                label="Balance"
                value={formatCurrency(summary.balance)}
                tone="slate"
              />
              <StatCard
                label="Income"
                value={formatCurrency(summary.income)}
                tone="green"
              />
              <StatCard
                label="Expenses"
                value={formatCurrency(summary.expenses)}
                tone="red"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Add transaction
                  </h2>
                  <p className="text-sm text-slate-500">
                    Save income or expense records with category and date.
                  </p>
                </div>
              </div>

              <form
                onSubmit={addTransaction}
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <label className="md:col-span-2 xl:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Title
                  </span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Groceries, Rent, Salary..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="2500"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Type
                  </span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value,
                        category:
                          event.target.value === "income" ? "Salary" : "Food",
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Category
                  </span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Date
                  </span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  />
                </label>

                <div className="flex items-end md:col-span-2 xl:col-span-1">
                  <button className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                    Save transaction
                  </button>
                </div>
              </form>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    Expense breakdown
                  </h2>
                  <p className="text-sm text-slate-500">
                    See which categories consume most of your budget.
                  </p>
                </div>

                <div className="h-72">
                  {expenseByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={88}
                          paddingAngle={4}
                        >
                          {expenseByCategory.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Add some expenses to view the category split." />
                  )}
                </div>

                {topSpendingCategory ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    Highest spending is in{" "}
                    <span className="font-bold">{topSpendingCategory.name}</span>{" "}
                    with {formatCurrency(topSpendingCategory.value)}.
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    Category comparison
                  </h2>
                  <p className="text-sm text-slate-500">
                    Quick comparison of your largest expense categories.
                  </p>
                </div>

                <div className="h-72">
                  {expenseByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseByCategory.slice(0, 6)}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                          {expenseByCategory.slice(0, 6).map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Your comparison chart will show up here." />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Expense insights
                  </h2>
                  <p className="text-sm text-slate-500">
                    Search, filter, and understand your recent money flow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearAllTransactions}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Clear all
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Search title or category"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />

                <select
                  value={filters.type}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                >
                  <option value="all">All types</option>
                  <option value="expense">Only expenses</option>
                  <option value="income">Only income</option>
                </select>

                <select
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                >
                  <option value="all">All categories</option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InsightCard
                  label="Recent expenses"
                  value={`${recentExpenses.length} entries`}
                  helper={
                    recentExpenses[0]
                      ? `${recentExpenses[0].title} on ${formatDate(
                          recentExpenses[0].date,
                        )}`
                      : "No expenses recorded yet"
                  }
                />
                <InsightCard
                  label="Top category"
                  value={topSpendingCategory?.name || "No data yet"}
                  helper={
                    topSpendingCategory
                      ? formatCurrency(topSpendingCategory.value)
                      : "Track a few expenses to unlock insight"
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Transaction history
                  </h2>
                  <p className="text-sm text-slate-500">
                    {filteredTransactions.length} matching transactions
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <article
                      key={transaction.id}
                      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {transaction.title}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              transaction.type === "income"
                                ? "bg-green-100 text-green-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {transaction.type}
                          </span>
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {transaction.category}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatDate(transaction.date)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <p
                          className={`text-lg font-black ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : "text-rose-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteTransaction(transaction.id)}
                          className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState text="No transactions match your current filters." />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneClasses = {
    slate: "bg-slate-900 text-white",
    green: "bg-green-100 text-green-800",
    red: "bg-rose-100 text-rose-800",
  };

  return (
    <div className={`rounded-3xl p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function InsightCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export default App;
