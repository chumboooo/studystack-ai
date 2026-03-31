import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  DEFAULT_DOCUMENTS_BUCKET,
  formatDocumentProcessingError,
  getDocumentTitleFromFileName,
  runDocumentExtraction,
} from "@/lib/documents/processing";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const title = String(payload.title ?? "").trim();
  const fileName = String(payload.fileName ?? "").trim();
  const filePath = String(payload.filePath ?? "").trim();
  const fileSize = Number(payload.fileSize ?? 0);
  const mimeType = String(payload.mimeType ?? "").trim() || "application/pdf";

  if (!fileName || !filePath || !Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "Upload details are incomplete." }, { status: 400 });
  }

  if (!filePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "This upload path is not allowed for your account." }, { status: 403 });
  }

  if (mimeType !== "application/pdf" && !fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF uploads are supported right now." }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_DOCUMENTS_BUCKET;
  const documentTitle = title || getDocumentTitleFromFileName(fileName);

  const { data: downloadedFile, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (downloadError || !downloadedFile) {
    return NextResponse.json(
      {
        error:
          downloadError?.message ??
          "The uploaded PDF could not be read back from storage for processing.",
      },
      { status: 400 },
    );
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: documentTitle,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      mime_type: "application/pdf",
    })
    .select("id")
    .single();

  if (insertError || !document) {
    await supabase.storage.from(bucket).remove([filePath]);

    return NextResponse.json(
      {
        error: insertError?.message ?? "The uploaded document could not be saved.",
      },
      { status: 400 },
    );
  }

  const result = await runDocumentExtraction({
    supabase,
    userId: user.id,
    documentId: document.id,
    sourceBuffer: await downloadedFile.arrayBuffer(),
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/chat");

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        kind: "processing_failed",
        documentId: document.id,
        error: `Your PDF was uploaded, but StudyStack could not finish preparing it. ${formatDocumentProcessingError(result.message)}`,
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
