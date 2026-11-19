/* Факт рекламы: расход, лиды и цена лида из подключённого кабинета, сведённые по каналам и воронкам.
   Данные лежат на сервере (таблица ad_metrics), кабинет получает готовые суммы по кампаниям.
   Загрузка из Meta идёт по кнопке и сама — при открытии проекта, если данные старше 12 часов.
   Подключается перед ws.js. */
const FACT = {};   /* по проекту: {days, rows, at, synced, loading, syncing, err, tried} */
const fxOf = p => (FACT[p.id] = FACT[p.id] || {days:7, rows:null, at:0, synced:null, loading:false, syncing:false, err:"", tried:false});
const fxM = n => { const t = (+n || 0).toFixed(2).split("."); return num(+t[0]) + "," + t[1]; };
const fxDay = d => d.toISOString().slice(0, 10);
const fxWhen = t => { if (!t) return L("ще не оновлювалося","ещё не обновлялось"); const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); return m < 2 ? L("щойно","только что") : m < 90 ? m + L(" хв тому"," мин назад") : m < 36 * 60 ? Math.round(m / 60) + L(" год тому"," ч назад") : Math.round(m / 1440) + L(" дн. тому"," дн. назад"); };
const fxErr = d => /ad_summary|ad_metrics|schema cache|does not exist|PGRST/i.test(String(d)) ? L("Аналітику на сервері ще не ввімкнено: потрібно запустити schema_metrics.sql.","Аналитика на сервере ещё не включена: нужно запустить schema_metrics.sql.") : L("Не вдалося отримати дані: ","Не удалось получить данные: ") + d;
/* читает сводку за период */
async function fxLoad(p){ const x = fxOf(p); if (!CLOUD || !sb || x.loading) return; x.loading = true; x.err = "";
  try { const r = await sb.rpc("ad_summary", {p:p.id, d1:fxDay(new Date(Date.now() - (x.days - 1) * 86400000)), d2:fxDay(new Date())});
    const d1 = fxDay(new Date(Date.now() - (x.days - 1) * 86400000)), d2 = fxDay(new Date()); x.sales = null;
    try { const sr = await sb.rpc("sales_summary", {p:p.id, d1, d2}); if (!sr.error) x.sales = (sr.data || []).map(o => ({kind:o.kind, k:fxKey(o.utm_campaign), cur:o.currency || "", ev:+o.events || 0, amt:+o.amount || 0})); } catch (e) {}
    if (r.error) x.err = fxErr(r.error.message); else { x.rows = (r.data || []).map(o => ({prov:o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})); x.at = Date.now(); } }
  catch (e) { x.err = fxErr(e && e.message); }
  x.loading = false; render(); }
/* тянет свежую статистику из Meta на сервер, затем перечитывает сводку */
async function fxSync(p, manual){ const x = fxOf(p); if (x.syncing) return; x.syncing = true; x.err = ""; if (manual) render();
  const d = await mtCall({action:"sync", project_id:p.id, days:Math.max(7, x.days)});
  x.syncing = false;
  if (!d.ok) { x.err = d.error === "meta" || d.error === "not_connected" ? mtErr(d) : fxErr(d.detail || d.error); if (d.error === "meta") mtHealth(p, false); render(); return; }
  x.synced = d.synced_at; x.cover = Math.max(x.cover || 0, Math.max(7, x.days)); if (manual) toast(L("Дані оновлено: кампаній ","Данные обновлены: кампаний ") + d.campaigns + (d.unmatched ? L(", без воронки ",", без воронки ") + d.unmatched : ""));
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
      <span class="seg" role="group">${[7, 14, 30].map(n => `<button type="button" data-act="fxDays" data-id="${p.id}" data-v="${n}" aria-pressed="${x.days === n}">${n} ${L("дн.","дн.")}</button>`).join("")}</span>
      <button class="btn btn--sm" data-act="fxSyncNow" data-id="${p.id}"${x.syncing ? " disabled" : ""}>${L("Оновити дані","Обновить данные")}</button></span></div>`;
  if (x.err) return `<div class="panel" id="fact">${bar}<p class="mterr">${esc(x.err)}</p></div>`;
  if (!x.rows) return `<div class="panel" id="fact">${bar}<p class="sub">${L("Завантажуємо…","Загружаем…")}</p></div>`;
  const sl = fxSales(p, x, x.rows), hs = sl.any;
  const rows = x.rows.map(r => Object.assign({fid:fxFunnel(p, r)}, r, sl.by[fxKey(r.name)] || {})), mine = f ? rows.filter(r => r.fid === f.id) : rows, tot = fxSum(mine), cap = f ? fT(f, p).cap : pT(p).cap;
  if (!rows.length) return `<div class="panel" id="fact">${bar}<p class="sub">${L("За цей період у кабінеті не було показів.","За этот период в кабинете не было показов.")}</p></div>`;
  const kpi = `<div class="kpis">${[[L("Витрати","Расход") + (cur ? ", " + cur : ""), fxM(tot.spend)], [L("Лідів","Лидов"), num(tot.leads)], [L("Ціна ліда","Цена лида"), tot.leads ? dec(tot.spend / tot.leads) : "—"], [L("Стеля ліда","Потолок лида"), "$" + dec(cap)], [L("Кліків","Кликов"), num(tot.clicks)], ["CTR", tot.imp ? dec(tot.clicks / tot.imp * 100) + "%" : "—"]].concat(hs ? [[L("Броней","Броней"), num(tot.book)], [L("Оплат","Оплат"), num(tot.pay)], [L("Виручка","Выручка"), sl.noRate ? "—" : "$" + num(tot.rev)], ["ROAS", !sl.noRate && tot.spend > 0 && !notUsd ? dec(tot.rev / tot.spend) : "—"]] : []).map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>`;
  const th = `<th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Покази","Показы")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${hs ? `<th class="n">${L("Броні","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Виручка, $","Выручка, $")}</th>` : ""}`, nc = hs ? 8 : 5;
  const td = (s, c) => `<td class="n mono">${fxM(s.spend)}</td><td class="n mono">${num(s.imp)}</td><td class="n mono">${num(s.clicks)}</td><td class="n mono">${num(s.leads)}</td><td class="n">${fxCpl(s, c)}</td>${hs ? `<td class="n mono">${num(s.book || 0)}</td><td class="n mono">${num(s.pay || 0)}</td><td class="n mono">${sl.noRate ? "—" : num(s.rev || 0)}</td>` : ""}`;
  const camps = list => list.slice().sort((a, b) => b.spend - a.spend).map(r => `<tr><td class="mono">${esc(r.name)}</td>${td(r, f ? cap : 0)}</tr>`).join("");
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
  return `<div class="panel" id="fact">${bar}${kpi}${notUsd ? `<p class="sub">${L("Валюта кабінету — ","Валюта кабинета — ")}${esc(cur)}${L(", а стелю задано в доларах: порівняння ціни ліда умовне.",", а потолок задан в долларах: сравнение цены лида условное.")}</p>` : ""}${body}
    ${hs ? `<p class="sub">${L("Броні й оплати беруться із завантажених файлів і рахуються за датою вебінару в цьому періоді; до кампанії прив’язуються за точним збігом назви з міткою utm_campaign.","Брони и оплаты берутся из загруженных файлов и считаются по дате вебинара в этом периоде; к кампании привязываются по точному совпадению названия с меткой utm_campaign.")}${!f && (sl.other.book || sl.other.pay) ? ` ${L("Поза кампаніями цього кабінету: броней ","Вне кампаний этого кабинета: броней ")}${num(sl.other.book)}, ${L("оплат ","оплат ")}${num(sl.other.pay)}.` : ""}${sl.noRate ? ` ${L("Виручку не показано: задайте курс у блоці продажів.","Выручка не показана: задайте курс в блоке продаж.")}` : ""}</p>`
      : `<p class="sub">${L("Тут тільки реклама: витрати, кліки й ліди за даними кабінету. Броні й оплати з’являться після завантаження файлів продажів нижче.","Здесь только реклама: расход, клики и лиды по данным кабинета. Брони и оплаты появятся после загрузки файлов продаж ниже.")}</p>`}</div>`;
}
Object.assign(ACT, {
  fxDays(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; const x = fxOf(p); x.days = +d.v; x.rows = null; if (+d.v > (x.cover || 7)) fxSync(p, false); else fxLoad(p); },
  fxSyncNow(d){ const p = W.projs.find(x => x.id === d.id); if (p) fxSync(p, true); return false; },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.fxmap) return; const p = P(); if (!p) return;
  p.campMap = p.campMap || {}; if (t.value) p.campMap[t.dataset.fxmap] = t.value; else delete p.campMap[t.dataset.fxmap]; save(); render(); });
