# Sanctuary.ai design audit — screenshots + computed-style extraction
import json, os, sys, time, traceback
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\sanctuary"
DATA = r"C:\Users\deepa\novonus-v2\research\data\sanctuary"
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(DATA, exist_ok=True)

PAGES = [
    ("home", "https://sanctuary.ai/"),
    ("solutions", "https://sanctuary.ai/solutions/"),
    ("physical-ai", "https://sanctuary.ai/solutions/physical-ai/"),
    ("hydraulic-hands", "https://sanctuary.ai/solutions/hydraulic-hands/"),
    ("about-us", "https://sanctuary.ai/about-us/"),
    ("team", "https://sanctuary.ai/team-members/"),
    ("milestones", "https://sanctuary.ai/milestones/"),
    ("news-index", "https://sanctuary.ai/news/"),
    ("press", "https://sanctuary.ai/press/"),
    ("careers", "https://sanctuary.ai/careers/"),
    ("contact", "https://sanctuary.ai/contact-sanctuary-ai/"),
    ("article-industrial", "https://sanctuary.ai/news/sanctuary-ai-expands-physical-ai-strategy-to-industrial-robotics-demonstrating-production-ready-ai-performance/"),
    ("article-zero-shot", "https://sanctuary.ai/news/sanctuary-ai-demonstrates-zero-shot-in-hand-manipulation-on-hydraulic-hand/"),
    ("article-tactile", "https://sanctuary.ai/news/sanctuary-ai-new-tactile-sensors-enable-richer-sense-of-touch/"),
    ("terms", "https://sanctuary.ai/terms/"),
]

EXTRACT_JS = r"""
() => {
  const out = {};
  const toHex = (c) => {
    const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a === 0) return null;
    const h = (n) => parseInt(n).toString(16).padStart(2, "0");
    return "#" + h(m[1]) + h(m[2]) + h(m[3]) + (a < 1 ? ("/" + a.toFixed(2)) : "");
  };
  const snip = (el) => (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 70);
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    return {
      ff: cs.fontFamily.split(",")[0].replace(/"/g, ""),
      fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
      ls: cs.letterSpacing, tt: cs.textTransform, color: toHex(cs.color),
    };
  };

  // ---- typography samples ----
  const typo = {};
  const grab = (key, sel, cap) => {
    const seen = {};
    document.querySelectorAll(sel).forEach((el) => {
      if (!(el.offsetWidth || el.offsetHeight)) return;
      const s = styleOf(el);
      const k = [s.ff, s.fs, s.fw, s.ls, s.tt, s.color].join("|");
      if (!seen[k]) seen[k] = { ...s, count: 0, ex: [] };
      seen[k].count++;
      if (seen[k].ex.length < 2) { const t = snip(el); if (t) seen[k].ex.push(t); }
    });
    typo[key] = Object.values(seen).sort((a, b) => b.count - a.count).slice(0, cap || 8);
  };
  grab("h1", "h1"); grab("h2", "h2"); grab("h3", "h3"); grab("h4", "h4,h5");
  grab("body", "p", 10);
  grab("buttons", 'button, a[class*="btn" i], .wp-block-button__link, a[class*="button" i], input[type=submit]', 10);
  grab("nav", "header a, nav a", 8);
  grab("footer", "footer a, footer p, footer li", 8);

  // eyebrows: small uppercase text
  {
    const seen = {};
    const els = document.querySelectorAll("span,div,p,h6,a,li");
    let n = 0;
    for (const el of els) {
      if (n > 4000) break; n++;
      if (!(el.offsetWidth || el.offsetHeight)) continue;
      if (el.children.length > 1) continue;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (cs.textTransform === "uppercase" && fs <= 18 && (el.innerText || "").trim().length > 1) {
        const s = styleOf(el);
        const k = [s.ff, s.fs, s.fw, s.ls, s.color].join("|");
        if (!seen[k]) seen[k] = { ...s, count: 0, ex: [] };
        seen[k].count++;
        if (seen[k].ex.length < 2) { const t = snip(el); if (t) seen[k].ex.push(t); }
      }
    }
    typo.eyebrow = Object.values(seen).sort((a, b) => b.count - a.count).slice(0, 10);
  }
  out.typo = typo;

  // ---- palette ----
  {
    const count = {};
    const els = document.querySelectorAll("*");
    let n = 0;
    for (const el of els) {
      if (n > 6000) break; n++;
      const cs = getComputedStyle(el);
      for (const p of ["color", "backgroundColor", "borderTopColor", "fill"]) {
        const hx = toHex(cs[p]);
        if (hx) count[hx] = (count[hx] || 0) + 1;
      }
    }
    out.palette = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 45);
  }

  // ---- root custom properties + body ----
  {
    const props = {};
    try {
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (const r of rules) {
          if (r.selectorText && (r.selectorText === ":root" || r.selectorText.includes(":root"))) {
            for (const name of r.style) {
              if (name.startsWith("--")) props[name] = r.style.getPropertyValue(name).trim();
            }
          }
        }
      }
    } catch (e) {}
    out.rootVars = props;
    const bcs = getComputedStyle(document.body);
    out.bodyStyle = { bg: toHex(bcs.backgroundColor), color: toHex(bcs.color), ff: bcs.fontFamily, fs: bcs.fontSize, lh: bcs.lineHeight };
  }

  // ---- sections ----
  {
    const secs = [];
    document.querySelectorAll('section, main > div, [class*="section"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height < 120 || r.width < 800) return;
      if (secs.length > 40) return;
      const cs = getComputedStyle(el);
      const h = el.querySelector("h1,h2,h3");
      secs.push({
        cls: (el.className || "").toString().slice(0, 80),
        h: Math.round(r.height),
        bg: toHex(cs.backgroundColor),
        pt: cs.paddingTop, pb: cs.paddingBottom,
        heading: h ? snip(h).slice(0, 50) : null,
      });
    });
    out.sections = secs;
  }

  // ---- containers ----
  {
    const freq = {};
    document.querySelectorAll("div,main,section").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.maxWidth !== "none" && el.clientWidth >= 600) {
        const k = cs.maxWidth + " | pad " + cs.paddingLeft + " | mL " + cs.marginLeft;
        freq[k] = (freq[k] || 0) + 1;
      }
    });
    out.containers = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }

  // ---- radius & shadows ----
  {
    const rad = {}, shad = {};
    let n = 0;
    for (const el of document.querySelectorAll('a,button,div[class*="card" i],article,img,video,div')) {
      if (n > 5000) break; n++;
      const cs = getComputedStyle(el);
      if (cs.borderRadius && cs.borderRadius !== "0px" && el.clientWidth > 30 && el.clientHeight > 20)
        rad[cs.borderRadius] = (rad[cs.borderRadius] || 0) + 1;
      if (cs.boxShadow && cs.boxShadow !== "none") shad[cs.boxShadow.slice(0, 90)] = (shad[cs.boxShadow.slice(0, 90)] || 0) + 1;
    }
    out.radius = Object.entries(rad).sort((a, b) => b[1] - a[1]).slice(0, 10);
    out.shadows = Object.entries(shad).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  // ---- motion tech ----
  {
    const g = {};
    ["gsap", "ScrollTrigger", "THREE", "Lenis", "LocomotiveScroll", "barba", "Swiper",
     "jQuery", "Webflow", "lottie", "anime", "AOS", "Rellax", "VANTA", "PIXI", "SplitText",
     "Flip", "ScrollSmoother", "wp", "elementorFrontend", "et_pb_custom", "Divi"].forEach((k) => {
      try { if (window[k] !== undefined) g[k] = (window[k] && window[k].version) ? String(window[k].version) : true; } catch (e) {}
    });
    if (window.gsap && window.gsap.plugins) g.gsapPlugins = Object.keys(window.gsap.plugins);
    out.globals = g;
    out.scripts = [...document.scripts].map((s) => s.src).filter(Boolean)
      .filter((s) => /gsap|three|lenis|swiper|slick|lottie|scroll|motion|webflow|jquery|themes|anim|parallax|aos|barba|split/i.test(s))
      .map((s) => s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 130)).slice(0, 30);
    out.themeHints = [...new Set([...document.scripts].map((s) => s.src).filter(Boolean)
      .map((s) => (s.match(/wp-content\/(themes|plugins)\/([^\/]+)/) || [])[2]).filter(Boolean))];
  }

  // ---- css motion decl scan ----
  {
    const trans = {}, keyf = [], easings = {};
    try {
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (const r of rules) {
          if (r.type === 7) keyf.push(r.name);
          if (r.style) {
            const t = r.style.transition || "";
            if (t && t !== "none") trans[t.slice(0, 80)] = (trans[t.slice(0, 80)] || 0) + 1;
            const cb = (r.cssText.match(/cubic-bezier\([^)]+\)/g) || []);
            cb.forEach((c) => easings[c] = (easings[c] || 0) + 1);
          }
        }
      }
    } catch (e) {}
    out.transitions = Object.entries(trans).sort((a, b) => b[1] - a[1]).slice(0, 15);
    out.keyframes = [...new Set(keyf)].slice(0, 25);
    out.easings = Object.entries(easings).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  // ---- media ----
  {
    out.videos = [...document.querySelectorAll("video")].map((v) => ({
      src: (v.currentSrc || v.src || (v.querySelector("source") || {}).src || "").slice(-70),
      auto: v.autoplay, loop: v.loop, muted: v.muted, poster: !!v.poster,
      w: v.clientWidth, h: v.clientHeight,
    })).slice(0, 12);
    out.canvases = [...document.querySelectorAll("canvas")].map((c) => ({ w: c.width, h: c.height, cls: (c.className || "").toString().slice(0, 50) }));
    out.iframes = [...document.querySelectorAll("iframe")].map((f) => (f.src || "").slice(0, 90)).slice(0, 8);
    out.imgCount = document.images.length;
    out.svgCount = document.querySelectorAll("svg").length;
  }

  // ---- fonts actually loaded ----
  try {
    out.fonts = [...new Set([...document.fonts].map((f) => f.family + " " + f.weight + " " + f.style))].slice(0, 30);
  } catch (e) { out.fonts = []; }

  // ---- header ----
  {
    const hd = document.querySelector("header") || document.querySelector('[class*="header" i]');
    if (hd) {
      const cs = getComputedStyle(hd);
      out.header = { pos: cs.position, h: hd.getBoundingClientRect().height, bg: toHex(cs.backgroundColor), backdrop: cs.backdropFilter, z: cs.zIndex, mix: cs.mixBlendMode };
    }
    out.htmlScrollBehavior = getComputedStyle(document.documentElement).scrollBehavior;
    out.cursorCustom = !!document.querySelector('[class*="cursor" i]:not(input):not(textarea)');
  }
  out.title = document.title;
  out.scrollH = document.body.scrollHeight;
  return out;
}
"""

def shoot(page, path):
    try:
        page.screenshot(path=path)
        print("  shot:", os.path.basename(path))
    except Exception as e:
        print("  SHOT FAIL", os.path.basename(path), str(e)[:80])

def run(only=None):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900},
                                  user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        page = ctx.new_page()

        first = True
        for slug, url in PAGES:
            if only and slug not in only:
                continue
            print("== " + slug + " ==", flush=True)
            try:
                if first and slug == "home":
                    # preloader capture: shoot right after commit
                    page.goto(url, wait_until="commit", timeout=45000)
                    time.sleep(0.35); shoot(page, os.path.join(SHOTS, "home-preloader-350ms.png"))
                    time.sleep(0.65); shoot(page, os.path.join(SHOTS, "home-preloader-1000ms.png"))
                    try:
                        page.wait_for_load_state("networkidle", timeout=25000)
                    except Exception:
                        page.wait_for_load_state("load", timeout=25000)
                else:
                    try:
                        page.goto(url, wait_until="networkidle", timeout=45000)
                    except Exception:
                        page.goto(url, wait_until="load", timeout=45000)
                time.sleep(2.0)

                # cookie banner
                if first:
                    for txt in ["Accept", "Accept All", "I agree", "Got it", "OK"]:
                        try:
                            b = page.get_by_role("button", name=txt, exact=False).first
                            if b.is_visible(timeout=800):
                                shoot(page, os.path.join(SHOTS, "home-cookie-banner.png"))
                                b.click(timeout=1500); time.sleep(0.8)
                                break
                        except Exception:
                            pass
                    first = False

                shoot(page, os.path.join(SHOTS, slug + "-00-hero.png"))

                # slow scroll with mid shots
                height = page.evaluate("document.body.scrollHeight")
                if height > 1800 and slug != "terms":
                    if height <= 3200: fr = [0.5]
                    elif height <= 5500: fr = [0.33, 0.66]
                    elif height <= 9000: fr = [0.25, 0.5, 0.75]
                    else: fr = [0.15, 0.35, 0.55, 0.75, 0.9]
                    targets = [int(height * f) for f in fr]
                    ti = 0
                    y = 0
                    while y < height - 900:
                        y += 600
                        page.evaluate("window.scrollTo(0," + str(y) + ")")
                        time.sleep(0.13)
                        if ti < len(targets) and y >= targets[ti]:
                            time.sleep(0.9)
                            shoot(page, os.path.join(SHOTS, slug + "-s" + str(int(fr[ti] * 100)) + ".png"))
                            ti += 1
                        height = page.evaluate("document.body.scrollHeight")
                        if y > 30000: break
                    time.sleep(0.8)

                # full page
                try:
                    page.screenshot(path=os.path.join(SHOTS, slug + "-full.png"), full_page=True)
                    print("  shot:", slug + "-full.png")
                except Exception as e:
                    print("  full-page fail:", str(e)[:100])

                page.evaluate("window.scrollTo(0,0)")
                time.sleep(1.0)

                data = page.evaluate(EXTRACT_JS)
                with open(os.path.join(DATA, slug + ".json"), "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=1)
                print("  data ok. height=", data.get("scrollH"), "globals=", list(data.get("globals", {}).keys()))
            except Exception as e:
                print("  PAGE FAIL:", str(e)[:200])
                traceback.print_exc(limit=1)

        # ---- home extras: sticky nav, hover, mobile ----
        try:
            print("== home-extras ==", flush=True)
            page.goto("https://sanctuary.ai/", wait_until="load", timeout=45000)
            time.sleep(2.5)
            page.screenshot(path=os.path.join(SHOTS, "nav-top.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 130})
            page.evaluate("window.scrollTo(0,1600)"); time.sleep(1.2)
            page.screenshot(path=os.path.join(SHOTS, "nav-scrolled.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 130})
            page.evaluate("window.scrollTo(0,0)"); time.sleep(1.0)
            # hover a CTA
            try:
                cta = page.locator('a[class*="btn" i], .wp-block-button__link, a[class*="button" i]').first
                cta.scroll_into_view_if_needed(timeout=3000)
                box = cta.bounding_box()
                if box:
                    page.screenshot(path=os.path.join(SHOTS, "cta-rest.png"),
                                    clip={"x": max(box["x"] - 40, 0), "y": max(box["y"] - 40, 0), "width": min(box["width"] + 80, 1440), "height": box["height"] + 80})
                    cta.hover(); time.sleep(0.6)
                    page.screenshot(path=os.path.join(SHOTS, "cta-hover.png"),
                                    clip={"x": max(box["x"] - 40, 0), "y": max(box["y"] - 40, 0), "width": min(box["width"] + 80, 1440), "height": box["height"] + 80})
                    print("  cta hover done")
            except Exception as e:
                print("  cta hover fail:", str(e)[:80])
            # nav link hover
            try:
                nl = page.locator("header a").nth(1)
                nl.hover(); time.sleep(0.5)
                page.screenshot(path=os.path.join(SHOTS, "nav-hover.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 400})
            except Exception as e:
                print("  nav hover fail:", str(e)[:80])
        except Exception as e:
            print("  extras fail:", str(e)[:120])

        # mobile
        try:
            mctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=2)
            mp = mctx.new_page()
            mp.goto("https://sanctuary.ai/", wait_until="load", timeout=45000)
            time.sleep(2.5)
            mp.screenshot(path=os.path.join(SHOTS, "home-mobile.png"))
            for sel in ['button[aria-label*="menu" i]', '[class*="hamburger" i]', '[class*="burger" i]', '[class*="menu-toggle" i]', '[class*="nav-toggle" i]']:
                try:
                    t = mp.locator(sel).first
                    if t.is_visible(timeout=700):
                        t.click(); time.sleep(1.0)
                        mp.screenshot(path=os.path.join(SHOTS, "home-mobile-menu.png"))
                        print("  mobile menu via", sel)
                        break
                except Exception:
                    pass
            mctx.close()
        except Exception as e:
            print("  mobile fail:", str(e)[:120])

        browser.close()
    print("DONE")

if __name__ == "__main__":
    only = set(sys.argv[1:]) or None
    run(only)
