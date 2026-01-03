import { sql } from "drizzle-orm";
import { pgTable, serial, integer, text, timestamp, boolean, varchar, jsonb, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"),
  email: text("email"),
  password: text("password").notNull(),
  name: text("name"),
  company: text("company"),
  phone: text("phone"),
  isPro: boolean("is_pro").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isStarred: boolean("is_starred").default(false),
  lastMessageAt: timestamp("last_message_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const quickTemplates = pgTable("quick_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 1: Knowledge Documents - stores metadata about uploaded documents
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  sourceType: text("source_type").notNull(), // 'pdf', 'txt', 'md', 'url', 'manual'
  sourceUrl: text("source_url"),
  status: text("status").default("pending"), // 'pending', 'processing', 'ready', 'error'
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 1: Document Revisions - version history for documents
export const documentRevisions = pgTable("document_revisions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash"),
  changeReason: text("change_reason"),
  changedBy: varchar("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 1: Document Chunks - chunked content for embedding
export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  revisionId: integer("revision_id").references(() => documentRevisions.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  embedding: jsonb("embedding"), // Store embedding as JSON array (can migrate to pgvector later)
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  documentIdx: index("chunks_document_idx").on(table.documentId),
}));

// Phase 1: Compliance Topics - categorize knowledge by fire safety topics
export const complianceTopics = pgTable("compliance_topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(), // e.g., 'AFSS', 'NCC', 'AS2118'
  description: text("description"),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 1: Document-Topic mapping
export const documentTopics = pgTable("document_topics", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => complianceTopics.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").default(1.0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 1: Audit Events - track all system activities
export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'document_upload', 'document_update', 'search', 'feedback', etc.
  entityType: text("entity_type"), // 'document', 'message', 'user', etc.
  entityId: text("entity_id"),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  eventTypeIdx: index("audit_event_type_idx").on(table.eventType),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

// Phase 3: Response Feedback - user feedback on AI responses
export const responseFeedback = pgTable("response_feedback", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  rating: integer("rating"), // 1-5 stars or -1/1 for thumbs
  feedbackType: text("feedback_type").default("rating"), // 'rating', 'correction', 'report'
  comment: text("comment"),
  correctedContent: text("corrected_content"),
  isProcessed: boolean("is_processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 4: Audit Policies - rules for automated auditing
export const auditPolicies = pgTable("audit_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  policyType: text("policy_type").notNull(), // 'document_freshness', 'compliance_check', 'quality_score'
  schedule: text("schedule"), // cron expression
  config: jsonb("config"), // policy-specific configuration
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 4: Audit Results - results from automated audits
export const auditResults = pgTable("audit_results", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").references(() => auditPolicies.id, { onDelete: "set null" }),
  status: text("status").notNull(), // 'pass', 'fail', 'warning', 'error'
  summary: text("summary"),
  details: jsonb("details"),
  affectedDocuments: jsonb("affected_documents"), // array of document IDs
  recommendations: jsonb("recommendations"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  policyIdx: index("audit_results_policy_idx").on(table.policyId),
  statusIdx: index("audit_results_status_idx").on(table.status),
}));

// Phase 4: Ingestion Jobs - track document processing jobs
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(), // 'upload', 'embed', 'reprocess'
  status: text("status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 5: System Metrics - track system health and usage
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(), // 'api_calls', 'embedding_usage', 'search_latency', etc.
  metricName: text("metric_name").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  dimensions: jsonb("dimensions"), // additional context
  recordedAt: timestamp("recorded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  typeIdx: index("metrics_type_idx").on(table.metricType),
  recordedAtIdx: index("metrics_recorded_at_idx").on(table.recordedAt),
}));

// Projects - folders for organizing conversations
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#f97316"), // Default orange
  icon: text("icon").default("folder"),
  isExpanded: boolean("is_expanded").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Notebooks - collections of saved snippets
export const notebooks = pgTable("notebooks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#f97316"),
  icon: text("icon").default("book"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Snippets - saved response blocks from conversations
export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  notebookId: integer("notebook_id").references(() => notebooks.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  messageId: integer("message_id").references(() => messages.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  title: text("title"),
  notes: text("notes"),
  tags: jsonb("tags"), // Array of tag strings
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  notebookIdx: index("snippets_notebook_idx").on(table.notebookId),
}));

// Conversation-Project mapping
export const conversationProjects = pgTable("conversation_projects", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertQuickTemplateSchema = createInsertSchema(quickTemplates).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentRevisionSchema = createInsertSchema(documentRevisions).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  createdAt: true,
});

export const insertComplianceTopicSchema = createInsertSchema(complianceTopics).omit({
  id: true,
  createdAt: true,
});

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({
  id: true,
  createdAt: true,
});

export const insertResponseFeedbackSchema = createInsertSchema(responseFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertAuditPolicySchema = createInsertSchema(auditPolicies).omit({
  id: true,
  createdAt: true,
});

export const insertAuditResultSchema = createInsertSchema(auditResults).omit({
  id: true,
  createdAt: true,
});

export const insertIngestionJobSchema = createInsertSchema(ingestionJobs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemMetricSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  recordedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotebookSchema = createInsertSchema(notebooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSnippetSchema = createInsertSchema(snippets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationProjectSchema = createInsertSchema(conversationProjects).omit({
  id: true,
  createdAt: true,
});

// Core types
export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type QuickTemplate = typeof quickTemplates.$inferSelect;
export type InsertQuickTemplate = z.infer<typeof insertQuickTemplateSchema>;

// Knowledge base types
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;
export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type InsertDocumentRevision = z.infer<typeof insertDocumentRevisionSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type ComplianceTopic = typeof complianceTopics.$inferSelect;
export type InsertComplianceTopic = z.infer<typeof insertComplianceTopicSchema>;

// Audit and feedback types
export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type ResponseFeedback = typeof responseFeedback.$inferSelect;
export type InsertResponseFeedback = z.infer<typeof insertResponseFeedbackSchema>;
export type AuditPolicy = typeof auditPolicies.$inferSelect;
export type InsertAuditPolicy = z.infer<typeof insertAuditPolicySchema>;
export type AuditResult = typeof auditResults.$inferSelect;
export type InsertAuditResult = z.infer<typeof insertAuditResultSchema>;
export type IngestionJob = typeof ingestionJobs.$inferSelect;
export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

// Project and notebook types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Notebook = typeof notebooks.$inferSelect;
export type InsertNotebook = z.infer<typeof insertNotebookSchema>;
export type Snippet = typeof snippets.$inferSelect;
export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type ConversationProject = typeof conversationProjects.$inferSelect;
export type InsertConversationProject = z.infer<typeof insertConversationProjectSchema>;
