/* Задачи для платформы. Человек ставит цель словами — текстом или голосом: «збільшити рекламу вдвічі з тією ж ціною ліда».
   Платформа разбирает фразу без ИИ (правила ниже), берёт цифры за 7 дней по выбранной воронке / каналу / аккаунту / кампании,
   считает план по шагам с датами и каждый день показывает на «Сегодня», что сделать сейчас и держится ли результат.
   В кабинете Meta платформа сама ничего не меняет: шаг делает человек и отмечает «Зроблено».
   Виды задач: scale — больше рекламы с тем же результатом; cut — снизить цену лида; pause — выключить то, что не работает; leads — N лидов к дате. */
const TS = {txt:{}, mic:null, micK:"", busy:{}, prog:{}, pbusy:{}};
const TS_STEP = 1.2, TS_GAP = 2;   /* бюджет поднимаем не больше чем на 20% раз в 2 дня — иначе Meta заново уходит в обучение */
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
  else if (/(збільш|увелич|масштаб|розган|разгон|розігн|разогн|розкрут|раскрут|більше|больше|подвої|удво|потро|утро|x\s?\d|х\s?\d|×\s?\d|в\s*\d+(?:\.\d+)?\s*раз|на\s*\d+\s*%)/.test(t)) o.type = "scale";
  let m;
  if ((m = t.match(/в\s*(\d+(?:\.\d+)?)\s*раз/)) || (m = t.match(/[xх×]\s?(\d+(?:\.\d+)?)/))) o.factor = n(m[1]);
  else if ((m = t.match(/на\s*(\d+(?:\.\d+)?)\s*%/))) o.factor = 1 + n(m[1]) / 100;
  else if (/(подвої|удво|вдвічі|вдвое|в два рази|в два раза)/.test(t)) o.factor = 2; else if (/(потро|утро|втричі|втрое)/.test(t)) o.factor = 3;
  if ((m = t.match(/до\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:\$|дол\S*)?\s*(?:в|на|за)\s*(?:день|добу|сутки)/))) o.dayTo = n(m[1]);
  if (/(тим самим|тем же|тією ж|той же|такою ж|такой же|та ж|та же|такий самий|такой же|без зростання|без роста|не дорожч|не дороже)/.test(t)) o.guard = "same";
  /* цена лида — сумма рядом со словом «лид»: «лид не дороже $6», «по $5 за лид», «цену лида до $5» */
  const lc = t.match(/(?:лід|лид)\S*[^$\d]{0,24}\$\s*(\d+(?:\.\d+)?)/) || t.match(/(?:лід|лид)\S*[^$\d]{0,24}(\d+(?:\.\d+)?)\s*(?:\$|дол)/) || t.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:за|на)\s*(?:лід|лид)/);
  if (lc) { o.cpl = n(lc[1]); if (o.type !== "cut") o.guard = "num"; }
  else if (money && o.type === "cut") o.cpl = n(money[1] || money[2]);
  if ((m = t.match(/за\s*(\d+)\s*(дн|день|дні|дней|доб)/))) o.days = n(m[1]); else if (/за\s*(тиждень|неделю)/.test(t)) o.days = 7; else if (/за\s*(місяць|месяц)/.test(t)) o.days = 30;
  else if ((m = t.match(/до\s*(\d{1,2})[.\/](\d{1,2})/))) { const y = prToday().slice(0, 4), d = y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); o.days = Math.max(1, Math.round((Date.parse(d) - Date.parse(prToday())) / 864e5)); }
  else if (/післязавтра|послезавтра/.test(t)) o.days = 2; else if (/завтра/.test(t)) o.days = 1;
  if (o.type === "scale" && !o.factor && !o.dayTo) o.factor = 1.5;
  if (o.type === "scale" && !o.guard) o.guard = "same";
  return o; }
const tsTypeName = t => ({scale:L("Більше реклами з тим самим результатом","Больше рекламы с тем же результатом"), cut:L("Знизити ціну ліда","Снизить цену лида"), pause:L("Вимкнути те, що не працює","Выключить то, что не работает"), leads:L("Ліди до дати","Лиды к дате")})[t] || "";

const tsCh = pr => (typeof PROV_CH !== "undefined" && PROV_CH[pr]) || pr;
/* цифры по охвату задачи за период: по кампаниям, в день */
async function tsRows(p, s, d1, d2){ const r = await sb.rpc("ad_summary", {p:p.id, d1, d2}); if (r.error) throw new Error(r.error.message);
  const days = Math.round((Date.parse(d2) - Date.parse(d1)) / 864e5) + 1, x = prOf(p);
  return (r.data || []).filter(o => { if (s.camp) return o.campaign_id === s.camp; if (s.c && tsCh(o.provider) !== s.c) return false;
      if (s.f && fxFunnel(p, {id:o.campaign_id, f:o.funnel_id || "", name:o.campaign_name, prov:tsCh(o.provider)}) !== s.f) return false;
      if (s.acc && x.am && prAccOf(x, o.campaign_id, tsCh(o.provider)) !== s.acc) return false; return true; })
    .map(o => ({id:o.campaign_id, name:o.campaign_name, spend:+o.spend || 0, leads:+o.leads || 0, day:(+o.spend || 0) / days, cpl:+o.leads ? (+o.spend) / (+o.leads) : 0})).filter(o => o.spend > 0); }
const tsSum = rows => { const s = rows.reduce((a, o) => { a.spend += o.spend; a.leads += o.leads; a.day += o.day; return a; }, {spend:0, leads:0, day:0}); s.cpl = s.leads ? s.spend / s.leads : 0; return s; };

/* план по шагам */
function tsPlan(p, s, o, rows){ const tot = tsSum(rows), f = s.f && p.funnels.find(x => x.id === s.f), cap = f ? fT(f, p).cap : pT(p).cap, start = prToday(), st = [];
  const guard = o.guard === "num" ? o.cpl : o.guard === "same" ? (tot.cpl || cap) * 1.1 : (o.type === "cut" ? o.cpl : 0) || cap;
  const nm = a => a.slice(0, 4).map(x => x.name).join(", ") + (a.length > 4 ? L(" і ще "," и ещё ") + (a.length - 4) : "");
  const out = {guard, base:{day:tot.day, cpl:tot.cpl, leads:tot.leads}, start, steps:st, note:"", target:0};
  if (!rows.length) { out.note = L("За 7 днів у цьому охопленні не було витрат — плану не буде. Оберіть інший рівень або запустіть рекламу.","За 7 дней в этом охвате не было расхода — плана не будет. Выберите другой уровень или запустите рекламу."); return out; }
  const win = rows.filter(r => r.leads >= 5 && r.cpl && r.cpl <= guard), lose = rows.filter(r => r.spend >= Math.max(cap, 5) * 2 && (!r.leads || r.cpl > Math.max(guard, cap) * 1.3));
  if (o.type === "scale" || o.type === "leads") {
    let target = o.dayTo || tot.day * (o.factor || 1.5);
    if (o.type === "leads") { const days = Math.max(1, o.days || 7), cpl = tot.cpl || cap; target = Math.max(tot.day, o.leads / days * cpl); out.leadsNeed = o.leads; out.days = days;
      if (o.leads / days * cpl > tot.day * 3) out.note = L("Щоб встигнути, бюджет треба підняти більш ніж утричі — ціна ліда, найімовірніше, зросте. Реальніше — подовжити строк.","Чтобы успеть, бюджет нужно поднять больше чем втрое — цена лида, скорее всего, вырастет. Реалистичнее — продлить срок."); }
    out.target = target;
    if (!win.length) { out.note = (out.note ? out.note + " " : "") + L("Немає кампаній, де ціна ліда в межах ","Нет кампаний, где цена лида в пределах ") + "$" + dec(guard) + L(" і хоча б 5 лідів за 7 днів. Масштабувати нічого — спершу знизьте ціну ліда."," и хотя бы 5 лидов за 7 дней. Масштабировать нечего — сначала снизьте цену лида."); return out; }
    const wDay = win.reduce((a, r) => a + r.day, 0), wTo = wDay + (target - tot.day); let cur = wDay, i = 0;
    while (cur < wTo - 0.5 && i < 12) { const nx = Math.min(cur * TS_STEP, wTo);
      st.push({d:tsDay(start, i * TS_GAP), t:L("Підніміть бюджет: ","Поднимите бюджет: ") + nm(win) + L(" — разом з $"," — вместе с $") + dec(cur, 0) + L(" до $"," до $") + dec(nx, 0) + L(" на день (+","/день (+") + Math.round((nx / cur - 1) * 100) + "%)."});
      cur = nx; i++; if (i === 2 && (o.factor || 0) >= 2) st.push({d:tsDay(start, i * TS_GAP), t:L("Додайте нову групу з найкращим креативом на ширшу аудиторію — один бюджет усіх груп не витягне.","Добавьте новую группу с лучшим креативом на более широкую аудиторию — один бюджет всех групп не вытянет."), act:"launch"}); }
    if (lose.length) st.unshift({d:start, t:L("Вимкніть, що тягне ціну вгору: ","Выключите то, что тянет цену вверх: ") + nm(lose) + "."});
    st.push({d:tsDay(start, i * TS_GAP + 3), t:L("Перевірка: 3 дні на новому бюджеті. Якщо ціна ліда в межах — задачу виконано.","Проверка: 3 дня на новом бюджете. Если цена лида в пределах — задача выполнена."), check:1});
  } else if (o.type === "cut") {
    const tg = o.cpl || tot.cpl * 0.8; out.guard = tg; out.target = tg;
    const bad = rows.filter(r => r.spend >= tg * 2 && (!r.leads || r.cpl > tg * 1.3)), good = rows.filter(r => r.leads >= 3 && r.cpl <= tg);
    if (bad.length) st.push({d:start, t:L("Вимкніть: ","Выключите: ") + nm(bad) + L(" — ліди дорожчі за $"," — лиды дороже $") + dec(tg * 1.3) + "."});
    if (bad.length && good.length) st.push({d:start, t:L("Перенесіть їхній бюджет ($","Перенесите их бюджет ($") + dec(bad.reduce((a, r) => a + r.day, 0), 0) + L("/день) у: ","/день) в: ") + nm(good) + L(" — не більше +20% за раз."," — не больше +20% за раз.")});
    st.push({d:tsDay(start, 2), t:L("Перевірте вигорання креативів: Запуск → Дослідження воронки. Вигорілі замініть новими.","Проверьте выгорание креативов: Запуск → Исследование воронки. Выгоревшие замените новыми."), act:"launch"});
    st.push({d:tsDay(start, 5), t:L("Перевірка: ціна ліда за 3 дні не вища за $","Проверка: цена лида за 3 дня не выше $") + dec(tg) + ".", check:1});
    if (!bad.length && !good.length) out.note = L("Явних збиткових кампаній немає — ціну тягнуть креативи або лендинг.","Явных убыточных кампаний нет — цену тянут креативы или лендинг.");
  } else if (o.type === "pause") {
    if (lose.length) st.push({d:start, t:L("Вимкніть: ","Выключите: ") + nm(lose) + "."}); else out.note = L("Кампаній, що явно не працюють, за 7 днів немає.","Кампаний, которые явно не работают, за 7 дней нет.");
  }
  return out; }

/* поставить задачу: разобрать, посчитать план, показать человеку — он запускает или правит фразу */
async function tsCreate(k, text){ const s = tsScope(k), p = s && W.projs.find(x => x.id === s.pid); if (!p) return false;
  const o = tsParse(text); if (!o.type) { toast(L("Не зрозуміли задачу. Приклади — під полем.","Не поняли задачу. Примеры — под полем.")); return false; }
  if (!CLOUD || !sb) { toast(L("Задачі працюють із сервером","Задачи работают с сервером")); return false; }
  let ok = false;
  try { const d2 = tsDay(prToday(), -1), rows = await tsRows(p, s, tsDay(d2, -6), d2), pl = tsPlan(p, s, o, rows);
    p.tasks = p.tasks || []; p.tasks.unshift(Object.assign({id:uid(), text:String(text).trim(), type:o.type, o, scope:s, status:"plan", at:new Date().toISOString()}, pl)); save(); ok = true; }
  catch (e) { toast(String(e.message || e)); }
  return ok; }

/* как идёт задача: последние 3 полных дня против исходных */
async function tsProg(p, t){ if (TS.pbusy[t.id]) return; TS.pbusy[t.id] = true;
  try { const d2 = tsDay(prToday(), -1), rows = await tsRows(p, t.scope, tsDay(d2, -2), d2); TS.prog[t.id] = Object.assign(tsSum(rows), {at:Date.now()}); }
  catch (e) { TS.prog[t.id] = {err:String(e.message || e)}; }
  TS.pbusy[t.id] = false; render(); }
function tsCard(p, t){ const g = TS.prog[t.id], today = prToday(), next = t.steps.find(x => !x.done), late = next && next.d <= today;
  if (t.status === "run" && (!g || Date.now() - g.at > 30 * 60000) && !TS.pbusy[t.id] && CLOUD) setTimeout(() => tsProg(p, t), 0);
  const o = t.o, und = [tsTypeName(t.type), o.factor && t.type === "scale" ? "×" + dec(o.factor, 1) : "", t.target && t.type !== "cut" ? L("до $","до $") + dec(t.target, 0) + L("/день","/день") : "", t.type === "leads" ? num(o.leads) + L(" лідів за "," лидов за ") + (t.days || 7) + L(" дн."," дн.") : "", t.guard ? L("ціна ліда ≤ $","цена лида ≤ $") + dec(t.guard) : ""].filter(Boolean).join(" · ");
  const pg = g && !g.err && g.day ? (() => { const ok = !g.cpl || g.cpl <= t.guard * 1.0001, lv = ok ? "good" : "crit";
    return `<p class="tsp tsp--${lv}">${L("Зараз (3 дні): $","Сейчас (3 дня): $")}${dec(g.day, 0)}${L("/день, ліди по $","/день, лиды по $")}${g.cpl ? dec(g.cpl) : "—"}${t.target && t.type !== "cut" ? L(" · ціль $"," · цель $") + dec(t.target, 0) + L("/день","/день") : ""}${ok ? "" : L(" — ціна вища за межу: поверніть попередній бюджет і зачекайте 2 дні."," — цена выше границы: верните прежний бюджет и подождите 2 дня.")}</p>`; })() : g && g.err ? `<p class="sub">${esc(g.err)}</p>` : "";
  return `<div class="tsc tsc--${t.status}"><div class="row sp"><div><b>${esc(t.text)}</b><div class="sub">${esc(t.scope.label)} · ${L("поставлено ","поставлено ")}${tsDM(t.at.slice(0, 10))}</div></div>
      <span class="row">${t.status === "plan" ? `<button type="button" class="btn btn--sm btn--solid" data-act="tsRun" data-p="${p.id}" data-id="${t.id}">${L("Почати","Начать")}</button>` : t.status === "run" ? pill("good", L("іде","идёт")) : pill("mute", t.status === "done" ? L("виконано","выполнено") : L("зупинено","остановлено"))}
        <button type="button" class="lnk" data-act="tsDel" data-p="${p.id}" data-id="${t.id}" aria-label="${L("Прибрати задачу","Убрать задачу")}">×</button></span></div>
    <p class="tsu">${L("Зрозуміли так: ","Поняли так: ")}${esc(und)}. ${L("Було за 7 днів: $","Было за 7 дней: $")}${dec(t.base.day, 0)}${L("/день, ліди по $","/день, лиды по $")}${t.base.cpl ? dec(t.base.cpl) : "—"}.</p>
    ${t.note ? `<p class="tsn">${esc(t.note)}</p>` : ""}${pg}
    ${t.steps.length ? `<ol class="tss">${t.steps.map((x, i) => `<li class="${x.done ? "ok" : x === next && t.status === "run" ? (late ? "now" : "next") : ""}"><span class="mono">${tsDM(x.d)}</span> <span>${esc(x.t)}</span>${t.status === "run" && x === next ? ` <span class="row">${x.act === "launch" && t.scope.f ? `<button type="button" class="btn btn--sm" data-act="tsGo" data-p="${p.id}" data-f="${t.scope.f}">${L("Відкрити запуск","Открыть запуск")}</button>` : ""}<button type="button" class="btn btn--sm${late ? " btn--solid" : ""}" data-act="tsDone" data-p="${p.id}" data-id="${t.id}" data-v="${i}">${x.check ? L("Результат є","Результат есть") : L("Зроблено","Сделано")}</button></span>` : ""}</li>`).join("")}</ol>` : ""}
    ${t.status === "run" ? `<div class="row"><button type="button" class="lnk" data-act="tsStop" data-p="${p.id}" data-id="${t.id}">${L("Зупинити задачу","Остановить задачу")}</button></div>` : ""}</div>`; }

const TS_EX = () => [L("Збільшити рекламу вдвічі з тією ж ціною ліда","Увеличить рекламу вдвое с той же ценой лида"), L("Розігнати до $300 на день, лід не дорожче $6","Разогнать до $300 в день, лид не дороже $6"), L("Знизити ціну ліда до $5","Снизить цену лида до $5"), L("100 лідів за тиждень","100 лидов за неделю"), L("Вимкнути те, що не працює","Выключить то, что не работает")];
/* поле задачи: на «Сегодня» с выбором охвата, в окне карточки — для этой карточки */
function tsBox(k, pick){ const busy = TS.busy[k], mic = (window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="btn btn--ico${TS.mic && TS.micK === k ? " btn--solid" : ""}" data-act="tsMic" data-k="${esc(k)}" aria-label="${L("Надиктувати","Надиктовать")}" title="${L("Надиктувати","Надиктовать")}"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="7.5" y="2.5" width="5" height="9" rx="2.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/></svg></button>` : "";
  return `<div class="tsb">${pick || ""}<div class="row tsi"><input id="ts-${esc(k)}" data-tsk="${esc(k)}" value="${esc(TS.txt[k] || "")}" placeholder="${L("Що зробити? Напр.: збільшити рекламу вдвічі з тією ж ціною ліда","Что сделать? Напр.: увеличить рекламу вдвое с той же ценой лида")}" aria-label="${L("Задача","Задача")}"${busy ? " disabled" : ""}>${mic}<button type="button" class="btn btn--sm btn--solid" data-act="tsAdd" data-k="${esc(k)}"${busy ? " disabled" : ""}>${busy ? L("Рахуємо…","Считаем…") : L("Поставити","Поставить")}</button></div>
    <div class="opts opts--sm">${TS_EX().map(x => `<button type="button" class="opt" data-act="tsEx" data-k="${esc(k)}" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`; }
/* на «Сегодня»: охват выбирается из воронок и аккаунтов */
TS.sc = "";
function tsToday(){ const ps = W.projs.filter(p => p.funnels.length); if (!ps.length) return "";
  const opts = []; ps.forEach(p => { p.funnels.forEach(f => { opts.push(["co/" + p.id + "/" + f.id, (ps.length > 1 ? p.name + " · " : "") + f.name]);
    (f.ch || []).forEach(c => prAccs(p, c).forEach(a => opts.push(["co/" + p.id + "/" + f.id + "/" + c + "/" + prAK(String(a.id)), (ps.length > 1 ? p.name + " · " : "") + f.name + " · " + (a.name || a.id)]))); }); });
  if (!opts.some(o => o[0] === TS.sc)) TS.sc = opts[0][0];
  const pick = `<label class="tsw"><span class="lbl">${L("Для чого","Для чего")}</span><select data-tssc="1">${opts.map(o => `<option value="${esc(o[0])}"${o[0] === TS.sc ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select></label>`;
  const list = ps.flatMap(p => (p.tasks || []).filter(t => t.status === "run" || t.status === "plan").map(t => tsCard(p, t))).join("");
  const done = ps.reduce((a, p) => a + (p.tasks || []).filter(t => t.status === "done" || t.status === "stop").length, 0);
  return `<div class="panel tsk"><div class="row sp"><span class="tag">${L("Задачі для платформи","Задачи для платформы")}</span>${done ? `<small class="sub">${L("завершено: ","завершено: ")}${done}</small>` : ""}</div>${tsBox("today", pick)}${list}</div>`; }
function tsNode(k){ const s = tsScope(k); if (!s || !s.f) return ""; const p = W.projs.find(x => x.id === s.pid), mine = (p.tasks || []).filter(t => tsKey(t.scope) === tsKey(s) && t.status !== "done" && t.status !== "stop");
  return `<div class="panel tsk"><span class="tag">${L("Задача для платформи","Задача для платформы")} · ${esc(s.label)}</span>${tsBox(k)}${mine.map(t => tsCard(p, t)).join("")}</div>`; }
const tsK = k => k === "today" ? TS.sc : k;
const tsT = d => { const p = W.projs.find(x => x.id === d.p), t = p && (p.tasks || []).find(x => x.id === d.id); return [p, t]; };
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.tsk) TS.txt[t.dataset.tsk] = t.value; });
document.addEventListener("keydown", e => { const t = e.target; if (e.key === "Enter" && t.dataset && t.dataset.tsk) { e.preventDefault(); ACT.tsAdd({k:t.dataset.tsk}); } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.tssc) { TS.sc = t.value; render(); } });
Object.assign(ACT, {
  tsAdd(d){ const v = TS.txt[d.k] || ((document.getElementById("ts-" + d.k) || {}).value || ""); if (!v.trim()) { toast(L("Напишіть або надиктуйте задачу","Напишите или надиктуйте задачу")); return false; } TS.busy[d.k] = true; render(); tsCreate(tsK(d.k), v).then(ok => { TS.busy[d.k] = false; if (ok) TS.txt[d.k] = ""; render(); }); return false; },
  tsEx(d){ TS.txt[d.k] = d.v; setTimeout(() => { const el = document.getElementById("ts-" + d.k); if (el) el.focus({preventScroll:true}); }, 0); },
  tsMic(d){ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return false;
    if (TS.mic) { try { TS.mic.stop(); } catch (e) { /* */ } TS.mic = null; return; }
    const r = new SR(); r.lang = lang === "uk" ? "uk-UA" : "ru-RU"; r.interimResults = false;
    r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(" ").trim(); if (t) TS.txt[d.k] = ((TS.txt[d.k] || "") + " " + t).trim(); };
    r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(L("Браузер не дав доступ до мікрофона","Браузер не дал доступ к микрофону")); };
    r.onend = () => { TS.mic = null; render(); }; TS.mic = r; TS.micK = d.k; try { r.start(); } catch (e) { TS.mic = null; } },
  tsRun(d){ const [p, t] = tsT(d); if (!t) return false; t.status = "run"; t.started = prToday(); const sh = Math.round((Date.parse(prToday()) - Date.parse(t.start)) / 864e5); if (sh > 0) t.steps.forEach(x => { x.d = tsDay(x.d, sh); }); save(); },
  tsDone(d){ const [p, t] = tsT(d); if (!t) return false; const x = t.steps[+d.v]; if (!x) return false; x.done = prToday(); if (t.steps.every(y => y.done)) { t.status = "done"; toast(L("Задачу виконано","Задача выполнена")); } save(); },
  tsStop(d){ const [p, t] = tsT(d); if (!t) return false; t.status = "stop"; save(); },
  tsDel(d){ const [p, t] = tsT(d); if (!t) return false; p.tasks = p.tasks.filter(x => x !== t); save(); },
  tsGo(d){ W.cur = d.p; W.fun = d.f; W.ftab = "launch"; MP.sel = null; save(); },
});
