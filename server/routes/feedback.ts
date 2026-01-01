import { Router, Request, Response } from "express";
import { db } from "../db";
import { responseFeedback, messages } from "@shared/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { logFeedbackEvent } from "../services/audit";

const router = Router();

router.post("/messages/:messageId", async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { rating, feedbackType, comment, correctedContent, userId } = req.body;
    
    const message = await db.select()
      .from(messages)
      .where(eq(messages.id, parseInt(messageId)))
      .limit(1);
    
    if (message.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    const existing = await db.select()
      .from(responseFeedback)
      .where(and(
        eq(responseFeedback.messageId, parseInt(messageId)),
        userId ? eq(responseFeedback.userId, userId) : sql`${responseFeedback.userId} IS NULL`
      ))
      .limit(1);
    
    let feedback;
    
    if (existing.length > 0) {
      [feedback] = await db.update(responseFeedback)
        .set({
          rating: rating !== undefined ? rating : existing[0].rating,
          feedbackType: feedbackType || existing[0].feedbackType,
          comment: comment !== undefined ? comment : existing[0].comment,
          correctedContent: correctedContent !== undefined ? correctedContent : existing[0].correctedContent,
          isProcessed: false,
        })
        .where(eq(responseFeedback.id, existing[0].id))
        .returning();
    } else {
      [feedback] = await db.insert(responseFeedback).values({
        messageId: parseInt(messageId),
        userId: userId || null,
        rating,
        feedbackType: feedbackType || "rating",
        comment: comment || null,
        correctedContent: correctedContent || null,
      }).returning();
    }
    
    await logFeedbackEvent(parseInt(messageId), rating, userId, feedbackType);
    
    res.json(feedback);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/messages/:messageId", async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    
    const feedback = await db.select()
      .from(responseFeedback)
      .where(eq(responseFeedback.messageId, parseInt(messageId)));
    
    const stats = {
      totalCount: feedback.length,
      averageRating: feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length 
        : null,
      positiveCount: feedback.filter(f => f.rating && f.rating > 0).length,
      negativeCount: feedback.filter(f => f.rating && f.rating < 0).length,
      correctionCount: feedback.filter(f => f.correctedContent).length,
    };
    
    res.json({ feedback, stats });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      feedbackType, 
      isProcessed, 
      limit = "50", 
      offset = "0" 
    } = req.query;
    
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(responseFeedback.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(responseFeedback.createdAt, new Date(endDate as string)));
    }
    if (feedbackType) {
      conditions.push(eq(responseFeedback.feedbackType, feedbackType as string));
    }
    if (isProcessed !== undefined) {
      conditions.push(eq(responseFeedback.isProcessed, isProcessed === "true"));
    }
    
    const feedback = await db.select({
      id: responseFeedback.id,
      messageId: responseFeedback.messageId,
      userId: responseFeedback.userId,
      rating: responseFeedback.rating,
      feedbackType: responseFeedback.feedbackType,
      comment: responseFeedback.comment,
      correctedContent: responseFeedback.correctedContent,
      isProcessed: responseFeedback.isProcessed,
      createdAt: responseFeedback.createdAt,
      messageContent: messages.content,
      messageRole: messages.role,
    })
      .from(responseFeedback)
      .innerJoin(messages, eq(responseFeedback.messageId, messages.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(responseFeedback.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(responseFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      feedback,
      total: total[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching all feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.put("/:id/process", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [updated] = await db.update(responseFeedback)
      .set({
        isProcessed: true,
        processedAt: new Date(),
      })
      .where(eq(responseFeedback.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Feedback not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error processing feedback:", error);
    res.status(500).json({ error: "Failed to process feedback" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    
    const allFeedback = await db.select()
      .from(responseFeedback)
      .where(gte(responseFeedback.createdAt, startDate));
    
    const stats = {
      totalFeedback: allFeedback.length,
      averageRating: allFeedback.length > 0
        ? allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / allFeedback.length
        : null,
      positiveCount: allFeedback.filter(f => f.rating && f.rating > 0).length,
      negativeCount: allFeedback.filter(f => f.rating && f.rating < 0).length,
      correctionCount: allFeedback.filter(f => f.correctedContent).length,
      unprocessedCount: allFeedback.filter(f => !f.isProcessed).length,
      byType: {
        rating: allFeedback.filter(f => f.feedbackType === "rating").length,
        correction: allFeedback.filter(f => f.feedbackType === "correction").length,
        report: allFeedback.filter(f => f.feedbackType === "report").length,
      },
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching feedback stats:", error);
    res.status(500).json({ error: "Failed to fetch feedback stats" });
  }
});

export default router;
