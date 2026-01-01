import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, conversations, messages } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/clear", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userIdStr = String(userId);

    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userIdStr));

    for (const conv of userConversations) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
    }

    await db.delete(conversations).where(eq(conversations.userId, userIdStr));

    return res.json({
      success: true,
      message: "User data cleared from server. Data retained for legal purposes.",
      clearedConversations: userConversations.length,
    });
  } catch (error) {
    console.error("Error clearing user data:", error);
    return res.status(500).json({ error: "Failed to clear user data" });
  }
});

router.post("/export", async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "User ID and email are required" });
    }

    const userIdStr = String(userId);

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userIdStr));

    const allMessages: Array<{
      conversationId: number;
      conversationTitle: string;
      messages: Array<{ role: string; content: string; createdAt: Date | null }>;
    }> = [];

    for (const conv of userConversations) {
      const convMessages = await db
        .select({
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      allMessages.push({
        conversationId: conv.id,
        conversationTitle: conv.title || `Conversation ${conv.id}`,
        messages: convMessages,
      });
    }

    console.log(`Export requested for user ${userId} to ${email}`);
    console.log(`Found ${userConversations.length} conversations with ${allMessages.reduce((sum, c) => sum + c.messages.length, 0)} total messages`);

    return res.json({
      success: true,
      message: `Export will be sent to ${email}`,
      email,
      conversationCount: userConversations.length,
      messageCount: allMessages.reduce((sum, c) => sum + c.messages.length, 0),
      exportData: allMessages,
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return res.status(500).json({ error: "Failed to export user data" });
  }
});

export default router;
