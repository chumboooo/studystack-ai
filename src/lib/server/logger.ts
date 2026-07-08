const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|cookie|key/i;

function sanitizeForLogging(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLogging);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeForLogging(nestedValue),
    ]),
  );
}

export function logServerEvent(
  level: "info" | "warn" | "error",
  event: string,
  details?: Record<string, unknown>,
) {
  const payload = details ? sanitizeForLogging(details) : undefined;

  console[level](`[StudyStack] ${event}`, payload ?? "");
}
