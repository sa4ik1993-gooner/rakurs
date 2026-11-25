/* Задачи для платформы. Человек ставит цель словами — текстом или голосом: «збільшити рекламу вдвічі з тією ж ціною ліда».
   Платформа разбирает фразу без ИИ (правила ниже), берёт цифры за 7 дней по выбранной воронке / каналу / аккаунту / кампании,
   считает план по шагам с датами и каждый день показывает на «Сегодня», что сделать сейчас и держится ли результат.
   В кабинете Meta платформа сама ничего не меняет: шаг делает человек и отмечает «Зроблено».
   Виды задач: scale — больше рекламы с тем же результатом; cut — снизить цену лида; pause — выключить то, что не работает; leads — N лидов к дате. */
const TS = {txt:{}, mic:null, micK:"", busy:{}, prog:{}, pbusy:{}};
const TS_STEP = 1.15, TS_GAP = 2, TS_LEARN = 50, TS_SMALL = 0.2, TS_BIG = 1.5, TS_MINL = 5, TS_BACKS = 2;   /* бюджет поднимаем на 15% раз в 2 дня — иначе Meta заново уходит в обучение. Решение о бюджете — всегда за рекламодателем */
const tsDay = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const tsDM = d => d.slice(8, 10) + "." + d.slice(5, 7);
/* ключ карты co/pid/fid/канал/aАккаунт/кампания → что охватывает задача */
function tsScope(k){ const [, pid, fid, c, a, camp] = String(k || "").split("/"), p = W.projs.find(x => x.id === pid); if (!p) return null;
  const f = fid && p.funnels.find(x => x.id === fid), acc = a && /^a/.test(a) ? prAId(a) : "";
  const parts = [p.name, f && f.name, c && chOf(c)[1], acc && prAccName(p, acc, c), camp && ((prOf(p).cur || []).find(r => r.id === camp) || {}).name].filter(Boolean);
  return {pid:p.id, f:f ? f.id : "", c:c || "", acc, camp:camp || "", label:parts.slice(1).join(" · ") || p.name}; }
const tsKey = s => [s.pid, s.f, s.c, s.acc, s.camp].join("/");

/* разбор фразы: числа, вид задачи, ограничение по цене лида, срок */
function tsParse(t0){ const t = " " + String(t0 || "").toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ") + " ", n = s => parseFloat(s);
  const o = {type:"", factor:0, dayTo:0, guard:"", cpl:0, days:0, leads:0};
  const lm = t.match(/(\d+)\s*(лід|лид|заявк|реєстрац|регистрац)/);
  const money = t.match(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:\$|дол|usd)/);
  if (/(дешевш|дешевле|знизи|сниз|зменши.{0,12}ціну|уменьши.{0,12}цену|ціну ліда до|цену лида до)/.test(t)) o.type = "cut";
  else if (/(вимкн|выключ|зупин|останов|прибрати|убрать)/.test(t) && /(не працю|не работ|збитк|убыт|дорог|погані|плохие|мінус|минус)/.test(t)) o.type = "pause";
  else if (lm && !/(збільш|увелич|масштаб|розган|разгон|розігн|разогн|більше реклам|больше реклам)/.test(t)) { o.type = "leads"; o.leads = n(lm[1]); }
  else if (/(збільш|увелич|масштаб|розган|разгон|розігн|разогн|розкрут|раскрут|більше|больше|подвої|удво|потро|утро|підн|подн|підвищ|повыс|x\s?\d|х\s?\d|×\s?\d|в\s*\d+(?:\.\d+)?\s*раз|на\s*\d+\s*%)/.test(t) || /бюджет\S*\s*(?:до|на)?\s*\$?\s*\d+[^\d]{0,8}(?:в|на|за)\s*(?:день|добу|сутки)/.test(t)) o.type = "scale";
  let m;
  if ((m = t.match(/в\s*(\d+(?:\.\d+)?)\s*раз/)) || (m = t.match(/[xх×]\s?(\d+(?:\.\d+)?)/))) o.factor = n(m[1]);
  else if ((m = t.match(/на\s*(\d+(?:\.\d+)?)\s*%/))) o.factor = 1 + n(m[1]) / 100;
  else if (/(подвої|удво|вдвічі|вдвое|в два рази|в два раза)/.test(t)) o.factor = 2; else if (/(потро|утро|втричі|втрое)/.test(t)) o.factor = 3;
  if ((m = t.match(/до\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:\$|дол\S*)?\s*(?:в|на|за)\s*(?:день|добу|сутки)/))) o.dayTo = n(m[1]);
  else if (o.type === "scale" && (m = t.match(/бюджет\S*\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:\$|дол\S*)?\s*(?:в|на|за)\s*(?:день|добу|сутки)/))) o.dayTo = n(m[1]);
  if (/(тим самим|тем же|тією ж|той же|такою ж|такой же|та ж|та же|такий самий|такой же|без зростання|без роста|не дорожч|не дороже)/.test(t)) o.guard = "same";
  /* цена лида — сумма рядом со словом «лид»: «лид не дороже $6», «по $5 за лид», «цену лида до $5» */
  let lc = t.match(/(?:лід|лид)\S*[^$\d]{0,24}\$\s*(\d+(?:\.\d+)?)/) || t.match(/(?:лід|лид)\S*[^$\d]{0,24}(\d+(?:\.\d+)?)\s*(?:\$|дол|бакс)/) || t.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:за|на)\s*(?:лід|лид)/) || t.match(/(\d+(?:\.\d+)?)\s*(?:\$|дол\S*|бакс\S*)\s*(?:за|на)\s*(?:лід|лид)/);
  if (lc && /бюджет|витрат|расход|минимум|мінімум|від |от /.test(lc[0]) && !/(?:за|на)\s*(?:лід|лид)\S*$/.test(lc[0])) lc = null;
  if (lc) { o.cpl = n(lc[1]); if (o.type !== "cut") o.guard = "num"; }
  else if (money && o.type === "cut") o.cpl = n(money[1] || money[2]);
  /* дата: «за/на 25 ноября» — в этот день, «до 25 листопада», «до 25.11» — к этой дате (Дмитрий, 24.11.2026) */
  const MON = {"січ":1, "янв":1, "лют":2, "фев":2, "бер":3, "мар":3, "кві":4, "апр":4, "тра":5, "мая":5, "май":5, "чер":6, "июн":6, "лип":7, "июл":7, "сер":8, "авг":8, "вер":9, "сен":9, "жов":10, "окт":10, "лис":11, "ноя":11, "гру":12, "дек":12};
  const dm = t.match(/(за|на|до|к|по)?\s*(\d{1,2})\s*(січ|лют|бер|кві|тра|чер|лип|сер|вер|жов|лис|гру|янв|фев|мар|апр|мая|май|июн|июл|авг|сен|окт|ноя|дек)/) || t.match(/(за|на|до|к|по)\s*(\d{1,2})[.\/](\d{1,2})(?![.\d])/);
  if (dm) { const mon = MON[dm[3]] || n(dm[3]), today = prToday(); let y = +today.slice(0, 4), d = y + "-" + String(mon).padStart(2, "0") + "-" + String(+dm[2]).padStart(2, "0"); if (d < today) d = (y + 1) + d.slice(4);
    o.date = d; o.oneDay = dm[1] === "за" || dm[1] === "на"; o.days = o.oneDay ? 1 : Math.max(1, Math.round((Date.parse(d) - Date.parse(today)) / 864e5)); }
  const bm = t.match(/бюджет\S*[^\d$]{0,30}?\$?\s*(\d+(?:\.\d+)?)\s*(?:\$|дол\S*|usd)?(\s*(?:в|на|за)\s*(?:день|добу|сутки))?/);
  const bm2 = !bm && t.match(/(?:від|от|мінімум|минимум|не менше|не меньше)?\s*\$\s*(\d+(?:\.\d+)?)|(?:від|от|мінімум|минимум|не менше|не меньше)?\s*(\d+(?:\.\d+)?)\s*(?:\$|дол\S*|бакс\S*|usd)/);
  if (bm2 && !o.dayTo && !(lc && (lc[1] === bm2[1] || lc[1] === bm2[2])) && o.type !== "cut") { o.budget = n(bm2[1] || bm2[2]); o.min = /(від|от|мінімум|минимум|не менше|не меньше)/.test(bm2[0]); const pd = /(в|на|за)\s*(день|добу|сутки)/.test(t.slice(t.indexOf(bm2[0]) + bm2[0].length, t.indexOf(bm2[0]) + bm2[0].length + 14)); o.dayTo = pd || o.oneDay || !o.days ? o.budget : o.budget / o.days; }
  if (bm && !o.dayTo) { o.budget = n(bm[1]); o.min = /(від|от|мінімум|минимум|не менше|не меньше|хоча б|хотя бы)\s*\$?\s*\d/.test(t.slice(t.indexOf("бюджет"))); o.dayTo = bm[2] || o.oneDay || !o.days ? o.budget : o.budget / o.days; }
  if (dm) {}
  else if ((m = t.match(/за\s*(\d+)\s*(дн|день|дні|дней|доб)/))) o.days = n(m[1]); else if (/за\s*(тиждень|неделю)/.test(t)) o.days = 7; else if (/за\s*(місяць|месяц)/.test(t)) o.days = 30;
  else if ((m = t.match(/до\s*(\d{1,2})[.\/](\d{1,2})/))) { const y = prToday().slice(0, 4), d = y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); o.days = Math.max(1, Math.round((Date.parse(d) - Date.parse(prToday())) / 864e5)); }
  else if (/післязавтра|послезавтра/.test(t)) o.days = 2; else if (/завтра/.test(t)) o.days = 1;
  if (o.leads && /(\d+)\s*(?:лід|лид|заявк|реєстрац|регистрац)\S*\s*(?:в|на|за|у)\s*(?:день|добу|сутки)/.test(t)) { o.perDay = 1; o.days = 1; }
  /* «бюджет 200 $ и 25 лидов» — значит, лид не дороже 200 / 25 = 8 $ */
  if (o.type === "leads" && o.leads && o.dayTo && !o.cpl) { o.budget = o.budget || o.dayTo * (o.oneDay || o.perDay ? 1 : (o.days || 1)); o.cpl = o.budget / o.leads; o.guard = "num"; o.implied = 1; }
  if (o.type === "scale" && !o.factor && !o.dayTo) o.factor = 1.5;
  if (o.type === "scale" && !o.guard) o.guard = "same";
  /* исключения (Дмитрий, 24.11.2026: «в учет не идут кампании с CAP — они могут не откручиваться»): латинское слово из названий */
  const ex = [], rx = /(?:не\s+(?:уч\S*|врах\S*|рах\S*|счит\S*|ид\S*|йд\S*|бер\S*)|без|кроме|крім|окрім|виключ\S*|исключ\S*)[^.;]{0,40}?(?:\s(?:с|з|із|со|зі)\s+|\s)[«"']?([a-z][a-z0-9_]{1,20})/g; let mx;
  while ((mx = rx.exec(t))) if (!ex.includes(mx[1])) ex.push(mx[1]);
  if (ex.length) o.excl = ex;
  return o; }
const tsTypeName = t => ({scale:L("Більше реклами з тим самим результатом","Больше рекламы с тем же результатом"), cut:L("Знизити ціну ліда","Снизить цену лида"), pause:L("Вимкнути те, що не працює","Выключить то, что не работает"), leads:L("Більше лідів","Больше лидов")})[t] || "";

const tsCh = pr => (typeof PROV_CH !== "undefined" && PROV_CH[pr]) || pr;
/* статус обучения Meta по кампаниям: SUCCESS — все работающие группы вышли из обучения; LEARNING — хоть одна учится; FAIL — «ограниченное обучение».
   cbo — бюджет на уровне кампании; edit — последнее значительное изменение (самое свежее по группам). Нет данных — правило 50 лидов. */
TS.lrn = {}; TS.lrnBusy = {};
async function tsLrnLoad(p){ const o = TS.lrn[p.id]; if (o && Date.now() - o.at < 30 * 60000) return o; if (TS.lrnBusy[p.id] || typeof mtCall !== "function") return o || null; TS.lrnBusy[p.id] = true;
  try { const r = await mtCall({action:"learning", project_id:p.id}), by = {};
    if (r && r.ok) (r.adsets || []).forEach(g => { const c = by[g.campaign_id] = by[g.campaign_id] || {id:g.campaign_id, name:g.campaign_name, sets:[], cbo:g.cbo, budget:g.budget, edit:null};
      c.sets.push(g); if (g.last_edit && (!c.edit || g.last_edit > c.edit)) c.edit = g.last_edit; });
    Object.values(by).forEach(c => { const st = c.sets.map(g => g.status); c.status = st.some(x => x === "LEARNING") ? "LEARNING" : st.length && st.every(x => x === "SUCCESS") ? "SUCCESS" : st.some(x => x === "FAIL") ? "FAIL" : ""; });
    TS.lrn[p.id] = {at:Date.now(), ok:!!(r && r.ok), by, err:r && !r.ok ? r.error : ""}; }
  catch (e) { TS.lrn[p.id] = {at:Date.now(), ok:false, by:{}, err:String(e.message || e)}; }
  TS.lrnBusy[p.id] = false; return TS.lrn[p.id]; }
const tsLrnOf = (p, id) => { const o = TS.lrn[p.id]; return o && o.ok ? o.by[id] || null : null; };
/* кампания прошла обучение: по статусу Meta, если он есть; иначе ≥50 лидов за 7 дней */
const tsLearned = (p, r) => { const m = tsLrnOf(p, r.id); return m && m.status ? m.status === "SUCCESS" : r.leads >= TS_LEARN; };
const tsHours = iso => iso ? Math.round((Date.now() - Date.parse(iso)) / 36e5) : 1e9;
/* цифры по охвату задачи за период: по кампаниям, в день */
async function tsRows(p, s, d1, d2){ const r = await sb.rpc("ad_summary", {p:p.id, d1, d2}); if (r.error) throw new Error(r.error.message);
  const days = Math.round((Date.parse(d2) - Date.parse(d1)) / 864e5) + 1, x = prOf(p);
  return (r.data || []).filter(o => { if (s.camp) return o.campaign_id === s.camp; if (s.c && tsCh(o.provider) !== s.c) return false;
      if (s.f && fxFunnel(p, {id:o.campaign_id, f:o.funnel_id || "", name:o.campaign_name, prov:tsCh(o.provider)}) !== s.f) return false;
      if (s.acc && x.am && prAccOf(x, o.campaign_id, tsCh(o.provider)) !== s.acc) return false;
      if (!s.camp && !tsZoneOk(p, o.campaign_name)) return false; return true; })
    .map(o => ({id:o.campaign_id, name:o.campaign_name, spend:+o.spend || 0, leads:+o.leads || 0, day:(+o.spend || 0) / days, cpl:+o.leads ? (+o.spend) / (+o.leads) : 0})).filter(o => o.spend > 0); }
/* зона Хиро: слова «Кампанії, назва містить / не містить» из настроек Хиро — те же правила, что в ленте (Дмитрий, 24.11.2026: задача взяла кампанию не из воронки) */
const tsWords = v => String(v || "").split(/[,;\n]+/).map(w => w.trim().toLowerCase()).filter(Boolean);
function tsZoneOk(p, name){ const st = typeof PL !== "undefined" && PL.st[p.id], z = st && st.ok && st.settings; if (!z) return true;
  const n = String(name || "").toLowerCase(), inc = tsWords(z.inc), exc = tsWords(z.exc);
  return (!inc.length || inc.some(w => n.includes(w))) && !exc.some(w => n.includes(w)); }
/* кампания сейчас крутится: есть активная группа по данным Meta. Нет данных — считаем включённой */
const tsOn = (p, id) => { const o = TS.lrn[p.id]; return !(o && o.ok) || !!o.by[id]; };
const tsSetOn = (p, cid, sid) => { const o = TS.lrn[p.id]; if (!(o && o.ok)) return true; const c = o.by[cid]; return !!(c && c.sets.some(g => String(g.adset_id) === String(sid))); };
const tsSum = rows => { const s = rows.reduce((a, o) => { a.spend += o.spend; a.leads += o.leads; a.day += o.day; return a; }, {spend:0, leads:0, day:0}); s.cpl = s.leads ? s.spend / s.leads : 0; return s; };

/* план по шагам */
/* предупреждение по задаче на рост: цена лида выше текущего потолка воронки (потолок берём на момент показа) */
const tsCap = (p, f) => typeof prT === "function" && f ? prT(f, p) : (() => { const st = typeof PL !== "undefined" ? PL.st[p.id] : null, v = st && st.ok && st.settings ? Number(st.settings.target_cpl) : 0; return v > 0 ? v : (f ? fT(f, p).cap : pT(p).cap); })();
const tsM = v => dec(v) + " $";
function tsWarn(p, t){ if (!t || !(t.type === "scale" || t.type === "leads") || !t.base || !t.base.cpl) return "";
  const f = t.scope && t.scope.f && p.funnels.find(x => x.id === t.scope.f), cap = Math.max(tsCap(p, f), t.o && t.o.implied ? t.o.cpl : 0); if (!(cap > 0) || t.base.cpl <= cap) return "";
  return L("Лід за " + tsM(t.base.cpl) + " при цілі " + tsM(cap) + ": реклама не окупається першою оплатою. Якщо розганяти бюджет за такої ціни, збиток зросте разом із ним. Спершу знизь ціну ліда або перевір стелю в «Звідки гроші з одного ліда».","Лид по " + tsM(t.base.cpl) + " при цели " + tsM(cap) + ": реклама не окупается первой оплатой. Если разгонять бюджет при такой цене, убыток вырастет вместе с ним. Сначала снизь цену лида или проверь потолок в «Откуда деньги с одного лида»."); }
function tsPlan(p, s, o, rows, ext){ const tot = tsSum(rows), f = s.f && p.funnels.find(x => x.id === s.f), cap = Math.max(tsCap(p, f), o.implied ? o.cpl : 0), start = prToday(), st = [];
  const guard = o.guard === "num" ? o.cpl : o.guard === "same" ? (tot.cpl || cap) * 1.1 : (o.type === "cut" ? o.cpl : 0) || cap;
  const nm = a => a.slice(0, 4).map(x => x.name).join(", ") + (a.length > 4 ? L(" і ще "," и еще ") + (a.length - 4) : "");
  const out = {guard, base:{day:tot.day, cpl:tot.cpl, leads:tot.leads}, start, steps:st, note:"", target:0, ext};
  if (!rows.length) { out.note = L("За 7 днів у цьому охопленні не було витрат — плану не буде. Обери інший рівень або запусти рекламу.","За 7 дней в этом охвате не было расхода — плана не будет. Выбери другой уровень или запусти рекламу."); return out; }
  const win = rows.filter(r => r.leads >= 5 && r.cpl && r.cpl <= guard), lose = rows.filter(r => tsOn(p, r.id) && r.spend >= Math.max(cap, 5) * 2 && (!r.leads || r.cpl > Math.max(guard, cap) * 1.3));
  if (o.type === "scale" || o.type === "leads") {
    let target = o.dayTo || tot.day * (o.factor || 1.5);
    if (o.type === "leads") { const days = Math.max(1, o.days || 7), cpl = tot.cpl || cap; target = Math.max(tot.day, o.leads / days * cpl, o.dayTo || 0); out.leadsNeed = o.leads; out.days = days; if (o.date) out.date = o.date;
      if (o.leads / days * cpl > tot.day * 3) out.note = L("Щоб встигнути, бюджет треба підняти більш ніж утричі — ціна ліда, найімовірніше, зросте. Реальніше — подовжити строк.","Чтобы успеть, бюджет нужно поднять больше чем втрое — цена лида, скорее всего, вырастет. Реалистичнее — продлить срок."); }
    out.target = target; const grow = tot.day ? target / tot.day : 1, why = out.why = [];
    /* обучение Meta: кампания «прошла обучение», если за 7 дней ≥ TS_LEARN лидов (Meta выходит из обучения после ~50 событий в неделю на группу) */
    const fresh = win.filter(r => { const m = tsLrnOf(p, r.id); return m && tsHours(m.edit) < 48; });
    const learned = win.filter(r => tsLearned(p, r) && !fresh.includes(r)), learning = win.filter(r => !tsLearned(p, r));
    const byMeta = win.some(r => { const m = tsLrnOf(p, r.id); return m && m.status; });
    out.strategy = grow <= 1 + TS_SMALL ? "small" : grow <= TS_BIG ? "steps" : "dup";
    why.push(L("Піднімаємо бюджет лише кампаніям, що пройшли навчання Meta (","Поднимаем бюджет только кампаниям, прошедшим обучение Meta (") + (byMeta ? L("за статусом Meta","по статусу Meta") : L("від ","от ") + TS_LEARN + L(" лідів за 7 днів"," лидов за 7 дней")) + "): " + (learned.length ? nm(learned) : L("таких поки немає","таких пока нет")) + "." + (learning.length ? L(" Ще в навчанні — не чіпаємо: "," Еще в обучении — не трогаем: ") + nm(learning) + "." : "")
      + (fresh.length ? L(" Значні зміни менш ніж 48 год тому — чекаємо: "," Значительные изменения меньше 48 ч назад — ждем: ") + nm(fresh) + "." : ""));
    if (lose.length) why.push(L("Спершу вимикаємо те, що тягне ціну вгору: ","Сначала выключаем то, что тянет цену вверх: ") + nm(lose) + ".");
    /* бизнесу нужно больше лидов — не «ждать обучения», а дубль лучшей связки отдельной группой на ночь (Дмитрий, 24.11.2026) */
    if (!learned.length) { const ex = out.ext || {}, inScope = new Set(rows.map(r => r.id)), mx = Math.max(guard, cap) * 1.2;
      const sets = (ex.sets || []).filter(x => x.sid && inScope.has(x.cid) && x.leads >= 3 && tsSetOn(p, x.cid, x.sid)).map(x => Object.assign({}, x, {cpl:x.spend / x.leads})).filter(x => x.cpl <= mx).sort((a, b) => a.cpl - b.cpl), best = sets[0];
      if (best) { const crs = (ex.crs || []).filter(c => c.cid === best.cid && c.leads >= 2).sort((a, b) => a.spend / a.leads - b.spend / b.leads).slice(0, 3).map(c => c.name);
        const bud = Math.round(Math.min(500, Math.max(10, target - tot.day)));
        out.note = (out.note ? out.note + " " : "") + L("Групи ще вчаться — піднімати їм бюджет не буду, це зіб’є навчання. Більше лідів беру дублем найкращої зв’язки окремою групою: навчання поточних груп не чіпаю.","Группы еще учатся — поднимать им бюджет не буду, это собьет обучение. Больше лидов беру дублем лучшей связки отдельной группой: обучение текущих групп не трогаю.");
        if (lose.length) st.push({d:start, t:L("Вимкни те, що тягне ціну вгору: ","Выключи то, что тянет цену вверх: ") + nm(lose) + "."});
        st.push({d:start, t:L("Дубль найкращої зв’язки: група «","Дубль лучшей связки: группа «") + best.name + L("» (ліди за ","» (лиды по ") + tsM(best.cpl) + L(" за 7 днів)"," за 7 дней)") + (crs.length ? L(", креативи: ",", креативы: ") + crs.join(", ") : "") + L("; бюджет ","; бюджет ") + bud + L(" $ на день, старт о 01:00."," $ в день, старт в 01:00."), act:"dupnight", sid:best.sid, cid:best.cid, bud, sn:best.name, cpl:best.cpl, crs});
        why.push(L("Найкраща зв’язка за 7 днів — група «","Лучшая связка за 7 дней — группа «") + best.name + L("»: ліди за ","»: лиды по ") + tsM(best.cpl) + L(". Дубль бере ті самі налаштування й до 3 оголошень з лідами за 14 днів, власний бюджет — і вчиться окремо, не збиваючи поточні групи.",". Дубль берет те же настройки и до 3 объявлений с лидами за 14 дней, свой бюджет — и учится отдельно, не сбивая текущие группы."));
        why.push(L("Нова група перші 3–5 днів у навчанні — ціна ліда може бути трохи вищою, це Хіро враховує.","Новая группа первые 3–5 дней в обучении — цена лида может быть немного выше, Хиро это учитывает."));
        st.push({d:tsDay(start, 1), t:L("Щогодини стежу за дублем. Ціна ліда вилетить за норму — одразу напишу в Telegram з кнопкою «Вимкнути»: вимикаю відразу після «Так».","Каждый час слежу за дублем. Цена лида вылетит за норму — сразу напишу в Telegram с кнопкой «Выключить»: выключаю сразу после «Да»."), watch:1});
        return out; } }
    if (!win.length || !learned.length) { out.note = (out.note ? out.note + " " : "") + (!win.length ? L("Немає кампаній, де ціна ліда в межах $","Нет кампаний, где цена лида в пределах $") + dec(guard) + L(" і хоча б 5 лідів за 7 днів. Спершу знизь ціну ліда."," и хотя бы 5 лидов за 7 дней. Сначала снизь цену лида.")
        : L("Жодна кампанія ще не пройшла навчання — піднімати бюджет рано, він зіб’є навчання. Зачекай, поки буде ","Ни одна кампания еще не прошла обучение — поднимать бюджет рано, это собьет обучение. Подожди, пока будет ") + TS_LEARN + L(" лідів за 7 днів."," лидов за 7 дней."));
      if (!learned.length && win.length) st.push({d:start, t:L("Чекаємо навчання: ","Ждем обучения: ") + nm(win) + ".", wait:1}); return out; }
    const lDay = learned.reduce((a, r) => a + r.day, 0), gap = target - tot.day; let cur = lDay, i = 0;
    const maxSteps = out.strategy === "small" ? 1 : out.strategy === "steps" ? 4 : 2, lTo = out.strategy === "dup" ? lDay * Math.pow(TS_STEP, maxSteps) : lDay + gap;
    why.push(out.strategy === "small" ? L("Невелике збільшення — один крок у межах кампаній, що вже навчилися: показники мають втриматися.","Небольшое увеличение — один шаг в рамках кампаний, которые уже обучились: показатели должны удержаться.")
      : out.strategy === "steps" ? L("Крок +","Шаг +") + Math.round((TS_STEP - 1) * 100) + L("%, не частіше разу на ","%, не чаще раза в ") + TS_GAP + L(" дні. Meta: зміна бюджету скидає навчання залежно від розміру ($100→$101 — ні, $100→$1000 — так); точного відсотка Meta не називає, практика — до 20%."," дня. Meta: изменение бюджета сбрасывает обучение в зависимости от размера ($100→$101 — нет, $100→$1000 — да); точного процента Meta не называет, практика — до 20%.")
      : L("Збільшення суттєве (×","Увеличение существенное (×") + dec(grow, 1) + L("): тільки бюджетом його не взяти без втрати якості. Плавно піднімаємо навчені кампанії, а решту дасть дубль найкращої кампанії.","): только бюджетом его не взять без потери качества. Плавно поднимаем обученные кампании, а остальное даст дубль лучшей кампании."));
    if (lose.length) st.push({d:start, t:L("Вимкни те, що тягне ціну вгору: ","Выключи то, что тянет цену вверх: ") + nm(lose) + "."});
    while (cur < lTo - 0.5 && i < maxSteps) { const nx = Math.min(cur * (out.strategy === "small" ? Math.min(TS_STEP, lTo / cur) : TS_STEP), lTo);
      st.push({d:tsDay(start, i * TS_GAP), t:L("Підніми бюджет: ","Подними бюджет: ") + nm(learned) + L(" — разом з $"," — вместе с $") + dec(cur, 0) + L(" до $"," до $") + dec(nx, 0) + L(" на день (+","/день (+") + Math.round((nx / cur - 1) * 100) + "%)" + (learned.length < rows.length ? L("; усього по охопленню $","; всего по охвату $") + dec(tot.day + nx - lDay, 0) + L(" на день","/день") : "") + ".", bud:{cids:learned.map(r => String(r.id)), k:nx / cur}});
      cur = nx; i++; }
    if (out.strategy === "dup") { const best = learned.slice().sort((a, b) => a.cpl - b.cpl)[0], rest = Math.max(0, target - tot.day - (cur - lDay)), ex = out.ext || {}, bm = tsLrnOf(p, best.id), cbo = !!(bm && bm.cbo);
      const sets = (ex.sets || []).filter(x => x.cid === best.id && x.leads >= 3).sort((a, b) => a.spend / a.leads - b.spend / b.leads).slice(0, 3).map(x => x.name);
      const crs = (ex.crs || []).filter(x => x.cid === best.id && x.leads >= 3).sort((a, b) => a.spend / a.leads - b.spend / b.leads).slice(0, 3).map(x => x.name);
      const tail = (sets.length ? L(". Найкращі групи: ",". Лучшие группы: ") + sets.join(", ") : "") + (crs.length ? L(". Креативи: ",". Креативы: ") + crs.join(", ") : "") + ".";
      const tA = L("Нова група в кампанії ","Новая группа в кампании ") + best.name + L(" (бюджет кампанії +$"," (бюджет кампании +$") + dec(rest, 0) + L(" на день) — копія найкращої групи на ширшу аудиторію","/день) — копия лучшей группы на более широкую аудиторию") + tail;
      const tC = L("Дубль кампанії ","Дубль кампании ") + best.name + L(" (ліди за $"," (лиды по $") + dec(best.cpl) + L("): нова кампанія, вимкнена, бюджет ~$","): новая кампания, выключенная, бюджет ~$") + dec(rest, 0) + L(" на день","/день") + tail;
      st.push({d:tsDay(start, i * TS_GAP), t:cbo ? tA : tC, tA, tC, mode:cbo ? "adset" : "camp", rec:cbo ? "adset" : "camp", act:"launch", dup:1, cid:best.id, cn:best.name});
      why.push(cbo ? L("Пропонуємо нову групу в тій самій кампанії: бюджет на рівні кампанії, тож нова група не збиває навчання інших (дані Meta). Можна змінити на дубль кампанії.","Предлагаем новую группу в той же кампании: бюджет на уровне кампании, поэтому новая группа не сбивает обучение остальных (данные Meta). Можно сменить на дубль кампании.")
        : L("Пропонуємо дубль кампанії: бюджет на рівні груп, і новий бюджет у тій самій кампанії не дасть потрібного обсягу без ризику для навчених груп. Можна змінити на нову групу в кампанії.","Предлагаем дубль кампании: бюджет на уровне групп, и новый бюджет в той же кампании не даст нужного объема без риска для обученных групп. Можно сменить на новую группу в кампании."));
      why.push(L("Збирається з найкращих груп і креативів кампанії ","Собирается из лучших групп и креативов кампании ") + best.name + L(" за 7 днів. Хіро запускає сам — старт о 01:00. Нове проходить навчання 3–7 днів — ціна ліда в перші дні вища."," за 7 дней. Хиро запускает сам — старт в 01:00. Новое проходит обучение 3–7 дней — цена лида в первые дни выше."));
      i++; }
    why.push(L("Наступний крок відкривається за результатом: минуло ","Следующий шаг открывается по результату: прошло ") + TS_GAP + L(" дні після попереднього, прийшло ≥"," дня после предыдущего, пришло ≥") + TS_MINL + L(" лідів і ціна ліда ≤ $"," лидов и цена лида ≤ $") + dec(guard) + ".");
    why.push(L("Якщо ціна ліда вища за $","Если цена лида выше $") + dec(guard) + L(" — поверни попередній бюджет; після "," — верни прежний бюджет; после ") + TS_BACKS + L(" відкатів задача зупиняється з висновком."," откатов задача останавливается с выводом."));
    why.push(L("Бюджети Хіро змінює вночі — після твого «Так» або сам у режимі «Роблю сам».","Бюджеты Хиро меняет ночью — после твоего «Да» или сам в режиме «Делаю сам»."));
    st.push({d:tsDay(start, i * TS_GAP + 3), t:L("Перевірка: 3 дні на новому бюджеті. Якщо ціна ліда в межах — задачу виконано.","Проверка: 3 дня на новом бюджете. Если цена лида в пределах — задача выполнена."), check:1});
  } else if (o.type === "cut") {
    const tg = o.cpl || tot.cpl * 0.8; out.guard = tg; out.target = tg;
    const bad = rows.filter(r => tsOn(p, r.id) && r.spend >= tg * 2 && (!r.leads || r.cpl > tg * 1.3)), good = rows.filter(r => r.leads >= 3 && r.cpl <= tg);
    if (bad.length) st.push({d:start, t:L("Вимкни: ","Выключи: ") + nm(bad) + L(" — ліди дорожчі за $"," — лиды дороже $") + dec(tg * 1.3) + "."});
    if (bad.length && good.length) st.push({d:start, t:L("Перенеси їхній бюджет ($","Перенеси их бюджет ($") + dec(bad.reduce((a, r) => a + r.day, 0), 0) + L("/день) у: ","/день) в: ") + nm(good) + L(" — не більше +20% за раз."," — не больше +20% за раз.")});
    st.push({d:tsDay(start, 2), t:L("Перевір вигорання креативів: Запуск → Дослідження воронки. Вигорілі заміни новими.","Проверь выгорание креативов: Запуск → Исследование воронки. Выгоревшие замени новыми."), act:"launch"});
    st.push({d:tsDay(start, 5), t:L("Перевірка: ціна ліда за 3 дні не вища за $","Проверка: цена лида за 3 дня не выше $") + dec(tg) + ".", check:1});
    if (!bad.length && !good.length) out.note = L("Явних збиткових кампаній немає — ціну тягнуть креативи або лендинг.","Явных убыточных кампаний нет — цену тянут креативы или лендинг.");
  } else if (o.type === "pause") {
    if (lose.length) st.push({d:start, t:L("Вимкни: ","Выключи: ") + nm(lose) + "."}); else out.note = L("Кампаній, що явно не працюють, за 7 днів немає.","Кампаний, которые явно не работают, за 7 дней нет.");
  }
  return out; }

/* поставить задачу: разобрать, посчитать план, показать человеку — он запускает или правит фразу */
async function tsCreate(k, text){ const s = tsScope(k), p = s && W.projs.find(x => x.id === s.pid); if (!p) return false;
  const o = tsParse(text); if (!o.type) { toast(L("Не зрозумів задачу. Напиши, що змінити й до скількох: «підняти бюджет до 200 $ на день», «ціна ліда до 5 $», «100 лідів за тиждень».","Не понял задачу. Напиши, что изменить и до скольких: «поднять бюджет до 200 $ в день», «цена лида до 5 $», «100 лидов за неделю».")); return false; }
  if (!CLOUD || !sb) { toast(L("Задачі працюють із сервером","Задачи работают с сервером")); return false; }
  let ok = false;
  try { await tsLrnLoad(p); if (typeof PL !== "undefined" && !(PL.st[p.id] && PL.st[p.id].ok) && typeof plCall === "function") { const r0 = await plCall({action:"get", project_id:p.id}); if (r0 && r0.ok) PL.st[p.id] = r0; }
    const d2 = tsDay(prToday(), -1); let rows = await tsRows(p, s, tsDay(d2, -6), d2);
    const [gs, cs] = await Promise.all([sb.rpc("ad_adsets", {p:p.id, d1:tsDay(d2, -6), d2}), sb.rpc("ad_creatives", {p:p.id, d1:tsDay(d2, -6), d2})]);
    const ext = {sets:(gs.data || []).map(x => ({cid:x.campaign_id, sid:String(x.adset_id || ""), name:x.adset_name || x.adset_id, spend:+x.spend || 0, leads:+x.leads || 0})), crs:(cs.data || []).map(x => ({cid:x.campaign_id, name:x.ad_name, spend:+x.spend || 0, leads:+x.leads || 0}))};
    if (o.excl && o.excl.length) { const hit = n => o.excl.some(w => String(n || "").toLowerCase().includes(w));
      rows = rows.filter(r => !hit(r.name));
      ext.sets.filter(x => hit(x.name)).forEach(x => { const r = rows.find(r => r.id === x.cid); if (!r) return; r.spend = Math.max(0, r.spend - x.spend); r.leads = Math.max(0, r.leads - x.leads); r.day = r.spend / 7; r.cpl = r.leads ? r.spend / r.leads : 0; });
      ext.sets = ext.sets.filter(x => !hit(x.name)); rows = rows.filter(r => r.spend > 0); }
    /* тесты Хиро (копии « · CAP », « · GEO ») не берём источником для дубля */
    ext.sets = ext.sets.filter(x => !/ · (CAP|GEO) /.test(String(x.name || "") + " "));
    const pl = tsPlan(p, s, o, rows, ext); delete pl.ext;
    /* Хиро не составил шагов — задачу не сохраняем, говорим почему (25.11: пустые планы висели в списке) */
    if (!(pl.steps || []).length) { const w = tsWarn(p, Object.assign({type:o.type, o}, pl)); toast(w || L("Не можу скласти план з поточними цифрами — спробуй іншу ціль або суму.","Не могу составить план с текущими цифрами — попробуй другую цель или сумму."), 9000); return false; }
    const nt = Object.assign({id:uid(), text:String(text).trim(), type:o.type, o, scope:s, status:"plan", at:new Date().toISOString()}, pl);
    p.tasks = p.tasks || []; p.tasks.unshift(nt); TS.open = {p:p.id, id:nt.id}; TS.fresh = nt.id; save(); ok = true; }
  catch (e) { toast(String(e.message || e)); }
  return ok; }

/* состояние очередного шага: ждём (дни / лиды), можно, или откатить. Первый шаг — сразу (до 12:00 по Киеву — сегодня, позже — завтра утром). */
/* статус дубля на ночь — из ленты Хиро (Дмитрий, 24.11.2026: видно, сделано ли уже, стоит ли в запуске с ночи или Хиро еще будет делать) */
function tsDupSt(p, x){ if (!x.sched) return null; const st = typeof PL !== "undefined" && PL.st[p.id], row = st && st.ok ? (st.log || []).find(r => r.id === x.sched) : null;
  if (!row) return {k:"mute", t:L("Передано Хіро","Передано Хиро")};
  const y = row.payload || {}, dd = row.exec_on ? tsDM(row.exec_on) : "", hm = typeof plPrepHm === "function" ? plPrepHm(y) : "01:00";
  if (row.status === "fail") return {k:"crit", t:L("Не вийшло: ","Не получилось: ") + (row.result || ""), fail:1};
  if (row.status === "done") return {k:"good", t:L("Запущено","Запущено") + (y.geo === "world" ? L(" · країни з оплатами"," · страны с оплатами") : "")};
  if (row.status === "canceled" || row.status === "dismissed" || row.status === "no") return {k:"mute", t:L("Прибрано з графіка","Убрано из графика"), fail:1};
  if (row.status === "scheduled" && y.prep && y.prep.nid) return {k:"good", t:L("Створено, стартує сама · ","Создано, стартует сама · ") + dd + L(" о "," в ") + hm + "", url:typeof plPrepUrl === "function" ? plPrepUrl(y) : ""};
  if (row.status === "scheduled") return {k:"warn", t:L("У графіку: створю вночі ","В графике: создам ночью ") + dd};
  return {k:"warn", t:L("Чекає «Так» у стрічці Хіро","Ждет «Да» в ленте Хиро")}; }
/* старые планы: шаг «Перевірка: 3 дні дубля» показываем как ежечасное наблюдение (Дмитрий, 24.11.2026) */
const tsStepText = (t, x) => x.check && /3 дні дубля|3 дня дубля/.test(x.t || "") ? L("Щогодини стежу за дублем. Ціна ліда вилетить за норму — одразу напишу в Telegram з кнопкою «Вимкнути»: вимикаю відразу після «Так».","Каждый час слежу за дублем. Цена лида вылетит за норму — сразу напишу в Telegram с кнопкой «Выключить»: выключаю сразу после «Да».") : x.t;
/* шаг-дубль карточкой: группа, креативы, бюджет, гео (выбор), старт, статус */
const TS_GEO_DEF = ["PL","US","DE","CA","CZ","GB","IT","ES","FR","RO","NL","SK","SE","IE","AT","IL","DK","CH","BG","NO","BE","AE","LT","GE","MD","HU","PT","LV","TR","HR","FI","JP","GR","CY"];
const tsGeo = p => (Array.isArray(p.dupGeo) && p.dupGeo.length ? p.dupGeo : TS_GEO_DEF);
function tsDupHtml(p, t, x, i){ const s = tsDupSt(p, x), a = `data-p="${p.id}" data-id="${t.id}" data-i="${i}"`;
  const crs = x.crs || ((x.t || "").match(/креативи: ([^;]+);|креативы: ([^;]+);/) || []).slice(1).filter(Boolean).join("").split(", ").filter(Boolean);
  const cpl = x.cpl || (((x.t || "").match(/ліди за ([\d,.]+) \$|лиды по ([\d,.]+) \$/) || []).slice(1).find(Boolean) || "").replace(",", ".");
  const geo = x.geo === "world" ? "world" : "", sched = !!s && !s.fail;
  const kv = [[L("Група","Группа"), esc(x.sn || "") + (cpl ? ` <span class="sub">· ${L("ліди за ","лиды по ")}${tsM(+cpl)} ${L("за 7 днів","за 7 дней")}</span>` : "")],
    [L("Креативи","Креативы"), crs.length ? `<span class="tsdup__crs">${crs.map(c => `<span class="chip">${esc(c)}</span>`).join("")}</span>` : L("до 3 оголошень з лідами за 14 днів","до 3 объявлений с лидами за 14 дней")],
    [L("Бюджет","Бюджет"), sched ? `<b class="mono">${tsM(x.bud)}</b> ${L("на день","в день")}` : `<span class="tsdup__bud"><input class="tin" inputmode="decimal" data-tsdupbud="${p.id}|${t.id}|${i}" value="${Math.round(x.bud)}" aria-label="${L("Бюджет дубля на день, $","Бюджет дубля в день, $")}"> $ ${L("на день","в день")}</span> ${hint(L("Від 10 до 500 $. Хіро запропонував суму, якої не вистачає до цілі задачі.","От 10 до 500 $. Хиро предложил сумму, которой не хватает до цели задачи."))}`],
    [L("Гео","Гео"), sched ? (geo ? L("країни з оплатами: ","страны с оплатами: ") + tsGeo(p).join(", ") : L("як у групі","как в группе")) : TS.dupBusy ? (geo ? L("країни з оплатами: ","страны с оплатами: ") + tsGeo(p).join(", ") : L("як у групі","как в группе")) : `<span class="seg seg--xs" role="group" aria-label="${L("Гео дубля","Гео дубля")}"><button type="button" data-act="tsDupGeo" ${a} data-g="" aria-pressed="${!geo}">${L("Як у групі","Как в группе")}</button><button type="button" data-act="tsDupGeo" ${a} data-g="world" aria-pressed="${!!geo}">${L("Країни з оплатами","Страны с оплатами")}</button></span> ${hint(L("«Як у групі» — ті самі країни, що зараз. «Країни з оплатами» — список країн, звідки приходили передоплати; його можна поправити (коди країн через кому). Мова, вік і решта налаштувань як у групі.","«Как в группе» — те же страны, что сейчас. «Страны с оплатами» — список стран, откуда приходили предоплаты; его можно поправить (коды стран через запятую). Язык, возраст и остальное как в группе."))}${geo ? `<input class="tin tin--w tsdup__geo" data-tsdupgeo="${p.id}" value="${esc(tsGeo(p).join(", "))}" aria-label="${L("Країни для дубля, коди через кому","Страны для дубля, коды через запятую")}">` : ""}`],
    [L("Старт","Старт"), L("наступної ночі о 01:00","следующей ночью в 01:00")]];
  const foot = TS.dupBusy === t.id + ":" + i ? `<span class="pill pill--warn">${L("Хіро створює копію в Meta — до 2 хвилин, не закривай сторінку","Хиро создает копию в Meta — до 2 минут, не закрывай страницу")}</span>` : !s ? `<button type="button" class="btn btn--main" data-act="tsDupGo" ${a} data-g="${geo}">${ico("clock")} ${L("Запланувати на ніч","Запланировать на ночь")}</button>`
    : `<span class="pill pill--${s.k}">${esc(s.t)}</span>${s.url ? ` <a class="btn btn--sm" href="${esc(s.url)}" target="_blank" rel="noopener">${L("Відкрити в Ads Manager","Открыть в Ads Manager")}</a>` : ""}${s.fail ? ` <button type="button" class="btn btn--sm" data-act="tsDupRe" ${a}>${L("Спробувати ще раз","Попробовать еще раз")}</button>` : ""}`;
  return `<div class="tsdup"><b class="tsdup__h">${ico("duplicate")} ${L("Дубль найкращої зв’язки","Дубль лучшей связки")}</b><dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl><div class="row tsdup__f">${foot}</div></div>`; }
function tsGate(t){ const i = t.steps.findIndex(x => !x.done); if (i < 0 || t.status !== "run") return null; const x = t.steps[i], prev = i ? t.steps[i - 1] : null, g = TS.prog[t.id], today = prToday();
  if (x.wait) return {st:"wait", why:L("Чекаємо, поки кампанії пройдуть навчання.","Ждем, пока кампании пройдут обучение.")};
  if (!prev || !prev.done) { const h = +new Date().toLocaleString("en-GB", {timeZone:"Europe/Kyiv", hour:"2-digit", hour12:false}).slice(0, 2);
    return x.d > today ? {st:"wait", why:L("Крок на ","Шаг на ") + tsDM(x.d)} : !prev && h >= 12 && x.d === today && !x.check ? {st:"go", why:L("Бюджет краще змінити зранку — до 12:00 за Києвом; можна завтра зранку.","Бюджет лучше менять утром — до 12:00 по Киеву; можно завтра утром.")} : {st:"go", why:""}; }
  const days = Math.round((Date.parse(today) - Date.parse(prev.done)) / 864e5);
  if (g && g.cpl && g.cpl > t.guard && days >= TS_GAP) return {st:"back", why:L("Ціна ліда $","Цена лида $") + dec(g.cpl) + L(" вища за межу $"," выше границы $") + dec(t.guard) + L(" — бюджет треба повернути."," — бюджет нужно вернуть.")};
  if (days < TS_GAP) return {st:"wait", why:L("Минуло ","Прошло ") + days + L(" з "," из ") + TS_GAP + L(" днів після кроку."," дней после шага.")};
  if (g && g.leads < TS_MINL) return {st:"wait", why:L("Лідів після кроку ","Лидов после шага ") + num(g.leads) + L(" з "," из ") + TS_MINL + "."};
  return {st:"go", why:L("Результат тримається — можна наступний крок.","Результат держится — можно следующий шаг.")}; }
/* как идёт задача: последние 3 полных дня против исходных */
async function tsProg(p, t){ if (TS.pbusy[t.id]) return; TS.pbusy[t.id] = true;
  try { const d2 = tsDay(prToday(), -1), rows = await tsRows(p, t.scope, tsDay(d2, -2), d2); TS.prog[t.id] = Object.assign(tsSum(rows), {at:Date.now()}); }
  catch (e) { TS.prog[t.id] = {err:String(e.message || e)}; }
  TS.pbusy[t.id] = false; render(); }
/* «Зрозумів так»: одно предложение по-человечески (Дмитрий, 24.11.2026: «фраза глупо написана») */
function tsUnd(t){ const o = t.o || {}, m = v => tsM(v), parts = [];
  if (t.type === "leads") parts.push(num(o.leads) + (o.perDay ? L(" лідів на день"," лидов в день") : o.date ? (o.oneDay ? L(" лідів за "," лидов за ") : L(" лідів до "," лидов к ")) + tsDM(o.date) : ((t.days || 7) === 7 ? L(" лідів за тиждень"," лидов за неделю") : L(" лідів за "," лидов за ") + t.days + L(" дн."," дн."))));
  if (t.type === "scale" && o.factor && !o.dayTo) parts.push(L("реклами у ","рекламы в ") + dec(o.factor, o.factor % 1 ? 1 : 0) + L(" рази більше"," раза больше"));
  if (t.type === "cut") parts.push(L("лід до ","лид до ") + m(t.guard || o.cpl));
  if (t.type === "pause") parts.push(L("вимкнути те, що не працює","выключить то, что не работает"));
  if (o.budget) parts.push(L("бюджет ","бюджет ") + (o.min ? L("від ","от ") : "") + m(o.budget) + (o.perDay || /день|добу|сутки/.test(String(t.text).toLowerCase()) ? L(" на день"," в день") : o.oneDay || !o.days ? "" : L(" (≈"," (≈") + m(o.dayTo) + L(" на день)"," в день)")));
  else if (t.target && t.type !== "cut" && t.type !== "pause") parts.push(L("бюджет до ","бюджет до ") + dec(t.target, 0) + L(" $ на день"," $ в день"));
  if (t.guard && t.type !== "cut") parts.push(o.implied ? L("лід не дорожче ","лид не дороже ") + m(t.guard) + " (" + m(o.budget) + " / " + num(o.leads) + ")" : o.guard === "same" ? L("лід не дорожче нинішнього (","лид не дороже нынешнего (") + m(t.guard) + ")" : L("лід не дорожче ","лид не дороже ") + m(t.guard));
  if (o.excl && o.excl.length) parts.push(L("без кампаній і груп з «","без кампаний и групп с «") + o.excl.join("», «").toUpperCase() + L("» у підрахунку","» в подсчете"));
  return L("Зрозумів так: ","Понял так: ") + parts.join(", ") + ". " + (t.base && t.base.day ? L("Зараз: ","Сейчас: ") + dec(t.base.day, 0) + L(" $ на день, лід за "," $ в день, лид по ") + (t.base.cpl ? m(t.base.cpl) : "—") + "." : ""); }
function tsCard(p, t){ const g = TS.prog[t.id], today = prToday(), next = t.steps.find(x => !x.done), late = next && next.d <= today;
  if (t.status === "run" && (!g || Date.now() - g.at > 30 * 60000) && !TS.pbusy[t.id] && CLOUD) setTimeout(() => tsProg(p, t), 0);
  const o = t.o, und = [tsTypeName(t.type), o.factor && t.type === "scale" ? "×" + dec(o.factor, 1) : "", t.target && t.type !== "cut" && !o.budget ? L("до ","до ") + dec(t.target, 0) + L(" $ на день"," $ в день") : "", t.type === "leads" ? num(o.leads) + L(" лідів"," лидов") + (o.date ? (o.oneDay ? L(" за "," за ") : L(" до "," до ")) + tsDM(o.date) : L(" за "," за ") + (t.days || 7) + L(" дн."," дн.")) : "", o.budget ? L("бюджет ","бюджет ") + (o.min ? L("від ","от ") : "") + tsM(o.budget) + (o.oneDay || !o.days ? "" : L(" (≈"," (≈") + tsM(o.dayTo) + L(" на день)"," в день)")) : "", t.guard ? L("ціна ліда ≤ ","цена лида ≤ ") + tsM(t.guard) + (o.implied ? " (" + tsM(o.budget) + " / " + num(o.leads) + ")" : "") : ""].filter(Boolean).join(" · ");
  const pg = g && !g.err && g.day ? (() => { const ok = !g.cpl || g.cpl <= t.guard * 1.0001, lv = ok ? "good" : "crit";
    return `<p class="tsp tsp--${lv}">${L("Зараз (3 дні): ","Сейчас (3 дня): ")}${dec(g.day, 0)}${L(" $ на день, лід за "," $ в день, лид по ")}${g.cpl ? tsM(g.cpl) : "—"}${t.target && t.type !== "cut" ? L(" · ціль "," · цель ") + dec(t.target, 0) + L(" $ на день"," $ в день") : ""}${ok ? "" : L(" — ціна вища за межу: поверни попередній бюджет і зачекай 2 дні."," — цена выше границы: верни прежний бюджет и подожди 2 дня.")}</p>`; })() : g && g.err ? `<p class="sub">${esc(g.err)}</p>` : "";
  return `<div class="tsc tsc--${t.status}"><div class="row sp"><div><b>${esc(t.text)}</b><div class="sub">${esc(t.scope.label)} · ${L("поставлено ","поставлено ")}${tsDM(t.at.slice(0, 10))}</div></div>
      <span class="row">${t.status === "plan" ? `<button type="button" class="btn btn--sm btn--solid" data-act="tsRun" data-p="${p.id}" data-id="${t.id}">${L("Почати","Начать")}</button>` : t.status === "run" ? pill("good", L("іде","идет")) : pill("mute", t.status === "done" ? L("виконано","выполнено") : L("зупинено","остановлено"))}
        <button type="button" class="lnk" data-act="tsDel" data-p="${p.id}" data-id="${t.id}" aria-label="${L("Прибрати задачу","Убрать задачу")}">${ico("close")}</button></span></div>
    ${(() => { /* пакет B (25.11): карточка свёрнута — одна строка статуса; подробности по нажатию. Открыта сама, только если сегодня есть шаг */
      const ni = t.steps.indexOf(next), n = t.steps.length, old = t.status === "plan" && Date.now() - Date.parse(t.at) > 864e5;
      const sum = t.status === "plan" && !n ? L("Хіро не склав кроків","Хиро не составил шагов") + (old ? L(" · цифри від "," · цифры от ") + tsDM(t.at.slice(0, 10)) : "") : t.status === "plan" ? L("План · ","План · ") + n + " " + plural(n, L("крок","шаг"), L("кроки","шага"), L("кроків","шагов")).replace(/^\d+\s*/, "") + (old ? L(" · цифри від "," · цифры от ") + tsDM(t.at.slice(0, 10)) : "")
        : t.status === "run" && next ? L("Крок ","Шаг ") + (ni + 1) + L(" з "," из ") + n + " · " + tsDM(next.d) + " · " + (s0 => s0.length > 70 ? s0.slice(0, 69) + "…" : s0)(tsStepText(t, next))
        : t.note ? t.note : t.status === "done" ? L("Усі кроки виконано","Все шаги выполнены") : L("Задачу зупинено","Задача остановлена");
      return `<details class="tsc__d" data-fold="ts:${t.id}"${(k => { const st = typeof foldSt === "function" ? foldSt() : {}; return k in st ? st[k] : t.status === "run" && late; })("ts:" + t.id) ? " open" : ""}><summary><span>${esc(sum)}</span>${ico("chevron")}</summary>
      ${old ? `<p class="tsold">${L("План складено ","План составлен ")}${tsDM(t.at.slice(0, 10))}${L(" — цифри могли змінитися."," — цифры могли измениться.")} <button type="button" class="btn btn--sm" data-act="tsRe" data-p="${p.id}" data-id="${t.id}">${ico("refresh")} ${L("Оновити план","Обновить план")}</button></p>` : ""}`; })()}
    <p class="tsu">${esc(tsUnd(t))}</p>
    ${(w => w ? `<p class="tsw-cap">${ico("warning")} ${esc(w)}</p>` : "")(tsWarn(p, t))}${t.note ? `<p class="tsn">${esc(t.note)}</p>` : ""}${pg}
    ${t.steps.length ? `<ol class="tss">${t.steps.map((x, i) => `<li class="${x.done ? "ok" : x === next && t.status === "run" ? (late ? "now" : "next") : ""}"><span class="tss__n">${L("Крок ","Шаг ")}${i + 1} · <span class="mono">${tsDM(x.d)}</span></span> ${x.act === "dupnight" && !x.done ? tsDupHtml(p, t, x, i) : `<span>${esc(tsStepText(t, x))}</span>`}${x.dup && x.tA && !x.done ? ` <span class="seg seg--xs" role="group" aria-label="${L("Як збільшувати","Как увеличивать")}"><button type="button" data-act="tsMode" data-p="${p.id}" data-id="${t.id}" data-v="adset" aria-pressed="${x.mode === "adset"}">${L("Нова група","Новая группа")}${x.rec === "adset" ? L(" · раджу"," · советую") : ""}</button><button type="button" data-act="tsMode" data-p="${p.id}" data-id="${t.id}" data-v="camp" aria-pressed="${x.mode === "camp"}">${L("Дубль кампанії","Дубль кампании")}${x.rec === "camp" ? L(" · раджу"," · советую") : ""}</button></span>` : ""}${t.status === "run" && x === next ? (() => { const gt = tsGate(t); return gt && gt.st !== "go" ? ` <small class="tsg tsg--${gt.st}">${esc(gt.why)}</small>${gt.st === "back" ? (() => { const pv = t.steps[i - 1]; return pv && pv.bud ? ` <button type="button" class="btn btn--sm btn--solid" data-act="tsBud" data-p="${p.id}" data-id="${t.id}" data-v="${i - 1}" data-back="1"${TS.budBusy === t.id ? " disabled" : ""}>${L("Хіро, поверни бюджет","Хиро, верни бюджет")}</button>` : ` <button type="button" class="btn btn--sm" data-act="tsBack" data-p="${p.id}" data-id="${t.id}">${L("Повернув","Вернул")}</button>`; })() : ""}` : (gt && gt.why ? ` <small class="tsg">${esc(gt.why)}</small>` : "") + ` <span class="row">${x.act === "launch" && t.scope.f ? (x.dup && x.mode === "adset" ? `<button type="button" class="btn btn--sm" data-act="bdTarget" data-mode="adset" data-p="${p.id}" data-f="${t.scope.f}" data-cid="${esc(x.cid || "")}" data-cn="${esc(x.cn || "")}">${L("Зібрати групу","Собрать группу")}</button>` : `<button type="button" class="btn btn--sm" data-act="tsGo" data-p="${p.id}" data-f="${t.scope.f}">${x.dup ? L("Зібрати дубль","Собрать дубль") : L("Відкрити запуск","Открыть запуск")}</button>`) : ""}${x.bud ? `<button type="button" class="btn btn--sm btn--solid" data-act="tsBud" data-p="${p.id}" data-id="${t.id}" data-v="${i}"${TS.budBusy === t.id ? " disabled" : ""}>${TS.budBusy === t.id ? L("Ставлю в графік…","Ставлю в график…") : L("Хіро, підніми бюджет","Хиро, подними бюджет")}</button>` : `<button type="button" class="btn btn--sm${late ? " btn--solid" : ""}" data-act="tsDone" data-p="${p.id}" data-id="${t.id}" data-v="${i}">${x.check ? L("Результат є","Результат есть") : L("Зроблено","Сделано")}</button>`}</span>`; })() : ""}${x.bud && x.sched && x.done ? ` <small class="tsg">${L("Хіро змінить бюджет уночі після 00:00","Хиро изменит бюджет ночью после 00:00")}</small>` : ""}</li>`).join("")}</ol>` : ""}
    ${t.status === "run" ? `<div class="row"><button type="button" class="lnk" data-act="tsStop" data-p="${p.id}" data-id="${t.id}">${L("Зупинити задачу","Остановить задачу")}</button></div>` : ""}</details></div>`; }

const TS_EX = () => [L("Збільшити рекламу вдвічі з тією ж ціною ліда","Увеличить рекламу вдвое с той же ценой лида"), L("Розігнати до 300 $ на день, лід не дорожче 6 $","Разогнать до 300 $ в день, лид не дороже 6 $"), L("Знизити ціну ліда до 5 $","Снизить цену лида до 5 $"), L("100 лідів за тиждень","100 лидов за неделю"), L("Вимкнути те, що не працює","Выключить то, что не работает")];
/* Подсказки под полем — по ситуации воронки и по тому, что этот проект уже ставил (Дмитрий, 25.11: «подсказки будут подстраиваться»).
   Без ИИ и без новых записей в базу: цифры — из уже загруженной статистики Хиро (PLA, 7 дней и сегодня), история — из задач проекта.
   Порядок: 2 по ситуации → до 2 своих частых → остальные шаблоны; всего 5. */
function tsHints(k){ const base = TS_EX(), s = typeof tsScope === "function" ? tsScope(/^co\//.test(k) ? k : TS.sc) : null, p = s && W.projs.find(x => x.id === s.pid); if (!p) return base;
  const out = [], add = t => { if (t && !out.some(x => x.toLowerCase() === t.toLowerCase())) out.push(t); }, m = v => (Math.round(v * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "") + " $";
  const st = typeof PL !== "undefined" && PL.st[p.id], set = st && st.settings, z = set && (set.zones || []).find(x => x.fid === s.f), T = +(z && z.target_cpl) || +(set && set.target_cpl) || 0;
  const A = typeof PLA !== "undefined" && PLA[p.id], fid = r => typeof plFid === "function" ? plFid(p, r) : "", mine = r => !s.f || fid(r) === s.f;
  const sum = rows => (rows || []).filter(mine).reduce((o, r) => (o.s += +r.spend || 0, o.l += +r.leads || 0, o), {s:0, l:0});
  if (A && !A.load && T) { const w = sum(A.w7), c = w.l ? w.s / w.l : 0, day = w.s / 7;
    if (c && c > T * 1.1) { add(L("Знизити ціну ліда до ","Снизить цену лида до ") + m(T)); add(L("Вимкнути те, що не працює","Выключить то, что не работает")); }
    else if (c && c <= T) { add(L("Збільшити рекламу вдвічі з тією ж ціною ліда","Увеличить рекламу вдвое с той же ценой лида"));
      if (day > 0) add(L("Розігнати до ","Разогнать до ") + Math.max(10, Math.round(day * 2 / 10) * 10) + L(" $ на день, лід не дорожче "," $ в день, лид не дороже ") + m(T)); }
    if (w.l >= 7) add(Math.round(w.l * 1.3 / 5) * 5 + L(" лідів за тиждень"," лидов за неделю")); }
  /* свои частые: тексты задач этого проекта (и этой воронки), чаще всего ставившиеся — первыми */
  const cnt = {}; (p.tasks || []).filter(t => t.text && (!s.f || !t.scope || !t.scope.f || t.scope.f === s.f)).forEach(t => { const key = t.text.trim(); cnt[key] = (cnt[key] || 0) + 1; });
  Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(e => add(e[0].length > 60 || (lang === "ru" ? /[іїєґ]/i.test(e[0]) : /[ыэъё]/i.test(e[0]) || !/[іїєґ’']/i.test(e[0])) ? "" : e[0])); /* один экран — один язык (E1) */
  base.forEach(add); return out.slice(0, 5); }
/* поле задачи: на «Сегодня» с выбором охвата, в окне карточки — для этой карточки */
function tsBox(k, pick){ const busy = TS.busy[k], mic = (window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="btn btn--ico${TS.mic && TS.micK === k ? " btn--solid" : ""}" data-act="tsMic" data-k="${esc(k)}" aria-label="${L("Надиктувати","Надиктовать")}" title="${L("Надиктувати","Надиктовать")}"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="7.5" y="2.5" width="5" height="9" rx="2.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/></svg></button>` : "";
  return `<div class="tsb">${pick || ""}<div class="row tsi"><input id="ts-${esc(k)}" data-tsk="${esc(k)}" value="${esc(TS.txt[k] || "")}" placeholder="${L("Що зробити? Напр.: збільшити рекламу вдвічі з тією ж ціною ліда","Что сделать? Напр.: увеличить рекламу вдвое с той же ценой лида")}" aria-label="${L("Задача","Задача")}"${busy ? " disabled" : ""}>${mic}<button type="button" class="btn btn--sm btn--solid" data-act="tsAdd" data-k="${esc(k)}"${busy ? " disabled" : ""}>${busy ? L("Рахуємо…","Считаем…") : L("Поставити","Поставить")}</button></div>
    <div class="opts opts--sm">${tsHints(k).map(x => `<button type="button" class="opt" data-act="tsEx" data-k="${esc(k)}" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`; }
/* календарь: 4 недели с понедельника текущей; в дне — шаги задач. Нажали — окно задачи по центру; «×» — убрать задачу. */
TS.view = (() => { try { return localStorage.getItem("heyrow_ts_view") || "cal"; } catch (e) { return "cal"; } })(); TS.open = null; TS.arm = "";
/* Календар і Список — одні й ті самі події (Дмитрий, 25.11: «список или календарь — это одно и то же»), з однаковими статусами:
   plan  — оранжевый «Заплановано на ДД.ММ»: план задачи (ещё не начат — даты от сегодня), будущий шаг, то, что Хиро сделает ночью;
   ready — зелёный «Створено, чекає запуску · старт ДД.ММ о 01:00»: копия уже в Meta, стартует сама;
   live  — «Запущено»; done — «Виконано»; fail — «Не вийшло»; wait — «Чекає …» (обучение, нет шагов). */
const TS_K = () => ({plan:L("Заплановано","Запланировано"), ready:L("Створено, чекає запуску","Создано, ждет запуска"), live:L("Запущено","Запущено"), done:L("Виконано","Выполнено"), fail:L("Не вийшло","Не получилось"), wait:L("Чекає","Ждет")});
function tsItems(ps){ const today = prToday(), out = [], tf = t => typeof tfTask !== "function" || tfTask(t);
  ps.forEach(p => { (p.tasks || []).filter(t => (t.status === "run" || t.status === "plan") && tf(t)).forEach(t => {
      const sh = t.status === "plan" && t.start ? Math.max(0, Math.round((Date.parse(today) - Date.parse(t.start)) / 864e5)) : 0;
      if (!t.steps.length) { out.push({d:today, k:"wait", p, t, i:-1, title:t.text, sub:L("Хіро не склав кроків — відкрий, щоб оновити або прибрати","Хиро не составил шагов — открой, чтобы обновить или убрать")}); return; }
      const nx = t.steps.find(y => !y.done);
      t.steps.forEach((x, i) => { const d = sh ? tsDay(x.d, sh) : x.d, ds = x.act === "dupnight" ? tsDupSt(p, x) : null, gt = t.status === "run" && x === nx ? tsGate(t) : null;
        const k = x.done ? (ds && ds.k === "good" && /Створено|Создано/.test(ds.t) ? "ready" : ds && ds.fail ? "fail" : x.check ? "done" : x.sched ? "live" : "done")
          : ds && ds.k === "good" ? "ready" : ds && ds.fail ? "fail" : gt && (gt.st === "wait" || gt.st === "back") ? "wait" : "plan";
        out.push({d, k, p, t, x, i, title:t.text, sub:L("крок ","шаг ") + (i + 1) + "/" + t.steps.length + " · " + (ds ? ds.t : gt && gt.st !== "go" ? gt.why : tsStepText(t, x))}); }); });
    (((typeof PL !== "undefined" && PL.st[p.id]) || {}).log || []).filter(x => x.kind === "reco" && x.status === "scheduled" && x.exec_on && (typeof tfLog !== "function" || tfLog(p, x))).forEach(x => {
      const y = x.payload || {}, rd = !!(y.prep && y.prep.nid), hm = typeof plPrepHm === "function" ? plPrepHm(y) : "01:00";
      out.push({d:x.exec_on, k:rd ? "ready" : "plan", p, row:x, title:typeof plTitle === "function" ? plTitle(y.op, y, y.level) || x.title : x.title, sub:(rd ? L("старт о ","старт в ") + hm : L("Хіро зробить уночі","Хиро сделает ночью")) + (y.name ? " · " + String(y.name).slice(0, 40) : "")}); }); });
  return out.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); }
const tsKPill = it => `<span class="tsk-st tsk-st--${it.k}">${TS_K()[it.k]}${it.k === "plan" || it.k === "ready" ? " · " + tsDM(it.d) : ""}</span>`;
const tsItBtn = it => it.row ? `data-act="plWhy" data-p="${it.p.id}" data-id="${it.row.id}"` : `data-act="tsOpen" data-p="${it.p.id}" data-id="${it.t.id}"`;
/* список: те же события по датам — сегодня и вперёд, сделанное за последние 7 дней свёрнуто */
function tsAgenda(ps){ const today = prToday(), all = tsItems(ps), past = all.filter(it => it.d < today), cur = all.filter(it => it.d >= today), by = {};
  cur.forEach(it => { (by[it.d] = by[it.d] || []).push(it); });
  const day = d => d === today ? L("Сьогодні","Сегодня") : d === tsDay(today, 1) ? L("Завтра","Завтра") : tsDM(d);
  const row = it => `<li class="tsa__i"><button type="button" class="tsa__b" ${tsItBtn(it)}>${tsKPill(it)}<b>${esc(it.title.length > 70 ? it.title.slice(0, 69) + "…" : it.title)}</b><small>${esc(it.sub)}</small></button></li>`;
  const recent = past.filter(it => it.d >= tsDay(today, -7));
  return `<div class="tsa">${Object.keys(by).map(d => `<section class="tsa__d"><h3>${day(d)}</h3><ul>${by[d].map(row).join("")}</ul></section>`).join("") || `<p class="sub">${L("Попереду нічого не заплановано.","Впереди ничего не запланировано.")}</p>`}
    ${recent.length ? `<details class="tsa__past" data-fold="tsa:past"${(typeof foldSt === "function" && foldSt()["tsa:past"]) ? " open" : ""}><summary>${L("Минулі 7 днів · ","Прошлые 7 дней · ")}${recent.length}${ico("chevron")}</summary><ul>${recent.reverse().map(row).join("")}</ul></details>` : ""}</div>`; }
function tsCal(ps){ const today = prToday(), d0 = new Date(today + "T12:00:00"), mon = tsDay(today, -((d0.getDay() + 6) % 7)), days = [...Array(28)].map((_, i) => tsDay(mon, i)), by = {};
  tsItems(ps).forEach(it => { (by[it.d] = by[it.d] || []).push(it); });
  const wd = [L("Пн","Пн"), L("Вт","Вт"), L("Ср","Ср"), L("Чт","Чт"), L("Пт","Пт"), L("Сб","Сб"), L("Нд","Вс")];
  return `<div class="tcal"><div class="tcal__h">${wd.map(w => `<span>${w}</span>`).join("")}</div><div class="tcal__g">${days.map(d => `<div class="tcd${d === today ? " tcd--now" : ""}${d < today ? " tcd--past" : ""}"><span class="tcd__n">${d.slice(8, 10) === "01" || d === days[0] ? tsDM(d) : +d.slice(8, 10)}</span>
    ${(by[d] || []).map(it => `<div class="tcc tcc--k-${it.k}"><button type="button" class="tcc__b" ${tsItBtn(it)} title="${esc(TS_K()[it.k] + " · " + it.sub)}">${esc(it.title.length > 34 ? it.title.slice(0, 33) + "…" : it.title)}<small>${TS_K()[it.k]}${it.i >= 0 && it.t ? " · " + L("крок ","шаг ") + (it.i + 1) + "/" + it.t.steps.length : ""}</small></button>${it.t ? `<button type="button" class="tcc__x" data-act="tsDelA" data-p="${it.p.id}" data-id="${it.t.id}" aria-label="${L("Прибрати задачу","Убрать задачу")}">${TS.arm === it.t.id ? "?" : ico("close")}</button>` : ""}</div>`).join("")}</div>`).join("")}</div>
    ${TS.arm ? `<p class="sub">${L("Натисни «?» ще раз — задачу буде прибрано.","Нажми «?» еще раз — задача будет убрана.")}</p>` : ""}</div>`; }
function tsPop(){ if (!TS.open) return ""; const p = W.projs.find(x => x.id === TS.open.p), t = p && (p.tasks || []).find(x => x.id === TS.open.id); if (!t) { TS.open = null; return ""; }
  const sn = {small:L("Невелике збільшення в межах навчених кампаній","Небольшое увеличение в рамках обученных кампаний"), steps:L("Плавне збільшення кроками","Плавное увеличение шагами"), dup:L("Збільшення + дубль найкращої кампанії","Увеличение + дубль лучшей кампании")}[t.strategy];
  return `<div class="tsm" role="dialog" aria-modal="true" aria-label="${esc(t.text)}"><button type="button" class="tsm__bg" data-act="tsClose" aria-label="${L("Закрити","Закрыть")}" tabindex="-1"></button><div class="tsm__in">
    <div class="row sp"><span class="tag">${L("Задача","Задача")}${sn ? " · " + esc(sn) : ""}</span><button type="button" class="btn btn--sm" data-act="tsClose">${ico("close")} ${L("Закрити","Закрыть")}</button></div>
    ${tsCard(p, t)}
    ${(t.why || []).length ? `<div class="tsw2"><b>${L("Що робитиме Хіро","Что будет делать Хиро")}</b><ul>${t.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}</div></div>`; }
/* закрыли окно только что поставленной задачи, не нажав «Почати», — задача не ставится (Дмитрий, 24.11.2026: «отменил, а в графике уже стоит») */
function tsDropFresh(){ const o = TS.open; if (!o || TS.fresh !== o.id) return; TS.fresh = ""; const p = W.projs.find(x => x.id === o.p), t = p && (p.tasks || []).find(x => x.id === o.id);
  if (p && t && t.status === "plan" && !t.steps.some(x => x.sched)) { p.tasks = p.tasks.filter(x => x !== t); save(); if (typeof toast === "function") toast(L("Задачу не поставлено","Задача не поставлена")); } }
document.addEventListener("keydown", e => { if (e.key === "Escape" && TS.open) { tsDropFresh(); TS.open = null; render(); } });
/* на «Сегодня»: охват выбирается из воронок и аккаунтов */
TS.sc = "";
/* Рекомендации: платформа сама находит кампании, которые можно масштабировать без потери качества, и спрашивает «да / нет».
   Условия: ≥10 лидов за 7 дней, лид не дороже 90% потолка воронки, за последние 3 дня цена лида не выросла больше чем на 10% и есть ≥3 лида.
   «Да» — задача из двух шагов (поднять на 15%, проверка через 3 дня); бюджет в Meta меняет рекламодатель. «Нет» — не предлагать 7 дней. */
const OF_KEY = "heyrow_offers";
const ofSeen = () => { try { const o = JSON.parse(localStorage.getItem(OF_KEY) || "{}"), now = Date.now(); Object.keys(o).forEach(k => { if (o[k] < now) delete o[k]; }); return o; } catch (e) { return {}; } };
TS.off = {}; TS.offBusy = {};
async function tsOffLoad(p){ if (TS.offBusy[p.id]) return; TS.offBusy[p.id] = true;
  try { await tsLrnLoad(p); const d2 = tsDay(prToday(), -1), [a, b, m30, m2, c30, c2] = await Promise.all([sb.rpc("ad_summary", {p:p.id, d1:tsDay(d2, -6), d2}), sb.rpc("ad_summary", {p:p.id, d1:tsDay(d2, -2), d2}),
      sb.rpc("ad_summary", {p:p.id, d1:tsDay(d2, -29), d2}), sb.rpc("ad_summary", {p:p.id, d1:tsDay(d2, -1), d2}), sb.rpc("ad_creatives", {p:p.id, d1:tsDay(d2, -29), d2}), sb.rpc("ad_creatives", {p:p.id, d1:tsDay(d2, -1), d2})]);
    if (a.error) throw new Error(a.error.message); const x = prOf(p), b3 = {}; (b.data || []).forEach(o => { b3[o.campaign_id] = o; });
    const busy = new Set((p.tasks || []).filter(t => t.status === "run" || t.status === "plan").map(t => t.scope.camp).filter(Boolean)), out = [];
    /* советуем только по кампаниям, точно привязанным к воронке (правило аккаунта, ручная привязка, сервер). «Единственная воронка проекта» — не повод:
       в общем аккаунте могут быть кампании других людей и других продуктов. */
    const am = {}; for (let i = 0; i < 20; i++) { const q = await sb.from("ad_metrics").select("campaign_id,account_id").eq("project_id", p.id).gte("day", tsDay(d2, -29)).lte("day", d2).range(i * 1000, i * 1000 + 999);
      if (q.error) break; (q.data || []).forEach(o => { if (o.account_id) am[o.campaign_id] = String(o.account_id); }); if ((q.data || []).length < 1000) break; }
    const work = ch => (prAccs(p, ch) || []).map(z => String(z.id)), accOf = o => am[o.campaign_id] || (work(tsCh(o.provider)).length === 1 && !Object.keys(am).length ? work(tsCh(o.provider))[0] : "");
    const sure = o => { const acc = accOf(o), ch = tsCh(o.provider); if (!acc || !work(ch).includes(acc)) return "";
      const r = {id:o.campaign_id, f:o.funnel_id || "", name:o.campaign_name, prov:ch, acc}; return typeof fxAuto === "function" && fxAuto(p, r) ? "" : fxFunnel(p, r); };
    (a.data || []).forEach(o => { const fid = sure(o), f = fid && p.funnels.find(z => z.id === fid); if (!f || busy.has(o.campaign_id)) return;
      const l7 = +o.leads || 0, s7 = +o.spend || 0, c7 = l7 ? s7 / l7 : 0, cap = fT(f, p).cap, r3 = b3[o.campaign_id] || {}, l3 = +r3.leads || 0, s3 = +r3.spend || 0, c3 = l3 ? s3 / l3 : 0;
      if (l7 < 10 || !c7 || !cap || c7 > cap * 0.9 || l3 < 3 || c3 > c7 * 1.1 || s3 <= 0) return;
      const lm = tsLrnOf(p, o.campaign_id); if (lm && (lm.status === "LEARNING" || tsHours(lm.edit) < 48)) return;
      const ch = tsCh(o.provider), acc = accOf(o);
      out.push({id:o.campaign_id, name:o.campaign_name, f:fid, fname:f.name, ch, acc, c7, c3, cap, day:s3 / 3, l7}); });
    /* эффективные, но не в работе: за 30 дней ≥10 лидов и лид ≤ 90% потолка, за последние 2 дня расхода нет */
    const idle = [], live2 = new Set((m2.data || []).filter(o => +o.spend > 0).map(o => o.campaign_id)), cf = {};
    (m30.data || []).forEach(o => { const fid = sure(o), f = fid && p.funnels.find(z => z.id === fid); cf[o.campaign_id] = f;
      if (!f || live2.has(o.campaign_id) || busy.has(o.campaign_id)) return; const l = +o.leads || 0, sp = +o.spend || 0, c = l ? sp / l : 0, cap = fT(f, p).cap;
      const w7 = (a.data || []).find(z => z.campaign_id === o.campaign_id), off7 = !w7 || !(+w7.spend > 0);
      if (l >= 10 && c && cap && c <= cap * 0.9) idle.push({off7, kind:"camp", id:o.campaign_id, name:o.campaign_name, f:fid, fname:f.name, ch:tsCh(o.provider), acc:accOf(o), cpl:c, cap, l30:l, day:sp / 30}); });
    const base = n => (typeof rsBase === "function" ? rsBase(n) : n) || n, cr = {}, cr2 = new Set((c2.data || []).filter(o => +o.spend > 0).map(o => base(o.ad_name)));
    (c30.data || []).forEach(o => { const f = cf[o.campaign_id]; if (!f || !o.ad_name) return; const k = base(o.ad_name), t = cr[k] = cr[k] || {name:k, spend:0, leads:0, f, orig:{}, camps:{}};
      t.spend += +o.spend || 0; t.leads += +o.leads || 0; t.orig[o.ad_name] = (t.orig[o.ad_name] || 0) + (+o.spend || 0);
      const cm = t.camps[o.campaign_id] = t.camps[o.campaign_id] || {id:o.campaign_id, name:o.campaign_name || o.campaign_id, spend:0, leads:0, live:live2.has(o.campaign_id), acc:accOf(o), ch:tsCh(o.provider)}; cm.spend += +o.spend || 0; cm.leads += +o.leads || 0; });
    Object.values(cr).forEach(t => { const c = t.leads ? t.spend / t.leads : 0, cap = fT(t.f, p).cap; if (!(t.leads >= 10 && c && cap && c <= cap * 0.9 && !cr2.has(t.name))) return;
      const full = Object.keys(t.orig).sort((a, b) => t.orig[b] - t.orig[a]), camps = Object.values(t.camps).sort((a, b) => b.leads - a.leads || b.spend - a.spend);
      idle.push({kind:"cr", id:"cr:" + t.name, name:full[0] || t.name, vers:full, camps, f:t.f.id, fname:t.f.name, cpl:c, cap, l30:t.leads}); });
    TS.off[p.id] = {at:Date.now(), list:out.sort((m, n) => (m.c7 / m.cap) - (n.c7 / n.cap)), idle:idle.sort((m, n) => (m.cpl / m.cap) - (n.cpl / n.cap))}; }
  catch (e) { TS.off[p.id] = {at:Date.now(), list:[], err:String(e.message || e)}; }
  TS.offBusy[p.id] = false; render(); }
/* A1: на «Сьогодні» предложения и счётчики — только по воронке и каналу из фильтра */
const tsOfOk = c => W.ctab !== "today" || typeof tfF !== "function" || (tfF({id:c.f}) && tfC(c.ch || (c.camps && c.camps[0] && c.camps[0].ch) || "meta"));
const tsOfOn = p => CLOUD && typeof sb !== "undefined" && sb && typeof prOn === "function" && prOn(p);
const tsOfGet = p => { const o = TS.off[p.id]; if ((!o || Date.now() - o.at > 30 * 60000) && !TS.offBusy[p.id]) setTimeout(() => tsOffLoad(p), 0); return o || {}; };
/* «Можна масштабувати» — предложения с «Так» в ленте Хиро (пакет B, 25.11.2026); здесь только список по проекту, карточка — plScaleRow в pilot.js */
function tsScaleOf(p){ if (!tsOfOn(p)) return []; const seen = ofSeen(); return (tsOfGet(p).list || []).filter(c => !seen[c.id] && tsOfOk(c)); }
function tsOffers(ps){ if (!CLOUD || typeof sb === "undefined" || !sb) return ""; const seen = ofSeen();
  const idle = []; ps.filter(tsOfOn).forEach(p => ((tsOfGet(p).idle) || []).filter(c => !seen[c.id] && tsOfOk(c)).forEach(c => idle.push([p, c])));
  TS.cnt = Object.assign(TS.cnt || {}, {idle:idle.length});
  const ib = idle.length ? `<div class="tso tso--idle"><span class="tag">${L("Ефективні, але не в роботі","Эффективные, но не в работе")} · ${idle.length}</span>${idle.slice(0, 3).map(([p, c]) => `<div class="tsoc"><div><b class="nm">${esc(c.name)}</b> <span class="sub">${c.kind === "cr" ? L("креатив · ","креатив · ") : ""}${esc((ps.length > 1 ? p.name + " · " : "") + c.fname)}</span></div>
      <div>${L("За 30 днів ","За 30 дней ")}${num(c.l30)}${L(" лідів за "," лидов по ")}${tsM(c.cpl)}${L(" за граничної ціни "," при потолке ")}${tsM(c.cap)}${L(", а останні 2 дні показів немає. ",", а последние 2 дня показов нет. ")}${c.kind === "cr" ? L("Запустити його знову окремою новою групою? (Нове оголошення в робочій групі скидає її навчання.)","Запустить его снова отдельной новой группой? (Новое объявление в рабочей группе сбрасывает ее обучение.)") : L("Увімкнути знову?","Включить снова?") + (c.off7 ? L(" Вона стояла 7+ днів — після увімкнення знову пройде навчання, перші дні лід дорожчий."," Она стояла 7+ дней — после включения снова пройдет обучение, первые дни лид дороже.") : "")}</div>
      ${c.kind === "cr" ? `<div class="sub tsow">${c.vers.length > 1 ? L("Версії: ","Версии: ") + c.vers.slice(0, 4).map(esc).join(", ") + "<br>" : ""}${L("Крутився в: ","Крутился в: ")}${c.camps.slice(0, 4).map(m => `<button type="button" class="lnk" data-act="prGo" data-k="${esc("co/" + p.id + "/" + c.f + "/" + m.ch + "/" + prAK(m.acc) + "/" + m.id)}">${esc(m.name)}</button> — ${tsM(m.spend)}, ${num(m.leads)}${L(" лідів"," лидов")}${m.acc ? " · " + esc(prAccName(p, m.acc, m.ch)) : ""} ${m.live ? pill("good", L("іде","идет")) : pill("mute", L("зупинена","остановлена"))}`).join("; ")}${c.camps.length > 4 ? L(" і ще "," и еще ") + (c.camps.length - 4) : ""}</div>` : ""}
      <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="ofIdle" data-p="${p.id}" data-id="${esc(c.id)}">${L("Так","Да")}</button><button type="button" class="btn btn--sm" data-act="ofNo" data-id="${esc(c.id)}">${L("Ні","Нет")}</button></div></div>`).join("")}</div>` : "";
  return ib; }
function tsToday(){ const ps = (typeof pfProjs === "function" ? pfProjs() : W.projs).filter(p => p.funnels.length); TS.cnt = {}; if (!ps.length) return "";
  const tf = t => typeof tfTask !== "function" || tfTask(t), today = prToday(), act = ps.flatMap(p => (p.tasks || []).filter(t => t.status === "run" && tf(t))); TS.cnt.run = act.length; TS.cnt.due = act.filter(t => { const n = t.steps.find(x => !x.done); return n && n.d <= today; }).length;
  const opts = []; ps.forEach(p => { p.funnels.forEach(f => { opts.push(["co/" + p.id + "/" + f.id, (ps.length > 1 ? p.name + " · " : "") + f.name]);
    (f.ch || []).forEach(c => prAccs(p, c).forEach(a => opts.push(["co/" + p.id + "/" + f.id + "/" + c + "/" + prAK(String(a.id)), (ps.length > 1 ? p.name + " · " : "") + f.name + " · " + (a.name || a.id)]))); }); });
  if (typeof tfS === "function" && tfS().f) { const keep = opts.filter(o => o[0].split("/")[2] === tfS().f); if (keep.length) opts.splice(0, opts.length, ...keep); }
  if (!opts.some(o => o[0] === TS.sc)) TS.sc = opts[0][0];
  const pick = `<div class="tsw"><span class="lbl">${L("Для чого","Для чего")}</span>${typeof ddSel === "function" ? ddSel("ts.sc", opts, TS.sc, L("Для чого","Для чего"), "tsScPick", "sc", false) : ""}</div>`; /* D1: свой выпадающий список */
  const has = ps.some(p => (p.tasks || []).some(t => t.status === "run" || t.status === "plan") || ((((typeof PL !== "undefined" && PL.st[p.id]) || {}).log) || []).some(x => x.status === "scheduled"));
  const sw = has ? `<span class="seg" role="group" aria-label="${L("Вигляд задач","Вид задач")}"><button type="button" data-act="tsView" data-v="cal" aria-pressed="${TS.view === "cal"}">${L("Календар","Календарь")}</button><button type="button" data-act="tsView" data-v="list" aria-pressed="${TS.view === "list"}">${L("Список","Список")}</button></span>` : "";
  const list = !has ? "" : TS.view === "cal" ? tsCal(ps) : tsAgenda(ps);
  const done = ps.reduce((a, p) => a + (p.tasks || []).filter(t => (t.status === "done" || t.status === "stop") && tf(t)).length, 0);
  return `<div class="panel tsk"><div class="row sp"><span class="tag">${L("Задачі для Хіро","Задачи для Хиро")}</span>${sw}${done ? `<small class="sub">${L("завершено: ","завершено: ")}${done}</small>` : ""}</div>${tsOffers(ps)}${tsBox("today", pick)}${list}${tsPop()}</div>`; }
function tsNode(k){ const s = tsScope(k); if (!s || !s.f) return ""; const p = W.projs.find(x => x.id === s.pid), mine = (p.tasks || []).filter(t => tsKey(t.scope) === tsKey(s) && t.status !== "done" && t.status !== "stop");
  return `<div class="panel tsk"><span class="tag">${L("Задача для Хіро","Задача для Хиро")} · ${esc(s.label)}</span>${tsBox(k)}${mine.map(t => tsCard(p, t)).join("")}</div>`; }
const tsK = k => k === "today" ? TS.sc : k;
const tsT = d => { const p = W.projs.find(x => x.id === d.p), t = p && (p.tasks || []).find(x => x.id === d.id); return [p, t]; };
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.tsk) TS.txt[t.dataset.tsk] = t.value; });
document.addEventListener("keydown", e => { const t = e.target; if (e.key === "Enter" && t.dataset && t.dataset.tsk) { e.preventDefault(); ACT.tsAdd({k:t.dataset.tsk}); } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.tssc) { TS.sc = t.value; render(); } });
Object.assign(ACT, {
  tsAdd(d){ const v = TS.txt[d.k] || ((document.getElementById("ts-" + d.k) || {}).value || ""); if (!v.trim()) { toast(L("Напиши або надиктуй задачу","Напиши или надиктуй задачу")); return false; } TS.busy[d.k] = true; render(); tsCreate(tsK(d.k), v).then(ok => { TS.busy[d.k] = false; if (ok) TS.txt[d.k] = ""; render(); }); return false; },
  tsEx(d){ TS.txt[d.k] = d.v; setTimeout(() => { const el = document.getElementById("ts-" + d.k); if (el) el.focus({preventScroll:true}); }, 0); },
  tsMic(d){ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return false;
    if (TS.mic) { try { TS.mic.stop(); } catch (e) { /* */ } TS.mic = null; return; }
    const r = new SR(); r.lang = lang === "uk" ? "uk-UA" : "ru-RU"; r.interimResults = false;
    r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(" ").trim(); if (t) TS.txt[d.k] = ((TS.txt[d.k] || "") + " " + t).trim(); };
    r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(L("Браузер не дав доступ до мікрофона","Браузер не дал доступ к микрофону")); };
    r.onend = () => { TS.mic = null; render(); }; TS.mic = r; TS.micK = d.k; try { r.start(); } catch (e) { TS.mic = null; } },
  async tsDupGo(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.i]; if (!x || x.sched || TS.dupBusy) return false;
    /* одно нажатие — одна копия: пока Хиро создаёт (до 2 мин), кнопки скрыты (Дмитрий, 24.11.2026: «создалось несколько групп») */
    TS.dupBusy = t.id + ":" + d.i; render();
    try {
    const geo = d.g === "world" ? "world" : "";
    /* список стран должен быть в облаке до того, как сервер создаст копию */
    if (geo && !(Array.isArray(p.dupGeo) && p.dupGeo.length)) p.dupGeo = TS_GEO_DEF.slice();
    if (geo && typeof cloudSync === "function") { save(); clearTimeout(CL.timer); try { await cloudSync(); } catch (e) {} }
    const r = await tdPropose({project_id:p.id, items:[{key:"task:dup:" + x.sid + ":" + prToday() + ":" + Date.now(), title:L("Дубль зв’язки","Дубль связки"), body:x.sn + "\n" + x.t, payload:{op:"dup", cid:x.cid, id:x.sid, budget:x.bud, geo, facts:[[L("Бюджет на день","Бюджет в день"), x.bud + " $", false]], gain:L("Більше лідів без збиття навчання поточних груп","Больше лидов без сбоя обучения текущих групп")}}]});
    const id = r && r.ids && r.ids[0]; if (!id) { toast(r && r.frozen ? r.frozen : L("Не вийшло: бюджет на рівні кампанії, немає підключення або такий дубль сьогодні вже є.","Не получилось: бюджет на уровне кампании, нет подключения или такой дубль сегодня уже есть.")); return false; }
    const z = typeof plCall === "function" ? await plCall({action:"decide", project_id:p.id, id, v:"y"}) : null; x.sched = id;
    if (t.status === "plan") { t.status = "run"; t.started = prToday(); } if (TS.fresh === t.id) TS.fresh = ""; save();
    if (typeof PL !== "undefined") { delete PL.st[p.id]; if (typeof plLoad === "function") plLoad(p); }
    toast(z && z.text ? z.text : L("Пропозицію створив — прийми її в стрічці Хіро","Предложение создал — прими его в ленте Хиро"));
    } finally { TS.dupBusy = ""; render(); } },
  tsDupGeo(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.i]; if (!x || x.sched) return false; x.geo = d.g === "world" ? "world" : ""; save(); },
  tsDupRe(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.i]; if (!x) return false; delete x.sched; save(); },
  /* «Оновити план»: та же фраза и охват — новый план по свежим цифрам, старый план убираем */
  tsRe(d){ const [p, t] = tsT(d); if (!t) return false; const s = t.scope || {}, k = ["co", s.pid, s.f || "", s.c || "", s.acc ? prAK(String(s.acc)) : "", s.camp || ""].join("/");
    TS.busy.re = t.id; render(); tsCreate(k, t.text).then(ok => { TS.busy.re = ""; if (ok) { p.tasks = p.tasks.filter(x => x !== t); save(); toast(L("План оновлено","План обновлен")); } render(); }); return false; },
  tsRun(d){ const [p, t] = tsT(d); if (!t) return false; if (TS.fresh === t.id) TS.fresh = ""; t.status = "run"; t.started = prToday(); const sh = Math.round((Date.parse(prToday()) - Date.parse(t.start)) / 864e5); if (sh > 0) t.steps.forEach(x => { x.d = tsDay(x.d, sh); }); save(); },
  /* шаг «підняти бюджет» и откат делает Хиро: предложения по каждой кампании (CBO) или группе → «Так» сразу (нажатие кнопки и есть согласие) → ночью pilot меняет бюджет */
  async tsBud(d){ const [p, t] = tsT(d); if (!t) return false; const i = +d.v, x = t.steps[i], back = d.back === "1"; if (!x || !x.bud || TS.budBusy) return false;
    TS.budBusy = t.id; render();
    try { const mult = back ? 1 / x.bud.k : x.bud.k, pct = Math.round((mult - 1) * 100);
      const items = x.bud.cids.slice(0, 8).map(cid => ({key:"task:bud:" + t.id + ":" + i + ":" + cid + (back ? ":b" + ((t.backs || 0) + 1) : ""), title:back ? L("Повернути бюджет (задача)","Вернуть бюджет (задача)") : L("Підняти бюджет (задача)","Поднять бюджет (задача)"),
        body:t.text + "\n" + (back ? L("Ціна ліда вища за межу — повертаю попередній бюджет (","Цена лида выше границы — возвращаю прежний бюджет (") : L("Крок задачі: бюджет ","Шаг задачи: бюджет ")) + (pct > 0 ? "+" : "") + pct + "%" + (back ? ")." : "."),
        payload:{op:"budget", src:"task", cid, mult, back, gain:back ? L("Повернути ціну ліда в межу","Вернуть цену лида в границу") : L("Більше лідів без зриву навчання","Больше лидов без срыва обучения")}}));
      const r = await tdPropose({project_id:p.id, items}), ids = (r && r.ids) || [];
      if (!ids.length) { toast(r && r.frozen ? r.frozen : L("Не вийшло: кампанії не працюють, бюджет не змінюється або цей крок уже в графіку.","Не получилось: кампании не работают, бюджет не меняется или этот шаг уже в графике.")); return false; }
      for (const id of ids) if (typeof plCall === "function") await plCall({action:"decide", project_id:p.id, id, v:"y"});
      if (back) { x.done = ""; x.sched = null; t.backs = (t.backs || 0) + 1; if (t.backs >= TS_BACKS) { t.status = "stop"; t.note = L("Зупинено: після ","Остановлено: после ") + TS_BACKS + L(" відкатів кампанії не тримають ціну ліда на більшому бюджеті — вони вперлися в стелю."," откатов кампании не держат цену лида на большем бюджете — они уперлись в потолок."); } } else { x.done = prToday(); x.sched = ids; }
      toast(back ? L("Хіро поверне бюджет уночі","Хиро вернет бюджет ночью") : L("Хіро змінить бюджет уночі","Хиро изменит бюджет ночью")); save();
      if (typeof PL !== "undefined") { delete PL.st[p.id]; if (typeof plLoad === "function") plLoad(p); }
    } finally { TS.budBusy = ""; render(); } return false; },
  tsDone(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.v]; if (!x) return false; x.done = prToday(); if (t.steps.every(y => y.done)) { t.status = "done"; toast(L("Задачу виконано","Задача выполнена")); } save(); },
  tsStop(d){ const [p, t] = tsT(d); if (!t) return false; t.status = "stop"; save(); },
  tsDel(d){ const [p, t] = tsT(d); if (!t) return false; p.tasks = p.tasks.filter(x => x !== t); save(); },
  ofYes(d){ const p = W.projs.find(x => x.id === d.p), c = p && ((TS.off[p.id] || {}).list || []).find(x => x.id === d.id); if (!c) return false;
    const k = "co/" + p.id + "/" + c.f + "/" + c.ch + (c.acc ? "/" + prAK(c.acc) : "/a_") + "/" + c.id, s = Object.assign(tsScope(k) || {}, {pid:p.id, f:c.f, c:c.ch, acc:c.acc, camp:c.id}), t0 = prToday();
    if (!s.label) s.label = c.fname + " · " + c.name;
    p.tasks = p.tasks || []; p.tasks.unshift({id:uid(), text:L("Підняти бюджет на 15%: ","Поднять бюджет на 15%: ") + c.name, type:"scale", o:{factor:1.15, guard:"num", cpl:c.c7 * 1.1}, scope:s, status:"run", at:new Date().toISOString(), started:t0, start:t0,
      guard:c.c7 * 1.1, target:c.day * 1.15, base:{day:c.day, cpl:c.c7, leads:c.l7}, note:"",
      steps:[{d:t0, t:L("Підніми бюджет кампанії ","Подними бюджет кампании ") + c.name + L(" на 15%: з $"," на 15%: с $") + dec(c.day, 0) + L(" до $"," до $") + dec(c.day * 1.15, 0) + L(" на день.","/день.")}, {d:tsDay(t0, 3), t:L("Перевірка: 3 дні на новому бюджеті, ціна ліда не вища за $","Проверка: 3 дня на новом бюджете, цена лида не выше $") + dec(c.c7 * 1.1) + ".", check:1}]});
    TS.off[p.id].list = TS.off[p.id].list.filter(x => x.id !== c.id); save(); toast(L("Задачу поставлено — бюджет зміни у кабінеті й відміть «Зроблено»","Задача поставлена — бюджет измени в кабинете и отметь «Сделано»")); },
  ofIdle(d){ const p = W.projs.find(x => x.id === d.p), c = p && (((TS.off[p.id] || {}).idle) || []).find(x => x.id === d.id); if (!c) return false; const t0 = prToday();
    const k = "co/" + p.id + "/" + c.f + (c.kind === "camp" ? "/" + c.ch + (c.acc ? "/" + prAK(c.acc) : "/a_") + "/" + c.id : ""), s = Object.assign(tsScope(k) || {}, {pid:p.id, f:c.f, c:c.ch || "", acc:c.acc || "", camp:c.kind === "camp" ? c.id : ""});
    if (!s.label) s.label = c.fname + " · " + c.name;
    const step = c.kind === "camp" ? L("Увімкни кампанію ","Включи кампанию ") + c.name + L(" знову (раніше витрачала ~$"," снова (раньше тратила ~$") + dec(c.day, 0) + L(" на день). Бюджет — на твоє рішення.","/день). Бюджет — на твое решение.") + (c.off7 ? L(" Стояла 7+ днів — Meta знову проведе навчання, перші 3–7 днів лід дорожчий."," Стояла 7+ дней — Meta снова проведет обучение, первые 3–7 дней лид дороже.") : "")
      : (() => { const live = (c.camps || []).find(m => m.live), best = (c.camps || [])[0];
          return L("Запусти креатив ","Запусти креатив ") + c.name + L(" новою групою"," новой группой") + (live ? L(" у кампанії "," в кампании ") + live.name + L(" (вона зараз іде) — не додавай його в робочу групу: нове оголошення скидає її навчання"," (она сейчас идет) — не добавляй его в рабочую группу: новое объявление сбрасывает ее обучение") : best ? L(". Кампанія, де він працював (",". Кампания, где он работал (") + best.name + L("), зупинена","), остановлена") : "") + L(". Запуск → «+ Група в кампанію».",". Запуск → «+ Группа в кампанию»."); })();
    p.tasks = p.tasks || []; p.tasks.unshift({id:uid(), text:(c.kind === "camp" ? L("Повернути в роботу: ","Вернуть в работу: ") : L("Повернути креатив: ","Вернуть креатив: ")) + c.name, type:"scale", o:{guard:"num", cpl:c.cpl * 1.1}, scope:s, status:"run", at:new Date().toISOString(), started:t0, start:t0,
      guard:c.cap, target:0, base:{day:0, cpl:c.cpl, leads:c.l30}, note:"", steps:[{d:t0, t:step, act:c.kind === "cr" ? "launch" : ""}, {d:tsDay(t0, 3), t:L("Перевірка: 3 дні, ціна ліда не вища за граничну ціну $","Проверка: 3 дня, цена лида не выше потолка $") + dec(c.cap) + ".", check:1}]});
    TS.off[p.id].idle = TS.off[p.id].idle.filter(x => x.id !== c.id); save(); toast(L("Задачу поставлено","Задача поставлена")); },
  ofNo(d){ const o = ofSeen(); o[d.id] = Date.now() + 7 * 864e5; try { localStorage.setItem(OF_KEY, JSON.stringify(o)); } catch (e) { /* */ } },
  tsMode(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps.find(y => y.dup); if (!x) return false; x.mode = d.v; x.t = d.v === "adset" ? x.tA : x.tC; save(); },
  tsView(d){ TS.view = d.v; try { localStorage.setItem("heyrow_ts_view", d.v); } catch (e) { /* */ } },
  tsOpen(d){ TS.open = {p:d.p, id:d.id}; TS.arm = ""; },
  tsClose(){ tsDropFresh(); TS.open = null; },
  tsDelA(d){ if (TS.arm !== d.id) { TS.arm = d.id; return; } TS.arm = ""; ACT.tsDel(d); },
  tsBack(d){ const [p, t] = tsT(d); if (!t) return false; const i = t.steps.findIndex(x => !x.done); if (i > 0) { t.steps[i - 1].done = ""; t.backs = (t.backs || 0) + 1; }
    if ((t.backs || 0) >= TS_BACKS) { t.status = "stop"; t.note = L("Зупинено: після ","Остановлено: после ") + TS_BACKS + L(" відкатів кампанії не тримають ціну ліда на більшому бюджеті — вони вперлися в стелю."," откатов кампании не держат цену лида на большем бюджете — они уперлись в потолок."); }
    save(); },
  tsGo(d){ W.cur = d.p; W.fun = d.f; W.ftab = "launch"; MP.sel = null; save(); },
});

/* бюджет дубля правится в карточке (Дмитрий, 24.11.2026): 10–500 $ */
document.addEventListener("change", e => { const el = e.target; if (!el.dataset || !el.dataset.tsdupbud) return; const [pid, id, i] = el.dataset.tsdupbud.split("|"), [p, t] = tsT({p:pid, id}); if (!t) return;
  const x = t.steps[+i]; if (!x || x.sched) return; const v = Math.round(Number(String(el.value).replace(",", ".")));
  if (!(v >= 10 && v <= 500)) { toast(L("Бюджет дубля — від 10 до 500 $ на день","Бюджет дубля — от 10 до 500 $ в день")); el.value = Math.round(x.bud); return; }
  x.bud = v; x.t = x.t.replace(/бюджет \d+ \$/, "бюджет " + v + " $"); save(); });

/* список стран для дубля — в проекте, правится в карточке */
document.addEventListener("change", e => { const el = e.target; if (!el.dataset || !el.dataset.tsdupgeo) return; const p = W.projs.find(x => x.id === el.dataset.tsdupgeo); if (!p) return;
  const cc = [...new Set(String(el.value).toUpperCase().split(/[^A-Z]+/).filter(c => /^[A-Z]{2}$/.test(c) && c !== "UA" && c !== "RU"))];
  if (!cc.length) { toast(L("Вкажи хоча б одну країну кодом: PL, US, DE…","Укажи хотя бы одну страну кодом: PL, US, DE…")); el.value = tsGeo(p).join(", "); return; }
  p.dupGeo = cc; save(); el.value = cc.join(", "); });

Object.assign(ACT, { tsScPick(d){ if (typeof TFD !== "undefined") TFD.open = ""; TS.sc = d.v; } });
