/* Хиро в интерфейсе (heyrow-ui/DESIGN.md v2, разделы 6 и 12): панель Хиро над экраном, карточка в меню, кнопка «Хіро на зв’язку».
   Событие дня берётся из того же факта, что «Пульс реклами» (prOf, prJudge): новых расчётов и запросов нет.
   Подключается после pilot.js, перед ws.js. */

/* главное событие по проектам: сводка за период и кампании, где лид дорожчий за стелю */
function hiroEv(only){
  if (typeof prOn !== "function") return null;
  const ps = (only ? [only] : pfProjs()).filter(prOn); if (!ps.length) return {none:true};
  ps.forEach(prLoad);
  if (ps.some(p => !prOf(p).cur && !prOf(p).err)) return {load:true};
  const curs = [...new Set(ps.map(p => prCur(p) || "USD"))], cur = curs.length === 1 ? curs[0] : "USD";
  const s = {spend:0, leads:0}, v = {spend:0, leads:0}, bad = [];
  ps.forEach(p => { const x = prOf(p); if (!x.cur) return;
    x.cur.forEach(o => { s.spend += +o.spend || 0; s.leads += +o.leads || 0; }); x.prev.forEach(o => { v.spend += +o.spend || 0; v.leads += +o.leads || 0; });
    p.funnels.forEach(f => (f.ch || []).forEach(c => { const prev = prRows(p, x.prev, f, c), cap = prCap(f, p);
      prRows(p, x.cur, f, c, x).filter(o => o.spend > 0).forEach(o => { const j = prMain(prJudge(o, prev.find(q => q.id === o.id) || {}, cap, prCur(p)));
        if (j && j.lv === "crit") bad.push({p, f, c, o, j, cap, cpl:o.leads ? o.spend / o.leads : 0}); }); })); });
  bad.sort((a, b) => b.o.spend - a.o.spend);
  const f0 = ps[0].funnels[0], cap = bad[0] ? bad[0].cap : f0 ? prCap(f0, ps[0]) : 0;
  return {s, v, cpl:s.leads ? s.spend / s.leads : 0, pcpl:v.leads ? v.spend / v.leads : 0, cap, cur, bad, ps, err:ps.some(p => prOf(p).err && !prOf(p).cur)};
}
const hiroKey = (b) => "co/" + b.p.id + "/" + b.f.id + "/" + b.c + "/" + prAK(prAccOf(prOf(b.p), b.o.id)) + "/" + b.o.id;
const hiroBtn = (cls, t, attrs, icon) => `<button type="button" class="btn ${cls}" ${attrs}>${icon ? ico(icon) + " " : ""}${t}</button>`;
const hiroPausedOf = ps => { const r = ps.length === 1 && typeof PL !== "undefined" ? PL.st[ps[0].id] : null; return r && r.ok && r.settings && !r.settings.enabled ? ps[0] : null; };

/* что сказать на этом экране: поза, заголовок, фраза, две кнопки, до трёх цифр */
function hiroSay(scr){
  const p = P(), e = hiroEv(p || null), out = {pose:"watch", keys:[]};
  if (scr === "projects" && W.projs.length) { const todo = W.projs.map(x => { const ch = pChain(x); return {x, ch, done:ch.filter(c => c[2]).length}; }).filter(o => o.done < o.ch.length).sort((a, b) => a.done - b.done)[0];
    out.keys = [[L("Проєктів","Проектов"), num(W.projs.length)], [L("Воронок","Воронок"), num(W.projs.reduce((a, x) => a + x.funnels.length, 0))], [L("Кабінетів","Кабинетов"), num(W.projs.filter(x => x.meta && x.meta.conn).length)]];
    if (todo) { out.pose = "idea"; out.title = L("У «" + todo.x.name + "» заповнено " + todo.done + " з " + todo.ch.length, "В «" + todo.x.name + "» заполнено " + todo.done + " из " + todo.ch.length);
      out.text = L("Допиши решту кроків, і я точніше порахую стелю ціни ліда й підберу аудиторії.","Допиши остальные шаги, и я точнее посчитаю потолок цены лида и подберу аудитории.");
      out.main = hiroBtn("btn--main", L("Відкрити проєкт","Открыть проект"), `data-act="wsOpenP" data-id="${todo.x.id}"`); return out; } }
  if (!W.projs.length) { out.pose = "idea"; out.title = L("Почнімо з проєкту","Начнём с проекта"); out.text = L("Додай проєкт на карті й підключи рекламний кабінет, і я почну стежити за рекламою.","Добавь проект на карте и подключи рекламный кабинет, и я начну следить за рекламой.");
    out.main = hiroBtn("btn--main", L("Додати проєкт","Добавить проект"), 'data-act="wsCtab" data-v="map"'); return out; }
  if (!e || e.none) { const q = p || W.projs[0]; out.pose = "idea"; out.title = L("Підключи рекламний кабінет","Подключи рекламный кабинет");
    out.text = L("Тоді я щогодини дивитимусь витрати й ціну ліда і скажу, що виправити.","Тогда я каждый час буду смотреть расход и цену лида и скажу, что исправить.");
    out.main = hiroBtn("btn--main", L("Підключити кабінет","Подключить кабинет"), `data-act="mapConn" data-id="${q.id}"`, "connections"); return out; }
  if (e.load) { out.pose = "work"; out.title = L("Збираю цифри з Meta…","Собираю цифры из Meta…"); out.text = L("Це займе кілька секунд.","Это займёт несколько секунд."); out.load = true; return out; }
  const m = n => prM(n, e.cur), per = prLabel(prRange());
  out.keys = [[L("Витрати · ","Расход · ") + per, m(e.s.spend)], [L("Ліди","Лиды"), num(e.s.leads)], [L("Ціна ліда","Цена лида"), e.cpl ? m(e.cpl) : "—", e.cap && e.cpl > e.cap]];
  const paused = hiroPausedOf(e.ps);
  if (e.bad.length) { const n = e.bad.length, b = e.bad[0];
    out.pose = "stop"; out.title = plural(n, L("кампанія дорожча за стелю","кампания дороже потолка"), L("кампанії дорожчі за стелю","кампании дороже потолка"), L("кампаній дорожчі за стелю","кампаний дороже потолка"));
    out.text = (e.cpl ? L("Ціна ліда ","Цена лида ") + m(e.cpl) + (e.cap ? L(" при стелі "," при потолке ") + m(e.cap) : "") + ". " : "") + L("Найбільше витрачає ","Больше всех тратит ") + b.o.name + (b.cpl ? L(": лід по ",": лид по ") + m(b.cpl) : L(": лідів немає",": лидов нет")) + ".";
    out.main = scr === "today" ? hiroBtn("btn--main", L("Відкрити кампанію","Открыть кампанию"), `data-act="prGo" data-k="${esc(hiroKey(b))}"`) : hiroBtn("btn--main", L("Відкрити рішення","Открыть решения"), 'data-act="wsCtab" data-v="today"');
    out.sec = scr === "map" ? hiroBtn("btn--glass", L("Показати кампанію","Показать кампанию"), `data-act="prGo" data-k="${esc(hiroKey(b))}"`) : hiroBtn("btn--glass", L("Показати на карті","Показать на карте"), `data-act="prGo" data-k="${esc(hiroKey(b))}"`);
    return out; }
  if (paused) { out.pose = "sleep"; out.title = L("Автопілот на паузі","Автопилот на паузе"); out.text = L("Нічого не змінюю в рекламі, лише рахую цифри. Увімкни, і я знову стежитиму щогодини.","Ничего не меняю в рекламе, только считаю цифры. Включи, и я снова буду следить каждый час.");
    out.main = hiroBtn("btn--main", L("Увімкнути автопілот","Включить автопилот"), `data-act="apbToggle" data-p="${paused.id}"`, "autopilot"); return out; }
  if (!e.s.spend) { out.title = L("За цей період показів не було","За этот период показов не было"); out.text = L("Коли реклама запрацює, тут буде головне за день.","Когда реклама заработает, здесь будет главное за день."); return out; }
  const better = e.pcpl && e.cpl && e.cpl < e.pcpl * 0.97;
  out.pose = better ? "win" : "watch";
  out.title = e.s.leads ? L("Все в порядку: " + num(e.s.leads) + " лідів по " + m(e.cpl), "Всё в порядке: " + num(e.s.leads) + " лидов по " + m(e.cpl)) : L("Витрачено " + m(e.s.spend) + ", лідів поки немає", "Потрачено " + m(e.s.spend) + ", лидов пока нет");
  out.text = better ? L("Ліди на " + Math.round((1 - e.cpl / e.pcpl) * 100) + "% дешевші, ніж у минулому періоді.", "Лиды на " + Math.round((1 - e.cpl / e.pcpl) * 100) + "% дешевле, чем в прошлом периоде.") : L("Стежу за кампаніями щогодини. Якщо щось подорожчає, напишу.","Слежу за кампаниями каждый час. Если что-то подорожает, напишу.");
  if (scr !== "ads") out.main = hiroBtn("btn--main", L("Відкрити рекламу","Открыть рекламу"), 'data-act="wsCtab" data-v="ads"');
  return out; }

/* панель Хиро: тёмный градиент, светящаяся линия, Hey-плашка, заголовок, фраза, кнопки, цифры, Хиро в полный рост */
function hiroPanel(scr){ if (!W.user || !W.co) return "";
  const h = hiroSay(scr);
  const keys = h.load ? `<dl class="hp__k">${[0, 1, 2].map(() => '<div><dt><span class="skr skr--d"></span></dt><dd><span class="skr skr--d"></span></dd></div>').join("")}</dl>`
    : h.keys.length ? `<dl class="hp__k">${h.keys.map(k => `<div><dt>${k[0]}</dt><dd${k[2] ? ' class="hot"' : ""}>${k[1]}</dd></div>`).join("")}</dl>` : "";
  return `<section class="hp" aria-label="${L("Хіро: головне зараз","Хиро: главное сейчас")}"><div class="hp__t"><span class="heytag">Hey!</span><h2>${esc(h.title)}</h2>${h.text ? `<p>${esc(h.text)}</p>` : ""}${h.main || h.sec ? `<div class="row">${h.main || ""}${h.sec || ""}</div>` : ""}</div>${keys}<img class="hp__h" src="ui/hiro3d/${h.pose}.webp" alt="" width="210" height="250"></section>`; }

/* карточка Хиро внизу меню */
function hiroRail(){ if (!W.user || !W.co) return ""; const e = hiroEv(null);
  const t = e && e.s && e.s.leads ? L("Сьогодні " + num(e.s.leads) + " лідів по " + prM(e.cpl, e.cur) + ". Спитай мене, що покращити.", "Сегодня " + num(e.s.leads) + " лидов по " + prM(e.cpl, e.cur) + ". Спроси меня, что улучшить.")
    : L("Я стежу за рекламою щогодини. Спитай мене, що покращити.","Я слежу за рекламой каждый час. Спроси меня, что улучшить.");
  return `<div class="hrail"><img src="ui/hiro3d/hey.webp" alt="" width="132" height="150"><b>Hey!</b><span>${esc(t)}</span><button type="button" class="btn btn--glass btn--sm" data-act="hiroAsk">${L("Спитати Хіро","Спросить Хиро")}</button></div>`; }

/* плавающая кнопка «Хіро на зв’язку» */
function hiroChat(){ let b = $("hchat"); const on = !!(W.user && W.co);
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "hchat"; b.className = "hchat"; b.dataset.act = "hiroAsk"; document.body.appendChild(b); }
  b.hidden = !on; b.innerHTML = `<img src="ui/hiro/watch.webp" alt="" width="40" height="40"><span>${L("Хіро на зв’язку","Хиро на связи")}</span>`; }

Object.assign(ACT, {
  /* «Спитати Хіро»: Telegram-бот Хиро, если чат подключён; иначе — лента автопилота на «Сьогодні» */
  async hiroAsk(){ const p = pfProjs().find(x => PL.st[x.id] && PL.st[x.id].ok && PL.st[x.id].settings && (PL.st[x.id].settings.chats || []).length && PL.st[x.id].bot);
    if (p) { const w = window.open("", "_blank"); const r = await plCall({action:"tg_link", project_id:p.id});
      if (r.ok && r.url) { const u = r.url.split("?")[0]; if (w) w.location = u; else location.href = u; return false; } if (w) w.close(); }
    W.cur = null; W.fun = null; W.ctab = "today"; save(); render();
    setTimeout(() => { const el = document.querySelector(".pllog, .plt"); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); }, 60); return false; },
});
