"""
Vercel serverless handler for Flask app
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app

# Create and export the Flask app for Vercel
app = create_app()
