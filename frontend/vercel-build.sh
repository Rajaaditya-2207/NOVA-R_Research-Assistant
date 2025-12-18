#!/bin/bash
# Vercel build script for frontend

echo "Current directory: $(pwd)"
echo "Building frontend with Vite (skipping TypeScript check)..."

# Ensure we're in the frontend directory
cd "$(dirname "$0")" || exit 1
echo "Changed to: $(pwd)"

npx vite build

echo "Build complete!"
