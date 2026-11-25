/* График динамики (Дмитрий, 25.11.2026: «добавить график тенденций в пустом месте или кнопку "Подивитися графік": как было до работы
   с Хиро, первый день Хиро, второй и так далее; разбивка по дням, неделям, месяцам»).
   Мини-график цены лида за 30 дней — справа в «Пульсе реклами»; окно — с выбором показателя, разбивки и периода.
   Данные: ad_trend (дни × кампании, своды из ad_metrics), начало работы Хиро — hiro_start (первая запись в ленте автопилота).
   Учитывает фильтр «Сьогодні» (проект / воронка / канал) так же, как «Пульс». */
const TRG = {open:false, m:"cpl", g:"d", n:30, only:""};
const TRGD = {};
const TR_DAYS = 400;
function trLoad(p){ if (!CLOUD || !sb) return; const x = TRGD[p.id]; if (x && (x.load || Date.now() - x.at < 10 * 60000)) return;
  TRGD[p.id] = Object.assign(x || {}, {load:true});
  const t = prToday(), camp = o => ({day:o.day, prov:PROV_CH[o.provider] || o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, s:+o.spend || 0, i:+o.impressions || 0, c:+o.clicks || 0, l:+o.leads || 0});
  Promise.all([Promise.resolve(sb.rpc("ad_trend", {p:p.id, d1:prShift(t, -TR_DAYS), d2:t})).then(r => r.error ? null : (r.data || []).map(camp), () => null),
    Promise.resolve(sb.rpc("hiro_start", {p:p.id})).then(r => r.data || null, () => null)])
    .then(([rows, st]) => { TRGD[p.id] = {rows:rows || (x && x.rows) || [], start:st ? trDay(new Date(st)) : "", at:Date.now(), err:!rows}; render(); }); }
const trDay = d => d.getFullYear() + "-" + prPad(d.getMonth() + 1) + "-" + prPad(d.getDate());
const trPs = only => (only ? [only] : W.projs || []).filter(p => typeof prOn === "function" && prOn(p));
/* ряды по дням для набора проектов с учётом фильтра; start — самое раннее начало Хиро */
function trDaily(ps){ const by = {}; let start = "", load = false;
  ps.forEach(p => { trLoad(p); const x = TRGD[p.id]; if (!x || !x.rows) { load = true; return; } if (x.load && !x.rows.length) load = true;
    if (x.start && (!start || x.start < start)) start = x.start;
    x.rows.forEach(o => { if (typeof tfRow === "function" && !tfRow(p, o)) return; const b = by[o.day] = by[o.day] || {k:o.day, s:0, i:0, c:0, l:0}; b.s += o.s; b.i += o.i; b.c += o.c; b.l += o.l; }); });
  return {days:Object.values(by).sort((a, b) => a.k < b.k ? -1 : 1), start, load}; }
/* разбивка: день / неделя (с понедельника) / месяц; пустые дни внутри периода — нулями, чтобы ось была честной */
function trBuckets(days, g, n){ const t = prToday(), first = n ? prShift(t, -(n - 1)) : (days[0] ? days[0].k : t), map = {}; days.forEach(d => { map[d.k] = d; });
  const out = [], idx = {}; for (let k = first; k <= t; k = prShift(k, 1)) { const d = map[k] || {k, s:0, i:0, c:0, l:0}, key = g === "w" ? dpMon(k) : g === "m" ? k.slice(0, 7) : k;
    let b = idx[key]; if (!b) { b = idx[key] = {k:key, d1:k, d2:k, s:0, i:0, c:0, l:0}; out.push(b); } b.d2 = k; b.s += d.s; b.i += d.i; b.c += d.c; b.l += d.l; }
  return out; }
const TRGM = () => ({cpl:{t:L("Ціна ліда","Цена лида"), v:b => b.l ? b.s / b.l : null, f:v => fxM(v) + " $", low:true},
  l:{t:L("Ліди","Лиды"), v:b => b.l, f:v => num(Math.round(v)), bar:true}, s:{t:L("Витрати","Расход"), v:b => b.s, f:v => (v >= 1000 ? num(Math.round(v)) : fxM(v)) + " $", bar:true},
  ctr:{t:"CTR", v:b => b.i ? b.c / b.i : null, f:v => (Math.round(v * 1000) / 10).toString().replace(".", ",") + "%"}});
const trLab = (b, g) => g === "m" ? dpMName(b.k) : g === "w" ? prDM(b.d1) + "–" + prDM(b.d2) : prDM(b.k);
/* SVG: линия (цена, CTR) или столбики (лиды, расход); после начала Хиро — подсветка и подпись; для цены лида — линия цели */
function trSvg(B, mk, start, o){ const M = TRGM()[mk], W0 = o.w, H0 = o.h, pl = o.mini ? 2 : 44, pr = o.mini ? 2 : 8, pt = o.mini ? 6 : 14, pb = o.mini ? 4 : 22;
  const vals = B.map(M.v), ok = vals.filter(v => v != null && isFinite(v)), tgt = mk === "cpl" ? o.target || 0 : 0;
  if (!ok.length) return `<p class="sub">${L("Немає даних за цей період.","Нет данных за этот период.")}</p>`;
  const hi = Math.max(...ok, tgt) * 1.12 || 1, n = B.length, cw = (W0 - pl - pr) / n, X = i => pl + cw * (i + 0.5), Y = v => pt + (H0 - pt - pb) * (1 - v / hi);
  let g = "";
  const si = start ? B.findIndex(b => b.d2 >= start) : -1;
  if (si >= 0) { const x0 = pl + cw * si; g += `<rect class="tr__hz" x="${x0}" y="${pt - 4}" width="${W0 - pr - x0}" height="${H0 - pt - pb + 4}"/><line class="tr__hl" x1="${x0}" x2="${x0}" y1="${pt - 4}" y2="${H0 - pb}"/>`
    + (o.mini ? "" : `<text class="tr__ht" x="${x0 + 4}" y="${pt + 6}">${L("Хіро з ","Хиро с ")}${prDM(start)}</text>`); }
  if (!o.mini) [0, 0.5, 1].forEach(q => { const v = hi / 1.12 * q, y = Y(v); g += `<line class="tr__gl" x1="${pl}" x2="${W0 - pr}" y1="${y}" y2="${y}"/><text class="tr__yl" x="${pl - 6}" y="${y + 4}">${esc(M.f(v))}</text>`; });
  if (tgt) { const y = Y(tgt); g += `<line class="tr__tg" x1="${pl}" x2="${W0 - pr}" y1="${y}" y2="${y}"/>` + (o.mini ? "" : `<text class="tr__tt" x="${W0 - pr - 4}" y="${y - 4}">${L("ціль ","цель ")}${esc(M.f(tgt))}</text>`); }
  if (M.bar) B.forEach((b, i) => { const v = vals[i] || 0, y = Y(v), w = Math.max(1, cw * 0.7); g += `<rect class="tr__bar${start && b.d2 >= start ? " is-h" : ""}" x="${X(i) - w / 2}" y="${y}" width="${w}" height="${Math.max(0, H0 - pb - y)}"><title>${esc(trLab(b, o.g) + ": " + M.f(v))}</title></rect>`; });
  else { let d = "", pen = false; B.forEach((b, i) => { const v = vals[i]; if (v == null || !isFinite(v)) { pen = false; return; } d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); pen = true; });
    g += `<path class="tr__ln" d="${d}"/>` + B.map((b, i) => vals[i] == null ? "" : `<circle class="tr__pt${start && b.d2 >= start ? " is-h" : ""}" cx="${X(i)}" cy="${Y(vals[i])}" r="${o.mini ? 1.6 : 3}"><title>${esc(trLab(b, o.g) + ": " + M.f(vals[i]) + (b.l ? " · " + b.l + L(" лідів"," лидов") : ""))}</title></circle>`).join(""); }
  if (!o.mini) { const step = Math.max(1, Math.ceil(n / 8)); B.forEach((b, i) => { if (i % step && i !== n - 1) return; g += `<text class="tr__xl" x="${X(i)}" y="${H0 - 6}">${esc(o.g === "m" ? dpMName(b.k).split(" ")[0].slice(0, 3) : prDM(b.d1))}</text>`; }); }
  return `<svg class="tr__svg${o.mini ? " tr__svg--mini" : ""}" viewBox="0 0 ${W0} ${H0}" preserveAspectRatio="none" role="img" aria-label="${esc(M.t)}">${g}</svg>`; }
/* цель — из настроек автопилота (если один проект/воронка); иначе без линии */
function trTarget(ps){ if (typeof PL === "undefined") return 0; const t = ps.map(p => { const st = PL.st[p.id]; return st && st.settings ? Number(st.settings.target_cpl) || 0 : 0; }).filter(Boolean); return t.length === 1 || new Set(t).size === 1 ? t[0] : 0; }
/* до / с Хиро за выбранный период */
function trCmp(days, start, n){ if (!start) return null; const t = prToday(), from = n ? prShift(t, -(n - 1)) : "";
  const sum = a => a.reduce((x, d) => ({s:x.s + d.s, l:x.l + d.l, n:x.n + 1}), {s:0, l:0, n:0});
  const before = sum(days.filter(d => d.k < start && (!from || d.k >= from))), after = sum(days.filter(d => d.k >= start && (!from || d.k >= from)));
  const nA = Math.round((Date.parse(t) - Date.parse(start)) / 864e5) + 1, nB = from ? Math.max(0, Math.round((Date.parse(start) - Date.parse(from)) / 864e5)) : before.n;
  return before.l && after.l ? {b:before.s / before.l, a:after.s / after.l, nA, nB} : null; }
/* мини-график в «Пульсе»: цена лида по дням за 30 дней */
function trMini(ps){ if (!CLOUD || !sb || !ps.length) return ""; const D = trDaily(ps); if (!D.days.length) return D.load ? `<div class="trm"><span class="tag">${L("Ціна ліда · 30 днів","Цена лида · 30 дней")}</span><div class="trm__sk"></div></div>` : "";
  const B = trBuckets(D.days, "d", 30), c = trCmp(D.days, D.start, 30);
  return `<div class="trm"><div class="row sp"><span class="tag">${L("Ціна ліда · 30 днів","Цена лида · 30 дней")}</span>${D.start ? `<span class="trm__h">${L("Хіро з ","Хиро с ")}${prDM(D.start)}</span>` : ""}</div>
    ${trSvg(B, "cpl", D.start, {w:280, h:64, mini:true, g:"d", target:trTarget(ps)})}
    <div class="row sp">${c ? `<span class="sub">${L("До Хіро ","До Хиро ")}${fxM(c.b)} $ → ${fxM(c.a)} $</span>` : `<span></span>`}<button type="button" class="btn btn--sm btn--text" data-act="trOpen" data-v="${ps.length === 1 ? ps[0].id : ""}">${L("Подивитися графік","Посмотреть график")}</button></div></div>`; }
function trHtml(){ const only = TRG.only ? (W.projs || []).find(p => p.id === TRG.only) : null, ps = trPs(only), D = trDaily(ps), M = TRGM(), B = trBuckets(D.days, TRG.g, TRG.n), c = trCmp(D.days, D.start, TRG.n);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button type="button" data-act="trSet" data-k="${k}" data-v="${v}" aria-pressed="${String(TRG[k]) === String(v)}">${t}</button>`).join("")}</div>`;
  const f = typeof tfS === "function" ? tfS() : {}, fl = [only ? only.name : "", f.f ? ((ps.flatMap(p => p.funnels).find(x => x.id === f.f) || {}).name || "") : "", f.c || ""].filter(Boolean).join(" · ");
  const pct = c ? Math.round((c.a / c.b - 1) * 100) : 0;
  const rows = B.slice().reverse().slice(0, 62).map(b => `<tr${D.start && b.d2 >= D.start ? ' class="is-h"' : ""}><td>${esc(trLab(b, TRG.g))}</td><td>${esc(M.s.f(b.s))}</td><td>${num(b.l)}</td><td>${b.l ? esc(M.cpl.f(b.s / b.l)) : "—"}</td><td>${b.i ? esc(M.ctr.f(b.c / b.i)) : "—"}</td></tr>`).join("");
  return `<div class="trw"><div class="row sp"><div><span class="tag">${esc(fl || L("Уся реклама","Вся реклама"))}</span><h2>${L("Динаміка","Динамика")}</h2></div><button class="x" data-act="trOpen" data-v="close" aria-label="${L("Закрити","Закрыть")}">${ico("close")}</button></div>
    <div class="row trw__c">${seg("m", Object.keys(M).map(k => [k, M[k].t]))}${seg("g", [["d", L("Дні","Дни")], ["w", L("Тижні","Недели")], ["m", L("Місяці","Месяцы")]])}${seg("n", [[30, L("30 днів","30 дней")], [90, L("90 днів","90 дней")], [0, L("Усе","Все")]])}</div>
    ${c ? `<div class="trw__k"><div><span>${L("До Хіро","До Хиро")}${c.nB ? " · " + c.nB + L(" дн."," дн.") : ""}</span><b>${fxM(c.b)} $</b></div><div><span>${L("З Хіро","С Хиро")} · ${c.nA}${L(" дн."," дн.")}</span><b>${fxM(c.a)} $</b></div><div><span>${L("Різниця","Разница")}</span><b class="${pct < 0 ? "is-good" : pct > 0 ? "is-bad" : ""}">${pct > 0 ? "+" : ""}${pct}%</b></div></div>${c.nA < 7 ? `<p class="sub">${L("Хіро працює лише ","Хиро работает всего ")}${c.nA}${L(" дн. — порівняння попереднє."," дн. — сравнение предварительное.")}</p>` : ""}` : ""}
    ${D.load && !D.days.length ? `<div class="trm__sk trm__sk--big"></div>` : trSvg(B, TRG.m, D.start, {w:860, h:260, g:TRG.g, target:trTarget(ps)})}
    <div class="trw__t"><table class="tbl"><thead><tr><th>${TRG.g === "m" ? L("Місяць","Месяц") : TRG.g === "w" ? L("Тиждень","Неделя") : L("День","День")}</th><th>${M.s.t}</th><th>${M.l.t}</th><th>${M.cpl.t}</th><th>CTR</th></tr></thead><tbody>${rows}</tbody></table></div></div>`; }
Object.assign(ACT, {
  trOpen(d){ if (d.v === "close") { TRG.open = false; return; } TRG.open = true; TRG.only = d.v || ""; },
  trSet(d){ TRG[d.k] = d.k === "n" ? +d.v : d.v; if (d.k === "g" && d.v === "m" && TRG.n && TRG.n < 90) TRG.n = 0; if (d.k === "g" && d.v === "w" && TRG.n === 30) TRG.n = 90; },
});
if (typeof ACT !== "undefined") { const _co = ACT.closeOverlay; ACT.closeOverlay = function(d){ TRG.open = false; return _co ? _co.call(this, d) : undefined; }; }
if (typeof overlay === "function") { const _trOv = overlay; overlay = function(){ const r = _trOv(); return r || (TRG.open ? ["modal", trHtml()] : null); }; }
