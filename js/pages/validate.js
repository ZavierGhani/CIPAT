(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  const cmsg = (t) => { $('c-msg').textContent = t; $('c-msg').className = 'msg err'; };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  const session = await requireSession();
  if (!session) return;
  const profile = await getProfile();
  if (!profile || !profile.character) return location.replace('character.html');

  const { data: sim } = await db.from('simulations').select('*')
    .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!sim) return location.replace('majors.html');

  const major = await (await fetch('../data/' + sim.major_id + '.json')).json();
  const spots = major.hotspots, ratings = {};
  window.V = { session, profile, sim, major, spots, ratings };
  const { data: rows } = await db.from('hotspot_ratings').select('*').eq('sim_id', sim.id);
  (rows || []).forEach((r) => { ratings[r.hotspot] = { stars: r.stars, why: r.why || '' }; });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const player = $('player');
  let busy = false, at = 8, cur = null, stars = 0;

  $('major-name').textContent = major.name;
  $('intro-title').textContent = 'A day as a ' + major.name + ' student';
  $('intro-name').textContent = profile.name;
  player.classList.add(profile.character);
  player.querySelector('.pp').classList.add(profile.character);
  if (Object.keys(ratings).length) $('intro').hidden = true;
  $('start').onclick = () => { $('intro').hidden = true; };

  function renderSpots() {
    const box = $('spots');
    box.replaceChildren();
    spots.forEach((s) => {
      const r = ratings[s.id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spot' + (r ? ' done' : '');
      b.style.left = s.x + '%';
      const name = document.createElement('span');
      name.textContent = s.title;
      const tag = document.createElement('small');
      tag.textContent = r ? '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars) : 'Tap to visit';
      b.append(name, tag);
      b.onclick = () => visit(s);
      box.append(b);
    });
    const n = Object.keys(ratings).length;
    $('prog-text').textContent = n + '/' + spots.length + ' explored';
    $('prog-fill').style.width = (n / spots.length * 100) + '%';
    $('next').hidden = n < 3;
  }

  function visit(s) {
    if (busy) return;
    busy = true;
    const ms = reduce ? 0 : 250 + Math.abs(s.x - at) * 18;
    player.classList.toggle('left', s.x < at);
    player.style.transitionDuration = ms + 'ms';
    player.style.left = s.x + '%';
    player.classList.add('walking');
    at = s.x;
    setTimeout(() => { player.classList.remove('walking'); openCard(s); }, ms + 60);
  }

  function setVideo(id) {
    const box = $('c-video');
    box.replaceChildren();
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.src = '../assets/video/' + sim.major_id + '/' + id + '.mp4';
    v.onerror = () => {
      const p = document.createElement('p');
      p.textContent = 'Video ' + id + ' goes here (assets/video/' + sim.major_id + '/' + id + '.mp4)';
      box.replaceChildren(p);
    };
    box.append(v);
  }

  function paintStars() {
    document.querySelectorAll('#stars button').forEach((b, i) => b.classList.toggle('on', i < stars));
    $('why-wrap').hidden = stars === 0;
  }
  document.querySelectorAll('#stars button').forEach((b, i) => { b.onclick = () => { stars = i + 1; paintStars(); }; });

  function openCard(s) {
    cur = s;
    const r = ratings[s.id];
    stars = r ? r.stars : 0;
    $('c-title').textContent = s.title;
    $('c-text').textContent = s.text;
    $('c-fact').textContent = s.fact;
    $('why').value = r ? r.why : '';
    $('c-msg').textContent = '';
    paintStars();
    setVideo(s.id);
    $('card').hidden = false;
    $('c-title').focus();
  }

  function closeCard() {
    $('card').hidden = true;
    $('c-video').replaceChildren();
    busy = false;
  }
  $('c-close').onclick = closeCard;

  $('c-save').onclick = async () => {
    if (!stars) return cmsg('Tap a star to say how this moment feels.');
    $('c-save').disabled = true;
    const why = $('why').value.trim();
    const { error } = await db.from('hotspot_ratings')
      .upsert({ sim_id: sim.id, hotspot: cur.id, stars, why }, { onConflict: 'sim_id,hotspot' });
    $('c-save').disabled = false;
    if (error) return cmsg(friendly(error));
    ratings[cur.id] = { stars, why };
    closeCard();
    renderSpots();
  };

  renderSpots();
  window.V.ready = true;
  document.dispatchEvent(new Event('cipat:ready'));
})();