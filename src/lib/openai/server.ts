import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

export function getGroundedAnswerModel() {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}

export function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

export function getEmbeddingDimensions() {
  const rawValue = process.env.OPENAI_EMBEDDING_DIMENSIONS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1536;
}
