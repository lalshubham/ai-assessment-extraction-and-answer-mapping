export function parseAIResponse(text: string) {
    try {
        return JSON.parse(text);
    }
    catch {
        const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
            return JSON.parse(cleaned);
        }
        catch (err) {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error("AI output completely truncated.", { cause: err });
        }
    }
}