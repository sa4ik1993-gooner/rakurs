/* Выбор периода календарём (Дмитрий, 24.11.2026: «как выбор календаря, диапазон дат», образец — скрин с готовыми периодами слева
   и двумя месяцами справа). Слева готовые периоды, справа два месяца: первый клик — начало, второй — конец, период применяется сразу.
   Состояние периода то же, что было: PR.mode / PR.d1 / PR.d2 (pulse.js). Будущие дни выбрать нельзя, период — не длиннее 93 дней. */
const DP = {open:false, a:"", m:""};          /* a — выбранное начало (ждём конец), m — месяц справа «ГГГГ-ММ» */
const DP_MAX = 93;
const dpYM = s => s.slice(0, 7);
const dpAddM = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return d.getFullYear() + "-" + prPad(d.getMonth() + 1); };
const dpMon = s => { const d = new Date(s + "T00:00:00"), w = (d.getDay() + 6) % 7; return prShift(s, -w); };   /* понедельник недели */
/* готовые периоды: [ключ, подпись, () => {mode} или {d1, d2}] */
const DP_PRE = () => { const t = prToday(), y = prShift(t, -1), mon = dpMon(t), m1 = t.slice(0, 8) + "01", pm = dpAddM(dpYM(t), -1) + "-01";
  return [
    ["t", L("Сьогодні","Сегодня"), {mode:"t"}],
    ["y", L("Вчора","Вчера"), {mode:"y"}],
    ["w", L("Цей тиждень","Эта неделя"), mon === t ? {mode:"t"} : {d1:mon, d2:t}],
    ["pw", L("Минулий тиждень","Прошлая неделя"), {d1:prShift(mon, -7), d2:prShift(mon, -1)}],
    ["7", L("Останні 7 днів","Последние 7 дней"), {mode:7}],
    ["14", L("Останні 14 днів","Последние 14 дней"), {mode:14}],
    ["30", L("Останні 30 днів","Последние 30 дней"), {mode:30}],
    ["m", L("Цей місяць","Этот месяц"), {mode:"m"}],
    ["pm", L("Минулий місяць","Прошлый месяц"), {d1:pm, d2:prShift(m1, -1)}],
    ["90", L("3 місяці","3 месяца"), {mode:90}],
  ]; };
/* какой готовый период сейчас выбран (по режиму или по совпадению дат) */
function dpCur(){ const r = prRange(); for (const p of DP_PRE()) { const v = p[2];
    if (v.mode != null ? String(PR.mode) === String(v.mode) : PR.mode === "c" && r.d1 === v.d1 && r.d2 === v.d2) return p; }
  return null; }
const dpBtnLabel = () => { const p = dpCur(), r = prRange(); return p ? p[1] : prDM(r.d1) + " – " + prDM(r.d2) + "." + r.d2.slice(2, 4); };
const DP_WD = () => [L("Пн","Пн"), L("Вт","Вт"), L("Ср","Ср"), L("Чт","Чт"), L("Пт","Пт"), L("Сб","Сб"), L("Нд","Вс")];
const dpMName = ym => { const n = +ym.slice(5, 7) - 1; return [L("Січень","Январь"), L("Лютий","Февраль"), L("Березень","Март"), L("Квітень","Апрель"), L("Травень","Май"), L("Червень","Июнь"), L("Липень","Июль"), L("Серпень","Август"), L("Вересень","Сентябрь"), L("Жовтень","Октябрь"), L("Листопад","Ноябрь"), L("Грудень","Декабрь")][n] + " " + ym.slice(0, 4); };
function dpMonth(ym){ const t = prToday(), r = prRange(), first = ym + "-01", lead = (new Date(first + "T00:00:00").getDay() + 6) % 7, days = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const a = DP.a, lo = a || r.d1, hi = a || r.d2, cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<span class="dp__d dp__d--x"></span>`);
  for (let d = 1; d <= days; d++) { const s = ym + "-" + prPad(d), fut = s > t, edge = s === lo || s === hi, inR = s > lo && s < hi;
    cells.push(`<button type="button" class="dp__d${edge ? " is-edge" : inR ? " is-in" : ""}${s === t ? " is-today" : ""}" data-act="dpDay" data-v="${s}"${fut ? " disabled" : ""} aria-pressed="${edge}" aria-label="${prDM(s)}.${s.slice(0, 4)}">${d}</button>`); }
  return `<div class="dp__m"><b class="dp__mt">${dpMName(ym)}</b><div class="dp__g">${DP_WD().map(w => `<span class="dp__w">${w}</span>`).join("")}${cells.join("")}</div></div>`; }
function dpPanel(){ if (!DP.open) return ""; const cur = dpCur(), right = DP.m || dpYM(prRange().d2), left = dpAddM(right, -1), canNext = right < dpYM(prToday());
  return `<div class="dp__p" role="dialog" aria-label="${L("Період","Период")}">
    <ul class="dp__pre">${DP_PRE().map(p => `<li><button type="button" data-act="dpPre" data-v="${p[0]}" aria-pressed="${cur && cur[0] === p[0] ? "true" : "false"}">${p[1]}</button></li>`).join("")}</ul>
    <div class="dp__cal"><div class="dp__nav">${icoBtn("chevron", L("Попередній місяць","Предыдущий месяц"), `data-act="dpNav" data-v="-1"`)}<span class="sub">${DP.a ? L("Обери кінцеву дату","Выбери конечную дату") : L("Обери початок і кінець періоду","Выбери начало и конец периода")}</span>${icoBtn("chevron", L("Наступний місяць","Следующий месяц"), `data-act="dpNav" data-v="1"${canNext ? "" : " disabled"}`)}</div>
      <div class="dp__ms">${dpMonth(left)}${dpMonth(right)}</div></div></div>`; }
/* кнопка периода с выпадающим календарём */
function dpPick(){ const r = prRange();
  return `<div class="dp${DP.open ? " is-open" : ""}"><button type="button" class="dp__b" data-act="dpOpen" aria-expanded="${DP.open}" aria-haspopup="dialog" title="${L("Порівняння — з таким самим періодом перед ним: ","Сравнение — с таким же периодом перед ним: ") + (r.span === 1 ? prDM(r.p1) : prDM(r.p1) + "–" + prDM(r.p2))}">${ico("clock")}<span>${esc(dpBtnLabel())}</span>${ico("chevron")}</button>${dpPanel()}</div>`; }
function dpSet(d1, d2){ if (d1 > d2) [d1, d2] = [d2, d1];
  if ((Date.parse(d2) - Date.parse(d1)) / 864e5 + 1 > DP_MAX) { toast(L("Період — не довше 93 днів","Период — не длиннее 93 дней")); return false; }
  PR.touched = 1; PR.d1 = d1; PR.d2 = d2; PR.mode = "c"; DP.open = false; DP.a = ""; return true; }
Object.assign(ACT, {
  dpOpen(){ DP.open = !DP.open; DP.a = ""; DP.m = dpYM(prRange().d2); },
  dpPre(d){ const p = DP_PRE().find(x => x[0] === d.v); if (!p) return false; const v = p[2]; DP.a = "";
    if (v.mode != null) { ACT.prMode({v:String(v.mode)}); DP.open = false; } else dpSet(v.d1, v.d2); },
  dpDay(d){ if (!DP.a) { DP.a = d.v; return; } dpSet(DP.a, d.v); },
  dpNav(d){ DP.m = dpAddM(DP.m || dpYM(prRange().d2), +d.v); },
});
/* клик мимо календаря или Esc — закрыть */
document.addEventListener("click", e => { if (DP.open && !e.target.closest(".dp")) { DP.open = false; DP.a = ""; render(); } }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && DP.open) { DP.open = false; DP.a = ""; render(); } });
