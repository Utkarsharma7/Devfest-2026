import json
import ollama


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


def keywords_from_profile(profile_json):
    """
    Extract keywords from a LinkedIn profile using LLaMA.
    Returns a list of keywords.
    """
    profile_text = profile_to_text(profile_json)

    prompt = f"""
    You are a professional networking search assistant.

Your task is to extract a concise list of keywords that can be used to
search for relevant people on LinkedIn.

The keywords must:
- Be suitable for LinkedIn people search
- Favor roles, skills, domains, and organizations
- Avoid generic words like "student", "member", "trainee", "learning"
- Avoid full sentences or descriptions
- Prefer concrete, searchable phrases (1-3 words)
- Reflect the user's current interests and activities

Profile data (context only, do not repeat):
<<<
{profile_text}
>>>

Return ONLY a array of strings, like:
["machine learning", "web development", "javascript", "bits goa"]

Do not include explanations, numbering, or extra text.

    """

    result = ollama.generate(model="llama3.1", prompt=prompt)
    output_text = result["response"].strip()
    print("Raw LLaMA output:", output_text)

    try:
        keywords = json.loads(output_text)
    except json.JSONDecodeError:
        print("Warning: failed to parse LLaMA output. Returning empty scores.")
        keywords = {}

    return keywords


if __name__ == "__main__":
    # Load JSON profiles
    with open("candidate.json", "r", encoding="utf-8") as f:
        user_profile = json.load(f)

    keywords = keywords_from_profile(user_profile)
    print("Extracted keywords:", keywords)
