import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase";

export default function ProtectedRoute({
    children,
}: {
    children: JSX.Element;
}) {
    const [loading, setLoading] = useState(true);
    const [logged, setLogged] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setLogged(!!data.session);
            setLoading(false);
        });
    }, []);

    if (loading) return <h2>Loading...</h2>;

    return logged ? children : <Navigate to="/" replace />;
}