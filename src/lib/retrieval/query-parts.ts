const LEADING_REQUEST_PATTERN =
  /^(?:please\s+)?(?:can you\s+)?(?:help me\s+)?(?:explain|describe|summarize|compare|contrast|tell me about|give me|make|create|generate|build|quiz me on|review|study)\s+/i;
const TRAILING_CONTEXT_PATTERN =
  /\s+(?:from|using|based on|in|for)\s+(?:my|the|this|these|uploaded)?\s*(?:notes|documents|document|pdf|materials|study materials)\s*$/i;
const PROMPT_WORDS = new Set([
  "about",
  "and",
  "between",
  "compare",
  "contrast",
  "difference",
  "explain",
  "generate",
  "make",
  "quiz",
  "review",
  "study",
  "tell",
  "then",
  "versus",
  "with",
]);

export type QueryPartPlan = {
  originalQuery: string;
  parts: string[];
  isMultiPart: boolean;
  intent: "comparison" | "sequence" | "multi-topic" | "single";
};

function cleanPart(value: string) {
  return value
    .replace(LEADING_REQUEST_PATTERN, "")
    .replace(TRAILING_CONTEXT_PATTERN, "")
    .replace(/^[,;:\s]+|[,;:\s.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulWordCount(value: string) {
  return cleanPart(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2 && !PROMPT_WORDS.has(word)).length;
}

function uniqueParts(parts: string[]) {
  const seen = new Set<string>();

  return parts
    .map(cleanPart)
    .filter((part) => part.length >= 2 && getMeaningfulWordCount(part) > 0)
    .filter((part) => {
      const key = part.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function splitComparison(query: string) {
  const normalized = cleanPart(query);
  const betweenMatch = normalized.match(/\bbetween\s+(.+?)\s+and\s+(.+)$/i);

  if (betweenMatch) {
    return uniqueParts([betweenMatch[1], betweenMatch[2]]);
  }

  const compareMatch = normalized.match(
    /^(?:compare|contrast|difference between|differences between)?\s*(.+?)\s+(?:vs\.?|versus|compared with|compared to|and)\s+(.+)$/i,
  );

  if (!compareMatch) {
    return [];
  }

  return uniqueParts([compareMatch[1], compareMatch[2]]);
}

function splitSequence(query: string) {
  const normalized = cleanPart(query);
  const parts = normalized.split(/\s*(?:;|\n+|,\s*then\b|\band then\b|\bthen\b)\s*/i);

  return parts.length > 1 ? uniqueParts(parts) : [];
}

function splitRepeatedVerb(query: string) {
  const normalized = cleanPart(query);
  const match = normalized.match(/^(.+?)\s+and\s+(?:explain|describe|summarize|review|show)\s+(.+)$/i);

  return match ? uniqueParts([match[1], match[2]]) : [];
}

function splitOrdinalPair(query: string) {
  const normalized = cleanPart(query);
  const match = normalized.match(/^(.+?\b)(first|second|third|fourth|1st|2nd|3rd|4th)\s+and\s+(first|second|third|fourth|1st|2nd|3rd|4th)(\b.*)$/i);

  if (!match) {
    return [];
  }

  const prefix = match[1].trim();
  const suffix = match[4].trim();

  return uniqueParts([`${prefix} ${match[2]} ${suffix}`, `${prefix} ${match[3]} ${suffix}`]);
}

function splitGenericAnd(query: string) {
  const normalized = cleanPart(query);

  if (!/\b(?:compare|contrast|difference|different|explain|describe|summarize|review|tell me about)\b/i.test(query)) {
    return [];
  }

  const parts = normalized.split(/\s+(?:and|&|vs\.?|versus)\s+/i);

  if (parts.length < 2 || parts.length > 4) {
    return [];
  }

  const cleaned = uniqueParts(parts);

  return cleaned.length >= 2 && cleaned.every((part) => part.length <= 90) ? cleaned : [];
}

export function decomposeQueryParts(query: string): QueryPartPlan {
  const originalQuery = query.trim().replace(/\s+/g, " ");

  if (!originalQuery) {
    return {
      originalQuery,
      parts: [],
      isMultiPart: false,
      intent: "single",
    };
  }

  const comparisonParts =
    /\b(compare|contrast|difference|different|versus|vs\.?|between)\b/i.test(originalQuery)
      ? splitComparison(originalQuery)
      : [];

  if (comparisonParts.length >= 2) {
    return {
      originalQuery,
      parts: comparisonParts,
      isMultiPart: true,
      intent: "comparison",
    };
  }

  const sequenceParts = splitSequence(originalQuery);

  if (sequenceParts.length >= 2) {
    return {
      originalQuery,
      parts: sequenceParts,
      isMultiPart: true,
      intent: "sequence",
    };
  }

  const repeatedVerbParts = splitRepeatedVerb(originalQuery);

  if (repeatedVerbParts.length >= 2) {
    return {
      originalQuery,
      parts: repeatedVerbParts,
      isMultiPart: true,
      intent: "sequence",
    };
  }

  const ordinalParts = splitOrdinalPair(originalQuery);

  if (ordinalParts.length >= 2) {
    return {
      originalQuery,
      parts: ordinalParts,
      isMultiPart: true,
      intent: "multi-topic",
    };
  }

  const genericParts = splitGenericAnd(originalQuery);

  if (genericParts.length >= 2) {
    return {
      originalQuery,
      parts: genericParts,
      isMultiPart: true,
      intent: "multi-topic",
    };
  }

  return {
    originalQuery,
    parts: [originalQuery],
    isMultiPart: false,
    intent: "single",
  };
}
