(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
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

  function card(m, reason) {
    const c = el('article', 'major');
    c.append(el('span', 'gem g-' + m.id), el('h3', '', m.name), el('p', '', m.blurb));
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
    const c = el('article', 'major soon');
    c.append(el('span', 'gem g-soon'), el('h3', '', name), el('p', '', 'Coming soon'));
    $('grid').append(c);
  });

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
      return catalog.playable.map((m) => ({ id: m.id, reason: 'We could not match your words, so here is every major you can try.' }));
    }
    return scored.map((s) => ({ id: s.id, reason: 'You mentioned ' + s.hit.slice(0, 3).join(', ') + '.' }));
  }

  async function suggest() {
    const text = $('interest').value.trim();
    if (text.length < 3) return say('Write a few words about what you like, what you are good at, or the job you imagine.', 'err');
    say('Finding majors for you...');
    $('suggest').disabled = true;
    let results = null;
    try { results = await askAI('recommend', { text, majors: catalog.playable }); } catch (e) { results = null; }
    if (!results) results = matchByKeywords(text);
    $('suggest').disabled = false;
    say('');
    const box = $('results');
    box.replaceChildren();
    results.forEach((r) => { if (byId[r.id]) box.append(card(byId[r.id], r.reason)); });
    box.hidden = false;
  }
  $('suggest').onclick = suggest;
})();