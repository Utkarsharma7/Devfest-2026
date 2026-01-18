import json
import os

# Set OLLAMA_HOST before importing ollama to avoid parsing issues
os.environ["OLLAMA_HOST"] = "http://localhost:11434"

import ollama


def profile_to_text(profile):
    """
    Convert user profile (from questions) to readable text for AI.
    Handles both question-based profiles and LinkedIn JSON profiles.
    """
    parts = []

    # Check if this is a question-based profile (has goal, skills, projects)
    if profile.get("goal"):
        parts.append(f"Professional Goal: {profile.get('goal', '')}")

    if profile.get("skills"):
        parts.append(f"Technical Skills & Technologies: {profile.get('skills', '')}")

    if profile.get("projects"):
        parts.append(f"Projects & Interests: {profile.get('projects', '')}")

    if profile.get("connection_type"):
        parts.append(f"Connection Type: {profile.get('connection_type', '')}")

    if profile.get("engagement_type"):
        parts.append(f"Engagement Type: {profile.get('engagement_type', '')}")

    # Fallback for LinkedIn profile format
    if profile.get("about") and not profile.get("goal"):
        parts.append(f"About: {profile.get('about', '')}")

    # LinkedIn-specific fields (for backward compatibility)
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


def keywords_from_profile(profile_json):
    """
    Extract keywords from a LinkedIn profile using LLaMA.
    Returns a list of keywords.
    """

    prompt = f"""
    You are a professional networking search assistant.

Your task is to extract a concise list of keywords that can be used to
search for relevant people on LinkedIn based on the user's detailed profile information.

The keywords must:
- Be suitable for LinkedIn people search
- Favor roles, skills, technologies, frameworks, domains, and organizations
- Extract specific technical terms, programming languages, tools, and areas of expertise
- Avoid generic words like "student", "member", "trainee", "learning", "interested"
- Avoid full sentences or descriptions
- Prefer concrete, searchable phrases (1-3 words)
- Prioritize the most relevant terms mentioned in skills, projects, and goals
- Consider the connection type (hiring community vs collaborators) and engagement type when generating keywords
- Return 5-10 highly relevant keywords that will help find the best matches

User Profile Information:
<<<
{profile_json}
>>>

Return ONLY a JSON array of strings, like:
["machine learning", "python", "react", "full-stack development", "system design", "startup", "open source"]

Do not include explanations, numbering, or extra text. Just return the array.

    """

    # Connect to Ollama server at localhost
    try:
        client = ollama.Client(host="http://localhost:11434")
        print("Connecting to Ollama at http://localhost:11434...")
        result = client.generate(model="llama3.1", prompt=prompt)
        print("✅ Connected to Ollama")
    except Exception as e:
        print(f"⚠️ Ollama error: {e}")
        raise ConnectionError(f"Could not connect to Ollama server: {e}")
    
    output_text = result["response"].strip()
    print("Raw LLaMA output:", output_text)

    try:
        keywords = json.loads(output_text)
    except json.JSONDecodeError:
        print("Warning: failed to parse LLaMA output. Returning empty scores.")
        keywords = {}

    return keywords


# if __name__ == "__main__":
#     # Load JSON profiles
#     with open("candidate.json", "r", encoding="utf-8") as f:
#         user_profile = json.load(f)

#     keywords = keywords_from_profile(user_profile)
#     print("Extracted keywords:", keywords)
