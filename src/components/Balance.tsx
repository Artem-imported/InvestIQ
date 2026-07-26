import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase';
import '../index.css';
 
export default function BalanceEditor() {
    const [balance, setBalance] = useState<number | null>(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [saving, setSaving] = useState(false);
 
    useEffect(() => {
        const loadBalance = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;
 
            const { data } = await supabase
                .from('transactions')
                .select('type, amount')
                .eq('user_id', userData.user.id);
 
            const total = (data ?? []).reduce((sum, t) => {
                return sum + (t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount));
            }, 0);
 
            setBalance(total);
            setBalanceInput(total.toFixed(2));
        };
 
        loadBalance();
 
        window.addEventListener('balance:refresh', loadBalance);
        return () => window.removeEventListener('balance:refresh', loadBalance);
    }, []);
 
    const newValue = parseFloat(balanceInput.replace(',', '.'));
    const changed = balance !== null && !isNaN(newValue) && Math.abs(newValue - balance) > 0.01;
 
    const handleConfirm = async () => {
        if (!changed || balance === null) return;
 
        setSaving(true);
 
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            setSaving(false);
            return;
        }
 
        const difference = newValue - balance;
 
        await supabase.from('transactions').insert({
            user_id: userData.user.id,
            category_id: null,
            type: difference >= 0 ? 'income' : 'expense',
            amount: Math.abs(difference),
            description: 'Коригування балансу',
            date: new Date().toISOString().slice(0, 10),
        });
 
        window.dispatchEvent(new Event('balance:refresh'));
        setSaving(false);
    };
 
    return (
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
                disabled={!changed || saving}
                onClick={handleConfirm}
            >
                {saving ? '...' : 'ПІДТВЕРДИТИ'}
            </button>
        </div>
    );
}