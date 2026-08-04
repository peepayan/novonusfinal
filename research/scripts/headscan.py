import urllib.request, re, sys

url = sys.argv[1] if len(sys.argv) > 1 else 'https://sanctuary.ai/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
print('LEN', len(html))
print('--- THEME/PLUGIN PATHS ---')
for m in sorted(set(re.findall(r'wp-content/(?:themes|plugins)/([a-z0-9_-]+)', html))):
    print(' ', m)
print('--- CSS LINKS ---')
for m in sorted(set(re.findall(r'<link[^>]+href="([^"]+\.css[^"]*)"', html)))[:25]:
    print(' ', m[:130])
print('--- SCRIPTS ---')
for m in sorted(set(re.findall(r'<script[^>]+src="([^"]+)"', html)))[:35]:
    print(' ', m[:130])
print('--- FONT FILE HINTS ---')
for m in sorted(set(re.findall(r'([A-Za-z0-9_.-]+\.(?:woff2?|ttf|otf))', html)))[:25]:
    print(' ', m)
print('--- INLINE FONT-FAMILY ---')
for m in sorted(set(re.findall(r'font-family:[^;}{]{0,90}', html)))[:20]:
    print(' ', m[:110])
print('--- GENERATOR ---')
for m in set(re.findall(r'<meta name="generator" content="([^"]+)"', html)):
    print(' ', m)
print('--- BODY CLASS ---')
b = re.search(r'<body[^>]*class="([^"]*)"', html)
print(' ', (b.group(1)[:200] if b else 'n/a'))
