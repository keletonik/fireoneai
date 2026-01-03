# FyreOne AI Feature Implementation - Replit Agent Prompt

Copy and paste this entire prompt into Replit Agent. It's designed to be implemented in phases.

---

## PHASE 1: DATABASE SCHEMA UPDATES

First, update the database schema to support the new features. Add these tables using Drizzle ORM:

### New Tables Required:

```typescript
// Add to your schema file (e.g., shared/schema.ts or db/schema.ts)

import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// Projects - folders for organizing conversations
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'), // Orange default
  icon: text('icon').default('folder'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Update conversations table to support projects and favorites
// Add these columns to existing conversations table:
// - projectId: uuid (nullable, references projects.id)
// - isFavorite: boolean (default false)
// - title: text (auto-generated from first message)

// Notebooks - collections of saved snippets
export const notebooks = pgTable('notebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Snippets - saved response blocks
export const snippets = pgTable('snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  notebookId: uuid('notebook_id').references(() => notebooks.id, { onDelete: 'cascade' }).notNull(),
  conversationId: uuid('conversation_id').notNull(), // Reference to source conversation
  messageIndex: integer('message_index').notNull(), // Which message in the conversation
  content: text('content').notNull(), // The saved content
  title: text('title'), // Optional user-provided title
  notes: text('notes'), // Optional user notes
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Project Knowledge Base - files/documents for RAG
export const projectKnowledge = pgTable('project_knowledge', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  contentType: text('content_type').default('text'), // 'text', 'markdown', 'snippet'
  sourceSnippetId: uuid('source_snippet_id').references(() => snippets.id),
  embedding: jsonb('embedding'), // Vector embedding for RAG
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Run the database migration after adding these tables.

---

## PHASE 2: COLLAPSIBLE SIDEBAR

Create a responsive sidebar component with the following structure:

### File: `client/src/components/Sidebar.tsx`

Requirements:
- Mobile: Hidden by default, slides in from left when hamburger menu is clicked, with dark overlay behind it
- Desktop (md: 768px+): Always visible on left side, can collapse to icons-only mode (56px width)
- Full width when expanded: 280px

### Sidebar Sections (top to bottom):

1. **Header**
   - FyreOne logo (link to home)
   - Collapse/expand button (desktop only)
   - Close button (mobile only)

2. **New Chat Button**
   - Prominent orange button (#f97316)
   - Full width when expanded, icon-only when collapsed
   - Creates new conversation and navigates to it

3. **Search**
   - Search icon + "Search" text
   - Opens a modal with search input
   - Searches conversation titles and content
   - Shows results as clickable list

4. **Favorites Section**
   - Collapsible with chevron
   - Lists conversations where isFavorite = true
   - Each item shows: title, date
   - Right-click menu: Remove from favorites, Delete

5. **Recent Section**
   - Collapsible with chevron
   - Lists last 10 conversations (not in projects, not favorited)
   - Each item shows: title, preview snippet, date
   - Right-click menu: Rename, Add to favorites, Move to project, Delete

6. **Projects Section**
   - Collapsible with chevron
   - "New Project" button at top of section
   - Each project is expandable to show its conversations
   - Project right-click: Rename, Change color, Delete
   - Conversation right-click: Rename, Favorite, Move, Delete

7. **Notebooks Section**
   - Collapsible with chevron
   - "New Notebook" button
   - Lists all notebooks with snippet count
   - Click to open notebook view

8. **Footer**
   - Settings icon (links to settings page)
   - Help/feedback link
   - User avatar/name if logged in

### State Management:
- Sidebar open/collapsed state: localStorage ('fyreone-sidebar-state')
- Section collapsed states: localStorage ('fyreone-sidebar-sections')
- Use React Context for sidebar state across app

### Animations:
- Sidebar slide: 300ms ease-in-out
- Section collapse: 200ms ease-out
- Hover states on all interactive elements

### Mobile Behavior:
- Hamburger icon in main header triggers sidebar
- Clicking outside sidebar or on a conversation closes it
- Swipe right from left edge opens sidebar (optional enhancement)

---

## PHASE 3: CONVERSATION LIST ITEM COMPONENT

### File: `client/src/components/ConversationItem.tsx`

Each conversation in the sidebar needs:

```tsx
interface ConversationItemProps {
  id: string;
  title: string;
  preview?: string;
  date: Date;
  isFavorite: boolean;
  projectId?: string;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onToggleFavorite: () => void;
  onMoveToProject: (projectId: string | null) => void;
  onDelete: () => void;
}
```

Features:
- Truncated title (max 2 lines)
- Relative date (Today, Yesterday, Dec 15, etc.)
- Active state highlight (orange-50 background, orange-500 left border)
- Hover state (gray-50 background)
- Context menu on right-click or long-press (mobile)
- Inline rename with input field on double-click or menu action

---

## PHASE 4: EXPORT FUNCTIONALITY

### File: `client/src/components/ExportMenu.tsx`

Add export button to chat header (top right area). Clicking opens dropdown:

1. **Export as Markdown (.md)**
   - Converts conversation to markdown format:
   ```markdown
   # FyreOne AI Conversation
   **Date:** December 15, 2024
   **Topic:** Fire Door Compliance

   ---

   ## User
   What are the requirements for fire doors under AS1905.1?

   ## Assistant
   Under AS1905.1, fire doors must meet the following requirements...

   ---
   ```
   - Downloads as `fyreone-{sanitized-title}-{YYYY-MM-DD}.md`

2. **Export as PDF**
   - Uses browser print-to-PDF or a library like jsPDF
   - Styled nicely with FyreOne branding
   - Downloads as `fyreone-{sanitized-title}-{YYYY-MM-DD}.pdf`

3. **Copy to Clipboard**
   - Copies markdown format to clipboard
   - Shows toast notification: "Copied to clipboard"

### Backend Endpoint (optional for PDF):
```
GET /api/conversations/:id/export?format=md|pdf
```

---

## PHASE 5: MESSAGE ACTION BUTTONS

### File: `client/src/components/MessageActions.tsx`

Add action buttons to each assistant response message:

```
[👍 Helpful] [👎 Not helpful] [📋 Copy] [📌 Save to Notebook]
```

Layout:
- Appears on hover (desktop) or always visible (mobile)
- Small, subtle buttons with icons
- Tooltips on hover

**Copy Button:**
- Copies message content as markdown
- Toast: "Copied to clipboard"

**Save to Notebook Button (📌):**
- Opens SaveToNotebookModal

---

## PHASE 6: SAVE TO NOTEBOOK MODAL

### File: `client/src/components/SaveToNotebookModal.tsx`

Modal that appears when clicking 📌:

```
┌─────────────────────────────────────────┐
│  Save to Notebook                    ✕  │
├─────────────────────────────────────────┤
│                                         │
│  Preview:                               │
│  ┌─────────────────────────────────┐   │
│  │ "Under AS1905.1, fire doors     │   │
│  │ must meet the following..."     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Notebook: [▼ Select notebook    ]     │
│            • Quick Reference            │
│            • Fire Door Specs            │
│            • + Create new notebook      │
│                                         │
│  Title (optional):                      │
│  [AS1905.1 Fire Door Requirements  ]   │
│                                         │
│  Notes (optional):                      │
│  [                                  ]   │
│  [                                  ]   │
│                                         │
│  Tags:                                  │
│  [fire-doors] [AS1905] [+ Add tag]     │
│                                         │
│           [Cancel]  [Save Snippet]      │
└─────────────────────────────────────────┘
```

Features:
- Content preview (truncated, expandable)
- Notebook dropdown with "Create new" option
- Auto-suggest title from first line of content
- Tag input with suggestions from existing tags
- Optimistic UI update on save

---

## PHASE 7: NOTEBOOK VIEW

### File: `client/src/pages/NotebookPage.tsx`
### Route: `/notebooks/:id`

Full-page view of a notebook's contents:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Fire Door Specs                    [⋯] [Export] │
├─────────────────────────────────────────────────────────────┤
│  12 snippets • Last updated Dec 15                          │
│                                                             │
│  🔍 Search snippets...                    [Filter by tag ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AS1905.1 Fire Door Requirements                     │   │
│  │ ───────────────────────────────────────────────────│   │
│  │ Under AS1905.1, fire doors must meet...             │   │
│  │                                                     │   │
│  │ Tags: fire-doors, AS1905                           │   │
│  │ Saved: Dec 15 • From: "Fire compliance query"  →   │   │
│  │                                         [Edit] [🗑] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AFSS Annual Statement Requirements                  │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Search within notebook
- Filter by tags
- Click snippet to expand full content
- Link to source conversation
- Edit title/notes inline
- Delete snippet (with confirmation)
- Export entire notebook as .md
- Menu option: "Use as Project Knowledge" (copies to a project's knowledge base)

---

## PHASE 8: API ENDPOINTS

Create these API routes:

### Projects
```
GET    /api/projects              - List user's projects
POST   /api/projects              - Create project
PATCH  /api/projects/:id          - Update project (name, color)
DELETE /api/projects/:id          - Delete project (moves conversations to unassigned)
```

### Conversations (updates to existing)
```
PATCH  /api/conversations/:id     - Update (add: title, projectId, isFavorite)
GET    /api/conversations/search?q=  - Search conversations
```

### Notebooks
```
GET    /api/notebooks             - List user's notebooks
POST   /api/notebooks             - Create notebook
PATCH  /api/notebooks/:id         - Update notebook
DELETE /api/notebooks/:id         - Delete notebook (cascades to snippets)
GET    /api/notebooks/:id/snippets - Get snippets in notebook
```

### Snippets
```
POST   /api/snippets              - Save snippet to notebook
PATCH  /api/snippets/:id          - Update snippet (title, notes, tags)
DELETE /api/snippets/:id          - Delete snippet
GET    /api/snippets/tags         - Get all unique tags for autocomplete
```

### Export
```
GET    /api/conversations/:id/export?format=md
GET    /api/notebooks/:id/export?format=md
```

---

## PHASE 9: UI/UX POLISH

### Colors (match existing FyreOne theme):
- Primary: #f97316 (orange-500)
- Primary hover: #ea580c (orange-600)
- Primary light: #fff7ed (orange-50)
- Background: #ffffff
- Text: #1f2937 (gray-800)
- Secondary text: #6b7280 (gray-500)
- Border: #e5e7eb (gray-200)
- Success: #22c55e (green-500)
- Error: #ef4444 (red-500)

### Shadows:
- Cards: `shadow-sm`
- Modals: `shadow-xl`
- Dropdowns: `shadow-lg`

### Animations:
- All transitions: `transition-all duration-200 ease-out`
- Modal backdrop: fade in 200ms
- Modal content: scale from 95% to 100% + fade

### Mobile Considerations:
- Touch targets minimum 44x44px
- Swipe gestures for common actions
- Bottom sheet modals instead of centered modals
- Sticky headers for long lists

---

## IMPLEMENTATION ORDER

Please implement in this order:

1. Database schema changes + migrations
2. Sidebar component (desktop first, then mobile)
3. Conversation list items with context menus
4. Projects CRUD
5. Export functionality (markdown first)
6. Message action buttons
7. Notebooks CRUD
8. Save to notebook modal
9. Notebook view page
10. Search functionality
11. Polish and testing

Start with Phase 1 (database) and Phase 2 (sidebar). Confirm completion before moving to the next phase.
