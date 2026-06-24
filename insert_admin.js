import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function insertAdmin() {
  console.log("Inserting admin...");
  const { data, error } = await supabase.from('app_users').insert([{
    email: 'admin@iptv.com',
    phone: '+201112338271',
    password: 'Admin@123',
    plan_id: 'premium',
    payment_status: 'active'
  }]).select('*');
  
  console.log("Result:", data);
  if (error) console.log("Error:", error);
}

insertAdmin();
