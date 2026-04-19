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
const INTEGRAL_SYMBOL = "\u222B";
const SUM_SYMBOL = "\u03A3";
const SQRT_SYMBOL = "\u221A";
const MINUS_SYMBOL = "\u2212";
const LESS_EQUAL_SYMBOL = "\u2264";
const GREATER_EQUAL_SYMBOL = "\u2265";
const MOJIBAKE_INTEGRAL = "\u00E2\u02C6\u00AB";
const MOJIBAKE_MINUS = "\u00E2\u02C6\u2019";
const MOJIBAKE_SQRT = "\u00E2\u02C6\u0161";
const MOJIBAKE_SUM = "\u00CE\u00A3";
const MOJIBAKE_THETA = "\u00CE\u00B8";
const MOJIBAKE_PI = "\u00CF\u20AC";
const CONSERVATIVE_INLINE_MATH_PATTERN =
  /((?:\u222B|\\int|int\b)\s*[^.;\n]{1,120}(?:=|\s+d[a-z]\b)[^.;\n]{0,120}|(?:[A-Za-z][A-Za-z0-9_]*(?:\([^)]{1,40}\))?\s*=\s*[^.;\n]{1,120})|\bd[a-z]\/d[a-z]\b|\bd\/d[a-z]\b|\bsqrt\([^)]+\)|\b(?:sin|cos|tan|sec|csc|cot|ln|log)\([^)]+\)|[A-Za-z0-9)]+\^[A-Za-z0-9({][A-Za-z0-9+\-*/().{}]*)/g;

function normalizeUnicode(value: string) {
  return value
    .replace(new RegExp(MOJIBAKE_INTEGRAL, "g"), INTEGRAL_SYMBOL)
    .replace(new RegExp(MOJIBAKE_MINUS, "g"), "-")
    .replace(new RegExp(MOJIBAKE_SQRT, "g"), SQRT_SYMBOL)
    .replace(new RegExp(MOJIBAKE_SUM, "g"), SUM_SYMBOL)
    .replace(new RegExp(MOJIBAKE_THETA, "g"), "\u03B8")
    .replace(new RegExp(MOJIBAKE_PI, "g"), "\u03C0")
    .replace(/\u222B/g, INTEGRAL_SYMBOL)
    .replace(/\u2212/g, "-")
    .replace(/\u221A/g, SQRT_SYMBOL)
    .replace(/\u2264/g, LESS_EQUAL_SYMBOL)
    .replace(/\u2265/g, GREATER_EQUAL_SYMBOL)
    .replace(/\u03A3/g, SUM_SYMBOL)
    .replace(/\u03B8/g, "\u03B8")
    .replace(/\u03C0/g, "\u03C0")
    .replace(new RegExp(MINUS_SYMBOL, "g"), "-");
}

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
  let expression = normalizeUnicode(value)
    .replace(new RegExp(`${SQRT_SYMBOL}\\s*\\(([^)]+)\\)`, "g"), "\\sqrt{$1}")
    .replace(new RegExp(`${SQRT_SYMBOL}\\s*([A-Za-z0-9]+)`, "g"), "\\sqrt{$1}")
    .replace(/\b(?:d([a-z])\/d([a-z]))\b/g, "\\frac{d$1}{d$2}")
    .replace(/\bd\/d([a-z])\b/g, "\\frac{d}{d$1}")
    .replace(new RegExp(INTEGRAL_SYMBOL, "g"), "\\int ")
    .replace(/\bint\b/g, "\\int ")
    .replace(new RegExp(SUM_SYMBOL, "g"), "\\sum ")
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\b(sin|cos|tan|sec|csc|cot|ln|log)\b/g, "\\$1")
    .replace(
      /\b(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|omega)\b/gi,
      (match) => GREEK_WORDS[match.toLowerCase()] ?? match,
    )
    .replace(/([A-Za-z0-9)]+)\^([A-Za-z0-9+\-*/().]+)/g, "$1^{$2}")
    .replace(/\s+/g, " ")
    .trim();

  expression = expression
    .replace(/\\int\s+(.+?)\s+d([a-z])\b/g, "\\int $1\\,d$2")
    .replace(/\\int\s*([A-Za-z])\s+d([A-Za-z])\b/g, "\\int $1\\,d$2")
    .replace(new RegExp(LESS_EQUAL_SYMBOL, "g"), "\\le ")
    .replace(new RegExp(GREATER_EQUAL_SYMBOL, "g"), "\\ge ");

  return expression;
}

function hasMathSignal(value: string) {
  return /\\|[=^_+\-*/]|\u222B|\u03A3|\u221A|\bd[a-z]\/d[a-z]\b|\bd\/d[a-z]\b|\bint\b|\bsqrt\b|\bsum\b/.test(
    value,
  );
}

function isLikelyDisplayMath(line: string) {
  const trimmed = normalizeUnicode(line).trim();

  if (trimmed.length < 5 || !hasMathSignal(trimmed)) {
    return false;
  }

  const wordCount = (trimmed.match(/[A-Za-z]{3,}/g) ?? []).length;
  const mathSignalCount =
    (trimmed.match(/[=^_+\-*/()]|\u222B|\u03A3|\u221A|\\int|\\frac|\bd[a-z]\/d[a-z]\b/g) ?? [])
      .length;

  return (
    trimmed.length <= 180 &&
    (trimmed.startsWith(INTEGRAL_SYMBOL) ||
      trimmed.startsWith("\\int") ||
      trimmed.includes("=") ||
      mathSignalCount >= 3) &&
    wordCount <= 10
  );
}

function canRenderMath(value: string) {
  try {
    katex.renderToString(value, {
      displayMode: false,
      output: "html",
      strict: false,
      throwOnError: true,
      trust: false,
    });
    return true;
  } catch {
    return false;
  }
}

function splitInlineMath(value: string): TextSegment[] {
  const normalizedValue = normalizeUnicode(value);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of normalizedValue.matchAll(CONSERVATIVE_INLINE_MATH_PATTERN)) {
    const rawMatch = match[0];
    const matchValue = rawMatch.trim();
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ type: "text", value: normalizedValue.slice(cursor, index) });
    }

    const normalized = normalizeMathExpression(matchValue);

    if (hasMathSignal(matchValue) && canRenderMath(normalized)) {
      segments.push({
        type: "math",
        value: normalized,
        display: false,
      });
    } else {
      segments.push({ type: "text", value: rawMatch });
    }

    cursor = index + rawMatch.length;
  }

  if (cursor < normalizedValue.length) {
    segments.push({ type: "text", value: normalizedValue.slice(cursor) });
  }

  return segments;
}

function splitPlainText(value: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = normalizeUnicode(value).split(/(\n+)/);

  for (const line of lines) {
    if (line.startsWith("\n")) {
      segments.push({ type: "text", value: line });
      continue;
    }

    if (isLikelyDisplayMath(line)) {
      const normalized = normalizeMathExpression(line);
      segments.push(
        canRenderMath(normalized)
          ? { type: "math", value: normalized, display: true }
          : { type: "text", value: line },
      );
      continue;
    }

    segments.push(...splitInlineMath(line));
  }

  return segments;
}

function tokenizeContent(content: string): TextSegment[] {
  const normalizedContent = normalizeUnicode(content);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of normalizedContent.matchAll(EXPLICIT_MATH_PATTERN)) {
    const matchValue = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push(...splitPlainText(normalizedContent.slice(cursor, index)));
    }

    const { display, expression } = stripExplicitDelimiters(matchValue);
    const normalized = normalizeMathExpression(expression);
    segments.push(
      canRenderMath(normalized)
        ? {
            type: "math",
            value: normalized,
            display,
          }
        : { type: "text", value: expression },
    );
    cursor = index + matchValue.length;
  }

  if (cursor < normalizedContent.length) {
    segments.push(...splitPlainText(normalizedContent.slice(cursor)));
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
