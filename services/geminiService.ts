import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, USER_PROMPT_TEXT, ANALYSIS_RESPONSE_SCHEMA } from '../constants';
import type { AnalysisData } from '../types';

// This function assumes process.env.API_KEY is set in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const FALLBACK_DATA: AnalysisData = {
  AGE: "?",
  WEIGHT: "?",
  HEIGHT: "?",
  RACE: "?",
  MOOD: "?",
  HAIR_COLOR: "?",
  SHIRT_COLOR: "?",
};

export const analyzePerson = async (base64Image: string): Promise<AnalysisData> => {
  if (!process.env.API_KEY) {
    console.error("API key not found.");
    return FALLBACK_DATA;
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image,
      },
    };

    const textPart = {
      text: USER_PROMPT_TEXT,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        temperature: 0.2,
      }
    });
    
    const text = response.text.trim();
    if (!text) {
        console.error("Gemini API returned an empty response.");
        return FALLBACK_DATA;
    }
    
    const parsedJson = JSON.parse(text);
    return {
        AGE: parsedJson.AGE || "?",
        WEIGHT: parsedJson.WEIGHT || "?",
        HEIGHT: parsedJson.HEIGHT || "?",
        RACE: parsedJson.RACE || "?",
        MOOD: parsedJson.MOOD || "?",
        HAIR_COLOR: parsedJson.HAIR_COLOR || "?",
        SHIRT_COLOR: parsedJson.SHIRT_COLOR || "?",
    };

  } catch (error) {
    console.error("Error analyzing person with Gemini API:", error);
    return FALLBACK_DATA;
  }
};