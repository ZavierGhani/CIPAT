(async function () {
  const $ = (id) => document.getElementById(id);
  const say = (t, k) => { $('msg').textContent = t; $('msg').className = 'msg ' + (k || ''); };
  if (!db) return say('Supabase is not connected yet. Open js/config.js and paste your project URL and public key.', 'err');
  if (await getSession()) return location.replace('majors.html');

  const tab = (up) => {
    $('tab-up').classList.toggle('on', up); $('tab-in').classList.toggle('on', !up);
    $('f-up').hidden = !up; $('f-in').hidden = up; say('');
  };
  $('tab-up').onclick = () => tab(true);
  $('tab-in').onclick = () => tab(false);
  const step = (n) => { $('s1').hidden = n !== 1; $('s2').hidden = n !== 2; say(''); };

  $('next').onclick = () => {
    if (!/^\S+@\S+\.\S+$/.test($('email').value.trim())) return say('Enter a valid email address, like name@example.com.', 'err');
    if ($('password').value.length < 8) return say('Use a password with at least 8 characters.', 'err');
    step(2);
  };
  $('back').onclick = () => step(1);

  $('f-up').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!$('s1').hidden) return $('next').click();
    const name = $('name').value.trim(), st = document.querySelector('input[name=status]:checked');
    if (!name) return say('Enter the name you want us to use.', 'err');
    if (!st) return say('Choose the option that fits you best.', 'err');
    say('Creating your account...');
    const { error, session } = await signUp($('email').value.trim(), $('password').value, name, st.value);
    if (error) return say(friendly(error), 'err');
    if (session) location.href = 'majors.html';
    else say('Almost there. Check your email to confirm your account, then log in.', 'ok');
  });

  $('f-in').addEventListener('submit', async (e) => {
    e.preventDefault();
    say('Logging in...');
    const { error } = await signIn($('li-email').value.trim(), $('li-password').value);
    if (error) return say(friendly(error), 'err');
    location.href = 'majors.html';
  });
})();