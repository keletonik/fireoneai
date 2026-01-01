import { db } from "../db";
import { auditEvents } from "@shared/schema";
import type { InsertAuditEvent } from "@shared/schema";

export async function logAuditEvent(event: InsertAuditEvent): Promise<void> {
  try {
    await db.insert(auditEvents).values(event);
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export type AuditEventType = 
  | "document_upload"
  | "document_update"
  | "document_delete"
  | "document_process"
  | "search_query"
  | "feedback_submit"
  | "user_login"
  | "user_logout"
  | "admin_action"
  | "system_error";

export async function logDocumentEvent(
  action: string,
  documentId: number,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: "document_upload",
    entityType: "document",
    entityId: String(documentId),
    userId: userId || null,
    action,
    details: details || null,
  });
}

export async function logSearchEvent(
  query: string,
  resultCount: number,
  userId?: string,
  latencyMs?: number
): Promise<void> {
  await logAuditEvent({
    eventType: "search_query",
    entityType: "search",
    entityId: null,
    userId: userId || null,
    action: "search",
    details: { query, resultCount, latencyMs },
  });
}

export async function logFeedbackEvent(
  messageId: number,
  rating: number,
  userId?: string,
  feedbackType?: string
): Promise<void> {
  await logAuditEvent({
    eventType: "feedback_submit",
    entityType: "message",
    entityId: String(messageId),
    userId: userId || null,
    action: "feedback",
    details: { rating, feedbackType },
  });
}
