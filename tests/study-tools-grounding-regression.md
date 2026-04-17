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
