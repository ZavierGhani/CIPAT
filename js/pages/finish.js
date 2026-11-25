(function () {
  const $ = (id) => document.getElementById(id);
  const MAX = 3;
  let V = null, qa = null, asked = 0, sessionQs = [];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const show = (id, focusId) => { $(id).hidden = false; $(focusId).focus(); };
  const hide = (id) => { $(id).hidden = true; };
  const vmsg = (t) => { $('v-msg').textContent = t; $('v-msg').className = 'msg ' + (t ? 'err' : ''); };

  function init() {
    if (V || !window.V || !window.V.ready) return;
    V = window.V;
    $('open-senior').onclick = openSenior;
    $('open-vibe').onclick = openVibe;
    $('s-close').onclick = () => hide('senior');
    $('v-close').onclick = () => hide('vibe');
    $('s-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = $('s-input').value.trim();
      if (t) { $('s-input').value = ''; ask(t); }
    });
    $('v-go').onclick = goOn;
    $('v-no').onclick = () => { $('v-choice').hidden = true; $('v-reason').hidden = false; $('r-text').focus(); };
    $('r-send').onclick = notFit;
  }
  document.addEventListener('cipat:ready', init);
  init();

  /* ---------- Ask a senior ---------- */
  function bubble(text, who) {
    const b = el('div', 'bub ' + who, text);
    $('chat').append(b);
    b.scrollIntoView({ block: 'nearest' });
    return b;
  }

  function drawChips() {
    const box = $('chips');
    box.replaceChildren();
    if (asked >= MAX) return;
    (qa[V.sim.major_id] || []).filter((x) => !sessionQs.includes(x.q)).forEach((x) => {
      const b = el('button', '', x.q);
      b.type = 'button';
      b.onclick = () => ask(x.q);
      box.append(b);
    });
  }

  function updateLeft() {
    const left = Math.max(0, MAX - asked);
    $('s-left').textContent = left ? left + ' of ' + MAX + ' questions left.' : 'That was your last question. Thanks for asking!';
    $('s-input').disabled = $('s-form').querySelector('button').disabled = !left;
  }

  async function openSenior() {
    $('s-avatar').classList.add('senior');
    if (!qa) {
      try { qa = await (await fetch('../data/senior.json')).json(); } catch (e) { qa = {}; }
    }
    const { data } = await db.from('senior_questions').select('id').eq('sim_id', V.sim.id);
    if (data) asked = Math.max(asked, data.length);
    drawChips();
    updateLeft();
    if (!$('chat').children.length) bubble('Hi ' + V.profile.name + '! I am Senior Sam. Ask me anything about ' + V.major.name + '.', 'bot');
    show('senior', 's-title');
  }

  function fallbackAnswer(text) {
    const list = qa[V.sim.major_id] || [];
    const exact = list.find((x) => x.q === text);
    if (exact) return exact.a;
    const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
    let best = null, top = 0;
    list.forEach((x) => {
      const n = x.k.filter((k) => words.has(k)).length;
      if (n > top) { top = n; best = x; }
    });
    return best ? best.a : 'Good question! I do not have a ready answer for that one yet. Try one of the suggested questions.';
  }

  async function ask(text) {
    if (asked >= MAX) return;
    asked++;
    sessionQs.push(text);
    bubble(text, 'me');
    drawChips();
    updateLeft();
    const wait = bubble('...', 'bot');
    let answer = null;
    try {
      answer = await askAI('senior', { major: V.major.name, question: text, status: V.profile.status, facts: V.spots.map((s) => s.text) });
    } catch (e) { answer = null; }
    wait.textContent = answer || fallbackAnswer(text);
    const { error } = await db.from('senior_questions').insert({ sim_id: V.sim.id, question: text });
    if (error) $('s-left').textContent += ' (Your question could not be saved.)';
  }

  /* ---------- Vibe check ---------- */
  function summary() {
    const rated = V.spots.filter((s) => V.ratings[s.id]);
    if (!rated.length) return '';
    const sc = (s) => V.ratings[s.id].stars;
    const avg = rated.reduce((a, s) => a + sc(s), 0) / rated.length;
    const best = rated.reduce((a, s) => (sc(s) > sc(a) ? s : a));
    const worst = rated.reduce((a, s) => (sc(s) < sc(a) ? s : a));
    if (avg >= 4) return 'You were excited by this major. ' + best.title + ' stood out most.';
    if (avg >= 3) return best === worst
      ? 'Your feelings are mixed but open.'
      : 'Mixed but promising. You liked ' + best.title + ' and felt less sure about ' + worst.title + '.';
    return 'This major has not clicked yet. ' + worst.title + ' felt least like you.';
  }

  async function openVibe() {
    const list = $('v-list');
    list.replaceChildren();
    V.spots.forEach((s) => {
      const r = V.ratings[s.id];
      const li = el('li', r ? '' : 'none');
      li.append(el('span', '', s.title));
      const st = el('span', 's', r ? stars(r.stars) : 'Not rated');
      if (r) st.setAttribute('aria-label', r.stars + ' out of 5 stars');
      li.append(st);
      list.append(li);
    });
    $('v-sum').textContent = summary();
    show('vibe', 'v-title');
    try {
      const t = await askAI('vibe', { major: V.major.name, ratings: V.spots.map((s) => ({ title: s.title, ...(V.ratings[s.id] || {}) })) });
      if (t) $('v-sum').textContent = t;
    } catch (e) { /* the template sentence stays */ }
  }

  /* ---------- Decision ---------- */
  async function goOn() {
    const { error } = await db.from('simulations').update({ decision: 'continue', step: 'simulation' }).eq('id', V.sim.id);
    if (error) return vmsg(friendly(error));
    vmsg('');
    $('v-choice').hidden = true;
    $('v-done').hidden = false;
  }

  function byKeywords(text, majors) {
    const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
    return majors
      .map((m) => ({ id: m.id, hit: m.keywords.filter((k) => words.has(k)) }))
      .sort((a, b) => b.hit.length - a.hit.length)
      .map((x) => ({ id: x.id, reason: x.hit.length ? 'You mentioned ' + x.hit.slice(0, 3).join(', ') + '.' : 'A different direction from the major you just tried.' }));
  }

  function card(m, reason) {
    const c = el('article', 'major');
    c.append(el('span', 'gem g-' + m.id), el('h3', '', m.name), el('p', '', m.blurb), el('p', 'why', reason));
    const b = el('button', 'btn', 'Explore');
    b.type = 'button';
    b.setAttribute('aria-label', 'Explore ' + m.name);
    b.onclick = async () => {
      const { error } = await db.from('simulations').insert({ user_id: V.session.user.id, major_id: m.id });
      if (error) return vmsg(friendly(error));
      location.href = 'validate.html';
    };
    c.append(b);
    return c;
  }

  async function notFit() {
    const reason = $('r-text').value.trim();
    if (reason.length < 3) return vmsg('Tell us a little about what did not feel right.');
    $('r-send').disabled = true;
    vmsg('');
    const { error } = await db.from('simulations').update({ decision: 'not_fit', decision_reason: reason, step: 'alternatives' }).eq('id', V.sim.id);
    if (error) { $('r-send').disabled = false; return vmsg(friendly(error)); }
    const catalog = await (await fetch('../data/majors.json')).json();
    const others = catalog.playable.filter((m) => m.id !== V.sim.major_id);
    let picks = null;
    try {
      picks = await askAI('alternatives', { reason, majors: others, ratings: V.spots.map((s) => ({ title: s.title, ...(V.ratings[s.id] || {}) })) });
    } catch (e) { picks = null; }
    if (!picks) picks = byKeywords(reason, others);
    $('r-send').disabled = false;
    const box = $('r-results');
    box.replaceChildren();
    picks.forEach((p) => { const m = others.find((o) => o.id === p.id); if (m) box.append(card(m, p.reason)); });
  }
})();