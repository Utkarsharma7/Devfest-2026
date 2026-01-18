from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from keywords import keywords_from_profile
from compare import compare_profiles
from filters import filters
import asyncio
from concurrent.futures import ThreadPoolExecutor
import signal

app = FastAPI(
    title="LLM Scripts API",
    description="API for LLM operations using Ollama",
    version="1.0.0"
)

# Allow all origins for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint - shows server status and available endpoints"""
    return {
        "status": "running",
        "message": "LLM Scripts API is running",
        "endpoints": {
            "keywords": "POST /keywords - Extract keywords from user profile",
            "compare": "POST /compare - Compare two profiles",
            "filters": "POST /filters - Generate filters from user profile",
            "docs": "GET /docs - Interactive API documentation"
        },
        "server": "http://localhost:8001"
    }


# Thread pool for running blocking Ollama calls
executor = ThreadPoolExecutor(max_workers=2)

@app.post("/keywords")
async def keywords_api(user_profile: dict):
    try:
        print(f"[KEYWORDS API] Received request with profile: {user_profile}")
        
        # Run the blocking Ollama call in a thread pool with timeout
        loop = asyncio.get_event_loop()
        try:
            # Set timeout to 120 seconds (Ollama can be slow, especially on first use)
            keywords = await asyncio.wait_for(
                loop.run_in_executor(executor, keywords_from_profile, user_profile),
                timeout=120.0
            )
            print(f"[KEYWORDS API] Generated keywords: {keywords}")
            return {"keywords": keywords}
        except asyncio.TimeoutError:
            print(f"[KEYWORDS API] Timeout after 120 seconds - Ollama is taking too long")
            # Return fallback keywords based on user profile
            fallback_keywords = []
            # Try to extract keywords from skills field first
            if user_profile.get("skills"):
                skills = user_profile["skills"].strip().replace("\n", " ").lower()
                # Extract common tech terms
                tech_terms = ["python", "javascript", "react", "java", "c++", "machine learning", "web development", "cloud", "devops"]
                for term in tech_terms:
                    if term in skills:
                        fallback_keywords.append(term)
            # Fallback to domain if available
            if not fallback_keywords and user_profile.get("domain"):
                domain = user_profile["domain"].strip().replace("\n", " ").split()[0] if user_profile["domain"] else ""
                if domain:
                    fallback_keywords = [domain]
            # Fallback to first word from goal
            if not fallback_keywords and user_profile.get("goal"):
                goal_words = user_profile["goal"].strip().split()[:2] if user_profile["goal"] else []
                fallback_keywords = goal_words if goal_words else []
            if not fallback_keywords:
                fallback_keywords = ["developer", "software engineer"]
            
            print(f"[KEYWORDS API] Returning fallback keywords: {fallback_keywords}")
            return {"keywords": fallback_keywords}
    except Exception as e:
        print(f"[KEYWORDS API] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return fallback keywords on error
        fallback_keywords = []
        # Try to extract keywords from skills field first
        if user_profile.get("skills"):
            skills = user_profile["skills"].strip().replace("\n", " ").lower()
            # Extract common tech terms
            tech_terms = ["python", "javascript", "react", "java", "c++", "machine learning", "web development", "cloud", "devops"]
            for term in tech_terms:
                if term in skills:
                    fallback_keywords.append(term)
        # Fallback to domain if available
        if not fallback_keywords and user_profile.get("domain"):
            domain = user_profile["domain"].strip().replace("\n", " ").split()[0] if user_profile["domain"] else ""
            if domain:
                fallback_keywords = [domain]
        # Fallback to first words from goal
        if not fallback_keywords and user_profile.get("goal"):
            goal_words = user_profile["goal"].strip().split()[:2] if user_profile["goal"] else []
            fallback_keywords = goal_words if goal_words else []
        if not fallback_keywords:
            fallback_keywords = ["developer", "software engineer"]
        return {"keywords": fallback_keywords}


@app.post("/compare")
def compare_api(payload: dict):
    return compare_profiles(payload["user"], payload["candidate"])


@app.post("/filters")
def filters_api(user_profile: dict):
    return filters(user_profile)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
