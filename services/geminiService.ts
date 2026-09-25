import { GeminiBookAnalysis } from '../types';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract only base64 without prefix if needed, or preserve
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export async function classifyImageWithGemini(base64Image: string, mimeType = 'image/jpeg'): Promise<GeminiBookAnalysis[]> {
  try {
    const groqKey = typeof localStorage !== 'undefined' ? (localStorage.getItem('biblio_groq_api_key') || '') : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (groqKey) headers['x-groq-api-key'] = groqKey;

    const response = await fetch('/api/classify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
        groqApiKey: groqKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // Ignored
      }
      throw new Error(errorJson?.error || errorJson?.message || `Error del servidor de clasificación (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Formato de respuesta no reconocido por el clasificador.');
    }

    return data as GeminiBookAnalysis[];
  } catch (error: any) {
    console.error('Error en classifyImageWithGemini:', error);
    throw error;
  }
}
