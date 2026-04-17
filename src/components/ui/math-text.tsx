import katex from "katex";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MathTextProps = {
  children: string | null | undefined;
  className?: string;
  highlightQuery?: string;
};

type TextSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "math";
      value: string;
      display: boolean;
    };

const GREEK_WORDS: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  gamma: "\\gamma",
  delta: "\\delta",
  epsilon: "\\epsilon",
  theta: "\\theta",
  lambda: "\\lambda",
  mu: "\\mu",
  pi: "\\pi",
  rho: "\\rho",
  sigma: "\\sigma",
  omega: "\\omega",
};

const EXPLICIT_MATH_PATTERN =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;
const PLAIN_MATH_PATTERN =
  /(\b(?:d[xyz]\/d[xyz]|d\/d[xyz])\b|\bint(?:_[A-Za-z0-9().+-]+)?(?:\^[A-Za-z0-9().+-]+)?(?:\s+[A-Za-z0-9()+*/^.,=-]+){1,8}\s+d[A-Za-z]\b|\bsqrt\([^)]+\)|\bsum_[A-Za-z0-9().+-]+(?:\^[A-Za-z0-9().+-]+)?\s+[A-Za-z0-9()+*/^.,=-]+|[A-Za-z0-9)]+\^[A-Za-z0-9({][A-Za-z0-9+\-*/().{}]*|[∫Σ√][^,.;\n]*)/g;

function stripExplicitDelimiters(value: string) {
  if (value.startsWith("$$") && value.endsWith("$$")) {
    return {
      display: true,
      expression: value.slice(2, -2),
    };
  }

  if (value.startsWith("\\[") && value.endsWith("\\]")) {
    return {
      display: true,
      expression: value.slice(2, -2),
    };
  }

  if (value.startsWith("\\(") && value.endsWith("\\)")) {
    return {
      display: false,
      expression: value.slice(2, -2),
    };
  }

  if (value.startsWith("$") && value.endsWith("$")) {
    return {
      display: false,
      expression: value.slice(1, -1),
    };
  }

  return {
    display: false,
    expression: value,
  };
}

function normalizeMathExpression(value: string) {
  return value
    .replace(/−/g, "-")
    .replace(/\bdy\/dx\b/g, "\\frac{dy}{dx}")
    .replace(/\bdx\/dy\b/g, "\\frac{dx}{dy}")
    .replace(/\bdz\/dx\b/g, "\\frac{dz}{dx}")
    .replace(/\bd\/d([a-z])\b/g, "\\frac{d}{d$1}")
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\bint_([^\s^]+)\^([^\s]+)\s+(.+?)\s+d([a-z])\b/g, "\\int_{$1}^{$2} $3\\,d$4")
    .replace(/\bint\s+([A-Za-z0-9()+*/^.-]+)\s+d([a-z])\b/g, "\\int $1\\,d$2")
    .replace(/\bint\b/g, "\\int")
    .replace(/\bsum_([^\s^]+)\^([^\s]+)\s+/g, "\\sum_{$1}^{$2} ")
    .replace(/\b(sin|cos|tan|sec|csc|cot|ln|log)\b/g, "\\$1")
    .replace(
      /\b(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|omega)\b/gi,
      (match) => GREEK_WORDS[match.toLowerCase()] ?? match,
    )
    .replace(/([A-Za-z0-9)]+)\^([A-Za-z0-9+\-*/().]+)/g, "$1^{$2}")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeUsefulMath(value: string) {
  const normalized = value.trim();

  if (normalized.length < 2) {
    return false;
  }

  return /\\|[=^_∫Σ√+\-*/]|\bd[xyz]\/d[xyz]\b|\bint\b|\bsqrt\b|\bsum\b/.test(normalized);
}

function splitPlainText(value: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(PLAIN_MATH_PATTERN)) {
    const matchValue = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ type: "text", value: value.slice(cursor, index) });
    }

    if (looksLikeUsefulMath(matchValue)) {
      segments.push({
        type: "math",
        value: normalizeMathExpression(matchValue),
        display: matchValue.length > 42 || matchValue.includes("="),
      });
    } else {
      segments.push({ type: "text", value: matchValue });
    }

    cursor = index + matchValue.length;
  }

  if (cursor < value.length) {
    segments.push({ type: "text", value: value.slice(cursor) });
  }

  return segments;
}

function tokenizeContent(content: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(EXPLICIT_MATH_PATTERN)) {
    const matchValue = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push(...splitPlainText(content.slice(cursor, index)));
    }

    const { display, expression } = stripExplicitDelimiters(matchValue);
    segments.push({
      type: "math",
      value: normalizeMathExpression(expression),
      display,
    });
    cursor = index + matchValue.length;
  }

  if (cursor < content.length) {
    segments.push(...splitPlainText(content.slice(cursor)));
  }

  return segments;
}

function renderMath(value: string, display: boolean) {
  try {
    return katex.renderToString(value, {
      displayMode: display,
      output: "html",
      strict: false,
      throwOnError: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

function getHighlightTerms(query: string | undefined) {
  if (!query) {
    return [];
  }

  return Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3),
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderText(value: string, key: string, highlightTerms: string[]) {
  if (highlightTerms.length === 0) {
    return value;
  }

  const expression = new RegExp(`(${highlightTerms.map(escapeRegExp).join("|")})`, "gi");
  const parts = value.split(expression);

  return parts.map((part, index) =>
    highlightTerms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
      <mark key={`${key}-mark-${index}`} className="rounded bg-cyan-300/20 px-1 text-cyan-100">
        {part}
      </mark>
    ) : (
      <span key={`${key}-text-${index}`}>{part}</span>
    ),
  );
}

export function MathText({ children, className, highlightQuery }: MathTextProps) {
  const content = String(children ?? "");
  const highlightTerms = getHighlightTerms(highlightQuery);
  const rendered: ReactNode[] = tokenizeContent(content).map((segment, index) => {
    if (segment.type === "text") {
      return (
        <span key={`text-${index}`}>
          {renderText(segment.value, `text-${index}`, highlightTerms)}
        </span>
      );
    }

    const html = renderMath(segment.value, segment.display);

    if (!html) {
      return <span key={`math-fallback-${index}`}>{segment.value}</span>;
    }

    return (
      <span
        key={`math-${index}`}
        className={segment.display ? "math-display" : "math-inline"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });

  return <span className={cn("math-text", className)}>{rendered}</span>;
}
