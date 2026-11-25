(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;

  const q = new URLSearchParams(location.search);
  const level = q.get('level'), courseId = q.get('course');
  const { data: sim } = await db.from('simulations').select('*')
    .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!sim || sim.decision !== 'continue') return location.replace('simulation.html');

  const courses = await (await fetch('../data/courses-' + sim.major_id + '.json')).json();
  const { data: rows } = await db.from('course_feedback').select('level,course_id').eq('sim_id', sim.id);
  const done = new Set((rows || []).map((r) => r.level + ':' + r.course_id));
  const levelDone = (k) => (courses[k] || []).every((c) => done.has(k + ':' + c.id));
  const open = level === 'basic' || (level === 'medium' && levelDone('basic')) || (level === 'deep' && levelDone('basic') && levelDone('medium'));
  const course = (courses[level] || []).find((c) => c.id === courseId);
  if (!course || !open) return location.replace('simulation.html');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const button = (label, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), label); b.type = 'button'; b.onclick = fn; return b; };
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
  const pick = (n) => { const x = document.querySelector('input[name=' + n + ']:checked'); return x ? x.value : null; };
  const setStep = (n) => {
    document.querySelectorAll('.steps li').forEach((li, i) => li.classList.toggle('on', i === n - 1));
    say('');
    window.scrollTo(0, 0);
  };

  $('crumb').textContent = level.toUpperCase() + ' LEVEL';
  $('title').textContent = course.title;
  const body = $('body');

  function lesson() {
    setStep(1);
    body.replaceChildren(el('p', 'lede', course.overview), el('h2', '', course.lesson.title));
    course.lesson.paragraphs.forEach((p) => body.append(el('p', 'para', p)));
    const rw = el('div', 'fact');
    rw.append(el('b', '', 'In real life: '), document.createTextNode(course.realWorld));
    body.append(rw, button('Try the task', '', task));
  }

  function task() {
    setStep(2);
    const t = course.task;
    body.replaceChildren(el('h2', '', 'Your task'), el('p', 'para', t.prompt),
      el('p', 'hint', 'Not graded. There is no wrong answer, and your answer is not saved.'));
    let hasAnswer;
    if (t.kind === 'choice') {
      body.append(choiceSet('t', 'Choose one', t.options));
      hasAnswer = () => !!pick('t');
    } else {
      const l = el('label', 'field', 'Your answer');
      const ta = document.createElement('textarea');
      ta.maxLength = 800;
      l.append(ta);
      body.append(l);
      hasAnswer = () => ta.value.trim().length > 2;
    }
    const row = el('div', 'row2');
    row.append(
      button('Skip task', 'alt', feedback),
      button('Submit', '', () => {
        if (!hasAnswer()) return say('Add an answer first, or skip the task.', 'err');
        say('');
        row.remove();
        body.append(el('div', 'fact', t.note), button('Continue to feedback', '', feedback));
      })
    );
    body.append(row);
  }

  function feedback() {
    setStep(3);
    let stars = 0;
    body.replaceChildren(el('h2', '', 'How did it feel?'), el('p', 'hint', 'This is the most important part. Your feelings, not your answers, shape your report.'));
    body.append(el('p', 'ask', 'How much did you enjoy this class?'));
    const st = el('div');
    st.id = 'stars';
    const btns = [];
    for (let i = 1; i <= 5; i++) {
      const b = el('button', '', '★');
      b.type = 'button';
      b.setAttribute('aria-label', i + (i === 1 ? ' star' : ' stars'));
      b.onclick = () => { stars = i; btns.forEach((x, j) => x.classList.toggle('on', j < i)); };
      btns.push(b);
      st.append(b);
    }
    body.append(st);

    const l = el('label', 'field', 'What did you enjoy, or not enjoy, about the lesson?');
    const ta = document.createElement('textarea');
    ta.maxLength = 600;
    l.append(ta);
    body.append(l,
      choiceSet('q2', 'How did the task feel?', ['Fun', 'Okay', 'Stressful', 'Boring']),
      choiceSet('q3', 'Does this kind of task suit you?', ['Yes', 'Maybe', 'Not really']),
      choiceSet('q4', 'After this class, you feel...', ['More interested', 'About the same', 'More doubtful']));

    const save = button('Save and go back to levels', '', async () => {
      const enjoyed = ta.value.trim();
      if (!stars) return say('Tap a star to rate this class.', 'err');
      if (enjoyed.length < 3) return say('Tell us a little about what you enjoyed or did not enjoy.', 'err');
      if (!pick('q2') || !pick('q3') || !pick('q4')) return say('Answer all the questions.', 'err');
      save.disabled = true;
      say('Saving...');
      const { error } = await db.from('course_feedback').upsert({
        sim_id: sim.id, level, course_id: course.id, stars,
        answers: { enjoyed, task_feel: pick('q2'), suits_me: pick('q3'), after_feeling: pick('q4') }
      }, { onConflict: 'sim_id,level,course_id' });
      save.disabled = false;
      if (error) return say('Could not save. ' + friendly(error), 'err');
      location.href = 'simulation.html';
    });
    body.append(save);
  }

  lesson();
})();