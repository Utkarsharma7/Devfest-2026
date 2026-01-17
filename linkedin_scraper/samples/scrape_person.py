#!/usr/bin/env python3
"""
Example: Scrape a single LinkedIn profile

This example shows how to use the PersonScraper to scrape a LinkedIn profile.
"""
import asyncio
import os
from urllib.parse import urlparse
from linkedin_scraper.scrapers.person import PersonScraper
from linkedin_scraper.core.browser import BrowserManager


async def main():
    """Scrape a single person profile"""
    profile_url = "https://www.linkedin.com/in/neev-rathod-09ba6431b/"
    
    # Initialize and start browser using context manager
    async with BrowserManager(headless=False) as browser:
        # Load existing session (must be created first - see README for setup)
        await browser.load_session("linkedin_session.json")
        print("✓ Session loaded")
        
        # Initialize scraper with the browser page
        scraper = PersonScraper(browser.page)
        
        # Scrape the profile
        print(f"🚀 Scraping: {profile_url}")
        person = await scraper.scrape(profile_url)
        
        # Display results
        print("\n" + "="*60)
        print(f"Name: {person.name}")
        print(f"Location: {person.location}")
        print(f"About: {person.about[:100]}..." if person.about else "About: N/A")
        print(f"Experiences: {len(person.experiences)}")
        print(f"Education: {len(person.educations)}")
        print("="*60)
        
        # Save data to JSON file
        # Extract username from URL for filename
        parsed_url = urlparse(profile_url)
        username = parsed_url.path.strip('/').split('/')[-1] if parsed_url.path else "person"
        output_file = f"scraped_data_{username}.json"
        
        # Save the full data as JSON
        json_data = person.to_json(indent=2)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(json_data)
        
        print(f"\n💾 Full data saved to: {output_file}")
        print(f"   File size: {os.path.getsize(output_file)} bytes")
    
    print("\n✓ Done!")


if __name__ == "__main__":
    asyncio.run(main())