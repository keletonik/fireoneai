import type { Express, Request, Response } from "express";
import OpenAI, { toFile } from "openai";
import { chatStorage } from "./storage";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("sk-your")) {
      throw new Error("OpenAI API key not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY in .env");
    }
    openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openai;
}

const FIREONE_SYSTEM_PROMPT = `You are FireOne AI, an expert NSW fire safety compliance assistant designed for auditors and fire safety professionals.

Your role is to provide accurate, actionable guidance on:
- AFSS (Annual Fire Safety Statement) requirements and workflows
- NCC (National Construction Code) compliance questions (BCA legacy references acceptable)
- Australian Standards references where applicable
- Essential Fire Safety Measures (EFSM) and inspection/maintenance requirements
- Practical auditor use-cases: FRLs, egress, stair pressurisation, detection, EWIS, hydrants/hose reels, smoke control

RESPONSE FORMAT - Structure responses with these sections:

**What this means**
Provide a clear, plain-English summary of the answer.

**Relevant references** 
- List applicable NCC clauses (e.g., NCC Clause C2D8(b)(i)) and Australian Standards (e.g., AS1530 Part 4)
- For compliance/technical questions: ALWAYS include specific references
- For general greetings or non-technical questions: Write "No specific code references apply to this question"

**Assumptions**
- List assumptions about the building, context, or conditions that significantly affect the answer
- If no meaningful assumptions were made: Write "No significant assumptions - question was clear and specific"
- NEVER write filler like "assuming you want accurate information" or "assuming standard conditions"

**Next steps**
- Provide actionable steps the auditor can take
- For factual/definition questions: Write "No action required - this was an informational query"
- NEVER write generic filler like "consult relevant standards" without specifics

CONTENT QUALITY RULES:
- Every section must contain SUBSTANTIVE content or an explicit "not applicable" statement
- Never pad sections with obvious, generic, or redundant information
- If a section would only contain filler, use a clear "not applicable" statement instead
- Quality and specificity matter more than length

CRITICAL GUIDELINES:
1. NEVER hallucinate or invent NCC clauses, Australian Standards, or regulatory requirements
2. If you're uncertain about a specific reference, clearly state: "I'm not confident enough to cite this specific clause - please verify against the current NCC or relevant standard"
3. When confidence is low, request additional context from the user
4. DO NOT include any disclaimer in your responses - the app automatically adds one
5. Use proper fire safety terminology consistently
6. Be precise with FRL (Fire Resistance Level) specifications in format: XXX/XXX/XXX (Structural Adequacy/Integrity/Insulation in minutes)

UPLOADED DOCUMENTS:
- Users may upload reference documents (PDFs, text files, images) that you can access
- When documents are provided in the context, you CAN and SHOULD reference their content
- Quote or summarize relevant sections from uploaded documents when answering questions
- If asked about uploaded documents, describe what you can see and provide relevant insights

Remember: Your answers may be used in formal compliance documentation. Accuracy and proper citations are paramount.`;

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const starred = req.query.starred === "true";

      const conversations = await chatStorage.getAllConversations(userId, limit, starred);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/recent", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const conversations = await chatStorage.getAllConversations(userId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching recent conversations:", error);
      res.status(500).json({ error: "Failed to fetch recent conversations" });
    }
  });

  app.get("/api/conversations/starred", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const conversations = await chatStorage.getAllConversations(userId, 100, true);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching starred conversations:", error);
      res.status(500).json({ error: "Failed to fetch starred conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title, userId } = req.body;
      const sanitizedTitle = (title || "").trim() || "New Chat";
      if (sanitizedTitle.length > 200) {
        return res.status(400).json({ error: "Title too long" });
      }
      const conversation = await chatStorage.createConversation(sanitizedTitle, userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.put("/api/conversations/:id/star", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const { isStarred } = req.body;
      const updated = await chatStorage.updateConversation(id, { isStarred: isStarred ?? true });
      if (!updated) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating star status:", error);
      res.status(500).json({ error: "Failed to update star status" });
    }
  });

  app.put("/api/conversations/:id/rename", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "title required" });
      }
      const updated = await chatStorage.updateConversation(id, { title });
      if (!updated) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error renaming conversation:", error);
      res.status(500).json({ error: "Failed to rename conversation" });
    }
  });

  app.get("/api/conversations/:id/export", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const msgs = await chatStorage.getMessagesByConversation(id);

      const dateStr = new Date().toISOString().split("T")[0];
      const safeTitle = conversation.title.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
      const filename = `fyreone-${safeTitle}-${dateStr}.md`;

      let markdown = `# ${conversation.title}\n\n`;
      markdown += `*Exported from FyreOne AI on ${new Date().toLocaleDateString("en-AU")}*\n\n`;
      markdown += `---\n\n`;

      for (const msg of msgs) {
        const role = msg.role === "user" ? "**User:**" : "**Assistant:**";
        markdown += `${role}\n\n${msg.content}\n\n---\n\n`;
      }

      res.json({ markdown, filename, conversation, messages: msgs });
    } catch (error) {
      console.error("Error exporting conversation:", error);
      res.status(500).json({ error: "Failed to export conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    const conversationId = parseInt(req.params.id);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const { content, customInstructions, tone, systemContext, noStream, attachments } = req.body;
    
    interface AttachmentData {
      id: string;
      name: string;
      type: "image" | "document";
      mimeType?: string;
      base64?: string;
      textContent?: string;
    }
    
    const buildMessageContent = (textContent: string, attachmentList?: AttachmentData[]): OpenAI.Chat.ChatCompletionContentPart[] => {
      const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
      
      if (attachmentList && attachmentList.length > 0) {
        for (const attachment of attachmentList) {
          if (attachment.type === "image" && attachment.base64) {
            const mimeType = attachment.mimeType || "image/jpeg";
            parts.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${attachment.base64}`,
                detail: "high",
              },
            });
          } else if (attachment.type === "document" && attachment.textContent) {
            parts.push({
              type: "text",
              text: `\n\n=== Attached Document: ${attachment.name} ===\n${attachment.textContent}\n=== End of ${attachment.name} ===\n`,
            });
          }
        }
      }
      
      parts.push({ type: "text", text: textContent });
      
      return parts;
    };
    
    if (noStream) {
      try {
        if (!content || typeof content !== "string") {
          return res.status(400).json({ error: "Message content is required" });
        }

        const conversation = await chatStorage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        await chatStorage.createMessage(conversationId, "user", content);
        const messages = await chatStorage.getMessagesByConversation(conversationId);
        
        let fullSystemPrompt = FIREONE_SYSTEM_PROMPT;
        
        if (tone) {
          const toneInstructions: Record<string, string> = {
            professional: "\n\nTONE: Respond in a professional, formal manner appropriate for official documentation and compliance reports.",
            friendly: "\n\nTONE: Respond in a friendly, approachable manner while maintaining technical accuracy. Use conversational language.",
            concise: "\n\nTONE: Keep responses brief and to the point. Minimize explanations and focus on actionable information.",
            detailed: "\n\nTONE: Provide comprehensive, thorough responses with extensive detail and explanations.",
          };
          if (toneInstructions[tone]) {
            fullSystemPrompt += toneInstructions[tone];
          }
        }
        
        if (customInstructions && customInstructions.trim()) {
          fullSystemPrompt += `\n\n=== USER'S CUSTOM INSTRUCTIONS (MUST FOLLOW STRICTLY) ===\n${customInstructions.trim()}\n=== END OF CUSTOM INSTRUCTIONS ===`;
        }
        
        if (systemContext && systemContext.trim()) {
          fullSystemPrompt += `\n\n=== COMMAND CONTEXT ===\n${systemContext.trim()}`;
        }
        
        const hasImageAttachments = attachments?.some((a: AttachmentData) => a.type === "image" && a.base64);
        
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: fullSystemPrompt },
          ...messages.slice(0, -1).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          if (hasImageAttachments) {
            chatMessages.push({
              role: "user",
              content: buildMessageContent(lastMessage.content, attachments),
            });
          } else {
            let enhancedContent = lastMessage.content;
            const docAttachments = attachments?.filter((a: AttachmentData) => a.type === "document" && a.textContent);
            if (docAttachments && docAttachments.length > 0) {
              for (const doc of docAttachments) {
                enhancedContent = `=== Attached Document: ${doc.name} ===\n${doc.textContent}\n=== End of ${doc.name} ===\n\n` + enhancedContent;
              }
            }
            chatMessages.push({
              role: "user",
              content: enhancedContent,
            });
          }
        }

        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: chatMessages,
          stream: false,
          max_completion_tokens: 2048,
        });

        const responseContent = completion.choices[0]?.message?.content || "";
        
        if (responseContent) {
          await chatStorage.createMessage(conversationId, "assistant", responseContent);
        }

        return res.json({ content: responseContent, done: true });
      } catch (error) {
        console.error("Error sending message (non-streaming):", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to send message";
        return res.status(500).json({ error: errorMessage });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendError = (message: string) => {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    };

    try {
      if (!content || typeof content !== "string") {
        return sendError("Message content is required");
      }

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation) {
        return sendError("Conversation not found");
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(conversationId);
      
      // Build the system prompt with user's custom instructions
      let fullSystemPrompt = FIREONE_SYSTEM_PROMPT;
      
      // Add tone instructions
      if (tone) {
        const toneInstructions: Record<string, string> = {
          professional: "\n\nTONE: Respond in a professional, formal manner appropriate for official documentation and compliance reports.",
          friendly: "\n\nTONE: Respond in a friendly, approachable manner while maintaining technical accuracy. Use conversational language.",
          concise: "\n\nTONE: Keep responses brief and to the point. Minimize explanations and focus on actionable information.",
          detailed: "\n\nTONE: Provide comprehensive, thorough responses with extensive detail and explanations.",
        };
        if (toneInstructions[tone]) {
          fullSystemPrompt += toneInstructions[tone];
        }
      }
      
      // Add custom user instructions - CRITICAL: These must be strictly followed
      if (customInstructions && customInstructions.trim()) {
        fullSystemPrompt += `\n\n=== USER'S CUSTOM INSTRUCTIONS (MUST FOLLOW STRICTLY) ===
The following are personalized instructions from the user that you MUST follow in ALL responses. These instructions take priority and must be adhered to at all times:

${customInstructions.trim()}

=== END OF CUSTOM INSTRUCTIONS ===`;
      }
      
      // Add command-specific context if provided
      if (systemContext && systemContext.trim()) {
        fullSystemPrompt += `\n\n=== COMMAND CONTEXT ===\n${systemContext.trim()}`;
      }
      
      const hasImageAttachments = attachments?.some((a: AttachmentData) => a.type === "image" && a.base64);
      
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: fullSystemPrompt },
        ...messages.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        if (hasImageAttachments) {
          chatMessages.push({
            role: "user",
            content: buildMessageContent(lastMessage.content, attachments),
          });
        } else {
          let enhancedContent = lastMessage.content;
          const docAttachments = attachments?.filter((a: AttachmentData) => a.type === "document" && a.textContent);
          if (docAttachments && docAttachments.length > 0) {
            for (const doc of docAttachments) {
              enhancedContent = `=== Attached Document: ${doc.name} ===\n${doc.textContent}\n=== End of ${doc.name} ===\n\n` + enhancedContent;
            }
          }
          chatMessages.push({
            role: "user",
            content: enhancedContent,
          });
        }
      }

      const stream = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content || "";
        if (chunkContent) {
          fullResponse += chunkContent;
          res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
        }
      }

      if (fullResponse) {
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      sendError(errorMessage);
    }
  });

  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      const results = await chatStorage.searchConversations(query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/favorites", async (req: Request, res: Response) => {
    try {
      const favorites = await chatStorage.getFavoriteMessages();
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/messages/:id/favorite", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid message ID" });
      }
      const message = await chatStorage.toggleMessageFavorite(id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const templates = await chatStorage.getQuickTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req: Request, res: Response) => {
    try {
      const { title, content, category } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content required" });
      }
      const template = await chatStorage.createQuickTemplate(title, content, category);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.delete("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      await chatStorage.deleteQuickTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/templates/:id/use", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      await chatStorage.incrementTemplateUsage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing usage:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data required" });
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");
      
      let extension = "m4a";
      
      if (mimeType?.includes("wav")) {
        extension = "wav";
      } else if (mimeType?.includes("webm")) {
        extension = "webm";
      } else if (mimeType?.includes("caf") || mimeType?.includes("x-caf")) {
        extension = "m4a";
      } else if (mimeType?.includes("mp4") || mimeType?.includes("m4a") || mimeType?.includes("mpeg4")) {
        extension = "m4a";
      }
      
      const audioFile = await toFile(audioBuffer, `recording.${extension}`);

      const transcription = await getOpenAI().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ 
        error: "Failed to transcribe audio",
        details: error.message 
      });
    }
  });
}
