/* Пилот «ведение аккаунта» в кабинете: настройки, подключение Telegram, журнал отчётов и предложений с «Да / Нет».
   Работу делает серверная функция pilot (каждый час по расписанию). Подключается после rek.js. */
const PL = {st:{}, busy:{}, edit:{}, msg:{}, tab:{}, safe:{}, why:null};
async function plCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("pilot", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const plErr = r => ({net:L("Сервер не відповів — можливо, функцію pilot ще не викладено.","Сервер не ответил — возможно, функцию pilot еще не выложили."), denied:L("Налаштовувати може власник або керівник.","Настраивать может собственник или руководитель."), no_bot:L("Немає ключа бота: додай TG_BOT_TOKEN у Secrets.","Нет ключа бота: добавь TG_BOT_TOKEN в Secrets."), no_chats:L("Спершу підключи Telegram.","Сначала подключи Telegram."), not_connected:L("Meta не підключено.","Meta не подключена.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
const PLR = {};
/* перед показом ленты Хиро пересчитывает открытые предложения по свежим цифрам Meta: что выровнялось или уже выключено — снимает (hiro-propose, action review) */
async function plReview(p){ if (!CLOUD || !sb || PLR[p.id] && Date.now() - PLR[p.id] < 10 * 60000) return 0; PLR[p.id] = Date.now();
  try { const r = (await sb.functions.invoke("hiro-propose", {body:{action:"review", project_id:p.id}})).data || {}; return r.retired || 0; } catch (e) { return 0; } }
async function plLoad(p){ if (PL.busy[p.id]) return; PL.busy[p.id] = true; let r = await plCall({action:"get", project_id:p.id}); PL.st[p.id] = r; PL.busy[p.id] = false;
  if (r.ok && r.admin && (r.log || []).some(x => x.kind === "reco" && (x.status === "new" || x.status === "scheduled"))) plReview(p).then(n => { if (n) { delete PLO[p.id]; plCall({action:"get", project_id:p.id}).then(r2 => { if (r2.ok) { PL.st[p.id] = r2; toast(L("Хіро переглянув пропозиції: зняв ","Хиро пересмотрел предложения: снял ") + n + L(" — ціна вирівнялась або об’єкт уже вимкнено."," — цена выровнялась или объект уже выключен.")); render(); } }); } });
  if (r.ok && !PL.edit[p.id]) PL.edit[p.id] = plDefaults(p, r.settings); render(); }
/* значения по умолчанию: аккаунт проекта, цель — потолок первой воронки, слова — из правила аккаунта */
function plDefaults(p, s){ const accs = prAccs(p, "meta").map(a => String(a.id)), f = p.funnels[0], cap = f ? fT(f, p).cap : 0;
  const ruled = accs.find(id => ((p.accRules || {})["meta:" + id] || []).length), acc = (s && s.account_ids && s.account_ids[0]) || ruled || accs[0] || "", rule = ((p.accRules || {})["meta:" + acc] || []).find(r => !f || r.f === f.id) || {};
  return {enabled:s ? s.enabled : false, account_ids:s && s.account_ids && s.account_ids.length ? s.account_ids.slice() : acc ? [acc] : [], target_cpl:s && s.target_cpl ? s.target_cpl : Math.round(cap * 100) / 100,
    inc:s ? s.inc : (rule.inc || ""), exc:s ? s.exc : (rule.exc || ""), report_hour:s ? s.report_hour : 9, mode:s && s.mode === "auto" ? "auto" : "propose", auto:!s}; }
/* выключение (группа, кампания, объявление) делаем сразу после «Да», не ночью (Дмитрий, 24.11.2026) */
const plOff = pay => pay && (pay.op === "pause" || pay.op === "pause_ad");
const plStrip = t => String(t || "").replace(/<[^>]+>/g, "");
/* аватар Хиро (heyrow-ui/mascot/avatars): круг --ink, 24–96px */
const hava = (n, size, alt) => `<img class="hava${size && size !== 32 ? " hava--" + size : ""}" src="ui/hiro/${n}.webp" alt="${alt || ""}" width="${size || 32}" height="${size || 32}" loading="lazy">`;
const plTime = at => new Date(at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {timeZone:"Europe/Kyiv", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}).replace(",", "");
const plMoney = v => fxM(v) + " $";
/* кнопка решения — глагол и объект */
const plVerb = (op, lv) => ({pause:lv === "campaign" ? L("Вимкнути кампанію","Выключить кампанию") : L("Вимкнути групу","Выключить группу"), pause_ad:L("Вимкнути оголошення","Выключить объявление"), budget:L("Змінити бюджет","Изменить бюджет"), activate:L("Увімкнути кампанію","Включить кампанию"), relaunch:L("Перезапустити групу","Перезапустить группу"), watch:L("Залишити як є","Оставить как есть")}[op] || L("Зробити вночі","Сделать ночью"));
/* ---------- карточка ленты (heyrow-ui/DESIGN.md, раздел 6 «Предложение автопилота») ----------
   Цифры причины и экономия — из статистики объекта за 3 последних закрытых дня (ad_metrics: ad_summary / ad_adsets / ad_creatives),
   из тех же сумм расхода и лидов, на которых Хиро строит решение. Экономия в день = средний расход объекта за эти дни — только для «выключить».
   Для бюджета, перезапуска, включения и «оставить» денег в экономии нет — плашку не показываем, цифру не придумываем. */
const PLM = {};
const plD = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function plMoneyLoad(p){ if (PLM[p.id] || !CLOUD || !sb) return; PLM[p.id] = {load:true}; const a = {p:p.id, d1:plD(-3), d2:plD(-1)}, q = fn => Promise.resolve(sb.rpc(fn, a)).then(r => r.data || [], () => []);
  Promise.all([q("ad_summary"), q("ad_adsets"), q("ad_creatives"), q("ad_ads")]).then(([c, g, ad, ai]) => { const m = {camp:{}, set:{}, ad:{}, adn:{}, adid:{}}, v = o => ({s:+o.spend || 0, l:+o.leads || 0});
    ai.forEach(o => { m.adid[o.ad_id] = Object.assign(v(o), {set:o.adset_id, cid:o.campaign_id, n:o.ad_name || ""}); });
    c.forEach(o => { m.camp[o.campaign_id] = Object.assign(v(o), {n:o.campaign_name || ""}); }); g.forEach(o => { if (o.adset_id) m.set[o.adset_id] = Object.assign(v(o), {cid:o.campaign_id, n:o.adset_name || ""}); });
    ad.forEach(o => { const k = o.campaign_id + "|" + o.ad_name, x = m.ad[k] = m.ad[k] || {s:0, l:0}; x.s += +o.spend || 0; x.l += +o.leads || 0; const y = m.adn[o.ad_name] = m.adn[o.ad_name] || {s:0, l:0}; y.s += +o.spend || 0; y.l += +o.leads || 0; });
    PLM[p.id] = m; render(); }); }
/* «Путь объекта» (DESIGN.md раздел 6): одна строка, знак площадки, уровни через «›»; иерархия всегда полная — кампания › группа › объявление до объекта действия.
   Названия — из предложения, из текста сервера и из статистики HEYROW (ad_summary / ad_adsets / ad_ads). Неизвестный уровень не пропускаем — показываем «—». */
const PLV = () => ({campaign:L("кампанія","кампания"), adset:L("група","группа"), ad:L("оголошення","объявление")});
function plObj(p, x){ const y = x.payload || {}, op = y.op === "watch" && y.from_op ? y.from_op : y.op, body = String(x.body || ""), m = PLM[p.id] && !PLM[p.id].load ? PLM[p.id] : {camp:{}, set:{}, adid:{}};
  const bm = body.match(/^<b>([^<]*)<\/b>\s*\n<i>([^<]*)<\/i>/), lv = op === "pause_ad" || y.level === "ad" ? "ad" : y.level === "campaign" || op === "activate" ? "campaign" : y.level === "adset" || op ? "adset" : "";
  const id = String(y.id || ""), ai = lv === "ad" ? m.adid[id] || {} : {}, setId = lv === "adset" ? id : ai.set || "", si = setId ? m.set[setId] || {} : {};
  const cid = lv === "campaign" ? id || String(y.cid || "") : String(y.cid || ai.cid || si.cid || "");
  let camp = lv === "campaign" ? y.name || "" : y.cname || (bm ? bm[2] : "") || (m.camp[cid] || {}).n || "";
  if (!camp && cid && typeof prOf === "function") { const c = (prOf(p).cur || []).find(o => String(o.id) === cid); if (c) camp = c.name; }
  let set = lv === "adset" ? y.name || (bm ? bm[1] : "") || si.n || "" : lv === "ad" ? y.sname || si.n || ((String(x.title || "").match(/·\s*(?:група|группа)\s+(.+)$/i) || [])[1] || "") : "";
  const ad = lv === "ad" ? y.name || ai.n || "" : "";
  const path = lv === "campaign" ? [["campaign", camp]] : lv === "adset" ? [["campaign", camp], ["adset", set]] : lv === "ad" ? [["campaign", camp], ["adset", set], ["ad", ad]] : [];
  return {lv, op, path:path.map(z => [z[0], z[1] || "—"])}; }
/* длинное название — многоточие посередине, полное — при наведении */
const plMid = n => n.length > 44 ? n.slice(0, 26) + "…" + n.slice(-15) : n;
const plPath = o => o.path.length ? `<div class="plpath">${typeof chIcon === "function" ? chIcon("meta") : ""}${o.path.map((z, i) => { const me = i === o.path.length - 1;
    return `${i ? `<span class="plpath__s" aria-hidden="true">›</span>` : ""}<span class="plp${me ? " plp--me" : ""}"><span class="plp__k">${PLV()[z[0]]}</span> <span class="plp__n" title="${esc(z[1])}">${esc(plMid(z[1]))}</span></span>`; }).join("")}</div>` : "";
const plAct = (x, op, y) => x.kind === "alert" ? ["warn", "warning"] : op === "pause" || op === "pause_ad" ? ["off", "pause"] : op === "relaunch" ? ["re", "launch"] : op === "activate" ? ["up", "launch"] : op === "budget" ? (y.down ? ["mute", "down"] : ["up", "up"]) : ["mute", "clock"];
/* заголовок и кнопка — на языке интерфейса, по типу действия (тексты сервера бывают на украинском) */
function plTitle(op, y, lv){ return op === "pause" || op === "pause_ad" ? (lv === "ad" ? L("Вимкнути оголошення","Выключить объявление") : lv === "campaign" ? L("Вимкнути кампанію","Выключить кампанию") : L("Вимкнути групу","Выключить группу"))
  : op === "relaunch" ? L("Перезапустити групу","Перезапустить группу") : op === "budget" ? (y.down ? L("Знизити бюджет","Снизить бюджет") : L("Підняти бюджет","Поднять бюджет")) : op === "activate" ? L("Увімкнути кампанію","Включить кампанию") : op === "watch" ? L("Залишити до завтра","Оставить до завтра") : ""; }
const plBtn = (op, y) => op === "pause" || op === "pause_ad" ? L("Вимкнути","Выключить") : op === "relaunch" ? L("Перезапустити","Перезапустить") : op === "budget" ? (y.down ? L("Знизити","Снизить") : L("Підняти","Поднять")) : op === "activate" ? L("Увімкнути","Включить") : L("Залишити","Оставить");
/* статистика объекта за 3 дня: для группы, кампании, объявления */
function plStat(p, x, o){ const m = PLM[p.id]; if (!m || m.load) return null; const y = x.payload || {};
  if (o.lv === "campaign") return m.camp[String(y.id || y.cid || "")] || null;
  if (o.lv === "adset") return m.set[String(y.id || "")] || null;
  if (o.lv === "ad") return m.adid[String(y.id || "")] || null; /* только по ad_id: одинаковые названия в разных группах не смешиваем */
  return null; }
/* статус и бюджет объектов прямо из Meta (hiro-propose, action objs, только чтение) */
const PLO = {};
function plObjsLoad(p, log){ const want = (log || []).filter(x => x.kind === "reco" && (x.status === "new" || x.status === "scheduled") && plOff(x.payload)).map(x => ({id:String((x.payload || {}).id || ""), lv:plObj(p, x).lv})).filter(o => o.id);
  const key = want.map(o => o.id).sort().join(","); if (!want.length || (PLO[p.id] && PLO[p.id].key === key) || !CLOUD || !sb) return; PLO[p.id] = {key, load:true, objs:{}};
  Promise.resolve(sb.functions.invoke("hiro-propose", {body:{action:"objs", project_id:p.id, objs:want}})).then(r => { PLO[p.id] = {key, objs:(r && r.data && r.data.objs) || {}}; render(); }, () => { PLO[p.id] = {key, objs:{}}; }); }
const plMeta = (p, x) => { const r = PLO[p.id]; return r && !r.load ? r.objs[String((x.payload || {}).id || "")] || null : null; };
const plGone = (p, x) => { const o = plMeta(p, x); return !!(o && o.st && o.st !== "ACTIVE"); };
/* экономия в день — только там, где деньги действительно перестанут тратиться:
   кампания — её дневной бюджет (или средний расход, если бюджет на группах); группа — её бюджет, если бюджет не на кампании (иначе деньги уйдут соседним группам);
   объявление — 0: бюджет группы перейдёт к другим объявлениям. Уже выключенное и непрочитанное из Meta — 0. */
function plSaveOf(p, x){ const y = x.payload || {}; if (x.kind !== "reco" || !plOff(y)) return 0; const o = plMeta(p, x); if (!o || o.st !== "ACTIVE") return 0;
  const lv = plObj(p, x).lv, st = plStat(p, x, plObj(p, x)), avg = st && st.s > 0 ? st.s / 3 : 0;
  if (lv === "campaign") return o.budget > 0 ? o.budget : avg;
  if (lv === "adset") return o.cbo ? 0 : o.budget > 0 ? o.budget : avg;
  return 0; }
/* что даст выключение, если денег не сэкономит: цена лида в кампании без этого объекта (те же 3 дня) */
function plCplGain(p, x){ const m = PLM[p.id], y = x.payload || {}; if (!m || m.load) return ""; const lv = plObj(p, x).lv, st = plStat(p, x, plObj(p, x)); if (!st) return "";
  const cid = lv === "ad" ? st.cid : lv === "adset" ? (m.set[String(y.id || "")] || {}).cid : ""; const c = cid ? m.camp[cid] : null; if (!c || !c.l) return "";
  const rl = c.l - st.l, after = rl > 0 ? (c.s - st.s) / rl : 0, before = c.s / c.l;
  return after && after < before ? L("Лід у кампанії стане ~","Лид в кампании станет ~") + plMoney(after) + L(" замість "," вместо ") + plMoney(before) : ""; }
const plIsUk = t => /[іїєґІЇЄҐ]/.test(t);
/* сервер (pilot, hiro-propose) пишет по-украински — для Telegram. В интерфейсе показываем только текст на языке интерфейса:
   известные заголовки переводим, чужой текст прячем (heyrow-ui/LANGUAGE.md, раздел 1). */
const PLT = [[/^Звіт за (.+)$/, m => L("Звіт за ","Отчет за ") + m[1]], [/^Лід дорожчий за план$/, () => L("Лід дорожчий за план","Лид дороже плана")], [/^Сьогодні лід дорожчий за план$/, () => L("Сьогодні лід дорожчий за план","Сегодня лид дороже плана")],
  [/^Акаунт дорожчий за план$/, () => L("Акаунт дорожчий за план","Аккаунт дороже плана")], [/^Близько до стопу$/, () => L("Близько до стопу","Близко к стопу")], [/^Схоже на збій Meta$/, () => L("Схоже на збій Meta","Похоже на сбой Meta")]];
const plTr = t => { t = String(t || ""); for (const [re, f] of PLT) { const m = t.match(re); if (m) return f(m); } return plIsUk(t) === (lang === "uk") ? t : ""; };
/* ответ сервера на «Так / Інше / Прибрати / Вимкнути»: свой текст, если язык совпадает, иначе — понятная фраза на языке интерфейса */
const plSay = (r, v) => r && r.text && plIsUk(r.text) === (lang === "uk") ? r.text : !r || !r.ok ? plErr(r || {}) : ({y:L("Готово","Готово"), n:L("Шукаю інший варіант","Ищу другой вариант"), x:L("Прибрано зі стрічки","Убрано из ленты"), c:L("Прибрано з графіка","Убрано из графика"), off:L("Вимкнено","Выключено")})[v] || L("Готово","Готово");
function plRow(p, x, dis, top){ const pay = x.payload || {}, rep = x.kind === "report";
  const day = x.exec_on ? x.exec_on.slice(8, 10) + "." + x.exec_on.slice(5, 7) : "", T = Number((((PL.st[p.id] || {}).settings) || {}).target_cpl) || 0, money = v => plMoney(v);
  if (rep) { const rt = plTr(x.title) || L("Звіт","Отчет"), same = plIsUk(plStrip(x.body)) === (lang === "uk"); return `<li class="plc plc--rep">${hava("win", 40)}<div class="plc__m"><div class="plc__h"><b>${esc(rt)}</b><time>${esc(plTime(x.at))}</time></div><details class="more"><summary>${L("Показати звіт","Показать отчет")}${ico("chevron")}</summary><pre class="plpre">${esc(plStrip(x.body))}</pre></details></div></li>`.replace(same ? "" : /<details[\s\S]*<\/details>/, same ? "" : `<p class="sub">${L("Повний звіт приходить у Telegram.","Полный отчет приходит в Telegram.")}</p>`); }
  const o = plObj(p, x), act = plAct(x, o.op, pay), st = x.kind === "reco" ? plStat(p, x, o) : null, save = plSaveOf(p, x);
  const title = x.kind === "reco" ? plTitle(o.op, pay, o.lv) || plTr(x.title) || L("Пропозиція","Предложение") : plTr(x.title) || L("Сигнал","Сигнал");
  /* причина в цифрах: расход и лиды объекта за 3 дня; число-причина красное */
  let facts = [];
  if (st && plOff(pay)) facts = [[L("Витрачено за 3 дні","Потрачено за 3 дня"), money(st.s), !st.l], [L("Лідів","Лидов"), String(st.l), false], st.l ? [L("Ціна ліда","Цена лида"), money(st.s / st.l), !!(T && st.s / st.l > T)] : T ? [L("Ціль ліда","Цель лида"), money(T), false] : null].filter(Boolean);
  else if (o.op === "budget" && pay.from) facts = [[L("Бюджет на день","Бюджет в день"), money(pay.from) + " → " + money(pay.to), false]].concat(st ? [[L("Лідів за 3 дні","Лидов за 3 дня"), String(st.l), false], st.l ? [L("Ціна ліда","Цена лида"), money(st.s / st.l), false] : null].filter(Boolean) : []);
  else if (st) facts = [[L("Витрачено за 3 дні","Потрачено за 3 дня"), money(st.s), false], [L("Лідів","Лидов"), String(st.l), false]];
  const factsH = facts.length ? `<div class="plf2">${facts.map(f => `<div><span>${esc(f[0])}</span><b${f[2] ? ' class="is-bad"' : ""}>${esc(f[1])}</b></div>`).join("")}</div>` : "";
  const gone = x.kind === "reco" && plGone(p, x), cg = !save && !gone && plOff(pay) ? plCplGain(p, x) : "", om = plMeta(p, x);
  const gain = save ? `<div class="plgain">${ico("done")}<span>${L("Заощадить близько ","Сэкономит около ")}${money(save)}${L(" на день"," в день")}</span></div>` : cg ? `<div class="plgain">${ico("done")}<span>${esc(cg)}</span></div>` : "";
  const note = gone ? `<span class="st st--pause">${L("Уже вимкнено в Meta","Уже выключено в Meta")}</span>` : om && om.err ? `<p class="plc__t">${L("Не прочитав статус і бюджет у Meta, тому економію не рахую.","Не прочитал статус и бюджет в Meta, поэтому экономию не считаю.")}</p>` : plOff(pay) && om && om.st === "ACTIVE" && !save ? `<p class="plc__t">${o.lv === "ad" ? L("Грошей не заощадить: бюджет групи перейде до інших оголошень.","Денег не сэкономит: бюджет группы перейдет к другим объявлениям.") : L("Грошей не заощадить: бюджет кампанії перейде до інших груп.","Денег не сэкономит: бюджет кампании перейдет к другим группам.")}</p>` : "";
  /* пояснение одной строкой — на языке интерфейса */
  const why = x.kind === "alert" ? "" : plOff(pay) ? (st ? (st.l ? L("Ліди дорожчі за ціль. Вимкнення зупиняє ці витрати.","Лиды дороже цели. Выключение останавливает этот расход.") : L("За 3 дні жодного ліда — гроші витрачаються марно.","За 3 дня ни одного лида — расход идет впустую.")) : L("Ціна ліда гірша за норму. Вимкнення зупиняє витрати.","Цена лида хуже нормы. Выключение останавливает расход."))
    : o.op === "relaunch" ? L("Група не навчиться за такої ціни. Уночі запущу копію без слабких оголошень.","Группа не обучится при такой цене. Ночью запущу копию без слабых объявлений.")
    : o.op === "budget" ? (pay.down ? L("Зменшую втрати, поки шукаємо причину. Зміню вночі.","Уменьшаю потери, пока ищем причину. Изменю ночью.") : L("Лід стабільно дешевший за ціль, навчання пройдено. Зміню вночі.","Лид стабильно дешевле цели, обучение пройдено. Изменю ночью."))
    : o.op === "activate" ? (pay.kind === "new" ? L("Створена вимкненою й ще не крутилась. Увімкну після 00:00.","Создана выключенной и еще не крутилась. Включу после 00:00.") : L("Давала ліди дешевше за ціль, зараз вимкнена. Увімкну після 00:00.","Давала лиды дешевле цели, сейчас выключена. Включу после 00:00."))
    : L("Нічого не змінюю, завтра перевірю ще раз.","Ничего не меняю, завтра проверю еще раз.");
  const raw = plStrip(x.body).replace(/[⚪\u{1F7E2}\u{1F7E1}\u{1F534}]️?\s?/gu, "").trim(), names = o.path.map(z => z[1]);
  const rawT = raw.split("\n").filter(l => !names.includes(l.trim())).join("\n").trim(), same = plIsUk(rawT) === (lang === "uk");
  const line = x.kind === "alert" ? (same ? rawT.split("\n")[0] : "") : why;
  const more = same && rawT && (x.kind !== "alert" || rawT.includes("\n")) ? `<details class="more plmore"><summary>${L("Детальніше","Подробнее")}${ico("chevron")}</summary><div class="plb">${esc(rawT)}</div></details>` : "";
  const isNew = x.kind === "reco" && x.status === "new";
  const state = x.kind === "alert" && x.status === "new" ? `<div class="row plbtn"><button type="button" class="btn btn--sm btn--text" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="x"${dis}>${L("Прибрати","Убрать")}</button></div>` : x.kind !== "reco" ? ""
    : isNew ? `<div class="row plbtn"><button type="button" class="btn btn--sm ${top ? "btn--main" : "btn--solid"}" data-act="${plOff(pay) ? "plOffNow" : "plDecide"}" data-p="${p.id}" data-id="${x.id}" data-v="y"${dis}>${plBtn(o.op, pay)}</button><button type="button" class="btn btn--sm" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="n"${dis}>${L("Запропонуй інше","Предложи другое")}</button><button type="button" class="btn btn--sm btn--text" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="x"${dis}>${L("Прибрати","Убрать")}</button><button type="button" class="btn btn--sm btn--text plwhy" data-act="plWhy" data-p="${p.id}" data-id="${x.id}">${ico("help")} ${L("Чому так","Почему так")}</button></div>`
    : x.status === "scheduled" ? `<div class="row plbtn">${plOff(pay) ? `<button type="button" class="btn btn--sm btn--solid" data-act="plOffNow" data-p="${p.id}" data-id="${x.id}"${dis}>${L("Вимкнути зараз","Выключить сейчас")}</button>` : `<span class="st st--pause">${L("Зроблю вночі ","Сделаю ночью ")}<span class="mono">${day}</span></span>`}<button type="button" class="btn btn--sm btn--text" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="c"${dis}>${L("Прибрати з графіка","Убрать из графика")}</button></div>`
    : x.status === "done" ? `<span class="st ${x.result === "watch" ? "st--on" : "st--fix"}">${x.result === "watch" ? L("Залишив, стежу","Оставил, слежу") : L("Виправив автопілот","Исправил автопилот")}</span>`
    : x.status === "fail" ? `<span class="st st--err">${L("Не вийшло: ","Не получилось: ")}${esc(x.result || "")}</span>`
    : `<span class="st">${{yes:L("Ти погодив","Ты согласовал"), canceled:L("Прибрано з графіка","Убрано из графика"), no:L("Ти відхилив","Ты отклонил"), expired:L("Без відповіді, застаріло","Без ответа, устарело"), dismissed:L("Прибрано","Убрано"), outdated:L("Хіро зняв: пропозиція застаріла","Хиро снял: предложение устарело")}[x.status] || esc(x.status)}${x.decided_by && x.status !== "outdated" ? " · " + esc(x.decided_by) : ""}</span>${x.status === "outdated" && x.result && plIsUk(x.result) === (lang === "uk") ? `<p class="plc__t">${esc(x.result)}</p>` : ""}`;
  const lead = top ? hava("stop", 40) : `<span class="plc__a">${ico(act[1])}</span>`;
  return `<li class="plc plc--${act[0]}${top ? " plc--top" : ""}"${isNew ? ' data-st="new"' : ""}>${lead}<div class="plc__m">${top ? `<span class="heytag">${L("Hey! Найважливіше","Hey! Самое важное")}</span>` : ""}
    <div class="plc__h"><b>${x.kind === "reco" ? `<button type="button" class="plc__ttl" data-act="plWhy" data-p="${p.id}" data-id="${x.id}">${esc(title)}</button>` : esc(title)}</b><time>${esc(plTime(x.at))}</time></div>${plPath(o)}${factsH}${gain}${note}${line ? `<p class="plc__t">${esc(line)}</p>` : ""}${more}${state}</div></li>`; }
/* панель Хиро над списком: сколько предложений и сколько вместе сэкономят в день; «Принять все безопасные» — только выключения (останавливают расход, включить обратно можно в любой момент) */
/* ---------- окно «Чому так»: какие данные видел Хиро, как проверял, почему эта дія и що буде після ---------- */
const plDM = d => d.slice(8, 10) + "." + d.slice(5, 7);
function plWhyHtml(){ const w = PL.why; if (!w) return ""; const p = W.projs.find(z => z.id === w.p), r = p && PL.st[p.id], x = r && (r.log || []).find(z => z.id === w.id); if (!x) return "";
  const y = x.payload || {}, o = plObj(p, x), st = plStat(p, x, o), om = plMeta(p, x), T = Number((r.settings || {}).target_cpl) || 0, m = v => plMoney(v), save = plSaveOf(p, x);
  const cid = o.lv === "campaign" ? String(y.id || y.cid || "") : o.lv === "adset" ? ((PLM[p.id] || {}).set || {})[String(y.id || "")]?.cid : st && st.cid;
  const ld = typeof prLday === "function" && typeof prWin === "function" && cid ? prLday(prWin(cid)) : null;
  const J = st && T && typeof judgeCpl === "function" ? judgeCpl({spend:st.s, leads:st.l, target:T, ld}) : null, exp = J ? st.s / J.Teff : 0;
  const sec = (t, b) => b ? `<section class="plw__s"><h3>${t}</h3>${b}</section>` : "";
  const kv = rows => `<dl class="plw__kv">${rows.filter(Boolean).map(k => `<div><dt>${k[0]}</dt><dd${k[2] ? ' class="is-bad"' : ""}>${k[1]}</dd></div>`).join("")}</dl>`;
  const seen = st ? kv([[L("Період","Период"), plDM(plD(-3)) + "–" + plDM(plD(-1)) + L(" (3 повних дні)"," (3 полных дня)")], [L("Витрачено","Потрачено"), m(st.s)], [L("Лідів","Лидов"), String(st.l), !st.l], [L("Ціна ліда","Цена лида"), st.l ? m(st.s / st.l) : "—", !!(st.l && T && st.s / st.l > T)], T ? [L("Ціль ліда (з налаштувань автопілота)","Цель лида (из настроек автопилота)"), m(T)] : null, J && J.Lf > 1 ? [L("День навчання","День обучения"), String(ld) + L(" — норма вища: ціль ×"," — норма выше: цель ×") + String(J.Lf).replace(".", ",") + " = " + m(J.Teff)] : null])
    : `<p>${L("Цифр за 3 повних дні для цього об’єкта в HEYROW немає.","Цифр за 3 полных дня по этому объекту в HEYROW нет.")}</p>`;
  const how = J ? `<p>${L("Ліди приходять випадково, тому ціну на малих числах я перевіряю статистикою, а не «+20% до цілі».","Лиды приходят случайно, поэтому цену на малых числах я проверяю статистикой, а не «+20% к цели».")}</p>
    <p>${L("Якби справжня ціна ліда дорівнювала нормі ","Если бы реальная цена лида была равна норме ")}<b>${m(J.Teff)}</b>${L(", за ",", за ")}<b>${m(st.s)}</b>${L(" мало б прийти близько "," должно было прийти около ")}<b>${String(Math.round(exp * 10) / 10).replace(".", ",")}</b>${L(" лідів. Прийшло "," лидов. Пришло ")}<b>${st.l}</b>.</p>
    <p>${L("Шанс, що це просто випадковість: ","Шанс, что это просто случайность: ")}<b class="${J.verdict === "bad" ? "is-bad" : ""}">${Math.round(J.q * 100)}%</b>. ${L("Вимикати пропоную, лише коли він 5% або менше (до 10:00 — 1%).","Выключать предлагаю, только когда он 5% или меньше (до 10:00 — 1%).")}</p>
    <p>${J.verdict === "bad" ? L("Зараз це так: ціна гірша за норму з упевненістю ","Сейчас это так: цена хуже нормы с уверенностью ") + Math.round(J.confBad * 100) + "%." : J.verdict === "ok" ? L("За ці 3 дні ціна вже в нормі. Пропозиція могла застаріти — перевір і прибери її.","По этим 3 дням цена уже в норме. Предложение могло устареть — проверь и убери его.") : L("За ці 3 дні поки неоднозначно: ","По этим 3 дням пока неоднозначно: ") + (J.cplIf <= J.Teff ? L("ще ","еще ") + J.extra + L(" лід(и) — і ціна буде "," лид(а) — и цена будет ") + m(J.cplIf) + "." : L("стоп, якщо до ","стоп, если до ") + m(J.stopAt) + L(" витрат не буде нового ліда."," расхода не будет нового лида.")) + L(" Рішення ухвалене раніше — за вікном із сьогоднішнім днем."," Решение принято раньше — по окну с сегодняшним днем.")}</p>` : "";
  const why = o.op === "pause_ad" ? L("Вимикаю одне оголошення, а не групу: решта оголошень групи тримає ціну. Бюджет групи перейде до них.","Выключаю одно объявление, а не группу: остальные объявления группы держат цену. Бюджет группы перейдет к ним.")
    : o.op === "pause" && o.lv === "campaign" ? L("Вимикаю кампанію цілком: дорого в усіх оголошеннях, слабкого, яке можна прибрати окремо, немає.","Выключаю кампанию целиком: дорого во всех объявлениях, слабого, которое можно убрать отдельно, нет.")
    : o.op === "pause" ? L("Вимикаю групу: вона не тримає ціну, а перезапуск без змін — це рулетка. Потрібна нова гіпотеза: креатив, офер або сторінка.","Выключаю группу: она не держит цену, а перезапуск без изменений — это рулетка. Нужна новая гипотеза: креатив, оффер или страница.")
    : o.op === "relaunch" ? L("Група не вийде з навчання за такої ціни. Частина оголошень тягне ціну вгору — копія без них пройде навчання заново.","Группа не выйдет из обучения при такой цене. Часть объявлений тянет цену вверх — копия без них пройдет обучение заново.")
    : o.op === "budget" ? L("Навчання пройдено, лід за 7 днів дешевший за ціль, останні 3 дні стабільно. Крок +15% не збиває навчання.","Обучение пройдено, лид за 7 дней дешевле цели, последние 3 дня стабильно. Шаг +15% не сбивает обучение.")
    : o.op === "activate" ? L("Кампанія давала ліди дешевше за ціль або ще не запускалась. Вмикаю лише після твого «Так».","Кампания давала лиды дешевле цели или еще не запускалась. Включаю только после твоего «Да».") : L("Даних замало для дії — чекаю.","Данных мало для действия — жду.");
  const rule = L(" Плейсменти й країни за ціною ліда не вимикаю (ефект розбивки), частоту не вважаю вигоранням."," Плейсменты и страны по цене лида не выключаю (эффект разбивки), частоту не считаю выгоранием.");
  const after = om && om.err ? L("Статус із Meta не прочитав: ","Статус из Meta не прочитал: ") + om.err : om && om.st && om.st !== "ACTIVE" ? L("У Meta цей об’єкт уже не працює (","В Meta этот объект уже не работает (") + om.st + L("). Пропозицію можна прибрати.","). Предложение можно убрать.")
    : save ? L("Перестане витрачатися близько ","Перестанет тратиться около ") + m(save) + L(" на день — "," в день — ") + (o.lv === "campaign" && om && om.budget ? L("це денний бюджет кампанії в Meta.","это дневной бюджет кампании в Meta.") : o.lv === "adset" && om && om.budget ? L("це денний бюджет групи в Meta.","это дневной бюджет группы в Meta.") : L("це середні витрати за 3 дні.","это средний расход за 3 дня."))
    : plOff(y) ? (plCplGain(p, x) || L("Грошей не заощадить: бюджет перейде до інших оголошень або груп.","Денег не сэкономит: бюджет перейдет к другим объявлениям или группам.")) : "";
  const raw = plStrip(x.body).trim(), same = plIsUk(raw) === (lang === "uk");
  return `<div class="plw"><div class="row sp"><div><span class="tag">${L("Чому так","Почему так")}</span><h2>${esc(plTitle(o.op, y, o.lv) || x.title)}</h2></div><button class="x" data-act="plWhy" data-v="close" aria-label="${L("Закрити","Закрыть")}">${ico("close")}</button></div>
    ${plPath(o)}${sec(L("Що бачу","Что вижу"), seen)}${sec(L("Як перевіряв","Как проверял"), how)}${sec(L("Чому саме ця дія","Почему именно это действие"), `<p>${why}${rule}</p>`)}${sec(L("Що буде після","Что будет после"), after ? `<p>${esc(after)}</p>` : "")}
    ${same && raw ? `<details class="more"><summary>${L("Повний розбір, як його записав сервер","Полный разбор, как его записал сервер")}${ico("chevron")}</summary><pre class="plpre">${esc(raw)}</pre></details>` : ""}
    <p class="sub">${L("Пропозиція від ","Предложение от ")}${esc(plTime(x.at))}. ${L("Цифри «Що бачу» — з HEYROW за 3 повних дні; рішення Хіро ухвалював за 3 дні разом із сьогодні.","Цифры «Что вижу» — из HEYROW за 3 полных дня; решение Хиро принимал за 3 дня вместе с сегодняшним.")}</p>
    <div class="row"><button class="btn btn--solid" data-act="plWhy" data-v="close">${L("Зрозуміло","Понятно")}</button></div></div>`; }
if (typeof ACT !== "undefined") { const _co = ACT.closeOverlay; ACT.closeOverlay = function(d){ PL.why = null; return _co ? _co.call(this, d) : undefined; }; }
if (typeof overlay === "function") { const _plOv = overlay; overlay = function(){ const r = _plOv(); return r || (PL.why ? ["modal", plWhyHtml()] : null); }; }
/* ---------- «Дорого по всьому акаунту» (Дмитрий, 24.11.2026) ----------
   Когда ни одна группа по отдельности не «точно плохая», а весь аккаунт за 3 полных дня дороже цели с уверенностью 95%:
   1) раскладываем цену лида: показ (CPM) → клик (CTR, CPC) → лид (конверсия кликов) — 7 дней против 3 недель до этого и против цели;
   2) ищем лучшую связку (группа × объявление) за 4 недели с осторожной оценкой цены (нижняя граница числа лидов) и предлагаем её:
      работает — +20% бюджета группе (ночью), выключена — вернуть кампанию с группами и объявлениями, что давали лиды (ночью);
   3) советы по креативам, сайту, аукциону и самой цели — с цифрами. Клики — все клики Meta (не только по ссылке). */
const PLA = {};
function plAcctLoad(p){ if (PLA[p.id] || !CLOUD || !sb) return; PLA[p.id] = {load:true};
  const q = (a, b) => Promise.resolve(sb.rpc("ad_funnel", {p:p.id, d1:plD(a), d2:plD(b)})).then(r => r.data || [], () => []);
  Promise.all([q(-3, -1), q(-7, -1), q(-28, -8), q(-28, -1)]).then(([d3, w7, base, all]) => { PLA[p.id] = {d3, w7, base, all, at:Date.now()}; render(); }); }
const plSumR = rows => rows.reduce((a, r) => ({s:a.s + (+r.spend || 0), i:a.i + (+r.impressions || 0), c:a.c + (+r.clicks || 0), l:a.l + (+r.leads || 0)}), {s:0, i:0, c:0, l:0});
const plFun = x => ({cpm:x.i ? x.s / x.i * 1000 : 0, ctr:x.i ? x.c / x.i : 0, cpc:x.c ? x.s / x.c : 0, cr:x.c ? x.l / x.c : 0, cpl:x.l ? x.s / x.l : 0});
/* нижняя граница числа лидов (90%): осторожная цена связки — не выдаём случайную удачу за лучшую */
function plPoisLow(k, p){ if (k <= 0) return 0; let lo = 0, hi = k + 10; for (let i = 0; i < 60; i++){ const m = (lo + hi) / 2; if (1 - poissonCdf(k - 1, m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
function plAcct(p){ const a = PLA[p.id], st = PL.st[p.id], T = st && st.settings ? Number(st.settings.target_cpl) || 0 : 0; if (!a || a.load || !T || typeof judgeCpl !== "function") return null;
  const t3 = plSumR(a.d3), J = judgeCpl({spend:t3.s, leads:t3.l, target:T}); if (J.verdict !== "bad") return null;
  const f7 = plFun(plSumR(a.w7)), fb = plFun(plSumR(a.base)), d = (x, y) => y ? x / y - 1 : 0;
  /* лучшая связка за 4 недели: от 8 лидов, по осторожной цене */
  const by = {}; a.all.forEach(r => { const k = r.adset_id + "|" + r.ad_name, o = by[k] = by[k] || {ad:r.ad_name, set:r.adset_name, sid:r.adset_id, cid:r.campaign_id, camp:r.campaign_name, s:0, l:0, c:0, i:0}; o.s += +r.spend || 0; o.l += +r.leads || 0; o.c += +r.clicks || 0; o.i += +r.impressions || 0; });
  const live = new Set(a.d3.filter(r => +r.spend > 0).map(r => r.adset_id)), liveC = new Set(a.d3.filter(r => +r.spend > 0).map(r => r.campaign_id));
  const cands = Object.values(by).filter(o => o.l >= 8).map(o => Object.assign(o, {cpl:o.s / o.l, safe:o.s / plPoisLow(o.l, 0.1), live:live.has(o.sid)})).sort((x, y) => x.safe - y.safe);
  const best = cands.find(o => o.cpl <= T * 0.8 && o.safe <= T) || null; /* account-expensive.md R9: бюджет — только связке ≤ 0,8 цели */
  /* сравнимость: какая доля расхода недели — в группах, что работали и в 3 недели до этого. Мало — значит, сменились кампании/гео, и «рынок подорожал» говорить нельзя */
  const baseSets = new Set(a.base.filter(r => +r.spend > 0).map(r => r.adset_id)), w7s = plSumR(a.w7).s, same = w7s ? plSumR(a.w7.filter(r => baseSets.has(r.adset_id))).s / w7s : 0, moved = same < 0.5;
  const recs = [];
  if (best) recs.push({k:"best", t:best.live ? L("Дай більше бюджету найкращій зв’язці","Дай больше бюджета лучшей связке") : L("Поверни найкращу зв’язку","Верни лучшую связку"),
    w:"«" + best.ad + L("» у групі «","» в группе «") + best.set + "»: " + best.l + L(" лідів за "," лидов по ") + plMoney(best.cpl) + L(" за 4 тижні; навіть за обережною оцінкою не дорожче за "," за 4 недели; даже по осторожной оценке не дороже ") + plMoney(best.safe) + "." + (best.live ? L(" Вона працює — пропоную +20% бюджету групі, щоб не збити навчання."," Она работает — предлагаю +20% бюджета группе, чтобы не сбить обучение.") : L(" Зараз вона не крутиться — пропоную увімкнути її кампанію лише з тими групами й оголошеннями, що давали ліди. Нове навчання займе кілька днів, ціна може бути вищою, поки воно йде."," Сейчас она не крутится — предлагаю включить ее кампанию только с теми группами и объявлениями, что давали лиды. Новое обучение займет несколько дней, цена может быть выше, пока оно идет."))});
  if (fb.ctr && f7.ctr < fb.ctr * 0.8 || fb.cpc && f7.cpc > fb.cpc * 1.25) recs.push({k:"creo", t:L("Потрібні нові креативи","Нужны новые креативы"),
    w:"CTR " + plPct(fb.ctr) + " → " + plPct(f7.ctr) + ", " + L("клік ","клик ") + plMoney(fb.cpc) + " → " + plMoney(f7.cpc) + L(" за тиждень проти 3 тижнів до того. Люди менше клікають — креативи слабшають. Зроби 3–5 нових роликів з іншими першими секундами й запусти їх у найкращій групі, старі поки не вимикай."," за неделю против 3 недель до этого. Люди меньше кликают — креативы слабеют. Сделай 3–5 новых роликов с другими первыми секундами и запусти их в лучшей группе, старые пока не выключай.")});
  if (fb.cr && f7.cr < fb.cr * 0.75) recs.push({k:"site", t:L("Перевір сайт і форму","Проверь сайт и форму"),
    w:L("З кліку в лід ","Из клика в лид ") + plPct(fb.cr) + " → " + plPct(f7.cr) + L(". Кліки є, а ліди не доходять: перевір, чи відкривається сторінка на телефоні, чи працює форма й піксель, чи не змінився офер. Щоб лід був за ",". Клики есть, а лиды не доходят: проверь, открывается ли страница на телефоне, работает ли форма и пиксель, не изменился ли оффер. Чтобы лид был по ") + plMoney(T) + L(" при нинішній ціні кліку, з кліку в лід має бути "," при нынешней цене клика, из клика в лид должно быть ") + plPct(f7.cpc / T) + "."});
  if (moved && fb.cpm && f7.cpm > fb.cpm * 1.25) recs.push({k:"newcamp", t:L("Нові кампанії дорожчі на показі","Новые кампании дороже на показе"),
    w:Math.round((1 - same) * 100) + L("% витрат тижня — у групах, яких не було 3 тижні тому (нові кампанії чи гео). Їхній показ дорожчий: CPM ","% расхода недели — в группах, которых не было 3 недели назад (новые кампании или гео). Их показ дороже: CPM ") + plMoney(fb.cpm) + " → " + plMoney(f7.cpm) + L(". Це не обов’язково ринок: інше гео й нова аудиторія коштують інакше. Порівнюй нові кампанії з найкращою старою зв’язкою, а не з минулими тижнями.",". Это не обязательно рынок: другое гео и новая аудитория стоят иначе. Сравнивай новые кампании с лучшей старой связкой, а не с прошлыми неделями.")});
  else if (fb.cpm && f7.cpm > fb.cpm * 1.25) recs.push({k:"auction", t:L("Подорожчав аукціон","Подорожал аукцион"),
    w:L("Показ подорожчав: CPM ","Показ подорожал: CPM ") + plMoney(fb.cpm) + " → " + plMoney(f7.cpm) + L(". Це ринок, а не твоя реклама (кінець листопада — сезон розпродажів). Не масштабуй зараз, тримай бюджет на найкращих зв’язках.",". Это рынок, а не твоя реклама (конец ноября — сезон распродаж). Не масштабируй сейчас, держи бюджет на лучших связках.")});
  if (fb.cpl && fb.cpl > T * 1.2) recs.push({k:"target", t:L("Перевір саму ціль","Проверь саму цель"),
    w:L("За 3 тижні до цього лід коштував ","За 3 недели до этого лид стоил ") + plMoney(fb.cpl) + L(" — теж вище за ціль "," — тоже выше цели ") + plMoney(T) + L(". Можливо, ціль занизька для цього офера. Перерахуй її з оплат: скільки можна віддати за лід, щоб реклама окупалась.",". Возможно, цель занижена для этого оффера. Пересчитай ее из оплат: сколько можно отдать за лид, чтобы реклама окупалась.")});
  const liveSets = new Set(a.w7.filter(r => +r.spend > 0 && live.has(r.adset_id)).map(r => r.adset_id)), wk = plSumR(a.w7.filter(r => liveSets.has(r.adset_id))).s, nMax = Math.max(1, Math.floor(wk / (T * 50)));
  if (liveSets.size > nMax) recs.push({k:"split", t:L("Забагато груп для такого бюджету","Слишком много групп для такого бюджета"),
    w:L("Зараз працює ","Сейчас работает ") + liveSets.size + L(" груп, а тижневий бюджет ≈"," групп, а недельный бюджет ≈") + plMoney(wk) + L(" дає Meta 50 лідів на тиждень лише для "," дает Meta 50 лидов в неделю только для ") + nMax + L(". Решта довго вчиться й дорожча. Об’єднай схожі групи (гео — в одну, розбивку дивись у звіті), щоб вийти з навчання.",". Остальные долго учатся и дороже. Объедини похожие группы (гео — в одну, разбивку смотри в отчете), чтобы выйти из обучения.")});
  if (!recs.length) recs.push({k:"wait", t:L("Явного слабкого місця немає","Явного слабого места нет"), w:L("Показ, клік і конверсія — на рівні попередніх тижнів, дорожче рівномірно. Найчастіше справа в офері або аудиторії: протестуй новий кут подачі в окремій групі.","Показ, клик и конверсия — на уровне прошлых недель, дороже равномерно. Чаще всего дело в оффере или аудитории: протестируй новый угол подачи в отдельной группе.")});
  return {T, t3, J, f7, fb, d, best, recs}; }
const plPct = v => (Math.round(v * 1000) / 10).toString().replace(".", ",") + "%";
/* лучшая связка уходит в ленту обычным предложением с «Так» (hiro-propose: budget / activate) */
const PLAP = {};
function plAcctPush(p, A){ if (!A || !A.best || PLAP[p.id + A.best.sid] || typeof tdPropose !== "function") return; PLAP[p.id + A.best.sid] = 1; const b = A.best, day = plD(0);
  const item = b.live ? {key:"acct:b:" + b.sid + ":" + day, title:L("Підняти бюджет найкращій зв’язці","Поднять бюджет лучшей связке"), body:b.set + "\n" + b.ad + ": " + b.l + L(" лідів за "," лидов по ") + plMoney(b.cpl), payload:{op:"budget", cid:b.cid, id:b.sid, facts:[[L("Лідів за 4 тижні","Лидов за 4 недели"), String(b.l), false], [L("Ціна ліда","Цена лида"), plMoney(b.cpl), false], [L("Ціль","Цель"), plMoney(A.T), false]], gain:L("Більше лідів за ціною нижче цілі","Больше лидов по цене ниже цели")}}
    : {key:"acct:a:" + b.cid + ":" + day, title:L("Повернути найкращу зв’язку","Вернуть лучшую связку"), body:b.camp + "\n" + b.ad + ": " + b.l + L(" лідів за "," лидов по ") + plMoney(b.cpl), payload:{op:"activate", cid:b.cid, facts:[[L("Лідів за 4 тижні","Лидов за 4 недели"), String(b.l), false], [L("Ціна ліда","Цена лида"), plMoney(b.cpl), false], [L("Ціль","Цель"), plMoney(A.T), false]], gain:L("Повертає зв’язку, що давала ліди дешевше за ціль","Возвращает связку, что давала лиды дешевле цели")}};
  tdPropose({project_id:p.id, items:[item]}).then(r => { if (r && r.ok && r.added) { delete PL.st[p.id]; plLoad(p); } }); }
function plAcctCard(p){ const A = plAcct(p); if (!A) return ""; plAcctPush(p, A); const m = v => plMoney(v), f7 = A.f7, fb = A.fb;
  const cell = (lab, v, b, fmt, worseUp) => { const ch = b ? v / b - 1 : 0, bad = worseUp ? ch > 0.15 : ch < -0.15; return `<div><span>${lab}</span><b${bad ? ' class="is-bad"' : ""}>${fmt(v)}</b><small>${b ? (ch > 0 ? "+" : "") + Math.round(ch * 100) + "% " + L("до 3 тижнів","к 3 неделям") : ""}</small></div>`; };
  return `<li class="plc plc--warn plc--acct"><span class="plc__a">${ico("warning")}</span><div class="plc__m">
    <div class="plc__h"><b>${L("Дорого по всьому акаунту","Дорого по всему аккаунту")}</b></div>
    <p class="plc__t">${L("За 3 повні дні ","За 3 полных дня ")}${m(A.t3.s)}, ${A.t3.l} ${L("лідів за ","лидов по ")}${m(A.t3.s / A.t3.l)} ${L("при цілі ","при цели ")}${m(A.T)}. ${L("Шанс, що це випадковість, ","Шанс, что это случайность, ")}${Math.max(0.1, Math.round(A.J.q * 1000) / 10).toString().replace(".", ",")}%. ${L("Окремо жодна група ще не «точно погана» — тому розбираю весь акаунт.","По отдельности ни одна группа еще не «точно плохая» — поэтому разбираю весь аккаунт.")}</p>
    <div class="plf2 plf2--fun">${cell("CPM", f7.cpm, fb.cpm, m, true)}${cell("CTR", f7.ctr, fb.ctr, plPct, false)}${cell(L("Ціна кліку","Цена клика"), f7.cpc, fb.cpc, m, true)}${cell(L("З кліку в лід","Из клика в лид"), f7.cr, fb.cr, plPct, false)}${cell(L("Ціна ліда","Цена лида"), f7.cpl, fb.cpl, m, true)}</div>
    <ol class="placc">${A.recs.map(r => `<li><b>${r.t}</b><span>${esc(r.w)}</span></li>`).join("")}</ol>
    <p class="sub">${L("Цифри — за 7 днів проти 3 тижнів до того." + (A.best ? " Найкращу зв’язку я поклав у стрічку окремою пропозицією з «Так»." : ""),"Цифры — за 7 дней против 3 недель до этого." + (A.best ? " Лучшую связку я положил в ленту отдельным предложением с «Да»." : ""))}</p></div></li>`; }
function plSum(p, list, dis){ const m = PLM[p.id] || {}, seen = {}, camps = {}; let sv = 0;
  list.forEach(x => { if (plSaveOf(p, x) && plObj(p, x).lv === "campaign") camps[String((x.payload || {}).id || "")] = 1; });
  list.forEach(x => { const v = plSaveOf(p, x), y = x.payload || {}, id = String(y.id || ""); if (!v || seen[id]) return; seen[id] = 1;
    const cid = plObj(p, x).lv === "adset" ? ((m.set || {})[id] || {}).cid : ""; if (cid && camps[cid]) return; /* группа внутри выключаемой кампании уже учтена */ sv += v; });
  const n = list.length, safe = list.filter(x => plOff(x.payload) && !plGone(p, x)), none = list.filter(x => !plSaveOf(p, x)).length, ask = PL.safe[p.id];
  const t = plural(n, L("пропозиція","предложение"), L("пропозиції","предложения"), L("пропозицій","предложений")) + (sv ? L(". Разом заощадять близько ",". Вместе сэкономят около ") + plMoney(sv) + L(" на день"," в день") : "");
  const btn = !safe.length ? "" : ask ? `<button type="button" class="btn btn--main btn--sm" data-act="plSafeAll" data-p="${p.id}" data-v="go"${dis}>${L("Так, вимкнути ","Да, выключить ")}${safe.length}</button><button type="button" class="btn btn--glass btn--sm" data-act="plSafeAll" data-p="${p.id}" data-v="no">${L("Скасувати","Отмена")}</button>`
    : `<button type="button" class="btn btn--glass btn--sm" data-act="plSafeAll" data-p="${p.id}" data-v="ask"${dis}>${L("Прийняти всі безпечні","Принять все безопасные")}</button>`;
  return `<section class="plhp" aria-label="${L("Хіро: підсумок пропозицій","Хиро: итог предложений")}">${hava("idea", 48)}<div class="plhp__t"><b>${esc(t)}</b><span>${ask ? L("Вимкну ","Выключу ") + safe.length + L(" об’єктів одразу. Увімкнути назад можна будь-коли."," объектов сразу. Включить обратно можно в любой момент.") : safe.length ? L("Безпечні — це вимкнення: вони лише зупиняють витрати. Бюджети й увімкнення — окремо, по одному.","Безопасные — это выключения: они только останавливают расход. Бюджеты и включение — отдельно, по одному.") : ""}${none && sv ? " " + L("Без оцінки в грошах: ","Без оценки в деньгах: ") + none + "." : ""}</span></div>${btn ? `<div class="row">${btn}</div>` : ""}</section>`; }
function plPanel(p){ if (!CLOUD) return "";
  const r = PL.st[p.id]; if (r === undefined && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0);
  const head = t => `<div class="row sp"><h2>${t}</h2>`;
  if (!r) return `<div class="panel plt" role="status">${head(L("Лента автопілота","Лента автопилота"))}</div>${[0, 1, 2].map(() => '<div class="skr"></div>').join("")}</div>`;
  if (!r.ok) return `<div class="panel plt"><div class="empty empty--sm">${hava("oops", 48)}<div><b>${L("Не бачу автопілот.","Не вижу автопилот.")}</b> <span class="sub">${esc(plErr(r))}</span></div></div></div>`;
  const e = PL.edit[p.id], s = r.settings, on = s && s.enabled, accs = prAccs(p, "meta"), dis = r.admin ? "" : " disabled";
  const dirty = s ? (!!e.enabled !== !!s.enabled) : !!e.enabled;
  const st = dirty ? `<span class="st st--pause">${L("Зміни не збережено","Изменения не сохранены")}</span>` : on ? `<span class="st st--on">${L("Працює, перевіряю щогодини","Работает, проверяю каждый час")}</span>` : `<span class="st st--pause">${L("На паузі","На паузе")}</span>`;
  /* лента по вкладкам (Дмитрий, 24.11.2026): предложения · в графике (принято, ждёт ночи) · сделано · отклонено · отчёты и сигналы */
  const log = r.log || [], tabOf = x => x.kind === "report" || x.kind === "alert" ? "rep" : x.status === "new" ? "new" : x.status === "scheduled" || x.status === "yes" ? "plan" : x.status === "done" || x.status === "fail" ? "done" : x.status === "outdated" || x.status === "expired" ? "old" : "no";
  const TABS = [["new", L("Пропозиції","Предложения")], ["plan", L("У графіку","В графике")], ["done", L("Зроблено","Сделано")], ["no", L("Відхилено","Отклонено")], ["old", L("Застаріло","Устарело")], ["rep", L("Сигнали і звіти","Сигналы и отчеты")]];
  const cnt = {}; log.forEach(x => { const t = tabOf(x); cnt[t] = (cnt[t] || 0) + 1; });
  let tab = PL.tab[p.id]; if (!tab) tab = TABS.map(t => t[0]).find(k => cnt[k] && k !== "rep" && k !== "no") || (cnt.rep ? "rep" : "new");
  plMoneyLoad(p); plObjsLoad(p, log); plAcctLoad(p);
  let list = log.filter(x => tabOf(x) === tab);
  if (tab === "new") list = list.slice().sort((a, b) => plSaveOf(p, b) - plSaveOf(p, a) || (b.at > a.at ? 1 : -1));
  const topId = tab === "new" && list[0] && plSaveOf(p, list[0]) ? list[0].id : null, rows = list.map(x => plRow(p, x, dis, x.id === topId)).join("");
  const tabs = log.length ? `<div class="seg pltabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" data-act="plTab" data-p="${p.id}" data-v="${t[0]}" aria-pressed="${tab === t[0]}">${t[1]}${t[0] === "new" && cnt.new ? ` <span class="plcnt">${cnt.new}</span>` : ""}</button>`).join("")}</div>` : "";
  const none = {old:L("Застарілих пропозицій немає.","Устаревших предложений нет."), new:L("Нових пропозицій немає. Стежу далі.","Новых предложений нет. Слежу дальше."), plan:L("У графіку нічого немає.","В графике ничего нет."), done:L("Поки нічого не зроблено.","Пока ничего не сделано."), no:L("Відхилених немає.","Отклоненных нет."), rep:L("Звітів ще немає.","Отчетов еще нет.")}[tab];
  const acct = tab === "new" ? plAcctCard(p) : "";
  const feed = log.length ? `${tabs}${tab === "new" && list.length ? plSum(p, list, dis) : ""}${acct ? `<ul class="pllog">${acct}</ul>` : ""}${rows ? `<ul class="pllog${list.length > 3 ? " pllog--scroll" : ""}">${rows}</ul>` : acct ? "" : `<p class="sub">${none}</p>`}` : `<div class="empty empty--sm">${hava("watch", 48)}<div><b>${L("Тут буде все, що я зробив з рекламою.","Здесь будет все, что я сделал с рекламой.")}</b> <span class="sub">${on ? L("Перевіряю акаунт щогодини, перший звіт надішлю о ","Проверяю аккаунт каждый час, первый отчет пришлю в ") + String(s.report_hour).padStart(2, "0") + ":00." : L("Увімкни автопілот у налаштуваннях нижче.","Включи автопилот в настройках ниже.")}</span></div></div>`;
  const accOpts = accs.map(a => `<label class="ck"><input type="checkbox" data-placc="${esc(String(a.id))}"${e.account_ids.includes(String(a.id)) ? " checked" : ""}${dis}> ${esc(a.name || a.id)}</label>`).join("");
  const hours = [...Array(16)].map((_, i) => i + 7);
  const settings = `<div class="form plf">
      <div class="field w"><span class="lbl">${L("Акаунти","Аккаунты")}</span><div class="row">${accOpts || `<span class="sub">${L("Немає підключених акаунтів Meta. Підключи кабінет у проєкті.","Нет подключенных аккаунтов Meta. Подключи кабинет в проекте.")}</span>`}</div></div>
      <div class="field"><label for="pl-t">${L("Ціль: ціна ліда до, $","Цель: цена лида до, $")}</label><input id="pl-t" data-plf="target_cpl" inputmode="decimal" value="${esc(String(e.target_cpl || ""))}"${dis}>${e.auto ? `<span class="sub">${L("Узяв граничну ціну з воронки","Взял потолок из воронки")}</span>` : ""}</div>
      <div class="field"><label for="pl-h">${L("Звіт щодня о","Отчет каждый день в")}</label><select id="pl-h" data-plf="report_hour"${dis}>${hours.map(h => `<option value="${h}"${+e.report_hour === h ? " selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      <div class="field"><label for="pl-i">${L("Кампанії, назва містить","Кампании, название содержит")}</label><input id="pl-i" data-plf="inc" value="${esc(e.inc || "")}" placeholder="${L("порожньо — усі","пусто — все")}"${dis}></div>
      <div class="field"><label for="pl-x">${L("Не містить","Не содержит")}</label><input id="pl-x" data-plf="exc" value="${esc(e.exc || "")}"${dis}></div>
      <div class="field w"><span class="lbl">${L("Як я працюю","Как я работаю")}</span>
        <div class="seg plseg" role="group">${[["propose", L("Пропоную, ти вирішуєш","Предлагаю, ты решаешь")], ["auto", L("Роблю сам","Делаю сам")]].map(m => `<button type="button" data-act="plMode" data-p="${p.id}" data-v="${m[0]}" aria-pressed="${e.mode === m[0]}"${dis}>${m[1]}</button>`).join("")}</div>
        <span class="sub">${e.mode === "auto" ? L("Одразу ставлю зміни в графік на ніч і пишу, що запланував. Ти можеш прибрати зміну до півночі.","Сразу ставлю изменения в график на ночь и пишу, что запланировал. Ты можешь убрать изменение до полуночи.") : L("Пропозиція приходить сюди й у Telegram. Вимкнення роблю одразу після «Так», бюджет і ввімкнення — вночі. Відхилиш — запропоную інше.","Предложение приходит сюда и в Telegram. Выключение делаю сразу после «Да», бюджет и включение — ночью. Отклонишь — предложу другое.")} ${L("Усі зміни в Meta роблю після 00:00 за Києвом. Рекламу вмикаю лише після твого погодження.","Все изменения в Meta делаю после 00:00 по Киеву. Рекламу включаю только после твоего согласования.")}</span></div>
      <label class="ck w"><input type="checkbox" data-plf="enabled"${e.enabled ? " checked" : ""}${dis}> <span>${L("Автопілот веде акаунт: щогодини перевіряю, зранку звіт, протягом дня сповіщення й пропозиції","Автопилот ведет аккаунт: каждый час проверяю, утром отчет, в течение дня оповещения и предложения")}</span></label></div>
    <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="plSave" data-p="${p.id}"${dis}>${L("Зберегти налаштування","Сохранить настройки")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="0">${L("Перевірити акаунт зараз","Проверить аккаунт сейчас")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="1"${dis}>${L("Надіслати звіт зараз","Отправить отчет сейчас")}</button></div>
    <div class="row pltg"><span class="lbl">Telegram</span>${(s && s.chats && s.chats.length) ? s.chats.map(c => `<span class="st st--on">${esc(c)}</span>`).join(" ") : `<span class="st st--pause">${L("Не підключено","Не подключено")}</span>`}
      <button type="button" class="btn btn--sm" data-act="plTg" data-p="${p.id}"${dis}${r.bot ? "" : ` title="${esc(plErr({error:"no_bot"}))}"`}>${ico("send")} ${L("Підключити Telegram","Подключить Telegram")}</button>${s && s.chats && s.chats.length ? `<button type="button" class="btn btn--sm" data-act="plTgTest" data-p="${p.id}">${L("Надіслати тест","Отправить тест")}</button>` : ""}</div>`;
  return `<div class="panel plt">${head(L("Що пропоную і що зробив","Что предлагаю и что сделал"))}<span class="row"><span class="scrl-cnt sub"></span>${st}</span></div>
    ${feed}
    ${PL.msg[p.id] ? `<p class="sub" role="status">${PL.msg[p.id]}</p>` : ""}
    ${more("pls:" + p.id, L("Налаштування автопілота","Настройки автопилота"), settings)}</div>`; }
/* строка автопилота над рабочей областью: состояние, что делает, последнее действие, одна кнопка */
function apbHTML(){ if (!CLOUD || !W.user || !W.co) return "";
  const ps = (P() ? [P()] : pfProjs()).filter(p => p.meta && p.meta.conn);
  if (!ps.length) return `<span class="apb__st">${hava("sleep", 24)}<span class="st st--pause">${L("Автопілот вимкнено","Автопилот выключен")}</span></span><span class="apb__now">${L("Підключи рекламний кабінет, і я почну.","Подключи рекламный кабинет, и я начну.")}</span>`;
  ps.forEach(p => { if (PL.st[p.id] === undefined && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0); });
  const ok = ps.filter(p => PL.st[p.id] && PL.st[p.id].ok), on = ok.filter(p => PL.st[p.id].settings && PL.st[p.id].settings.enabled);
  if (!ok.length) return `<span class="apb__st">${hava("work", 24)}<span>${ps.some(p => PL.st[p.id] && !PL.st[p.id].ok) ? L("Не бачу автопілот: сервер не відповів.","Не вижу автопилот: сервер не ответил.") : L("Перевіряю автопілот…","Проверяю автопилот…")}</span></span>`;
  const last = ok.flatMap(p => PL.st[p.id].log || []).filter(x => x.kind !== "report").sort((a, b) => (b.at > a.at ? 1 : -1))[0];
  const one = ps.length === 1 ? ps[0] : null, admin = one && PL.st[one.id] && PL.st[one.id].admin;
  const state = on.length ? `${hava("watch", 24)}<span class="st st--on">${ps.length > 1 ? L("Автопілот веде " + on.length + " з " + ps.length + " проєктів", "Автопилот ведёт " + on.length + " из " + ps.length + " проектов") : L("Автопілот увімкнено","Автопилот включен")}</span>`
    : `${hava("sleep", 24)}<span class="st st--pause">${L("Автопілот на паузі","Автопилот на паузе")}</span>`;
  const now = last ? `${L("Останнє: ","Последнее: ")}<time>${esc(plTime(last.at))}</time> · ${esc(last.title)}` : on.length ? L("Щогодини перевіряю акаунт. Змін поки не було.","Каждый час проверяю аккаунт. Изменений пока не было.") : L("Нічого не змінюю, поки на паузі.","Ничего не меняю, пока на паузе.");
  const btn = admin ? `<button type="button" class="btn${on.length ? "" : " btn--solid"}" data-act="apbToggle" data-p="${one.id}">${on.length ? ico("pause") + " " + L("Поставити на паузу","Поставить на паузу") : ico("autopilot") + " " + L("Увімкнути автопілот","Включить автопилот")}</button>` : "";
  return `<span class="apb__st">${state}</span><span class="apb__now">${now}</span>${btn}`; }
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.plf || t.type === "checkbox") return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; PL.edit[p.id][t.dataset.plf] = t.value; PL.edit[p.id].auto = false; });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; const ed = PL.edit[p.id];
  if (t.dataset.plf && t.type === "checkbox") { ed[t.dataset.plf] = t.checked; render(); }
  if (t.dataset.plf === "report_hour") ed.report_hour = +t.value;
  if (t.dataset.placc) { ed.account_ids = t.checked ? [...new Set(ed.account_ids.concat(t.dataset.placc))] : ed.account_ids.filter(x => x !== t.dataset.placc); } });
Object.assign(ACT, {
  apbToggle(d){ const p = W.projs.find(x => x.id === d.p), r = PL.st[d.p]; if (!p || !r || !r.ok) return false; if (!PL.edit[d.p]) PL.edit[d.p] = plDefaults(p, r.settings);
    PL.edit[d.p].enabled = !(r.settings && r.settings.enabled); return ACT.plSave({p:d.p}); },
  plMode(d){ const e = PL.edit[d.p]; if (!e) return false; e.mode = d.v === "auto" ? "auto" : "propose"; },
  async plSave(d){ const e = PL.edit[d.p]; if (!e) return false; if (e.enabled && !(+String(e.target_cpl).replace(",", ".") > 0)) { toast(L("Вкажи цільову ціну ліда","Укажи целевую цену лида")); return false; }
    const r = await plCall({action:"save", project_id:d.p, settings:Object.assign({}, e, {target_cpl:+String(e.target_cpl).replace(",", ".")})});
    toast(r.ok ? (e.enabled ? L("Збережено: Хіро веде акаунт","Сохранено: Хиро ведет аккаунт") : L("Збережено","Сохранено")) : plErr(r)); if (r.ok) { delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); } return false; },
  async plNow(d){ PL.msg[d.p] = L("Перевіряємо…","Проверяем…"); render(); const r = await plCall({action:"now", project_id:d.p, report:d.v === "1", send:d.v === "1"});
    PL.msg[d.p] = r.ok ? L("Груп у роботі: ","Групп в работе: ") + r.groups + L(" · пропозицій: "," · предложений: ") + r.recos + (r.errs && r.errs.length ? " · " + esc(r.errs.join(", ")) : "") : esc(plErr(r)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  plTab(d){ PL.tab[d.p] = d.v; },
  plWhy(d){ PL.why = d.v === "close" ? null : {p:d.p, id:+d.id}; },
  async plSafeAll(d){ if (d.v !== "go") { PL.safe[d.p] = d.v === "ask"; return; } PL.safe[d.p] = false;
    const r0 = PL.st[d.p], pp = W.projs.find(z => z.id === d.p), ids = ((r0 && r0.log) || []).filter(x => x.kind === "reco" && x.status === "new" && plOff(x.payload) && !(pp && plGone(pp, x))).map(x => x.id); let ok = 0;
    PL.msg[d.p] = L("Вимикаю…","Выключаю…"); render();
    for (const id of ids) { try { const r = (await sb.functions.invoke("hiro-propose", {body:{action:"exec_now", project_id:d.p, id}})).data || {}; if (r.ok) ok++; } catch (e) { /* дальше */ } }
    PL.msg[d.p] = ""; toast(L("Вимкнено: ","Выключено: ") + ok + L(" з "," из ") + ids.length); delete PL.st[d.p]; delete PLM[d.p]; delete PLO[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plOffNow(d){ if (!CLOUD || !sb) return false; PL.msg[d.p] = L("Вимикаю…","Выключаю…"); render();
    let r = {}; try { r = (await sb.functions.invoke("hiro-propose", {body:{action:"exec_now", project_id:d.p, id:+d.id}})).data || {}; } catch (e) { r = {}; }
    PL.msg[d.p] = ""; toast(plSay(r, "off")); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plDecide(d){ const r = await plCall({action:"decide", project_id:d.p, id:+d.id, v:d.v}); toast(plSay(r, d.v)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plTg(d){ const w = window.open("", "_blank"); const r = await plCall({action:"tg_link", project_id:d.p});
    if (!r.ok) { if (w) w.close(); toast(plErr(r)); return false; } if (w) w.location = r.url; else location.href = r.url;
    PL.msg[d.p] = L("Відкрий бота й натисни «Start» — чат підключиться. Потім онови сторінку.","Открой бота и нажми «Start» — чат подключится. Потом обнови страницу."); render(); return false; },
  async plTgTest(d){ const r = await plCall({action:"tg_test", project_id:d.p}); toast(r.ok ? L("Надіслано — перевір Telegram","Отправлено — проверь Telegram") : plErr(r)); return false; },
});
