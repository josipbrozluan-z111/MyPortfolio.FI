import { GoogleGenAI } from "@google/genai";

// Note: API_KEY is automatically provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Sends text to the Gemini API for proofreading.
 * @param text The text to be proofread.
 * @returns The proofread text.
 */
export async function proofreadText(text: string): Promise<string> {
  if (!text.trim()) {
    return text;
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Proofread the following text for any spelling and grammar errors. Return only the corrected text, without any introductory phrases like "Here is the corrected text:". The user's text is: "${text}"`,
        config: {
            // Use a lower temperature for more deterministic, focused corrections
            temperature: 0.2,
        }
    });
    return response.text;
  } catch (error) {
    console.error("Error with Gemini API:", error);
    throw new Error("Failed to proofread text. Please check your connection or API key setup.");
  }
}
