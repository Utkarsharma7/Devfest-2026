
from bs4 import BeautifulSoup
with open('debug_filter_Current_companies.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("--- VISIBLE TEXT DUMP ---")
print(soup.get_text()[:2000])

print("\n--- BUTTONS ---")
for btn in soup.find_all('button')[:20]:
    print(btn.get_text().strip())

print("\n--- H3 HEADERS ---")
for h3 in soup.find_all('h3'):
    print(h3.get_text().strip())
