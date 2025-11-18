## Feature: Category Management

### Overview
Enable users to organize notes by categories for easy filtering and retrieval. Users can create, rename, delete categories, assign a note to a category within the note editor, and filter notes by category on the dashboard.

### User Stories & Requirements
- As an authenticated user, I want to create categories so that I can group related notes.
  - Acceptance:
    - Given I am logged in, when I provide a unique category name, a category is created and visible in the category dropdown and filter list.
    - Duplicate category names (per user) are rejected with an error.

- As an authenticated user, I want to assign a category to a note during creation/editing so that I can organize my notes.
  - Acceptance:
    - In the note editor, a dropdown lists my categories and allows selecting one.
    - I can clear the selection to have no category.
    - The selected category persists after saving the note.

- As an authenticated user, I want to create a category inline from the note editor so that I don't have to leave the editor.
  - Acceptance:
    - The category dropdown provides "Create new category".
    - On successful creation, the new category is immediately selectable and applied to the note.

- As an authenticated user, I want to filter notes by category on the dashboard so that I can quickly find related notes.
  - Acceptance:
    - The dashboard offers a category filter.
    - When I select a category, the notes list shows only notes in that category.
    - Clearing the filter shows all notes.

- As an authenticated user, I want to rename or delete a category so that I can maintain my organization.
  - Acceptance:
    - Rename enforces uniqueness per user.
    - Delete is blocked if notes still reference the category unless I reassign those notes or clear their category.
    - On delete with "reassign to" or "clear," notes are updated accordingly.

### Technical Implementation

#### Database Schema
Provide only the schema needed for this feature. We introduce a categories table and add a nullable foreign key on notes to reference it.

```typescript
// /db/schema/categories.ts
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(), // unique per user
  color: text('color').notNull().default('gray'), // optional UI enhancement
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('categories_user_idx').on(t.userId),
  userNameUnique: uniqueIndex('categories_user_name_unique').on(t.userId, t.name),
}));
```

```typescript
// /db/schema/notes.ts (only the addition relevant to this feature)
// Assumes an existing 'notes' table with at least: id, userId, title/content, createdAt, updatedAt
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { categories } from './categories';

// ...existing notes table definition...
export const notes = pgTable('notes', {
  // existing columns...
  // id: uuid('id').primaryKey().defaultRandom(),
  // userId: text('user_id').notNull(),
  // ...
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
});
```

#### API Endpoints / Server Actions
Use Next.js Server Actions for mutations; keep reads in Server Components when possible.

```typescript
// /lib/validations/category.ts
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(64, 'Max 64 characters'),
  color: z.string().trim().min(1).max(24).optional(),
});

export const renameCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(64),
});

export const deleteCategorySchema = z.object({
  id: z.string().uuid(),
  // one of: reassignTo (uuid), clear (boolean), or block if neither and has notes
  reassignToCategoryId: z.string().uuid().optional(),
  clear: z.boolean().optional(),
});

export const assignNoteCategorySchema = z.object({
  noteId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(), // null clears category
});
```

### Dependencies & Integrations
- Integrates with Notes feature:
  - Adds notes.categoryId FK.
  - Dashboard notes list should respect ?category search param and call getNotesByCategory or extend existing notes query.
- Authentication:
  - Clerk for user scoping in all actions.
- Database:
  - Supabase (Postgres) with Drizzle ORM.
- UI:
  - ShadCN components (Select/Popover/Command).
- No extra npm deps beyond CodeSpring standard stack. Optionally zod (already common in stack).

### Implementation Steps
1. Create database schema
   - Add /db/schema/categories.ts.
   - Add categoryId to /db/schema/notes.ts.
   - Generate and run migrations with drizzle-kit.
2. Generate queries
   - Optionally define relations in /db/schema/relations.ts for eager loading.
3. Implement server actions
   - Create /lib/validations/category.ts with zod schemas.
   - Create /actions/categories-actions.ts with create, list, rename, delete, assign.
   - Extend /actions/notes-actions.ts to support filtering by category.
4. Build UI components
   - Implement /components/categories/category-select.tsx for the editor.
   - Implement /components/categories/category-filter.tsx for dashboard.
   - Optional /components/categories/category-badge.tsx for note list items.
5. Connect frontend to backend
   - In note editor, render <CategorySelect noteId={note.id} value={note.categoryId} />.
   - On dashboard page, render <CategoryFilter /> and apply ?category to notes query.
6. Add error handling
   - Display action errors in toasts or alerts (e.g., res.ok checks).
   - Block delete if notes exist without reassign/clear; surface friendly message.
7. Test the feature
   - Add unit tests for server actions and validation.
   - Add integration tests for filtering and assignment flows.

### Edge Cases & Error Handling
- Unauthorized access:
  - All actions check auth(); return { ok: false, error: 'Unauthorized', code: '401' }.
- Duplicate category name (per user):
  - Handled via unique index and onConflictDoNothing; return 409-like error.
- Deleting a category with existing notes:
  - If no reassignToCategoryId and not clear, return error and block.
  - If clear, sets categoryId to null.
- Assigning to a category that doesn't belong to the user:
  - Return 400; do not update note.
- Renaming to an existing name:
  - Return 409-like error.
- Large category lists:
  - Use Command input search; load lazily via listCategories.
- Data integrity:
  - FK on notes.categoryId with onDelete set null.
- Concurrency:
  - Unique constraint ensures no dupes; client should refetch/reload categories after creation/rename.
- XSS/Validation:
  - Trim and length-limit names.
- Performance:
  - Index on (userId) for categories and notes.
  - Optionally avoid eager loading counts if not needed; derive counts via separate query when necessary.

### Testing Approach
- Unit tests (server actions):
  - createCategory: success, duplicate name, unauthorized.
  - listCategories: returns only user's categories.
  - renameCategory: success, duplicate name, not found.
  - deleteCategory: block when notes exist without clear/reassign; success with clear; success with reassign; unauthorized.
  - assignNoteCategory: success, clear, invalid category (other user), note not found.
- Integration tests:
  - Editor flow: create inline category and ensure note saved with new category.
  - Dashboard flow: selecting category updates URL and filters notes.
  - Deleting category with reassign path updates affected notes.
- UAT scenarios:
  - Create several categories; assign notes; filter by each category and "All".
  - Rename category; verify note lists reflect new name.
  - Delete category with "Clear all notes" and with "Reassign to X"; verify note categories accordingly.

Notes:
- Ensure migrations are generated and applied before deploying.
- Add RLS policies in Supabase if directly accessing via Supabase client; if using Drizzle over pooled connection, always scope by userId in queries.
- Use Vercel env vars for database; actions run on the server only.

