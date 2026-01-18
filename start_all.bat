@echo off
echo ========================================
echo Starting All Servers for Devfest-2026
echo ========================================
echo.

echo [1/5] Installing LinkedIn Scraper dependencies...
cd linkedin_scraper
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo Warning: Some dependencies may not have installed. Continuing...
)
cd ..
timeout /t 2 /nobreak >nul

echo [2/5] Starting Ollama Server (WSL)...
wsl bash -c "cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && chmod +x start_ollama_wsl.sh && ./start_ollama_wsl.sh"
timeout /t 5 /nobreak >nul

echo [3/5] Starting LLM Scripts Server (WSL) on port 8001...
start "LLM Scripts Server" cmd /k "wsl bash -c \"cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && source .venv/bin/activate && python app.py\""
timeout /t 5 /nobreak >nul

echo [4/5] Starting LinkedIn Scraper Server (Windows) on port 8000...
start "LinkedIn Scraper" cmd /k "cd /d %~dp0linkedin_scraper && python server.py"
timeout /t 3 /nobreak >nul

echo [5/5] Starting GitHub Matcher Server (Windows) on port 8002...
start "GitHub Matcher" cmd /k "cd /d %~dp0llmGitHub && python app.py"
timeout /t 3 /nobreak >nul

echo [6/6] Starting Frontend (Windows) on port 3000...
start "Frontend" cmd /k "cd /d %~dp0my-app && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All servers are starting!
echo ========================================
echo.
echo Ollama Server: http://localhost:11434 (WSL)
echo LLM Scripts: http://localhost:8001 (WSL)
echo LinkedIn Scraper: http://localhost:8000 (Windows)
echo GitHub Matcher: http://localhost:8002 (Windows)
echo Frontend: http://localhost:3000 (Windows)
echo.
echo Note: Make sure all Python dependencies are installed!
echo If you see errors, run: pip install -r linkedin_scraper/requirements.txt
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
