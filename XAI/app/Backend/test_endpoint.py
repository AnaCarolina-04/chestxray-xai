
import requests
import json

url = "http://localhost:5000/api/xrays/1/analyze/Nodule"

try:
    print(f"Sending request to {url}...")
    response = requests.post(url)
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response Text: {response.text}")
except Exception as e:
    print(f"Error: {e}")
