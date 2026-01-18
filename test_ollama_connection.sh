#!/bin/bash

echo "=== Testing Ollama Connection ==="
echo ""

echo "1. Checking what's using port 11434:"
netstat -tuln | grep 11434 || ss -tuln | grep 11434

echo ""
echo "2. Testing curl to localhost:11434:"
curl -s http://localhost:11434/api/tags || echo "❌ Failed to connect"

echo ""
echo "3. Testing with explicit host:"
curl -s http://127.0.0.1:11434/api/tags || echo "❌ Failed to connect"

echo ""
echo "4. Checking if ollama process is running:"
ps aux | grep ollama | grep -v grep || echo "No ollama process found"

echo ""
echo "5. Testing Python connection with explicit host:"
cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts
source .venv/bin/activate
python -c "import ollama; client = ollama.Client(host='http://localhost:11434'); print('✅ Connected:', client.list())" 2>&1
