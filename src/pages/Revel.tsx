import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import { supabase } from "../supabase/supabase";
import calcback from "../images/calcback.png";



const MONTHS = [
    "СІЧЕНЬ", "ЛЮТИЙ", "БЕРЕЗЕНЬ", "КВІТЕНЬ", "ТРАВЕНЬ", "ЧЕРВЕНЬ",
    "ЛИПЕНЬ", "СЕРПЕНЬ", "ВЕРЕСЕНЬ", "ЖОВТЕНЬ", "ЛИСТОПАД", "ГРУДЕНЬ",
];

const ICONS: Record<string, string> = {
    "Транспорт": "🚗",
    "Продукти": "🛒",
    "Здоров’я": "💊",
    "Алкоголь": "🍷",
    "Розваги": "🎮",
    "Все для дому": "🏠",
    "Техніка": "💻",
    "Комуналка, зв’язок": "📡",
    "Спорт, хобі": "⚽",
    "Навчання": "📚",
    "Зарплата": "💼",
    "Фріланс": "🧑‍💻",
    "Подарунки": "🎁",
    "Інвестиції": "📈",
    "Премія": "🏆",
    "Оренда": "🔑",
    "Продаж речей": "🏷️",
    "Кешбек": "💳",
    "Повернення боргу": "🤝",
    "Інше": "📦",
    "Без категорії": "❔",
};
function getIcon(name: string) {
    return ICONS[name] || ".";
}

function formatAmount(value: number) {
    return Math.abs(value).toFixed(2);
}

export default function Revel() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState("");

    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());
    const [activeType, setActiveType] = useState<"expense" | "income">("expense");

    const [balance, setBalance] = useState(0);
    const [balanceInput, setBalanceInput] = useState("0.00");
    const [saving, setSaving] = useState(false);

    const [expenseTotal, setExpenseTotal] = useState(0);
    const [incomeTotal, setIncomeTotal] = useState(0);
    const [categories, setCategories] = useState<{ name: string; amount: number }[]>([]);
    const [items, setItems] = useState<{ description: string; amount: number; category: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || "");
        };

        getUser();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserEmail(session?.user?.email || "");
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    async function loadBalance() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("transactions")
            .select("type, amount")
            .eq("user_id", user.id);

        const list: any[] = data || [];

        let total = 0;
        for (const t of list) {
            if (t.type === "expense") {
                total = total - t.amount;
            } else {
                total = total + t.amount;
            }
        }

        setBalance(total);
        setBalanceInput(total.toFixed(2));
    }

    useEffect(() => {
        loadBalance();
    }, []);

    useEffect(() => {
        window.addEventListener("balance:refresh", loadBalance);
        return () => window.removeEventListener("balance:refresh", loadBalance);
    }, []);

    async function loadMonthData() {
        setLoading(true);
        setError("");
        setSelectedCategory(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const monthNumber = month + 1;
        const monthStr = monthNumber < 10 ? "0" + monthNumber : "" + monthNumber;
        const lastDay = new Date(year, monthNumber, 0).getDate();
        const lastDayStr = lastDay < 10 ? "0" + lastDay : "" + lastDay;

        const from = year + "-" + monthStr + "-01";
        const to = year + "-" + monthStr + "-" + lastDayStr;

        const { data, error: loadError } = await supabase
            .from("transactions")
            .select("type, amount, description, categories(name)")
            .eq("user_id", user.id)
            .gte("date", from)
            .lte("date", to);

        if (loadError) {
            setError("Не вдалося завантажити дані");
            setLoading(false);
            return;
        }

        const list: any[] = data || [];

        let expense = 0;
        let income = 0;
        const categoryMap: Record<string, number> = {};
        const itemMap: Record<string, number> = {};
        const itemCategoryMap: Record<string, string> = {};

        for (const t of list) {
            const amount = Math.abs(t.amount);

            if (t.type === "expense") {
                expense = expense + amount;
            } else {
                income = income + amount;
            }

            if (t.type === activeType) {
                const categoryName = t.categories ? t.categories.name : "Без категорії";
                categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amount;

                const itemName = t.description ? t.description : categoryName;
                itemMap[itemName] = (itemMap[itemName] || 0) + amount;
                itemCategoryMap[itemName] = categoryName;
            }
        }

        setExpenseTotal(expense);
        setIncomeTotal(income);

        const categoryList = Object.keys(categoryMap).map((name) => {
            return { name: name, amount: categoryMap[name] };
        });
        categoryList.sort((a, b) => b.amount - a.amount);
        setCategories(categoryList);

        const itemList = Object.keys(itemMap).map((description) => {
            return {
                description: description,
                amount: itemMap[description],
                category: itemCategoryMap[description],
            };
        });
        itemList.sort((a, b) => b.amount - a.amount);
        setItems(itemList.slice(0, 10));

        setLoading(false);
    }

    useEffect(() => {
        loadMonthData();
    }, [month, year, activeType]);

    function prevMonth() {
        if (month === 0) {
            setMonth(11);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    }

    function nextMonth() {
        if (month === 11) {
            setMonth(0);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    }

    const newBalanceValue = parseFloat(balanceInput.replace(",", "."));
    const balanceChanged = !isNaN(newBalanceValue) && Math.abs(newBalanceValue - balance) > 0.01;

    async function confirmBalance() {
        if (!balanceChanged) return;

        setSaving(true);
        setError("");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSaving(false);
            return;
        }

        const difference = newBalanceValue - balance;

        const { error: insertError } = await supabase.from("transactions").insert({
            user_id: user.id,
            category_id: null,
            type: difference >= 0 ? "income" : "expense",
            amount: Math.abs(difference),
            description: "Коригування балансу",
            date: new Date().toISOString().slice(0, 10),
        });

        if (insertError) {
            setError("Не вдалося оновити баланс");
            setSaving(false);
            return;
        }

        await loadBalance();
        await loadMonthData();
        window.dispatchEvent(new Event("balance:refresh"));
        setSaving(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    let maxItemAmount = 0;
    for (const item of items) {
        if (item.amount > maxItemAmount) {
            maxItemAmount = item.amount;
        }
    }

    return (
        <div className="app">
            <header>
                <div className="logo">
                    <img src={logo} alt="logo" />
                    <h2>InvestIQ</h2>
                </div>
                <div className="user">
                    <p className="user-email">{userEmail}</p>
                    <button onClick={handleLogout} className="user-logout">
                        Вийти
                    </button>
                </div>
            </header>
            <div className="bg"></div>
            <main className="main-content">
                <div className="calc-page">
                    <div className="calc-topbar">
                        <button type="button" className="calc-back" onClick={() => navigate(-1)}>
                            <img src={calcback} alt="" className="calc-back-arrow" />
                            Повернутись на головну
                        </button>

                        <div className="calc-balance-block">
                            <span className="calc-balance-label">Баланс:</span>
                            <div className="calc-balance-input-wrap">
                                <input
                                    className="calc-balance-input"
                                    type="text"
                                    value={balanceInput}
                                    onChange={(e) => setBalanceInput(e.target.value)}
                                />
                                <span className="calc-balance-currency">UAH</span>
                            </div>
                            <button
                                type="button"
                                className="calc-confirm-btn"
                                disabled={!balanceChanged || saving}
                                onClick={confirmBalance}
                            >
                                {saving ? "..." : "ПІДТВЕРДИТИ"}
                            </button>
                        </div>

                        <div className="calc-period-block">
                            <span className="calc-period-label">Поточний період</span>
                            <div className="calc-period-nav">
                                <button type="button" onClick={prevMonth}>‹</button>
                                <span>{MONTHS[month]} {year}</span>
                                <button type="button" onClick={nextMonth}>›</button>
                            </div>
                        </div>
                    </div>

                    {error && <div className="finance-error">{error}</div>}

                    <div className="calc-summary-bar">
                        <span>
                            Витрати: <b className="calc-summary--expense">- {formatAmount(expenseTotal)} грн.</b>
                        </span>
                        <span className="calc-summary-divider" />
                        <span>
                            Доходи: <b className="calc-summary--income">+ {formatAmount(incomeTotal)} грн.</b>
                        </span>
                    </div>

                    <div className="calc-card">
                        <div className="calc-card-header">
                            <button type="button" onClick={() => setActiveType("expense")}>‹</button>
                            <span>{activeType === "expense" ? "ВИТРАТИ" : "ДОХОДИ"}</span>
                            <button type="button" onClick={() => setActiveType("income")}>›</button>
                        </div>

                        {loading && <div className="finance-status">Завантаження…</div>}

                        {!loading && categories.length === 0 && (
                            <div className="finance-status">Немає даних за цей період</div>
                        )}

                        {!loading && categories.length > 0 && (
                            <div className="calc-categories-grid">
                                {categories.map((c) => (
                                    <div
                                        className={
                                            c.name === selectedCategory
                                                ? "calc-category calc-category--active"
                                                : "calc-category"
                                        }
                                        key={c.name}
                                        onClick={() =>
                                            setSelectedCategory(selectedCategory === c.name ? null : c.name)
                                        }
                                    >
                                        <div className="calc-category-amount">{formatAmount(c.amount)}</div>
                                        <div className="calc-category-icon">{getIcon(c.name)}</div>
                                        <div className="calc-category-name">{c.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="calc-card">
                        {loading && <div className="finance-status">Завантаження…</div>}

                        {!loading && items.length === 0 && (
                            <div className="finance-status">Немає даних за цей період</div>
                        )}

                        {!loading && items.length > 0 && (
                            <div className="calc-chart">
                                {items.map((item, index) => (
                                    <div
                                        className={
                                            selectedCategory && item.category !== selectedCategory
                                                ? "calc-chart-bar calc-chart-bar--dimmed"
                                                : "calc-chart-bar"
                                        }
                                        key={item.description}
                                    >
                                        <div className="calc-chart-value">{formatAmount(item.amount)} грн</div>
                                        <div
                                            className={
                                                index % 3 === 0
                                                    ? "calc-chart-fill calc-chart-fill--strong"
                                                    : "calc-chart-fill"
                                            }
                                            style={{
                                                "--fill": maxItemAmount
                                                    ? (item.amount / maxItemAmount) * 100 + "%"
                                                    : "6%",
                                            } as any}
                                        />
                                        <div className="calc-chart-label">{item.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
