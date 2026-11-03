/* WR1D — intro, the live board, the feed, the kit */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = t => { if (!t) return '—'; const s = Math.max(0, (Date.now() - new Date(t)) / 1000); if (s < 60) return Math.floor(s) + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  const copy = (txt, msg) => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(msg), () => { const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast(msg); });
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- intro: noise -> the world -> blackout -> the site. no words ---------- */
  const intro = $('#intro'); let introDone = false;
  const hero = window.WGlobe($('#heroGlobe'), { font: 10, speed: 7, drag: true, scale: .64, lat: 16 });
  function endIntro(fast) {
    if (introDone) return; introDone = true;
    intro.classList.remove('flick'); intro.classList.add('off');
    setTimeout(() => { document.body.classList.remove('intro-on'); }, fast ? 120 : 260);
    setTimeout(() => { intro.classList.add('gone'); try { ig.stop(); } catch (_) { } rainStop = true; }, 700);
  }
  let ig, rainStop = false;
  if (RM || sessionStorage.getItem('wr1d-seen')) { intro.classList.add('gone'); document.body.classList.remove('intro-on'); introDone = true; }
  else {
    try { sessionStorage.setItem('wr1d-seen', '1'); } catch (_) { }
    ig = window.WGlobe($('#introGlobe'), { font: 9, speed: 22, scale: .42, lat: 16 }); ig.decode = 0; ig.rot = -60;
    // falling characters behind the globe
    const rc = $('#introRain'), rx = rc.getContext('2d'); let cols = [], RW, RH;
    const rs = () => { const d = Math.min(2, devicePixelRatio || 1); RW = innerWidth; RH = innerHeight; rc.width = RW * d; rc.height = RH * d; rx.setTransform(d, 0, 0, d, 0, 0); rx.font = '500 12px JB, monospace'; cols = Array.from({ length: Math.ceil(RW / 14) }, () => ({ y: Math.random() * -RH, v: 60 + Math.random() * 220, l: 6 + Math.random() * 18 })); };
    rs(); addEventListener('resize', rs);
    const CH = '01/\\|-_+*:.'; let lt = performance.now(), t0 = lt;
    (function rain(now) {
      if (rainStop) return; requestAnimationFrame(rain);
      const dt = Math.min(.05, (now - lt) / 1000); lt = now; const el = (now - t0) / 1000;
      rx.clearRect(0, 0, RW, RH);
      if (el > .6 && el < 3.6) { const cx = RW / 2, cy = RH / 2, base = Math.min(RW, RH) * .21; for (let q = 0; q < 3; q++) { const ph = ((el - .6) * .55 + q / 3) % 1, rr = base * (1.05 + ph * 1.9), a = (1 - ph) * .5 * Math.min(1, (el - .6) * 2); const n = Math.floor(rr * .7); for (let s = 0; s < n; s++) { const th = s / n * Math.PI * 2; rx.fillStyle = `rgba(236,236,230,${(a * (.4 + .6 * ((s * 7) % 5) / 4)).toFixed(3)})`; rx.fillText(s % 9 === 0 ? '+' : '.', cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * .92); } } }
      const fade = Math.max(0, 1 - Math.max(0, el - 1.6) / 1.4);
      if (fade <= 0) return;
      cols.forEach((c, i) => {
        c.y += c.v * dt; if (c.y - c.l * 14 > RH) { c.y = -Math.random() * 200; c.v = 60 + Math.random() * 220; }
        for (let k = 0; k < c.l; k++) {
          const y = c.y - k * 14; if (y < -14 || y > RH) continue;
          rx.fillStyle = `rgba(236,236,230,${((k === 0 ? .55 : .18 * (1 - k / c.l)) * fade).toFixed(3)})`;
          rx.fillText(CH[(i * 7 + k * 3 + Math.floor(now / 90)) % CH.length], i * 14, y);
        }
      });
    })(lt);
    const T = { decode: [0.35, 2.6], flick: 3.35, off: 4.05 };
    (function step(now) {
      if (introDone) return; requestAnimationFrame(step);
      const el = (now - t0) / 1000;
      const k = Math.min(1, Math.max(0, (el - T.decode[0]) / (T.decode[1] - T.decode[0])));
      ig.decode = k * k * (3 - 2 * k); ig.speed = 22 - 14 * k;
      intro.style.setProperty('--p', Math.min(1, el / T.off).toFixed(3));
      if (el > T.flick && !intro.classList.contains('flick')) intro.classList.add('flick');
      if (el > T.off) endIntro();
    })(t0);
    const skip = () => endIntro(true);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(e => addEventListener(e, skip, { once: true, passive: true }));
  }

  /* ---------- reveal on scroll + nav state ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.band .sh, .band .sub, .steps, .faq, .kit').forEach(el => { el.classList.add('rv'); io.observe(el); });
  const secs = ['status', 'down', 'check', 'kit', 'how', 'faq'].map(id => document.getElementById(id));
  const navIo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => navIo.observe(s));

  /* ---------- the scanner: this minute's reads, replayed one by one ---------- */
  const scan = { q: [], i: 0, lines: [], data: null, t: 0 };
  function scanFeed(d) { scan.data = d; if (!scan.t) scanTick(); }
  function scanTick() {
    const d = scan.data; if (!d) return; const sv = d.services;
    if (scan.i >= sv.length) { scan.i = 0; scan.lines.push(`<b>— read complete · ${sv.filter(s => s.ok).length}/${sv.length} answered · ${d.ms} ms total · ${new Date(d.at).toISOString().slice(11, 19)} UTC —</b>`); }
    else {
      const s = sv[scan.i++], lv = !s.ok ? 'err' : (s.indicator === 'none' && s.maintenance ? 'maintenance' : s.indicator);
      const tag = { none: 'operational', minor: '<i>DEGRADED</i>', major: '<i>MAJOR OUTAGE</i>', critical: '<i>CRITICAL</i>', maintenance: 'maintenance', err: '<i>NO ANSWER</i>' }[lv] || lv;
      const host = (s.host || '').padEnd(34).slice(0, 34), ms = String(s.ms == null ? '—' : s.ms + 'ms').padStart(7);
      scan.lines.push(`${new Date().toISOString().slice(11, 19)}  GET ${esc(host)} ${s.ok ? '200' : '---'} ${ms}  ${tag}${s.incidents && s.incidents.length ? ' · ' + s.incidents.length + ' open' : ''}`);
    }
    if (scan.lines.length > 8) scan.lines.shift();
    const lg = document.getElementById('scanLog'); if (lg) lg.innerHTML = scan.lines.join('\n');
    const n = sv.length, k = scan.i, w = 26, f = Math.round(k / n * w);
    const p = document.getElementById('scanP'); if (p) p.textContent = '[' + '#'.repeat(f) + '.'.repeat(w - f) + ']';
    const c = document.getElementById('scanN'); if (c) c.textContent = k + '/' + n;
    scan.t = setTimeout(scanTick, document.hidden ? 2000 : 420 + Math.random() * 260);
  }

  /* ---------- the live board ---------- */
  const LV = { none: 'operational', minor: 'degraded', major: 'major outage', critical: 'critical', maintenance: 'maintenance', err: 'unreachable' };
  const S = { data: null, f: 'all', c: 'all', next: 0, hist: {} };
  function lvOf(s) { if (!s.ok) return 'err'; if (s.indicator === 'none' && s.maintenance) return 'maintenance'; return s.indicator || 'none'; }
  async function load() {
    try {
      const r = await fetch('/api/status', { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); S.data = j;
      j.services.forEach(s => { const h = S.hist[s.id] = S.hist[s.id] || []; h.push(lvOf(s)); if (h.length > 28) h.shift(); });
      try { localStorage.setItem('wr1d-hist', JSON.stringify(S.hist)); } catch (_) { }
      paint();
    } catch (e) {
      $('#pTxt').textContent = 'the board could not be read (' + e.message + '). retrying.';
      $('#pDot').classList.remove('beat');
      if (!S.data) $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1;background:#000;padding:30px"><pre>[ X ] /api/status</pre>the status feed did not answer. it retries every minute.</div>`;
    }
    S.next = Date.now() + 60000;
  }
  try { S.hist = JSON.parse(localStorage.getItem('wr1d-hist') || '{}') || {}; } catch (_) { S.hist = {}; }
  setInterval(() => { const s = Math.max(0, Math.round((S.next - Date.now()) / 1000)); $('#cd').textContent = S.next ? 'next read ' + s + 's' : '--'; if (S.next && Date.now() >= S.next) { S.next = Date.now() + 60000; load(); } }, 1000);

  function paint() {
    const sv = S.data.services, n = sv.length; const sn = document.getElementById('svcN'); if (sn) sn.textContent = n; scanFeed(S.data);
    const issues = sv.filter(s => s.ok && lvOf(s) !== 'none'), errs = sv.filter(s => !s.ok), ok = sv.filter(s => s.ok && lvOf(s) === 'none');
    // hero pulse + meter
    $('#pDot').classList.add('beat');
    $('#pTxt').textContent = issues.length ? `${issues.length} of ${n} services report a problem right now` : (errs.length === n ? 'no status page answered this minute' : `all ${ok.length} reachable services report operational`);
    // grid
    const qv = (document.getElementById('q') || {}).value || ''; const rows = sv.filter(s => (!qv || s.name.toLowerCase().includes(qv.toLowerCase())) && (S.c === 'all' || s.cat === S.c) && (S.f === 'all' || (S.f === 'issues' ? lvOf(s) !== 'none' : lvOf(s) === 'none')));
    const order = { critical: 0, major: 1, minor: 2, maintenance: 3, err: 4, none: 5 };
    rows.sort((a, b) => order[lvOf(a)] - order[lvOf(b)] || a.name.localeCompare(b.name));
    $('#grid').innerHTML = rows.length ? rows.map((s, i) => {
      const lv = lvOf(s), h = (S.hist[s.id] || []).map(x => ({ none: '▁', minor: '▄', maintenance: '▃', major: '▇', critical: '█', err: '·' }[x])).join('');
      const desc = !s.ok ? 'status page did not answer: ' + esc(s.error) : (s.components.length ? esc(s.components.slice(0, 3).map(c => c.name + ' (' + c.status.replace(/_/g, ' ') + ')').join(', ')) + (s.components.length > 3 ? ' +' + (s.components.length - 3) : '') : esc(s.description || 'All Systems Operational'));
      return `<article class="svc lv-${lv}" style="animation-delay:${Math.min(i * 35, 600)}ms"><div class="top"><h3 class="glitch">${esc(s.name)}</h3><span class="st">${LV[lv]}</span></div>
        <p class="desc">${desc}</p><div class="spark" title="this tab's last reads">${esc(h.padStart(28, ' ').replace(/ /g, '·'))}</div>
        <div class="meta"><span>${s.ok ? 'page ' + ago(s.updated_at) : '—'}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">status page &nearr;</a></div></article>`;
    }).join('') : `<div class="empty" style="grid-column:1/-1;background:#000;padding:30px">nothing matches this filter.</div>`;
    // feed
    const inc = [];
    sv.forEach(s => (s.incidents || []).forEach(x => inc.push(Object.assign({ svc: s }, x))));
    sv.filter(s => s.ok && !(s.incidents || []).length && s.components.length).forEach(s => inc.push({ svc: s, id: 'c-' + s.id, name: s.components.length + ' component' + (s.components.length > 1 ? 's' : '') + ' not operational', status: s.components[0].status.replace(/_/g, ' '), impact: s.indicator, created_at: s.updated_at, link: s.url, update: s.components.map(c => c.name).join(', ') }));
    inc.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    $('#downN').textContent = inc.length ? inc.length + ' open' : '';
    $('#feed').innerHTML = inc.length ? inc.map((x, i) => `<div class="inc" style="animation-delay:${Math.min(i * 40, 500)}ms"><div class="who">${esc(x.svc.name)}<small>${ago(x.created_at)}</small></div>
      <div><h3>${esc(x.name)}</h3>${x.update ? `<p>${esc(x.update)}</p>` : ''}<div class="tags"><span class="${/major|critical/.test(x.impact) ? 'hot' : ''}">impact: ${esc(x.impact || 'none')}</span><span>${esc(String(x.status || '').replace(/_/g, ' '))}</span><span>${esc(x.svc.cat)}</span></div></div>
      <div class="act"><button class="btn pri" data-kit="${i}">build kit</button><a href="${esc(x.link)}" target="_blank" rel="noopener">their post &nearr;</a></div></div>`).join('')
      : `<div class="empty"><pre>  .-""-.\n /  ok  \\\n \\      /\n  '-..-'</pre>no open incidents on the board right now. the world is holding. this list fills itself the minute a company posts one.</div>`;
    S.inc = inc; window.WR1D = S; document.dispatchEvent(new CustomEvent('wr1d:data', { detail: S }));
  }
  window.WR1Dpaint = () => S.data && paint();
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) { S.f = b.dataset.f; $$('#filters [data-f]').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.c) { S.c = b.dataset.c; $$('#filters [data-c]').forEach(x => x.classList.toggle('on', x === b)); }
    if (S.data) paint();
  });
  $('#feed').addEventListener('click', e => {
    const b = e.target.closest('[data-kit]'); if (!b) return; const x = S.inc[+b.dataset.kit]; if (!x) return;
    const nm = x.svc.name, tick = (nm.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6) + 'DOWN').slice(0, 10);
    $('#kName').value = (nm + ' is down').slice(0, 32); $('#kTick').value = tick; $('#kSrc').value = x.link || x.svc.url;
    $('#kPost').value = `${nm} is down.\n\n"${x.name}"\n\n$${tick}\n${x.link || x.svc.url}`;
    drawKit(); document.getElementById('kit').scrollIntoView({ behavior: 'smooth' }); toast('kit built from ' + nm);
  });

  /* ---------- the kit: an ASCII image of any word ---------- */
  const kc = $('#kCanvas'), kx = kc.getContext('2d');
  function asciiWord(word, cols) {
    const c = document.createElement('canvas'), x = c.getContext('2d'); const cw = 6, chh = 11;
    c.width = cols * cw; c.height = 220; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    let fs = 200; x.font = `700 ${fs}px JB, monospace`; while (x.measureText(word).width > c.width * .94 && fs > 20) { fs -= 4; x.font = `700 ${fs}px JB, monospace`; }
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(word, c.width / 2, c.height / 2);
    const d = x.getImageData(0, 0, c.width, c.height).data, rows = Math.floor(c.height / chh), out = [];
    const ramp = ' .:-=+*#%@';
    for (let r = 0; r < rows; r++) { let line = ''; for (let q = 0; q < cols; q++) { let s = 0, n = 0; for (let yy = r * chh; yy < (r + 1) * chh; yy += 2) for (let xx = q * cw; xx < (q + 1) * cw; xx += 2) { s += d[(yy * c.width + xx) * 4]; n++; } const v = s / n / 255; line += ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))]; } out.push(line); }
    while (out.length && !out[0].trim()) out.shift(); while (out.length && !out[out.length - 1].trim()) out.pop();
    return out;
  }
  const kitGlobe = document.createElement('canvas'); kitGlobe.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:420px'; document.body.appendChild(kitGlobe);
  const kg = window.WGlobe(kitGlobe, { font: 9, speed: 0, scale: .96, lat: 16 }); kg.rot = 10;
  let upImg = null, imMode = 'ascii';
  function asciiImage(img, cols) {           // any picture -> characters
    const c = document.createElement('canvas'), x = c.getContext('2d'), cw = 6, chh = 11, rows = Math.round(cols * cw / chh);
    c.width = cols; c.height = rows; const s = Math.min(img.width, img.height);
    x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, cols, rows);
    const d = x.getImageData(0, 0, cols, rows).data, ramp = ' .:-=+*#%@', out = [];
    for (let r = 0; r < rows; r++) { let l = ''; for (let q = 0; q < cols; q++) { const k = (r * cols + q) * 4, v = (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11) / 255; l += ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))]; } out.push(l); }
    return out;
  }
  function drawKit() {
    const tick = ($('#kTick').value || '').toUpperCase().replace(/[^A-Z0-9$]/g, '').slice(0, 10);
    const name = $('#kName').value.trim();
    kx.fillStyle = '#000'; kx.fillRect(0, 0, 1000, 1000); kx.textBaseline = 'top';
    if (upImg && imMode === 'photo') { const s = Math.min(upImg.width, upImg.height); kx.drawImage(upImg, (upImg.width - s) / 2, (upImg.height - s) / 2, s, s, 0, 0, 1000, 1000); return; }
    if (upImg) { const L = asciiImage(upImg, 166); kx.font = '500 10px JB, monospace'; kx.fillStyle = '#ecece6'; const lw = kx.measureText('0').width, lh = 1000 / L.length; L.forEach((l, i) => kx.fillText(l, (1000 - l.length * lw) / 2, i * lh)); return; }
    if (!tick && !name) {                    // empty state: a frame waiting for a coin
      kx.globalAlpha = .22; kx.drawImage(kitGlobe, 290, 230, 420, 420); kx.globalAlpha = 1;
      kx.strokeStyle = '#2a2a28'; kx.setLineDash([6, 8]); kx.strokeRect(60, 60, 880, 880); kx.setLineDash([]);
      kx.font = '500 20px JB, monospace'; kx.fillStyle = '#6a6a66'; kx.textAlign = 'center';
      kx.fillText('type a ticker, or drop an image', 500, 720); kx.textAlign = 'left'; return;
    }
    kx.globalAlpha = .28; kx.drawImage(kitGlobe, 290, 120, 420, 420); kx.globalAlpha = 1;
    const lines = asciiWord(tick || name.toUpperCase().slice(0, 10), 150); kx.font = '500 10px JB, monospace'; kx.fillStyle = '#ecece6';
    const lw = kx.measureText('0').width, y0 = 560 - lines.length * 6;
    lines.forEach((l, i) => kx.fillText(l, (1000 - l.length * lw) / 2, y0 + i * 12));
    if (name) { kx.font = '500 26px JB, monospace'; kx.fillStyle = '#cfcfc9'; kx.textAlign = 'center'; kx.fillText(name.toUpperCase(), 500, y0 + lines.length * 12 + 40); kx.textAlign = 'left'; }
    kx.font = '500 15px JB, monospace'; kx.fillStyle = '#5a5a57'; kx.fillText('[ ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC ]', 40, 950);
  }
  const kFile = $('#kFile'), kup = kFile.parentElement;
  function useFile(f) {
    if (!f || !/^image\//.test(f.type)) return toast('that is not an image');
    if (f.size > 4e6) return toast('keep it under 4 MB');
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { upImg = im; $('#kFileT').textContent = f.name; $('#kClear').hidden = false; drawKit(); };
    im.src = url;
  }
  kFile.addEventListener('change', () => useFile(kFile.files[0]));
  ['dragenter', 'dragover'].forEach(e => kup.addEventListener(e, ev => { ev.preventDefault(); kup.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(e => kup.addEventListener(e, () => kup.classList.remove('drag')));
  kup.addEventListener('drop', ev => { ev.preventDefault(); useFile(ev.dataTransfer.files[0]); });
  $$('.kopt [data-im]').forEach(b => b.addEventListener('click', () => { imMode = b.dataset.im; $$('.kopt [data-im]').forEach(x => x.classList.toggle('on', x === b)); drawKit(); }));
  $('#kClear').addEventListener('click', () => { upImg = null; kFile.value = ''; $('#kFileT').textContent = 'drop an image here or click to pick one'; $('#kClear').hidden = true; drawKit(); });
  ['kName', 'kTick'].forEach(id => $('#' + id).addEventListener('input', drawKit));
  $('#kDl').addEventListener('click', () => { drawKit(); const a = document.createElement('a'); a.download = ($('#kTick').value || 'wr1d').toLowerCase() + '.png'; a.href = kc.toDataURL('image/png'); a.click(); toast('image saved'); });
  $('#kCopy').addEventListener('click', () => copy($('#kPost').value, 'post copied'));
  $('#kLaunch').addEventListener('click', () => {
    drawKit(); const k = { name: $('#kName').value.trim(), ticker: $('#kTick').value.trim(), post: $('#kPost').value.trim(), site: $('#kSrc').value.trim() };
    if (k.name || k.ticker || upImg) k.img = kc.toDataURL('image/png');
    try { sessionStorage.setItem('wr1d-kit', JSON.stringify(k)); } catch (_) { } location.href = '/launch';
  });
  $('#kAll').addEventListener('click', () => copy(`name: ${$('#kName').value}\nticker: ${$('#kTick').value}\nwebsite: ${$('#kSrc').value}\n\n${$('#kPost').value}`, 'kit copied'));
  document.fonts.ready.then(() => setTimeout(drawKit, 300));

  /* ---------- is it down? ---------- */
  let lastCk = null;
  $('#ck').addEventListener('submit', async e => {
    e.preventDefault(); const v = $('#ckUrl').value.trim(); if (!v) { $('#ckUrl').focus(); return; }
    const out = $('#ckOut'); $('#ckB').hidden = true; let dots = 0;
    const spin = setInterval(() => { out.textContent = 'knocking on ' + v + ' ' + '.'.repeat(dots = (dots + 1) % 4); }, 220);
    try {
      const r = await fetch('/api/check?url=' + encodeURIComponent(v)); const j = await r.json(); clearInterval(spin);
      if (j.error) { out.textContent = '[ ? ] ' + j.error; return; }
      lastCk = j;
      out.innerHTML = `<b>[ ${j.up ? 'UP' : 'DOWN'} ]</b>  ${esc(j.host)}\n      ${esc(j.reason)}${j.status ? ' · HTTP ' + j.status : ''}${j.ms != null ? ' · ' + j.ms + ' ms' : ''}\n      checked ${new Date().toISOString().slice(11, 19)} UTC from the WR1D server`;
      $('#ckB').hidden = j.up;
    } catch (err) { clearInterval(spin); out.textContent = '[ ? ] the check itself failed: ' + err.message; }
  });
  $('#ckKit').addEventListener('click', () => {
    if (!lastCk) return; const nm = lastCk.host.replace(/^www\./, ''), base = nm.split('.')[0];
    const tick = (base.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6) + 'DOWN').slice(0, 10);
    $('#kName').value = (base.charAt(0).toUpperCase() + base.slice(1) + ' is down').slice(0, 32); $('#kTick').value = tick; $('#kSrc').value = lastCk.url;
    $('#kPost').value = `${nm} is down.\n\n${lastCk.reason}.\n\n$${tick}`; drawKit(); document.getElementById('kit').scrollIntoView({ behavior: 'smooth' });
  });

  load();
})();
