import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import type { GeminiContent, ExtractionResponse, Question } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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
            3. Treat labeled sub-parts as distinct questions. CRITICAL: Ensure the 'id' always starts with the main question number (e.g., "11a", "11b", NOT just "a" or "b").
            4. For the 'marks' field, extract a simple number. CRITICAL FOR SUB-PARTS: If a parent question has a single total mark provided (e.g., "four marks each"), extract it into 'parent_total_marks' for EVERY sub-part. Do NOT divide the marks yourself.
            5. CRITICAL - SECTION HEADERS: Look at the heading for each section (e.g., "Answer the following"). These headings often contain a marks multiplier equation like "5 x 2", "3x5", or "(5x3=15)". You MUST extract this exact literal string and put it into the 'marks_equation' field for EVERY question that belongs to that section. If there is no multiplier, leave empty.
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
                                        },
                                        marks_equation: { type: Type.STRING },
                                        parent_total_marks: { type: Type.NUMBER }
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

        if (parsedData?.questions?.length) {
            const parents: Record<string, Question[]> = {};
            const equations: Record<string, Set<string>> = {};

            parsedData.questions.forEach(q => {
                const parentId = q.id.match(/^\d+/)?.[0] || q.id;
                (parents[parentId] ??= []).push(q);

                const eq = q.marks_equation?.replace(/\s+/g, '');
                if (eq) (equations[eq] ??= new Set()).add(parentId);
            });

            for (const [eq, uniqueParentIds] of Object.entries(equations)) {
                const [n1, n2] = (eq.match(/\d+(\.\d+)?/g) || []).map(Number);
                const actualCount = uniqueParentIds.size;

                const trueMarks = (n1 === actualCount) ? n2 : (n2 === actualCount ? n1 : null);

                if (trueMarks != null) {
                    uniqueParentIds.forEach(pId => {
                        parents[pId].forEach(q => q.marks = trueMarks / parents[pId].length);
                    });
                }
            }

            for (const block of Object.values(parents)) {
                const pMark = block.find(q => q.parent_total_marks != null)?.parent_total_marks;
                if (block.length > 1 && pMark != null) {
                    block.forEach(q => q.marks = pMark / block.length);
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