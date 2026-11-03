/* WR1D ASCII globe — a canvas of characters, shaded by light, continents from a packed land map, an outline drawn with / | \ - */
(function () {
  const L = window.LAND, bytes = Uint8Array.from(atob(L.b), c => c.charCodeAt(0)), RB = L.w / 8;
  function land(lat, lon) {
    let x = Math.floor((lon + 180) / 360 * L.w); x = ((x % L.w) + L.w) % L.w;
    const y = Math.min(L.h - 1, Math.max(0, Math.floor((90 - lat) / 180 * L.h)));
    return (bytes[y * RB + (x >> 3)] >> (7 - (x & 7))) & 1;
  }
  const RAMP = ':;=+*#%@', NOISE = '01<>/\\|-_+*#%@:;.,`\'"~^=';
  const hash = (a, b) => { let v = (a * 73856093) ^ (b * 19349663); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v >>> 0) & 0xffff) / 65536; };
  const D = Math.PI / 180;

  function Globe(canvas, o) {
    o = Object.assign({ font: 12, lh: 1.12, lat: 18, speed: 6, ink: '236,236,230', drag: false, scale: .92 }, o || {});
    const ctx = canvas.getContext('2d'); let W, H, cw, ch, cols, rows, R, cells = [], rim = [], dpr;
    let rot = -10, vel = 0, dragging = false, lastX = 0, decode = 1, alpha = 1, t0 = performance.now(), running = true, raf = 0, last = 0;
    const lx = -.55, ly = .5, lz = .67, ln = Math.hypot(lx, ly, lz);

    function layout() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect(); W = Math.max(10, r.width); H = Math.max(10, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fs = o.font; ctx.font = `500 ${fs}px JB, ui-monospace, monospace`;
      cw = ctx.measureText('0').width; ch = fs * o.lh; cols = Math.floor(W / cw); rows = Math.floor(H / ch);
      R = Math.min(cols * cw, rows * ch) / 2 * o.scale;
      const cx = cols * cw / 2, cy = rows * ch / 2, p0 = o.lat * D;
      cells = []; rim = [];
      const map = new Map();
      // outline: steep parts one cell per row, flat parts one cell per column
      for (let i = 0; i < rows; i++) {
        const y = (i + .5) * ch - cy; if (Math.abs(y) >= R) continue;
        const xb = Math.sqrt(R * R - y * y); if (xb / cw < Math.abs(y) / ch) continue;
        const st = (xb / ch) / Math.max(Math.abs(y) / cw, 1e-6);
        for (const sg of [-1, 1]) { const j = Math.round((cx + sg * xb) / cw - .5); map.set(i * 4096 + j, st > 1.7 ? '|' : ((sg * y) < 0 ? '\\' : '/')); }
      }
      for (let j = 0; j < cols; j++) {
        const x = (j + .5) * cw - cx; if (Math.abs(x) >= R) continue;
        const yb = Math.sqrt(R * R - x * x); if (yb / ch < Math.abs(x) / cw) continue;
        const st = (Math.abs(x) / ch) / Math.max(yb / cw, 1e-6);
        for (const sg of [-1, 1]) { const i = Math.round((cy + sg * yb) / ch - .5); const k = i * 4096 + j; if (!map.has(k)) map.set(k, st < .6 ? '-' : ((x * sg) < 0 ? '\\' : '/')); }
      }
      map.forEach((c, k) => rim.push({ i: Math.floor(k / 4096), j: k % 4096, c }));
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        if (map.has(i * 4096 + j)) continue;
        const px = (j + .5) * cw - cx, py = (i + .5) * ch - cy, x = px / R, y = -py / R, rho = Math.hypot(x, y);
        if (rho >= .985) continue;
        const z = Math.sqrt(1 - rho * rho), c = Math.asin(rho);
        let lat, dl;
        if (rho < 1e-9) { lat = o.lat; dl = 0; }
        else {
          lat = Math.asin(Math.cos(c) * Math.sin(p0) + y * Math.sin(c) * Math.cos(p0) / rho) / D;
          dl = Math.atan2(x * Math.sin(c), rho * Math.cos(c) * Math.cos(p0) - y * Math.sin(c) * Math.sin(p0)) / D;
        }
        const lit = Math.pow(Math.max(0, (x * lx + y * ly + z * lz) / ln), 1.05);
        cells.push({ i, j, lat, dl, lit, h: hash(i, j) });
      }
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / 30) return; const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
      if (!dragging) { rot += (o.speed + vel) * dt; vel *= .94; }
      draw(now);
    }
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const B = 8, buckets = Array.from({ length: B }, () => []);
      const tick = Math.floor(now / 70);
      for (const c of cells) {
        const lon = c.dl + rot; let ch_, b;
        const isL = land(c.lat, ((lon + 540) % 360) - 180);
        if (isL) {
          const v = .14 + .86 * c.lit + (c.h - .5) * .2; ch_ = RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)))]; b = .5 + .5 * c.lit;
        } else {
          const q = hash(Math.round(c.lat * 2), Math.round(((lon % 360) + 360) % 360 * 2));
          if (q < .07 + .22 * c.lit) { ch_ = '.'; b = .2 + .25 * c.lit; } else ch_ = null;
        }
        if (decode < 1 && c.h > decode) { // not yet resolved: noise
          if (hash(c.i + tick, c.j) < .35 * decode + .08) { ch_ = NOISE[Math.floor(hash(c.j + tick, c.i) * NOISE.length)]; b = .12 + .3 * hash(c.i, c.j + tick); } else continue;
        }
        if (!ch_) continue;
        buckets[Math.min(B - 1, Math.floor(b * B))].push(c.j * cw, c.i * ch, ch_);
      }
      const rimB = Math.floor(.82 * B);
      for (const r of rim) { if (decode < 1 && hash(r.i, r.j) > decode) continue; buckets[rimB].push(r.j * cw, r.i * ch, r.c); }
      ctx.textBaseline = 'top';
      for (let k = 0; k < B; k++) {
        const a = buckets[k]; if (!a.length) continue;
        ctx.fillStyle = `rgba(${o.ink},${(((k + .5) / B) * alpha).toFixed(3)})`;
        for (let n = 0; n < a.length; n += 3) ctx.fillText(a[n + 2], a[n], a[n + 1]);
      }
    }
    if (o.drag) {
      canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
      canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; rot += dx * .35; vel = dx * 6; });
      const up = () => { dragging = false; canvas.classList.remove('grab'); };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    }
    const ro = new ResizeObserver(() => { layout(); draw(performance.now()); }); ro.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } });
    layout(); raf = requestAnimationFrame(frame);
    return {
      set decode(v) { decode = v; }, get decode() { return decode; },
      set alpha(v) { alpha = v; }, set rot(v) { rot = v; }, get rot() { return rot; },
      set speed(v) { o.speed = v; }, stop() { running = false; cancelAnimationFrame(raf); ro.disconnect(); },
      relayout: layout,
    };
  }
  window.WGlobe = Globe; window.WLand = land;
})();
