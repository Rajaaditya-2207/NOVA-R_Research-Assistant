# NOVA-R Research Assistant

A web-based AI research assistant that allows users to chat with AI and upload documents for enhanced context using RAG (Retrieval-Augmented Generation).

## ✨ Features

- 🤖 **AI-Powered Chat** - Conversations using NVIDIA's advanced language models
- 📚 **Document Upload** - Upload up to 5 text documents per session with real-time notifications
- 🧠 **RAG Context** - Intelligent document retrieval using vector embeddings
- 🔐 **Flexible Authentication** - Optional Google OAuth or free guest mode
- 💾 **Session Memory** - Maintains conversation context throughout your session
- 🌓 **Light/Dark Theme** - Toggle between themes for comfortable viewing
- 📊 **Upload Notifications** - Beautiful toast notifications with loading animations
- ⚡ **Fast & Private** - No permanent data storage in free mode

## 🚀 Quick Start

### Backend Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your NVIDIA API keys:
   ```
   NVIDIA_TEXT_API_KEY=your-nemotron-ultra-api-key
   NVIDIA_EMBED_API_KEY=your-embedqa-api-key
   ```
   Get your API keys from [NVIDIA Build](https://build.nvidia.com/)

3. **Run the Backend**
   ```bash
   python app.py
   ```
   Backend will run on `http://localhost:3000`

### Frontend Setup

1. **Install Node Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the Frontend**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173` (or 5174 if port is in use)

3. **Open your browser** to the frontend URL

## 🔧 Configuration

### Required Environment Variables

- `NVIDIA_TEXT_API_KEY` - NVIDIA key for `nvidia/llama-3.1-nemotron-ultra-253b-v1` chat completions
- `NVIDIA_EMBED_API_KEY` - NVIDIA key for `nvidia/nv-embedqa-e5-v5` embeddings

### Optional Environment Variables

- `FLASK_SECRET_KEY` - Flask session secret (default: auto-generated)
- `DATABASE_URL` - SQLite database path (default: `sqlite:///data/novar.db`)
- `MAX_DOCUMENTS_PER_SESSION` - Max documents per session (default: 5)
- `RAG_TOP_K` - Number of document chunks for context (default: 4)
- `AUTH_REQUIRED` - Require Google login (default: false - free mode)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret (optional)

## 🔐 Google OAuth Setup (Optional)

To enable persistent user sessions with Google authentication:

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Navigate to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:5173/auth/callback`

2. **Update Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   AUTH_REQUIRED=false  # Set to true to require login
   ```

3. **Restart the backend** - OAuth will be automatically enabled

### Free Mode vs Authenticated Mode

- **Free Mode** (`AUTH_REQUIRED=false`): Users can chat without logging in (temporary sessions)
- **Authenticated Mode** (`AUTH_REQUIRED=true`): Users must sign in with Google (persistent sessions)

## 🧪 Testing

### Run Integration Tests
```bash
python test_integration.py
```

Tests verify:
- ✅ Authentication status
- ✅ Session creation
- ✅ Document upload
- ✅ RAG context retrieval
- ✅ Chat history
- ✅ Document listing

### Run Unit Tests
```bash
python test_functionality.py
```

## File Structure

```
NOVA-R V1/
├── app.py                    # Flask application entry point
├── config.py                # Configuration management
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
├── test_integration.py     # Integration tests
├── test_functionality.py   # Unit tests
├── auth/                   # Authentication module
│   └── __init__.py         # Google OAuth routes
├── chat/                   # Chat functionality
│   ├── routes.py           # Chat API routes
│   ├── rag.py              # RAG implementation
│   ├── memory.py           # Session memory
│   └── websearch.py        # Web search integration
├── services/               # Core services
│   ├── ai_service.py       # NVIDIA AI API client
│   ├── db_service.py       # Database operations
│   └── rag_service.py      # RAG service
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main app component
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks (useAuth)
│   │   └── pages/          # Page components
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Vite configuration
└── data/                   # Database storage
    └── novar.db            # SQLite database
```

## API Endpoints

### Chat Endpoints
- `POST /chat/session` - Create new chat session
- `POST /chat/ask` - Send message and get AI response
- `POST /chat/upload` - Upload document for RAG
- `GET /chat/history/<session_id>` - Get session chat history
- `GET /chat/documents/<session_id>` - List uploaded documents
- `DELETE /chat/upload/<file_id>` - Remove uploaded document
- `GET /chat/sessions` - List user sessions (auth required)

### Authentication Endpoints
- `GET /auth/status` - Get authentication configuration
- `GET /auth/user` - Get current user info
- `GET /auth/login/google` - Initiate Google OAuth login
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Logout current user

## Technology Stack

- **Backend**: Flask (Python), Flask-CORS, Authlib
- **Database**: SQLite with vector embeddings
- **AI Models**: 
  - Chat: NVIDIA Nemotron Ultra (llama-3.1-nemotron-ultra-253b-v1)
  - Embeddings: NVIDIA NV-EmbedQA (nv-embedqa-e5-v5)
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Session Management**: Flask-Session (filesystem)
- **Authentication**: Google OAuth 2.0 (optional)

## Development

For development mode, set `FLASK_ENV=development` in your `.env` file.

## Production Deployment

For production deployment:

1. Set secure values for `FLASK_SECRET_KEY`
2. Configure proper database (PostgreSQL recommended)
3. Use a production WSGI server like Gunicorn
4. Set up reverse proxy (nginx)
5. Enable HTTPS

## License

This project is open source. See the LICENSE file for details.

## Support

For issues and questions, please check the documentation or create an issue in the repository.
