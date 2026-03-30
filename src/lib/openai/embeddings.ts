import { getEmbeddingDimensions, getEmbeddingModel, getOpenAIClient } from "@/lib/openai/server";

const EMBEDDING_BATCH_SIZE = 32;

function normalizeEmbedding(values: number[]) {
  return values.map((value) => Number(value));
}

export async function embedTexts(texts: string[]) {
  const normalizedTexts = texts.map((text) => text.trim()).filter(Boolean);

  if (normalizedTexts.length === 0) {
    return [];
  }

  const client = getOpenAIClient();
  const model = getEmbeddingModel();
  const dimensions = getEmbeddingDimensions();
  const vectors: number[][] = [];

  for (let index = 0; index < normalizedTexts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = normalizedTexts.slice(index, index + EMBEDDING_BATCH_SIZE);
    const response = await client.embeddings.create({
      model,
      dimensions,
      input: batch,
    });

    vectors.push(...response.data.map((entry) => normalizeEmbedding(entry.embedding)));
  }

  return vectors;
}

export async function embedText(text: string) {
  const [vector] = await embedTexts([text]);

  return vector ?? [];
}

export function serializeEmbedding(values: number[]) {
  return `[${values.join(",")}]`;
}
