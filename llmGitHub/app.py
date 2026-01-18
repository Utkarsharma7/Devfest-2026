from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random

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


@app.get("/match/{username}")
def get_matches(username: str):
    """
    Main endpoint. Calls the orchestrator in matcher.py
    """
    try:
        print(f"[GITHUB API] Received request for username: {username}")
        result = find_profiles_for_me(username)
        print(f"[GITHUB API] Result status: {result.get('status')}, matches count: {len(result.get('matches', []))}")

        if "error" in result:
            print(f"[GITHUB API] Error in result: {result['error']}")
            raise HTTPException(status_code=404, detail=result["error"])

        # Transform result to match expected format
        matches = result.get("matches", [])
        transformed_matches = []
        for idx, match in enumerate(matches, start=1):
            # Add random ±10 variation to score
            base_score = match.get("score", 70)
            if isinstance(base_score, (int, float)):
                variation = random.randint(-10, 10)
                adjusted_score = max(0, min(100, int(base_score) + variation))
            else:
                adjusted_score = random.randint(60, 90)
            
            transformed_matches.append({
                "rank": idx,
                "username": match.get("username", ""),
                "name": match.get("name", match.get("username", "")),
                "url": match.get("url", ""),
                "avatar_url": match.get("avatar_url"),
                "score": adjusted_score,
                "reason": match.get("reason", ""),
                "pitch": match.get("pitch", "")
            })

        # Return transformed response (we'll extract keywords from the function if needed)
        # For now, use empty keywords - the frontend doesn't need them
        return {
            "status": result.get("status", "success"),
            "analyzed_user": username,
            "keywords": [],  # Keywords are not needed for frontend display
            "matches": transformed_matches
        }
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        print(f"[GITHUB API] Internal error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

# Run with: uvicorn app:app --reload
