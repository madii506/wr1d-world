/* WR1D launch — pump.fun create from the user's own wallet. Image + metadata -> pump.fun IPFS, tx from PumpPortal's
   local API, wallet signs, the browser-made mint key signs, /api/send forwards the bytes. No keys ever leave this tab. */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const W3 = window.solanaWeb3;
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
  const log = (m, cls) => { const el = $('#lLog'); const line = (cls ? `<b>${m}</b>` : m); el.innerHTML = (el.dataset.started ? el.innerHTML.replace(/_$/, '') + '\n' : '') + line + '_'; el.dataset.started = 1; el.scrollTop = el.scrollHeight; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- preview (same ASCII renderer as the kit) ---------- */
  const kc = $('#lCanvas'), kx = kc.getContext('2d');
  const kitGlobe = document.createElement('canvas'); kitGlobe.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:420px'; document.body.appendChild(kitGlobe);
  const kg = window.WGlobe(kitGlobe, { font: 9, speed: 0, scale: .96, lat: 16 }); kg.rot = 10;
  let upImg = null, imMode = 'photo';
  function asciiWord(word, cols) {
    const c = document.createElement('canvas'), x = c.getContext('2d'); const cw = 6, chh = 11;
    c.width = cols * cw; c.height = 220; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    let fs = 200; x.font = `700 ${fs}px JB, monospace`; while (x.measureText(word).width > c.width * .94 && fs > 20) { fs -= 4; x.font = `700 ${fs}px JB, monospace`; }
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(word, c.width / 2, c.height / 2);
    const d = x.getImageData(0, 0, c.width, c.height).data, rows = Math.floor(c.height / chh), out = [], ramp = ' .:-=+*#%@';
    for (let r = 0; r < rows; r++) { let l = ''; for (let q = 0; q < cols; q++) { let s = 0, n = 0; for (let yy = r * chh; yy < (r + 1) * chh; yy += 2) for (let xx = q * cw; xx < (q + 1) * cw; xx += 2) { s += d[(yy * c.width + xx) * 4]; n++; } l += ramp[Math.min(9, Math.floor(s / n / 255 * 10))]; } out.push(l); }
    while (out.length && !out[0].trim()) out.shift(); while (out.length && !out[out.length - 1].trim()) out.pop(); return out;
  }
  function asciiImage(img, cols) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), rows = Math.round(cols * 6 / 11); c.width = cols; c.height = rows;
    const s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, cols, rows);
    const d = x.getImageData(0, 0, cols, rows).data, ramp = ' .:-=+*#%@', out = [];
    for (let r = 0; r < rows; r++) { let l = ''; for (let q = 0; q < cols; q++) { const k = (r * cols + q) * 4; l += ramp[Math.min(9, Math.floor((d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11) / 255 * 10))]; } out.push(l); }
    return out;
  }
  function draw() {
    const tick = $('#lTick').value.toUpperCase().replace(/[^A-Z0-9$]/g, '').slice(0, 10), name = $('#lName').value.trim();
    kx.fillStyle = '#000'; kx.fillRect(0, 0, 1000, 1000); kx.textBaseline = 'top'; kx.textAlign = 'left';
    if (upImg && imMode === 'photo') { const s = Math.min(upImg.width, upImg.height); kx.drawImage(upImg, (upImg.width - s) / 2, (upImg.height - s) / 2, s, s, 0, 0, 1000, 1000); return; }
    if (upImg) { const L = asciiImage(upImg, 166); kx.font = '500 10px JB, monospace'; kx.fillStyle = '#ecece6'; const lw = kx.measureText('0').width, lh = 1000 / L.length; L.forEach((l, i) => kx.fillText(l, (1000 - l.length * lw) / 2, i * lh)); return; }
    if (!tick && !name) {
      kx.globalAlpha = .22; kx.drawImage(kitGlobe, 290, 230, 420, 420); kx.globalAlpha = 1;
      kx.strokeStyle = '#2a2a28'; kx.setLineDash([6, 8]); kx.strokeRect(60, 60, 880, 880); kx.setLineDash([]);
      kx.font = '500 20px JB, monospace'; kx.fillStyle = '#6a6a66'; kx.textAlign = 'center'; kx.fillText('type a ticker, or drop an image', 500, 720); kx.textAlign = 'left'; return;
    }
    kx.globalAlpha = .28; kx.drawImage(kitGlobe, 290, 120, 420, 420); kx.globalAlpha = 1;
    const lines = asciiWord(tick || name.toUpperCase().slice(0, 10), 150); kx.font = '500 10px JB, monospace'; kx.fillStyle = '#ecece6';
    const lw = kx.measureText('0').width, y0 = 560 - lines.length * 6; lines.forEach((l, i) => kx.fillText(l, (1000 - l.length * lw) / 2, y0 + i * 12));
    if (name) { kx.font = '500 26px JB, monospace'; kx.fillStyle = '#cfcfc9'; kx.textAlign = 'center'; kx.fillText(name.toUpperCase(), 500, y0 + lines.length * 12 + 40); kx.textAlign = 'left'; }
  }
  ['lName', 'lTick'].forEach(id => $('#' + id).addEventListener('input', draw));
  const lFile = $('#lFile'), kup = lFile.parentElement;
  function useImg(src, label) { const im = new Image(); im.onload = () => { upImg = im; $('#lFileT').textContent = label; $('#lClear').hidden = false; draw(); }; im.src = src; }
  function useFile(f) { if (!f || !/^image\//.test(f.type)) return toast('that is not an image'); if (f.size > 4e6) return toast('keep it under 4 MB'); useImg(URL.createObjectURL(f), f.name); }
  lFile.addEventListener('change', () => useFile(lFile.files[0]));
  ['dragenter', 'dragover'].forEach(e => kup.addEventListener(e, ev => { ev.preventDefault(); kup.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(e => kup.addEventListener(e, () => kup.classList.remove('drag')));
  kup.addEventListener('drop', ev => { ev.preventDefault(); useFile(ev.dataTransfer.files[0]); });
  $$('.kopt [data-im]').forEach(b => b.addEventListener('click', () => { imMode = b.dataset.im; $$('.kopt [data-im]').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
  $('#lClear').addEventListener('click', () => { upImg = null; lFile.value = ''; $('#lFileT').textContent = 'drop an image here or click to pick one'; $('#lClear').hidden = true; draw(); });
  $$('[data-b]').forEach(b => b.addEventListener('click', () => { $('#lBuy').value = b.dataset.b; }));
  // hand-off from the kit on the main page
  try {
    const k = JSON.parse(sessionStorage.getItem('wr1d-kit') || 'null');
    if (k) { $('#lName').value = k.name || ''; $('#lTick').value = k.ticker || ''; $('#lDesc').value = k.post || ''; $('#lWeb').value = k.site || ''; if (k.img) useImg(k.img, 'image from your kit'); sessionStorage.removeItem('wr1d-kit'); }
  } catch (_) { }
  document.fonts.ready.then(() => setTimeout(draw, 250));

  /* ---------- wallet ---------- */
  const WALLETS = [
    ['Phantom', () => (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom && window.solana), 'https://phantom.app/'],
    ['Solflare', () => window.solflare && window.solflare.isSolflare && window.solflare, 'https://solflare.com/'],
    ['Backpack', () => window.backpack && (window.backpack.solana || window.backpack), 'https://backpack.app/'],
  ];
  let prov = null, pk = null;
  const short = s => s.slice(0, 4) + '…' + s.slice(-4);
  function paint() {
    $('#wBtn span').textContent = pk ? short(pk) : 'connect wallet'; $('#wBtn').classList.toggle('on', !!pk);
    $('#lGo').textContent = pk ? 'launch on pump.fun →' : 'connect a wallet to launch';
  }
  async function connect(name) {
    const w = WALLETS.find(x => x[0] === name); const p = w && w[1]();
    if (!p) { window.open(w[2], '_blank', 'noopener'); return; }
    try { const r = await p.connect(); prov = p; pk = ((r && r.publicKey) || p.publicKey).toString(); paint(); toast('connected ' + short(pk)); $('#wMenu').hidden = true; }
    catch (e) { toast('the wallet said no'); }
  }
  $('#wBtn').addEventListener('click', e => {
    e.stopPropagation();
    if (pk) { try { prov.disconnect && prov.disconnect(); } catch (_) { } prov = pk = null; paint(); toast('disconnected'); return; }
    const m = $('#wMenu'); m.innerHTML = WALLETS.map(w => `<button type="button" data-w="${w[0]}">${w[0]}<small>${w[1]() ? 'detected' : 'install'}</small></button>`).join('');
    const r = $('#wBtn').getBoundingClientRect(); m.style.top = (r.bottom + 8) + 'px'; m.style.right = (innerWidth - r.right) + 'px'; m.hidden = !m.hidden;
  });
  $('#wMenu').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) connect(b.dataset.w); });
  document.addEventListener('click', e => { if (!e.target.closest('#wMenu')) $('#wMenu').hidden = true; });
  paint();

  /* ---------- launch ---------- */
  const okUrl = (v, hosts) => { if (!v) return ''; try { const u = new URL(/^https?:\/\//.test(v) ? v : 'https://' + v); if (hosts && !hosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return null; return u.href; } catch (_) { return null; } };
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  let busy = false;
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return;
    if (!pk) { $('#wBtn').click(); return; }
    const name = $('#lName').value.trim(), symbol = $('#lTick').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!name || !symbol) return toast('a coin needs a name and a ticker');
    const web = okUrl($('#lWeb').value.trim()), x = okUrl($('#lX').value.trim(), ['x.com', 'twitter.com']), tg = okUrl($('#lTg').value.trim(), ['t.me', 'telegram.me']);
    if (web === null) return toast('the website link does not look right'); if (x === null) return toast('the x link should be an x.com link'); if (tg === null) return toast('the telegram link should be a t.me link');
    const buy = Math.max(0, Math.min(10, parseFloat($('#lBuy').value) || 0));
    busy = true; $('#lGo').disabled = true; $('#lDone').hidden = true; const el = $('#lLog'); el.dataset.started = ''; el.innerHTML = '';
    try {
      log('> drawing the image');
      draw(); const blob = await new Promise(r => kc.toBlob(r, 'image/png'));
      log('> uploading image + details to pump.fun ipfs');
      const fd = new FormData(); fd.append('file', blob, symbol.toLowerCase() + '.png'); fd.append('name', name); fd.append('symbol', symbol);
      fd.append('description', $('#lDesc').value.trim()); fd.append('twitter', x || ''); fd.append('telegram', tg || ''); fd.append('website', web || ''); fd.append('showName', 'true');
      const ir = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: fd }); if (!ir.ok) throw new Error('pump.fun ipfs answered ' + ir.status);
      const ij = await ir.json(); if (!ij.metadataUri) throw new Error('pump.fun ipfs gave no metadata link');
      log('  metadata ' + esc(ij.metadataUri.slice(0, 60)));
      const mint = W3.Keypair.generate(); log('> new coin address ' + mint.publicKey.toBase58());
      log('> building the launch transaction');
      const tr = await fetch('https://pumpportal.fun/api/trade-local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicKey: pk, action: 'create', tokenMetadata: { name, symbol, uri: ij.metadataUri }, mint: mint.publicKey.toBase58(), denominatedInSol: 'true', amount: buy, slippage: 10, priorityFee: 0.0005, pool: 'pump' }) });
      if (tr.status !== 200) throw new Error('the launch could not be built: ' + (await tr.text()).slice(0, 160));
      const tx = W3.VersionedTransaction.deserialize(new Uint8Array(await tr.arrayBuffer()));
      log('> sign it in your wallet', 1);
      const signed = await prov.signTransaction(tx); signed.sign([mint]);
      log('> sending to solana');
      const sr = await fetch('/api/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx: b64(signed.serialize()) }) }); const sj = await sr.json();
      if (!sr.ok || !sj.sig) throw new Error(sj.error || 'solana did not take it');
      log('  tx ' + sj.sig.slice(0, 20) + '…');
      let st = 'pending';
      for (let i = 0; i < 30 && !/confirmed|finalized|failed/.test(st); i++) { await new Promise(r => setTimeout(r, 2000)); try { const q = await (await fetch('/api/send?sig=' + sj.sig)).json(); st = q.status; if (q.err) throw new Error('on-chain error ' + q.err); } catch (er) { if (/on-chain/.test(er.message)) throw er; } log('  ' + st); }
      const m = mint.publicKey.toBase58();
      if (st === 'failed') throw new Error('the transaction failed on chain');
      log('> launched. ' + (st === 'pending' ? 'still confirming, check the links.' : ''), 1);
      $('#lDone').innerHTML = `<b>$${esc(symbol)}</b> is live<br><code>${m}</code><div class="kb"><a class="btn pri" href="https://pump.fun/coin/${m}" target="_blank" rel="noopener">open on pump.fun ↗</a><a class="btn" href="https://solscan.io/tx/${sj.sig}" target="_blank" rel="noopener">transaction ↗</a><button class="btn" type="button" id="cpM">copy CA</button></div>`;
      $('#lDone').hidden = false; $('#cpM').onclick = () => navigator.clipboard.writeText(m).then(() => toast('CA copied'));
    } catch (err) {
      log('[ x ] ' + esc(err.message || String(err)), 1); toast(/reject|denied|cancel/i.test(err.message) ? 'you cancelled in the wallet' : 'the launch stopped');
    } finally { busy = false; $('#lGo').disabled = false; }
  });
})();
