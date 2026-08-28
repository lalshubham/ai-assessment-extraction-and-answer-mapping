export default async function fetchAndParseAI<T>(
    apiCall: () => Promise<any>,
    retries = 2,
    apiName = 'API'
): Promise<T> {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await apiCall();
            const text = response.text || '{}';

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
                    if (match) return JSON.parse(match[0]) as T;
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

            const isNetworkError = checkNetworkError(error);

            if (i === retries || !isNetworkError) {
                throw error;
            }

            console.warn(`[${apiName}] Network glitch detected. Retrying... (${i + 1}/${retries})`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`[${apiName}] Failed after ${retries} retries`);
}