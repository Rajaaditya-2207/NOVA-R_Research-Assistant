# chat/rag.py
from services import get_embeddings

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
    return sum(a*b for a, b in zip(vec1, vec2)) / (
        (sum(a*a for a in vec1) ** 0.5) * (sum(b*b for b in vec2) ** 0.5)
    )
