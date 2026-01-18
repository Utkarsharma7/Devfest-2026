
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import urllib.parse
import json
import os
import asyncio
import time
import random
import requests
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from bs4 import BeautifulSoup

# Adjust path if needed to import linkedin_scraper
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager


@dataclass
class JobData:
    title: str
    company: str
    location: str
    job_link: str
    posted_date: str


class ScraperConfig:
    BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    JOBS_PER_PAGE = 25
    MIN_DELAY = 2
    MAX_DELAY = 5
    RATE_LIMIT_DELAY = 30
    RATE_LIMIT_THRESHOLD = 10

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "DNT": "1",
        "Cache-Control": "no-cache",
    }


class LinkedInJobsScraper:
    def __init__(self):
        self.session = self._setup_session()

    def _setup_session(self) -> requests.Session:
        session = requests.Session()
        retries = Retry(
            total=5, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504]
        )
        session.mount("https://", HTTPAdapter(max_retries=retries))
        return session

    def _build_search_url(self, keywords: str, location: str, start: int = 0) -> str:
        params = {
            "keywords": keywords,
            "location": location,
            "start": start,
        }
        return f"{ScraperConfig.BASE_URL}?{'&'.join(f'{k}={urllib.parse.quote(str(v))}' for k, v in params.items())}"

    def _clean_job_url(self, url: str) -> str:
        return url.split("?")[0] if "?" in url else url

    def _extract_job_data(self, job_card: BeautifulSoup) -> Optional[JobData]:
        try:
            title = job_card.find("h3", class_="base-search-card__title").text.strip()
            company = job_card.find(
                "h4", class_="base-search-card__subtitle"
            ).text.strip()
            location = job_card.find(
                "span", class_="job-search-card__location"
            ).text.strip()
            job_link = self._clean_job_url(
                job_card.find("a", class_="base-card__full-link")["href"]
            )
            posted_date = job_card.find("time", class_="job-search-card__listdate")
            posted_date = posted_date.text.strip() if posted_date else "N/A"

            return JobData(
                title=title,
                company=company,
                location=location,
                job_link=job_link,
                posted_date=posted_date,
            )
        except Exception as e:
            print(f"Failed to extract job data: {str(e)}")
            return None

    def _fetch_job_page(self, url: str) -> BeautifulSoup:
        try:
            response = self.session.get(url, headers=ScraperConfig.HEADERS, timeout=10)
            if response.status_code != 200:
                raise RuntimeError(
                    f"Failed to fetch data: Status code {response.status_code}"
                )
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            raise RuntimeError(f"Request failed: {str(e)}")

    def scrape_jobs(
        self, keywords: str, location: str, max_jobs: int = 100
    ) -> List[JobData]:
        all_jobs = []
        start = 0

        while len(all_jobs) < max_jobs:
            try:
                url = self._build_search_url(keywords, location, start)
                soup = self._fetch_job_page(url)
                job_cards = soup.find_all("div", class_="base-card")

                if not job_cards:
                    break
                for card in job_cards:
                    job_data = self._extract_job_data(card)
                    if job_data:
                        all_jobs.append(job_data)
                        if len(all_jobs) >= max_jobs:
                            break
                print(f"Scraped {len(all_jobs)} jobs...")
                start += ScraperConfig.JOBS_PER_PAGE
                time.sleep(
                    random.uniform(ScraperConfig.MIN_DELAY, ScraperConfig.MAX_DELAY)
                )
            except Exception as e:
                print(f"Scraping error: {str(e)}")
                break
        return all_jobs[:max_jobs]

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
        
        try:
            await scraper.ensure_logged_in()
        except Exception as auth_error:
            print(f"Authentication error: {auth_error}")
            return {"error": f"Not logged in to LinkedIn. Please create a session by running 'python samples/create_session.py'"}

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
        
        try:
            await scraper.ensure_logged_in()
        except Exception as auth_error:
            print(f"Authentication error: {auth_error}")
            return {"error": f"Not logged in to LinkedIn. Please create a session by running 'python samples/create_session.py'", "results": []}
        
        # Apply Filters if provided (check if filters dict is non-empty and has actual options)
        has_filters = filters and isinstance(filters, dict) and any(
            options and isinstance(options, list) and len(options) > 0 
            for options in filters.values()
        )
        
        if has_filters:
            try:
                print(f"Applying filters: {filters}")
                await scraper.apply_search_filters(filters)
                url = browser.page.url
            except Exception as filter_error:
                print(f"Warning: Error applying filters (continuing without filters): {filter_error}")
                # Continue scraping without filters if filter application fails
        
        # Scrape (increased max_scrolls to get more results)
        results = await scraper.scrape(url, max_scrolls=10)
        
        # Convert to dict
        return json.loads(results.to_json())

@app.get("/")
def root():
    """Root endpoint - shows server status and available endpoints"""
    return {
        "status": "running",
        "message": "LinkedIn Scraper API is running",
        "endpoints": {
            "filter": "GET /filter?keyword=<keyword> - Get available filters for people search",
            "people": "POST /people - Scrape people profiles with keyword and filters",
            "job": "GET /job?keyword=<keyword>&location=<location> - Scrape job listings",
            "docs": "GET /docs - Interactive API documentation"
        },
        "server": "http://localhost:8000"
    }

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

@app.post("/people")
@app.post("/people/")
async def post_people(request: Request):
    """POST endpoint for /people with keyword and filters in body"""
    try:
        body = await request.json()
        keyword = body.get("keyword", "")
        filters = body.get("filters", {})
        
        if not keyword:
            return {"error": "keyword is required in request body"}
        
        return await scrape_people_logic(keyword, filters)
    except Exception as e:
        return {"error": f"Invalid request: {str(e)}"}

@app.get("/job")
@app.get("/job/")
async def get_jobs(keyword: str, location: str, max_jobs: int = 100):
    """
    Scrape LinkedIn jobs based on keyword and location.
    
    Parameters:
    - keyword: Job title or keywords to search (e.g., "AI/ML Engineer")
    - location: Location to search in (e.g., "India")
    - max_jobs: Maximum number of jobs to scrape (default: 100)
    
    Returns:
    - JSON array of job listings with title, company, location, job_link, and posted_date
    """
    try:
        print(f"Processing /job endpoint with keyword: {keyword}, location: {location}")
        scraper = LinkedInJobsScraper()
        jobs = scraper.scrape_jobs(keyword, location, max_jobs)
        
        if not jobs:
            return {"status": "success", "message": "No jobs found", "data": [], "count": 0}
        
        return {
            "status": "success",
            "message": f"Successfully scraped {len(jobs)} jobs",
            "data": [asdict(job) for job in jobs],
            "count": len(jobs)
        }
    except Exception as e:
        print(f"Error in /job endpoint: {str(e)}")
        return {
            "status": "error",
            "message": f"Error scraping jobs: {str(e)}",
            "data": [],
            "count": 0
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
