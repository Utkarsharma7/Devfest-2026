#!/usr/bin/env python3
"""
Example: Scrape Networking Opportunities
Identify people, groups, and events based on a keyword.
"""
import asyncio
import os
import urllib.parse
from typing import Dict, List
from linkedin_scraper.scrapers.search import SearchScraper
from linkedin_scraper.core.browser import BrowserManager
from linkedin_scraper.models import SearchResults

async def scrape_category(scraper: SearchScraper, keyword: str, category: str) -> SearchResults:
    """Helper to scrape a specific category."""
    encoded_keyword = urllib.parse.quote(keyword)
    base_url = f"https://www.linkedin.com/search/results/{category}/"
    url = f"{base_url}?keywords={encoded_keyword}&origin=SWITCH_SEARCH_VERTICAL"
    
    print(f"\n🔍 Scraping {category.title()} for '{keyword}'...")
    print(f"   URL: {url}")
    
    try:
        # Increase scrolls to ensure we get all results on the page
        results = await scraper.scrape(url, max_scrolls=5)
        print(f"   ✅ Found {len(results.results)} {category}")
        return results
    except Exception as e:
        print(f"   ❌ Failed to scrape {category}: {e}")
        return SearchResults(keyword=keyword, results=[])

async def main():
    # Input keyword
    keyword = "bits goa" 
    
    # Categories to scrape
    categories = ["people", "groups", "events"]
    
    aggregated_data: Dict[str, List] = {}
    
    async with BrowserManager(headless=False) as browser:
        # Load session
        try:
            await browser.load_session("linkedin_session.json")
            print("✓ Session loaded")
        except:
            print("⚠ No session found. Please ensure you are logged in.")
            return

        scraper = SearchScraper(browser.page)
        
        for category in categories:
            results = await scrape_category(scraper, keyword, category)
            aggregated_data[category] = [item.model_dump() for item in results.results]
            
            # Brief pause between searches to be safe
            await asyncio.sleep(3)

    # Display Summary
    print("\n" + "="*60)
    print(f"NETWORKING OPPORTUNITIES: '{keyword}'")
    print("="*60)
    
    for category, items in aggregated_data.items():
        print(f"\n--- {category.upper()} ({len(items)}) ---")
        for i, item in enumerate(items[:5], 1): # Show top 5
            title = item.get('title', 'N/A')
            subtitle = item.get('subtitle', '')
            url = item.get('url', 'N/A')
            print(f"{i}. {title}")
            if subtitle:
                print(f"   {subtitle}")
            print(f"   {url}")
        
        if len(items) > 5:
            print(f"   ... and {len(items) - 5} more")

    # simple context analysis logic
    print("\n" + "="*60)
    print("POTENTIAL TRIGGERS Analysis")
    print("="*60)
    
    if aggregated_data['events']:
        print(f"📅 {len(aggregated_data['events'])} Shared Events found. Attending these is a high-context trigger.")
    
    if aggregated_data['groups']:
        print(f"👥 {len(aggregated_data['groups'])} Groups found. Joining '{aggregated_data['groups'][0]['title']}' could connect you with {aggregated_data['groups'][0].get('subtitle', 'peers')}.")

    # Save to file
    import json
    output_file = f"networking_{keyword.replace(' ', '_')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(aggregated_data, f, indent=2)
    
    print(f"\n💾 Full data saved to: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
