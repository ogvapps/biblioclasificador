import { GoogleGenAI, Type } from "@google/genai";
import { EducationalStage, LiteraryGenre, GeminiBookAnalysis } from "../types";

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      if (typeof result !== 'string') {
        reject(new Error("Failed to process file"));
        return;
      }
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const classifyImageWithGemini = async (base64Image: string): Promise<GeminiBookAnalysis[]> => {
  
  // ⚠️ CAMBIO 1: Usar la variable correcta para VITE
  // Asegúrate de que en tu .env la variable se llame VITE_GEMINI_API_KEY
  // Truco para evitar error TS2339
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Revisa tu archivo .env y Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const systemPrompt = `
    Eres un bibliotecario experto. Analiza la imagen.
    Identifica CADA libro visible.
     
    Para cada libro, devuelve un objeto JSON con:
    - title (string)
    - author (string)
    - age (número estimado)
    - stage (string, VALORES EXACTOS: "${EducationalStage.INFANTIL}", "${EducationalStage.PRIMARIA_INICIAL}", "${EducationalStage.PRIMARIA_MEDIO}", "${EducationalStage.PRIMARIA_SUPERIOR}", "${EducationalStage.SECUNDARIA}", "${EducationalStage.REFERENCIA}")
    - genre (string, VALORES EXACTOS: "${LiteraryGenre.NOVELA}", "${LiteraryGenre.FANTASIA}", "${LiteraryGenre.MISTERIO}", "${LiteraryGenre.POESIA}", "${LiteraryGenre.INFORMATIVO}", "${LiteraryGenre.BIOGRAFIAS}", "${LiteraryGenre.COMICS}")
    - synopsis (string, resumen breve de 1 párrafo en español)
    - reasoning (string breve)

    IMPORTANTE:
    - Responde SOLAMENTE con el JSON RAW (un Array de objetos).
    - NO uses bloques de código Markdown (\`\`\`json).
    - NO añadas texto introductorio.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // He actualizado al modelo más estable si 2.5 da problemas
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Lista los libros en formato JSON array." }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        // ⚠️ CAMBIO 2: Aumentamos el límite para que NO se corte el texto
        maxOutputTokens: 8192, 
        temperature: 0.7,
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    // ROBUST JSON CLEANING
    let cleanedText = response.text.trim();
    
    // 1. Remove Markdown code blocks if present
    cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '');
    
    // 2. Find the first '[' and last ']' to ignore introductory/closing text
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    } else {
        // Fallback: Try to find a single object '{' if array wasn't returned
        const firstCurly = cleanedText.indexOf('{');
        const lastCurly = cleanedText.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1) {
             cleanedText = `[${cleanedText.substring(firstCurly, lastCurly + 1)}]`;
        }
    }

    let rawResult;
    try {
        rawResult = JSON.parse(cleanedText);
    } catch (parseError) {
        console.error("JSON Parse Error. Cleaned text was:", cleanedText);
        throw new Error("La IA no devolvió un formato válido. Inténtalo de nuevo.");
    }

    const resultsArray = Array.isArray(rawResult) ? rawResult : [rawResult];

    // Validate and fill defaults
    return resultsArray.map((item: any) => ({
      title: item.title || "Sin Título",
      author: item.author || "Desconocido",
      age: typeof item.age === 'number' ? item.age : 0,
      stage: Object.values(EducationalStage).includes(item.stage) ? item.stage : EducationalStage.REFERENCIA,
      genre: Object.values(LiteraryGenre).includes(item.genre) ? item.genre : LiteraryGenre.INFORMATIVO,
      synopsis: item.synopsis || "Sin sinopsis disponible.",
      reasoning: item.reasoning || ""
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Error al procesar la imagen. Por favor, inténtalo de nuevo.");
  }
};
