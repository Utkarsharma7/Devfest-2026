# compare_profiles_llama.py

import json
import ollama
import os

# Configure Ollama client to use Windows Ollama from WSL
def get_windows_host():
    """Get Windows host IP from WSL"""
    try:
        with open('/etc/resolv.conf', 'r') as f:
            for line in f:
                if line.startswith('nameserver'):
                    return line.split()[1]
    except:
        pass
    return 'localhost'

WINDOWS_HOST = get_windows_host()
OLLAMA_HOST = os.getenv('OLLAMA_HOST', f'http://{WINDOWS_HOST}:11434')


# ---------------- Helper: Convert LinkedIn JSON to text ----------------
def profile_to_text(profile):
    """
    Convert LinkedIn JSON profile to readable text for AI.
    Handles null/None values safely.
    """
    parts = []
    parts.append(profile.get("about") or "")

    for exp in profile.get("experiences", []):
        title = exp.get("position_title") or ""
        inst = exp.get("institution_name") or ""
        desc = exp.get("description") or ""
        parts.append(f"{title} at {inst}: {desc}")

    for edu in profile.get("educations", []):
        deg = edu.get("degree") or ""
        inst = edu.get("institution_name") or ""
        parts.append(f"{deg} at {inst}")

    return "\n".join(parts)


# ---------------- Main comparison function ----------------
def compare_profiles(user_json, candidate_json):
    """
    Compare two LinkedIn profiles using LLaMA.
    Returns a dictionary of scores:
    approachability, usefulness, context_alignment, mentorship, total_score
    """
    user_text = profile_to_text(user_json)
    candidate_text = profile_to_text(candidate_json)

    prompt = f"""
You are an AI networking evaluator.

Your task is to score **Profile B (the candidate)** ONLY in relation to
**Profile A (the user)**.

Profile A defines the context, goals, seniority, and interests.
Profile B is evaluated based on how suitable they are for Profile A to
connect with **right now**.

Scoring rules (scores must be between 0 and 100):

- approachability:
  How easy and socially appropriate it would be for Profile A to reach out
  to Profile B at this moment (shared orgs, similar seniority, openness,
  non-intimidating gap).

- usefulness:
  How likely Profile B can provide value to Profile A (knowledge, access,
  experience, collaboration potential).

- context_alignment:
  How well Profile B’s background, interests, and activities align with
  Profile A’s stated interests and current stage.


- total_score:
  A weighted judgment of the above scores reflecting overall networking value
  of Profile B **for Profile A**.

Profile A (User):
{user_text}

Profile B (Candidate):
{candidate_text}




"""

    # Call LLaMA
    client = ollama.Client(host=OLLAMA_HOST)
    result = client.generate(model="llama3.1", prompt=prompt)
    output_text = result["response"].strip()
    print("Raw LLaMA output:", output_text)

    # Parse JSON safely
    try:
        scores = json.loads(output_text)
    except json.JSONDecodeError:
        print("Warning: failed to parse LLaMA output. Returning empty scores.")
        scores = {}

    return scores


# ---------------- Main execution ----------------
# if __name__ == "__main__":
#     # Load JSON profiles
#     with open("user.json", "r", encoding="utf-8") as f:
#         user_profile = json.load(f)

#     with open("candidate.json", "r", encoding="utf-8") as f:
#         candidate_profile = json.load(f)

#     # Compare profiles
#     scores = compare_profiles(user_profile, candidate_profile)

#     # Print final results
#     print("\n=== Comparison Scores ===")
#     if scores:
#         for k, v in scores.items():
#             print(f"{k}: {v}")
#     else:
#         print("No scores returned. Check LLaMA output formatting.")
