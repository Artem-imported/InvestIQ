import { useState } from "react";
import { signIn, signUp, signInGoogle } from "../api/auth";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import google from "../images/google.png"
import backB from "../images/back-login.png"
import backM from "../images/back-login2.png"

export default function Login() {
    const navigate = useNavigate();
    const [register, setRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit() {
        if (register) {
            const { error } = await signUp(email, password);
            if (error) {
                alert(error.message);
                return;
            }
            alert("Проверь почту для подтверждения.");
            return;
        }
        const { error } = await signIn(email, password);
        if (error) {
            alert(error.message);
            return;
        }
        navigate("/income");
    }
    return (
        <div className="login">
            
            <header>
                <div className="logo">
                    <img src={logo} alt="logo" />
                    <h2>InvestIQ</h2>
                </div>
            </header>
            <div className="bg"></div>
            <main>
                <section className="hero">
                    <h1>InvestIQ</h1>
                    <p>SMART FINANCE</p>
                </section>

                <section className="card">
                    <p className="card-text">Ви можете авторизуватися за допомогою акаунта Google</p>
                    <div className="google-div">
                        <button
                            className="google-btn"
                            onClick={() => signInGoogle()}
                        >
                            <img className="google-img" src={google}></img>
                            oogle
                        </button>
                    </div>
                    
                    <p className="card-text">Або увійти за допомогою ел. пошти та паролю після реєстрації</p>
                    <p className="card-text2">Електронна пошта:</p>
                    <input
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="card-text2">Пароль:</p>
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="buttons">
                        <button
                            className="orange"
                            onClick={handleSubmit}
                        >
                            {register ? "Pеєстрація" : "Увійти"}
                        </button>
                        <button
                            className="gray"
                            onClick={() => setRegister(!register)}
                        >
                            {register ? "Увійти" : "Реєстрація"}
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}