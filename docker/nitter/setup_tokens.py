import requests
import json
import os
import time

# Constants
GUEST_TOKEN_URL = "https://api.twitter.com/1.1/guest/activate.json"
BEARER_TOKEN = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
OUTPUT_FILE = "guest_accounts.json"
SESSIONS_FILE = "sessions.jsonl"

def generate_guest_token():
    headers = {
        "authorization": BEARER_TOKEN,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        print("Requesting guest token...")
        response = requests.post(GUEST_TOKEN_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        token = data.get("guest_token")
        
        if not token:
            print("❌ No guest_token found in response.")
            return None
            
        print(f"✅ Generated token: {token}")
        return token
        
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        return None

def save_tokens(tokens):
    # Nitter expects a list of objects in guest_accounts.json
    # Format: [{"oauth_token": "...", "oauth_token_secret": "...", "screen_name": "..."}] 
    # WAIT - Guest tokens are different from Account tokens.
    # Nitter recent versions support `guest_accounts.json` which are just guest tokens?
    # Actually, looking at Nitter source, guest_accounts.json is for OAUTH tokens (real accounts used as guests).
    # TO USE PURE GUEST TOKENS (no login), Nitter does it internally IF it works.
    # BUT if it's rate limited, we can't easily "generate" a new one that works better than Nitter's internal one 
    # UNLESS we rotate them.
    
    # However, there is a `sessions.jsonl` which allows using REAL accounts.
    # The user asked to "generate" one. Generating a REAL account session/token requires login.
    
    # LET'S TRY: Generating a `guest_accounts.json` with the structure Nitter expects for GUEST access if supported.
    # If Nitter expects OAuth tokens there, we can't generate them without a real account.
    
    # ALTERNATIVE: The "Guest Token" (numeric) I generated above is what the frontend uses.
    # Nitter might use it if we put it in the right place?
    # Nitter usually generates these on the fly. If it's 429ing, it means the IP is blocked.
    # Providing a gathered token MIGHT help if Nitter uses it.
    
    # There is no standard config to "inject" a numeric guest token into Nitter via file.
    # The `sessions.jsonl` is for ACCOUNT sessions.
    
    # CONCLUSION: You cannot "generate" a session file without a real Twitter account.
    # I should explain this to the user.
    # BUT, I will try to generate a valid `sessions.jsonl` structure using a dummy account to show the format,
    # OR if there's a way to use the guest token.
    
    # Actually, let's create a script that helps the user log in? No, too complex/risky.
    
    # Let's save the guest token to a file just in case, but really, I should inform the user.
    pass

if __name__ == "__main__":
    # Just creating the files to ensure they exist and are valid JSON
    
    # 1. sessions.jsonl (Empty is fine, or needs valid sessions)
    if not os.path.exists(SESSIONS_FILE):
        print(f"Creating empty {SESSIONS_FILE}")
        open(SESSIONS_FILE, 'w').close()
        
    # 2. guest_accounts.json
    # Must be a JSON array
    if not os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'w') as f:
            json.dump([], f)
    
    print("Files ensured. To fix 429, you typically need to add REAL account sessions to sessions.jsonl.")
    print("Format per line: {\"username\": \"...\", \"password\": \"...\"}")
    print("Or generate tokens manually.")

