import { Router } from "express";
import { db } from "../db";
import { notebooks, snippets, messages, conversations } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// List all notebooks for user
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const userNotebooks = await db
      .select()
      .from(notebooks)
      .where(eq(notebooks.userId, userId))
      .orderBy(notebooks.createdAt);

    res.json(userNotebooks);
  } catch (error) {
    console.error("Error fetching notebooks:", error);
    res.status(500).json({ error: "Failed to fetch notebooks" });
  }
});

// Snippet routes - MUST come before /:id to avoid conflicts
router.get("/snippets/:id", async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);

    const [snippet] = await db
      .select()
      .from(snippets)
      .where(eq(snippets.id, snippetId));

    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    res.json(snippet);
  } catch (error) {
    console.error("Error fetching snippet:", error);
    res.status(500).json({ error: "Failed to fetch snippet" });
  }
});

router.put("/snippets/:id", async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);
    const { notebookId, content, title, notes, tags, sortOrder } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (notebookId !== undefined) updateData.notebookId = notebookId;
    if (content !== undefined) updateData.content = content;
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const [updated] = await db
      .update(snippets)
      .set(updateData)
      .where(eq(snippets.id, snippetId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating snippet:", error);
    res.status(500).json({ error: "Failed to update snippet" });
  }
});

router.delete("/snippets/:id", async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);

    await db.delete(snippets).where(eq(snippets.id, snippetId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    res.status(500).json({ error: "Failed to delete snippet" });
  }
});

// Get single notebook
router.get("/:id", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);
    if (isNaN(notebookId)) {
      return res.status(400).json({ error: "Invalid notebook ID" });
    }

    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));

    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    res.json(notebook);
  } catch (error) {
    console.error("Error fetching notebook:", error);
    res.status(500).json({ error: "Failed to fetch notebook" });
  }
});

// Create notebook
router.post("/", async (req, res) => {
  try {
    const { userId, name, description, color, icon, isDefault } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: "userId and name required" });
    }

    const [notebook] = await db
      .insert(notebooks)
      .values({ userId, name, description, color, icon, isDefault })
      .returning();

    res.status(201).json(notebook);
  } catch (error) {
    console.error("Error creating notebook:", error);
    res.status(500).json({ error: "Failed to create notebook" });
  }
});

// Update notebook
router.put("/:id", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);
    const { name, description, color, icon, isDefault } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const [updated] = await db
      .update(notebooks)
      .set(updateData)
      .where(eq(notebooks.id, notebookId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating notebook:", error);
    res.status(500).json({ error: "Failed to update notebook" });
  }
});

// Delete notebook
router.delete("/:id", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);

    await db.delete(snippets).where(eq(snippets.notebookId, notebookId));
    await db.delete(notebooks).where(eq(notebooks.id, notebookId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting notebook:", error);
    res.status(500).json({ error: "Failed to delete notebook" });
  }
});

// Get snippets for notebook
router.get("/:id/snippets", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);

    const notebookSnippets = await db
      .select()
      .from(snippets)
      .where(eq(snippets.notebookId, notebookId))
      .orderBy(snippets.sortOrder, desc(snippets.createdAt));

    res.json(notebookSnippets);
  } catch (error) {
    console.error("Error fetching snippets:", error);
    res.status(500).json({ error: "Failed to fetch snippets" });
  }
});

// Create snippet in notebook
router.post("/:id/snippets", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);
    const { conversationId, messageId, content, title, notes, tags } = req.body;

    if (!content) {
      return res.status(400).json({ error: "content required" });
    }

    const [snippet] = await db
      .insert(snippets)
      .values({
        notebookId,
        conversationId: conversationId || null,
        messageId: messageId || null,
        content,
        title,
        notes,
        tags: tags || [],
      })
      .returning();

    res.status(201).json(snippet);
  } catch (error) {
    console.error("Error creating snippet:", error);
    res.status(500).json({ error: "Failed to create snippet" });
  }
});

// Export notebook as markdown
router.get("/:id/export", async (req, res) => {
  try {
    const notebookId = parseInt(req.params.id);

    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));

    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    const notebookSnippets = await db
      .select()
      .from(snippets)
      .where(eq(snippets.notebookId, notebookId))
      .orderBy(snippets.sortOrder, desc(snippets.createdAt));

    let markdown = `# ${notebook.name}\n\n`;
    if (notebook.description) {
      markdown += `${notebook.description}\n\n`;
    }
    markdown += `---\n\n`;

    for (const snippet of notebookSnippets) {
      if (snippet.title) {
        markdown += `## ${snippet.title}\n\n`;
      }
      markdown += `${snippet.content}\n\n`;
      if (snippet.notes) {
        markdown += `> **Notes:** ${snippet.notes}\n\n`;
      }
      if (snippet.tags && Array.isArray(snippet.tags) && snippet.tags.length > 0) {
        markdown += `**Tags:** ${(snippet.tags as string[]).join(", ")}\n\n`;
      }
      markdown += `---\n\n`;
    }

    res.json({ markdown, notebook, snippets: notebookSnippets });
  } catch (error) {
    console.error("Error exporting notebook:", error);
    res.status(500).json({ error: "Failed to export notebook" });
  }
});

export default router;
