from flask import Blueprint, render_template, request, jsonify, session
from services.ai_service import chat_with_model, get_embeddings
from services.rag_service import retrieve_context
from services.db_service import save_document, save_chat_message, count_documents_for_session, get_sessions_for_user, get_chat_history
import uuid

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/")
def chat_ui():
    if "user" in session:
        return render_template("chat.html", user=session["user"])
    else:
        return render_template("chat.html", user=None)


@chat_bp.route('/session', methods=['POST'])
def create_session():
    # creates a new session id and returns it to the client
    sid = str(uuid.uuid4())
    return jsonify({'session_id': sid})


@chat_bp.route('/sessions', methods=['GET'])
def list_sessions():
    if 'user' not in session:
        return jsonify({'sessions': []})
    user = session['user']
    user_id = user.get('email') or user.get('sub')
    sessions = get_sessions_for_user(user_id)
    return jsonify({'sessions': sessions})


@chat_bp.route('/history/<session_id>', methods=['GET'])
def history(session_id):
    hist = get_chat_history(session_id)
    return jsonify({'history': hist})


@chat_bp.route("/ask", methods=["POST"])
def ask():
    data = request.json or {}
    query = data.get("message", "")
    session_id = data.get('session_id')

    # embed and retrieve context using session-scoped docs if provided
    query_vec = get_embeddings([query])[0]
    context = retrieve_context(query_vec, session_id=session_id)

    messages = [
        {"role": "system", "content": "You are NOVA-R, a helpful assistant."},
        {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
    ]

    answer = chat_with_model(messages)

    # save chat messages
    user_id = None
    if 'user' in session:
        user_id = session['user'].get('email') or session['user'].get('sub')

    # store both user question and assistant answer
    save_chat_message(session_id, user_id, 'user', query)
    save_chat_message(session_id, user_id, 'assistant', answer)

    return jsonify({"response": answer})


@chat_bp.route("/upload", methods=["POST"])
def upload():
    # expect multipart form with file and optional session_id
    session_id = request.form.get('session_id') or request.args.get('session_id')
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'no file'}), 400

    # server-side limit: max 5 docs per session
    if session_id and count_documents_for_session(session_id) >= 5:
        return jsonify({'error': 'session document limit reached'}), 400

    content = file.read().decode('utf-8')
    embedding = get_embeddings([content])[0]

    user_id = None
    if 'user' in session:
        user_id = session['user'].get('email') or session['user'].get('sub')

    save_document(content, embedding, user_id=user_id, session_id=session_id)
    return jsonify({"message": "Document uploaded"})
