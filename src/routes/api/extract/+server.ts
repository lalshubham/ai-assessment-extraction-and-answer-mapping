import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { fetchAPI, parseResponse } from '$lib/server/fetch';

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
        const formData = await request.formData();
        const files = formData.getAll('images') as File[];

        if (!files || files.length === 0) {
            return json({ error: 'Invalid input payload' }, { status: 400 });
        }

        const parts: ContentPart[] = [];

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            parts.push({
                inlineData: { data: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' }
            });
        }

        parts.push({
            text: `Analyze this QUESTION PAPER image carefully.
            1. Look at the very top heading of this specific paper to extract the exact class/grade level and subject. Do NOT assume this; read it explicitly from the image.
            2. Extract all questions in their exact printed order.
            3. Treat labeled sub-parts as distinct questions.
            4. Extract the maximum marks allocated for each question. CRITICAL: The marks MUST be a simple standard number (e.g., 1, 2, 5, 0.5). NEVER output scientific notation, complex fractions, or floating point errors (like 1.000005).
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
                                    grade_level: {
                                        type: Type.STRING
                                    },
                                    subject: {
                                        type: Type.STRING
                                    }
                                }
                            },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: {
                                            type: Type.STRING
                                        },
                                        text: {
                                            type: Type.STRING
                                        },
                                        marks: {
                                            type: Type.NUMBER
                                        },
                                        options: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.STRING
                                            }
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
            'Extraction API'
        );

        try {
            const parsedData = parseResponse(response.text || '{}') as Record<string, unknown>;
            return json(parsedData);
        }
        catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            return json({ error: 'AI output was truncated during extraction.' }, { status: 500 });
        }
    }
    catch (error: unknown) {
        console.error('Extraction Error:', error);
        return json({ error: 'Failed to extract questions.' }, { status: 500 });
    }
};