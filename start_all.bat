@echo off
echo ========================================
echo Starting All Servers for Devfest-2026
echo ========================================
echo.

echo [1/6] Installing dependencies...
echo   - LinkedIn Scraper...
cd /d %~dp0linkedin_scraper
pip install -r requirements.txt >nul 2>&1
cd /d %~dp0
echo   - LLM Scripts dependencies...
pip install ollama easyocr PyMuPDF pillow numpy fastapi uvicorn python-multipart >nul 2>&1
echo   Done!
timeout /t 2 /nobreak >nul

echo [2/6] Starting Ollama in WSL background...
start "Ollama WSL" cmd /k "wsl bash -c \"ollama serve\""
timeout /t 5 /nobreak >nul

echo [3/6] Starting LLM Scripts Server on port 8001...
start "LLM Scripts - 8001" cmd /k "cd /d %~dp0llm-scripts && python app.py"
timeout /t 3 /nobreak >nul

echo [4/6] Starting OCR Server on port 8003...
start "OCR Server - 8003" cmd /k "cd /d %~dp0llm-scripts && uvicorn app2:app --host 0.0.0.0 --port 8003"
timeout /t 3 /nobreak >nul

echo [5/6] Starting LinkedIn Scraper on port 8000...
start "LinkedIn Scraper - 8000" cmd /k "cd /d %~dp0linkedin_scraper && python server.py"
timeout /t 3 /nobreak >nul

echo [6/6] Starting GitHub Matcher on port 8002...
start "GitHub Matcher - 8002" cmd /k "cd /d %~dp0llmGitHub && python app.py"
timeout /t 3 /nobreak >nul

echo [7/6] Starting Frontend on port 3000...
start "Frontend - 3000" cmd /k "cd /d %~dp0my-app && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All servers starting!
echo ========================================
echo.
echo   Port 11434 - Ollama WSL
echo   Port 8001  - LLM Scripts
echo   Port 8003  - OCR Server
echo   Port 8000  - LinkedIn Scraper
echo   Port 8002  - GitHub Matcher
echo   Port 3000  - Frontend
echo.
echo Make sure Ollama is installed in WSL: wsl ollama --version
echo If not, run: wsl curl -fsSL https://ollama.com/install.sh ^| sh
echo.
echo Press any key to exit...
pause >nul
