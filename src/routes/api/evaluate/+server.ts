import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import { type RequestHandler, json } from '@sveltejs/kit';
import type { Exam, GeminiContent, Evaluation, Assessment } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const files = formData.getAll('images') as File[];
		const examStr = formData.get('exam') as string;

		if (!files.length || !examStr) {
			return json({ error: 'Missing required data' }, { status: 400 });
		}

		const exam = JSON.parse(examStr) as Exam;

		const contents: GeminiContent[] = await Promise.all(files.map(async file => ({
			inlineData: { data: Buffer.from(await file.arrayBuffer()).toString('base64'), mimeType: file.type || 'image/jpeg' }
		})));

		contents.push({
			text: `You are an expert ${exam.subject || 'school'} teacher for ${exam.grade_level || 'students'}.
            Here are the questions in JSON format: ${JSON.stringify(exam.questions)}

            CRITICAL INSTRUCTION: You MUST ONLY evaluate the exact questions provided in the JSON array above. Do NOT evaluate or assign scores to any other answers you might see on the page that do not exist in the provided JSON.

            For each question in the JSON:
            1. Evaluate step-by-step.
               - MAPPING RULE: Match the student's handwritten question numbers directly to the JSON IDs. Even if the student's answer is completely irrelevant, off-topic, or answers a different question, you MUST map it, draw the bounding box, evaluate it (give 0 marks if irrelevant), and provide feedback. Do NOT ignore it.
               - TRANSCRIPTION RULE: First, carefully read the student's exact handwritten answer. Do not hallucinate words.
               - MCQ RULE: Compare the student's handwritten answer EXACTLY to the options. If the student wrote the correct option letter, the correct text, or both, YOU MUST AWARD FULL MARKS immediately.
               - NON-MCQ RULE: Formulate the standard academic answer for the provided grade level. If the student's answer is conceptually correct, YOU MUST AWARD FULL MARKS. Deduct marks ONLY for missing or vague terminology.
            2. Assign a numeric 'score_awarded'. CRITICAL: If the answer is correct, this MUST equal the exact 'marks' value provided for this question in the JSON.
            3. Assign 'score_string' containing ONLY the fraction. The denominator MUST be the exact 'marks' value provided for this specific question in the JSON.
            4. Provide 'feedback'.
               - Keep it direct and concise (1-2 short sentences maximum). NO internal monologue.
               - If full marks are awarded, MUST start with 'Correct.' followed by a brief, 1-sentence validation of what the student wrote (e.g., 'Correct. You accurately explained the process.'). For MCQs, state 'Correct. Option X is the right answer.'
               - If marks are deducted, clearly explain what was incorrect or missing based on what was ACTUALLY written.
            5. Provide precise bounding boxes for the answer using the 'regions' array on a 0-1000 scale.
               - MULTI-PAGE RULE: If a student's answer spans across multiple pages, you MUST create a separate region object in the array for EACH page the answer appears on.
               - RULE 1 (Left Edge): xmin MUST expand into the left margin to perfectly enclose the handwritten question identifier. Treat the margin identifier and the main paragraph as a single connected block.
               - RULE 2 (Right Edge): Scan every line of the student's answer. Push xmax past the absolute furthest word on the right so no trailing letters are cut off. Over-estimate slightly to be safe.
               - RULE 3 (Top & Bottom): Capture ALL text lines, paragraphs, diagrams, and labels belonging to this question. CRITICAL: Push ymax safely past the absolute lowest point of the final line of the answer to ensure no trailing sentences are cut off. Stop immediately before the next question begins. Exclude printed section headers.
            6. Set status to 'unanswered' ONLY if the student completely failed to write the question number on the page. If the number is written, it MUST be marked 'answered'.`
		});

		const parsedData = await fetchAndParseAI<{
			evaluations: Evaluation[]
		}>((model) =>
			ai.models.generateContent({
				model,
				contents,
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
											description: 'Start with Correct/Incorrect. Briefly explain why based exactly on what was written (max 1-2 short sentences).'
										},
										regions: {
											type: Type.ARRAY,
											description: 'Array of regions covering the answer. Use multiple items if the answer spans multiple pages.',
											items: {
												type: Type.OBJECT,
												properties: {
													page_index: {
														type: Type.INTEGER,
														description: 'CRITICAL: 0-indexed page number (first page is 0).'
													},
													bounding_box: {
														type: Type.ARRAY,
														items: { type: Type.INTEGER },
														description: '[ymin, xmin, ymax, xmax]. Push xmax to the right and ymax safely to the bottom to prevent clipping trailing lines.'
													}
												},
												required: ['page_index', 'bounding_box']
											}
										}
									},
									required: ['question_id', 'status', 'score_string', 'feedback', 'regions']
								}
							}
						},
						required: ['evaluations']
					}
				}
			}),
			2, 'Evaluation API'
		);

		let finalTotalScore = 0;

		if (parsedData?.evaluations?.length) {
			parsedData.evaluations = parsedData.evaluations.filter(ev => exam.questions.some(q => q.id === ev.question_id));

			parsedData.evaluations.forEach(ev => {
				const q = exam.questions.find(q => q.id === ev.question_id);
				if (q?.marks !== undefined) {
					const maxMarks = Number(q.marks);
					let rawAwarded = Number(ev.score_awarded) || 0;

					if (rawAwarded === 0 && ev.feedback.trim().toLowerCase().startsWith('correct')) {
						rawAwarded = maxMarks;
					}

					const awarded = Number(Math.min(rawAwarded, maxMarks).toFixed(2));

					ev.score_awarded = awarded;
					ev.score_string = `${awarded} / ${maxMarks}`;
					finalTotalScore += awarded;
				}
			});
		}

		const assessmentResult: Assessment = {
			total_score: Number(finalTotalScore.toFixed(2)),
			evaluations: parsedData?.evaluations || []
		};

		return json(assessmentResult);
	}
	catch (error: unknown) {
		console.error('Evaluation Error:', error);
		const msg = error instanceof Error && error.message.includes('truncated') ? 'AI output truncated on extraction.' : 'Failed to evaluate answers.';
		return json({ error: msg }, { status: 500 });
	}
};