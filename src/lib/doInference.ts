import OpenAI from "openai";

/**
 * DigitalOcean serverless inference client.
 *
 * DO's inference API is OpenAI-compatible, so we reuse the OpenAI SDK with a
 * different base URL + key. Generation for the recipe assistant runs here (not
 * on the OpenAI account that powers the recipe pipeline) — see decision #2 in
 * docs/RAG_Recipe_Assistant_Implementation_Guide.md.
 *
 * Lazy singleton, mirroring getStripe() / getSpaces(), so a missing key only
 * errors when the assistant is actually used.
 *
 * Env: DO_INFERENCE_BASE_URL (e.g. https://inference.do-ai.run/v1),
 *      DO_INFERENCE_API_KEY (DO model access key), DO_INFERENCE_MODEL.
 */

let client: OpenAI | null = null;

export function getDoInference(): OpenAI {
  if (!client) {
    const { DO_INFERENCE_BASE_URL, DO_INFERENCE_API_KEY } = process.env;
    if (!DO_INFERENCE_BASE_URL || !DO_INFERENCE_API_KEY) {
      throw new Error("DigitalOcean inference env vars are not configured");
    }
    client = new OpenAI({
      baseURL: DO_INFERENCE_BASE_URL,
      apiKey: DO_INFERENCE_API_KEY,
    });
  }
  return client;
}

export function getDoInferenceModel(): string {
  const model = process.env.DO_INFERENCE_MODEL;
  if (!model) {
    throw new Error("DO_INFERENCE_MODEL is not configured");
  }
  return model;
}
