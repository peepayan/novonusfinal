"""Capture scale.com pages: screenshots (full + scroll steps) and computed-style JSON."""
import json, sys, os, time
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\scale"
DATA = r"C:\Users\deepa\novonus-v2\research\data"
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(DATA, exist_ok=True)

PAGES = {
    "home": "https://scale.com/",
    "data-engine": "https://scale.com/data-engine",
    "genai-platform": "https://scale.com/genai-platform",
    "donovan": "https://scale.com/donovan",
    "enterprise": "https://scale.com/enterprise",
    "public-sector": "https://scale.com/public-sector",
    "global-public-sector": "https://scale.com/global-public-sector",
    "automotive": "https://scale.com/automotive",
    "physical-ai": "https://scale.com/physical-ai",
    "customers-time": "https://scale.com/customers/time",
    "blog-index": "https://scale.com/blog",
    "blog-swe-bench-pro": "https://scale.com/blog/swe-bench-pro",
    "blog-physical-ai": "https://scale.com/blog/physical-ai",
    "about": "https://scale.com/about",
    "careers": "https://scale.com/careers",
    "demo": "https://scale.com/demo",
    "leaderboard": "https://labs.scale.com/leaderboard",
}

STYLE_JS = r"""
() => {
  const cs = (el) => {
    const s = getComputedStyle(el);
    return {
      fontFamily: s.fontFamily.slice(0, 90), fontSize: s.fontSize, fontWeight: s.fontWeight,
      lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textTransform: s.textTransform,
      color: s.color, background: s.backgroundColor,
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
      radius: s.borderRadius, border: s.border, padding: s.padding,
    };
  };
  const grab = (sel, n=3) => [...document.querySelectorAll(sel)].slice(0, n).map(cs);

  // eyebrows: uppercase small text
  const eyebrows = [];
  for (const el of document.querySelectorAll('span, p, div, h5, h6')) {
    if (eyebrows.length >= 6) break;
    const s = getComputedStyle(el);
    const t = (el.innerText || '').trim();
    if (t && t.length > 2 && t.length < 60 && el.children.length === 0 &&
        (s.textTransform === 'uppercase' || /^[A-Z0-9\s&/+-]+$/.test(t)) &&
        parseFloat(s.fontSize) <= 16 && parseFloat(s.letterSpacing) > 0.4) {
      eyebrows.push(cs(el));
    }
  }

  // buttons
  const btns = [];
  for (const el of document.querySelectorAll('a, button')) {
    if (btns.length >= 8) break;
    const s = getComputedStyle(el);
    const t = (el.innerText || '').trim();
    if (t && t.length < 40 && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderRadius) > 0) &&
        (parseFloat(s.paddingLeft) >= 10)) {
      btns.push(cs(el));
    }
  }

  // section backgrounds in order
  const sections = [];
  const candidates = document.querySelectorAll('main > *, main > div > *, body > div > main > *, section');
  const seen = new Set();
  for (const el of candidates) {
    if (sections.length >= 30) break;
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    const abs = r.top + window.scrollY;
    if (r.height < 120) continue;
    const s = getComputedStyle(el);
    sections.push({tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
      top: Math.round(abs), h: Math.round(r.height), bg: s.backgroundColor,
      bgImage: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 120)});
  }

  // containers: max-width elements
  const containers = {};
  for (const el of document.querySelectorAll('div, section, header, nav')) {
    const s = getComputedStyle(el);
    if (s.maxWidth && s.maxWidth !== 'none' && s.maxWidth.endsWith('px')) {
      const k = s.maxWidth;
      containers[k] = (containers[k] || 0) + 1;
    }
  }

  // color inventory
  const toHex = (rgb) => {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    const h = (n) => (+n).toString(16).padStart(2, '0');
    return '#' + h(m[1]) + h(m[2]) + h(m[3]) + (m[4] !== undefined && parseFloat(m[4]) < 1 ? ' @' + m[4] : '');
  };
  const colors = {};
  const els = [...document.querySelectorAll('*')];
  for (let i = 0; i < els.length; i += Math.max(1, Math.floor(els.length / 3000))) {
    const s = getComputedStyle(els[i]);
    for (const c of [s.color, s.backgroundColor, s.borderTopColor]) {
      const hx = toHex(c);
      if (hx) colors[hx] = (colors[hx] || 0) + 1;
    }
  }
  const topColors = Object.entries(colors).sort((a,b) => b[1]-a[1]).slice(0, 28);

  // fonts loaded
  const fonts = [...new Set([...document.fonts].map(f => f.family + ' ' + f.weight))].slice(0, 24);

  // gradients used anywhere
  const gradients = new Set();
  for (let i = 0; i < els.length; i += Math.max(1, Math.floor(els.length / 1500))) {
    const bi = getComputedStyle(els[i]).backgroundImage;
    if (bi && bi.includes('gradient')) gradients.add(bi.slice(0, 200));
    if (gradients.size >= 10) break;
  }

  const nav = document.querySelector('header, nav');
  const navInfo = nav ? {...cs(nav), position: getComputedStyle(nav).position, height: Math.round(nav.getBoundingClientRect().height), backdrop: getComputedStyle(nav).backdropFilter} : null;

  return {
    title: document.title,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 90),
    pageHeight: Math.round(document.documentElement.scrollHeight),
    h1: grab('h1'), h2: grab('h2', 4), h3: grab('h3', 4), h4: grab('h4', 2),
    p: grab('main p, p', 4),
    eyebrows, buttons: btns, sections, containers, topColors, fonts,
    gradients: [...gradients], nav: navInfo,
    videoCount: document.querySelectorAll('video').length,
    canvasCount: document.querySelectorAll('canvas').length,
    svgCount: document.querySelectorAll('svg').length,
    imgSample: [...document.querySelectorAll('img')].slice(0, 12).map(i => ({src: (i.currentSrc || i.src || '').slice(0, 130), alt: (i.alt||'').slice(0,50), w: i.width, h: i.height})),
  };
}
"""

TECH_JS = r"""
() => {
  const g = window;
  const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
  return {
    gsap: !!g.gsap, ScrollTrigger: !!g.ScrollTrigger, THREE: !!g.THREE,
    Lenis: !!(g.Lenis || g.lenis), next: !!document.querySelector('script[src*="_next"]'),
    framerMotion: scripts.some(s => /framer/i.test(s)),
    lottie: !!g.lottie || scripts.some(s => /lottie/i.test(s)),
    rive: scripts.some(s => /rive/i.test(s)),
    spline: !!document.querySelector('spline-viewer, canvas[data-engine*="spline" i]'),
    webgl: [...document.querySelectorAll('canvas')].some(c => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch(e) { return false; } }),
    videos: [...document.querySelectorAll('video')].map(v => ({src: (v.currentSrc||v.src||'').slice(0,140), auto: v.autoplay, loop: v.loop, muted: v.muted, poster: (v.poster||'').slice(0,100)})),
  };
}
"""

def dismiss_banners(page):
    for sel in ["button:has-text('Accept')", "button:has-text('Accept All')", "button:has-text('Got it')",
                "[id*='cookie'] button", "[class*='cookie'] button:has-text('OK')"]:
        try:
            b = page.locator(sel).first
            if b.is_visible(timeout=800):
                b.click(timeout=1500)
                page.wait_for_timeout(400)
                break
        except Exception:
            pass

def capture(page, name, url, scroll_steps=4, full=True):
    print(f"--- {name}: {url}")
    try:
        resp = page.goto(url, timeout=60000, wait_until="domcontentloaded")
        status = resp.status if resp else None
        print("status:", status)
        if status and status >= 400:
            return {"name": name, "url": url, "status": status, "error": "http"}
        page.wait_for_timeout(5000)
        dismiss_banners(page)
    except Exception as e:
        print("nav error:", e)
        return {"name": name, "url": url, "error": str(e)[:200]}

    result = {"name": name, "url": url, "finalUrl": page.url}

    # hero shot
    try:
        page.screenshot(path=os.path.join(SHOTS, f"{name}-00-hero.png"))
    except Exception as e:
        print("hero shot err:", e)

    # scroll steps
    try:
        height = page.evaluate("document.documentElement.scrollHeight")
        vh = 900
        steps = min(scroll_steps, max(1, (height - vh) // vh)) if height > vh else 0
        for i in range(1, steps + 1):
            y = int((height - vh) * i / (steps + 0.0001)) if steps else 0
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(1800)
            page.screenshot(path=os.path.join(SHOTS, f"{name}-{i:02d}-scroll-{y}.png"))
        result["pageHeight"] = height
    except Exception as e:
        print("scroll err:", e)

    # full page
    if full:
        try:
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(SHOTS, f"{name}-full.png"), full_page=True, timeout=45000)
        except Exception as e:
            print("full shot err:", e)

    # styles + tech
    try:
        result["styles"] = page.evaluate(STYLE_JS)
    except Exception as e:
        print("style err:", e)
    try:
        result["tech"] = page.evaluate(TECH_JS)
    except Exception as e:
        print("tech err:", e)

    with open(os.path.join(DATA, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)
    print("done", name)
    return result

def main():
    wanted = sys.argv[1:] or list(PAGES.keys())
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            device_scale_factor=1,
        )
        page = ctx.new_page()
        page.set_default_timeout(30000)
        for name in wanted:
            if name not in PAGES:
                print("unknown page:", name); continue
            try:
                capture(page, name, PAGES[name])
            except Exception as e:
                print("FATAL for", name, e)
                try:
                    page.close(); page = ctx.new_page()
                except Exception:
                    pass
        browser.close()

if __name__ == "__main__":
    main()
