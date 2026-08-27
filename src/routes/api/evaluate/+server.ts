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
            1. Find the handwritten answer matching the EXACT question_id.
            2. Evaluate step-by-step. 
               - IF the question asks for a list, explicitly count valid/invalid points first.
               - IF the question has 'options', evaluate strictly against those choices.
            3. Assign a numeric 'score_awarded' (use decimals for half marks).
            4. Assign a 'score_string' that contains ONLY the fraction (e.g., "1.5/2"). DO NOT append any other text.
            5. Provide specific feedback. CRITICAL CONSTRAINT: Feedback MUST be UNDER 15 WORDS.
            6. Provide the bounding box [ymin, xmin, ymax, xmax] of the answer region. 
               - SPATIAL RULE 1 (Anti-Segmentation): Do NOT visually separate the marginal question number from the main text. You MUST capture the handwritten question identifier inside the box. The left boundary (xmin) MUST start to the left of the question identifier.
               - SPATIAL RULE 2 (Leftmost Diagram Labels): Find the absolute leftmost letter of any diagram label protruding into the margin. xmin MUST stretch far enough left to include this very first letter without clipping it.
               - SPATIAL RULE 3 (Vertical Bounds): Include all introductory sentences at the top. Extend the bottom boundary (ymax) down to include all floating labels and the lowest drawn elements, stopping strictly before the next question's identifier.
               - SPATIAL RULE 4 (Right Boundary & Red Marks): Wrap the right side to include the last word on every line. DO NOT shrink the box to avoid teacher grading marks. If a red mark falls inside your box while capturing student text, that is 100% correct.
               - SPATIAL RULE 5 (Exclude Headers): Exclude section headers and instructional text. Box ONLY the student's answer.
            7. ONLY set status to 'unanswered' (and omit the box) if the space is completely blank.`
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
											description: "Strictly just the fraction like '1.5/2'. No other words."
										},
										feedback: {
											type: Type.STRING,
											description: "Specific feedback, maximum 15 words."
										},
										page_index: { type: Type.INTEGER },
										bounding_box: {
											type: Type.ARRAY,
											items: { type: Type.INTEGER },
											description: "[ymin, xmin, ymax, xmax]. CRITICAL: xmin MUST extend far enough left to completely enclose the question number AND the first letter of any leftmost diagram labels. Do not crop the left margin."
										}
									},
									required: ['question_id', 'status']
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