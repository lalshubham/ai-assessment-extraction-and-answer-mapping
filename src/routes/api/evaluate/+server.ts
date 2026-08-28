import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { MetaData, ContentPart } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const files = formData.getAll('images') as File[];

		const metadataStr = formData.get('metadata') as string;
		const questionsStr = formData.get('questions') as string;

		if (!files.length || !metadataStr || !questionsStr) {
			return json({ error: 'Missing required data' }, { status: 400 });
		}

		const metadata = JSON.parse(metadataStr) as MetaData;
		const questions = JSON.parse(questionsStr) as Record<string, unknown>[];

		const parts: ContentPart[] = [];

		for (const file of files) {
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			parts.push({
				inlineData: { data: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' }
			});
		}

		parts.push({
			text: `You are an expert ${metadata.subject || 'school'} teacher for ${metadata.grade_level || 'students'}.
            Here are the questions in JSON format: ${JSON.stringify(questions)}
            
            For each question:
            1. Evaluate step-by-step.
               - Formulate the strict, standard academic answer for the provided grade level. Do not penalize for missing advanced or edge-case facts outside the standard curriculum scope.
               - If the student uses vague terminology instead of exact scientific or academic terms, deduct marks appropriately for lack of precision.
               - For MCQs, accept the option letter, option text, or both.
            2. Assign a numeric 'score_awarded' (use decimals for half marks).
            3. Assign 'score_string' containing ONLY the fraction. DO NOT append feedback here.
            4. Provide 'feedback'.
               - CRITICAL: You are strictly FORBIDDEN from using vague summary words.
               - If marks are deducted, clearly explain what was incorrect in the answer and what important information or points were missing.
            5. Provide a precise bounding box [ymin, xmin, ymax, xmax] on a 0-1000 scale.
               - RULE 1 (Left Edge): xmin MUST expand into the left margin to perfectly enclose the handwritten question identifier. Treat the margin identifier and the main paragraph as a single connected block.
               - RULE 2 (Right Edge): Scan every line of the student's answer. Push xmax past the absolute furthest word on the right so no trailing letters are cut off. Over-estimate slightly to be safe.
               - RULE 3 (Top & Bottom): Capture all text lines, diagrams, and labels belonging to this question. Stop immediately before the next question begins. Exclude printed section headers.
            6. Set status to 'unanswered' ONLY if the space is completely blank.`
		});

		const parsedData = await fetchAndParseAI<Record<string, unknown>>(
			() => ai.models.generateContent({
				model: 'gemini-3.5-flash-lite',
				contents: parts,
				config: {
					maxOutputTokens: 8192,
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
										status: {
											type: Type.STRING,
											description: "'answered' or 'unanswered'"
										},
										score_awarded: { type: Type.NUMBER },
										score_string: {
											type: Type.STRING,
											description: "ONLY the fraction. NEVER include feedback words here."
										},
										feedback: {
											type: Type.STRING,
											description: "Mention incorrect and missing data in the answer."
										},
										page_index: {
											type: Type.INTEGER,
											description: "CRITICAL: 0-indexed page number (first page is 0)."
										},
										bounding_box: {
											type: Type.ARRAY,
											items: { type: Type.INTEGER },
											description: "[ymin, xmin, ymax, xmax]. Push xmax safely to the right to prevent clipping trailing words."
										}
									},
									required: ['question_id', 'status', 'score_string', 'page_index']
								}
							}
						},
						required: ['evaluations']
					}
				}
			}),
			2,
			'Evaluation API'
		);

		return json(parsedData);
	}
	catch (error: any) {
		console.error('Evaluation Error:', error);
		const msg = error?.message?.includes('truncated')
			? 'AI output was truncated due to length. Please try again.'
			: 'Failed to evaluate answers.';
		return json({ error: msg }, { status: 500 });
	}
};