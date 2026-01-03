import { Router } from "express";
import { db } from "../db";
import { conversations, messages, conversationProjects } from "@shared/schema";
import { eq, desc, and, isNull, sql, like, or } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const starred = req.query.starred === "true";

    let query = db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));

    if (userId) {
      if (starred) {
        const results = await db
          .select()
          .from(conversations)
          .where(and(eq(conversations.userId, userId), eq(conversations.isStarred, true)))
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit);
        return res.json(results);
      } else {
        const results = await db
          .select()
          .from(conversations)
          .where(eq(conversations.userId, userId))
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit);
        return res.json(results);
      }
    }

    const results = await query.limit(limit);
    res.json(results);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);

    res.json(recentConversations);
  } catch (error) {
    console.error("Error fetching recent conversations:", error);
    res.status(500).json({ error: "Failed to fetch recent conversations" });
  }
});

router.get("/starred", async (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const starredConversations = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.isStarred, true)))
      .orderBy(desc(conversations.lastMessageAt));

    res.json(starredConversations);
  } catch (error) {
    console.error("Error fetching starred conversations:", error);
    res.status(500).json({ error: "Failed to fetch starred conversations" });
  }
});

router.put("/:id/star", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { isStarred } = req.body;

    const [updated] = await db
      .update(conversations)
      .set({ isStarred: isStarred ?? true })
      .where(eq(conversations.id, conversationId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating star status:", error);
    res.status(500).json({ error: "Failed to update star status" });
  }
});

router.put("/:id/rename", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title required" });
    }

    const [updated] = await db
      .update(conversations)
      .set({ title })
      .where(eq(conversations.id, conversationId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error renaming conversation:", error);
    res.status(500).json({ error: "Failed to rename conversation" });
  }
});

router.get("/:id/export", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const dateStr = new Date().toISOString().split("T")[0];
    const safeTitle = conversation.title.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
    const filename = `fyreone-${safeTitle}-${dateStr}.md`;

    let markdown = `# ${conversation.title}\n\n`;
    markdown += `*Exported from FyreOne AI on ${new Date().toLocaleDateString("en-AU")}*\n\n`;
    markdown += `---\n\n`;

    for (const message of conversationMessages) {
      const role = message.role === "user" ? "**User:**" : "**Assistant:**";
      markdown += `${role}\n\n${message.content}\n\n---\n\n`;
    }

    res.json({
      markdown,
      filename,
      conversation,
      messages: conversationMessages,
    });
  } catch (error) {
    console.error("Error exporting conversation:", error);
    res.status(500).json({ error: "Failed to export conversation" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    await db.delete(conversationProjects).where(eq(conversationProjects.conversationId, conversationId));
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
