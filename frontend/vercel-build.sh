#!/bin/bash
# Vercel build script for frontend

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Build complete!"
