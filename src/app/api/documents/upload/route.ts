import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  DEFAULT_DOCUMENTS_BUCKET,
  getDocumentTitleFromFileName,
  runDocumentExtraction,
} from "@/lib/documents/processing";
import {
  hasPdfMagicBytes,
  isAllowedPdfMetadata,
  MAX_PDF_UPLOAD_BYTES,
  PDF_MIME_TYPE,
  sanitizeUploadFileName,
} from "@/lib/documents/upload-validation";
import { isAllowedOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "This upload request is not allowed." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to upload documents." }, { status: 401 });
  }

  let payload: {
    title?: string;
    fileName?: string;
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Upload details could not be read." }, { status: 400 });
  }

  const title = String(payload.title ?? "").trim().slice(0, 160);
  const fileName = String(payload.fileName ?? "").trim();
  const filePath = String(payload.filePath ?? "").trim();
  const fileSize = Number(payload.fileSize ?? 0);
  const mimeType = String(payload.mimeType ?? "").trim() || PDF_MIME_TYPE;

  if (!fileName || !filePath || !Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "Upload details are incomplete." }, { status: 400 });
  }

  if (!filePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "This upload is not allowed for your account." }, { status: 403 });
  }

  if (
    !isAllowedPdfMetadata({
      fileName,
      mimeType,
      fileSize,
    })
  ) {
    return NextResponse.json(
      {
        error: `Only PDF uploads up to ${Math.floor(MAX_PDF_UPLOAD_BYTES / 1024 / 1024)} MB are supported right now.`,
      },
      { status: 400 },
    );
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_DOCUMENTS_BUCKET;
  const documentTitle = title || getDocumentTitleFromFileName(fileName);
  const safeFileName = sanitizeUploadFileName(fileName);

  const { data: downloadedFile, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (downloadError || !downloadedFile) {
    return NextResponse.json(
      {
        error: "The uploaded PDF could not be opened for study prep.",
      },
      { status: 400 },
    );
  }

  const sourceBuffer = await downloadedFile.arrayBuffer();

  if (sourceBuffer.byteLength !== fileSize || sourceBuffer.byteLength > MAX_PDF_UPLOAD_BYTES) {
    await supabase.storage.from(bucket).remove([filePath]);

    return NextResponse.json(
      { error: "The uploaded PDF size could not be verified." },
      { status: 400 },
    );
  }

  if (!hasPdfMagicBytes(new Uint8Array(sourceBuffer.slice(0, 5)))) {
    await supabase.storage.from(bucket).remove([filePath]);

    return NextResponse.json(
      { error: "That file does not look like a valid PDF." },
      { status: 400 },
    );
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: documentTitle,
      file_name: safeFileName,
      file_path: filePath,
      file_size: fileSize,
      mime_type: PDF_MIME_TYPE,
    })
    .select("id")
    .single();

  if (insertError || !document) {
    await supabase.storage.from(bucket).remove([filePath]);

    return NextResponse.json(
      {
        error: "The uploaded document could not be saved.",
      },
      { status: 400 },
    );
  }

  const result = await runDocumentExtraction({
    supabase,
    userId: user.id,
    documentId: document.id,
    sourceBuffer,
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/chat");

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        kind: "preparation_failed",
        documentId: document.id,
        error: "Your PDF was uploaded, but StudyStack could not finish preparing it.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    documentId: document.id,
    message: result.message,
  });
}
