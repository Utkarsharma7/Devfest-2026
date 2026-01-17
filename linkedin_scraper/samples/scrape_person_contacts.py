#!/usr/bin/env python3
"""
Example: Scrape person profile with detailed information

This example shows how to scrape a LinkedIn person profile including
work experience and education history.
"""
import asyncio
import os
from urllib.parse import urlparse
from linkedin_scraper.scrapers.person import PersonScraper
from linkedin_scraper.core.browser import BrowserManager


async def main():
    """Scrape a person profile"""
    profile_url = "https://www.linkedin.com/in/sarthak-guptatsg/"
    
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
        
        # Display person info
        print("\n" + "="*60)
        print(f"Person: {person.name}")
        print(f"Location: {person.location}")
        print(f"About: {person.about[:100] if person.about else 'N/A'}...")
        print("="*60)
        
        # Display work experience
        print(f"\n💼 Work Experience ({len(person.experiences)} positions):")
        for exp in person.experiences[:5]:  # Show first 5
            print(f"  - {exp.position_title} at {exp.institution_name}")
            print(f"    {exp.from_date} - {exp.to_date}")
        
        if len(person.experiences) > 5:
            print(f"  ... and {len(person.experiences) - 5} more positions")
        
        # Display education
        print(f"\n🎓 Education ({len(person.educations)} schools):")
        for edu in person.educations[:3]:  # Show first 3
            print(f"  - {edu.institution_name}")
            if edu.degree:
                print(f"    {edu.degree}")
        
        if len(person.educations) > 3:
            print(f"  ... and {len(person.educations) - 3} more schools")
        
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