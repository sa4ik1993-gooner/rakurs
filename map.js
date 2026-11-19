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
const MSALE = () => ({web:L("через вебінар","через вебинар"), call:L("через дзвінок","через звонок"), site:L("оплата на сайті","оплата на сайте")});
const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return n + " " + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c); };

/* дерево из настоящих данных компании */
function mapTree(){
  const co = {k:"co", lv:0, t:W.co.name, s:plural(W.projs.length, L("проєкт","проект"), L("проєкти","проекта"), L("проєктів","проектов")) + (CLOUD ? " · " + plural(CL.members.length, L("людина","человек"), L("людини","человека"), L("людей","человек")) : ""), kids:[]};
  W.projs.forEach(p => {
    const pn = {k:"co/" + p.id, lv:1, t:p.name, s:[p.niche, p.geo].filter(Boolean).join(" · "), m:p.tg && p.tg.budget ? L("бюджет ","бюджет ") + money(p.tg.budget) : "", kids:[]};
    p.funnels.forEach(f => {
      const fn = {k:pn.k + "/" + f.id, lv:2, t:f.name, s:MSALE()[p.sale] || "", m:f.tg && f.tg.pay ? L("ціль: ","цель: ") + plural(f.tg.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) : "", kids:[]};
      (f.ch || []).forEach(c => { const ch = chOf(c); fn.kids.push({k:fn.k + "/" + c, lv:3, t:ch[1], s:ch[2], m:p.conn[c] ? L("кабінет відмічено","кабинет отмечен") : L("кабінет не підключено","кабинет не подключён"), warn:!p.conn[c]}); });
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
