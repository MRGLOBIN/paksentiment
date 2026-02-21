import logging
import sys
import os

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

from services.content_cleaner import clean_with_justext

# Configure logging
logging.basicConfig(level=logging.INFO)

SAMPLE_HTML = """
<html>
<body>
    <div id="nav">
        <a href="/">Home</a> | <a href="/about">About</a>
    </div>
    <div class="content">
        <h1>Understanding Artificial Intelligence</h1>
        <p>Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems.</p>
        <p>Specific applications of AI include expert systems, natural language processing, speech recognition and machine vision.</p>
        <div class="ad">
            Buy our new AI product now! Only $99.99!
        </div>
        <p>AI requires a foundation of specialized hardware and software for writing and training machine learning algorithms.</p>
    </div>
    <div id="footer">
        Copyright 2024 AI Corp. All rights reserved.
        <a href="/privacy">Privacy Policy</a>
    </div>
</body>
</html>
"""

def test_cleaning():
    print("--- Original HTML ---")
    print(SAMPLE_HTML)
    print("\n--- Cleaning with jusText ---")
    
    # We use very low thresholds for this tiny sample
    clean_text = clean_with_justext(SAMPLE_HTML, length_low=5, length_high=20, max_link_density=0.4)
    
    print("\n--- Extracted Text ---")
    print(clean_text)
    
    # Verification
    if "Artificial Intelligence (AI) is the simulation" in clean_text:
        print("\n✅ Main content found")
    else:
        print("\n❌ Main content missing")
        
    if "Buy our new AI product" not in clean_text:
        print("✅ Ad removed")
    else:
        print("❌ Ad NOT removed (might be classified as content due to length settings)")
        
    if "Home" not in clean_text and "Privacy Policy" not in clean_text:
         print("✅ Navigation/Footer removed")
    else:
         print("❌ Navigation/Footer NOT removed")

if __name__ == "__main__":
    test_cleaning()
