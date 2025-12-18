#!/bin/bash
# Vercel build script for frontend

echo "Building frontend with Vite (skipping TypeScript check)..."
npx vite build

echo "Build complete!"
