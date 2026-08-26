export default async function fetchAPI<T>(
    apiCall: () => Promise<T>,
    retries = 2,
    apiName = 'API'
): Promise<T> {
    for (let i = 0; i <= retries; i++) {
        try {
            return await apiCall();
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