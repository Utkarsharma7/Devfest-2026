import json
import os

# Set OLLAMA_HOST before importing ollama to avoid parsing issues
os.environ["OLLAMA_HOST"] = "http://localhost:11434"

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


def filters(cv_text, filter_json):
    # Build prompt without f-string to avoid curly brace issues
    prompt = """You are an AI system that selects LinkedIn People Search filters.

TASK: Based on the user's profile/resume, select the MOST RELEVANT filter values 
from the available options to help find similar professionals.

RULES:
1. Select ONLY values that exist in the "Available filters" below
2. Select 1-3 values per category that best match the user's background
3. Focus on: Industry, Location, Skills, Schools they attended
4. If no good match exists for a category, leave it as empty list []
5. Return ONLY valid JSON, no explanations

User Profile/Resume:
<<<
""" + cv_text + """
>>>

Available filters (select from these ONLY):
<<<
""" + filter_json + """
>>>

Return JSON like this example:
{
  "Locations": ["India", "United States"],
  "Industry": ["Technology, Information and Internet"],
  "Current company": [],
  "Past company": [],
  "School": [],
  "Profile language": ["English"],
  "Open to": [],
  "Service categories": []
}

Return ONLY the JSON object, nothing else."""

    client = ollama.Client(host="http://localhost:11434")
    print("Connecting to Ollama for filters...")
    result = client.generate(model="llama3.1", prompt=prompt)
    output_text = result["response"].strip()
    print("Raw LLaMA output:", output_text)

    # Clean up the output - remove markdown code blocks if present
    if output_text.startswith("```json"):
        output_text = output_text.replace("```json", "").replace("```", "").strip()
    elif output_text.startswith("```"):
        output_text = output_text.replace("```", "").strip()

    try:
        selected_filters = json.loads(output_text)
        print(f"Parsed filters: {selected_filters}")
        return selected_filters
    except json.JSONDecodeError as e:
        print(f"Warning: failed to parse LLaMA output: {e}")
        print(f"Raw output was: {output_text}")
        # Return empty filters structure
        return {
            "Locations": [],
            "Current company": [],
            "Past company": [],
            "School": [],
            "Industry": [],
            "Profile language": [],
            "Open to": [],
            "Service categories": []
        }


# if __name__ == "__main__":
#     # Load JSON profiles
#     with open("candidate.json", "r", encoding="utf-8") as f:
#         user_profile = json.load(f)

#     with open("filter.json", "r", encoding="utf-8") as f:
#         filter_options = json.load(f)
#     filters = filters(user_profile, filter_options)
#     print("Extracted keywords:", filters)
