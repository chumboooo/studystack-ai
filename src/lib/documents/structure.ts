import { hasMathSignal, normalizePlainTextMath } from "../math/normalize";
import type { Json } from "../supabase/database.types";

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
  lines?: string[];
};

export type DocumentSectionNode = {
  nodeIndex: number;
  nodeType: "document" | "page" | "section" | "span";
  parentNodeIndex: number | null;
  title: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  metadata: Json;
};

export type StructuredTextChunk = {
  chunkIndex: number;
  content: string;
  characterCount: number;
  metadata: {
    strategy: string;
    node_index: number;
    parent_node_index: number | null;
    node_type: "span";
    heading: string | null;
    section_title: string | null;
    page_start: number;
    page_end: number;
    formula_count: number;
    example_count: number;
    has_math: boolean;
  };
};

export type StructuredDocument = {
  version: "structured-study-v1";
  rawText: string;
  normalizedText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    normalizedText: string;
    headings: string[];
  }>;
  nodes: DocumentSectionNode[];
  chunks: StructuredTextChunk[];
};

const HEADING_PATTERN =
  /^((?:chapter|section|unit|week|lesson|lecture|example|definition|theorem|rule|method)\b|\d+(?:\.\d+)*\s+|[A-Z][A-Za-z0-9\s:/()-]{2,90}$)/i;
const STRUCTURAL_BREAK_PATTERN =
  /\b(?:Example\s*\d*|Worked example|Solution|Definition|Theorem|Rule|Method|Recall|Therefore|Thus|Hence|Solving for|Substituting|Differentiating|Integrating|The formula|This formula)\b/i;
const TECHNICAL_SIGNAL_PATTERN =
  /\b(?:formula|equation|derive|derivation|therefore|thus|hence|example|definition|theorem|rule|law|method|solve|substitute|differentiate|integrate)\b/i;
const TARGET_SPAN_SIZE = 850;
const MIN_SPAN_SIZE = 220;

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getPageLines(page: ExtractedPdfPage) {
  const sourceLines = page.lines && page.lines.length > 0 ? page.lines : page.text.split(/\n+/);

  return sourceLines.map(normalizeLine).filter(Boolean);
}

function isLikelyHeading(line: string) {
  const normalized = normalizeLine(line);
  const wordCount = (normalized.match(/[A-Za-z0-9]+/g) ?? []).length;
  const punctuationCount = (normalized.match(/[.!?]/g) ?? []).length;
  const mathLike = hasMathSignal(normalized);

  return (
    normalized.length >= 3 &&
    normalized.length <= 110 &&
    wordCount <= 12 &&
    punctuationCount === 0 &&
    !mathLike &&
    (HEADING_PATTERN.test(normalized) || normalized === normalized.toUpperCase())
  );
}

function countFormulas(value: string) {
  return (value.match(/[=^_]|\u222B|\\int|\\frac|\\sum|\\sqrt|\bd[a-z]?\/d[a-z]\b|\bint\b/gi) ?? []).length;
}

function countExamples(value: string) {
  return (value.match(/\b(?:example|worked example|solution|given|suppose)\b/gi) ?? []).length;
}

function shouldBreakBeforeLine({
  line,
  buffer,
}: {
  line: string;
  buffer: string;
}) {
  if (!buffer) {
    return false;
  }

  if (buffer.length >= TARGET_SPAN_SIZE) {
    return true;
  }

  return (
    buffer.length >= MIN_SPAN_SIZE &&
    (isLikelyHeading(line) || STRUCTURAL_BREAK_PATTERN.test(line) || (hasMathSignal(line) && countFormulas(buffer) > 0))
  );
}

function pushSpan({
  nodes,
  chunks,
  buffer,
  pageNumber,
  currentHeading,
  parentNodeIndex,
}: {
  nodes: DocumentSectionNode[];
  chunks: StructuredTextChunk[];
  buffer: string;
  pageNumber: number;
  currentHeading: string | null;
  parentNodeIndex: number;
}) {
  const trimmedBuffer = buffer.trim();
  const contentSource =
    currentHeading && !trimmedBuffer.toLowerCase().startsWith(currentHeading.toLowerCase())
      ? `${currentHeading}\n${trimmedBuffer}`
      : trimmedBuffer;
  const content = normalizePlainTextMath(contentSource);

  if (!content) {
    return;
  }

  const formulaCount = countFormulas(content);
  const exampleCount = countExamples(content);
  const nodeIndex = nodes.length;

  nodes.push({
    nodeIndex,
    nodeType: "span",
    parentNodeIndex,
    title: currentHeading,
    content,
    pageStart: pageNumber,
    pageEnd: pageNumber,
    metadata: {
      has_math: hasMathSignal(content),
      formula_count: formulaCount,
      example_count: exampleCount,
      technical_signal: TECHNICAL_SIGNAL_PATTERN.test(content),
    },
  });
  chunks.push({
    chunkIndex: chunks.length,
    content,
    characterCount: content.length,
    metadata: {
      strategy: "structured-span-v1",
      node_index: nodeIndex,
      parent_node_index: parentNodeIndex,
      node_type: "span",
      heading: currentHeading,
      section_title: currentHeading,
      page_start: pageNumber,
      page_end: pageNumber,
      formula_count: formulaCount,
      example_count: exampleCount,
      has_math: hasMathSignal(content),
    },
  });
}

export function buildStructuredDocument({
  title,
  rawText,
  pages,
}: {
  title: string;
  rawText: string;
  pages: ExtractedPdfPage[];
}): StructuredDocument {
  const nodes: DocumentSectionNode[] = [
    {
      nodeIndex: 0,
      nodeType: "document",
      parentNodeIndex: null,
      title,
      content: normalizePlainTextMath(rawText),
      pageStart: pages[0]?.pageNumber ?? null,
      pageEnd: pages.at(-1)?.pageNumber ?? null,
      metadata: {
        page_count: pages.length,
      },
    },
  ];
  const chunks: StructuredTextChunk[] = [];
  const structuredPages: StructuredDocument["pages"] = [];

  for (const page of pages) {
    const lines = getPageLines(page);
    const pageNodeIndex = nodes.length;
    const pageText = normalizePlainTextMath(page.text);
    const headings: string[] = [];
    let currentHeading: string | null = null;
    let currentSectionNodeIndex = pageNodeIndex;
    let buffer = "";

    nodes.push({
      nodeIndex: pageNodeIndex,
      nodeType: "page",
      parentNodeIndex: 0,
      title: `Page ${page.pageNumber}`,
      content: pageText,
      pageStart: page.pageNumber,
      pageEnd: page.pageNumber,
      metadata: {
        has_math: hasMathSignal(pageText),
        formula_count: countFormulas(pageText),
      },
    });

    for (const line of lines) {
      if (isLikelyHeading(line)) {
        pushSpan({
          nodes,
          chunks,
          buffer,
          pageNumber: page.pageNumber,
          currentHeading,
          parentNodeIndex: currentSectionNodeIndex,
        });
        buffer = "";
        currentHeading = line;
        currentSectionNodeIndex = nodes.length;
        headings.push(line);
        nodes.push({
          nodeIndex: currentSectionNodeIndex,
          nodeType: "section",
          parentNodeIndex: pageNodeIndex,
          title: line,
          content: "",
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          metadata: {},
        });
        continue;
      }

      if (
        shouldBreakBeforeLine({
          line,
          buffer,
        })
      ) {
        pushSpan({
          nodes,
          chunks,
          buffer,
          pageNumber: page.pageNumber,
          currentHeading,
          parentNodeIndex: currentSectionNodeIndex,
        });
        buffer = "";
      }

      buffer = buffer ? `${buffer}\n${line}` : line;
    }

    pushSpan({
      nodes,
      chunks,
      buffer,
      pageNumber: page.pageNumber,
      currentHeading,
      parentNodeIndex: currentSectionNodeIndex,
    });

    structuredPages.push({
      pageNumber: page.pageNumber,
      text: page.text,
      normalizedText: pageText,
      headings,
    });
  }

  return {
    version: "structured-study-v1",
    rawText,
    normalizedText: normalizePlainTextMath(rawText),
    pages: structuredPages,
    nodes,
    chunks,
  };
}
