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
      if (s.acc && x.am && prAccOf(x, o.campaign_id, tsCh(o.provider)) !== s.acc) return false; return true; })
    .map(o => ({id:o.campaign_id, name:o.campaign_name, spend:+o.spend || 0, leads:+o.leads || 0, day:(+o.spend || 0) / days, cpl:+o.leads ? (+o.spend) / (+o.leads) : 0})).filter(o => o.spend > 0); }
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
  const win = rows.filter(r => r.leads >= 5 && r.cpl && r.cpl <= guard), lose = rows.filter(r => r.spend >= Math.max(cap, 5) * 2 && (!r.leads || r.cpl > Math.max(guard, cap) * 1.3));
  if (o.type === "scale" || o.type === "leads") {
    let target = o.dayTo || tot.day * (o.factor || 1.5);
    if (o.type === "leads") { const days = Math.max(1, o.days || 7), cpl = tot.cpl || cap; target = Math.max(tot.day, o.leads / days * cpl, o.dayTo || 0); out.leadsNeed = o.leads; out.days = days; if (o.date) out.date = o.date;
      if (o.leads / days * cpl > tot.day * 3) out.note = L("Щоб встигнути, бюджет треба підняти більш ніж утричі — ціна ліда, найімовірніше, зросте. Реальніше — подовжити строк.","Чтобы успеть, бюджет нужно поднять больше чем втрое — цена лида, скорее всего, вырастет. Реалистичнее — продлить срок."); }
    out.target = target; const grow = tot.day ? target / tot.day : 1, why = out.why = [];
    if (cap && tot.cpl && tot.cpl > cap) out.warn = L("Зараз лід за " + tsM(tot.cpl) + " при цілі " + tsM(cap) + ": реклама не окупається першою оплатою. Якщо розганяти бюджет за такої ціни, збиток зросте разом із ним. Спершу знизь ціну ліда або перевір стелю в «Звідки гроші з одного ліда».","Сейчас лид по " + tsM(tot.cpl) + " при цели " + tsM(cap) + ": реклама не окупается первой оплатой. Если разгонять бюджет при такой цене, убыток вырастет вместе с ним. Сначала снизь цену лида или проверь потолок в «Откуда деньги с одного лида».");
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
      const sets = (ex.sets || []).filter(x => x.sid && inScope.has(x.cid) && x.leads >= 3).map(x => Object.assign({}, x, {cpl:x.spend / x.leads})).filter(x => x.cpl <= mx).sort((a, b) => a.cpl - b.cpl), best = sets[0];
      if (best) { const crs = (ex.crs || []).filter(c => c.cid === best.cid && c.leads >= 2).sort((a, b) => a.spend / a.leads - b.spend / b.leads).slice(0, 3).map(c => c.name);
        const bud = Math.round(Math.min(500, Math.max(10, target - tot.day)));
        out.note = (out.note ? out.note + " " : "") + L("Групи ще вчаться — піднімати їм бюджет не буду, це зіб’є навчання. Більше лідів беру дублем найкращої зв’язки окремою групою: навчання поточних груп не чіпаю.","Группы еще учатся — поднимать им бюджет не буду, это собьет обучение. Больше лидов беру дублем лучшей связки отдельной группой: обучение текущих групп не трогаю.");
        if (lose.length) st.push({d:start, t:L("Вимкни те, що тягне ціну вгору: ","Выключи то, что тянет цену вверх: ") + nm(lose) + "."});
        st.push({d:start, t:L("Дубль найкращої зв’язки: група «","Дубль лучшей связки: группа «") + best.name + L("» (ліди за ","» (лиды по ") + tsM(best.cpl) + L(" за 7 днів)"," за 7 дней)") + (crs.length ? L(", креативи: ",", креативы: ") + crs.join(", ") : "") + L("; бюджет ","; бюджет ") + bud + L(" $ на день. Створю вимкненою зі стартом о 00:40 — перевіриш в Ads Manager."," $ в день. Создам выключенной со стартом в 00:40 — проверишь в Ads Manager."), act:"dupnight", sid:best.sid, cid:best.cid, bud, sn:best.name});
        why.push(L("Найкраща зв’язка за 7 днів — група «","Лучшая связка за 7 дней — группа «") + best.name + L("»: ліди за ","»: лиды по ") + tsM(best.cpl) + L(". Дубль бере ті самі налаштування й до 3 оголошень з лідами за 14 днів, власний бюджет — і вчиться окремо, не збиваючи поточні групи.",". Дубль берет те же настройки и до 3 объявлений с лидами за 14 дней, свой бюджет — и учится отдельно, не сбивая текущие группы."));
        why.push(L("Нова група перші 3–5 днів у навчанні: ціна ліда може бути вищою. Якщо за 3 дні лід дорожчий за ","Новая группа первые 3–5 дней в обучении: цена лида может быть выше. Если за 3 дня лид дороже ") + tsM(guard) + L(" — вимкнемо дубль."," — выключим дубль."));
        st.push({d:tsDay(start, 4), t:L("Перевірка: 3 дні дубля. Ціна ліда не вища за ","Проверка: 3 дня дубля. Цена лида не выше ") + tsM(guard) + L(" — залишаємо й далі масштабуємо дублями."," — оставляем и дальше масштабируем дублями."), check:1});
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
      st.push({d:tsDay(start, i * TS_GAP), t:L("Підніми бюджет: ","Подними бюджет: ") + nm(learned) + L(" — разом з $"," — вместе с $") + dec(cur, 0) + L(" до $"," до $") + dec(nx, 0) + L(" на день (+","/день (+") + Math.round((nx / cur - 1) * 100) + "%)" + (learned.length < rows.length ? L("; усього по охопленню $","; всего по охвату $") + dec(tot.day + nx - lDay, 0) + L(" на день","/день") : "") + "."});
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
      why.push(L("Збирається з найкращих груп і креативів кампанії ","Собирается из лучших групп и креативов кампании ") + best.name + L(" за 7 днів, вимкненим; вмикаєш ти. Нове проходить навчання 3–7 днів — ціна ліда в перші дні вища."," за 7 дней, выключенным; включаешь ты. Новое проходит обучение 3–7 дней — цена лида в первые дни выше."));
      i++; }
    why.push(L("Наступний крок відкривається за результатом: минуло ","Следующий шаг открывается по результату: прошло ") + TS_GAP + L(" дні після попереднього, прийшло ≥"," дня после предыдущего, пришло ≥") + TS_MINL + L(" лідів і ціна ліда ≤ $"," лидов и цена лида ≤ $") + dec(guard) + ".");
    why.push(L("Якщо ціна ліда вища за $","Если цена лида выше $") + dec(guard) + L(" — поверни попередній бюджет; після "," — верни прежний бюджет; после ") + TS_BACKS + L(" відкатів задача зупиняється з висновком."," откатов задача останавливается с выводом."));
    why.push(L("Бюджети змінюєш ти: Хіро підказує й стежить.","Бюджеты меняешь ты: Хиро подсказывает и следит."));
    st.push({d:tsDay(start, i * TS_GAP + 3), t:L("Перевірка: 3 дні на новому бюджеті. Якщо ціна ліда в межах — задачу виконано.","Проверка: 3 дня на новом бюджете. Если цена лида в пределах — задача выполнена."), check:1});
  } else if (o.type === "cut") {
    const tg = o.cpl || tot.cpl * 0.8; out.guard = tg; out.target = tg;
    const bad = rows.filter(r => r.spend >= tg * 2 && (!r.leads || r.cpl > tg * 1.3)), good = rows.filter(r => r.leads >= 3 && r.cpl <= tg);
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
  try { await tsLrnLoad(p); const d2 = tsDay(prToday(), -1), rows = await tsRows(p, s, tsDay(d2, -6), d2);
    const [gs, cs] = await Promise.all([sb.rpc("ad_adsets", {p:p.id, d1:tsDay(d2, -6), d2}), sb.rpc("ad_creatives", {p:p.id, d1:tsDay(d2, -6), d2})]);
    const ext = {sets:(gs.data || []).map(x => ({cid:x.campaign_id, sid:String(x.adset_id || ""), name:x.adset_name || x.adset_id, spend:+x.spend || 0, leads:+x.leads || 0})), crs:(cs.data || []).map(x => ({cid:x.campaign_id, name:x.ad_name, spend:+x.spend || 0, leads:+x.leads || 0}))};
    const pl = tsPlan(p, s, o, rows, ext); delete pl.ext;
    const nt = Object.assign({id:uid(), text:String(text).trim(), type:o.type, o, scope:s, status:"plan", at:new Date().toISOString()}, pl);
    p.tasks = p.tasks || []; p.tasks.unshift(nt); TS.open = {p:p.id, id:nt.id}; save(); ok = true; }
  catch (e) { toast(String(e.message || e)); }
  return ok; }

/* состояние очередного шага: ждём (дни / лиды), можно, или откатить. Первый шаг — сразу (до 12:00 по Киеву — сегодня, позже — завтра утром). */
function tsGate(t){ const i = t.steps.findIndex(x => !x.done); if (i < 0 || t.status !== "run") return null; const x = t.steps[i], prev = i ? t.steps[i - 1] : null, g = TS.prog[t.id], today = prToday();
  if (x.wait) return {st:"wait", why:L("Чекаємо, поки кампанії пройдуть навчання.","Ждем, пока кампании пройдут обучение.")};
  if (!prev || !prev.done) { const h = +new Date().toLocaleString("en-GB", {timeZone:"Europe/Kyiv", hour:"2-digit", hour12:false}).slice(0, 2);
    return x.d > today ? {st:"wait", why:L("Крок на ","Шаг на ") + tsDM(x.d)} : !prev && h >= 12 && x.d === today && !x.check ? {st:"go", why:L("Бюджет краще змінити зранку — до 12:00 за Києвом; можна завтра зранку.","Бюджет лучше менять утром — до 12:00 по Киеву; можно завтра утром.")} : {st:"go", why:""}; }
  const days = Math.round((Date.parse(today) - Date.parse(prev.done)) / 864e5);
  if (g && g.cpl && g.cpl > t.guard && days >= TS_GAP) return {st:"back", why:L("Ціна ліда $","Цена лида $") + dec(g.cpl) + L(" вища за межу $"," выше границы $") + dec(t.guard) + L(" — поверни попередній бюджет."," — верни прежний бюджет.")};
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
  return L("Зрозумів так: ","Понял так: ") + parts.join(", ") + ". " + (t.base && t.base.day ? L("Зараз: ","Сейчас: ") + dec(t.base.day, 0) + L(" $ на день, лід за "," $ в день, лид по ") + (t.base.cpl ? m(t.base.cpl) : "—") + "." : ""); }
function tsCard(p, t){ const g = TS.prog[t.id], today = prToday(), next = t.steps.find(x => !x.done), late = next && next.d <= today;
  if (t.status === "run" && (!g || Date.now() - g.at > 30 * 60000) && !TS.pbusy[t.id] && CLOUD) setTimeout(() => tsProg(p, t), 0);
  const o = t.o, und = [tsTypeName(t.type), o.factor && t.type === "scale" ? "×" + dec(o.factor, 1) : "", t.target && t.type !== "cut" && !o.budget ? L("до ","до ") + dec(t.target, 0) + L(" $ на день"," $ в день") : "", t.type === "leads" ? num(o.leads) + L(" лідів"," лидов") + (o.date ? (o.oneDay ? L(" за "," за ") : L(" до "," до ")) + tsDM(o.date) : L(" за "," за ") + (t.days || 7) + L(" дн."," дн.")) : "", o.budget ? L("бюджет ","бюджет ") + (o.min ? L("від ","от ") : "") + tsM(o.budget) + (o.oneDay || !o.days ? "" : L(" (≈"," (≈") + tsM(o.dayTo) + L(" на день)"," в день)")) : "", t.guard ? L("ціна ліда ≤ ","цена лида ≤ ") + tsM(t.guard) + (o.implied ? " (" + tsM(o.budget) + " / " + num(o.leads) + ")" : "") : ""].filter(Boolean).join(" · ");
  const pg = g && !g.err && g.day ? (() => { const ok = !g.cpl || g.cpl <= t.guard * 1.0001, lv = ok ? "good" : "crit";
    return `<p class="tsp tsp--${lv}">${L("Зараз (3 дні): $","Сейчас (3 дня): $")}${dec(g.day, 0)}${L("/день, ліди за $","/день, лиды по $")}${g.cpl ? dec(g.cpl) : "—"}${t.target && t.type !== "cut" ? L(" · ціль $"," · цель $") + dec(t.target, 0) + L("/день","/день") : ""}${ok ? "" : L(" — ціна вища за межу: поверни попередній бюджет і зачекай 2 дні."," — цена выше границы: верни прежний бюджет и подожди 2 дня.")}</p>`; })() : g && g.err ? `<p class="sub">${esc(g.err)}</p>` : "";
  return `<div class="tsc tsc--${t.status}"><div class="row sp"><div><b>${esc(t.text)}</b><div class="sub">${esc(t.scope.label)} · ${L("поставлено ","поставлено ")}${tsDM(t.at.slice(0, 10))}</div></div>
      <span class="row">${t.status === "plan" ? `<button type="button" class="btn btn--sm btn--solid" data-act="tsRun" data-p="${p.id}" data-id="${t.id}">${L("Почати","Начать")}</button>` : t.status === "run" ? pill("good", L("іде","идет")) : pill("mute", t.status === "done" ? L("виконано","выполнено") : L("зупинено","остановлено"))}
        <button type="button" class="lnk" data-act="tsDel" data-p="${p.id}" data-id="${t.id}" aria-label="${L("Прибрати задачу","Убрать задачу")}">${ico("close")}</button></span></div>
    <p class="tsu">${esc(tsUnd(t))}</p>
    ${(w => w ? `<p class="tsw-cap">${ico("warning")} ${esc(w)}</p>` : "")(tsWarn(p, t))}${t.note ? `<p class="tsn">${esc(t.note)}</p>` : ""}${pg}
    ${t.steps.length ? `<ol class="tss">${t.steps.map((x, i) => `<li class="${x.done ? "ok" : x === next && t.status === "run" ? (late ? "now" : "next") : ""}"><span class="mono">${tsDM(x.d)}</span> <span>${esc(x.t)}</span>${x.act === "dupnight" && !x.done ? (x.sched ? ` <span class="pill pill--good">${L("у графіку на ніч","в графике на ночь")}</span>` : ` <button type="button" class="btn btn--sm btn--main" data-act="tsDupGo" data-p="${p.id}" data-id="${t.id}" data-i="${i}">${L("Запланувати на ніч","Запланировать на ночь")}</button>`) : ""}${x.dup && x.tA && !x.done ? ` <span class="seg seg--xs" role="group" aria-label="${L("Як збільшувати","Как увеличивать")}"><button type="button" data-act="tsMode" data-p="${p.id}" data-id="${t.id}" data-v="adset" aria-pressed="${x.mode === "adset"}">${L("Нова група","Новая группа")}${x.rec === "adset" ? L(" · раджу"," · советую") : ""}</button><button type="button" data-act="tsMode" data-p="${p.id}" data-id="${t.id}" data-v="camp" aria-pressed="${x.mode === "camp"}">${L("Дубль кампанії","Дубль кампании")}${x.rec === "camp" ? L(" · раджу"," · советую") : ""}</button></span>` : ""}${t.status === "run" && x === next ? (() => { const gt = tsGate(t); return gt && gt.st !== "go" ? ` <small class="tsg tsg--${gt.st}">${esc(gt.why)}</small>${gt.st === "back" ? ` <button type="button" class="btn btn--sm" data-act="tsBack" data-p="${p.id}" data-id="${t.id}">${L("Повернув","Вернул")}</button>` : ""}` : (gt && gt.why ? ` <small class="tsg">${esc(gt.why)}</small>` : "") + ` <span class="row">${x.act === "launch" && t.scope.f ? (x.dup && x.mode === "adset" ? `<button type="button" class="btn btn--sm" data-act="bdTarget" data-mode="adset" data-p="${p.id}" data-f="${t.scope.f}" data-cid="${esc(x.cid || "")}" data-cn="${esc(x.cn || "")}">${L("Зібрати групу","Собрать группу")}</button>` : `<button type="button" class="btn btn--sm" data-act="tsGo" data-p="${p.id}" data-f="${t.scope.f}">${x.dup ? L("Зібрати дубль","Собрать дубль") : L("Відкрити запуск","Открыть запуск")}</button>`) : ""}<button type="button" class="btn btn--sm${late ? " btn--solid" : ""}" data-act="tsDone" data-p="${p.id}" data-id="${t.id}" data-v="${i}">${x.check ? L("Результат є","Результат есть") : L("Зроблено","Сделано")}</button></span>`; })() : ""}</li>`).join("")}</ol>` : ""}
    ${t.status === "run" ? `<div class="row"><button type="button" class="lnk" data-act="tsStop" data-p="${p.id}" data-id="${t.id}">${L("Зупинити задачу","Остановить задачу")}</button></div>` : ""}</div>`; }

const TS_EX = () => [L("Збільшити рекламу вдвічі з тією ж ціною ліда","Увеличить рекламу вдвое с той же ценой лида"), L("Розігнати до 300 $ на день, лід не дорожче 6 $","Разогнать до 300 $ в день, лид не дороже 6 $"), L("Знизити ціну ліда до 5 $","Снизить цену лида до 5 $"), L("100 лідів за тиждень","100 лидов за неделю"), L("Вимкнути те, що не працює","Выключить то, что не работает")];
/* поле задачи: на «Сегодня» с выбором охвата, в окне карточки — для этой карточки */
function tsBox(k, pick){ const busy = TS.busy[k], mic = (window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="btn btn--ico${TS.mic && TS.micK === k ? " btn--solid" : ""}" data-act="tsMic" data-k="${esc(k)}" aria-label="${L("Надиктувати","Надиктовать")}" title="${L("Надиктувати","Надиктовать")}"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="7.5" y="2.5" width="5" height="9" rx="2.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/></svg></button>` : "";
  return `<div class="tsb">${pick || ""}<div class="row tsi"><input id="ts-${esc(k)}" data-tsk="${esc(k)}" value="${esc(TS.txt[k] || "")}" placeholder="${L("Що зробити? Напр.: збільшити рекламу вдвічі з тією ж ціною ліда","Что сделать? Напр.: увеличить рекламу вдвое с той же ценой лида")}" aria-label="${L("Задача","Задача")}"${busy ? " disabled" : ""}>${mic}<button type="button" class="btn btn--sm btn--solid" data-act="tsAdd" data-k="${esc(k)}"${busy ? " disabled" : ""}>${busy ? L("Рахуємо…","Считаем…") : L("Поставити","Поставить")}</button></div>
    <div class="opts opts--sm">${TS_EX().map(x => `<button type="button" class="opt" data-act="tsEx" data-k="${esc(k)}" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`; }
/* календарь: 4 недели с понедельника текущей; в дне — шаги задач. Нажали — окно задачи по центру; «×» — убрать задачу. */
TS.view = (() => { try { return localStorage.getItem("heyrow_ts_view") || "cal"; } catch (e) { return "cal"; } })(); TS.open = null; TS.arm = "";
function tsCal(ps){ const today = prToday(), d0 = new Date(today + "T12:00:00"), mon = tsDay(today, -((d0.getDay() + 6) % 7)), days = [...Array(28)].map((_, i) => tsDay(mon, i)), by = {};
  ps.forEach(p => (p.tasks || []).filter(t => t.status === "run" || t.status === "plan").forEach(t => t.steps.forEach((x, i) => { (by[x.d] = by[x.d] || []).push({p, t, x, i}); })));
  const hiro = {}; ps.forEach(p => (((typeof PL !== "undefined" && PL.st[p.id]) || {}).log || []).filter(x => x.kind === "reco" && x.status === "scheduled" && x.exec_on).forEach(x => { (hiro[x.exec_on] = hiro[x.exec_on] || []).push({p, x}); }));
  const wd = [L("Пн","Пн"), L("Вт","Вт"), L("Ср","Ср"), L("Чт","Чт"), L("Пт","Пт"), L("Сб","Сб"), L("Нд","Вс")];
  return `<div class="tcal"><div class="tcal__h">${wd.map(w => `<span>${w}</span>`).join("")}</div><div class="tcal__g">${days.map(d => `<div class="tcd${d === today ? " tcd--now" : ""}${d < today ? " tcd--past" : ""}"><span class="tcd__n">${d.slice(8, 10) === "01" || d === days[0] ? tsDM(d) : +d.slice(8, 10)}</span>
    ${(by[d] || []).map(({p, t, x, i}) => { const nx = t.steps.find(y => !y.done), lv = x.done ? "ok" : t.status === "plan" ? "plan" : x === nx ? ((tsGate(t) || {}).st || "go") : "later";
      return `<div class="tcc tcc--${lv}"><button type="button" class="tcc__b" data-act="tsOpen" data-p="${p.id}" data-id="${t.id}" title="${esc(x.t)}">${x.check ? ico("done") + " " : x.dup ? ico("duplicate") + " " : ""}${esc(t.text.length > 34 ? t.text.slice(0, 33) + "…" : t.text)}<small>${L("крок ","шаг ")}${i + 1}/${t.steps.length}</small></button><button type="button" class="tcc__x" data-act="tsDelA" data-p="${p.id}" data-id="${t.id}" aria-label="${L("Прибрати задачу","Убрать задачу")}">${TS.arm === t.id ? "?" : ico("close")}</button></div>`; }).join("")}${(hiro[d] || []).map(({p, x}) => `<div class="tcc tcc--hiro"><button type="button" class="tcc__b" data-act="plWhy" data-p="${p.id}" data-id="${x.id}" title="${esc(x.title)}">${ico("clock")} ${esc(typeof plTitle === "function" ? plTitle((x.payload || {}).op, x.payload || {}, (x.payload || {}).level) || x.title : x.title)}<small>${esc(((x.payload || {}).name || "").slice(0, 40))}</small></button><button type="button" class="tcc__x" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="c" aria-label="${L("Прибрати з графіка","Убрать из графика")}">${ico("close")}</button></div>`).join("")}</div>`).join("")}</div>
    ${TS.arm ? `<p class="sub">${L("Натисни «?» ще раз — задачу буде прибрано.","Нажми «?» еще раз — задача будет убрана.")}</p>` : ""}</div>`; }
function tsPop(){ if (!TS.open) return ""; const p = W.projs.find(x => x.id === TS.open.p), t = p && (p.tasks || []).find(x => x.id === TS.open.id); if (!t) { TS.open = null; return ""; }
  const sn = {small:L("Невелике збільшення в межах навчених кампаній","Небольшое увеличение в рамках обученных кампаний"), steps:L("Плавне збільшення кроками","Плавное увеличение шагами"), dup:L("Збільшення + дубль найкращої кампанії","Увеличение + дубль лучшей кампании")}[t.strategy];
  return `<div class="tsm" role="dialog" aria-modal="true" aria-label="${esc(t.text)}"><button type="button" class="tsm__bg" data-act="tsClose" aria-label="${L("Закрити","Закрыть")}" tabindex="-1"></button><div class="tsm__in">
    <div class="row sp"><span class="tag">${L("Задача","Задача")}${sn ? " · " + esc(sn) : ""}</span><button type="button" class="btn btn--sm" data-act="tsClose">${ico("close")} ${L("Закрити","Закрыть")}</button></div>
    ${tsCard(p, t)}
    ${(t.why || []).length ? `<div class="tsw2"><b>${L("Що робитиме Хіро","Что будет делать Хиро")}</b><ul>${t.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}</div></div>`; }
document.addEventListener("keydown", e => { if (e.key === "Escape" && TS.open) { TS.open = null; render(); } });
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
function tsOffers(ps){ if (!CLOUD || typeof sb === "undefined" || !sb) return ""; const seen = ofSeen(), all = [];
  ps.filter(p => typeof prOn === "function" && prOn(p)).forEach(p => { const o = TS.off[p.id]; if ((!o || Date.now() - o.at > 30 * 60000) && !TS.offBusy[p.id]) setTimeout(() => tsOffLoad(p), 0); ((o || {}).list || []).filter(c => !seen[c.id]).forEach(c => all.push([p, c])); });
  const idle = []; ps.filter(p => typeof prOn === "function" && prOn(p)).forEach(p => (((TS.off[p.id] || {}).idle) || []).filter(c => !seen[c.id]).forEach(c => idle.push([p, c])));
  TS.cnt = Object.assign(TS.cnt || {}, {off:all.length, idle:idle.length});
  const ib = idle.length ? `<div class="tso tso--idle"><span class="tag">${L("Ефективні, але не в роботі","Эффективные, но не в работе")} · ${idle.length}</span>${idle.slice(0, 3).map(([p, c]) => `<div class="tsoc"><div><b class="nm">${esc(c.name)}</b> <span class="sub">${c.kind === "cr" ? L("креатив · ","креатив · ") : ""}${esc((ps.length > 1 ? p.name + " · " : "") + c.fname)}</span></div>
      <div>${L("За 30 днів ","За 30 дней ")}${num(c.l30)}${L(" лідів за $"," лидов по $")}${dec(c.cpl)}${L(" за граничної ціни $"," при потолке $")}${dec(c.cap)}${L(", а останні 2 дні показів немає. ",", а последние 2 дня показов нет. ")}${c.kind === "cr" ? L("Запустити його знову окремою новою групою? (Нове оголошення в робочій групі скидає її навчання.)","Запустить его снова отдельной новой группой? (Новое объявление в рабочей группе сбрасывает ее обучение.)") : L("Увімкнути знову?","Включить снова?") + (c.off7 ? L(" Вона стояла 7+ днів — після увімкнення знову пройде навчання, перші дні лід дорожчий."," Она стояла 7+ дней — после включения снова пройдет обучение, первые дни лид дороже.") : "")}</div>
      ${c.kind === "cr" ? `<div class="sub tsow">${c.vers.length > 1 ? L("Версії: ","Версии: ") + c.vers.slice(0, 4).map(esc).join(", ") + "<br>" : ""}${L("Крутився в: ","Крутился в: ")}${c.camps.slice(0, 4).map(m => `<button type="button" class="lnk" data-act="prGo" data-k="${esc("co/" + p.id + "/" + c.f + "/" + m.ch + "/" + prAK(m.acc) + "/" + m.id)}">${esc(m.name)}</button> — ${num(m.spend)} $, ${num(m.leads)}${L(" лідів"," лидов")}${m.acc ? " · " + esc(prAccName(p, m.acc, m.ch)) : ""} ${m.live ? pill("good", L("іде","идет")) : pill("mute", L("зупинена","остановлена"))}`).join("; ")}${c.camps.length > 4 ? L(" і ще "," и еще ") + (c.camps.length - 4) : ""}</div>` : ""}
      <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="ofIdle" data-p="${p.id}" data-id="${esc(c.id)}">${L("Так","Да")}</button><button type="button" class="btn btn--sm" data-act="ofNo" data-id="${esc(c.id)}">${L("Ні","Нет")}</button></div></div>`).join("")}</div>` : "";
  if (!all.length) return ib;
  return ib + `<div class="tso"><span class="tag">${L("Можна масштабувати","Можно масштабировать")} · ${all.length}</span>${all.slice(0, 3).map(([p, c]) => `<div class="tsoc"><div><b class="nm">${esc(c.name)}</b> <span class="sub">${esc((ps.length > 1 ? p.name + " · " : "") + c.fname)}</span></div>
      <div>${L("Ефективна: лід $","Эффективна: лид $")}${dec(c.c7)}${L(" за 7 днів за граничної ціни $"," за 7 дней при потолке $")}${dec(c.cap)}${L(", останні 3 дні стабільно ($",", последние 3 дня стабильно ($")}${dec(c.c3)}). ${L("Рекомендую підняти бюджет на 15% — з $","Рекомендую поднять бюджет на 15% — с $")}${dec(c.day, 0)}${L(" до $"," до $")}${dec(c.day * 1.15, 0)}${L(" на день; показники не мають просісти. Бажаєш?","/день; показатели не должны просесть. Желаешь?")}</div>
      <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="ofYes" data-p="${p.id}" data-id="${esc(c.id)}">${L("Так","Да")}</button><button type="button" class="btn btn--sm" data-act="ofNo" data-id="${esc(c.id)}">${L("Ні","Нет")}</button></div></div>`).join("")}</div>`; }
function tsToday(){ const ps = (typeof pfProjs === "function" ? pfProjs() : W.projs).filter(p => p.funnels.length); TS.cnt = {}; if (!ps.length) return "";
  const today = prToday(), act = ps.flatMap(p => (p.tasks || []).filter(t => t.status === "run")); TS.cnt.run = act.length; TS.cnt.due = act.filter(t => { const n = t.steps.find(x => !x.done); return n && n.d <= today; }).length;
  const opts = []; ps.forEach(p => { p.funnels.forEach(f => { opts.push(["co/" + p.id + "/" + f.id, (ps.length > 1 ? p.name + " · " : "") + f.name]);
    (f.ch || []).forEach(c => prAccs(p, c).forEach(a => opts.push(["co/" + p.id + "/" + f.id + "/" + c + "/" + prAK(String(a.id)), (ps.length > 1 ? p.name + " · " : "") + f.name + " · " + (a.name || a.id)]))); }); });
  if (!opts.some(o => o[0] === TS.sc)) TS.sc = opts[0][0];
  const pick = `<label class="tsw"><span class="lbl">${L("Для чого","Для чего")}</span><select data-tssc="1">${opts.map(o => `<option value="${esc(o[0])}"${o[0] === TS.sc ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select></label>`;
  const has = ps.some(p => (p.tasks || []).some(t => t.status === "run" || t.status === "plan") || ((((typeof PL !== "undefined" && PL.st[p.id]) || {}).log) || []).some(x => x.status === "scheduled"));
  const sw = has ? `<span class="seg" role="group" aria-label="${L("Вигляд задач","Вид задач")}"><button type="button" data-act="tsView" data-v="cal" aria-pressed="${TS.view === "cal"}">${L("Календар","Календарь")}</button><button type="button" data-act="tsView" data-v="list" aria-pressed="${TS.view === "list"}">${L("Список","Список")}</button></span>` : "";
  const list = !has ? "" : TS.view === "cal" ? tsCal(ps) : ps.flatMap(p => (p.tasks || []).filter(t => t.status === "run" || t.status === "plan").map(t => tsCard(p, t))).join("");
  const done = ps.reduce((a, p) => a + (p.tasks || []).filter(t => t.status === "done" || t.status === "stop").length, 0);
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
  async tsDupGo(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.i]; if (!x || x.sched) return false;
    const r = await tdPropose({project_id:p.id, items:[{key:"task:dup:" + x.sid + ":" + prToday(), title:L("Дубль зв’язки","Дубль связки"), body:x.sn + "\n" + x.t, payload:{op:"dup", cid:x.cid, id:x.sid, budget:x.bud, facts:[[L("Бюджет на день","Бюджет в день"), x.bud + " $", false]], gain:L("Більше лідів без збиття навчання поточних груп","Больше лидов без сбоя обучения текущих групп")}}]});
    const id = r && r.ids && r.ids[0]; if (!id) { toast(r && r.frozen ? r.frozen : L("Не вийшло: бюджет на рівні кампанії, немає підключення або такий дубль сьогодні вже є.","Не получилось: бюджет на уровне кампании, нет подключения или такой дубль сегодня уже есть.")); return false; }
    const z = typeof plCall === "function" ? await plCall({action:"decide", project_id:p.id, id, v:"y"}) : null; x.sched = id; save();
    if (typeof PL !== "undefined") { delete PL.st[p.id]; if (typeof plLoad === "function") plLoad(p); }
    toast(z && z.ok ? L("Готую вимкнену копію — перевір у стрічці Хіро, увімкну вночі","Готовлю выключенную копию — проверь в ленте Хиро, включу ночью") : L("Пропозицію створив — прийми її в стрічці","Предложение создал — прими его в ленте")); render(); return false; },
  tsRun(d){ const [p, t] = tsT(d); if (!t) return false; t.status = "run"; t.started = prToday(); const sh = Math.round((Date.parse(prToday()) - Date.parse(t.start)) / 864e5); if (sh > 0) t.steps.forEach(x => { x.d = tsDay(x.d, sh); }); save(); },
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
  tsClose(){ TS.open = null; },
  tsDelA(d){ if (TS.arm !== d.id) { TS.arm = d.id; return; } TS.arm = ""; ACT.tsDel(d); },
  tsBack(d){ const [p, t] = tsT(d); if (!t) return false; const i = t.steps.findIndex(x => !x.done); if (i > 0) { t.steps[i - 1].done = ""; t.backs = (t.backs || 0) + 1; }
    if ((t.backs || 0) >= TS_BACKS) { t.status = "stop"; t.note = L("Зупинено: після ","Остановлено: после ") + TS_BACKS + L(" відкатів кампанії не тримають ціну ліда на більшому бюджеті — вони вперлися в стелю."," откатов кампании не держат цену лида на большем бюджете — они уперлись в потолок."); }
    save(); },
  tsGo(d){ W.cur = d.p; W.fun = d.f; W.ftab = "launch"; MP.sel = null; save(); },
});
