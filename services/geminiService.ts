import { GoogleGenAI } from "@google/genai";

// Note: API_KEY is automatically provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Sends HTML content to the Gemini API for proofreading.
 * The model is instructed to correct spelling and grammar while preserving HTML tags.
 * @param htmlContent The HTML content string to be proofread.
 * @returns The proofread HTML content.
 */
export async function proofreadText(htmlContent: string): Promise<string> {
  if (!htmlContent.trim()) {
    return htmlContent;
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert proofreader. The user will provide you with a block of HTML content from a rich text editor. Your task is to correct any spelling and grammar mistakes within the text nodes of the HTML. You must preserve all HTML tags and their attributes exactly as they are. Only modify the text content. Return the full, corrected HTML block.\n\nUser's HTML:\n${htmlContent}`,
        config: {
            // Use a lower temperature for more deterministic, focused corrections
            temperature: 0.3,
        }
    });
    return response.text;
  } catch (error) {
    console.error("Error with Gemini API:", error);
    throw new Error("Failed to proofread text. Please check your connection or API key setup.");
  }
}
