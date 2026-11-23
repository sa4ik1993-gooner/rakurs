/* Раздел «Реклама» — те же данные, что на карте, но таблицами: кампании деревом (кампания → группы и объявления) с закреплённым сводом,
   креативы, вебинары, трекер, готовые отчёты. Фильтры строкой, сортировка по колонке, выгрузка в Excel (CSV).
   Плюс общие вещи для всех экранов: переключатель проекта (W.pf), шапка с периодом, цвет цены лида и легенда порогов.
   Подключается после tasks.js. */
const RK2 = {sort:"spend", dir:-1, open:{}, q:"", qc:"", plat:"", acc:"", fun:"", spendOnly:true, rep:"cpl"};
const RK_TABS = () => [["camp", L("Кампанії","Кампании")], ["cr", L("Креативи","Креативы")], ["web", L("Вебінари","Вебинары")], ["tr", L("Трекер","Трекер")], ["rep", L("Звіти","Отчёты")]];

/* ---------- переключатель проекта: все экраны показывают выбранный проект или все сразу ---------- */
const pfProjs = () => { const p = W.pf && W.projs.find(x => x.id === W.pf); return p ? [p] : W.projs; };
const pfOne = () => (W.pf && W.projs.find(x => x.id === W.pf)) || null;
const pfSel = () => W.projs.length > 1 ? `<select class="pfsel" data-pf="1" aria-label="${L("Проєкт","Проект")}"><option value="">${L("Усі проєкти","Все проекты")}</option>${W.projs.map(p => `<option value="${p.id}"${p.id === W.pf ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>` : "";
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.pf) { W.pf = t.value; save(); render(); } });

/* ---------- шапка: период, свежесть данных, обновить — одной строкой справа ---------- */
function prHeadR(){ if (!W.projs.some(prOn)) return ""; const r = prRange(), busy = W.projs.some(p => prOn(p) && fxOf(p).syncing), one = pfProjs().find(prOn) || W.projs.find(prOn);
  const md = [["t", L("Сьогодні","Сегодня")], ["y", L("Вчора","Вчера")], ["3", "3 " + L("дні","дня")], ["7", "7 " + L("днів","дней")], ["14", "14 " + L("днів","дней")], ["30", "30 " + L("днів","дней")], ["m", L("Цей місяць","Этот месяц")], ["c", L("Свої дати…","Свои даты…")]];
  return `<div class="phr"><select data-prm="1" aria-label="${L("Період","Период")}">${md.map(m => `<option value="${m[0]}"${String(PR.mode) === m[0] ? " selected" : ""}>${m[1]}</option>`).join("")}</select>
    ${PR.mode === "c" ? `<input type="date" id="pr-d1" value="${PR.d1 || r.d1}" max="${prToday()}" aria-label="${L("з","с")}"><input type="date" id="pr-d2" value="${PR.d2 || r.d2}" max="${prToday()}" aria-label="${L("по","по")}"><button class="btn btn--sm" data-act="prCustom">${L("Показати період","Показать период")}</button>` : `<span class="sub">${prLabel(r)}</span>`}
    ${prFresh(one)}<button class="btn btn--sm btn--main" data-act="prSync"${busy ? " disabled" : ""}>${ico("refresh")} ${busy ? L("Оновлюємо…","Обновляем…") : L("Оновити дані","Обновить данные")}</button></div>`; }
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.prm) { ACT.prMode({v:t.value}); render(); } });

/* ---------- цена лида цветом и легенда порогов (потолок воронки) ---------- */
const cplLv = (cpl, cap) => !cap || !cpl ? "" : cpl <= cap * 0.9 ? "good" : cpl <= cap ? "warn" : "crit";
const cplCell = (cpl, cap, cur) => cpl ? `<span class="cpl cpl--${cplLv(cpl, cap) || "n"}">${prM(cpl, cur)}</span>` : "—";
const cplLegend = (cap, cur) => cap ? `<div class="cplg"><span class="cpl cpl--good">≤ ${prM(cap * 0.9, cur)}</span><span class="cpl cpl--warn">${L("до ","до ")}${prM(cap, cur)}</span><span class="cpl cpl--crit">&gt; ${prM(cap, cur)}</span><small class="sub">${L("стеля ціни ліда воронки","потолок цены лида воронки")}</small></div>` : "";

/* ---------- выгрузка в Excel: CSV с «;» и BOM, Excel открывает сам ---------- */
function csvSave(name, rows){ const s = "﻿" + rows.map(r => r.map(v => { const t = v == null ? "" : String(v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(";")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([s], {type:"text/csv;charset=utf-8"})); a.download = name + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const csvN = v => typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : v;

/* ---------- данные: кампании всех выбранных проектов за период ---------- */
function rkRows(){ const out = []; let loading = false;
  pfProjs().filter(prOn).forEach(p => { prLoad(p); const x = prOf(p); if (!x.cur) { if (!x.err) loading = true; return; }
    x.cur.forEach(r => { const fid = fxFunnel(p, r), f = p.funnels.find(z => z.id === fid), sb2 = x.sb[fxKey(r.name)] || {}, acc = x.am ? prAccOf(x, r.id, r.prov) : "";
      out.push(Object.assign({p, x, f, fid, acc, accName:acc ? prAccName(p, acc, r.prov) : "", cap:f ? prCap(f, p) : 0, cur:prCur(p), book:sb2.book || 0, pay:sb2.pay || 0, rev:sb2.rev || 0}, r)); }); });
  return {rows:out, loading}; }
const rkSum = a => a.reduce((s, r) => { ["spend", "imp", "clicks", "leads", "book", "pay", "rev"].forEach(k => { s[k] += r[k] || 0; }); return s; }, {spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0});
const RK_COLS = () => [["spend", L("Витрати","Расход")], ["imp", L("Покази","Показы")], ["clicks", L("Кліки","Клики")], ["ctr", "CTR"], ["leads", L("Ліди","Лиды")], ["cpl", L("Ціна ліда","Цена лида")], ["book", L("Броні","Брони")], ["pay", L("Оплати","Оплаты")], ["rev", L("Виручка","Выручка")], ["roas", "ROAS"]];
const rkVal = (r, k) => k === "ctr" ? (r.imp ? r.clicks / r.imp : 0) : k === "cpl" ? (r.leads ? r.spend / r.leads : 0) : k === "roas" ? (r.spend && r.rev ? r.rev / r.spend : 0) : r[k] || 0;
const rkCells = (r, cap, cur) => RK_COLS().map(([k]) => { const v = rkVal(r, k);
  return `<td class="n mono">${k === "cpl" ? cplCell(v, cap, cur) : k === "ctr" ? (v ? prPct(v) : "—") : k === "roas" ? (v ? dec(v, 2) : "—") : k === "spend" || k === "rev" ? (v ? prM(v, cur) : "—") : num(v)}</td>`; }).join("");

function rkFilters(rows){ const accs = [...new Map(rows.filter(r => r.acc).map(r => [r.acc, r.accName])).entries()], funs = [...new Map(rows.filter(r => r.f).map(r => [r.fid, r.f.name])).entries()], plats = [...new Set(rows.map(r => r.prov))];
  const sel = (k, all, opts) => `<select data-rkf="${k}">${`<option value="">${all}</option>`}${opts.map(o => `<option value="${esc(o[0])}"${RK2[k] === o[0] ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
  return `<div class="rkf">${sel("plat", L("Усі майданчики","Все площадки"), plats.map(c => [c, chOf(c)[1]]))}${sel("acc", L("Усі акаунти","Все аккаунты"), accs)}${sel("fun", L("Усі воронки","Все воронки"), funs.concat([["-", L("Без воронки","Без воронки")]]))}
    <input data-rkq="q" value="${esc(RK2.q)}" placeholder="${L("назва кампанії містить…","название кампании содержит…")}"><input data-rkq="qc" value="${esc(RK2.qc)}" placeholder="${L("креатив містить…","креатив содержит…")}">
    <label class="row"><input type="checkbox" data-rkf="spendOnly"${RK2.spendOnly ? " checked" : ""}> ${L("лише з витратами","только с расходом")}</label></div>`; }
function rkFilter(rows){ const q = fxKey(RK2.q), qc = fxKey(RK2.qc);
  return rows.filter(r => (!RK2.plat || r.prov === RK2.plat) && (!RK2.acc || r.acc === RK2.acc) && (!RK2.fun || (RK2.fun === "-" ? !r.fid : r.fid === RK2.fun)) && (!q || fxKey(r.name).includes(q))
    && (!qc || (r.x.ads || []).some(a => a.cid === r.id && fxKey(a.name).includes(qc))) && (!RK2.spendOnly || r.spend > 0 || r.imp > 0)); }

/* ---------- кампании: дерево ---------- */
function rkCamp(){ const {rows, loading} = rkRows(); if (loading && !rows.length) return `<div class="panel">${prSkel()}</div>`;
  if (!rows.length) return empty(L("Даних про рекламу немає","Данных о рекламе нет"), L("Підключи рекламний кабінет у проєкті.","Подключи рекламный кабинет в проекте."));
  const list = rkFilter(rows).sort((a, b) => (rkVal(a, RK2.sort) - rkVal(b, RK2.sort)) * RK2.dir), tot = rkSum(list), cur = list.length && list.every(r => r.cur === list[0].cur) ? list[0].cur : "";
  const caps = [...new Set(list.map(r => r.cap).filter(Boolean))], cap1 = caps.length === 1 ? caps[0] : 0;
  const head = `<tr><th>${L("Назва","Название")}</th><th>${L("Воронка","Воронка")}</th>${RK_COLS().map(([k, t]) => `<th class="n"><button type="button" class="sortb" data-act="rkSort" data-v="${k}" aria-pressed="${RK2.sort === k}">${t}${RK2.sort === k ? (RK2.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`).join("")}</tr>`;
  const body = list.map(r => { const op = RK2.open[r.id], kids = op ? (r.x.sets || []).filter(o => o.cid === r.id && (o.spend || o.imp)).map(o => ({t:"g", o})).concat((r.x.ads || []).filter(o => o.cid === r.id && (o.spend || o.imp)).map(o => ({t:"a", o}))) : [];
    return `<tr class="rkc"><td><button type="button" class="mlt" data-act="rkOpen" data-v="${esc(r.id)}" aria-expanded="${!!op}">${op ? `<span class="chev">${ico("chevron")}</span>` : `<span class="chev chev--r">${ico("chevron")}</span>`}</button> <button type="button" class="lnk" data-act="prGo" data-k="${esc("co/" + r.p.id + "/" + (r.fid || "-") + "/" + r.prov + "/" + prAK(r.acc) + "/" + r.id)}">${typeof chIcon === "function" ? chIcon(r.prov) : ""}${esc(r.name)}</button> <small class="sub">${esc(chOf(r.prov)[1])}${r.accName ? " · " + esc(r.accName) : ""}</small></td><td class="sub">${r.f ? esc(r.f.name) : "—"}</td>${rkCells(r, r.cap, r.cur)}</tr>`
      + kids.map(k => `<tr class="rkk"><td><span class="rkt">${k.t === "g" ? L("група","группа") : L("оголошення","объявление")}</span> <span class="nm">${esc(k.o.name)}</span></td><td></td>${rkCells(k.o, r.cap, r.cur)}</tr>`).join(""); }).join("");
  const hero = tot.leads && cur ? `<div class="hero">${prHero(tot.spend / tot.leads, 0, cur, cap1)}<div class="kpis">${prKpi(L("Витрати","Расход"), prM(tot.spend, cur))}${prKpi(L("Лідів","Лидов"), num(tot.leads))}${tot.pay ? prKpi(L("Оплат","Оплат"), num(tot.pay)) : ""}${tot.rev && tot.spend ? prKpi("ROAS", dec(tot.rev / tot.spend, 2)) : ""}</div></div>` : "";
  return `${hero}<div class="panel rk">${rkFilters(rows)}<div class="row sp"><span class="sub">${L("Кампаній: ","Кампаний: ")}${list.length}</span><span class="row">${cplLegend(cap1, cur)}<button type="button" class="btn btn--sm" data-act="rkCsv" data-v="camp">${ico("export")} ${L("Вивантажити в Excel","Выгрузить в Excel")}</button></span></div>
    <div class="tw rktw"><table><thead>${head}<tr class="sum"><td><b>${L("Загальний підсумок","Общий итог")}</b></td><td></td>${rkCells(tot, cap1, cur)}</tr></thead><tbody>${body}</tbody></table></div></div>`; }

/* ---------- креативы: объявления сведены по базовому имени (версии _v2, _s — один креатив) ---------- */
function rkCrRows(){ const {rows, loading} = rkRows(), by = {}, ok = new Set(rkFilter(rows).map(r => r.id));
  rows.forEach(r => { if (!ok.has(r.id)) return; (r.x.ads || []).filter(a => a.cid === r.id).forEach(a => { const k = (typeof rsBase === "function" ? rsBase(a.name) : a.name) || a.name, t = by[k] = by[k] || {name:k, vers:new Set(), camps:new Set(), spend:0, imp:0, clicks:0, leads:0, caps:new Set(), cur:r.cur};
    t.vers.add(a.name); t.camps.add(r.name); ["spend", "imp", "clicks", "leads"].forEach(z => { t[z] += a[z] || 0; }); if (r.cap) t.caps.add(r.cap); }); });
  const qc = fxKey(RK2.qc); return {list:Object.values(by).filter(c => (!qc || fxKey(c.name).includes(qc)) && (c.spend || c.imp)).map(c => Object.assign(c, {cap:c.caps.size === 1 ? [...c.caps][0] : 0})), loading}; }
function rkCr(){ const {list, loading} = rkCrRows(), {rows} = rkRows(); if (loading && !list.length) return `<div class="panel">${prSkel()}</div>`;
  const s = list.sort((a, b) => (rkVal(a, RK2.sort) - rkVal(b, RK2.sort)) * RK2.dir), cur = s.length ? s[0].cur : "", caps = [...new Set(s.map(c => c.cap).filter(Boolean))];
  const cols = [["spend", L("Витрати","Расход")], ["imp", L("Покази","Показы")], ["ctr", "CTR"], ["leads", L("Ліди","Лиды")], ["cpl", L("Ціна ліда","Цена лида")]];
  return `<div class="panel rk">${rkFilters(rows)}<div class="row sp"><span class="sub">${L("Креативів: ","Креативов: ")}${s.length}</span><span class="row">${cplLegend(caps.length === 1 ? caps[0] : 0, cur)}<button type="button" class="btn btn--sm" data-act="rkCsv" data-v="cr">${ico("export")} ${L("Вивантажити в Excel","Выгрузить в Excel")}</button></span></div>
    <div class="tw rktw"><table><thead><tr><th>${L("Креатив","Креатив")}</th><th class="n">${L("Кампаній","Кампаний")}</th>${cols.map(([k, t]) => `<th class="n"><button type="button" class="sortb" data-act="rkSort" data-v="${k}" aria-pressed="${RK2.sort === k}">${t}${RK2.sort === k ? (RK2.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`).join("")}</tr></thead><tbody>
    ${s.map(c => { const cpl = rkVal(c, "cpl"), ctr = rkVal(c, "ctr"); return `<tr><td class="nm">${esc(c.name)}${c.vers.size > 1 ? ` <small class="sub">${L("версій: ","версий: ")}${c.vers.size}</small>` : ""}</td><td class="n mono">${c.camps.size}</td><td class="n mono">${prM(c.spend, c.cur)}</td><td class="n mono">${num(c.imp)}</td><td class="n mono">${ctr ? prPct(ctr) : "—"}</td><td class="n mono">${num(c.leads)}</td><td class="n mono">${cplCell(cpl, c.cap, c.cur)}</td></tr>`; }).join("")}</tbody></table></div></div>`; }

/* ---------- вебинары и трекер: те же блоки, что в воронках, собраны в одном месте ---------- */
function rkWeb(){ const ps = pfProjs(); let out = "";
  ps.forEach(p => { if (typeof fxStart === "function") fxStart(p); const x = fxOf(p), h = typeof fxCohorts === "function" ? fxCohorts(p, x) : ""; if (h) out += `<div class="panel"><span class="tag">${esc(p.name)}</span>${h}</div>`; });
  return out || empty(L("Даних про вебінари немає","Данных о вебинарах нет"), L("Вони з’являться після завантаження продажів (Підключення → Джерела даних): брони й оплати за датою вебінару.","Они появятся после загрузки продаж (Подключения → Источники данных): брони и оплаты по дате вебинара.")); }
function rkTr(){ let out = ""; pfProjs().forEach(p => p.funnels.forEach(f => { const h = typeof trReport === "function" ? trReport(p, f) : ""; if (h) out += `<div class="rktr"><span class="tag">${esc((pfProjs().length > 1 ? p.name + " · " : "") + f.name)}</span>${h}</div>`; }));
  return out || empty(L("Трекер ще не стоїть на сайті","Трекер ещё не стоит на сайте"), L("Код трекера — у проєкті: Підключення → Трекер HEYROW.","Код трекера — в проекте: Подключения → Трекер HEYROW.")); }

/* ---------- отчёты: готовый текст за период — скопировать или переслать в Telegram (отправляет сам человек) ---------- */
const RK_REPS = () => [["cpl", L("Ціна ліда по кампаніях","Цена лида по кампаниям")], ["cr", L("Ефективність креативів","Эффективность креативов")], ["cpo", L("Ціна оплати по кампаніях","Цена оплаты по кампаниям")]];
function rkRepText(){ const r = prRange(), {rows} = rkRows(), list = rkFilter(rows).filter(x => x.spend > 0), lines = [], t = RK_REPS().find(x => x[0] === RK2.rep)[1];
  lines.push(t + " · " + prLabel(r) + (pfOne() ? " · " + pfOne().name : ""));
  const tot = rkSum(list), cur = list.length ? list[0].cur : "";
  lines.push(L("Разом: ","Итого: ") + prM(tot.spend, cur) + ", " + num(tot.leads) + L(" лідів"," лидов") + (tot.leads ? L(" по "," по ") + prM(tot.spend / tot.leads, cur) : "") + (tot.pay ? ", " + num(tot.pay) + L(" оплат"," оплат") : ""));
  const mark = (v, cap) => ({good:L("[у плані]","[в плане]"), warn:L("[трохи вище]","[чуть выше]"), crit:L("[дорого]","[дорого]")})[cplLv(v, cap)] || "[—]";
  if (RK2.rep === "cpl") list.sort((a, b) => b.spend - a.spend).slice(0, 25).forEach(x => { const c = rkVal(x, "cpl"); lines.push(mark(c, x.cap) + " " + x.name + " — " + prM(x.spend, x.cur) + ", " + num(x.leads) + L(" лідів"," лидов") + (c ? L(" по "," по ") + prM(c, x.cur) : "")); });
  if (RK2.rep === "cpo") list.filter(x => x.pay).sort((a, b) => a.spend / a.pay - b.spend / b.pay).slice(0, 25).forEach(x => lines.push(x.name + " — " + num(x.pay) + L(" оплат, ціна оплати "," оплат, цена оплаты ") + prM(x.spend / x.pay, x.cur) + (x.rev ? ", ROAS " + dec(x.rev / x.spend, 2) : "")));
  if (RK2.rep === "cpo" && !list.some(x => x.pay)) lines.push(L("Оплат за період немає — завантаж продажі.","Оплат за период нет — загрузи продажи."));
  if (RK2.rep === "cr") rkCrRows().list.filter(c => c.spend > 0).sort((a, b) => (a.leads ? a.spend / a.leads : 1e9) - (b.leads ? b.spend / b.leads : 1e9)).slice(0, 25).forEach(c => { const v = rkVal(c, "cpl"); lines.push(mark(v, c.cap) + " " + c.name + " — " + prM(c.spend, c.cur) + ", " + num(c.leads) + L(" лідів"," лидов") + (v ? L(" по "," по ") + prM(v, c.cur) : "")); });
  return lines.join("\n"); }
function rkRep(){ const txt = rkRepText();
  return `<div class="panel rk"><div class="row rkr"><select data-rkr="1" aria-label="${L("Звіт","Отчёт")}">${RK_REPS().map(x => `<option value="${x[0]}"${RK2.rep === x[0] ? " selected" : ""}>${x[1]}</option>`).join("")}</select>
      <button type="button" class="btn btn--sm" data-act="rkRepCopy">${L("Скопіювати","Скопировать")}</button><a class="btn btn--sm btn--solid" href="https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${L("Надіслати в Telegram","Отправить в Telegram")}</a></div>
    <p class="sub">${L("Звіт за період і фільтри з вкладки «Кампанії». Telegram відкриється з готовим текстом — обери, кому надіслати.","Отчёт за период и фильтры со вкладки «Кампании». Telegram откроется с готовым текстом — выбери, кому отправить.")}</p>
    <pre class="rkpre" id="rk-rep">${esc(txt)}</pre></div>`; }

function vAds(){ const t = RK_TABS().some(x => x[0] === W.atab) ? W.atab : "camp";
  if (!W.projs.some(prOn)) return empty(L("Рекламний кабінет не підключено","Рекламный кабинет не подключён"), L("Підключи Meta Ads у проєкті — тут з’являться кампанії, креативи й звіти.","Подключи Meta Ads в проекте — здесь появятся кампании, креативы и отчёты.")) + (W.projs[0] ? `<div class="row"><button class="btn btn--solid" data-act="mapConn" data-id="${W.projs[0].id}">${L("Підключити","Подключить")}</button></div>` : "");
  return `<div class="seg seg--f" role="group" aria-label="${L("Розділи реклами","Разделы рекламы")}">${RK_TABS().map(x => `<button type="button" data-act="rkTab" data-v="${x[0]}" aria-pressed="${t === x[0]}">${x[1]}</button>`).join("")}</div>
    ${({camp:rkCamp, cr:rkCr, web:rkWeb, tr:rkTr, rep:rkRep})[t]()}`; }

let rkT = 0;
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return;
  if (t.dataset.rkf) { RK2[t.dataset.rkf] = t.type === "checkbox" ? t.checked : t.value; render(); }
  if (t.dataset.rkr) { RK2.rep = t.value; render(); } });
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.rkq) return; RK2[t.dataset.rkq] = t.value;
  clearTimeout(rkT); rkT = setTimeout(() => { const k = t.dataset.rkq, pos = t.selectionStart; render(); const el = document.querySelector(`[data-rkq="${k}"]`); if (el) { el.focus({preventScroll:true}); try { el.setSelectionRange(pos, pos); } catch (_e) { /* */ } } }, 350); });
Object.assign(ACT, {
  rkTab(d){ W.atab = d.v; save(); },
  rkSort(d){ if (RK2.sort === d.v) RK2.dir = -RK2.dir; else { RK2.sort = d.v; RK2.dir = d.v === "cpl" ? 1 : -1; } },
  rkOpen(d){ RK2.open[d.v] = !RK2.open[d.v]; },
  rkCsv(d){ const r = prRange(), nm = "heyrow_" + (d.v === "cr" ? "creatives" : "campaigns") + "_" + r.d1 + "_" + r.d2;
    if (d.v === "cr") { const {list} = rkCrRows(); csvSave(nm, [[L("Креатив","Креатив"), L("Кампаній","Кампаний"), L("Витрати","Расход"), L("Покази","Показы"), "CTR", L("Ліди","Лиды"), L("Ціна ліда","Цена лида")]].concat(list.map(c => [c.name, c.camps.size, csvN(c.spend), c.imp, csvN(rkVal(c, "ctr") * 100), c.leads, csvN(rkVal(c, "cpl"))]))); return false; }
    const {rows} = rkRows(), list = rkFilter(rows);
    csvSave(nm, [[L("Проєкт","Проект"), L("Кампанія","Кампания"), L("Майданчик","Площадка"), L("Акаунт","Аккаунт"), L("Воронка","Воронка")].concat(RK_COLS().map(c => c[1]))].concat(list.map(x => [x.p.name, x.name, chOf(x.prov)[1], x.accName, x.f ? x.f.name : ""].concat(RK_COLS().map(([k]) => csvN(k === "ctr" ? rkVal(x, k) * 100 : rkVal(x, k))))))); return false; },
  rkRepCopy(){ const t = rkRepText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(L("Звіт скопійовано","Отчёт скопирован")), () => toast(L("Виділи текст і скопіюй вручну","Выдели текст и скопируй вручную"))); return false; },
});
