import { Outlet, NavLink } from "react-router-dom";
import logo from "../images/logo.png";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase";

export default function Layout() {
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || "");
        };

        getUser();

        // Подписка на изменения авторизации (рекомендуется)
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            setUserEmail(session?.user?.email || "");
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // После выхода Supabase автоматически редиректит или можно вручную:
        window.location.href = '/login'; // или используй navigate из react-router
    };

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
                <div className="bg"></div>
                <div className="bg2"></div>
                <NavLink to="/expenses">ВИТРАТИ</NavLink>
                <NavLink to="/income" end>ДОХІД</NavLink>
                <Outlet />
            </main>
        </div>
    );
}