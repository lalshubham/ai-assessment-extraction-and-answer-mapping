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
            1. Find the handwritten answer.
            2. Evaluate step-by-step. 
               - IF the question asks for a list, explicitly count valid/invalid points first.
               - IF the question has 'options', evaluate strictly against those choices.
            3. Assign a numeric 'score_awarded' (use decimals for half marks) and a 'score_string' (e.g., '1.5/2').
            4. Provide specific feedback. CRITICAL CONSTRAINT: Feedback MUST be UNDER 15 WORDS to save space. Do not ramble. If marks are deducted, state exactly why briefly.
            5. Provide the bounding box of the answer region. 
               - SPATIAL RULE 1 (Complete Capture): Capture the ENTIRE handwritten answer, including introductory sentences.
               - SPATIAL RULE 2 (Diagrams): For diagrams (e.g., the heart drawing), the bounding box MUST extend to the far left margin of the page to capture ALL disconnected floating labels. Do not crop the left side.
               - SPATIAL RULE 3 (Teacher Marks): Wrap tightly around the student's handwriting. Do not artificially stretch to capture a teacher's checkmark. 
               - SPATIAL RULE 4 (Exclude Headers): DO NOT include printed instructional text or section headers.
               - SPATIAL RULE 5 (Short Answers): Generate a box for EVERY attempted question, even single words.
            6. ONLY set status to 'unanswered' (and omit the box) if the space is completely blank.`
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
										status: { type: Type.STRING },
										score_awarded: { type: Type.NUMBER },
										score_string: { type: Type.STRING },
										feedback: { type: Type.STRING },
										page_index: { type: Type.INTEGER },
										bounding_box: { type: Type.ARRAY, items: { type: Type.INTEGER } }
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