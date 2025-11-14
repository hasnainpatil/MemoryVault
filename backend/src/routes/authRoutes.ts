// src/routes/authRoutes.ts

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient';

// 1. Create a new "Department" (Router)
const router = Router();

// --- WINDOW 1: SIGN UP ---
// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // 1. Get the user's info from the "form" they filled out (req.body)
    const { email, password, fullName } = req.body;

    // 2. Basic validation (don't bother Supabase if data is missing)
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 3. Pass the job to the "Security Office" (Supabase Auth)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // We can attach extra public info to their profile here
        data: { full_name: fullName }
      }
    });

    if (error) throw error;

    // 4. SUCCESS!
    // IMPORTANT: We also need to create a public profile for them.
    // We use the USER ID that Supabase Auth just created for us.
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
           id: data.user.id,
           full_name: fullName || ''
        });

      if (profileError) {
        // If creating the profile fails, we should probably warn them,
        // but the auth user IS created. For now, let's just log it.
        console.error('Error creating profile:', profileError.message);
      }
    }

    res.status(201).json({
      message: 'User registered! Please check your email to confirm.',
      user: data.user
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
});

// --- WINDOW 2: LOG IN ---
// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Ask Supabase to verify these credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // SUCCESS! Send back the "Access Key" (Session with JWT)
    res.status(200).json({
      message: 'Login successful!',
      session: data.session, // <-- THIS IS THE KEY they need for future requests
      user: data.user
    });

  } catch (error: any) {
    res.status(401).json({ message: 'Login failed', error: error.message });
  }
});

// Export the entire department so the main building can use it
export default router;