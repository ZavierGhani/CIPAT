(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;
  const profile = await getProfile();
  $('hello').textContent = 'Hi, ' + (profile && profile.name ? profile.name : 'player');
  $('out').onclick = signOut;

  const { data: sim } = await db.from('simulations').select('*')
    .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!sim) return location.replace('majors.html');
  if (sim.decision !== 'continue') return location.replace('validate.html');

  const major = await (await fetch('../data/' + sim.major_id + '.json')).json();
  const courses = await (await fetch('../data/courses-' + sim.major_id + '.json')).json();
  const { data: rows } = await db.from('course_feedback').select('level,course_id').eq('sim_id', sim.id);
  const done = new Set((rows || []).map((r) => r.level + ':' + r.course_id));
  $('title').textContent = major.name + ': your levels';

  const LEVELS = [
    { key: 'basic', num: 1, name: 'Basic', sub: 'Foundation', blurb: 'The basics and the way of thinking. You learn what this major is really about.' },
    { key: 'medium', num: 2, name: 'Medium', sub: 'Core', blurb: 'The core, technical classes. You feel the real content of the major.' },
    { key: 'deep', num: 3, name: 'Deep', sub: 'Practice', blurb: 'Close to the real world: projects, internships, and what the work looks like.' }
  ];
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const levelDone = (k) => (courses[k] || []).every((c) => done.has(k + ':' + c.id));
  const unlocked = { basic: true, medium: levelDone('basic'), deep: levelDone('basic') && levelDone('medium') };

  const box = $('levels');
  LEVELS.forEach((L) => {
    const list = courses[L.key] || [];
    const isDone = list.length > 0 && levelDone(L.key);
    const open = unlocked[L.key];
    const card = el('section', 'lvl' + (open ? '' : ' locked'));
    const head = el('div', 'lvl-head');
    head.append(el('span', 'chip', 'Level ' + L.num));
    head.append(el('span', 'chip ' + (isDone ? 'done' : open ? 'open' : ''), isDone ? 'Done' : open ? 'Open' : 'Locked'));
    card.append(head, el('h2', '', L.name + ' (' + L.sub + ')'), el('p', '', L.blurb));

    if (!list.length) card.append(el('p', 'hint', 'Classes for this level are coming soon.'));
    list.forEach((c) => {
      const finished = done.has(L.key + ':' + c.id);
      const row = el('div', 'crs');
      const txt = el('div');
      txt.append(el('b', '', c.title), el('p', 'hint', c.overview));
      const b = el('button', 'btn', finished ? 'Review' : 'Start');
      b.type = 'button';
      b.setAttribute('aria-label', (finished ? 'Review ' : 'Start ') + c.title);
      if (!open) { b.disabled = true; b.textContent = 'Locked'; }
      b.onclick = () => { location.href = 'course.html?level=' + L.key + '&course=' + encodeURIComponent(c.id); };
      row.append(txt, b);
      card.append(row);
    });
    if (!open) card.append(el('p', 'hint', 'Finish every class in the previous level to open this one.'));
    box.append(card);
  });

  if (LEVELS.every((L) => (courses[L.key] || []).length && levelDone(L.key))) $('all-done').hidden = false;
})();