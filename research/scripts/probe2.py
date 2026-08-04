import json, os, time
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\sanctuary"
DATA = r"C:\Users\deepa\novonus-v2\research\data\sanctuary"
out = {}

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("https://sanctuary.ai/", wait_until="load", timeout=45000)
    time.sleep(2.5)
    page.evaluate("document.querySelectorAll('.cky-consent-container,.cky-overlay,.cky-btn-revisit-wrapper').forEach(e=>e.remove())")

    # nav state at top vs scrolled: classes on header card
    out["headerAtTop"] = page.evaluate("""() => {
      const card = document.querySelector('header .rounded-2xl, [class*="takt-header"] .rounded-2xl') || document.querySelector('[class*="takt-header"] > div');
      const cs = card ? getComputedStyle(card) : null;
      return cs ? { bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0,140), cls: card.className.slice(0,200) } : null;
    }""")
    page.evaluate("window.scrollTo(0,1500)"); time.sleep(1.2)
    out["headerScrolled"] = page.evaluate("""() => {
      const card = document.querySelector('header .rounded-2xl, [class*="takt-header"] .rounded-2xl') || document.querySelector('[class*="takt-header"] > div');
      const cs = card ? getComputedStyle(card) : null;
      return cs ? { bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0,140) } : null;
    }""")
    page.evaluate("window.scrollTo(0,0)"); time.sleep(1.0)

    # dropdown: hover the summary/button containing ABOUT inside desktop nav
    try:
        page.mouse.move(857, 52); time.sleep(1.0)  # ABOUT position from nav-scrolled shot
        page.screenshot(path=os.path.join(SHOTS, "nav-dropdown.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 520})
        out["dropdown"] = page.evaluate("""() => {
          const panels = [...document.querySelectorAll('header div, header ul')].filter((e) => {
            const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
            return r.top > 60 && r.top < 220 && r.height > 60 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.5 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
          });
          return panels.slice(0,3).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
            return { bg: cs.backgroundColor, radius: cs.borderRadius, pad: cs.padding, w: Math.round(r.width), h: Math.round(r.height),
                     shadow: cs.boxShadow.slice(0,80), transition: cs.transition.slice(0,80), links: [...e.querySelectorAll('a')].map((a)=>a.innerText.trim()).slice(0,8) }; });
        }""")
        print("dropdown ok")
    except Exception as e:
        print("dropdown fail", str(e)[:100])

    # amber button hover via mouse coords
    try:
        box = page.evaluate("""() => { const els=[...document.querySelectorAll('header a')].filter(e=>e.innerText.trim()==='COMMERCIAL INQUIRIES'); const r=els[0].getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }""")
        page.screenshot(path=os.path.join(SHOTS, "btn-amber-rest2.png"), clip={"x": box["x"]-20, "y": box["y"]-16, "width": box["w"]+40, "height": box["h"]+32})
        page.mouse.move(box["x"]+box["w"]/2, box["y"]+box["h"]/2); time.sleep(0.6)
        page.screenshot(path=os.path.join(SHOTS, "btn-amber-hover2.png"), clip={"x": box["x"]-20, "y": box["y"]-16, "width": box["w"]+40, "height": box["h"]+32})
        out["amberHoverStyle"] = page.evaluate("""() => { const el=[...document.querySelectorAll('header a')].filter(e=>e.innerText.trim()==='COMMERCIAL INQUIRIES')[0]; const cs=getComputedStyle(el); return {bg:cs.backgroundColor,color:cs.color,border:cs.borderColor}; }""")
        print("amber hover ok")
    except Exception as e:
        print("amber hover fail", str(e)[:100])

    # ticker animation: find animated descendant
    out["ticker"] = page.evaluate("""() => {
      const t = document.querySelector('.wp-block-takt-press-ticker');
      if (!t) return null;
      const res = { html0: t.innerHTML.slice(0, 0) };
      const nodes = [t, ...t.querySelectorAll('*')];
      for (const n of nodes) {
        const cs = getComputedStyle(n);
        if (cs.animationName && cs.animationName !== 'none') {
          return { animName: cs.animationName, dur: cs.animationDuration, timing: cs.animationTimingFunction, iter: cs.animationIterationCount, cls: (n.className||'').toString().slice(0,100) };
        }
      }
      return { animName: 'not-found-static' };
    }""")

    # news card image hover: scroll to post carousel
    try:
        page.evaluate("""() => { const el = document.querySelector('.wp-block-takt-post-carousel'); el.scrollIntoView({block:'center'}); }""")
        time.sleep(1.5)
        info = page.evaluate("""() => {
          const card = document.querySelector('.wp-block-takt-post-carousel a[href*="/news/"]');
          const img = card.querySelector('img');
          const r = card.getBoundingClientRect();
          const cs = getComputedStyle(img);
          return { x: r.x, y: r.y, w: r.width, h: r.height, transition: cs.transition.slice(0,140), transform: cs.transform, cls: img.className.slice(0,140) };
        }""")
        out["newsCardImg"] = info
        page.mouse.move(info["x"]+info["w"]/2, info["y"]+info["h"]/2); time.sleep(1.3)
        out["newsCardImgHover"] = page.evaluate("""() => {
          const card = document.querySelector('.wp-block-takt-post-carousel a[href*="/news/"]');
          const img = card.querySelector('img');
          const cs = getComputedStyle(img);
          return { transform: cs.transform, filter: cs.filter };
        }""")
        page.screenshot(path=os.path.join(SHOTS, "news-card-hover.png"), clip={"x": info["x"], "y": max(info["y"],0), "width": min(info["w"]+20,1440), "height": min(info["h"]+20,900)})
        print("card hover ok")
    except Exception as e:
        print("card hover fail", str(e)[:120])

    # footer link hover color
    try:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); time.sleep(1.2)
        fl = page.evaluate("""() => { const el=[...document.querySelectorAll('footer a, [class*="footer"] a')].filter(e=>e.innerText.trim()==='ROADMAP')[0]; if(!el) return null; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return {x:r.x,y:r.y,w:r.width,h:r.height,color:cs.color,transition:cs.transition.slice(0,80)}; }""")
        out["footerLinkRest"] = fl
        if fl:
            page.mouse.move(fl["x"]+fl["w"]/2, fl["y"]+fl["h"]/2); time.sleep(0.5)
            out["footerLinkHover"] = page.evaluate("""() => { const el=[...document.querySelectorAll('footer a, [class*="footer"] a')].filter(e=>e.innerText.trim()==='ROADMAP')[0]; return getComputedStyle(el).color; }""")
        print("footer link ok")
    except Exception as e:
        print("footer link fail", str(e)[:100])

    # hero bottom strip anatomy
    page.evaluate("window.scrollTo(0,0)"); time.sleep(1.0)
    out["heroStrip"] = page.evaluate("""() => {
      const hero = document.querySelector('.wp-block-takt-hero');
      if (!hero) return null;
      const strip = [...hero.querySelectorAll('div')].filter((e) => { const cs = getComputedStyle(e); return cs.borderTopWidth === '1px' && e.getBoundingClientRect().width > 500; });
      return strip.slice(0,3).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        return { borderTopColor: cs.borderTopColor, w: Math.round(r.width), y: Math.round(r.y), pt: cs.paddingTop, cls: (e.className||'').toString().slice(0,110) }; });
    }""")
    # hero media treatment: overlay gradient?
    out["heroMedia"] = page.evaluate("""() => {
      const hero = document.querySelector('.wp-block-takt-hero');
      const v = hero.querySelector('video');
      const overlays = [...hero.querySelectorAll('div')].filter((e) => { const cs = getComputedStyle(e); return cs.backgroundImage.includes('gradient') || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(cs.opacity) < 1); });
      return { video: v ? { cls: v.className.slice(0,120), objectFit: getComputedStyle(v).objectFit } : null,
               overlays: overlays.slice(0,4).map((e) => { const cs = getComputedStyle(e); return { bgi: cs.backgroundImage.slice(0,140), bgc: cs.backgroundColor, op: cs.opacity, cls: (e.className||'').toString().slice(0,90) }; }) };
    }""")

    with open(os.path.join(DATA, "probe2.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    browser.close()
print("PROBE2 DONE")
