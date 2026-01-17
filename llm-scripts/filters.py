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


def filters(profile_json, filter_json):
    profile_text = profile_to_text(profile_json)

    prompt = f"""
    You are an AI system that generates LinkedIn People Search filters.

You must populate filters ONLY using values that appear in the user's
profile AND that match the allowed options listed below.

If no valid value exists for a filter, leave it as an empty list.

Do NOT invent, generalize, or rephrase values.
Do NOT add new fields.
Do NOT include explanations or text outside JSON.

User profile data:
<<<
{profile_text}
>>>

Allowed filter options (use ONLY these values if applicable):
<<<
{filter_json}
>>>

Return JSON in this exact structure:

{
        "Locations": [],
  "Current company": [],
  "Past company": [],
  "School": [],
  "Industry": [],
  "Profile language": [],
  "Open to": [],
  "Service categories": []
}

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


# if __name__ == "__main__":
#     # Load JSON profiles
#     with open("candidate.json", "r", encoding="utf-8") as f:
#         user_profile = json.load(f)

#     with open("filter.json", "r", encoding="utf-8") as f:
#         filter_options = json.load(f)
#     filters = filters(user_profile, filter_options)
#     print("Extracted keywords:", filters)
