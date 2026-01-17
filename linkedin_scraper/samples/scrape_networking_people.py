#!/usr/bin/env python3
"""
Example: Scrape People Search Results
"""
import asyncio
import os
import urllib.parse
from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager

async def main():
    keyword = "devsoc"

    # Define Filters
    # Fill these lists with exact string values from networking_filters.json to apply filters.
    # Leave empty to ignore specific filters.
    filters = {
        "Locations": [],            # e.g. ["India", "Greater Sydney Area"]
        "Current company": [],      # e.g. ["Google"]
        "Past company": [],
        "School": [],
        "Industry": [],
        "Profile language": [],
        "Open to": [],              # e.g. ["Volunteering"]
        "Service categories": ["Web Design"]
    }
    
    async with BrowserManager(headless=False) as browser:
        try:
            await browser.load_session("linkedin_session.json")
            print("✓ Session loaded")
        except:
            print("⚠ No session found. Please login first.")
            return

        scraper = SearchScraper(browser.page)
        
        # 1. Search People
        base_url = "https://www.linkedin.com/search/results/people/"
        url = f"{base_url}?keywords={urllib.parse.quote(keyword)}&origin=SWITCH_SEARCH_VERTICAL"
        
        print(f"\n🔍 Navigating to: {url}")
        
        # We navigate manually first to apply filters
        await scraper.navigate_and_wait(url)
        await scraper.wait_and_focus(3)
        await scraper.ensure_logged_in()
        
        # 2. Apply Filters (if any)
        # Check if any filter list is not empty
        has_filters = any(options for options in filters.values())
        
        if has_filters:
            print(f"\n⚙️ Applying Filters: {filters}")
            await scraper.apply_search_filters(filters)
            # URL changes after filtering, update it
            url = browser.page.url
            print(f"   Filtered URL: {url}")
        else:
            print("\n⚙️ No filters specified, proceeding with default search...")

        # 3. Scrape Results
        print("\n🔍 Scraping results...")
        results = await scraper.scrape(url, max_scrolls=5)
        
        print("\n" + "="*60)
        print(f"PEOPLE Results: '{keyword}'")
        print("="*60)
        
        for i, item in enumerate(results.results[:5], 1):
            print(f"{i}. {item.title}")
            print(f"   {item.subtitle}")
            print(f"   {item.url}")
            
        # Save People Results
        if results.results:
            import json
            with open("networking_people.json", "w", encoding="utf-8") as f:
                f.write(results.to_json(indent=2))
            print(f"\n💾 Saved {len(results.results)} people results to networking_people.json")
        else:
            print("\n❌ No results found.")

if __name__ == "__main__":
    asyncio.run(main())
