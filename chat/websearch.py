import os
import requests
from config import Config

def search_web(query, max_results=5):
    """
    Search the web using DuckDuckGo or SerpAPI based on configuration.
    Returns a list of search results with title, snippet, and URL.
    """
    provider = Config.SEARCH_PROVIDER.lower()
    
    if provider == "serpapi" and Config.SERPAPI_KEY:
        return search_with_serpapi(query, max_results)
    else:
        return search_with_duckduckgo(query, max_results)

def search_with_duckduckgo(query, max_results=5):
    """
    Simple DuckDuckGo search using their Instant Answer API.
    Note: This is a basic implementation. For production use, consider using
    a proper web scraping solution or paid API.
    """
    try:
        # DuckDuckGo Instant Answer API (limited functionality)
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": 1,
            "skip_disambig": 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        
        # Extract abstract if available
        if data.get("Abstract"):
            results.append({
                "title": data.get("Heading", query),
                "snippet": data.get("Abstract"),
                "url": data.get("AbstractURL", "")
            })
        
        # Extract related topics
        for topic in data.get("RelatedTopics", [])[:max_results-len(results)]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Text", "")[:100] + "...",
                    "snippet": topic.get("Text", ""),
                    "url": topic.get("FirstURL", "")
                })
        
        return results[:max_results]
        
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return []

def search_with_serpapi(query, max_results=5):
    """
    Search using SerpAPI (Google Search API).
    Requires SERPAPI_KEY to be set in environment.
    """
    try:
        url = "https://serpapi.com/search"
        params = {
            "q": query,
            "api_key": Config.SERPAPI_KEY,
            "engine": "google",
            "num": max_results
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for result in data.get("organic_results", [])[:max_results]:
            results.append({
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "url": result.get("link", "")
            })
        
        return results
        
    except Exception as e:
        print(f"SerpAPI search error: {e}")
        return []

def format_search_results(results):
    """
    Format search results into a readable string for use in RAG context.
    """
    if not results:
        return "No web search results found."
    
    formatted = "Web Search Results:\n\n"
    for i, result in enumerate(results, 1):
        formatted += f"{i}. {result.get('title', 'No Title')}\n"
        formatted += f"   {result.get('snippet', 'No description available')}\n"
        if result.get('url'):
            formatted += f"   Source: {result['url']}\n"
        formatted += "\n"
    
    return formatted
