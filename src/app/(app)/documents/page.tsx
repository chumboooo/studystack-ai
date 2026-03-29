import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Documents"
        title="Organize your source material"
        description="This is where uploads, folders, and document processing status will live once backend storage is connected."
      />

      <EmptyState
        eyebrow="No documents yet"
        title="Upload notes, PDFs, or slides to start a study stack."
        description="Your document library will become the source of truth for grounded chat, flashcard generation, and quiz creation."
        actionLabel="Preview dashboard"
        actionHref="/dashboard"
        secondaryActionLabel="Open chat"
        secondaryActionHref="/chat"
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
            <path d="M7 3.75h7l5 5V20.25A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
            <path d="M14 3.75v5h5" />
          </svg>
        }
      />
    </div>
  );
}
