const INTEGRAL_SYMBOL = "\u222B";
const SQRT_SYMBOL = "\u221A";
const SUM_SYMBOL = "\u03A3";
const MINUS_SYMBOL = "\u2212";
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
const INLINE_MATH_CANDIDATE_PATTERN =
  /((?:\u222B|\\int|int(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?\b)\s*[^.;\n]{1,120}(?:=|\s+d[a-z]\b)[^.;\n]{0,120}|(?:d\/d[a-z]\s*\[[^\]]+\]\s*=\s*[^.;\n]{1,140})|(?:[A-Za-z]{1,6}(?:\([^)]{1,40}\))?\s*=\s*[A-Za-z0-9_+\-*/^()\\\u222B\u221A\s]{1,100})|\bd[a-z]?\/d[a-z]\b|\bsqrt\([^)]+\)|\b(?:sin|cos|tan|sec|csc|cot|ln|log)\([^)]+\)|[A-Za-z0-9)]+\^[A-Za-z0-9({][A-Za-z0-9+\-*/().{}]*|\b(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|omega)\b(?=\s*(?:[=+\-*/^),\]]|$)))/gi;
const MATH_SIGNAL_PATTERN =
  /\\|[=^_+\-*/]|\u222B|\u03A3|\u221A|\bd[a-z]?\/d[a-z]\b|\bint(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?\b|\bsqrt\b|\bsum\b|\b(?:sqrt|sin|cos|tan|sec|csc|cot|ln|log)\([^)]+\)|\b(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|omega)\b/i;

export function normalizeMathUnicode(value: string) {
  return value
    .replace(/\u00E2\u02C6\u00AB/g, INTEGRAL_SYMBOL)
    .replace(/\u00E2\u02C6\u2019/g, "-")
    .replace(/\u00E2\u02C6\u0161/g, SQRT_SYMBOL)
    .replace(/\u00CE\u00A3/g, SUM_SYMBOL)
    .replace(/\u00CE\u00B8/g, "\u03B8")
    .replace(/\u00CF\u20AC/g, "\u03C0")
    .replace(new RegExp(MINUS_SYMBOL, "g"), "-");
}

export function normalizeLatexExpression(value: string) {
  let expression = normalizeMathUnicode(value)
    .replace(new RegExp(`${SQRT_SYMBOL}\\s*\\(([^)]+)\\)`, "g"), "\\sqrt{$1}")
    .replace(new RegExp(`${SQRT_SYMBOL}\\s*([A-Za-z0-9]+)`, "g"), "\\sqrt{$1}")
    .replace(/\b(?:d([a-z])\/d([a-z]))\b/g, "\\frac{d$1}{d$2}")
    .replace(/\bd\/d([a-z])\b/g, "\\frac{d}{d$1}")
    .replace(new RegExp(INTEGRAL_SYMBOL, "g"), "\\int ")
    .replace(/\bint_([A-Za-z0-9]+)\^([A-Za-z0-9]+)\b/g, "\\int_{$1}^{$2} ")
    .replace(/\bint\^([A-Za-z0-9]+)_([A-Za-z0-9]+)\b/g, "\\int_{$2}^{$1} ")
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
    .replace(/\\int\s+_/g, "\\int_")
    .replace(/\\int\s*([^=+\-;,\n]+?)\s+d([a-z])\b/g, "\\int $1\\,d$2")
    .replace(/\\int\s*([A-Za-z])\s*d([A-Za-z])\b/g, "\\int $1\\,d$2")
    .replace(/\\int\s+/g, "\\int ")
    .replace(/\\frac\s*\{\s*d\s*\}\s*\{\s*d([a-z])\s*\}/gi, "\\frac{d}{d$1}")
    .replace(/\\frac\s*\{\s*d([a-z])\s*\}\s*\{\s*d([a-z])\s*\}/gi, "\\frac{d$1}{d$2}")
    .replace(/\[\s*([^\]]+)\s*\]/g, "[$1]")
    .replace(/\u2264/g, "\\le ")
    .replace(/\u2265/g, "\\ge ")
    .replace(/\s+([=+\-])/g, " $1")
    .replace(/([=+\-])\s+/g, "$1 ")
    .replace(/\\int\s+_({[^}]+}|[A-Za-z0-9]+)\s*\^({[^}]+}|[A-Za-z0-9]+)/g, (_, lower, upper) => {
      return `\\int_${lower}^${upper}`;
    })
    .replace(/\\int\s+_\{([^}]+)\}\^\{([^}]+)\}/g, (_, lower, upper) => {
      return `\\int_{${lower}}^{${upper}}`;
    })
    .replace(/\s+/g, " ")
    .trim();

  return expression;
}

export function hasMathSignal(value: string) {
  return MATH_SIGNAL_PATTERN.test(value);
}

function hasExplicitMathDelimiter(value: string) {
  EXPLICIT_MATH_PATTERN.lastIndex = 0;
  const hasDelimiter = EXPLICIT_MATH_PATTERN.test(value);
  EXPLICIT_MATH_PATTERN.lastIndex = 0;

  return hasDelimiter;
}

function isLikelyStandaloneFormula(line: string) {
  const normalized = normalizeMathUnicode(line).trim();

  if (!hasMathSignal(normalized) || normalized.length < 3 || normalized.length > 180) {
    return false;
  }

  const wordCount = (normalized.match(/[A-Za-z]{3,}/g) ?? []).length;
  const signalCount =
    (normalized.match(/[=^_+\-*/()]|\u222B|\u03A3|\u221A|\\int|\\frac|\bd[a-z]?\/d[a-z]\b|\bint\b/g) ?? [])
      .length;
  const startsAsFormula = /^(\u222B|\\int|int\b|d\/d[a-z]\b|d[a-z]\/d[a-z]\b)/i.test(normalized);

  return (
    startsAsFormula ||
    (normalized.includes("=") && signalCount >= 2 && wordCount <= 10) ||
    (signalCount >= 4 && wordCount <= 8)
  );
}

function normalizeInlineMathCandidates(value: string) {
  return value.replace(INLINE_MATH_CANDIDATE_PATTERN, (match) => {
    if (/^\\\(|^\\\[|^\$/.test(match)) {
      return match;
    }

    const { formulaText, trailingText } = splitTrailingProse(match);
    const normalized = normalizeLatexExpression(formulaText);

    return normalized ? `\\(${normalized}\\)${trailingText}` : match;
  });
}

function countMathSignals(value: string) {
  return (value.match(/[=^_+\-*/()]|\u222B|\u03A3|\u221A|\\int|\\frac|\bd[a-z]?\/d[a-z]\b|\bint\b/gi) ?? []).length;
}

function splitTrailingProse(value: string) {
  const normalized = normalizeMathUnicode(value);
  const connectors =
    /\s+(and|because|which|where|so|then|therefore|thus|hence|from|for|with|while|but|since|after)\b/gi;
  let candidate: { formulaText: string; trailingText: string } | null = null;

  for (const match of normalized.matchAll(connectors)) {
    const index = match.index ?? -1;

    if (index <= 0) {
      continue;
    }

    const formulaText = normalized.slice(0, index).trimEnd();
    const trailingText = normalized.slice(index);
    const proseWordCount = (trailingText.match(/[A-Za-z]{3,}/g) ?? []).length;
    const trailingMathSignals = countMathSignals(trailingText);

    if (formulaText.length < 6 || proseWordCount < 3 || trailingMathSignals > 1) {
      continue;
    }

    if (countMathSignals(formulaText) < 2) {
      continue;
    }

    candidate = {
      formulaText,
      trailingText,
    };
    break;
  }

  return (
    candidate ?? {
      formulaText: normalized,
      trailingText: "",
    }
  );
}

export function normalizePlainTextMath(value: string) {
  const normalized = normalizeMathUnicode(value);

  if (!hasMathSignal(normalized) || hasExplicitMathDelimiter(normalized)) {
    return normalized;
  }

  return normalized
    .split(/(\n+)/)
    .map((line) => {
      if (line.startsWith("\n") || !hasMathSignal(line)) {
        return line;
      }

      if (isLikelyStandaloneFormula(line)) {
        const formula = normalizeLatexExpression(line);

        return formula ? `\\[${formula}\\]` : line;
      }

      return normalizeInlineMathCandidates(line);
    })
    .join("");
}
