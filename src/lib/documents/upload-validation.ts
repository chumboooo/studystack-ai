export const MAX_PDF_UPLOAD_BYTES = 50 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";

export function sanitizeUploadFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");

  return safeName.slice(0, 140) || "document.pdf";
}

export function isPdfFileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

export function isAllowedPdfMetadata({
  fileName,
  mimeType,
  fileSize,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  return (
    isPdfFileName(fileName) &&
    mimeType === PDF_MIME_TYPE &&
    Number.isFinite(fileSize) &&
    fileSize > 0 &&
    fileSize <= MAX_PDF_UPLOAD_BYTES
  );
}

export function hasPdfMagicBytes(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}
