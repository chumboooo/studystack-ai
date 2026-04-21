# Study Tool Grounding Regression Cases

These cases protect the flashcard and quiz retrieval flow from drifting into unrelated document sections.

## Physics: Newton's Laws

- Upload or use the Introductory Physics PDF.
- Generate flashcards for `Newton's Laws`.
- Generate a quiz for `Newton's Laws`.
- Expected source material should focus on concepts such as inertia, net force, acceleration, mass, momentum, inertial frames, action/reaction force pairs, and Newton's first, second, and third laws.
- Results should not use source sections about textbook organization, teaching style, study methods, author commentary, or preliminaries unless the user explicitly asks for those topics.

## General Study Tool Retrieval

- For a selected document, verify the source section can come from later in the document, not only the first pages.
- For all-documents retrieval, verify the selected source sections match the requested topic before the model generates items.
- If the selected material cannot support enough distinct items, return fewer grounded items rather than filling the set with unrelated cards or questions.
- For multi-topic requests such as `Explain topic A and then topic B`, `Compare concept A and concept B`, or `Tell me about the first and second rules`, verify evidence is retrieved for each supported part instead of only the strongest first topic.
- Flashcards and quizzes generated from multi-topic prompts should cover each supported requested part when evidence exists.

## Technical PDF Retrieval

- Upload or use a short calculus lecture PDF where a method, derivation, or formula appears after the title/intro page.
- Ask chat about both the broader lecture topic and a smaller named subtopic, method, rule, or example from inside that lecture, then generate flashcards and a quiz for the same topics.
- Expected source material should favor the later derivation, formula, definition, or worked example pages over title pages, table-of-contents pages, or generic lecture introductions.
- Smaller explicit subtopics should surface their local section instead of being overwhelmed by the broader dominant lecture theme.
- Results should preserve nearby context when the explanation spans adjacent sections or pages.
- With `STUDYSTACK_RETRIEVAL_DEBUG=true`, inspect `/api/debug/document-index?documentId=<document-id>&q=<topic>` while signed in to confirm later-page chunks and page metadata are present.
- For a 6-page technical lecture, reprocessing should create more focused page/technical sections than a broad `pages 3-6` chunk, and retrieval diagnostics should show focused evidence spans when a stored section is still large.
- Flashcards should produce multiple grounded cards for a compact technical topic when the evidence supports different angles such as definition, formula, derivation origin, interpretation, usage, and examples.
- Quizzes should produce multiple grounded questions for a compact technical topic when the evidence supports different angles, rather than collapsing to one generic question.

## Formula-Heavy Notes

- Upload or use a compact physics, engineering, or chemistry handout with formulas and worked examples.
- Ask for a concept that depends on an equation or example, then generate flashcards and a quiz from the same topic.
- Expected source material should include explanatory prose connected to equations, example markers, derivation language, or named rules.
- Results should not mix in unrelated documents when one document clearly contains the answer.

## Non-Math Prose Regression

- Upload or use a prose-heavy study packet without many formulas.
- Ask chat and generate study tools for a normal conceptual topic.
- Expected behavior should still prefer relevant definitions and explanations without requiring formula-heavy evidence.
