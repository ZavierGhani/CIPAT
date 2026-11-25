// Creates the database client. Needs config.js and the Supabase library loaded first.
// The URL is cleaned so a trailing slash or extra path cannot break requests.
function cleanUrl(u) {
  u = (u || '').trim();
  if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  try { return new URL(u).origin; } catch (e) { return null; }
}
const _url = cleanUrl(CIPAT.SUPABASE_URL);
const db = CIPAT.SUPABASE_URL.startsWith('PASTE') || !_url
  ? null
  : window.supabase.createClient(_url, CIPAT.SUPABASE_ANON_KEY.trim());