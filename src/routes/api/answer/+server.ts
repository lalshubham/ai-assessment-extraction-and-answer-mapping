import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import { type RequestHandler, json } from '@sveltejs/kit';
import type { Question, GeminiContent, Answer } from '$lib/types';
import fetchAndParseAI from '$lib/server/ai';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const files = formData.getAll('images') as File[];
		const questionStr = formData.get('question') as string;

		if (!files.length || !questionStr) {
			return json({ error: 'Missing required data' }, { status: 400 });
		}

		const questionData = JSON.parse(questionStr) as Question;

		const contents: GeminiContent[] = (await Promise.all(files.map(async (file, index) => [
			{ text: `--- START OF IMAGE PAGE INDEX: ${index} ---` },
			{ inlineData: { data: Buffer.from(await file.arrayBuffer()).toString('base64'), mimeType: file.type || 'image/jpeg' } }
		]))).flat();

		contents.push({
			text: `You are an expert ${questionData.subject || 'school'} teacher for ${questionData.grade_level || 'students'}.
            Here are the questions in JSON format: ${JSON.stringify(questionData.items)}

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
            6. Set status to 'unanswered' ONLY if the student completely failed to write the question number on the page. If the number is written, it MUST be marked 'answered'.
            7. CONCISENESS RULE (CRITICAL): Answer sheets can be long. To prevent output truncation, keep 'transcribed_text' strictly to the core answer. Keep 'feedback' as short as possible. Limit token usage.`
		});

		const parsedData = await fetchAndParseAI<Pick<Answer, 'items'>>((model) =>
			ai.models.generateContent({
				model,
				contents,
				config: {
					maxOutputTokens: 8192,
					responseMimeType: 'application/json',
					responseSchema: {
						type: Type.OBJECT,
						properties: {
							items: {
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
						required: ['items']
					}
				}
			}),
			2, 'Answer API'
		);

		let finalTotalScore = 0;

		if (parsedData?.items?.length) {
			parsedData.items = parsedData.items.filter(ans => questionData.items.some(q => q.id === ans.question_id));

			parsedData.items.forEach(ans => {
				const q = questionData.items.find(q => q.id === ans.question_id);
				if (q?.marks !== undefined) {
					const maxMarks = Number(q.marks);
					let rawAwarded = Number(ans.score_awarded) || 0;

					if (rawAwarded === 0 && ans.feedback.trim().toLowerCase().startsWith('correct')) {
						rawAwarded = maxMarks;
					}

					const awarded = Number(Math.min(rawAwarded, maxMarks).toFixed(2));

					ans.score_awarded = awarded;
					ans.score_string = `${awarded} / ${maxMarks}`;
					finalTotalScore += awarded;
				}
			});
		}

		const answerResult: Answer = {
			total_score: Number(finalTotalScore.toFixed(2)),
			items: parsedData?.items || []
		};

		return json(answerResult);
	}
	catch (error: unknown) {
		console.error('Answer API Error:', error);
		const msg = error instanceof Error && error.message.includes('truncated') ? 'AI output truncated on answer parsing.' : 'Failed to evaluate answers.';
		return json({ error: msg }, { status: 500 });
	}
};