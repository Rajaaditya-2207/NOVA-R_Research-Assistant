#!/usr/bin/env python3
"""
Setup script for NOVA-R production deployment with free services
"""
import secrets
import sys

def generate_secret_key():
    """Generate a secure secret key"""
    return secrets.token_hex(32)

def print_vercel_env_vars():
    """Print all environment variables for Vercel"""
    secret_key = generate_secret_key()
    
    print("\n" + "="*80)
    print("🚀 NOVA-R Production Environment Variables for Vercel")
    print("="*80)
    print("\n📋 Copy these to Vercel Dashboard → Settings → Environment Variables\n")
    
    print("# Backend Variables (Available to server-side code)")
    print("-" * 80)
    print(f"FLASK_ENV=production")
    print(f"FLASK_SECRET_KEY={secret_key}")
    print(f"")
    print(f"# Database - Get FREE PostgreSQL from https://neon.tech")
    print(f"DATABASE_URL=postgresql://user:password@host.neon.tech/neondb")
    print(f"")
    print(f"# Google OAuth")
    print(f"GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com")
    print(f"GOOGLE_CLIENT_SECRET=your-google-client-secret")
    print(f"AUTH_REQUIRED=false")
    print(f"")
    print(f"# NVIDIA API Keys")
    print(f"NVIDIA_TEXT_API_KEY=your-nvidia-text-api-key")
    print(f"NVIDIA_VISION_API_KEY=your-nvidia-vision-api-key")
    print(f"NVIDIA_EMBED_API_KEY=your-nvidia-embed-api-key")
    print(f"NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1")
    print(f"")
    print(f"# AI Models")
    print(f"LLM_MODEL=nvidia/llama-3.1-nemotron-ultra-253b-v1")
    print(f"VISION_MODEL=meta/llama-3.2-90b-vision-instruct")
    print(f"EMBEDDING_MODEL=nvidia/nv-embedqa-mistral-7b-v2")
    print(f"RAG_TOP_K=4")
    print(f"")
    print(f"# URLs - UPDATE WITH YOUR ACTUAL VERCEL URL")
    print(f"PRODUCTION_URL=https://nova-r-research-assistant.vercel.app")
    print(f"FRONTEND_URL=https://nova-r-research-assistant.vercel.app")
    print(f"")
    print(f"# Deployment settings")
    print(f"ENABLE_PERSISTENCE=true")
    print(f"ENABLE_FILE_UPLOADS=false  # Disable file uploads for stateless deployment")
    print(f"")
    
    print("\n# Frontend Variables (VITE_ prefix - exposed to browser)")
    print("-" * 80)
    print(f"VITE_API_BASE_URL=https://YOUR-BACKEND-URL.vercel.app")
    
    print("\n" + "="*80)
    print("📝 Next Steps:")
    print("="*80)
    print("\n1. Sign up for FREE Neon PostgreSQL at https://neon.tech")
    print("   - Create a new project")
    print("   - Copy the connection string")
    print("   - Replace DATABASE_URL above with your connection string")
    print("\n2. Update Google OAuth redirect URIs:")
    print("   - Go to https://console.cloud.google.com/apis/credentials")
    print("   - Add: https://YOUR-BACKEND-URL.vercel.app/auth/callback/google")
    print("\n3. Add all environment variables to Vercel:")
    print("   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables")
    print("   - Add each variable above")
    print("\n4. Deploy!")
    print("   - Push to GitHub")
    print("   - Vercel will auto-deploy")
    print("\n" + "="*80)
    print("✅ Your SECRET_KEY has been generated securely")
    print("="*80 + "\n")

if __name__ == "__main__":
    print_vercel_env_vars()
