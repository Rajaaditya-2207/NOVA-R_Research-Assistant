import requests

urls = [
    ('GET', 'http://127.0.0.1:5000/'),
    ('GET', 'http://127.0.0.1:5000/chat'),
]

for method, url in urls:
    try:
        r = requests.request(method, url, timeout=5)
        print(f"{method} {url} -> {r.status_code} | {r.headers.get('content-type','')}")
    except Exception as e:
        print(f"{method} {url} -> ERROR: {e}")

# POST /chat/ask
try:
    r = requests.post('http://127.0.0.1:5000/chat/ask', json={'message':'smoke test'}, timeout=10)
    print(f"POST /chat/ask -> {r.status_code} | {r.headers.get('content-type','')}")
    print('BODY:', r.text[:300])
except Exception as e:
    print('POST /chat/ask -> ERROR:', e)

# POST /chat/upload
try:
    r = requests.post('http://127.0.0.1:5000/chat/upload', files={'file':('test.txt','hello world')}, timeout=20)
    print(f"POST /chat/upload -> {r.status_code}")
    print('BODY:', r.text[:300])
except Exception as e:
    print('POST /chat/upload -> ERROR:', e)
