"""Database migration to add attachments column"""
from services.db_service import _conn

try:
    conn = _conn()
    
    # Check if column exists
    cursor = conn.execute("PRAGMA table_info(chat_history)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'attachments' not in columns:
        print("Adding attachments column...")
        conn.execute("ALTER TABLE chat_history ADD COLUMN attachments TEXT")
        conn.commit()
        print("✅ Successfully added attachments column to chat_history table")
    else:
        print("✅ Attachments column already exists")
    
    conn.close()
except Exception as e:
    print(f"❌ Migration error: {e}")
