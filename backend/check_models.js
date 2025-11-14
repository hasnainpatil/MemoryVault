// check_models.js
// Run this with: node check_models.js

// 1. Load the .env file manually
require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("🔍 Checking available models for your API Key...");

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Error:", data.error.message);
      return;
    }

    console.log("✅ SUCCESS! Here are the models you can use:");
    console.log("------------------------------------------------");
    
    // Filter for models that support "generateContent" (Chat)
    const chatModels = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    chatModels.forEach(model => {
      console.log(`Name: ${model.name}`); // This is the string we need!
      console.log(`Desc: ${model.displayName}`);
      console.log("------------------------------------------------");
    });

  } catch (error) {
    console.error("❌ Network Error:", error);
  }
}

listModels();