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
const MP = {sel:null, demo:null};
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
  if (!n.trim() || st.split(" → ").length < 2) { toast(L("Назвіть шлях і перелічіть хоча б два кроки","Назовите путь и перечислите хотя бы два шага")); return null; }
  return pathAdd(n.trim(), st); }
const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return n + " " + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c); };

/* дерево из настоящих данных компании */
function mapTree(){
  const co = {k:"co", lv:0, t:W.co.name, s:plural(W.projs.length, L("проєкт","проект"), L("проєкти","проекта"), L("проєктів","проектов")) + (CLOUD ? " · " + plural(CL.members.length, L("людина","человек"), L("людини","человека"), L("людей","человек")) : ""), kids:[]};
  W.projs.forEach(p => {
    const pn = {k:"co/" + p.id, lv:1, t:p.name, s:[p.niche, p.geo].filter(Boolean).join(" · "), m:p.tg && p.tg.budget ? L("бюджет ","бюджет ") + money(p.tg.budget) : "", kids:[]};
    p.funnels.forEach(f => {
      const fn = {k:pn.k + "/" + f.id, lv:2, t:f.name, s:saleName(f), m:f.tg && f.tg.pay ? L("ціль: ","цель: ") + plural(f.tg.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) : "", kids:[]};
      (f.ch || []).forEach(c => { const ch = chOf(c); fn.kids.push({k:fn.k + "/" + c, lv:3, t:ch[1], s:ch[2], m:p.conn[c] === 1 ? L("кабінет підключено","кабинет подключён") : p.conn[c] ? L("кабінет відмічено","кабинет отмечен") : L("кабінет не підключено","кабинет не подключён"), warn:!p.conn[c]}); });
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
  const c = id => { const ch = chOf(id); return {lv:3, t:ch[1], s:ch[2]}; };
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
  const on = sel && (n.k === sel || n.k.indexOf(sel + "/") === 0 || sel.indexOf(n.k + "/") === 0), lv = LEVELS()[n.lv];
  const card = n.ghost ? `<div class="nd nd--ghost"><small class="lv">${lv[0]}</small><b>${n.t}</b><span>${n.s}</span></div>`
    : n.add ? `<button type="button" class="nd nd--add" data-act="mapAdd" data-k="${n.k}" data-what="${n.add}"><b>+ ${n.t}</b></button>`
    : `<button type="button" class="nd nd--l${n.lv}${n.k === sel ? " sel" : ""}" data-act="mapSel" data-k="${n.k}" aria-pressed="${n.k === sel}"><small class="lv">${lv[0]}</small><b>${esc(n.t)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ""}${n.m ? `<em${n.warn ? ' class="w"' : ""}>${esc(n.m)}</em>` : ""}</button>`;
  return `<li class="${sel ? (on ? "on" : "dim") : ""}">${card}${n.kids && n.kids.length ? `<ul>${n.kids.map(x => mapNode(x, sel)).join("")}</ul>` : ""}</li>`;
}
const mapBoard = (tree, sel) => `<div class="map__scroll" tabindex="0" role="group" aria-label="${L("Карта структури","Карта структуры")}"><div class="map__in">
  <div class="map__heads">${LEVELS().map((l, i) => `<div><i>0${i + 1}</i><b>${l[0]}</b></div>`).join("")}</div>
  <ul class="mt">${mapNode(tree, sel)}</ul></div></div>`;
const mapLegend = () => `<div class="panel"><span class="tag">${L("Як читати карту","Как читать карту")}</span>
  <ol class="lvls">${LEVELS().map((l, i) => `<li><i>0${i + 1}</i><div><b>${l[0]}</b><span class="sub">${l[1]}</span></div></li>`).join("")}</ol>
  <p class="sub">${L("Кожен рівень живе всередині попереднього. Цифри зводяться знизу вгору: канал → воронка → проєкт → компанія. Натисніть на картку, щоб побачити її гілку.","Каждый уровень живёт внутри предыдущего. Цифры сводятся снизу вверх: канал → воронка → проект → компания. Нажмите на карточку, чтобы увидеть её ветку.")}</p></div>`;
const lvTag = i => `<span class="tag">${L("Рівень","Уровень")} 0${i + 1} · ${LEVELS()[i][0]}</span>`;
const chOpts = (p, f) => `<div class="opts opts--sm">${CHAN().map(c => `<button type="button" class="opt" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${c[0]}" aria-pressed="${(f.ch || []).includes(c[0])}">${c[1]}</button>`).join("")}</div>`;

/* панель под доской: что выбрано и что с этим можно сделать */
function mapInfo(){
  const s = MP.sel; if (!s) return mapLegend();
  const [, pid, fid, cid] = s.split("/"), p = W.projs.find(x => x.id === pid), f = p && p.funnels.find(x => x.id === fid);
  if (pid && !p || fid && !f || cid && !(f.ch || []).includes(cid)) { MP.sel = null; return mapLegend(); }
  if (cid) { const ch = chOf(cid);
    return `<div class="panel">${lvTag(3)}<h2>${ch[1]}</h2><p class="sub">${LEVELS()[3][1]}</p>
      <dl class="kv"><dt>${L("Воронка","Воронка")}</dt><dd>${esc(f.name)}</dd><dt>${L("Проєкт","Проект")}</dt><dd>${esc(p.name)}</dd><dt>${L("Кабінет","Кабинет")}</dt><dd>${p.conn[cid] ? pill("good", L("відмічено до підключення","отмечен к подключению")) : pill("warn", L("не підключено","не подключён"))}</dd></dl>
      <p class="sub">${L("Витрати, ліди й оплати цього каналу зводяться у воронку, а воронки — у проєкт.","Расход, лиды и оплаты этого канала сводятся в воронку, а воронки — в проект.")}</p>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="mapConn" data-id="${p.id}">${L("Підключення проєкту","Подключения проекта")}</button><button class="btn btn--sm" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${cid}">${L("Прибрати канал із воронки","Убрать канал из воронки")}</button></div></div>`; }
  if (f) return `<div class="panel">${lvTag(2)}<h2>${esc(f.name)}</h2><p class="sub">${LEVELS()[2][1]}</p>
      <dl class="kv"><dt>${L("Проєкт","Проект")}</dt><dd>${esc(p.name)}</dd><dt>${L("Ціль","Цель")}</dt><dd class="mono">${f.tg.pay} ${L("оплат","оплат")} × ${money(f.tg.check)}</dd><dt>${L("Лендингів","Лендингов")}</dt><dd class="mono">${f.lands.length}</dd><dt>${L("Креативів","Креативов")}</dt><dd class="mono">${f.crs.length}</dd></dl>
      <div class="field"><label>${L("Канали трафіку цієї воронки","Каналы трафика этой воронки")}</label>${chOpts(p, f)}</div>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="mapOpenF" data-p="${p.id}" data-id="${f.id}">${L("Відкрити воронку","Открыть воронку")}</button></div></div>`;
  if (p) { const conn = CHAN().filter(c => p.conn[c[0]]).map(c => c[1]);
    return `<div class="panel">${lvTag(1)}<h2>${esc(p.name)}</h2><p class="sub">${LEVELS()[1][1]}</p>
      <dl class="kv"><dt>${L("Воронок","Воронок")}</dt><dd class="mono">${p.funnels.length}</dd><dt>${L("Бюджет на місяць","Бюджет в месяц")}</dt><dd class="mono">${p.tg.budget ? money(p.tg.budget) : "—"}</dd><dt>${L("Сегментів ЦА","Сегментов ЦА")}</dt><dd class="mono">${p.segs.length}</dd><dt>${L("Рекламні кабінети","Рекламные кабинеты")}</dt><dd>${conn.length ? esc(conn.join(", ")) : L("не відмічено","не отмечены")}</dd></dl>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenP" data-id="${p.id}">${L("Відкрити проєкт","Открыть проект")}</button><button class="btn btn--sm" data-act="mapAdd" data-k="co/${p.id}/+" data-what="f">${L("Додати воронку","Добавить воронку")}</button></div></div>`; }
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
  <div class="map">${mapBoard(mapTree(), MP.sel)}${mapInfo()}</div>`;
const vMapDemo = () => `<div class="map">${mapBoard(mapDemoTree(), MP.demo)}${mapDemoInfo()}</div>`;

Object.assign(ACT, {
  mapSel(d){ const demo = !W.co, k = demo ? "demo" : "sel"; MP[k] = MP[k] === d.k ? null : d.k;
    setTimeout(() => { const e = [...document.querySelectorAll(".nd[data-k]")].find(x => x.dataset.k === d.k); if (e) e.focus({preventScroll:true}); }, 0); },
  mapAdd(d){ const [, pid, fid] = d.k.split("/");
    if (d.what === "p") return ACT.modal({id:"project"});
    if (d.what === "f") { W.cur = pid; W.fun = null; W.tab = "funnels"; return ACT.modal({id:"funnel"}); }
    MP.sel = "co/" + pid + "/" + fid; },
  mapCh(d){ const p = W.projs.find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return;
    f.ch = f.ch || []; f.ch = f.ch.includes(d.v) ? f.ch.filter(c => c !== d.v) : CHAN().map(c => c[0]).filter(c => c === d.v || f.ch.includes(c));
    if (MP.sel && MP.sel.split("/")[3] === d.v && !f.ch.includes(d.v)) MP.sel = "co/" + p.id + "/" + f.id;
    save(); },
  mapOpenF(d){ W.cur = d.p; W.fun = d.id; W.ftab = "an"; save(); },
  mapConn(d){ W.cur = d.id; W.fun = null; W.tab = "conn"; save(); },
});
