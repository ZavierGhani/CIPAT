// CIPAT landing: intro, Press start, navbar, parallax, scroll reveal.
const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- Press start: transisi murni kode ---------- */
const go = () => { location.href = 'pages/signup.html'; };
function enter(e) {
  e.preventDefault();
  const hero = $('.hero');
  const gate = $('.gate');
  // Tanpa animasi kalau pengguna minta gerak dikurangi, atau tombol diklik dari bawah halaman.
  if (reduce || !hero || !gate || hero.getBoundingClientRect().bottom < 120) return go();
  const h = hero.getBoundingClientRect();
  const g = gate.getBoundingClientRect();
  // Titik pintu (38% dari tinggi gambar) jadi pusat cahaya dan garis kecepatan.
  const dx = g.left - h.left + g.width * 0.5;
  const dy = g.top - h.top + g.height * 0.38;
  hero.style.setProperty('--dx', dx.toFixed(0) + 'px');
  hero.style.setProperty('--dy', dy.toFixed(0) + 'px');
  // Setiap objek terlempar menjauh dari pintu.
  $$('.obj').forEach((o) => {
    const b = o.getBoundingClientRect();
    o.style.setProperty('--vx', ((b.left + b.width / 2 - h.left - dx) * 1.4).toFixed(0));
    o.style.setProperty('--vy', ((b.top + b.height / 2 - h.top - dy) * 1.4).toFixed(0));
  });
  document.body.classList.add('entering');
  setTimeout(go, 1300);
}
$$('[data-start]').forEach((el) => el.addEventListener('click', enter));
// Kalau pengguna menekan Back, halaman tidak boleh tertahan di keadaan transisi.
addEventListener('pageshow', () => document.body.classList.remove('entering'));

/* ---------- Ikon pixel (placeholder, ganti dengan PNG voxel nanti) ---------- */
const PAL = { N: '#25234F', B: '#3650A2', L: '#9DB8F5', Y: '#F6CC48', P: '#F2AEC2', C: '#FFF6E0', W: '#FFFFFF', V: '#DCE8FA', G: '#B8C4E8', S: '#8A5A33' };
const ICONS = {
  laptop: [
    '..............',
    '..NNNNNNNNNN..',
    '..NLLLLLLLLN..',
    '..NLBBBBBBLN..',
    '..NLBYYBBBLN..',
    '..NLBBBBPPLN..',
    '..NLBBBBBBLN..',
    '..NLLLLLLLLN..',
    '..NNNNNNNNNN..',
    '.NNCCCCCCCCNN.',
    '.NCCCCCCCCCCN.',
    '.NNNNNNNNNNNN.',
    '..............'
  ],
  gavel: [
    '..............',
    '..NNNNNNNNNN..',
    '.NBYYYYYYYYBN.',
    '.NBYYYYYYYYBN.',
    '..NNNNNNNNNN..',
    '......NSN.....',
    '......NSN.....',
    '......NSN.....',
    '......NSN.....',
    '......NSN.....',
    '.NNNNNNNNNNNN.',
    '.NBBBBBBBBBBN.',
    '.NNNNNNNNNNNN.'
  ],
  book: [
    '..............',
    '..NNNNNNNNNN..',
    '.NCCCCNNCCCCN.',
    '.NCLLCNNCLLCN.',
    '.NCCCCNNCCCCN.',
    '.NCLLCNNCLLCN.',
    '.NCCCCNNCCCCN.',
    '.NCLLCNNCLLCN.',
    '.NCCCCNNCCCCN.',
    '.NNNNNNNNNNNN.',
    '.NBBBBBBBBBBN.',
    '..NNNNNNNNNN..',
    '..............'
  ],
  steth: [
    '..............',
    '.NN........NN.',
    '.NYN......NYN.',
    '..NG......GN..',
    '..NG......GN..',
    '..NG......GN..',
    '..NGN....NGN..',
    '...NGGGGGGN...',
    '....NNGGNN....',
    '......NGN.....',
    '.....NNGNN....',
    '....NYYYYN....',
    '....NYCCYN....',
    '....NYYYYN....',
    '.....NNNN.....',
  ],
  gear: [
    '.....NNNN.....',
    '..NN.NYYN.NN..',
    '.NYYNNYYNNYYN.',
    '.NYYYYYYYYYYN.',
    '..NYYYYYYYYN..',
    'NNYYYNNNNYYYNN',
    'NYYYYN..NYYYYN',
    'NYYYYN..NYYYYN',
    'NNYYYNNNNYYYNN',
    '..NYYYYYYYYN..',
    '.NYYYYYYYYYYN.',
    '.NYYNNYYNNYYN.',
    '..NN.NYYN.NN..',
    '.....NNNN.....'
  ],
  brush: [
    '...........NN.',
    '..........NSSN',
    '.........NSSN.',
    '........NSSN..',
    '.......NSSN...',
    '......NGGN....',
    '.....NGGN.....',
    '....NPPN......',
    '...NPPPPN.....',
    '..NPPPPN......',
    '..NPPPN.......',
    '...NNN........',
    '..............',
    '..............'
  ],
  eye: [
    '..............',
    '..............',
    '....NNNNNN....',
    '..NNCCCCCCNN..',
    '.NCCCCBBCCCCN.',
    'NCCCCBBBBCCCCN',
    'NCCCCBNNBCCCCN',
    'NCCCCBBBBCCCCN',
    '.NCCCCBBCCCCN.',
    '..NNCCCCCCNN..',
    '....NNNNNN....',
    '..............'
  ],
  heart: [
    '..............',
    '.NNNN....NNNN.',
    'NPPPPNNNNPPPPN',
    'NPCPPPPPPPPPPN',
    'NPPPPPPPPPPPPN',
    '.NPPPPPPPPPPN.',
    '..NPPPPPPPPN..',
    '...NPPPPPPN...',
    '....NPPPPN....',
    '.....NPPN.....',
    '......NN......',
    '..............'
  ],
  chart: [
    '..............',
    '..............',
    '.N.......PP...',
    '.N.......PP...',
    '.N.......PP...',
    '.N....YY.PP...',
    '.N....YY.PP...',
    '.N....YY.PP...',
    '.N.BB.YY.PP...',
    '.N.BB.YY.PP...',
    '.N.BB.YY.PP...',
    '.NNNNNNNNNNNN.',
    '..............'
  ],
  cloud: [
    '...........WWWWW............',
    '.........WWWWWWWWW...WWW....',
    '.....WWWWWWWWWWWWWWWWWWWWW..',
    '..WWWWWWWWWWWWWWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWWWWWWWWWWWWWW',
    '.VVVVVVVVVVVVVVVVVVVVVVVVVV.',
    '...VVVVVVVVVVVVVVVVVVVVVV...'
  ],
};
function drawIcon(el) {
  const rows = ICONS[el.dataset.icon];
  if (!rows || el.firstElementChild) return; // sudah berisi <img>: biarkan
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + rows[0].length + ' ' + rows.length);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let n = 1;
      while (row[x + n] === c) n++;
      if (c !== '.') {
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x); r.setAttribute('y', y);
        r.setAttribute('width', n); r.setAttribute('height', 1);
        r.setAttribute('fill', PAL[c]);
        svg.append(r);
      }
      x += n;
    }
  });
  el.append(svg);
}
$$('[data-icon]').forEach(drawIcon);

/* ---------- Teks per huruf (untuk animasi) ---------- */
function split(el) {
  if (!el) return;
  const text = el.textContent.trim();
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = text;
  const vis = document.createElement('span');
  vis.setAttribute('aria-hidden', 'true');
  [...text].forEach((ch, i) => {
    if (ch === ' ') { vis.append(' '); return; }
    const s = document.createElement('i');
    s.style.setProperty('--i', i);
    s.textContent = ch;
    vis.append(s);
  });
  el.replaceChildren(sr, vis);
}
split($('.logo'));
split($('.tagline'));
// Efek ketik untuk tagline (JS supaya pasti jalan di semua browser).
if (!reduce) {
  $$('.tagline i').forEach((l, i) => {
    l.style.opacity = 0;
    setTimeout(() => { l.style.opacity = 1; }, 900 + i * 40);
  });
}
split($('.nav .brand span'));

/* ---------- Bintang dan kunang-kunang ---------- */
function decorate(box) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = +box.dataset.stars || 0;
  const band = +box.dataset.band || 100;
  for (let i = 0; i < stars; i++) {
    const s = document.createElement('i');
    s.className = 'st';
    s.style.cssText = 'left:' + (rnd() * 100).toFixed(1) + '%;top:' + (rnd() * band).toFixed(1) + '%;--s:' + (rnd() > 0.8 ? 6 : 4) + 'px;--d:-' + (rnd() * 3).toFixed(1) + 's';
    box.append(s);
  }
  const flies = +box.dataset.fireflies || 0;
  for (let i = 0; i < flies; i++) {
    const f = document.createElement('i');
    f.className = 'ff';
    f.style.cssText = 'left:' + (24 + rnd() * 52).toFixed(1) + '%;top:' + (46 + rnd() * 40).toFixed(1) + '%;--t:' + (6 + rnd() * 5).toFixed(1) + 's;--d:-' + (rnd() * 9).toFixed(1) + 's;--x:' + Math.round(rnd() * 50 - 25) + 'px';
    box.append(f);
  }
}
$$('.sky').forEach(decorate);

/* ---------- Ticker ---------- */
const track = $('.track');
if (track) {
  const items = ['Experience it', 'Say how it feels', 'Get your fit report', 'No wrong answers', '3 majors to try'];
  const one = items.map((t) => '<span><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#star"/></svg>' + t + '</span>').join('');
  track.innerHTML = one.repeat(6);
}

/* ---------- Parallax (hanya mouse) ---------- */
const heroEl = $('.hero');
if (heroEl && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let raf = 0, tx = 0, ty = 0;
  heroEl.addEventListener('pointermove', (e) => {
    const r = heroEl.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(() => {
      heroEl.style.setProperty('--mx', tx.toFixed(3));
      heroEl.style.setProperty('--my', ty.toFixed(3));
      raf = 0;
    });
  });
  heroEl.addEventListener('pointerleave', () => {
    heroEl.style.setProperty('--mx', 0);
    heroEl.style.setProperty('--my', 0);
  });
}

/* ---------- Navbar: solid, progress, panah ke bagian berikutnya ---------- */
const nav = $('.nav');
const down = $('.nav-down');
const secs = $$('main > section');
const nextSection = () => secs.find((s) => s.getBoundingClientRect().top > 90) || null;
let ticking = false;
function sync() {
  ticking = false;
  const max = root.scrollHeight - innerHeight;
  if (nav) {
    nav.classList.toggle('solid', scrollY > 40);
    nav.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(3) : 0);
  }
  if (down) {
    const up = !nextSection() || scrollY >= max - 4;
    down.classList.toggle('up', up);
    const label = up ? 'Back to top' : 'Scroll to the next section';
    down.setAttribute('aria-label', label);
    down.title = label;
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
addEventListener('resize', sync);
sync();
if (down) {
  down.addEventListener('click', () => {
    const behavior = reduce ? 'auto' : 'smooth';
    const max = root.scrollHeight - innerHeight;
    const next = nextSection();
    if (next && scrollY < max - 4) next.scrollIntoView({ behavior, block: 'start' });
    else scrollTo({ top: 0, behavior });
  });
}

/* ---------- Muncul saat di-scroll ---------- */
if (!reduce && 'IntersectionObserver' in window) {
  const items = $$('.tile, .path li, .quote, .sec h2, .sec .intro, .note, .cta > *');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      el.classList.add('in');
      // Setelah selesai, lepas kelasnya supaya efek hover tile tidak ikut lambat.
      setTimeout(() => { el.classList.remove('rv', 'in'); el.style.removeProperty('--n'); }, 1200);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => {
    const n = Math.min(4, [...el.parentElement.children].indexOf(el));
    el.style.setProperty('--n', n);
    el.classList.add('rv');
    io.observe(el);
  });
}