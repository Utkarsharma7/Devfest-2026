import os
import json
from openai import OpenAI
from github_tools import get_profile_data, get_activity_data, search_users

# --- CONFIGURATION ---
MY_API_KEY = "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"  # REPLACE WITH YOUR GROQ KEY
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=MY_API_KEY)

model_used = "llama-3.1-8b-instant"


def llm_generate_keywords(user_profile, user_activity):
    """Step 1: Ask LLM for Tech Stack & Interests."""
    print("   ...Asking LLM for Tech Stack & Interests")

    prompt = f"""
    Analyze this GitHub user to identify their core technical identity:
    - Bio: {user_profile.get("bio")}
    - Recent Activity: {json.dumps(user_activity)}
    
    TASK:
    Generate a list of 4-5 specific technical keywords representing their TECH STACK and INTERESTS.
    Focus on languages (e.g., "Rust", "Python"), frameworks (e.g., "React", "PyTorch"), or specific domains (e.g., "Machine Learning", "Distributed Systems").
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON list of strings. 
    Example: ["Python", "Machine Learning", "React", "TypeScript", "System Design"]
    """

    try:
        response = client.chat.completions.create(
            model=model_used,
            messages=[
                {"role": "system", "content": "Output valid JSON list only."},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content.strip()

        # Clean up markdown if present
        if "```" in content:
            content = content.replace("```json", "").replace("```", "").strip()

        # Extract the JSON list [ ... ]
        start = content.find("[")
        end = content.rfind("]") + 1

        if start != -1 and end != -1:
            return json.loads(content[start:end])
        else:
            # Fallback Parsing
            data = json.loads(content)
            if isinstance(data, dict):
                for val in data.values():
                    if isinstance(val, list):
                        return val
            return []

    except Exception as e:
        print(f"   ⚠️ Keyword Gen Failed: {e}")
        # Robust Fallback based on profile bio if LLM fails
        bio_keywords = []
        if user_profile.get("bio"):
            words = user_profile["bio"].split()
            bio_keywords = [w for w in words if len(w) > 4][:2]
        return bio_keywords if bio_keywords else ["developer", "python"]


def llm_score_candidate(my_profile, candidate_profile, candidate_activity):
    """Step 2: Ask LLM to score a specific candidate."""

    # 1. RELAXED CHECK: Only fail if profile is completely missing.
    # If activity is empty, we still proceed!
    if not candidate_profile:
        print(f"      ⚠️ Skipping {candidate_profile} (No Profile Data)")
        return None

    # Handle empty activity gracefully
    activity_context = (
        json.dumps(candidate_activity)
        if candidate_activity
        else "No recent public activity visible."
    )

    prompt = f"""
    Compare these two developers for a potential professional connection.
    
    ME (The User):
    - Bio: {my_profile.get("bio")}
    
    CANDIDATE:
    - Name: {candidate_profile.get("name")}
    - Bio: {candidate_profile.get("bio")}
    - Recent Activity: {activity_context}
    
    Task:
    1. Score relevance (0-100).
    2. Write a 1-sentence reason.
    3. Draft a short, casual DM opening.
    
    OUTPUT FORMAT:
    Return ONLY raw JSON. No markdown.
    {{
        "score": 85,
        "reason": "...",
        "pitch": "..."
    }}
    """

    try:
        response = client.chat.completions.create(
            model=model_used,
            messages=[
                {"role": "system", "content": "Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content.strip()

        # --- AGGRESSIVE CLEANING ---
        # Remove Markdown
        if "```" in content:
            content = content.replace("```json", "").replace("```", "")

        # Extract JSON object { ... }
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end != -1:
            content = content[start:end]

        return json.loads(content)

    except Exception as e:
        print(f"      ❌ LLM Error for {candidate_profile.get('name')}: {e}")
        print(f"      🔍 Raw Content: {content[:50]}...")  # Print what failed
        return None


# In main_matcher.py


def find_profiles_for_me(my_username):
    print(f"🚀 Starting Matcher for: {my_username}")

    # 1. Get MY Info
    print("   ...Fetching your profile")
    my_profile = get_profile_data(my_username)
    my_activity = get_activity_data(my_username)

    if not my_profile:
        return {"error": "Could not find your GitHub profile."}

    # 2. Get Search Keywords from LLM
    print("   ...Asking LLM for search keywords")
    keywords = llm_generate_keywords(my_profile, my_activity)
    print(f"   ...Keywords generated: {keywords}")

    # 3. Search GitHub (Python Logic)
    candidate_usernames = set()
    for query in keywords:
        print(f"   ...Searching GitHub for: '{query}'")
        users = search_users(query, limit=4)  # Increased limit slightly
        candidate_usernames.update(users)

    candidate_usernames.discard(my_username)

    # LIMIT TO 10 CANDIDATES MAX
    final_list = list(candidate_usernames)[:10]
    print(
        f"   ...Found {len(candidate_usernames)} unique candidates. Analyzing top {len(final_list)}..."
    )

    # 4. Analyze & Score Each Candidate (PERMISSIVE MODE)
    scored_candidates = []

    for user in final_list:
        print(f"      ...Analyzing {user}")
        c_profile = get_profile_data(user)
        c_activity = get_activity_data(user)

        # LLM Judging
        assessment = llm_score_candidate(my_profile, c_profile, c_activity)

        if assessment:
            # Success: Use LLM data
            scored_candidates.append(
                {
                    "username": user,
                    "name": c_profile.get("name") or user,
                    "url": c_profile.get("html_url"),
                    "score": assessment.get("score", 0),
                    "reason": assessment.get("reason", "No reason provided."),
                    "pitch": assessment.get("pitch", "Hi!"),
                }
            )
        else:
            # Failure Fallback: Add them anyway with default data
            scored_candidates.append(
                {
                    "username": user,
                    "name": c_profile.get("name") or user,
                    "url": c_profile.get("html_url"),
                    "score": 10,  # Low score to indicate failure
                    "reason": "LLM failed to score this profile, but they matched the keywords.",
                    "pitch": f"Hi {user}, I found your profile while searching for {keywords[0]}.",
                }
            )

    # 5. Sort & Return
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    return {
        "status": "success",
        "total_analyzed": len(scored_candidates),
        "matches": scored_candidates,
    }


# --- EXECUTION ---
if __name__ == "__main__":
    report = find_profiles_for_me("Sarthak-gupta-cpp")
    print("\n\n🏆 FINAL REPORT:")
    print(json.dumps(report, indent=2))
