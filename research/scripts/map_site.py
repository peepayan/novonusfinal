"""Map scale.com: fetch homepage, enumerate nav/footer links, try sitemap.xml."""
import json
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\deepa\novonus-v2\research"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        )
        page = ctx.new_page()

        # Try sitemap first
        try:
            resp = page.goto("https://scale.com/sitemap.xml", timeout=45000)
            print("SITEMAP STATUS:", resp.status if resp else None)
            if resp and resp.status == 200:
                content = page.content()
                with open(OUT + r"\sitemap_raw.txt", "w", encoding="utf-8") as f:
                    f.write(content)
                print("sitemap saved, length:", len(content))
        except Exception as e:
            print("sitemap error:", e)

        # Homepage
        try:
            resp = page.goto("https://scale.com", timeout=60000, wait_until="domcontentloaded")
            print("HOME STATUS:", resp.status if resp else None)
            page.wait_for_timeout(6000)
            print("TITLE:", page.title())
            print("URL:", page.url)

            links = page.evaluate("""() => {
                const out = [];
                document.querySelectorAll('a[href]').forEach(a => {
                    const href = a.getAttribute('href');
                    const text = (a.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
                    const inNav = !!a.closest('nav, header');
                    const inFooter = !!a.closest('footer');
                    out.push({href, text, inNav, inFooter});
                });
                return out;
            }""")
            with open(OUT + r"\home_links.json", "w", encoding="utf-8") as f:
                json.dump(links, f, indent=1)
            print("links:", len(links))

            # quick tech sniff
            tech = page.evaluate("""() => {
                const g = window;
                const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
                return {
                    globals: {
                        gsap: !!g.gsap, ScrollTrigger: !!(g.ScrollTrigger || (g.gsap && g.gsap.core)),
                        THREE: !!g.THREE, Lenis: !!(g.Lenis || g.lenis),
                        next: !!g.__NEXT_DATA__ || !!document.getElementById('__next') || !!document.querySelector('script[src*="_next"]'),
                        react: !!(g.React || document.querySelector('[data-reactroot]')),
                        nuxt: !!g.__NUXT__,
                        framer: !!document.querySelector('[data-framer-name]'),
                        spline: !!document.querySelector('spline-viewer'),
                        rive: scripts.some(s => /rive/i.test(s)),
                        lottie: !!g.lottie || scripts.some(s => /lottie/i.test(s)),
                        webflow: !!g.Webflow,
                    },
                    scriptSrcs: scripts.slice(0, 40),
                    canvases: document.querySelectorAll('canvas').length,
                    videos: [...document.querySelectorAll('video')].map(v => ({src: (v.currentSrc||v.src||'').slice(0,120), autoplay: v.autoplay, loop: v.loop})),
                };
            }""")
            with open(OUT + r"\home_tech.json", "w", encoding="utf-8") as f:
                json.dump(tech, f, indent=1)
            print(json.dumps(tech["globals"], indent=1))
            print("canvases:", tech["canvases"], "videos:", len(tech["videos"]))
        except Exception as e:
            print("home error:", e)

        browser.close()

if __name__ == "__main__":
    main()
