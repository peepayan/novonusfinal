"""Retry nav dropdowns with bounding-box mouse moves."""
import json, os
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\scale"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        page = ctx.new_page()
        page.goto("https://scale.com/", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)
        # dismiss cookies
        try:
            page.locator("button:has-text('Accept Cookies')").first.click(timeout=3000)
            page.wait_for_timeout(500)
        except Exception:
            pass

        # get positions of nav triggers
        items = page.evaluate("""() => {
            const out = [];
            document.querySelectorAll('header button, header a').forEach(e => {
                const t = (e.innerText||'').trim();
                const r = e.getBoundingClientRect();
                if (t && r.width > 0 && r.top < 100) out.push({t, x: r.x + r.width/2, y: r.y + r.height/2});
            });
            return out;
        }""")
        print("ITEMS:", json.dumps(items))

        for it in items:
            if it["t"] not in ("Products", "Solutions", "Research", "Resources"):
                continue
            try:
                page.mouse.move(it["x"], it["y"])
                page.wait_for_timeout(500)
                page.mouse.move(it["x"], it["y"])  # jiggle
                page.wait_for_timeout(1500)
                fn = f"nav-dd-{it['t'].lower()}.png"
                page.screenshot(path=os.path.join(SHOTS, fn))
                panel = page.evaluate("""() => {
                    const cands = [...document.querySelectorAll('body *')].filter(d => {
                        const r = d.getBoundingClientRect();
                        const s = getComputedStyle(d);
                        return r.height > 80 && r.width > 200 && r.top > 50 && r.top < 220 &&
                               s.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                               (s.position === 'absolute' || s.position === 'fixed') && s.visibility !== 'hidden';
                    }).sort((a,b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
                    if (!cands.length) return null;
                    const d = cands[0]; const s = getComputedStyle(d); const r = d.getBoundingClientRect();
                    return {bg: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow.slice(0,140),
                            border: s.border, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
                            links: [...d.querySelectorAll('a')].slice(0,16).map(a => (a.innerText||'').trim().replace(/\\n/g,' / ').slice(0,70))};
                }""")
                print(it["t"], "->", json.dumps(panel)[:600] if panel else "no panel")
            except Exception as e:
                print("fail", it["t"], str(e)[:100])

        # CTA hover via mouse position
        cta = [i for i in items if "book" in i["t"].lower()]
        if cta:
            c = cta[0]
            before = page.evaluate("""() => {
                const e = [...document.querySelectorAll('header a, header button')].find(x => /book/i.test(x.innerText));
                if (!e) return null; const s = getComputedStyle(e);
                return {bg: s.backgroundColor, color: s.color, radius: s.borderRadius, pad: s.padding, fs: s.fontSize, fw: s.fontWeight, ff: s.fontFamily.slice(0,40), h: Math.round(e.getBoundingClientRect().height), transition: s.transition.slice(0,120)};
            }""")
            print("CTA BEFORE:", json.dumps(before))
            page.mouse.move(c["x"], c["y"]); page.wait_for_timeout(900)
            after = page.evaluate("""() => {
                const e = [...document.querySelectorAll('header a, header button')].find(x => /book/i.test(x.innerText));
                if (!e) return null; const s = getComputedStyle(e);
                return {bg: s.backgroundColor, color: s.color, transform: s.transform, opacity: s.opacity};
            }""")
            print("CTA AFTER:", json.dumps(after))

        # measure hero container + gutters at top
        metrics = page.evaluate("""() => {
            const main = document.querySelector('main');
            const h1 = document.querySelector('h1, h2');
            const grid = h1 ? h1.closest('div') : null;
            const gr = grid ? grid.getBoundingClientRect() : null;
            return {mainW: main ? main.getBoundingClientRect().width : null,
                    headlineBox: gr ? {x: Math.round(gr.x), w: Math.round(gr.width)} : null};
        }""")
        print("METRICS:", json.dumps(metrics))

        # link hover (underline?) on footer link
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SHOTS, "footer-bottom.png"))
        browser.close()

if __name__ == "__main__":
    main()
