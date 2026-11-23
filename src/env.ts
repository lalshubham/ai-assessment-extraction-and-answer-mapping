import { defineEnvVars } from '@sveltejs/kit/env';
import { building } from '$app/env';

export const variables = defineEnvVars({
	GEMINI_API_KEY: {
		schema: (input) => {
			if (!building && !input) {
				throw new Error('GEMINI_API_KEY is required');
			}
			return input ?? '';
		}
	}
});