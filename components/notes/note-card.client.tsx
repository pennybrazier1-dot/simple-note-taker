"use client";

/**
 * Note Card Component
 * Displays a single note with quick actions (pin/unpin, archive)
 */
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pin, Archive, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// Helper function to get color value from color name
function getCategoryColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#10b981",
    purple: "#8b5cf6",
    red: "#ef4444",
    yellow: "#eab308",
    orange: "#f97316",
    pink: "#ec4899",
    indigo: "#6366f1",
    slate: "#64748b",
    gray: "#6b7280",
  };
  return colorMap[colorName] || colorMap.slate;
}

type Note = {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: Date;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

interface NoteCardProps {
  note: Note;
  category?: Category;
}

export default function NoteCard({ note, category }: NoteCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    // Navigate to note editor (will be implemented later)
    router.push(`/dashboard/notes/${note.id}`);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement pin action
    console.log("Pin note:", note.id);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement archive action
    console.log("Archive note:", note.id);
  };

  // Truncate content for preview
  const contentPreview =
    note.content.length > 150
      ? note.content.substring(0, 150) + "..."
      : note.content;

  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
  });

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        note.isPinned && "border-primary/50 bg-primary/5"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {note.isPinned && (
                <Pin className="h-4 w-4 text-primary fill-primary" />
              )}
              <h3 className="font-semibold text-lg truncate">{note.title}</h3>
            </div>
            {category && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: getCategoryColor(category.color),
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {category.name}
                </span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handlePin}>
                {note.isPinned ? (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive}>
                {note.isArchived ? (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {contentPreview || "No content"}
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </CardContent>
    </Card>
  );
}

