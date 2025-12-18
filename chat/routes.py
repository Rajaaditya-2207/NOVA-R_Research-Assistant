from flask import Blueprint, request, jsonify, session
from services.ai_service import chat_with_model, chat_with_vision, get_embeddings
from services.rag_service import retrieve_context
from services.db_service import (
    save_document, save_chat_message, count_documents_for_session,
    get_sessions_for_user, get_chat_history, create_session, update_session_activity,
    get_document_metadata_for_session, delete_document, update_session_title,
    delete_session, generate_session_title
)
from config import Config
import uuid
import io
import base64
import os
from pypdf import PdfReader
from werkzeug.utils import secure_filename

chat_bp = Blueprint("chat", __name__)


def chunk_text(text, max_chars=1000, overlap=100):
    """
    Split text into overlapping chunks for embedding.
    
    Args:
        text: Full text to chunk
        max_chars: Maximum characters per chunk (1000 chars works better with mistral-7b embeddings)
        overlap: Characters to overlap between chunks (preserves context)
    
    Returns:
        List of text chunks
    """
    if len(text) <= max_chars:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Get chunk
        end = start + max_chars
        chunk = text[start:end]
        
        # Try to break at sentence boundary if possible
        if end < len(text):
            # Look for sentence endings
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            
            if break_point > max_chars * 0.5:  # Only break if we're past halfway
                chunk = text[start:start + break_point + 1]
                end = start + break_point + 1
        
        chunks.append(chunk.strip())
        
        # Move start position with overlap
        start = end - overlap if end < len(text) else end
    
    return chunks


@chat_bp.route("/")
def chat_ui():
    """Render the chat interface"""
    user = session.get("user")
    return jsonify({
        "message": "NOVA-R chat service ready",
        "user": user
    })


@chat_bp.route('/session', methods=['POST'])
def create_chat_session():
    """Create a new chat session ID (don't store in DB until first message)"""
    session_id = str(uuid.uuid4())
    # Just return the ID - don't store in database yet
    # Session will be created when first message is sent
    return jsonify({'session_id': session_id})


@chat_bp.route('/sessions', methods=['GET'])
def list_sessions():
    """List all sessions for the current user (Google OAuth only)"""
    if 'user' not in session:
        return jsonify({'sessions': []})
    
    user = session['user']
    # Only show session history for Google OAuth users, not trial mode
    if user.get('auth_type') == 'trial':
        return jsonify({'sessions': []})
    
    user_id = user.get('email') or user.get('sub')
    sessions = get_sessions_for_user(user_id)
    return jsonify({'sessions': sessions})


@chat_bp.route('/history/<session_id>', methods=['GET'])
def get_session_history(session_id):
    """Get chat history for a specific session"""
    try:
        history = get_chat_history(session_id)
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve history', 'details': str(e)}), 500


@chat_bp.route("/ask", methods=["POST"])
def ask_question():
    """Handle chat questions with RAG context and optional images"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    query = data.get("message", "").strip()
    session_id = data.get('session_id')
    image_data_list = data.get('images', [])  # List of base64 image data
    attached_files = data.get('attached_files', [])  # Document attachments metadata
    attached_images = data.get('attached_images', [])  # Image attachments metadata
    
    if not query:
        return jsonify({'error': 'No message provided'}), 400
    
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400

    try:
        # Create session in DB if it doesn't exist (for OAuth users only)
        if 'user' in session:
            user = session['user']
            if user.get('auth_type') == 'google':
                user_id = user.get('email') or user.get('sub')
                # Ensure session exists in DB (won't overwrite if already exists)
                create_session(session_id, user_id)
        
        # Update session activity (safe even if session doesn't exist yet)
        update_session_activity(session_id)
        
        # Check if this is a vision query (has images)
        has_images = image_data_list and len(image_data_list) > 0
        
        if has_images:
            # Use vision model for image analysis
            chat_history = get_chat_history(session_id, limit=10)
            messages = [
                {"role": "system", "content": "You are NOVA-R, a helpful AI research assistant with vision capabilities. Analyze images carefully and provide detailed, accurate descriptions and insights."}
            ]
            
            # Add recent conversation history
            for msg in chat_history[-6:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
            
            # Add current query
            messages.append({"role": "user", "content": query})
            
            # Use vision model
            answer = chat_with_vision(messages, image_data_list)
        else:
            # Use text model with RAG for documents
            query_embedding = get_embeddings(query, input_type="query")
            context = retrieve_context(query_embedding, top_k=Config.RAG_TOP_K, session_id=session_id)
            
            # Debug: Log if context was retrieved
            if context and context.strip():
                print(f"✓ Retrieved {len(context)} chars of context for query")
            else:
                print(f"⚠ No context retrieved for query")
            
            chat_history = get_chat_history(session_id, limit=10)
            messages = [
                {"role": "system", "content": "You are NOVA-R, a helpful AI research assistant. You have access to documents uploaded by the user. ALWAYS use the provided document context to answer questions. If the context contains relevant information, cite it directly. Be specific and reference the documents."}
            ]
            
            for msg in chat_history[-6:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
            
            # Format the user message with clear context separation
            if context and context.strip():
                user_message = f"""[DOCUMENT CONTEXT]
{context}

[USER QUESTION]
{query}

Please answer the question using the document context provided above. Reference specific information from the documents in your response."""
            else:
                user_message = query
            
            messages.append({"role": "user", "content": user_message})
            
            answer = chat_with_model(messages)
        
        # Save both user question and AI response (only for Google OAuth users)
        user_id = None
        should_save = False
        if 'user' in session:
            user = session['user']
            if user.get('auth_type') == 'google':
                user_id = user.get('email') or user.get('sub')
                should_save = True
        
        if should_save:
            # Prepare attachments metadata
            attachments = None
            if attached_files or attached_images:
                attachments = {
                    'files': attached_files if attached_files else [],
                    'images': attached_images if attached_images else []
                }
            
            save_chat_message(session_id, user_id, 'user', query, attachments)
            save_chat_message(session_id, user_id, 'assistant', answer)
            
            # Auto-generate session title from first exchange using AI
            chat_count = len(get_chat_history(session_id, limit=5))
            if chat_count == 2:  # First exchange (user + assistant)
                title = generate_session_title(query, answer)
                update_session_title(session_id, title)

        return jsonify({"response": answer})
        
    except Exception as e:
        print(f"Error in ask_question: {e}")
        return jsonify({'error': 'AI service error', 'details': str(e)}), 500


@chat_bp.route("/upload", methods=["POST"])
def upload_document():
    """Handle document and image uploads"""
    session_id = request.form.get('session_id') or request.args.get('session_id')
    file = request.files.get('file')
    
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400
    
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400
    
    filename = file.filename
    file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    # Check if it's an image - handle differently (no embedding needed)
    image_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}
    if file_ext in image_extensions:
        try:
            # Save image file to disk
            safe_filename = secure_filename(filename)
            unique_filename = f"{uuid.uuid4()}_{safe_filename}"
            file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
            
            image_bytes = file.read()
            with open(file_path, 'wb') as f:
                f.write(image_bytes)
            
            # Create base64 for immediate display
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            mime_types = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'bmp': 'image/bmp'
            }
            mime_type = mime_types.get(file_ext, 'image/jpeg')
            image_data_url = f"data:{mime_type};base64,{image_base64}"
            
            # Save image metadata to database (no embedding, empty content)
            user_id = None
            if 'user' in session:
                user_id = session['user'].get('email') or session['user'].get('sub')
            
            print(f"🖼️ Saving image '{filename}' with user_id={user_id}, session_id={session_id}")
            
            # Store image reference in database for persistence
            image_id, created_at = save_document(
                content=f"[IMAGE: {filename}]",  # Placeholder content
                embedding=[0.0] * 1024,  # Dummy embedding (not used for images)
                user_id=user_id,
                session_id=session_id,
                filename=filename,
                file_path=unique_filename
            )
            
            return jsonify({
                'success': True,
                'type': 'image',
                'id': image_id,  # Use database ID
                'url': image_data_url,
                'filename': filename,
                'size': len(image_bytes),
                'file_path': unique_filename
            })
        except Exception as e:
            return jsonify({'error': 'Failed to process image', 'details': str(e)}), 500

    try:
        # Check document limit for session
        current_count = count_documents_for_session(session_id)
        if current_count >= Config.MAX_DOCUMENTS_PER_SESSION:
            return jsonify({'error': f'Session document limit reached (max {Config.MAX_DOCUMENTS_PER_SESSION})'}), 400

        # Read and decode file content
        raw_content = file.read()
        filename = file.filename
        
        # Save original file to disk for viewing
        from werkzeug.utils import secure_filename
        safe_filename = secure_filename(filename)
        unique_filename = f"{uuid.uuid4()}_{safe_filename}"
        file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
        
        try:
            with open(file_path, 'wb') as f:
                f.write(raw_content)
        except Exception as save_error:
            print(f"Error saving file: {save_error}")
            # Continue anyway - we can still embed the text
        
        # Extract text based on file type
        content = ""
        try:
            if filename.lower().endswith('.pdf'):
                # Parse PDF files properly
                try:
                    pdf_file = io.BytesIO(raw_content)
                    pdf_reader = PdfReader(pdf_file)
                    content_parts = []
                    for page in pdf_reader.pages:
                        text = page.extract_text()
                        if text:
                            content_parts.append(text)
                    content = "\n\n".join(content_parts)
                    if not content.strip():
                        return jsonify({'error': 'PDF appears to be empty or contains only images'}), 400
                except Exception as pdf_error:
                    print(f"PDF parsing error: {pdf_error}")
                    return jsonify({'error': 'Failed to parse PDF. Please ensure it contains extractable text.'}), 400
            else:
                # Try to decode as text (supports .txt, .md, .csv, .json, .xml, .html, code files, etc.)
                try:
                    content = raw_content.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        content = raw_content.decode('latin-1')
                    except Exception:
                        return jsonify({'error': 'Unable to decode file. Please upload text-based documents.'}), 400
        except Exception as e:
            print(f"File reading error: {e}")
            return jsonify({'error': 'Failed to read file content'}), 400

        # Validate content length
        if len(content.strip()) < 10:
            return jsonify({'error': 'File content is too short or empty'}), 400
        
        # Check if content looks like binary data (indicates wrong file type)
        # Binary files decoded as text will have lots of null bytes and non-printable chars
        null_ratio = content.count('\x00') / len(content) if len(content) > 0 else 0
        if null_ratio > 0.1:  # More than 10% null bytes = likely binary
            return jsonify({'error': 'File appears to be binary. Please upload text-based documents only.'}), 400

        # Get user info
        user_id = None
        if 'user' in session:
            user_id = session['user'].get('email') or session['user'].get('sub')
        
        print(f"📄 Saving document '{filename}' with user_id={user_id}, session_id={session_id}")

        # For large documents, split into chunks
        # Each chunk gets its own embedding and database entry
        # Use 1500 chars for better context and faster loading
        chunks = chunk_text(content, max_chars=1500, overlap=150)
        
        document_ids = []
        for i, chunk in enumerate(chunks):
            # Generate embeddings for each chunk (use "passage" type for storage)
            embedding = get_embeddings(chunk, input_type="passage")
            
            # Create chunk filename
            chunk_filename = filename if len(chunks) == 1 else f"{filename} (part {i+1}/{len(chunks)})"
            
            # Save chunk to database (all chunks share the same file_path)
            document_id, created_at = save_document(
                chunk,
                embedding,
                user_id=user_id,
                session_id=session_id,
                filename=chunk_filename,
                file_path=unique_filename  # All chunks reference the same original file
            )
            document_ids.append(document_id)

        # Update session activity
        update_session_activity(session_id)

        # Return response
        message = f"Document '{filename}' uploaded successfully"
        if len(chunks) > 1:
            message = f"Document '{filename}' split into {len(chunks)} chunks and uploaded successfully"

        return jsonify({
            "message": message,
            "file": {
                "id": document_ids[0],  # Return first chunk ID
                "name": filename,
                "size": len(raw_content),
                "uploaded_at": created_at,
                "chunks": len(chunks),
                "file_path": unique_filename,  # Store unique filename for retrieval
                "original_name": filename
            }
        })
        
    except Exception as e:
        print(f"Error in upload_document: {e}")
        return jsonify({'error': 'Upload failed', 'details': str(e)}), 500


@chat_bp.route('/documents/<session_id>', methods=['GET'])
def list_session_documents(session_id):
    """Retrieve metadata for uploaded documents in a session"""
    try:
        documents = get_document_metadata_for_session(session_id)
        return jsonify({'documents': documents})
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve documents', 'details': str(e)}), 500


@chat_bp.route('/documents/user/all', methods=['GET'])
def list_user_documents():
    """Retrieve all documents uploaded by the current user across all sessions"""
    if 'user' not in session:
        return jsonify({'documents': []})
    
    user = session['user']
    if user.get('auth_type') != 'google':
        return jsonify({'documents': []})
    
    try:
        user_id = user.get('email') or user.get('sub')
        from services.db_service import get_documents_for_user
        documents = get_documents_for_user(user_id)
        print(f"📄 User {user_id} has {len(documents)} documents across all sessions")
        return jsonify({'documents': documents})
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve documents', 'details': str(e)}), 500


@chat_bp.route('/document/<int:document_id>', methods=['GET'])
def get_single_document(document_id):
    """Retrieve content of a specific document by ID"""
    try:
        from services.db_service import get_document_by_id
        document = get_document_by_id(document_id)
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify({
            'id': document['id'],
            'content': document['content'],
            'filename': document.get('filename', 'Untitled'),
            'uploaded_at': document.get('created_at')
        })
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve document', 'details': str(e)}), 500


@chat_bp.route('/upload/<int:document_id>', methods=['DELETE'])
def delete_uploaded_document(document_id):
    """Delete an uploaded document for the current session"""
    payload = request.get_json(silent=True) or {}
    session_id = request.args.get('session_id') or payload.get('session_id')
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400

    try:
        deleted = delete_document(document_id, session_id=session_id)
        if not deleted:
            return jsonify({'error': 'Document not found'}), 404

        update_session_activity(session_id)
        return jsonify({'message': 'Document removed successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete document', 'details': str(e)}), 500


@chat_bp.route('/upload/by-name/<path:filename>', methods=['DELETE'])
def delete_document_by_name(filename):
    """Delete all chunks of a document by base filename"""
    payload = request.get_json(silent=True) or {}
    session_id = request.args.get('session_id') or payload.get('session_id')
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400

    try:
        from services.db_service import delete_documents_by_pattern
        print(f"🗑️ Attempting to delete document: {filename} from session: {session_id}")
        deleted_count = delete_documents_by_pattern(filename, session_id)
        
        if deleted_count == 0:
            print(f"⚠️ Document not found: {filename}")
            return jsonify({'error': 'Document not found'}), 404

        print(f"✓ Deleted {deleted_count} chunk(s) of {filename}")
        update_session_activity(session_id)
        return jsonify({
            'message': f'Removed {deleted_count} chunk(s) successfully',
            'deleted_count': deleted_count
        })
    except Exception as e:
        print(f"❌ Error deleting document: {e}")
        return jsonify({'error': 'Failed to delete document', 'details': str(e)}), 500


@chat_bp.route('/session/<session_id>', methods=['PUT'])
def rename_session(session_id):
    """Rename a session"""
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': 'No title provided'}), 400
    
    title = data['title'].strip()
    if not title:
        return jsonify({'error': 'Title cannot be empty'}), 400
    
    try:
        # Verify ownership
        user_id = None
        if 'user' in session:
            user_id = session['user'].get('email') or session['user'].get('sub')
        
        update_session_title(session_id, title)
        return jsonify({'message': 'Session renamed successfully', 'title': title})
    except Exception as e:
        return jsonify({'error': 'Failed to rename session', 'details': str(e)}), 500


@chat_bp.route('/session/<session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    """Delete a session and all its data"""
    try:
        user_id = None
        if 'user' in session:
            user_id = session['user'].get('email') or session['user'].get('sub')
        
        deleted = delete_session(session_id, user_id=user_id)
        if not deleted:
            return jsonify({'error': 'Session not found or unauthorized'}), 404
        
        return jsonify({'message': 'Session deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete session', 'details': str(e)}), 500


@chat_bp.route('/upload/image', methods=['POST'])
def upload_image():
    """Handle image uploads for vision analysis"""
    file = request.files.get('file')
    session_id = request.form.get('session_id')
    
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400
    
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400
    
    # Validate image format
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}
    filename = secure_filename(file.filename)
    file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if file_ext not in allowed_extensions:
        return jsonify({'error': f'Unsupported format. Allowed: {", ".join(allowed_extensions)}'}), 400
    
    try:
        # Read image and convert to base64
        image_bytes = file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Determine mime type
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp'
        }
        mime_type = mime_types.get(file_ext, 'image/jpeg')
        
        # Create data URL for vision model
        image_data_url = f"data:{mime_type};base64,{image_base64}"
        
        return jsonify({
            'id': str(uuid.uuid4()),
            'url': image_data_url,
            'filename': filename,
            'size': len(image_bytes)
        })
    except Exception as e:
        return jsonify({'error': 'Failed to process image', 'details': str(e)}), 500


@chat_bp.route('/file/<filename>', methods=['GET'])
def serve_uploaded_file(filename):
    """Serve the original uploaded file for viewing/download"""
    try:
        from flask import send_from_directory
        return send_from_directory(Config.UPLOAD_FOLDER, filename, as_attachment=False)
    except Exception as e:
        return jsonify({'error': 'File not found', 'details': str(e)}), 404

