type DemoDocument = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  extraction_status: "completed";
  page_count: number;
  chunk_count: number;
  error_message: string | null;
  raw_text: string;
  chunks: Array<{
    id: string;
    chunk_index: number;
    content: string;
    character_count: number;
    created_at: string;
  }>;
};

type DemoChatSource = {
  id: string;
  source_label: string;
  document_id: string;
  chunk_id: string;
  document_title: string;
  chunk_index: number;
  rank: number;
  content_excerpt: string;
  created_at: string;
};

type DemoChatTurn = {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  status: "completed" | "no_sources" | "failed";
  error_message: string | null;
  created_at: string;
  sources: DemoChatSource[];
};

type DemoChatSession = {
  id: string;
  title: string;
  updated_at: string;
  turns: DemoChatTurn[];
};

type DemoFlashcard = {
  id: string;
  prompt: string;
  answer: string;
  source_document_id: string | null;
  source_document_title: string | null;
  source_chunk_index: number | null;
  created_at: string;
};

type DemoFlashcardSet = {
  id: string;
  title: string;
  source_mode: "manual" | "retrieval";
  created_at: string;
  updated_at: string;
  cards: DemoFlashcard[];
};

type DemoQuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string;
  source_document_id: string | null;
  source_document_title: string | null;
  source_chunk_index: number | null;
  created_at: string;
};

type DemoQuizSet = {
  id: string;
  title: string;
  source_mode: "manual" | "retrieval";
  created_at: string;
  updated_at: string;
  questions: DemoQuizQuestion[];
};

type DemoPlannerEntry = {
  id: string;
  title: string;
  entry_date: string;
  entry_type: "study_session" | "quiz_review" | "exam_prep" | "reminder";
  note: string | null;
  created_at: string;
};

export type DemoWorkspaceData = {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  documents: DemoDocument[];
  chatSessions: DemoChatSession[];
  flashcardSets: DemoFlashcardSet[];
  quizSets: DemoQuizSet[];
  plannerEntries: DemoPlannerEntry[];
};

function dateWithOffset(daysFromToday: number, hour = 14) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date;
}

function isoWithOffset(daysFromToday: number, hour = 14) {
  return dateWithOffset(daysFromToday, hour).toISOString();
}

function dateKeyWithOffset(daysFromToday: number) {
  const date = dateWithOffset(daysFromToday, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function getDemoWorkspaceData(): DemoWorkspaceData {
  const calculusRawText = `Integration by Parts

Recall the product rule:
d/dx [u(x)v(x)] = u(x) dv/dx + v(x) du/dx

Integrating both sides gives the integration by parts formula:
\\[
\\int u\\,dv = uv - \\int v\\,du
\\]

Use this method when the integrand is easier after splitting it into u and dv.

Example:
\\[
\\int x e^x\\,dx
\\]
Choose u = x and dv = e^x dx, so du = dx and v = e^x.

Then:
\\[
\\int x e^x\\,dx = x e^x - \\int e^x\\,dx = x e^x - e^x + C
\\]`;

  const biologyRawText = `Cellular Respiration

Cellular respiration is the process cells use to transfer energy from glucose into ATP.
Glycolysis occurs in the cytoplasm and produces pyruvate, ATP, and NADH.
The Krebs cycle releases carbon dioxide and generates electron carriers.
The electron transport chain uses oxygen as the final electron acceptor and produces most ATP.

Mitosis creates two genetically identical daughter cells for growth and repair.
Meiosis creates four genetically varied cells for sexual reproduction.`;

  const documents: DemoDocument[] = [
    {
      id: "demo-doc-calc",
      title: "Calc 2 Notes",
      file_name: "calc2-integration-techniques.pdf",
      file_path: "demo/calc2-integration-techniques.pdf",
      file_size: 188_000,
      mime_type: "application/pdf",
      created_at: isoWithOffset(-3, 11),
      extraction_status: "completed",
      page_count: 6,
      chunk_count: 4,
      error_message: null,
      raw_text: calculusRawText,
      chunks: [
        {
          id: "demo-chunk-calc-0",
          chunk_index: 0,
          content: "Recall the product rule: d/dx [u(x)v(x)] = u(x) dv/dx + v(x) du/dx.",
          character_count: 80,
          created_at: isoWithOffset(-3, 11),
        },
        {
          id: "demo-chunk-calc-1",
          chunk_index: 1,
          content:
            "Integrating both sides gives the integration by parts formula: \\[ \\int u\\,dv = uv - \\int v\\,du \\].",
          character_count: 118,
          created_at: isoWithOffset(-3, 11),
        },
        {
          id: "demo-chunk-calc-2",
          chunk_index: 2,
          content:
            "Use integration by parts when the integrand becomes simpler after splitting it into u and dv.",
          character_count: 96,
          created_at: isoWithOffset(-3, 11),
        },
        {
          id: "demo-chunk-calc-3",
          chunk_index: 3,
          content:
            "Example: \\[ \\int x e^x\\,dx = x e^x - \\int e^x\\,dx = x e^x - e^x + C \\].",
          character_count: 95,
          created_at: isoWithOffset(-3, 11),
        },
      ],
    },
    {
      id: "demo-doc-bio",
      title: "Biology Review",
      file_name: "biology-cell-processes.pdf",
      file_path: "demo/biology-cell-processes.pdf",
      file_size: 324_000,
      mime_type: "application/pdf",
      created_at: isoWithOffset(-6, 10),
      extraction_status: "completed",
      page_count: 14,
      chunk_count: 5,
      error_message: null,
      raw_text: biologyRawText,
      chunks: [
        {
          id: "demo-chunk-bio-0",
          chunk_index: 0,
          content:
            "Cellular respiration transfers energy from glucose into ATP through glycolysis, the Krebs cycle, and the electron transport chain.",
          character_count: 128,
          created_at: isoWithOffset(-6, 10),
        },
        {
          id: "demo-chunk-bio-1",
          chunk_index: 1,
          content:
            "Glycolysis occurs in the cytoplasm and produces pyruvate, ATP, and NADH.",
          character_count: 79,
          created_at: isoWithOffset(-6, 10),
        },
        {
          id: "demo-chunk-bio-2",
          chunk_index: 2,
          content:
            "The electron transport chain uses oxygen as the final electron acceptor and produces most ATP.",
          character_count: 101,
          created_at: isoWithOffset(-6, 10),
        },
        {
          id: "demo-chunk-bio-3",
          chunk_index: 3,
          content:
            "Mitosis creates two genetically identical daughter cells for growth and repair.",
          character_count: 83,
          created_at: isoWithOffset(-6, 10),
        },
        {
          id: "demo-chunk-bio-4",
          chunk_index: 4,
          content:
            "Meiosis creates four genetically varied cells for sexual reproduction.",
          character_count: 74,
          created_at: isoWithOffset(-6, 10),
        },
      ],
    },
  ];

  const chatSessions: DemoChatSession[] = [
    {
      id: "demo-session-calc",
      title: "Integration by parts walkthrough",
      updated_at: isoWithOffset(-1, 17),
      turns: [
        {
          id: "demo-turn-calc-1",
          session_id: "demo-session-calc",
          question: "Explain integration by parts and where the formula comes from.",
          answer:
            "Integration by parts comes from integrating the product rule. Start with the product rule below, integrate both sides, and then rearrange to isolate the original integral.\n\n\\[\n\\frac{d}{dx}[u(x)v(x)] = u\\frac{dv}{dx} + v\\frac{du}{dx}\n\\]\n\nIntegrating gives:\n\n\\[\n\\int u\\,dv = uv - \\int v\\,du\n\\]\n\nIn practice, the method is useful when choosing \\(u\\) and \\(dv\\) makes the new integral simpler than the original one. The worked example in the notes uses \\(\\int x e^x\\,dx\\) and shows that the second integral becomes straightforward after the split.",
          status: "completed",
          error_message: null,
          created_at: isoWithOffset(-1, 16),
          sources: [
            {
              id: "demo-source-calc-1",
              source_label: "S1",
              document_id: "demo-doc-calc",
              chunk_id: "demo-chunk-calc-0",
              document_title: "Calc 2 Notes",
              chunk_index: 0,
              rank: 0.98,
              content_excerpt:
                "Recall the product rule: d/dx [u(x)v(x)] = u(x) dv/dx + v(x) du/dx.",
              created_at: isoWithOffset(-1, 16),
            },
            {
              id: "demo-source-calc-2",
              source_label: "S2",
              document_id: "demo-doc-calc",
              chunk_id: "demo-chunk-calc-1",
              document_title: "Calc 2 Notes",
              chunk_index: 1,
              rank: 0.95,
              content_excerpt:
                "Integrating both sides gives the integration by parts formula: \\[ \\int u\\,dv = uv - \\int v\\,du \\].",
              created_at: isoWithOffset(-1, 16),
            },
            {
              id: "demo-source-calc-3",
              source_label: "S3",
              document_id: "demo-doc-calc",
              chunk_id: "demo-chunk-calc-3",
              document_title: "Calc 2 Notes",
              chunk_index: 3,
              rank: 0.91,
              content_excerpt:
                "Example: \\[ \\int x e^x\\,dx = x e^x - \\int e^x\\,dx = x e^x - e^x + C \\].",
              created_at: isoWithOffset(-1, 16),
            },
          ],
        },
      ],
    },
    {
      id: "demo-session-bio",
      title: "Cellular respiration review",
      updated_at: isoWithOffset(-2, 15),
      turns: [
        {
          id: "demo-turn-bio-1",
          session_id: "demo-session-bio",
          question: "What are the main stages of cellular respiration?",
          answer:
            "The notes describe three main stages: glycolysis, the Krebs cycle, and the electron transport chain. Glycolysis begins in the cytoplasm, the Krebs cycle releases carbon dioxide and generates electron carriers, and the electron transport chain uses oxygen as the final electron acceptor while producing most ATP.",
          status: "completed",
          error_message: null,
          created_at: isoWithOffset(-2, 15),
          sources: [
            {
              id: "demo-source-bio-1",
              source_label: "S1",
              document_id: "demo-doc-bio",
              chunk_id: "demo-chunk-bio-0",
              document_title: "Biology Review",
              chunk_index: 0,
              rank: 0.97,
              content_excerpt:
                "Cellular respiration transfers energy from glucose into ATP through glycolysis, the Krebs cycle, and the electron transport chain.",
              created_at: isoWithOffset(-2, 15),
            },
            {
              id: "demo-source-bio-2",
              source_label: "S2",
              document_id: "demo-doc-bio",
              chunk_id: "demo-chunk-bio-2",
              document_title: "Biology Review",
              chunk_index: 2,
              rank: 0.9,
              content_excerpt:
                "The electron transport chain uses oxygen as the final electron acceptor and produces most ATP.",
              created_at: isoWithOffset(-2, 15),
            },
          ],
        },
      ],
    },
  ];

  const flashcardSets: DemoFlashcardSet[] = [
    {
      id: "demo-flashcards-calc",
      title: "Integration techniques",
      source_mode: "retrieval",
      created_at: isoWithOffset(-2, 14),
      updated_at: isoWithOffset(-1, 17),
      cards: [
        {
          id: "demo-card-1",
          prompt: "What formula defines integration by parts?",
          answer: "\\[ \\int u\\,dv = uv - \\int v\\,du \\]",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 1,
          created_at: isoWithOffset(-1, 17),
        },
        {
          id: "demo-card-2",
          prompt: "Which derivative rule does integration by parts come from?",
          answer: "It comes from integrating the product rule.",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 0,
          created_at: isoWithOffset(-1, 17),
        },
        {
          id: "demo-card-3",
          prompt: "When is integration by parts a good choice?",
          answer: "When splitting the integrand into \\(u\\) and \\(dv\\) makes the remaining integral simpler.",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 2,
          created_at: isoWithOffset(-1, 17),
        },
        {
          id: "demo-card-4",
          prompt: "How does the example \\(\\int x e^x\\,dx\\) simplify after applying integration by parts?",
          answer: "It becomes \\(x e^x - \\int e^x\\,dx\\), which simplifies to \\(x e^x - e^x + C\\).",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 3,
          created_at: isoWithOffset(-1, 17),
        },
      ],
    },
    {
      id: "demo-flashcards-bio-manual",
      title: "Mitosis vs meiosis",
      source_mode: "manual",
      created_at: isoWithOffset(-4, 13),
      updated_at: isoWithOffset(-2, 12),
      cards: [
        {
          id: "demo-card-5",
          prompt: "How many daughter cells does mitosis produce?",
          answer: "Two genetically identical daughter cells.",
          source_document_id: null,
          source_document_title: null,
          source_chunk_index: null,
          created_at: isoWithOffset(-2, 12),
        },
        {
          id: "demo-card-6",
          prompt: "How many daughter cells does meiosis produce?",
          answer: "Four genetically varied cells.",
          source_document_id: null,
          source_document_title: null,
          source_chunk_index: null,
          created_at: isoWithOffset(-2, 12),
        },
      ],
    },
  ];

  const quizSets: DemoQuizSet[] = [
    {
      id: "demo-quiz-physics",
      title: "Oscillation",
      source_mode: "retrieval",
      created_at: isoWithOffset(-5, 11),
      updated_at: isoWithOffset(-1, 15),
      questions: [
        {
          id: "demo-question-1",
          question:
            "For a simple harmonic oscillator described by \\(x(t) = A\\cos(\\omega t + \\varphi)\\), what does the amplitude \\(A\\) represent?",
          choices: [
            "The maximum displacement from equilibrium",
            "The time required to return to the same position and velocity",
            "The starting time of the oscillator relative to the clock",
            "The number of oscillations per second",
          ],
          correct_choice_index: 0,
          explanation:
            "Amplitude is the largest distance the oscillator reaches from equilibrium. Frequency is tied to \\(\\omega\\), not \\(A\\).",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 3,
          created_at: isoWithOffset(-1, 15),
        },
        {
          id: "demo-question-2",
          question: "Why is integration by parts useful in the notes?",
          choices: [
            "It turns every integral into a geometric series",
            "It can simplify an integral after splitting it into \\(u\\) and \\(dv\\)",
            "It always removes all exponentials",
            "It is only used for definite integrals",
          ],
          correct_choice_index: 1,
          explanation:
            "The notes say the method is useful when the integrand becomes simpler after the split into \\(u\\) and \\(dv\\).",
          source_document_id: "demo-doc-calc",
          source_document_title: "Calc 2 Notes",
          source_chunk_index: 2,
          created_at: isoWithOffset(-1, 15),
        },
      ],
    },
    {
      id: "demo-quiz-bio-manual",
      title: "Cell processes check-in",
      source_mode: "manual",
      created_at: isoWithOffset(-4, 11),
      updated_at: isoWithOffset(-2, 11),
      questions: [
        {
          id: "demo-question-3",
          question: "Which stage of cellular respiration takes place in the cytoplasm?",
          choices: ["Krebs cycle", "Glycolysis", "Electron transport chain", "Chemiosmosis"],
          correct_choice_index: 1,
          explanation: "Glycolysis happens in the cytoplasm before the later mitochondrial stages.",
          source_document_id: null,
          source_document_title: null,
          source_chunk_index: null,
          created_at: isoWithOffset(-2, 11),
        },
      ],
    },
  ];

  const plannerEntries: DemoPlannerEntry[] = [
    {
      id: "demo-plan-1",
      title: "Review Calc 2 integration techniques",
      entry_date: dateKeyWithOffset(1),
      entry_type: "study_session",
      note: "Open the chat thread first, then review the flashcards.",
      created_at: isoWithOffset(-1, 9),
    },
    {
      id: "demo-plan-2",
      title: "Retry the oscillation quiz",
      entry_date: dateKeyWithOffset(2),
      entry_type: "quiz_review",
      note: "Focus on amplitude, phase, and period vocabulary.",
      created_at: isoWithOffset(-1, 9),
    },
    {
      id: "demo-plan-3",
      title: "Biology chapter review",
      entry_date: dateKeyWithOffset(4),
      entry_type: "exam_prep",
      note: "Compare mitosis and meiosis before lab review.",
      created_at: isoWithOffset(-2, 9),
    },
  ];

  return {
    user: {
      id: "demo-user",
      email: "demo@studystack.local",
      fullName: "StudyStack Demo",
    },
    documents,
    chatSessions,
    flashcardSets,
    quizSets,
    plannerEntries,
  };
}

export function getDemoDocument(documentId: string) {
  return getDemoWorkspaceData().documents.find((document) => document.id === documentId) ?? null;
}

export function getDemoFlashcardSet(setId: string) {
  return getDemoWorkspaceData().flashcardSets.find((set) => set.id === setId) ?? null;
}

export function getDemoQuizSet(setId: string) {
  return getDemoWorkspaceData().quizSets.find((set) => set.id === setId) ?? null;
}

export function getDemoChatSession(sessionId: string) {
  return getDemoWorkspaceData().chatSessions.find((session) => session.id === sessionId) ?? null;
}
