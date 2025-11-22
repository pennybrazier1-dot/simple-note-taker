/**
 * Empty State Component
 * Shown when no notes are found
 */
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  hasSearch?: boolean;
}

export default function EmptyState({ hasSearch = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {hasSearch ? "No notes found" : "No notes yet"}
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {hasSearch
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Get started by creating your first note. Click the button below to begin."}
      </p>
      {!hasSearch && (
        <Button asChild>
          <Link href="/dashboard/notes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Note
          </Link>
        </Button>
      )}
    </div>
  );
}

