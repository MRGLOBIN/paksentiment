import requests

url = "http://localhost:8000/scrapling/fetch?url=https://news.google.com&follow_links=false&limit=1"
print(f"Fetching: {url}")
try:
    resp = requests.get(url)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}...")
except Exception as e:
    print(f"Error: {e}")
