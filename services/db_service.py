import sqlite3
import json
import os
from datetime import datetime
from config import Config

# Get database path from config
DB_PATH = Config.DATABASE_URL.replace("sqlite:///", "")


def _conn():
    """Create database connection and ensure directory exists"""
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database with required tables"""
    conn = _conn()
    cur = conn.cursor()
    
    # documents table for storing uploaded files with embeddings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL,
            user_id TEXT,
            session_id TEXT,
            filename TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)

    # chat history table for storing conversations
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            attachments TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # sessions table for tracking user sessions
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            created_at TEXT NOT NULL,
            last_activity TEXT NOT NULL
        )
    """)

    # Create indexes for better performance
    cur.execute("CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")

    # Backfill columns for legacy databases
    cur.execute("PRAGMA table_info(documents)")
    existing_cols = {row[1] for row in cur.fetchall()}
    
    # Add file_path column if it doesn't exist
    if 'file_path' not in existing_cols:
        cur.execute("ALTER TABLE documents ADD COLUMN file_path TEXT")
    if "filename" not in existing_cols:
        cur.execute("ALTER TABLE documents ADD COLUMN filename TEXT")
    if "created_at" not in existing_cols:
        cur.execute("ALTER TABLE documents ADD COLUMN created_at TEXT")
    
    # Backfill title column in sessions table
    cur.execute("PRAGMA table_info(sessions)")
    session_cols = {row[1] for row in cur.fetchall()}
    if "title" not in session_cols:
        cur.execute("ALTER TABLE sessions ADD COLUMN title TEXT")

    conn.commit()
    conn.close()


def save_document(content, embedding, user_id=None, session_id=None, filename=None, file_path=None):
    """Save a document with its embedding to the database"""
    conn = _conn()
    cur = conn.cursor()
    created_at = datetime.utcnow().isoformat()
    cur.execute("""
        INSERT INTO documents (content, embedding, user_id, session_id, filename, file_path, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (content, json.dumps(embedding), user_id, session_id, filename, file_path, created_at))
    document_id = cur.lastrowid
    conn.commit()
    conn.close()
    return document_id, created_at


def count_documents_for_session(session_id):
    """Count documents uploaded for a specific session"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM documents WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    count = row[0] if row else 0
    conn.close()
    return count


def get_documents_for_session(session_id):
    """Retrieve all documents for a specific session"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, content, embedding, filename, created_at FROM documents 
        WHERE session_id = ? ORDER BY created_at DESC
    """, (session_id,))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "content": row["content"],
            "embedding": json.loads(row["embedding"]),
            "filename": row["filename"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def get_all_documents():
    """Retrieve all documents from the database"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT id, content, embedding, filename, created_at FROM documents ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "content": row["content"],
            "embedding": json.loads(row["embedding"]),
            "filename": row["filename"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def save_chat_message(session_id, user_id, role, content, attachments=None):
    """Save a chat message to the database with optional attachments"""
    import json
    conn = _conn()
    cur = conn.cursor()
    
    # Serialize attachments to JSON if provided
    attachments_json = json.dumps(attachments) if attachments else None
    
    cur.execute("""
        INSERT INTO chat_history (session_id, user_id, role, content, attachments, created_at) 
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session_id, user_id, role, content, attachments_json, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_chat_history(session_id, limit=50):
    """Retrieve chat history for a specific session"""
    import json
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, role, content, attachments, created_at FROM chat_history 
        WHERE session_id = ?
        ORDER BY datetime(created_at) ASC, id ASC
        LIMIT ?
    """, (session_id, limit))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "attachments": json.loads(row["attachments"]) if row["attachments"] else None,
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def get_sessions_for_user(user_id):
    """Get all sessions for a specific user with metadata"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            s.id,
            s.title,
            s.created_at,
            s.last_activity,
            COUNT(ch.id) as message_count
        FROM sessions s
        LEFT JOIN chat_history ch ON s.id = ch.session_id
        WHERE s.user_id = ?
        GROUP BY s.id
        ORDER BY s.last_activity DESC
        LIMIT 50
    """, (user_id,))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "title": row["title"] or "New Chat",
            "created_at": row["created_at"],
            "last_activity": row["last_activity"],
            "message_count": row["message_count"]
        }
        for row in rows
    ]


def create_session(session_id, user_id=None):
    """Create a new session (only if it doesn't already exist)"""
    conn = _conn()
    cur = conn.cursor()
    
    # Check if session already exists
    cur.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    exists = cur.fetchone()
    
    if not exists:
        # Create new session only if it doesn't exist
        now = datetime.utcnow().isoformat()
        cur.execute("""
            INSERT INTO sessions (id, user_id, created_at, last_activity) 
            VALUES (?, ?, ?, ?)
        """, (session_id, user_id, now, now))
        conn.commit()
    
    conn.close()


def update_session_activity(session_id):
    """Update the last activity timestamp for a session"""
    conn = _conn()
    cur = conn.cursor()
    
    # Check if session exists first
    cur.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    exists = cur.fetchone()
    
    if exists:
        # Update existing session
        cur.execute("""
            UPDATE sessions SET last_activity = ? WHERE id = ?
        """, (datetime.utcnow().isoformat(), session_id))
    else:
        # Session doesn't exist in DB - this is OK, it means it's a new session
        # that hasn't been created yet (will be created when message is saved)
        pass
    
    conn.commit()
    conn.close()


def get_document_metadata_for_session(session_id):
    """Retrieve lightweight metadata for documents in a session"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, filename, LENGTH(content) AS size, created_at, file_path
        FROM documents
        WHERE session_id = ? AND filename IS NOT NULL AND filename != '' AND filename != 'Document'
        ORDER BY created_at DESC
    """, (session_id,))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "name": row["filename"],
            "size": row["size"],
            "uploaded_at": row["created_at"],
            "file_path": row["file_path"] if len(row) > 4 else None
        }
        for row in rows
    ]


def get_documents_for_user(user_id):
    """Retrieve all documents uploaded by a user across all their sessions"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, filename, LENGTH(content) AS size, created_at, file_path, session_id
        FROM documents
        WHERE user_id = ? AND filename IS NOT NULL AND filename != '' AND filename != 'Document'
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    conn.close()
    
    print(f"🔍 DB Query: Found {len(rows)} documents for user_id={user_id}")
    
    return [
        {
            "id": row["id"],
            "name": row["filename"],
            "size": row["size"],
            "uploaded_at": row["created_at"],
            "file_path": row["file_path"] if len(row) > 4 else None,
            "session_id": row["session_id"] if len(row) > 5 else None
        }
        for row in rows
    ]


def delete_document(document_id, session_id=None):
    """Delete a document, optionally scoping to a session"""
    conn = _conn()
    cur = conn.cursor()
    if session_id:
        cur.execute("DELETE FROM documents WHERE id = ? AND session_id = ?", (document_id, session_id))
    else:
        cur.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    return deleted > 0


def get_document_by_id(document_id):
    """Retrieve a single document by ID"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, content, filename, created_at
        FROM documents
        WHERE id = ?
    """, (document_id,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return None
    
    return {
        "id": row["id"],
        "content": row["content"],
        "filename": row["filename"],
        "created_at": row["created_at"]
    }


def delete_documents_by_pattern(base_filename, session_id):
    """Delete all chunks of a document by base filename pattern"""
    conn = _conn()
    cur = conn.cursor()
    # Match both exact filename and chunked versions like "filename (part 1/3)"
    cur.execute("""
        DELETE FROM documents 
        WHERE session_id = ? 
        AND (filename = ? OR filename LIKE ?)
    """, (session_id, base_filename, f"{base_filename} (part %"))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    return deleted


def update_session_title(session_id, title):
    """Update the title of a session"""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE sessions SET title = ? WHERE id = ?
    """, (title, session_id))
    conn.commit()
    conn.close()


def delete_session(session_id, user_id=None):
    """Delete a session and all associated data"""
    conn = _conn()
    cur = conn.cursor()
    
    # Verify ownership if user_id provided
    if user_id:
        cur.execute("SELECT user_id FROM sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if not row or row[0] != user_id:
            conn.close()
            return False
    
    # Delete associated data
    cur.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
    cur.execute("DELETE FROM documents WHERE session_id = ?", (session_id,))
    cur.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    
    conn.commit()
    conn.close()
    return True


def generate_session_title(first_message, ai_response=None, max_length=60):
    """
    Generate a session title using AI to create a meaningful summary.
    Falls back to simple truncation if AI generation fails.
    
    Args:
        first_message: The first user message
        ai_response: The AI's response (optional, for better context)
        max_length: Maximum length for the title
    
    Returns:
        A concise, descriptive title for the session
    """
    if not first_message:
        return "New Chat"
    
    try:
        # Try to use AI to generate a meaningful title
        from services.ai_service import chat_with_model
        
        prompt = f"""Generate a short, descriptive title (4-8 words max) for a conversation that starts with:

User: {first_message[:200]}"""
        
        if ai_response:
            prompt += f"\nAssistant: {ai_response[:200]}"
        
        prompt += "\n\nRespond with ONLY the title, no quotes or extra text."
        
        messages = [
            {"role": "system", "content": "You are a title generator. Create concise, descriptive titles for conversations. Return only the title, nothing else."},
            {"role": "user", "content": prompt}
        ]
        
        title = chat_with_model(messages).strip()
        
        # Clean up common issues
        title = title.strip('"\'').strip()
        
        # Ensure reasonable length
        if len(title) > max_length:
            title = title[:max_length].rsplit(' ', 1)[0] + '...'
        
        # Verify we got something reasonable
        if title and len(title) > 5 and not title.startswith('Error'):
            return title
            
    except Exception as e:
        print(f"AI title generation failed: {e}")
    
    # Fallback: Use simple truncation
    title = first_message.strip()
    title = title.replace('#', '').replace('*', '').replace('`', '')
    
    sentences = title.split('.')
    if sentences:
        title = sentences[0].strip()
    
    lines = title.split('\n')
    if lines:
        title = lines[0].strip()
    
    if len(title) > max_length:
        title = title[:max_length].rsplit(' ', 1)[0] + '...'
    
    return title if title else "New Chat"
