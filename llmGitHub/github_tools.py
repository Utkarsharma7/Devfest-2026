import requests
import os
import json

# --- CONFIGURATION ---
# Make sure your Token is correct!
GITHUB_TOKEN = "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"
headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}


def get_profile_data(username: str) -> dict:
    """Fetches static profile data."""
    url = f"https://api.github.com/users/{username}"
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "username": data.get("login"),
                "name": data.get("name") or data.get("login"),
                "bio": data.get("bio") or "No bio",
                "location": data.get("location") or "Unknown",
                "company": data.get("company"),
                "followers": data.get("followers"),
                "html_url": data.get("html_url"),
                "avatar_url": data.get("avatar_url"),  # GitHub profile picture
            }
        return {}
    except:
        return {}


def get_activity_data(username: str) -> list:
    """Fetches recent commit messages and star activity."""
    url = f"https://api.github.com/users/{username}/events/public"
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            return []

        events = resp.json()[:7]  # Last 7 events
        activity = []

        for event in events:
            if event["type"] == "PushEvent":
                repo = event["repo"]["name"]
                commits = event.get("payload", {}).get("commits", [])
                for c in commits:
                    activity.append(f"Pushed to {repo}: {c['message']}")
            elif event["type"] == "WatchEvent":
                activity.append(f"Starred {event['repo']['name']}")
            elif event["type"] == "CreateEvent":
                activity.append(
                    f"Created {event.get('payload', {}).get('ref_type')} in {event['repo']['name']}"
                )

        return activity
    except:
        return []


def search_users(query: str, limit: int = 5, sort: str = "repositories", page: int = 1) -> list:
    """Searches for users and returns a list of usernames."""
    url = "https://api.github.com/search/users"
    # GitHub API allows up to 100 results per page, max 1000 total results
    per_page = min(limit, 100)
    params = {"q": query, "per_page": per_page, "sort": sort, "page": page}
    try:
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            return [u["login"] for u in items]
        return []
    except:
        return []
