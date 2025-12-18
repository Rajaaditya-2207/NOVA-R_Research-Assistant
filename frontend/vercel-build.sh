#!/bin/bash
# Vercel build script for frontend

echo "Current directory: $(pwd)"
echo "Listing contents:"
ls -la

echo "Checking if src exists:"
ls -la src/ || echo "src directory not found!"

echo "Checking if src/main.tsx exists:"
ls -la src/main.tsx || echo "src/main.tsx not found!"

echo "Building frontend with Vite (skipping TypeScript check)..."

# Ensure we're in the frontend directory
cd "$(dirname "$0")" || exit 1
echo "Changed to: $(pwd)"

npx vite build

echo "Build complete!"
