## Feature: Rich Text Editor

### Overview
A client-side WYSIWYG editor for creating and editing notes with basic formatting (bold, italic, lists, headings) and autosave. It integrates Tiptap in a Next.js 14 App Router app, persists content to Supabase via Drizzle ORM using Server Actions, and enforces ownership via Clerk authentication.

### User Stories & Requirements
- As an authenticated user, I want to type and format text (bold, italic, lists, headings) so that I can structure my notes clearly.
  - Acceptance:
    - Toolbar provides Bold, Italic, Bullet List, Ordered List, and Heading (H1, H2) toggles.
    - Formatting applies to selected text or subsequent input.
- As an authenticated user, I want my changes to autosave so that I don't lose progress.
  - Acceptance:
    - Autosave triggers within 1.5 seconds after the last change.
    - "Saving…" and "Saved" statuses are shown.
    - No duplicate saves when no changes occurred.
- As an authenticated user, I want to create a new note and update an existing note's content.
  - Acceptance:
    - Create note returns a new note with default title "Untitled" and empty content.
    - Update content persists Tiptap JSON.
    - Updates are versioned to avoid overwriting concurrent edits.
- As an authenticated user, I want to delete a note from the editor toolbar.
  - Acceptance:
    - Delete performs a soft delete and navigates back to the notes list (or shows confirmation).
    - Unauthorized users cannot delete or view notes they don't own.
- As an authenticated user, I should see errors when something goes wrong and never lose typed content due to transient issues.
  - Acceptance:
    - Network/database errors are surfaced via non-blocking toasts.
    - Autosave retries gracefully without freezing the editor.

### Technical Implementation

#### Database Schema
Provide schema for notes table to support rich text JSON content, optimistic concurrency (rev), and soft delete.

```typescript
// /db/schema/notes.ts
import { pgTable, uuid, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('Untitled'),
  // Tiptap JSON document
  content: jsonb('content').$type<unknown>().notNull().default(
    sql`'{"type":"doc","content":[]}'::jsonb`
  ),
  // Optimistic concurrency control
  rev: integer('rev').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

}, (table) => ({
  userIdx: index('notes_user_idx').on(table.userId),
  updatedIdx: index('notes_updated_idx').on(table.updatedAt),
}));
```

Notes:
- content stores the Tiptap document JSONB.
- rev increments on each update to prevent lost updates (conflict detection).
- Soft delete via deletedAt.

#### API Endpoints / Server Actions
Use Next.js Server Actions for mutations and secure access. All actions require an authenticated user and enforce user ownership of notes.

```typescript
// /actions/notes-actions.ts
'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs';
import { db } from '@/db'; // Ensure db is configured to use Supabase Postgres
import { eq, and, isNull } from 'drizzle-orm';
import { notes } from '@/db/schema/notes';
import { revalidatePath } from 'next/cache';

const NoteContentSchema = z.any(); // Tiptap JSON; validate shape if desired

export const CreateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: NoteContentSchema.optional(),
});

export async function createNote(input: z.infer<typeof CreateNoteSchema>) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');

  const data = CreateNoteSchema.parse(input);
  const [row] = await db.insert(notes)
    .values({
      userId,
      title: data.title ?? 'Untitled',
      content: data.content ?? { type: 'doc', content: [] },
    })
    .returning();

  revalidatePath('/notes');
  return row;
}

export const GetNoteSchema = z.object({
  id: z.string().uuid(),
});

export async function getNote(input: z.infer<typeof GetNoteSchema>) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');

  const { id } = GetNoteSchema.parse(input);
  const [row] = await db.select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);

  if (!row) throw new Error('Not found');
  return row;
}

export const UpdateNoteContentSchema = z.object({
  id: z.string().uuid(),
  content: NoteContentSchema,
  title: z.string().min(1).max(255).optional(),
  // client sends last known rev for optimistic concurrency
  rev: z.number().int().nonnegative(),
});

export async function updateNoteContent(input: z.infer<typeof UpdateNoteContentSchema>) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  const { id, content, title, rev } = UpdateNoteContentSchema.parse(input);

  // Perform OCC: rev must match; increment on success
  const res = await db.update(notes)
    .set({
      content,
      ...(title ? { title } : {}),
      rev: rev + 1,
      updatedAt: new Date(),
    })
    .where(and(
      eq(notes.id, id),
      eq(notes.userId, userId),
      isNull(notes.deletedAt),
      eq(notes.rev, rev)
    ))
    .returning({ id: notes.id, rev: notes.rev, updatedAt: notes.updatedAt });

  if (res.length === 0) {
    // Could be not found or rev mismatch; treat as conflict to be safe
    throw new Error('Conflict: Note changed or not found');
  }

  // No path revalidation necessary for client-only editor; do it if list reflects updatedAt
  revalidatePath('/notes');
  return res[0];
}

export const DeleteNoteSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteNote(input: z.infer<typeof DeleteNoteSchema>) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');

  const { id } = DeleteNoteSchema.parse(input);
  const res = await db.update(notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .returning({ id: notes.id });

  if (res.length === 0) {
    throw new Error('Not found');
  }

  revalidatePath('/notes');
  return { success: true };
}
```

Notes:
- zod validates inputs.
- auth() ensures current user.
- OCC via rev prevents overwriting concurrent edits.
- Errors thrown will be caught in the UI toasts.

#### Components Structure
```
/components/editor/
├── rich-text-editor.tsx
├── toolbar.tsx
├── autosave-indicator.tsx
└── types.ts
/app/notes/[id]/
├── page.tsx
```

Key components:
- rich-text-editor.tsx: Client component initializing Tiptap, wiring autosave with debounce, and rendering Toolbar + EditorContent.
- toolbar.tsx: ShadCN buttons/toggles calling Tiptap commands.
- autosave-indicator.tsx: Shows Saving/Saved/Conflict states.
- /app/notes/[id]/page.tsx: Server component to fetch note and render editor.

### Dependencies & Integrations
- Internal integrations:
  - Authentication: Clerk for user identity in server actions.
  - Database: Drizzle ORM with Supabase Postgres.
  - UI: ShadCN for toolbar buttons/toggles.
- External packages to install:
  - @tiptap/react
  - @tiptap/starter-kit
  - @tiptap/extension-heading
  - @tiptap/extension-placeholder
  - zod (for input validation in server actions)
  - Optional: sonner or ShadCN toast for notifications
- Commands:
  - npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-heading @tiptap/extension-placeholder zod sonner

### Implementation Steps
1. Create database schema
   - Add /db/schema/notes.ts as above.
   - Generate and run migration (drizzle-kit) to create notes table and indices.
2. Generate queries
   - Ensure /db/index.ts exposes a configured Drizzle db instance for Supabase.
3. Implement server actions
   - Add /actions/notes-actions.ts with createNote, getNote, updateNoteContent, deleteNote.
   - Use zod for input validation; enforce ownership checks with Clerk auth().
4. Build UI components
   - Implement /components/editor/* as specified.
   - Implement /app/notes/[id]/page.tsx to fetch and render a note.
5. Connect frontend to backend
   - Wire toolbar to Tiptap commands.
   - Wire autosave debounce to updateNoteContent server action.
   - Add delete to toolbar calling deleteNote.
6. Add error handling
   - Catch server action errors in client; display toasts and statuses.
   - Handle conflict by refreshing the page to get latest content/rev.
7. Test the feature
   - Unit test server actions (auth, ownership, rev conflicts).
   - Integration test editor rendering and autosave.
   - UAT scenarios listed below.

### Edge Cases & Error Handling
- Unauthorized access:
  - getNote/create/update/delete throw "Unauthorized" when no user; UI should redirect to sign-in if needed.
- Not found or deleted:
  - getNote/update/delete throw "Not found"; show a friendly message and redirect.
- Edit conflicts (concurrent edits):
  - updateNoteContent throws "Conflict"; client shows conflict status and refreshes.
- Network flakiness:
  - Autosave failure sets error state; user continues editing; retry on next change.
- Excessive save frequency:
  - Debounce saves by 1.5s; no save if no changes after last save.
- Payload size:
  - Large content: rely on JSONB storage; consider compressing or limiting if necessary.
- XSS/security:
  - Tiptap sanitizes input through controlled commands; avoid rendering raw HTML from untrusted sources outside the editor.
- Navigation with unsaved changes:
  - beforeunload prompt when dirty.

### Testing Approach
- Unit tests (server actions):
  - createNote: creates note for authenticated user; defaults title/content.
  - getNote: returns only if user owns note; rejects others.
  - updateNoteContent: increments rev, updates content; conflict when rev mismatch.
  - deleteNote: sets deletedAt; subsequent getNote rejects.
- Integration tests (components):
  - Render RichTextEditor with initial content; toolbar toggles change isActive states.
  - onUpdate triggers debounced save; mock updateNoteContent to assert calls and state transitions (saving -> saved).
  - Conflict path: mock updateNoteContent to throw "Conflict"; assert toast and router.refresh called.
  - Delete path: clicking delete calls action and navigates away.
- User acceptance tests:
  - Format text with bold/italic/lists/headings and see correct rendering.
  - Type continuously; observe "Saving…" then "Saved" without manual action.
  - Open same note in two windows; save in one, then attempt edit in the other; conflict is handled gracefully.
  - Delete a note from the toolbar; redirected to notes list and note no longer listed.

Notes for Production Readiness:
- Consider adding RLS policies in Supabase to enforce row-level ownership if connecting via Supabase client elsewhere.
- Optionally add a server-side trigger to update updatedAt automatically.
- Add rate limiting on updates if exposed via routes; with Server Actions and debounce this is typically sufficient.


