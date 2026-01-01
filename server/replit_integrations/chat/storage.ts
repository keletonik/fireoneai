import { db } from "../../db";
import { conversations, messages, quickTemplates } from "@shared/schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  searchConversations(query: string): Promise<any[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
  toggleMessageFavorite(messageId: number): Promise<typeof messages.$inferSelect | undefined>;
  getFavoriteMessages(): Promise<(typeof messages.$inferSelect)[]>;
  getQuickTemplates(): Promise<(typeof quickTemplates.$inferSelect)[]>;
  createQuickTemplate(title: string, content: string, category?: string): Promise<typeof quickTemplates.$inferSelect>;
  deleteQuickTemplate(id: number): Promise<void>;
  incrementTemplateUsage(id: number): Promise<void>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    const result = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
    return result.map(m => ({
      ...m,
      role: m.role as "user" | "assistant",
    }));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  },

  async searchConversations(query: string) {
    const searchTerm = `%${query}%`;
    const results = await db
      .select({
        conversationId: conversations.id,
        conversationTitle: conversations.title,
        messageId: messages.id,
        messageContent: messages.content,
        messageRole: messages.role,
        messageCreatedAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(or(
        ilike(messages.content, searchTerm),
        ilike(conversations.title, searchTerm)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    return results;
  },

  async toggleMessageFavorite(messageId: number) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!msg) return undefined;
    
    const [updated] = await db
      .update(messages)
      .set({ isFavorite: !msg.isFavorite })
      .where(eq(messages.id, messageId))
      .returning();
    return updated;
  },

  async getFavoriteMessages() {
    return db
      .select()
      .from(messages)
      .where(eq(messages.isFavorite, true))
      .orderBy(desc(messages.createdAt));
  },

  async getQuickTemplates() {
    return db.select().from(quickTemplates).orderBy(desc(quickTemplates.usageCount));
  },

  async createQuickTemplate(title: string, content: string, category = "general") {
    const [template] = await db.insert(quickTemplates).values({ title, content, category }).returning();
    return template;
  },

  async deleteQuickTemplate(id: number) {
    await db.delete(quickTemplates).where(eq(quickTemplates.id, id));
  },

  async incrementTemplateUsage(id: number) {
    await db
      .update(quickTemplates)
      .set({ usageCount: sql`${quickTemplates.usageCount} + 1` })
      .where(eq(quickTemplates.id, id));
  },
};

