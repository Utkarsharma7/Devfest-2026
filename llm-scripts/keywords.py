import json
import ollama
import os


# Configure Ollama client to use Windows Ollama from WSL
def get_windows_host():
    """Get Windows host IP from WSL, with fallback options"""
    # Try multiple methods to find Windows host
    hosts_to_try = []

    # Method 1: Get from resolv.conf
    try:
        with open("/etc/resolv.conf", "r") as f:
            for line in f:
                if line.startswith("nameserver"):
                    hosts_to_try.append(line.split()[1])
    except:
        pass

    # Method 2: Try localhost (sometimes works in WSL2)
    hosts_to_try.append("localhost")

    # Method 3: Try 127.0.0.1
    hosts_to_try.append("127.0.0.1")

    # Return first available or default to localhost
    return hosts_to_try[0] if hosts_to_try else "localhost"


# Use Windows host IP if in WSL, otherwise use localhost
WINDOWS_HOST = get_windows_host()
OLLAMA_HOST = os.getenv("OLLAMA_HOST", f"http://{WINDOWS_HOST}:11434")


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

    # Connect to Ollama server - try multiple hosts
    hosts_to_try = [
        "http://localhost:11434",  # Try localhost first (works in WSL2)
        OLLAMA_HOST,  # Then try detected Windows IP
        f"http://{get_windows_host()}:11434",  # Fallback
    ]

    client = None
    result = None
    last_error = None

    for host in hosts_to_try:
        try:
            client = ollama.Client(host=host)
            # Check if model exists first
            try:
                models = client.list()
                model_names = [m.get("name", "") for m in models.get("models", [])]
                if (
                    "llama3.1" not in model_names
                    and "llama3.1:latest" not in model_names
                ):
                    print(
                        f"⚠️  Model 'llama3.1' not found at {host}. Available models: {model_names}"
                    )
                    print(f"   Installing llama3.1...")
                    client.pull("llama3.1")
                    print(f"✅ Model installed successfully")
            except Exception as model_check_error:
                print(f"⚠️  Could not check models at {host}: {model_check_error}")

            result = client.generate(model="llama3.1", prompt=prompt)
            print(f"✅ Connected to Ollama at {host}")
            break
        except Exception as e:
            error_str = str(e)
            # Check if it's a model not found error
            if "not found" in error_str.lower() or "404" in error_str:
                print(f"⚠️  Model 'llama3.1' not found at {host}. Attempting to pull...")
                try:
                    client = ollama.Client(host=host)
                    client.pull("llama3.1")
                    print(f"✅ Model installed. Retrying...")
                    result = client.generate(model="llama3.1", prompt=prompt)
                    print(f"✅ Connected to Ollama at {host}")
                    break
                except Exception as pull_error:
                    last_error = pull_error
                    print(f"⚠️  Failed to pull model: {pull_error}")
                    continue
            else:
                last_error = e
                print(f"⚠️  Failed to connect to {host}: {e}")
                continue

    if result is None:
        raise ConnectionError(
            f"Could not connect to Ollama server or model not available. Tried: {hosts_to_try}. Last error: {last_error}"
        )
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
