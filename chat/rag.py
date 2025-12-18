# chat/rag.py
from services.ai_service import get_embeddings
import numpy as np

def embed_text(text):
    return get_embeddings(text)

def retrieve_and_rank(query, documents, top_k=4):
    """Simple RAG retriever"""
    query_emb = embed_text(query)
    scored_docs = []
    for doc in documents:
        doc_emb = embed_text(doc["content"])
        score = cosine_similarity(query_emb, doc_emb)
        scored_docs.append((score, doc))
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored_docs[:top_k]]

def cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors"""
    if not vec1 or not vec2:
        return 0.0
    
    v1, v2 = np.array(vec1), np.array(vec2)
    norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    return np.dot(v1, v2) / (norm1 * norm2)
