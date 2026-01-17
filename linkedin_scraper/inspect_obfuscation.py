
from bs4 import BeautifulSoup

with open('debug_search_empty_results.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("--- RESULT ITEM STRUCTURE ---")
# Find the first item with the known class
item = soup.find(class_='MZSsfLiODzNiMICsktYVYtWEZnsHvEMmiGYEI')
if item:
    print(item.prettify()[:2000])
    
    # Try to find the title inside
    # Search for "Bit" or "BITS" or whatever usually appears to identify the title element class
    # The scraper looks for "BITS Pilani" usually or people's names.
    # Let's print all <a> tags inside
    print("\n--- LINKS INSIDE ITEM ---")
    for a in item.find_all('a'):
        print(f"Text: {a.get_text(strip=True)}")
        print(f"Href: {a.get('href')}")
        print(f"Classes: {a.get('class')}")
        print("-" * 20)
else:
    print("Item class not found!")
