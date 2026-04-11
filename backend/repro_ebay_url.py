
import requests

def test_ebay_url():
    url = "https://api.ebay.com/buy/browse/v1/item_summary/search"
    params = {
        "gtin": "039309040X",
        "filter": "conditionIds:{1000|2000|2500|3000|4000}",
        "limit": 20,
    }
    
    # We use a PreparedRequest to see the final URL without making a real request
    req = requests.Request('GET', url, params=params)
    prepared = req.prepare()
    print(f"URL: {prepared.url}")

if __name__ == "__main__":
    test_ebay_url()
