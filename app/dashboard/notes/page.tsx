/**
 * Notes Dashboard Page
 * Displays a list/grid of notes with search, filtering, and pagination
 */
import { Suspense } from "react";
import NotesToolbar from "@/components/notes/notes-toolbar.client";
import NotesGrid from "@/components/notes/notes-grid";
import { NotesSkeletons } from "@/components/notes/skeletons";
import EmptyState from "@/components/notes/empty-state";
import NotesPagination from "@/components/notes/pagination.client";

// Mock data types (will be replaced with real types later)
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

// Mock data function (will be replaced with real data fetching)
function getMockNotes(): Note[] {
  return [
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
}

function getMockCategories(): Category[] {
  return [
    { id: "cat-1", name: "Work", color: "blue" },
    { id: "cat-2", name: "Personal", color: "green" },
    { id: "cat-3", name: "Ideas", color: "purple" },
  ];
}

interface NotesPageProps {
  searchParams: {
    q?: string;
    category?: string;
    page?: string;
    pageSize?: string;
    includeArchived?: string;
  };
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  // Parse search params
  const searchQuery = searchParams.q || "";
  const categoryId = searchParams.category || null;
  const page = Math.max(parseInt(searchParams.page || "1"), 1);
  const pageSize = Math.min(
    Math.max(parseInt(searchParams.pageSize || "20"), 5),
    100
  );
  const includeArchived = searchParams.includeArchived === "true";

  // Get mock data
  const allNotes = getMockNotes();
  const categories = getMockCategories();

  // Filter notes (mock filtering - will be replaced with real query)
  let filteredNotes = allNotes.filter((note) => {
    if (!includeArchived && note.isArchived) return false;
    if (categoryId && note.categoryId !== categoryId) return false;
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Sort: pinned first, then by updatedAt
  filteredNotes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Paginate
  const total = filteredNotes.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const startIndex = (page - 1) * pageSize;
  const paginatedNotes = filteredNotes.slice(startIndex, startIndex + pageSize);

  return (
    <main className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notes</h1>
        <p className="text-muted-foreground">
          Manage and organize your notes
        </p>
      </div>

      <Suspense fallback={<NotesSkeletons />}>
        <NotesToolbar
          categories={categories}
          initialSearch={searchQuery}
          initialCategory={categoryId}
          initialIncludeArchived={includeArchived}
        />
      </Suspense>

      {paginatedNotes.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery || !!categoryId || includeArchived} />
      ) : (
        <>
          <NotesGrid
            notes={paginatedNotes}
            categories={categories}
          />
          {pageCount > 1 && (
            <div className="mt-8">
              <NotesPagination currentPage={page} pageCount={pageCount} />
            </div>
          )}
        </>
      )}
    </main>
  );
}

