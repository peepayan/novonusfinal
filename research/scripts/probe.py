# Interaction + geometry probe for sanctuary.ai
import json, os, time
from playwright.sync_api import sync_playwright

SHOTS = r"C:\Users\deepa\novonus-v2\research\shots\sanctuary"
DATA = r"C:\Users\deepa\novonus-v2\research\data\sanctuary"

def clip_shot(page, loc, path, pad=30):
    try:
        box = loc.bounding_box()
        if not box:
            print("  no box for", os.path.basename(path)); return
        page.screenshot(path=path, clip={
            "x": max(box["x"] - pad, 0), "y": max(box["y"] - pad, 0),
            "width": min(box["width"] + 2 * pad, 1440), "height": min(box["height"] + 2 * pad, 900)})
        print("  shot:", os.path.basename(path))
    except Exception as e:
        print("  clip fail", os.path.basename(path), str(e)[:90])

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    out = {}

    print("== home probe ==")
    page.goto("https://sanctuary.ai/", wait_until="load", timeout=45000)
    time.sleep(2.5)
    # kill cookie banner
    try:
        page.evaluate("document.querySelectorAll('.cky-consent-container,.cky-overlay').forEach(e=>e.remove())")
    except Exception: pass

    # 1. geometry of header card / sheet / hero strip / eyebrow / buttons / scroll puck
    out["geometry"] = page.evaluate(r"""
    () => {
      const gx = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          radius: cs.borderRadius, bg: cs.backgroundColor, border: cs.border, shadow: cs.boxShadow.slice(0,120),
          pad: cs.padding, font: cs.fontFamily.split(',')[0] + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontWeight,
          ls: cs.letterSpacing, tt: cs.textTransform, color: cs.color, cls: (el.className||'').toString().slice(0,120) };
      };
      const res = {};
      res.headerInner = gx(document.querySelector('header > div, header nav'));
      res.header = gx(document.querySelector('header'));
      // white sheet wrappers
      const sheets = [];
      document.querySelectorAll('[class*="rounded"], .entry-content > *').forEach((el) => {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (r.width > 1200 && parseFloat(cs.borderRadius) >= 8) sheets.push({ cls: (el.className||'').toString().slice(0,100), radius: cs.borderRadius, bg: cs.backgroundColor, w: Math.round(r.width) });
      });
      res.sheets = sheets.slice(0, 8);
      // eyebrow chip
      const chips = [];
      document.querySelectorAll('span,div,a').forEach((el) => {
        const t = (el.innerText || '').trim();
        if (el.children.length === 0 && t.length > 2 && t.length < 40 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
          const cs = getComputedStyle(el);
          if (cs.borderRadius !== '0px' && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px')) {
            let before = '';
            try { before = getComputedStyle(el, '::before').content; } catch (e) {}
            chips.push({ t: t.slice(0, 30), ...{ pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, border: cs.borderTop, font: cs.fontSize + '/' + cs.fontWeight, ls: cs.letterSpacing, before } });
          }
        }
      });
      res.chips = chips.slice(0, 12);
      // buttons
      const btns = [];
      document.querySelectorAll('a,button').forEach((el) => {
        const t = (el.innerText || '').trim();
        if (["COMMERCIAL INQUIRIES", "CAREERS", "MEET THE TEAM", "EXPLORE CAREERS"].includes(t)) {
          const cs = getComputedStyle(el);
          btns.push({ t, pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, border: cs.border, color: cs.color, fs: cs.fontSize, ls: cs.letterSpacing, transition: cs.transition.slice(0,90) });
        }
      });
      res.buttons = btns.slice(0, 8);
      // scroll puck
      const puck = [...document.querySelectorAll('a,div,button')].find((el) => (el.innerText || '').trim() === 'SCROLL');
      res.scrollPuck = gx(puck && puck.closest('a,button,div'));
      // radial gradient util
      const rg = document.querySelector('[class*="radial-gradient"]');
      if (rg) { const cs = getComputedStyle(rg); res.radialGradientClass = (rg.className||'').toString().slice(0,120);
        let bef=''; try { bef = getComputedStyle(rg, '::before').backgroundImage; } catch(e){}
        res.radialGradient = { bg: cs.backgroundImage.slice(0, 220), before: (bef||'').slice(0,220) }; }
      // ticker
      const tick = document.querySelector('[class*="ticker"]');
      if (tick) { const inner = tick.querySelector('[style*="animation"], [class*="ticker"] > div') || tick.firstElementChild;
        res.ticker = { cls: (tick.className||'').toString().slice(0,100), anim: inner ? getComputedStyle(inner).animation : getComputedStyle(tick).animation }; }
      // cursor match
      const cur = document.querySelector('[class*="cursor" i]:not(input):not(textarea)');
      res.cursorEl = cur ? (cur.className||'').toString().slice(0, 120) : null;
      // hairline color
      const hr = [...document.querySelectorAll('div,li,article')].map((el) => getComputedStyle(el).borderTopColor + '|' + getComputedStyle(el).borderTopWidth).filter((s) => s.endsWith('1px'));
      const freq = {}; hr.forEach((s) => freq[s] = (freq[s] || 0) + 1);
      res.hairlines = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6);
      // section rhythm: entry-content children
      const rhythm = [];
      const ec = document.querySelector('.entry-content');
      if (ec) [...ec.children].forEach((el) => {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        rhythm.push({ cls: (el.className||'').toString().replace('wp-block-takt-', 'takt:').slice(0, 60), h: Math.round(r.height), mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pb: cs.paddingBottom, bg: cs.backgroundColor, radius: cs.borderRadius });
      });
      res.rhythm = rhythm;
      return res;
    }""")

    # 2. nav dropdown open
    try:
        about = page.locator("header").get_by_text("ABOUT", exact=True).first
        about.hover(); time.sleep(0.9)
        page.screenshot(path=os.path.join(SHOTS, "nav-dropdown.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 480})
        print("  shot: nav-dropdown.png")
        out["dropdown"] = page.evaluate(r"""() => {
          const dd = [...document.querySelectorAll('header [class*="dropdown" i], header ul ul, header [class*="submenu" i], header [class*="sub-menu" i]')].find((e) => e.offsetHeight > 10);
          if (!dd) return null; const cs = getComputedStyle(dd);
          return { bg: cs.backgroundColor, radius: cs.borderRadius, pad: cs.padding, shadow: cs.boxShadow.slice(0,100), transition: cs.transition.slice(0,90) };
        }""")
    except Exception as e:
        print("  dropdown fail", str(e)[:90])

    # 3. hovers: amber pill + careers pill in header
    try:
        ci = page.locator("header").get_by_text("COMMERCIAL INQUIRIES").first
        page.mouse.move(720, 700); time.sleep(0.4)
        clip_shot(page, ci, os.path.join(SHOTS, "btn-amber-rest.png"))
        before = ci.evaluate("el => { const c = getComputedStyle(el); return c.backgroundColor + ' / ' + c.color; }")
        ci.hover(); time.sleep(0.5)
        clip_shot(page, ci, os.path.join(SHOTS, "btn-amber-hover.png"))
        after = ci.evaluate("el => { const c = getComputedStyle(el); return c.backgroundColor + ' / ' + c.color; }")
        out["amberBtnHover"] = {"rest": before, "hover": after}
        cr = page.locator("header").get_by_text("CAREERS", exact=True).first
        b2 = cr.evaluate("el => { const c = getComputedStyle(el); return c.backgroundColor + ' / ' + c.color + ' / ' + c.borderColor; }")
        cr.hover(); time.sleep(0.5)
        clip_shot(page, cr, os.path.join(SHOTS, "btn-outline-hover.png"))
        a2 = cr.evaluate("el => { const c = getComputedStyle(el); return c.backgroundColor + ' / ' + c.color + ' / ' + c.borderColor; }")
        out["outlineBtnHover"] = {"rest": b2, "hover": a2}
    except Exception as e:
        print("  hover fail", str(e)[:120])

    # 4. news card image hover (zoom)
    try:
        page.evaluate("window.scrollTo(0, 4600)"); time.sleep(1.5)
        card = page.locator('[class*="post-carousel"] article, [class*="post-carousel"] a[href*="news"]').first
        img = card.locator("img").first
        t0 = img.evaluate("el => { const c = getComputedStyle(el); return { transition: c.transition, transform: c.transform, filter: c.filter }; }")
        card.hover(); time.sleep(0.7)
        t1 = img.evaluate("el => { const c = getComputedStyle(el); return { transition: c.transition, transform: c.transform, filter: c.filter }; }")
        out["cardImgHover"] = {"rest": t0, "hover": t1}
        clip_shot(page, card, os.path.join(SHOTS, "news-card-hover.png"), pad=10)
    except Exception as e:
        print("  card hover fail", str(e)[:120])

    with open(os.path.join(DATA, "probe-home.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print("home probe data written")

    # 5. solutions: accordion + slide deck
    print("== solutions probe ==")
    out2 = {}
    page.goto("https://sanctuary.ai/solutions/", wait_until="load", timeout=45000)
    time.sleep(2.5)
    try:
        page.evaluate("document.querySelectorAll('.cky-consent-container,.cky-overlay').forEach(e=>e.remove())")
    except Exception: pass
    try:
        acc = page.get_by_text("Automotive", exact=True).first
        acc.scroll_into_view_if_needed(); time.sleep(1.2)
        acc.click(); time.sleep(1.0)
        page.screenshot(path=os.path.join(SHOTS, "accordion-open.png"))
        print("  shot: accordion-open.png")
        out2["accordion"] = page.evaluate(r"""() => {
          const row = [...document.querySelectorAll('div,li,section,button')].find((e) => (e.innerText||'').trim().startsWith('Automotive') && e.offsetHeight > 40 && e.offsetHeight < 900);
          if (!row) return null; const cs = getComputedStyle(row);
          return { h: row.offsetHeight, borderTop: cs.borderTop, pad: cs.padding, transition: cs.transition.slice(0,120) };
        }""")
    except Exception as e:
        print("  accordion fail", str(e)[:120])
    # numbered slide deck
    try:
        out2["slideDeck"] = page.evaluate(r"""() => {
          const wrap = document.querySelector('[class*="carousel" i], [class*="slider" i], .swiper');
          if (!wrap) return null;
          return { cls: (wrap.className||'').toString().slice(0,120) };
        }""")
        page.evaluate("window.scrollTo(0, 1400)"); time.sleep(1.5)
        page.screenshot(path=os.path.join(SHOTS, "solutions-slide-deck.png"))
        print("  shot: solutions-slide-deck.png")
    except Exception as e:
        print("  deck fail", str(e)[:90])
    with open(os.path.join(DATA, "probe-solutions.json"), "w", encoding="utf-8") as f:
        json.dump(out2, f, indent=1)

    # 6. footer close-up (from home)
    print("== footer probe ==")
    page.goto("https://sanctuary.ai/", wait_until="load", timeout=45000)
    time.sleep(2)
    try:
        page.evaluate("document.querySelectorAll('.cky-consent-container,.cky-overlay').forEach(e=>e.remove())")
    except Exception: pass
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); time.sleep(1.5)
    page.screenshot(path=os.path.join(SHOTS, "footer.png"))
    print("  shot: footer.png")
    out3 = page.evaluate(r"""() => {
      const f = document.querySelector('footer') || [...document.querySelectorAll('div')].find((e) => /©/.test(e.innerText||'') && e.offsetHeight > 200);
      if (!f) return null; const cs = getComputedStyle(f);
      const cols = [...f.querySelectorAll('h3,h4,strong,[class*="heading"]')].map((e) => (e.innerText||'').trim()).filter(Boolean).slice(0,10);
      return { bg: cs.backgroundColor, pad: cs.padding, cols, h: f.offsetHeight, radius: cs.borderRadius, cls: (f.className||'').toString().slice(0,100) };
    }""")
    with open(os.path.join(DATA, "probe-footer.json"), "w", encoding="utf-8") as f:
        json.dump(out3, f, indent=1)

    browser.close()
print("PROBE DONE")
