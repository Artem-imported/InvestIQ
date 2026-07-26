import { Outlet, NavLink } from "react-router-dom";
import logo from "../images/logo.png";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase";
import Balance from "../components/Balance";
import revelicon from "../images/revelicon.png";

export default function Layout() {
    const [userEmail, setUserEmail] = useState("");

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login'; 
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
                <div className="content">
                    <div className="main-top">
                        <div className="main-top-balance">
                            <Balance />
                        </div>
                        <NavLink to="/revel" className="main-top-gotorevel">
                            <p>Перейти до розрахунків</p>
                            <img src={revelicon} alt="arrow" />
                        </NavLink>
                    </div>
                    <div className="exin">
                        <div className="exin-btns">
                            <NavLink className={({ isActive }) => isActive ? "exin-btn exin-btn-active" : "exin-btn"} to="/expenses">
                                ВИТРАТИ
                            </NavLink>
                            <NavLink className={({ isActive }) => isActive ? "exin-btn exin-btn-active" : "exin-btn"} to="/income">
                                ДОХІД
                            </NavLink>
                        </div>
                        <Outlet />
                    </div>
                </div>
                
            </main>
        </div>
    );
}