/* Карта структуры: Компания → Проект → Воронка → Канал трафика.
   Интерактивная доска: клик по карточке подсвечивает её ветку и показывает, что живёт на этом уровне.
   Подключается перед ws.js. */
const CHAN = () => [["meta","Meta Ads","Facebook · Instagram"],["gg","Google Ads",L("пошук · YouTube","поиск · YouTube")],["tt","TikTok Ads","TikTok"],["tga","Telegram Ads",L("канали й боти","каналы и боты")]];
const chOf = id => CHAN().find(c => c[0] === id) || [id, id, ""];
const LEVELS = () => [
  [L("Компанія","Компания"), L("Назва, команда й ролі, спільна база знань: айдентика, правила, кейси.","Название, команда и роли, общая база знаний: айдентика, правила, кейсы.")],
  [L("Проєкт","Проект"), L("Окремий продукт: опис, ЦА, своя база знань, цілі й бюджет, підключені кабінети.","Отдельный продукт: описание, ЦА, своя база знаний, цели и бюджет, подключённые кабинеты.")],
  [L("Воронка","Воронка"), L("Шлях до оплати: офер і анамнез, правки ЦА, лендинги, креативи, цілі й аналітика.","Путь до оплаты: оффер и анамнез, правки ЦА, лендинги, креативы, цели и аналитика.")],
  [L("Канал трафіку","Канал трафика"), L("Звідки йдуть люди: рекламний кабінет, кампанії, бюджет каналу, UTM-мітки.","Откуда идут люди: рекламный кабинет, кампании, бюджет канала, UTM-метки.")]];
const MP = {sel:null, demo:null, fold:{}};
/* значки каналов: простые знаки по смыслу (лента, поиск, короткое видео, сообщение), не логотипы площадок */
const CHI = {
  meta:'<path d="M4.5 11C3 11 2 9.7 2 8s1-3 2.5-3C7 5 9 11 11.5 11 13 11 14 9.7 14 8s-1-3-2.5-3C9 5 7 11 4.5 11z"/>',
  gg:'<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>',
  tt:'<path d="M6.5 11.5v-9c.8 2 2.3 3.2 4.5 3.4"/><circle cx="4.6" cy="11.6" r="1.9"/>',
  tga:'<path d="M14 2 2 7l4.5 2 2 4.5L14 2zM6.5 9 14 2"/>'};
const chIcon = id => CHI[id] ? `<svg class="chi" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CHI[id]}</svg>` : "";
/* что задаётся в проекте, а что в каждой воронке */
const SPLIT = () => [
  [L("У проєкті — спільне для всіх воронок","В проекте — общее для всех воронок"), [L("назва, ніша, гео, що продаємо","название, ниша, гео, что продаём"), L("правила реклами: що працювало, заборони, тон","правила рекламы: что работало, запреты, тон"), L("глобальні цифри: бюджет, середній чек, частка маркетингу, базові конверсії","глобальные цифры: бюджет, средний чек, доля маркетинга, базовые конверсии"), L("базова ЦА","базовая ЦА"), L("база знань","база знаний"), L("рекламні кабінети, продажі, Telegram","рекламные кабинеты, продажи, Telegram")]],
  [L("У кожній воронці — своє","В каждой воронке — своё"), [L("офер, ціна, акція","оффер, цена, акция"), L("сайт і лендинги","сайт и лендинги"), L("шлях продажу: вебінар, дзвінок чи оплата на сайті","путь продажи: вебинар, звонок или оплата на сайте"), L("канали трафіку","каналы трафика"), L("правки ЦА: вимкнути сегменти проєкту, додати свої","правки ЦА: выключить сегменты проекта, добавить свои"), L("креативи й тексти","креативы и тексты"), L("цілі воронки й аналітика","цели воронки и аналитика")]]];
const splitNote = on => `<div class="split">${SPLIT().map((c, i) => `<div${i === on ? ' class="on"' : ""}><b>${c[0]}</b><ul>${c[1].map(x => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>`;
/* Пути продажи: стандартные, свои (сохранены в компании) и одобренные из общей библиотеки платформы. */
const SALEC = () => [
  ["web", L("Вебінар → бронь → оплата","Вебинар → бронь → оплата"), L("реклама → лендинг → вебінар → бронь → оплата","реклама → лендинг → вебинар → бронь → оплата")],
  ["autoweb", L("Автовебінар → оплата","Автовебинар → оплата"), L("реклама → лендинг → автовебінар → оплата","реклама → лендинг → автовебинар → оплата")],
  ["marathon", L("Марафон або інтенсив → оплата","Марафон или интенсив → оплата"), L("реклама → лендинг → безкоштовний марафон → офер → оплата","реклама → лендинг → бесплатный марафон → оффер → оплата")],
  ["call", L("Заявка → дзвінок → оплата","Заявка → звонок → оплата"), L("реклама → лендинг → заявка → дзвінок → оплата","реклама → лендинг → заявка → звонок → оплата")],
  ["quiz", L("Квіз → дзвінок → оплата","Квиз → звонок → оплата"), L("реклама → квіз → заявка → дзвінок → оплата","реклама → квиз → заявка → звонок → оплата")],
  ["consult", L("Безкоштовна консультація → оплата","Бесплатная консультация → оплата"), L("реклама → лендинг → запис на консультацію → консультація → оплата","реклама → лендинг → запись на консультацию → консультация → оплата")],
  ["msg", L("Листування в месенджері → оплата","Переписка в мессенджере → оплата"), L("реклама → повідомлення в Telegram або Direct → листування → оплата","реклама → сообщение в Telegram или Direct → переписка → оплата")],
  ["lm", L("Лід-магніт → прогрів → оплата","Лид-магнит → прогрев → оплата"), L("реклама → лід-магніт → прогрів у месенджері або пошті → офер → оплата","реклама → лид-магнит → прогрев в мессенджере или почте → оффер → оплата")],
  ["trip", L("Недорогий продукт → основний","Недорогой продукт → основной"), L("реклама → лендинг → купівля недорогого продукту → пропозиція основного → оплата","реклама → лендинг → покупка недорогого продукта → предложение основного → оплата")],
  ["site", L("Оплата одразу на сайті","Оплата сразу на сайте"), L("реклама → лендинг → оплата","реклама → лендинг → оплата")],
  ["shop", L("Каталог → кошик → оплата","Каталог → корзина → оплата"), L("реклама → картка товару → кошик → оплата","реклама → карточка товара → корзина → оплата")],
  ["trial", L("Пробний період → підписка","Пробный период → подписка"), L("реклама → лендинг → реєстрація → пробний період → підписка","реклама → лендинг → регистрация → пробный период → подписка")],
  ["book", L("Запис на послугу → візит → оплата","Запись на услугу → визит → оплата"), L("реклама → лендинг → запис → візит → оплата","реклама → лендинг → запись → визит → оплата")]];
const saleOwn = () => (W.co && W.co.paths) || [];
const saleLib = () => (CL.lib || []).filter(l => !saleOwn().some(o => o.name.toLowerCase() === l.name.toLowerCase()));
const saleAll = () => SALEC().map(x => ({id:x[0], name:x[1], steps:x[2], src:"std"})).concat(saleOwn().map(x => Object.assign({src:"own"}, x)), saleLib().map(x => Object.assign({src:"lib"}, x)));
const saleGet = id => saleAll().find(x => x.id === id);
const saleName = f => (saleGet(f.sale) || {}).name || f.saleName || "";
const stepsNorm = t => String(t || "").split(/→|->|=>|>|,|;|\n/).map(x => x.trim()).filter(Boolean).join(" → ");
/* список для выбора; f — воронка, если её путь уже не числится в списках */
function saleSelect(id, cur, f){
  const all = saleAll(), grp = (src, label) => { const r = all.filter(x => x.src === src); return r.length ? `<optgroup label="${label}">${r.map(x => `<option value="${esc(x.id)}"${x.id === cur ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>` : ""; };
  return `<select id="${id}">${f && !saleGet(cur) && f.saleName ? `<option value="${esc(cur)}" selected>${esc(f.saleName)}</option>` : ""}${grp("std", L("Стандартні","Стандартные"))}${grp("own", L("Свої шляхи компанії","Свои пути компании"))}${grp("lib", L("Із загальної бібліотеки","Из общей библиотеки"))}<option value="+">${L("+ Свій шлях…","+ Свой путь…")}</option></select>`;
}
const saleNew = (pre, hidden) => `<div class="w form ownp" id="${pre}-own"${hidden ? " hidden" : ""}>
  <div class="field"><label for="${pre}-pname">${L("Назва свого шляху","Название своего пути")}</label><input id="${pre}-pname" placeholder="${L("Діагностика → пропозиція","Диагностика → предложение")}"></div>
  <div class="field"><label for="${pre}-psteps">${L("Кроки через кому","Шаги через запятую")}</label><input id="${pre}-psteps" placeholder="${L("реклама, анкета, діагностика, оплата","реклама, анкета, диагностика, оплата")}"></div>
  <p class="sub w">${L("Шлях збережеться в компанії й з’явиться у списку для наступних воронок. Після перевірки він потрапляє в загальну бібліотеку для інших користувачів — без ваших даних, лише назва й кроки.","Путь сохранится в компании и появится в списке для следующих воронок. После проверки он попадает в общую библиотеку для других пользователей — без ваших данных, только название и шаги.")}</p></div>`;
/* сохраняет свой путь: в компании (если есть право) и кандидатом в общую библиотеку */
function pathAdd(name, steps){ const x = {id:"c_" + uid(), name, steps};
  if (canAdmin() && W.co) { W.co.paths = W.co.paths || []; W.co.paths.push(x); }
  if (CLOUD) cloudLibAdd("sale_path", x); return x; }
function pathRead(pre){ const n = (document.getElementById(pre + "-pname") || {}).value || "", st = stepsNorm((document.getElementById(pre + "-psteps") || {}).value);
  if (!n.trim() || st.split(" → ").length < 2) { fieldErr(pre + (n.trim() ? "-psteps" : "-pname"), n.trim() ? L("Перелічіть хоча б два кроки через кому","Перечислите хотя бы два шага через запятую") : L("Назвіть шлях","Назовите путь")); return null; }
  return pathAdd(n.trim(), st); }
const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return n + " " + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c); };

/* ---------- план воронки по каналам ----------
   Доля — часть бюджета воронки на канал, %. Что задано — как задано, остальным каналам остаток поровну. */
function chShares(f){ const ch = f.ch || [], sh = f.chs || {}, out = {}, set = ch.filter(c => typeof sh[c] === "number" && sh[c] >= 0), used = set.reduce((a, c) => a + sh[c], 0), free = ch.filter(c => !set.includes(c));
  set.forEach(c => { out[c] = sh[c]; }); free.forEach(c => { out[c] = Math.max(0, (100 - used) / free.length); }); return out; }
function chPlan(f, p){ const x = fT(f, p), s = chShares(f); return (f.ch || []).map(c => ({id:c, share:s[c], bud:x.bud * s[c] / 100, leads:x.leads * s[c] / 100, pay:x.pay * s[c] / 100})); }
function chPlanBody(f, p){ const rows = chPlan(f, p), tot = rows.reduce((a, r) => a + r.share, 0), ok = Math.abs(tot - 100) < 0.5, sum = k => rows.reduce((a, r) => a + r[k], 0);
  return `<div class="row sp"><span class="tag">${L("План за каналами","План по каналам")}</span>${rows.length ? (ok ? pill("good", L("частки в сумі 100%","доли в сумме 100%")) : pill("warn", L("частки в сумі ","доли в сумме ") + Math.round(tot) + "%")) : ""}</div>
    ${rows.length ? `<div class="tw tw--in"><table><thead><tr><th>${L("Канал","Канал")}</th><th class="n">${L("Частка бюджету","Доля бюджета")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${L("Лідів","Лидов")}</th><th class="n">${L("Оплат","Оплат")}</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${chOf(r.id)[1]}</b></td><td class="n"><input class="tin" data-chs="${r.id}" value="${Math.round(r.share * 10) / 10}" inputmode="decimal" aria-label="${chOf(r.id)[1]}, %"> <span class="sub mono">%</span></td><td class="n mono">${money(r.bud)}</td><td class="n mono">${num(r.leads)}</td><td class="n mono">${num(r.pay)}</td></tr>`).join("")}
      <tr class="sum"><td><b>${L("Воронка","Воронка")}</b></td><td class="n mono"><b>${Math.round(tot)}%</b></td><td class="n mono"><b>${money(sum("bud"))}</b></td><td class="n mono"><b>${num(sum("leads"))}</b></td><td class="n mono"><b>${num(sum("pay"))}</b></td></tr></tbody></table></div>
      <div class="row"><button class="btn btn--sm" data-act="chEven">${L("Розділити порівну","Разделить поровну")}</button></div>
      <p class="sub">${L("Частка — це частина бюджету воронки на канал. Поки немає факту, ліди й оплати діляться в тій самій пропорції; після підключення кабінетів у кожного каналу буде своя ціна ліда.","Доля — это часть бюджета воронки на канал. Пока нет факта, лиды и оплаты делятся в той же пропорции; после подключения кабинетов у каждого канала будет своя цена лида.")}</p>`
    : `${empty(L("У воронки немає каналів трафіку","У воронки нет каналов трафика"), L("Позначте канали — план розкладеться за ними.","Отметьте каналы — план разложится по ним."))}${chOpts(p, f)}`}`; }
const chPlanPanel = (f, p) => `<div class="panel" id="ch-plan">${chPlanBody(f, p)}</div>`;
/* свод проекта по каналам: канал → воронка → проект */
function chSumPanel(p){ if (!p.funnels.length) return "";
  const acc = {}, none = {bud:0, leads:0, pay:0, n:0};
  p.funnels.forEach(f => { const rows = chPlan(f, p); if (!rows.length) { const x = fT(f, p); none.bud += x.bud; none.leads += x.leads; none.pay += x.pay; none.n++; return; }
    rows.forEach(r => { const a = acc[r.id] = acc[r.id] || {bud:0, leads:0, pay:0, n:0}; a.bud += r.bud; a.leads += r.leads; a.pay += r.pay; a.n++; }); });
  const ids = CHAN().map(c => c[0]).filter(c => acc[c]), all = ids.reduce((a, c) => a + acc[c].bud, 0) + none.bud;
  const row = (name, a, st) => `<tr><td><b>${name}</b></td><td class="n mono">${a.n}</td><td class="n mono">${money(a.bud)}</td><td class="n mono">${all ? Math.round(a.bud / all * 100) : 0}%</td><td class="n mono">${num(a.leads)}</td><td class="n mono">${num(a.pay)}</td><td>${st}</td></tr>`;
  return `<div class="panel"><span class="tag">${L("Зведення за каналами","Свод по каналам")}</span>
    <div class="tw tw--in"><table><thead><tr><th>${L("Канал","Канал")}</th><th class="n">${L("Воронок","Воронок")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${L("Частка","Доля")}</th><th class="n">${L("Лідів","Лидов")}</th><th class="n">${L("Оплат","Оплат")}</th><th>${L("Кабінет","Кабинет")}</th></tr></thead><tbody>
      ${ids.map(c => row(chOf(c)[1], acc[c], p.conn[c] === 1 ? pill("good", L("підключено","подключён")) : p.conn[c] ? pill("warn", L("до підключення","к подключению")) : pill("mute", L("немає","нет")))).join("")}
      ${none.n ? row(L("Канал не обрано","Канал не выбран"), none, pill("warn", L("розподіліть у воронці","распределите в воронке"))) : ""}</tbody></table></div>
    <p class="sub">${L("Цифри зводяться знизу вгору: частки каналів задаються у воронці, тут — сума за всіма воронками проєкту.","Цифры сводятся снизу вверх: доли каналов задаются в воронке, здесь — сумма по всем воронкам проекта.")}</p></div>`; }

/* Факт на карте: расход и лиды за 7 дней из статистики, уже собранной на сервере.
   Только чтение: к рекламному кабинету карта не обращается, свежесть данных — забота блока «Факт рекламы» и ночного обновления. */
const MFX = {};
const mapFxOn = p => CLOUD && p.meta && p.meta.conn;
function mapFactLoad(){ if (!CLOUD || !sb) return;
  W.projs.forEach(p => { if (!mapFxOn(p)) return; const x = MFX[p.id] = MFX[p.id] || {rows:null, at:0, loading:false};
    if (x.loading || Date.now() - x.at < 10 * 60000) return; x.loading = true;
    const done = r => { x.loading = false; x.at = Date.now(); if (!r || r.error) return;
      x.rows = (r.data || []).map(o => ({prov:o.provider, f:o.funnel_id || "", id:o.campaign_id, spend:+o.spend || 0, leads:+o.leads || 0}));
      if (W.co && !W.cur && W.ctab === "map" && !S.modal) render(); };
    Promise.resolve(sb.rpc("ad_summary", {p:p.id, d1:fxDay(new Date(Date.now() - 6 * 86400000)), d2:fxDay(new Date())})).then(done, () => done(null)); }); }
const mapFxRows = p => (mapFxOn(p) && MFX[p.id] && MFX[p.id].rows) || null;
const mapFxCur = p => (p.meta.conn.account || {}).currency || "";
const mapFxSum = rows => rows.reduce((a, r) => { a.spend += r.spend; a.leads += r.leads; return a; }, {spend:0, leads:0});
function mapFxText(s, cur){ if (!s.spend && !s.leads) return "";
  const usd = !cur || cur === "USD", m = (v, f) => usd ? "$" + f(v) : f(v) + " " + cur;
  return L("факт 7 дн.: ","факт 7 дн.: ") + m(s.spend, num) + " · " + (s.leads ? plural(s.leads, L("лід","лид"), L("ліди","лида"), L("лідів","лидов")) + L(" по "," по ") + m(s.spend / s.leads, fxM) : L("лідів немає","лидов нет")); }
/* проект целиком, одна воронка или один канал воронки */
function mapFx(p, f, c){ const rows = mapFxRows(p); if (!rows) return "";
  const r = f ? rows.filter(x => fxFunnel(p, x) === f.id && (!c || x.prov === c)) : rows;
  return mapFxText(mapFxSum(r), mapFxCur(p)) || (f ? "" : L("факт 7 дн.: витрат немає","факт 7 дн.: расхода нет")); }
/* компания: складываем проекты, только если у всех кабинетов одна валюта */
function mapFxCo(){ const ps = W.projs.filter(mapFxRows); if (!ps.length) return ""; const curs = [...new Set(ps.map(p => mapFxCur(p) || "USD"))];
  return curs.length > 1 ? "" : mapFxText(mapFxSum(ps.reduce((a, p) => a.concat(mapFxRows(p)), [])), curs[0]); }

/* Сворачивание веток. Пока структура небольшая, всё раскрыто. Когда строк на доске много,
   проекты по умолчанию свёрнуты до одной строки; в проекте, где больше шести воронок, свёрнуты каналы воронок.
   Явный выбор человека (MP.fold) главнее правила. */
const MAP_ROWS = 16, MAP_FUNS = 6;
const mapRows = () => W.projs.reduce((a, p) => a + 1 + p.funnels.reduce((b, f) => b + Math.max(1, (f.ch || []).length + ((f.ch || []).length < CHAN().length ? 1 : 0)), 0), 0);
const mapMany = () => W.projs.length > 1 && mapRows() > MAP_ROWS;
const mapFolded = (k, def) => k in MP.fold ? MP.fold[k] : def;
const plCh = n => plural(n, L("канал","канал"), L("канали","канала"), L("каналів","каналов"));
const plFn = n => plural(n, L("воронка","воронка"), L("воронки","воронки"), L("воронок","воронок"));

/* дерево из настоящих данных компании */
function mapTree(){
  mapFactLoad();
  const many = mapMany();
  const co = {k:"co", lv:0, t:W.co.name, s:plural(W.projs.length, L("проєкт","проект"), L("проєкти","проекта"), L("проєктів","проектов")) + (CLOUD ? " · " + plural(CL.members.length, L("людина","человек"), L("людини","человека"), L("людей","человек")) : ""), fx:mapFxCo(), kids:[]};
  W.projs.forEach(p => {
    mtHealth(p);
    const nch = p.funnels.reduce((a, f) => a + (f.ch || []).length, 0);
    const pn = {k:"co/" + p.id, lv:1, t:p.name, s:[p.niche, p.geo].filter(Boolean).join(" · "), m:p.tg && p.tg.budget ? L("бюджет ","бюджет ") + money(p.tg.budget) : "", fx:mapFx(p), kids:[]};
    if (p.funnels.length) { pn.can = true; pn.fold = mapFolded(pn.k, many); pn.stub = [plFn(p.funnels.length), nch ? plCh(nch) : L("канали не обрано","каналы не выбраны")]; }
    if (pn.fold && MP.sel && MP.sel.indexOf(pn.k + "/") === 0) MP.sel = pn.k;
    p.funnels.forEach(f => {
      const fn = {k:pn.k + "/" + f.id, lv:2, t:f.name, s:saleName(f), m:f.tg && f.tg.pay ? L("ціль: ","цель: ") + plural(f.tg.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) : "", fx:mapFx(p, f), kids:[]};
      if ((f.ch || []).length) { fn.can = true; fn.fold = mapFolded(fn.k, p.funnels.length > MAP_FUNS); fn.ics = f.ch; fn.stub = [plCh(f.ch.length), f.ch.map(c => chOf(c)[1]).join(" · ")]; }
      if (fn.fold && MP.sel && MP.sel.indexOf(fn.k + "/") === 0) MP.sel = fn.k;
      const plan = chPlan(f, p); (f.ch || []).forEach(c => { const ch = chOf(c), pl = plan.find(r => r.id === c); fn.kids.push({k:fn.k + "/" + c, lv:3, ic:c, t:ch[1], s:pl && pl.bud > 0 ? money(pl.bud) + " · " + Math.round(pl.share) + "%" : ch[2], fx:mapFx(p, f, c), m:c === "meta" && mtBroken(p) ? L("підключення зламалося","подключение сломалось") : p.conn[c] === 1 ? L("кабінет підключено","кабинет подключён") : p.conn[c] ? L("кабінет позначено","кабинет отмечен") : L("кабінет не підключено","кабинет не подключён"), warn:!p.conn[c] || (c === "meta" && mtBroken(p))}); });
      if ((f.ch || []).length < CHAN().length) fn.kids.push({add:"c", k:fn.k + "/+", lv:3, t:L("Канал","Канал")});
      pn.kids.push(fn);
    });
    pn.kids.push({add:"f", k:pn.k + "/+", lv:2, t:L("Воронка","Воронка"), kids: p.funnels.length ? [] : [{ghost:1, k:pn.k + "/+/g", lv:3, t:L("Канали трафіку","Каналы трафика"), s:L("додаються до воронки","добавляются к воронке")}]});
    co.kids.push(pn);
  });
  if (canAdmin()) co.kids.push({add:"p", k:"co/+", lv:1, t:L("Проєкт","Проект"), kids: W.projs.length ? [] : [{ghost:1, k:"co/+/g", lv:2, t:L("Воронки","Воронки"), s:L("з’являться всередині проєкту","появятся внутри проекта"), kids:[{ghost:1, k:"co/+/g/g", lv:3, t:L("Канали трафіку","Каналы трафика"), s:"Meta · Google · TikTok · Telegram"}]}]});
  return co;
}
/* учебный пример для экрана до создания компании */
function mapDemoTree(){
  const c = id => { const ch = chOf(id); return {lv:3, ic:id, t:ch[1], s:ch[2]}; };
  const t = {lv:0, t:L("Ваша компанія","Ваша компания"), s:L("команда · спільна база знань","команда · общая база знаний"), kids:[
    {lv:1, t:L("Проєкт «Курс»","Проект «Курс»"), s:L("свій продукт і своя ЦА","свой продукт и своя ЦА"), kids:[
      {lv:2, t:L("Воронка «Вебінар»","Воронка «Вебинар»"), s:L("свій офер і лендинг","свой оффер и лендинг"), kids:[c("meta"), c("gg")]},
      {lv:2, t:L("Воронка «Заявка»","Воронка «Заявка»"), s:L("інший шлях до оплати","другой путь до оплаты"), kids:[c("tt")]}]},
    {lv:1, t:L("Проєкт «Клуб»","Проект «Клуб»"), s:L("інший продукт","другой продукт"), kids:[
      {lv:2, t:L("Воронка «Підписка»","Воронка «Подписка»"), s:L("свої цілі й аналітика","свои цели и аналитика"), kids:[c("tga")]}]}]};
  (function key(n, k){ n.k = k; (n.kids || []).forEach((x, i) => key(x, k + "/" + i)); })(t, "co");
  return t;
}
function mapNode(n, sel){
  const on = sel && (n.k === sel || n.k.indexOf(sel + "/") === 0 || sel.indexOf(n.k + "/") === 0), lv = LEVELS()[n.lv], open = n.can && !n.fold;
  const card = n.ghost ? `<div class="nd nd--ghost"><small class="lv">${lv[0]}</small><b>${n.t}</b><span>${n.s}</span></div>`
    : n.add ? `<button type="button" class="nd nd--add" data-act="mapAdd" data-k="${n.k}" data-what="${n.add}"><b>+ ${n.t}</b></button>`
    : `<button type="button" class="nd nd--l${n.lv}${open ? " nd--can" : ""}${n.k === sel ? " sel" : ""}" data-act="mapSel" data-k="${n.k}" aria-pressed="${n.k === sel}"><small class="lv">${lv[0]}</small><b>${n.ic ? chIcon(n.ic) : ""}${esc(n.t)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ""}${n.fx ? `<span class="fx">${esc(n.fx)}</span>` : ""}${n.m ? `<em${n.warn ? ' class="w"' : ""}>${esc(n.m)}</em>` : ""}</button>`;
  const tog = open ? `<button type="button" class="fold" data-act="mapFold" data-k="${n.k}" aria-expanded="true" aria-label="${L("Згорнути гілку: ","Свернуть ветку: ")}${esc(n.t)}" title="${L("Згорнути гілку","Свернуть ветку")}">−</button>` : "";
  const kids = n.can && n.fold ? `<ul><li class="${sel ? "dim" : ""}"><button type="button" class="nd nd--fold" data-act="mapFold" data-k="${n.k}" aria-expanded="false" aria-label="${L("Розгорнути гілку: ","Развернуть ветку: ")}${esc(n.t)}"><b>${(n.ics || []).map(chIcon).join("")}${n.stub[0]}</b><span>${esc(n.stub[1])}</span><em class="go">${L("розгорнути","развернуть")} →</em></button></li></ul>`
    : n.kids && n.kids.length ? `<ul>${n.kids.map(x => mapNode(x, sel)).join("")}</ul>` : "";
  return `<li class="${sel ? (on ? "on" : "dim") : ""}">${card}${tog}${kids}</li>`;
}
/* кнопки над доской появляются, когда есть что сворачивать */
function mapBar(){ const n = W.projs.reduce((a, p) => a + (p.funnels.length ? 1 : 0) + p.funnels.filter(f => (f.ch || []).length).length, 0); if (n < 2) return "";
  const auto = (mapMany() || W.projs.some(p => p.funnels.length > MAP_FUNS)) && !Object.keys(MP.fold).length;
  return `<div class="row map__bar"><button class="btn btn--sm" data-act="mapFoldAll" data-v="1">${L("Згорнути все","Свернуть всё")}</button><button class="btn btn--sm" data-act="mapFoldAll" data-v="0">${L("Розгорнути все","Развернуть всё")}</button>${auto ? `<span class="sub">${L("Структура велика, тому частину гілок згорнуто. Розгорніть потрібну.","Структура большая, поэтому часть веток свёрнута. Разверните нужную.")}</span>` : ""}</div>`; }
const mapBoard = (tree, sel) => `<div class="map__scroll" tabindex="0" role="group" aria-label="${L("Карта структури","Карта структуры")}"><div class="map__in">
  <div class="map__heads">${LEVELS().map((l, i) => `<div><i>0${i + 1}</i><b>${l[0]}</b></div>`).join("")}</div>
  <ul class="mt">${mapNode(tree, sel)}</ul></div></div>`;
const mapLegend = () => `<div class="panel"><span class="tag">${L("Як читати карту","Как читать карту")}</span>
  <ol class="lvls">${LEVELS().map((l, i) => `<li><i>0${i + 1}</i><div><b>${l[0]}</b><span class="sub">${l[1]}</span></div></li>`).join("")}</ol>
  <p class="sub">${L("Кожен рівень живе всередині попереднього. Цифри зводяться знизу вгору: канал → воронка → проєкт → компанія. Натисніть на картку, щоб побачити її гілку.","Каждый уровень живёт внутри предыдущего. Цифры сводятся снизу вверх: канал → воронка → проект → компания. Нажмите на карточку, чтобы увидеть её ветку.")}</p></div>`;
const lvTag = i => `<span class="tag">${L("Рівень","Уровень")} 0${i + 1} · ${LEVELS()[i][0]}</span>`;
const chOpts = (p, f) => `<div class="opts opts--sm">${CHAN().map(c => `<button type="button" class="opt" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${c[0]}" aria-pressed="${(f.ch || []).includes(c[0])}">${chIcon(c[0])}${c[1]}</button>`).join("")}</div>`;

/* панель под доской: что выбрано и что с этим можно сделать */
function mapInfo(){
  const s = MP.sel; if (!s) return mapLegend();
  const [, pid, fid, cid] = s.split("/"), p = W.projs.find(x => x.id === pid), f = p && p.funnels.find(x => x.id === fid);
  if (pid && !p || fid && !f || cid && !(f.ch || []).includes(cid)) { MP.sel = null; return mapLegend(); }
  if (cid) { const ch = chOf(cid);
    return `<div class="panel">${lvTag(3)}<h2>${ch[1]}</h2><p class="sub">${LEVELS()[3][1]}</p>
      <dl class="kv"><dt>${L("Воронка","Воронка")}</dt><dd>${esc(f.name)}</dd><dt>${L("Проєкт","Проект")}</dt><dd>${esc(p.name)}</dd><dt>${L("Кабінет","Кабинет")}</dt><dd>${p.conn[cid] ? pill("good", L("позначено до підключення","отмечен к подключению")) : pill("warn", L("не підключено","не подключён"))}</dd>${mapFx(p, f, cid) ? `<dt>${L("Реклама","Реклама")}</dt><dd class="mono">${mapFx(p, f, cid)}</dd>` : ""}</dl>
      <p class="sub">${L("Витрати, ліди й оплати цього каналу зводяться у воронку, а воронки — у проєкт.","Расход, лиды и оплаты этого канала сводятся в воронку, а воронки — в проект.")}</p>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="mapConn" data-id="${p.id}">${L("Підключення проєкту","Подключения проекта")}</button><button class="btn btn--sm" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${cid}">${L("Прибрати канал із воронки","Убрать канал из воронки")}</button></div></div>`; }
  if (f) return `<div class="panel">${lvTag(2)}<h2>${esc(f.name)}</h2><p class="sub">${LEVELS()[2][1]}</p>
      <dl class="kv"><dt>${L("Проєкт","Проект")}</dt><dd>${esc(p.name)}</dd><dt>${L("Ціль","Цель")}</dt><dd class="mono">${f.tg.pay} ${L("оплат","оплат")} × ${money(f.tg.check)}</dd><dt>${L("Лендингів","Лендингов")}</dt><dd class="mono">${f.lands.length}</dd><dt>${L("Креативів","Креативов")}</dt><dd class="mono">${f.crs.length}</dd>${mapFx(p, f) ? `<dt>${L("Реклама","Реклама")}</dt><dd class="mono">${mapFx(p, f)}</dd>` : ""}</dl>
      <div class="field"><label>${L("Канали трафіку цієї воронки","Каналы трафика этой воронки")}</label>${chOpts(p, f)}</div>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="mapOpenF" data-p="${p.id}" data-id="${f.id}">${L("Відкрити воронку","Открыть воронку")}</button>${delSure("wsDelF", f.id, "f:" + f.id, L("Видалити воронку","Удалить воронку"), ` data-p="${p.id}"`)}</div></div>`;
  if (p) { const conn = CHAN().filter(c => p.conn[c[0]]).map(c => c[1]);
    return `<div class="panel">${lvTag(1)}<h2>${esc(p.name)}</h2><p class="sub">${LEVELS()[1][1]}</p>
      <dl class="kv"><dt>${L("Воронок","Воронок")}</dt><dd class="mono">${p.funnels.length}</dd><dt>${L("Бюджет на місяць","Бюджет в месяц")}</dt><dd class="mono">${p.tg.budget ? money(p.tg.budget) : "—"}</dd><dt>${L("Сегментів ЦА","Сегментов ЦА")}</dt><dd class="mono">${p.segs.length}</dd><dt>${L("Рекламні кабінети","Рекламные кабинеты")}</dt><dd>${conn.length ? esc(conn.join(", ")) : L("не позначено","не отмечены")}</dd>${mapFx(p) ? `<dt>${L("Реклама","Реклама")}</dt><dd class="mono">${mapFx(p)}</dd>` : ""}</dl>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenP" data-id="${p.id}">${L("Відкрити проєкт","Открыть проект")}</button><button class="btn btn--sm" data-act="mapAdd" data-k="co/${p.id}/+" data-what="f">${L("Додати воронку","Добавить воронку")}</button>${canAdmin() ? delSure("wsDelP", p.id, "p:" + p.id, L("Видалити проєкт","Удалить проект")) : ""}</div></div>`; }
  const nf = W.projs.reduce((a, x) => a + x.funnels.length, 0), nc = W.projs.reduce((a, x) => a + x.funnels.reduce((b, y) => b + (y.ch || []).length, 0), 0);
  return `<div class="panel">${lvTag(0)}<h2>${esc(W.co.name)}</h2><p class="sub">${LEVELS()[0][1]}</p>
      <dl class="kv"><dt>${L("Проєктів","Проектов")}</dt><dd class="mono">${W.projs.length}</dd><dt>${L("Воронок","Воронок")}</dt><dd class="mono">${nf}</dd><dt>${L("Каналів трафіку","Каналов трафика")}</dt><dd class="mono">${nc}</dd>${CLOUD ? `<dt>${L("Людей у команді","Людей в команде")}</dt><dd class="mono">${CL.members.length}</dd>` : ""}</dl>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsCtab" data-v="kb">${L("База знань компанії","База знаний компании")}</button><button class="btn btn--sm" data-act="wsCtab" data-v="team">${L("Команда","Команда")}</button>${canAdmin() ? `<button class="btn btn--sm" data-act="modal" data-id="project">${L("Додати проєкт","Добавить проект")}</button>` : ""}</div></div>`;
}
function mapDemoInfo(){
  const s = MP.demo; if (!s) return `<p class="sub">${L("Це приклад. Натисніть на будь-яку картку — підсвітиться її гілка й з’явиться пояснення рівня. Свою структуру зберете після створення компанії.","Это пример. Нажмите на любую карточку — подсветится её ветка и появится пояснение уровня. Свою структуру соберёте после создания компании.")}</p>`;
  const i = s.split("/").length - 1;
  return `<div class="lvnote"><i>0${i + 1}</i><div><b>${LEVELS()[i][0]}</b><span class="sub">${LEVELS()[i][1]}</span></div></div>`;
}
const vMap = () => `<p class="sub">${L("Уся структура компанії на одній дошці: компанія, її проєкти, воронки кожного проєкту й канали трафіку кожної воронки. Натисніть на картку, щоб побачити її гілку.","Вся структура компании на одной доске: компания, её проекты, воронки каждого проекта и каналы трафика каждой воронки. Нажмите на карточку, чтобы увидеть её ветку.")}</p>
  <div class="map">${mapBar()}${mapBoard(mapTree(), MP.sel)}${mapInfo()}</div>`;
const vMapDemo = () => `<div class="map">${mapBoard(mapDemoTree(), MP.demo)}${mapDemoInfo()}</div>`;

Object.assign(ACT, {
  mapSel(d){ const demo = !W.co, k = demo ? "demo" : "sel"; MP[k] = MP[k] === d.k ? null : d.k;
    setTimeout(() => { const e = [...document.querySelectorAll(".nd[data-k]")].find(x => x.dataset.k === d.k); if (e) e.focus({preventScroll:true}); }, 0); },
  mapAdd(d){ const [, pid, fid] = d.k.split("/");
    if (d.what === "p") return ACT.modal({id:"project"});
    if (d.what === "f") { W.cur = pid; W.fun = null; W.tab = "funnels"; MP.fold["co/" + pid] = false; return ACT.modal({id:"funnel"}); }
    MP.sel = "co/" + pid + "/" + fid; },
  mapCh(d){ const p = W.projs.find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return;
    f.ch = f.ch || []; f.ch = f.ch.includes(d.v) ? f.ch.filter(c => c !== d.v) : CHAN().map(c => c[0]).filter(c => c === d.v || f.ch.includes(c));
    if (!f.ch.includes(d.v) && f.chs) delete f.chs[d.v];
    if (MP.sel && MP.sel.split("/")[3] === d.v && !f.ch.includes(d.v)) MP.sel = "co/" + p.id + "/" + f.id;
    save(); },
  mapFold(d){ const [, pid, fid] = d.k.split("/"), p = W.projs.find(x => x.id === pid); if (!p) return;
    const now = mapFolded(d.k, fid ? p.funnels.length > MAP_FUNS : mapMany()); MP.fold[d.k] = !now;
    setTimeout(() => { const e = [...document.querySelectorAll(now ? ".nd[data-act=mapSel]" : ".nd--fold")].find(x => x.dataset.k === d.k); if (e) e.focus({preventScroll:true}); }, 0); },
  /* «свернуть всё»: при нескольких проектах сворачиваются проекты, при одном — каналы его воронок */
  mapFoldAll(d){ const on = d.v === "1", one = W.projs.length < 2; MP.fold = {};
    W.projs.forEach(p => { MP.fold["co/" + p.id] = on && !one; p.funnels.forEach(f => { MP.fold["co/" + p.id + "/" + f.id] = on && one; }); }); },
  chEven(){ const f = F(); if (!f) return false; f.chs = {}; save(); },
  mapOpenF(d){ W.cur = d.p; W.fun = d.id; W.ftab = "an"; save(); },
  mapConn(d){ W.cur = d.id; W.fun = null; W.tab = "conn"; save(); },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.chs) return; const f = F(); if (!f) return;
  const raw = t.value.trim().replace(",", "."), n = parseFloat(raw); f.chs = f.chs || {};
  if (raw === "") delete f.chs[t.dataset.chs]; else if (n >= 0 && n <= 100) f.chs[t.dataset.chs] = Math.round(n * 10) / 10; else { toast(L("Частка — число від 0 до 100","Доля — число от 0 до 100")); render(); return; }
  save(); render(); });
