import "server-only";

type PdfTextExtractionResult = {
  pageCount: number;
  rawText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
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
    }> = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ");

      pages.push({
        pageNumber,
        text: normalizeWhitespace(pageText),
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
