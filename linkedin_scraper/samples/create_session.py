#!/usr/bin/env python3
"""
Create LinkedIn Session File

This script helps you create a linkedin_session.json file by logging in automatically.
The session file is needed to run integration tests and scraping examples.

Usage:
    python samples/create_session.py

The script will:
1. Open a browser window with LinkedIn login page
2. Automatically log in using provided credentials
3. Save your session to linkedin_session.json

Note: The session file contains authentication cookies and should never be committed to git.
"""

import asyncio
from linkedin_scraper import BrowserManager, wait_for_manual_login

# LinkedIn credentials - Replace with your actual email and password
LINKEDIN_EMAIL = "kronos.ch123@gmail.com"
LINKEDIN_PASSWORD = "Fdsafdsa1"


async def create_session():
    """Create a LinkedIn session file through automatic login."""
    print("=" * 60)
    print("LinkedIn Session Creator")
    print("=" * 60)
    print("\nThis script will help you create a session file for LinkedIn.")
    print("\nSteps:")
    print("1. A browser window will open")
    print("2. Automatically log in to LinkedIn")
    print("3. Your session will be saved to linkedin_session.json")
    print("\n" + "=" * 60 + "\n")

    async with BrowserManager(headless=False) as browser:
        # Navigate to LinkedIn login page
        print("Opening LinkedIn login page...")
        await browser.page.goto("https://www.linkedin.com/login")

        print("\n🔐 Automatically logging in to LinkedIn...")

        # Wait for login form to load
        await browser.page.wait_for_selector('input[name="session_key"]', timeout=10000)
        await browser.page.wait_for_selector(
            'input[name="session_password"]', timeout=10000
        )

        # Fill in email
        await browser.page.fill('input[name="session_key"]', LINKEDIN_EMAIL)

        # Fill in password
        await browser.page.fill('input[name="session_password"]', LINKEDIN_PASSWORD)

        # Click submit button
        await browser.page.click('button[type="submit"]')

        print("   - Credentials entered and submitted")
        print("   - Waiting for login completion...\n")

        # Wait for login to complete (similar to manual login detection)
        try:
            await wait_for_manual_login(browser.page, timeout=300000)
        except Exception as e:
            print(f"\n❌ Login failed: {e}")
            print("\nPlease check your credentials and try again.")
            print("  - Make sure your email and password are correct")
            print("  - Complete any 2FA or CAPTCHA challenges if prompted")
            return

        # Save session to project root
        session_path = "linkedin_session.json"
        print(f"\n💾 Saving session to {session_path}...")
        await browser.save_session(session_path)

        print("\n" + "=" * 60)
        print("✅ Success! Session file created.")
        print("=" * 60)
        print(f"\nSession saved to: {session_path}")
        print("\nYou can now:")
        print("  - Run integration tests: pytest")
        print("  - Run example scripts: python samples/scrape_person.py")
        print("\nNote: Keep this file secure and don't commit it to git.")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(create_session())
