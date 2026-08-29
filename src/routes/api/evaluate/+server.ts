import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { ExamMetadata, Question, GeminiContent, EvaluationResponse } from '$lib/types';
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

		const metadata = JSON.parse(metadataStr) as ExamMetadata;
		const questions = JSON.parse(questionsStr) as Question[];

		const parts: GeminiContent[] = [];

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
               - TRANSCRIPTION RULE: First, carefully read the student's exact handwritten answer. Do not hallucinate words.
               - MCQ RULE: Compare the student's handwritten answer EXACTLY to the options. If the student wrote the correct option letter, the correct text, or both, YOU MUST AWARD FULL MARKS immediately and set feedback to Correct with the correct option. Do NOT second-guess.
               - NON-MCQ RULE: Formulate the standard academic answer for the provided grade level. If the student's answer is conceptually correct, YOU MUST AWARD FULL MARKS. Deduct marks ONLY for missing or vague terminology.
            2. Assign a numeric 'score_awarded'. CRITICAL: If the answer is correct, this MUST equal the exact 'marks' value provided for this question in the JSON.
            3. Assign 'score_string' containing ONLY the fraction. The denominator MUST be the exact 'marks' value provided for this specific question in the JSON.
            4. Provide 'feedback'.
               - Keep it direct and concise. NO internal monologue.
               - If full marks are awarded, just say Correct (with the correct option for MCQs).
               - If marks are deducted, clearly explain what was incorrect based on what was ACTUALLY written.
            5. Provide a precise bounding box [ymin, xmin, ymax, xmax] on a 0-1000 scale.
               - RULE 1 (Left Edge): xmin MUST expand into the left margin to perfectly enclose the handwritten question identifier. Treat the margin identifier and the main paragraph as a single connected block.
               - RULE 2 (Right Edge): Scan every line of the student's answer. Push xmax past the absolute furthest word on the right so no trailing letters are cut off. Over-estimate slightly to be safe.
               - RULE 3 (Top & Bottom): Capture all text lines, diagrams, and labels belonging to this question. Stop immediately before the next question begins. Exclude printed section headers.
            6. Set status to 'unanswered' ONLY if the space is completely blank.`
		});

		const parsedData = await fetchAndParseAI<EvaluationResponse>(
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
											description: 'ONLY the fraction (awarded/max_marks).'
										},
										feedback: {
											type: Type.STRING,
											description: 'Mention incorrect and missing data based exactly on what was written.'
										},
										page_index: {
											type: Type.INTEGER,
											description: 'CRITICAL: 0-indexed page number (first page is 0).'
										},
										bounding_box: {
											type: Type.ARRAY,
											items: { type: Type.INTEGER },
											description: '[ymin, xmin, ymax, xmax]. Push xmax safely to the right to prevent clipping trailing words.'
										}
									},
									required: ['question_id', 'status', 'score_string', 'feedback', 'page_index']
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

		if (parsedData?.evaluations && Array.isArray(parsedData.evaluations)) {
			for (const ev of parsedData.evaluations) {
				const q = questions.find((question) => question.id === ev.question_id);

				if (q && q.marks !== undefined) {
					const maxMarks = Number(q.marks);
					let awarded = Number(ev.score_awarded) || 0;

					if (awarded > maxMarks) {
						awarded = maxMarks;
					}

					ev.score_awarded = awarded;
					ev.score_string = `${awarded}/${maxMarks}`;
				}
			}
		}

		return json(parsedData);
	}
	catch (error: unknown) {
		console.error('Evaluation Error:', error);
		const msg = error instanceof Error && error.message.includes('truncated')
			? 'AI output was truncated due to length. Please try again.'
			: 'Failed to evaluate answers.';
		return json({ error: msg }, { status: 500 });
	}
};