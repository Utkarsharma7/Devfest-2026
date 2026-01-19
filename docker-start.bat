@echo off
REM ============================================
REM Devfest-2026 Docker Startup Script (Windows)
REM ============================================

echo ==========================================
echo   Devfest-2026 Docker Deployment
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo X Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check for .env file
if not exist .env (
    echo Warning: No .env file found. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo Please edit .env file with your API keys before continuing.
        pause
        exit /b 1
    )
)

REM Parse command line arguments
set ACTION=%1
if "%ACTION%"=="" set ACTION=up

if "%ACTION%"=="build" goto build
if "%ACTION%"=="up" goto up
if "%ACTION%"=="down" goto down
if "%ACTION%"=="logs" goto logs
if "%ACTION%"=="restart" goto restart
if "%ACTION%"=="pull-model" goto pullmodel
if "%ACTION%"=="status" goto status
if "%ACTION%"=="clean" goto clean
goto help

:build
echo Building all containers...
docker-compose build --no-cache
goto end

:up
echo Starting all services...
docker-compose up -d
echo.
echo All services started!
echo.
echo Service Status:
docker-compose ps
echo.
echo Access your application:
echo    Frontend:         http://localhost:3000
echo    LinkedIn Scraper: http://localhost:8000
echo    LLM Scripts:      http://localhost:8001
echo    GitHub Matcher:   http://localhost:8002
echo    OCR Server:       http://localhost:8003
echo    Ollama:           http://localhost:11434
goto end

:down
echo Stopping all services...
docker-compose down
echo All services stopped.
goto end

:logs
echo Showing logs... Press Ctrl+C to exit.
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:restart
echo Restarting all services...
docker-compose restart
goto end

:pullmodel
echo Pulling Ollama model llama3.1...
docker-compose exec ollama ollama pull llama3.1
echo Model pulled successfully!
goto end

:status
docker-compose ps
goto end

:clean
echo Cleaning up containers, images, and volumes...
docker-compose down -v --rmi all
echo Cleanup complete.
goto end

:help
echo Usage: docker-start.bat [command]
echo.
echo Commands:
echo   build       - Build all Docker images
echo   up          - Start all services (default)
echo   down        - Stop all services
echo   logs [svc]  - View logs (optionally for specific service)
echo   restart     - Restart all services
echo   pull-model  - Pull the Ollama LLM model
echo   status      - Show service status
echo   clean       - Remove all containers, images, and volumes
goto end

:end
echo.
pause
