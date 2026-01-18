#!/bin/bash
# Script to start LLM Scripts server in WSL

echo "Starting LLM Scripts Server..."

cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts

# Activate virtual environment
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    pip install ollama
else
    source .venv/bin/activate
fi

# Check if ollama package is installed
if ! python -c "import ollama" 2>/dev/null; then
    echo "Installing ollama package..."
    pip install ollama
fi

# Check if Ollama server is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama server is not running!"
    echo "Starting Ollama server..."
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 5
fi

# Check if llama3.1 model is installed
if ! ollama list | grep -q "llama3.1"; then
    echo "⚠️  llama3.1 model not found. Installing..."
    ollama pull llama3.1
fi

# Kill any existing process on port 8001
PID=$(lsof -ti:8001 2>/dev/null || echo "")
if [ ! -z "$PID" ]; then
    echo "⚠️  Port 8001 is already in use (PID: $PID). Killing it..."
    kill -9 $PID 2>/dev/null
    sleep 2
fi

echo "✅ Starting LLM Scripts server on port 8001..."
python app.py
