import "server-only";

type TextChunk = {
  chunkIndex: number;
  content: string;
  characterCount: number;
};

const TARGET_CHUNK_SIZE = 1800;
const MIN_CHUNK_SIZE = 600;

function normalizeParagraphs(rawText: string) {
  return rawText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function chunkExtractedText(rawText: string): TextChunk[] {
  const paragraphs = normalizeParagraphs(rawText);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    const nextValue = buffer ? `${buffer}\n\n${paragraph}` : paragraph;

    if (nextValue.length <= TARGET_CHUNK_SIZE) {
      buffer = nextValue;
      continue;
    }

    if (buffer.length >= MIN_CHUNK_SIZE) {
      chunks.push({
        chunkIndex: chunks.length,
        content: buffer,
        characterCount: buffer.length,
      });
      buffer = paragraph;
      continue;
    }

    buffer = nextValue;

    if (buffer.length >= TARGET_CHUNK_SIZE) {
      chunks.push({
        chunkIndex: chunks.length,
        content: buffer,
        characterCount: buffer.length,
      });
      buffer = "";
    }
  }

  if (buffer) {
    chunks.push({
      chunkIndex: chunks.length,
      content: buffer,
      characterCount: buffer.length,
    });
  }

  return chunks;
}
