// Vaccine due-date planner: birth date -> date for each schedule row (same ageWeeks the app uses).
(function () {
  const form = document.getElementById('vx-form');
  if (!form) return;
  const D = JSON.parse(document.getElementById('vx-data').textContent);
  const out = document.getElementById('vx-out');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = document.getElementById('vx-dob').value;
    if (!v) { out.innerHTML = `<p class="gp-err">${D.need}</p>`; return; }
    const dob = new Date(v + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat(D.locale, { day: 'numeric', month: 'long', year: 'numeric' });
    let nextMarked = false;
    const rows = D.rows.map((r) => {
      let d;
      if (r.months != null) { d = new Date(dob); d.setMonth(d.getMonth() + r.months); }
      else d = new Date(dob.getTime() + r.weeks * 7 * 86400000);
      let cls = d < today ? 'past' : '';
      if (!cls && !nextMarked) { cls = 'next'; nextMarked = true; }
      return `<tr class="${cls}"><td><b>${r.age}</b>${cls === 'next' ? ` <span class="tag">${D.next}</span>` : ''}<br><span class="opt">${fmt.format(d)}</span></td><td>${r.list}</td></tr>`;
    }).join('');
    out.innerHTML = `<table class="vx-table"><tr><th>${D.thAge}</th><th>${D.thVax}</th></tr>${rows}</table><p class="gp-note">${D.note}</p>`;
  });
})();
