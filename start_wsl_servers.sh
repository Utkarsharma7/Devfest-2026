#!/bin/bash
# Script to start WSL servers (Ollama + LLM Scripts)

echo "========================================"
echo "Starting WSL Servers"
echo "========================================"
echo.

# Start Ollama
echo "[1/2] Starting Ollama Server..."
cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts
chmod +x start_ollama_wsl.sh
./start_ollama_wsl.sh

# Wait for Ollama to be ready
sleep 5

# Check if llama3.1 is installed
if ! ollama list | grep -q "llama3.1"; then
    echo "Installing llama3.1 model (this may take a while)..."
    ollama pull llama3.1
fi

# Start LLM Scripts server
echo "[2/2] Starting LLM Scripts Server..."
chmod +x start_llm_server.sh
./start_llm_server.sh
