import './App.css';
import './index.css';

import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

import Income from "./pages/Income";
import Expenses from "./pages/Expenses";

import Revel from "./pages/Revel";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from './pages/Layout';

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/income" replace />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="income" element={<Income />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
            <Route
                path="/revel"
                element={
                    <ProtectedRoute>
                        <Revel />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}