export default async function fetchAndParseAI<T>(
    apiCall: (model: string) => Promise<{ text?: string }>,
    retries = 2,
    apiName = 'API'
): Promise<T> {
    let currentModel = 'gemini-3.5-flash-lite';

    for (let i = 0; i <= retries; i++) {
        try {
            const response = await apiCall(currentModel);
            const text = response.text || '{}';

            const timestamp = new Date().toLocaleString();
            console.info(`[${timestamp}] ${apiName} used ${currentModel}`);

            try {
                return JSON.parse(text) as T;
            }
            catch {
                const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
                try {
                    return JSON.parse(cleaned) as T;
                }
                catch (error) {
                    const match = cleaned.match(/\{[\s\S]*\}/);
                    if (match) {
                        try {
                            return JSON.parse(match[0]) as T;
                        }
                        catch (error) {
                            throw new Error(`[${apiName}] AI output completely truncated.`, { cause: error });
                        }
                    }
                    throw new Error(`[${apiName}] AI output completely truncated.`, { cause: error });
                }
            }
        }
        catch (error: unknown) {
            const checkNetworkError = (err: unknown): boolean => {
                if (typeof err !== 'object' || err === null) return false;

                const code = (err as { code?: string }).code;
                if (code === 'ECONNRESET' || code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_SOCKET') return true;

                if ('cause' in err) {
                    return checkNetworkError((err as { cause: unknown }).cause);
                }

                return false;
            };

            const checkOverloadedError = (err: unknown): boolean => {
                if (typeof err !== 'object' || err === null) return false;
                const msg = (err as { message?: string }).message || '';
                const status = (err as { status?: number | string }).status;
                const code = (err as { code?: number | string }).code;

                if (status === 503 || status === 'UNAVAILABLE' || code === 503) return true;
                if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) return true;

                return false;
            };

            const isNetworkError = checkNetworkError(error);
            const isParseError = error instanceof Error && error.message.includes('completely truncated');
            const isOverloaded = checkOverloadedError(error);

            if (i === retries || (!isNetworkError && !isParseError && !isOverloaded)) {
                throw error;
            }

            if (isOverloaded && currentModel === 'gemini-3.5-flash-lite') {
                console.warn(`[${apiName}] 503 High Demand detected. Switching to fallback model gemini-3.1-flash-lite...`);
                currentModel = 'gemini-3.1-flash-lite';
            }
            else {
                console.warn(`[${apiName}] Output glitch detected. Retrying... (${i + 1}/${retries})`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`[${apiName}] Failed after ${retries} retries`);
}