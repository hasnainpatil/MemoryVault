// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; // <-- NEW IMPORT

// 1. Load environment variables IMMEDIATELY in this file too.
//    This prevents the "race condition" where this file is imported
//    before the main index.ts has finished loading secrets.
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: SUPABASE_URL");
}
if (!supabaseKey) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

console.log('[server]: Supabase client initialized.');