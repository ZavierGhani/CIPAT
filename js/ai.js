// Calls our own backend (functions/api/ai.js). Throws when AI is unavailable,
// so every caller can switch to its built-in fallback.
// The backend only exists on the deployed site, so AI is skipped on localhost.
async function askAI(task, payload) {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local || (window.CIPAT && window.CIPAT.AI_ENABLED === false)) throw new Error('AI is off');
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, payload })
  });
  if (!res.ok) throw new Error('AI unavailable');
  const data = await res.json();
  if (data.fallback) throw new Error('AI quota reached');
  return data.result;
}