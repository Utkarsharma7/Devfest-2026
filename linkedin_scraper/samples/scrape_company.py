#!/usr/bin/env python3
"""
Example: Scrape a LinkedIn company page

This example shows how to use the CompanyScraper to scrape company information.
"""
import asyncio
import os
from urllib.parse import urlparse
from linkedin_scraper.scrapers.company import CompanyScraper
from linkedin_scraper.core.browser import BrowserManager


async def main():
    """Scrape a single company"""
    company_url = "https://www.linkedin.com/company/devsoc-bpgc"
    
    # Initialize and start browser using context manager
    async with BrowserManager(headless=False) as browser:
        # Load existing session (must be created first - see README for setup)
        await browser.load_session("linkedin_session.json")
        print("✓ Session loaded")
        
        # Initialize scraper with the browser page
        scraper = CompanyScraper(browser.page)
        
        # Scrape the company
        print(f"🚀 Scraping: {company_url}")
        company = await scraper.scrape(company_url)
        
        # Display results
        print("\n" + "="*60)
        print(f"Name: {company.name}")
        print(f"Industry: {company.industry}")
        print(f"Company Size: {company.company_size}")
        print(f"Headquarters: {company.headquarters}")
        print(f"Founded: {company.founded}")
        print(f"Website: {company.website}")
        if company.about_us:
            print(f"About: {company.about_us[:150]}...")
        print("="*60)
        
        # Save data to JSON file
        # Extract company name from URL for filename
        parsed_url = urlparse(company_url)
        company_slug = parsed_url.path.strip('/').split('/')[-1] if parsed_url.path else "company"
        output_file = f"scraped_data_company_{company_slug}.json"
        
        # Save the full data as JSON
        json_data = company.to_json(indent=2)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(json_data)
        
        print(f"\n💾 Full data saved to: {output_file}")
        print(f"   File size: {os.path.getsize(output_file)} bytes")
    
    print("\n✓ Done!")


if __name__ == "__main__":
    asyncio.run(main())