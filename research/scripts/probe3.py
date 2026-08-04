import json, os, time
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\sanctuary"
DATA = r"C:\Users\deepa\novonus-v2\research\data\sanctuary"
out = {}

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # news-index for card hover
    page.goto("https://sanctuary.ai/news/", wait_until="load", timeout=45000)
    time.sleep(2.5)
    page.evaluate("document.querySelectorAll('.cky-consent-container,.cky-overlay,.cky-btn-revisit-wrapper').forEach(e=>e.remove())")
    try:
        info = page.evaluate("""() => {
          const imgs = [...document.querySelectorAll('a img')].filter((i) => i.getBoundingClientRect().width > 200);
          for (const img of imgs) {
            const r = img.getBoundingClientRect();
            if (r.top > 300 && r.top < 3000) {
              img.scrollIntoView({block: 'center'});
              const r2 = img.getBoundingClientRect();
              const cs = getComputedStyle(img);
              return { x: r2.x, y: r2.y, w: r2.width, h: r2.height, transition: cs.transition.slice(0,160), cls: img.className.slice(0,160) };
            }
          }
          return null;
        }""")
        out["cardImg"] = info
        if info:
            time.sleep(1.0)
            info2 = page.evaluate("""() => { const imgs=[...document.querySelectorAll('a img')].filter(i=>{const r=i.getBoundingClientRect(); return r.width>200 && r.top>0 && r.top<900;}); const r=imgs[0].getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }""")
            page.screenshot(path=os.path.join(SHOTS, "card-rest.png"), clip={"x": info2["x"], "y": info2["y"], "width": info2["w"], "height": min(info2["h"], 900-info2["y"])})
            page.mouse.move(info2["x"]+info2["w"]/2, info2["y"]+info2["h"]/2)
            time.sleep(1.4)
            out["cardImgHover"] = page.evaluate("""() => { const imgs=[...document.querySelectorAll('a img')].filter(i=>{const r=i.getBoundingClientRect(); return r.width>200 && r.top>0 && r.top<900;}); const cs=getComputedStyle(imgs[0]); return {transform: cs.transform, filter: cs.filter, transition: cs.transition.slice(0,160)}; }""")
            page.screenshot(path=os.path.join(SHOTS, "card-hover.png"), clip={"x": info2["x"], "y": info2["y"], "width": info2["w"], "height": min(info2["h"], 900-info2["y"])})
            print("card hover ok")
    except Exception as e:
        print("card hover fail", str(e)[:140])

    # filter bar anatomy on news page
    out["filterBar"] = page.evaluate("""() => {
      const inp = document.querySelector('input[type="search"], input[type="text"], select');
      if (!inp) return null; const cs = getComputedStyle(inp);
      return { bg: cs.backgroundColor, border: cs.border, radius: cs.borderRadius, h: inp.offsetHeight, font: cs.fontFamily.split(',')[0] + ' ' + cs.fontSize, color: cs.color };
    }""")

    # dropdown attempt on news page (header should be over dark hero here too; try click instead of hover)
    try:
        page.evaluate("window.scrollTo(0,0)"); time.sleep(0.8)
        el = page.evaluate("""() => { const els=[...document.querySelectorAll('header button, header a, header summary, header li')].filter(e=>e.innerText.trim()==='ABOUT'); if(!els.length) return null; const r=els[0].getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,tag:els[0].tagName}; }""")
        out["aboutEl"] = el
        if el:
            page.mouse.move(el["x"], el["y"]); time.sleep(1.2)
            page.screenshot(path=os.path.join(SHOTS, "nav-dropdown2.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 560})
            out["dropdownPanel"] = page.evaluate("""() => {
              const cands = [...document.querySelectorAll('header *')].filter((e) => {
                const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
                return r.top > 70 && r.height > 40 && r.width > 120 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.3 && e.querySelectorAll('a').length >= 2;
              });
              return cands.slice(0,2).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
                return { bg: cs.backgroundColor, radius: cs.borderRadius, pad: cs.padding, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top),
                         links: [...e.querySelectorAll('a')].map((a) => a.innerText.trim().slice(0,40)).slice(0,6), transition: cs.transition.slice(0,90) }; });
            }""")
            print("dropdown2 done", out.get("dropdownPanel"))
    except Exception as e:
        print("dropdown2 fail", str(e)[:120])

    with open(os.path.join(DATA, "probe3.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    browser.close()
print("PROBE3 DONE")
