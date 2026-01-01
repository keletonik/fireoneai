# FireOne AI - Replit.md

## Overview

FireOne AI is a mobile-first chat application designed for NSW fire safety auditors and compliance professionals. It provides an AI-powered copilot that answers fire safety compliance questions with structured, citation-backed responses covering AFSS requirements, NCC/BCA provisions, Australian Standards, and essential fire safety measures.

The application is built as a cross-platform React Native (Expo) app with an Express.js backend, using PostgreSQL for data persistence and OpenAI for AI-powered chat responses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native/Expo)
- **Framework**: React Native with Expo SDK 54, targeting iOS 16+ and Android 10+
- **Navigation**: Stack-only navigation using `@react-navigation/native-stack` with a single primary chat screen
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: Custom themed components following FireOne design system (white backgrounds, orange accents #FF6B35, minimalist style)
- **Keyboard Handling**: `react-native-keyboard-controller` for proper keyboard-aware behavior
- **Animations**: `react-native-reanimated` for smooth micro-interactions

### Backend (Express.js)
- **Runtime**: Node.js with TypeScript, compiled via `tsx` for development and `esbuild` for production
- **API Pattern**: RESTful endpoints with streaming support (SSE) for chat responses
- **Chat Integration**: OpenAI API via Replit AI Integrations for generating structured fire safety compliance responses

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Core Schema**: `users`, `conversations`, `messages` for chat functionality
- **Knowledge Schema**: `knowledgeDocuments`, `documentRevisions`, `documentChunks`, `chunkEmbeddings` for RAG pipeline
- **Compliance Schema**: `complianceTopics` for fire safety topic organization
- **Audit Schema**: `auditPolicies`, `auditResults`, `auditEvents` for automated compliance auditing
- **Feedback Schema**: `responseFeedback`, `ingestionJobs`, `systemMetrics` for learning and monitoring
- **Validation**: Zod schemas generated from Drizzle schema via `drizzle-zod`

### Key Design Decisions

1. **Monorepo Structure**: Client code in `/client`, server in `/server`, shared types in `/shared` with TypeScript path aliases (`@/` and `@shared/`)

2. **Streaming Chat Responses**: Backend uses Server-Sent Events (SSE) for token-by-token streaming to provide responsive AI interactions

3. **Structured AI Responses**: System prompt enforces consistent response format with sections: "What this means", "Relevant references", "Assumptions", and "Next steps"

4. **Theme System**: Centralized theme constants supporting light/dark modes with FireOne-specific color palette

5. **Error Boundaries**: React error boundaries with development-mode debugging and production-safe fallbacks

## Recent Changes (December 2025)

### Image and Document Analysis
- **Image Attachments**: Users can attach images (photos, screenshots) which are analyzed using OpenAI GPT-4o Vision API
- **Document Attachments**: Text documents (.txt, .md) are read and included as context for AI responses
- **Base64 Processing**: Images are converted to base64 data URLs on the client and sent to GPT-4o for analysis
- **Multimodal Messages**: Backend constructs proper multimodal message format with text and image_url content parts

### Self-Learning AI Infrastructure (5-Phase Architecture)
- **Phase 1 - Knowledge Schema**: 11 new database tables for documents, revisions, chunks, embeddings, topics, audits, feedback, and metrics
- **Phase 2 - Document Ingestion**: Upload API with text chunking (1000 chars, 100 overlap), OpenAI embeddings (text-embedding-3-small), vector storage
- **Phase 3 - Feedback System**: Thumbs up/down ratings, correction tracking, learning signal collection for continuous improvement
- **Phase 4 - Automated Auditing**: 3 default policies (document freshness, embedding coverage, negative feedback alerts), scheduled checks
- **Phase 5 - Admin Dashboard**: Health checks, overview stats, document management, job monitoring, system metrics tracking

### API Endpoints
- `/api/documents` - Document upload, chunking, embedding generation, search
- `/api/feedback` - Rating submission, corrections, feedback queries
- `/api/topics` - Compliance topic management with seeding
- `/api/audits` - Audit policies, results, run-all capability
- `/api/admin` - Overview stats, health checks, jobs, metrics

### UI/UX Polish Improvements
- **Quick Prompt Chips**: Welcome screen now displays 4 quick prompt chips (AFSS, Fire doors, Egress, Sprinklers) that pre-fill the input field
- **User Message Bubbles**: Changed from bright orange to warm grey/tan (#E8DDD4 light, #3D3530 dark) for better visual balance
- **Message Action Menu**: Long-press on messages shows a modal overlay with Copy and Bookmark actions
- **Frosted Glass Input Bar**: InputComposer uses BlurView with tinted background for modern iOS-style glass effect
- **Collapsible Settings Sections**: AI Personalization, Document Library, Support, and Legal sections now collapse/expand
- **Accessibility Labels**: All header buttons and interactive elements have accessibility labels and hints
- **Simplified Header**: 4-button design (new chat, search, help, settings) for cleaner mobile experience

## External Dependencies

### AI Services
- **OpenAI API**: Accessed through Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`) for chat completions and image generation

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL
- `EXPO_PUBLIC_DOMAIN` - Public domain for API requests from mobile client
- `REPLIT_DEV_DOMAIN` - Development domain for CORS and Expo configuration

### Third-Party Packages
- `expo-*` packages for native functionality (haptics, clipboard, splash screen, etc.)
- `p-limit` and `p-retry` for batch processing with rate limiting
- `http-proxy-middleware` for development proxying