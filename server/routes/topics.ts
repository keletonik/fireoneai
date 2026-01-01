import { Router, Request, Response } from "express";
import { db } from "../db";
import { complianceTopics, documentTopics, knowledgeDocuments } from "@shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { includeDocumentCount = "false" } = req.query;
    
    if (includeDocumentCount === "true") {
      const topics = await db.select({
        id: complianceTopics.id,
        name: complianceTopics.name,
        code: complianceTopics.code,
        description: complianceTopics.description,
        parentId: complianceTopics.parentId,
        isActive: complianceTopics.isActive,
        createdAt: complianceTopics.createdAt,
        documentCount: sql<number>`count(${documentTopics.documentId})`.as("document_count"),
      })
        .from(complianceTopics)
        .leftJoin(documentTopics, eq(complianceTopics.id, documentTopics.topicId))
        .groupBy(complianceTopics.id)
        .orderBy(complianceTopics.name);
      
      return res.json(topics);
    }
    
    const topics = await db.select()
      .from(complianceTopics)
      .where(eq(complianceTopics.isActive, true))
      .orderBy(complianceTopics.name);
    
    res.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, code, description, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    
    if (code) {
      const existing = await db.select()
        .from(complianceTopics)
        .where(eq(complianceTopics.code, code))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Topic code already exists" });
      }
    }
    
    const [topic] = await db.insert(complianceTopics).values({
      name,
      code: code || null,
      description: description || null,
      parentId: parentId || null,
      isActive: true,
    }).returning();
    
    res.status(201).json(topic);
  } catch (error) {
    console.error("Error creating topic:", error);
    res.status(500).json({ error: "Failed to create topic" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const topic = await db.select()
      .from(complianceTopics)
      .where(eq(complianceTopics.id, parseInt(id)))
      .limit(1);
    
    if (topic.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }
    
    const documents = await db.select({
      id: knowledgeDocuments.id,
      title: knowledgeDocuments.title,
      category: knowledgeDocuments.category,
      status: knowledgeDocuments.status,
    })
      .from(documentTopics)
      .innerJoin(knowledgeDocuments, eq(documentTopics.documentId, knowledgeDocuments.id))
      .where(eq(documentTopics.topicId, parseInt(id)));
    
    const children = await db.select()
      .from(complianceTopics)
      .where(eq(complianceTopics.parentId, parseInt(id)));
    
    res.json({
      ...topic[0],
      documents,
      children,
    });
  } catch (error) {
    console.error("Error fetching topic:", error);
    res.status(500).json({ error: "Failed to fetch topic" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, parentId, isActive } = req.body;
    
    const [updated] = await db.update(complianceTopics)
      .set({
        name,
        code,
        description,
        parentId,
        isActive,
      })
      .where(eq(complianceTopics.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Topic not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating topic:", error);
    res.status(500).json({ error: "Failed to update topic" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.delete(complianceTopics).where(eq(complianceTopics.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting topic:", error);
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

router.post("/seed", async (req: Request, res: Response) => {
  try {
    const defaultTopics = [
      { name: "Annual Fire Safety Statement", code: "AFSS", description: "Requirements for AFSS compliance and submission" },
      { name: "National Construction Code", code: "NCC", description: "NCC/BCA fire safety provisions" },
      { name: "Fire Doors", code: "FIRE_DOORS", description: "Fire door installation, maintenance, and compliance" },
      { name: "Sprinkler Systems", code: "AS2118", description: "Automatic fire sprinkler systems per AS 2118" },
      { name: "Fire Detection", code: "AS1670", description: "Fire detection and alarm systems per AS 1670" },
      { name: "Emergency Lighting", code: "AS2293", description: "Emergency escape lighting per AS 2293" },
      { name: "Egress Requirements", code: "EGRESS", description: "Means of egress and exit requirements" },
      { name: "Fire Hydrants", code: "AS2419", description: "Fire hydrant installations per AS 2419" },
      { name: "Portable Extinguishers", code: "AS2444", description: "Portable fire extinguishers per AS 2444" },
      { name: "Smoke Control", code: "SMOKE", description: "Smoke hazard management systems" },
    ];
    
    const existing = await db.select().from(complianceTopics);
    if (existing.length > 0) {
      return res.json({ message: "Topics already seeded", count: existing.length });
    }
    
    const inserted = await db.insert(complianceTopics).values(defaultTopics).returning();
    
    res.json({ message: "Default topics created", count: inserted.length, topics: inserted });
  } catch (error) {
    console.error("Error seeding topics:", error);
    res.status(500).json({ error: "Failed to seed topics" });
  }
});

export default router;
