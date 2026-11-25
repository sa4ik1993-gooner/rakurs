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
    x.cur.filter(o => tfRow(p, o)).forEach(o => { s.spend += +o.spend || 0; s.leads += +o.leads || 0; }); x.prev.filter(o => tfRow(p, o)).forEach(o => { v.spend += +o.spend || 0; v.leads += +o.leads || 0; });
    p.funnels.filter(tfF).forEach(f => (f.ch || []).filter(tfC).forEach(c => { const prev = prRows(p, x.prev, f, c), cap = typeof prT === "function" ? prT(f, p) : prCap(f, p);
      prRows(p, x.cur, f, c, x).filter(o => o.spend > 0).forEach(o => { const j = prMain(prJudge(o, prev.find(q => q.id === o.id) || {}, cap, prCur(p)));
        if (j && j.lv === "crit") bad.push({p, f, c, o, j, cap, cpl:o.leads ? o.spend / o.leads : 0}); }); })); });
  bad.sort((a, b) => b.o.spend - a.o.spend);
  const f0 = ps[0].funnels.find(tfF) || ps[0].funnels[0], cap = bad[0] ? bad[0].cap : f0 ? prT(f0, ps[0]) : 0;
  return {s, v, cpl:s.leads ? s.spend / s.leads : 0, pcpl:v.leads ? v.spend / v.leads : 0, cap, cur, bad, ps, err:ps.some(p => prOf(p).err && !prOf(p).cur)};
}
const hiroKey = (b) => "co/" + b.p.id + "/" + b.f.id + "/" + b.c + "/" + prAK(prAccOf(prOf(b.p), b.o.id)) + "/" + b.o.id;
const hiroBtn = (cls, t, attrs, icon) => `<button type="button" class="btn ${cls}" ${attrs}>${icon ? ico(icon) + " " : ""}${t}</button>`;
const hiroPausedOf = ps => { const r = ps.length === 1 && typeof PL !== "undefined" ? PL.st[ps[0].id] : null; return r && r.ok && r.settings && !r.settings.enabled ? ps[0] : null; };

/* главное в разделе проекта, воронки или компании: из данных этого раздела */
function hiroSection(scr){ const p = P(), f = F(), m = n => prM(n, "USD"), out = {pose:"watch", keys:[]};
  const [lvl, tab] = scr.split(":");
  if (lvl === "p" && p) { const ch = pChain(p), done = ch.filter(c => c[2]).length, step = ch.find(c => c[0] === tab), next = ch.find(c => !c[2]);
    const nextBtn = next && next[0] !== tab ? hiroBtn("btn--glass", L("Наступний крок: ","Следующий шаг: ") + next[1], `data-act="wsTab" data-v="${next[0]}"`) : "";
    out.keys = [[L("Заповнено","Заполнено"), done + " / " + ch.length]];
    if (tab === "about") { out.keys.push([L("Ніша","Ниша"), esc(p.niche || "—")], [L("Гео","Гео"), esc(p.geo || "—")]);
      if (step && step[2]) { out.title = L("Опис «" + p.name + "» заповнено", "Описание «" + p.name + "» заполнено"); out.text = L("З нього я беру тексти реклами й підбираю аудиторії.","Из него я беру тексты рекламы и подбираю аудитории."); out.sec = nextBtn; }
      else { out.pose = "idea"; out.title = L("Опиши, що продаєш і кому","Опиши, что продаешь и кому"); out.text = L("З опису я пишу тексти реклами й підбираю аудиторії. Можу заповнити сам із сайту.","Из описания я пишу тексты рекламы и подбираю аудитории. Могу заполнить сам с сайта.");
        out.main = hiroBtn("btn--main", L("Заповнити самі","Заполнить сами"), 'data-act="abFill"'); } return out; }
    if (tab === "aud") { const n = p.segs.length; out.keys.push([L("Сегментів","Сегментов"), num(n)]);
      out.title = n ? plural(n, L("сегмент ЦА","сегмент ЦА"), L("сегменти ЦА","сегмента ЦА"), L("сегментів ЦА","сегментов ЦА")) : L("Додай хоча б один сегмент ЦА","Добавь хотя бы один сегмент ЦА");
      out.pose = n ? "watch" : "idea"; out.text = L("Сегменти задають, кому й що я кажу в рекламі. Вони успадковуються всіма воронками.","Сегменты задают, кому и что я говорю в рекламе. Их наследуют все воронки."); out.sec = n ? nextBtn : ""; return out; }
    if (tab === "kb") { const n = p.kb.length, inh = kbInh(p).length; out.keys.push([L("Матеріалів","Материалов"), num(n)], [L("З компанії","Из компании"), num(inh)]);
      out.title = n + inh ? L("У базі " + (n + inh) + " матеріалів", "В базе " + (n + inh) + " материалов") : L("Додай матеріали: сайт, кейси, відгуки","Добавь материалы: сайт, кейсы, отзывы");
      out.pose = n + inh ? "watch" : "idea"; out.text = L("З них я беру факти для текстів і відповідей. Що більше реальних кейсів, то сильніші оголошення.","Из них я беру факты для текстов и ответов. Чем больше реальных кейсов, тем сильнее объявления."); out.sec = n + inh ? nextBtn : ""; return out; }
    if (tab === "goals") { const t = pT(p), cap = t.cap, e = hiroEv(p);
      out.keys = [[L("Бюджет на місяць","Бюджет в месяц"), m(p.tg.budget || 0)], [L("Чек","Чек"), m(p.tg.check || 0)], [L("Гранична ціна","Потолок лида"), cap ? m(cap) : "—", e && e.cpl && cap && e.cpl > cap]];
      if (e && e.cpl && cap && e.cpl > cap) { out.pose = "stop"; out.title = L("Лід " + m(e.cpl) + " дорожчий за стелю " + m(cap), "Лид " + m(e.cpl) + " дороже потолка " + m(cap));
        out.text = L("За такої ціни реклама не окупиться першою оплатою. Подивись рішення на сьогодні.","При такой цене реклама не окупится первой оплатой. Посмотри решения на сегодня."); out.main = hiroBtn("btn--main", L("Відкрити рішення","Открыть решения"), 'data-act="wsCtab" data-v="today"'); }
      else if (cap) { out.title = L("Ціль: лід до " + m(cap), "Цель: лид до " + m(cap)); out.text = e && e.cpl ? L("Зараз лід по " + m(e.cpl) + ", у межах стелі.","Сейчас лид по " + m(e.cpl) + ", в пределах потолка.") : L("Граничну ціну ліда рахую з чека, конверсій і частки маркетингу.","Потолок считаю из чека, конверсий и доли маркетинга."); }
      else { out.pose = "idea"; out.title = L("Задай бюджет і чек","Задай бюджет и чек"); out.text = L("Тоді я порахую граничну ціну ліда й підкажу, коли реклама не окупається.","Тогда я посчитаю потолок цены лида и подскажу, когда реклама не окупается."); }
      return out; }
    if (tab === "funnels") { const n = p.funnels.length, wc = p.funnels.filter(x => (x.ch || []).length).length; out.keys.push([L("Воронок","Воронок"), num(n)], [L("З каналами","С каналами"), num(wc)]);
      out.title = n ? plural(n, L("воронка","воронка"), L("воронки","воронки"), L("воронок","воронок")) + (wc < n ? L(", без каналів: ",", без каналов: ") + (n - wc) : "") : L("Створи першу воронку","Создай первую воронку");
      out.pose = n && wc === n ? "watch" : "idea"; out.text = L("Воронка — це один офер з ціною. У неї свої канали, креативи й цілі.","Воронка — это один оффер с ценой. У нее свои каналы, креативы и цели.");
      if (n) out.main = hiroBtn("btn--main", L("Відкрити «","Открыть «") + p.funnels[0].name + "»", `data-act="wsOpenF" data-id="${p.funnels[0].id}"`); return out; }
    if (tab === "conn") { const c = p.meta && p.meta.conn, acc = c ? (c.accounts || []).length || 1 : 0; out.keys.push([L("Акаунтів Meta","Аккаунтов Meta"), num(acc)]);
      if (c) { out.title = L("Meta Ads підключено","Meta Ads подключен"); out.text = L("Щогодини читаю витрати, ліди й статус навчання груп.","Каждый час читаю расход, лиды и статус обучения групп."); out.sec = nextBtn; }
      else { out.pose = "idea"; out.title = L("Підключи рекламний кабінет","Подключи рекламный кабинет"); out.text = L("Без нього я не бачу цифр і не можу вести рекламу.","Без него я не вижу цифр и не могу вести рекламу."); } return out; }
    if (tab === "exp") { const n = (p.exp || []).length; out.keys.push([L("Тестів","Тестов"), num(n)]);
      out.title = n ? L("У журналі " + n + " тестів","В журнале " + n + " тестов") : L("Запиши перший тест","Запиши первый тест"); out.pose = n ? "watch" : "idea";
      out.text = L("Журнал тестів показує, що вже пробували й що з цього вийшло. Я не пропоную те, що вже не спрацювало.","Журнал тестов показывает, что уже пробовали и что из этого вышло. Я не предлагаю то, что уже не сработало."); return out; }
    return null; }
  if (lvl === "f" && f && p) { const ch = fChain(f, p), hasConn = Object.values(p.conn || {}).some(Boolean), t = fT(f, p);
    if (tab === "launch") { const ready = [[L("офер і ціна","оффер и цена"), ch[0][2]], [L("сегмент ЦА","сегмент ЦА"), ch[1][2]], [L("лендинг","лендинг"), ch[2][2]], [L("три креативи","три креатива"), ch[3][2]], [L("цілі","цели"), ch[4][2]], [L("кабінет","кабинет"), hasConn]], rd = ready.filter(r => r[1]).length, miss = ready.filter(r => !r[1]).map(r => r[0]);
      out.keys = [[L("Готовність","Готовность"), rd + " / " + ready.length], [L("Ціна","Цена"), m(f.tg.check || 0)], [L("Гранична ціна","Потолок лида"), t.cap ? m(t.cap) : "—"]];
      out.pose = miss.length ? "idea" : "watch"; out.title = miss.length ? L("До запуску не вистачає " + miss.length + " з " + ready.length, "До запуска не хватает " + miss.length + " из " + ready.length) : L("Воронка готова до запуску","Воронка готова к запуску");
      out.text = miss.length ? L("Додай: ","Добавь: ") + miss.join(", ") + "." : L("Зберу кампанію вимкненою, ти перевіриш і ввімкнеш.","Соберу кампанию выключенной, ты проверишь и включишь.");
      out.main = hiroBtn("btn--main", L("Зібрати кампанію в Meta","Собрать кампанию в Meta"), `data-act="bdOpen" data-id="${f.id}"`, "launch"); return out; }
    if (tab === "set") { const miss = [[L("офер","оффер"), !!(f.an && f.an.offer)], [L("ціна","цена"), !!f.tg.check], [L("канали","каналы"), (f.ch || []).length > 0]].filter(x => !x[1]).map(x => x[0]);
      out.keys = [[L("Ціна","Цена"), m(f.tg.check || 0)], [L("Каналів","Каналов"), num((f.ch || []).length)], [L("Гранична ціна","Потолок лида"), t.cap ? m(t.cap) : "—"]];
      out.pose = miss.length ? "idea" : "watch"; out.title = miss.length ? L("Заповни: ","Заполни: ") + miss.join(", ") : L("Налаштування «" + f.name + "» заповнені","Настройки «" + f.name + "» заполнены");
      out.text = L("З цих полів я рахую граничну ціну ліда й пишу тексти реклами для воронки.","Из этих полей я считаю потолок цены лида и пишу тексты рекламы для воронки."); return out; }
    return null; }
  if (lvl === "c") {
    if (tab === "kb") { const n = (W.co.kb || []).length; out.keys = [[L("Матеріалів","Материалов"), num(n)], [L("Проєктів","Проектов"), num(W.projs.length)]];
      out.pose = n ? "watch" : "idea"; out.title = n ? L("У базі компанії " + n + " матеріалів","В базе компании " + n + " материалов") : L("Додай айдентику, правила й кейси компанії","Добавь айдентику, правила и кейсы компании");
      out.text = L("Ці матеріали успадковують усі проєкти. Я беру з них голос бренду й факти.","Эти материалы наследуют все проекты. Я беру из них голос бренда и факты."); return out; }
    if (tab === "team") { const n = Math.max(1, typeof CL !== "undefined" && CL.members ? CL.members.length : 1); out.keys = [[L("Людей","Людей"), num(n)]];
      out.title = L("У команді " + n + (n === 1 ? " людина" : " людей"), "В команде " + n + (n === 1 ? " человек" : " человек")); out.pose = n > 1 ? "watch" : "idea";
      out.text = L("Запроси таргетолога чи менеджера: кожен бачить лише свої проєкти, а пропозиції Хіро приходять тим, хто вирішує.","Пригласи таргетолога или менеджера: каждый видит только свои проекты, а предложения Хиро приходят тем, кто решает."); return out; }
    if (tab === "set") { out.title = L("Налаштування компанії","Настройки компании"); out.text = L("Мова, режим Lite чи Pro і період за замовчуванням. Зміни діють для всіх проєктів.","Язык, режим Lite или Pro и период по умолчанию. Изменения действуют для всех проектов."); out.keys = [[L("Проєктів","Проектов"), num(W.projs.length)]]; return out; }
    if (tab === "me") { out.title = L("Привіт, ","Привет, ") + (ME.name || (W.user && W.user.name) || L("колего","коллега")); out.text = L("Тут твоє ім’я, посада й період, який я показую за замовчуванням.","Здесь твое имя, должность и период, который я показываю по умолчанию."); return out; }
    return null; }
  return null; }

/* что сказать на этом экране: поза, заголовок, фраза, две кнопки, до трёх цифр */
const HIRO_W = {t0:0, tm:0};
function hiroSay(scr){
  const sec = scr.indexOf(":") > 0 ? hiroSection(scr) : null; if (sec) return sec;
  const p = P(), e = hiroEv(p || null), out = {pose:"watch", keys:[]};
  if (scr === "projects" && W.projs.length) { const todo = W.projs.map(x => { const ch = pChain(x); return {x, ch, done:ch.filter(c => c[2]).length}; }).filter(o => o.done < o.ch.length).sort((a, b) => a.done - b.done)[0];
    out.keys = [[L("Проєктів","Проектов"), num(W.projs.length)], [L("Воронок","Воронок"), num(W.projs.reduce((a, x) => a + x.funnels.length, 0))], [L("Кабінетів","Кабинетов"), num(W.projs.filter(x => x.meta && x.meta.conn).length)]];
    if (todo) { out.pose = "idea"; out.title = L("У «" + todo.x.name + "» заповнено " + todo.done + " з " + todo.ch.length, "В «" + todo.x.name + "» заполнено " + todo.done + " из " + todo.ch.length);
      out.text = L("Допиши решту кроків, і я точніше порахую граничну ціну ліда й підберу аудиторії.","Допиши остальные шаги, и я точнее посчитаю потолок цены лида и подберу аудитории.");
      out.main = hiroBtn("btn--main", L("Відкрити проєкт","Открыть проект"), `data-act="wsOpenP" data-id="${todo.x.id}"`); return out; } }
  if (!W.projs.length) { out.pose = "idea"; out.title = L("Почнімо з проєкту","Начнем с проекта"); out.text = L("Додай проєкт на карті й підключи рекламний кабінет, і я почну стежити за рекламою.","Добавь проект на карте и подключи рекламный кабинет, и я начну следить за рекламой.");
    out.main = hiroBtn("btn--main", L("Додати проєкт","Добавить проект"), 'data-act="wsCtab" data-v="map"'); return out; }
  if (!e || e.none) { const q = p || W.projs[0]; out.pose = "idea"; out.title = L("Підключи рекламний кабінет","Подключи рекламный кабинет");
    out.text = L("Тоді я щогодини дивитимусь витрати й ціну ліда і скажу, що виправити.","Тогда я каждый час буду смотреть расход и цену лида и скажу, что исправить.");
    out.main = hiroBtn("btn--main", L("Підключити кабінет","Подключить кабинет"), `data-act="mapConn" data-id="${q.id}"`, "connections"); return out; }
  if (e.load) { out.pose = "work"; out.title = L("Збираю цифри з Meta…","Собираю цифры из Meta…"); out.text = L("Це займе кілька секунд.","Это займет несколько секунд."); out.load = true; return out; }
  /* баннер не перескакивает по ходу загрузки (Дмитрий, 24.11.2026): ждем настройки автопилота и разбор воронок — до 8 секунд, потом один итог */
  if (typeof PL !== "undefined" && typeof plLoad === "function" && CLOUD) { const wait = e.ps.filter(p => { const st = PL.st[p.id]; if (!st) { plLoad(p); return true; }
      const T = st.settings ? Number(st.settings.target_cpl) || 0 : 0; if (!T || typeof plAcctLoad !== "function" || typeof PLA === "undefined" || !sb) return false; if (!PLA[p.id]) plAcctLoad(p); return !PLA[p.id] || PLA[p.id].load; });
    if (wait.length) { HIRO_W.t0 = HIRO_W.t0 || Date.now(); if (Date.now() - HIRO_W.t0 < 8000) { if (!HIRO_W.tm) HIRO_W.tm = setTimeout(() => { HIRO_W.tm = 0; render(); }, 8100);
      out.pose = "work"; out.title = L("Збираю цифри з Meta…","Собираю цифры из Meta…"); out.text = L("Це займе кілька секунд.","Это займет несколько секунд."); out.load = true; return out; } } }
  const m = n => prM(n, e.cur), per = prLabel(prRange());
  out.keys = [[L("Витрати · ","Расход · ") + per, m(e.s.spend)], [L("Ліди","Лиды"), num(e.s.leads)], [L("Ціна ліда","Цена лида"), e.cpl ? m(e.cpl) : "—", e.cap && e.cpl > e.cap]];
  const paused = hiroPausedOf(e.ps);
  if (e.bad.length) { const n = e.bad.length, b = e.bad[0];
    out.pose = "stop"; out.title = plural(n, L("кампанія дорожча за граничну ціну","кампания дороже потолка"), L("кампанії дорожчі за граничну ціну","кампании дороже потолка"), L("кампаній дорожчі за граничну ціну","кампаний дороже потолка"));
    out.text = (e.cpl ? L("Ціна ліда ","Цена лида ") + m(e.cpl) + (e.cap ? L(" за граничної ціни "," при потолке ") + m(e.cap) : "") + ". " : "") + L("Найбільше витрачає ","Больше всех тратит ") + b.o.name + (b.cpl ? L(": лід за ",": лид по ") + m(b.cpl) : L(": лідів немає",": лидов нет")) + ".";
    /* на «Сегодня» решение раскрывается тут же, в списке ниже, без перехода на карту */
    out.main = scr === "today" ? hiroBtn("btn--main", L("Відкрити рішення","Открыть решение"), `data-act="tdOpen" data-k="${esc(hiroKey(b))}"`) : hiroBtn("btn--main", L("Відкрити рішення","Открыть решения"), 'data-act="wsCtab" data-v="today"');
    out.sec = scr === "today" ? "" : scr === "map" ? hiroBtn("btn--glass", L("Показати кампанію","Показать кампанию"), `data-act="prGo" data-k="${esc(hiroKey(b))}"`) : hiroBtn("btn--glass", L("Показати на карті","Показать на карте"), `data-act="prGo" data-k="${esc(hiroKey(b))}"`);
    return out; }
  if (paused) { out.pose = "sleep"; out.title = L("Автопілот на паузі","Автопилот на паузе"); out.text = L("Нічого не змінюю в рекламі, лише рахую цифри. Увімкни, і я знову стежитиму щогодини.","Ничего не меняю в рекламе, только считаю цифры. Включи, и я снова буду следить каждый час.");
    out.main = hiroBtn("btn--main", L("Увімкнути автопілот","Включить автопилот"), `data-act="apbToggle" data-p="${paused.id}"`, "autopilot"); return out; }
  if (!e.s.spend) { out.title = L("За цей період показів не було","За этот период показов не было"); out.text = L("Коли реклама запрацює, тут буде головне за день.","Когда реклама заработает, здесь будет главное за день."); return out; }
  /* дорого по воронке целиком (разбор в ленте Хиро) — не «всё в порядке» */
  const acc = typeof plAcctAll === "function" ? e.ps.map(p => plAcctAll(p)).flat().filter(A => typeof tfAcct !== "function" || tfAcct(A))[0] : null; /* A1: только воронка из фильтра «Сьогодні» */
  if (acc && acc.now && acc.now.ok && acc.now.better) { out.pose = "watch"; out.title = L("Сьогодні дешевше у воронці «","Сегодня дешевле в воронке «") + acc.f.name + "»"; out.text = acc.now.txt;
    out.main = scr === "today" ? hiroBtn("btn--main", L("Відкрити розбір","Открыть разбор"), 'data-act="hiroAcct"') : hiroBtn("btn--main", L("Відкрити розбір","Открыть разбор"), 'data-act="wsCtab" data-v="today"'); return out; }
  if (acc) { out.pose = "stop"; out.title = L("Дорого у воронці «","Дорого в воронке «") + acc.f.name + "»";
    out.text = (typeof plDM === "function" ? L("За 3 повні дні (","За 3 полных дня (") + plDM(plD(-3)) + "–" + plDM(plD(-1)) + L(", без сьогодні) ",", без сегодня) ") : L("За 3 повні дні ","За 3 полных дня ")) + acc.t3.l + L(" лідів за "," лидов по ") + m(acc.t3.s / acc.t3.l) + L(" при цілі "," при цели ") + m(acc.T) + L(". Розібрав, що саме дорожчає, і що зробити.",". Разобрал, что именно дорожает, и что сделать.");
    out.main = scr === "today" ? hiroBtn("btn--main", L("Відкрити розбір","Открыть разбор"), 'data-act="hiroAcct"') : hiroBtn("btn--main", L("Відкрити розбір","Открыть разбор"), 'data-act="wsCtab" data-v="today"'); return out; }
  /* дорожче цілі, але даних ще замало для висновку — так і кажемо, без «все в порядку» */
  const tgt = e.ps.map(p => { const st = typeof PL !== "undefined" ? PL.st[p.id] : null; return st && st.settings ? Number(st.settings.target_cpl) || 0 : 0; }).find(x => x > 0) || e.cap;
  if (tgt && (e.cpl > tgt * 1.1 || (!e.s.leads && e.s.spend > tgt * 2))) { out.pose = "watch";
    out.title = e.s.leads ? L("Лід ","Лид ") + m(e.cpl) + L(" — дорожче за ціль "," — дороже цели ") + m(tgt) : L("Витрачено ","Потрачено ") + m(e.s.spend) + L(", лідів поки немає",", лидов пока нет");
    out.text = L("Цифри дня попередні: Meta дораховує ліди до 3 днів. Окремо жодна кампанія ще не «точно погана» — рішення ухвалюю за 3 дні, а не за сьогодні.","Цифры дня предварительные: Meta досчитывает лиды до 3 дней. По отдельности ни одна кампания еще не «точно плохая» — решение принимаю по 3 дням, а не по сегодня.");
    if (scr !== "ads") out.main = hiroBtn("btn--main", L("Відкрити рекламу","Открыть рекламу"), 'data-act="wsCtab" data-v="ads"'); return out; }
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
  /* B1: «Сьогодні» — только когда выбран период «сьогодні»; иначе — период с датами */
  const per = typeof PR !== "undefined" && PR.mode === "t" ? L("Сьогодні ","Сегодня ") : L("За ","За ") + prLabel(prRange()) + ": ";
  const t = e && e.s && e.s.leads ? per + plural(e.s.leads, L("лід","лид"), L("ліди","лида"), L("лідів","лидов")) + L(" за "," по ") + prM(e.cpl, e.cur) + L(". Спитай мене, що покращити.",". Спроси меня, что улучшить.")
    : L("Я стежу за рекламою щогодини. Спитай мене, що покращити.","Я слежу за рекламой каждый час. Спроси меня, что улучшить.");
  return `<div class="hrail"><img src="ui/hiro3d/hey.webp" alt="" width="132" height="150"><b>Hey!</b><span>${esc(t)}</span><button type="button" class="btn btn--glass btn--sm" data-act="hiroAsk">${L("Спитати Хіро","Спросить Хиро")}</button></div>`; }

/* плавающая кнопка «Хіро на зв’язку» */
function hiroChat(){ let b = $("hchat"); const on = !!(W.user && W.co);
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "hchat"; b.className = "hchat"; b.dataset.act = "hiroAsk"; document.body.appendChild(b); }
  b.hidden = !on; b.innerHTML = `<img src="ui/hiro/watch.webp" alt="" width="40" height="40"><span>${L("Хіро на зв’язку","Хиро на связи")}</span>`; }

Object.assign(ACT, {
  /* кнопка «Відкрити розбір»: прокрутить к карточке «Дорого у воронці» в ленте */
  hiroAcct(){ if (typeof PL !== "undefined") (W.projs || []).forEach(p => { PL.tab[p.id] = "new"; }); render(); requestAnimationFrame(() => { const el = document.querySelector(".plc--acct"); if (el) { el.scrollIntoView({behavior:"smooth", block:"center"}); el.classList.add("is-hl"); setTimeout(() => el.classList.remove("is-hl"), 1600); } }); return false; },
  /* «Спитати Хіро»: Telegram-бот Хиро, если чат подключён; иначе — лента автопилота на «Сьогодні» */
  async hiroAsk(){ const p = pfProjs().find(x => PL.st[x.id] && PL.st[x.id].ok && PL.st[x.id].settings && (PL.st[x.id].settings.chats || []).length && PL.st[x.id].bot);
    if (p) { const w = window.open("", "_blank"); const r = await plCall({action:"tg_link", project_id:p.id});
      if (r.ok && r.url) { const u = r.url.split("?")[0]; if (w) w.location = u; else location.href = u; return false; } if (w) w.close(); }
    W.cur = null; W.fun = null; W.ctab = "today"; save(); render();
    setTimeout(() => { const el = document.querySelector(".pllog, .plt"); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); }, 60); return false; },
});
