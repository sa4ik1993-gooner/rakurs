/* Факт рекламы: расход, лиды и цена лида из подключённого кабинета, сведённые по каналам и воронкам.
   Данные лежат на сервере (таблица ad_metrics), кабинет получает готовые суммы по кампаниям.
   Загрузка из Meta идёт по кнопке и сама — при открытии проекта, если данные старше 12 часов.
   Подключается перед ws.js. */
const FACT = {};   /* по проекту: {days, rows, at, synced, loading, syncing, err, tried} */
const fxOf = p => (FACT[p.id] = FACT[p.id] || {days:7, rows:null, at:0, synced:null, loading:false, syncing:false, err:"", tried:false});
const fxM = n => { const t = (+n || 0).toFixed(2).split("."); return num(+t[0]) + "," + t[1]; };
const fxDay = d => d.toISOString().slice(0, 10);
/* сколько дней охватывает выбранный период; «m» — календарный месяц с первого числа по сегодня */
const fxSpan = x => x.days === "m" ? new Date().getDate() : x.days;
const fxWhen = t => { if (!t) return L("ще не оновлювалося","еще не обновлялось"); const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); return m < 2 ? L("щойно","только что") : m < 90 ? m + L(" хв тому"," мин назад") : m < 36 * 60 ? Math.round(m / 60) + L(" год тому"," ч назад") : Math.round(m / 1440) + L(" дн. тому"," дн. назад"); };
const fxErr = d => /ad_summary|ad_metrics|schema cache|does not exist|PGRST/i.test(String(d)) ? L("Аналітику на сервері ще не увімкнено: потрібно запустити schema_metrics.sql.","Аналитика на сервере еще не включена: нужно запустить schema_metrics.sql.") : L("Не вдалося отримати дані: ","Не удалось получить данные: ") + d;
/* читает сводку за период */
async function fxLoad(p){ const x = fxOf(p); if (!CLOUD || !sb || x.loading) return; x.loading = true; x.err = "";
  try { const r = await sb.rpc("ad_summary", {p:p.id, d1:fxDay(new Date(Date.now() - (fxSpan(x) - 1) * 86400000)), d2:fxDay(new Date())});
    const d1 = fxDay(new Date(Date.now() - (fxSpan(x) - 1) * 86400000)), d2 = fxDay(new Date()); x.sales = null;
    try { const sr = await sb.rpc("sales_summary", {p:p.id, d1, d2}); if (!sr.error) x.sales = (sr.data || []).map(o => ({kind:o.kind, k:fxKey(o.utm_campaign), n:fxKey(o.utm_content), cur:o.currency || "", ev:+o.events || 0, amt:+o.amount || 0})); } catch (e) {}
    x.coh = null; x.lag = null; try { const cr = await sb.rpc("sales_cohorts", {p:p.id, d1:fxDay(new Date(Date.now() - 60 * 86400000)), d2}); if (!cr.error) x.coh = cr.data || [];
      const lr = await sb.rpc("sales_lag", {p:p.id}); if (!lr.error) x.lag = lr.data || []; } catch (e) {}
    x.sets = null; try { const gr = await sb.rpc("ad_adsets", {p:p.id, d1, d2}); if (!gr.error) x.sets = (gr.data || []).map(o => ({cid:o.campaign_id, id:o.adset_id, name:o.adset_name || o.adset_id || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); } catch (e) {}
    x.ads = null; try { const ar = await sb.rpc("ad_creatives", {p:p.id, d1, d2}); if (!ar.error) x.ads = (ar.data || []).map(o => ({cid:o.campaign_id, k:fxKey(o.campaign_name), name:o.ad_name || "", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); } catch (e) {}
    if (r.error) x.err = fxErr(r.error.message); else { x.rows = (r.data || []).map(o => ({prov:PROV_CH[o.provider] || o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); x.at = Date.now(); } }
  catch (e) { x.err = fxErr(e && e.message); }
  x.loading = false; render(); }
/* тянет свежую статистику из Meta на сервер, затем перечитывает сводку */
async function fxSync(p, manual){ const x = fxOf(p); if (x.syncing) return; x.syncing = true; x.err = ""; if (manual) render();
  const d = await mtCall({action:"sync", project_id:p.id, days:Math.max(7, fxSpan(x) + 1)});
  x.syncing = false;
  if (!d.ok) { x.err = d.error === "meta" || d.error === "not_connected" ? mtErr(d) : fxErr(d.detail || d.error); if (d.error === "meta") mtHealth(p, false); render(); return; }
  x.synced = d.synced_at; x.cover = Math.max(x.cover || 0, Math.max(7, fxSpan(x))); if (manual) toast(L("Дані оновлено: кампаній ","Данные обновлены: кампаний ") + d.campaigns + (d.unmatched ? L(", без воронки ",", без воронки ") + d.unmatched : ""));
  await fxLoad(p); }
/* первый показ за сессию: узнаём, когда обновлялось, и решаем — обновить или просто прочитать */
function fxStart(p){ const x = fxOf(p); if (x.tried || !CLOUD || !sb || !p.meta || !p.meta.conn) return; x.tried = true; x.loading = true;
  mtCall({action:"status", project_id:p.id}).then(d => { x.loading = false; x.synced = d.ok && d.conn ? d.conn.synced_at : null;
    if (!x.synced || Date.now() - new Date(x.synced).getTime() > 12 * 3600 * 1000) fxSync(p, false); else fxLoad(p); }); }
/* кампания → воронка: ручная привязка в проекте главнее той, что определил сервер по названию */
/* Если по названию воронка не нашлась, а в проекте она одна — кампания относится к ней: платформа не прячет расход из-за названия.
   Снять можно ручной привязкой «не относится» в проекте. fxAuto — признак, что воронку поставили мы сами. */
/* Правила аккаунта (p.accRules["meta:222"] = [{inc, exc, f}]): какие кампании этого рекламного аккаунта в какую воронку.
   У каждого аккаунта (подрядчика) свои названия, поэтому правила задаются в аккаунте, а не в воронке.
   Правило: в названии есть одно из слов «содержит» (пусто — любая кампания) и нет ни одного из «не содержит». Первое подошедшее правило выигрывает.
   Порядок: ручная привязка кампании → правила её аккаунта → воронка от сервера → единственная воронка проекта.
   Если у аккаунта есть правила, а кампания ни под одно не подошла — она «без воронки». Аккаунты без правил работают как раньше. */
const fxWords = s => String(s || "").split(/[,;\n]+/).map(x => fxKey(x)).filter(Boolean);
const fxAccOf = (p, r) => String(r.acc || (typeof prOn === "function" && prOn(p) && typeof prAccOf === "function" ? prAccOf(prOf(p), r.id, r.prov || "meta") : "") || "");
const fxRK = (c, acc) => (c || "meta") + ":" + acc;
const fxRules = (p, c, acc) => ((p.accRules || {})[fxRK(c, acc)] || []);
const fxRuleOk = (ru, name) => { const n = fxKey(name), inc = fxWords(ru.inc), exc = fxWords(ru.exc); return (!inc.length || inc.some(w => n.includes(w))) && !exc.some(w => n.includes(w)); };
const fxRuleOf = (p, r) => { const acc = fxAccOf(p, r); if (!acc) return null; const rs = fxRules(p, r.prov || "meta", acc).filter(ru => ru.f && p.funnels.some(f => f.id === ru.f)); if (!rs.length) return null;
  const m = r.name ? rs.find(ru => fxRuleOk(ru, r.name)) : null; return m ? m.f : ""; };
/* по одному названию кампании (трекер: метка utm_campaign, аккаунт неизвестен) — правила со словами из всех аккаунтов */
function fxByName(p, name){ if (!name) return ""; const all = Object.values(p.accRules || {}).flat().filter(ru => ru.f && fxWords(ru.inc).length && p.funnels.some(f => f.id === ru.f));
  const m = all.find(ru => fxRuleOk(ru, name)); return m ? m.f : ""; }
const fxAuto = (p, r) => !(p.campMap || {})[r.id] && fxRuleOf(p, r) === null && !p.funnels.some(f => f.id === r.f) && p.funnels.length === 1;
const fxFunnel = (p, r) => { const m = (p.campMap || {})[r.id]; if (m) return m === "-" ? "" : m;
  const ru = fxRuleOf(p, r); if (ru !== null) return ru;
  return p.funnels.some(f => f.id === r.f) ? r.f : p.funnels.length === 1 ? p.funnels[0].id : ""; };

function fxMatchRows(p){ if (typeof prOn === "function" && prOn(p)) { const x = prOf(p); if (x.cur) return x.cur; } const y = typeof fxOf === "function" ? fxOf(p) : null; return (y && y.rows) || []; }
const fxSp = a => a.reduce((s, r) => s + (+r.spend || 0), 0);
const fxHelp = () => hint(L("У кожного акаунта (підрядника) свої назви кампаній, тому правила задаються в акаунті. Обери воронку, впиши слово з назви кампанії, обери «містить» або «не містить» і натисни «+». Кампанія йде у воронку, якщо в назві є хоча б одне слово зі «Містить» (порожньо — будь-яка) і немає жодного з «Не містить». Регістр не важливий. Якщо правила є, а кампанія не підійшла під жодне — вона «без воронки». Ручна прив’язка кампанії важливіша за правила.","У каждого аккаунта (подрядчика) свои названия кампаний, поэтому правила задаются в аккаунте. Выбери воронку, впиши слово из названия кампании, выбери «содержит» или «не содержит» и нажми «+». Кампания идет в воронку, если в названии есть хотя бы одно слово из «Содержит» (пусто — любая) и нет ни одного из «Не содержит». Регистр не важен. Если правила есть, а кампания не подошла ни под одно — она «без воронки». Ручная привязка кампании важнее правил."), "wide");
/* на карте, в панели аккаунта */
function fxAccPanel(p, c, acc){ if (!acc || !own()) return ""; return `<div class="panel fm"><div class="row sp"><span class="tag">${L("Які кампанії акаунта в яку воронку","Какие кампании аккаунта в какую воронку")}</span>${fxHelp()}</div>${fxAccRules(p, c, acc)}</div>`; }
/* в целях воронки: правила всех аккаунтов проекта */
function fxMatchPanel(p, f){ if (typeof PR_CH === "undefined" || typeof prAccs !== "function") return "";
  const accs = PR_CH.flatMap(c => prAccs(p, c).map(a => ({c, id:String(a.id), name:a.name || a.id}))); if (!accs.length) return "";
  const mine = fxMatchRows(p).filter(r => r.name && fxFunnel(p, r) === f.id);
  return `<div class="panel fm"><div class="row sp"><span class="tag">${L("Які кампанії належать до воронки","Какие кампании относятся к воронке")} · ${mine.length} · ${num(fxSp(mine))} $</span>${fxHelp()}</div>
    ${accs.map(a => { const n = fxRules(p, a.c, a.id).length; return `<details class="ard"${accs.length === 1 ? " open" : ""}><summary><b>${esc(a.name)}</b> <span class="sub">${n ? n + L(" правил"," правил") : L("без правил","без правил")}</span></summary>${fxAccRules(p, a.c, a.id)}</details>`; }).join("")}</div>`; }
/* редактор правил аккаунта: выбрали воронку → ввели слово → «містить» или «не містить» → «+» (или Enter) — слово попало в столбец.
   Подсказки — частые слова из названий кампаний аккаунта; добавляются в тот столбец, что выбран переключателем. */
const AR = {f:{}, mode:{}};
function arRule(p, k, fid, make){ p.accRules = p.accRules || {}; const rs = p.accRules[k] = p.accRules[k] || []; let r = rs.find(x => x.f === fid);
  if (!r && make) { r = {inc:"", exc:"", f:fid}; rs.push(r); } return r; }
function arTidy(p, k){ const rs = (p.accRules || {})[k]; if (!rs) return; const keep = rs.filter(r => r.all || fxWords(r.inc).length || fxWords(r.exc).length); if (keep.length) p.accRules[k] = keep; else delete p.accRules[k]; }
function fxAccRules(p, c, acc){ const k = fxRK(c, acc), rs = fxRules(p, c, acc), fs = p.funnels, rows = fxMatchRows(p).filter(r => r.name && (r.prov || "meta") === c && fxAccOf(p, r) === acc);
  if (!fs.length) return `<p class="sub">${L("Спершу додай воронку.","Сначала добавь воронку.")}</p>`;
  const fid = fs.some(f => f.id === AR.f[k]) ? AR.f[k] : ((rs.find(r => fs.some(f => f.id === r.f)) || {}).f || fs[0].id), mode = AR.mode[k] || "inc", ru = rs.find(r => r.f === fid) || {inc:"", exc:""};
  const inc = fxWords(ru.inc), exc = fxWords(ru.exc), used = inc.concat(exc);
  const cnt = {}; rows.forEach(r => [...new Set(String(r.name).split(/[_\s|.\-]+/).filter(t => t.length >= 2 && !/^\d+$/.test(t)).map(t => t.toUpperCase()))].forEach(t => { cnt[t] = (cnt[t] || 0) + 1; }));
  const sug = Object.keys(cnt).filter(t => cnt[t] >= 2 && !used.includes(fxKey(t))).sort((a, b) => cnt[b] - cnt[a]).slice(0, 10);
  const chip = (w, fld) => `<span class="arc arc--${fld}">${esc(w.toUpperCase())}<button type="button" data-act="arWordDel" data-p="${p.id}" data-k="${esc(k)}" data-f="${fid}" data-fld="${fld}" data-v="${esc(w)}" aria-label="${L("Прибрати слово ","Убрать слово ")}${esc(w)}">${ico("close")}</button></span>`;
  const inF = rows.filter(r => fxFunnel(p, r) === fid), outF = rows.filter(r => fxFunnel(p, r) !== fid);
  const list = (a, other) => `<ul>${a.slice().sort((x, y) => (+y.spend || 0) - (+x.spend || 0)).slice(0, 10).map(r => { const f2 = other ? fs.find(f => f.id === fxFunnel(p, r)) : null;
    return `<li class="nm">${esc(r.name)} <span class="sub">${num(+r.spend || 0)} $${f2 ? " · " + esc(f2.name) : ""}</span></li>`; }).join("")}${a.length > 10 ? `<li class="sub">${L("ще ","еще ")}${a.length - 10}</li>` : ""}</ul>`;
  const other = rs.filter(r => r.f !== fid && fs.some(f => f.id === r.f));
  return `<div class="ar" data-p="${p.id}" data-k="${esc(k)}">
    ${fs.length > 1 ? `<div class="row arf"><span class="lbl">${L("Воронка","Воронка")}</span><div class="opts opts--sm">${fs.map(f => { const n = (rs.find(r => r.f === f.id) ? fxWords(rs.find(r => r.f === f.id).inc).length + fxWords(rs.find(r => r.f === f.id).exc).length : 0);
      return `<button type="button" class="opt" data-act="arPickF" data-k="${esc(k)}" data-v="${f.id}" aria-pressed="${f.id === fid}">${esc(f.name)}${n ? ` <small class="sub">${n}</small>` : ""}</button>`; }).join("")}</div></div>` : ""}
    <div class="row ari"><input id="ar-w-${esc(k)}" data-arw="${esc(k)}" placeholder="${L("слово з назви кампанії, напр. MOD","слово из названия кампании, напр. MOD")}" aria-label="${L("Слово","Слово")}" autocomplete="off">
      <span class="seg" role="group" aria-label="${L("Умова","Условие")}"><button type="button" data-act="arMode" data-k="${esc(k)}" data-v="inc" aria-pressed="${mode === "inc"}">${L("містить","содержит")}</button><button type="button" data-act="arMode" data-k="${esc(k)}" data-v="exc" aria-pressed="${mode === "exc"}">${L("не містить","не содержит")}</button></span>
      <button type="button" class="btn btn--sm btn--solid" data-act="arWordAdd" data-p="${p.id}" data-k="${esc(k)}" data-f="${fid}">+ ${L("Додати","Добавить")}</button></div>
    ${sug.length ? `<div class="opts opts--sm ars"><small class="sub">${mode === "inc" ? L("підказки → містить:","подсказки → содержит:") : L("підказки → не містить:","подсказки → не содержит:")}</small>${sug.map(t => `<button type="button" class="opt" data-act="arWordAdd" data-p="${p.id}" data-k="${esc(k)}" data-f="${fid}" data-v="${esc(t)}">+ ${esc(t)} <small class="sub">${cnt[t]}</small></button>`).join("")}</div>` : ""}
    <div class="c2 arw"><div><b>${L("Містить","Содержит")}</b> <small class="sub">${L("хоча б одне","хотя бы одно")}</small><div class="arcs">${inc.length ? inc.map(w => chip(w, "inc")).join("") : `<span class="sub">${L("порожньо — будь-яка кампанія акаунта","пусто — любая кампания аккаунта")}</span>`}</div></div>
      <div><b>${L("Не містить","Не содержит")}</b> <small class="sub">${L("жодного","ни одного")}</small><div class="arcs">${exc.length ? exc.map(w => chip(w, "exc")).join("") : `<span class="sub">—</span>`}</div></div></div>
    ${inc.length || exc.length ? "" : `<p class="sub">${L("Слів ще немає — кампанії акаунта розподіляються як раніше.","Слов еще нет — кампании аккаунта распределяются как раньше.")}</p>`}
    ${rows.length ? `<div class="c2 fml"><div><b>${L("Входить у ","Входит в ")}${esc((fs.find(f => f.id === fid) || {}).name || "")}: ${inF.length}</b> <span class="sub">${num(fxSp(inF))} $</span>${list(inF, false)}</div><div><b>${L("Не входить","Не входит")}: ${outF.length}</b> <span class="sub">${num(fxSp(outF))} $</span>${list(outF, true)}</div></div>` : ""}
    ${other.length ? `<p class="sub">${L("Інші воронки цього акаунта: ","Другие воронки этого аккаунта: ")}${other.map(r => esc((fs.find(f => f.id === r.f) || {}).name) + " (" + [fxWords(r.inc).join(", "), fxWords(r.exc).length ? L("крім ","кроме ") + fxWords(r.exc).join(", ") : ""].filter(Boolean).join("; ") + ")").join(" · ")}</p>` : ""}</div>`; }
const arProj = id => W.projs.find(x => x.id === id) || P();
function arAddWord(pid, k, fid, w){ const p = arProj(pid); w = String(w || "").trim(); if (!p || !w) return false; const mode = AR.mode[k] || "inc", r = arRule(p, k, fid, true), cur = fxWords(r[mode]);
  w.split(/[,;]+/).map(x => x.trim()).filter(Boolean).forEach(x => { if (!cur.includes(fxKey(x))) { cur.push(fxKey(x)); } });
  r[mode] = cur.join(", "); arTidy(p, k); save(); return true; }
document.addEventListener("keydown", e => { const t = e.target; if (e.key !== "Enter" || !t.dataset || !t.dataset.arw) return; e.preventDefault();
  const w = t.closest(".ar"), btn = w && w.querySelector("[data-act=arWordAdd]:not([data-v])"); if (!btn) return; const k = t.dataset.arw;
  if (arAddWord(btn.dataset.p, k, btn.dataset.f, t.value)) { render(); setTimeout(() => { const el = document.getElementById("ar-w-" + k); if (el) el.focus({preventScroll:true}); }, 0); } });
Object.assign(ACT, {
  arPickF(d){ AR.f[d.k] = d.v; },
  arMode(d){ AR.mode[d.k] = d.v; setTimeout(() => { const el = document.getElementById("ar-w-" + d.k); if (el) el.focus({preventScroll:true}); }, 0); },
  arWordAdd(d){ const v = d.v || ((document.getElementById("ar-w-" + d.k) || {}).value || ""); if (!v.trim()) { const el = document.getElementById("ar-w-" + d.k); if (el) el.focus({preventScroll:true}); return false; }
    arAddWord(d.p, d.k, d.f, v); setTimeout(() => { const el = document.getElementById("ar-w-" + d.k); if (el && !d.v) el.focus({preventScroll:true}); }, 0); },
  arWordDel(d){ const p = arProj(d.p); if (!p) return false; const r = arRule(p, d.k, d.f, false); if (!r) return false; r[d.fld] = fxWords(r[d.fld]).filter(w => w !== d.v).join(", "); arTidy(p, d.k); save(); },
});
const fxSum = rows => rows.reduce((a, r) => { a.spend += r.spend; a.imp += r.imp; a.clicks += r.clicks; a.leads += r.leads; a.book += r.book || 0; a.pay += r.pay || 0; a.rev += r.rev || 0; return a; }, {spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0});
/* название кампании и метка из таблицы приводятся к одному виду: Meta и таблицы хранят одни и те же буквы по-разному */
const fxKey = t => String(t || "").normalize("NFC").toLowerCase().trim();
/* версии одного ролика сводятся к базовому имени: хвосты _v, _v2, _s, _s_v3 и дата вида П06.26 срезаются */
const fxBase = t => { let s = fxKey(t), was; do { was = s; s = s.replace(/[_\s-]+[a-zа-яіїє]?\d{2}\.\d{2}$/i, "").replace(/[_\s-]+(v\d*|s)$/i, ""); } while (s !== was && s); return s || fxKey(t); };
/* креативы воронки: расход из кабинета и продажи из файлов. Продажа относится к ролику только внутри своей кампании. */
function fxCreatives(p, x, rows, f){ if (!x.ads) return null;
  const mine = new Set(rows.filter(r => r.fid === f.id).map(r => r.id)), g = {}, bases = {}, lost = {book:0, pay:0, rev:0}; let noRate = false;
  x.ads.filter(a => mine.has(a.cid)).forEach(a => { const b = fxBase(a.name) || "—", o = g[b] = g[b] || {name:b, spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0, vers:new Set()};
    o.spend += a.spend; o.imp += a.imp; o.clicks += a.clicks; o.leads += a.leads; o.vers.add(a.name); (bases[a.k] = bases[a.k] || new Set()).add(b); });
  const camps = new Set(rows.filter(r => r.fid === f.id).map(r => fxKey(r.name)));
  (x.sales || []).filter(s => camps.has(s.k)).forEach(s => { const rate = s.cur === "USD" || !s.cur ? 1 : (p.fx || {})[s.cur]; if (!rate && s.kind === "payment" && s.amt) noRate = true;
    const b = fxBase(s.n), t = s.n && s.n.indexOf("{{") < 0 && bases[s.k] && bases[s.k].has(b) ? g[b] : lost;
    if (s.kind === "booking") t.book += s.ev; else if (s.kind === "payment") { t.pay += s.ev; t.rev += rate ? s.amt / rate : 0; } });
  return {list:Object.values(g).sort((a, b) => b.spend - a.spend), lost, noRate}; }
/* Зрелость вебинара: какая доля оплат обычно уже пришла к этому дню.
   Кривая берётся из прошлых вебинаров проекта; пока истории мало, считаем, что оплаты собираются за 14 дней. */
function fxCurve(lag){ const tot = (lag || []).reduce((a, r) => a + (+r.events || 0), 0); if (tot < 30) return null;
  const c = []; let acc = 0; for (let d = 0; d <= 60; d++) { acc += (lag.filter(r => +r.lag === d)[0] || {events:0}).events * 1; c[d] = acc / tot; } return c; }
const fxRipe = (curve, days) => days < 0 ? 0 : curve ? curve[Math.min(60, days)] : Math.min(1, days / 14);
function fxCohorts(p, x){ if (!x.coh || !x.coh.length) return "";
  const curve = fxCurve(x.lag), by = {}, today = new Date(fxDay(new Date())).getTime(); let noRate = false;
  x.coh.forEach(r => { const o = by[r.cohort] = by[r.cohort] || {d:r.cohort, book:0, pay:0, rev:0}, rate = r.currency === "USD" || !r.currency ? 1 : (p.fx || {})[r.currency];
    if (r.kind === "booking") o.book += +r.events; else if (r.kind === "payment") { o.pay += +r.events; if (!rate && +r.amount) noRate = true; o.rev += rate ? r.amount / rate : 0; } });
  const list = Object.values(by).filter(o => o.book || o.pay).sort((a, b) => a.d < b.d ? 1 : -1).slice(0, 10);
  if (!list.length) return "";
  const day90 = curve ? curve.findIndex(v => v >= 0.9) : 13;
  return `<span class="tag">${L("Когорти за датою вебінару","Когорты по дате вебинара")}</span>
    <div class="tw"><table><thead><tr><th>${L("Вебінар","Вебинар")}</th><th class="n">${L("Бронювання","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Бронювання → оплата","Бронь → оплата")}</th><th class="n">${L("Виручка, $","Выручка, $")}</th><th>${L("Зрілість","Зрелость")}</th></tr></thead><tbody>
      ${list.map(o => { const days = Math.round((today - new Date(o.d).getTime()) / 86400000), m = fxRipe(curve, days), ripe = m >= 0.9;
        return `<tr class="${ripe ? "" : "unripe"}"><td class="mono">${exDate(o.d)}</td><td class="n mono">${num(o.book)}</td><td class="n mono">${num(o.pay)}</td><td class="n mono">${o.book ? dec(o.pay / o.book * 100, 1) + "%" : "—"}${ripe || !o.book ? "" : " *"}</td><td class="n mono">${noRate ? "—" : num(o.rev)}</td><td>${pill(ripe ? "good" : "warn", Math.round(m * 100) + "%")} <span class="sub">${ripe ? L("оплати зібрано","оплаты собраны") : L("ще збирає оплати","еще собирает оплаты")}</span></td></tr>`; }).join("")}</tbody></table></div>
    <p class="sub">${curve ? L("Зрілість пораховано за твоїми минулими вебінарами: 90% оплат зазвичай надходить до ","Зрелость посчитана по твоим прошлым вебинарам: 90% оплат обычно приходит к ") + (day90 + 1) + L("-го дня.","-му дню.") : L("Зрілість поки що оцінюється за замовчуванням: вважаємо, що оплати збираються за 14 днів. Щойно накопичиться 30 оплат за вебінарами, старшими за місяць, оцінка рахуватиметься за твоїми даними.","Зрелость пока оценивается по умолчанию: считаем, что оплаты собираются за 14 дней. Как только накопится 30 оплат по вебинарам старше месяца, оценка будет считаться по твоим данным.")} ${L("* Конверсію недозрілого вебінару оцінювати рано: вона ще зросте.","* Конверсию недозревшего вебинара оценивать рано: она еще вырастет.")}</p>`; }
/* Группы объявлений кампании. Меток у группы нет, поэтому брони и оплаты кампании делятся между группами
   пропорционально расходу; последняя группа получает остаток — сумма по группам всегда равна кампании. */
function fxAdsets(x, camp){ const sets = (x.sets || []).filter(s => s.cid === camp.id).sort((a, b) => b.spend - a.spend); if (!sets.length) return [];
  const tot = sets.reduce((a, s) => a + s.spend, 0); let book = camp.book || 0, pay = camp.pay || 0, rev = camp.rev || 0;
  return sets.map((s, i) => { const last = i === sets.length - 1, k = tot > 0 ? s.spend / tot : 1 / sets.length;
    const b = last ? book : Math.min(book, Math.round((camp.book || 0) * k)), pp = last ? pay : Math.min(pay, Math.round((camp.pay || 0) * k)), r = last ? rev : (camp.rev || 0) * k;
    book -= b; pay -= pp; rev -= r; return Object.assign({}, s, {book:b, pay:pp, rev:r}); }); }
/* План-факт календарного месяца: факт с первого числа против плана на сегодня (план месяца × доля прошедших дней)
   и прогноз по темпу. Цели берутся из проекта или из воронки. */
function fxPlan(p, f, tot, hs, noRate, notUsd){
  const now = new Date(), dom = now.getDate(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), k = dom / dim;
  const t = f ? fT(f, p) : pT(p), plan = {spend: f ? t.bud : p.tg.budget, leads:t.leads, pay:t.pay, rev:t.rev};
  const lamp = (fact, pl) => { const r = pl > 0 ? fact / pl : 0; return pill(r >= 0.95 ? "good" : r >= 0.8 ? "warn" : "crit", Math.round(r * 100) + "%"); };
  const pace = (fact, pl) => { const r = pl > 0 ? fact / pl : 0; return pill(r > 1.15 ? "crit" : r < 0.85 ? "warn" : "good", Math.round(r * 100) + "% · " + (r > 1.15 ? L("перевитрата","перерасход") : r < 0.85 ? L("недовитрата","недорасход") : L("у плані","в плане"))); };
  const row = (name, fact, pl, fmt, mark) => `<tr><td><b>${name}</b></td><td class="n mono">${fmt(fact)}</td><td class="n mono">${fmt(pl * k)}</td><td class="n">${mark(fact, pl * k)}</td><td class="n mono">${fmt(pl)}</td><td class="n mono">${fmt(fact / k)}</td></tr>`;
  const usd = n => (num(n) + " $");
  return `<span class="tag">${L("План-факт місяця","План-факт месяца")} · ${L("день","день")} ${dom} ${L("із","из")} ${dim}</span>
    <div class="tw"><table><thead><tr><th></th><th class="n">${L("Факт","Факт")}</th><th class="n">${L("План на сьогодні","План на сегодня")}</th><th class="n">${L("Виконання","Выполнение")}</th><th class="n">${L("План місяця","План месяца")}</th><th class="n">${L("Прогноз за темпом","Прогноз по темпу")}</th></tr></thead><tbody>
      ${row(L("Витрати","Расход"), tot.spend, plan.spend, usd, pace)}${row(L("Ліди","Лиды"), tot.leads, plan.leads, num, lamp)}
      ${hs ? row(L("Оплати","Оплаты"), tot.pay, plan.pay, num, lamp) + (noRate ? "" : row(L("Виручка","Выручка"), tot.rev, plan.rev, usd, lamp)) : ""}</tbody></table></div>
    <p class="sub">${L("План на сьогодні — це план місяця, помножений на частку днів, що минули. Прогноз — факт, продовжений тим самим темпом до кінця місяця.","План на сегодня — это план месяца, умноженный на долю прошедших дней. Прогноз — факт, продолженный тем же темпом до конца месяца.")}${hs ? L(" Оплати рахуються за вебінарами цього місяця й ще дозрівають, тому їхній прогноз занижений."," Оплаты считаются по вебинарам этого месяца и еще дозревают, поэтому их прогноз занижен.") : L(" Оплати й виручка з’являться після завантаження файлів продажів."," Оплаты и выручка появятся после загрузки файлов продаж.")}${notUsd ? L(" Витрати показано у валюті кабінету, план — у доларах."," Расход показан в валюте кабинета, план — в долларах.") : ""}</p>`; }
/* продажи по кампаниям: брони, оплаты и выручка в долларах; что не совпало ни с одной кампанией кабинета — отдельно */
function fxSales(p, x, rows){ const by = {}, other = {book:0, pay:0, rev:0}, names = new Set(rows.map(r => fxKey(r.name))); let noRate = false;
  (x.sales || []).forEach(s => { const rate = s.cur === "USD" || !s.cur ? 1 : (p.fx || {})[s.cur]; if (!rate && s.kind === "payment" && s.amt) noRate = true;
    const t = names.has(s.k) ? (by[s.k] = by[s.k] || {book:0, pay:0, rev:0}) : other;
    if (s.kind === "booking") t.book += s.ev; else if (s.kind === "payment") { t.pay += s.ev; t.rev += rate ? s.amt / rate : 0; } });
  return {by, other, noRate, any:(x.sales || []).length > 0}; }
const fxCpl = (s, cap) => s.leads > 0 && typeof cplCell === "function" ? cplCell(s.spend / s.leads, cap, "") : s.leads > 0 ? `<span class="mono">${dec(s.spend / s.leads)}</span> ${cap ? pill(s.spend / s.leads <= cap ? "good" : s.spend / s.leads <= cap * 1.2 ? "warn" : "crit", s.spend / s.leads <= cap ? L("не вище граничної","в пределах потолка") : L("вище граничної","выше потолка")) : ""}` : "—";
function factPanel(p, f){
  const head = t => `<div class="panel" id="fact"><div class="row sp"><span class="tag">${L("Факт реклами","Факт рекламы")}</span></div>${t}</div>`;
  if (!CLOUD) return head(`<p class="sub proto">${L("Прототип: факт з’явиться після входу на сервер і підключення рекламного кабінету.","Прототип: факт появится после входа на сервер и подключения рекламного кабинета.")}</p>`);
  if (!p.meta || !p.meta.conn) return head(`<p class="sub">${L("Факт читається з підключеного кабінету. Поки що вміємо Meta Ads.","Факт читается из подключенного кабинета. Пока умеем Meta Ads.")}</p><div class="row"><button class="btn btn--sm btn--solid" data-act="mapConn" data-id="${p.id}">${L("Підключити Meta Ads","Подключить Meta Ads")}</button></div>`);
  const x = fxOf(p); fxStart(p);
  const cur = (p.meta.conn.account || {}).currency || "", notUsd = cur && cur !== "USD";
  const bar = `<div class="row sp"><span class="tag">${L("Факт реклами","Факт рекламы")} · Meta Ads</span><span class="row"><span class="sub mono">${x.syncing ? L("оновлюємо…","обновляем…") : fxWhen(x.synced)}</span>
      <span class="seg" role="group">${[7, 14, 30].map(n => `<button type="button" data-act="fxDays" data-id="${p.id}" data-v="${n}" aria-pressed="${x.days === n}">${n} ${L("дн.","дн.")}</button>`).join("")}<button type="button" data-act="fxDays" data-id="${p.id}" data-v="m" aria-pressed="${x.days === "m"}">${L("місяць","месяц")}</button></span>
      <button class="btn btn--sm" data-act="fxSyncNow" data-id="${p.id}"${x.syncing ? " disabled" : ""}>${L("Оновити дані","Обновить данные")}</button></span></div>`;
  if (x.err) return `<div class="panel" id="fact">${bar}<p class="mterr">${esc(x.err)}</p></div>`;
  if (!x.rows) return `<div class="panel" id="fact">${bar}<div class="skel" role="status" aria-label="${L("Завантажуємо факт реклами","Загружаем факт рекламы")}"><div class="kpis kpis--5">${Array(5).fill(`<div class="kpi">${sk("60%", 10)}${sk("45%", 20)}</div>`).join("")}</div>${Array(4).fill(sk("100%", 28)).join("")}</div></div>`;
  const sl = fxSales(p, x, x.rows), hs = sl.any;
  const rows = x.rows.map(r => Object.assign({fid:fxFunnel(p, r)}, r, sl.by[fxKey(r.name)] || {})), mine = f ? rows.filter(r => r.fid === f.id) : rows, tot = fxSum(mine), cap = f ? fT(f, p).cap : pT(p).cap;
  if (!rows.length) return `<div class="panel" id="fact">${bar}<p class="sub">${L("За цей період у кабінеті не було показів.","За этот период в кабинете не было показов.")}</p></div>`;
  const kpi = `<div class="hero">${tot.leads && typeof prHero === "function" ? prHero(tot.spend / tot.leads, 0, cur || "USD", cap) : ""}<div class="kpis kpis--${hs ? 5 : 6}">${[[L("Витрати","Расход") + (cur ? ", " + cur : ""), num(tot.spend)], [L("Лідів","Лидов"), num(tot.leads)], [L("Кліків","Кликов"), num(tot.clicks)], ["CTR", tot.imp ? dec(tot.clicks / tot.imp * 100) + "%" : "—"]].concat(hs ? [[L("Бронювань","Броней"), num(tot.book)], [L("Оплат","Оплат"), num(tot.pay)], [L("Виручка","Выручка"), sl.noRate ? "—" : (num(tot.rev) + " $")], ["ROAS", !sl.noRate && tot.spend > 0 && !notUsd ? dec(tot.rev / tot.spend) : "—"]] : []).map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div></div>`;
  const th = `<th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Покази","Показы")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${hs ? `<th class="n">${L("Бронювання","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Виручка, $","Выручка, $")}</th>` : ""}`, nc = hs ? 8 : 5;
  const td = (s, c) => `<td class="n mono">${fxM(s.spend)}</td><td class="n mono">${num(s.imp)}</td><td class="n mono">${num(s.clicks)}</td><td class="n mono">${num(s.leads)}</td><td class="n">${fxCpl(s, c)}</td>${hs ? `<td class="n mono">${num(s.book || 0)}</td><td class="n mono">${num(s.pay || 0)}</td><td class="n mono">${sl.noRate ? "—" : num(s.rev || 0)}</td>` : ""}`;
  const camps = list => list.slice().sort((a, b) => b.spend - a.spend).map(r => { const open = x.open === r.id, sets = open ? fxAdsets(x, r) : [];
    return `<tr data-act="fxOpen" data-id="${p.id}" data-c="${esc(r.id)}" tabindex="0" aria-expanded="${open}"><td class="mono">${x.sets ? `<span class="fxtw">${open ? `<span class="chev">${ico("chevron")}</span>` : `<span class="chev chev--r">${ico("chevron")}</span>`}</span> ` : ""}${esc(r.name)}</td>${td(r, f ? cap : 0)}</tr>${sets.map(s => `<tr class="fxset"><td class="nm">${esc(s.name)}</td>${td(s, f ? cap : 0)}</tr>`).join("")}`; }).join("");
  let body;
  if (f) body = mine.length ? `<div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")}</th>${th}</tr></thead><tbody>${camps(mine)}<tr class="sum"><td><b>${L("Воронка","Воронка")}</b></td>${td(tot, cap)}</tr></tbody></table></div>`
      : `<p class="sub">${L("До цієї воронки не прив’язано жодної кампанії. Прив’язати можна в цілях проєкту.","К этой воронке не привязано ни одной кампании. Привязать можно в целях проекта.")}</p>`;
  else { const lost = rows.filter(r => !r.fid);
    body = `<div class="tw"><table><thead><tr><th>${L("Воронка","Воронка")}</th>${th}</tr></thead><tbody>
        ${p.funnels.map(ff => { const s = fxSum(rows.filter(r => r.fid === ff.id)); return s.imp || s.spend ? `<tr data-act="wsOpenF" data-id="${ff.id}" tabindex="0"><td><b>${esc(ff.name)}</b></td>${td(s, fT(ff, p).cap)}</tr>` : `<tr><td><b>${esc(ff.name)}</b> <span class="sub">${L("кампаній немає","кампаний нет")}</span></td><td colspan="${nc}"></td></tr>`; }).join("")}
        ${lost.length ? `<tr><td><b>${L("Без воронки","Без воронки")}</b> <span class="sub">${lost.length}</span></td>${td(fxSum(lost), 0)}</tr>` : ""}
        <tr class="sum"><td><b>${L("Проєкт","Проект")}</b></td>${td(tot, cap)}</tr></tbody></table></div>
      ${lost.length ? `<div class="fxlost"><span class="tag">${L("Кампанії без воронки","Кампании без воронки")} · ${lost.length}</span><p class="sub">${L("Назва кампанії не містить назви воронки. Вкажи воронку вручну — цифри одразу перерахуються.","Название кампании не содержит названия воронки. Укажи воронку вручную — цифры сразу пересчитаются.")}</p>
          ${lost.slice().sort((a, b) => b.spend - a.spend).slice(0, 20).map(r => `<div class="row sp"><span class="nm">${esc(r.name)} <span class="sub">${fxM(r.spend)}</span></span><select data-fxmap="${esc(r.id)}" aria-label="${L("Воронка","Воронка")}"><option value="">${L("— воронка —","— воронка —")}</option>${p.funnels.map(ff => `<option value="${ff.id}">${esc(ff.name)}</option>`).join("")}<option value="-"${(p.campMap || {})[r.id] === "-" ? " selected" : ""}>${L("не належить до воронок","не относится к воронкам")}</option></select></div>`).join("")}</div>` : ""}`; }
  if (f && mine.length && x.sets) body += `<p class="sub">${L("Натисни на кампанію, щоб побачити групи оголошень.","Нажми на кампанию, чтобы увидеть группы объявлений.")}${hs ? L(" У групи немає своєї мітки, тому бронювання й оплати кампанії поділено між групами пропорційно витратам."," У группы нет своей метки, поэтому брони и оплаты кампании поделены между группами пропорционально расходу.") : ""}</p>`;
  if (f && mine.length) { const cr = fxCreatives(p, x, rows, f);
    if (cr && cr.list.length) body += `<span class="tag">${L("Креативи воронки","Креативы воронки")} · ${cr.list.length}</span>
      <div class="tw"><table><thead><tr><th>${L("Креатив","Креатив")}</th>${th}</tr></thead><tbody>
        ${cr.list.slice(0, 30).map(c => `<tr><td class="nm">${esc(c.name)}${c.vers.size > 1 ? ` <span class="sub">${L("версій: ","версий: ")}${c.vers.size}</span>` : ""}</td>${td(c, cap)}</tr>`).join("")}
        ${hs && (cr.lost.book || cr.lost.pay) ? `<tr><td><b>${L("Без мітки креативу","Без метки креатива")}</b></td><td colspan="5"></td><td class="n mono">${num(cr.lost.book)}</td><td class="n mono">${num(cr.lost.pay)}</td><td class="n mono">${sl.noRate ? "—" : num(cr.lost.rev)}</td></tr>` : ""}</tbody></table></div>
      <div class="hrow">${hint(L("Версії одного ролика зведено до базової назви. Продаж належить ролику лише всередині своєї кампанії; якщо мітка порожня або не збігається з жодним оголошенням — рядок «Без мітки креативу».","Версии одного ролика сведены к базовому названию. Продажа относится к ролику только внутри своей кампании; если метка пустая или не совпадает ни с одним объявлением — строка «Без метки креатива»."), "wide")}</div>`; }
  if (f && mine.length) body = more("fx:" + f.id, L("кампанії й креативи","кампании и креативы") + " · " + mine.length, body);
  if (x.days === "m") body = fxPlan(p, f, tot, hs, sl.noRate, notUsd) + body;
  if (!f) body += fxCohorts(p, x);
  return `<div class="panel" id="fact">${bar}${kpi}${notUsd ? `<p class="sub">${L("Валюта кабінету — ","Валюта кабинета — ")}${esc(cur)}${L(", а граничну ціну ліда задано в доларах: порівняння ціни ліда умовне.",", а потолок задан в долларах: сравнение цены лида условное.")}</p>` : ""}${body}
    ${hs ? `<p class="sub">${L("Бронювання й оплати беруться із завантажених файлів і рахуються за датою вебінару в цьому періоді; до кампанії прив’язуються за точним збігом назви з міткою utm_campaign.","Брони и оплаты берутся из загруженных файлов и считаются по дате вебинара в этом периоде; к кампании привязываются по точному совпадению названия с меткой utm_campaign.")}${!f && (sl.other.book || sl.other.pay) ? ` ${L("Поза кампаніями цього кабінету: бронювань ","Вне кампаний этого кабинета: броней ")}${num(sl.other.book)}, ${L("оплат ","оплат ")}${num(sl.other.pay)}.` : ""}${sl.noRate ? ` ${L("Виручку не показано: задай курс у блоці продажів.","Выручка не показана: задай курс в блоке продаж.")}` : ""}</p>`
      : ``}</div>`;
}
Object.assign(ACT, {
  fxOpen(d){ const p = W.projs.find(q => q.id === d.id); if (!p) return false; const x = fxOf(p); x.open = x.open === d.c ? null : d.c; },
  fxDays(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; const x = fxOf(p); x.days = d.v === "m" ? "m" : +d.v; x.rows = null; if (fxSpan(x) > (x.cover || 7)) fxSync(p, false); else fxLoad(p); },
  fxSyncNow(d){ const p = W.projs.find(x => x.id === d.id); if (p) fxSync(p, true); return false; },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.fxmap) return; const p = P(); if (!p) return;
  p.campMap = p.campMap || {}; if (t.value) p.campMap[t.dataset.fxmap] = t.value; else delete p.campMap[t.dataset.fxmap]; save(); render(); });
