import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerChatRoutes } from "./replit_integrations/chat";
import authRouter from "./auth";
import documentsRouter from "./routes/documents";
import feedbackRouter from "./routes/feedback";
import topicsRouter from "./routes/topics";
import auditsRouter from "./routes/audits";
import adminRouter from "./routes/admin";
import accountRouter from "./routes/account";
import projectsRouter from "./routes/projects";
import notebooksRouter from "./routes/notebooks";
import conversationsRouter from "./routes/conversations";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);
  registerChatRoutes(app);
  
  app.use("/api/documents", documentsRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/topics", topicsRouter);
  app.use("/api/audits", auditsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/notebooks", notebooksRouter);
  app.use("/api/conversations", conversationsRouter);

  const httpServer = createServer(app);

  return httpServer;
}
