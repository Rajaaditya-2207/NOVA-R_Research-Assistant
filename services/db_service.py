import sqlite3
import json
import os

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///data/novar.db").replace("sqlite:///", "")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            embedding TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_document(content, embedding):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO documents (content, embedding) VALUES (?, ?)",
                (content, json.dumps(embedding)))
    conn.commit()
    conn.close()


def get_all_documents():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT content, embedding FROM documents")
    rows = cur.fetchall()
    conn.close()

    return [
        {"content": row[0], "embedding": json.loads(row[1])}
        for row in rows
    ]
