import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  auditPolicies, 
  auditResults, 
  auditEvents, 
  knowledgeDocuments,
  documentChunks,
  responseFeedback 
} from "@shared/schema";
import { eq, desc, and, sql, gte, lte, lt } from "drizzle-orm";

const router = Router();

router.get("/policies", async (req: Request, res: Response) => {
  try {
    const policies = await db.select()
      .from(auditPolicies)
      .orderBy(desc(auditPolicies.createdAt));
    
    res.json(policies);
  } catch (error) {
    console.error("Error fetching audit policies:", error);
    res.status(500).json({ error: "Failed to fetch audit policies" });
  }
});

router.post("/policies", async (req: Request, res: Response) => {
  try {
    const { name, description, policyType, schedule, config } = req.body;
    
    if (!name || !policyType) {
      return res.status(400).json({ error: "Name and policyType are required" });
    }
    
    const [policy] = await db.insert(auditPolicies).values({
      name,
      description: description || null,
      policyType,
      schedule: schedule || null,
      config: config || null,
      isActive: true,
    }).returning();
    
    res.status(201).json(policy);
  } catch (error) {
    console.error("Error creating audit policy:", error);
    res.status(500).json({ error: "Failed to create audit policy" });
  }
});

router.put("/policies/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, policyType, schedule, config, isActive } = req.body;
    
    const [updated] = await db.update(auditPolicies)
      .set({
        name,
        description,
        policyType,
        schedule,
        config,
        isActive,
      })
      .where(eq(auditPolicies.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Policy not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating audit policy:", error);
    res.status(500).json({ error: "Failed to update audit policy" });
  }
});

router.post("/policies/:id/run", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const policy = await db.select()
      .from(auditPolicies)
      .where(eq(auditPolicies.id, parseInt(id)))
      .limit(1);
    
    if (policy.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }
    
    const result = await runAuditPolicy(policy[0]);
    
    await db.update(auditPolicies)
      .set({ lastRunAt: new Date() })
      .where(eq(auditPolicies.id, parseInt(id)));
    
    res.json(result);
  } catch (error) {
    console.error("Error running audit policy:", error);
    res.status(500).json({ error: "Failed to run audit policy" });
  }
});

router.get("/results", async (req: Request, res: Response) => {
  try {
    const { policyId, status, startDate, endDate, limit = "50", offset = "0" } = req.query;
    
    const conditions = [];
    
    if (policyId) {
      conditions.push(eq(auditResults.policyId, parseInt(policyId as string)));
    }
    if (status) {
      conditions.push(eq(auditResults.status, status as string));
    }
    if (startDate) {
      conditions.push(gte(auditResults.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(auditResults.createdAt, new Date(endDate as string)));
    }
    
    const results = await db.select({
      id: auditResults.id,
      policyId: auditResults.policyId,
      policyName: auditPolicies.name,
      status: auditResults.status,
      summary: auditResults.summary,
      details: auditResults.details,
      affectedDocuments: auditResults.affectedDocuments,
      recommendations: auditResults.recommendations,
      resolvedAt: auditResults.resolvedAt,
      createdAt: auditResults.createdAt,
    })
      .from(auditResults)
      .leftJoin(auditPolicies, eq(auditResults.policyId, auditPolicies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditResults.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(auditResults)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      results,
      total: total[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching audit results:", error);
    res.status(500).json({ error: "Failed to fetch audit results" });
  }
});

router.put("/results/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const [updated] = await db.update(auditResults)
      .set({
        resolvedAt: new Date(),
        resolvedBy: userId || null,
      })
      .where(eq(auditResults.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Audit result not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error resolving audit result:", error);
    res.status(500).json({ error: "Failed to resolve audit result" });
  }
});

router.get("/events", async (req: Request, res: Response) => {
  try {
    const { eventType, entityType, startDate, endDate, limit = "100", offset = "0" } = req.query;
    
    const conditions = [];
    
    if (eventType) {
      conditions.push(eq(auditEvents.eventType, eventType as string));
    }
    if (entityType) {
      conditions.push(eq(auditEvents.entityType, entityType as string));
    }
    if (startDate) {
      conditions.push(gte(auditEvents.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(auditEvents.createdAt, new Date(endDate as string)));
    }
    
    const events = await db.select()
      .from(auditEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditEvents.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(auditEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      events,
      total: total[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching audit events:", error);
    res.status(500).json({ error: "Failed to fetch audit events" });
  }
});

router.post("/run-all", async (req: Request, res: Response) => {
  try {
    const activePolicies = await db.select()
      .from(auditPolicies)
      .where(eq(auditPolicies.isActive, true));
    
    const results = [];
    
    for (const policy of activePolicies) {
      try {
        const result = await runAuditPolicy(policy);
        results.push({ policyId: policy.id, policyName: policy.name, result });
        
        await db.update(auditPolicies)
          .set({ lastRunAt: new Date() })
          .where(eq(auditPolicies.id, policy.id));
      } catch (error) {
        results.push({ 
          policyId: policy.id, 
          policyName: policy.name, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
    
    res.json({ message: "Audit run completed", results });
  } catch (error) {
    console.error("Error running all audits:", error);
    res.status(500).json({ error: "Failed to run audits" });
  }
});

router.post("/seed-policies", async (req: Request, res: Response) => {
  try {
    const defaultPolicies = [
      {
        name: "Document Freshness Check",
        description: "Checks if documents have been updated within the specified time period",
        policyType: "document_freshness",
        config: { maxAgeDays: 365 },
      },
      {
        name: "Embedding Coverage Check",
        description: "Ensures all active documents have embeddings generated",
        policyType: "embedding_coverage",
        config: {},
      },
      {
        name: "Negative Feedback Alert",
        description: "Flags messages with significant negative feedback",
        policyType: "feedback_quality",
        config: { threshold: -0.5 },
      },
    ];
    
    const existing = await db.select().from(auditPolicies);
    if (existing.length > 0) {
      return res.json({ message: "Policies already seeded", count: existing.length });
    }
    
    const inserted = await db.insert(auditPolicies).values(defaultPolicies).returning();
    
    res.json({ message: "Default policies created", count: inserted.length, policies: inserted });
  } catch (error) {
    console.error("Error seeding policies:", error);
    res.status(500).json({ error: "Failed to seed policies" });
  }
});

async function runAuditPolicy(policy: typeof auditPolicies.$inferSelect): Promise<typeof auditResults.$inferSelect> {
  let status: "pass" | "fail" | "warning" | "error" = "pass";
  let summary = "";
  let details: Record<string, unknown> = {};
  let affectedDocuments: number[] = [];
  let recommendations: string[] = [];
  
  try {
    switch (policy.policyType) {
      case "document_freshness": {
        const config = policy.config as { maxAgeDays?: number } || {};
        const maxAgeDays = config.maxAgeDays || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
        
        const staleDocuments = await db.select()
          .from(knowledgeDocuments)
          .where(and(
            eq(knowledgeDocuments.isActive, true),
            lt(knowledgeDocuments.updatedAt, cutoffDate)
          ));
        
        if (staleDocuments.length > 0) {
          status = "warning";
          summary = `Found ${staleDocuments.length} documents not updated in ${maxAgeDays} days`;
          affectedDocuments = staleDocuments.map(d => d.id);
          recommendations = ["Review and update stale documents", "Consider archiving outdated content"];
        } else {
          summary = "All documents are up to date";
        }
        details = { staleCount: staleDocuments.length, maxAgeDays };
        break;
      }
      
      case "embedding_coverage": {
        const allDocs = await db.select()
          .from(knowledgeDocuments)
          .where(and(
            eq(knowledgeDocuments.isActive, true),
            eq(knowledgeDocuments.status, "ready")
          ));
        
        const docsWithChunks = await db.select({
          documentId: documentChunks.documentId,
        })
          .from(documentChunks)
          .groupBy(documentChunks.documentId);
        
        const docsWithChunksSet = new Set(docsWithChunks.map(d => d.documentId));
        const missingEmbeddings = allDocs.filter(d => !docsWithChunksSet.has(d.id));
        
        if (missingEmbeddings.length > 0) {
          status = "fail";
          summary = `Found ${missingEmbeddings.length} documents without embeddings`;
          affectedDocuments = missingEmbeddings.map(d => d.id);
          recommendations = ["Reprocess documents to generate embeddings"];
        } else {
          summary = "All documents have embeddings";
        }
        details = { totalDocs: allDocs.length, missingCount: missingEmbeddings.length };
        break;
      }
      
      case "feedback_quality": {
        const config = policy.config as { threshold?: number } || {};
        const threshold = config.threshold || -0.5;
        
        const recentFeedback = await db.select()
          .from(responseFeedback)
          .where(gte(responseFeedback.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
        
        const negativeFeedback = recentFeedback.filter(f => f.rating && f.rating < threshold);
        
        if (negativeFeedback.length > 5) {
          status = "warning";
          summary = `High negative feedback: ${negativeFeedback.length} negative ratings in the last 7 days`;
          recommendations = ["Review negative feedback", "Improve response quality"];
        } else {
          summary = `Feedback quality is acceptable: ${negativeFeedback.length} negative ratings`;
        }
        details = { 
          totalFeedback: recentFeedback.length, 
          negativeCount: negativeFeedback.length,
          threshold,
        };
        break;
      }
      
      default:
        status = "error";
        summary = `Unknown policy type: ${policy.policyType}`;
    }
  } catch (error) {
    status = "error";
    summary = `Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
  
  const [result] = await db.insert(auditResults).values({
    policyId: policy.id,
    status,
    summary,
    details,
    affectedDocuments,
    recommendations,
  }).returning();
  
  return result;
}

export default router;
