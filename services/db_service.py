import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///data/novar.db").replace("sqlite:///", "")


def _conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = _conn()
    cur = conn.cursor()
    # documents now track optional user_id and session_id
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            embedding TEXT,
            user_id TEXT,
            session_id TEXT,
            created_at TEXT
        )
    """)

    # simple chat history table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            user_id TEXT,
            role TEXT,
            content TEXT,
            created_at TEXT
        )
    """)

    conn.commit()
    conn.close()


def save_document(content, embedding, user_id=None, session_id=None):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO documents (content, embedding, user_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
                (content, json.dumps(embedding), user_id, session_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def count_documents_for_session(session_id):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM documents WHERE session_id = ?", (session_id,))
    n = cur.fetchone()[0]
    conn.close()
    return n


def get_documents_for_session(session_id):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT content, embedding FROM documents WHERE session_id = ? ORDER BY created_at DESC", (session_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"content": row[0], "embedding": json.loads(row[1])} for row in rows]


def get_all_documents():
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT content, embedding FROM documents ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [{"content": row[0], "embedding": json.loads(row[1])} for row in rows]


def save_chat_message(session_id, user_id, role, content):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO chat_history (session_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (session_id, user_id, role, content, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_chat_history(session_id):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1], "created_at": r[2]} for r in rows]


def get_sessions_for_user(user_id):
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT session_id FROM chat_history WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cur.fetchall()
    conn.close()
    return [r[0] for r in rows if r[0]]
