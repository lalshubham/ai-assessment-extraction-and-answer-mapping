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
		const { metadata, questions, answerImages } = await request.json();
		if (!questions || !answerImages) return json({ error: 'Missing required data' }, { status: 400 });

		const parts: ContentPart[] = answerImages.map((img: { base64: string; mimeType: string }) => ({
			inlineData: { data: img.base64, mimeType: img.mimeType }
		}));

		parts.push({
			text: `You are an expert ${metadata?.subject || 'school'} teacher for ${metadata?.grade_level || 'students'}. 
			Here are the questions in JSON format: ${JSON.stringify(questions)}
			
			For each question:
			1. Find the handwritten answer.
			2. Evaluate step-by-step. 
			   - IF the question asks for a list, explicitly count valid/invalid points first.
			   - IF the question has 'options', evaluate strictly against those choices.
			3. Assign a numeric 'score_awarded' (use decimals for half marks, e.g., 1.5, 3, 0) and a 'score_string' (e.g., '1.5/2').
			4. Provide specific, concise feedback (1-2 sentences max). 
			   - CRITICAL: IF the student loses ANY marks (score_awarded < max marks), you MUST explicitly state the exact error or missing information.
			   - NEVER use vague phrases like "minor errors" or "partially correct."
			5. Provide the bounding box of the answer region (MUST PROVIDE EVEN IF ANSWER IS INCORRECT). 
			   - SPATIAL RULE 1 (Complete Capture): The box MUST capture the ENTIRE handwritten answer. Include introductory sentences along with the list below it.
			   - SPATIAL RULE 2 (Diagrams): Actively scan the far left and right sides of drawings to include all floating labels and arrows.
			   - SPATIAL RULE 3 (Teacher Marks): Wrap tightly around the student's handwriting. Do not artificially stretch the box to the right SOLELY to capture a teacher's checkmark. 
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
										bounding_box: {
											type: Type.ARRAY,
											items: { type: Type.INTEGER }
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
			return json(JSON.parse(response.text || '{}'));
		}
		catch (parseError) {
			console.error("JSON Parse Error (Truncated AI output):", parseError);
			return json({ error: 'AI output was truncated. Please try again.' }, { status: 500 });
		}
	}
	catch (error: unknown) {
		console.error('Evaluation Error:', error);
		return json({ error: 'Failed to evaluate answers.' }, { status: 500 });
	}
};