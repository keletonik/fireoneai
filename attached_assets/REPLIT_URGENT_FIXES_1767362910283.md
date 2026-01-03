# URGENT FIXES — READ CAREFULLY

## ISSUE 1: TOGGLE SWITCHES ARE STILL GREEN

I have asked for this THREE TIMES. The toggle switches in Settings are STILL GREEN/TEAL. Look at these components and change the color to ORANGE.

**Find EVERY Switch component in the codebase and update it:**

```bash
# Search for all Switch components
grep -r "Switch" --include="*.tsx" --include="*.ts" client/
```

**The fix is simple. Find code that looks like this:**
```tsx
<Switch
  trackColor={{ false: '#e2e8f0', true: '#10b981' }}  // GREEN - WRONG
  // or
  trackColor={{ false: '#e2e8f0', true: '#14b8a6' }}  // TEAL - WRONG
  // or  
  trackColor={{ false: '#e2e8f0', true: '#34d399' }}  // GREEN - WRONG
```

**Change it to this:**
```tsx
<Switch
  trackColor={{ false: '#e2e8f0', true: '#f97316' }}  // ORANGE - CORRECT
  thumbColor="#ffffff"
  ios_backgroundColor="#e2e8f0"
/>
```

**Check these files specifically:**
- SettingsScreen.tsx
- Any shared Toggle or Switch component
- Any settings-related components

**DO NOT TELL ME THIS IS FIXED UNTIL YOU HAVE:**
1. Searched for ALL Switch/Toggle components
2. Changed EVERY green/teal color (#10b981, #14b8a6, #34d399, #22c55e) to orange (#f97316)
3. Visually verified the toggles are orange in the app

---

## ISSUE 2: INPUT FOCUS BUG IN MODALS

The TextInput focus bug is also happening in modals (like "New Project" modal). When I tap the input field, it immediately loses focus.

**The modal likely needs these fixes:**

```tsx
// 1. Modal should not dismiss on backdrop press while input is focused
<Modal
  onRequestClose={handleClose}
  transparent={true}
  animationType="fade"
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.backdrop}>
      <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
        <View style={styles.modalContent}>
          {/* Modal content - taps here won't dismiss */}
          <TextInput
            autoFocus={true}
            onChangeText={setProjectName}
            value={projectName}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

// 2. Or use KeyboardAvoidingView inside modal
<Modal>
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    <View style={styles.modalContent}>
      <TextInput autoFocus />
    </View>
  </KeyboardAvoidingView>
</Modal>
```

**Find and fix these modals:**
- New Project modal
- Any other modal with text input (rename, create notebook, etc.)

---

## ISSUE 3: REMOVE GENERIC WELCOME MESSAGES

When user taps a topic button like "Sprinkler Systems", they see:
> "So you have a question about Sprinkler Systems — what's your enquiry?"

This is unnecessary friction. The user already chose the topic. They want to type their question, not read a prompt.

**Option A (Preferred): Remove the welcome message entirely**
- User taps "Sprinkler Systems"
- Input field is focused automatically
- Placeholder text shows: "Ask about sprinkler systems..."
- User types immediately

**Option B: Make it actually useful**
If keeping a message, make it provide value:

```tsx
const TOPIC_INTROS = {
  'Sprinkler Systems': {
    message: null, // No message, just focus input
    placeholder: 'e.g., "What are the AS2118 testing requirements?"',
  },
  'Fire Doors': {
    message: null,
    placeholder: 'e.g., "How often do fire doors need inspection?"',
  },
  'Fire Indicating Panels': {
    message: null,
    placeholder: 'e.g., "What does a FIP general fault mean?"',
  },
  // etc.
};
```

The placeholder gives them an example of a good question without adding an extra message they have to read.

**Remove the disclaimer from the welcome message area.** Move it to:
- The app's Terms of Service
- A small footer in Settings > About
- Appended to AI responses (not user-facing prompts)

---

## ISSUE 4: ENHANCED NOTEBOOK SYSTEM

Current notebooks are too basic. Implement a proper system:

### Data Model:

```tsx
interface Notebook {
  id: string;
  name: string;
  description?: string;
  color?: string;  // For visual organization
  createdAt: Date;
  updatedAt: Date;
}

interface Snippet {
  id: string;
  notebookId: string;
  conversationId: string;
  messageId: string;
  title?: string;      // User can rename
  content: string;     // The actual message content
  notes?: string;      // User's personal notes
  tags?: string[];     // For filtering
  createdAt: Date;
}
```

### Features to Implement:

**1. Create Notebook**
```tsx
// Modal with:
- Name input (required)
- Description input (optional)
- Color picker (optional, default orange)
```

**2. View Notebooks List**
```tsx
// Shows all notebooks with:
- Notebook name
- Snippet count
- Last updated
- Color indicator
- Tap to open
- Long press for options (rename, delete, change color)
```

**3. View Notebook Contents**
```tsx
// Inside a notebook:
- List of snippets
- Each snippet shows: title, preview of content, date saved
- Tap snippet to view full content
- Long press for options (move to different notebook, delete, edit notes)
```

**4. Save to Notebook (from chat)**
```tsx
// When user long-presses an AI message:
- Show "Save to Notebook" option
- Opens modal to select notebook (or create new)
- Optional: add title and notes
- Save snippet
```

**5. Move Snippet Between Notebooks**
```tsx
// Long press snippet > "Move to..."
- Shows list of other notebooks
- Tap to move
- Snippet's notebookId is updated
```

**6. Search Within Notebooks**
```tsx
// Search bar at top of notebooks view
- Searches snippet content, titles, and notes
- Shows results across all notebooks
```

### UI Flow:

```
Sidebar > Notebooks
    └── View Notebooks (list)
            └── [+ New Notebook] button
            └── Notebook 1 (tap to open)
                    └── Snippet 1
                    └── Snippet 2
                    └── Snippet 3
            └── Notebook 2
            └── Notebook 3
```

### API Endpoints Needed:

```
POST   /api/notebooks              - Create notebook
GET    /api/notebooks              - List user's notebooks
GET    /api/notebooks/:id          - Get notebook with snippets
PATCH  /api/notebooks/:id          - Update notebook (name, color)
DELETE /api/notebooks/:id          - Delete notebook (and snippets?)

POST   /api/snippets               - Create snippet
GET    /api/snippets/:id           - Get snippet
PATCH  /api/snippets/:id           - Update snippet (title, notes, notebookId)
DELETE /api/snippets/:id           - Delete snippet

GET    /api/notebooks/search?q=    - Search across notebooks
```

### Database Schema:

```sql
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id INTEGER,
  title TEXT,
  content TEXT NOT NULL,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snippets_notebook ON snippets(notebook_id);
CREATE INDEX idx_notebooks_user ON notebooks(user_id);
```

---

## PRIORITY ORDER

1. **FIX THE GREEN TOGGLES** — This is embarrassing at this point. Do it first. Verify visually.

2. **FIX MODAL INPUT FOCUS** — The New Project modal needs to work.

3. **REMOVE WELCOME MESSAGES** — Just focus the input when topic is tapped. Use better placeholders.

4. **IMPLEMENT NOTEBOOK SYSTEM** — This is a bigger feature, do it after the bugs are fixed.

---

## VERIFICATION

**Before saying ANYTHING is done:**

- [ ] ALL toggles in Settings are ORANGE when ON
- [ ] Can type in New Project modal without losing focus
- [ ] Tapping a topic button focuses input immediately (no welcome message blocking)
- [ ] Can create a notebook
- [ ] Can save a message to a notebook
- [ ] Can view saved snippets in notebook
- [ ] Can move snippet between notebooks

**Show me screenshots of the orange toggles before moving on to anything else.**
