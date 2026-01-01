import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  knowledgeDocuments, 
  documentChunks,
  auditResults,
  auditEvents,
  responseFeedback,
  systemMetrics,
  users,
  conversations,
  messages,
  ingestionJobs
} from "@shared/schema";
import { eq, desc, sql, gte, count } from "drizzle-orm";

const router = Router();

router.get("/overview", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [docStats] = await db.select({
      total: count(),
      ready: sql<number>`sum(case when ${knowledgeDocuments.status} = 'ready' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${knowledgeDocuments.status} = 'pending' then 1 else 0 end)`,
      processing: sql<number>`sum(case when ${knowledgeDocuments.status} = 'processing' then 1 else 0 end)`,
      error: sql<number>`sum(case when ${knowledgeDocuments.status} = 'error' then 1 else 0 end)`,
    }).from(knowledgeDocuments);
    
    const [chunkStats] = await db.select({
      total: count(),
    }).from(documentChunks);
    
    const [userStats] = await db.select({
      total: count(),
    }).from(users);
    
    const [conversationStats] = await db.select({
      total: count(),
      last24h: sql<number>`sum(case when ${conversations.createdAt} >= ${last24Hours} then 1 else 0 end)`,
      last7d: sql<number>`sum(case when ${conversations.createdAt} >= ${last7Days} then 1 else 0 end)`,
    }).from(conversations);
    
    const [messageStats] = await db.select({
      total: count(),
      last24h: sql<number>`sum(case when ${messages.createdAt} >= ${last24Hours} then 1 else 0 end)`,
      last7d: sql<number>`sum(case when ${messages.createdAt} >= ${last7Days} then 1 else 0 end)`,
    }).from(messages);
    
    const [feedbackStats] = await db.select({
      total: count(),
      positive: sql<number>`sum(case when ${responseFeedback.rating} > 0 then 1 else 0 end)`,
      negative: sql<number>`sum(case when ${responseFeedback.rating} < 0 then 1 else 0 end)`,
      unprocessed: sql<number>`sum(case when ${responseFeedback.isProcessed} = false then 1 else 0 end)`,
    }).from(responseFeedback);
    
    const recentAudits = await db.select()
      .from(auditResults)
      .orderBy(desc(auditResults.createdAt))
      .limit(5);
    
    const auditSummary = {
      pass: recentAudits.filter(a => a.status === "pass").length,
      warning: recentAudits.filter(a => a.status === "warning").length,
      fail: recentAudits.filter(a => a.status === "fail").length,
      error: recentAudits.filter(a => a.status === "error").length,
    };
    
    const recentEvents = await db.select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt))
      .limit(10);
    
    res.json({
      documents: {
        total: docStats.total,
        ready: Number(docStats.ready) || 0,
        pending: Number(docStats.pending) || 0,
        processing: Number(docStats.processing) || 0,
        error: Number(docStats.error) || 0,
      },
      chunks: {
        total: chunkStats.total,
      },
      users: {
        total: userStats.total,
      },
      conversations: {
        total: conversationStats.total,
        last24h: Number(conversationStats.last24h) || 0,
        last7d: Number(conversationStats.last7d) || 0,
      },
      messages: {
        total: messageStats.total,
        last24h: Number(messageStats.last24h) || 0,
        last7d: Number(messageStats.last7d) || 0,
      },
      feedback: {
        total: feedbackStats.total,
        positive: Number(feedbackStats.positive) || 0,
        negative: Number(feedbackStats.negative) || 0,
        unprocessed: Number(feedbackStats.unprocessed) || 0,
        satisfactionRate: feedbackStats.total > 0 
          ? (Number(feedbackStats.positive) / (Number(feedbackStats.positive) + Number(feedbackStats.negative))) * 100
          : null,
      },
      audits: auditSummary,
      recentAudits,
      recentEvents,
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    res.status(500).json({ error: "Failed to fetch overview" });
  }
});

router.get("/documents", async (req: Request, res: Response) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;
    
    const documents = await db.select({
      id: knowledgeDocuments.id,
      title: knowledgeDocuments.title,
      description: knowledgeDocuments.description,
      category: knowledgeDocuments.category,
      sourceType: knowledgeDocuments.sourceType,
      status: knowledgeDocuments.status,
      version: knowledgeDocuments.version,
      isActive: knowledgeDocuments.isActive,
      createdAt: knowledgeDocuments.createdAt,
      updatedAt: knowledgeDocuments.updatedAt,
      chunkCount: sql<number>`(select count(*) from ${documentChunks} where ${documentChunks.documentId} = ${knowledgeDocuments.id})`,
    })
      .from(knowledgeDocuments)
      .where(status ? eq(knowledgeDocuments.status, status as string) : undefined)
      .orderBy(desc(knowledgeDocuments.updatedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    res.json(documents);
  } catch (error) {
    console.error("Error fetching admin documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;
    
    const jobs = await db.select({
      id: ingestionJobs.id,
      documentId: ingestionJobs.documentId,
      documentTitle: knowledgeDocuments.title,
      jobType: ingestionJobs.jobType,
      status: ingestionJobs.status,
      progress: ingestionJobs.progress,
      errorMessage: ingestionJobs.errorMessage,
      startedAt: ingestionJobs.startedAt,
      completedAt: ingestionJobs.completedAt,
      createdAt: ingestionJobs.createdAt,
    })
      .from(ingestionJobs)
      .leftJoin(knowledgeDocuments, eq(ingestionJobs.documentId, knowledgeDocuments.id))
      .where(status ? eq(ingestionJobs.status, status as string) : undefined)
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const { metricType, days = "7" } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    
    const metrics = await db.select()
      .from(systemMetrics)
      .where(metricType 
        ? eq(systemMetrics.metricType, metricType as string)
        : gte(systemMetrics.recordedAt, startDate)
      )
      .orderBy(desc(systemMetrics.recordedAt))
      .limit(1000);
    
    const grouped = metrics.reduce((acc, metric) => {
      const key = metric.metricType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);
    
    res.json({
      metrics: grouped,
      summary: Object.entries(grouped).map(([type, items]) => ({
        type,
        count: items.length,
        latest: items[0],
        average: items.reduce((sum, m) => sum + m.value, 0) / items.length,
      })),
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

router.post("/metrics", async (req: Request, res: Response) => {
  try {
    const { metricType, metricName, value, unit, dimensions } = req.body;
    
    if (!metricType || !metricName || value === undefined) {
      return res.status(400).json({ error: "metricType, metricName, and value are required" });
    }
    
    const [metric] = await db.insert(systemMetrics).values({
      metricType,
      metricName,
      value,
      unit: unit || null,
      dimensions: dimensions || null,
    }).returning();
    
    res.status(201).json(metric);
  } catch (error) {
    console.error("Error recording metric:", error);
    res.status(500).json({ error: "Failed to record metric" });
  }
});

router.get("/health", async (req: Request, res: Response) => {
  try {
    const checks: Record<string, { status: string; message?: string; latencyMs?: number }> = {};
    
    const dbStart = Date.now();
    try {
      await db.select({ count: sql<number>`1` }).from(users).limit(1);
      checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
    } catch (error) {
      checks.database = { 
        status: "unhealthy", 
        message: error instanceof Error ? error.message : "Unknown error",
        latencyMs: Date.now() - dbStart,
      };
    }
    
    const pendingJobs = await db.select({ count: count() })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.status, "pending"));
    
    const processingJobs = await db.select({ count: count() })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.status, "processing"));
    
    checks.ingestionQueue = {
      status: (pendingJobs[0].count || 0) < 100 ? "healthy" : "warning",
      message: `${pendingJobs[0].count} pending, ${processingJobs[0].count} processing`,
    };
    
    const overallStatus = Object.values(checks).every(c => c.status === "healthy") 
      ? "healthy" 
      : Object.values(checks).some(c => c.status === "unhealthy")
        ? "unhealthy"
        : "degraded";
    
    res.json({
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking health:", error);
    res.status(500).json({ 
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
