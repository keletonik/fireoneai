import { Router } from "express";
import { db } from "../db";
import { projects, conversationProjects, conversations } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(projects.sortOrder, projects.createdAt);

    res.json(userProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, name, description, color, icon } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: "userId and name required" });
    }

    const [project] = await db
      .insert(projects)
      .values({ userId, name, description, color, icon })
      .returning();

    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { name, description, color, icon, isExpanded, sortOrder } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isExpanded !== undefined) updateData.isExpanded = isExpanded;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    await db.delete(conversationProjects).where(eq(conversationProjects.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.get("/:id/conversations", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    const projectConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        isStarred: conversations.isStarred,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
      })
      .from(conversationProjects)
      .innerJoin(conversations, eq(conversationProjects.conversationId, conversations.id))
      .where(eq(conversationProjects.projectId, projectId))
      .orderBy(desc(conversations.lastMessageAt));

    res.json(projectConversations);
  } catch (error) {
    console.error("Error fetching project conversations:", error);
    res.status(500).json({ error: "Failed to fetch project conversations" });
  }
});

router.post("/:id/conversations", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId required" });
    }

    const existing = await db
      .select()
      .from(conversationProjects)
      .where(
        and(
          eq(conversationProjects.projectId, projectId),
          eq(conversationProjects.conversationId, conversationId)
        )
      );

    if (existing.length > 0) {
      return res.json({ success: true, message: "Already in project" });
    }

    await db.insert(conversationProjects).values({ projectId, conversationId });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error adding conversation to project:", error);
    res.status(500).json({ error: "Failed to add conversation to project" });
  }
});

router.delete("/:id/conversations/:conversationId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const conversationId = parseInt(req.params.conversationId);

    await db
      .delete(conversationProjects)
      .where(
        and(
          eq(conversationProjects.projectId, projectId),
          eq(conversationProjects.conversationId, conversationId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing conversation from project:", error);
    res.status(500).json({ error: "Failed to remove conversation from project" });
  }
});

export default router;
