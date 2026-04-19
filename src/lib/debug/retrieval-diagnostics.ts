import "server-only";

type DiagnosticPayload = Record<string, unknown>;

export function logRetrievalDiagnostic(event: string, payload: DiagnosticPayload = {}) {
  if (process.env.STUDYSTACK_RETRIEVAL_DEBUG !== "true") {
    return;
  }

  console.info(`[StudyStack retrieval] ${event}`, payload);
}
