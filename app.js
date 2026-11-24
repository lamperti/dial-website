(() => {
  const needle = document.querySelector('.needle');
  const ruler = document.querySelector('.ruler');
  if (needle) {
    let queued = false;
    const place = () => {
      queued = false;
      const doc = document.documentElement;
      const range = doc.scrollHeight - window.innerHeight;
      const t = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0.5;
      const w = doc.clientWidth;
      const rx = Math.round(w / 2);
      ruler.style.setProperty('--rx', `${rx}px`);
      const x = 30 + t * (w - 60);
      needle.style.setProperty('--x', `${rx + Math.round((x - rx) / 10) * 10}px`);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(place); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    place();
  }

  const layers = [...document.querySelectorAll('.frame, .bezel, .screen, .iconring, .icon')];
  if (layers.length) {
    const K = 1.52866483;
    const corner = [
      ['C', 1.08849323, 0, 0.86840689, 0.02101458, 0.66993427, 0.06549600],
      ['L', 0.63149399, 0.07491176],
      ['C', 0.37282392, 0.16905899, 0.16906001, 0.37282401, 0.07491100, 0.63149399],
      ['C', 0.02101458, 0.86840689, 0, 1.08849323, 0, K],
    ];
    const f = (n) => n.toFixed(2);
    const smooth = () => layers.forEach((el) => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      if (!el.dataset.ratio) {
        el.dataset.ratio = parseFloat(getComputedStyle(el).borderTopLeftRadius) / w || 0;
        el.style.borderRadius = '0';
      }
      const r = Math.min(el.dataset.ratio * w, Math.min(w, h) / 2 / K);
      if (!r) return;
      const maps = [
        (a, b) => [w - a * r, b * r],
        (a, b) => [w - b * r, h - a * r],
        (a, b) => [a * r, h - b * r],
        (a, b) => [b * r, a * r],
      ];
      let d = `M${f(K * r)} 0`;
      maps.forEach((m) => {
        const [sx, sy] = m(K, 0);
        d += `L${f(sx)} ${f(sy)}`;
        corner.forEach(([op, ...n]) => {
          const pts = [];
          for (let i = 0; i < n.length; i += 2) pts.push(m(n[i], n[i + 1]).map(f).join(' '));
          d += op + pts.join(' ');
        });
      });
      el.style.clipPath = `path('${d}Z')`;
    });
    const ro = new ResizeObserver(smooth);
    layers.forEach((el) => ro.observe(el));
    smooth();
  }

  const screen = document.querySelector('.stage .screen');
  if (!screen) return;
  const stage = screen.closest('.stage');
  const device = stage.querySelector('.device');
  const label = stage.querySelector('.label');
  const title = label.querySelector('.title');
  const sub = label.querySelector('.sub');
  const slides = [...screen.querySelectorAll('img')];
  const HOLD = 6500;
  const TUCK = 450;
  const HALF = 280;
  let current = 0;
  let timer = null;
  let swap = null;
  let settle = null;

  const write = () => {
    title.textContent = slides[current].dataset.title;
    sub.textContent = slides[current].dataset.sub;
  };
  const swapIn = () => {
    slides.forEach((img, i) => {
      img.classList.toggle('was', img.classList.contains('on') && i !== current);
      img.classList.toggle('on', i === current);
    });
    clearTimeout(settle);
    settle = setTimeout(() => slides.forEach((img) => img.classList.remove('was')), 520);
    write();
  };
  // Autoplay tucks the label all the way behind the phone; a tap only
  // tucks it halfway, so browsing stays quick.
  const show = (i, quick) => {
    const next = (i + slides.length) % slides.length;
    if (next === current) return;
    current = next;
    clearTimeout(swap);
    label.classList.toggle('half', !!quick);
    label.classList.remove('in');
    swap = setTimeout(() => { swapIn(); label.classList.add('in'); }, quick ? HALF : TUCK);
  };

  const pinned = new URLSearchParams(location.search).get('slide');
  const auto = pinned === null;
  const stop = () => clearInterval(timer);
  const run = () => { stop(); if (auto) timer = setInterval(() => show(current + 1), HOLD); };
  const step = (d) => { show(current + d, true); run(); };

  if (!auto) {
    document.documentElement.classList.add('still');
    slides[current].classList.remove('on');
    current = Math.max(0, Math.min(slides.length - 1, Number(pinned) || 0));
    slides[current].classList.add('on');
    write();
    label.classList.add('in');
  } else {
    setTimeout(() => label.classList.add('in'), 700);
  }

  stage.querySelector('.prev').addEventListener('click', () => step(-1));
  stage.querySelector('.next').addEventListener('click', () => step(1));
  device.addEventListener('click', () => step(1));
  label.addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  [device, label].forEach((el) => {
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', run);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else run();
  });
  run();
})();
