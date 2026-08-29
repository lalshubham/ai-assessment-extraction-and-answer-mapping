import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { GeminiContent, ExtractionResponse, Question } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const files = formData.getAll('images') as File[];

        if (!files || files.length === 0) {
            return json({ error: 'Invalid input payload' }, { status: 400 });
        }

        const parts: GeminiContent[] = [];

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            parts.push({
                inlineData: { data: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' }
            });
        }

        parts.push({
            text: `Analyze this QUESTION PAPER image carefully.
            1. Extract class/grade level and subject. If not found, keep empty string.
            2. Extract all questions in their exact printed order.
            3. Treat labeled sub-parts as distinct questions.
            4. For the 'marks' field, extract a simple number (e.g., 1, 2, 5).
            5. CRITICAL - SECTION HEADERS: Look at the heading for each section (e.g., "Answer the following"). These headings often contain a marks multiplier equation like "5 x 2", "3x5", or "(5x3=15)". You MUST extract this exact literal string and put it into the 'marks_equation' field for EVERY question that belongs to that section. If there is no multiplier, leave it empty.
            6. Extract MCQ options into an array if present.`
        });

        const parsedData = await fetchAndParseAI<ExtractionResponse>(
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
                                properties: { grade_level: { type: Type.STRING }, subject: { type: Type.STRING } }
                            },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        text: { type: Type.STRING },
                                        marks: { type: Type.NUMBER },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        marks_equation: {
                                            type: Type.STRING,
                                            description: "The exact marks equation from the section header (e.g., '5 x 2')."
                                        }
                                    },
                                    required: ['id', 'text', 'marks']
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

        if (parsedData?.questions && Array.isArray(parsedData.questions)) {
            const groups: Record<string, Question[]> = {};
            let currentHeader = "default";

            for (const q of parsedData.questions) {
                if (q.marks_equation && q.marks_equation.trim() !== "") {
                    currentHeader = q.marks_equation.replace(/\s+/g, '').toLowerCase();
                }
                if (!groups[currentHeader]) groups[currentHeader] = [];
                groups[currentHeader].push(q);
            }

            for (const [header, block] of Object.entries(groups)) {
                if (header === "default" || !header) continue;

                const nums = (header.match(/\d+(\.\d+)?/g) || []).map(Number);
                if (nums.length >= 2) {
                    const [n1, n2] = nums;
                    const actualQuestionCount = block.length;
                    let trueMarks: number | null = null;

                    if (n1 === actualQuestionCount && n2 !== actualQuestionCount) {
                        trueMarks = n2;
                    }
                    else if (n2 === actualQuestionCount && n1 !== actualQuestionCount) {
                        trueMarks = n1;
                    }
                    else if (n1 === actualQuestionCount && n2 === actualQuestionCount) {
                        trueMarks = n1;
                    }

                    if (trueMarks !== null) {
                        for (const q of block) {
                            q.marks = trueMarks;
                        }
                    }
                }
            }
        }

        return json(parsedData);
    }
    catch (error: unknown) {
        console.error('Extraction Error:', error);
        const msg = error instanceof Error && error.message.includes('truncated')
            ? 'AI output was truncated during extraction.'
            : 'Failed to extract questions.';
        return json({ error: msg }, { status: 500 });
    }
};