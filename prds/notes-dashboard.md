## Feature: Notes Dashboard

### Overview
The Notes Dashboard is the central hub for authenticated users to view, search, filter by category, and navigate to edit notes. It provides a responsive grid/list layout with pagination, quick loading states, real-time updates, and secure data access scoped to the current user.

**Implementation Status:**
- ✅ UI Components: Complete (all components built with mock data)
- ⏳ Database Schema: Pending (to be implemented)
- ⏳ Server Actions: Pending (to be implemented)
- ⏳ Real-time Updates: Pending (to be implemented)
- ✅ Note Editor: Added (basic editor at `/dashboard/notes/[id]`)

### User Stories & Requirements
- As an authenticated user, I want to see my notes in a list/grid so that I can quickly browse and access them.
  - Acceptance:
    - On visiting /dashboard/notes, I see my notes ordered by pinned then last updated.
    - Empty state is shown if no notes exist.
    - Loading skeletons display while data loads.
    - ✅ **Implemented**: Grid layout (1/2/3 columns responsive), sorting by pinned then updatedAt, empty state, skeletons

- As an authenticated user, I want to search my notes by title and content so that I can quickly find a specific note.
  - Acceptance:
    - A search input is visible on the dashboard.
    - Typing updates the URL query (?q=) and results within 300ms debounce.
    - Searching is case-insensitive and matches title or content.
    - Clearing search resets results.
    - ✅ **Implemented**: Search input with 300ms debounce, URL query param persistence, client-side filtering (mock data)

- As an authenticated user, I want to filter notes by category so that I can focus on topics of interest.
  - Acceptance:
    - A category dropdown is available with "All" and my categories.
    - Selecting a category updates the URL query (?category=) and filters results.
    - The category filter persists via URL when the page reloads.
    - ✅ **Implemented**: Category dropdown with "All Categories" option, URL query param persistence, color indicators for categories

- As an authenticated user, I want pagination so that I can navigate large sets of notes.
  - Acceptance:
    - Pagination controls appear when results exceed the page size.
    - URL contains ?page= and ?pageSize=.
    - Invalid page values gracefully fall back to page 1.
    - ✅ **Implemented**: Pagination component with page numbers, ellipsis for large page counts, URL persistence, previous/next buttons

- As an authenticated user, I want to click a note to edit it so that I can update content.
  - Acceptance:
    - Clicking a note card navigates to /dashboard/notes/[id] (editor route).
    - Navigation preserves search and filter context in browser history.
    - ✅ **Implemented**: Basic editor page created with title and content fields.

- As an authenticated user, I want the list to reflect real-time changes so that newly created or edited notes appear without manual refresh.
  - Acceptance:
    - When a note is created/updated/deleted (by me) in another tab/session, the dashboard refreshes automatically within 2 seconds.
    - ⏳ **Pending**: Real-time updates not yet implemented (requires Supabase Realtime setup).

- As an authenticated user, I want to perform quick actions (pin/unpin, archive) so that I can organize my notes from the dashboard.
  - Acceptance:
    - Each note exposes a "more" menu with Pin/Unpin and Archive actions.
    - Actions are optimistic with proper error fallback.
    - Archived notes are excluded by default unless includeArchived=true.
    - ✅ **UI Complete**: Menu and actions UI implemented.
    - ⏳ **Pending**: Server actions for pin/archive not yet implemented (currently console.log placeholders).

### Technical Implementation

#### Database Schema
⏳ **Status: Pending Implementation**

The database schema is defined below but has not been created yet. Currently using mock data for UI development.

```typescript
// /db/schema/notes.ts
import { pgTable, uuid, text, varchar, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull(), // Clerk userId
  name: varchar('name', { length: 64 }).notNull(),
  color: varchar('color', { length: 16 }).default('slate'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index('categories_owner_idx').on(t.ownerId),
  ownerNameUnique: unique('categories_owner_name_unique').on(t.ownerId, t.name),
}));

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull(), // Clerk userId
  title: varchar('title', { length: 256 }).notNull().default(''),
  content: text('content').notNull().default(''),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  isPinned: boolean('is_pinned').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  ownerIdx: index('notes_owner_idx').on(t.ownerId),
  ownerCategoryIdx: index('notes_owner_category_idx').on(t.ownerId, t.categoryId),
  sortIdx: index('notes_sort_idx').on(t.ownerId, t.isArchived, t.isPinned, t.updatedAt),
}));

// Optional trigger to auto-update updatedAt can be added via SQL migration if desired.
```

**Current Implementation:**
- Using mock data functions `getMockNotes()` and `getMockCategories()` in `/app/dashboard/notes/page.tsx`
- Mock data includes 3 sample notes and 3 sample categories for UI testing

#### API Endpoints / Server Actions
⏳ **Status: Pending Implementation**

Server actions and data query helpers are defined below but have not been implemented yet. Currently using client-side mock data filtering.

**Planned Implementation:**
```typescript
// /lib/data/notes.ts (server-side query helpers)
'use server';

import { db } from '@/db';
import { notes, categories } from '@/db/schema/notes';
import { and, eq, ilike, isNull, sql, desc, or } from 'drizzle-orm';

export type ListNotesParams = {
  q?: string;
  categoryId?: string | null;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
};

export async function listCategoriesForUser(ownerId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      color: categories.color,
    })
    .from(categories)
    .where(eq(categories.ownerId, ownerId))
    .orderBy(categories.name);
}

export async function listNotesForUser(ownerId: string, params: ListNotesParams) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 5), 100);
  const page = Math.max(params.page ?? 1, 1);
  const q = (params.q ?? '').trim();
  const includeArchived = !!params.includeArchived;

  const where = and(
    eq(notes.ownerId, ownerId),
    isNull(notes.deletedAt),
    includeArchived ? undefined : eq(notes.isArchived, false),
    params.categoryId ? eq(notes.categoryId, params.categoryId) : undefined,
    q.length >= 2
      ? or(ilike(notes.title, `%${q}%`), ilike(notes.content, `%${q}%`))
      : undefined
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        categoryId: notes.categoryId,
        isPinned: notes.isPinned,
        isArchived: notes.isArchived,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(where)
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)` })
      .from(notes)
      .where(where),
  ]);

  const pageCount = Math.max(Math.ceil((total ?? 0) / pageSize), 1);
  return { items, total, page, pageSize, pageCount };
}
```

```typescript
// /actions/notes.ts (server actions for mutations)
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { notes } from '@/db/schema/notes';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@clerk/nextjs';

function requireUser() {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function togglePinNote(noteId: string, pin: boolean) {
  const userId = requireUser();
  const result = await db
    .update(notes)
    .set({ isPinned: pin, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)));
  revalidatePath('/dashboard/notes');
  return result;
}

export async function toggleArchiveNote(noteId: string, archive: boolean) {
  const userId = requireUser();
  const result = await db
    .update(notes)
    .set({ isArchived: archive, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)));
  revalidatePath('/dashboard/notes');
  return result;
}

export async function softDeleteNote(noteId: string) {
  const userId = requireUser();
  const result = await db
    .update(notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)));
  revalidatePath('/dashboard/notes');
  return result;
}
```

**Current Implementation:**
- Client-side filtering in `/app/dashboard/notes/page.tsx` using mock data
- Pin/Archive actions in `note-card.client.tsx` currently log to console (placeholders)
- No server actions implemented yet

#### Components Structure
✅ **Status: All UI Components Implemented**

```
/app/dashboard/notes/
├── page.tsx                                 // ✅ Server component: reads searchParams, uses mock data, renders dashboard
└── [id]/
    └── page.tsx                             // ✅ Server component: note editor page (added during implementation)

/components/notes/
├── notes-toolbar.client.tsx                 // ✅ Client: search input, category filter, includeArchived toggle
├── notes-grid.tsx                           // ✅ Server: receives data, renders list/grid
├── note-card.client.tsx                     // ✅ Client: clickable card with quick actions (pin/archive)
├── note-editor.client.tsx                   // ✅ Client: basic note editor (added during implementation)
├── empty-state.tsx                          // ✅ Server/Client: shown when no notes
├── pagination.client.tsx                    // ✅ Client: controls for page navigation via URL params
├── skeletons.tsx                            // ✅ Server/Client: loading skeletons
└── use-notes-realtime.ts                    // ⏳ Client hook: Supabase Realtime subscription -> router.refresh (pending)
```

**Implementation Notes:**
- Route structure: Using `/app/dashboard/notes/` instead of `/app/(dashboard)/notes/` (no route group)
- Note editor: Added at `/app/dashboard/notes/[id]/page.tsx` with basic title and content editing
  - Editor component: `/components/notes/note-editor.client.tsx`
  - Features: Title input (large, bold), content textarea (600px min height), save button, back button
  - Save action: Currently shows toast notification (placeholder for server action)
  - Navigation: Clicking note card navigates to editor; back button returns to list
- Category colors: Using inline styles with `getCategoryColor()` helper function (Tailwind doesn't support dynamic class names)
  - Helper function maps color names (blue, green, purple, etc.) to hex values
  - Used in both `notes-toolbar.client.tsx` and `note-card.client.tsx`
- Real-time hook: Not yet implemented (pending Supabase Realtime setup)
- Sidebar: Notes link added to `/components/sidebar.tsx` for navigation

### Dependencies & Integrations
- Clerk: auth() in server and useAuth() in client to scope data by userId.
  - ⏳ Not yet integrated (using mock data)
- Supabase:
  - Postgres tables (notes, categories).
  - Realtime enabled for table notes (make sure replication is enabled in Supabase UI).
  - ⏳ Not yet configured
- Drizzle: schema definition and type-safe queries.
  - ⏳ Schema defined but not yet created/migrated
- ShadCN UI: Input, Select, Switch, Card, DropdownMenu, Button, Skeletons, Textarea, Label.
  - ✅ All components used and working
- Tailwind: layout and styling.
  - ✅ Fully implemented
- date-fns: For relative time display ("less than a minute ago").
  - ✅ Installed and used in `note-card.client.tsx`
- Framer Motion: subtle list/grid animations on mount/update.
  - ⏳ Not yet added (can be added for polish later)
- Next.js App Router:
  - Server components for data fetch.
  - Server Actions for mutations.
  - searchParams-based routing for filters and pagination.
  - ✅ All routing and URL param handling implemented

### Implementation Steps

**✅ Completed:**
1. ~~Build UI components~~
   - ✅ Created toolbar, grid, note-card, pagination, empty-state, skeletons components
   - ✅ Added note editor page and component
   - ✅ All components styled and functional with mock data
2. ~~Connect frontend UI~~
   - ✅ Implemented `/app/dashboard/notes/page.tsx` to read searchParams, use mock data, and render components
   - ✅ URL updates in toolbar/pagination working
   - ✅ Navigation to editor working
   - ✅ Query params validated and clamped (page, pageSize)

**⏳ Pending:**
1. Create database schema
   - Add /db/schema/notes.ts as specified.
   - Run migrations to create notes and categories tables and indexes.
   - Enable Supabase Realtime for table notes (public schema).
2. Generate queries
   - Implement /lib/data/notes.ts with listNotesForUser and listCategoriesForUser.
   - Replace mock data functions with real database queries.
3. Implement server actions
   - Add /actions/notes.ts with togglePinNote, toggleArchiveNote, softDeleteNote and auth checks.
   - Wire actions in note-card.client.tsx (currently console.log placeholders).
   - Connect note editor save button to updateNoteContent action.
4. Add real-time updates
   - Create use-notes-realtime hook for Supabase Realtime subscription.
   - Invoke it inside a client wrapper component.
5. Add error handling
   - Wrap server actions with try/catch in client triggers; show toast errors (ShadCN toast).
   - Handle network errors and conflicts gracefully.
6. Test the feature
   - Write unit tests for query helper conditions and server actions authorization.
   - Add integration tests for search/filter/pagination and navigation to editor.
   - Manually verify realtime updates across tabs.

### Edge Cases & Error Handling

**✅ Implemented:**
- Empty states:
  - ✅ No notes: shows call-to-action to create a note (button linking to editor/new).
  - ✅ No categories: category filter still shows "All".
  - ✅ Different messages for empty search results vs. no notes.
- Search:
  - ✅ q length < 2: ignores search (client-side filtering).
  - ⏳ Very long q: clamp to 256 chars (pending server-side validation).
- Pagination:
  - ✅ Non-numeric or out-of-range page: defaults to 1.
  - ✅ pageSize outside [5,100]: clamped to boundaries.
- URL state persistence:
  - ✅ All filters and pagination persist in URL query params.
  - ✅ Page reload maintains filter state.

**⏳ Pending:**
- Security:
  - ⏳ All queries filtered by ownerId (pending database implementation).
  - ⏳ Server actions verify user and ownership (pending implementation).
  - ⏳ Soft-deleted notes excluded by default (pending database implementation).
- Realtime:
  - ⏳ If Realtime is disabled/unavailable, dashboard still works; just lacks live refresh.
- Concurrency:
  - ⏳ Optimistic UI for pin/archive; on server action error, revert state and show error toast.
- Performance:
  - ⏳ Indexes cover common filters; use concise select projections (pending database).
  - ✅ Use server components to avoid shipping unnecessary data to the client.

### Testing Approach

**✅ Manual Testing Completed:**
- ✅ Visiting /dashboard/notes shows notes or empty state.
- ✅ Search input updates URL and filters results accordingly.
- ✅ Category filter changes results and persists on reload.
- ✅ Pagination controls render and update URL.
- ✅ Clicking a note navigates to /dashboard/notes/[id].
- ✅ Responsive layout: grid adapts from 1 to 2 to 3 columns across breakpoints.
- ✅ Loading skeletons display appropriately.

**⏳ Pending Automated Tests:**
- Unit tests (Vitest/Jest):
  - listNotesForUser builds correct where clause for combinations of q, categoryId, includeArchived.
  - Pagination math (pageCount) correctness with varying totals.
  - Server actions enforce auth (throws when unauthenticated) and ownership (no update if not owner).
- Integration tests (Playwright):
  - Visiting /dashboard/notes shows skeleton then renders notes or empty state.
  - Search input updates URL and filters results accordingly.
  - Category filter changes results and persists on reload.
  - Pagination next/prev updates page and results.
  - Clicking a note navigates to /dashboard/notes/[id].
  - Pin/Archive actions update UI and persist on reload.
- UAT scenarios:
  - Real-time: create/edit a note in another tab and observe automatic refresh.
  - Accessibility: keyboard navigation through toolbar, menu actions, and cards.

---

## Implementation Changes & Discrepancies

### Route Structure Changes
- **Planned:** `/app/(dashboard)/notes/page.tsx` (using route group)
- **Actual:** `/app/dashboard/notes/page.tsx` (no route group)
- **Reason:** Simpler structure, works with existing dashboard layout

### Additional Features Added
- **Note Editor Page:** Added `/app/dashboard/notes/[id]/page.tsx` and `note-editor.client.tsx`
  - Basic editor with title and content fields (Input and Textarea components)
  - Save button with loading state ("Saving..." feedback)
  - Toast notifications for save confirmation
  - Back navigation to notes list
  - Clean, minimal design with large title (text-3xl) and spacious content area (min-h-[600px])
  - Uses mock data to fetch note by ID
  - Not in original PRD but added during UI implementation
  - **Future:** Will be upgraded to Tiptap rich text editor per Rich Text Editor PRD

### Category Color Implementation
- **Planned:** Use Tailwind color classes dynamically
- **Actual:** Using inline styles with `getCategoryColor()` helper function
- **Reason:** Tailwind doesn't support dynamic class names like `bg-${color}-500`. Inline styles provide the flexibility needed.

### Data Source
- **Planned:** Database queries via Drizzle ORM
- **Actual:** Mock data functions in page component
- **Status:** Temporary - will be replaced when database is implemented

### Server Actions
- **Planned:** Full server actions for pin/archive/delete
- **Actual:** Placeholder console.log statements
- **Status:** UI ready, actions pending database implementation

### Real-time Updates
- **Planned:** Supabase Realtime subscription hook
- **Actual:** Not implemented
- **Status:** Pending Supabase setup and database implementation

### Sidebar Integration
- **Added:** Notes link in sidebar navigation (`/components/sidebar.tsx`)
- **Not in PRD:** Added for better UX and navigation


