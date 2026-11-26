/* Пульс рекламы на карте: период, факт за период против прошлого такого же периода, выводы и кампании пятым уровнем.
   Выводы считает обычный код по правилам — без ИИ и без платного API. Платформа ничего не меняет в кабинете сама:
   только говорит, что видит, почему и что сделать.
   Данные — те же своды на сервере, что у блока «Факт рекламы». Подключается после fact.js. */
const PR = {mode:meMode(), d1:"", d2:""};   /* период карты: y — вчера, 3/7/14/30 — дней по вчера, m — месяц по сегодня, c — свои даты */
const PD = {};
const PROV_CH = {google:"gg", tiktok:"tt", telegram:"tga"};       /* название канала в базе → код канала на карте */                          /* данные по проекту и периоду */
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
/* у канала воронки есть статистика на сервере: Meta — по подключению, остальные — по строкам с этим каналом */
const prHas = (p, f, c) => { if (!prOn(p)) return false; if (c === "meta") return true; const x = prOf(p); return !!(x.cur && x.cur.some(r => r.prov === c && fxFunnel(p, r) === f.id)); };
const prCur = p => (p.meta.conn.account || {}).currency || "";
const prM = (v, cur) => { const s = v >= 1000 ? num(v) : fxM(v); return !cur || cur === "USD" ? (s + " $") : s + " " + cur; };
const prPct = v => dec(v * 100, v < 0.1 ? 2 : 1) + "%";
function prOf(p){ const r = prRange(), k = p.id + "|" + r.key; return PD[k] = PD[k] || {r, cur:null, prev:null, sets:null, ads:null, sb:null, loading:false, at:0, synced:null, err:""}; }

/* читает своды за период и за прошлый такой же; если на сервере нет данных так далеко назад — один раз дотягивает из Meta */
function prLoad(p){ if (!prOn(p)) return; const x = prOf(p), fx = fxOf(p), r = x.r; fxStart(p);
  if (x.loading || x.at && x.synced === fx.synced && Date.now() - x.at < 10 * 60000) return;
  x.loading = true; x.err = "";
  const q = (fn, a) => Promise.resolve(sb.rpc(fn, Object.assign({p:p.id}, a))).then(res => res.error ? (x.err = x.err || fxErr(res.error.message), null) : (res.data || []), e => (x.err = x.err || fxErr(e && e.message), null));
  const camp = o => ({prov:PROV_CH[o.provider] || o.provider, f:o.funnel_id || "", id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0});
  Promise.all([q("ad_summary", {d1:r.d1, d2:r.d2}), q("ad_summary", {d1:r.p1, d2:r.p2}), q("ad_adsets", {d1:r.d1, d2:r.d2}), q("ad_creatives", {d1:r.d1, d2:r.d2}), q("sales_summary", {d1:r.d1, d2:r.d2}), prAccMap(p, x), Promise.resolve(sb.rpc("ad_camp_window", {p:p.id, d:prToday()})).then(z => z.data || [], () => [])]).then(([c, pv, gs, as, ss, am, cw]) => {
    (cw || []).forEach(o => { PW[o.campaign_id] = {first:o.first_day, start:o.data_start, s3:+o.s3 || 0, l3:+o.l3 || 0, s0:+o.s0 || 0, l0:+o.l0 || 0}; });
    x.cur = c ? c.map(camp) : null; x.prev = pv ? pv.map(camp) : [];
    if (x.am && x.am.map) { const off = r0 => { const a = x.am.map[r0.id], w = prAccs(p, r0.prov).map(z => String(z.id)); return a && w.length && !w.includes(a); }, gone = new Set();
      if (x.cur) x.cur = x.cur.filter(r0 => off(r0) ? (gone.add(r0.id), false) : true); x.prev = x.prev.filter(r0 => !off(r0)); x.gone = gone; }
    x.sets = gs ? gs.map(o => ({cid:o.campaign_id, id:o.adset_id || "", name:o.adset_name || o.adset_id || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})) : [];
    x.ads = as ? as.map(o => ({cid:o.campaign_id, name:o.ad_name || "—", spend:+o.spend || 0, imp:+o.impressions || 0, clicks:+o.clicks || 0, leads:+o.leads || 0})) : [];
    if (x.gone && x.gone.size) { x.sets = x.sets.filter(o => !x.gone.has(o.cid)); x.ads = x.ads.filter(o => !x.gone.has(o.cid)); }
    x.sb = {}; (ss || []).forEach(o => { const k = fxKey(o.utm_campaign), t = x.sb[k] = x.sb[k] || {book:0, pay:0, rev:0}, cur = o.currency || "", rate = cur === "USD" || !cur ? 1 : (p.fx || {})[cur];
      if (o.kind === "booking") t.book += +o.events || 0; else if (o.kind === "payment") { t.pay += +o.events || 0; t.rev += rate ? (+o.amount || 0) / rate : 0; } });
    x.loading = false; x.at = Date.now(); x.synced = fx.synced; if (!S.modal) render();
    if (PR.mode === "t" && !PR.auto && !fx.syncing && fx.synced && Date.now() - new Date(fx.synced).getTime() > 15 * 60000) { PR.auto = 1; prSyncToday(p, false); } });
  const need = Math.round((Date.parse(prToday()) - Date.parse(r.p1)) / 864e5) + 1;
  if (need > Math.max(fx.cover || 0, 8) && !x.deep) { x.deep = true;
    mtCall({action:"sync", project_id:p.id, days:Math.min(90, need)}).then(d => { if (!d.ok) return; fx.synced = d.synced_at; fx.cover = Math.max(fx.cover || 0, need); x.at = 0; if (!S.modal) render(); }); } }

/* ---------- рекламные аккаунты: какой кампании какой аккаунт ----------
   Аккаунт кампании берётся из строк статистики (колонка account_id, schema_history.sql). Если у проекта один аккаунт — все кампании его. */
const PR_CH = ["meta", "gg", "tt", "tga"];
const prAccs = (p, ch) => { const c = !ch || ch === "meta" ? p.meta.conn || {} : ((p.ads || {})[ch] || {}); return c.accounts && c.accounts.length ? c.accounts : c.account ? [c.account] : []; };
function prAccMap(p, x){ const one = {}; PR_CH.forEach(ch => { const a = prAccs(p, ch); if (a.length === 1) one[ch] = String(a[0].id); });
  const out = {}, page = i => Promise.resolve(sb.from("ad_metrics").select("campaign_id,account_id").eq("project_id", p.id).gte("day", x.r.p1).lte("day", x.r.d2).range(i * 1000, i * 1000 + 999))
    .then(res => { if (res.error) { x.am = {err:res.error.message}; return; } const d = res.data || []; d.forEach(o => { if (o.account_id) out[o.campaign_id] = String(o.account_id); });
      if (d.length === 1000 && i < 29) return page(i + 1); x.am = {map:out, one}; }, e => { x.am = {err:String(e && e.message || e)}; });
  return page(0); }
const prAccOf = (x, id, ch) => !x.am ? "" : (x.am.map && x.am.map[id]) || (x.am.one || {})[ch || "meta"] || "";
const prAccName = (p, id, ch) => { const a = prAccs(p, ch).find(o => String(o.id) === id); return !id ? L("Акаунт не визначено","Аккаунт не определен") : a && a.name && a.name !== a.id ? a.name : id; };
const prAK = id => "a" + (id || "_");                                  /* кусок ключа карты для аккаунта */
const prAId = k => k === "a_" ? "" : k.slice(1);

/* строки кампаний воронки в канале, с бронями и оплатами по точному совпадению метки utm_campaign */
const prRows = (p, list, f, c, x) => (list || []).filter(r => r.prov === c && fxFunnel(p, r) === f.id).map(r => Object.assign({}, r, (x && x.sb && x.sb[fxKey(r.name)]) || {}));
const prRowsA = (p, list, f, c, x, acc) => prRows(p, list, f, c, x).filter(r => acc == null || prAccOf(prOf(p), r.id, c) === acc);
/* цель для решений Хиро — та же, что у автопилота на сервере (pilot / review): «Ціль: ціна ліда до» из настроек автопилота; без них — потолок воронки */
/* одна норма везде (Дмитрий, 25.11: на карте «Лід дорожчий за норму» по потолку воронки 3,6 $, а Хиро и «Сьогодні» — по цели автопилота 6 $):
   цель зоны автопилота этой воронки → общая цель автопилота → потолок из целей воронки */
const prT = (f, p) => { const st = typeof PL !== "undefined" ? PL.st[p.id] : null, S = st && st.ok && st.settings ? st.settings : null;
  const z = S && Array.isArray(S.zones) ? S.zones.find(q => q && q.fid === (f && f.id) && q.on !== false) : null, t = z && +z.target_cpl > 0 ? +z.target_cpl : S ? Number(S.target_cpl) : 0;
  /* QA P1 (26.11): пока настройки автопилота не загрузились, не откатываемся на старый потолок 3,60 $ — берём последнюю известную цель
     (память браузера) или 0 = «пока не судим»; потолок воронки — только если автопилота у проекта нет */
  const ck = "heyrow_T_" + p.id + "_" + ((f && f.id) || "");
  if (t > 0) { try { localStorage.setItem(ck, String(t)); } catch (e) { /* */ } return t; }
  if (!S && typeof CLOUD !== "undefined" && CLOUD && p.meta && p.meta.conn) { let c = 0; try { c = +localStorage.getItem(ck) || 0; } catch (e) { /* */ }
    if (!st && typeof plLoad === "function" && typeof PL !== "undefined" && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0); return c; }
  return prCap(f, p); };
const prCap = (f, p) => { const c = fT(f, p).cap; return c > 0 && isFinite(c) ? c : 0; };

/* Пороги выводов и число кампаний на доске — настройки компании (раздел «Настройки»); здесь значения по умолчанию. */
/* ---------- Хиро: «цена лида точно плохая или это разброс» (knowledge/small-numbers.md §6, решение Дмитрия 24.11.2026) ----------
   Лиды — случайные события (Пуассон). «Плохо» — только если с уверенностью 95% (до 10:00 — 99%) цена хуже нормы.
   Норма в обучении выше: дни 1–3 — потолок ×1,3, дни 4–7 — ×1,15. Сегодняшние лиды Meta досчитывает: видно ~85%.
   В режимах «сегодня» и «вчера» решаем по 3 дням (с сегодня), а не по одному дню. */
function poissonCdf(k, lam){ if (k < 0) return 0; if (lam <= 0) return 1; let t = -lam, sum = Math.exp(t); for (let i = 1; i <= k; i++){ t += Math.log(lam / i); sum += Math.exp(t); } return Math.min(1, sum); }
function poissonUpper(k, p){ let lo = 0, hi = k + 60 + 10 * Math.sqrt(k + 1); for (let i = 0; i < 80; i++){ const m = (lo + hi) / 2; if (poissonCdf(k, m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
const HJ = {lag:0.85, bad:0.95, early:0.99, lf:d => !d || d < 1 ? 1 : d <= 3 ? 1.3 : d <= 7 ? 1.15 : 1};
function judgeCpl(o){ const k = Math.max(0, Math.floor(o.leads || 0)), Lf = HJ.lf(o.ld), Teff = o.target * Lf, c = o.lag || 1, Seff = o.spend * c;
  const q = poissonCdf(k, Seff / Teff), confBad = 1 - q, need = o.hour != null && o.hour < 10 ? HJ.early : HJ.bad;
  const extra = Math.max(1, Math.floor(poissonUpper(k, 0.2) / c) - k), cplIf = o.spend / (k + extra), stopAt = Math.max(o.spend, poissonUpper(k, 1 - need) * Teff / c);
  const verdict = confBad >= need ? "bad" : k >= 1 && Seff / k <= Teff ? "ok" : "wait";
  return {verdict, q, confBad, Teff, Lf, k, cpl:k ? o.spend / k : 0, extra, cplIf, stopAt, early:o.spend < Teff && !k}; }
/* окно кампании: день обучения (от первого дня с расходом, если он есть в загруженной истории) и расход/лиды за 3 дня с сегодня */
const PW = {};
const prWin = id => PW[id] || null;
const prLday = w => { if (!w || !w.first || !w.start || w.first <= w.start) return null; const d = Math.round((Date.parse(prToday()) - Date.parse(w.first)) / 864e5) + 1; return d >= 1 && d <= 7 ? d : null; };
const prIf = (J, m) => J.cplIf <= J.Teff ? L("Ще ","Еще ") + plural(J.extra, L("лід","лид"), L("ліди","лида"), L("лідів","лидов")) + L(" — і ціна буде "," — и цена будет ") + m(J.cplIf) + L(": це звичайний розкид, у нормі.",": это обычный разброс, в норме.")
  : L("Навіть з ще ","Даже с еще ") + plural(J.extra, L("лідом","лидом"), L("лідами","лидами"), L("лідами","лидами")) + L(" ціна була б "," цена была бы ") + m(J.cplIf) + L(" — вище норми "," — выше нормы ") + m(J.Teff) + ".";
/* что судим: в режимах «сегодня»/«вчера» — окно 3 дней кампании; иначе — выбранный период (с поправкой, если в нём сегодня) */
function prJ(s, cap){ const w = s.id ? prWin(s.id) : null, short = PR.mode === "t" || PR.mode === "y", today = PR.mode === "t" || PR.mode === "m";
  let S = s.spend, K = s.leads, s0 = today && w ? w.s0 : 0, win = "";
  if (w && short && w.s3 > 0){ S = w.s3; K = w.l3; s0 = w.s0; win = L(" за 3 дні"," за 3 дня"); }
  const lag = S > 0 ? (S - s0 * (1 - HJ.lag)) / S : 1, hour = s0 > 0 ? new Date().getHours() : null, ld = prLday(w);
  return Object.assign(judgeCpl({spend:S, leads:K, target:cap, ld, hour, lag}), {S, win, ld, hour}); }
const PR_DEF = {up:30, ctr:30, top:5};
function prTh(){ const o = Object.assign({}, PR_DEF), c = (W.co && W.co.set) || {}; Object.keys(PR_DEF).forEach(k => { const n = parseFloat(String(c[k] == null ? "" : c[k]).replace(",", ".")); if (n > 0) o[k] = n; }); o.top = Math.max(1, Math.min(20, Math.round(o.top))); return o; }
/* Правила вывода. s — текущий период, v — прошлый такой же, cap — потолок цены лида воронки (в долларах).
   Цена лида — через judgeCpl (статистика малых чисел, обучение, окно 3 дней), не по фиксированным порогам. */
function prJudge(s, v, cap, cur){ const out = [], m = n => prM(n, cur), T = prTh(); if (!s.spend && !(s.id && prWin(s.id) && prWin(s.id).s3)) return out;
  const cpl = s.leads ? s.spend / s.leads : 0, pc = v && v.leads ? v.spend / v.leads : 0, ctr = s.imp ? s.clicks / s.imp : 0, pctr = v && v.imp ? v.clicks / v.imp : 0;
  if (!cap) out.push({lv:"mute", t:L("Немає цілі ліда","Нет цели лида"), why:L("У воронки не задано ціль, тому ціну ліда не з чим порівняти.","У воронки не задана цель, поэтому цену лида не с чем сравнить."), todo:L("Задай ціль воронки: оплати, чек і конверсії.","Задай цель воронки: оплаты, чек и конверсии.")});
  else { const J = prJ(s, cap), lrn = J.Lf > 1 ? L(" (навчання, день ", " (обучение, день ") + J.ld + L(": норма ",": норма ").replace(" : ", ": ") + m(J.Teff) + L(" = ціль ×"," = цель ×") + dec(J.Lf, 2).replace(/0$/, "") + ")" : "";
    const pre = J.hour != null ? L(" Сьогоднішні цифри попередні: Meta дораховує ліди до 3 днів."," Сегодняшние цифры предварительные: Meta досчитывает лиды до 3 дней.") : "";
    /* сегодня уже в норме (Дмитрий, 25.11: «метка "лид дороже нормы", хотя сегодня всё нормально, календарь на сегодня»): за 3 дня дорого, но за сегодня ≥3 лидов и цена в норме — не тревога */
    const okT = J.verdict === "bad" && J.win && PR.mode === "t" && s.leads >= 3 && cpl <= J.Teff;
    if (okT) out.push({lv:"good", t:L("Сьогодні в нормі","Сегодня в норме"),
        why:L("Сьогодні лід ","Сегодня лид ") + m(cpl) + " (" + s.leads + L(" лідів) при нормі "," лидов) при норме ") + m(J.Teff) + L(". За 3 дні було ",". За 3 дня было ") + (J.k ? m(J.cpl) : m(J.S) + L(" без лідів"," без лидов")) + L(" — тому стежу далі, нічого не вимикаю."," — поэтому слежу дальше, ничего не выключаю."),
        todo:L("Не чіпати. Якщо до вечора ціна втримається — завтра кампанія вийде з «дорогих».","Не трогать. Если до вечера цена удержится — завтра кампания выйдет из «дорогих».")});
    else if (J.verdict === "bad") out.push(!J.k ? {lv:"crit", t:L("Витрати без лідів","Расход без лидов"),
        why:L("Витрачено ","Потрачено ") + m(J.S) + J.win + L(" без лідів — "," без лидов — ") + dec(J.S / J.Teff, 1) + L(" норми ціни ліда"," нормы цены лида") + lrn + L(". Шанс, що ціна насправді в нормі, ",". Шанс, что цена на самом деле в норме, ") + Math.round(J.q * 100) + "%.",
        todo:L("Відкрий сайт за посиланням з оголошення: чи відкривається, чи працює форма, чи надсилає піксель подію. Якщо все гаразд — вимкни кампанію або заміни креативи.","Открой сайт по ссылке из объявления: открывается ли, работает ли форма, отправляет ли пиксель событие. Если все в порядке — выключи кампанию или замени креативы.")}
      : {lv:"crit", t:L("Лід дорожчий за норму","Лид дороже нормы"),
        why:L("Ціна ліда ","Цена лида ") + m(J.cpl) + J.win + L(" при нормі "," при норме ") + m(J.Teff) + lrn + L(". Шанс, що це випадковість, ",". Шанс, что это случайность, ") + Math.round(J.q * 100) + "%.",
        todo:L("Вимкни найгірші оголошення. Якщо дорого всюди — справа в офері, сторінці або аудиторії.","Выключи худшие объявления. Если дорого везде — дело в оффере, странице или аудитории.")});
    else if (J.verdict === "wait") out.push({lv:J.confBad >= 0.8 ? "warn" : "mute", t:J.early ? L("Рано судити","Рано судить") : L("Поки не ясно","Пока не ясно"),
        why:(J.k ? L("Ціна ліда ","Цена лида ") + m(J.cpl) : L("Витрачено ","Потрачено ") + m(J.S) + L(", лідів немає",", лидов нет")) + J.win + L(" при нормі "," при норме ") + m(J.Teff) + lrn + ". " + (J.early ? L("Витрачено менше за одну норму ліда.","Потрачено меньше одной нормы лида.") : prIf(J, m)) + pre,
        todo:L("Нічого не змінювати. Стоп, якщо до ","Ничего не менять. Стоп, если до ") + m(J.stopAt) + L(" витрат не буде нового ліда."," расхода не будет нового лида.")});
    else out.push({lv:"good", t:J.cpl > cap ? L("У межах навчання","В пределах обучения") : L("У нормі","В норме"),
        why:L("Ціна ліда ","Цена лида ") + m(J.cpl) + J.win + L(" при нормі "," при норме ") + m(J.Teff) + lrn + "." + pre,
        todo:J.cpl > cap ? L("Не чіпати: у навчанні ціна вища, Meta ще шукає аудиторію.","Не трогать: в обучении цена выше, Meta еще ищет аудиторию.") : L("Бюджет — за цифрами 7 днів: якщо ціна тримається тиждень, можна додати 20–30%.","Бюджет — по цифрам 7 дней: если цена держится неделю, можно добавить 20–30%.")}); }
  if (pc && cpl > pc * (1 + T.up / 100) && s.leads >= 5 && v.leads >= 5 && poissonCdf(s.leads, s.spend / pc) < 0.05) out.push({lv:"warn", t:L("Лід подорожчав","Лид подорожал"),
    why:m(pc) + " → " + m(cpl) + " (+" + Math.round((cpl / pc - 1) * 100) + L("%) до минулого такого ж періоду.","%) к прошлому такому же периоду."),
    todo:L("Порівняй оголошення: якщо подорожчало одне — вимкни його. Якщо все — перевір статус Meta і зміни на сайті; бюджет вирішуй за даними 7 днів.","Сравни объявления: если подорожало одно — выключи его. Если все — проверь статус Meta и изменения на сайте; бюджет решай по 7 дням.")});
  if (pctr && s.imp >= 1000 && ctr < pctr * (1 - T.ctr / 100)) out.push({lv:"warn", t:L("CTR падає","CTR падает"),
    why:"CTR " + prPct(pctr) + " → " + prPct(ctr) + L(" до минулого періоду."," к прошлому периоду."),
    todo:L("Перевір у Meta статус «Втома креативу». Якщо є — додай нові ролики, старі не вимикай, доки нові не наберуть результат. Висока частота сама по собі не ознака вигорання.","Проверь в Meta статус «Усталость креатива». Если есть — добавь новые ролики, старые не выключай, пока новые не наберут результат. Высокая частота сама по себе не признак выгорания.")});
  if (s.pay && s.rev && s.spend) out.push({lv:"good", t:L("Є оплати","Есть оплаты"), why:plural(s.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) + " · ROAS " + dec(s.rev / s.spend, 1) + L(" (за датою вебінару, оплати ще можуть дозріти)."," (по дате вебинара, оплаты еще могут дозреть)."), todo:""});
  return out; }
const PRANK = {crit:3, warn:2, good:1, mute:0};
const prMain = js => js.slice().sort((a, b) => PRANK[b.lv] - PRANK[a.lv])[0];
const prPill = j => pill(j.lv, j.t);
const prList = (js, noTodo) => js.length ? `<ul class="prv">${js.map(j => `<li class="prv--${j.lv}"><div><b>${esc(j.t)}</b> <span>${esc(j.why)}</span></div>${j.todo && !noTodo ? `<div class="sub"><b>${L("Що зробити:","Что сделать:")}</b> ${esc(j.todo)}</div>` : ""}</li>`).join("")}</ul>` : "";
/* изменение к прошлому периоду; для цены рост — плохо, для расхода — без оценки */
function prDelta(a, b, costly){ if (!b || !isFinite(a / b)) return ""; const d = a / b - 1; if (Math.abs(d) < 0.03) return `<span class="dlt">≈ ${L("як раніше","как раньше")}</span>`;
  const bad = costly ? d > 0 : d < 0; return `<span class="dlt${costly === "n" ? "" : " dlt--" + (bad ? "bad" : "good")}">${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%</span>`; }
const prKpi = (l, v, d) => `<div class="kpi"><small>${l}</small><strong>${v}</strong>${d || ""}</div>`;
/* главная цифра экрана — цена лида (heyrow-ui/DESIGN.md п. 6); пометка Хиро (обводка + подпись) — только на обзоре «Сегодня» */
const DOODLE_CIRCLE = '<svg class="dd" viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M24 38C10 14 78 4 128 8c44 4 62 30 28 46-40 18-128 12-134-14-3-14 22-26 58-29"/></svg>';
function prHero(cpl, pcpl, cur, cap, note){ if (!cpl) return "";
  const d = pcpl ? cpl / pcpl - 1 : 0, pc = Math.round(Math.abs(d) * 100) + "%", same = !pcpl || Math.abs(d) < 0.03;
  const cmp = pcpl ? (same ? L("як у минулому періоді","как в прошлом периоде") : `<span class="${d < 0 ? "d-plus" : "d-minus"}">${d < 0 ? "−" : "+"}${pc}</span> ${L("до минулого періоду","к прошлому периоду")}`) : "";
  const hand = note && !same ? (d < 0 ? L("на " + pc + " дешевше, ніж було","на " + pc + " дешевле, чем было") : L("на " + pc + " дорожче, розбираюся","на " + pc + " дороже, разбираюсь")) : "";
  return `<div class="hero__main"><span class="hero__lbl">${L("Ціна ліда","Цена лида")}</span><span class="hero__n">${prM(cpl, cur)}${hand ? DOODLE_CIRCLE : ""}</span><span class="hero__cmp">${cmp}${cap ? (cmp ? " · " : "") + L("ціль ","цель ") + prM(cap) : ""}</span>${hand ? `<span class="hand">${hand}</span>` : ""}</div>`; }
function prKpis(s, v, cap, cur){ const cpl = s.leads ? s.spend / s.leads : 0, pcpl = v.leads ? v.spend / v.leads : 0, sales = s.book || s.pay;
  return `<div class="hero">${prHero(cpl, pcpl, cur, cap)}<div class="kpis kpis--${sales ? 6 : 5}">${prKpi(L("Витрати","Расход"), prM(s.spend, cur), prDelta(s.spend, v.spend, "n"))}${prKpi(L("Лідів","Лидов"), num(s.leads), prDelta(s.leads, v.leads))}
    ${prKpi("CTR", s.imp ? prPct(s.clicks / s.imp) : "—", s.imp && v.imp ? prDelta(s.clicks / s.imp, v.clicks / v.imp) : "")}${prKpi(L("Кліків","Кликов"), num(s.clicks), prDelta(s.clicks, v.clicks))}
    ${sales ? prKpi(L("Бронювання · оплати","Брони · оплаты"), num(s.book || 0) + " · " + num(s.pay || 0), s.rev && s.spend ? `<small>ROAS ${dec(s.rev / s.spend, 1)}</small>` : "") : ""}</div></div>`; }
const prFresh = p => { const fx = fxOf(p); return `<span class="sub">${fx.syncing ? L("оновлюємо з Meta…","обновляем из Meta…") : L("дані з Meta: ","данные из Meta: ") + fxWhen(fx.synced)}</span>`; };
const prSkel = () => `<div class="skel" role="status" aria-label="${L("Завантажуємо факт","Загружаем факт")}"><div class="kpis kpis--5">${Array(5).fill(`<div class="kpi">${sk("60%", 10)}${sk("45%", 20)}</div>`).join("")}</div>${sk("100%", 28)}${sk("100%", 28)}</div>`;

/* Сегодняшние цифры из Meta. День берётся по часам кабинета (Киев), а не по UTC: иначе после полуночи до 02:00–03:00
   сервер считал бы «сегодня» ещё вчерашним днём. Запасной путь — обычное обновление за два дня. */
async function prSyncToday(p, manual){ const fx = fxOf(p); if (fx.syncing) return; fx.syncing = true; fx.err = ""; render();
  const t = prToday(); if (typeof adSyncToday === "function") adSyncToday(p); let d = await mtCall({action:"history", project_id:p.id, since:t, until:t});
  if (!d.ok && d.error !== "meta" && d.error !== "not_connected") d = await mtCall({action:"sync", project_id:p.id, days:2});
  fx.syncing = false;
  if (!d.ok) { fx.err = d.error === "meta" || d.error === "not_connected" ? mtErr(d) : fxErr(d.detail || d.error); if (manual) toast(fx.err); render(); return; }
  fx.synced = d.synced_at || new Date().toISOString(); Object.keys(PD).forEach(k => { if (k.indexOf(p.id + "|") === 0) PD[k].at = 0; });
  if (manual) toast(L("Сьогоднішні цифри оновлено","Сегодняшние цифры обновлены")); await fxLoad(p); render(); }

/* ---------- аккаунты пятым уровнем, кампании шестым ---------- */
const prPl = n => plural(n, L("лід","лид"), L("ліди","лида"), L("лідів","лидов"));
function prCampNodes(p, f, c, ck, acc){ const x = prOf(p); if (!x.cur) return [];
  const cap = prT(f, p), cur = prCur(p), prev = prRowsA(p, x.prev, f, c, x, acc), rows = prRowsA(p, x.cur, f, c, x, acc).filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend);
  const PR_TOP = prTh().top, nodes = rows.slice(0, PR_TOP).map(r => { const v = prev.find(o => o.id === r.id) || {}, j = prMain(prJudge(r, v, cap, cur)) || {lv:"mute", t:""};
    return {k:ck + "/" + r.id, lv:5, t:r.name, s:prM(r.spend, cur) + " · " + prPl(r.leads) + (r.leads ? L(" за "," по ") + prM(r.spend / r.leads, cur) : ""), m:j.t, v:j.lv}; });
  if (rows.length > PR_TOP) nodes.push({more:1, k:ck, lv:5, t:L("ще ","еще ") + plural(rows.length - PR_TOP, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), s:L("усі — у панелі акаунта","все — в панели аккаунта")});
  return nodes; }
/* пять главных цифр аккаунта за период */
const prFive = (s, cur) => [[L("Витрати","Расход"), prM(s.spend, cur)], [L("Ліди","Лиды"), num(s.leads)], [L("Ціна ліда","Цена лида"), s.leads ? prM(s.spend / s.leads, cur) : "—"], ["CTR", s.imp ? prPct(s.clicks / s.imp) : "—"], [L("Оплати","Оплаты"), num(s.pay)]];
/* те же пять цифр для карточки воронки (все каналы) или канала */
function prCardKpi(p, f, c){ if (!prOn(p)) return null; const x = prOf(p); if (!x.cur) return null;
  const rows = x.cur.filter(r => fxFunnel(p, r) === f.id && (!c || r.prov === c)).map(r => Object.assign({}, r, x.sb[fxKey(r.name)] || {}));
  if (c && c !== "meta" && !rows.length) return null;
  return prFive(fxSum(rows), prCur(p)); }
/* аккаунты воронки в канале: те, где за период был расход; если расхода нет нигде — все подключённые */
function prAccList(p, f, c){ const x = prOf(p), rows = prRows(p, x.cur, f, c, x), prev = prRows(p, x.prev, f, c), ids = [];
  rows.forEach(r => { const a = prAccOf(x, r.id, c); if (r.spend > 0 && !ids.includes(a)) ids.push(a); });
  if (!ids.length) prAccs(p, c).forEach(a => ids.push(String(a.id)));
  return ids.map(id => { const own = rows.filter(r => prAccOf(x, r.id, c) === id); return {id, name:prAccName(p, id, c), s:fxSum(own), v:fxSum(prev.filter(r => prAccOf(x, r.id, c) === id)), n:own.filter(r => r.spend > 0).length}; }).sort((a, b) => b.s.spend - a.s.spend); }
function prAccNodes(p, f, c, ck){ if (!prHas(p, f, c)) return []; const x = prOf(p); if (!x.cur || !x.am) return [];
  const cap = prT(f, p), cur = prCur(p), list = prAccList(p, f, c);
  return list.map(a => { const k = ck + "/" + prAK(a.id), j = prMain(prJudge(a.s, a.v, cap, cur)) || {lv:"", t:a.s.spend ? "" : L("витрат немає","расхода нет")};
    const n = {k, lv:4, t:a.name, kpi:prFive(a.s, cur), m:j.t, v:j.lv}, kids = prCampNodes(p, f, c, k, a.id);
    if (kids.length) { n.kids = kids; n.can = true; n.fold = mapFolded(k, list.length > 1); n.ics = []; n.stub = [plural(a.n, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), L("з витратами за період","с расходом за период")]; if (n.fold && MP.sel && MP.sel.indexOf(k + "/") === 0) MP.sel = k; }
    if (c === "meta" && prCanAdd(p)) n.kids = (n.kids || []).concat([{add:"l", k:k + "/+", lv:5, t:L("Кампанія","Кампания"), acc:a.id}]);   /* новая кампания — в колонке кампаний, сразу в этот аккаунт */
    return n; }); }

/* ---------- панель канала ---------- */
function prChanPanel(p, f, c, acc){ const ch = chOf(c), x = prOf(p), cur = prCur(p), cap = prT(f, p), ck = "co/" + p.id + "/" + f.id + "/" + c, one = acc != null;
  const head = one ? `${lvTag(4)}<div class="row sp"><h2>${esc(prAccName(p, acc, c))}</h2>${prFresh(p)}</div><p class="sub">${acc ? `<span class="mono">${c === "meta" ? "act_" : ""}${esc(acc)}</span> · ` : ""}${ch[1]} · ${esc(f.name)} · ${esc(p.name)} · <span class="mono">${prLabel(x.r)}</span></p>`
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
  if (bad.length && list.length > 1) js.unshift({lv:"crit", t:L("Кампаній, де потрібне рішення: ","Кампаний, где нужно решение: ") + bad.length, why:bad.map(o => o.r.name + " — " + prM(o.r.spend, cur)).join("; "), todo:L("Вони дорожчі за ціль або витрачають без лідів. Відкрий кожну в таблиці нижче: там причина й що зробити.","Они дороже цели или тратят без лидов. Открой каждую в таблице ниже: там причина и что сделать.")});
  if ((x.am.err || rows.some(r => r.spend > 0 && !prAccOf(x, r.id, c))) && prAccs(p, c).length > 1) js.push({lv:"mute", t:L("Акаунти не розділено","Аккаунты не разделены"), why:L("Поки не видно, з якого акаунта кожна кампанія.","Пока не видно, из какого аккаунта каждая кампания.")});
  const au = rows.filter(r => r.spend > 0 && fxAuto(p, r)); if (au.length) js.push({lv:"mute", t:L("Воронку поставили самі: ","Воронку поставили сами: ") + plural(au.length, L("кампанія","кампания"), L("кампанії","кампании"), L("кампаній","кампаний")), why:L("У назвах цих кампаній немає назви воронки, а воронка в проєкті одна — тому віднесли до неї: ","В названиях этих кампаний нет названия воронки, а воронка в проекте одна — поэтому отнесли к ней: ") + au.map(r => r.name).join("; "), todo:L("Якщо якась кампанія не про цю воронку — зніми прив’язку у проєкті, вкладка «Підключення».","Если какая-то кампания не про эту воронку — сними привязку в проекте, вкладка «Подключения».")});
  const fx = fxOf(p); if (fx.synced && Date.now() - new Date(fx.synced).getTime() > 26 * 3600e3) js.push({lv:"warn", t:L("Дані застаріли","Данные устарели"), why:L("Останнє оновлення з Meta — ","Последнее обновление из Meta — ") + fxWhen(fx.synced) + ".", todo:L("Натисни «Оновити з Meta» над картою.","Нажми «Обновить из Meta» над картой.")});
  const tbl = `<div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th><th class="n">${L("До минулого","К прошлому")}</th><th>${L("Висновок","Вывод")}</th></tr></thead><tbody>
    ${list.map(o => `<tr data-act="mapSel" data-k="${esc(ck + "/" + prAK(prAccOf(x, o.r.id, c)) + "/" + o.r.id)}" tabindex="0"><td class="nm">${esc(o.r.name)}</td><td class="n mono">${prM(o.r.spend, cur)}</td><td class="n mono">${num(o.r.leads)}</td><td class="n mono">${o.r.leads ? cplCell(o.r.spend / o.r.leads, cap, cur) : "—"}</td><td class="n">${o.r.leads && o.v.leads ? prDelta(o.r.spend / o.r.leads, o.v.spend / o.v.leads, true) : o.v.spend ? "" : `<span class="sub">${L("нова","новая")}</span>`}</td><td>${prPill(o.j)}</td></tr>`).join("")}</tbody></table></div>`;
  const al = one ? [] : prAccList(p, f, c), atbl = al.length > 1 ? `<span class="tag">${L("Рекламні акаунти","Рекламные аккаунты")} · ${al.length}</span><div class="tw"><table><thead><tr><th>${L("Акаунт","Аккаунт")}</th>${prFive({spend:0, imp:0, clicks:0, leads:0, pay:0}, cur).map(k => `<th class="n">${k[0]}</th>`).join("")}<th>${L("Висновок","Вывод")}</th></tr></thead><tbody>
    ${al.map(a => { const j = prMain(prJudge(a.s, a.v, cap, cur)) || {lv:"mute", t:"—"}; return `<tr data-act="mapSel" data-k="${esc(ck + "/" + prAK(a.id))}" tabindex="0"><td>${esc(a.name)}</td>${prFive(a.s, cur).map(k => `<td class="n mono">${k[1]}</td>`).join("")}<td>${prPill(j)}</td></tr>`; }).join("")}</tbody></table></div>` : "";
  return `<div class="panel">${head}${prKpis(s, v, cap, cur)}<span class="tag">${L("Висновки","Выводы")} ${hint(L("Висновки — за ціллю ліда воронки, порівнянням з минулим періодом і CTR. У Meta автопілот змінює лише після твого «Так» або в режимі «Роблю сам».","Выводы — по цели лида воронки, сравнению с прошлым периодом и CTR. В Meta автопилот меняет только после твоего «Да» или в режиме «Делаю сам»."))}</span>${prList(js)}${atbl}${more("pc:" + (acc || "") + c, L("кампанії за період","кампании за период") + " · " + list.length, cplLegend(cap, cur) + tbl)}${btns}</div>`; }

/* ---------- панель кампании ---------- */
function prCampPanel(p, f, c, id){ const x = prOf(p), cur = prCur(p), cap = prT(f, p), ck = "co/" + p.id + "/" + f.id + "/" + c + "/" + prAK(prAccOf(x, id, c));
  if (!x.cur || !x.am) return `<div class="panel">${lvTag(5)}${prSkel()}</div>`;
  const r = prRows(p, x.cur, f, c, x).find(o => o.id === id), v = prRows(p, x.prev, f, c).find(o => o.id === id) || {spend:0, imp:0, clicks:0, leads:0};
  const back = `<button class="btn btn--sm" data-act="mapSel" data-k="${esc(ck)}">${L("← Акаунт ","← Аккаунт ")}${esc(prAccName(p, prAccOf(x, id, c), c))}</button>`;
  if (!r) return `<div class="panel">${lvTag(5)}<p class="sub">${L("За цей період у кампанії немає даних.","За этот период у кампании нет данных.")}</p><div class="row">${back}</div></div>`;
  const js = prJudge(r, v, cap, cur), sets = (x.sets || []).filter(o => o.cid === id && o.spend > 0).sort((a, b) => b.spend - a.spend), ads = (x.ads || []).filter(o => o.cid === id && o.spend > 0).sort((a, b) => b.spend - a.spend);
  const lw = prLday(prWin(id)), adJ = o => cap ? judgeCpl({spend:o.spend, leads:o.leads, target:cap, ld:lw}) : null, stop = cap ? ads.filter(a => !a.leads && adJ(a).verdict === "bad") : [];
  if (stop.length) js.push({lv:"crit", t:L("Оголошення без лідів: ","Объявления без лидов: ") + stop.length, why:stop.map(a => a.name + " — " + prM(a.spend, cur)).join("; "), todo:L("Без жодного ліда за такі витрати ціна майже напевно (95%) вища за норму — кандидати на вимкнення.","Без единого лида за такой расход цена почти наверняка (95%) выше нормы — кандидаты на выключение.")});
  const row = (o, nm, add) => { const cpl = o.leads ? o.spend / o.leads : 0, J = adJ(o), lv = !J ? "" : J.verdict === "bad" ? "crit" : J.verdict === "ok" ? "good" : o.leads && cpl > cap ? "warn" : "";
    return `<tr><td class="nm">${esc(nm)}</td><td class="n mono">${prM(o.spend, cur)}</td><td class="n mono">${num(o.clicks)}</td><td class="n mono">${o.imp ? prPct(o.clicks / o.imp) : "—"}</td><td class="n mono">${num(o.leads)}</td><td class="n">${cpl ? `<span class="mono">${prM(cpl, cur)}</span>` : "—"} ${lv ? pill(lv, lv === "good" ? L("не вище цілі","в пределах цели") : lv === "warn" ? L("вище цілі","выше цели") : o.leads ? L("понад 1,5 цілі","выше 1,5 цели") : L("без лідів","без лидов")) : ""}</td>${add !== undefined ? `<td class="n">${add}</td>` : ""}</tr>`; };
  const th = (first, ex) => `<thead><tr><th>${first}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">CTR</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${ex ? "<th></th>" : ""}</tr></thead>`;
  return `<div class="panel">${lvTag(5)}<div class="row sp"><h2 class="prname">${esc(r.name)}</h2>${prFresh(p)}</div><p class="sub">${chOf(c)[1]} · ${esc(f.name)} · ${esc(p.name)} · <span class="mono">${prLabel(x.r)}</span></p>
    ${prKpis(r, v, cap, cur)}<span class="tag">${L("Висновок","Вывод")} ${hint(L("Бронювання й оплати — з файлів продажів за датою вебінару в цьому періоді, за міткою utm_campaign.","Брони и оплаты — из файлов продаж по дате вебинара в этом периоде, по метке utm_campaign."))}</span>${tdCampHiro(p, f, r, js)}${prList(js, true)}
    ${prAddRow(p, f, x, id, r.name, sets)}
    ${sets.length ? `<span class="tag">${L("Групи оголошень","Группы объявлений")} · ${sets.length}</span><div class="tw"><table>${th(L("Група","Группа"), prCanAdd(p))}<tbody>${sets.map(o => row(o, o.name, !prCanAdd(p) ? undefined : o.id ? `<button type="button" class="btn btn--sm btn--ico" data-act="bdTarget" data-mode="ad" data-p="${p.id}" data-f="${f.id}" data-cid="${esc(id)}" data-cn="${esc(r.name)}" data-aid="${esc(o.id)}" data-an="${esc(o.name)}" data-acc="${esc(prAccOf(x, id))}" aria-label="${L("Нові оголошення в цій групі","Новые объявления в этой группе")}" title="${L("Нові оголошення в цій групі","Новые объявления в этой группе")}">+</button>` : "")).join("")}</tbody></table></div>` : ""}
    ${ads.length ? `<span class="tag">${L("Оголошення","Объявления")} · ${ads.length}</span><div class="tw"><table>${th(L("Оголошення","Объявление"))}<tbody>${ads.slice(0, 40).map(o => row(o, o.name)).join("")}</tbody></table></div>` : ""}
    <div class="row">${back}<button class="btn btn--sm" data-act="mapOpenF" data-p="${p.id}" data-id="${f.id}">${L("Аналітика воронки","Аналитика воронки")}</button></div></div>`; }

/* ---------- обзор: компания или проект целиком ---------- */
function prOverview(only){ const ps = (only ? [only] : W.projs).filter(prOn); if (!ps.length) return "";
  ps.forEach(prLoad); const r = prRange();
  if (ps.some(p => !prOf(p).cur && !prOf(p).err)) return `<div class="panel"><span class="tag">${L("Пульс реклами","Пульс рекламы")} · ${prLabel(r)}</span>${prSkel()}</div>`;
  const curs = [...new Set(ps.map(p => prCur(p) || "USD"))], cur = curs.length === 1 ? curs[0] : "", lost = []; let att = [];
  let s = {spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0}, v = Object.assign({}, s);
  ps.forEach(p => { const x = prOf(p); if (!x.cur) return; const add = (a, b) => { ["spend", "imp", "clicks", "leads", "book", "pay", "rev"].forEach(k => { a[k] += b[k] || 0; }); };
    const all = x.cur.map(o => Object.assign({}, o, x.sb[fxKey(o.name)] || {})); all.filter(o => tfRow(p, o)).forEach(o => add(s, o)); x.prev.filter(o => tfRow(p, o)).forEach(o => add(v, o));
    const nl = tfOn() ? [] : all.filter(o => o.spend > 0 && !fxFunnel(p, o)); if (nl.length) lost.push({p, n:nl.length, spend:nl.reduce((a, o) => a + o.spend, 0)});
    p.funnels.filter(tfF).forEach(f => (f.ch || []).filter(tfC).forEach(c => { const prev = prRows(p, x.prev, f, c), cap = prT(f, p);
      prRows(p, x.cur, f, c, x).filter(o => o.spend > 0).forEach(o => { const j = prMain(prJudge(o, prev.find(q => q.id === o.id) || {}, cap, prCur(p)));
        if (j && j.lv === "crit") att.push({p, f, c, o, j}); }); })); });
  att.sort((a, b) => PRANK[b.j.lv] - PRANK[a.j.lv] || b.o.spend - a.o.spend);
  /* QA 13 (26.11): за прошлый период данных почти нет (реклама ещё не шла или статистика не загружена) — проценты бессмысленны
     («Витрати +162%»). Если расход прошлого периода меньше трети текущего — не сравниваем и так и пишем. */
  const thin = r.span >= 3 && s.spend > 0 && v.spend < s.spend / 3; if (thin) v = {spend:0, imp:0, clicks:0, leads:0, book:0, pay:0, rev:0, thin:1};
  const cpl = s.leads ? s.spend / s.leads : 0, pcpl = v.leads ? v.spend / v.leads : 0;
  /* брони и оплаты показываем, только если есть источник продаж или данные о них (Dmitry 24.11.2026) */
  const salesOn = s.book || s.pay || v.book || v.pay || (typeof srcCover === "function" && ps.some(p => srcCover(p).slice(1).some(c => c[1].length)));
  const kp = cur ? `<div class="hero">${prHero(cpl, pcpl, cur, 0, true)}<div class="kpis kpis--${salesOn ? 5 : 4}">${prKpi(L("Витрати","Расход"), prM(s.spend, cur), prDelta(s.spend, v.spend, "n"))}${prKpi(L("Лідів","Лидов"), num(s.leads), prDelta(s.leads, v.leads))}${prKpi("CTR", s.imp ? prPct(s.clicks / s.imp) : "—", s.imp && v.imp ? prDelta(s.clicks / s.imp, v.clicks / v.imp) : "")}${salesOn ? prKpi(L("Бронювання · оплати","Брони · оплаты"), num(s.book) + " · " + num(s.pay), s.rev && s.spend ? `<small>ROAS ${dec(s.rev / s.spend, 1)}</small>` : "") : ""}</div></div>` : `<p class="sub">${L("У кабінетів різна валюта, тому загальну суму не складаємо — дивись по проєктах.","У кабинетов разная валюта, поэтому общую сумму не складываем — смотри по проектам.")}</p>`;
  const kpN = v.thin ? `<p class="sub">${L("За минулий період мало даних — порівняння у відсотках не показую.","За прошлый период мало данных — сравнение в процентах не показываю.")}</p>` : "";
  const errs = ps.filter(p => prOf(p).err && !prOf(p).cur).map(p => `<p class="mterr">${esc(p.name)}: ${esc(prOf(p).err)}</p>`).join("");
  /* решения на сегодня: у каждого три исхода — сделал, отложить до завтра, это норма (скрыть на 7 дней) */
  const td = tdLoad(), tk = a => a.o.id + "|" + a.j.t, done = att.filter(a => td[tk(a)] && td[tk(a)].until > Date.now()); att = att.filter(a => !done.includes(a));
  /* Хиро сам выбирает действие по каждой проблемной кампании и кладёт его в свою ленту («Да / Предложи другое / Убрать»). Здесь остаётся то, что в ленту не попало. */
  att = tdFeed(att);
  /* A3: «N рішень» = то, что в блоке «Без автопілота» ниже. Новые предложения в ленте считает todayLine отдельно («N пропозицій від Хіро») — без двойного счёта */
  PR.cnt = att.length + lost.length;
  const items = att.slice(0, 5).map(a => { const h = hiroPlan(a), mk = "co/" + a.p.id + "/" + a.f.id + "/" + a.c + "/" + prAK(prAccOf(prOf(a.p), a.o.id)) + "/" + a.o.id;
    return `<li class="prv--${a.j.lv}" data-cid="${esc(a.o.id)}"><div><b>${esc(a.j.t)}</b> · <span class="nm">${esc(a.o.name)}</span> <span class="sub">${esc((ps.length > 1 ? a.p.name + " · " : "") + a.f.name)}</span></div><div class="hpro">${hava("idea", 24)}<span><b>${esc(h.title)}.</b> ${esc(h.why)}</span></div><div class="row"><span class="sub">${esc(tdWhyOff(a.p))}</span><span class="tdo"><button type="button" class="btn btn--sm btn--ico" data-act="prGo" data-k="${esc(mk)}" title="${L("Показати на карті","Показать на карте")}" aria-label="${L("Показати на карті","Показать на карте")}">${ico("map")}</button>${[["d",ico("done"),L("Зробив","Сделал")],["l",ico("clock"),L("Відкласти до завтра","Отложить до завтра")],["n",ico("archive"),L("Це норма, сховати на 7 днів","Это норма, скрыть на 7 дней")]].map(o => `<button type="button" class="btn btn--sm btn--ico" data-act="tdMark" data-k="${esc(tk(a))}" data-v="${o[0]}" title="${o[2]}" aria-label="${o[2]}">${o[1]}</button>`).join("")}</span></div></li>`; }).join("")
    + lost.map(l => `<li class="prv--warn"><div><b>${L("Кампанії без воронки: ","Кампании без воронки: ")}${l.n}</b> <span class="sub">${esc(l.p.name)}</span></div><div class="sub">${L("Їхні витрати ","Их расход ")}${prM(l.spend, prCur(l.p))}${L(" не потрапляють на карту й у висновки воронок."," не попадает на карту и в выводы воронок.")}</div><div class="row"><button class="btn btn--sm" data-act="wsOpenP" data-id="${l.p.id}">${L("Прив’язати у проєкті","Привязать в проекте")}</button></div></li>`).join("");
  return `<div class="panel"><div class="row sp"><span class="tag">${L("Пульс реклами","Пульс рекламы")} · ${prLabel(r)}${only ? " · " + esc(only.name) : ""}</span>${typeof trgBtn === "function" ? trgBtn(ps) : ""}</div>${errs}${TDF.t ? `<div class="hpro">${hava("watch", 24)}<span>${esc(TDF.t)}</span></div>` : ""}${s.spend || s.imp ? kp + kpN : `<p class="sub">${L("За цей період показів не було.","За этот период показов не было.")}</p>`}
    ${items ? `<div class="row sp"><span class="tag">${L("Без автопілота","Без автопилота")} · ${att.length + lost.length}</span><span class="scrl-cnt sub"></span>${done.length ? `<button type="button" class="btn btn--sm" data-act="tdReset">${L("Сховано: ","Скрыто: ")}${done.length}</button>` : ""}</div><ul class="prv scrl">${items}</ul>${att.length > 5 ? `<p class="sub">${L("Ще ","Еще ")}${att.length - 5}${L(" — після цих"," — после этих")}</p>` : ""}` : ""}</div>`; }
/* карточка кампании: вместо «Что сделать» — решение Хиро. Есть в ленте — та же строка с «Да / Предложи другое»; нет — его выбор и как его включить */
function tdCampHiro(p, f, r, js){ const j = prMain(js); if (!j || (j.lv !== "crit" && j.lv !== "warn")) return "";
  const st = typeof PL !== "undefined" ? PL.st[p.id] : null, rec = st && st.ok ? (st.log || []).find(x => x.kind === "reco" && (x.status === "new" || x.status === "scheduled") && x.payload && String(x.payload.cid || "") === String(r.id)) : null;
  if (rec) return `<ul class="feed pllog">${plRow(p, rec, st.admin ? "" : " disabled")}</ul>`;
  const h = hiroPlan({p, f, o:r}); tdFeed([{p, f, o:r}]);
  return `<ul class="prv"><li class="prv--${j.lv}"><div class="hpro">${hava("idea", 24)}<span><b>${esc(h.title)}.</b> ${esc(h.why)}</span></div><div class="row"><span class="sub">${esc(tdWhyOff(p))}</span></div></li></ul>`; }
const TD_KEY = "heyrow_today";
/* ---------- решение Хиро по проблемной кампании ----------
   Хиро сам выбирает одно действие: выключить кампанию без лидов, выключить худшее объявление или оставить до завтра.
   Действие уходит в ленту автопилота (функция pilot, action propose); в Meta — только после «Да», ночью. */
function hiroPlan(a){ const x = prOf(a.p), cur = prCur(a.p), cap = prT(a.f, a.p), o = a.o, m = n => prM(n, cur);
  const ads = (x.ads || []).filter(d => d.cid === o.id && d.spend > 0), key = "td:" + o.id + ":" + prToday() + ":";
  const J = cap ? prJ(o, cap) : null, lw = J ? J.ld : null, cplO = o.leads ? o.spend / o.leads : 0;
  /* худшее объявление: само «плохо» по статистике, и без него кампания в норме */
  const bad = cap ? ads.map(d => ({d, j:judgeCpl({spend:d.spend, leads:d.leads, target:cap, ld:lw})})).filter(z => z.j.verdict === "bad")
    .sort((p, q) => q.j.confBad - p.j.confBad || q.d.spend - p.d.spend) : [];
  if (bad.length && ads.length > 1 && bad.length < ads.length) { const w = bad[0].d, rl = o.leads - w.leads, after = rl > 0 ? (o.spend - w.spend) / rl : 0;
    return {key:key + "pa:" + w.name, title:L("Вимкнути оголошення «","Выключить объявление «") + w.name + "»",
      why:m(w.spend) + (w.leads ? L(", лідів " , ", лидов ") + w.leads + L(" за "," по ") + m(w.spend / w.leads) : L(", лідів немає",", лидов нет")) + L(" — ціна гірша за норму з упевненістю "," — цена хуже нормы с уверенностью ") + Math.round(bad[0].j.confBad * 100) + "%." + (after && cplO ? L(" Без нього лід у кампанії ~"," Без него лид в кампании ~") + m(after) + L(" замість "," вместо ") + m(cplO) + "." : ""),
      payload:{op:"pause_ad", cid:o.id, name:w.name, cname:o.name, facts:[[L("Витрачено","Потрачено"), m(w.spend), !w.leads], [L("Лідів","Лидов"), String(w.leads), false], [L("Ціна ліда","Цена лида"), w.leads ? m(w.spend / w.leads) : "—", !!w.leads]], gain:after && cplO ? L("Лід у кампанії стане ~","Лид в кампании станет ~") + m(after) + L(" замість "," вместо ") + m(cplO) : L("Зупинить витрати без лідів","Остановит расход без лидов")}}; }
  if (J && J.verdict === "bad") return {key:key + "pc", title:L("Вимкнути кампанію","Выключить кампанию"),
    why:(J.k ? L("Лід ","Лид ") + m(J.cpl) : L("Витрачено ","Потрачено ") + m(J.S) + L(" без лідів"," без лидов")) + J.win + L(" при нормі "," при норме ") + m(J.Teff) + (J.Lf > 1 ? L(" (з поправкою на навчання)"," (с поправкой на обучение)") : "") + L(". Шанс, що це випадковість, ",". Шанс, что это случайность, ") + Math.round(J.q * 100) + L("%. Слабкого оголошення, яке можна прибрати, немає — вимикаю кампанію, щоб не витрачати далі.","%. Слабого объявления, которое можно убрать, нет — выключаю кампанию, чтобы не тратить дальше."),
    payload:{op:"pause", level:"campaign", cid:o.id, name:o.name, cname:o.name, facts:[[L("Витрачено","Потрачено"), m(J.S), !J.k], [L("Лідів","Лидов"), String(J.k), false], J.k ? [L("Ціна ліда","Цена лида"), m(J.cpl), true] : [L("Норма ліда","Норма лида"), m(J.Teff), false]], gain:L("Зупинить витрати: ","Остановит расход: ") + (J.k ? L("ліди тут дорожчі за норму","лиды здесь дороже нормы") : L("лідів немає","лидов нет"))}};
  return {key:key + "w", title:L("Залишити до завтра","Оставить до завтра"),
    why:J ? prIf(J, m) + L(" Стоп, якщо до "," Стоп, если до ") + m(J.stopAt) + L(" не буде нового ліда."," не будет нового лида.") : L("Даних поки мало для дії. Завтра перевірю ще раз.","Данных пока мало для действия. Завтра проверю еще раз."),
    payload:{op:"watch", level:"campaign", cid:o.id, name:o.name, cname:o.name}}; }
/* куда идут решения: в ленту, если автопилот проекта настроен и ты можешь решать; пока лента грузится — не показываем дважды */
const TDP = {}, TDF = {t:""}; /* TDF — Хиро на паузе из-за сбоя Meta (ответ hiro-propose) */
async function tdPropose(body){ if (!CLOUD || !sb) return {ok:false}; try { const r = await sb.functions.invoke("hiro-propose", {body}); return r.data || {ok:false}; } catch (e) { return {ok:false}; } }
function tdFeed(att){ if (typeof PL === "undefined" || !CLOUD) return att; const push = {};
  const ok = p => { const r = PL.st[p.id]; return r === undefined ? (p.meta && p.meta.conn ? "wait" : "") : r && r.ok && r.admin && r.settings ? "yes" : ""; };
  const left = att.filter(a => { const s = ok(a.p); if (s === "yes") { const h = hiroPlan(a); if (!TDP[a.p.id + h.key]) (push[a.p.id] = push[a.p.id] || []).push(h); } return !s; });
  Object.keys(push).forEach(pid => { push[pid].forEach(h => { TDP[pid + h.key] = 1; });
    tdPropose({project_id:pid, items:push[pid].map(h => ({key:h.key, title:h.title, body:h.payload.name + "\n" + h.why, payload:h.payload}))}).then(r => { if (r.ok && r.frozen) { TDF.t = /[іїєґ]/i.test(r.frozen) === (lang === "uk") ? r.frozen : L("Схоже на збій Meta. 48 годин не пропоную вимикати й міняти бюджети — цифри зараз викривлені.","Похоже на сбой Meta. 48 часов не предлагаю выключать и менять бюджеты — цифры сейчас искажены."); render(); } if (r.ok && r.added) { delete PL.st[pid]; const p = W.projs.find(x => x.id === pid); if (p) plLoad(p); } }); });
  return left; }
const tdWhyOff = p => { const r = typeof PL !== "undefined" ? PL.st[p.id] : null; return !r || !r.ok ? L("Автопілот недоступний — зроби це сам у кабінеті.","Автопилот недоступен — сделай это сам в кабинете.") : !r.settings ? L("Увімкни автопілот у проєкті, і я зроблю це сам після твого «Так».","Включи автопилот в проекте, и я сделаю это сам после твоего «Да».") : r.admin ? "" : L("Вирішує власник або керівник.","Решает собственник или руководитель."); };
function tdLoad(){ try { return JSON.parse(localStorage.getItem(TD_KEY) || "{}"); } catch (e) { return {}; } }
function tdSave(o){ try { const now = Date.now(); Object.keys(o).forEach(k => { if (o[k].until < now) delete o[k]; }); localStorage.setItem(TD_KEY, JSON.stringify(o)); } catch (e) {} }

Object.assign(ACT, {
  tdOpen(d){ if (typeof PL !== "undefined") { Object.keys(PL.st).forEach(k => { PL.tab[k] = "new"; }); render(); } requestAnimationFrame(() => { const li = document.querySelector('.pllog li[data-st="new"]') || document.querySelector('.prv li[data-cid]');
      if (li) { li.scrollIntoView({behavior:"smooth", block:"center"}); li.classList.add("is-hl"); setTimeout(() => li.classList.remove("is-hl"), 1600); } else if (d.k) { ACT.prGo({k:d.k}); render(); } }); return false; },
  tdMark(d){ const o = tdLoad(), t = new Date(); t.setHours(24, 0, 0, 0); o[d.k] = {v:d.v, until:d.v === "n" ? Date.now() + 7 * 864e5 : d.v === "l" ? t.getTime() : Date.now() + 20 * 3600e3}; tdSave(o); },
  tdReset(){ tdSave({}); try { localStorage.removeItem(TD_KEY); } catch (e) {} },
  prMode(d){ PR.touched = 1; PR.mode = d.v === "t" || d.v === "y" || d.v === "m" || d.v === "c" ? d.v : +d.v;
    if (PR.mode === "t") W.projs.filter(prOn).forEach(p => { const fx = fxOf(p); if (!fx.synced || Date.now() - new Date(fx.synced).getTime() > 15 * 60000) prSyncToday(p, false); }); if (d.v === "c" && !PR.d1) { PR.d2 = prShift(prToday(), -1); PR.d1 = prShift(prToday(), -7); } },
  prCustom(){ const a = (document.getElementById("pr-d1") || {}).value, b = (document.getElementById("pr-d2") || {}).value;
    if (!a || !b) { toast(L("Вкажи обидві дати","Укажи обе даты")); return false; }
    if (Math.abs(Date.parse(b) - Date.parse(a)) / 864e5 > 92) { toast(L("Період — не довше 93 днів","Период — не длиннее 93 дней")); return false; }
    PR.d1 = a; PR.d2 = b; PR.mode = "c"; },
  prSync(){ W.projs.filter(prOn).forEach(p => PR.mode === "t" ? prSyncToday(p, true) : fxSync(p, true)); },
  prGo(d){ const ps = d.k.split("/"); for (let i = 2; i < ps.length; i++) MP.fold[ps.slice(0, i).join("/")] = false; MP.sel = d.k; W.cur = null; W.fun = null; W.ctab = "map"; save(); },
});

/* добавить в существующую кампанию: новая группа; в существующую группу — новые объявления. Только при подключении с правом записи. */
const prCanAdd = p => !!(typeof bdConn === "function" && bdConn(p) && bdCanWrite(bdConn(p)));
function prAddRow(p, f, x, cid, cn, sets){ if (!prCanAdd(p)) return "";
  return `<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="bdTarget" data-mode="adset" data-p="${p.id}" data-f="${f.id}" data-cid="${esc(cid)}" data-cn="${esc(cn)}" data-acc="${esc(prAccOf(x, cid))}">+ ${L("Група в цю кампанію","Группа в эту кампанию")}</button>${sets.some(o => o.id) ? `<span class="sub">${L("+ у рядку групи — нові оголошення в ній","+ в строке группы — новые объявления в ней")}</span>` : ""}</div>`; }
