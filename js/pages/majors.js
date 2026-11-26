(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;
  const profile = await getProfile();
  $('hello').textContent = 'Hi, ' + (profile && profile.name ? profile.name : 'player');
  $('out').onclick = signOut;

  const catalog = await (await fetch('../data/majors.json')).json();
  const byId = Object.fromEntries(catalog.playable.map((m) => [m.id, m]));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  // ---- icons (file names are case-sensitive on Cloudflare) ----
  const OBJ = '../assets/img/objects/';
  const ICON = { it: 'laptop.png', law: 'gavel.png', 'english-ed': 'book.png' };
  const SOON_ICON = { Medicine: 'Stethoscope.png', 'Mechanical Engineering': 'gear.png' };
  const LOCK = ['...####...', '..##..##..', '..##..##..', '..##..##..', '.########.', '.########.', '.###..###.', '.###..###.', '.########.', '.########.'];
  function pixelLock() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    let d = '';
    LOCK.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') d += 'M' + x + ' ' + y + 'h1v1h-1z'; }));
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'currentColor');
    svg.append(p);
    return svg;
  }
  function icon(file, size) {
    const i = el('img');
    i.src = OBJ + file; i.alt = ''; i.width = size; i.height = size;
    i.loading = 'lazy'; i.decoding = 'async';
    return i;
  }

  function card(m, reason) {
    const c = el('article', 'major' + (reason ? ' suggested' : ''));
    const tile = el('span', 'mtile t-' + m.id);
    if (ICON[m.id]) tile.append(icon(ICON[m.id], 56));
    c.append(tile, el('h3', '', m.name), el('p', '', m.blurb));
    if (reason) c.append(el('p', 'why', reason));
    const b = el('button', 'btn', 'Explore');
    b.type = 'button';
    b.setAttribute('aria-label', 'Explore ' + m.name);
    b.onclick = () => pick(m);
    c.append(b);
    return c;
  }

  catalog.playable.forEach((m) => $('grid').append(card(m)));
  catalog.comingSoon.forEach((name) => {
    const li = el('li', 'soon-chip');
    const ic = el('span', 'soon-ic');
    ic.append(SOON_ICON[name] ? icon(SOON_ICON[name], 24) : pixelLock());
    li.append(ic, el('span', '', name), el('small', '', 'Soon'));
    $('soon').append(li);
  });

  // ---- example chips + counter ----
  const EXAMPLES = ['I like solving puzzles', 'I enjoy debating', 'I love teaching', 'I want to build apps', 'I like helping people', 'I am curious how things work'];
  const updateCount = () => { $('count').textContent = $('interest').value.length + ' / 500'; };
  EXAMPLES.forEach((t) => {
    const b = el('button', 'ex-chip', t);
    b.type = 'button';
    b.onclick = () => {
      const v = $('interest').value.trim().replace(/[.\s]+$/, '');
      $('interest').value = (v ? v + '. ' + t : t).slice(0, 500);
      updateCount();
      $('interest').focus();
    };
    $('chips').append(b);
  });
  $('interest').addEventListener('input', updateCount);
  updateCount();

  async function pick(m) {
    say('Setting up your simulation...');
    const { data, error } = await db.from('simulations')
      .insert({ user_id: session.user.id, major_id: m.id }).select().single();
    if (error) return say('Could not start this major. ' + friendly(error), 'err');
    location.href = profile && profile.character ? 'validate.html' : 'character.html';
  }

  function matchByKeywords(text) {
    const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
    const scored = catalog.playable
      .map((m) => ({ id: m.id, hit: m.keywords.filter((k) => words.has(k)) }))
      .filter((s) => s.hit.length)
      .sort((a, b) => b.hit.length - a.hit.length)
      .slice(0, 3);
    if (!scored.length) {
      return catalog.playable.map((m) => ({ id: m.id, reason: 'No exact match yet. Add a few more details for sharper suggestions.' }));
    }
    return scored.map((s) => ({ id: s.id, reason: 'You mentioned ' + s.hit.slice(0, 3).join(', ') + '.' }));
  }

  async function suggest() {
    const text = $('interest').value.trim();
    if (text.length < 3) return say('Write a few words about what you like, what you are good at, or the job you imagine.', 'err');
    say('');
    const btn = $('suggest');
    btn.disabled = true; btn.textContent = 'Thinking...';
    $('found').hidden = true;
    $('thinking').hidden = false;
    let results = null;
    try { results = await askAI('recommend', { text, majors: catalog.playable }); } catch (e) { results = null; }
    if (!results) results = matchByKeywords(text);
    $('thinking').hidden = true;
    btn.disabled = false; btn.textContent = 'Suggest majors';
    const box = $('results');
    box.replaceChildren();
    results.forEach((r) => { if (byId[r.id]) box.append(card(byId[r.id], r.reason)); });
    if (!box.children.length) return say('No match yet. Try adding a few more details about yourself.', 'err');
    box.classList.remove('reveal'); void box.offsetWidth; box.classList.add('reveal');
    $('found').hidden = false;
    $('found').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  $('suggest').onclick = suggest;
})();