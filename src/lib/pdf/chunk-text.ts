import "server-only";

type TextChunk = {
  chunkIndex: number;
  content: string;
  characterCount: number;
  metadata: {
    strategy: string;
    page_start?: number;
    page_end?: number;
    subchunk_index?: number;
  };
};
type PdfPageText = {
  pageNumber: number;
  text: string;
};

const TARGET_CHUNK_SIZE = 1800;
const MIN_CHUNK_SIZE = 600;
const TECHNICAL_TARGET_CHUNK_SIZE = 950;
const TECHNICAL_MIN_CHUNK_SIZE = 280;
const SHORT_TECHNICAL_PAGE_LIMIT = 15;
const TECHNICAL_PATTERN =
  /([=^_]|\\frac|\\int|\\sum|\\sqrt|\b(?:recall|therefore|thus|hence|solving for|substitute|differentiate|integrate|derivation|derive|formula|equation|identity|theorem|rule|law|method|example|worked example|solution|given|let|where|suppose|definition)\b|\bd[xyz]\/d[xyz]\b|\bd\/d[xyz]\b)/i;
const TECHNICAL_BREAK_PATTERN =
  /\b(?:Recall|Therefore|Thus|Hence|Solving for|Substituting|Differentiat(?:e|ing)|Integrat(?:e|ing)|This formula|The formula|Example\s*\d*|Worked example|Solution|Definition|Theorem|Rule|Method)\b/g;

function normalizeParagraphs(rawText: string) {
  return rawText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isTechnicalText(value: string) {
  return TECHNICAL_PATTERN.test(value);
}

function splitLongSegment(segment: string) {
  const sentences = segment
    .split(/(?<=[.!?])\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [segment];
  }

  return sentences;
}

function splitTechnicalUnits(text: string) {
  const marked = text.replace(TECHNICAL_BREAK_PATTERN, (match) => `\n\n${match}`);

  return marked
    .split(/\n\s*\n/g)
    .flatMap((segment) => {
      const normalized = segment.replace(/\s+/g, " ").trim();

      if (normalized.length <= TECHNICAL_TARGET_CHUNK_SIZE * 1.4) {
        return normalized ? [normalized] : [];
      }

      return splitLongSegment(normalized);
    })
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildTechnicalPageChunks({
  page,
  chunkStartIndex,
}: {
  page: PdfPageText;
  chunkStartIndex: number;
}) {
  const chunks: TextChunk[] = [];
  let buffer = "";
  const units = splitTechnicalUnits(page.text);

  for (const unit of units) {
    const nextValue = buffer ? `${buffer}\n\n${unit}` : unit;

    if (nextValue.length <= TECHNICAL_TARGET_CHUNK_SIZE || buffer.length < TECHNICAL_MIN_CHUNK_SIZE) {
      buffer = nextValue;
      continue;
    }

    chunks.push({
      chunkIndex: chunkStartIndex + chunks.length,
      content: buffer,
      characterCount: buffer.length,
      metadata: {
        strategy: "technical-page-v1",
        page_start: page.pageNumber,
        page_end: page.pageNumber,
        subchunk_index: chunks.length,
      },
    });
    buffer = unit;
  }

  if (buffer) {
    chunks.push({
      chunkIndex: chunkStartIndex + chunks.length,
      content: buffer,
      characterCount: buffer.length,
      metadata: {
        strategy: "technical-page-v1",
        page_start: page.pageNumber,
        page_end: page.pageNumber,
        subchunk_index: chunks.length,
      },
    });
  }

  return chunks;
}

function chunkShortTechnicalPages(pages: PdfPageText[]) {
  const chunks: TextChunk[] = [];

  for (const page of pages.filter((entry) => entry.text.trim().length > 0)) {
    const pageChunks = buildTechnicalPageChunks({
      page,
      chunkStartIndex: chunks.length,
    });

    chunks.push(...pageChunks);
  }

  return chunks;
}

function chunkPageText(pages: PdfPageText[]): TextChunk[] {
  const nonEmptyPages = pages.filter((entry) => entry.text.trim().length > 0);
  const technicalPageCount = nonEmptyPages.filter((page) => isTechnicalText(page.text)).length;

  if (
    nonEmptyPages.length > 0 &&
    nonEmptyPages.length <= SHORT_TECHNICAL_PAGE_LIMIT &&
    technicalPageCount > 0
  ) {
    return chunkShortTechnicalPages(nonEmptyPages);
  }

  const chunks: TextChunk[] = [];
  let buffer = "";
  let pageStart: number | undefined;
  let pageEnd: number | undefined;

  for (const page of pages.filter((entry) => entry.text.trim().length > 0)) {
    const nextValue = buffer ? `${buffer}\n\n${page.text}` : page.text;

    if (!pageStart) {
      pageStart = page.pageNumber;
    }

    if (nextValue.length <= TARGET_CHUNK_SIZE || buffer.length < MIN_CHUNK_SIZE) {
      buffer = nextValue;
      pageEnd = page.pageNumber;
      continue;
    }

    chunks.push({
      chunkIndex: chunks.length,
      content: buffer,
      characterCount: buffer.length,
      metadata: {
        strategy: "page-aware-v1",
        page_start: pageStart,
        page_end: pageEnd ?? pageStart,
      },
    });

    buffer = page.text;
    pageStart = page.pageNumber;
    pageEnd = page.pageNumber;
  }

  if (buffer) {
    chunks.push({
      chunkIndex: chunks.length,
      content: buffer,
      characterCount: buffer.length,
      metadata: {
        strategy: "page-aware-v1",
        page_start: pageStart,
        page_end: pageEnd ?? pageStart,
      },
    });
  }

  return chunks;
}

export function chunkExtractedText(rawText: string, pages: PdfPageText[] = []): TextChunk[] {
  if (pages.length > 0) {
    return chunkPageText(pages);
  }

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
        metadata: {
          strategy: "paragraph-balanced-v1",
        },
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
        metadata: {
          strategy: "paragraph-balanced-v1",
        },
      });
      buffer = "";
    }
  }

  if (buffer) {
    chunks.push({
      chunkIndex: chunks.length,
      content: buffer,
      characterCount: buffer.length,
      metadata: {
        strategy: "paragraph-balanced-v1",
      },
    });
  }

  return chunks;
}
