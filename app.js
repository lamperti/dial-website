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

  const layers = [...document.querySelectorAll('.frame, .bezel, .screen')];
  if (layers.length) {
    const STEPS = 20, E = 2 / 3.6;
    const curve = [];
    for (let k = 0; k <= STEPS; k++) {
      const a = (k / STEPS) * Math.PI / 2;
      curve.push([1 - Math.pow(Math.cos(a), E), 1 - Math.pow(Math.sin(a), E)]);
    }
    const f = (n) => `${n.toFixed(2)}px`;
    const smooth = () => layers.forEach((el) => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
      if (!w || !h || !r) return;
      const s = Math.min(r * 1.5, w / 2, h / 2);
      const p = [];
      curve.forEach(([u, v]) => p.push(`${f(u * s)} ${f(v * s)}`));
      curve.forEach(([u, v]) => p.push(`${f(w - v * s)} ${f(u * s)}`));
      curve.forEach(([u, v]) => p.push(`${f(w - u * s)} ${f(h - v * s)}`));
      curve.forEach(([u, v]) => p.push(`${f(v * s)} ${f(h - u * s)}`));
      el.style.clipPath = `polygon(${p.join(',')})`;
    });
    new ResizeObserver(smooth).observe(layers[0]);
    smooth();
  }

  const screen = document.querySelector('.stage .screen');
  if (!screen) return;
  const slides = [...screen.querySelectorAll('img')];
  const track = document.querySelector('.stage .track');
  const mark = track.querySelector('.mark');
  const MINOR = 3;
  const PAD = 24;
  const caption = document.querySelector('.stage .caption');
  const title = caption.querySelector('.title');
  const sub = caption.querySelector('.sub');
  const HOLD = 6500;
  let current = 0;
  let timer = null;

  const at = (k) => PAD + (k / (slides.length - 1)) * (track.clientWidth - 2 * PAD);
  const steps = (slides.length - 1) * (MINOR + 1);
  for (let j = 0; j <= steps; j++) {
    const i = document.createElement('i');
    if (j % (MINOR + 1) === 0) i.className = 'major';
    i.style.left = `${PAD + (j / steps) * (track.clientWidth - 2 * PAD)}px`;
    track.appendChild(i);
  }
  const point = () => {
    mark.style.setProperty('--at', `${at(current)}px`);
    track.setAttribute('aria-valuenow', current + 1);
    track.setAttribute('aria-valuetext', slides[current].dataset.title);
  };

  const write = () => {
    title.textContent = slides[current].dataset.title;
    sub.textContent = slides[current].dataset.sub;
  };
  const show = (i) => {
    const next = (i + slides.length) % slides.length;
    if (next === current) return;
    slides[current].classList.remove('on');
    current = next;
    slides[current].classList.add('on');
    point();
    caption.classList.add('out');
    setTimeout(() => { write(); caption.classList.remove('out'); }, 300);
  };

  const stop = () => clearInterval(timer);
  const run = () => { stop(); if (auto) timer = setInterval(() => show(current + 1), HOLD); };
  const step = (d) => { show(current + d); run(); };

  const pinned = new URLSearchParams(location.search).get('slide');
  if (pinned !== null) {
    document.documentElement.classList.add('still');
    slides[current].classList.remove('on');
    current = Math.max(0, Math.min(slides.length - 1, Number(pinned) || 0));
    slides[current].classList.add('on');
    write();
  }
  const auto = pinned === null;

  const stage = screen.closest('.stage');
  stage.querySelector('.prev').addEventListener('click', () => step(-1));
  stage.querySelector('.next').addEventListener('click', () => step(1));
  stage.querySelector('.device').addEventListener('click', () => step(1));
  const nearest = (e) => {
    const r = track.getBoundingClientRect();
    const f = (e.clientX - r.left - PAD) / (r.width - 2 * PAD);
    return Math.max(0, Math.min(slides.length - 1, Math.round(f * (slides.length - 1))));
  };
  track.addEventListener('pointerdown', (e) => {
    track.setPointerCapture(e.pointerId);
    track.classList.add('dragging');
    stop();
    show(nearest(e));
  });
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) show(nearest(e));
  });
  const release = () => { track.classList.remove('dragging'); run(); };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  [stage.querySelector('.device'), stage.querySelector('figcaption')].forEach((el) => {
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', run);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else run();
  });
  point();
  run();
})();
