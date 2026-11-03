// GET /api/status — the world's public status pages, read live and normalised.
// Every entry comes from that company's own Statuspage JSON. Nothing is invented: a page that does not answer is marked "unreachable".
const SERVICES = [
  ['github', 'GitHub', 'https://www.githubstatus.com', 'dev'],
  ['cloudflare', 'Cloudflare', 'https://www.cloudflarestatus.com', 'infra'],
  ['discord', 'Discord', 'https://discordstatus.com', 'social'],
  ['openai', 'OpenAI', 'https://status.openai.com', 'ai'],
  ['anthropic', 'Anthropic', 'https://status.anthropic.com', 'ai'],
  ['reddit', 'Reddit', 'https://www.redditstatus.com', 'social'],
  ['dropbox', 'Dropbox', 'https://status.dropbox.com', 'cloud'],
  ['zoom', 'Zoom', 'https://status.zoom.us', 'social'],
  ['twilio', 'Twilio', 'https://status.twilio.com', 'infra'],
  ['vercel', 'Vercel', 'https://www.vercel-status.com', 'infra'],
  ['digitalocean', 'DigitalOcean', 'https://status.digitalocean.com', 'infra'],
  ['netlify', 'Netlify', 'https://www.netlifystatus.com', 'infra'],
  ['npm', 'npm', 'https://status.npmjs.org', 'dev'],
  ['figma', 'Figma', 'https://status.figma.com', 'dev'],
  ['coinbase', 'Coinbase', 'https://status.coinbase.com', 'crypto'],
  ['kraken', 'Kraken', 'https://status.kraken.com', 'crypto'],
  ['solana', 'Solana', 'https://status.solana.com', 'crypto'],
  ['epic', 'Epic Games', 'https://status.epicgames.com', 'games'],
  ['akamai', 'Akamai', 'https://www.akamaistatus.com', 'infra'],
  ['supabase', 'Supabase', 'https://status.supabase.com', 'dev'],
  ['linear', 'Linear', 'https://linearstatus.com', 'dev'],
  ['shopify', 'Shopify', 'https://www.shopifystatus.com', 'cloud'],
  ['twitch', 'Twitch', 'https://status.twitch.com', 'social'],
  ['bitbucket', 'Bitbucket', 'https://bitbucket.status.atlassian.com', 'dev'],
  ['sendgrid', 'SendGrid', 'https://status.sendgrid.com', 'infra'],
];
const BASE = process.env.WR1D_STATUS_BASE || ''; // dev only: point at local fixtures

async function get(url, ms) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json', 'user-agent': 'wr1d-status/1.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function norm([id, name, url, cat], j) {
  const comps = (j.components || []).filter(c => !c.group && c.status && c.status !== 'operational')
    .map(c => ({ name: c.name, status: c.status }));
  const inc = (j.incidents || []).map(i => ({
    id: i.id, name: i.name, status: i.status, impact: i.impact || 'none',
    created_at: i.created_at, updated_at: i.updated_at, link: i.shortlink || (url + '/incidents/' + i.id),
    update: ((i.incident_updates || [])[0] || {}).body || '',
  }));
  const maint = (j.scheduled_maintenances || []).filter(m => m.status === 'in_progress').length;
  return {
    id, name, url, cat, ok: true,
    indicator: (j.status && j.status.indicator) || 'none',
    description: (j.status && j.status.description) || '',
    updated_at: (j.page && j.page.updated_at) || null,
    components: comps, incidents: inc, maintenance: maint,
  };
}

module.exports = async (req, res) => {
  const t0 = Date.now();
  const out = await Promise.all(SERVICES.map(async s => {
    const src = BASE ? `${BASE}/${s[0]}.json` : `${s[2]}/api/v2/summary.json`;
    const t = Date.now();
    try { const r = norm(s, await get(src, 5500)); r.ms = Date.now() - t; r.host = new URL(s[2]).host; return r; }
    catch (e) { return { id: s[0], name: s[1], url: s[2], cat: s[3], host: new URL(s[2]).host, ms: Date.now() - t, ok: false, error: String(e.name === 'AbortError' ? 'timeout' : e.message || e) }; }
  }));
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=20, s-maxage=60, stale-while-revalidate=120');
  res.end(JSON.stringify({ at: new Date().toISOString(), ms: Date.now() - t0, services: out }));
};
module.exports.SERVICES = SERVICES;
