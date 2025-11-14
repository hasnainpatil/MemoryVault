// src/lib/vectorStore.ts

// 1. CHANGE: Import Google's Embeddings instead of OpenAI
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import pdf = require('pdf-parse');
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// 2. CHANGE: Initialize Google Embedder
//    Model "text-embedding-004" is their latest, efficient model (768 dims)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004", 
  apiKey: process.env.GOOGLE_API_KEY,
});

// Initialize Pinecone Client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function embedDocument(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  documentId: number
) {
  try {
    console.log(`[AI] Starting embedding for doc ${documentId} using Google Gemini...`);

    // --- STEP A: EXTRACT TEXT ---
    let rawText = "";
    if (fileType === "application/pdf") {
      const data = await pdf(fileBuffer);
      rawText = data.text;
    } else {
      rawText = fileBuffer.toString("utf-8");
    }

    // --- STEP B: CHUNK THE TEXT ---
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([rawText]);

    console.log(`[AI] Split document into ${docs.length} chunks.`);

    // --- STEP C: ADD METADATA ---
    docs.forEach((doc: any) => {
      doc.metadata = {
        userId: userId,
        documentId: documentId,
      };
    });

    // --- STEP D: EMBED & STORE IN PINECONE ---
    const index = pinecone.Index("memoryvault");
    
    // Note: We are sending the Google Embeddings object here
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
    });

    console.log(`[AI] Successfully stored chunks in Pinecone.`);

  } catch (error) {
    console.error("Embedding Error:", error);
    throw error;
  }
}

export async function searchSimilarDocuments(
  query: string,
  userId: string,
  limit: number = 3
) {
  try {
    console.log(`[AI] Searching for: "${query}" for user: ${userId}`);

    const index = pinecone.Index("memoryvault");

    // 1. Setup the Vector Store
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // 2. Perform the Search
    //    FIX: We cast to 'any' to bypass the version conflict error.
    //    We know 'similaritySearch' exists at runtime.
    const results = await (vectorStore as any).similaritySearch(query, limit, {
      userId: userId, // <--- THIS IS OUR SECURITY FILTER
    });

    console.log(`[AI] Found ${results.length} results.`);
    return results;

  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}

// ... existing searchSimilarDocuments function ...

export async function generateAnswer(query: string, userId: string) {
  try {
    // 1. Initialize the "Analyst" (Gemini Pro)
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",       // FIX 1: Changed from 'modelName' to 'model'
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    });

    // 2. Get the relevant "Books" (Context)
    const similarDocs = await searchSimilarDocuments(query, userId);

    // 3. If no documents found, stop early
    if (similarDocs.length === 0) {
      return "I couldn't find any information about that in your documents.";
    }

    // 4. Prepare the "Briefing" (The Prompt)
    //    FIX 2: We explicitly type '(doc: any)' to satisfy TypeScript
    const contextText = similarDocs.map((doc: any) => doc.pageContent).join("\n\n");

    const prompt = `
      You are a helpful AI assistant named MemoryVault.
      Use the following pieces of context to answer the question at the end.
      If you don't know the answer based on the context, just say you don't know. Do not try to make up an answer.
      
      CONTEXT:
      ${contextText}
      
      QUESTION:
      ${query}
      
      ANSWER:
    `;

    // 5. Ask the Analyst
    //    FIX 3: We cast to 'any' to bypass the 'invoke' type definition mismatch
    const response = await (llm as any).invoke(prompt);

    // 6. Return the answer text
    return response.content;

  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
}