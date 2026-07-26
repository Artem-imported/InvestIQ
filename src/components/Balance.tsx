import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase';
import '../index.css';
 
export default function Balance() {
    const [balance, setBalance] = useState<number | null>(null);
 
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
        };
 
        loadBalance();
 
        window.addEventListener('balance:refresh', loadBalance);
        return () => window.removeEventListener('balance:refresh', loadBalance);
    }, []);
 
    return (
        <div className="balance-mini">
            <span className="balance-mini__label">Баланс:</span>и 
            <span className={balance !== null && balance < 0 ? 'balance-mini__amount balance-mini__amount--negative' : 'balance-mini__amount'}>
                {balance === null ? '…' : `${balance.toFixed(2)} грн.`}
            </span>
        </div>
    );
}
 