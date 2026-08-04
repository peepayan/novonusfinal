import urllib.request, re

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'ignore')

css = get('https://sanctuary.ai/wp-content/themes/sai/public/build/assets/main-D5McGrhV.css')
print('CSS LEN', len(css))

print('=== @font-face ===')
for m in re.findall(r'@font-face\s*{[^}]+}', css):
    fam = re.search(r'font-family:\s*([^;]+)', m)
    src = re.search(r'src:[^;]+', m)
    w = re.search(r'font-weight:\s*([^;]+)', m)
    st = re.search(r'font-style:\s*([^;]+)', m)
    print(' fam:', fam.group(1) if fam else '?', '| weight:', w.group(1) if w else '?',
          '| style:', st.group(1) if st else '?')
    if src:
        print('   src:', src.group(0)[:160])

print('=== :root / custom props (first 80) ===')
seen = set()
for m in re.findall(r'--[a-zA-Z0-9-]+:\s*[^;}]+', css):
    if m not in seen:
        seen.add(m)
for m in sorted(seen)[:120]:
    print(' ', m[:110])

print('=== cubic-bezier values ===')
from collections import Counter
c = Counter(re.findall(r'cubic-bezier\([^)]+\)', css))
for k, v in c.most_common(15):
    print(' ', k, 'x', v)

print('=== transition durations ===')
c = Counter(re.findall(r'transition-duration:\s*[^;}]+|transition:\s*[^;}]{0,60}', css))
for k, v in c.most_common(20):
    print(' ', k[:90], 'x', v)

print('=== animation durations ===')
c = Counter(re.findall(r'animation(?:-duration)?:\s*[^;}]{0,70}', css))
for k, v in c.most_common(15):
    print(' ', k[:90], 'x', v)

print('=== keyframes names ===')
print(' ', sorted(set(re.findall(r'@keyframes\s+([a-zA-Z0-9_-]+)', css))))

print('=== scrollbar rules ===')
for m in re.findall(r'[^{}]*scrollbar[^{}]*{[^}]*}', css)[:6]:
    print(' ', m[:200])

print('=== font sizes used (counter) ===')
c = Counter(re.findall(r'font-size:\s*([^;}]+)', css))
for k, v in c.most_common(30):
    print(' ', k[:60], 'x', v)

print('=== letter-spacing values ===')
c = Counter(re.findall(r'letter-spacing:\s*([^;}]+)', css))
for k, v in c.most_common(15):
    print(' ', k, 'x', v)

print('=== border-radius values ===')
c = Counter(re.findall(r'border-radius:\s*([^;}]+)', css))
for k, v in c.most_common(15):
    print(' ', k[:50], 'x', v)

print('=== max-width values ===')
c = Counter(re.findall(r'max-width:\s*([^;}]+)', css))
for k, v in c.most_common(15):
    print(' ', k[:50], 'x', v)

print('=== colors hex (counter, top 40) ===')
c = Counter(h.lower() for h in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', css))
for k, v in c.most_common(40):
    print(' ', k, 'x', v)

# JS scan
js = get('https://sanctuary.ai/wp-content/themes/sai/public/build/assets/main-D4eF5co0.js')
print('JS LEN', len(js))
print('=== JS library fingerprints ===')
for name, pat in [
    ('gsap', r'gsap'), ('ScrollTrigger', r'ScrollTrigger'), ('three.js', r'THREE|three\.module'),
    ('lenis', r'[Ll]enis'), ('locomotive', r'locomotive'), ('barba', r'barba'),
    ('swiper', r'[Ss]wiper'), ('splitting', r'[Ss]plitting'), ('SplitText', r'SplitText'),
    ('lottie', r'lottie'), ('alpine', r'Alpine'), ('vue', r'__vue|createApp'),
    ('react', r'react'), ('framer', r'framer'), ('motionone', r'motion-one|@motionone'),
    ('embla', r'embla'), ('keen', r'keen-slider'), ('flickity', r'flickity'),
    ('intersectionObserver', r'IntersectionObserver'), ('matchMedia', r'matchMedia'),
    ('requestAnimationFrame', r'requestAnimationFrame'), ('canvas', r'getContext\('),
    ('WebGL', r'webgl|WebGL'), ('video', r'\.play\(\)'),
]:
    hits = len(re.findall(pat, js))
    if hits:
        print(f'  {name}: {hits} hits')
print('=== gsap version string ===')
for m in set(re.findall(r'version[:=]"([0-9.]+)"', js))|set(re.findall(r'"([0-9]+\.[0-9]+\.[0-9]+)".{0,30}gsap', js)):
    print(' ', m)
print('=== easing strings in JS ===')
c = Counter(re.findall(r'"(power[0-9.]+\.(?:in|out|inOut)|expo\.(?:in|out|inOut)|circ\.[a-zA-Z]+|back\.[a-zA-Z.()0-9,]+|elastic[a-zA-Z.()0-9,]*|sine\.[a-zA-Z]+|none)"', js))
for k, v in c.most_common(20):
    print(' ', k, 'x', v)
print('=== durations in JS (duration:X) ===')
c = Counter(re.findall(r'duration:\s*([0-9.]+)', js))
for k, v in c.most_common(20):
    print(' ', k, 'x', v)
print('=== stagger values ===')
c = Counter(re.findall(r'stagger:\s*([0-9.{]+[^,}]{0,20})', js))
for k, v in c.most_common(10):
    print(' ', k[:40], 'x', v)
