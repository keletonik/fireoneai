# FyreOne AI — Comprehensive Codebase Audit & Fix

## ⚠️ CRITICAL: CODE STYLE

**All code must appear naturally written. Professional developer style.**

This means:
- NO comments mentioning automation, generation, assistance, etc.
- NO special file names that hint at tooling
- NO over-documented code (devs forget to comment)
- NO perfect consistency — vary style slightly like a real dev
- NO corporate/formal commit messages — keep them casual
- Use realistic variable names: tmp, idx, cfg, conn, not always perfectly descriptive
- Include occasional // TODO: refactor this or // FIXME like real code
- Mix comment styles (some verbose, some terse, some missing)
- Don't over-type everything — devs are lazy with type hints

**Commit message examples:**
- ✅ "fix project creation bug"
- ✅ "notebooks api + frontend hookup" 
- ✅ "unfuck the input focus issue"
- ❌ "Implemented project creation feature as requested"
- ❌ "Added comprehensive error handling to API endpoints"

---

## PROJECT CONTEXT

This is a React Native/Expo mobile app for NSW fire safety compliance. It has a Node.js/Express backend with PostgreSQL database.

**The Problem:** The app has UI components that look functional but don't actually work. Buttons that don't save data, modals that don't persist anything, features that are just facades.

**Your Job:** Audit the entire codebase, identify what's broken or missing, and fix it so everything actually works.

---

## PHASE 1: PROJECT STRUCTURE AUDIT

First, understand what we're working with.

Tell me:
- What's the folder structure? (monorepo, separate client/server, etc.)
- What framework is the frontend? (React Native, Expo, etc.)
- What's the backend? (Express, Fastify, etc.)
- What ORM? (Drizzle, Prisma, raw SQL?)
- What database? (PostgreSQL, SQLite, etc.)

---

## PHASE 2: DATABASE AUDIT

Check what tables exist vs what's needed.

**Required tables (check if they exist and have correct columns):**

### 1. users
- id (primary key)
- email
- password_hash (if doing local auth)
- name
- created_at

### 2. conversations
- id (primary key)
- user_id (foreign key)
- title
- project_id (foreign key, nullable)
- is_favorite (boolean)
- created_at
- updated_at

### 3. messages
- id (primary key)
- conversation_id (foreign key)
- role ('user' | 'assistant')
- content (text)
- created_at

### 4. projects
- id (primary key)
- user_id
- name (required)
- description (optional)
- color (default '#f97316')
- created_at
- updated_at

### 5. notebooks
- id (primary key)
- user_id
- name (required)
- description (optional)
- color (default '#f97316')
- created_at
- updated_at

### 6. snippets
- id (primary key)
- notebook_id (foreign key)
- conversation_id (optional)
- message_id (optional)
- title (optional)
- content (required)
- notes (optional)
- tags (jsonb array)
- created_at

### 7. feedback (optional but good to have)
- id (primary key)
- message_id (foreign key)
- user_id
- type ('positive' | 'negative')
- created_at

**For each table:**
1. Does it exist in the schema?
2. Is the migration applied?
3. Can you query it?

**If tables are missing, create them.**

---

## PHASE 3: API ROUTES AUDIT

Check what API endpoints exist.

**Required endpoints (check each one exists AND works):**

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me

### Conversations
- GET    /api/conversations          
- POST   /api/conversations          
- GET    /api/conversations/:id      
- PATCH  /api/conversations/:id      
- DELETE /api/conversations/:id      

### Messages
- POST   /api/conversations/:id/messages  

### Projects
- GET    /api/projects               
- POST   /api/projects               
- GET    /api/projects/:id           
- PATCH  /api/projects/:id           
- DELETE /api/projects/:id           

### Notebooks
- GET    /api/notebooks              
- POST   /api/notebooks              
- GET    /api/notebooks/:id          
- PATCH  /api/notebooks/:id          
- DELETE /api/notebooks/:id          

### Snippets
- POST   /api/snippets               
- PATCH  /api/snippets/:id           
- DELETE /api/snippets/:id           

### Feedback
- POST   /api/feedback/messages/:id  

**For each endpoint:**
1. Does the route file exist?
2. Is it registered in the main server file?
3. Does it actually query the database?

**If endpoints are missing or broken, fix them.**

---

## PHASE 4: FRONTEND-BACKEND INTEGRATION AUDIT

Check if the frontend actually calls the APIs.

**Check these specific features:**

### 4.1 New Project Modal
- Does handleCreate call POST /api/projects?
- Does it handle the response?
- Does it refresh the projects list after creating?

### 4.2 New Notebook Modal
Same checks as above for notebooks.

### 4.3 Projects List in Sidebar
- Does it call GET /api/projects on mount?
- Does it display the returned data?

### 4.4 Save to Notebook (from chat message)
- Does long-press on message show "Save to Notebook" option?
- Does it call POST /api/snippets?

### 4.5 Chat/Messages
- Does sending a message call the API?
- Are messages persisted (survive app refresh)?

---

## PHASE 5: KNOWN BUGS TO FIX

### 5.1 TextInput Focus Bug
**Symptom:** Tapping input field causes it to immediately lose focus.
**Locations:** Chat input, New Project modal, any modal with text input.

**Fixes needed:**
- KeyboardAvoidingView properly configured
- ScrollView/FlatList needs keyboardShouldPersistTaps="handled"
- Modal needs inner Pressable with e.stopPropagation()
- Stable callbacks to prevent re-renders

### 5.2 Generic Welcome Messages
**Current:** When user taps topic like "Sprinkler Systems", they see a generic message.
**Fix:** Remove this message. Just focus the input with a helpful placeholder.

---

## PHASE 6: MISSING FEATURES TO IMPLEMENT

If these don't exist, implement them:

- Offline Indicator (show when no network)
- Photo Attachment in Chat
- Copy Clause References (tap to copy AS1851, Clause 3.2, etc.)
- Export Conversation
- Pull to Refresh
- Loading States ("thinking..." when waiting for response)

---

## PHASE 7: VERIFICATION CHECKLIST

After all fixes, verify:

**Database:**
- [ ] All tables exist
- [ ] Can insert and query each table

**API:**
- [ ] All endpoints return 200 (not 404)
- [ ] POST endpoints actually create records
- [ ] GET endpoints return correct data

**Frontend Integration:**
- [ ] Creating a project works (appears in list, survives refresh)
- [ ] Creating a notebook works
- [ ] Saving message to notebook works
- [ ] Chat messages persist

**UX:**
- [ ] Text inputs don't lose focus
- [ ] All toggles are orange when ON
- [ ] Loading states appear when waiting

---

## EXECUTION ORDER

1. Phase 1: Understand project structure (5 min)
2. Phase 2: Audit & fix database schema (15 min)
3. Phase 3: Audit & fix API routes (30 min)
4. Phase 4: Audit & fix frontend integration (30 min)
5. Phase 5: Fix known bugs (20 min)
6. Phase 6: Implement missing features (30 min)
7. Phase 7: Full verification (15 min)

---

## HOW TO REPORT

After each phase, report:

### What I Found:
- [List issues]

### What I Fixed:
- [List changes]

### What Still Needs Work:
- [Remaining issues]

---

START WITH PHASE 1. Show me the project structure before making any changes.
