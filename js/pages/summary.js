(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;

  const { data: sim } = await db.from('simulations').select('*')
    .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!sim || sim.decision !== 'continue') return location.replace('simulation.html');

  const get = async (p) => (await fetch(p)).json();
  const [major, courses, sum] = await Promise.all([
    get('../data/' + sim.major_id + '.json'),
    get('../data/courses-' + sim.major_id + '.json'),
    get('../data/summary-' + sim.major_id + '.json')
  ]);
  const { data: rows } = await db.from('course_feedback').select('level,course_id').eq('sim_id', sim.id);
  const done = new Set((rows || []).map((r) => r.level + ':' + r.course_id));
  const KEYS = ['basic', 'medium', 'deep'];
  const all = KEYS.every((k) => (courses[k] || []).length && courses[k].every((c) => done.has(k + ':' + c.id)));
  if (!all) return location.replace('simulation.html');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  $('title').textContent = major.name + ' at a glance';
  $('learned').textContent = sum.learned;
  KEYS.forEach((k) => (courses[k] || []).forEach((c) => {
    const li = el('li');
    li.append(el('b', '', k[0].toUpperCase() + k.slice(1) + ': '), document.createTextNode(c.title));
    $('tried').append(li);
  }));
  sum.ladder.forEach((r) => {
    const d = el('div', 'rung');
    d.append(el('b', '', r.stage), el('p', 'roles', r.roles), el('p', 'hint', r.note));
    $('ladder').append(d);
  });
  sum.industries.forEach((i) => $('industries').append(el('span', '', i)));
  $('outlook').textContent = sum.outlook;

  const { data: existing } = await db.from('final_feedback').select('sim_id').eq('sim_id', sim.id).maybeSingle();
  if (existing) { $('form').hidden = true; $('done').hidden = false; return; }

  /* ---------- Part B form ---------- */
  const form = $('form');
  const choiceSet = (name, legend, options) => {
    const fs = el('fieldset', 'status');
    fs.append(el('legend', '', legend));
    options.forEach((o) => {
      const l = el('label', 'opt');
      const r = document.createElement('input');
      r.type = 'radio'; r.name = name; r.value = o;
      l.append(r, el('span', '', o));
      fs.append(l);
    });
    return fs;
  };
  const area = (id, label) => {
    const l = el('label', 'field', label);
    const t = document.createElement('textarea');
    t.id = id; t.maxLength = 700;
    l.append(t);
    return l;
  };
  const pick = (n) => { const x = document.querySelector('input[name=' + n + ']:checked'); return x ? x.value : null; };
  const val = (id) => $(id).value.trim();

  form.append(
    choiceSet('f1', 'How do you feel after going through this whole simulation?', ['Excited', 'Positive', 'Mixed', 'Unsure', 'Not for me']),
    area('f1t', 'Tell us a bit more (optional)'),
    area('f2', 'Which part did you enjoy most, and why?'),
    area('f3', 'Which part bothered you or made you uncomfortable?'),
    choiceSet('f4', 'After seeing the career path, can you picture yourself in this major and career?', ['Yes, clearly', 'Maybe', 'Not really', 'No']),
    area('f4t', 'Why? (optional)'),
    area('f5', 'Anything else you want to say? (optional)')
  );
  const save = el('button', 'btn', 'Save my feedback');
  save.type = 'button';
  form.append(save);

  save.onclick = async () => {
    if (!pick('f1')) return say('Tell us how you feel overall.', 'err');
    if (val('f2').length < 3) return say('Tell us which part you enjoyed most.', 'err');
    if (val('f3').length < 2) return say('Tell us which part bothered you. If nothing did, write “nothing”.', 'err');
    if (!pick('f4')) return say('Tell us whether you can picture yourself in this career.', 'err');
    save.disabled = true;
    say('Saving...');
    const answers = {
      overall_feeling: pick('f1'), overall_note: val('f1t'),
      enjoyed_most: val('f2'), bothered_most: val('f3'),
      can_picture_career: pick('f4'), career_note: val('f4t'), other: val('f5')
    };
    const { error } = await db.from('final_feedback').upsert({ sim_id: sim.id, answers }, { onConflict: 'sim_id' });
    if (error) { save.disabled = false; return say('Could not save. ' + friendly(error), 'err'); }
    await db.from('simulations').update({ step: 'report' }).eq('id', sim.id);
    say('');
    form.hidden = true;
    $('done').hidden = false;
    window.scrollTo(0, document.body.scrollHeight);
  };
})();