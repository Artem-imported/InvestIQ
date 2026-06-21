import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://khnstwufudzlmobkchwp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobnN0d3VmdWR6bG1vYmtjaHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjU1OTksImV4cCI6MjA5NzU0MTU5OX0.RqJLgED9TdtOx3wt7zGCbplf8aZUK6W5zaJaD4Iv2CA";

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);