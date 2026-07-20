import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabase';
import '../index.css';
import deleteIcon from '../images/delete.png';
type CategoryType = 'income' | 'expense';

interface Transaction {
    id: string;
    user_id: string;
    category_id: string | null;
    type: CategoryType;
    amount: number;
    description: string | null;
    date: string; 
    created_at: string;
    categories?: { name: string } | null; 
}

interface MonthSummary {
    key: string;
    label: string;
    total: number;
}

const UKR_MONTHS = [
    'СІЧЕНЬ', 'ЛЮТИЙ', 'БЕРЕЗЕНЬ', 'КВІТЕНЬ', 'ТРАВЕНЬ', 'ЧЕРВЕНЬ',
    'ЛИПЕНЬ', 'СЕРПЕНЬ', 'ВЕРЕСЕНЬ', 'ЖОВТЕНЬ', 'ЛИСТОПАД', 'ГРУДЕНЬ',
];

const INCOME_CATEGORIES = [
    'Зарплата',
    'Фріланс',
    'Подарунки',
    'Інвестиції',
    'Премія',
    'Оренда',
    'Продаж речей',
    'Кешбек',
    'Повернення боргу',
    'Інше',
];

const MIN_VISIBLE_ROWS = 8;

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

function formatAmount(value: number): string {
    const fixed = Math.abs(value).toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${withSpaces}.${decPart}`;
}

export default function Income() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [date, setDate] = useState(todayISO());
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData.user) throw new Error('Не вдалося визначити користувача');

            const { data: txs, error: txsError } = await supabase
                .from('transactions')
                .select('*, categories(name)')
                .eq('user_id', userData.user.id)
                .eq('type', 'income')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (txsError) throw txsError;

            setTransactions((txs as Transaction[]) ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка завантаження даних');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleClear = () => {
        setDate(todayISO());
        setDescription('');
        setCategory('');
        setAmount('');
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numericAmount = parseFloat(amount.replace(',', '.'));

        if (!description.trim() || !category || !numericAmount || numericAmount <= 0) {
            setError('Заповніть опис, категорію та суму');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData.user) throw new Error('Не вдалося визначити користувача');

            const { data: existingCategory } = await supabase
                .from('categories')
                .select('id')
                .eq('user_id', userData.user.id)
                .eq('name', category)
                .eq('type', 'income')
                .maybeSingle();

            let categoryId: string;

            if (existingCategory) {
                categoryId = existingCategory.id;
            } else {
                const { data: newCategory, error: categoryError } = await supabase
                    .from('categories')
                    .insert({ user_id: userData.user.id, name: category, type: 'income' })
                    .select()
                    .single();

                if (categoryError) throw categoryError;
                categoryId = newCategory.id;
            }

            const { error: insertError } = await supabase.from('transactions').insert({
                user_id: userData.user.id,
                category_id: categoryId,
                type: 'income',
                amount: numericAmount,
                description: description.trim(),
                date,
            });

            if (insertError) throw insertError;

            handleClear();
            await loadData();
            window.dispatchEvent(new Event('balance:refresh'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося зберегти запис');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setError(null);
        const previous = transactions;
        setTransactions((prev) => prev.filter((t) => t.id !== id));

        const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
        if (deleteError) {
            setError('Не вдалося видалити запис');
            setTransactions(previous); 
        } else {
            window.dispatchEvent(new Event('balance:refresh'));
        }
    };

    const monthlySummary: MonthSummary[] = useMemo(() => {
        const totals = new Map<string, number>();
        for (const t of transactions) {
            const [y, m] = t.date.split('-');
            const key = `${y}-${m}`;
            const signed = t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount);
            totals.set(key, (totals.get(key) ?? 0) + signed);
        }
        return Array.from(totals.entries())
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([key, total]) => {
                const monthIndex = parseInt(key.split('-')[1], 10) - 1;
                return { key, label: UKR_MONTHS[monthIndex] ?? key, total };
            });
    }, [transactions]);

    const fillerRows = Math.max(0, MIN_VISIBLE_ROWS - transactions.length);

    return (
        <div className="finance-card">
            <form className="finance-toolbar" onSubmit={handleSubmit}>
                <label>
                    <span className="finance-icon"></span>
                    <input
                        className="finance-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                    
                </label>
                <div className="finance-toolbar-block">
                    <input
                        type="text"
                        placeholder="Опис доходу"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="finance-details"
                    />

                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="finance-select">
                        <option value="" disabled>
                            Категорія доходу
                        </option>
                        {INCOME_CATEGORIES.map((name) => (
                            <option key={name} value={name} className="finance-category">
                                {name}
                            </option>
                        ))}
                    </select>

                    <label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="finance-money"
                        />
                        <span className="finance-icon" aria-hidden="true"></span>
                    </label>
                </div>
                

                <button type="submit" className="finance-btn finance-btn--primary" disabled={submitting}>
                    {submitting ? '...' : 'ВВЕСТИ'}
                </button>
                <button type="button" className="finance-btn finance-btn--ghost" onClick={handleClear}>
                    ОЧИСТИТИ
                </button>
            </form>

            {error && <div className="finance-error" role="alert">{error}</div>}

            <div className="finance-body">
                <div className="finance-table-wrap">
                    <table className="finance-table">
                        <colgroup>
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '200px' }} />
                            <col style={{ width: '172px' }} />
                            <col style={{ width: '104px' }} />
                            <col style={{ width: '120px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>ДАТА</th>
                                <th>ОПИС</th>
                                <th>КАТЕГОРІЯ</th>
                                <th>СУМА</th>
                                <th aria-hidden="true" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="finance-status">Завантаження…</td>
                                </tr>
                            ) : (
                                <>
                                    {transactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{formatDateDisplay(t.date)}</td>
                                            <td>{t.description}</td>
                                            <td>{t.categories?.name ?? '—'}</td>
                                            <td
                                                className={
                                                    t.type === 'expense'
                                                        ? 'finance-amount finance-amount--expense'
                                                        : 'finance-amount finance-amount--income'
                                                }
                                            >
                                                {t.type === 'expense' ? '- ' : '+ '}
                                                {formatAmount(t.amount)} грн.
                                            </td>
                                            <td className="finance-delete">
                                                <button
                                                    type="button"
                                                    className="finance-delete-btn"
                                                    onClick={() => handleDelete(t.id)}
                                                    aria-label="Видалити запис"
                                                >
                                                    <img src={deleteIcon} alt="Видалити" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="finance-status">Ще немає жодного запису</td>
                                        </tr>
                                    )}

                                    {Array.from({ length: fillerRows }).map((_, i) => (
                                        <tr key={`filler-${i}`} className="finance-row--empty">
                                            <td colSpan={5} />
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <aside className="finance-summary">
                    <div className="finance-summary__header">ЗВЕДЕННЯ</div>
                    <ul className="finance-summary__list">
                        {monthlySummary.length === 0 && (
                            <li className="finance-summary__empty">Немає даних</li>
                        )}
                        {monthlySummary.map((m) => (
                            <li key={m.key}>
                                <span>{m.label}</span>
                                <span>+ {formatAmount(m.total)}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </div>
    );
}