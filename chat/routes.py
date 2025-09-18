from flask import Blueprint, render_template, request, jsonify, session
from services.ai_service import chat_with_model, get_embeddings
from services.rag_service import retrieve_context
from services.db_service import save_document

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/")
def chat_ui():
    if "user" in session:
        return render_template("chat.html", user=session["user"])
    else:
        return render_template("chat.html", user=None)

@chat_bp.route("/ask", methods=["POST"])
def ask():
    data = request.json
    query = data.get("message", "")

    query_vec = get_embeddings([query])[0]
    context = retrieve_context(query_vec)

    messages = [
        {"role": "system", "content": "You are NOVA-R, a helpful assistant."},
        {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
    ]

    answer = chat_with_model(messages)
    return jsonify({"response": answer})

@chat_bp.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    content = file.read().decode("utf-8")
    embedding = get_embeddings([content])[0]

    save_document(content, embedding)
    return jsonify({"message": "Document uploaded"})
