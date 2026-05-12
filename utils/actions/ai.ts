"use server";

export async function parseCVAction(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analizza il seguente testo estratto da un CV e restituisci un oggetto JSON con i seguenti campi:
    - firstName: string
    - lastName: string
    - email: string
    - phone: string
    - city: string
    - role: string
    - seniority: string
    - education: string
    - skills: string
    - sector: string
    
    Testo del CV:
    ${text}
    
    Restituisci ESCLUSIVAMENTE il JSON puro.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Errore AI CV Parsing:", error);
    return null;
  }
}
