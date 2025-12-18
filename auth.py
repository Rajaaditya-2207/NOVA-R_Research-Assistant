"""
Authentication module for NOVA-R
Handles Google OAuth 2.0 and trial/free mode
"""
import json
import os
from flask import Blueprint, redirect, request, session, jsonify, url_for
from authlib.integrations.flask_client import OAuth
from config import Config

auth_bp = Blueprint('auth', __name__)
oauth = OAuth()
google = None


def init_oauth(app):
    """Initialize OAuth with Google provider"""
    global google
    
    if not Config.GOOGLE_CLIENT_ID or not Config.GOOGLE_CLIENT_SECRET:
        print("⚠ Google OAuth credentials not configured")
        return False
    
    oauth.init_app(app)
    
    # Register Google OAuth provider
    google = oauth.register(
        name='google',
        client_id=Config.GOOGLE_CLIENT_ID,
        client_secret=Config.GOOGLE_CLIENT_SECRET,
        server_metadata_url=Config.GOOGLE_DISCOVERY_URL,
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    
    return True


@auth_bp.route('/login/google')
def google_login():
    """Initiate Google OAuth flow"""
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    
    # Store redirect URL if provided
    redirect_after = request.args.get('redirect', '/')
    session['auth_redirect'] = redirect_after
    
    # Generate OAuth redirect with explicit callback URL
    # This ensures the redirect_uri matches what's registered in Google Console
    redirect_uri = url_for('auth.google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)


@auth_bp.route('/callback/google')
def google_callback():
    """Handle Google OAuth callback"""
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    
    try:
        # Get OAuth token
        token = google.authorize_access_token()
        
        # Get user info from Google
        user_info = token.get('userinfo')
        
        if not user_info:
            return jsonify({'error': 'Failed to get user info from Google'}), 400
        
        # Store user in session
        session['user'] = {
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'picture': user_info.get('picture'),
            'sub': user_info.get('sub'),  # Google user ID
            'auth_type': 'google'
        }
        session.permanent = True
        
        print(f"✅ User authenticated: {user_info.get('email')}")
        print(f"📦 Session created with user data")
        
        # Get frontend URL from environment or use default
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        redirect_path = session.pop('auth_redirect', '/chat')
        
        # Return a success page that closes the popup window and redirects parent
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Successful</title>
</head>
<body style="font-family: system-ui; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center;">
    <div>
        <h1 style="font-size: 3em; margin-bottom: 20px;">✓</h1>
        <h2>Authentication Successful!</h2>
        <p style="margin: 20px 0; font-size: 1.2em;">Redirecting...</p>
    </div>
    <script>
        console.log('OAuth successful, closing popup window...');
        
        // Notify parent window if this is a popup
        if (window.opener && !window.opener.closed) {{
            try {{
                window.opener.postMessage({{ type: 'oauth-success' }}, '{frontend_url}');
                // Redirect parent window to chat page
                window.opener.location.href = '{frontend_url}{redirect_path}';
            }} catch (e) {{
                console.error('Could not notify parent window:', e);
            }}
        }} else {{
            // Not a popup - redirect this window
            window.location.href = '{frontend_url}{redirect_path}';
        }}
        
        // Close this window after a short delay if it's a popup
        setTimeout(function() {{
            if (window.opener) {{
                window.close();
            }}
        }}, 500);
    </script>
</body>
</html>"""
        
        from flask import Response
        response = Response(html, mimetype='text/html', status=200)
        return response
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return jsonify({'error': 'Authentication failed', 'details': str(e)}), 400


@auth_bp.route('/trial/start', methods=['POST'])
def start_trial():
    """Start a trial session without authentication"""
    try:
        data = request.get_json() or {}
        name = data.get('name', 'Guest User')
        
        print(f"🔍 Trial start requested for: {name}")  # Debug log
        
        # Create trial session
        session['user'] = {
            'email': None,
            'name': name,
            'picture': None,
            'sub': f"trial_{session.get('_id', 'unknown')}",
            'auth_type': 'trial'
        }
        session.permanent = False  # Trial sessions expire when browser closes
        
        print(f"✅ Trial session created: {session['user']}")  # Debug log
        
        return jsonify({
            'success': True,
            'user': session['user']
        })
        
    except Exception as e:
        print(f"❌ Trial start error: {e}")
        return jsonify({'error': 'Failed to start trial', 'details': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Log out the current user"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.route('/status')
def auth_status():
    """Check current authentication status"""
    user = session.get('user')
    
    return jsonify({
        'authenticated': user is not None,
        'user': user,
        'auth_required': Config.AUTH_REQUIRED
    })


@auth_bp.route('/user')
def get_user():
    """Get current user information"""
    user = session.get('user')
    
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    return jsonify({'user': user})
