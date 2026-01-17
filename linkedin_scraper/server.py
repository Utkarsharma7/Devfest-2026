
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import urllib.parse
import json
import os
import asyncio
from typing import Dict, List, Any

# Adjust path if needed to import linkedin_scraper
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager

app = FastAPI()

# Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def scrape_filters_logic(keyword: str):
    print(f"Processing /filter for keyword: {keyword}")
    async with BrowserManager(headless=False) as browser:
        try:
            if os.path.exists("linkedin_session.json"):
                await browser.load_session("linkedin_session.json")
            else:
                print("⚠ No session found.")
                return {"error": "No session found"}
        except Exception as e:
            print(f"Error loading session: {e}")
            return {"error": str(e)}

        scraper = SearchScraper(browser.page)
        
        base_url = "https://www.linkedin.com/search/results/people/"
        url = f"{base_url}?keywords={urllib.parse.quote(keyword)}&origin=SWITCH_SEARCH_VERTICAL"
        
        await scraper.navigate_and_wait(url)
        await scraper.wait_and_focus(3)
        await scraper.ensure_logged_in()
        
        filters = await scraper.get_all_filters()
        return filters

async def scrape_people_logic(keyword: str, filters: Dict[str, List[str]]):
    print(f"Processing /people for keyword: {keyword} with filters: {filters}")
    async with BrowserManager(headless=False) as browser:
        try:
            if os.path.exists("linkedin_session.json"):
                await browser.load_session("linkedin_session.json")
            else:
                return {"error": "No session found"}
        except:
             return {"error": "Session load error"}

        scraper = SearchScraper(browser.page)
        
        base_url = "https://www.linkedin.com/search/results/people/"
        url = f"{base_url}?keywords={urllib.parse.quote(keyword)}&origin=SWITCH_SEARCH_VERTICAL"
        
        await scraper.navigate_and_wait(url)
        await scraper.wait_and_focus(3)
        await scraper.ensure_logged_in()
        
        # Apply Filters if provided
        has_filters = any(options for options in filters.values()) if filters else False
        
        if has_filters:
            print(f"Applying filters: {filters}")
            await scraper.apply_search_filters(filters)
            url = browser.page.url
        
        # Scrape
        results = await scraper.scrape(url, max_scrolls=5)
        
        # Convert to dict
        return json.loads(results.to_json())

@app.get("/filter")
@app.get("/filter/")
async def get_filters(keyword: str):
    return await scrape_filters_logic(keyword)

@app.get("/people")
@app.get("/people/")
async def get_people(keyword: str, request: Request):
    # Try to get body from GET request
    try:
        body = await request.json()
    except:
        body = {}
    
    # Body is expected to be the filters dict
    # If empty or not provided, use empty dict
    filters = body if body else {}
    
    # Ensure it's a dict
    if not isinstance(filters, dict):
        filters = {}

    return await scrape_people_logic(keyword, filters)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
