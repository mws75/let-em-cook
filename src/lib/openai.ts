import OpenAI from "openai";

// Shared OpenAI client instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI,
});

// Helper function for common error handling
export function handleOpenAIError(error: unknown): {
  message: string;
  status: number;
} {
  console.error("OpenAI API Error:", error);

  if (error instanceof OpenAI.APIError) {
    return {
      message: error.message,
      status: error.status || 500,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}
