
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeGenResponse } from "../types";

// Helper to get AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to fetch image URL and convert to base64
const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Converts audio and optional image context into a structured recipe.
 */
export const generateRecipeFromMedia = async (audioBlob: Blob, imageBase64?: string): Promise<RecipeGenResponse> => {
  const ai = getAI();
  
  // Convert Audio Blob to Base64
  const audioBase64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  const parts: any[] = [
    {
      inlineData: {
        mimeType: audioBlob.type || 'audio/webm',
        data: audioBase64
      }
    },
    {
      text: `You are Susu, a warm and expert home cook. Listen to the audio description of the recipe.
      ${imageBase64 ? "Also use the provided image of the dish/ingredients for visual context and accuracy." : ""}
      
      Extract a structured recipe JSON with the following details:
      1. Title & Appetizing Description (in Susu's voice).
      2. Servings, Prep Time, & Difficulty (Easy/Medium/Hard).
      3. Estimated Calories per serving.
      4. Ingredients: Include specific quantities. 
         - Estimate cost in USD.
         - Categorize each ingredient.
      5. Step-by-step instructions.
      6. "Susu's Secret" tips.
      7. Relevant tags.`
    }
  ];

  if (imageBase64) {
      parts.push({
          inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64.split(',')[1] // Ensure clean base64
          }
      });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          servings: { type: Type.NUMBER },
          prepTime: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
          calories: { type: Type.NUMBER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          tips: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                amount: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                category: { type: Type.STRING }
              }
            }
          },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (!response.text) throw new Error("Failed to generate recipe from inputs");
  return JSON.parse(response.text) as RecipeGenResponse;
};

/**
 * Generates a high-quality image of the dish.
 */
export const generateRecipeImage = async (title: string, description: string): Promise<string> => {
  const ai = getAI();
  const prompt = `A professional, cinematic, high-resolution food photography shot of ${title}. ${description}. 
  Dark moody lighting, rustic wooden table, 4k, michelin star presentation, highly detailed texture.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Generates thumbnails for recipe instructions
 */
export const generateInstructionThumbnails = async (instructions: string[]): Promise<string[]> => {
  const ai = getAI();
  
  // We'll generate them sequentially to avoid overwhelming rate limits, though parallel is faster.
  // For a user facing app, let's try parallel but handle errors gracefully.
  
  const promises = instructions.map(async (inst, index) => {
    try {
        // Short delay to spread requests slightly
        await new Promise(resolve => setTimeout(resolve, index * 200));

        const prompt = `Cinematic close-up food photography thumbnail representing this cooking step: "${inst}". 
        Focus strictly on the action (e.g. chopping, stirring, boiling, baking). 
        Warm, moody lighting, photorealistic, appetizing, highly detailed.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                 // Standard image generation config
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return "";
    } catch (e) {
        console.warn(`Failed to generate thumbnail for step ${index}`, e);
        return ""; // Return empty string on failure
    }
  });

  return Promise.all(promises);
};

/**
 * Generates a cinematic video intro using Veo.
 * Uses the persona image as a starting frame for a transition effect.
 */
export const generateRecipeVideo = async (title: string, imageUrl?: string, personaImageUrl?: string): Promise<string> => {
  const ai = getAI();
  
  // Logic: If we have a recipe image, transition from that. 
  // If NOT, but we have Susu's image (persona), transition from Susu to the food.
  const startImageBase64 = imageUrl ? imageUrl.split(',')[1] : (personaImageUrl ? await urlToBase64(personaImageUrl) : null);
  
  const prompt = imageUrl 
    ? `Cinematic slow motion masterpiece shot of ${title}. Golden hour lighting. The camera pans slowly over the dish, showcasing steam rising and delicious textures. 4k resolution, highly detailed, professional food commercial style.`
    : `Cinematic transition starting with a warm, loving grandmother in a kitchen, smoothly transforming into a close-up of a delicious ${title}. Warm golden lighting, steam rising, high-end culinary documentary style. 4k resolution.`;
  
  let operation;
  
  if (startImageBase64) {
     operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: startImageBase64,
            mimeType: 'image/jpeg' // Assuming jpeg for Unsplash or camera capture
        },
        config: {
            numberOfVideos: 1,
            resolution: '1080p', // Upgraded to 1080p
            aspectRatio: '16:9'
        }
     });
  } else {
    operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '1080p', // Upgraded to 1080p
            aspectRatio: '16:9'
        }
     });
  }

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Video generation failed");

  const videoRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
  const videoBlob = await videoRes.blob();
  return URL.createObjectURL(videoBlob);
};

/**
 * Ask Susu: Uses Search Grounding to answer cooking questions
 */
export const askSusuWithGrounding = async (query: string, recipeContext?: string): Promise<{ text: string, sources: any[] }> => {
    const ai = getAI();
    const prompt = `You are Susu. Answer the user's question about cooking. 
    ${recipeContext ? `Context: The user is currently looking at this recipe: ${recipeContext}.` : ""}
    Use Google Search to find accurate substitutions, wine pairings, or facts if needed.
    Keep it warm, motherly, and helpful.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
            systemInstruction: prompt,
            tools: [{ googleSearch: {} }]
        }
    });

    return {
        text: response.text || "Sorry, dear, I couldn't find that right now.",
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
}
