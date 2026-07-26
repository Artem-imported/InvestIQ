import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import { supabase } from "../supabase/supabase";

const MONTHS = [
    "СІЧЕНЬ", "ЛЮТИЙ", "БЕРЕЗЕНЬ", "КВІТЕНЬ", "ТРАВЕНЬ", "ЧЕРВЕНЬ",
    "ЛИПЕНЬ", "СЕРПЕНЬ", "ВЕРЕСЕНЬ", "ЖОВТЕНЬ", "ЛИСТОПАД", "ГРУДЕНЬ",
];

const ICONS: Record<string, string> = {
    "Транспорт": "🚗",
    "Продукти": "🛒",
    "Здоров’я": "❤️",
    "Алкоголь": "🍸",
    "Розваги": "🪁",
    "Все для дому": "🛋️",
    "Техніка": "🔧",
    "Комуналка, зв’язок": "🧾",
    "Спорт, хобі": "🏋️",
    "Навчання": "📖",
    "Зарплата": "💌",
    "Фріланс": "💻",
    "Подарунки": "🎁",
    "Інвестиції": "📈",
    "Премія": "🏅",
    "Оренда": "🏠",
    "Продаж речей": "🛍️",
    "Кешбек": "💳",
    "Повернення боргу": "🤝",
    "Інше": "➕",
    "Без категорії": "🔹",
};

function getIcon(name: string) {
    return ICONS[name] || "🔹";
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
    const [items, setItems] = useState<{ description: string; amount: number }[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // юзер для хедера
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || "");
        };

        getUser();

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            setUserEmail(session?.user?.email || "");
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    // считаем баланс по всем транзакціях користувача
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

    // слухаємо подію з інших сторінок, щоб баланс теж оновився
    useEffect(() => {
        window.addEventListener("balance:refresh", loadBalance);
        return () => window.removeEventListener("balance:refresh", loadBalance);
    }, []);

    // дані за обраний місяць: суми і розбивка по категоріях/описах
    async function loadMonthData() {
        setLoading(true);
        setError("");

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
            return { description: description, amount: itemMap[description] };
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

            <main className="main-content">
                <div className="calc-page">
                    <div className="calc-topbar">
                        <button type="button" className="calc-back" onClick={() => navigate(-1)}>
                            <span className="calc-back-arrow">←</span>
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
                                    <div className="calc-category" key={c.name}>
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
                                    <div className="calc-chart-bar" key={item.description}>
                                        <div className="calc-chart-value">{formatAmount(item.amount)} грн</div>
                                        <div
                                            className={
                                                index % 3 === 0
                                                    ? "calc-chart-fill calc-chart-fill--strong"
                                                    : "calc-chart-fill"
                                            }
                                            style={{
                                                height: maxItemAmount
                                                    ? (item.amount / maxItemAmount) * 100 + "%"
                                                    : "6%",
                                            }}
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






















































// import { useEffect, useState } from "react";
// import logo from "../images/logo.png";
// import { supabase } from "../supabase/supabase";

// export default function Revel(){
//     const [userEmail, setUserEmail] = useState("");

//     useEffect(() => {
//         const getUser = async () => {
//             const { data: { user } } = await supabase.auth.getUser();
//             setUserEmail(user?.email || "");
//         };

//         getUser();

//         const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
//             setUserEmail(session?.user?.email || "");
//         });

//         return () => listener.subscription.unsubscribe();
//     }, []);
    
//     const handleLogout = async () => {
//         await supabase.auth.signOut();
//         window.location.href = '/login'; 
//     };

//     return(
//         <div className="app">
//             <header>
//                 <div className="logo">
//                     <img src={logo} alt="logo" />
//                     <h2>InvestIQ</h2>
//                 </div>
//                 <div className="user">
//                     <p className="user-email">{userEmail}</p>
//                     <button onClick={handleLogout} className="user-logout">
//                         Вийти
//                     </button>
//                 </div>
//             </header>


//         </div>
//     )
// }










































// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from '../supabase/supabase';
// import '../index.css';
 
// type CategoryType = 'income' | 'expense';
 
// interface RawTransaction {
//     type: CategoryType;
//     amount: number;
//     description: string | null;
//     categories?: { name: string } | null;
// }
 
// interface CategorySummary {
//     name: string;
//     amount: number;
// }
 
// interface DescriptionSummary {
//     description: string;
//     amount: number;
// }
 
// const UKR_MONTHS = [
//     'СІЧЕНЬ', 'ЛЮТИЙ', 'БЕРЕЗЕНЬ', 'КВІТЕНЬ', 'ТРАВЕНЬ', 'ЧЕРВЕНЬ',
//     'ЛИПЕНЬ', 'СЕРПЕНЬ', 'ВЕРЕСЕНЬ', 'ЖОВТЕНЬ', 'ЛИСТОПАД', 'ГРУДЕНЬ',
// ];
 
// const CATEGORY_ICONS: Record<string, string> = {
//     'Транспорт': '',
//     'Продукти': '',
//     'Здоров’я': '',
//     'Алкоголь': '',
//     'Розваги': '',
//     'Все для дому': '',
//     'Техніка': '',
//     'Комуналка, зв’язок': '',
//     'Спорт, хобі': '',
//     'Навчання': '',
//     'Зарплата': '',
//     'Фріланс': '',
//     'Подарунки': '',
//     'Інвестиції': '',
//     'Премія': '',
//     'Оренда': '',
//     'Продаж речей': '',
//     'Кешбек': '',
//     'Повернення боргу': '',
//     'Інше': '',
//     'Без категорії': '',
// };
 
// function categoryIcon(name: string): string {
//     return CATEGORY_ICONS[name] ?? '';
// }
 
// function formatAmount(value: number): string {
//     const fixed = Math.abs(value).toFixed(2);
//     const [intPart, decPart] = fixed.split('.');
//     const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
//     return `${withSpaces}.${decPart}`;
// }
 
// function daysInMonth(year: number, monthIndex: number): number {
//     return new Date(year, monthIndex + 1, 0).getDate();
// }
 
// function pad(n: number): string {
//     return n < 10 ? `0${n}` : `${n}`;
// }
 
// function todayISO(): string {
//     return new Date().toISOString().slice(0, 10);
// }
 
// export default function Calculations() {
    // const navigate = useNavigate();
 
    // const now = new Date();
    // const [month, setMonth] = useState(now.getMonth());
    // const [year, setYear] = useState(now.getFullYear());
    // const [activeType, setActiveType] = useState<CategoryType>('expense');
 
    // const [balance, setBalance] = useState<number | null>(null);
    // const [balanceInput, setBalanceInput] = useState('');
    // const [savingBalance, setSavingBalance] = useState(false);
 
    // const [periodTotals, setPeriodTotals] = useState({ expense: 0, income: 0 });
    // const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
    // const [descriptionSummaries, setDescriptionSummaries] = useState<DescriptionSummary[]>([]);
    // const [loading, setLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null);
 
    // const loadBalance = useCallback(async () => {
    //     const { data: userData } = await supabase.auth.getUser();
    //     if (!userData.user) return;
 
    //     const { data } = await supabase
    //         .from('transactions')
    //         .select('type, amount')
    //         .eq('user_id', userData.user.id);
 
    //     const total = (data ?? []).reduce((sum, t) => {
    //         return sum + (t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount));
    //     }, 0);
 
    //     setBalance(total);
    //     setBalanceInput(total.toFixed(2));
    // }, []);
 
    // const loadPeriodData = useCallback(async () => {
    //     setLoading(true);
    //     setError(null);
    //     try {
    //         const { data: userData, error: userError } = await supabase.auth.getUser();
    //         if (userError || !userData.user) throw new Error('Не вдалося визначити користувача');
 
    //         const from = `${year}-${pad(month + 1)}-01`;
    //         const to = `${year}-${pad(month + 1)}-${pad(daysInMonth(year, month))}`;
 
    //         const { data, error: txError } = await supabase
    //             .from('transactions')
    //             .select('type, amount, description, categories(name)')
    //             .eq('user_id', userData.user.id)
    //             .gte('date', from)
    //             .lte('date', to);
 
    //         if (txError) throw txError;
 
    //         const txs = (data ?? []) as unknown as RawTransaction[];
 
    //         const totals = { expense: 0, income: 0 };
    //         const byCategory = new Map<string, number>();
    //         const byDescription = new Map<string, number>();
 
    //         for (const t of txs) {
    //             const abs = Math.abs(t.amount);
    //             totals[t.type] += abs;
 
    //             if (t.type === activeType) {
    //                 const catName = t.categories?.name ?? 'Без категорії';
    //                 byCategory.set(catName, (byCategory.get(catName) ?? 0) + abs);
 
    //                 const descName = t.description?.trim() || catName;
    //                 byDescription.set(descName, (byDescription.get(descName) ?? 0) + abs);
    //             }
    //         }
 
    //         setPeriodTotals(totals);
    //         setCategorySummaries(
    //             Array.from(byCategory.entries())
    //                 .map(([name, amount]) => ({ name, amount }))
    //                 .sort((a, b) => b.amount - a.amount)
    //         );
    //         setDescriptionSummaries(
    //             Array.from(byDescription.entries())
    //                 .map(([description, amount]) => ({ description, amount }))
    //                 .sort((a, b) => b.amount - a.amount)
    //                 .slice(0, 10)
    //         );
    //     } catch (err) {
    //         setError(err instanceof Error ? err.message : 'Помилка завантаження даних');
    //     } finally {
    //         setLoading(false);
    //     }
    // }, [month, year, activeType]);
 
    // useEffect(() => {
    //     loadBalance();
    // }, [loadBalance]);
 
    // useEffect(() => {
    //     loadPeriodData();
    // }, [loadPeriodData]);
 
    // useEffect(() => {
    //     const refresh = () => loadBalance();
    //     window.addEventListener('balance:refresh', refresh);
    //     return () => window.removeEventListener('balance:refresh', refresh);
    // }, [loadBalance]);
 
    // const handlePrevMonth = () => {
    //     if (month === 0) {
    //         setMonth(11);
    //         setYear((y) => y - 1);
    //     } else {
    //         setMonth((m) => m - 1);
    //     }
    // };
 
    // const handleNextMonth = () => {
    //     if (month === 11) {
    //         setMonth(0);
    //         setYear((y) => y + 1);
    //     } else {
    //         setMonth((m) => m + 1);
    //     }
    // };
 
    // const balanceDirty =
    //     balance !== null &&
    //     balanceInput.trim() !== '' &&
    //     Math.abs(parseFloat(balanceInput.replace(',', '.')) - balance) > 0.001;
 
    // const handleConfirmBalance = async () => {
    //     if (!balanceDirty || balance === null) return;
    //     const newValue = parseFloat(balanceInput.replace(',', '.'));
    //     if (Number.isNaN(newValue)) return;
 
    //     setSavingBalance(true);
    //     setError(null);
    //     try {
    //         const { data: userData, error: userError } = await supabase.auth.getUser();
    //         if (userError || !userData.user) throw new Error('Не вдалося визначити користувача');
 
    //         const delta = newValue - balance;
 
    //         const { error: insertError } = await supabase.from('transactions').insert({
    //             user_id: userData.user.id,
    //             category_id: null,
    //             type: delta >= 0 ? 'income' : 'expense',
    //             amount: Math.abs(delta),
    //             description: 'Коригування балансу',
    //             date: todayISO(),
    //         });
 
    //         if (insertError) throw insertError;
 
    //         await loadBalance();
    //         await loadPeriodData();
    //         window.dispatchEvent(new Event('balance:refresh'));
    //     } catch (err) {
    //         setError(err instanceof Error ? err.message : 'Не вдалося оновити баланс');
    //     } finally {
    //         setSavingBalance(false);
    //     }
    // };
 
    // const maxDescriptionAmount = useMemo(
    //     () => descriptionSummaries.reduce((max, d) => Math.max(max, d.amount), 0),
    //     [descriptionSummaries]
    // );
 
//     return (
//         <div className="calc-page">
//             <div className="calc-topbar">
//                 <button type="button" className="calc-back" onClick={() => navigate(-1)}>
//                     <span className="calc-back-arrow">←</span>
//                     Повернутись на головну
//                 </button>
 
                // <div className="calc-balance-block">
                //     <span className="calc-balance-label">Баланс:</span>
                //     <div className="calc-balance-input-wrap">
                //         <input
                //             className="calc-balance-input"
                //             type="text"
                //             inputMode="decimal"
                //             value={balanceInput}
                //             onChange={(e) => setBalanceInput(e.target.value)}
                //         />
                //         <span className="calc-balance-currency">UAH</span>
                //     </div>
                //     <button
                //         type="button"
                //         className="calc-confirm-btn"
                //         disabled={!balanceDirty || savingBalance}
                //         onClick={handleConfirmBalance}
                //     >
                //         {savingBalance ? '...' : 'ПІДТВЕРДИТИ'}
                //     </button>
                // </div>
 
//                 <div className="calc-period-block">
//                     <span className="calc-period-label">Поточний період</span>
//                     <div className="calc-period-nav">
//                         <button type="button" onClick={handlePrevMonth} aria-label="Попередній місяць">‹</button>
//                         <span>{UKR_MONTHS[month]} {year}</span>
//                         <button type="button" onClick={handleNextMonth} aria-label="Наступний місяць">›</button>
//                     </div>
//                 </div>
//             </div>
 
//             {error && <div className="finance-error" role="alert">{error}</div>}
 
//             <div className="calc-summary-bar">
//                 <span>
//                     Витрати: <b className="calc-summary--expense">- {formatAmount(periodTotals.expense)} грн.</b>
//                 </span>
//                 <span className="calc-summary-divider" />
//                 <span>
//                     Доходи: <b className="calc-summary--income">+ {formatAmount(periodTotals.income)} грн.</b>
//                 </span>
//             </div>
 
//             <div className="calc-card">
//                 <div className="calc-card-header">
//                     <button type="button" onClick={() => setActiveType('expense')} aria-label="Показати витрати">
//                         ‹
//                     </button>
//                     <span>{activeType === 'expense' ? 'ВИТРАТИ' : 'ДОХОДИ'}</span>
//                     <button type="button" onClick={() => setActiveType('income')} aria-label="Показати доходи">
//                         ›
//                     </button>
//                 </div>
 
//                 {loading ? (
//                     <div className="finance-status">Завантаження…</div>
//                 ) : categorySummaries.length === 0 ? (
//                     <div className="finance-status">Немає даних за цей період</div>
//                 ) : (
//                     <div className="calc-categories-grid">
//                         {categorySummaries.map((c) => (
//                             <div className="calc-category" key={c.name}>
//                                 <div className="calc-category-amount">{formatAmount(c.amount)}</div>
//                                 <div className="calc-category-icon">{categoryIcon(c.name)}</div>
//                                 <div className="calc-category-name">{c.name}</div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
 
//             <div className="calc-card">
//                 {loading ? (
//                     <div className="finance-status">Завантаження…</div>
//                 ) : descriptionSummaries.length === 0 ? (
//                     <div className="finance-status">Немає даних за цей період</div>
//                 ) : (
//                     <div className="calc-chart">
//                         {descriptionSummaries.map((d, i) => (
//                             <div className="calc-chart-bar" key={d.description}>
//                                 <div className="calc-chart-value">{formatAmount(d.amount)} грн</div>
//                                 <div
//                                     className={
//                                         i % 3 === 0
//                                             ? 'calc-chart-fill calc-chart-fill--strong'
//                                             : 'calc-chart-fill'
//                                     }
//                                     style={{
//                                         height: maxDescriptionAmount
//                                             ? `${Math.max(6, (d.amount / maxDescriptionAmount) * 100)}%`
//                                             : '6%',
//                                     }}
//                                 />
//                                 <div className="calc-chart-label">{d.description}</div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }