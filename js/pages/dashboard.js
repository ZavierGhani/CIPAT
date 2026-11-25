(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;
  const profile = await getProfile();
  $('hello').textContent = 'Hi, ' + (profile && profile.name ? profile.name : 'player');
  $('out').onclick = signOut;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const catalog = await (await fetch('../data/majors.json')).json();
  const nameOf = (id) => (catalog.playable.find((m) => m.id === id) || { name: id }).name;

  const { data: sims } = await db.from('simulations').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
  const list = sims || [];
  let reports = [];
  if (list.length) {
    const { data } = await db.from('reports').select('*').in('sim_id', list.map((s) => s.id));
    reports = data || [];
  }
  const rep = Object.fromEntries(reports.map((r) => [r.sim_id, r]));
  const pillCls = { 'Very good fit': 'vg', 'Good fit': 'g', 'Not quite a fit': 'n' };
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  let n = 0;
  list.forEach((s) => {
    const r = rep[s.id];
    const inProgress = !r && s.decision === 'continue';
    if (!r && !inProgress) return;
    n++;
    const c = el('article', 'major save');
    c.append(el('span', 'savetag', 'Save ' + String(n).padStart(2, '0')), el('h3', '', nameOf(s.major_id)), el('p', 'hint', fmt(s.created_at)));
    const b = el('a', 'btn');
    if (r) {
      c.append(el('p', 'pill ' + pillCls[r.fit], r.fit), el('p', '', 'Average ' + r.content.stats.avg + ' out of 5'));
      b.textContent = 'Open report';
      b.href = 'report.html?sim=' + s.id;
    } else {
      c.append(el('p', 'pill', 'In progress'));
      b.textContent = 'Continue';
      b.href = s.step === 'report' ? 'report.html' : 'simulation.html';
    }
    c.append(b);
    $('saves').append(c);
  });
  $('empty').hidden = n > 0;

  /* compare */
  if (reports.length >= 2) {
    const rows = list.filter((s) => rep[s.id]).map((s) => ({ s, c: rep[s.id].content, fit: rep[s.id].fit }));
    const top = rows.slice().sort((a, b) => b.c.stats.score - a.c.stats.score)[0];
    $('best').textContent = 'Best match so far: ' + nameOf(top.s.major_id) + ' (' + top.fit + ', score ' + top.c.stats.score + ' out of 5).';
    const t = el('table', 'cmp');
    const head = el('tr');
    ['Major', 'Fit', 'Average stars', 'Overall feeling', 'Picture yourself in it?'].forEach((h) => head.append(el('th', '', h)));
    t.append(head);
    rows.forEach((x) => {
      const tr = el('tr');
      [nameOf(x.s.major_id), x.fit, x.c.stats.avg + '/5', x.c.stats.overall || '-', x.c.stats.picture || '-'].forEach((v) => tr.append(el('td', '', v)));
      t.append(tr);
    });
    $('table').append(t);
    $('cmp').hidden = false;
  }

  /* stopped at preview */
  const stopped = list.filter((s) => s.decision === 'not_fit');
  if (stopped.length) {
    stopped.forEach((s) => {
      const d = el('div', 'quote2');
      d.append(el('b', '', nameOf(s.major_id)), el('small', '', 'Your reason: ' + (s.decision_reason || '-')));
      $('stoplist').append(d);
    });
    $('stopped').hidden = false;
  }
})();