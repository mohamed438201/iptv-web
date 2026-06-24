import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAdmin() {
  console.log("Checking admin in Supabase...");
  const { data, error } = await supabase.from('app_users').select('*').eq('email', 'admin@iptv.com');
  console.log("Data:", data);
  console.log("Error:", error);
}

checkAdmin();
