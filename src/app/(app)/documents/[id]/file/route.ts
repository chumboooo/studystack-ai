import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_BUCKET = "documents";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createErrorResponse({
  title,
  message,
  status,
  backHref,
}: {
  title: string;
  message: string;
  status: number;
  backHref: string;
}) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(34,211,238,0.12), transparent 30%),
          #020617;
        color: #e2e8f0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .panel {
        width: min(100%, 640px);
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(15,23,42,0.88);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 18px 48px rgba(2,6,23,0.45);
      }
      .eyebrow {
        color: #67e8f9;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 16px 0 12px;
        font-size: clamp(28px, 5vw, 40px);
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #94a3b8;
        line-height: 1.7;
      }
      a {
        display: inline-flex;
        margin-top: 24px;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 20px;
        border-radius: 9999px;
        color: #020617;
        background: #67e8f9;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <div class="eyebrow">StudyStack AI</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="${escapeHtml(backHref)}">Back to document</a>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
    },
  });
}

function getDisposition(fileName: string, mode: string | null) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const encodedFileName = encodeURIComponent(fileName);
  const type = mode === "download" ? "attachment" : "inline";

  return `${type}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mode = request.nextUrl.searchParams.get("mode");
  const backHref = `/documents/${id}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, title, file_name, file_path, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (documentError) {
    return createErrorResponse({
      title: "This PDF is unavailable",
      message: documentError.message,
      status: 500,
      backHref,
    });
  }

  if (!document) {
    return createErrorResponse({
      title: "Document not found",
      message: "That file could not be found or does not belong to this signed-in account.",
      status: 404,
      backHref: "/documents",
    });
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_BUCKET;
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(document.file_path);

  if (downloadError || !fileData) {
    return createErrorResponse({
      title: "The PDF could not be loaded",
      message:
        downloadError?.message ??
        "The stored file is missing or could not be accessed from Supabase Storage.",
      status: 404,
      backHref,
    });
  }

  const arrayBuffer = await fileData.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "content-type": document.mime_type || "application/pdf",
      "content-disposition": getDisposition(document.file_name, mode),
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}
