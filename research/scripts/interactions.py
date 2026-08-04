"""Nav dropdown states, hover states, scrolled-nav state, customers index check."""
import json, os
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\scale"
DATA = r"C:\Users\deepa\novonus-v2\research\data"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        page = ctx.new_page()

        page.goto("https://scale.com/", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)

        # nav item texts
        nav_items = page.evaluate("""() => {
            const els = [...document.querySelectorAll('header button, header a, nav button, nav a')];
            return els.map(e => (e.innerText||'').trim()).filter(t => t && t.length < 30);
        }""")
        print("NAV ITEMS:", nav_items)

        # hover each top-level nav trigger, screenshot dropdown
        idx = 0
        for label in nav_items[:8]:
            if label.lower() in ("log in", "book demo", "book a demo", ""):
                continue
            try:
                trig = page.locator(f"header :text-is('{label}')").first
                trig.hover(timeout=3000)
                page.wait_for_timeout(1200)
                page.screenshot(path=os.path.join(SHOTS, f"nav-dropdown-{idx:02d}-{label.lower().replace(' ', '-')[:16]}.png"))
                # capture dropdown panel styles
                panel = page.evaluate("""() => {
                    const cands = [...document.querySelectorAll('header div, body > div')].filter(d => {
                        const r = d.getBoundingClientRect();
                        const s = getComputedStyle(d);
                        return r.height > 100 && r.top > 40 && r.top < 200 && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && (s.position === 'absolute' || s.position === 'fixed');
                    });
                    if (!cands.length) return null;
                    const d = cands[0]; const s = getComputedStyle(d); const r = d.getBoundingClientRect();
                    return {bg: s.backgroundColor, radius: s.borderRadius, border: s.border, shadow: s.boxShadow.slice(0,120),
                            backdrop: s.backdropFilter, w: Math.round(r.width), h: Math.round(r.height),
                            links: [...d.querySelectorAll('a')].slice(0,14).map(a => (a.innerText||'').trim().replace(/\\s+/g,' | ').slice(0,60))};
                }""")
                print(f"DROPDOWN {label}:", json.dumps(panel)[:500] if panel else None)
                idx += 1
            except Exception as e:
                print("hover fail", label, str(e)[:120])
        # scrolled nav state
        page.mouse.move(720, 500)
        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(SHOTS, "nav-scrolled-state.png"))
        navScrolled = page.evaluate("""() => {
            const n = document.querySelector('header, nav');
            if (!n) return null;
            const s = getComputedStyle(n);
            return {bg: s.backgroundColor, backdrop: s.backdropFilter, position: s.position, h: Math.round(n.getBoundingClientRect().height), border: s.borderBottom, shadow: s.boxShadow.slice(0,100)};
        }""")
        print("NAV SCROLLED:", json.dumps(navScrolled))

        # button hover state on primary CTA
        try:
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(800)
            btn = page.locator("header a:has-text('Book Demo'), header a:has-text('Book demo')").first
            before = btn.evaluate("""el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, color: s.color, radius: s.borderRadius, border: s.border, pad: s.padding, fs: s.fontSize, fw: s.fontWeight, tt: s.textTransform, ls: s.letterSpacing}; }""")
            btn.hover()
            page.wait_for_timeout(700)
            after = btn.evaluate("""el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, color: s.color, transform: s.transform, shadow: s.boxShadow.slice(0,80)}; }""")
            print("CTA BEFORE:", json.dumps(before))
            print("CTA HOVER:", json.dumps(after))
            page.screenshot(path=os.path.join(SHOTS, "cta-hover.png"))
        except Exception as e:
            print("cta hover fail:", str(e)[:150])

        # check /customers index
        for path, nm in [("https://scale.com/customers", "customers-index"), ("https://scale.com/resources", "resources")]:
            try:
                r = page.goto(path, timeout=40000, wait_until="domcontentloaded")
                print(nm, "status:", r.status if r else None, "final:", page.url)
                if r and r.status == 200:
                    page.wait_for_timeout(4000)
                    page.screenshot(path=os.path.join(SHOTS, f"{nm}-00-hero.png"))
            except Exception as e:
                print(nm, "err:", str(e)[:120])

        browser.close()

if __name__ == "__main__":
    main()
