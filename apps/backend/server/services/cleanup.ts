import type { CleanupMode } from '@speaktype/shared';

export const CleanupService = {
  async clean(input: {
    transcript: string;
    cleanupMode: CleanupMode;
    websiteContext?: string;
  }): Promise<{ cleanedText: string }> {
    const { transcript, cleanupMode, websiteContext } = input;

    // Mode 'off' returns the transcript completely untouched without hitting Gemini API
    if (cleanupMode === 'off' || !transcript.trim()) {
      return { cleanedText: transcript };
    }

    const config = useRuntimeConfig();
    const apiKey = config.geminiApiKey as string | undefined;
    const model = (config.geminiModel as string) || 'gemini-2.5-flash';

    if (!apiKey) {
      console.warn('Gemini API key is not configured. Failing back to original transcript.');
      return { cleanedText: transcript };
    }

    try {
      const modeInstructions =
        cleanupMode === 'light'
          ? 'Fix grammar, spelling, punctuation, casing, and remove speech disfluencies (like "uh", "um", "like", stuttering, fillers). Do NOT rewrite or elevate vocabulary. Keep wording as close to the original spoken input as possible.'
          : 'Perform a professional, structured rewrite. Correct errors, refine vocabulary, ensure polished and elegant output suitable for business/professional registers.';

      const contextInstructions = websiteContext
        ? `The context is: "${websiteContext}". Tailor the tone, formatting, and register to match this context (e.g. an email, web search bar, chat, form field, etc.).`
        : '';

      const prompt = `You are a real-time voice dictation post-processor. Clean up the following transcript.

=== INPUT TEXT ===
${transcript}
==================

=== INSTRUCTIONS ===
1. LANGUAGE INTEGRITY (CRITICAL): Keep the original language and encoding of the input text exactly.
   - If the input is in Arabic, respond ONLY in clean, correct Arabic.
   - If the input is in English, respond ONLY in English.
   - NEVER translate between languages. Preserve standard, clean UTF-8 Arabic characters exactly. Do not mangle or escape Arabic.
2. EDITING STYLE:
   ${modeInstructions}
3. CONTEXTUAL AWARENESS:
   ${contextInstructions}
4. OUTPUT FORMAT: Return ONLY the raw cleaned text. Do NOT wrap it in quotes, code blocks, or include any preamble, introduction, explanation, or commentary.

Cleaned text:`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        console.warn(
          `Gemini API returned status ${response.status}. Failing back to original transcript.`,
        );
        return { cleanedText: transcript };
      }

      interface GeminiResponse {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      }

      const data = (await response.json()) as GeminiResponse;
      const cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof cleaned === 'string') {
        return { cleanedText: cleaned.trim() };
      }

      console.warn(
        'Invalid response structure from Gemini API. Failing back to original transcript.',
      );
      return { cleanedText: transcript };
    } catch (err) {
      console.warn('Gemini cleanup failed. Failing back to original transcript:', err);
      return { cleanedText: transcript };
    }
  },
};
