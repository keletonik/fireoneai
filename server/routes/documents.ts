import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  knowledgeDocuments, 
  documentRevisions, 
  documentChunks, 
  ingestionJobs,
  documentTopics,
  complianceTopics
} from "@shared/schema";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";
import { generateEmbedding, generateEmbeddings, chunkText, estimateTokenCount, cosineSimilarity } from "../services/embedding";
import { logDocumentEvent, logSearchEvent } from "../services/audit";
import crypto from "crypto";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, category, search, limit = "50", offset = "0" } = req.query;
    
    let query = db.select().from(knowledgeDocuments);
    const conditions = [];
    
    if (status && status !== "all") {
      conditions.push(eq(knowledgeDocuments.status, status as string));
    }
    if (category && category !== "all") {
      conditions.push(eq(knowledgeDocuments.category, category as string));
    }
    if (search) {
      conditions.push(
        or(
          ilike(knowledgeDocuments.title, `%${search}%`),
          ilike(knowledgeDocuments.description, `%${search}%`)
        )
      );
    }
    
    const documents = await db.select()
      .from(knowledgeDocuments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeDocuments.updatedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(knowledgeDocuments)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      documents,
      total: total[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, category, sourceType, content, sourceUrl, topicIds } = req.body;
    
    if (!title || !sourceType || !content) {
      return res.status(400).json({ error: "Title, sourceType, and content are required" });
    }
    
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");
    
    const [document] = await db.insert(knowledgeDocuments).values({
      title,
      description: description || null,
      category: category || "general",
      sourceType,
      sourceUrl: sourceUrl || null,
      status: "pending",
      version: 1,
      isActive: true,
      metadata: { contentLength: content.length },
    }).returning();
    
    const [revision] = await db.insert(documentRevisions).values({
      documentId: document.id,
      version: 1,
      content,
      contentHash,
      changeReason: "Initial upload",
    }).returning();
    
    const [job] = await db.insert(ingestionJobs).values({
      documentId: document.id,
      jobType: "upload",
      status: "pending",
      metadata: { revisionId: revision.id },
    }).returning();
    
    if (topicIds && Array.isArray(topicIds) && topicIds.length > 0) {
      await db.insert(documentTopics).values(
        topicIds.map((topicId: number) => ({
          documentId: document.id,
          topicId,
        }))
      );
    }
    
    await logDocumentEvent("upload", document.id, undefined, { title, sourceType });
    
    processDocument(document.id, revision.id, job.id, content).catch(console.error);
    
    res.status(201).json({ document, job });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = await db.select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, parseInt(id)))
      .limit(1);
    
    if (document.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const revisions = await db.select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, parseInt(id)))
      .orderBy(desc(documentRevisions.version));
    
    const chunks = await db.select({
      id: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      content: documentChunks.content,
      tokenCount: documentChunks.tokenCount,
    })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, parseInt(id)))
      .orderBy(documentChunks.chunkIndex);
    
    const topics = await db.select({
      id: complianceTopics.id,
      name: complianceTopics.name,
      code: complianceTopics.code,
    })
      .from(documentTopics)
      .innerJoin(complianceTopics, eq(documentTopics.topicId, complianceTopics.id))
      .where(eq(documentTopics.documentId, parseInt(id)));
    
    res.json({
      ...document[0],
      revisions,
      chunks,
      topics,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, content, changeReason, isActive, topicIds } = req.body;
    
    const existing = await db.select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, parseInt(id)))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const newVersion = (existing[0].version || 1) + 1;
    
    const [updated] = await db.update(knowledgeDocuments)
      .set({
        title: title || existing[0].title,
        description: description !== undefined ? description : existing[0].description,
        category: category || existing[0].category,
        version: content ? newVersion : existing[0].version,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
        status: content ? "pending" : existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocuments.id, parseInt(id)))
      .returning();
    
    if (content) {
      const contentHash = crypto.createHash("sha256").update(content).digest("hex");
      
      const [revision] = await db.insert(documentRevisions).values({
        documentId: parseInt(id),
        version: newVersion,
        content,
        contentHash,
        changeReason: changeReason || "Content update",
      }).returning();
      
      const [job] = await db.insert(ingestionJobs).values({
        documentId: parseInt(id),
        jobType: "reprocess",
        status: "pending",
        metadata: { revisionId: revision.id },
      }).returning();
      
      processDocument(parseInt(id), revision.id, job.id, content).catch(console.error);
    }
    
    if (topicIds && Array.isArray(topicIds)) {
      await db.delete(documentTopics).where(eq(documentTopics.documentId, parseInt(id)));
      if (topicIds.length > 0) {
        await db.insert(documentTopics).values(
          topicIds.map((topicId: number) => ({
            documentId: parseInt(id),
            topicId,
          }))
        );
      }
    }
    
    await logDocumentEvent("update", parseInt(id), undefined, { changeReason });
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, parseInt(id)));
    
    await logDocumentEvent("delete", parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, limit = 5, threshold = 0.7 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const startTime = Date.now();
    
    const queryEmbedding = await generateEmbedding(query);
    
    const allChunks = await db.select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      embedding: documentChunks.embedding,
      chunkIndex: documentChunks.chunkIndex,
      documentTitle: knowledgeDocuments.title,
      documentCategory: knowledgeDocuments.category,
    })
      .from(documentChunks)
      .innerJoin(knowledgeDocuments, eq(documentChunks.documentId, knowledgeDocuments.id))
      .where(and(
        eq(knowledgeDocuments.isActive, true),
        eq(knowledgeDocuments.status, "ready")
      ));
    
    const scoredChunks = allChunks
      .filter(chunk => chunk.embedding)
      .map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
      }))
      .filter(chunk => chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    const latencyMs = Date.now() - startTime;
    
    await logSearchEvent(query, scoredChunks.length, undefined, latencyMs);
    
    res.json({
      results: scoredChunks.map(chunk => ({
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentCategory: chunk.documentCategory,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        similarity: chunk.similarity,
      })),
      query,
      latencyMs,
    });
  } catch (error) {
    console.error("Error searching documents:", error);
    res.status(500).json({ error: "Failed to search documents" });
  }
});

router.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await db.select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, parseInt(id)))
      .limit(1);
    
    if (job.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    res.json(job[0]);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

async function processDocument(
  documentId: number,
  revisionId: number,
  jobId: number,
  content: string
): Promise<void> {
  try {
    await db.update(ingestionJobs)
      .set({ status: "processing", startedAt: new Date(), progress: 10 })
      .where(eq(ingestionJobs.id, jobId));
    
    await db.update(knowledgeDocuments)
      .set({ status: "processing" })
      .where(eq(knowledgeDocuments.id, documentId));
    
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    
    await db.update(ingestionJobs)
      .set({ progress: 30 })
      .where(eq(ingestionJobs.id, jobId));
    
    const chunks = chunkText(content, 1000, 100);
    
    await db.update(ingestionJobs)
      .set({ progress: 50 })
      .where(eq(ingestionJobs.id, jobId));
    
    const embeddings = await generateEmbeddings(chunks);
    
    await db.update(ingestionJobs)
      .set({ progress: 80 })
      .where(eq(ingestionJobs.id, jobId));
    
    const chunkRecords = chunks.map((chunk, index) => ({
      documentId,
      revisionId,
      chunkIndex: index,
      content: chunk,
      tokenCount: estimateTokenCount(chunk),
      embedding: embeddings[index],
      metadata: { charCount: chunk.length },
    }));
    
    await db.insert(documentChunks).values(chunkRecords);
    
    await db.update(knowledgeDocuments)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, documentId));
    
    await db.update(ingestionJobs)
      .set({ status: "completed", progress: 100, completedAt: new Date() })
      .where(eq(ingestionJobs.id, jobId));
    
    await logDocumentEvent("process", documentId, undefined, { 
      chunkCount: chunks.length,
      status: "completed",
    });
    
  } catch (error) {
    console.error("Error processing document:", error);
    
    await db.update(knowledgeDocuments)
      .set({ status: "error" })
      .where(eq(knowledgeDocuments.id, documentId));
    
    await db.update(ingestionJobs)
      .set({ 
        status: "failed", 
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, jobId));
    
    await logDocumentEvent("process", documentId, undefined, { 
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default router;
