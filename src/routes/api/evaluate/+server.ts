import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { questions, answerImages } = await request.json();

        if (!questions || !answerImages) {
            return json({ error: 'Missing required data' }, { status: 400 });
        }

        type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };

        const parts: ContentPart[] = answerImages.map((img: { base64: string; mimeType: string }) => ({
            inlineData: { data: img.base64, mimeType: img.mimeType }
        }));

        parts.push({
            text: `You are an expert grader. I have provided the student's handwritten answer sheet images.
			Here are the extracted questions in JSON format: ${JSON.stringify(questions)}
			
			For each question:
			1. Find the corresponding handwritten answer.
			2. Evaluate it for correctness and assign a score (e.g., '2/2').
			3. Provide brief feedback.
			4. Provide the bounding box of the exact answer region in [ymin, xmin, ymax, xmax] format (normalized to a 1000x1000 scale relative to the page).
			5. Provide the page_index (0-based) where the answer is found.
			6. If the question is not answered, set status to 'unanswered' and omit the bounding box.
			7. Return JSON only.`
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: parts,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        evaluations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question_id: { type: Type.STRING },
                                    status: { type: Type.STRING, description: "'answered' or 'unanswered'" },
                                    score: { type: Type.STRING },
                                    feedback: { type: Type.STRING },
                                    page_index: { type: Type.INTEGER },
                                    bounding_box: {
                                        type: Type.ARRAY,
                                        items: { type: Type.INTEGER },
                                        description: "[ymin, xmin, ymax, xmax] on a 1000x1000 scale"
                                    }
                                },
                                required: ['question_id', 'status']
                            }
                        }
                    },
                    required: ['evaluations']
                }
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error('Model returned empty response');

        return json(JSON.parse(resultText));
    } catch (error) {
        console.error('Evaluation Error:', error);
        return json({ error: 'Failed to evaluate answers.' }, { status: 500 });
    }
};