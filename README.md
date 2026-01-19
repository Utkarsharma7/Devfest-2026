# 🚀 Devfest-2026 | Smart Networking Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)

**An AI-powered networking platform that helps you find the perfect collaborators on GitHub and LinkedIn based on your skills, goals, and resume.**

[Quick Start](#-quick-start) • [Features](#-features) • [Architecture](#-architecture) • [API Docs](#-api-endpoints)

</div>

---

## 🎯 What It Does

Upload your resume, answer a few questions about your goals, and let AI find the best people to connect with:

1. **📄 Resume Analysis** - OCR extracts skills and experience from your resume (PDF/Image)
2. **❓ Smart Questions** - Answer 5 quick questions about your networking goals
3. **🤖 AI Matching** - LLM analyzes profiles and scores them based on compatibility
4. **👥 GitHub Matches** - Find developers with similar tech stacks and interests
5. **💼 LinkedIn Matches** - Discover professionals in your target industry

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **GitHub Profile Matching** | Analyzes repos, tech stack, activity level, and collaboration signals |
| 💼 **LinkedIn People Search** | Searches professionals based on keywords from your profile |
| 📄 **Resume OCR** | Extracts text from PDF and image files using EasyOCR |
| 🧠 **AI-Powered Scoring** | Groq LLM (Llama 3.1) scores and ranks matches with personalized reasons |
| 🎨 **Modern UI** | Beautiful 3D animations, typewriter effects, and interactive cards |
| 🔥 **Real-time Updates** | Live status updates as matches are found |
| 🐳 **Docker Ready** | One command to start everything |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                      http://localhost:3000                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Landing   │  │  Questions  │  │      Matches Page       │  │
│  │    Page     │→ │    Flow     │→ │  (GitHub + LinkedIn)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    GitHub     │  │   LLM Scripts   │  │    LinkedIn     │
│    Matcher    │  │    + Keywords   │  │    Scraper      │
│  Port: 8002   │  │   Port: 8001    │  │   Port: 8000    │
└───────┬───────┘  └────────┬────────┘  └────────┬────────┘
        │                   │                    │
        │          ┌────────┴────────┐           │
        │          ▼                 ▼           │
        │   ┌───────────┐    ┌───────────┐       │
        │   │  Ollama   │    │    OCR    │       │
        │   │Port:11434 │    │Port: 8003 │       │
        │   └───────────┘    └───────────┘       │
        │                                        │
        ▼                                        ▼
┌───────────────┐                      ┌─────────────────┐
│  GitHub API   │                      │  LinkedIn Web   │
│  (Public)     │                      │  (Playwright)   │
└───────────────┘                      └─────────────────┘
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Utkarsharma7/Devfest-2026.git
cd Devfest-2026

# 2. Start all services (API keys included!)
docker-start.bat up        # Windows
./docker-start.sh up       # Linux/Mac

# 3. Pull the Ollama LLM model (first time only)
docker-start.bat pull-model

# 4. Open the app
# Navigate to http://localhost:3000
```

### Option 2: Manual Setup (Windows)

```batch
# Just run the batch script
start_all.bat
```

This starts all 6 services automatically.

---

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 3000 | Next.js 16 web application |
| **LinkedIn Scraper** | 8000 | Playwright-based LinkedIn search |
| **LLM Scripts** | 8001 | Keyword extraction using Ollama |
| **GitHub Matcher** | 8002 | GitHub profile analysis with Groq AI |
| **OCR Server** | 8003 | Resume text extraction (EasyOCR) |
| **Ollama** | 11434 | Local LLM server |

---

## 🔌 API Endpoints

### GitHub Matcher (Port 8002)
```
GET  /                    - Health check
GET  /match/{username}    - Find matches for a GitHub user
```

### LinkedIn Scraper (Port 8000)
```
GET  /                    - Health check
GET  /filter?keyword=...  - Get available search filters
POST /people              - Search people with filters
```

### LLM Scripts (Port 8001)
```
GET  /                    - Health check
GET  /docs                - Swagger API documentation
POST /keywords            - Extract keywords from user profile
POST /compare             - Compare two profiles
POST /filters             - Generate LinkedIn filters
```

### OCR Server (Port 8003)
```
POST /ocr/pdf             - Extract text from PDF
POST /ocr/image           - Extract text from image
POST /process-resume      - Process resume file
```

---

## 📁 Project Structure

```
Devfest-2026/
├── 🎨 my-app/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js           # Landing page
│   │   │   └── home/
│   │   │       ├── page.js       # Questions flow
│   │   │       └── matches/
│   │   │           └── page.js   # Results page
│   │   ├── components/
│   │   │   ├── ThreeScene.jsx    # 3D animations
│   │   │   └── ui/               # UI components
│   │   └── lib/
│   │       └── firebase/         # Firebase integration
│   ├── Dockerfile
│   └── package.json
│
├── 🔍 linkedin_scraper/          # LinkedIn Search API
│   ├── server.py                 # FastAPI server
│   ├── linkedin_scraper/
│   │   ├── scrapers/
│   │   │   └── search.py         # Search logic
│   │   └── core/
│   │       └── browser.py        # Playwright browser
│   ├── linkedin_session.json     # Login session (required)
│   ├── Dockerfile
│   └── requirements.txt
│
├── 🧠 llm-scripts/               # LLM Operations
│   ├── app.py                    # Main API server
│   ├── app2.py                   # OCR server
│   ├── keywords.py               # Keyword extraction
│   ├── filters.py                # Filter generation
│   ├── ocr.py                    # OCR utilities
│   ├── Dockerfile
│   ├── Dockerfile.ocr
│   └── requirements.txt
│
├── 🐙 llmGitHub/                 # GitHub Matcher
│   ├── app.py                    # FastAPI server
│   ├── main_matcher.py           # Matching orchestrator
│   ├── agent.py                  # AI agent with Groq
│   ├── github_tools.py           # GitHub API tools
│   ├── Dockerfile
│   └── requirements.txt
│
├── 🐳 Docker Files
│   ├── docker-compose.yml        # Production compose
│   ├── docker-compose.dev.yml    # Development compose
│   ├── docker-start.bat          # Windows startup
│   ├── docker-start.sh           # Linux/Mac startup
│   └── .dockerignore
│
├── 📜 Other Files
│   ├── start_all.bat             # Windows manual startup
│   ├── QUICK_START.txt           # Quick reference
│   ├── SETUP_GUIDE.md            # Detailed setup guide
│   └── env.example               # Environment template
│
└── README.md                     # You are here!
```

---

## 🛠 Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **Three.js** - 3D animations
- **GSAP** - Animation library
- **Firebase** - Authentication & Firestore

### Backend
- **FastAPI** - Python web framework
- **Playwright** - Browser automation for LinkedIn
- **Groq API** - Fast LLM inference (Llama 3.1 70B)
- **Ollama** - Local LLM server
- **EasyOCR** - Text extraction from images
- **PyMuPDF** - PDF processing

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Uvicorn** - ASGI server

---

## 🎮 How It Works

### 1. Landing Page
User uploads their resume (PDF/image) which is processed by OCR to extract skills and experience.

### 2. Questions Flow
User answers 5 questions:
- What's your networking goal?
- What are your technical skills?
- What projects are you working on?
- What type of connections are you looking for?
- What kind of engagement do you prefer?

### 3. AI Processing
- **Keywords extracted** from answers using Ollama LLM
- **GitHub search** runs in background immediately
- **LinkedIn search** runs after questions complete

### 4. GitHub Matching
1. Searches GitHub for users with similar keywords
2. Analyzes each profile's repos, languages, activity
3. Scores based on: Tech Stack (35%), Activity (25%), Project Relevance (25%), Collaboration (15%)
4. Returns top 10 matches with personalized pitches

### 5. LinkedIn Matching
1. Searches LinkedIn with extracted keywords
2. Returns relevant professionals
3. Assigns compatibility scores

### 6. Results Page
Displays all matches with:
- Profile picture
- Name and headline
- Compatibility score (%)
- Hover for detailed pitch
- Click to open their profile

---

## 🐳 Docker Commands

```bash
# Build all images
docker-start.bat build

# Start all services
docker-start.bat up

# Stop all services
docker-start.bat down

# View logs
docker-start.bat logs
docker-start.bat logs frontend    # Specific service

# Pull Ollama model
docker-start.bat pull-model

# Check status
docker-start.bat status

# Clean up everything
docker-start.bat clean
```

---

## 🔧 Troubleshooting

### Docker not starting?
```bash
# Make sure Docker Desktop is running
docker info
```

### LinkedIn not working?
LinkedIn requires an authenticated session:
```bash
cd linkedin_scraper
python samples/create_session.py
```
Then login manually and the session will be saved.

### Ollama model not found?
```bash
docker-start.bat pull-model
# Or manually:
docker exec devfest-ollama ollama pull llama3.1
```

### Port already in use?
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <pid> /F
```

---

## 📊 Performance

- **GitHub Analysis**: ~20 profiles analyzed, top 10 returned
- **LinkedIn Search**: Keyword-based search
- **Response Time**: 
  - GitHub: 30-60 seconds (depends on API rate limits)
  - LinkedIn: 10-30 seconds
  - OCR: 2-5 seconds

---

## 🔐 Security Notes

- LinkedIn session file contains authentication cookies - keep it secure
- Groq API key is included for demo purposes
- For production, use environment variables

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project was created for **Devfest 2026**.

---

<div align="center">

**Built with ❤️ for Devfest 2026**

[⬆ Back to Top](#-devfest-2026--smart-networking-platform)

</div>
