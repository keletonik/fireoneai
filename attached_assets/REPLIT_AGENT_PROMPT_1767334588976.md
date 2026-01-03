# FyreOne AI - Complete Feature Implementation

I need you to implement several features for my FyreOne AI fire safety compliance chatbot. Please implement these in phases, confirming completion before moving to the next phase.

## PROJECT CONTEXT

FyreOne AI is a NSW fire safety compliance assistant chatbot. The app uses:
- React + TypeScript with Vite
- Tailwind CSS + shadcn/ui
- wouter for routing
- TanStack Query for data fetching
- Node.js + Express backend
- PostgreSQL with Drizzle ORM
- OpenAI for chat completions

**Brand Colors:**
- Primary Orange: #f97316 (orange-500)
- Primary Hover: #ea580c (orange-600)  
- Light Background: white / slate-50
- Dark Background: slate-950
- Text: gray-800 (light) / white (dark)
- Mentaris brand: gray-500 text with cyan-400 "A"

---

## PHASE 1: LOGIN/SPLASH PAGE WITH ANIMATED BACKGROUND

Create a login page with an animated "Fire Safety Grid" background showing sprinkler heads and smoke alarms connected by network lines with monitoring pulses traveling between them.

### 1.1 Create FireSafetyGrid.tsx Component

Create `client/src/components/FireSafetyGrid.tsx`:

This is a canvas-based animation that shows:
- **Sprinkler head nodes**: Ceiling-mounted sprinklers with deflector plates and blinking green status LEDs
- **Smoke alarm nodes**: Circular detectors with sensor hole patterns
- **Connection lines**: Dashed lines between nearby devices (like conduit/cabling)
- **Monitoring signals**: Green pulses travel along connections for routine checks, orange for alerts
- **Sprinkler activation**: Occasionally a random sprinkler "activates" and sprays blue water particles

Requirements:
- Accept `isDark` prop (boolean) to adjust colors for light/dark themes
- Use requestAnimationFrame for smooth 60fps animation
- Handle window resize
- Clean up animation on unmount
- Nodes should have subtle pulse animations
- Keep it performant (limit particle counts)

Color scheme:
- Light mode: Subtle gray devices (#94a3b8, #cbd5e1), muted connections
- Dark mode: Lighter gray devices (#475569, #64748b), more visible connections
- Green status LEDs: rgba(34, 197, 94, opacity)
- Orange alerts: rgba(249, 115, 22, opacity)
- Water spray: Blue gradient (#93c5fd to #3b82f6)

### 1.2 Create Login Page Components

Create TWO login page variants:

**FyreOneLoginLight.tsx** - Minimal light theme:
- Background: gradient from slate-50 to white
- FireSafetyGrid animation behind content
- Orange accent line at top (h-1, gradient via-orange-500)
- Centered content:
  - Flame SVG icon (orange gradient)
  - "FyreOne AI" title (Fyre=orange-500, One=slate-800, AI=slate-300)
  - Subtitle: "NSW Fire Safety Compliance"
  - Login form in white/80 backdrop-blur card with shadow
  - Email input, Password input, Sign in button (orange-500)
  - "New here? Create account" link
- Footer: "Powered by MENTARIS" (link to https://mentaris.io)
  - MENTARIS styled as: MENT (slate-500) + A (cyan-500) + RIS (slate-500)

**FyreOneLoginDark.tsx** - Premium dark theme:
- Background: slate-950
- FireSafetyGrid animation with isDark={true}
- Gradient overlays (radial orange glows at top and bottom-right)
- Centered content:
  - Badge: "AI-Powered Compliance" with pulsing orange dot
  - Large "FyreOne" title (Fyre=gradient orange, One=white)
  - Tagline: "Your expert assistant for NSW fire safety compliance"
  - Login form in slate-900/70 backdrop-blur card
  - Inputs with slate-800/50 background, slate-700 border
  - Gradient orange sign-in button with shadow
- Footer: "Powered by MENTARIS" same styling but with slate-500/cyan-400
- Bottom accent line (h-px gradient via-orange-500/40)

Both components should:
- Accept props: `onSignIn?: (email, password) => void`, `onSignUp?: () => void`, `isLoading?: boolean`, `error?: string`
- Show loading spinner in button when isLoading
- Display error message in a styled alert box
- Have staggered fade-in animations on mount (use useState + useEffect for mounted state)
- Be fully responsive

### 1.3 Set Up Login Route

Add the login page to your router. Use the dark theme by default (or let me know your preference).

```tsx
// Example in App.tsx or routes file
import { FyreOneLoginDark } from '@/components/FyreOneLoginDark';

<Route path="/login" component={LoginPage} />

function LoginPage() {
  const handleSignIn = async (email: string, password: string) => {
    // Your auth logic
  };
  
  return (
    <FyreOneLoginDark 
      onSignIn={handleSignIn}
      onSignUp={() => navigate('/signup')}
    />
  );
}
```

---

## PHASE 2: DATABASE SCHEMA UPDATES

Add these tables to support sidebar features. Add to your Drizzle schema:

```typescript
// Projects - folders for organizing conversations
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  icon: text('icon').default('folder'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notebooks - collections of saved snippets
export const notebooks = pgTable('notebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Snippets - saved response blocks
export const snippets = pgTable('snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  notebookId: uuid('notebook_id').references(() => notebooks.id, { onDelete: 'cascade' }).notNull(),
  conversationId: uuid('conversation_id').notNull(),
  messageIndex: integer('message_index').notNull(),
  content: text('content').notNull(),
  title: text('title'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Also update your existing conversations table to add:
- `projectId`: uuid (nullable, references projects.id)
- `isFavorite`: boolean (default false)
- `title`: text (auto-generated from first message)

Run migrations after schema updates.

---

## PHASE 3: COLLAPSIBLE SIDEBAR

Create a responsive sidebar component:

**Desktop (768px+):** Always visible, can collapse to icons-only (56px width)
**Mobile:** Hidden by default, slides in from left when hamburger is clicked

### Sidebar Structure (top to bottom):

1. **Header**: Logo + collapse button (desktop) / close button (mobile)
2. **New Chat Button**: Orange (#f97316), full width
3. **Search**: Opens search modal
4. **Favorites Section**: Collapsible, shows starred conversations
5. **Recent Section**: Collapsible, shows last 10 non-project conversations
6. **Projects Section**: Collapsible, shows user's project folders
7. **Notebooks Section**: Collapsible, shows user's notebooks
8. **Footer**: Settings link

Each conversation item shows:
- Title (truncated)
- Relative date (Today, Yesterday, Dec 15, etc.)
- Context menu on right-click: Rename, Favorite, Move to Project, Delete

### State Management:
- Create SidebarContext with: isOpen, isCollapsed, setIsOpen, setIsCollapsed
- Persist collapsed state to localStorage
- Persist section open/closed states to localStorage

### Mobile Trigger:
- Create SidebarTrigger component (hamburger icon) for the main header
- Dark overlay behind sidebar when open on mobile
- Close on outside click or navigation

---

## PHASE 4: MESSAGE ACTION BUTTONS

Add action buttons to each assistant message in the chat:

```
[👍] [👎] [📋 Copy] [📌 Save]
```

- Show on hover (desktop) or always visible (mobile)
- Copy button: Copies message content to clipboard, shows "Copied!" feedback
- Save button: Opens SaveToNotebookModal

Create `MessageActions.tsx` component that accepts:
- `content`: string (the message text)
- `conversationId`: string
- `messageIndex`: number
- `onFeedback?: (type: 'positive' | 'negative') => void`

---

## PHASE 5: SAVE TO NOTEBOOK MODAL

Modal for saving a response snippet to a notebook:

- Preview of the content (truncated, first 200 chars)
- Notebook dropdown (fetch from /api/notebooks)
  - Option to "Create new notebook" inline
- Optional title input (auto-suggest from first line)
- Optional notes textarea
- Tags input with autocomplete from existing tags

API call on save: POST /api/snippets with { notebookId, conversationId, messageIndex, content, title, notes, tags }

---

## PHASE 6: EXPORT FUNCTIONALITY

Add export button to chat header. Options:

1. **Export as Markdown**: Download .md file with conversation formatted as:
```markdown
# FyreOne AI Conversation
**Date:** January 2, 2026

---

## 👤 User
[user message]

## 🤖 Assistant  
[assistant message]

---
```

2. **Copy to Clipboard**: Same markdown format, copied to clipboard with toast notification

Filename format: `fyreone-{sanitized-title}-{YYYY-MM-DD}.md`

---

## PHASE 7: API ENDPOINTS

Create these REST endpoints:

```
# Projects
GET    /api/projects              - List user's projects
POST   /api/projects              - Create project { name, color? }
PATCH  /api/projects/:id          - Update project
DELETE /api/projects/:id          - Delete project

# Conversations (add to existing)
PATCH  /api/conversations/:id     - Update (title, projectId, isFavorite)
GET    /api/conversations/search?q=  - Search by title/content

# Notebooks
GET    /api/notebooks             - List user's notebooks
POST   /api/notebooks             - Create notebook { name }
PATCH  /api/notebooks/:id         - Update notebook
DELETE /api/notebooks/:id         - Delete notebook (cascades snippets)

# Snippets
POST   /api/snippets              - Save snippet
PATCH  /api/snippets/:id          - Update (title, notes, tags)
DELETE /api/snippets/:id          - Delete snippet
GET    /api/snippets/tags         - Get all unique tags for autocomplete

# Export
GET    /api/conversations/:id/export?format=md  - Get markdown export
```

---

## IMPLEMENTATION ORDER

Please implement in this order, confirming each phase works before moving on:

1. **Phase 1**: Login page with Fire Safety Grid animation
2. **Phase 2**: Database schema updates + migrations
3. **Phase 3**: Sidebar component
4. **Phase 4**: Message action buttons
5. **Phase 5**: Save to notebook modal
6. **Phase 6**: Export functionality
7. **Phase 7**: API endpoints (can be done alongside each feature)

Start with Phase 1 - the login page. Create the FireSafetyGrid animation component first, then the login page components. Let me know when it's ready to test!
