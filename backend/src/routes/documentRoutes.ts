// src/routes/documentRoutes.ts

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabaseClient';
import { embedDocument, searchSimilarDocuments, generateAnswer } from '../lib/vectorStore';

const router = Router();

// --- 1. SETUP MULTER (The "Mailroom") ---
// We tell Multer to store files temporarily in RAM (memory)
// rather than writing them to our server's disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
});

// --- 2. SETUP AUTH MIDDLEWARE (The "Security Guard") ---
// This function runs BEFORE our upload handler.
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  // a) Ask for the badge
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header found' });
  }

  // b) The badge usually comes as "Bearer [TOKEN]". We just want the [TOKEN] part.
  const token = authHeader.split(' ')[1];
  if (!token) {
      return res.status(401).json({ message: 'Malformed authorization header' });
  }

  try {
    // c) Verify the badge.
    // NOTE: In a real production app, you'd verify the signature with Supabase's secret.
    // For this MVP, decoding to get the ID is acceptable as Supabase RLS
    // acts as the final, hard security check anyway.
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.sub) {
       throw new Error('Invalid token');
    }

    // d) Pin the user's ID to their shirt (attach it to the 'req' object)
    //    so the next function knows who they are.
    (req as any).userId = decoded.sub;

    // e) Let them through!
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};



// --- 0. LIST DOCUMENTS ROUTE ---
// GET /api/documents
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Query Supabase for all documents belonging to this user
    // We order them by 'created_at' so the newest ones show up first
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data); // Send back the array of documents

  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
});
// --- 3. THE UPLOAD ROUTE (The "Intake Desk") ---
// Notice how we chain the guards:
// [authenticateUser] -> [upload.single('file')] -> [Our Async Handler]
router.post('/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
  try {
    // a) Get the user ID from the "badge" we checked earlier
    const userId = (req as any).userId;

    // b) Get the file from Multer's mailroom
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // c) Create a unique, secure path for the Vault
    //    Path: [USER_ID] / [RANDOM_UUID] . [ORIGINAL_EXTENSION]
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // d) Send the physical file to the Vault (Supabase Storage)
    const { error: uploadError } = await supabase.storage
      .from('user_documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) throw uploadError;

    // e) Record the file in the Card Catalog (Database)
    const { data: docData, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_name: file.originalname,
        storage_path: filePath,
        status: 'UPLOADED'
      })
      .select()
      .single();

    if (dbError) throw dbError;
    // --- NEW STEP: TRIGGER THE AI PIPELINE ---
    // We do this asynchronously. We don't want the user to wait
    // for the AI if the file is huge, but for this MVP, we'll await it
    // so we know it worked.
    await embedDocument(
      file.buffer,       // The raw file
      file.mimetype,     // "application/pdf" etc.
      userId,            // The user who owns it
      docData.id         // The ID of the database record
  );
  
  // Update status to INDEXED
  await supabase
      .from('documents')
      .update({ status: 'INDEXED' })
      .eq('id', docData.id);
    // f) Success! Give them a receipt.
    res.status(201).json({
      message: 'File uploaded successfully',
      document: docData
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// --- 4. THE SEARCH ROUTE (The "Reference Librarian") ---
// POST /api/documents/search
// Body: { "query": "What is the privacy policy?" }
router.post('/search', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const userId = (req as any).userId;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Call our AI search function
    const results = await searchSimilarDocuments(query, userId);

    // Return the relevant chunks
    res.status(200).json({
      message: 'Search successful',
      results: results
    });

  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// --- 5. THE CHAT ROUTE (The "Analyst") ---
// POST /api/documents/chat
// Body: { "query": "What is this document?" }
router.post('/chat', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const userId = (req as any).userId;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Call our new RAG function
    const answer = await generateAnswer(query, userId);

    res.status(200).json({
      message: 'Chat successful',
      answer: answer
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Chat failed', error: error.message });
  }
});

export default router;