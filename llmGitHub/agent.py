import os
import json
import re  # Added for parsing
from openai import OpenAI, BadRequestError
from github_tools import search_candidates, analyze_user_activity, get_user_profile

# --- CONFIGURATION ---
# Replace with your actual key
MY_API_KEY = "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"

system_prompt = """
    You are an AI Networking Assistant.
    
    CRITICAL RULES:
    1. **TOOL USAGE:**
       - ALWAYS provide a `topic` for `search_candidates`.
       - NEVER use fake arguments like `max` or `limit`.
    
    2. **FINAL OUTPUT FORMAT:**
       - Your final answer MUST be valid JSON.
       - Do NOT wrap it in markdown code blocks (```json ... ```).
       - Do NOT write introduction text. Just the JSON object.
    
    3. **REAL DATA ONLY:** - If `search_candidates` returns "NO_RESULTS" or "ERROR", you MUST STOP.
       - Do NOT invent users".
       - Do NOT output a JSON list of fake people.
       - Instead, output a JSON object with an error message: `{"error": "No users found for this query."}`
    """

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=MY_API_KEY,
)

# --- TOOLS DEFINITION ---
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_candidates",
            "description": "Finds potential professional connections.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "language": {"type": "string"},
                    "location": {"type": "string"},
                },
                "required": ["topic"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_profile",
            "description": "Fetches a user's Real Name, Bio, Company, and Location.",
            "parameters": {
                "type": "object",
                "properties": {"username": {"type": "string"}},
                "required": ["username"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_user_activity",
            "description": "Gets detailed recent activity (commits, stars).",
            "parameters": {
                "type": "object",
                "properties": {"username": {"type": "string"}},
                "required": ["username"],
            },
        },
    },
]


def run_networking_agent(user_intent):
    print(f"🧠 Agent starting with intent: '{user_intent}'...\n")

    # --- SEQUENTIAL SYSTEM PROMPT ---
    system_prompt = """
    You are a Step-by-Step Networking Assistant.
    
    CRITICAL PROTOCOL:
    1. **SEQUENTIAL EXECUTION:** You MUST wait for the output of one tool before calling the next.
       - ❌ WRONG: Call `search_candidates` AND `analyze_user_activity` in the same turn.
       - ✅ RIGHT: Call `search_candidates`, STOP, READ the real usernames, THEN call `analyze_user_activity` in the next turn.
    
    2. **NO HALLUCINATIONS:** - NEVER guess usernames like "JohnDoe" or "candidate1".
       - ONLY analyze users that actually appear in the `search_candidates` output.
       - If search returns 0 results, STOP and output {"candidates": []}.

    3. **JSON FINAL OUTPUT:** - Output only the requested JSON structure.
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_intent},
    ]

    while True:
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )

            response_message = response.choices[0].message
            content_text = response_message.content or ""
            tool_calls = response_message.tool_calls

            if tool_calls:
                # --- PARALLEL HALLUCINATION FILTER ---
                # This block detects if the AI is trying to analyze "Fake" users before searching
                valid_calls = []
                for tc in tool_calls:
                    fn = tc.function.name
                    args = json.loads(tc.function.arguments)

                    # If it tries to analyze a user but hasn't searched yet (or guesses "JohnDoe"), BLOCK IT.
                    if fn == "analyze_user_activity":
                        u = args.get("username", "").lower()
                        if "doe" in u or "candidate" in u or "user" in u:
                            print(f"🚫 BLOCKING Hallucinated Call: {fn} on '{u}'")
                            continue

                    valid_calls.append(tc)

                if not valid_calls:
                    # If we blocked everything, tell the AI to try searching first
                    messages.append(response_message)  # Append original intent
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_calls[0].id,
                            "name": tool_calls[0].function.name,
                            "content": "ERROR: You guessed a username. You MUST use `search_candidates` first and use the REAL usernames returned.",
                        }
                    )
                    continue

                # --- NORMAL EXECUTION ---
                messages.append(response_message)
                for tool_call in valid_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)

                    print(f"🔧 Tool Triggered: {function_name} | Args: {function_args}")

                    if function_name == "search_candidates":
                        result = search_candidates(**function_args)
                    elif function_name == "get_user_profile":
                        result = get_user_profile(**function_args)
                    elif function_name == "analyze_user_activity":
                        result = analyze_user_activity(**function_args)

                    # Log the output so you can see if Search actually found anyone
                    print(f"   📄 Output: {str(result)[:100]}...")

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": str(result),
                        }
                    )

            elif not "function=" in content_text:
                return content_text

            elif "function=" in content_text:
                raise BadRequestError(
                    "Text-based tool call detected",
                    response=None,
                    body={"error": {"failed_generation": content_text}},
                )

        except BadRequestError as e:
            # ... (Keep your existing error repair code exactly as is) ...
            print(f"⚠️ API Error: {e}")
            break  # Break loop on fatal error to avoid infinite scroll


# --- MAIN ---
def find_matches_for_me(my_username, my_location=None):
    print(f"🕵️  Agent is analyzing YOUR profile ({my_username}) first...\n")

    location_instruction = ""
    if my_location:
        location_instruction = f"Filter results to: '{my_location}'."

    # --- SIMPLIFIED PROMPT ---
    prompt = f"""
    I am GitHub user '{my_username}'. 
    
    GOAL: Find the top 5 technical matches for me.

    Step 1: Analyze my profile (`{my_username}`) to identify my core skills.
    Step 2: Use `search_candidates` to find 5-7 REAL developers with matching skills. {location_instruction}
    Step 3: Analyze their activity to ensure they are active.

    CRITICAL RULES:
    1. **NO FAKE DATA:** If `search_candidates` returns empty, stop. Do NOT invent names.
    2. **JSON ONLY:** Output a single JSON object. No Markdown. No conversation.
    
    REQUIRED JSON FORMAT:
    {{
      "candidates": [
        {{
          "rank": 1,
          "name": "Real Name (or Handle)",
          "score": 85,
          "reason": "Exact match for [Skill]. Active 2 days ago on [Repo].",
          "pitch": "Hi [Name], I saw your work on [Repo] and noticed we both use [Skill]..."
        }}
      ]
    }}
    """
    return run_networking_agent(prompt)


if __name__ == "__main__":
    MY_USERNAME = "Sarthak-gupta-cpp"
    MY_LOCATION = None

    report = find_matches_for_me(MY_USERNAME, MY_LOCATION)
    print("\n---------------- MATCH REPORT ----------------")
    print(report)
