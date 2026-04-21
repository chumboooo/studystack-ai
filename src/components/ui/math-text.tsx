import katex from "katex";
import type { ReactNode } from "react";
import {
  hasMathSignal,
  normalizeLatexExpression,
  normalizeMathUnicode,
  normalizePlainTextMath,
} from "@/lib/math/normalize";
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

const EXPLICIT_MATH_PATTERN =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;
const INTEGRAL_SYMBOL = "\u222B";
const CONSERVATIVE_INLINE_MATH_PATTERN =
  /((?:\u222B|\\int|int(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?\b)\s*[^.;\n]{1,120}(?:=|\s+d[a-z]\b)[^.;\n]{0,120}|(?:d\/d[a-z]\s*\[[^\]]+\]\s*=\s*[^.;\n]{1,140})|(?:[A-Za-z]{1,6}(?:\([^)]{1,40}\))?\s*=\s*[A-Za-z0-9_+\-*/^()\\\u222B\u221A\s]{1,100})|\bd[a-z]?\/d[a-z]\b|\bsqrt\([^)]+\)|\b(?:sin|cos|tan|sec|csc|cot|ln|log)\([^)]+\)|[A-Za-z0-9)]+\^[A-Za-z0-9({][A-Za-z0-9+\-*/().{}]*|\b(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|omega)\b(?=\s*(?:[=+\-*/^),\]]|$)))/gi;

function getMathSignalCount(value: string) {
  return (value.match(/[=^_+\-*/()]|\u222B|\u03A3|\u221A|\\int|\\frac|\\sum|\\sqrt|\bd[a-z]?\/d[a-z]\b/g) ?? [])
    .length;
}

function getMathWordCount(value: string) {
  return (value.match(/[A-Za-z]{3,}/g) ?? []).length;
}

function shouldPromoteInlineToDisplay(value: string) {
  const normalized = normalizeMathUnicode(value).trim();

  if (!hasMathSignal(normalized) || normalized.length < 8) {
    return false;
  }

  const signalCount = getMathSignalCount(normalized);
  const wordCount = getMathWordCount(normalized);
  const startsAsFormula = /^(\u222B|\\int|\\frac|\\sum|\\sqrt|d\/d[a-z]\b|d[a-z]\/d[a-z]\b)/i.test(normalized);
  const hasEquality = normalized.includes("=");
  const looksStepLike =
    /(?:^|[\s(])(?:therefore|thus|hence|so|then|next|substitute|differentiate|integrate|solve|rearrange)\b/i.test(
      normalized,
    ) && hasEquality;

  return (
    startsAsFormula ||
    looksStepLike ||
    (hasEquality && signalCount >= 2 && normalized.length >= 18 && wordCount <= 16) ||
    signalCount >= 6
  );
}

function splitDisplayCandidate(value: string) {
  const normalized = normalizeMathUnicode(value).trim();

  if (!hasMathSignal(normalized)) {
    return null;
  }

  const startMatches = [
    normalized.search(/(?:\u222B|\\int|\bint(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?\b|\\frac|d\/d[a-z]\b|d[a-z]\/d[a-z]\b)/i),
    normalized.search(/[A-Za-z][A-Za-z0-9()]*\s*=/),
  ].filter((index) => index >= 0);

  if (startMatches.length === 0) {
    return null;
  }

  const startIndex = Math.min(...startMatches);
  const before = normalized.slice(0, startIndex).trimEnd();
  let formula = normalized.slice(startIndex).trim();
  let after = "";

  const trailingConnector =
    /\s+(and|because|which|where|so|then|therefore|thus|hence|from|for|with|while|but|since|after)\b/gi;

  for (const match of formula.matchAll(trailingConnector)) {
    const index = match.index ?? -1;

    if (index <= 0) {
      continue;
    }

    const candidateFormula = formula.slice(0, index).trimEnd();
    const candidateAfter = formula.slice(index).trim();
    const proseWordCount = getMathWordCount(candidateAfter);
    const trailingMathSignals = getMathSignalCount(candidateAfter);

    if (proseWordCount >= 2 && trailingMathSignals <= 1 && getMathSignalCount(candidateFormula) >= 2) {
      formula = candidateFormula;
      after = candidateAfter;
      break;
    }
  }

  if (!shouldPromoteInlineToDisplay(formula)) {
    return null;
  }

  const normalizedFormula = prepareRenderableExpression(formula);

  if (!canRenderMath(normalizedFormula)) {
    return null;
  }

  return {
    before,
    formula: normalizedFormula,
    after,
  };
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

function prepareRenderableExpression(value: string) {
  const normalized = normalizeMathUnicode(value).trim();

  if (/\\[A-Za-z]+/.test(normalized)) {
    return normalized.replace(/\s+/g, " ").trim();
  }

  return normalizeLatexExpression(normalized);
}

function hasExplicitMathDelimiter(value: string) {
  EXPLICIT_MATH_PATTERN.lastIndex = 0;
  const hasDelimiter = EXPLICIT_MATH_PATTERN.test(value);
  EXPLICIT_MATH_PATTERN.lastIndex = 0;

  return hasDelimiter;
}

function isLikelyDisplayMath(line: string) {
  const trimmed = normalizeMathUnicode(line).trim();

  if (trimmed.length < 5 || !hasMathSignal(trimmed)) {
    return false;
  }

  const wordCount = getMathWordCount(trimmed);
  const mathSignalCount = getMathSignalCount(trimmed);

  const startsAsFormula = trimmed.startsWith(INTEGRAL_SYMBOL) || trimmed.startsWith("\\int");

  return (
    trimmed.length <= 160 &&
    (startsAsFormula || mathSignalCount >= 3 || (trimmed.includes("=") && mathSignalCount >= 2)) &&
    wordCount <= (startsAsFormula ? 12 : 8)
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
  const normalizedValue = normalizeMathUnicode(value);

  if (!hasMathSignal(normalizedValue)) {
    return [{ type: "text", value: normalizedValue }];
  }

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of normalizedValue.matchAll(CONSERVATIVE_INLINE_MATH_PATTERN)) {
    const rawMatch = match[0];
    const matchValue = rawMatch.trim();
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ type: "text", value: normalizedValue.slice(cursor, index) });
    }

    const normalized = prepareRenderableExpression(matchValue);

    if (hasMathSignal(matchValue) && canRenderMath(normalized)) {
      segments.push({
        type: "math",
        value: normalized,
        display: shouldPromoteInlineToDisplay(normalized),
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
  const lines = normalizeMathUnicode(value).split(/(\n+)/);

  for (const line of lines) {
    if (line.startsWith("\n")) {
      segments.push({ type: "text", value: line });
      continue;
    }

    const splitCandidate = splitDisplayCandidate(line);

    if (splitCandidate) {
      if (splitCandidate.before) {
        segments.push(...splitInlineMath(splitCandidate.before));
      }

      segments.push({
        type: "math",
        value: splitCandidate.formula,
        display: true,
      });

      if (splitCandidate.after) {
        segments.push({ type: "text", value: ` ${splitCandidate.after}` });
      }

      continue;
    }

    if (isLikelyDisplayMath(line)) {
      const normalized = prepareRenderableExpression(line);
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
  const normalizedContent = normalizePlainTextMath(content);

  EXPLICIT_MATH_PATTERN.lastIndex = 0;

  if (!hasExplicitMathDelimiter(normalizedContent) && !hasMathSignal(normalizedContent)) {
    return [{ type: "text", value: normalizedContent }];
  }

  EXPLICIT_MATH_PATTERN.lastIndex = 0;

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of normalizedContent.matchAll(EXPLICIT_MATH_PATTERN)) {
    const matchValue = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push(...splitPlainText(normalizedContent.slice(cursor, index)));
    }

    const { display, expression } = stripExplicitDelimiters(matchValue);
    const normalized = prepareRenderableExpression(expression);
    segments.push(
      canRenderMath(normalized)
        ? {
            type: "math",
            value: normalized,
            display: display || shouldPromoteInlineToDisplay(normalized),
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
