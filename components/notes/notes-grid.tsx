/**
 * Notes Grid Component
 * Displays notes in a responsive grid layout
 */
import NoteCard from "./note-card.client";
import { cn } from "@/lib/utils";

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

interface NotesGridProps {
  notes: Note[];
  categories: Category[];
}

export default function NotesGrid({ notes, categories }: NotesGridProps) {
  // Create a map for quick category lookup
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => {
        const category = note.categoryId
          ? categoryMap.get(note.categoryId)
          : null;

        return (
          <NoteCard
            key={note.id}
            note={note}
            category={category || undefined}
          />
        );
      })}
    </div>
  );
}

