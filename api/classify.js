export const config = {
    runtime: 'edge',
};

// Mapeos exactos con types.ts
const VALID_STAGES = [
    "Infantil y Preescolar (3-6 años)",
    "Primaria - Ciclo Inicial (6-8 años)",
    "Primaria - Ciclo Medio (8-10 años)",
    "Primaria - Ciclo Superior (10-12 años)",
    "Secundaria Obligatoria (ESO) (12-16 años)",
    "Referencia / Consulta General"
];

const VALID_GENRES = [
    "Novela / Ficción (General)",
    "Fantasía / Ciencia Ficción",
    "Misterio / Suspense",
    "Poesía / Teatro",
    "Informativo / No Ficción",
    "Biografías / Historia",
    "Cómics / Novela Gráfica"
];

const SYSTEM_PROMPT = `Eres un bibliotecario escolar experto en literatura infantil y juvenil española.
Analiza la imagen e identifica CADA libro visible (portada o lomo). Devuelve EXCLUSIVAMENTE un JSON Array válido.

Por cada libro detectado, genera un objeto con EXACTAMENTE estas propiedades:
1. title: (string) Título completo del libro.
2. author: (string) Autor del libro (o "Desconocido").
3. age: (number) Edad recomendada aproximada (ej. 4, 8, 12).
4. stage: (string) UNA de estas opciones EXACTAS según la etapa escolar:
   - "Infantil y Preescolar (3-6 años)"
   - "Primaria - Ciclo Inicial (6-8 años)"
   - "Primaria - Ciclo Medio (8-10 años)"
   - "Primaria - Ciclo Superior (10-12 años)"
   - "Secundaria Obligatoria (ESO) (12-16 años)"
   - "Referencia / Consulta General"
5. genre: (string) UNA de estas opciones EXACTAS:
   - "Novela / Ficción (General)"
   - "Fantasía / Ciencia Ficción"
   - "Misterio / Suspense"
   - "Poesía / Teatro"
   - "Informativo / No Ficción"
   - "Biografías / Historia"
   - "Cómics / Novela Gráfica"
6. synopsis: (string) Breve resumen de 1 o 2 frases en español.
7. reasoning: (string) Breve explicación de por qué elegiste esa etapa y género.

IMPORTANTE:
- Responde SOLO con el JSON Array. Sin bloques de código markdown, sin texto introductorio ni explicaciones.
- Si hay más de un libro en la imagen, cataloga todos los que distingas.`;

function cleanAndParseJSON(rawText) {
    if (!rawText) return [];
    let text = rawText.trim();
    // Eliminar posibles bloques de markdown ```json ... ```
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    // Intentar encontrar el array
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
    } else {
        const firstCurly = text.indexOf('{');
        const lastCurly = text.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1) {
            text = `[${text.substring(firstCurly, lastCurly + 1)}]`;
        }
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        console.warn("Fallo parseando JSON directo:", e);
        return [{
            title: "Libro sin identificar",
            author: "Desconocido",
            age: 8,
            stage: "Referencia / Consulta General",
            genre: "Informativo / No Ficción",
            synopsis: text.substring(0, 200),
            reasoning: "Respuesta no estructurada de la IA"
        }];
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map(item => {
        // Encontrar la etapa más parecida
        let matchedStage = VALID_STAGES.find(s => s.toLowerCase() === (item.stage || '').toLowerCase());
        if (!matchedStage) {
            if (/infantil|preescolar/i.test(item.stage || '')) matchedStage = VALID_STAGES[0];
            else if (/inicial/i.test(item.stage || '')) matchedStage = VALID_STAGES[1];
            else if (/medio/i.test(item.stage || '')) matchedStage = VALID_STAGES[2];
            else if (/superior/i.test(item.stage || '')) matchedStage = VALID_STAGES[3];
            else if (/secundaria|eso/i.test(item.stage || '')) matchedStage = VALID_STAGES[4];
            else matchedStage = VALID_STAGES[5];
        }

        // Encontrar el género más parecido
        let matchedGenre = VALID_GENRES.find(g => g.toLowerCase() === (item.genre || '').toLowerCase());
        if (!matchedGenre) {
            if (/fantas[ií]a|ciencia/i.test(item.genre || '')) matchedGenre = VALID_GENRES[1];
            else if (/misterio|suspense/i.test(item.genre || '')) matchedGenre = VALID_GENRES[2];
            else if (/poes[ií]a|teatro/i.test(item.genre || '')) matchedGenre = VALID_GENRES[3];
            else if (/informativo|no ficci[oó]n/i.test(item.genre || '')) matchedGenre = VALID_GENRES[4];
            else if (/biograf[ií]a|historia/i.test(item.genre || '')) matchedGenre = VALID_GENRES[5];
            else if (/c[oó]mic|novela gr[aá]fica/i.test(item.genre || '')) matchedGenre = VALID_GENRES[6];
            else matchedGenre = VALID_GENRES[0];
        }

        return {
            title: item.title || "Sin título",
            author: item.author || "Desconocido",
            age: typeof item.age === 'number' ? item.age : 8,
            stage: matchedStage,
            genre: matchedGenre,
            synopsis: item.synopsis || "Sin sinopsis disponible.",
            reasoning: item.reasoning || ""
        };
    });
}

// Clasificación usando Google Gemini (2.0 Flash con fallback a 1.5 Flash)
async function classifyWithGemini(apiKey, base64Image, mimeType) {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: mimeType || 'image/jpeg',
                                        data: base64Image
                                    }
                                },
                                { text: SYSTEM_PROMPT }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                lastError = `Gemini (${model}) error ${res.status}: ${errText}`;
                console.warn(lastError);
                continue;
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                lastError = `Gemini (${model}) respuesta vacía`;
                continue;
            }

            return cleanAndParseJSON(text);
        } catch (e) {
            lastError = `Gemini (${model}) excepción: ${e.message}`;
            console.warn(lastError);
        }
    }

    throw new Error(lastError || "No se pudo clasificar la imagen con Google Gemini");
}

// Clasificación usando Groq
async function classifyWithGroq(apiKey, base64Image, mimeType) {
    // Modelos Groq ordenados por preferencia
    const groqModels = [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.2-11b-vision-preview",
        "llama-3.2-90b-vision-preview"
    ];

    let lastError = null;

    for (const model of groqModels) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: SYSTEM_PROMPT },
                                {
                                    type: "image_url",
                                    image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}` }
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 4000
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                lastError = `Groq (${model}) error ${res.status}: ${errText}`;
                continue;
            }

            const groqData = await res.json();
            const content = groqData.choices?.[0]?.message?.content;
            if (!content) {
                lastError = `Groq (${model}) respuesta vacía`;
                continue;
            }

            return cleanAndParseJSON(content);
        } catch (e) {
            lastError = `Groq (${model}) excepción: ${e.message}`;
        }
    }

    throw new Error(lastError || "No se pudo clasificar la imagen con Groq");
}

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { image, mimeType } = body;

        if (!image) {
            return new Response(JSON.stringify({ error: 'No se recibió ninguna imagen para clasificar' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Obtener claves desde headers, body o variables de entorno
        const geminiKey = request.headers.get('x-gemini-api-key') ||
            body.geminiApiKey ||
            process.env.GEMINI_API_KEY ||
            process.env.VITE_GEMINI_API_KEY ||
            '';

        const groqKey = request.headers.get('x-groq-api-key') ||
            body.groqApiKey ||
            process.env.GROQ_API_KEY ||
            '';

        // 1. Prioridad: Google Gemini (modelo oficial multimodal estable)
        if (geminiKey) {
            try {
                const results = await classifyWithGemini(geminiKey, image, mimeType);
                return new Response(JSON.stringify(results), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (geminiErr) {
                console.error("Fallo Gemini:", geminiErr);
                // Si también hay Groq, intentar fallback
                if (!groqKey) {
                    return new Response(JSON.stringify({
                        error: `Error al clasificar con Gemini: ${geminiErr.message}`
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
        }

        // 2. Alternativa: Groq
        if (groqKey) {
            try {
                const results = await classifyWithGroq(groqKey, image, mimeType);
                return new Response(JSON.stringify(results), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (groqErr) {
                console.error("Fallo Groq:", groqErr);
                return new Response(JSON.stringify({
                    error: `Error al clasificar con Groq: ${groqErr.message}`
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 3. Ni Gemini ni Groq configurados
        return new Response(JSON.stringify({
            error: "No se ha configurado ninguna clave de Inteligencia Artificial (Gemini o Groq). Configúrala en Ajustes (icono ⚙️ en la app) o en las variables de entorno de Vercel (GEMINI_API_KEY)."
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("API Handler Error:", error);
        return new Response(JSON.stringify({
            error: error.message || 'Error interno del servidor de clasificación'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
