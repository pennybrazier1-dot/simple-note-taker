## Feature: Notes Dashboard

### Overview
The Notes Dashboard is the central hub for authenticated users to view, search, filter by category, and navigate to edit notes. It provides a responsive grid/list layout with pagination, quick loading states, real-time updates, and secure data access scoped to the current user.

### User Stories & Requirements
- As an authenticated user, I want to see my notes in a list/grid so that I can quickly browse and access them.
  - Acceptance:
    - On visiting /notes, I see my notes ordered by pinned then last updated.
    - Empty state is shown if no notes exist.
    - Loading skeletons display while data loads.

- As an authenticated user, I want to search my notes by title and content so that I can quickly find a specific note.
  - Acceptance:
    - A search input is visible on the dashboard.
    - Typing updates the URL query (?q=) and results within 300ms debounce.
    - Searching is case-insensitive and matches title or content.
    - Clearing search resets results.

- As an authenticated user, I want to filter notes by category so that I can focus on topics of interest.
  - Acceptance:
    - A category dropdown is available with "All" and my categories.
    - Selecting a category updates the URL query (?category=) and filters results.
    - The category filter persists via URL when the page reloads.

- As an authenticated user, I want pagination so that I can navigate large sets of notes.
  - Acceptance:
    - Pagination controls appear when results exceed the page size.
    - URL contains ?page= and ?pageSize=.
    - Invalid page values gracefully fall back to page 1.

- As an authenticated user, I want to click a note to edit it so that I can update content.
  - Acceptance:
    - Clicking a note card navigates to /notes/[id] (or editor route).
    - Navigation preserves search and filter context in browser history.

- As an authenticated user, I want the list to reflect real-time changes so that newly created or edited notes appear without manual refresh.
  - Acceptance:
    - When a note is created/updated/deleted (by me) in another tab/session, the dashboard refreshes automatically within 2 seconds.

- As an authenticated user, I want to perform quick actions (pin/unpin, archive) so that I can organize my notes from the dashboard.
  - Acceptance:
    - Each note exposes a "more" menu with Pin/Unpin and Archive actions.
    - Actions are optimistic with proper error fallback.
    - Archived notes are excluded by default unless includeArchived=true.

### Technical Implementation

#### Database Schema
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

#### API Endpoints / Server Actions
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
  revalidatePath('/notes');
  return result;
}

export async function toggleArchiveNote(noteId: string, archive: boolean) {
  const userId = requireUser();
  const result = await db
    .update(notes)
    .set({ isArchived: archive, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)));
  revalidatePath('/notes');
  return result;
}

export async function softDeleteNote(noteId: string) {
  const userId = requireUser();
  const result = await db
    .update(notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)));
  revalidatePath('/notes');
  return result;
}
```

#### Components Structure
```
/app/(dashboard)/notes/page.tsx              // Server component: reads searchParams, fetches data, renders dashboard
/components/notes/
├── notes-toolbar.client.tsx                 // Client: search input, category filter, includeArchived toggle
├── notes-grid.tsx                           // Server: receives data, renders list/grid
├── note-card.client.tsx                     // Client: clickable card with quick actions (pin/archive)
├── empty-state.tsx                          // Server/Client: shown when no notes
├── pagination.client.tsx                    // Client: controls for page navigation via URL params
├── skeletons.tsx                            // Server/Client: loading skeletons
└── use-notes-realtime.ts                    // Client hook: Supabase Realtime subscription -> router.refresh
```

### Dependencies & Integrations
- Clerk: auth() in server and useAuth() in client to scope data by userId.
- Supabase:
  - Postgres tables (notes, categories).
  - Realtime enabled for table notes (make sure replication is enabled in Supabase UI).
- Drizzle: schema definition and type-safe queries.
- ShadCN UI: Input, Select, Switch, Card, DropdownMenu, Button, Skeletons.
- Tailwind: layout and styling.
- Framer Motion: subtle list/grid animations on mount/update.
- Next.js App Router:
  - Server components for data fetch.
  - Server Actions for mutations.
  - searchParams-based routing for filters and pagination.
- No extra NPM packages beyond the CodeSpring stack are required.

### Implementation Steps
1. Create database schema
   - Add /db/schema/notes.ts as specified.
   - Run migrations to create notes and categories tables and indexes.
   - Enable Supabase Realtime for notes table (public schema).
2. Generate queries
   - Implement /lib/data/notes.ts with listNotesForUser and listCategoriesForUser.
3. Implement server actions
   - Add /actions/notes.ts with togglePinNote, toggleArchiveNote, softDeleteNote and auth checks.
4. Build UI components
   - Create toolbar, grid, note-card, pagination, empty-state, skeletons components as outlined.
   - Add use-notes-realtime hook and invoke it inside a small client wrapper if desired (e.g., mount in toolbar or grid).
5. Connect frontend to backend
   - Implement /app/(dashboard)/notes/page.tsx to read searchParams, fetch data, and render components.
   - Wire actions in note-card and URL updates in toolbar/pagination.
6. Add error handling
   - Wrap server actions with try/catch in client triggers; show toast errors (ShadCN toast) if desired.
   - Validate and clamp query params (page, pageSize).
7. Test the feature
   - Write unit tests for query helper conditions and server actions authorization.
   - Add integration tests for search/filter/pagination and navigation to editor.
   - Manually verify realtime updates across tabs.

### Edge Cases & Error Handling
- Empty states:
  - No notes: show call-to-action to create a note (button linking to editor/new).
  - No categories: category filter still shows "All".
- Search:
  - q length < 2: ignore search to reduce DB load.
  - Very long q: clamp to 256 chars before applying.
- Pagination:
  - Non-numeric or out-of-range page: default to 1.
  - pageSize outside [5,100]: clamp to boundaries.
- Security:
  - All queries filtered by ownerId; server actions verify user and ownership.
  - Soft-deleted notes are excluded by default (deletedAt IS NULL).
- Realtime:
  - If Realtime is disabled/unavailable, dashboard still works; just lacks live refresh.
- Concurrency:
  - Optimistic UI for pin/archive; on server action error, revert state and show error toast.
- Performance:
  - Indexes cover common filters; use concise select projections.
  - Use server components to avoid shipping unnecessary data to the client.

### Testing Approach
- Unit tests (Vitest/Jest):
  - listNotesForUser builds correct where clause for combinations of q, categoryId, includeArchived.
  - Pagination math (pageCount) correctness with varying totals.
  - Server actions enforce auth (throws when unauthenticated) and ownership (no update if not owner).
- Integration tests (Playwright):
  - Visiting /notes shows skeleton then renders notes or empty state.
  - Search input updates URL and filters results accordingly.
  - Category filter changes results and persists on reload.
  - Pagination next/prev updates page and results.
  - Clicking a note navigates to /notes/[id].
  - Pin/Archive actions update UI and persist on reload.
- UAT scenarios:
  - Real-time: create/edit a note in another tab and observe automatic refresh.
  - Responsive layout: grid adapts from 1 to 2 to 3 columns across breakpoints.
  - Accessibility: keyboard navigation through toolbar, menu actions, and cards.

