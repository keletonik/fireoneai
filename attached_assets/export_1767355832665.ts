/**
 * FyreOne AI - Export Utilities
 * 
 * Functions for exporting conversations and notebooks to various formats.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ConversationExport {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SnippetExport {
  title?: string;
  content: string;
  notes?: string;
  tags: string[];
  sourceConversation?: string;
  createdAt: Date;
}

export interface NotebookExport {
  name: string;
  description?: string;
  snippets: SnippetExport[];
}

/**
 * Convert a conversation to markdown format
 */
export function conversationToMarkdown(conversation: ConversationExport): string {
  const date = new Date(conversation.createdAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# ${conversation.title || 'FyreOne AI Conversation'}\n\n`;
  markdown += `**Date:** ${date}\n\n`;
  markdown += `---\n\n`;

  for (const message of conversation.messages) {
    if (message.role === 'system') continue; // Skip system messages
    
    const roleLabel = message.role === 'user' ? '## 👤 User' : '## 🤖 Assistant';
    markdown += `${roleLabel}\n\n`;
    markdown += `${message.content}\n\n`;
    markdown += `---\n\n`;
  }

  markdown += `\n*Exported from FyreOne AI - NSW Fire Safety Compliance Assistant*\n`;

  return markdown;
}

/**
 * Convert a notebook to markdown format
 */
export function notebookToMarkdown(notebook: NotebookExport): string {
  const date = new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# 📓 ${notebook.name}\n\n`;
  
  if (notebook.description) {
    markdown += `${notebook.description}\n\n`;
  }
  
  markdown += `**Exported:** ${date}\n`;
  markdown += `**Snippets:** ${notebook.snippets.length}\n\n`;
  markdown += `---\n\n`;

  for (let i = 0; i < notebook.snippets.length; i++) {
    const snippet = notebook.snippets[i];
    const snippetTitle = snippet.title || `Snippet ${i + 1}`;
    
    markdown += `## ${snippetTitle}\n\n`;
    markdown += `${snippet.content}\n\n`;
    
    if (snippet.notes) {
      markdown += `> **Notes:** ${snippet.notes}\n\n`;
    }
    
    if (snippet.tags.length > 0) {
      markdown += `**Tags:** ${snippet.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
    }
    
    if (snippet.sourceConversation) {
      markdown += `*Source: ${snippet.sourceConversation}*\n\n`;
    }
    
    markdown += `---\n\n`;
  }

  markdown += `\n*Exported from FyreOne AI Notebook*\n`;

  return markdown;
}

/**
 * Sanitize a string for use in a filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Generate a filename for export
 */
export function generateExportFilename(
  title: string,
  type: 'conversation' | 'notebook',
  extension: 'md' | 'pdf' | 'json' = 'md'
): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedTitle = sanitizeFilename(title || type);
  return `fyreone-${sanitizedTitle}-${date}.${extension}`;
}

/**
 * Download a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/markdown'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Export conversation - main entry point
 */
export function exportConversation(
  conversation: ConversationExport,
  format: 'md' | 'clipboard' = 'md'
): void {
  const markdown = conversationToMarkdown(conversation);
  
  if (format === 'clipboard') {
    copyToClipboard(markdown);
  } else {
    const filename = generateExportFilename(conversation.title, 'conversation', 'md');
    downloadFile(markdown, filename);
  }
}

/**
 * Export notebook - main entry point
 */
export function exportNotebook(
  notebook: NotebookExport,
  format: 'md' | 'clipboard' = 'md'
): void {
  const markdown = notebookToMarkdown(notebook);
  
  if (format === 'clipboard') {
    copyToClipboard(markdown);
  } else {
    const filename = generateExportFilename(notebook.name, 'notebook', 'md');
    downloadFile(markdown, filename);
  }
}
