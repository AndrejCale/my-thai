/* ---- page order, used to decide curtain direction ---- */
var MT_PAGE_ORDER = ['index.html','menu.html','standorte.html','express.html','jobs.html','impressum.html','datenschutz.html'];
var MT_REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mtCurrentFile(){
  var p = location.pathname.split('/').pop();
  return p === '' ? 'index.html' : p;
}

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.nav-burger');
  const links = document.querySelector('.nav-links');
  if (burger && links) {
    const closeMobileNav = () => {
      links.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = links.classList.toggle('open');
      burger.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
    document.addEventListener('click', (e) => {
      if (!links.classList.contains('open')) return;
      if (e.target.closest('.nav-links') || e.target.closest('.nav-burger')) return;
      closeMobileNav();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });
  }
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // reveal-on-scroll (subtle, respects reduced motion)
  if (!MT_REDUCE_MOTION && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---- splash intro / curtain reveal on arrival ----
     The splash plays on every real page load (including refreshes) —
     it only gets skipped when we arrived via an in-site curtain nav,
     since the curtain itself already carries that transition. */
  const splash = document.getElementById('splash');
  const curtain = document.getElementById('curtain');
  const curtainFill = curtain ? curtain.querySelector('#curtain-fill') : null;

  if (MT_REDUCE_MOTION) {
    if (splash) splash.style.display = 'none';
    if (curtain) curtain.style.display = 'none';
    sessionStorage.removeItem('mt_nav_dir');
  } else if (curtain && curtain.dataset.pendingReveal) {
    // arrived here via an in-site link — reveal by sliding the curtain panel away
    if (splash) splash.style.display = 'none';
    const dir = curtain.dataset.pendingReveal;
    sessionStorage.removeItem('mt_nav_dir');
    const toX = dir === 'forward' ? '100%' : '-100%';
    requestAnimationFrame(() => {
      const anim = curtainFill.animate(
        [{ transform: 'translateX(0%)' }, { transform: `translateX(${toX})` }],
        { duration: 480, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
      );
      anim.onfinish = () => { curtain.style.display = 'none'; };
    });
  } else if (splash) {
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => { splash.style.display = 'none'; }, 850);
    }, 1450);
  }

  /* ---- intercept in-site links to play a directional curtain wipe ---- */
  if (!MT_REDUCE_MOTION) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:\/\//.test(href)) return;

      const targetFile = href.split('#')[0];
      const curFile = mtCurrentFile();
      if (!targetFile || targetFile === curFile) return; // pure in-page anchor, let it scroll normally
      if (MT_PAGE_ORDER.indexOf(targetFile) === -1) return;

      e.preventDefault();
      const curIdx = MT_PAGE_ORDER.indexOf(curFile);
      const tgtIdx = MT_PAGE_ORDER.indexOf(targetFile);
      const dir = tgtIdx >= curIdx ? 'forward' : 'back';
      const fromX = dir === 'forward' ? '-100%' : '100%';

      const c = document.getElementById('curtain');
      const f = c.querySelector('#curtain-fill');
      c.style.display = 'block';
      f.animate(
        [{ transform: `translateX(${fromX})` }, { transform: 'translateX(0%)' }],
        { duration: 420, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
      ).onfinish = () => {
        sessionStorage.setItem('mt_nav_dir', dir);
        window.location.href = href;
      };
    });
  }

  /* ---- accordion image gallery (hover/tap to expand) ---- */
  const gallery = document.getElementById('foodGallery');
  if (gallery) {
    const panels = Array.from(gallery.querySelectorAll('.ag-panel'));
    const count = panels.length;
    const expandRatio = 0.52;
    const grow = count > 1 ? (expandRatio * (count - 1)) / (1 - expandRatio) : 1;

    const setActive = (i) => {
      panels.forEach((p, idx) => {
        const isActive = idx === i;
        p.classList.toggle('is-active', isActive);
        p.style.flexGrow = isActive ? grow : 1;
        p.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    };

    panels.forEach((panel, i) => {
      panel.addEventListener('mouseenter', () => setActive(i));
      panel.addEventListener('focus', () => setActive(i));
      panel.addEventListener('click', (e) => {
        if (!panel.classList.contains('is-active')) {
          e.preventDefault();
          setActive(i);
        }
      });
      panel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (i + 1) % count;
          setActive(next);
          panels[next].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (i - 1 + count) % count;
          setActive(prev);
          panels[prev].focus();
        }
      });
    });

    const initialActive = panels.findIndex((p) => p.classList.contains('is-active'));
    setActive(initialActive === -1 ? 0 : initialActive);

    /* ---- phones: no hover, so a center "scroll line" picks the active
       panel instead — whichever panel crosses screen-center grows + colors,
       same as desktop hover, just driven by scroll position ---- */
    const scrollLine = document.getElementById('scrollLine');
    if (scrollLine && window.matchMedia('(max-width: 640px)').matches && !MT_REDUCE_MOTION) {
      const lineObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => scrollLine.classList.toggle('show', e.isIntersecting));
      }, { threshold: 0 });
      lineObserver.observe(gallery);

      let ticking = false;
      const updateActiveByScroll = () => {
        ticking = false;
        const centerY = window.innerHeight / 2;
        let closest = 0;
        let closestDist = Infinity;
        panels.forEach((p, idx) => {
          const r = p.getBoundingClientRect();
          const dist = Math.abs((r.top + r.height / 2) - centerY);
          if (dist < closestDist) { closestDist = dist; closest = idx; }
        });
        setActive(closest);
      };
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateActiveByScroll);
      }, { passive: true });
    }
  }

  /* ---- hero flip word: "my" stays put, the rest cycles through the brand line ---- */
  const heroFlip = document.getElementById('heroFlip');
  const heroFlipWord = document.getElementById('heroFlipWord');
  if (heroFlip && heroFlipWord) {
    const words = ['thai.', 'food.', 'way.'];
    const bgColors = ['var(--p-400)', 'var(--p-500)', 'var(--p-600)'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;

    function measure(text) {
      const clone = heroFlipWord.cloneNode(true);
      clone.textContent = text;
      clone.style.visibility = 'hidden';
      clone.style.position = 'absolute';
      heroFlip.appendChild(clone);
      const w = clone.getBoundingClientRect().width;
      clone.remove();
      return w;
    }
    function setWidth(text) {
      const cs = getComputedStyle(heroFlip);
      const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      heroFlip.style.width = Math.ceil(measure(text) + padding) + 'px';
    }

    setWidth(words[0]);
    if (document.fonts && document.fonts.ready) {
      // the display-font loads async; if it swaps in after our first
      // measurement, re-measure so the box isn't sized off the fallback font
      document.fonts.ready.then(() => setWidth(words[i]));
    }

    function next() {
      i = (i + 1) % words.length;
      const word = words[i];
      heroFlip.style.background = bgColors[i];
      if (reduceMotion) {
        heroFlipWord.textContent = word;
        setWidth(word);
        return;
      }
      heroFlipWord.classList.add('out');
      setWidth(word);
      setTimeout(() => {
        heroFlipWord.textContent = word;
        heroFlipWord.classList.remove('out');
        heroFlipWord.classList.add('in');
        setTimeout(() => heroFlipWord.classList.remove('in'), 400);
      }, 320);
    }
    setInterval(next, 2200);
    window.addEventListener('resize', () => setWidth(words[i]));
  }

  /* ---- collapsible location grid (phones only, via CSS) ---- */
  const vibeToggle = document.getElementById('vibeToggle');
  const vibeCollapse = document.getElementById('vibeCollapse');
  if (vibeToggle && vibeCollapse) {
    vibeToggle.addEventListener('click', () => {
      const expanded = vibeCollapse.classList.toggle('expanded');
      vibeToggle.classList.toggle('open', expanded);
      vibeToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      vibeToggle.querySelector('span').textContent = expanded
        ? 'weniger anzeigen'
        : 'alle standorte anzeigen';
    });
  }
});
