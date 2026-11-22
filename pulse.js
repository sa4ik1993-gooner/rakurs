/* Пульс рекламы на карте: период, факт за период против прошлого такого же периода, выводы и кампании пятым уровнем.
   Выводы считает обычный код по правилам — без ИИ и без платного API. Платформа ничего не меняет в кабинете сама:
   только говорит, что видит, почему и что сделать.
   Данные — те же своды на сервере, что у блока «Факт рекламы». Подключается после fact.js. */
const PR = {mode:meMode(), d1:"", d2:""};   /* период карты: y — вчера, 3/7/14/30 — дней по вчера, m — месяц по сегодня, c — свои даты */
const PD = {};                          /* данные по проекту и периоду */
const prPad = n => (n < 10 ? "0" : "") + n;
const prToday = () => { const d = new Date(); return d.getFullYear() + "-" + prPad(d.getMonth() + 1) + "-" + prPad(d.getDate()); };
const prShift = (s, n) => new Date(Date.parse(s) + n * 864e5).toISOString().slice(0, 10);
const prDM = s => s.slice(8, 10) + "." + s.slice(5, 7);
function prRange(){ const t = prToday(); let d1, d2;
  if (PR.mode === "c" && PR.d1 && PR.d2) { d1 = PR.d1 < PR.d2 ? PR.d1 : PR.d2; d2 = PR.d1 < PR.d2 ? PR.d2 : PR.d1; }
  else if (PR.mode === "t") { d1 = d2 = t; }
  else if (PR.mode === "m") { d1 = t.slice(0, 8) + "01"; d2 = t; }
  else { const n = PR.mode === "y" || PR.mode === "c" ? 1 : +PR.mode; d2 = prShift(t, -1); d1 = prShift(t, -n); }
  const span = Math.round((Date.parse(d2) - Date.parse(d1)) / 864e5) + 1;
  return {d1, d2, span, p1:prShift(d1, -span), p2:prShift(d1, -1), key:d1 + "_" + d2}; }
const prLabel = r => (PR.mode === "t" ? L("сьогодні, ","сегодня, ") + prDM(r.d1) : PR.mode === "y" ? L("вчора, ","вчера, ") + prDM(r.d1) : r.span === 1 ? prDM(r.d1) : prDM(r.d1) + "–" + prDM(r.d2) + " · " + r.span + L(" дн."," дн."));
const prShort = () => PR.mode === "t" ? L("сьогодні","сегодня") : PR.mode === "y" ? L("вчора","вчера") : PR.mode === "m" ? L("місяць","месяц") : PR.mode === "c" ? L("період","период") : PR.mode + L(" дн."," дн.");
const prOn = p => !!(CLOUD && sb && p && p.meta && p.meta.conn);
const prCur = p => (p.meta.conn.account || {}).currency || "";
const prM = (v, cur) => { const s = v >= 1000 ? num(v) : fxM(v); return !cur || cur === "USD" ? "$" + s : s + " " + cur; };
const prPct = v => dec(v * 100, v < 0.1 ? 2 : 1) + "%";
function prOf(p){ const r = prRange(), k = p.id + "|" + r.key; return PD[k] = PD[k] || {r, cur:null, prev:null, sets:null, ads:null, sb:null, loading:false, at:0, synced:null, err:""}; }

/* читает своды за период и за прошлый такой же; если на сервере нет данных так далеко назад — один раз дотягивает из Meta */
function prLoad(p){ if (!prOn(p)) return; const x = prOf(p), fx = fxOf(p), r = x.r; fxStart(p);
  if (x.loading || x.at && x.synced === fx.synced && Date.now() - x.at < 10 * 60000) return;
  x.loading = true; x.err = "";
  const q = (fn, a) => Promise.resolve(sb.rpc(fn, Object.assign({p:p.id}, a))).then(res => res.error ? (x.err = x.err || fxErr(res.error.message), null) : (res.data || []), e => (x.err = x.err || fxErr(e && e.message), null));
  const camp = o => ({prov:o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0});
  Promise.all([q("ad_summary", {d1:r.d1, d2:r.d2}), q("ad_summary", {d1:r.p1, d2:r.p2}), q("ad_adsets", {d1:r.d1, d2:r.d2}), q("ad_creatives", {d1:r.d1, d2:r.d2}), q("sales_summary", {d1:r.d1, d2:r.d2}), prAccMap(p, x)]).then(([c, pv, gs, as, ss]) => {
    x.cur = c ? c.map(camp) : null; x.prev = pv ? pv.map(camp) : [];
    x.sets = gs ? gs.map(o => ({cid:o.campaign_id, id:o.adset_id || "", name:o.adset_name || o.adset_id || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})) : [];
    x.ads = as ? as.map(o => ({cid:o.campaign_id, name:o.ad_name || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})) : [];
    x.sb = {}; (ss || []).forEach(o => { const k = fxKey(o.utm_campaign), t = x.sb[k] = x.sb[k] || {book:0, pay:0, rev:0}, cur = o.currency || "", rate = cur === "USD" || !cur ? 1 : (p.fx || {})[cur];
      if (o.kind === "booking") t.book += +o.events || 0; else if (o.kind === "payment") { t.pay += +o.events || 0; t.rev += rate ? (+o.amount || 0) / rate : 0; } });
    x.loading = false; x.at = Date.now(); x.synced = fx.synced; if (!S.modal) render();
    if (PR.mode === "t" && !PR.auto && !fx.syncing && fx.synced && Date.now() - new Date(fx.synced).getTime() > 15 * 60000) { PR.auto = 1; prSyncToday(p, false); } });
  const need = Math.round((Date.parse(prToday()) - Date.parse(r.p1)) / 864e5) + 1;
  if (need > Math.max(fx.cover || 0, 8) && !x.deep) { x.deep = true;
    mtCall({action:"sync", project_id:p.id, days:Math.min(90, need)}).then(d => { if (!d.ok) return; fx.synced = d.synced_at; fx.cover = Math.max(fx.cover || 0, need); x.at = 0; if (!S.modal) render(); }); } }

/* ---------- рекламные аккаунты: какой кампании какой аккаунт ----------
   Аккаунт кампании берётся из строк статистики (колонка account_id, schema_history.sql). Если у проекта один аккаунт — все кампании его. */
const prAccs = p => { const c = p.meta.conn || {}; return c.accounts && c.accounts.length ? c.accounts : c.account ? [c.account] : []; };
function prAccMap(p, x){ const accs = prAccs(p); if (accs.length <= 1) { x.am = {one:accs[0] ? String(accs[0].id) : ""}; return Promise.resolve(); }
  const out = {}, page = i => Promise.resolve(sb.from("ad_metrics").select("campaign_id,account_id").eq("project_id", p.id).eq("provider", "meta").gte("day", x.r.p1).lte("day", x.r.d2).range(i * 1000, i * 1000 + 999))
    .then(res => { if (res.error) { x.am = {err:res.error.message}; return; } const d = res.data || []; d.forEach(o => { if (o.account_id) out[o.campaign_id] = String(o.account_id); });
      if (d.length === 1000 && i < 29) return page(i + 1); x.am = {map:out}; }, e => { x.am = {err:String(e && e.message || e)}; });
  return page(0); }
const prAccOf = (x, id) => !x.am ? "" : "one" in x.am ? x.am.one : x.am.map ? x.am.map[id] || "" : "";
const prAccName = (p, id) => { const a = prAccs(p).find(o => String(o.id) === id); return !id ? L("Акаунт не визначено","Аккаунт не определён") : a && a.name && a.name !== a.id ? a.name : id; };
const prAK = id => "a" + (id || "_");                                  /* кусок ключа карты для аккаунта */
const prAId = k => k === "a_" ? "" : k.slice(1);

/* строки кампаний воронки в канале, с бронями и оплатами по точному совпадению метки utm_campaign */
const prRows = (p, list, f, c, x) => (list || []).filter(r => r.prov === c && fxFunnel(p, r) === f.id).map(r => Object.assign({}, r, (x && x.sb && x.sb[fxKey(r.name)]) || {}));
const prRowsA = (p, list, f, c, x, acc) => prRows(p, list, f, c, x).filter(r => acc == null || prAccOf(prOf(p), r.id) === acc);
const prCap = (f, p) => { const c = fT(f, p).cap; return c > 0 && isFinite(c) ? c : 0; };

/* Пороги выводов и число кампаний на доске — настройки компании (раздел «Настройки»); здесь значения по умолчанию. */
const PR_DEF = {early:5, noLead:2, crit:20, up:30, ctr:30, top:5};
function prTh(){ const o = Object.assign({}, PR_DEF), c = (W.co && W.co.set) || {}; Object.keys(PR_DEF).forEach(k => { const n = parseFloat(String(c[k] == null ? "" : c[k]).replace(",", ".")); if (n > 0) o[k] = n; }); o.top = Math.max(1, Math.min(20, Math.round(o.top))); return o; }
/* Правила вывода. s — текущий период, v — прошлый такой же, cap — потолок цены лида воронки (в долларах).
   Судим, когда потрачено 5 потолков или пришло 5 лидов; раньше — «рано судить». */
function prJudge(s, v, cap, cur){ const out = [], m = n => prM(n, cur), T = prTh(); if (!s.spend) return out;
  const cpl = s.leads ? s.spend / s.leads : 0, pc = v && v.leads ? v.spend / v.leads : 0, ctr = s.imp ? s.clicks / s.imp : 0, pctr = v && v.imp ? v.clicks / v.imp : 0;
  const enough = cap ? s.spend >= T.early * cap || s.leads >= 5 : s.spend >= 30 || s.leads >= 5;
  if (cap && !s.leads && s.spend >= T.noLead * cap) return [{lv:"crit", t:L("Витрати без лідів","Расход без лидов"),
    why:L("Витрачено ","Потрачено ") + m(s.spend) + L(" — це "," — это ") + dec(s.spend / cap, 1) + L(" стелі ціни ліда, а лідів немає."," потолка цены лида, а лидов нет."),
    todo:L("Відкрийте сайт за посиланням з оголошення: чи відкривається, чи працює форма, чи надсилає пиксель подію. Якщо все гаразд — вимкніть кампанію або замініть креативи.","Откройте сайт по ссылке из объявления: открывается ли, работает ли форма, отправляет ли пиксель событие. Если всё в порядке — выключите кампанию или замените креативы.")}];
  if (!enough) return [{lv:"mute", t:L("Рано судити","Рано судить"),
    why:L("Витрачено ","Потрачено ") + m(s.spend) + (s.leads ? L(", лідів ",", лидов ") + s.leads : "") + L(". Висновок буде після ",". Вывод будет после ") + (cap ? m(T.early * cap) : m(30)) + L(" витрат або 5 лідів."," расхода или 5 лидов."),
    todo:L("Нічого не змінювати, дивитися далі.","Ничего не менять, смотреть дальше.")}];
  if (!cap) out.push({lv:"mute", t:L("Немає стелі ціни ліда","Нет потолка цены лида"), why:L("У воронки не задано ціль, тому ціну ліда не з чим порівняти.","У воронки не задана цель, поэтому цену лида не с чем сравнить."), todo:L("Задайте ціль воронки: оплати, чек і конверсії.","Задайте цель воронки: оплаты, чек и конверсии.")});
  else if (cpl > cap * (1 + T.crit / 100)) out.push({lv:"crit", t:L("Лід дорожчий за стелю","Лид дороже потолка"),
    why:L("Ціна ліда ","Цена лида ") + m(cpl) + L(" при стелі "," при потолке ") + m(cap) + " (+" + Math.round((cpl / cap - 1) * 100) + "%).",
    todo:L("Подивіться, які оголошення дають найдорожчі ліди, і вимкніть гірші. Якщо дорого всюди — справа в офері, сторінці або аудиторії.","Посмотрите, какие объявления дают самые дорогие лиды, и выключите худшие. Если дорого везде — дело в оффере, странице или аудитории.")});
  else if (cpl > cap) out.push({lv:"warn", t:L("Лід трохи вищий за стелю","Лид чуть выше потолка"),
    why:L("Ціна ліда ","Цена лида ") + m(cpl) + L(" при стелі "," при потолке ") + m(cap) + ".",
    todo:L("Поки тримати й подивитися завтра. Оголошення з ціною ліда понад 1,5 стелі можна вимикати вже зараз.","Пока держать и посмотреть завтра. Объявления с ценой лида выше 1,5 потолка можно выключать уже сейчас.")});
  else out.push({lv:"good", t:L("У нормі","В норме"),
    why:L("Ціна ліда ","Цена лида ") + m(cpl) + L(" при стелі "," при потолке ") + m(cap) + ".",
    todo:L("Якщо ціна тримається кілька днів поспіль — можна додати бюджет на 20–30%.","Если цена держится несколько дней подряд — можно добавить бюджет на 20–30%.")});
  if (pc && cpl > pc * (1 + T.up / 100)) out.push({lv:"warn", t:L("Лід подорожчав","Лид подорожал"),
    why:m(pc) + " → " + m(cpl) + " (+" + Math.round((cpl / pc - 1) * 100) + L("%) до минулого такого ж періоду.","%) к прошлому такому же периоду."),
    todo:L("Порівняйте оголошення: якщо подорожчало все — втомилися аудиторія або креативи; якщо одне — вимкніть його.","Сравните объявления: если подорожало всё — устали аудитория или креативы; если одно — выключите его.")});
  if (pctr && s.imp >= 1000 && ctr < pctr * (1 - T.ctr / 100)) out.push({lv:"warn", t:L("CTR падає","CTR падает"),
    why:"CTR " + prPct(pctr) + " → " + prPct(ctr) + L(" до минулого періоду."," к прошлому периоду."),
    todo:L("Схоже на вигорання креативів: підготуйте нові ролики або нові перші секунди.","Похоже на выгорание креативов: подготовьте новые ролики или новые первые секунды.")});
  if (s.pay && s.rev && s.spend) out.push({lv:"good", t:L("Є оплати","Есть оплаты"), why:plural(s.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) + " · ROAS " + dec(s.rev / s.spend, 1) + L(" (за датою вебінару, оплати ще можуть дозріти)."," (по дате вебинара, оплаты ещё могут дозреть)."), todo:""});
  return out; }
const PRANK = {crit:3, warn:2, good:1, mute:0};
const prMain = js => js.slice().sort((a, b) => PRANK[b.lv] - PRANK[a.lv])[0];
const prPill = j => pill(j.lv, j.t);
const prList = js => js.length ? `<ul class="prv">${js.map(j => `<li class="prv--${j.lv}"><div><b>${esc(j.t)}</b> <span>${esc(j.why)}</span></div>${j.todo ? `<div class="sub"><b>${L("Що зробити:","Что сделать:")}</b> ${esc(j.todo)}</div>` : ""}</li>`).join("")}</ul>` : "";
/* изменение к прошлому периоду; для цены рост — плохо, для расхода — без оценки */
function prDelta(a, b, costly){ if (!b || !isFinite(a / b)) return ""; const d = a / b - 1; if (Math.abs(d) < 0.03) return `<span class="dlt">≈ ${L("як раніше","как раньше")}</span>`;
  const bad = costly ? d > 0 : d < 0; return `<span class="dlt${costly === "n" ? "" : " dlt--" + (bad ? "bad" : "good")}">${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%</span>`; }
const prKpi = (l, v, d) => `<div class="kpi"><small>${l}</small><strong>${v}</strong>${d || ""}</div>`;
function prKpis(s, v, cap, cur){ const cpl = s.leads ? s.spend / s.leads : 0, pcpl = v.leads ? v.spend / v.leads : 0, sales = s.book || s.pay;
  return `<div class="kpis kpis--${sales ? 6 : 5}">${prKpi(L("Витрати","Расход"), prM(s.spend, cur), prDelta(s.spend, v.spend, "n"))}${prKpi(L("Лідів","Лидов"), num(s.leads), prDelta(s.leads, v.leads))}
    ${prKpi(L("Ціна ліда","Цена лида"), cpl ? prM(cpl, cur) : "—", (cpl && pcpl ? prDelta(cpl, pcpl, true) : "") + (cap ? `<small>${L("стеля ","потолок ")}${prM(cap)}</small>` : ""))}
    ${prKpi("CTR", s.imp ? prPct(s.clicks / s.imp) : "—", s.imp && v.imp ? prDelta(s.clicks / s.imp, v.clicks / v.imp) : "")}${prKpi(L("Кліків","Кликов"), num(s.clicks), prDelta(s.clicks, v.clicks))}
    ${sales ? prKpi(L("Броні · оплати","Брони · оплаты"), num(s.book || 0) + " · " + num(s.pay || 0), s.rev && s.spend ? `<small>ROAS ${dec(s.rev / s.spend, 1)}</small>` : "") : ""}</div>`; }
const prFresh = p => { const fx = fxOf(p); return `<span class="sub mono">${fx.syncing ? L("оновлюємо з Meta…","обновляем из Meta…") : L("дані з Meta: ","данные из Meta: ") + fxWhen(fx.synced)}</span>`; };
const prSkel = () => `<div class="skel" role="status" aria-label="${L("Завантажуємо факт","Загружаем факт")}"><div class="kpis kpis--5">${Array(5).fill(`<div class="kpi">${sk("60%", 10)}${sk("45%", 20)}</div>`).join("")}</div>${sk("100%", 28)}${sk("100%", 28)}</div>`;

/* Сегодняшние цифры из Meta. День берётся по часам кабинета (Киев), а не по UTC: иначе после полуночи до 02:00–03:00
   сервер считал бы «сегодня» ещё вчерашним днём. Запасной путь — обычное обновление за два дня. */
async function prSyncToday(p, manual){ const fx = fxOf(p); if (fx.syncing) return; fx.syncing = true; fx.err = ""; render();
  const t = prToday(); let d = await mtCall({action:"history", project_id:p.id, since:t, until:t});
  if (!d.ok && d.error !== "meta" && d.error !== "not_connected") d = await mtCall({action:"sync", project_id:p.id, days:2});
  fx.syncing = false;
  if (!d.ok) { fx.err = d.error === "meta" || d.error === "not_connected" ? mtErr(d) : fxErr(d.detail || d.error); if (manual) toast(fx.err); render(); return; }
  fx.synced = d.synced_at || new Date().toISOString(); Object.keys(PD).forEach(k => { if (k.indexOf(p.id + "|") === 0) PD[k].at = 0; });
  if (manual) toast(L("Сьогоднішні цифри оновлено","Сегодняшние цифры обновлены")); await fxLoad(p); render(); }

/* ---------- переключатель периода над картой ---------- */
function prBar(){ if (!W.projs.some(prOn)) return ""; const r = prRange();
  const md = [["t", L("Сьогодні","Сегодня")], ["y", L("Вчора","Вчера")], ["3", "3 " + L("дн.","дн.")], ["7", "7 " + L("дн.","дн.")], ["14", "14 " + L("дн.","дн.")], ["30", "30 " + L("дн.","дн.")], ["m", L("Місяць","Месяц")], ["c", L("Свої дати","Свои даты")]];
  const busy = W.projs.some(p => prOn(p) && fxOf(p).syncing), one = W.projs.find(prOn);
  return `<div class="prbar"><div class="row sp"><div class="row"><span class="tag">${L("Період","Период")}</span><span class="seg" role="group" aria-label="${L("Період","Период")}">${md.map(m => `<button type="button" data-act="prMode" data-v="${m[0]}" aria-pressed="${String(PR.mode) === m[0]}">${m[1]}</button>`).join("")}</span></div>
    <div class="row"><span class="mono">${prLabel(r)}</span>${hint(PR.mode === "t" ? L("День ще йде: цифри — від півночі до останнього оновлення, порівняння — з усім учорашнім днем, тож витрати й ліди сьогодні майже завжди менші. Meta показує свіжі цифри із затримкою 15–30 хвилин. Ціна ліда й висновки чесні вже зараз, якщо витрачено достатньо.","День ещё идёт: цифры — от полуночи до последнего обновления, сравнение — со всем вчерашним днём, так что расход и лиды сегодня почти всегда меньше. Meta показывает свежие цифры с задержкой 15–30 минут. Цена лида и выводы честные уже сейчас, если потрачено достаточно.")
      : L("Цифри на картках і висновки — за цей період; порівняння — з таким самим періодом перед ним","Цифры на карточках и выводы — за этот период; сравнение — с таким же периодом перед ним") + " (" + (r.span === 1 ? prDM(r.p1) : prDM(r.p1) + "–" + prDM(r.p2)) + ").")}${prFresh(one)}<button class="btn btn--sm" data-act="prSync"${busy ? " disabled" : ""}>${L("Оновити з Meta","Обновить из Meta")}</button></div></div>
    ${PR.mode === "c" ? `<div class="row prdates"><label>${L("з","с")} <input type="date" id="pr-d1" value="${PR.d1 || r.d1}" max="${prToday()}"></label><label>${L("по","по")} <input type="date" id="pr-d2" value="${PR.d2 || r.d2}" max="${prToday()}"></label><button class="btn btn--sm btn--solid" data-act="prCustom">${L("Показати","Показать")}</button></div>` : ""}</div>`; }

/* ---------- аккаунты пятым уровнем, кампании шестым ---------- */
const prPl = n => plural(n, L("лід","лид"), L("ліди","лида"), L("лідів","лидов"));
function prCampNodes(p, f, c, ck, acc){ const x = prOf(p); if (!x.cur) return [];
  const cap = prCap(f, p), cur = prCur(p), prev = prRowsA(p, x.prev, f, c, x, acc), rows = prRowsA(p, x.cur, f, c, x, acc).filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend);
  const PR_TOP = prTh().top, nodes = rows.slice(0, PR_TOP).map(r => { const v = prev.find(o => o.id === r.id) || {}, j = prMain(prJudge(r, v, cap, cur)) || {lv:"mute", t:""};
    return {k:ck + "/" + r.id, lv:5, t:r.name, s:prM(r.spend, cur) + " · " + prPl(r.leads) + (r.leads ? L(" по "," по ") + prM(r.spend / r.leads, cur) : ""), m:j.t, v:j.lv}; });
  if (rows.length > PR_TOP) nodes.push({more:1, k:ck, lv:5, t:L("ще ","ещё ") + plural(rows.length - PR_TOP, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), s:L("усі — у панелі акаунта","все — в панели аккаунта")});
  return nodes; }
/* пять главных цифр аккаунта за период */
const prFive = (s, cur) => [[L("Витрати","Расход"), prM(s.spend, cur)], [L("Ліди","Лиды"), num(s.leads)], [L("Ціна ліда","Цена лида"), s.leads ? prM(s.spend / s.leads, cur) : "—"], ["CTR", s.imp ? prPct(s.clicks / s.imp) : "—"], [L("Оплати","Оплаты"), num(s.pay)]];
/* те же пять цифр для карточки воронки (все каналы) или канала */
function prCardKpi(p, f, c){ if (!prOn(p)) return null; const x = prOf(p); if (!x.cur) return null;
  const rows = x.cur.filter(r => fxFunnel(p, r) === f.id && (!c || r.prov === c)).map(r => Object.assign({}, r, x.sb[fxKey(r.name)] || {}));
  return prFive(fxSum(rows), prCur(p)); }
/* аккаунты воронки в канале: те, где за период был расход; если расхода нет нигде — все подключённые */
function prAccList(p, f, c){ const x = prOf(p), rows = prRows(p, x.cur, f, c, x), prev = prRows(p, x.prev, f, c), ids = [];
  rows.forEach(r => { const a = prAccOf(x, r.id); if (r.spend > 0 && !ids.includes(a)) ids.push(a); });
  if (!ids.length) prAccs(p).forEach(a => ids.push(String(a.id)));
  return ids.map(id => { const own = rows.filter(r => prAccOf(x, r.id) === id); return {id, name:prAccName(p, id), s:fxSum(own), v:fxSum(prev.filter(r => prAccOf(x, r.id) === id)), n:own.filter(r => r.spend > 0).length}; }).sort((a, b) => b.s.spend - a.s.spend); }
function prAccNodes(p, f, c, ck){ if (c !== "meta" || !prOn(p)) return []; const x = prOf(p); if (!x.cur || !x.am) return [];
  const cap = prCap(f, p), cur = prCur(p), list = prAccList(p, f, c);
  return list.map(a => { const k = ck + "/" + prAK(a.id), j = prMain(prJudge(a.s, a.v, cap, cur)) || {lv:"", t:a.s.spend ? "" : L("витрат немає","расхода нет")};
    const n = {k, lv:4, t:a.name, kpi:prFive(a.s, cur), m:j.t, v:j.lv}, kids = prCampNodes(p, f, c, k, a.id);
    if (kids.length) { n.kids = kids; n.can = true; n.fold = mapFolded(k, list.length > 1); n.ics = []; n.stub = [plural(a.n, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), L("з витратами за період","с расходом за период")]; if (n.fold && MP.sel && MP.sel.indexOf(k + "/") === 0) MP.sel = k; }
    return n; }); }

/* ---------- панель канала ---------- */
function prChanPanel(p, f, c, acc){ const ch = chOf(c), x = prOf(p), cur = prCur(p), cap = prCap(f, p), ck = "co/" + p.id + "/" + f.id + "/" + c, one = acc != null;
  const head = one ? `${lvTag(4)}<div class="row sp"><h2>${esc(prAccName(p, acc))}</h2>${prFresh(p)}</div><p class="sub">${acc ? `<span class="mono">act_${esc(acc)}</span> · ` : ""}${ch[1]} · ${esc(f.name)} · ${esc(p.name)} · <span class="mono">${prLabel(x.r)}</span></p>`
    : `${lvTag(3)}<div class="row sp"><h2>${chIcon(c)} ${ch[1]}</h2>${prFresh(p)}</div><p class="sub">${esc(f.name)} · ${esc(p.name)} · <span class="mono">${prLabel(x.r)}</span></p>`;
  let btns = `<div class="row"><button class="btn btn--sm btn--solid" data-act="mapOpenF" data-p="${p.id}" data-id="${f.id}">${L("Аналітика воронки","Аналитика воронки")}</button><button class="btn btn--sm" data-act="mapConn" data-id="${p.id}">${L("Підключення проєкту","Подключения проекта")}</button><button class="btn btn--sm" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${c}">${L("Прибрати канал із воронки","Убрать канал из воронки")}</button></div>`;
  if (x.err && !x.cur) return `<div class="panel">${head}<p class="mterr">${esc(x.err)}</p>${btns}</div>`;
  if (!x.cur || !x.am) return `<div class="panel">${head}${prSkel()}</div>`;
  const rows = prRowsA(p, x.cur, f, c, x, acc), prev = prRowsA(p, x.prev, f, c, x, acc), s = fxSum(rows), v = fxSum(prev);
  if (one) btns = `<div class="row"><button class="btn btn--sm" data-act="mapSel" data-k="${esc(ck)}">${L("← Увесь канал","← Весь канал")}</button><button class="btn btn--sm" data-act="mapConn" data-id="${p.id}">${L("Підключення проєкту","Подключения проекта")}</button></div>`;
  if (!s.spend && !s.imp) return `<div class="panel">${head}<p class="sub">${one ? L("За цей період у цього акаунта в цій воронці не було показів.","За этот период у этого аккаунта в этой воронке не было показов.") : L("За цей період у кампаній цієї воронки не було показів.","За этот период у кампаний этой воронки не было показов.")}${v.spend ? L(" У минулому періоді було витрачено "," В прошлом периоде было потрачено ") + prM(v.spend, cur) + "." : ""}</p>${btns}</div>`;
  const js = prJudge(s, v, cap, cur), list = rows.filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend).map(r => ({r, v:prev.find(o => o.id === r.id) || {}}));
  list.forEach(o => { o.j = prMain(prJudge(o.r, o.v, cap, cur)) || {lv:"mute", t:"—"}; });
  const bad = list.filter(o => o.j.lv === "crit");
  if (bad.length && list.length > 1) js.unshift({lv:"crit", t:L("Кампаній, де потрібне рішення: ","Кампаний, где нужно решение: ") + bad.length, why:bad.map(o => o.r.name + " — " + prM(o.r.spend, cur)).join("; "), todo:L("Вони дорожчі за стелю або витрачають без лідів. Відкрийте кожну в таблиці нижче: там причина й що зробити.","Они дороже потолка или тратят без лидов. Откройте каждую в таблице ниже: там причина и что сделать.")});
  if ((x.am.err || rows.some(r => r.spend > 0 && !prAccOf(x, r.id))) && prAccs(p).length > 1) js.push({lv:"mute", t:L("Акаунти не розділено","Аккаунты не разделены"), why:L("Сервер ще не зберігає, з якого акаунта кожна кампанія","Сервер ещё не хранит, из какого аккаунта каждая кампания") + (x.am.err ? ": " + x.am.err : "."), todo:L("Виконайте в Supabase файл schema_history.sql, оновіть код функції meta й натисніть «Оновити з Meta».","Выполните в Supabase файл schema_history.sql, обновите код функции meta и нажмите «Обновить из Meta».")});
  const au = rows.filter(r => r.spend > 0 && fxAuto(p, r)); if (au.length) js.push({lv:"mute", t:L("Воронку поставили самі: ","Воронку поставили сами: ") + plural(au.length, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), why:L("У назвах цих кампаній немає назви воронки, а воронка в проєкті одна — тому віднесли до неї: ","В названиях этих кампаний нет названия воронки, а воронка в проекте одна — поэтому отнесли к ней: ") + au.map(r => r.name).join("; "), todo:L("Якщо якась кампанія не про цю воронку — зніміть прив’язку у проєкті, вкладка «Підключення».","Если какая-то кампания не про эту воронку — снимите привязку в проекте, вкладка «Подключения».")});
  const fx = fxOf(p); if (fx.synced && Date.now() - new Date(fx.synced).getTime() > 26 * 3600e3) js.push({lv:"warn", t:L("Дані застаріли","Данные устарели"), why:L("Останнє оновлення з Meta — ","Последнее обновление из Meta — ") + fxWhen(fx.synced) + ".", todo:L("Натисніть «Оновити з Meta» над картою.","Нажмите «Обновить из Meta» над картой.")});
  const tbl = `<div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th><th class="n">${L("До минулого","К прошлому")}</th><th>${L("Висновок","Вывод")}</th></tr></thead><tbody>
    ${list.map(o => `<tr data-act="mapSel" data-k="${esc(ck + "/" + prAK(prAccOf(x, o.r.id)) + "/" + o.r.id)}" tabindex="0"><td class="mono">${esc(o.r.name)}</td><td class="n mono">${prM(o.r.spend, cur)}</td><td class="n mono">${num(o.r.leads)}</td><td class="n mono">${o.r.leads ? prM(o.r.spend / o.r.leads, cur) : "—"}</td><td class="n">${o.r.leads && o.v.leads ? prDelta(o.r.spend / o.r.leads, o.v.spend / o.v.leads, true) : o.v.spend ? "" : `<span class="sub">${L("нова","новая")}</span>`}</td><td>${prPill(o.j)}</td></tr>`).join("")}</tbody></table></div>`;
  const al = one ? [] : prAccList(p, f, c), atbl = al.length > 1 ? `<span class="tag">${L("Рекламні акаунти","Рекламные аккаунты")} · ${al.length}</span><div class="tw"><table><thead><tr><th>${L("Акаунт","Аккаунт")}</th>${prFive({spend:0, imp:0, clicks:0, leads:0, pay:0}, cur).map(k => `<th class="n">${k[0]}</th>`).join("")}<th>${L("Висновок","Вывод")}</th></tr></thead><tbody>
    ${al.map(a => { const j = prMain(prJudge(a.s, a.v, cap, cur)) || {lv:"mute", t:"—"}; return `<tr data-act="mapSel" data-k="${esc(ck + "/" + prAK(a.id))}" tabindex="0"><td>${esc(a.name)}</td>${prFive(a.s, cur).map(k => `<td class="n mono">${k[1]}</td>`).join("")}<td>${prPill(j)}</td></tr>`; }).join("")}</tbody></table></div>` : "";
  return `<div class="panel">${head}${prKpis(s, v, cap, cur)}<span class="tag">${L("Висновки","Выводы")} ${hint(L("Висновки рахуються за правилами: стеля ціни ліда воронки, порівняння з минулим періодом, CTR. Частку «клік → завантаження сторінки» додамо, коли сервер почне забирати завантаження сторінок. Платформа нічого не змінює в кабінеті сама.","Выводы считаются по правилам: потолок цены лида воронки, сравнение с прошлым периодом, CTR. Долю «клик → загрузка страницы» добавим, когда сервер начнёт забирать загрузки страниц. Платформа ничего не меняет в кабинете сама."))}</span>${prList(js)}${atbl}<span class="tag">${L("Кампанії за період","Кампании за период")} · ${list.length}</span>${tbl}${btns}</div>`; }

/* ---------- панель кампании ---------- */
function prCampPanel(p, f, c, id){ const x = prOf(p), cur = prCur(p), cap = prCap(f, p), ck = "co/" + p.id + "/" + f.id + "/" + c + "/" + prAK(prAccOf(x, id));
  if (!x.cur || !x.am) return `<div class="panel">${lvTag(5)}${prSkel()}</div>`;
  const r = prRows(p, x.cur, f, c, x).find(o => o.id === id), v = prRows(p, x.prev, f, c).find(o => o.id === id) || {spend:0, imp:0, clicks:0, leads:0};
  const back = `<button class="btn btn--sm" data-act="mapSel" data-k="${esc(ck)}">${L("← Акаунт ","← Аккаунт ")}${esc(prAccName(p, prAccOf(x, id)))}</button>`;
  if (!r) return `<div class="panel">${lvTag(5)}<p class="sub">${L("За цей період у кампанії немає даних.","За этот период у кампании нет данных.")}</p><div class="row">${back}</div></div>`;
  const js = prJudge(r, v, cap, cur), sets = (x.sets || []).filter(o => o.cid === id && o.spend > 0).sort((a, b) => b.spend - a.spend), ads = (x.ads || []).filter(o => o.cid === id && o.spend > 0).sort((a, b) => b.spend - a.spend);
  const TH = prTh(), stop = cap ? ads.filter(a => !a.leads && a.spend >= TH.noLead * cap) : [];
  if (stop.length) js.push({lv:"crit", t:L("Оголошення без лідів: ","Объявления без лидов: ") + stop.length, why:stop.map(a => a.name + " — " + prM(a.spend, cur)).join("; "), todo:L("Кожне витратило ","Каждое потратило ") + dec(TH.noLead, 1).replace(/[.,]0$/, "") + L(" стелі ціни ліда без жодного ліда — кандидати на вимкнення."," потолка цены лида без единого лида — кандидаты на выключение.")});
  const row = (o, nm, add) => { const cpl = o.leads ? o.spend / o.leads : 0, lv = !cap ? "" : !o.leads ? (o.spend >= TH.noLead * cap ? "crit" : "") : cpl > cap * 1.5 ? "crit" : cpl > cap ? "warn" : "good";
    return `<tr><td class="mono">${esc(nm)}</td><td class="n mono">${prM(o.spend, cur)}</td><td class="n mono">${num(o.clicks)}</td><td class="n mono">${o.imp ? prPct(o.clicks / o.imp) : "—"}</td><td class="n mono">${num(o.leads)}</td><td class="n">${cpl ? `<span class="mono">${prM(cpl, cur)}</span>` : "—"} ${lv ? pill(lv, lv === "good" ? L("у стелі","в потолке") : lv === "warn" ? L("вище стелі","выше потолка") : o.leads ? L("понад 1,5 стелі","выше 1,5 потолка") : L("без лідів","без лидов")) : ""}</td>${add !== undefined ? `<td class="n">${add}</td>` : ""}</tr>`; };
  const th = (first, ex) => `<thead><tr><th>${first}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">CTR</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${ex ? "<th></th>" : ""}</tr></thead>`;
  return `<div class="panel">${lvTag(5)}<div class="row sp"><h2 class="mono prname">${esc(r.name)}</h2>${prFresh(p)}</div><p class="sub">${chOf(c)[1]} · ${esc(f.name)} · ${esc(p.name)} · <span class="mono">${prLabel(x.r)}</span></p>
    ${prKpis(r, v, cap, cur)}<span class="tag">${L("Висновок","Вывод")} ${hint(L("Броні й оплати — з файлів продажів за датою вебінару в цьому періоді, за міткою utm_campaign. Платформа нічого не змінює в кабінеті сама.","Брони и оплаты — из файлов продаж по дате вебинара в этом периоде, по метке utm_campaign. Платформа ничего не меняет в кабинете сама."))}</span>${prList(js)}
    ${prAddRow(p, f, x, id, r.name, sets)}
    ${sets.length ? `<span class="tag">${L("Групи оголошень","Группы объявлений")} · ${sets.length}</span><div class="tw"><table>${th(L("Група","Группа"), prCanAdd(p))}<tbody>${sets.map(o => row(o, o.name, !prCanAdd(p) ? undefined : o.id ? `<button type="button" class="btn btn--sm btn--ico" data-act="bdTarget" data-mode="ad" data-p="${p.id}" data-f="${f.id}" data-cid="${esc(id)}" data-cn="${esc(r.name)}" data-aid="${esc(o.id)}" data-an="${esc(o.name)}" data-acc="${esc(prAccOf(x, id))}" aria-label="${L("Нові оголошення в цій групі","Новые объявления в этой группе")}" title="${L("Нові оголошення в цій групі","Новые объявления в этой группе")}">+</button>` : "")).join("")}</tbody></table></div>` : ""}
    ${ads.length ? `<span class="tag">${L("Оголошення","Объявления")} · ${ads.length}</span><div class="tw"><table>${th(L("Оголошення","Объявление"))}<tbody>${ads.slice(0, 40).map(o => row(o, o.name)).join("")}</tbody></table></div>` : ""}
    <div class="row">${back}<button class="btn btn--sm" data-act="mapOpenF" data-p="${p.id}" data-id="${f.id}">${L("Аналітика воронки","Аналитика воронки")}</button></div></div>`; }

/* ---------- обзор: компания или проект целиком ---------- */
function prOverview(only){ const ps = (only ? [only] : W.projs).filter(prOn); if (!ps.length) return "";
  ps.forEach(prLoad); const r = prRange();
  if (ps.some(p => !prOf(p).cur && !prOf(p).err)) return `<div class="panel"><span class="tag">${L("Пульс реклами","Пульс рекламы")} · ${prLabel(r)}</span>${prSkel()}</div>`;
  const curs = [...new Set(ps.map(p => prCur(p) || "USD"))], cur = curs.length === 1 ? curs[0] : "", att = [], lost = [];
  let s = {spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0}, v = Object.assign({}, s);
  ps.forEach(p => { const x = prOf(p); if (!x.cur) return; const add = (a, b) => { ["spend", "imp", "clicks", "leads", "book", "pay", "rev"].forEach(k => { a[k] += b[k] || 0; }); };
    const all = x.cur.map(o => Object.assign({}, o, x.sb[fxKey(o.name)] || {})); all.forEach(o => add(s, o)); x.prev.forEach(o => add(v, o));
    const nl = all.filter(o => o.spend > 0 && !fxFunnel(p, o)); if (nl.length) lost.push({p, n:nl.length, spend:nl.reduce((a, o) => a + o.spend, 0)});
    p.funnels.forEach(f => (f.ch || []).forEach(c => { const prev = prRows(p, x.prev, f, c), cap = prCap(f, p);
      prRows(p, x.cur, f, c, x).filter(o => o.spend > 0).forEach(o => { const j = prMain(prJudge(o, prev.find(q => q.id === o.id) || {}, cap, prCur(p)));
        if (j && (j.lv === "crit" || j.lv === "warn")) att.push({p, f, c, o, j}); }); })); });
  att.sort((a, b) => PRANK[b.j.lv] - PRANK[a.j.lv] || b.o.spend - a.o.spend);
  const cpl = s.leads ? s.spend / s.leads : 0, pcpl = v.leads ? v.spend / v.leads : 0;
  const kp = cur ? `<div class="kpis kpis--5">${prKpi(L("Витрати","Расход"), prM(s.spend, cur), prDelta(s.spend, v.spend, "n"))}${prKpi(L("Лідів","Лидов"), num(s.leads), prDelta(s.leads, v.leads))}${prKpi(L("Ціна ліда","Цена лида"), cpl ? prM(cpl, cur) : "—", cpl && pcpl ? prDelta(cpl, pcpl, true) : "")}${prKpi("CTR", s.imp ? prPct(s.clicks / s.imp) : "—", s.imp && v.imp ? prDelta(s.clicks / s.imp, v.clicks / v.imp) : "")}${prKpi(L("Броні · оплати","Брони · оплаты"), num(s.book) + " · " + num(s.pay), s.rev && s.spend ? `<small>ROAS ${dec(s.rev / s.spend, 1)}</small>` : "")}</div>` : `<p class="sub">${L("У кабінетів різна валюта, тому загальну суму не складаємо — дивіться по проєктах.","У кабинетов разная валюта, поэтому общую сумму не складываем — смотрите по проектам.")}</p>`;
  const errs = ps.filter(p => prOf(p).err && !prOf(p).cur).map(p => `<p class="mterr">${esc(p.name)}: ${esc(prOf(p).err)}</p>`).join("");
  const items = att.slice(0, 8).map(a => `<li class="prv--${a.j.lv}"><div><b>${esc(a.j.t)}</b> · <span class="mono">${esc(a.o.name)}</span> <span class="sub">${esc((ps.length > 1 ? a.p.name + " · " : "") + a.f.name)}</span></div><div class="sub">${esc(a.j.why)}</div><div class="row"><button class="btn btn--sm" data-act="prGo" data-k="${esc("co/" + a.p.id + "/" + a.f.id + "/" + a.c + "/" + prAK(prAccOf(prOf(a.p), a.o.id)) + "/" + a.o.id)}">${L("Відкрити кампанію","Открыть кампанию")}</button></div></li>`).join("")
    + lost.map(l => `<li class="prv--warn"><div><b>${L("Кампанії без воронки: ","Кампании без воронки: ")}${l.n}</b> <span class="sub">${esc(l.p.name)}</span></div><div class="sub">${L("Їхні витрати ","Их расход ")}${prM(l.spend, prCur(l.p))}${L(" не потрапляють на карту й у висновки воронок."," не попадает на карту и в выводы воронок.")}</div><div class="row"><button class="btn btn--sm" data-act="wsOpenP" data-id="${l.p.id}">${L("Прив’язати у проєкті","Привязать в проекте")}</button></div></li>`).join("");
  return `<div class="panel"><div class="row sp"><span class="tag">${L("Пульс реклами","Пульс рекламы")} · ${prLabel(r)}${only ? " · " + esc(only.name) : ""}</span></div>${errs}${s.spend || s.imp ? kp : `<p class="sub">${L("За цей період показів не було.","За этот период показов не было.")}</p>`}
    <span class="tag">${L("Потребує уваги","Требует внимания")}${att.length + lost.length ? " · " + (att.length + lost.length) : ""}</span>
    ${items ? `<ul class="prv">${items}</ul>` : `<p class="sub">${s.spend ? L("Усі кампанії в межах стелі або ще рано судити.","Все кампании в пределах потолка или ещё рано судить.") : "—"}</p>`}</div>`; }

Object.assign(ACT, {
  prMode(d){ PR.touched = 1; PR.mode = d.v === "t" || d.v === "y" || d.v === "m" || d.v === "c" ? d.v : +d.v;
    if (PR.mode === "t") W.projs.filter(prOn).forEach(p => { const fx = fxOf(p); if (!fx.synced || Date.now() - new Date(fx.synced).getTime() > 15 * 60000) prSyncToday(p, false); }); if (d.v === "c" && !PR.d1) { PR.d2 = prShift(prToday(), -1); PR.d1 = prShift(prToday(), -7); } },
  prCustom(){ const a = (document.getElementById("pr-d1") || {}).value, b = (document.getElementById("pr-d2") || {}).value;
    if (!a || !b) { toast(L("Вкажіть обидві дати","Укажите обе даты")); return false; }
    if (Math.abs(Date.parse(b) - Date.parse(a)) / 864e5 > 92) { toast(L("Період — не довше 93 днів","Период — не длиннее 93 дней")); return false; }
    PR.d1 = a; PR.d2 = b; PR.mode = "c"; },
  prSync(){ W.projs.filter(prOn).forEach(p => PR.mode === "t" ? prSyncToday(p, true) : fxSync(p, true)); },
  prGo(d){ const ps = d.k.split("/"); for (let i = 2; i < ps.length; i++) MP.fold[ps.slice(0, i).join("/")] = false; MP.sel = d.k;
    setTimeout(() => { const e = document.querySelector(".map .panel"); if (e) e.scrollIntoView({block:"start", behavior:"smooth"}); }, 0); },
});

/* добавить в существующую кампанию: новая группа; в существующую группу — новые объявления. Только при подключении с правом записи. */
const prCanAdd = p => !!(typeof bdConn === "function" && bdConn(p) && bdCanWrite(bdConn(p)));
function prAddRow(p, f, x, cid, cn, sets){ if (!prCanAdd(p)) return "";
  return `<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="bdTarget" data-mode="adset" data-p="${p.id}" data-f="${f.id}" data-cid="${esc(cid)}" data-cn="${esc(cn)}" data-acc="${esc(prAccOf(x, cid))}">+ ${L("Група в цю кампанію","Группа в эту кампанию")}</button>${sets.some(o => o.id) ? `<span class="sub">${L("+ у рядку групи — нові оголошення в ній","+ в строке группы — новые объявления в ней")}</span>` : ""}</div>`; }
