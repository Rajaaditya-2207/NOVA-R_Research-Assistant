import sqlite3
import numpy as np
from services.db_service import get_all_documents

def cosine_similarity(vec1, vec2):
    v1, v2 = np.array(vec1), np.array(vec2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def retrieve_context(query_vec, top_k=4):
    """
    Retrieve top_k most relevant docs from DB based on embeddings.
    """
    docs = get_all_documents()
    scored = []

    for doc in docs:
        content, embedding = doc["content"], doc["embedding"]
        score = cosine_similarity(query_vec, embedding)
        scored.append((score, content))

    # Sort and return top K
    scored.sort(reverse=True, key=lambda x: x[0])
    top_contexts = [c for _, c in scored[:top_k]]

    return "\n\n".join(top_contexts)
