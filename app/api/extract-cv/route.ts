import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY non configurata nel file .env' }, { status: 500 });
    }

    const { text: cvText } = await req.json();

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json({ error: 'Testo del CV non fornito o troppo corto per l\'analisi.' }, { status: 400 });
    }

    // Inizializzazione Groq
    const groq = new Groq({ apiKey });

    const prompt = `
      Sei un analista dati HR esperto. Analizza il seguente testo estratto da un CV e restituisci un oggetto JSON con i dati strutturati.
      
      DATI DA ESTRARRE:
      - firstName (nome)
      - lastName (cognome)
      - email (senza accenti, es. niccolo.verdi@email.com)
      - phone (formato internazionale senza parentesi, es. +393331234567)
      - city (città)
      - province (sigla provincia di 2 lettere, es. MI, RM)
      - seniority (DEVE essere uno di questi valori esatti: "Junior 0-2 anni", "Mid 3-5 anni", "Senior 5+ anni")
      - education (DEVE essere uno di questi valori esatti: "Licenza Media", "Diploma di Maturità", "Laurea Triennale", "Laurea Magistrale", "Master / Dottorato")
      - expectedSalary (RAL stimata o richiesta, solo numero)
      - skills (competenze chiave separate da virgola)
      - notes (un breve riassunto del profilo)

      REGOLE:
      1. Rispondi ESCLUSIVAMENTE con il codice JSON valido.
      2. Non aggiungere spiegazioni o testo prima/dopo il JSON.
      3. Se un dato non è presente, usa una stringa vuota o null per i numeri.
      4. Mantieni i nomi dei campi ESATTAMENTE come indicati sopra.

      TESTO CV:
      ${cvText}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un assistente che risponde esclusivamente in formato JSON."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      stream: false,
      response_format: { type: "json_object" }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return NextResponse.json({ error: 'L\'AI non ha restituito alcun dato.' }, { status: 500 });
    }

    const extractedData = JSON.parse(responseContent);

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    return NextResponse.json({ error: error.message || 'Errore durante l\'estrazione' }, { status: 500 });
  }
}
