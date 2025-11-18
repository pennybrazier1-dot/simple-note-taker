## Feature: Database & CRUD Operations

### Overview
Core backend feature to persist notes in Supabase Postgres and expose secure Create, Read, Update, and Delete operations. Implemented with Next.js App Router Server Actions, Drizzle ORM for schema/migrations, and Clerk for per-user access control. Supports optimistic UI and real-time updates via Supabase Realtime.

### User Stories & Requirements
- As an authenticated user, I want to create a note (title, content, optional category) so that I can capture information quickly.
  - Acceptance:
    - Given I am signed in, when I submit a new note with valid fields, the note is saved to my account and appears in the list instantly (optimistic) and remains after refresh (persisted).
    - Validation errors are shown for missing/invalid fields.
    - The operation is secure and scoped to my user.

- As an authenticated user, I want to view my notes so that I can access previously saved content.
  - Acceptance:
    - Only my notes are returned.
    - Notes are ordered by updatedAt desc by default.
    - Pagination or limits prevent over-fetching (default to 50).

- As an authenticated user, I want to edit a note so that I can update content without creating a new one.
  - Acceptance:
    - I can update title, content, and category.
    - Only my notes are editable.
    - updatedAt is refreshed on successful update.

- As an authenticated user, I want to delete a note so that I can remove unwanted information.
  - Acceptance:
    - Only my notes are deletable.
    - Deletion is permanent and reflected immediately in the UI and the database.

- As an authenticated user, I want my notes list to update in real-time when changes occur so that I always see the latest state.
  - Acceptance:
    - Creating, updating, or deleting a note triggers a real-time update for my session.
    - Only my notes trigger updates to my client.

### Technical Implementation

#### Database Schema
Provide the Drizzle ORM schema ONLY for tables needed by this feature.

```typescript
// /db/schema/notes.ts
import { pgTable, uuid, text, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull(), // Clerk userId
  name: varchar('name', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('categories_user_id_idx').on(table.userId),
  nameIdx: index('categories_name_idx').on(table.name),
}));

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull(), // Clerk userId
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull().default(''),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('notes_user_id_idx').on(table.userId),
  categoryIdx: index('notes_category_id_idx').on(table.categoryId),
  updatedIdx: index('notes_updated_at_idx').on(table.updatedAt),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  category: one(categories, {
    fields: [notes.categoryId],
    references: [categories.id],
  }),
}));
```

Notes:
- The categories table is minimal to support category_id foreign key; you may expand later.
- updatedAt is managed in application code on updates.

#### API Endpoints / Server Actions
Use server actions for all mutations and secure reads. Validate inputs with Zod. Enforce user scoping with Clerk.

```typescript
// /lib/validation/notes.ts
import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional().default(''),
  categoryId: z.string().uuid().nullable().optional(),
});

export const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const getNotesSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
```

### Dependencies & Integrations
- Clerk: authenticate user and obtain userId for RLS scoping and per-user filtering.
- Supabase Postgres: primary data store; enable Realtime on notes table.
- Drizzle ORM: schema and migrations.
- Next.js Server Actions: secure mutations/reads (no API routes needed).
- ShadCN UI + Tailwind: form and list components.
- Integrations with other features:
  - Auth (Clerk) must be configured prior.
  - Category management (if present) will write to categories table; this feature only validates ownership and FK constraints.
- No additional npm packages beyond CodeSpring standard stack.

### Implementation Steps
1. Create database schema
   - Add /db/schema/notes.ts as above.
   - Update Drizzle config to include schema path if needed.
   - Generate and run migrations:
     - npx drizzle-kit generate
     - npx drizzle-kit migrate
   - Ensure Supabase has Realtime enabled for public.notes.

2. Generate queries
   - Drizzle types will be generated from schema.
   - Confirm db is exported from CodeSpring boilerplate (/db/index.ts).

3. Implement server actions
   - Add /lib/validation/notes.ts schemas (Zod).
   - Add /actions/notes-actions.ts with createNote, listNotes, getNoteById, updateNote, deleteNote.
   - Ensure auth() is used to scope operations by userId.

4. Build UI components
   - Implement components under /components/notes as shown.
   - Add NoteRealtimeProvider at a layout level where notes list/edit lives (e.g., /app/(dashboard)/notes/layout.tsx).

5. Connect frontend to backend
   - Use server actions in forms and lists.
   - For edit page, call getNoteById in a Server Component then pass data to NoteForm.

6. Add error handling
   - Validate all inputs with Zod.
   - Catch and log errors server-side.
   - Show user-friendly error messages in UI components (extend examples as needed).
   - Revalidate relevant paths after mutations.

7. Test the feature
   - Unit test server actions and validation.
   - Integration test notes flow (create, update, list, delete).
   - Manual UAT with multiple users to confirm isolation.

Operational note: Configure Supabase Row Level Security to enforce per-user access. Example policy (not code-mandatory here):
- Enable RLS on notes and categories.
- Policies: user_id = auth.uid() (if using Supabase Auth) or map Clerk userId through a JWT. In this stack, actions run on server and already scope queries; RLS is an additional safety layer.

### Edge Cases & Error Handling
- Unauthorized access: no userId -> throw Unauthorized; UI should redirect to sign-in.
- Cross-user access: IDs belonging to another user -> return Not found or generic error.
- Validation errors: empty title, overly long fields -> return clear error; prevent submission.
- Category mismatch: categoryId provided but not owned by user -> Invalid category.
- Missing note on update/delete: return Not found; do not leak existence across users.
- Concurrent updates: last-write-wins; updatedAt set on server. Optionally add If-Match with updatedAt for concurrency control later.
- Realtime flood: debounce router.refresh if many updates (not needed for MVP).
- Large content: consider increasing Postgres toast storage; for MVP, store as text and rely on Postgres defaults.
- Network failures: show retry to user; leave optimistic UI guarded by server confirmation.

### Testing Approach
- Unit tests:
  - Validation schemas (createNoteSchema, updateNoteSchema, getNotesSchema).
  - Server actions with mocked db: ensure user scoping, FK checks, and error handling.
- Integration tests:
  - Happy path: create -> list -> update -> list -> delete -> list empty.
  - Category validation path: create with invalid categoryId -> error.
  - Unauthorized path: actions without user -> error.
  - Real-time: simulate insert/update/delete via Supabase and assert UI refresh handler is called (mock supabase client).
- User acceptance tests:
  - As a signed-in user, I can create, edit, delete notes; my list updates immediately and persists after reload.
  - Using two different users, ensure isolation: user A never sees user B's notes.
  - Edge cases: empty title rejected; long title rejected.

Notes for Production:
- Ensure environment variables for Supabase URL/keys and Clerk are set in Vercel.
- Consider adding structured logging and error boundary UI.
- Add indexes already included for performance; monitor query plans if dataset grows.

