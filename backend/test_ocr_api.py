import requests
import json
import base64
import os

# Create a dummy image
img_path = 'dummy_test.jpg'
with open(img_path, 'wb') as f:
    f.write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='))

url = "http://127.0.0.1:8000/api/feedbacks/ocr_parse/"
data = {"document_id": 1} # Dummy document ID, may return 403 or 400 but not 500

print(f"Testing API {url}...")
try:
    with open(img_path, 'rb') as f:
        files = {'file': f}
        # First we need a token or we can just send without auth to see if we get 401 instead of 500
        response = requests.post(url, data=data, files=files)
        print("Status Code:", response.status_code)
        try:
            print("Response:", response.json())
        except:
            print("Raw Response:", response.text)
except Exception as e:
    print("Error:", e)
    
if os.path.exists(img_path):
    os.remove(img_path)
