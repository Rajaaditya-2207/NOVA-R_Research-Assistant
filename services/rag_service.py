import numpy as np
from services.db_service import get_all_documents, get_documents_for_session


def cosine_similarity(vec1, vec2):
    v1 = np.array(vec1, dtype=float)
    v2 = np.array(vec2, dtype=float)

    if v1.size == 0 or v2.size == 0:
        return 0.0

    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    if denom == 0:
        return 0.0

    return float(np.dot(v1, v2) / denom)

def retrieve_context(query_vec, top_k=4, session_id=None):
    """
    Retrieve top_k most relevant docs from DB based on embeddings.
    If session_id is given, only consider docs uploaded for that session.
    """
    docs = get_documents_for_session(session_id) if session_id else get_all_documents()
    scored = []

    for doc in docs:
        content, embedding = doc.get("content"), doc.get("embedding")
        if not content or embedding is None:
            continue

        try:
            score = cosine_similarity(query_vec, embedding)
        except Exception:
            continue

        if not np.isfinite(score):
            continue

        scored.append((score, content))

    # Sort and return top K
    scored.sort(reverse=True, key=lambda x: x[0])
    top_contexts = [c for _, c in scored[:top_k]]

    return "\n\n".join(top_contexts)
