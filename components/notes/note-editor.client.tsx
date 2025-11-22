"use client";

/**
 * Note Editor Component
 * Simple editor for note title and content
 * Will be upgraded to Tiptap rich text editor later
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Note = {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: Date;
};

interface NoteEditorProps {
  initialNote: Note;
}

export default function NoteEditor({ initialNote }: NoteEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // TODO: Implement save action
    // For now, just simulate a save
    setTimeout(() => {
      setIsSaving(false);
      toast.toast({
        title: "Note saved",
        description: "Your changes have been saved.",
      });
    }, 500);
  };

  const handleBack = () => {
    router.push("/dashboard/notes");
  };

  return (
    <div className="space-y-6">
      {/* Header with back button and save */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-2"
        />
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <Textarea
          placeholder="Start writing your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[600px] resize-none border-none shadow-none focus-visible:ring-0 px-0 text-base leading-relaxed"
        />
      </div>
    </div>
  );
}

