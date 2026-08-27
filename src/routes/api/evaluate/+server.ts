import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import fetchAPI from '$lib/server/fetch';
import { parseAIResponse } from '$lib/server/parser';

type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };
type MetaData = { grade_level?: string; subject?: string };

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
               - IF it is an MCQ, accept the option letter, option text, or both.
            2. Assign a numeric 'score_awarded' (use decimals for half marks).
            3. Assign 'score_string' (e.g., '1.5/2'). DO NOT append feedback into this string.
            4. Provide 'feedback' UNDER 10 WORDS.
            5. Provide a precise bounding box [ymin, xmin, ymax, xmax] on a 0-1000 scale.
               - RULE 1 (Precision): Draw a tight, precise box around the student's attempt. DO NOT use arbitrary full-width coordinates like 0 and 1000.
               - RULE 2 (Left Edge): The left edge MUST expand into the margin to perfectly enclose the handwritten question number (e.g., "1.", "11."). Treat the margin number and the main paragraph as a single connected visual block.
               - RULE 3 (Right Edge): Wrap tightly around the rightmost edge of the student's handwriting.
               - RULE 4 (Top & Bottom): Capture all text lines, diagrams, and labels belonging to this question. Stop immediately before the next question begins. Exclude printed section headers (e.g., "A. Choose the correct option").
            6. ONLY set status to 'unanswered' (and omit the box) if the space is completely blank.`
		});

		const response = await fetchAPI(
			() => ai.models.generateContent({
				model: 'gemini-3.5-flash-lite',
				contents: parts,
				config: {
					maxOutputTokens: 8192,
					temperature: 0.1,
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
											description: "ONLY the fraction (e.g., '1/1'). NEVER include feedback words here."
										},
										feedback: {
											type: Type.STRING,
											description: "Specific feedback, maximum 10 words."
										},
										page_index: {
											type: Type.INTEGER,
											description: "CRITICAL: 0-indexed page number (first page is 0)."
										},
										bounding_box: {
											type: Type.ARRAY,
											items: { type: Type.INTEGER },
											description: "[ymin, xmin, ymax, xmax]. Must perfectly frame the answer, expanding left to explicitly include the marginal question number."
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
			'evaluation API'
		);

		try {
			const parsedData = parseAIResponse(response.text || '{}') as Record<string, unknown>;
			return json(parsedData);
		}
		catch (parseError) {
			console.error("JSON Parse Error:", parseError);
			return json({ error: 'AI output was truncated due to length. Please try again.' }, { status: 500 });
		}
	}
	catch (error: unknown) {
		console.error('Evaluation Error:', error);
		return json({ error: 'Failed to evaluate answers.' }, { status: 500 });
	}
};