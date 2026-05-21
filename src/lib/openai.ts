import OpenAI from "openai";
import { UnauthenticatedError } from "./auth";

// Shared OpenAI client instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI,
});

// Helper function for common error handling
export function handleOpenAIError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof UnauthenticatedError) {
    return {
      message: "Not authenticated",
      status: 401,
    };
  }

  console.error("OpenAI API Error:", error);

  if (error instanceof OpenAI.APIError) {
    return {
      message: error.message,
      status: error.status || 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}
