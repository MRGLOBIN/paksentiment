import sys
import os
from unittest.mock import MagicMock

# Mock paksentiment_scraper base
sys.modules['paksentiment_scraper'] = MagicMock()
sys.modules['paksentiment_scraper.base'] = MagicMock()
sys.modules['sentiment_classifier'] = MagicMock()
sys.modules['config'] = MagicMock()

# Mock dependencies to avoid actual DB/API connections during import check
# (Though main.py only connects in lifespan, so import should be safe if dependencies allow)

try:
    from main import app
    print("✅ Successfully imported main.app")
except ImportError as e:
    print(f"❌ Failed to import main.app: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error during import: {e}")
    sys.exit(1)
