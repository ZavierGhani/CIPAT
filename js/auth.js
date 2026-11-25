async function getSession() { const { data } = await db.auth.getSession(); return data.session; }
async function signUp(email, password, name, status) {
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { name, status } } });
  return { error, session: data && data.session };
}
async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  return { error, session: data && data.session };
}
async function signOut() { await db.auth.signOut(); location.href = '../index.html'; }
async function getProfile() {
  const s = await getSession(); if (!s) return null;
  const { data } = await db.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
  return data;
}
async function requireSession() { const s = await getSession(); if (!s) location.replace('signup.html'); return s; }
function friendly(err) {
  const m = (err.message || '').toLowerCase();
  if (m.includes('already registered')) return 'This email already has an account. Use Log in instead.';
  if (m.includes('invalid login')) return 'Email or password is incorrect. Check both and try again.';
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('failed to fetch')) return 'Cannot reach the server. Check your internet connection.';
  return err.message || 'Something went wrong. Try again.';
}