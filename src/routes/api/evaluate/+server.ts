import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import { type RequestHandler, json } from '@sveltejs/kit';
import type { Exam, GeminiContent, Evaluation, Assessment } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

type RawEvaluation = Evaluation & { pages_found_on?: number[], transcribed_text?: string };

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

		const contents: GeminiContent[] = (await Promise.all(files.map(async (file, index) => [
			{ text: `--- START OF IMAGE PAGE INDEX: ${index} ---` },
			{ inlineData: { data: Buffer.from(await file.arrayBuffer()).toString('base64'), mimeType: file.type || 'image/jpeg' } }
		]))).flat();

		contents.push({
			text: `You are an expert ${exam.subject || 'school'} teacher for ${exam.grade_level || 'students'}.
            Here are the questions in JSON format: ${JSON.stringify(exam.questions)}

            CRITICAL INSTRUCTION: You MUST ONLY evaluate the exact questions provided in the JSON array above. Do NOT evaluate or assign scores to any other answers you might see on the page that do not exist in the provided JSON.

            For each question in the JSON:
            1. Evaluate step-by-step.
               - EXHAUSTIVE SEARCH RULE (CRITICAL): Scan EVERY image for the question ID. Students often rewrite, cross out, or continue answers on different pages. You MUST find EVERY occurrence of the question number and list the page indices in the 'pages_found_on' array BEFORE evaluating.
               - TRANSCRIPTION RULE: Accurately transcribe the exact literal text the student wrote. If the answer appears on multiple pages, transcribe and combine the text from ALL occurrences into the 'transcribed_text' field. Do not hallucinate.
               - MCQ RULE: Compare your 'transcribed_text' EXACTLY to the options. If the student wrote the correct option letter, the correct text, or both, YOU MUST AWARD FULL MARKS immediately.
               - NON-MCQ RULE: Formulate the standard academic answer for the provided grade level. If the student's answer is conceptually correct, YOU MUST AWARD FULL MARKS. Deduct marks ONLY for missing or vague terminology.
            2. Assign a numeric 'score_awarded'. CRITICAL: If the answer is correct, this MUST equal the exact 'marks' value provided for this question in the JSON.
            3. Assign 'score_string' containing ONLY the fraction. The denominator MUST be the exact 'marks' value provided for this specific question in the JSON.
            4. Provide 'feedback'.
               - Keep it direct and concise (1-2 short sentences maximum). NO internal monologue.
               - If full marks are awarded, MUST start with 'Correct.' followed by a brief, 1-sentence validation of what the student wrote (e.g., 'Correct. You accurately explained the process.'). For MCQs, state 'Correct. Option X is the right answer.'
               - If marks are deducted, clearly explain what was incorrect or missing based on what was ACTUALLY written.
            5. Provide precise bounding boxes for the answer using the 'regions' array on a 0-1000 scale.
               - MULTI-PAGE REQUIREMENT: For EVERY page index you listed in 'pages_found_on', you MUST create a corresponding region object in this array. If a question is answered on Page 2 and continued on Page 3, you MUST output TWO region objects.
               - RULE 1 (Horizontal - xmin/xmax): Add generous padding (15-20 units) to the left and right. xmin MUST enclose the handwritten question identifier. xmax MUST safely clear the absolute furthest word on the right so trailing letters are not cut off.
               - RULE 2 (Vertical - ymin/ymax - CRITICAL): For closely written lines on a page, DO NOT add excessive vertical padding. ymin MUST start just above the student's answer, and ymax MUST stop STRICTLY BEFORE the text of the next question or section header begins. Do NOT let the bounding box bleed into or overlap with adjacent answers above or below it.
            6. Set status to 'unanswered' ONLY if the student completely failed to write the question number on the page. If the number is written, it MUST be marked 'answered'.`
		});

		const parsedData = await fetchAndParseAI<{
			evaluations: RawEvaluation[]
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
										pages_found_on: {
											type: Type.ARRAY,
											description: 'CRITICAL: Scan ALL images and list EVERY page index (e.g., 0, 1, 2) where this question number is explicitly written. Do this BEFORE transcribing.',
											items: { type: Type.INTEGER }
										},
										transcribed_text: {
											type: Type.STRING,
											description: 'CRITICAL: The exact literal text the student wrote. If scattered across multiple pages, combine all text from all occurrences here.'
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
											description: 'Array of regions covering the answer. CRITICAL: You MUST output a region object for EVERY page index you listed in pages_found_on.',
											items: {
												type: Type.OBJECT,
												properties: {
													page_index: {
														type: Type.INTEGER,
														description: 'CRITICAL: The exact integer from the "--- START OF IMAGE PAGE INDEX: X ---" marker preceding the image. NEVER use handwritten page numbers.'
													},
													bounding_box: {
														type: Type.ARRAY,
														items: { type: Type.INTEGER },
														description: '[ymin, xmin, ymax, xmax]. CRITICAL: Generous X-axis padding (left/right). Tight Y-axis bounds (top/bottom) to NEVER overlap adjacent lines.'
													}
												},
												required: ['page_index', 'bounding_box']
											}
										}
									},
									required: ['question_id', 'status', 'pages_found_on', 'transcribed_text', 'score_string', 'feedback', 'regions']
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

				delete ev.pages_found_on;
				delete ev.transcribed_text;
			});
		}

		const assessmentResult: Assessment = {
			total_score: Number(finalTotalScore.toFixed(2)),
			evaluations: (parsedData?.evaluations as Evaluation[]) || []
		};

		return json(assessmentResult);
	}
	catch (error: unknown) {
		console.error('Evaluation Error:', error);
		const msg = error instanceof Error && error.message.includes('truncated') ? 'AI output truncated on extraction.' : 'Failed to evaluate answers.';
		return json({ error: msg }, { status: 500 });
	}
};