#!/bin/bash
# ============================================
# Devfest-2026 Docker Startup Script
# ============================================

set -e

echo "=========================================="
echo "  Devfest-2026 Docker Deployment"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Please edit .env file with your API keys before continuing."
        exit 1
    fi
fi

# Parse command line arguments
ACTION=${1:-up}

case $ACTION in
    build)
        echo "🔨 Building all containers..."
        docker-compose build --no-cache
        ;;
    up)
        echo "🚀 Starting all services..."
        docker-compose up -d
        echo ""
        echo "✅ All services started!"
        echo ""
        echo "📊 Service Status:"
        docker-compose ps
        echo ""
        echo "🌐 Access your application:"
        echo "   Frontend:         http://localhost:3000"
        echo "   LinkedIn Scraper: http://localhost:8000"
        echo "   LLM Scripts:      http://localhost:8001"
        echo "   GitHub Matcher:   http://localhost:8002"
        echo "   OCR Server:       http://localhost:8003"
        echo "   Ollama:           http://localhost:11434"
        ;;
    down)
        echo "🛑 Stopping all services..."
        docker-compose down
        echo "✅ All services stopped."
        ;;
    logs)
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$SERVICE"
        fi
        ;;
    restart)
        echo "🔄 Restarting all services..."
        docker-compose restart
        ;;
    pull-model)
        echo "📥 Pulling Ollama model (llama3.1)..."
        docker-compose exec ollama ollama pull llama3.1
        echo "✅ Model pulled successfully!"
        ;;
    status)
        docker-compose ps
        ;;
    clean)
        echo "🧹 Cleaning up containers, images, and volumes..."
        docker-compose down -v --rmi all
        echo "✅ Cleanup complete."
        ;;
    *)
        echo "Usage: $0 {build|up|down|logs|restart|pull-model|status|clean}"
        echo ""
        echo "Commands:"
        echo "  build       - Build all Docker images"
        echo "  up          - Start all services"
        echo "  down        - Stop all services"
        echo "  logs [svc]  - View logs (optionally for specific service)"
        echo "  restart     - Restart all services"
        echo "  pull-model  - Pull the Ollama LLM model"
        echo "  status      - Show service status"
        echo "  clean       - Remove all containers, images, and volumes"
        exit 1
        ;;
esac
