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
const fxWhen = t => { if (!t) return L("ще не оновлювалося","ещё не обновлялось"); const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); return m < 2 ? L("щойно","только что") : m < 90 ? m + L(" хв тому"," мин назад") : m < 36 * 60 ? Math.round(m / 60) + L(" год тому"," ч назад") : Math.round(m / 1440) + L(" дн. тому"," дн. назад"); };
const fxErr = d => /ad_summary|ad_metrics|schema cache|does not exist|PGRST/i.test(String(d)) ? L("Аналітику на сервері ще не ввімкнено: потрібно запустити schema_metrics.sql.","Аналитика на сервере ещё не включена: нужно запустить schema_metrics.sql.") : L("Не вдалося отримати дані: ","Не удалось получить данные: ") + d;
/* читает сводку за период */
async function fxLoad(p){ const x = fxOf(p); if (!CLOUD || !sb || x.loading) return; x.loading = true; x.err = "";
  try { const r = await sb.rpc("ad_summary", {p:p.id, d1:fxDay(new Date(Date.now() - (fxSpan(x) - 1) * 86400000)), d2:fxDay(new Date())});
    const d1 = fxDay(new Date(Date.now() - (fxSpan(x) - 1) * 86400000)), d2 = fxDay(new Date()); x.sales = null;
    try { const sr = await sb.rpc("sales_summary", {p:p.id, d1, d2}); if (!sr.error) x.sales = (sr.data || []).map(o => ({kind:o.kind, k:fxKey(o.utm_campaign), n:fxKey(o.utm_content), cur:o.currency || "", ev:+o.events || 0, amt:+o.amount || 0})); } catch (e) {}
    x.coh = null; x.lag = null; try { const cr = await sb.rpc("sales_cohorts", {p:p.id, d1:fxDay(new Date(Date.now() - 60 * 86400000)), d2}); if (!cr.error) x.coh = cr.data || [];
      const lr = await sb.rpc("sales_lag", {p:p.id}); if (!lr.error) x.lag = lr.data || []; } catch (e) {}
    x.sets = null; try { const gr = await sb.rpc("ad_adsets", {p:p.id, d1, d2}); if (!gr.error) x.sets = (gr.data || []).map(o => ({cid:o.campaign_id, id:o.adset_id, name:o.adset_name || o.adset_id || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); } catch (e) {}
    x.ads = null; try { const ar = await sb.rpc("ad_creatives", {p:p.id, d1, d2}); if (!ar.error) x.ads = (ar.data || []).map(o => ({cid:o.campaign_id, k:fxKey(o.campaign_name), name:o.ad_name || "", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); } catch (e) {}
    if (r.error) x.err = fxErr(r.error.message); else { x.rows = (r.data || []).map(o => ({prov:o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); x.at = Date.now(); } }
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
const fxFunnel = (p, r) => { const m = (p.campMap || {})[r.id]; return m ? (m === "-" ? "" : m) : (p.funnels.some(f => f.id === r.f) ? r.f : ""); };
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
    <div class="tw"><table><thead><tr><th>${L("Вебінар","Вебинар")}</th><th class="n">${L("Броні","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Бронь → оплата","Бронь → оплата")}</th><th class="n">${L("Виручка, $","Выручка, $")}</th><th>${L("Зрілість","Зрелость")}</th></tr></thead><tbody>
      ${list.map(o => { const days = Math.round((today - new Date(o.d).getTime()) / 86400000), m = fxRipe(curve, days), ripe = m >= 0.9;
        return `<tr class="${ripe ? "" : "unripe"}"><td class="mono">${exDate(o.d)}</td><td class="n mono">${num(o.book)}</td><td class="n mono">${num(o.pay)}</td><td class="n mono">${o.book ? dec(o.pay / o.book * 100, 1) + "%" : "—"}${ripe || !o.book ? "" : " *"}</td><td class="n mono">${noRate ? "—" : num(o.rev)}</td><td>${pill(ripe ? "good" : "warn", Math.round(m * 100) + "%")} <span class="sub">${ripe ? L("оплати зібрано","оплаты собраны") : L("ще збирає оплати","ещё собирает оплаты")}</span></td></tr>`; }).join("")}</tbody></table></div>
    <p class="sub">${curve ? L("Зрілість пораховано за вашими минулими вебінарами: 90% оплат зазвичай надходить до ","Зрелость посчитана по вашим прошлым вебинарам: 90% оплат обычно приходит к ") + (day90 + 1) + L("-го дня.","-му дню.") : L("Зрілість поки що оцінюється за замовчуванням: вважаємо, що оплати збираються за 14 днів. Щойно накопичиться 30 оплат за вебінарами, старшими за місяць, оцінка рахуватиметься за вашими даними.","Зрелость пока оценивается по умолчанию: считаем, что оплаты собираются за 14 дней. Как только накопится 30 оплат по вебинарам старше месяца, оценка будет считаться по вашим данным.")} ${L("* Конверсію недозрілого вебінару оцінювати рано: вона ще виросте.","* Конверсию недозревшего вебинара оценивать рано: она ещё вырастет.")}</p>`; }
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
  const usd = n => "$" + num(n);
  return `<span class="tag">${L("План-факт місяця","План-факт месяца")} · ${L("день","день")} ${dom} ${L("із","из")} ${dim}</span>
    <div class="tw"><table><thead><tr><th></th><th class="n">${L("Факт","Факт")}</th><th class="n">${L("План на сьогодні","План на сегодня")}</th><th class="n">${L("Виконання","Выполнение")}</th><th class="n">${L("План місяця","План месяца")}</th><th class="n">${L("Прогноз за темпом","Прогноз по темпу")}</th></tr></thead><tbody>
      ${row(L("Витрати","Расход"), tot.spend, plan.spend, usd, pace)}${row(L("Ліди","Лиды"), tot.leads, plan.leads, num, lamp)}
      ${hs ? row(L("Оплати","Оплаты"), tot.pay, plan.pay, num, lamp) + (noRate ? "" : row(L("Виручка","Выручка"), tot.rev, plan.rev, usd, lamp)) : ""}</tbody></table></div>
    <p class="sub">${L("План на сьогодні — це план місяця, помножений на частку днів, що минули. Прогноз — факт, продовжений тим самим темпом до кінця місяця.","План на сегодня — это план месяца, умноженный на долю прошедших дней. Прогноз — факт, продолженный тем же темпом до конца месяца.")}${hs ? L(" Оплати рахуються за вебінарами цього місяця й ще дозрівають, тому їхній прогноз занижений."," Оплаты считаются по вебинарам этого месяца и ещё дозревают, поэтому их прогноз занижен.") : L(" Оплати й виручка з’являться після завантаження файлів продажів."," Оплаты и выручка появятся после загрузки файлов продаж.")}${notUsd ? L(" Витрати показано у валюті кабінету, план — у доларах."," Расход показан в валюте кабинета, план — в долларах.") : ""}</p>`; }
/* продажи по кампаниям: брони, оплаты и выручка в долларах; что не совпало ни с одной кампанией кабинета — отдельно */
function fxSales(p, x, rows){ const by = {}, other = {book:0, pay:0, rev:0}, names = new Set(rows.map(r => fxKey(r.name))); let noRate = false;
  (x.sales || []).forEach(s => { const rate = s.cur === "USD" || !s.cur ? 1 : (p.fx || {})[s.cur]; if (!rate && s.kind === "payment" && s.amt) noRate = true;
    const t = names.has(s.k) ? (by[s.k] = by[s.k] || {book:0, pay:0, rev:0}) : other;
    if (s.kind === "booking") t.book += s.ev; else if (s.kind === "payment") { t.pay += s.ev; t.rev += rate ? s.amt / rate : 0; } });
  return {by, other, noRate, any:(x.sales || []).length > 0}; }
const fxCpl = (s, cap) => s.leads > 0 ? `<span class="mono">${dec(s.spend / s.leads)}</span> ${cap ? pill(s.spend / s.leads <= cap ? "good" : s.spend / s.leads <= cap * 1.2 ? "warn" : "crit", s.spend / s.leads <= cap ? L("у стелі","в потолке") : L("вище стелі","выше потолка")) : ""}` : "—";
function factPanel(p, f){
  const head = t => `<div class="panel" id="fact"><div class="row sp"><span class="tag">${L("Факт реклами","Факт рекламы")}</span></div>${t}</div>`;
  if (!CLOUD) return head(`<p class="sub proto">${L("Прототип: факт з’явиться після входу на сервер і підключення рекламного кабінету.","Прототип: факт появится после входа на сервер и подключения рекламного кабинета.")}</p>`);
  if (!p.meta || !p.meta.conn) return head(`<p class="sub">${L("Факт читається з підключеного кабінету. Поки що вміємо Meta Ads.","Факт читается из подключённого кабинета. Пока умеем Meta Ads.")}</p><div class="row"><button class="btn btn--sm btn--solid" data-act="mapConn" data-id="${p.id}">${L("Підключити Meta Ads","Подключить Meta Ads")}</button></div>`);
  const x = fxOf(p); fxStart(p);
  const cur = (p.meta.conn.account || {}).currency || "", notUsd = cur && cur !== "USD";
  const bar = `<div class="row sp"><span class="tag">${L("Факт реклами","Факт рекламы")} · Meta Ads</span><span class="row"><span class="sub mono">${x.syncing ? L("оновлюємо…","обновляем…") : fxWhen(x.synced)}</span>
      <span class="seg" role="group">${[7, 14, 30].map(n => `<button type="button" data-act="fxDays" data-id="${p.id}" data-v="${n}" aria-pressed="${x.days === n}">${n} ${L("дн.","дн.")}</button>`).join("")}<button type="button" data-act="fxDays" data-id="${p.id}" data-v="m" aria-pressed="${x.days === "m"}">${L("місяць","месяц")}</button></span>
      <button class="btn btn--sm" data-act="fxSyncNow" data-id="${p.id}"${x.syncing ? " disabled" : ""}>${L("Оновити дані","Обновить данные")}</button></span></div>`;
  if (x.err) return `<div class="panel" id="fact">${bar}<p class="mterr">${esc(x.err)}</p></div>`;
  if (!x.rows) return `<div class="panel" id="fact">${bar}<p class="sub">${L("Завантажуємо…","Загружаем…")}</p></div>`;
  const sl = fxSales(p, x, x.rows), hs = sl.any;
  const rows = x.rows.map(r => Object.assign({fid:fxFunnel(p, r)}, r, sl.by[fxKey(r.name)] || {})), mine = f ? rows.filter(r => r.fid === f.id) : rows, tot = fxSum(mine), cap = f ? fT(f, p).cap : pT(p).cap;
  if (!rows.length) return `<div class="panel" id="fact">${bar}<p class="sub">${L("За цей період у кабінеті не було показів.","За этот период в кабинете не было показов.")}</p></div>`;
  const kpi = `<div class="kpis kpis--${hs ? 5 : 6}">${[[L("Витрати","Расход") + (cur ? ", " + cur : ""), num(tot.spend)], [L("Лідів","Лидов"), num(tot.leads)], [L("Ціна ліда","Цена лида"), tot.leads ? dec(tot.spend / tot.leads) : "—"], [L("Стеля ліда","Потолок лида"), "$" + dec(cap)], [L("Кліків","Кликов"), num(tot.clicks)], ["CTR", tot.imp ? dec(tot.clicks / tot.imp * 100) + "%" : "—"]].concat(hs ? [[L("Броней","Броней"), num(tot.book)], [L("Оплат","Оплат"), num(tot.pay)], [L("Виручка","Выручка"), sl.noRate ? "—" : "$" + num(tot.rev)], ["ROAS", !sl.noRate && tot.spend > 0 && !notUsd ? dec(tot.rev / tot.spend) : "—"]] : []).map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>`;
  const th = `<th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Покази","Показы")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${hs ? `<th class="n">${L("Броні","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Виручка, $","Выручка, $")}</th>` : ""}`, nc = hs ? 8 : 5;
  const td = (s, c) => `<td class="n mono">${fxM(s.spend)}</td><td class="n mono">${num(s.imp)}</td><td class="n mono">${num(s.clicks)}</td><td class="n mono">${num(s.leads)}</td><td class="n">${fxCpl(s, c)}</td>${hs ? `<td class="n mono">${num(s.book || 0)}</td><td class="n mono">${num(s.pay || 0)}</td><td class="n mono">${sl.noRate ? "—" : num(s.rev || 0)}</td>` : ""}`;
  const camps = list => list.slice().sort((a, b) => b.spend - a.spend).map(r => { const open = x.open === r.id, sets = open ? fxAdsets(x, r) : [];
    return `<tr data-act="fxOpen" data-id="${p.id}" data-c="${esc(r.id)}" tabindex="0" aria-expanded="${open}"><td class="mono">${x.sets ? `<span class="fxtw">${open ? "▾" : "▸"}</span> ` : ""}${esc(r.name)}</td>${td(r, f ? cap : 0)}</tr>${sets.map(s => `<tr class="fxset"><td class="mono">${esc(s.name)}</td>${td(s, f ? cap : 0)}</tr>`).join("")}`; }).join("");
  let body;
  if (f) body = mine.length ? `<div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")}</th>${th}</tr></thead><tbody>${camps(mine)}<tr class="sum"><td><b>${L("Воронка","Воронка")}</b></td>${td(tot, cap)}</tr></tbody></table></div>`
      : `<p class="sub">${L("До цієї воронки не прив’язано жодної кампанії. Прив’язати можна в цілях проєкту.","К этой воронке не привязано ни одной кампании. Привязать можно в целях проекта.")}</p>`;
  else { const lost = rows.filter(r => !r.fid);
    body = `<div class="tw"><table><thead><tr><th>${L("Воронка","Воронка")}</th>${th}</tr></thead><tbody>
        ${p.funnels.map(ff => { const s = fxSum(rows.filter(r => r.fid === ff.id)); return s.imp || s.spend ? `<tr data-act="wsOpenF" data-id="${ff.id}" tabindex="0"><td><b>${esc(ff.name)}</b></td>${td(s, fT(ff, p).cap)}</tr>` : `<tr><td><b>${esc(ff.name)}</b> <span class="sub">${L("кампаній немає","кампаний нет")}</span></td><td colspan="${nc}"></td></tr>`; }).join("")}
        ${lost.length ? `<tr><td><b>${L("Без воронки","Без воронки")}</b> <span class="sub">${lost.length}</span></td>${td(fxSum(lost), 0)}</tr>` : ""}
        <tr class="sum"><td><b>${L("Проєкт","Проект")}</b></td>${td(tot, cap)}</tr></tbody></table></div>
      ${lost.length ? `<div class="fxlost"><span class="tag">${L("Кампанії без воронки","Кампании без воронки")} · ${lost.length}</span><p class="sub">${L("Назва кампанії не містить назви воронки. Вкажіть воронку вручну — цифри одразу перерахуються.","Название кампании не содержит названия воронки. Укажите воронку вручную — цифры сразу пересчитаются.")}</p>
          ${lost.slice().sort((a, b) => b.spend - a.spend).slice(0, 20).map(r => `<div class="row sp"><span class="mono">${esc(r.name)} <span class="sub">${fxM(r.spend)}</span></span><select data-fxmap="${esc(r.id)}" aria-label="${L("Воронка","Воронка")}"><option value="">${L("— воронка —","— воронка —")}</option>${p.funnels.map(ff => `<option value="${ff.id}">${esc(ff.name)}</option>`).join("")}<option value="-"${(p.campMap || {})[r.id] === "-" ? " selected" : ""}>${L("не належить до воронок","не относится к воронкам")}</option></select></div>`).join("")}</div>` : ""}`; }
  if (f && mine.length && x.sets) body += `<p class="sub">${L("Натисніть на кампанію, щоб побачити групи оголошень.","Нажмите на кампанию, чтобы увидеть группы объявлений.")}${hs ? L(" У групи немає своєї мітки, тому броні й оплати кампанії поділено між групами пропорційно витратам."," У группы нет своей метки, поэтому брони и оплаты кампании поделены между группами пропорционально расходу.") : ""}</p>`;
  if (f && mine.length) { const cr = fxCreatives(p, x, rows, f);
    if (cr && cr.list.length) body += `<span class="tag">${L("Креативи воронки","Креативы воронки")} · ${cr.list.length}</span>
      <div class="tw"><table><thead><tr><th>${L("Креатив","Креатив")}</th>${th}</tr></thead><tbody>
        ${cr.list.slice(0, 30).map(c => `<tr><td class="mono">${esc(c.name)}${c.vers.size > 1 ? ` <span class="sub">${L("версій: ","версий: ")}${c.vers.size}</span>` : ""}</td>${td(c, cap)}</tr>`).join("")}
        ${hs && (cr.lost.book || cr.lost.pay) ? `<tr><td><b>${L("Без мітки креативу","Без метки креатива")}</b></td><td colspan="5"></td><td class="n mono">${num(cr.lost.book)}</td><td class="n mono">${num(cr.lost.pay)}</td><td class="n mono">${sl.noRate ? "—" : num(cr.lost.rev)}</td></tr>` : ""}</tbody></table></div>
      <p class="sub">${L("Версії одного ролика зведено до базової назви. Продаж належить ролику лише всередині своєї кампанії; якщо мітка порожня або не збігається з жодним оголошенням — рядок «Без мітки креативу».","Версии одного ролика сведены к базовому названию. Продажа относится к ролику только внутри своей кампании; если метка пустая или не совпадает ни с одним объявлением — строка «Без метки креатива».")}</p>`; }
  if (x.days === "m") body = fxPlan(p, f, tot, hs, sl.noRate, notUsd) + body;
  if (!f) body += fxCohorts(p, x);
  return `<div class="panel" id="fact">${bar}${kpi}${notUsd ? `<p class="sub">${L("Валюта кабінету — ","Валюта кабинета — ")}${esc(cur)}${L(", а стелю задано в доларах: порівняння ціни ліда умовне.",", а потолок задан в долларах: сравнение цены лида условное.")}</p>` : ""}${body}
    ${hs ? `<p class="sub">${L("Броні й оплати беруться із завантажених файлів і рахуються за датою вебінару в цьому періоді; до кампанії прив’язуються за точним збігом назви з міткою utm_campaign.","Брони и оплаты берутся из загруженных файлов и считаются по дате вебинара в этом периоде; к кампании привязываются по точному совпадению названия с меткой utm_campaign.")}${!f && (sl.other.book || sl.other.pay) ? ` ${L("Поза кампаніями цього кабінету: броней ","Вне кампаний этого кабинета: броней ")}${num(sl.other.book)}, ${L("оплат ","оплат ")}${num(sl.other.pay)}.` : ""}${sl.noRate ? ` ${L("Виручку не показано: задайте курс у блоці продажів.","Выручка не показана: задайте курс в блоке продаж.")}` : ""}</p>`
      : `<p class="sub">${L("Тут тільки реклама: витрати, кліки й ліди за даними кабінету. Броні й оплати з’являться після завантаження файлів продажів нижче.","Здесь только реклама: расход, клики и лиды по данным кабинета. Брони и оплаты появятся после загрузки файлов продаж ниже.")}</p>`}</div>`;
}
Object.assign(ACT, {
  fxOpen(d){ const p = W.projs.find(q => q.id === d.id); if (!p) return false; const x = fxOf(p); x.open = x.open === d.c ? null : d.c; },
  fxDays(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; const x = fxOf(p); x.days = d.v === "m" ? "m" : +d.v; x.rows = null; if (fxSpan(x) > (x.cover || 7)) fxSync(p, false); else fxLoad(p); },
  fxSyncNow(d){ const p = W.projs.find(x => x.id === d.id); if (p) fxSync(p, true); return false; },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.fxmap) return; const p = P(); if (!p) return;
  p.campMap = p.campMap || {}; if (t.value) p.campMap[t.dataset.fxmap] = t.value; else delete p.campMap[t.dataset.fxmap]; save(); render(); });
