// POST /api/send {tx} — relays a launch the user's wallet already signed. GET /api/send?sig= — its status.
// WR1D never signs anything and never holds a key: it only checks the bytes are a pump.fun transaction and forwards them.
const RPCS = [process.env.WR1D_RPC, 'https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'].filter(Boolean);
const PUMP = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
async function rpc(method, params) {
  let last;
  for (const u of RPCS) {
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const j = await r.json(); if (j.error) { last = new Error(j.error.message || JSON.stringify(j.error)); if (/blockhash|signature|insufficient|simulation/i.test(last.message)) throw last; continue; }
      return j.result;
    } catch (e) { last = e; if (/blockhash|signature|insufficient|simulation/i.test(String(e.message))) throw e; }
  }
  throw last || new Error('no rpc answered');
}
const body = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > 4e5) no(new Error('too big')); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { no(e); } }); });
module.exports = async (req, res) => {
  const send = (c, o) => { res.statusCode = c; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(o)); };
  try {
    if (req.method === 'GET') {
      const sig = String(new URL(req.url, 'http://x').searchParams.get('sig') || '');
      if (!/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(sig)) return send(400, { error: 'bad signature' });
      const r = await rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: true }]);
      const v = r && r.value && r.value[0];
      return send(200, { sig, status: v ? (v.err ? 'failed' : (v.confirmationStatus || 'processed')) : 'pending', err: v && v.err ? JSON.stringify(v.err) : null });
    }
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    const b = req.body && typeof req.body === 'object' ? req.body : await body(req);
    const raw = Buffer.from(String(b.tx || ''), 'base64');
    if (raw.length < 100 || raw.length > 1232) return send(400, { error: 'that is not a transaction' });
    // the pump.fun program must be in the account keys (base58 of 32 bytes appears in the message)
    const bs58 = s => { const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; let n = 0n; for (const c of s) n = n * 58n + BigInt(A.indexOf(c)); const out = []; while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; } return Buffer.from(out); };
    if (raw.indexOf(bs58(PUMP)) < 0) return send(400, { error: 'that is not a pump.fun launch' });
    const sig = await rpc('sendTransaction', [raw.toString('base64'), { encoding: 'base64', skipPreflight: false, preflightCommitment: 'processed', maxRetries: 3 }]);
    send(200, { sig });
  } catch (e) { send(400, { error: String(e.message || e).slice(0, 400) }); }
};
