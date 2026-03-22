import urllib.request, json, base64

req = urllib.request.Request('http://127.0.0.1:8000/api/accounts/login/', data=json.dumps({'username': 'admin', 'password': '123456'}).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    token = data['access']
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    decoded = json.loads(base64.b64decode(payload).decode('utf-8'))
    print("Token Payload:", decoded)
except Exception as e:
    print("LỖI:", e)
