/* WR1D fx — scramble type, an ASCII cursor trail, the live ticker, tiles you can open and watch, magnetic buttons */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, NOISE = '01<>/\\|-_+*#%@:;.';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* scramble: characters roll through noise and settle, left to right */
  function scramble(el, dur = 900) {
    if (RM || el.dataset.scr) return; el.dataset.scr = 1;
    const txt = el.textContent, t0 = performance.now();
    (function f(now) {
      const k = Math.min(1, (now - t0) / dur); let out = '';
      for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (c === ' ' || c === '\n') { out += c; continue; } out += (i / txt.length < k * 1.15 - .15) ? c : NOISE[(Math.random() * NOISE.length) | 0]; }
      el.textContent = out; if (k < 1) requestAnimationFrame(f); else { el.textContent = txt; delete el.dataset.scr; }
    })(t0);
  }
  const startScr = () => { const m = $('.hero .mark'); if (m) scramble(m, 1400); const l = $('.hero .line'); if (l) setTimeout(() => scramble(l, 900), 300); };
  if (document.body.classList.contains('intro-on')) { const mo = new MutationObserver(() => { if (!document.body.classList.contains('intro-on')) { mo.disconnect(); setTimeout(startScr, 250); } }); mo.observe(document.body, { attributes: true, attributeFilter: ['class'] }); } else startScr();
  $('.hero .mark') && $('.hero .mark').addEventListener('mouseenter', e => scramble(e.currentTarget, 700));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { scramble(e.target, 800); io.unobserve(e.target); } }), { threshold: .6 });
  $$('.band h2').forEach(h => io.observe(h));
  $$('.nav nav a').forEach(a => a.addEventListener('mouseenter', () => scramble(a, 380)));

  /* ASCII cursor trail */
  const cv = $('#trail'), cx = cv.getContext('2d'); let P = [], W = 0, H = 0;
  const rs = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); cx.font = '500 12px JB, monospace'; };
  rs(); addEventListener('resize', rs);
  let lx = -1, ly = -1;
  if (!RM && matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => {
    if (lx >= 0 && Math.hypot(e.clientX - lx, e.clientY - ly) < 9) return; lx = e.clientX; ly = e.clientY;
    P.push({ x: e.clientX + (Math.random() - .5) * 6, y: e.clientY + (Math.random() - .5) * 6, c: NOISE[(Math.random() * NOISE.length) | 0], t: performance.now(), v: .2 + Math.random() * .5 });
    if (P.length > 70) P.shift();
  }, { passive: true });
  (function loop(now) {
    requestAnimationFrame(loop); if (!P.length) return; cx.clearRect(0, 0, W, H);
    P = P.filter(p => now - p.t < 700);
    for (const p of P) { const a = 1 - (now - p.t) / 700; cx.fillStyle = `rgba(236,236,230,${(a * .7).toFixed(3)})`; cx.fillText(p.c, p.x, p.y + (1 - a) * 14 * p.v); }
  })(performance.now());

  /* magnetic buttons */
  if (!RM && matchMedia('(pointer:fine)').matches) $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 6}px,${((e.clientY - r.top) / r.height - .5) * 6}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* watch list + notifications on change */
  let watch = new Set(); try { watch = new Set(JSON.parse(localStorage.getItem('wr1d-watch') || '[]')); } catch (_) { }
  const saveW = () => { try { localStorage.setItem('wr1d-watch', JSON.stringify([...watch])); } catch (_) { } };
  const prev = {};
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  const lvOf = s => !s.ok ? 'err' : (s.indicator === 'none' && s.maintenance ? 'maintenance' : (s.indicator || 'none'));
  const open = new Set();
  function enhance(S) {
    const sv = S.data.services;
    // ticker of the live board
    const items = sv.slice().sort((a, b) => (lvOf(a) === 'none') - (lvOf(b) === 'none')).map(s => { const lv = lvOf(s); return `<span>${lv === 'none' ? '·' : '<b>!</b>'} ${esc(s.name)} <b>${esc(lv === 'none' ? 'ok' : lv === 'err' ? 'unreachable' : (s.description || lv).toLowerCase())}</b></span>`; }).join('');
    $('#tk').innerHTML = items + items;
    // tiles: star, expand
    $$('#grid .svc').forEach(el => {
      const name = el.querySelector('h3').textContent, s = sv.find(x => x.name === name); if (!s) return;
      el.dataset.id = s.id;
      if (!el.querySelector('.star')) { const b = document.createElement('button'); b.className = 'star' + (watch.has(s.id) ? ' on' : ''); b.type = 'button'; b.title = 'watch'; b.textContent = watch.has(s.id) ? '★' : '☆'; el.querySelector('.top').prepend(b); }
      if (!el.querySelector('.more')) {
        const m = document.createElement('ul'); m.className = 'more';
        m.innerHTML = !s.ok ? `<li>the page did not answer: ${esc(s.error)}</li>` :
          (s.components.length ? s.components.map(c => `<li><b>${esc(c.name)}</b> · ${esc(c.status.replace(/_/g, ' '))}</li>`).join('') : '<li>every component reports operational</li>') +
          (s.incidents.length ? s.incidents.map(i => `<li>incident: <b>${esc(i.name)}</b> · ${esc(i.status)}</li>`).join('') : '') +
          `<li>category: ${esc(s.cat)}${s.maintenance ? ' · maintenance in progress' : ''}</li>`;
        el.appendChild(m);
      }
      el.classList.toggle('open', open.has(s.id));
    });
    // sort watched first
    const g = $('#grid'); $$('#grid .svc').filter(el => watch.has(el.dataset.id)).reverse().forEach(el => g.prepend(el));
    // notify on change of a watched service
    sv.forEach(s => { const lv = lvOf(s); if (prev[s.id] && prev[s.id] !== lv && watch.has(s.id)) { toast(`${s.name}: ${prev[s.id]} → ${lv}`); if (window.Notification && Notification.permission === 'granted') try { new Notification('WR1D · ' + s.name, { body: `${prev[s.id]} → ${lv}`, icon: '/assets/fav-64.png' }); } catch (_) { } } prev[s.id] = lv; });
  }
  document.addEventListener('wr1d:data', e => enhance(e.detail));
  $('#grid').addEventListener('click', e => {
    const st = e.target.closest('.star'), tile = e.target.closest('.svc'); if (!tile || e.target.closest('a')) return;
    const id = tile.dataset.id;
    if (st) {
      e.stopPropagation(); if (watch.has(id)) watch.delete(id); else { watch.add(id); if (window.Notification && Notification.permission === 'default') Notification.requestPermission().catch(() => { }); }
      saveW(); st.classList.toggle('on', watch.has(id)); st.textContent = watch.has(id) ? '★' : '☆'; toast(watch.has(id) ? 'watching ' + tile.querySelector('h3').textContent + ' (you get a ping when it changes)' : 'stopped watching');
      window.WR1Dpaint && window.WR1Dpaint(); return;
    }
    if (open.has(id)) open.delete(id); else open.add(id); tile.classList.toggle('open', open.has(id));
  });
  $('#q') && $('#q').addEventListener('input', () => window.WR1Dpaint && window.WR1Dpaint());

  /* kit: invert the image */
  const kc = $('#kCanvas'); let inv = false;
  $('#kMode') && $('#kMode').addEventListener('click', () => { inv = !inv; kc.style.filter = inv ? 'invert(1)' : ''; $('#kMode').textContent = inv ? 'normal' : 'invert'; });
  const dl = $('#kDl'); if (dl) dl.addEventListener('click', e => {
    if (!inv) return; e.stopImmediatePropagation();
    const c = document.createElement('canvas'); c.width = c.height = 1000; const x = c.getContext('2d'); x.filter = 'invert(1)'; x.drawImage(kc, 0, 0);
    const a = document.createElement('a'); a.download = (($('#kTick').value || 'wr1d') + '-inverted').toLowerCase() + '.png'; a.href = c.toDataURL('image/png'); a.click(); toast('image saved');
  }, true);
})();
