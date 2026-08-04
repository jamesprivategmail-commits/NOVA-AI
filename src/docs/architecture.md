# NOVA AI Architecture

NOVA AI v1 is built with a modern full-stack architecture:

## Backend
- **Express / Node.js**: Fast and minimal web framework.
- **REST API**: Serves a streaming proxy for Gemini to protect API keys.
- **TypeScript**: Full type safety.

## Frontend
- **React 19 + Vite**: Modern, fast component rendering.
- **Tailwind CSS**: Utility-first dark-mode styling.
- **Components**:
  - `ChatScreen`: The main layout containing sidebar and chat history.
  - `MessageBubble`: Renders Markdown and Syntax Highlighting for code.
  - `InputArea`: Expanding textarea with send and stop controls.

## Database & Authentication
- **Firebase Firestore**: Stores user profiles, chats, and individual messages securely.
- **Firebase Auth**: Provides Email/Password authentication.

## Memory & AI
- **Gemini API SDK**: Integrates `@google/genai` for streaming completions.
- **Context Manager**: Dynamically builds prompt context and history to feed into the model.
