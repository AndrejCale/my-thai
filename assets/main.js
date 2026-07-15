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
    burger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
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

  /* ---- splash intro / curtain reveal on arrival ---- */
  const splash = document.getElementById('splash');
  const curtain = document.getElementById('curtain');
  const curtainFill = curtain ? curtain.querySelector('#curtain-fill') : null;

  if (MT_REDUCE_MOTION) {
    if (splash) splash.style.display = 'none';
    if (curtain) curtain.style.display = 'none';
    sessionStorage.removeItem('mt_nav_dir');
    sessionStorage.setItem('mt_visited', '1');
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
    const visited = sessionStorage.getItem('mt_visited');
    if (visited) {
      splash.style.display = 'none';
    } else {
      sessionStorage.setItem('mt_visited', '1');
      setTimeout(() => {
        splash.classList.add('hide');
        setTimeout(() => { splash.style.display = 'none'; }, 850);
      }, 1450);
    }
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
});
