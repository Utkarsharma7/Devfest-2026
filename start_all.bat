@echo off
echo ========================================
echo Starting All Servers for Devfest-2026
echo ========================================
echo.

echo [1/7] Installing dependencies...
echo   - LinkedIn Scraper...
cd linkedin_scraper
pip install -r requirements.txt >nul 2>&1
cd ..
echo   - LLM Scripts OCR dependencies...
pip install easyocr PyMuPDF pillow numpy fastapi uvicorn python-multipart >nul 2>&1
echo   - Done!
timeout /t 2 /nobreak >nul

echo [2/7] Starting Ollama Server in WSL...
wsl bash -c "cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && chmod +x start_ollama_wsl.sh && ./start_ollama_wsl.sh"
timeout /t 5 /nobreak >nul

echo [3/7] Starting LLM Scripts Server on port 8001 in WSL...
start "LLM Scripts - 8001" cmd /k "wsl bash -c \"cd /mnt/c/Users/utkar/OneDrive/Desktop/Devfest-2026/llm-scripts && source .venv/bin/activate && python app.py\""
timeout /t 5 /nobreak >nul

echo [4/7] Starting OCR Server on port 8003 on Windows...
start "OCR Server - 8003" cmd /k "cd /d %~dp0llm-scripts && uvicorn app2:app --host 0.0.0.0 --port 8003 --reload"
timeout /t 3 /nobreak >nul

echo [5/7] Starting LinkedIn Scraper Server on port 8000 on Windows...
start "LinkedIn Scraper - 8000" cmd /k "cd /d %~dp0linkedin_scraper && python server.py"
timeout /t 3 /nobreak >nul

echo [6/7] Starting GitHub Matcher Server on port 8002 on Windows...
start "GitHub Matcher - 8002" cmd /k "cd /d %~dp0llmGitHub && python app.py"
timeout /t 3 /nobreak >nul

echo [7/7] Starting Frontend on port 3000 on Windows...
start "Frontend - 3000" cmd /k "cd /d %~dp0my-app && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All servers are starting!
echo ========================================
echo.
echo Servers:
echo   Ollama:           http://localhost:11434  WSL
echo   LLM Scripts:      http://localhost:8001   WSL
echo   OCR Server:       http://localhost:8003   Windows
echo   LinkedIn Scraper: http://localhost:8000   Windows
echo   GitHub Matcher:   http://localhost:8002   Windows
echo   Frontend:         http://localhost:3000   Windows
echo.
echo OCR Endpoints:
echo   POST /ocr/pdf   - Extract text from PDF
echo   POST /ocr/image - Extract text from image
echo.
echo Press any key to exit this window...
pause >nul
