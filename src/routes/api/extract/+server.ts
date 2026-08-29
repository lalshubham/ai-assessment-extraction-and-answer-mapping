import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import type { Question, GeminiContent, Exam } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

type RawQuestion = Question & { marks_equation?: string; parent_total_marks?: number };

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const files = formData.getAll('images') as File[];

        if (!files.length) return json({ error: 'Invalid input payload' }, { status: 400 });

        const parts: GeminiContent[] = await Promise.all(files.map(async file => ({
            inlineData: { data: Buffer.from(await file.arrayBuffer()).toString('base64'), mimeType: file.type || 'image/jpeg' }
        })));

        parts.push({
            text: `Analyze this QUESTION PAPER image carefully.
            1. Extract class/grade level, subject, and the explicitly printed overall maximum/total marks for the entire paper (e.g., "Max. Marks: 50").
            2. Extract all questions in their exact printed order.
            3. Treat labeled sub-parts as distinct questions. CRITICAL: Ensure the 'id' always starts with the main question number (e.g., "11a", "11b", NOT just "a" or "b").
            4. For the 'marks' field, extract a simple number. CRITICAL FOR SUB-PARTS: If a parent question has a single total mark provided (e.g., "four marks each"), extract it into 'parent_total_marks' for EVERY sub-part. Do NOT divide the marks yourself.
            5. CRITICAL - SECTION HEADERS: Look at the heading for each section (e.g., "Answer the following"). These headings often contain a marks multiplier equation like "5 x 2", "3x5", or "(5x3=15)". You MUST extract this exact literal string and put it into the 'marks_equation' field for EVERY question that belongs to that section. If there is no multiplier, leave empty.
            6. Extract MCQ options into an array if present.`
        });

        const parsedData = await fetchAndParseAI<{ grade_level: string; subject: string; total_marks: number; questions: RawQuestion[] }>(
            () => ai.models.generateContent({
                model: 'gemini-3.5-flash-lite',
                contents: parts,
                config: {
                    maxOutputTokens: 8192,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            grade_level: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            total_marks: {
                                type: Type.NUMBER,
                                description: "The explicit overall maximum marks printed at the top of the paper (e.g., 50, 80)."
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
                        required: ['grade_level', 'subject', 'questions']
                    }
                }
            }),
            2, 'Extraction API'
        );

        let finalQuestions: Question[] = [];
        let calculatedTotalMarks = 0;

        if (parsedData?.questions?.length) {
            const questionsByParentId: Record<string, RawQuestion[]> = {};
            const sectionEquationsMap: Record<string, Set<string>> = {};

            parsedData.questions.forEach((q) => {
                const parentId = q.id.match(/^\d+/)?.[0] || q.id;
                (questionsByParentId[parentId] ??= []).push(q);

                const equation = q.marks_equation?.replace(/\s+/g, '');
                if (equation) (sectionEquationsMap[equation] ??= new Set()).add(parentId);
            });

            for (const [equation, uniqueParentIds] of Object.entries(sectionEquationsMap)) {
                const numbers = (equation.match(/\d+(\.\d+)?/g) || []).map(Number);
                const actualCount = uniqueParentIds.size;
                const trueMarks = (numbers[0] === actualCount) ? numbers[1] : (numbers[1] === actualCount ? numbers[0] : null);

                if (trueMarks != null) {
                    uniqueParentIds.forEach(pId => questionsByParentId[pId].forEach(q => q.marks = trueMarks / questionsByParentId[pId].length));
                }
            }

            for (const subQs of Object.values(questionsByParentId)) {
                const pMark = subQs.find(q => q.parent_total_marks != null)?.parent_total_marks;
                if (subQs.length > 1 && pMark != null) subQs.forEach(q => q.marks = pMark / subQs.length);
            }

            finalQuestions = parsedData.questions.map(q => {
                calculatedTotalMarks += (q.marks || 0);
                delete q.marks_equation;
                delete q.parent_total_marks;
                return q as Question;
            });
        }

        const finalTotalMarks = parsedData?.total_marks || calculatedTotalMarks;

        const examResult: Exam = {
            grade_level: parsedData?.grade_level || "",
            subject: parsedData?.subject || "",
            total_marks: Number(finalTotalMarks.toFixed(2)),
            questions: finalQuestions
        };

        return json(examResult);
    }
    catch (error: unknown) {
        console.error('Extraction Error:', error);
        const msg = error instanceof Error && error.message.includes('truncated') ? 'AI output truncated on extraction.' : 'Failed to extract questions.';
        return json({ error: msg }, { status: 500 });
    }
};