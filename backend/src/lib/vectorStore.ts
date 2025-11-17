// src/lib/vectorStore.ts

import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HumanMessage } from "@langchain/core/messages"; // This will now work

// --- 1. INITIALIZE ALL OUR AI TOOLS ---

// The "Embedder" (Turns text into 768-dim vectors)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004",
  apiKey: process.env.GOOGLE_API_KEY,
});

// The "Vector DB Connector"
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// The "Chat Brain" (Generates answers AND reads PDFs)
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", // Our fast, reliable model
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

// --- 2. THE INGESTION FUNCTION ---

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function embedDocument(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  documentId: number
) {
  try {
    console.log(`[AI] Starting embedding for doc ${documentId} using Google Gemini...`);

    // --- STEP A: EXTRACT TEXT (THE DIRECT AI WAY) ---
    let rawText = "";

    if (fileType === "application/pdf") {
      console.log("[AI] Sending PDF to Google SDK for extraction...");
      
      // 1. We select the "Flash" model for this task
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // 2. We convert our file buffer to a Base64 string
      const base64pdf = fileBuffer.toString("base64");

      // 3. We build the "prompt" with the PDF data
      const prompt = "Extract all text from this PDF document. Only return the raw text.";
      const filePart = {
        inlineData: {
          data: base64pdf,
          mimeType: "application/pdf",
        },
      };

      // 4. We call the Google SDK directly
      const result = await model.generateContent([prompt, filePart]);
      const response = await result.response;
      rawText = response.text();

    } else {
      // It's already text (txt or md)
      rawText = fileBuffer.toString("utf-8");
    }

    if (!rawText.trim()) {
      throw new Error("Failed to extract any text from document. It might be an image-only PDF.");
    }
    console.log("[AI] Successfully extracted text.");

    // --- STEP B: CHUNK THE TEXT (LangChain) ---
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

    // --- STEP D: EMBED & STORE (LangChain) ---
    const index = pinecone.Index("memoryvault");
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
    });

    console.log(`[AI] Successfully stored chunks in Pinecone.`);

  } catch (error) {
    console.error("Embedding Error:", error);
    throw error;
  }
}

// ... (Keep your 'searchSimilarDocuments' and 'generateAnswer' functions as they are) ...
// ... (They correctly use LangChain, which is fine!) ...

// --- 3. THE RETRIEVAL FUNCTION ---

export async function searchSimilarDocuments(
  query: string,
  userId: string,
  limit: number = 3
) {
  try {
    console.log(`[AI] Searching for: "${query}" for user: ${userId}`);
    const index = pinecone.Index("memoryvault");

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // THE 'any' CAST FIX: Bypasses TypeScript version conflicts
    const results = await (vectorStore as any).similaritySearch(query, limit, {
      userId: userId, // The RLS filter
    });

    console.log(`[AI] Found ${results.length} results.`);
    return results;

  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}

// --- 4. THE GENERATION FUNCTION ---

export async function generateAnswer(query: string, userId: string) {
  try {
    const similarDocs = await searchSimilarDocuments(query, userId);

    if (similarDocs.length === 0) {
      return "I couldn't find any information about that in your documents.";
    }

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

    // THE 'any' CAST FIX
    const response = await (llm as any).invoke(prompt);
    return response.content;

  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
}