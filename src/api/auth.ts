import { supabase } from "../supabase/supabase";

export const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({
        email,
        password,
    });
};

export const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
        email,
        password,
    });
};

export const signOut = async () => {
    return await supabase.auth.signOut();
};

export const signInGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
        provider: "google",
    });
};

export const getUser = async () => {
    return await supabase.auth.getUser();
};