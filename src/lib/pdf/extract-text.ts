import "server-only";

type PdfTextExtractionResult = {
  pageCount: number;
  rawText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    lines: string[];
  }>;
};

declare global {
  var pdfjsWorker:
    | {
        WorkerMessageHandler?: unknown;
      }
    | undefined;
}

function normalizeWhitespace(value: string) {
  return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeLine(value: string) {
  return value.replace(/[ \t]+/g, " ").trim();
}

function buildStructuredLines(items: Array<unknown>) {
  const positionedItems = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const textItem = item as {
        str?: unknown;
        transform?: unknown;
      };

      if (typeof textItem.str !== "string") {
        return null;
      }

      const transform = Array.isArray(textItem.transform) ? textItem.transform : [];
      const x = typeof transform[4] === "number" ? transform[4] : 0;
      const y = typeof transform[5] === "number" ? transform[5] : 0;

      return {
        text: textItem.str,
        x,
        y,
      };
    })
    .filter((item): item is { text: string; x: number; y: number } => Boolean(item && item.text.trim()));
  const lineMap = new Map<number, Array<{ text: string; x: number }>>();

  for (const item of positionedItems) {
    const yKey = Math.round(item.y / 3) * 3;
    const lineItems = lineMap.get(yKey) ?? [];
    lineItems.push({
      text: item.text,
      x: item.x,
    });
    lineMap.set(yKey, lineItems);
  }

  return Array.from(lineMap.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([, lineItems]) =>
      normalizeLine(
        lineItems
          .sort((left, right) => left.x - right.x)
          .map((item) => item.text)
          .join(" "),
      ),
    )
    .filter(Boolean);
}

function formatExtractionError(error: unknown) {
  if (error instanceof Error) {
    const details = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : "";
    return `${error.name}: ${error.message}${details}`;
  }

  return String(error);
}

export async function extractPdfText(fileBuffer: ArrayBuffer): Promise<PdfTextExtractionResult> {
  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  let pdfjsWorker: typeof import("pdfjs-dist/legacy/build/pdf.worker.mjs");

  try {
    [pdfjs, pdfjsWorker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ]);
  } catch (error) {
    throw new Error(
      `Failed to load the PDF extraction library in the Next.js server runtime. ${formatExtractionError(error)}`,
    );
  }

  // In a Next.js server bundle there is no browser worker URL to resolve.
  // Preloading the worker message handler avoids PDF.js trying to import
  // `./pdf.worker.mjs` during fake-worker setup.
  globalThis.pdfjsWorker = pdfjsWorker;

  if (!globalThis.pdfjsWorker?.WorkerMessageHandler) {
    throw new Error(
      "Failed to initialize PDF.js worker message handler in the server runtime.",
    );
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  try {
    const pdf = await loadingTask.promise;
    const pages: Array<{
      pageNumber: number;
      text: string;
      lines: string[];
    }> = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = buildStructuredLines(textContent.items as Array<unknown>);
      const pageText = lines.length > 0
        ? lines.join("\n")
        : textContent.items
            .map((item) => {
              const textItem = item as { str?: unknown };

              return typeof textItem.str === "string" ? textItem.str : "";
            })
            .join(" ");

      pages.push({
        pageNumber,
        text: normalizeWhitespace(pageText),
        lines,
      });
      page.cleanup();
    }

    return {
      pageCount: pdf.numPages,
      rawText: normalizeWhitespace(pages.map((page) => page.text).filter(Boolean).join("\n\n")),
      pages,
    };
  } catch (error) {
    throw new Error(`StudyStack could not read text from this PDF. ${formatExtractionError(error)}`);
  } finally {
    await loadingTask.destroy();
  }
}
