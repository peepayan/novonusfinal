"""Targeted component measurements on data-engine + home + genai."""
import json
from playwright.sync_api import sync_playwright

def run(page, url, js, label):
    page.goto(url, timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    try:
        out = page.evaluate(js)
        print(f"===== {label} =====")
        print(json.dumps(out, indent=1)[:4000])
    except Exception as e:
        print(label, "ERR", str(e)[:200])

JS_DE = r"""
() => {
  const q = (sel) => document.querySelector(sel);
  const out = {};
  const hero = q('.FullBleedMediaSection');
  if (hero) {
    const inner = hero.querySelector('div');
    const media = hero.querySelector('video, img');
    const s = inner ? getComputedStyle(inner) : null;
    out.heroSection = {
      w: Math.round(hero.getBoundingClientRect().width),
      innerRadius: s ? s.borderRadius : null,
      innerBg: s ? s.backgroundColor : null,
      pad: getComputedStyle(hero).padding,
      mediaTag: media ? media.tagName : null,
    };
    const h = hero.querySelector('h1, h2');
    if (h) { const hs = getComputedStyle(h); out.heroTitle = {fs: hs.fontSize, lh: hs.lineHeight, fw: hs.fontWeight, ls: hs.letterSpacing, color: hs.color}; }
    const btn = hero.querySelector('a[class*="Button"], a[href*="demo"], button');
    if (btn) { const bs = getComputedStyle(btn); out.heroBtn = {bg: bs.backgroundColor, color: bs.color, r: bs.borderRadius, pad: bs.padding, fs: bs.fontSize, h: Math.round(btn.getBoundingClientRect().height), text: btn.innerText.trim().slice(0,20)}; }
  }
  // logo bar
  const imgs = [...document.querySelectorAll('img')].filter(i => /logo/i.test(i.alt + i.src) || i.closest('[class*="Logo"], [class*="logo"]'));
  out.logoCount = imgs.length;
  if (imgs[0]) { out.logoSample = {h: imgs[0].height, filter: getComputedStyle(imgs[0]).filter, opacity: getComputedStyle(imgs[0]).opacity}; }
  // Card in CardGrid
  const card = q('.CardGrid [class*="Card"], .Card');
  if (card) {
    const cs = getComputedStyle(card);
    out.card = {r: cs.borderRadius, bg: cs.backgroundColor, border: cs.border, shadow: cs.boxShadow.slice(0,100), pad: cs.padding, w: Math.round(card.getBoundingClientRect().width)};
  }
  // dividers
  const hr = q('hr, [class*="divider"], [class*="Divider"]');
  if (hr) { const hs = getComputedStyle(hr); out.divider = {h: hs.height, bg: hs.backgroundColor, border: hs.borderTop}; }
  // section paddings sample
  out.sectionPads = [...document.querySelectorAll('section, [class*="py-"]')].slice(0, 8).map(el => getComputedStyle(el).padding);
  return out;
}
"""

JS_CTA = r"""
() => {
  const out = {};
  // find "future of your industry" band
  const el = [...document.querySelectorAll('h2, h3, div')].find(e => /future of your industry/i.test(e.innerText || '') && e.children.length < 8);
  if (el) {
    const s = getComputedStyle(el);
    out.ctaHeadline = {fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, color: s.color, ff: s.fontFamily.slice(0,40)};
    const sec = el.closest('section, div[class*="Section"], div[class*="section"]');
    if (sec) {
      const ss = getComputedStyle(sec);
      out.ctaSection = {bg: ss.backgroundColor, h: Math.round(sec.getBoundingClientRect().height), pad: ss.padding};
      const vid = sec.querySelector('video, img');
      out.ctaMedia = vid ? vid.tagName : null;
      const btn = sec.querySelector('a, button');
      if (btn) { const bs = getComputedStyle(btn); out.ctaBtn = {text: btn.innerText.trim().slice(0,24), bg: bs.backgroundColor, color: bs.color, r: bs.borderRadius, pad: bs.padding}; }
    }
  }
  // spans inside headline with different fonts (mixed-typeface headline)
  const mixed = [...document.querySelectorAll('h1 span, h2 span, h3 span')].map(sp => {
    const s = getComputedStyle(sp);
    return {t: (sp.innerText||'').trim().slice(0,20), ff: s.fontFamily.split(',')[0], fs: s.fontSize, style: s.fontStyle, color: s.color};
  }).filter(x => x.t);
  const fams = {};
  mixed.forEach(m => { fams[m.ff] = fams[m.ff] || m; });
  out.headlineFontVariants = Object.values(fams).slice(0, 10);
  return out;
}
"""

JS_HOME = r"""
() => {
  const out = {};
  // hero headline
  const h = [...document.querySelectorAll('h1, h2')].find(e => (e.innerText||'').includes('important decisions'));
  if (h) { const s = getComputedStyle(h); out.heroHeadline = {fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, ls: s.letterSpacing, color: s.color, w: Math.round(h.getBoundingClientRect().width)}; }
  // announcement bar
  const ann = document.querySelector('[class*="announcement"], [class*="Announcement"]');
  if (ann) { const s = getComputedStyle(ann); out.announcement = {bg: s.backgroundColor, color: s.color, h: Math.round(ann.getBoundingClientRect().height), fs: s.fontSize}; }
  // marquee/scrolling quote
  const sq = document.querySelector('[class*="ScrollingQuote"]');
  if (sq) {
    const s = getComputedStyle(sq);
    out.scrollingQuote = {bg: s.backgroundColor, h: Math.round(sq.getBoundingClientRect().height)};
    const big = sq.querySelector('h2, h3, p, div');
    if (big) { const bs = getComputedStyle(big); out.scrollingQuoteText = {fs: bs.fontSize, color: bs.color, fw: bs.fontWeight}; }
  }
  // canvas info
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const r = canvas.getBoundingClientRect();
    out.canvas = {w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY), cls: (canvas.className||'').slice(0,60), parentCls: (canvas.parentElement.className||'').toString().slice(0,60)};
  }
  // stat cards (green tiles)
  const tile = [...document.querySelectorAll('[class*="Card"] [class*="icon"], [class*="Card"] svg')].slice(0,1);
  // measure the pull-apart section
  const pa = document.querySelector('[class*="PullApart"]');
  if (pa) { out.pullApart = {h: Math.round(pa.getBoundingClientRect().height), cls: (pa.className||'').toString().slice(0,80)}; }
  // transition/animation styles inventory
  const trans = new Set();
  [...document.querySelectorAll('a, button, [class*="Card"], img, div')].slice(0, 800).forEach(el => {
    const t = getComputedStyle(el).transition;
    if (t && t !== 'all' && t.length > 10) trans.add(t.slice(0, 110));
  });
  out.transitions = [...trans].slice(0, 14);
  return out;
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
    page = ctx.new_page()
    run(page, "https://scale.com/data-engine", JS_DE, "DATA-ENGINE COMPONENTS")
    run(page, "https://scale.com/data-engine", JS_CTA, "DATA-ENGINE CTA + FONT MIX")
    run(page, "https://scale.com/", JS_HOME, "HOME EXTRAS")
    browser.close()
