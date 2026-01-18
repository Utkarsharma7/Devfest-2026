#!/bin/bash
# Script to start Ollama in WSL

echo "Starting Ollama server in WSL..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed in WSL"
    echo "Install it with: curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
fi

# Check if Ollama is already running
if netstat -tuln 2>/dev/null | grep -q 11434 || ss -tuln 2>/dev/null | grep -q 11434; then
    echo "⚠️  Port 11434 is already in use"
    echo "Checking if it's Ollama..."
    if ps aux | grep -q "[o]llama serve"; then
        echo "✅ Ollama is already running"
        exit 0
    else
        echo "❌ Port 11434 is used by something else"
        exit 1
    fi
fi

# Start Ollama in background
echo "Starting Ollama server..."
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!

# Wait a bit for it to start
sleep 3

# Check if it's running
if ps -p $OLLAMA_PID > /dev/null; then
    echo "✅ Ollama started successfully (PID: $OLLAMA_PID)"
    echo "   Logs: /tmp/ollama.log"
    
    # Test connection
    echo "Testing connection..."
    sleep 2
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "✅ Ollama is responding!"
    else
        echo "⚠️  Ollama started but not responding yet. Wait a few seconds."
    fi
else
    echo "❌ Failed to start Ollama"
    echo "Check logs: /tmp/ollama.log"
    exit 1
fi
