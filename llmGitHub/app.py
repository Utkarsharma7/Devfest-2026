from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Just import the orchestrator function!
from main_matcher import find_profiles_for_me

app = FastAPI(title="GitHub AI Matcher", version="1.0")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PYDANTIC MODELS (Documentation) ---
class Candidate(BaseModel):
    rank: int
    username: str
    name: str
    url: str
    avatar_url: Optional[str] = None
    score: int
    reason: str
    pitch: str


class MatchResponse(BaseModel):
    status: str
    analyzed_user: str
    keywords: List[str]
    matches: List[Candidate]


# --- ENDPOINTS ---
@app.get("/")
def home():
    return {"message": "GitHub Matcher API is Running 🚀"}


@app.get("/match/{username}", response_model=MatchResponse)
def get_matches(username: str):
    """
    Main endpoint. Calls the orchestrator in matcher.py
    """
    result = find_profiles_for_me(username)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# Run with: uvicorn app:app --reload
