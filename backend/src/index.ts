// src/index.ts

// 1. Import our "toolbox"
//
// We've changed the imports for 'express' and 'dotenv'
// to the "namespace import" style (import * as ...).
// This is a safer way to import old CommonJS libraries.
import cors from 'cors'; // Import it
import express = require('express');
import { Express, Request, Response } from 'express'; // We can still import types!
import * as dotenv from 'dotenv';

import { supabase } from './lib/supabaseClient';
import authRoutes from './routes/authRoutes';
import documentRoutes from './routes/documentRoutes';

// 2. Load the "locked drawer" (.env file)
//    Notice we now call it as 'dotenv.config()'
dotenv.config();

// 3. The "Librarian" reports for duty
//    The 'express()' function is now the "default" export
//    that TypeScript's "esModuleInterop" *would* have made.
//    (This part might still fail if tsconfig isn't read,
//    but the import itself is now correct.)
const app: Express = express();

// 4. Define the "extension number" (Port) for our front desk
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
// 5. Create our first "window" (a Route)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'MemoryVault backend is running!' 
  });
});

app.get('/api/supabase-test', async (req: Request, res: Response) => {
  try {
    // CHANGED: We are now querying our actual 'profiles' table.
    // We just want to see if we can read from it without error.
    // .limit(1) just means "give me just one row if you have any".
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      message: 'Supabase connection successful!',
      // If this is an empty array [], that's GOOD! It means we connected,
      // found the table, and confirmed it has no data yet.
      data: data
    });

  } catch (error: any) {
    console.error('Supabase test error:', error.message);
    res.status(500).json({ message: 'Connection failed', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
// 6. "Open" the library
app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
  console.log(`[server]: Health check available at http://localhost:${PORT}/api/health`);
});