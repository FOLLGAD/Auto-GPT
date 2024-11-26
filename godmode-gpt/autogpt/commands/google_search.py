"""Google search command for Autogpt."""
from __future__ import annotations

import json

from duckduckgo_search import DDGS
import requests

from autogpt.commands.command import command
from autogpt.config import Config
import random
import os

# global_config = Config()

# HEADERS = {
#     "Referer": "https://duckduckgo.com/",
#     "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
#         if random.randint(0, 1) > 0.5 else "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/113.0",
#     "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
#     "Accept-Language": "en-US,en;q=0.5",
#     "Upgrade-Insecure-Requests": "1",
#     "Sec-Fetch-Dest": "document",
#     "Sec-Fetch-Mode": "navigate",
#     "Sec-Fetch-Site": "same-origin",
#     "Sec-Fetch-User": "?1"
# }
# ddgs = DDGS(headers=HEADERS)

headers = {
    'X-API-KEY': os.environ.get("SERPER_API_KEY"),
    'Content-Type': 'application/json'
}

@command("google", "Google Search", '"query": "<query>"')
def google_search(query: str, num_results: int = 8, **kwargs) -> str:
    """Return the results of a Google search

    Args:
        query (str): The search query.
        num_results (int): The number of results to return.

    Returns:
        str: The results of the search.
    """
    url = "https://google.serper.dev/search"

    payload = json.dumps({
        "q": query,
    })

    response = requests.request("POST", url, headers=headers, data=payload)

    results = response.json()
    results = results["organic"]

    search_results = [{
        "title": r["title"],
        "link": r["link"],
        "snippet": r["snippet"]
    } for r in results[0:num_results]]

    return json.dumps(search_results, indent=1)

    # search_results = []
    # if not query:
    #     return json.dumps(search_results)

    # try:
    #     results = ddgs.text(query, safesearch="Off")
    # except Exception as e:
    #     print("DDG ERR:", e)
    #     return json.dumps(search_results)

    # if not results:
    #     return json.dumps(search_results)

    # for result in islice(results, num_results):
    #     search_results.append(result)

    # results = json.dumps(search_results, ensure_ascii=False, indent=4)
    # return safe_google_results(results)


# from googleapiclient.discovery import build
# from googleapiclient.errors import HttpError

# @command(
#     "google",
#     "Google Search",
#     '"query": "<query>"',
#     bool(global_config.google_api_key) and bool(global_config.custom_search_engine_id),
#     "Configure google_api_key and custom_search_engine_id.",
# )
# def google_official_search(query: str, num_results: int = 8, **kwargs) -> str | list[str]:
#     """Return the results of a Google search using the official Google API

#     Args:
#         query (str): The search query.
#         num_results (int): The number of results to return.

#     Returns:
#         str: The results of the search.
#     """

#     try:
#         # Get the Google API key and Custom Search Engine ID from the config file
#         api_key = global_config.google_api_key
#         custom_search_engine_id = global_config.custom_search_engine_id

#         # Initialize the Custom Search API service
#         service = build("customsearch", "v1", developerKey=api_key)

#         # Send the search query and retrieve the results
#         result = (
#             service.cse()
#             .list(q=query, cx=custom_search_engine_id, num=num_results)
#             .execute()
#         )

#         # Extract the search result items from the response
#         search_results = result.get("items", [])

#         # Create a list of only the URLs from the search results
#         search_results_links = [f"{item['link']} {item['title']}: {item['snippet']}" for item in search_results]

#     except HttpError as e:
#         # Handle errors in the API call
#         error_details = json.loads(e.content.decode())

#         # Check if the error is related to an invalid or missing API key
#         if error_details.get("error", {}).get(
#             "code"
#         ) == 403 and "invalid API key" in error_details.get("error", {}).get(
#             "message", ""
#         ):
#             return "Error: The provided Google API key is invalid or missing."
#         else:
#             return f"Error: {e}"
#     # google_result can be a list or a string depending on the search results

#     # Return the list of search result URLs
#     return safe_google_results("\n".join(search_results_links))


def safe_google_results(results: str | list) -> str:
    """
        Return the results of a google search in a safe format.

    Args:
        results (str | list): The search results.

    Returns:
        str: The results of the search.
    """
    if isinstance(results, list):
        safe_message = json.dumps(
            [result.encode("utf-8", "ignore").decode("utf-8") for result in results]
        )
    else:
        safe_message = results.encode("utf-8", "ignore").decode("utf-8")
    return safe_message
