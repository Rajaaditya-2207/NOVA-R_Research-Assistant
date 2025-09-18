from flask import Flask, render_template
from flask_session import Session
from config import Config

# Import routes
from auth.routes import auth_bp
from chat.routes import chat_bp

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)

    Session(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(chat_bp, url_prefix="/chat")

    @app.route("/")
    def home():
        return render_template("index.html")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
