/* Подключение Meta Ads по шагам, без посредников: компания в Meta → рекламный аккаунт → страница → пиксель →
   системный пользователь и ключ доступа → проверка и привязка к проекту.
   Ключ вводит человек; он уходит на сервер и там остаётся, в данные проекта и в браузер не сохраняется.
   Подключается перед ws.js. */
const MT = {open:null, step:0, token:"", seen:null, busy:false, pick:{account:"", page:"", pixel:""}, ins:null, err:""};
const mtReset = () => { MT.token = ""; MT.seen = null; MT.busy = false; MT.pick = {account:"", page:"", pixel:""}; MT.err = ""; };
const MT_NEED = ["ads_read"], MT_NICE = ["ads_management","business_management","pages_show_list","pages_read_engagement"];
const mtSteps = () => [
  {k:"bm", t:L("Компанія в Meta","Компания в Meta"), why:L("Усе підключається через бізнес-портфоліо (Business Manager): воно володіє кабінетом, сторінкою й пікселем і роздає доступи.","Всё подключается через бизнес-портфолио (Business Manager): оно владеет кабинетом, страницей и пикселем и раздаёт доступы."),
    how:[L("Відкрийте налаштування компанії в Meta.","Откройте настройки компании в Meta."), L("Якщо портфоліо ще немає — створіть: назва компанії, ваше ім’я, робоча пошта.","Если портфолио ещё нет — создайте: название компании, ваше имя, рабочая почта."), L("Перевірте, що ви в ньому адміністратор: Користувачі → Люди.","Проверьте, что вы в нём администратор: Пользователи → Люди.")], url:"https://business.facebook.com/settings", go:L("Відкрити налаштування компанії","Открыть настройки компании")},
  {k:"acc", t:L("Рекламний акаунт","Рекламный аккаунт"), why:L("З нього бот читає витрати й результати, а пізніше збирає в ньому кампанії.","Из него бот читает расход и результаты, а позже собирает в нём кампании."),
    how:[L("У налаштуваннях компанії: Акаунти → Рекламні акаунти → Додати.","В настройках компании: Аккаунты → Рекламные аккаунты → Добавить."), L("Свій акаунт — «Заявити права»; акаунт клієнта — «Запит на доступ»; немає — «Створити».","Свой аккаунт — «Заявить права»; аккаунт клиента — «Запросить доступ»; нет — «Создать»."), L("Запам’ятайте номер акаунта: він знадобиться на останньому кроці.","Запомните номер аккаунта: он понадобится на последнем шаге.")], url:"https://business.facebook.com/settings", go:L("Відкрити налаштування компанії","Открыть настройки компании")},
  {k:"page", t:L("Сторінка (фан-пейдж)","Страница (фан-пейдж)"), why:L("Реклама показується від імені сторінки. Без неї оголошення не створити.","Реклама показывается от имени страницы. Без неё объявление не создать."),
    how:[L("У налаштуваннях компанії: Акаунти → Сторінки → Додати.","В настройках компании: Аккаунты → Страницы → Добавить."), L("Якщо є Instagram — додайте його там само: Акаунти → Акаунти Instagram.","Если есть Instagram — добавьте его там же: Аккаунты → Аккаунты Instagram.")], url:"https://business.facebook.com/settings", go:L("Відкрити налаштування компанії","Открыть настройки компании")},
  {k:"px", t:L("Піксель (набір даних)","Пиксель (набор данных)"), why:L("Передає в Meta події із сайту: заявку, бронь, оплату. Без нього рахуємо тільки кліки.","Передаёт в Meta события с сайта: заявку, бронь, оплату. Без него считаем только клики."),
    how:[L("У налаштуваннях компанії: Джерела даних → Набори даних → Додати.","В настройках компании: Источники данных → Наборы данных → Добавить."), L("Прив’яжіть набір даних до рекламного акаунта з кроку 2.","Привяжите набор данных к рекламному аккаунту из шага 2."), L("Крок можна пропустити й повернутися пізніше, якщо сайту ще немає.","Шаг можно пропустить и вернуться позже, если сайта ещё нет.")], url:"https://business.facebook.com/settings", go:L("Відкрити налаштування компанії","Открыть настройки компании"), opt:1},
  {k:"su", t:L("Ключ доступу","Ключ доступа"), why:L("Ключ видає «системний користувач» вашої компанії. Він не прив’язаний до особистого профілю, діє безстроково й відкликається однією кнопкою.","Ключ выдаёт «системный пользователь» вашей компании. Он не привязан к личному профилю, действует бессрочно и отзывается одной кнопкой."),
    how:[L("Створіть застосунок: на сторінці застосунків Meta → Створити → тип «Бізнес» → прив’яжіть до свого портфоліо.","Создайте приложение: на странице приложений Meta → Создать → тип «Бизнес» → привяжите к своему портфолио."), L("У налаштуваннях компанії: Користувачі → Системні користувачі → Додати, роль «Адміністратор».","В настройках компании: Пользователи → Системные пользователи → Добавить, роль «Администратор»."), L("Натисніть «Призначити об’єкти» й видайте йому рекламний акаунт, сторінку та піксель.","Нажмите «Назначить объекты» и выдайте ему рекламный аккаунт, страницу и пиксель."), L("Натисніть «Згенерувати токен»: оберіть застосунок, термін «Ніколи», права ads_read і ads_management (читання й збирання кампаній), а також business_management, pages_show_list, pages_read_engagement, pages_manage_ads.","Нажмите «Сгенерировать токен»: выберите приложение, срок «Никогда», права ads_read и ads_management (чтение и сборка кампаний), а также business_management, pages_show_list, pages_read_engagement, pages_manage_ads."), L("Скопіюйте ключ. Meta показує його один раз.","Скопируйте ключ. Meta показывает его один раз.")], url:"https://developers.facebook.com/apps", go:L("Відкрити застосунки Meta","Открыть приложения Meta"), url2:"https://business.facebook.com/settings", go2:L("Налаштування компанії","Настройки компании")},
  {k:"link", t:L("Перевірка й прив’язка","Проверка и привязка"), why:L("Вставте ключ — покажемо, що він бачить, і ви оберете акаунт, сторінку та піксель для цього проєкту.","Вставьте ключ — покажем, что он видит, и вы выберете аккаунт, страницу и пиксель для этого проекта.")}];
/* здоровье подключения: что не так и что с этим делать */
const mtHealthInfo = h => ({
  ok:[L("працює","работает"), "good", ""],
  token:[L("ключ відкликано або він недійсний","ключ отозван или недействителен"), "crit", L("Згенеруйте новий ключ у системного користувача й натисніть «Замінити ключ».","Сгенерируйте новый ключ у системного пользователя и нажмите «Заменить ключ».")],
  scope:[L("ключу бракує права ads_read","ключу не хватает права ads_read"), "crit", L("Згенеруйте ключ заново з правом ads_read і замініть його тут.","Сгенерируйте ключ заново с правом ads_read и замените его здесь.")],
  access:[L("ключ більше не бачить рекламний акаунт","ключ больше не видит рекламный аккаунт"), "crit", L("У налаштуваннях компанії в Meta: Системні користувачі → «Призначити об’єкти» → поверніть рекламний акаунт.","В настройках компании в Meta: Системные пользователи → «Назначить объекты» → верните рекламный аккаунт.")],
  account:[L("рекламний акаунт не активний","рекламный аккаунт не активен") + (h && h.detail ? " (" + h.detail + ")" : ""), "crit", L("Відкрийте акаунт у Meta: перевірте оплату, обмеження й повідомлення про блокування.","Откройте аккаунт в Meta: проверьте оплату, ограничения и сообщения о блокировке.")],
  error:[L("не вдалося перевірити","не удалось проверить"), "warn", L("Спробуйте пізніше. Якщо повторюється — можливо, Meta тимчасово не відповідає.","Попробуйте позже. Если повторяется — возможно, Meta временно не отвечает.")]}[(h && h.state) || "ok"]);
const mtBroken = p => !!(p.meta && p.meta.conn && p.meta.health && p.meta.health.state !== "ok" && p.meta.health.state !== "error");
/* проверка идёт в фоне: при открытии подключений и карты, не чаще раза в 6 часов на проект, и по кнопке */
function mtHealth(p, force){ if (!CLOUD || !sb || !p || !p.meta || !p.meta.conn) return; MT.hat = MT.hat || {};
  if (!force && MT.hat[p.id] && Date.now() - MT.hat[p.id] < 6 * 3600 * 1000) return; MT.hat[p.id] = Date.now();
  mtCall({action:"health", project_id:p.id}).then(d => { if (!d.ok) { if (force) toast(mtErr(d)); return; }
    const m = mtMeta(p), was = (m.health || {}).state || "ok"; m.health = {state:d.health.state, detail:d.health.detail || ""};
    if (was !== m.health.state) save(); if (force || was !== m.health.state) render();
    if (force) toast(d.health.state === "ok" ? L("Підключення працює","Подключение работает") : mtHealthInfo(m.health)[0]); }); }
const mtP = () => W.projs.find(x => x.id === MT.open);
const mtMeta = p => { p.meta = p.meta || {done:{}, conn:null}; p.meta.done = p.meta.done || {}; return p.meta; };
const mtErr = d => ({not_signed_in:L("Спершу увійдіть у кабінет","Сначала войдите в кабинет"), denied:L("Підключати кабінети може власник або керівник","Подключать кабинеты может собственник или руководитель"), no_token:L("Вставте ключ доступу","Вставьте ключ доступа"),
  no_account:L("Оберіть рекламний акаунт зі списку","Выберите рекламный аккаунт из списка"), no_project:L("Проєкт ще не збережено на сервері. Зачекайте кілька секунд і повторіть","Проект ещё не сохранён на сервере. Подождите пару секунд и повторите"), not_connected:L("Кабінет не підключено","Кабинет не подключён"),
  meta:L("Meta відхилила запит: ","Meta отклонила запрос: ") + (d.detail || "")}[d.error] || L("Не вдалося: ","Не удалось: ") + (d.detail || d.error));
async function mtCall(body){
  if (!CLOUD || !sb) return {ok:false, error:"offline", detail:L("працює тільки із сервером","работает только с сервером")};
  try { const f = await sb.functions.invoke("meta", {body}); if (f.error || !f.data) return {ok:false, error:"net", detail:(f.error && f.error.message) || "empty"}; return f.data; }
  catch (e) { return {ok:false, error:"net", detail:e && e.message}; }
}
const mtSel = (id, label, rows, cur, none) => `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-mt="${id.slice(3)}"><option value="">${none}</option>${rows.map(r => `<option value="${esc(r.id)}"${r.id === cur ? " selected" : ""}>${esc(r.name || r.id)}${r.tail ? " · " + esc(r.tail) : ""}</option>`).join("")}</select></div>`;
function mtLink(p){
  if (!CLOUD) return `<p class="sub proto">${L("Прототип: перевірка ключа працює лише після входу на сервер.","Прототип: проверка ключа работает только после входа на сервер.")}</p>`;
  if (!canAdmin()) return `<p class="sub">${L("Підключає кабінет власник або керівник лідогенерації.","Подключает кабинет собственник или руководитель лидогенерации.")}</p>`;
  const s = MT.seen;
  if (!s) return `<div class="field"><label for="mt-token">${L("Ключ доступу системного користувача","Ключ доступа системного пользователя")}</label><input id="mt-token" type="password" autocomplete="off" spellcheck="false" placeholder="EAAB…"></div>
    <p class="sub">${L("Ключ іде на сервер захищеним з’єднанням і зберігається там окремо від даних проєкту. У браузері й у файлах кабінету його немає, показати його знову неможливо — лише замінити або видалити.","Ключ уходит на сервер по защищённому соединению и хранится там отдельно от данных проекта. В браузере и в файлах кабинета его нет, показать его снова нельзя — только заменить или удалить.")}</p>
    ${MT.err ? `<p class="mterr">${esc(MT.err)}</p>` : ""}
    <div class="row"><button class="btn btn--solid" data-act="mtCheck"${MT.busy ? " disabled" : ""}>${MT.busy ? L("Перевіряємо…","Проверяем…") : L("Перевірити ключ","Проверить ключ")}</button></div>`;
  const miss = MT_NEED.filter(x => !s.scopes.includes(x)), nice = MT_NICE.filter(x => !s.scopes.includes(x));
  return `<div class="mtseen"><span class="tag">${L("Що бачить ключ","Что видит ключ")}</span>
      <dl class="kv"><dt>${L("Чий","Чей")}</dt><dd>${esc(s.me.name)}</dd>
        <dt>${L("Права","Права")}</dt><dd>${s.scopes.length ? s.scopes.map(x => pill(MT_NEED.includes(x) ? "good" : "mute", esc(x))).join(" ") : L("не вдалося прочитати","не удалось прочитать")}</dd>
        <dt>${L("Рекламних акаунтів","Рекламных аккаунтов")}</dt><dd class="mono">${s.accounts.length}</dd><dt>${L("Сторінок","Страниц")}</dt><dd class="mono">${s.pages.length}</dd>${s.businesses.length ? `<dt>${L("Компанії","Компании")}</dt><dd>${esc(s.businesses.map(b => b.name).join(", "))}</dd>` : ""}</dl>
      ${miss.length && s.scopes.length ? `<p class="mterr">${L("Немає права ","Нет права ")}${miss.join(", ")}${L(": без нього не прочитати витрати. Згенеруйте ключ заново з цим правом."," : без него не прочитать расход. Сгенерируйте ключ заново с этим правом.")}</p>` : ""}
      ${!miss.length && nice.length ? `<p class="sub">${L("Для читання даних цього досить. Щоб бот збирав кампанії, пізніше знадобляться: ","Для чтения данных этого достаточно. Чтобы бот собирал кампании, позже понадобятся: ")}${nice.join(", ")}.</p>` : ""}</div>
    ${s.accounts.length ? `<div class="form">${mtSel("mt-account", L("Рекламний акаунт проєкту","Рекламный аккаунт проекта"), s.accounts.map(a => ({id:a.id, name:a.name, tail:[a.id, a.currency, a.active ? "" : L("неактивний","неактивен")].filter(Boolean).join(" · ")})), MT.pick.account, L("— оберіть —","— выберите —"))}
        ${mtSel("mt-page", L("Сторінка","Страница"), s.pages, MT.pick.page, s.pages.length ? L("— оберіть —","— выберите —") : L("ключ не бачить сторінок","ключ не видит страниц"))}
        ${mtSel("mt-pixel", L("Піксель","Пиксель"), s.pixels || [], MT.pick.pixel, !MT.pick.account ? L("спершу оберіть акаунт","сначала выберите аккаунт") : (s.pixels || []).length ? L("— без пікселя —","— без пикселя —") : L("в акаунті немає пікселів","в аккаунте нет пикселей"))}</div>`
      : `<p class="mterr">${L("Ключ не бачить жодного рекламного акаунта. Поверніться до кроку 5: «Призначити об’єкти» системному користувачу.","Ключ не видит ни одного рекламного аккаунта. Вернитесь к шагу 5: «Назначить объекты» системному пользователю.")}</p>`}
    ${MT.err ? `<p class="mterr">${esc(MT.err)}</p>` : ""}
    <div class="row"><button class="btn btn--solid" data-act="mtSave"${MT.busy || !MT.pick.account ? " disabled" : ""}>${MT.busy ? L("Зберігаємо…","Сохраняем…") : L("Підключити до проєкту","Подключить к проекту")}</button><button class="btn" data-act="mtAgain">${L("Інший ключ","Другой ключ")}</button></div>`;
}
/* пошаговая инструкция: слева шаги с отметками, справа текущий шаг */
function metaGuide(p){
  const m = mtMeta(p), st = mtSteps(), i = Math.min(MT.step, st.length - 1), s = st[i], last = i === st.length - 1;
  return `<div class="panel vf mtg"><div class="row sp"><div><span class="tag">Meta Ads · ${L("підключення без посередників","подключение без посредников")}</span><h2>${L("Крок","Шаг")} ${i + 1} ${L("із","из")} ${st.length}. ${s.t}</h2></div><button class="x" data-act="mtClose" aria-label="close">×</button></div>
    <div class="mtg__in"><ol class="mtg__steps">${st.map((x, n) => `<li class="${n === i ? "on" : ""}${m.done[x.k] || (x.k === "link" && m.conn) ? " ok" : ""}"><button type="button" data-act="mtStep" data-v="${n}"><i>${m.done[x.k] || (x.k === "link" && m.conn) ? "✓" : n + 1}</i><span>${x.t}${x.opt ? ` <small>${L("можна пізніше","можно позже")}</small>` : ""}</span></button></li>`).join("")}</ol>
      <div class="mtg__body"><p>${s.why}</p>
        ${last ? mtLink(p) : `<ol class="nx">${s.how.map(h => `<li>${h}</li>`).join("")}</ol>
          <div class="row"><a class="btn btn--sm" href="${s.url}" target="_blank" rel="noopener">${s.go} ↗</a>${s.url2 ? `<a class="btn btn--sm" href="${s.url2}" target="_blank" rel="noopener">${s.go2} ↗</a>` : ""}</div>
          <div class="row"><button class="btn btn--solid" data-act="mtDone" data-k="${s.k}">${m.done[s.k] ? L("Далі","Дальше") : L("Готово, далі","Готово, дальше")}</button>${s.opt ? `<button class="btn" data-act="mtStep" data-v="${i + 1}">${L("Пропустити","Пропустить")}</button>` : ""}</div>`}
        ${i === 4 ? `<p class="sub">${L("Інші способи. Вхід через Facebook однією кнопкою з’явиться після перевірки нашого застосунку в Meta. Якщо ви працюєте з рекламою через Claude, йому окремо підключається конектор Meta Ads у налаштуваннях — платформі для аналітики ключ потрібен усе одно.","Другие способы. Вход через Facebook одной кнопкой появится после проверки нашего приложения в Meta. Если вы работаете с рекламой через Claude, ему отдельно подключается коннектор Meta Ads в настройках — платформе для аналитики ключ нужен всё равно.")}</p>` : ""}</div></div></div>`;
}
/* карточка Meta во вкладке «Подключения» */
function metaCard(p){
  const m = mtMeta(p), c = m.conn, done = mtSteps().filter(x => m.done[x.k]).length;
  if (!c) return `<p class="sub">${L("Кабінет, піксель, сторінка — підключаються напряму, за шість кроків.","Кабинет, пиксель, страница — подключаются напрямую, за шесть шагов.")}${done ? ` ${L("Пройдено кроків: ","Пройдено шагов: ")}${done}.` : ""}</p>
    <div class="row"><button class="btn btn--sm btn--solid" data-act="mtOpen" data-id="${p.id}">${done ? L("Продовжити підключення","Продолжить подключение") : L("Підключити покроково","Подключить по шагам")}</button></div>`;
  const r = MT.ins && MT.ins.p === p.id ? MT.ins : null, hi = mtHealthInfo(m.health); mtHealth(p);
  return `${m.health && m.health.state !== "ok" ? `<div class="mthealth">${pill(hi[1], hi[0])}<span class="sub">${hi[2]}</span></div>` : ""}<dl class="kv"><dt>${L("Акаунт","Аккаунт")}</dt><dd>${esc(c.account.name)} <span class="sub mono">${esc(c.account.id)}</span></dd><dt>${L("Сторінка","Страница")}</dt><dd>${c.page ? esc(c.page.name) : "—"}</dd><dt>${L("Піксель","Пиксель")}</dt><dd>${c.pixel ? esc(c.pixel.name) : "—"}</dd></dl>
    <div class="row"><button class="btn btn--sm btn--solid" data-act="mtIns" data-id="${p.id}"${MT.busy ? " disabled" : ""}>${L("Перевірити дані за 7 днів","Проверить данные за 7 дней")}</button><button class="btn btn--sm" data-act="mtHealthNow" data-id="${p.id}">${L("Перевірити підключення","Проверить подключение")}</button>${canAdmin() ? `<button class="btn btn--sm" data-act="mtOpen" data-id="${p.id}" data-v="5">${L("Замінити ключ","Заменить ключ")}</button><button class="btn btn--sm btn--danger" data-act="mtOff" data-id="${p.id}">${L("Відключити","Отключить")}</button>` : ""}</div>
    ${r ? (r.err ? `<p class="mterr">${esc(r.err)}</p>` : r.rows.length ? `<div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")} · ${r.since} — ${r.until}</th><th class="n">${L("Витрати","Расход")}, ${esc(r.currency || "")}</th><th class="n">${L("Покази","Показы")}</th><th class="n">${L("Кліки","Клики")}</th><th class="n">${L("Ліди","Лиды")}</th></tr></thead><tbody>
        ${r.rows.slice(0, 12).map(x => `<tr><td class="mono">${esc(x.name)}</td><td class="n mono">${dec(x.spend)}</td><td class="n mono">${num(x.impressions)}</td><td class="n mono">${num(x.clicks)}</td><td class="n mono">${num(x.leads)}</td></tr>`).join("")}
        <tr class="sum"><td>${L("Разом","Итого")}${r.rows.length > 12 ? ` · ${r.rows.length} ${L("кампаній","кампаний")}` : ""}</td><td class="n mono">${dec(r.rows.reduce((a, x) => a + x.spend, 0))}</td><td class="n mono">${num(r.rows.reduce((a, x) => a + x.impressions, 0))}</td><td class="n mono">${num(r.rows.reduce((a, x) => a + x.clicks, 0))}</td><td class="n mono">${num(r.rows.reduce((a, x) => a + x.leads, 0))}</td></tr></tbody></table></div>`
      : `<p class="sub">${L("За ці дні в акаунті не було показів.","За эти дни в аккаунте не было показов.")}</p>`) : ""}`;
}
Object.assign(ACT, {
  mtOpen(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; const m = mtMeta(p), st = mtSteps(); mtReset(); MT.g = null; MT.open = p.id;
    MT.step = d.v != null ? +d.v : Math.max(0, st.findIndex(x => x.k === "link" ? true : !m.done[x.k] && !x.opt)); },
  mtClose(){ MT.open = null; mtReset(); },
  mtStep(d){ MT.step = +d.v; MT.err = ""; },
  mtDone(d){ const p = mtP(); if (!p) return false; mtMeta(p).done[d.k] = true; if (!p.conn.meta) p.conn.meta = 3; MT.step = Math.min(MT.step + 1, mtSteps().length - 1); save(); },
  mtAgain(){ mtReset(); },
  mtCheck(){ const t = (document.getElementById("mt-token") || {}).value || ""; if (t.trim().length < 20) { fieldErr("mt-token", L("Вставте ключ повністю","Вставьте ключ целиком")); return false; }
    MT.token = t.trim(); MT.busy = true; MT.err = "";
    mtCall({action:"check", token:MT.token}).then(d => { MT.busy = false; if (!d.ok) { MT.err = mtErr(d); MT.token = ""; } else { MT.seen = d.seen; if (d.seen.accounts.length === 1) { MT.pick.account = d.seen.accounts[0].id; mtPixels(); } if (d.seen.pages.length === 1) MT.pick.page = d.seen.pages[0].id; } render(); }); },
  mtSave(){ const p = mtP(); if (!p || !MT.pick.account) return false; MT.busy = true; MT.err = "";
    mtCall({action:"save", project_id:p.id, token:MT.token, account_id:MT.pick.account, page_id:MT.pick.page, pixel_id:MT.pick.pixel}).then(d => { MT.busy = false;
      if (!d.ok) MT.err = mtErr(d); else { const m = mtMeta(p); m.conn = d.conn; m.health = {state:"ok", detail:""}; MT.hat = MT.hat || {}; MT.hat[p.id] = Date.now(); ["bm","acc","page","su"].forEach(k => { m.done[k] = true; }); if (d.conn.pixel) m.done.px = true; p.conn.meta = 1; MT.open = null; mtReset(); save(); toast(L("Meta Ads підключено","Meta Ads подключён")); }
      render(); }); },
  mtOff(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; if (MT.off !== p.id) { MT.off = p.id; toast(L("Натисніть ще раз, щоб видалити ключ із сервера","Нажмите ещё раз, чтобы удалить ключ с сервера")); setTimeout(() => { MT.off = null; }, 4000); return false; }
    MT.off = null; mtCall({action:"disconnect", project_id:p.id}).then(r => { if (!r.ok) toast(mtErr(r)); else { mtMeta(p).conn = null; mtMeta(p).health = null; p.conn.meta = 3; MT.ins = null; save(); toast(L("Ключ видалено із сервера","Ключ удалён с сервера")); } render(); }); return false; },
  mtHealthNow(d){ const p = W.projs.find(x => x.id === d.id); if (p) mtHealth(p, true); return false; },
  mtIns(d){ MT.busy = true; mtCall({action:"insights", project_id:d.id, days:7}).then(r => { MT.busy = false; MT.ins = r.ok ? Object.assign({p:d.id}, r) : {p:d.id, err:mtErr(r), rows:[]}; render(); }); },
});
function mtPixels(){ mtCall({action:"check", token:MT.token, account_id:MT.pick.account}).then(d => { if (d.ok && MT.seen) { MT.seen.pixels = d.seen.pixels; if (d.seen.pixels.length === 1) MT.pick.pixel = d.seen.pixels[0].id; render(); } }); }
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.mt) return; MT.pick[t.dataset.mt] = t.value;
  if (t.dataset.mt === "account") { MT.pick.pixel = ""; if (MT.seen) MT.seen.pixels = []; if (t.value) mtPixels(); } render(); });

/* ---------- шаги подготовки для TikTok, Google и Telegram Ads ----------
   Здесь только подготовка кабинетов: что завести и где. Чтение данных из этих кабинетов платформа пока не умеет —
   на последнем шаге это сказано прямо. Сведения о порядке доступа взяты из открытых источников на ноябрь 2026. */
const GUIDES = () => ({
  tt: {name:"TikTok Ads", steps:[
    {k:"bc", t:L("Бізнес-центр TikTok","Бизнес-центр TikTok"), why:L("Володіє рекламним акаунтом і роздає доступи — як бізнес-портфоліо в Meta.","Владеет рекламным аккаунтом и раздаёт доступы — как бизнес-портфолио в Meta."), how:[L("Відкрийте Business Center і створіть його, якщо ще немає.","Откройте Business Center и создайте его, если ещё нет."), L("Перевірте, що ви в ньому адміністратор.","Проверьте, что вы в нём администратор.")], url:"https://business.tiktok.com/", go:"Business Center"},
    {k:"acc", t:L("Рекламний акаунт","Рекламный аккаунт"), why:L("З нього читаються витрати й результати.","Из него читаются расход и результаты."), how:[L("У Business Center: Акаунти → Рекламні акаунти → додати наявний або створити.","В Business Center: Аккаунты → Рекламные аккаунты → добавить существующий или создать."), L("Запишіть ідентифікатор рекламодавця (Advertiser ID).","Запишите идентификатор рекламодателя (Advertiser ID).")], url:"https://ads.tiktok.com/", go:"TikTok Ads Manager"},
    {k:"px", t:L("Піксель","Пиксель"), why:L("Передає в TikTok заявки й оплати із сайту.","Передаёт в TikTok заявки и оплаты с сайта."), how:[L("В Ads Manager: Інструменти → Події → створити піксель і поставити на сайт.","В Ads Manager: Инструменты → События → создать пиксель и поставить на сайт.")], url:"https://ads.tiktok.com/", go:"TikTok Ads Manager", opt:1},
    {k:"app", t:L("Застосунок розробника","Приложение разработчика"), why:L("TikTok віддає статистику тільки схваленому застосунку. Перевірка триває дні, тому подати варто заздалегідь.","TikTok отдаёт статистику только одобренному приложению. Проверка идёт дни, поэтому подать стоит заранее."), how:[L("На порталі розробників TikTok for Business зареєструйтеся як розробник.","На портале разработчиков TikTok for Business зарегистрируйтесь как разработчик."), L("Створіть застосунок: доступ до звітності (Reporting), адреса повернення — адреса цього кабінету.","Создайте приложение: доступ к отчётности (Reporting), адрес возврата — адрес этого кабинета."), L("Надішліть на перевірку й дочекайтеся схвалення.","Отправьте на проверку и дождитесь одобрения.")], url:"https://business-api.tiktok.com/portal", go:L("Портал розробників","Портал разработчиков")}],
    end:L("Коли застосунок схвалять, платформі потрібна серверна частина, яка обмінює дозвіл рекламодавця на ключ. Вона в черзі робіт. До того часу цифри TikTok вносьте у вкладці «Досвід».","Когда приложение одобрят, платформе нужна серверная часть, которая обменивает разрешение рекламодателя на ключ. Она в очереди работ. До тех пор цифры TikTok вносите во вкладке «Опыт».")},
  gg: {name:"Google Ads", steps:[
    {k:"acc", t:L("Акаунт Google Ads","Аккаунт Google Ads"), why:L("З нього читаються витрати й результати.","Из него читаются расход и результаты."), how:[L("Відкрийте Google Ads. Якщо акаунтів кілька — заведіть керівний акаунт (MCC) і під’єднайте їх до нього.","Откройте Google Ads. Если аккаунтов несколько — заведите управляющий аккаунт (MCC) и подключите их к нему."), L("Запишіть ідентифікатор клієнта — 10 цифр у правому верхньому куті.","Запишите идентификатор клиента — 10 цифр в правом верхнем углу.")], url:"https://ads.google.com/", go:"Google Ads"},
    {k:"conv", t:L("Конверсії","Конверсии"), why:L("Без них Google бачить лише кліки, а не заявки й оплати.","Без них Google видит только клики, а не заявки и оплаты."), how:[L("Цілі → Конверсії → створити дії «заявка» та «оплата» і поставити тег на сайт.","Цели → Конверсии → создать действия «заявка» и «оплата» и поставить тег на сайт.")], url:"https://ads.google.com/", go:"Google Ads", opt:1},
    {k:"cloud", t:L("Проєкт у Google Cloud","Проект в Google Cloud"), why:L("З вересня 2026 доступ до Google Ads API видається проєкту Google Cloud, а не окремому токену розробника.","С сентября 2026 доступ к Google Ads API выдаётся проекту Google Cloud, а не отдельному токену разработчика."), how:[L("У Google Cloud Console створіть проєкт і ввімкніть Google Ads API.","В Google Cloud Console создайте проект и включите Google Ads API."), L("На сторінці Google Ads API подайте заявку на рівень Explorer: він дозволяє читати робочі акаунти.","На странице Google Ads API подайте заявку на уровень Explorer: он позволяет читать рабочие аккаунты."), L("Порядок у Google щойно змінився — якщо екран інакший, орієнтуйтеся на підказки самої консолі.","Порядок у Google только что изменился — если экран другой, ориентируйтесь на подсказки самой консоли.")], url:"https://console.cloud.google.com/apis/library/googleads.googleapis.com", go:"Google Cloud Console"},
    {k:"oauth", t:L("Дозвіл на доступ","Разрешение на доступ"), why:L("Через нього власник акаунта один раз дозволяє читання.","Через него владелец аккаунта один раз разрешает чтение."), how:[L("У Google Cloud: «Облікові дані» → створити ідентифікатор клієнта OAuth, тип «Вебзастосунок».","В Google Cloud: «Учётные данные» → создать идентификатор клиента OAuth, тип «Веб-приложение»."), L("Адреса повернення — адреса цього кабінету.","Адрес возврата — адрес этого кабинета.")], url:"https://console.cloud.google.com/apis/credentials", go:L("Облікові дані","Учётные данные")}],
    end:L("Серверна частина, яка читає Google Ads, у черзі робіт. До того часу цифри Google вносьте у вкладці «Досвід».","Серверная часть, которая читает Google Ads, в очереди работ. До тех пор цифры Google вносите во вкладке «Опыт».")},
  tga: {name:"Telegram Ads", steps:[
    {k:"acc", t:L("Рекламний кабінет","Рекламный кабинет"), why:L("Оголошення в каналах і ботах запускаються звідси.","Объявления в каналах и ботах запускаются отсюда."), how:[L("Увійдіть до кабінету Telegram Ads зі свого акаунта Telegram або через партнера-реселера.","Войдите в кабинет Telegram Ads со своего аккаунта Telegram или через партнёра-реселлера."), L("Поповніть баланс: без нього оголошення не створити.","Пополните баланс: без него объявление не создать.")], url:"https://ads.telegram.org/", go:"Telegram Ads"},
    {k:"obj", t:L("Що рекламуємо","Что рекламируем"), why:L("Оголошення веде на канал, бота або сайт.","Объявление ведёт на канал, бота или сайт."), how:[L("Якщо ведете на сайт — це лендинг воронки з UTM-мітками.","Если ведёте на сайт — это лендинг воронки с UTM-метками."), L("Якщо на канал чи бота — підготуйте їх: закріплений допис, вітальне повідомлення, посилання на лендинг.","Если на канал или бота — подготовьте их: закреплённый пост, приветственное сообщение, ссылка на лендинг.")], url:"https://ads.telegram.org/", go:"Telegram Ads"},
    {k:"utm", t:L("UTM-мітки","UTM-метки"), why:L("У Telegram Ads немає пікселя: заявки й оплати видно лише за мітками в таблиці продажів.","У Telegram Ads нет пикселя: заявки и оплаты видны только по меткам в таблице продаж."), how:[L("Беріть посилання з вкладки «Лендинги» воронки — там мітки вже додано.","Берите ссылку из вкладки «Лендинги» воронки — там метки уже добавлены."), L("Назву оголошення пишіть латиницею: вона потрапляє в мітку.","Название объявления пишите латиницей: оно попадает в метку.")]}],
    end:L("Відкритого способу автоматично забирати статистику Telegram Ads ми не знайшли (стан на листопад 2026). Витрати й покази вносьте у вкладці «Досвід»; завантаження вивантаженого з кабінету файлу — у черзі робіт.","Открытого способа автоматически забирать статистику Telegram Ads мы не нашли (состояние на ноябрь 2026). Расход и показы вносите во вкладке «Опыт»; загрузка выгруженного из кабинета файла — в очереди работ.")}});
const gdState = (p, prov) => { p.guide = p.guide || {}; p.guide[prov] = p.guide[prov] || {done:{}}; return p.guide[prov]; };
function guidePanel(p, prov){
  const g = GUIDES()[prov], st = gdState(p, prov), n = g.steps.length, i = Math.min(MT.gs || 0, n), last = i === n, s = g.steps[i];
  return `<div class="panel vf mtg"><div class="row sp"><div><span class="tag">${g.name} · ${L("підготовка кабінету","подготовка кабинета")}</span><h2>${last ? L("Що далі","Что дальше") : `${L("Крок","Шаг")} ${i + 1} ${L("із","из")} ${n}. ${s.t}`}</h2></div><button class="x" data-act="gdClose" aria-label="close">×</button></div>
    <div class="mtg__in"><ol class="mtg__steps">${g.steps.map((x, k) => `<li class="${k === i ? "on" : ""}${st.done[x.k] ? " ok" : ""}"><button type="button" data-act="gdStep" data-v="${k}"><i>${st.done[x.k] ? "✓" : k + 1}</i><span>${x.t}${x.opt ? ` <small>${L("можна пізніше","можно позже")}</small>` : ""}</span></button></li>`).join("")}
        <li class="${last ? "on" : ""}"><button type="button" data-act="gdStep" data-v="${n}"><i>→</i><span>${L("Що далі","Что дальше")}</span></button></li></ol>
      <div class="mtg__body">${last ? `<p>${g.end}</p><div class="row"><button class="btn btn--solid" data-act="gdClose">${L("Зрозуміло","Понятно")}</button></div>`
        : `<p>${s.why}</p><ol class="nx">${s.how.map(h => `<li>${h}</li>`).join("")}</ol>
          ${s.url ? `<div class="row"><a class="btn btn--sm" href="${s.url}" target="_blank" rel="noopener">${s.go} ↗</a></div>` : ""}
          <div class="row"><button class="btn btn--solid" data-act="gdDone" data-k="${s.k}">${st.done[s.k] ? L("Далі","Дальше") : L("Готово, далі","Готово, дальше")}</button>${s.opt ? `<button class="btn" data-act="gdStep" data-v="${i + 1}">${L("Пропустити","Пропустить")}</button>` : ""}</div>`}</div></div></div>`;
}
function guideCard(p, prov, hint){ const g = GUIDES()[prov], st = gdState(p, prov), done = g.steps.filter(x => st.done[x.k]).length;
  return `<p class="sub">${hint}${done ? ` ${L("Пройдено кроків: ","Пройдено шагов: ")}${done} ${L("із","из")} ${g.steps.length}.` : ""}</p>
    <div class="row"><button class="btn btn--sm btn--solid" data-act="gdOpen" data-id="${p.id}" data-v="${prov}">${done ? L("Продовжити підготовку","Продолжить подготовку") : L("Підготувати покроково","Подготовить по шагам")}</button><button class="btn btn--sm" data-act="wsConn" data-id="${prov}">${p.conn[prov] ? L("Прибрати позначку","Убрать отметку") : L("Є, позначити","Есть, отметить")}</button></div>`; }
Object.assign(ACT, {
  gdOpen(d){ const p = W.projs.find(x => x.id === d.id); if (!p) return false; const g = GUIDES()[d.v], st = gdState(p, d.v); MT.open = null; MT.g = {p:p.id, prov:d.v}; const i = g.steps.findIndex(x => !st.done[x.k] && !x.opt); MT.gs = i < 0 ? g.steps.length : i; },
  gdClose(){ MT.g = null; },
  gdStep(d){ MT.gs = +d.v; },
  gdDone(d){ const p = MT.g && W.projs.find(x => x.id === MT.g.p); if (!p) return false; gdState(p, MT.g.prov).done[d.k] = true; if (!p.conn[MT.g.prov]) p.conn[MT.g.prov] = 3; MT.gs = Math.min((MT.gs || 0) + 1, GUIDES()[MT.g.prov].steps.length); save(); },
});

/* Сборка кампании в Meta из воронки. Обычный код, без ИИ: форма → функция meta по шагам → кампания, группа, объявления.
   Всё создаётся выключенным (PAUSED) со стартом на следующий день в 00:40 по Киеву; включает человек в Ads Manager.
   Номера созданного хранятся в BD.run: если шаг упал, «Продолжить» начинает с него, уже созданное не дублируется. */
const BD = {open:null, form:null, run:null, busy:false, err:"", step:"", files:{}};
const BD_EVENTS = () => [["lead",L("Лід (Lead) — заявка на сайті","Лид (Lead) — заявка на сайте")],["reg",L("Реєстрація (CompleteRegistration)","Регистрация (CompleteRegistration)")],["buy",L("Покупка (Purchase)","Покупка (Purchase)")],["lpv",L("Перегляди сторінки — без пікселя","Просмотры страницы — без пикселя")]];
const BD_CTA = [["LEARN_MORE","Learn more"],["SIGN_UP","Sign up"],["REGISTER_NOW","Register now"],["APPLY_NOW","Apply now"],["GET_OFFER","Get offer"],["SUBSCRIBE","Subscribe"],["CONTACT_US","Contact us"],["SHOP_NOW","Shop now"],["WATCH_MORE","Watch more"]];
const bdLatin = s => String(s || "").split("").map(c => { const l = c.toLowerCase(); return TRL[l] !== undefined ? (c === l ? TRL[l] : TRL[l].charAt(0).toUpperCase() + TRL[l].slice(1)) : c; }).join("").replace(/[^A-Za-z0-9_.\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 120);
/* Завтра 00:40 по Киеву → момент времени. Смещение Киева берём из часов браузера, поэтому летнее время учтено само. */
function bdKyivOffset(ms){ const p = {}; new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Kyiv", hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"}).formatToParts(new Date(ms)).forEach(x => p[x.type] = x.value);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000; }
const bdKyivToUtc = (date, time) => { const [y, m, d] = date.split("-").map(Number), [hh, mm] = time.split(":").map(Number), guess = Date.UTC(y, m - 1, d, hh, mm); return guess - bdKyivOffset(guess - bdKyivOffset(guess)); };
function bdTomorrow(){ const p = {}; new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Kyiv", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date(Date.now() + 86400000)).forEach(x => p[x.type] = x.value); return `${p.year}-${p.month}-${p.day}`; }
const bdUrl = u => { u = String(u || "").trim(); return !u ? "" : /^https?:\/\//i.test(u) ? u : "https://" + u; };
const bdConn = p => p && p.meta && p.meta.conn;
const bdCanWrite = c => !c || !c.scopes || !c.scopes.length || c.scopes.includes("ads_management");
function bdName(f, p, date){ const dm = date ? date.slice(8, 10) + "." + date.slice(5, 7) : ""; return bdLatin([slug(p.name), geoCode(p.geo), slug(f.name), f.goal === "form" ? "Form" : "Site", dm, "ABO"].filter(Boolean).join("_")); }
function bdInit(f, p){ const date = bdTomorrow(), g = geoCode(p.geo), daily = Math.round(fT(f, p).bud / 30);
  BD.form = {name:bdName(f, p, date), event:"lead", budget:daily >= 5 ? daily : 20, link:bdUrl((f.lands[0] || {}).url), countries:/^[A-Z]{2}$/.test(g) && g !== "EU" ? g : "UA", advantage:true, age_min:25, age_max:55, gender:"",
    adset:"", date, time:"00:40", headline:"", description:"", cta:"LEARN_MORE",
    ads:(f.crs.length ? f.crs : []).map(c => ({id:c.id, on:true, name:bdLatin(c.slug || c.name), text:c.text || "", type:c.type === "img" ? "img" : "video", path:c.path || "", fname:c.name || ""}))};
  BD.run = null; BD.err = ""; BD.step = ""; BD.files = {}; }
const bdAdset = F0 => F0.adset || bdLatin(F0.countries.replace(/[^A-Za-z]+/g, "-") + "_" + (F0.advantage ? "AdvPlus" : F0.age_min + "-" + F0.age_max + (F0.gender ? "_" + F0.gender.toUpperCase() : "")));
function bdCheck(F0, c){ const e = [];
  if (!bdLatin(F0.name)) e.push(L("назва кампанії","название кампании"));
  if (!(+F0.budget >= 1)) e.push(L("бюджет на день","бюджет в день"));
  if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(bdUrl(F0.link))) e.push(L("посилання на лендинг","ссылка на лендинг"));
  if (!F0.countries.split(/[,\s]+/).some(x => /^[A-Za-z]{2}$/.test(x))) e.push(L("країни (коди з двох літер: UA, PL)","страны (коды из двух букв: UA, PL)"));
  if (bdKyivToUtc(F0.date, F0.time) < Date.now() + 10 * 60000) e.push(L("старт — щонайменше за 10 хвилин від зараз","старт — минимум через 10 минут от сейчас"));
  const on = F0.ads.filter(a => a.on); if (!on.length) e.push(L("хоча б одне оголошення","хотя бы одно объявление"));
  on.forEach(a => { if (!BD.files[a.id] && !a.path) e.push(L("файл для ","файл для ") + (a.name || "—")); if (!a.text.trim()) e.push(L("текст для ","текст для ") + (a.name || "—")); });
  if (c && !c.page) e.push(L("сторінка в підключенні Meta","страница в подключении Meta"));
  if (c && F0.event !== "lpv" && !c.pixel) e.push(L("піксель у підключенні Meta (або ціль «Перегляди сторінки»)","пиксель в подключении Meta (или цель «Просмотры страницы»)"));
  return e; }
const bdAdsLink = (c, id) => `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(c.account.id)}&selected_campaign_ids=${encodeURIComponent(id)}`;

function bdPanel(f, p){
  const c = bdConn(p), list = (f.builds || []).slice(0, 5);
  const hist = list.length ? `<div class="tw tw--in"><table><thead><tr><th>${L("Зібрано","Собрано")}</th><th>${L("Кампанія","Кампания")}</th><th class="n">${L("Оголошень","Объявлений")}</th><th></th></tr></thead><tbody>${list.map(b => `<tr><td class="mono">${esc(b.at.slice(0, 16).replace("T", " "))}</td><td class="mono">${esc(b.name)}</td><td class="n mono">${b.ads.length}</td><td class="n">${c ? `<a class="lnk" href="${bdAdsLink(c, b.campaign_id)}" target="_blank" rel="noopener">Ads Manager ↗</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : "";
  let body;
  if (!CLOUD) body = `<p class="sub proto">${L("Прототип: збирання кампанії працює після входу на сервер і підключення Meta.","Прототип: сборка кампании работает после входа на сервер и подключения Meta.")}</p>`;
  else if (!c) body = `<p class="sub">${L("Спершу підключіть рекламний кабінет Meta в проєкті.","Сначала подключите рекламный кабинет Meta в проекте.")}</p><div class="row"><button class="btn btn--sm" data-act="wsBackF">${L("До проєкту","К проекту")}</button></div>`;
  else if (!bdCanWrite(c)) body = `<p class="mterr">${L("Ключ підключення має тільки право на читання. Щоб збирати кампанії, згенеруйте ключ у системного користувача з правами ads_read і ads_management та замініть його в «Підключеннях» проєкту.","У ключа подключения только право на чтение. Чтобы собирать кампании, сгенерируйте ключ у системного пользователя с правами ads_read и ads_management и замените его в «Подключениях» проекта.")}</p>`;
  else if (BD.open !== f.id) body = `<div class="row"><button class="btn btn--solid" data-act="bdOpen" data-id="${f.id}">${L("Зібрати кампанію в Meta","Собрать кампанию в Meta")}</button></div>`;
  else body = bdForm(f, p, c);
  return `<div class="panel" id="bd"><span class="tag">${L("Кампанія в Meta","Кампания в Meta")}</span>${body}${hist}</div>`;
}
function bdForm(f, p, c){ const F0 = BD.form, cur = c.account.currency || "USD", R = BD.run || {}, dis = BD.busy ? " disabled" : "";
  const inp = (k, label, o = {}) => `<div class="field${o.w ? " w" : ""}"><label for="bd-${k}">${label}</label><input id="bd-${k}" data-bd="${k}" value="${esc(F0[k])}"${o.num ? ` inputmode="decimal"` : ""}${o.type ? ` type="${o.type}"` : ""}${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${dis}>${o.hint ? `<span class="sub">${o.hint}</span>` : ""}</div>`;
  const sel = (k, label, rows) => `<div class="field"><label for="bd-${k}">${label}</label><select id="bd-${k}" data-bd="${k}"${dis}>${rows.map(r => `<option value="${r[0]}"${String(F0[k]) === r[0] ? " selected" : ""}>${esc(r[1])}</option>`).join("")}</select></div>`;
  const lands = f.lands.map(l => bdUrl(l.url)), errs = bdCheck(F0, c), done = id => R.ads && R.ads[id] && R.ads[id].ad_id;
  const ads = F0.ads.map(a => { const file = BD.files[a.id];
    return `<div class="item${a.on ? "" : " off"}"><div class="row sp"><label class="row"><input type="checkbox" data-bd="ad:${a.id}:on"${a.on ? " checked" : ""}${dis}> <b class="mono">${esc(a.name || "—")}</b></label>${done(a.id) ? pill("good", L("створено","создано")) : ""}${a.custom ? del("bdAdDel", a.id) : ""}</div>
      ${a.on ? `<div class="form"><div class="field"><label for="bd-an-${a.id}">${L("Назва (у мітку utm_content)","Название (в метку utm_content)")}</label><input id="bd-an-${a.id}" data-bd="ad:${a.id}:name" value="${esc(a.name)}"${dis}></div>
        <div class="field"><label>${L("Файл","Файл")}</label><label class="btn btn--sm"><input type="file" hidden accept="image/*,video/*" data-bdf="${a.id}"${dis}>${file ? esc(file.name) : a.path ? esc(a.fname) + " · " + L("замінити","заменить") : L("Обрати файл","Выбрать файл")}</label><span class="sub">${file ? (file.type.indexOf("video") === 0 ? L("відео","видео") : L("картинка","картинка")) + " · " + fileSize(file.size) : a.path ? L("візьмемо з файлів воронки","возьмём из файлов воронки") : L("картинка до 8 МБ або відео","картинка до 8 МБ или видео")}</span></div>
        <div class="field w"><label for="bd-at-${a.id}">${L("Основний текст","Основной текст")}</label><textarea id="bd-at-${a.id}" rows="3" data-bd="ad:${a.id}:text"${dis}>${esc(a.text)}</textarea></div></div>` : ""}</div>`; }).join("");
  const name = bdLatin(F0.name), when = new Date(bdKyivToUtc(F0.date, F0.time));
  return `<p class="sub">${L("Усе створюється вимкненим: кампанія, група й оголошення. Увімкнете самі в Ads Manager, коли перевірите. Акаунт: ","Всё создаётся выключенным: кампания, группа и объявления. Включите сами в Ads Manager, когда проверите. Аккаунт: ")}<b>${esc(c.account.name)}</b>, ${L("сторінка","страница")}: <b>${c.page ? esc(c.page.name) : "—"}</b>, ${L("піксель","пиксель")}: <b>${c.pixel ? esc(c.pixel.name) : "—"}</b>.</p>
    <div class="form">
      ${inp("name", L("Назва кампанії","Название кампании"), {w:1, hint:L("Іде в мітку utm_campaign, тому тільки латиниця. Буде: ","Уходит в метку utm_campaign, поэтому только латиница. Будет: ") + `<span class="mono">${esc(name || "—")}</span>`})}
      ${sel("event", L("Що оптимізуємо","Что оптимизируем"), BD_EVENTS())}
      ${inp("budget", L("Бюджет на день, ","Бюджет в день, ") + esc(cur), {num:1})}
      <div class="field w"><label for="bd-link">${L("Лендинг","Лендинг")}</label><input id="bd-link" data-bd="link" value="${esc(F0.link)}" list="bd-lands" placeholder="https://"${dis}><datalist id="bd-lands">${lands.map(u => `<option value="${esc(u)}">`).join("")}</datalist><span class="sub">${L("Мітки UTM додаються самі: ","Метки UTM добавляются сами: ")}<span class="mono">${esc(UTM)}</span></span></div>
      ${inp("countries", L("Країни","Страны"), {ph:"UA, PL"})}
      <div class="field"><label>${L("Аудиторія","Аудитория")}</label><label class="row bdck"><input type="checkbox" data-bd="advantage"${F0.advantage ? " checked" : ""}${dis}> ${L("Advantage+ — Meta сама шукає людей","Advantage+ — Meta сама ищет людей")}</label></div>
      ${F0.advantage ? "" : inp("age_min", L("Вік від","Возраст от"), {num:1}) + inp("age_max", L("Вік до","Возраст до"), {num:1}) + sel("gender", L("Стать","Пол"), [["",L("усі","все")],["f",L("жінки","женщины")],["m",L("чоловіки","мужчины")]])}
      ${inp("adset", L("Назва групи","Название группы"), {ph:bdAdset(Object.assign({}, F0, {adset:""})), hint:L("Порожньо — збереться сама; йде в utm_term.","Пусто — соберётся сама; уходит в utm_term.")})}
      ${inp("date", L("Старт, дата (Київ)","Старт, дата (Киев)"), {type:"date"})}${inp("time", L("Час (Київ)","Время (Киев)"), {type:"time"})}
      ${inp("headline", L("Заголовок під картинкою","Заголовок под картинкой"), {ph:L("спільний для всіх оголошень","общий для всех объявлений")})}
      ${inp("description", L("Опис посилання","Описание ссылки"))}
      ${sel("cta", L("Кнопка","Кнопка"), BD_CTA)}
    </div>
    <span class="tag">${L("Оголошення","Объявления")} · ${F0.ads.filter(a => a.on).length}</span>
    ${ads || `<p class="sub">${L("У воронці ще немає креативів — додайте оголошення тут або на кроці «Креативи».","В воронке ещё нет креативов — добавьте объявление здесь или на шаге «Креативы».")}</p>`}
    <div class="row"><button class="btn btn--sm" data-act="bdAdAdd"${dis}>${L("+ Оголошення","+ Объявление")}</button></div>
    ${errs.length && !BD.busy ? `<p class="sub">${L("Ще потрібно: ","Ещё нужно: ")}${esc(errs.join(", "))}.</p>` : ""}
    ${BD.err ? `<p class="mterr" role="alert">${esc(BD.err)}</p>` : ""}
    ${BD.busy ? `<p class="sub" role="status">${esc(BD.step)}</p>` : ""}
    <div class="row"><button class="btn btn--solid" data-act="bdRun"${errs.length || BD.busy ? " disabled" : ""}>${BD.busy ? L("Збираємо…","Собираем…") : R.campaign_id ? L("Продовжити збирання","Продолжить сборку") : L("Зібрати вимкненою · старт ","Собрать выключенной · старт ") + when.toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {timeZone:"Europe/Kyiv", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})}</button>
      <button class="btn" data-act="bdClose"${dis}>${L("Скасувати","Отмена")}</button></div>`;
}
const bdB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
async function bdBlob(a){ if (BD.files[a.id]) return BD.files[a.id];
  const r = await sb.storage.from("files").download(a.path); if (r.error || !r.data) throw new Error(L("не вдалося взяти файл ","не удалось взять файл ") + a.fname);
  return new File([r.data], a.fname || a.name, {type:r.data.type || (a.type === "img" ? "image/jpeg" : "video/mp4")}); }
async function bdStep(body, label){ BD.step = label; render(); const r = await mtCall(Object.assign({project_id:P().id}, body)); if (!r.ok) throw r; return r; }
const bdWait = ms => new Promise(ok => setTimeout(ok, ms));
async function bdMedia(a, R){ const x = R.ads[a.id] = R.ads[a.id] || {}; if (x.hash || x.picture) return x;
  const file = await bdBlob(a), isV = (file.type || "").indexOf("video") === 0 || (!file.type && a.type === "video");
  if (!isV) { if (file.size > 8 * 1048576) throw {error:"bad", detail:L("картинка більша за 8 МБ: ","картинка больше 8 МБ: ") + a.name};
    x.hash = (await bdStep({action:"b_image", name:a.name, data:await bdB64(file)}, L("Завантажуємо картинку ","Загружаем картинку ") + a.name)).hash; return x; }
  if (!x.video_id || !x.uploaded) { const s = await bdStep({action:"b_video_start", size:file.size}, L("Готуємо завантаження відео ","Готовим загрузку видео ") + a.name);
    x.video_id = s.video_id; let st = s.start, en = s.end;
    while (st < en) { const chunk = file.slice(st, Math.min(en, st + 4 * 1048576));
      const r = await bdStep({action:"b_video_chunk", session:s.session, start:st, data:await bdB64(chunk)}, L("Відео ","Видео ") + a.name + ": " + Math.round(st / file.size * 100) + "%"); st = r.start; en = r.end; }
    await bdStep({action:"b_video_finish", session:s.session, name:a.name}, L("Відео завантажено, Meta його обробляє…","Видео загружено, Meta его обрабатывает…")); x.uploaded = true; }
  for (let i = 0; i < 36; i++) { const v = await bdStep({action:"b_video_status", video_id:x.video_id}, L("Meta обробляє відео ","Meta обрабатывает видео ") + a.name + " · " + (i * 5) + L(" с"," с"));
    if (v.picture && (v.state === "ready" || i > 3)) { x.picture = v.picture; return x; } if (v.state === "error") throw {error:"meta", detail:L("Meta не змогла обробити відео ","Meta не смогла обработать видео ") + a.name}; await bdWait(5000); }
  throw {error:"slow", detail:L("Meta ще обробляє відео. Зачекайте хвилину й натисніть «Продовжити збирання» — уже завантажене не повториться.","Meta ещё обрабатывает видео. Подождите минуту и нажмите «Продолжить сборку» — уже загруженное не повторится.")}; }
async function bdRunAll(){ const f = F(), p = P(), F0 = BD.form, c = bdConn(p); if (!f || !p || !c || BD.busy) return;
  BD.busy = true; BD.err = ""; const R = BD.run = BD.run || {ads:{}}, name = bdLatin(F0.name), adset = bdAdset(F0), start = new Date(bdKyivToUtc(F0.date, F0.time)).toISOString();
  try {
    if (!R.campaign_id) { const r = await bdStep({action:"b_campaign", name, event:F0.event}, L("Створюємо кампанію…","Создаём кампанию…")); R.campaign_id = r.id; R.name = r.name; }
    if (!R.adset_id) R.adset_id = (await bdStep({action:"b_adset", campaign_id:R.campaign_id, name:adset, event:F0.event, daily_budget:+String(F0.budget).replace(",", "."), start_time:start,
      countries:F0.countries.toUpperCase().split(/[^A-Z]+/).filter(x => x.length === 2), advantage:F0.advantage, age_min:+F0.age_min, age_max:+F0.age_max, gender:F0.gender}, L("Створюємо групу оголошень…","Создаём группу объявлений…"))).id;
    for (const a of F0.ads.filter(x => x.on)) { const x = await bdMedia(a, R); if (x.ad_id) continue;
      const r = await bdStep({action:"b_ad", adset_id:R.adset_id, name:a.name, text:a.text, headline:F0.headline, description:F0.description, cta:F0.cta, link:bdUrl(F0.link), url_tags:UTM,
        image_hash:x.hash, video_id:x.picture ? x.video_id : undefined, picture:x.picture, creative_id:x.creative_id}, L("Створюємо оголошення ","Создаём объявление ") + a.name);
      x.creative_id = r.creative_id; x.ad_id = r.id; }
    f.builds = f.builds || []; f.builds.unshift({at:new Date().toISOString(), name:R.name || name, campaign_id:R.campaign_id, adset_id:R.adset_id, start, ads:F0.ads.filter(a => a.on).map(a => ({name:a.name, id:R.ads[a.id].ad_id}))});
    p.campMap = p.campMap || {}; p.campMap[R.campaign_id] = f.id; /* статистика этой кампании попадёт в воронку, даже если название её не содержит */
    BD.open = null; BD.run = null; BD.files = {}; save(); toast(L("Кампанію зібрано вимкненою. Перевірте її в Ads Manager і ввімкніть, коли будете готові.","Кампания собрана выключенной. Проверьте её в Ads Manager и включите, когда будете готовы."));
  } catch (e) { BD.err = e && e.error ? (e.error === "slow" || e.error === "bad" && e.detail && e.detail.length > 12 ? e.detail : bdErr(e)) : L("Не вдалося: ","Не удалось: ") + (e && e.message || e);
    if (R.campaign_id) BD.err += " " + L("Уже створене збережено: «Продовжити збирання» почне з місця зупинки.","Уже созданное сохранено: «Продолжить сборку» начнёт с места остановки."); }
  BD.busy = false; BD.step = ""; render(); }
const bdErr = d => ({no_pixel:L("У підключенні немає пікселя — оберіть його в «Підключеннях» або ціль «Перегляди сторінки».","В подключении нет пикселя — выберите его в «Подключениях» или цель «Просмотры страницы»."), no_page:L("У підключенні немає сторінки — оберіть її в «Підключеннях».","В подключении нет страницы — выберите её в «Подключениях»."),
  bad:L("Перевірте поле: ","Проверьте поле: ") + ({name:L("назва кампанії","название кампании"), budget:L("бюджет","бюджет"), start:L("старт","старт"), countries:L("країни","страны"), link:L("лендинг","лендинг"), image:L("картинка","картинка"), media:L("файл оголошення","файл объявления")}[d.detail] || d.detail || "")}[d.error] || mtErr(d));
Object.assign(ACT, {
  bdOpen(d){ const f = F(), p = P(); if (!f || !p) return false; BD.open = f.id; bdInit(f, p); setTimeout(() => { const el = document.getElementById("bd"); if (el) el.scrollIntoView({block:"start", behavior:"smooth"}); }, 50); },
  bdClose(){ if (BD.busy) return false; BD.open = null; BD.run = null; BD.files = {}; BD.err = ""; },
  bdRun(){ bdRunAll(); return false; },
  bdAdAdd(){ if (!BD.form) return false; BD.form.ads.push({id:"n" + uid(), on:true, name:"ad_" + (BD.form.ads.length + 1), text:(BD.form.ads.find(a => a.text) || {}).text || "", type:"img", path:"", fname:"", custom:true}); },
  bdAdDel(d){ if (!BD.form) return false; BD.form.ads = BD.form.ads.filter(a => a.id !== d.id); delete BD.files[d.id]; },
});
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.bd || !BD.form) return; const k = t.dataset.bd;
  if (k.indexOf("ad:") === 0) { const [, id, fk] = k.split(":"), a = BD.form.ads.find(x => x.id === id); if (a && fk !== "on") a[fk] = fk === "name" ? t.value : t.value; return; }
  if (t.type !== "checkbox" && t.tagName !== "SELECT") BD.form[k] = t.value; });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !BD.form) return;
  if (t.dataset.bdf) { const file = t.files && t.files[0], a = BD.form.ads.find(x => x.id === t.dataset.bdf); if (!file || !a) return; BD.files[a.id] = file; a.type = file.type.indexOf("video") === 0 ? "video" : "img";
    if (a.custom && /^ad_\d+$/.test(a.name)) a.name = bdLatin(slug(file.name)); if (BD.run && BD.run.ads) delete BD.run.ads[a.id]; render(); return; }
  if (!t.dataset.bd) return; const k = t.dataset.bd;
  if (k.indexOf("ad:") === 0) { const [, id, fk] = k.split(":"), a = BD.form.ads.find(x => x.id === id); if (!a) return; if (fk === "on") a.on = t.checked; else if (fk === "name") a.name = bdLatin(t.value); else a[fk] = t.value; render(); return; }
  BD.form[k] = t.type === "checkbox" ? t.checked : t.value; if (k === "name" || k === "adset") BD.form[k] = t.value ? t.value : ""; render(); });
