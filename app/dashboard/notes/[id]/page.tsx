/**
 * Note Editor Page
 * Displays and allows editing of a single note
 */
import { notFound } from "next/navigation";
import NoteEditor from "@/components/notes/note-editor.client";

// Mock data function (will be replaced with real data fetching)
function getMockNote(id: string) {
  const mockNotes = [
    {
      id: "1",
      title: "Welcome to Notes",
      content: "This is your first note. Start writing and organizing your thoughts!",
      categoryId: null,
      isPinned: true,
      isArchived: false,
      updatedAt: new Date(),
    },
    {
      id: "2",
      title: "Project Ideas",
      content: "Here are some ideas for new projects...",
      categoryId: "cat-1",
      isPinned: false,
      isArchived: false,
      updatedAt: new Date(Date.now() - 86400000),
    },
    {
      id: "3",
      title: "Meeting Notes",
      content: "Discussed the new features and timeline...",
      categoryId: "cat-2",
      isPinned: false,
      isArchived: false,
      updatedAt: new Date(Date.now() - 172800000),
    },
  ];

  return mockNotes.find((note) => note.id === id);
}

interface NoteEditorPageProps {
  params: {
    id: string;
  };
}

export default async function NoteEditorPage({ params }: NoteEditorPageProps) {
  const note = getMockNote(params.id);

  if (!note) {
    notFound();
  }

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto">
      <NoteEditor initialNote={note} />
    </main>
  );
}

