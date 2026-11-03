// GET /api/check?url=example.com — is it down? One real request from the server, timed. Public hosts only.
const dns = require('node:dns').promises;
const net = require('node:net');
function priv(ip) {
  if (net.isIPv6(ip)) { const s = ip.toLowerCase(); return s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80') || s.startsWith('::ffff:127.') || s === '::'; }
  const p = ip.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
}
module.exports = async (req, res) => {
  const send = (code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(o)); };
  let raw = String((req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url') || '').trim();
  if (!raw) return send(400, { error: 'give a url' });
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u; try { u = new URL(raw); } catch (_) { return send(400, { error: 'that is not a url' }); }
  if (!/^https?:$/.test(u.protocol) || (u.port && !['80', '443'].includes(u.port)) || u.username || u.password) return send(400, { error: 'only public http(s) sites on standard ports' });
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return send(400, { error: 'only public sites' });
  try {
    const ips = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (!ips.length || ips.some(a => priv(a.address))) return send(400, { error: 'only public sites' });
  } catch (_) { return send(200, { url: u.href, host, up: false, status: null, ms: null, reason: 'the name does not resolve (DNS)' }); }
  const t0 = Date.now(); const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 7000);
  try {
    const r = await fetch(u.href, { method: 'GET', redirect: 'manual', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; wr1d-check/1.0)', accept: 'text/html,*/*' } });
    const ms = Date.now() - t0; try { r.body && r.body.cancel(); } catch (_) { }
    const up = r.status < 500;
    send(200, { url: u.href, host, up, status: r.status, ms, reason: up ? (r.status >= 300 && r.status < 400 ? 'answers with a redirect' : r.status >= 400 ? 'answers, with an error page' : 'answers normally') : 'the server answers with an error' });
  } catch (e) {
    send(200, { url: u.href, host, up: false, status: null, ms: Date.now() - t0, reason: e.name === 'AbortError' ? 'no answer within 7 seconds' : 'the connection failed' });
  } finally { clearTimeout(to); }
};
