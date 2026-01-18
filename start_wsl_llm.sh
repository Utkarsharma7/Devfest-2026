#!/bin/bash
# Script to start LLM Scripts server in WSL
# Make sure Ollama is running first!

echo "Starting LLM Scripts Server in WSL..."
echo "Make sure Ollama is running!"
echo ""

# Check if Ollama is accessible
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Warning: 'ollama' command not found"
    echo "Make sure you've set up the Ollama wrapper or installed Ollama in WSL"
    echo ""
fi

# Check if Ollama is responding
if ollama list &> /dev/null; then
    echo "✅ Ollama is accessible"
else
    echo "⚠️  Warning: Ollama might not be running"
    echo "If using Windows Ollama, make sure it's running in Windows"
    echo "If using WSL Ollama, run 'ollama serve' in another terminal"
    echo ""
fi

cd llm-scripts
echo "Starting server on http://localhost:8001"
python app.py
