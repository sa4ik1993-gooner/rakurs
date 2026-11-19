/* Подсказки в полях: популярные варианты кнопками под полем и список при вводе.
   Подключается перед map.js и ws.js. Значение поля остаётся обычным текстом — своё можно вписать всегда. */
/* [код для названий кампаний, укр, рус, как ещё пишут] */
const GEOL = [
  ["WW","Весь світ","Весь мир","world","worldwide","world wide","global","ww","мир","світ"],
  ["EU","Європа","Европа","europe","eu","єс","ес"],
  ["NA","Північна Америка","Северная Америка","north america","na"],
  ["T1","Англомовні країни","Англоязычные страны","tier 1","tier1","english speaking"],
  ["CIS","СНД","СНГ","cis"],
  ["CAS","Центральна Азія","Центральная Азия","central asia"],
  ["BALT","Балтія","Балтия","baltics","baltic"],
  ["LATAM","Латинська Америка","Латинская Америка","latin america","latam"],
  ["MENA","Близький Схід","Ближний Восток","middle east","mena"],
  ["ASIA","Азія","Азия","asia"],
  ["UA","Україна","Украина","ukraine"],["PL","Польща","Польша","poland"],["DE","Німеччина","Германия","germany"],
  ["US","США","США","usa","united states","america","штати","штаты"],["CA","Канада","Канада","canada"],
  ["GB","Велика Британія","Великобритания","uk","united kingdom","great britain","england","англія","англия"],
  ["KZ","Казахстан","Казахстан","kazakhstan"],["MD","Молдова","Молдова","moldova"],["LT","Литва","Литва","lithuania"],
  ["LV","Латвія","Латвия","latvia"],["EE","Естонія","Эстония","estonia"],["CZ","Чехія","Чехия","czechia","czech republic"],
  ["SK","Словаччина","Словакия","slovakia"],["ES","Іспанія","Испания","spain"],["IT","Італія","Италия","italy"],
  ["FR","Франція","Франция","france"],["PT","Португалія","Португалия","portugal"],["NL","Нідерланди","Нидерланды","netherlands","holland"],
  ["BE","Бельгія","Бельгия","belgium"],["AT","Австрія","Австрия","austria"],["CH","Швейцарія","Швейцария","switzerland"],
  ["IE","Ірландія","Ирландия","ireland"],["SE","Швеція","Швеция","sweden"],["NO","Норвегія","Норвегия","norway"],
  ["DK","Данія","Дания","denmark"],["FI","Фінляндія","Финляндия","finland"],["RO","Румунія","Румыния","romania"],
  ["BG","Болгарія","Болгария","bulgaria"],["HU","Угорщина","Венгрия","hungary"],["GR","Греція","Греция","greece"],
  ["CY","Кіпр","Кипр","cyprus"],["IL","Ізраїль","Израиль","israel"],["GE","Грузія","Грузия","georgia"],
  ["AM","Вірменія","Армения","armenia"],["AZ","Азербайджан","Азербайджан","azerbaijan"],["UZ","Узбекистан","Узбекистан","uzbekistan"],
  ["KG","Киргизстан","Кыргызстан","kyrgyzstan","киргизия"],["TR","Туреччина","Турция","turkey","turkiye"],
  ["AE","ОАЕ","ОАЭ","uae","emirates","dubai","дубай"],["AU","Австралія","Австралия","australia"],
  ["NZ","Нова Зеландія","Новая Зеландия","new zealand"],["IN","Індія","Индия","india"],["BR","Бразилія","Бразилия","brazil"],["MX","Мексика","Мексика","mexico"]];
const geoName = g => L(g[1], g[2]);
const geoFind = s => { const q = String(s || "").trim().toLowerCase(); return q ? GEOL.find(g => g.slice(1).some(n => n.toLowerCase() === q) || g[0].toLowerCase() === q) : null; };
const sgList = (uk, ru) => (lang === "ru" ? ru : uk).map(x => [x]);
/* поля с подсказками: ключ = имя поля в анкете и последняя часть пути в проекте */
const SG = {
  geo: {multi:true, pop:() => ["UA","EU","US","NA","WW","T1"].map(c => geoName(GEOL.find(g => g[0] === c))),
    all:() => GEOL.map(g => [geoName(g), g[0], g.slice(1)])},
  niche: {multi:false, pop:() => (lang === "ru" ? ["онлайн-образование","услуги","товары, e-commerce","IT и SaaS"] : ["онлайн-освіта","послуги","товари, e-commerce","IT і SaaS"]),
    all:() => sgList(["онлайн-освіта","онлайн-школа","інфопродукти","послуги","b2b-послуги","товари, e-commerce","IT і SaaS","мобільні застосунки","ігри","нерухомість","будівництво й ремонт","краса та здоров’я","медицина","фітнес","фінанси","туризм","заходи","ресторани й доставка","авто","дизайн і 3D"],
                     ["онлайн-образование","онлайн-школа","инфопродукты","услуги","b2b-услуги","товары, e-commerce","IT и SaaS","мобильные приложения","игры","недвижимость","строительство и ремонт","красота и здоровье","медицина","фитнес","финансы","туризм","мероприятия","рестораны и доставка","авто","дизайн и 3D"])},
  tone: {multi:true, pop:() => (lang === "ru" ? ["дружелюбный","экспертный","спокойный","без давления","на «ты»","на «вы»"] : ["дружній","експертний","спокійний","без тиску","на «ти»","на «ви»"]),
    all:() => sgList(["дружній","експертний","спокійний","енергійний","з гумором","без тиску","на «ти»","на «ви»","без обіцянок швидкого результату","простими словами"],
                     ["дружелюбный","экспертный","спокойный","энергичный","с юмором","без давления","на «ты»","на «вы»","без обещаний быстрого результата","простыми словами"])},
  ban: {multi:true, pop:() => (lang === "ru" ? ["гарантия результата","быстро и легко","заработок без усилий","«до и после»"] : ["гарантія результату","швидко й легко","заробіток без зусиль","«до і після»"]),
    all:() => sgList(["гарантія результату","швидко й легко","заробіток без зусиль","конкретні суми доходу","«до і після»","100% результат","найкращі на ринку","обіцянки працевлаштування","медичні обіцянки","тиск терміновістю"],
                     ["гарантия результата","быстро и легко","заработок без усилий","конкретные суммы дохода","«до и после»","100% результат","лучшие на рынке","обещания трудоустройства","медицинские обещания","давление срочностью"])},
  worked: {multi:true, pop:() => (lang === "ru" ? ["видео с экспертом","отзывы клиентов","кейсы","бесплатный урок"] : ["відео з експертом","відгуки клієнтів","кейси","безкоштовний урок"]),
    all:() => sgList(["відео з експертом","відгуки клієнтів","кейси","безкоштовний урок","розбір помилок","ролики від клієнтів","закадрове відео процесу","запрошення на вебінар","порівняння «було — стало»","знижка з дедлайном"],
                     ["видео с экспертом","отзывы клиентов","кейсы","бесплатный урок","разбор ошибок","ролики от клиентов","закадровое видео процесса","приглашение на вебинар","сравнение «было — стало»","скидка с дедлайном"])},
};
const sgParts = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
const sgHas = (v, x) => sgParts(v).some(p => p.toLowerCase() === x.toLowerCase());
/* оборачивает готовый <input>: список при вводе и кнопки популярных вариантов */
function sgWrap(k, input, target, id, value){
  const c = SG[k]; if (!c) return input;
  const inp = input.replace("<input ", `<input data-sg="${k}" data-sgt="${target}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" `);
  return `<div class="sgw">${inp}<div class="sg" role="listbox" hidden></div></div>
    <div class="sgc">${c.pop().map(x => `<button type="button" class="sgb" data-act="sgPick" data-k="${k}" data-t="${target}" data-i="${id}" data-v="${esc(x)}" aria-pressed="${c.multi ? sgHas(value, x) : String(value || "").trim().toLowerCase() === x.toLowerCase()}">${esc(x)}</button>`).join("")}</div>`;
}
const SGX = {el:null, i:-1};
const sgBox = el => el && el.parentNode.querySelector(".sg");
function sgClose(){ const b = sgBox(SGX.el); if (b) { b.hidden = true; b.innerHTML = ""; } if (SGX.el) SGX.el.setAttribute("aria-expanded", "false"); SGX.el = null; SGX.i = -1; }
function sgOpen(el){
  const k = el.dataset.sg, c = SG[k], box = sgBox(el); if (!c || !box) return;
  const parts = el.value.split(","), tok = (c.multi ? parts[parts.length - 1] : el.value).trim().toLowerCase(), chosen = c.multi ? parts.slice(0, -1).map(x => x.trim().toLowerCase()) : [];
  if (!tok) { sgClose(); return; }
  const hit = n => { const s = n.toLowerCase(); return s.indexOf(tok) === 0 || s.split(/[\s,\-]+/).some(w => w.indexOf(tok) === 0); };
  const rows = c.all().filter(r => !chosen.includes(r[0].toLowerCase()) && (hit(r[0]) || (r[2] || []).some(hit))).sort((a, b) => (a[0].toLowerCase().indexOf(tok) === 0 ? 0 : 1) - (b[0].toLowerCase().indexOf(tok) === 0 ? 0 : 1)).slice(0, 7);
  if (!rows.length || (rows.length === 1 && rows[0][0].toLowerCase() === tok)) { sgClose(); return; }
  box.innerHTML = rows.map((r, i) => `<button type="button" role="option" tabindex="-1" data-act="sgPick" data-r="1" data-k="${k}" data-t="${el.dataset.sgt}" data-i="${el.id}" data-v="${esc(r[0])}"${i === 0 ? ' class="on"' : ""}><span>${esc(r[0])}</span>${r[1] ? `<small>${r[1]}</small>` : ""}</button>`).join("");
  box.hidden = false; el.setAttribute("aria-expanded", "true"); SGX.el = el; SGX.i = 0;
}
Object.assign(ACT, {
  /* d.t = "ob:<поле анкеты>" или "w:<путь в проекте>"; d.r — выбор из списка заменяет то, что человек начал набирать */
  sgPick(d){ const c = SG[d.k], i = d.t.indexOf(":"), kind = d.t.slice(0, i), key = d.t.slice(i + 1);
    const cur = kind === "ob" ? (S.ob ? S.ob.d[key] : "") : wget(key);
    let next = d.v;
    if (c.multi) { let p = String(cur || "").split(",").map(x => x.trim()); if (d.r) p.pop(); p = p.filter(Boolean);
      next = (p.some(x => x.toLowerCase() === d.v.toLowerCase()) ? (d.r ? p : p.filter(x => x.toLowerCase() !== d.v.toLowerCase())) : p.concat(d.v)).join(", "); }
    else if (!d.r && String(cur || "").trim().toLowerCase() === d.v.toLowerCase()) next = "";
    if (kind === "ob") { if (S.ob) S.ob.d[key] = next; } else wset(key, next);
    sgClose();
    setTimeout(() => { const e = document.getElementById(d.i); if (e) { e.focus({preventScroll:true}); try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) {} } }, 0); },
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.sg) sgOpen(t); });
document.addEventListener("focusout", e => { if (e.target === SGX.el) setTimeout(() => { if (document.activeElement !== SGX.el) sgClose(); }, 150); });
/* нажатие на вариант не должно снимать фокус с поля раньше, чем сработает клик */
document.addEventListener("pointerdown", e => { if (e.target.closest && e.target.closest(".sg")) e.preventDefault(); });
document.addEventListener("keydown", e => {
  if (!SGX.el || e.target !== SGX.el) return; const box = sgBox(SGX.el), items = box ? [...box.children] : []; if (!items.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); SGX.i = (SGX.i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items.forEach((b, i) => b.classList.toggle("on", i === SGX.i)); items[SGX.i].scrollIntoView({block:"nearest"}); }
  else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); items[Math.max(0, SGX.i)].click(); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); sgClose(); }
  else if (e.key === "Tab") sgClose();
}, true);
