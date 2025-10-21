import { Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = "You are a tactical scanner. Analyze the person in the image and provide the requested information in JSON format. Provide your best estimate for each field.";
export const USER_PROMPT_TEXT = "Analyze the person in this image.";

export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    AGE: {
      type: Type.STRING,
      description: "Approximate age in years, e.g., '25-30'."
    },
    WEIGHT: {
      type: Type.STRING,
      description: "Approximate weight in lbs or kg, e.g., '150-160 lbs'."
    },
    HEIGHT: {
      type: Type.STRING,
      description: "Approximate height in feet/inches or cm, e.g., '5\\'10\" - 6\\'0\"'."
    },
    RACE: {
      type: Type.STRING,
      description: "Apparent race or ethnicity, e.g., 'Caucasian'."
    },
    MOOD: {
      type: Type.STRING,
      description: "Apparent mood or emotion, e.g., 'Neutral', 'Happy'."
    },
    HAIR_COLOR: {
      type: Type.STRING,
      description: "Apparent hair color, e.g., 'Brown', 'Blonde'."
    },
    SHIRT_COLOR: {
      type: Type.STRING,
      description: "Dominant color of the person's shirt, e.g., 'Blue', 'Red'."
    },
  },
  required: ["AGE", "WEIGHT", "HEIGHT", "RACE", "MOOD", "HAIR_COLOR", "SHIRT_COLOR"],
};