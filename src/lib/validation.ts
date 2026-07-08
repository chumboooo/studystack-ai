export const MAX_CHAT_QUESTION_LENGTH = 1200;
export const MAX_DOCUMENT_TITLE_LENGTH = 160;
export const MAX_STUDY_SET_TITLE_LENGTH = 140;
export const MAX_STUDY_TOPIC_LENGTH = 180;
export const MAX_PLANNER_TITLE_LENGTH = 140;
export const MAX_PLANNER_NOTE_LENGTH = 600;
export const MAX_FLASHCARD_SIDE_LENGTH = 500;
export const MAX_QUIZ_QUESTION_LENGTH = 320;
export const MAX_QUIZ_CHOICE_LENGTH = 180;
export const MAX_QUIZ_EXPLANATION_LENGTH = 500;

export function normalizeSingleLineText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeMultilineText(value: string, maxLength: number) {
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function validateChatQuestion(value: string) {
  const normalized = normalizeSingleLineText(value, MAX_CHAT_QUESTION_LENGTH);

  if (normalized.length < 3) {
    return { ok: false as const, error: "Enter a fuller question before asking StudyStack." };
  }

  return { ok: true as const, value: normalized };
}

export function validateDocumentTitle(value: string) {
  const normalized = normalizeSingleLineText(value, MAX_DOCUMENT_TITLE_LENGTH);

  if (!normalized) {
    return { ok: false as const, error: "Document title cannot be empty." };
  }

  return { ok: true as const, value: normalized };
}

export function validateStudySetTitle(value: string, label: "flashcards" | "quiz") {
  const normalized = normalizeSingleLineText(value, MAX_STUDY_SET_TITLE_LENGTH);

  if (!normalized) {
    return {
      ok: false as const,
      error: `Add a title for this ${label === "quiz" ? "quiz" : "flashcard set"}.`,
    };
  }

  return { ok: true as const, value: normalized };
}

export function validateOptionalTopic(value: string) {
  return normalizeSingleLineText(value, MAX_STUDY_TOPIC_LENGTH);
}

export function validatePlannerEntry(values: {
  title: string;
  entryDate: string;
  entryType: string;
  note: string;
}) {
  const title = normalizeSingleLineText(values.title, MAX_PLANNER_TITLE_LENGTH);
  const note = normalizeMultilineText(values.note, MAX_PLANNER_NOTE_LENGTH);

  if (!title || !values.entryDate) {
    return { ok: false as const, error: "Add a title and date for the study plan." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.entryDate)) {
    return { ok: false as const, error: "Choose a valid calendar date for the study plan." };
  }

  const allowedTypes = new Set(["study_session", "quiz_review", "exam_prep", "reminder"]);
  const entryType = allowedTypes.has(values.entryType)
    ? (values.entryType as "study_session" | "quiz_review" | "exam_prep" | "reminder")
    : "study_session";

  return {
    ok: true as const,
    value: {
      title,
      entryDate: values.entryDate,
      entryType,
      note: note || null,
    },
  };
}
