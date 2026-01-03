/**
 * FyreOne AI - Database Schema Additions
 * 
 * Add these to your existing Drizzle schema file.
 * Run `npx drizzle-kit generate` and `npx drizzle-kit migrate` after adding.
 */

import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// PROJECTS - Folders for organizing conversations
// ============================================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  icon: text('icon').default('folder'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  conversations: many(conversations),
  knowledge: many(projectKnowledge),
}));

// ============================================================================
// CONVERSATIONS - Updates to existing table
// ============================================================================

// If you have an existing conversations table, add these columns:
// ALTER TABLE conversations ADD COLUMN project_id UUID REFERENCES projects(id);
// ALTER TABLE conversations ADD COLUMN is_favorite BOOLEAN DEFAULT false;
// ALTER TABLE conversations ADD COLUMN title TEXT;

// Or if creating fresh:
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title'), // Auto-generated from first message
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  isFavorite: boolean('is_favorite').default(false),
  messages: jsonb('messages').$type<Message[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  snippets: many(snippets),
}));

// ============================================================================
// NOTEBOOKS - Collections of saved snippets
// ============================================================================

export const notebooks = pgTable('notebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  icon: text('icon').default('book'),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notebooksRelations = relations(notebooks, ({ many }) => ({
  snippets: many(snippets),
}));

// ============================================================================
// SNIPPETS - Saved response blocks from conversations
// ============================================================================

export const snippets = pgTable('snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  notebookId: uuid('notebook_id').references(() => notebooks.id, { onDelete: 'cascade' }).notNull(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  messageIndex: integer('message_index').notNull(),
  content: text('content').notNull(),
  title: text('title'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const snippetsRelations = relations(snippets, ({ one }) => ({
  notebook: one(notebooks, {
    fields: [snippets.notebookId],
    references: [notebooks.id],
  }),
  conversation: one(conversations, {
    fields: [snippets.conversationId],
    references: [conversations.id],
  }),
}));

// ============================================================================
// PROJECT KNOWLEDGE - RAG context for projects
// ============================================================================

export const projectKnowledge = pgTable('project_knowledge', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  contentType: text('content_type').default('text'), // 'text', 'markdown', 'snippet', 'file'
  sourceSnippetId: uuid('source_snippet_id').references(() => snippets.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  // For vector search (if using pgvector):
  // embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectKnowledgeRelations = relations(projectKnowledge, ({ one }) => ({
  project: one(projects, {
    fields: [projectKnowledge.projectId],
    references: [projects.id],
  }),
  sourceSnippet: one(snippets, {
    fields: [projectKnowledge.sourceSnippetId],
    references: [snippets.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Infer types from schema
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;

export type ProjectKnowledge = typeof projectKnowledge.$inferSelect;
export type NewProjectKnowledge = typeof projectKnowledge.$inferInsert;
