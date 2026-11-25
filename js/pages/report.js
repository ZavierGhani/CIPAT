(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;

  const want = new URLSearchParams(location.search).get('sim');
  let sq = db.from('simulations').select('*').eq('user_id', session.user.id);
  sq = want ? sq.eq('id', want) : sq.order('created_at', { ascending: false }).limit(1);
  const { data: simRows } = await sq;
  const sim = simRows && simRows[0];
  if (!sim) return location.replace('dashboard.html');

  const get = async (p) => (await fetch(p)).json();
  const [catalog, major, courses, sum] = await Promise.all([
    get('../data/majors.json'), get('../data/' + sim.major_id + '.json'),
    get('../data/courses-' + sim.major_id + '.json'), get('../data/summary-' + sim.major_id + '.json')
  ]);

  const KEYS = ['basic', 'medium', 'deep'];
  const OVERALL = { 'Excited': 5, 'Positive': 4, 'Mixed': 3, 'Unsure': 2, 'Not for me': 1 };
  const PICTURE = { 'Yes, clearly': 5, 'Maybe': 3, 'Not really': 2, 'No': 1 };
  const PICTURE_TXT = {
    'Yes, clearly': 'can clearly picture yourself in this career',
    'Maybe': 'are open to picturing yourself in this career',
    'Not really': 'have trouble picturing yourself in this career',
    'No': 'cannot picture yourself in this career'
  };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const r1 = (n) => Math.round(n * 10) / 10;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  /* ---------- build the report (template, no AI) ---------- */
  function build(hr, cf, ff) {
    const ratings = {}, fb = {};
    hr.forEach((r) => { ratings[r.hotspot] = r; });
    cf.forEach((r) => { fb[r.level + ':' + r.course_id] = r; });
    const A = ff.answers || {};

    const places = major.hotspots.filter((s) => ratings[s.id]).map((s) => ({
      kind: 'place', label: s.title, stars: ratings[s.id].stars, quote: ratings[s.id].why || ''
    }));
    const classes = [];
    KEYS.forEach((k) => (courses[k] || []).forEach((c) => {
      const f = fb[k + ':' + c.id];
      if (!f) return;
      const a = f.answers || {};
      classes.push({ kind: 'class', level: k, label: c.title, stars: f.stars, quote: a.enjoyed || '',
        feel: a.task_feel, suits: a.suits_me, after: a.after_feeling, taskKind: c.task.kind });
    }));
    const all = places.concat(classes);
    const avg = mean(all.map((x) => x.stars));
    const overall = OVERALL[A.overall_feeling] || 3, picture = PICTURE[A.can_picture_career] || 3;
    const score = r1(0.4 * avg + 0.35 * overall + 0.25 * picture);
    const label = score >= 4 ? 'Very good fit' : score >= 3 ? 'Good fit' : 'Not quite a fit';
    const byHigh = all.slice().sort((a, b) => b.stars - a.stars);
    const best = byHigh[0], worst = byHigh[byHigh.length - 1];

    /* fit summary */
    const lead = { 'Very good fit': 'This major looks like a strong match for how you feel.',
      'Good fit': 'This major looks like a good match, with a few open questions.',
      'Not quite a fit': 'This major does not look like a strong match for you right now.' }[label];
    const second = 'Across ' + all.length + ' moments you averaged ' + r1(avg) + ' out of 5, you felt "' +
      String(A.overall_feeling || '').toLowerCase() + '" about the whole experience, and you ' +
      (PICTURE_TXT[A.can_picture_career] || 'are unsure about picturing yourself in this career') + '.';
    const third = best && worst && best.label !== worst.label
      ? best.label + ' stood out most, while ' + worst.label + ' felt least like you.' : '';

    /* journey */
    const lv = KEYS.map((k) => {
      const xs = classes.filter((c) => c.level === k).map((c) => c.stars);
      return xs.length ? { k, avg: r1(mean(xs)) } : null;
    }).filter(Boolean);
    let trend = '';
    if (lv.length >= 2) {
      const f = lv[0].avg, l = lv[lv.length - 1].avg;
      trend = l - f >= 0.5 ? 'Your enjoyment grew as you went deeper into the major.'
        : f - l >= 0.5 ? 'Your enjoyment dropped as the classes became more technical and practical.'
        : 'Your enjoyment stayed steady from the first level to the last.';
    }
    let up = null, down = null;
    for (let i = 1; i < all.length; i++) {
      const d = all[i].stars - all[i - 1].stars;
      if (d >= 2 && (!up || d > up.d)) up = { d, at: all[i], from: all[i - 1] };
      if (d <= -2 && (!down || d < down.d)) down = { d, at: all[i], from: all[i - 1] };
    }
    const jParts = [trend];
    if (lv.length) jParts.push('Level averages: ' + lv.map((x) => cap(x.k) + ' ' + x.avg).join(', ') + '.');
    if (up) jParts.push('The biggest lift came at ' + up.at.label + ' (from ' + up.from.stars + ' to ' + up.at.stars + ' stars).');
    if (down) jParts.push('The biggest dip came at ' + down.at.label + ' (from ' + down.from.stars + ' to ' + down.at.stars + ' stars).');

    /* enjoyed */
    const strong = byHigh.filter((x) => x.stars >= 4).slice(0, 3);
    const enjoyedItems = (strong.length ? strong : byHigh.slice(0, 2)).map((x) => ({ label: x.label, stars: x.stars, quote: x.quote }));
    const funKinds = new Set(classes.filter((c) => c.feel === 'Fun' && c.suits === 'Yes').map((c) => c.taskKind));
    const kindText = funKinds.size === 1 ? 'The tasks you enjoyed were mostly ' + (funKinds.has('text') ? 'open, written ones.' : 'multiple-choice ones.') : '';
    const enjoyedText = (strong.length ? 'These moments gave you the most energy.' : 'Nothing stood out strongly, but these were your highest-rated moments.') +
      (kindText ? ' ' + kindText : '');

    /* bothered */
    const troubled = all.filter((x) => x.stars <= 2 || x.after === 'More doubtful' || x.feel === 'Stressful' || x.feel === 'Boring' || x.suits === 'Not really')
      .sort((a, b) => a.stars - b.stars).slice(0, 3);
    const signals = classes.filter((c) => c.suits === 'Not really').length + classes.filter((c) => c.after === 'More doubtful').length +
      (['Not for me', 'Unsure'].includes(A.overall_feeling) ? 1 : 0) + (['Not really', 'No'].includes(A.can_picture_career) ? 1 : 0);
    const verdict = !troubled.length && signals === 0 ? 'none' : signals >= 3 ? 'signal' : 'normal';
    const botherText = {
      none: 'Nothing seriously bothered you. That is a good sign.',
      normal: 'Most of this looks like a normal challenge. Many students feel unsure when something is new, and it often eases with practice. Still, notice whether it keeps bothering you.',
      signal: 'Several of your answers point the same way, so this looks more like a possible mismatch than a passing challenge. It is worth taking seriously.'
    }[verdict];

    /* career */
    const L = sum.ladder || [];
    const careerText = (best ? 'You enjoyed ' + best.label + ' the most. ' : '') +
      (L.length >= 3 ? 'Careers on this path include ' + L[0].roles + ' at the start, ' + L[1].roles + ' later, and ' + L[2].roles + ' at senior level. ' : '') +
      'Ask yourself whether the kind of work you enjoyed fits these roles' + (worst && worst.stars <= 3 ? ', and whether what felt hardest (' + worst.label + ') would be a big part of the day.' : '.') +
      ' Day-to-day work varies by role and employer.';

    /* recommendation */
    let rec;
    if (label === 'Not quite a fit') {
      const words = new Set(([A.enjoyed_most, A.overall_note].concat(all.map((x) => x.quote)).join(' ')).toLowerCase().split(/[^a-z0-9]+/));
      const alts = catalog.playable.filter((m) => m.id !== sim.major_id).map((m) => {
        const hit = m.keywords.filter((k) => words.has(k));
        return { id: m.id, name: m.name, blurb: m.blurb, n: hit.length,
          reason: hit.length ? 'You mentioned ' + hit.slice(0, 3).join(', ') + ' when describing what you enjoyed.' : 'A different direction worth a short try.' };
      }).sort((a, b) => b.n - a.n).slice(0, 3);
      rec = { kind: 'alternatives', text: 'Since this major did not click, try one that fits what you actually enjoyed.', alternatives: alts };
    } else {
      rec = { kind: 'continue',
        text: label === 'Very good fit' ? 'This is a promising direction. Here is how to take the next step.' : 'This could work for you. Here is how to test it further.',
        steps: ['Talk with someone who studies or works in this field and ask what a normal week looks like.',
          'Check the entry requirements for programs in the place where you plan to study.',
          'Try a small project or read about one topic you enjoyed in this simulation.',
          label === 'Good fit' ? 'Run another simulation for a different major and compare both reports on your dashboard.' : 'Keep one backup major in mind, and compare it later on your dashboard.'] };
    }

    return {
      major_id: sim.major_id, major_name: major.name, generated_by: 'template',
      stats: { avg: r1(avg), score, overall: A.overall_feeling, picture: A.can_picture_career },
      fit: { label, text: [lead, second, third].filter(Boolean).join(' ') },
      journey: { points: all.map((x) => ({ kind: x.kind, level: x.level, label: x.label, stars: x.stars })), text: jParts.filter(Boolean).join(' ') },
      enjoyed: { items: enjoyedItems, text: enjoyedText, own: A.enjoyed_most || '' },
      bothered: { items: troubled.map((x) => ({ label: x.label, stars: x.stars, quote: x.quote })), verdict, text: botherText, own: A.bothered_most || '' },
      career: { text: careerText },
      rec
    };
  }

  /* ---------- load or create ---------- */
  const { data: saved } = await db.from('reports').select('content').eq('sim_id', sim.id).maybeSingle();
  let report = saved && saved.content;
  if (!report) {
    say('Building your report...');
    const [h, c, f] = await Promise.all([
      db.from('hotspot_ratings').select('*').eq('sim_id', sim.id),
      db.from('course_feedback').select('*').eq('sim_id', sim.id),
      db.from('final_feedback').select('*').eq('sim_id', sim.id).maybeSingle()
    ]);
    if (!f.data) return location.replace('summary.html');
    report = build(h.data || [], c.data || [], f.data);
    const { error } = await db.from('reports').upsert({ sim_id: sim.id, fit: report.fit.label, content: report }, { onConflict: 'sim_id' });
    say(error ? 'Your report is shown below but could not be saved. ' + friendly(error) : '', error ? 'err' : '');
  }

  /* ---------- render ---------- */
  const root = $('report');
  const box = (title) => { const s = el('section', 'sumbox'); s.append(el('h2', '', title)); root.append(s); return s; };
  const quotes = (items) => {
    const wrap = el('div');
    items.forEach((i) => {
      const q = el('div', 'quote2');
      q.append(el('b', '', i.label + ' · ' + i.stars + '/5'));
      if (i.quote) q.append(el('small', '', 'You said: ' + i.quote));
      wrap.append(q);
    });
    return wrap;
  };
  $('title').textContent = report.major_name;

  const fit = box('Fit summary');
  const cls = { 'Very good fit': 'vg', 'Good fit': 'g', 'Not quite a fit': 'n' }[report.fit.label];
  fit.append(el('p', 'pill ' + cls, report.fit.label), el('p', 'para', report.fit.text));

  const jr = box('Journey pattern');
  const chart = el('div', 'chart');
  let last = null;
  report.journey.points.forEach((p) => {
    const g = p.kind === 'place' ? 'Exploring the world' : cap(p.level) + ' level';
    if (g !== last) { chart.append(el('p', 'grp', g)); last = g; }
    const row = el('div', 'rrow');
    row.setAttribute('aria-label', p.label + ': ' + p.stars + ' out of 5');
    const bar = el('span', 'rbar'), fill = el('i', p.stars >= 4 ? 'hi' : p.stars >= 3 ? 'mid' : 'lo');
    fill.style.width = p.stars * 20 + '%';
    bar.append(fill);
    row.append(el('span', '', p.label), bar, el('span', 'rn', p.stars + '/5'));
    chart.append(row);
  });
  jr.append(chart, el('p', 'para', report.journey.text));

  const en = box('What you enjoyed');
  en.append(el('p', 'para', report.enjoyed.text), quotes(report.enjoyed.items));
  if (report.enjoyed.own) en.append(el('div', 'fact', 'In your final feedback: ' + report.enjoyed.own));

  const bo = box('What bothered you');
  bo.append(el('p', 'para', report.bothered.text));
  if (report.bothered.items.length) bo.append(quotes(report.bothered.items));
  if (report.bothered.own) bo.append(el('div', 'fact', 'In your final feedback: ' + report.bothered.own));

  box('Link to career prospects').append(el('p', 'para', report.career.text));

  const rc = box('Recommendation');
  rc.append(el('p', 'para', report.rec.text));
  if (report.rec.kind === 'continue') {
    const ul = el('ul', 'learned-list');
    report.rec.steps.forEach((s) => ul.append(el('li', '', s)));
    rc.append(ul);
  } else {
    const st = el('div', 'stack');
    report.rec.alternatives.forEach((m) => {
      const c = el('article', 'major');
      c.append(el('span', 'gem g-' + m.id), el('h3', '', m.name), el('p', '', m.blurb), el('p', 'why', m.reason));
      const b = el('button', 'btn', 'Try this major');
      b.type = 'button';
      b.onclick = async () => {
        const { error } = await db.from('simulations').insert({ user_id: session.user.id, major_id: m.id });
        if (error) return say(friendly(error), 'err');
        location.href = 'validate.html';
      };
      c.append(b);
      st.append(c);
    });
    rc.append(st);
  }

  const end = el('div', 'row2');
  const a1 = el('a', 'btn alt', 'Try another major'); a1.href = 'majors.html';
  const a2 = el('a', 'btn', 'Save this report and finish'); a2.href = 'dashboard.html';
  end.append(a1, a2);
  root.append(el('p', 'hint', 'Your report is saved automatically in your account.'), end);
})();