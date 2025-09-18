from flask import Blueprint, redirect, url_for, session
from authlib.integrations.flask_client import OAuth
from config import Config

auth_bp = Blueprint("auth", __name__)
oauth = OAuth()
google = oauth.register(
    name="google",
    client_id=Config.GOOGLE_CLIENT_ID,
    client_secret=Config.GOOGLE_CLIENT_SECRET,
    server_metadata_url=Config.GOOGLE_DISCOVERY_URL,
    client_kwargs={"scope": "openid email profile"}
)

@auth_bp.route("/login")
def login():
    redirect_uri = url_for("auth.callback", _external=True)
    return google.authorize_redirect(redirect_uri)

@auth_bp.route("/callback")
def callback():
    token = google.authorize_access_token()
    session["user"] = token["userinfo"]
    return redirect(url_for("chat.chat_ui"))

@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))
