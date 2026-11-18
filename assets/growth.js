// WHO Child Growth Standards percentile calculator (0–5 years).
// Data: WHO anthro package daily LMS tables (who-lms.json), z-scores per WHO method,
// including WHO's restricted adjustment beyond ±3 SD for weight and head circumference.
(function () {
  const form = document.getElementById('gp-form');
  if (!form) return;
  const T = JSON.parse(document.getElementById('gp-text').textContent);
  const dataUrl = form.dataset.lms;
  let lms = null;

  const $ = (id) => document.getElementById(id);
  const today = new Date();
  $('gp-date').value = today.toISOString().slice(0, 10);

  function units() { return form.querySelector('input[name="units"]:checked').value; }
  function applyUnits() {
    const imp = units() === 'imp';
    $('gp-w-unit').textContent = imp ? T.lb : T.kg;
    $('gp-l-unit').textContent = imp ? T.in : T.cm;
    $('gp-h-unit').textContent = imp ? T.in : T.cm;
  }
  form.querySelectorAll('input[name="units"]').forEach((r) => r.addEventListener('change', applyUnits));
  applyUnits();

  function ageDays() {
    const b = $('gp-dob').value, d = $('gp-date').value;
    if (!b || !d) return null;
    return Math.round((Date.parse(d) - Date.parse(b)) / 86400000);
  }

  function z(y, L, M, S, restricted) {
    const raw = Math.abs(L) < 1e-7 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
    if (!restricted || Math.abs(raw) <= 3) return raw;
    const sd = (k) => M * Math.pow(1 + L * S * k, 1 / L);
    if (raw > 3) return 3 + (y - sd(3)) / (sd(3) - sd(2));
    return -3 + (y - sd(-3)) / (sd(-2) - sd(-3));
  }

  // Abramowitz–Stegun normal CDF
  function cdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  function pctText(p) {
    if (p < 0.1) return T.below01;
    if (p > 99.9) return T.above999;
    const n = p < 1 || p > 99 ? p.toFixed(1).replace('.', T.dec || '.') : String(Math.round(p));
    return T.pct.replace('{n}', n);
  }

  function meaning(p) {
    if (p < 3) return { cls: 'low', text: T.low };
    if (p > 97) return { cls: 'high', text: T.high };
    return { cls: 'ok', text: T.ok.replace('{n}', String(Math.round(p))).replace('{m}', String(100 - Math.round(p))) };
  }

  function row(label, value, unit, p) {
    const m = meaning(p);
    return `<div class="gp-row ${m.cls}"><div class="gp-row-h"><span>${label}</span><b>${pctText(p)}</b></div>` +
      `<div class="gp-bar" aria-hidden="true"><i style="inset-inline-start:${Math.min(99, Math.max(1, p))}%"></i></div>` +
      `<p>${value} ${unit} · ${m.text}</p></div>`;
  }

  async function calc(e) {
    e.preventDefault();
    const out = $('gp-out');
    const days = ageDays();
    if (days === null) { out.innerHTML = `<p class="gp-err">${T.needDates}</p>`; return; }
    if (days < 0 || days > 1826) { out.innerHTML = `<p class="gp-err">${T.ageRange}</p>`; return; }
    const sex = form.querySelector('input[name="sex"]:checked').value; // '1' boy, '2' girl
    const imp = units() === 'imp';
    const num = (id) => { const v = parseFloat($(id).value.replace(',', '.')); return isFinite(v) && v > 0 ? v : null; };
    let w = num('gp-w'), l = num('gp-l'), h = num('gp-h');
    if (!w && !l && !h) { out.innerHTML = `<p class="gp-err">${T.needOne}</p>`; return; }
    if (imp) { if (w) w *= 0.45359237; if (l) l *= 2.54; if (h) h *= 2.54; }
    if (!lms) {
      out.innerHTML = `<p>${T.loading}</p>`;
      try { lms = await (await fetch(dataUrl)).json(); } catch (_) { out.innerHTML = `<p class="gp-err">${T.loadFail}</p>`; return; }
    }
    const get = (ind) => lms[ind][sex][days];
    const dec = (x) => x.toFixed(1).replace('.', T.dec || '.');
    const fmt = (v, metricUnit, impUnit, f) => imp ? [dec(v / f), impUnit] : [dec(v), metricUnit];
    let html = '';
    if (w) { const [L, M, S] = get('wfa'); const p = cdf(z(w, L, M, S, true)) * 100; const [v, u] = fmt(w, T.kg, T.lb, 0.45359237); html += row(T.weight, v, u, p); }
    if (l) { const [L, M, S] = get('lfa'); const p = cdf(z(l, L, M, S, false)) * 100; const [v, u] = fmt(l, T.cm, T.in, 2.54); html += row(days < 731 ? T.length : T.height, v, u, p); }
    if (h) { const [L, M, S] = get('hcfa'); const p = cdf(z(h, L, M, S, true)) * 100; const [v, u] = fmt(h, T.cm, T.in, 2.54); html += row(T.head, v, u, p); }
    const months = Math.floor(days / 30.4375);
    out.innerHTML = `<p class="gp-age">${T.ageIs.replace('{m}', months).replace('{d}', days)}</p>${html}<p class="gp-note">${T.note}</p>`;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  form.addEventListener('submit', calc);
})();
