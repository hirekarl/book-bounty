
import requests
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading

class MockServer(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
        print(f"Request path: {self.path}")

def run_server():
    server = HTTPServer(('localhost', 8888), MockServer)
    server.handle_request()

def test_ebay_url():
    thread = threading.Thread(target=run_server)
    thread.start()
    
    url = "http://localhost:8888/search"
    params = {
        "gtin": "039309040X",
        "filter": "conditionIds:{1000|2000|2500|3000|4000}",
        "limit": 20,
    }
    
    response = requests.get(url, params=params)
    print(f"Final URL: {response.request.url}")

if __name__ == "__main__":
    test_ebay_url()
