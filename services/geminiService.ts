
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateTopicIdeas(): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate 5 creative and distinct writing portfolio topic ideas. They should be suitable for showcasing a range of writing styles.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.topics || [];
  } catch (error) {
    console.error("Error generating topic ideas:", error);
    throw new Error("Failed to generate topic ideas. Please check your API key and network connection.");
  }
}

export async function getWritingFeedback(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide constructive feedback on the following piece of writing. Focus on clarity, tone, engagement, and grammar. Format your feedback as a concise, actionable list using markdown.

      Writing:
      ---
      ${text}
      ---
      `,
      config: {
        temperature: 0.5,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting writing feedback:", error);
    throw new Error("Failed to get writing feedback. Please check your API key and network connection.");
  }
}

export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A high-quality, professional illustration for a writing portfolio. Style should be clean and modern. Prompt: ${prompt}`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Please check your API key and ensure the prompt is appropriate.");
  }
}
