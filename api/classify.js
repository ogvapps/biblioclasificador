export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Environment variables are accessed via process.env in Edge (or sometimes strict standard, but Vercel supports process.env in Edge too usually, but safe way is usually standard)
    // Actually in Vercel Edge, process.env works.
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error: Missing Groq API Key' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { image, mimeType } = await request.json();

        if (!image) {
            return new Response(JSON.stringify({ error: 'No image data provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 11b vision model
        // Prompt con esquema estricto validado contra types.ts
        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text", text: `Analiza la imagen e identifica CADA libro visible. Devuelve SOLO un JSON Array válido.
                    
                    Por cada libro detectado, genera un objeto con EXACTAMENTE estas propiedades:
                    1. title: (string) Título completo del libro.
                    2. author: (string) Autor del libro.
                    3. age: (number) Edad recomendada aproximada (ej. 8, 12, 16).
                    4. stage: (string) UNA de estas opciones EXACTAS:
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
                    6. synopsis: (string) Breve resumen de 1 o 2 frases.
                    7. reasoning: (string) Breve explicación de por qué elegiste esa etapa y género.

                    IMPORTANTE:
                    - Responde SOLO con el JSON. Sin bloques de código markdown, sin texto adicional.
                    - Si no estás seguro de algún dato, infiérelo basándote en la portada.
                    ` },
                    { type: "image_url", image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${image}` } }
                ]
            }
        ];

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // Model verified in local tests (test-groq.js)
                // If this fails, revert to: "llama-3.2-11b-vision-preview" or "llama-3.2-90b-vision-preview"
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: messages,
                temperature: 0.1,
                max_tokens: 4000
            })
        });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error("Groq API Error:", errText);
            return new Response(JSON.stringify({ error: `Groq API Failed: ${errText}` }), { status: 500 });
        }

        const groqData = await groqResponse.json();
        const content = groqData.choices[0]?.message?.content;

        if (!content) {
            return new Response(JSON.stringify({ error: "Empty response from Groq" }), { status: 500 });
        }

        // JSON Parsing Logic
        let parsedResult;
        try {
            parsedResult = JSON.parse(content);
        } catch (e) {
            // Cleaning attempts
            try {
                const firstBracket = content.indexOf('[');
                const lastBracket = content.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    parsedResult = JSON.parse(content.substring(firstBracket, lastBracket + 1));
                } else {
                    const firstCurly = content.indexOf('{');
                    const lastCurly = content.lastIndexOf('}');
                    if (firstCurly !== -1 && lastCurly !== -1) {
                        parsedResult = JSON.parse(content.substring(firstCurly, lastCurly + 1));
                    }
                }
            } catch (e2) {
                // If all fails, return raw content for debug
                console.log("JSON Parse failed, returning raw string in error");
                // We won't throw, we will try to handle it gracefully or return text
            }
        }

        if (!parsedResult) {
            // If we couldn't parse JSON, we try to construct a dummy "Unparsed" object so the app doesn't crash
            parsedResult = [{
                title: "Error de formato",
                synopsis: "La IA respondió pero no en formato JSON válido. Respuesta: " + content.substring(0, 200),
                stage: "REFERENCIA",
                genre: "INFORMATIVO"
            }];
        }

        const resultsArray = Array.isArray(parsedResult) ? parsedResult : [parsedResult];

        return new Response(JSON.stringify(resultsArray), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("API Handler Error:", error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
