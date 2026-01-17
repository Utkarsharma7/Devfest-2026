#!/usr/bin/env python3
"""
Example: Scrape Networking Opportunities with Filters
"""
import asyncio
import os
import urllib.parse
# Fix import typo
from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager
from linkedin_scraper.models import SearchResults

async def main():
    keyword = "devsoc"
    
    
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
        
        # Scrape the URL directly
        results = await scraper.scrape(url, max_scrolls=5)
        
        print("\n" + "="*60)
        print(f"PEOPLE (Filtered): '{keyword}'")
        print("="*60)
        
        for i, item in enumerate(results.results[:5], 1):
            print(f"{i}. {item.title}")
            print(f"   {item.subtitle}")
            print(f"   {item.url}")
            
        # 2. Get All Filters
        print("\n" + "="*60)
        print("Scraping available filters...")
        print("="*60)
        
        filters = await scraper.get_all_filters()
        
        # Save Filters
        if filters:
             import json
             with open("networking_filters.json", "w", encoding="utf-8") as f:
                 json.dump(filters, f, indent=2, ensure_ascii=False)
             print(f"💾 Saved filters to networking_filters.json")
        else:
             print("⚠ No filters found or failed to scrape filters.")
            
        # Save People Results
        if results.results:
            import json
            with open("networking_people.json", "w", encoding="utf-8") as f:
                f.write(results.to_json(indent=2))
            print(f"💾 Saved {len(results.results)} people results to networking_people.json")
        else:
            print("\n❌ No results found after filtering.")

if __name__ == "__main__":
    asyncio.run(main())
