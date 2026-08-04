# NOVA AI

A modern, full-stack AI Assistant application powered by React, Tailwind CSS, Express, and Firebase.

## Features

- **Multi-Model Support**: Native support for Google Gemini, Groq, and Cohere models.
- **Admin Panel**: Manage users, assign VIP/Premium tiers, and ban abusive users.
- **Message Controls**: Edit, Delete, and Copy messages effortlessly.
- **Real-Time Streaming**: Stream responses using WebStreams and SSE.
- **Syntax Highlighting & Markdown**: Developer-friendly response formatting.
- **Secure Backend**: Express server protected by `helmet` and `express-rate-limit`.
- **Firebase Integration**: Secure Authentication and Real-time Firestore database.

## Architecture & Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Markdown.
- **Backend**: Node.js, Express (ES Modules), API Proxies.
- **Database & Auth**: Firebase Firestore & Firebase Auth.

*(Note: While Python/FastAPI and PostgreSQL were considered, the application is strictly built on a unified TypeScript + Node.js full-stack foundation to ensure seamless environment compatibility, integrated deployments, and robust real-time streaming without complex language bridges.)*

## Deployment

### Using Docker (Recommended)

1. Rename `.env.example` to `.env` and fill in your API keys (Gemini, OpenAI, OpenRouter).
2. Build and start the container:
   ```bash
   docker-compose up --build -d
   ```
3. Access the application at `http://localhost:3000`.

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   npm start
   ```
