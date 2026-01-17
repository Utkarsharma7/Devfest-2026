#!/usr/bin/env python3
"""
Example: Scrape Search Filters
"""
import asyncio
import os
import urllib.parse
import json
from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager

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
        
        # 1. Navigate to Search Page to access filters
        # We need to be on a search page to see the filters button
        base_url = "https://www.linkedin.com/search/results/people/"
        url = f"{base_url}?keywords={urllib.parse.quote(keyword)}&origin=SWITCH_SEARCH_VERTICAL"
        
        print(f"\n🔍 Navigating to: {url}")
        await scraper.navigate_and_wait(url)
        await scraper.wait_and_focus(3)
        await scraper.ensure_logged_in()
        
        # 2. Get All Filters
        print("\n" + "="*60)
        print("Scraping available filters...")
        print("="*60)
        
        filters = await scraper.get_all_filters()
        
        # Save Filters
        if filters:
             with open("networking_filters.json", "w", encoding="utf-8") as f:
                 json.dump(filters, f, indent=2, ensure_ascii=False)
             print(f"\n💾 Saved {len(filters)} filter categories to networking_filters.json")
             
             # Print summary
             for category, options in filters.items():
                 print(f"- {category}: {len(options)} options")
        else:
             print("\n⚠ No filters found or failed to scrape filters.")

if __name__ == "__main__":
    asyncio.run(main())
