"""
Simple test script to verify Groq and Gemini API configurations.
Run this from the fast-api directory: python test_apis.py
"""

import asyncio
from config import settings
import google.generativeai as genai
from groq import Groq


async def test_gemini():
    print("\n🧪 Testing Gemini API...")
    try:
        api_key = settings.get("GOOGLE_API_KEY")
        if not api_key:
            print("❌ GOOGLE_API_KEY not found in config")
            return False

        print(f"✅ API Key found: {api_key[:10]}...")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        
        # Simple test prompt
        response = await asyncio.to_thread(
            model.generate_content,
            "Say 'hello' in one word only."
        )
        
        result = response.text if hasattr(response, "text") else str(response)
        print(f"✅ Gemini Response: {result.strip()}")
        print("✅ Gemini API is working!")
        return True
        
    except Exception as e:
        print(f"❌ Gemini API Error: {str(e)}")
        return False


def test_groq():
    print("\n🧪 Testing Groq API...")
    try:
        api_key = settings.get("GROQ_API_KEY")
        translation_model = settings.get("TRANSLATION_MODEL")
        
        if not api_key:
            print("❌ GROQ_API_KEY not found in config")
            return False

        print(f"✅ API Key found: {api_key[:10]}...")
        print(f"✅ Model: {translation_model or 'llama-3.3-70b-versatile'}")
        
        client = Groq(api_key=api_key)
        model = translation_model or "llama-3.3-70b-versatile"
        
        # Simple test prompt
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'hello' in one word only."}
            ],
        )
        
        result = response.choices[0].message.content or ""
        print(f"✅ Groq Response: {result.strip()}")
        print("✅ Groq API is working!")
        return True
        
    except Exception as e:
        print(f"❌ Groq API Error: {str(e)}")
        return False


async def main():
    print("=" * 50)
    print("🔬 API Configuration Test")
    print("=" * 50)
    
    gemini_ok = await test_gemini()
    groq_ok = test_groq()
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    print(f"Gemini API: {'✅ Working' if gemini_ok else '❌ Failed'}")
    print(f"Groq API:   {'✅ Working' if groq_ok else '❌ Failed'}")
    print("=" * 50)
    
    if gemini_ok and groq_ok:
        print("\n🎉 All APIs are working correctly!")
    else:
        print("\n⚠️  Some APIs are not working. Check the errors above.")


if __name__ == "__main__":
    asyncio.run(main())
