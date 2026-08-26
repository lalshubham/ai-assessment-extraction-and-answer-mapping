import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import fetchAPI from '$lib/server/fetch';

type ContentPart = {
    text: string
} | {
    inlineData: {
        data: string;
        mimeType: string
    }
};

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { images } = await request.json();
        if (!images || !Array.isArray(images)) return json({ error: 'Invalid input payload' }, { status: 400 });

        const parts: ContentPart[] = images.map((img: { base64: string; mimeType: string }) => ({
            inlineData: { data: img.base64, mimeType: img.mimeType }
        }));

        parts.push({
            text: `Analyze this QUESTION PAPER image carefully.
			1. Look at the very top heading of this specific paper to extract the exact class/grade level and subject (e.g., "CLASS - VIII", "SCIENCE"). Do NOT assume this; read it explicitly from the image.
			2. Extract all questions in their exact printed order. 
			3. Treat labeled sub-parts as distinct questions. 
			4. Extract the maximum marks allocated for each question based on the text.
			5. IF the question is a Multiple Choice Question (MCQ), extract the options into an array.`
        });

        const response = await fetchAPI(
            () => ai.models.generateContent({
                model: 'gemini-3.5-flash-lite',
                contents: parts,
                config: {
                    maxOutputTokens: 8192,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            metadata: {
                                type: Type.OBJECT,
                                properties: {
                                    grade_level: { type: Type.STRING },
                                    subject: { type: Type.STRING }
                                }
                            },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        text: { type: Type.STRING },
                                        marks: { type: Type.NUMBER },
                                        options: {
                                            type: Type.ARRAY,
                                            items: { type: Type.STRING }
                                        }
                                    },
                                    required: ['id', 'text']
                                }
                            }
                        },
                        required: ['metadata', 'questions']
                    }
                }
            }),
            2,
            'extraction API'
        );

        try {
            return json(JSON.parse(response.text || '{}'));
        }
        catch (parseError) {
            console.error("JSON Parse Error (Truncated AI output in Extract):", parseError);
            return json({ error: 'AI output was truncated during extraction. Please try again.' }, { status: 500 });
        }
    }
    catch (error: unknown) {
        console.error('Extraction Error:', error);
        return json({ error: 'Failed to extract questions.' }, { status: 500 });
    }
};