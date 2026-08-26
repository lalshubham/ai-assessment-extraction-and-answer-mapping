import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { images } = await request.json();

        if (!images || !Array.isArray(images)) {
            return json({ error: 'Invalid input payload' }, { status: 400 });
        }

        type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };

        const parts: ContentPart[] = images.map((img: { base64: string; mimeType: string }) => ({
            inlineData: { data: img.base64, mimeType: img.mimeType }
        }));

        parts.push({
            text: `Extract all questions from this exam paper in their exact printed order. 
			Treat labeled sub-parts (e.g., 11(a), 11(b)) as distinct, separate questions. 
			Return JSON only.`
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: parts,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING, description: 'Question numbering (e.g., "1", "11a")' },
                                    text: { type: Type.STRING, description: 'The actual text of the question' }
                                },
                                required: ['id', 'text']
                            }
                        }
                    },
                    required: ['questions']
                }
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error('Model returned empty response');

        return json(JSON.parse(resultText));
    } catch (error) {
        console.error('Extraction Error:', error);
        return json({ error: 'Failed to extract questions.' }, { status: 500 });
    }
};