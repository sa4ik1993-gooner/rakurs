/* Карта структуры: Компания → Проект → Воронка → Канал трафика.
   Интерактивная доска: клик по карточке подсвечивает её ветку и показывает, что живёт на этом уровне.
   Подключается перед ws.js. */
const CHAN = () => [["meta","Meta Ads","Facebook · Instagram"],["gg","Google Ads",L("пошук · YouTube","поиск · YouTube")],["tt","TikTok Ads","TikTok"],["tga","Telegram Ads",L("канали й боти","каналы и боты")]];
const chOf = id => CHAN().find(c => c[0] === id) || [id, id, ""];
const LEVELS = () => [
  [L("Компанія","Компания"), L("Назва, команда й ролі, спільна база знань: айдентика, правила, кейси.","Название, команда и роли, общая база знаний: айдентика, правила, кейсы.")],
  [L("Проєкт","Проект"), L("Окремий продукт: опис, ЦА, своя база знань, цілі й бюджет, підключені кабінети.","Отдельный продукт: описание, ЦА, своя база знаний, цели и бюджет, подключённые кабинеты.")],
  [L("Воронка","Воронка"), L("Шлях до оплати: офер і анамнез, правки ЦА, лендинги, креативи, цілі й аналітика.","Путь до оплаты: оффер и анамнез, правки ЦА, лендинги, креативы, цели и аналитика.")],
  [L("Канал трафіку","Канал трафика"), L("Звідки йдуть люди: рекламний кабінет, кампанії, бюджет каналу, UTM-мітки.","Откуда идут люди: рекламный кабинет, кампании, бюджет канала, UTM-метки.")],
  [L("Акаунт","Аккаунт"), L("Рекламний акаунт каналу: п’ять головних цифр за період — витрати, ліди, ціна ліда, CTR, оплати — і висновок.","Рекламный аккаунт канала: пять главных цифр за период — расход, лиды, цена лида, CTR, оплаты — и вывод.")],
  [L("Кампанія","Кампания"), L("Кампанія в кабінеті: факт за період, групи, оголошення й висновок — що відбувається і що зробити.","Кампания в кабинете: факт за период, группы, объявления и вывод — что происходит и что сделать.")]];
const MP = {sel:null, demo:null, fold:{}};
/* знаки рекламных площадок — официальные (simple-icons 13.21.0, CC0; Google — четырёхцветный G из брендбука Google), в цветах площадок.
   Единственное место с чужими цветами (heyrow-ui/DESIGN.md п. 6 «Каналы трафика»). Сами знаки не перерисовываются. */
const CHI = {
  meta:'<path fill="var(--ch-meta)" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"/>',
  gg:'<g transform="scale(.5)"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></g>',
  tt:'<path fill="var(--ch-tiktok-cyan)" transform="translate(-.7 -.7)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="var(--ch-tiktok-pink)" transform="translate(.7 .7)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="var(--ch-tiktok)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  tga:'<path fill="var(--ch-telegram)" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>'};
const chIcon = id => CHI[id] ? `<svg class="chi" viewBox="0 0 24 24" width="18" height="18" role="img" aria-label="${esc(chOf(id)[1])}">${CHI[id]}</svg>` : "";
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
  <p class="sub w">${L("Шлях збережеться в компанії й з’явиться у списку для наступних воронок. Після перевірки він потрапляє в загальну бібліотеку для інших користувачів — без твоїх даних, лише назва й кроки.","Путь сохранится в компании и появится в списке для следующих воронок. После проверки он попадает в общую библиотеку для других пользователей — без твоих данных, только название и шаги.")}</p></div>`;
/* сохраняет свой путь: в компании (если есть право) и кандидатом в общую библиотеку */
function pathAdd(name, steps){ const x = {id:"c_" + uid(), name, steps};
  if (canAdmin() && W.co) { W.co.paths = W.co.paths || []; W.co.paths.push(x); }
  if (CLOUD) cloudLibAdd("sale_path", x); return x; }
function pathRead(pre){ const n = (document.getElementById(pre + "-pname") || {}).value || "", st = stepsNorm((document.getElementById(pre + "-psteps") || {}).value);
  if (!n.trim() || st.split(" → ").length < 2) { fieldErr(pre + (n.trim() ? "-psteps" : "-pname"), n.trim() ? L("Перелічи хоча б два кроки через кому","Перечисли хотя бы два шага через запятую") : L("Назви шлях","Назови путь")); return null; }
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
    : `${empty(L("У воронки немає каналів трафіку","У воронки нет каналов трафика"), L("Познач канали — план розкладеться за ними.","Отметь каналы — план разложится по ним."))}${chOpts(p, f)}`}`; }
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
      ${none.n ? row(L("Канал не обрано","Канал не выбран"), none, pill("warn", L("розподіли у воронці","распредели в воронке"))) : ""}</tbody></table></div>
    <p class="sub">${L("Цифри зводяться знизу вгору: частки каналів задаються у воронці, тут — сума за всіма воронками проєкту.","Цифры сводятся снизу вверх: доли каналов задаются в воронке, здесь — сумма по всем воронкам проекта.")}</p></div>`; }

/* Факт на карте: расход и лиды за 7 дней из статистики, уже собранной на сервере.
   Только чтение: к рекламному кабинету карта не обращается, свежесть данных — забота блока «Факт рекламы» и ночного обновления. */
const MFX = {};
const mapFxOn = p => CLOUD && p.meta && p.meta.conn;
function mapFactLoad(){ W.projs.forEach(prLoad); }
const mapFxRows = p => (prOn(p) && prOf(p).cur) || null;
const mapFxCur = p => (p.meta.conn.account || {}).currency || "";
const mapFxSum = rows => rows.reduce((a, r) => { a.spend += r.spend; a.leads += r.leads; return a; }, {spend:0, leads:0});
function mapFxText(s, cur){ if (!s.spend && !s.leads) return "";
  const usd = !cur || cur === "USD", m = (v, f) => usd ? (f(v) + " $") : f(v) + " " + cur;
  return prShort() + ": " + m(s.spend, num) + " · " + (s.leads ? plural(s.leads, L("лід","лид"), L("ліди","лида"), L("лідів","лидов")) + L(" по "," по ") + m(s.spend / s.leads, fxM) : L("лідів немає","лидов нет")); }
/* проект целиком, одна воронка или один канал воронки */
function mapFx(p, f, c){ const rows = mapFxRows(p); if (!rows) return "";
  const r = f ? rows.filter(x => fxFunnel(p, x) === f.id && (!c || x.prov === c)) : rows;
  return mapFxText(mapFxSum(r), mapFxCur(p)) || (f ? "" : prShort() + L(": витрат немає",": расхода нет")); }
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
  (typeof pfProjs === "function" ? pfProjs() : W.projs).forEach(p => {
    mtHealth(p);
    const nch = p.funnels.reduce((a, f) => a + (f.ch || []).length, 0);
    const pn = {k:"co/" + p.id, lv:1, t:p.name, s:[p.niche, p.geo].filter(Boolean).join(" · "), m:p.tg && p.tg.budget ? L("бюджет ","бюджет ") + money(p.tg.budget) : "", fx:mapFx(p), kids:[]};
    if (p.funnels.length) { pn.can = true; pn.fold = mapFolded(pn.k, many); pn.stub = [plFn(p.funnels.length), nch ? plCh(nch) : L("канали не обрано","каналы не выбраны")]; }
    if (pn.fold && MP.sel && MP.sel.indexOf(pn.k + "/") === 0) MP.sel = pn.k;
    p.funnels.forEach(f => {
      const fn = {k:pn.k + "/" + f.id, lv:2, t:f.name, s:saleName(f), m:f.tg && f.tg.pay ? L("ціль: ","цель: ") + plural(f.tg.pay, L("оплата","оплата"), L("оплати","оплаты"), L("оплат","оплат")) : "", fx:mapFx(p, f), kids:[]}; { const kp = prCardKpi(p, f); if (kp) { fn.kpi = kp; fn.fx = ""; } }
      if ((f.ch || []).length) { fn.can = true; fn.fold = mapFolded(fn.k, p.funnels.length > MAP_FUNS); fn.ics = f.ch; fn.stub = [plCh(f.ch.length), f.ch.map(c => chOf(c)[1]).join(" · ")]; }
      if (fn.fold && MP.sel && MP.sel.indexOf(fn.k + "/") === 0) MP.sel = fn.k;
      const plan = chPlan(f, p); (f.ch || []).forEach(c => { const ch = chOf(c), pl = plan.find(r => r.id === c); const cn = {k:fn.k + "/" + c, lv:3, ic:c, t:ch[1], s:pl && pl.bud > 0 ? L("план ","план ") + money(pl.bud) + " · " + Math.round(pl.share) + "%" : ch[2], fx:mapFx(p, f, c), m:c === "meta" && mtBroken(p) ? L("підключення зламалося","подключение сломалось") : p.conn[c] === 1 ? L("кабінет підключено","кабинет подключён") : p.conn[c] ? L("кабінет позначено","кабинет отмечен") : L("кабінет не підключено","кабинет не подключён"), warn:!p.conn[c] || (c === "meta" && mtBroken(p))}; { const kp = prCardKpi(p, f, c); if (kp) { cn.kpi = kp; cn.fx = ""; } } const cks = prAccNodes(p, f, c, cn.k); if (cks.length) { cn.kids = cks; cn.can = true; cn.fold = mapFolded(cn.k, false); cn.ics = []; cn.stub = [plural(cks.length, L("акаунт","аккаунт"), L("акаунти","аккаунта"), L("акаунтів","аккаунтов")), L("рекламні акаунти каналу","рекламные аккаунты канала")]; if (cn.fold && MP.sel && MP.sel.indexOf(cn.k + "/") === 0) MP.sel = cn.k; } if (c === "meta" && p.conn[c] && !cn.fold) cn.kids = (cn.kids || []).concat([{add:"l", k:cn.k + "/+", lv:4, t:L("Кампанія","Кампания")}]); fn.kids.push(cn); });
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
  const t = {lv:0, t:L("Твоя компанія","Твоя компания"), s:L("команда · спільна база знань","команда · общая база знаний"), kids:[
    {lv:1, t:L("Проєкт «Курс»","Проект «Курс»"), s:L("свій продукт і своя ЦА","свой продукт и своя ЦА"), kids:[
      {lv:2, t:L("Воронка «Вебінар»","Воронка «Вебинар»"), s:L("свій офер і лендинг","свой оффер и лендинг"), kids:[c("meta"), c("gg")]},
      {lv:2, t:L("Воронка «Заявка»","Воронка «Заявка»"), s:L("інший шлях до оплати","другой путь до оплаты"), kids:[c("tt")]}]},
    {lv:1, t:L("Проєкт «Клуб»","Проект «Клуб»"), s:L("інший продукт","другой продукт"), kids:[
      {lv:2, t:L("Воронка «Підписка»","Воронка «Подписка»"), s:L("свої цілі й аналітика","свои цели и аналитика"), kids:[c("tga")]}]}]};
  (function key(n, k){ n.k = k; (n.kids || []).forEach((x, i) => key(x, k + "/" + i)); })(t, "co");
  return t;
}
/* скрытые карточки: чтобы при разборе рекламы оставить на доске только нужное. Хранится в браузере этого человека. */
MP.hide = {}; try { MP.hide = JSON.parse(localStorage.getItem("rakurs_map_hide")) || {}; } catch (e) {}
const mapHK = n => n.add ? n.k + "/+" + n.add : n.more ? n.k + "/+more" : n.k;
const mapHidden = n => !!MP.hide[mapHK(n)];
const mapHideSave = () => { try { localStorage.setItem("rakurs_map_hide", JSON.stringify(MP.hide)); } catch (e) {} };
function mapNode(n, sel){
  if (mapHidden(n)) return "";
  const on = sel && (n.k === sel || n.k.indexOf(sel + "/") === 0 || sel.indexOf(n.k + "/") === 0), lv = LEVELS()[n.lv], open = n.can && !n.fold;
  const card = n.ghost ? `<div class="nd nd--ghost"><small class="lv">${lv[0]}</small><b>${n.t}</b><span>${n.s}</span></div>`
    : n.more ? `<button type="button" class="nd nd--more" data-act="mapSel" data-k="${n.k}"><b>${n.t}</b><span>${n.s || L("усі — у панелі каналу","все — в панели канала")}</span></button>`
    : n.add ? `<button type="button" class="nd nd--add" data-act="mapAdd" data-k="${n.k}" data-what="${n.add}"><b>+ ${n.t}</b></button>`
    : `<button type="button" class="nd nd--l${n.lv}${n.v ? " nd--v-" + n.v : ""}${open ? " nd--can" : ""}${n.k === sel ? " sel" : ""}" data-act="mapSel" data-k="${n.k}" aria-pressed="${n.k === sel}"><small class="lv">${lv[0]}</small><b>${n.ic ? chIcon(n.ic) : ""}${esc(n.t)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ""}${n.fx ? `<span class="fx">${esc(n.fx)}</span>` : ""}${n.kpi ? `<dl class="ndk">${n.kpi.map(q => `<div><dt>${q[0]}</dt><dd>${q[1]}</dd></div>`).join("")}</dl>` : ""}${n.m ? `<em class="st ${n.v === "crit" ? "st--err" : n.v === "good" ? "st--on" : n.v === "warn" || n.warn ? "st--pause" : n.v === "mute" ? "" : "st--on"}">${esc(n.m)}</em>` : ""}</button>`;
  const hide = n.lv > 0 && !n.ghost ? `<button type="button" class="hide" data-act="mapHide" data-k="${esc(mapHK(n))}" aria-label="${L("Сховати з дошки: ","Скрыть с доски: ")}${esc(n.t)}" title="${L("Сховати з дошки","Скрыть с доски")}"></button>` : "";
  const shown = (n.kids || []).filter(x => !mapHidden(x));
  const tog = open && shown.length ? `<button type="button" class="fold" data-act="mapFold" data-on="0" data-k="${n.k}" aria-expanded="true" aria-label="${L("Згорнути гілку: ","Свернуть ветку: ")}${esc(n.t)}" title="${L("Згорнути гілку","Свернуть ветку")}">‹</button>` : "";
  const kids = n.can && n.fold ? `<ul><li class="${sel ? "dim" : ""}"><button type="button" class="nd nd--fold" data-act="mapFold" data-on="1" data-k="${n.k}" aria-expanded="false" aria-label="${L("Розгорнути гілку: ","Развернуть ветку: ")}${esc(n.t)}"><b>${(n.ics || []).map(chIcon).join("")}${n.stub[0]}</b><span>${esc(n.stub[1])}</span><em class="go" aria-hidden="true">›</em></button></li></ul>`
    : shown.length ? `<ul>${shown.map(x => mapNode(x, sel)).join("")}</ul>` : "";
  return `<li class="${sel ? (on ? "on" : "dim") : ""}${hide ? " hb" : ""}">${card}${hide}${tog}${kids}</li>`;
}
/* кнопки над доской появляются, когда есть что сворачивать */
function mapBar(){ const n = W.projs.reduce((a, p) => a + (p.funnels.length ? 1 : 0) + p.funnels.filter(f => (f.ch || []).length).length, 0);
  const auto = (mapMany() || W.projs.some(p => p.funnels.length > MAP_FUNS)) && !Object.keys(MP.fold).length;
  const tip = mapLegend() + (auto ? `<span>${L("Структура велика, тому частину гілок згорнуто.","Структура большая, поэтому часть веток свёрнута.")}</span>` : "");
  return `<div class="row map__bar">${mapViewSw()}${n >= 2 ? icoBtn("collapse", L("Згорнути все","Свернуть всё"), 'data-act="mapFoldAll" data-v="1"') + icoBtn("expand", L("Розгорнути все","Развернуть всё"), 'data-act="mapFoldAll" data-v="0"') : ""}${Object.keys(MP.hide).length ? `<button type="button" class="btn btn--sm btn--eye" data-act="mapShowAll" aria-label="${L("Показати сховані","Показать скрытые")}" title="${L("Показати сховані","Показать скрытые")}">${ICO.eye}<b>${Object.keys(MP.hide).length}</b></button>` : ""}${hint(tip, "wide")}</div>`; }
const mapDeep = n => Math.max(n.lv || 0, ...(n.kids || []).map(mapDeep));
const mapBoard = (tree, sel, n = Math.max(4, mapDeep(tree) + 1)) => `<div class="map__scroll" tabindex="0" role="group" aria-label="${L("Карта структури","Карта структуры")}"><div class="map__in" style="--n:${n}">
  <div class="map__heads">${LEVELS().slice(0, n).map((l, i) => `<div><i>0${i + 1}</i><b>${l[0]}</b></div>`).join("")}</div>
  <ul class="mt">${mapNode(tree, sel)}</ul></div></div>`;
/* «как читать карту» — в подсказке «i» над доской, а не блоком на экране */
const mapLegend = () => `<b>${L("Як читати карту","Как читать карту")}</b><ol class="lvls">${LEVELS().slice(0, W.projs.some(prOn) ? 6 : 4).map((l, i) => `<li><i>0${i + 1}</i><div><b>${l[0]}</b><span>${l[1]}</span></div></li>`).join("")}</ol>
  <span>${L("Цифри зводяться знизу вгору. Натисни на картку — побачиш її гілку й висновки. Риска в кутку ховає картку з гілкою, око повертає сховане.","Цифры сводятся снизу вверх. Нажми на карточку — увидишь её ветку и выводы. Чёрточка в углу скрывает карточку с веткой, глаз возвращает скрытое.")}</span>`;
const lvTag = i => `<span class="tag">${L("Рівень","Уровень")} 0${i + 1} · ${LEVELS()[i][0]}</span>`;
const chOpts = (p, f) => `<div class="opts opts--sm">${CHAN().map(c => `<button type="button" class="opt opt--ch opt--ch-${c[0]}" data-act="mapCh" data-p="${p.id}" data-f="${f.id}" data-v="${c[0]}" aria-pressed="${(f.ch || []).includes(c[0])}">${chIcon(c[0])}${c[1]}</button>`).join("")}</div>`;

/* панель под доской: что выбрано и что с этим можно сделать */
function mapInfo(){ const s = MP.sel, [, pid, fid, cid, kid] = (s || "").split("/"), p = pid && W.projs.find(x => x.id === pid), f = p && fid && p.funnels.find(x => x.id === fid);
  if (f && cid && (f.ch || []).includes(cid) && prHas(p, f, cid)) { const k2 = s.split("/")[5];
    return kid && /^a/.test(kid) ? (k2 ? prCampPanel(p, f, cid, k2) : prChanPanel(p, f, cid, prAId(kid)) + (typeof fxAccPanel === "function" ? fxAccPanel(p, cid, prAId(kid)) : "")) : kid ? prCampPanel(p, f, cid, kid) : prChanPanel(p, f, cid); }
  const base = mapInfo0(); return p && !fid ? prOverview(p) + (typeof goalsBoard === "function" ? goalsBoard(p) : "") + base : base; }
function mapInfo0(){
  const s = MP.sel; if (!s) return "";
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
  const s = MP.demo; if (!s) return `<p class="sub">${L("Це приклад. Натисни на будь-яку картку — підсвітиться її гілка й з’явиться пояснення рівня. Свою структуру збереш після створення компанії.","Это пример. Нажми на любую карточку — подсветится её ветка и появится пояснение уровня. Свою структуру соберёшь после создания компании.")}</p>`;
  const i = s.split("/").length - 1;
  return `<div class="lvnote"><i>0${i + 1}</i><div><b>${LEVELS()[i][0]}</b><span class="sub">${LEVELS()[i][1]}</span></div></div>`;
}
/* Виды карты: канбан (дерево карточек слева направо), список (дерево вниз с раскрытием), таблица (все уровни строками).
   Нажатие на карточку/строку открывает окно с настройками и выводами — не нужно листать вниз. Вид запоминается в браузере. */
MP.dir = (() => { try { return localStorage.getItem("rakurs_map_dir") === "v" ? "v" : "h"; } catch (e) { return "h"; } })();
MP.view = (() => { try { const v = localStorage.getItem("rakurs_map_view"); return ["board", "list", "table"].includes(v) ? v : "board"; } catch (e) { return "board"; } })();
const MAP_VIEWS = () => [["board", L("Канбан","Канбан")], ["list", L("Список","Список")], ["table", L("Таблиця","Таблица")]];
const mapViewSw = () => `<span class="seg mvs" role="group" aria-label="${L("Вигляд карти","Вид карты")}">${MAP_VIEWS().map(v => `<button type="button" data-act="mapView" data-v="${v[0]}" aria-pressed="${MP.view === v[0]}">${v[1]}</button>`).join("")}</span>${MP.view === "board" ? `<span class="seg mdir" role="group" aria-label="${L("Напрямок канбану","Направление канбана")}"><button type="button" data-act="mapDir" data-v="h" aria-pressed="${MP.dir !== "v"}" title="${L("Горизонтально","Горизонтально")}">${L("Горизонтально","Горизонтально")}</button><button type="button" data-act="mapDir" data-v="v" aria-pressed="${MP.dir === "v"}" title="${L("Вертикально","Вертикально")}">${L("Вертикально","Вертикально")}</button></span>` : ""}`;
const mapKids = n => (n.kids || []).filter(x => !mapHidden(x) && !x.ghost);
const mapOpen = n => !n.can || !n.fold;
const mapTog = n => n.can ? `<button type="button" class="mlt" data-act="mapFold" data-on="${n.fold ? 1 : 0}" data-k="${esc(n.k)}" aria-expanded="${!n.fold}" aria-label="${n.fold ? L("Розгорнути: ","Развернуть: ") : L("Згорнути: ","Свернуть: ")}${esc(n.t)}">${n.fold ? `<span class="chev chev--r">${ico("chevron")}</span>` : `<span class="chev">${ico("chevron")}</span>`}</button>` : `<span class="mlt" aria-hidden="true"></span>`;
const mapKpiTxt = n => n.kpi ? n.kpi.slice(0, 3).map(q => `<span><small>${q[0]}</small> ${q[1]}</span>`).join("") : n.fx ? `<span>${esc(n.fx)}</span>` : "";
/* список: дерево вниз */
function mapLi(n, sel, d){ if (mapHidden(n) || n.ghost) return "";
  if (n.add) return `<li style="--d:${d}"><div class="mlr mlr--add"><span class="mlt"></span><button type="button" class="mln" data-act="mapAdd" data-k="${esc(n.k)}" data-what="${n.add}">+ ${esc(n.t)}</button></div></li>`;
  if (n.more) return `<li style="--d:${d}"><div class="mlr"><span class="mlt"></span><button type="button" class="mln" data-act="mapSel" data-k="${esc(n.k)}"><b>${esc(n.t)}</b></button></div></li>`;
  const lv = LEVELS()[n.lv] || [""], kids = mapKids(n);
  return `<li style="--d:${d}" class="lvl${n.lv}"><div class="mlr mlr--l${n.lv}${n.k === sel ? " sel" : ""}${n.v ? " mlr--v-" + n.v : ""}">${mapTog(n)}<button type="button" class="mln" data-act="mapSel" data-k="${esc(n.k)}" aria-pressed="${n.k === sel}"><small class="lv lvb lvb--${n.lv}">${lv[0]}</small><b>${n.ic ? chIcon(n.ic) : ""}${esc(n.t)}</b>${n.s ? `<span class="sub">${esc(n.s)}</span>` : ""}</button><span class="mlk">${mapKpiTxt(n)}</span>${n.m ? `<em>${esc(n.m)}</em>` : ""}</div>
    ${mapOpen(n) && kids.length ? `<ul>${kids.map(x => mapLi(x, sel, d + 1)).join("")}</ul>` : ""}</li>`; }
const mapList = (tree, sel) => `<div class="ml"><ul>${mapLi(tree, sel, 0)}</ul></div>`;
/* таблица: все уровни строками, колонки — показатели карточек */
function mapTable(tree, sel){ const rows = [], cols = [];
  const walk = (n, d) => { if (mapHidden(n) || n.ghost || n.add) return; rows.push({n, d}); (n.kpi || []).forEach(q => { if (!cols.includes(q[0])) cols.push(q[0]); }); if (mapOpen(n)) mapKids(n).forEach(x => walk(x, d + 1)); };
  walk(tree, 0);
  return `<div class="tw mtb"><table><thead><tr><th>${L("Назва","Название")}</th>${cols.map(c => `<th class="n">${c}</th>`).join("")}<th>${L("Висновок","Вывод")}</th></tr></thead><tbody>
    ${rows.map(({n, d}) => { const kv = {}; (n.kpi || []).forEach(q => { kv[q[0]] = q[1]; }); const lv = LEVELS()[n.lv] || [""];
      return `<tr class="mtr--l${n.lv}${n.k === sel ? " sel" : ""}${n.v ? " mtr--v-" + n.v : ""}"><td><div class="mtn" style="--d:${d}">${mapTog(n)}<button type="button" class="mln" data-act="mapSel" data-k="${esc(n.k)}"><small class="lv lvb lvb--${n.lv}">${lv[0]}</small> <b>${n.ic ? chIcon(n.ic) : ""}${esc(n.t)}</b>${!n.kpi && n.fx ? ` <span class="sub">${esc(n.fx)}</span>` : ""}</button></div></td>${cols.map(c => `<td class="n mono">${kv[c] != null ? kv[c] : ""}</td>`).join("")}<td>${n.m ? `<em class="mte">${esc(n.m)}</em>` : ""}</td></tr>`; }).join("")}</tbody></table></div>`; }
/* окно с настройками выбранной карточки */
const mapPop = () => { if (!MP.sel) return ""; const body = mapInfo(); if (!body.trim()) return "";
  return `<div class="mpop" role="dialog" aria-modal="true" aria-label="${L("Деталі","Подробности")}"><button type="button" class="mpop__bg" data-act="mapClose" aria-label="${L("Закрити","Закрыть")}" tabindex="-1"></button><div class="mpop__in"><div class="mpop__bar"><button type="button" class="btn btn--sm" data-act="mapClose">${ico("close")} ${L("Закрити","Закрыть")}</button></div>${typeof tsNode === "function" ? tsNode(MP.sel) : ""}${body}</div></div>`; };
document.addEventListener("keydown", e => { if (e.key === "Escape" && MP.sel && document.querySelector(".mpop")) { MP.sel = null; render(); } });
const vMap = () => { const t = mapTree(), s = MP.sel;
  const view = MP.view === "list" ? mapList(t, s) : MP.view === "table" ? mapTable(t, s) : mapBoard(t, s);
  return `<div class="map map--${MP.view}${MP.view === "board" && MP.dir === "v" ? " map--vert" : ""}">${mapBar()}${view}${s ? mapPop() : mapInfo()}</div>`; };
const vMapDemo = () => `<div class="map">${mapBoard(mapDemoTree(), MP.demo)}${mapDemoInfo()}</div>`;

Object.assign(ACT, {
  mapSel(d){ const demo = !W.co, k = demo ? "demo" : "sel"; MP[k] = MP[k] === d.k ? null : d.k;
    setTimeout(() => { const e = [...document.querySelectorAll(".nd[data-k]")].find(x => x.dataset.k === d.k); if (e) e.focus({preventScroll:true}); }, 0); },
  mapDir(d){ MP.dir = d.v === "v" ? "v" : "h"; try { localStorage.setItem("rakurs_map_dir", MP.dir); } catch (e) { /* */ } },
  mapView(d){ MP.view = d.v; try { localStorage.setItem("rakurs_map_view", d.v); } catch (e) { /* */ } },
  mapClose(){ const k = MP.sel; MP.sel = null; setTimeout(() => { const e = [...document.querySelectorAll("[data-act=mapSel]")].find(x => x.dataset.k === k); if (e) e.focus({preventScroll:true}); }, 0); },
  mapAdd(d){ const [, pid, fid] = d.k.split("/");
    if (d.what === "l") return ACT.bdFromMap({p:pid, f:fid});
    if (d.what === "p") return ACT.modal({id:"project"});
    if (d.what === "f") { W.cur = pid; W.fun = null; W.tab = "funnels"; MP.fold["co/" + pid] = false; return ACT.modal({id:"funnel"}); }
    MP.sel = "co/" + pid + "/" + fid; },
  mapCh(d){ const p = W.projs.find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return;
    f.ch = f.ch || []; f.ch = f.ch.includes(d.v) ? f.ch.filter(c => c !== d.v) : CHAN().map(c => c[0]).filter(c => c === d.v || f.ch.includes(c));
    if (!f.ch.includes(d.v) && f.chs) delete f.chs[d.v];
    if (MP.sel && MP.sel.split("/")[3] === d.v && !f.ch.includes(d.v)) MP.sel = "co/" + p.id + "/" + f.id;
    save(); },
  mapFold(d){ const [, pid, fid, cid] = d.k.split("/"), p = W.projs.find(x => x.id === pid); if (!p) return;
    const now = d.on ? d.on === "1" : mapFolded(d.k, cid ? false : fid ? p.funnels.length > MAP_FUNS : mapMany()); MP.fold[d.k] = !now;
    setTimeout(() => { const e = [...document.querySelectorAll(now ? ".nd[data-act=mapSel]" : ".nd--fold")].find(x => x.dataset.k === d.k); if (e) e.focus({preventScroll:true}); }, 0); },
  /* «свернуть всё»: при нескольких проектах сворачиваются проекты, при одном — каналы его воронок */
  mapHide(d){ MP.hide[d.k] = 1; if (MP.sel && (MP.sel === d.k || MP.sel.indexOf(d.k + "/") === 0)) MP.sel = null; mapHideSave(); },
  mapShowAll(){ MP.hide = {}; mapHideSave(); },
  mapFoldAll(d){ const on = d.v === "1", one = W.projs.length < 2; MP.fold = {};
    W.projs.forEach(p => { MP.fold["co/" + p.id] = on && !one; p.funnels.forEach(f => { MP.fold["co/" + p.id + "/" + f.id] = on && one; }); }); },
  chEven(){ const f = F(); if (!f) return false; f.chs = {}; save(); },
  mapOpenF(d){ W.cur = d.p; W.fun = d.id; W.ftab = "go"; save(); },
  mapConn(d){ W.cur = d.id; W.fun = null; W.tab = "conn"; save(); },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.chs) return; const f = F(); if (!f) return;
  const raw = t.value.trim().replace(",", "."), n = parseFloat(raw); f.chs = f.chs || {};
  if (raw === "") delete f.chs[t.dataset.chs]; else if (n >= 0 && n <= 100) f.chs[t.dataset.chs] = Math.round(n * 10) / 10; else { toast(L("Частка — число від 0 до 100","Доля — число от 0 до 100")); render(); return; }
  save(); render(); });
