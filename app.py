import os
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask_session import Session
from config import Config
from services.db_service import init_db


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)

    # Ensure upload folder exists (skip in production/serverless)
    if not app.config.get('IS_PRODUCTION'):
        upload_folder = app.config.get("UPLOAD_FOLDER", "uploads")
        try:
            os.makedirs(upload_folder, exist_ok=True)
        except Exception:
            pass

    # Initialize server-side sessions (only for filesystem in development)
    if app.config.get('SESSION_TYPE') != 'null':
        Session(app)

    # Initialize database (creates tables if they don't exist)
    try:
        init_db()
    except Exception as e:
        print("DB init failed:", e)

    # Initialize OAuth if configured
    from auth import init_oauth
    oauth_enabled = init_oauth(app)
    if oauth_enabled:
        print("✓ Google OAuth initialized")
    else:
        print("ℹ Google OAuth not configured (running in free mode)")

    # Register blueprints FIRST
    from chat.routes import chat_bp
    from auth import auth_bp
    app.register_blueprint(chat_bp, url_prefix="/chat")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    
    # Enable CORS AFTER blueprints for frontend communication
    # Add your production domain when deployed (e.g., "https://your-app.vercel.app")
    allowed_origins = [
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ]
    
    # Add production URL from environment variable
    production_url = os.getenv("PRODUCTION_URL")
    if production_url:
        allowed_origins.append(production_url)
    
    CORS(app, 
         supports_credentials=True,  # CRITICAL for session cookies
         origins=allowed_origins,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"],
         expose_headers=["Content-Type"],
         max_age=3600)  # Cache preflight requests for 1 hour
    
    # Debug: Print registered routes
    print("\n📍 Registered Routes:")
    for rule in app.url_map.iter_rules():
        if 'auth' in rule.rule or 'trial' in rule.rule:
            print(f"  {rule.rule} -> {rule.methods}")
    print()

    # Serve React frontend
    @app.route('/')
    def index():
        # Check if React build exists
        react_build_path = os.path.join(app.static_folder, 'dist', 'index.html')
        if os.path.exists(react_build_path):
            return send_from_directory(os.path.join(app.static_folder, 'dist'), 'index.html')
        else:
            return "React build not found. Please run 'npm run build' in the frontend directory."
    
    @app.route('/<path:filename>')
    def serve_react_app(filename):
        # First check for React static files
        react_dist_path = os.path.join(app.static_folder, 'dist')
        
        # Serve assets directly
        if filename.startswith('assets/'):
            asset_path = os.path.join(react_dist_path, filename)
            if os.path.exists(asset_path):
                return send_from_directory(react_dist_path, filename)
        
        # For React routing (non-API routes), serve index.html
        if not filename.startswith('api/') and not filename.startswith('chat/'):
            react_index_path = os.path.join(react_dist_path, 'index.html')
            if os.path.exists(react_index_path):
                return send_from_directory(react_dist_path, 'index.html')
        
        # Fallback to Flask static files
        try:
            return send_from_directory(app.static_folder, filename)
        except:
            return "File not found", 404

    return app


# Create app instance for both development and Vercel deployment
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
