"""
Vercel serverless handler for Flask app
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# Vercel expects a variable named 'app' or a handler function
def handler(request, context):
    return app(request.environ, context)
