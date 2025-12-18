# NOVA-R Research Assistant — Product Requirements Document (PRD)

Project: NOVA-R Research Assistant (Temporary Sessions Only)
Version: v1.0
Date: 2025-09-18

## 1. Objective

Build a web-based AI research assistant that allows users to:

- Start a temporary chat session (no login).
- Upload up to 5 documents per session.
- Ask questions and get answers enriched with RAG (Retrieval-Augmented Generation).
- Maintain session memory during the chat.
- Provide a clean UI with light/dark mode and basic animations.

## 2. User Flow

Landing Page (`index.html`)
- Animated welcome screen explaining the product.
- Button: "Try Now →" starts a temporary session.

Chat Page (`chat.html`)
- Left side: Previous session summary (empty if first time).
- Right side: Chat window with input box.
- Upload area for documents (max 5 per session).
- Toggle: Light/Dark mode.

Session
- When user clicks Try Now, a temporary session is created.
- Memory of conversation is kept in Flask session.
- When browser closes → session resets.

## 3. Features & Requirements

A. Chat
- User sends messages to AI.
- AI replies using NVIDIA Nemotron (LLM).
- Session memory keeps conversation context.

B. RAG (Retrieval-Augmented Generation)
- Uploaded documents are embedded via NVIDIA Embedding Model.
- Stored in SQLite (temporary session storage).
- Each query retrieves top K (default 4) relevant chunks.
- These are added to system context before model reply.

C. Document Upload
- User can upload .txt, .pdf (optional parsing), .docx (future).
- Limited to 5 documents per session.
- Max file size: 50 MB.

D. Session Handling
- Sessions handled via Flask-Session (filesystem).
- Session data includes:
  - Uploaded docs (embeddings + text).
  - Conversation history.

E. Theming
- Light & Dark mode toggle in chat.
- Animated welcome screen on index page.

## 4. Tech Stack

Backend
- Flask (Python) → Web server & API routes.
- Flask-Session → Temporary session management.
- SQLite → Store session embeddings & docs.
- requests → Call NVIDIA AI endpoints.
- python-dotenv → Environment variable management.

AI Models
- Chat Model: nvidia/Nemotron-4-340B-Instruct (via NVIDIA API).
- Embedding Model: nvidia-embed-qa-4 (example) via NVIDIA API.

Frontend
- HTML5 + CSS3 + JavaScript (Vanilla).
- Animations: CSS transitions, keyframes.
- Dark/Light Theme: JS + CSS toggle.

Storage
- Uploads folder for raw files.
- SQLite (`data/novar.db`) for embeddings + documents.

## 5. System Architecture

User → Browser (HTML/CSS/JS)
        → Flask Backend
            → Session (Temporary Memory)
            → Embeddings (via NVIDIA API)
            → Vector Store (SQLite)
            → Chat Model (NVIDIA Nemotron)
        ← AI Response (formatted with Markdown → HTML)

## 6. APIs & Routes

- GET / → Index page.
- GET /chat → Chat page.
- POST /chat/ask → Send query, get response.
- POST /chat/upload → Upload document.

## 7. Limitations

- Sessions are temporary only.
- Max 5 docs per session.
- No OAuth or permanent user history.

## 8. Success Criteria

- Smooth temporary chat works with memory.
- Users can upload docs & query with RAG.
- Frontend shows formatted AI responses (bold, italic, lists, code blocks).
- Light/Dark mode works seamlessly.

---

Created from user-provided PRD on 2025-09-18.