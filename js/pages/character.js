(function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  let choice = null;

  // Choosing a character needs no database, so it works right away.
  document.querySelectorAll('.pick').forEach((b) => {
    b.addEventListener('click', () => {
      choice = b.dataset.c;
      document.querySelectorAll('.pick').forEach((x) => {
        const on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on);
      });
      $('go').disabled = false;
const nm = choice === 'boy' ? 'Cipi' : 'Cita';
      $('go').textContent = 'Choose ' + nm;
      say('You picked ' + nm + '. Tap the button below to confirm.', 'ok');    });
  });

  $('go').addEventListener('click', async () => {
    try {
      if (typeof db === 'undefined' || !db) return say('Supabase is not connected. Check js/config.js and your internet connection.', 'err');
      const session = await getSession();
      if (!session) return location.replace('signup.html');
      $('go').disabled = true;
      say('Saving...');
      // Upsert creates the profile row if it is missing, and updates it if it exists.
      const meta = session.user.user_metadata || {};
      const { data, error } = await db.from('profiles')
        .upsert({ id: session.user.id, name: meta.name || 'Player', status: meta.status || null, character: choice })
        .select().single();
      $('go').disabled = false;
      if (error) return say('Could not save your character. ' + friendly(error), 'err');
      if (!data || data.character !== choice) return say('Your character did not save. Try once more.', 'err');
      location.href = 'validate.html';
    } catch (e) {
      $('go').disabled = false;
      say('Something went wrong: ' + e.message, 'err');
    }
  });
})();