/* ---------- «Перевірка сайту» (Дмитрий, 24.11.2026) ----------
   Пункт в левом меню компании. Хиро говорит «возможно, дело в сайте» — человек сразу проверяет страницу за монеты HEY (функция sitecheck).
   Сервер отдает коды выводов и числа; текст «что не так» и «что сделать» — здесь, на языке интерфейса. */
const COIN = "HEY"; /* рабочее название внутренней монеты — меняется здесь */
const SCK = {st:null, load:false, busy:false, url:"", err:"", open:null};
async function scCall(body){ if (!CLOUD || !sb || !W.co) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("sitecheck", {body:Object.assign({company_id:W.co.id}, body)}); return r.data || {ok:false, error:"net"}; } catch (e) { return {ok:false, error:"net"}; } }
async function scLoad(force){ if (SCK.load || (SCK.st && !force) || !W.co) return; SCK.load = true; const r = await scCall({action:"state"}); SCK.load = false; SCK.st = r.ok ? r : {err:r.error}; render(); }
const scLands = () => { const out = []; (W.projs || []).forEach(p => (p.funnels || []).forEach(f => (f.lands || []).forEach(l => { if (l.url && !out.some(o => o.url === l.url)) out.push({url:l.url, p:p.id, n:p.name + " · " + f.name}); }))); return out; };
const scErr = e => ({no_coins:L("Не вистачає ","Не хватает ") + COIN + L(". Поповни баланс.",". Пополни баланс."), bad_url:L("Адреса не підходить: потрібна сторінка в інтернеті, що починається з https://","Адрес не подходит: нужна страница в интернете, начинается с https://"),
  unreachable:L("Сторінка не відкрилась (або повернула помилку). Монети повернув.","Страница не открылась (или вернула ошибку). Монеты вернул."), too_often:L("Цю адресу вже перевіряли менше хвилини тому.","Этот адрес уже проверяли меньше минуты назад."),
  denied:L("Немає доступу до цієї компанії.","Нет доступа к этой компании."), offline:L("Перевірка працює лише з входом у кабінет.","Проверка работает только со входом в кабинет.")})[e] || L("Не вийшло перевірити. Спробуй ще раз.","Не получилось проверить. Попробуй еще раз.");
const n1 = v => String(Math.round(v * 10) / 10).replace(".", ",");
/* текст вывода: [что не так, что сделать]; v — число с сервера */
function scText(f){ const v = f.v; return ({
  https:[L("Сторінка без https","Страница без https"), L("Увімкни SSL-сертифікат на хостингу — браузер і Meta не довіряють сторінкам без https.","Включи SSL-сертификат на хостинге — браузер и Meta не доверяют страницам без https.")],
  redirects:[L("Переадресацій: ","Переадресаций: ") + v, L("Кожна переадресація — плюс пів секунди. Став у рекламі кінцеву адресу сторінки.","Каждая переадресация — плюс полсекунды. Ставь в рекламе конечный адрес страницы.")],
  ttfb:[L("Сервер відповідає ","Сервер отвечает ") + n1(v / 1000) + L(" с"," с"), L("Норма — до 0,8 с. Увімкни кешування сторінки або CDN (наприклад, Cloudflare), перевір тариф хостингу.","Норма — до 0,8 с. Включи кеширование страницы или CDN (например, Cloudflare), проверь тариф хостинга.")],
  score:[L("Швидкість на телефоні: ","Скорость на телефоне: ") + v + L(" зі 100"," из 100"), f.lvl === "ok" ? L("Добре.","Хорошо.") : L("Нижче 50 — частина людей іде до відкриття сторінки. Нижче — що саме гальмує.","Ниже 50 — часть людей уходит до открытия страницы. Ниже — что именно тормозит.")],
  lcp:[L("Головний блок з’являється за ","Главный блок появляется за ") + n1(v) + L(" с"," с"), f.lvl === "ok" ? L("Добре: до 2,5 с.","Хорошо: до 2,5 с.") : L("Норма — до 2,5 с. Стисни першу картинку (WebP, до 200 КБ), прибери з першого екрана відео й слайдери.","Норма — до 2,5 с. Сожми первую картинку (WebP, до 200 КБ), убери с первого экрана видео и слайдеры.")],
  tbt:[L("Скрипти блокують сторінку на ","Скрипты блокируют страницу на ") + Math.round(v) + L(" мс"," мс"), L("Сторінка не реагує на натискання. Прибери зайві віджети, чати, лічильники; решту завантажуй після відкриття (defer).","Страница не реагирует на нажатия. Убери лишние виджеты, чаты, счетчики; остальное загружай после открытия (defer).")],
  weight:[L("Вага сторінки ","Вес страницы ") + n1(v) + L(" МБ"," МБ"), L("На мобільному інтернеті це довго. Стисни картинки й відео, прибери невикористані шрифти.","На мобильном интернете это долго. Сожми картинки и видео, убери неиспользуемые шрифты.")],
  cls:[L("Сторінка «стрибає» під час завантаження","Страница «прыгает» при загрузке"), L("Задай розміри картинкам і блокам, щоб кнопка не з’їжджала під пальцем.","Задай размеры картинкам и блокам, чтобы кнопка не уезжала из-под пальца.")],
  block:[L("Файлів, що блокують показ: ","Файлов, блокирующих показ: ") + v, L("CSS і скрипти в <head> затримують перший екран. Скрипти — з defer, некритичні стилі — пізніше.","CSS и скрипты в <head> задерживают первый экран. Скрипты — с defer, некритичные стили — позже.")],
  psi_none:[L("Оцінку швидкості від Google не отримав","Оценку скорости от Google не получил"), L("Решту перевірок зробив. Оцінка з’явиться, коли підключимо ключ PageSpeed.","Остальные проверки сделал. Оценка появится, когда подключим ключ PageSpeed.")],
  viewport:[L("Немає налаштування для телефона (viewport)","Нет настройки для телефона (viewport)"), L("Додай у <head>: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.","Добавь в <head>: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")],
  pixel_none:[L("Пікселя Meta на сторінці не видно","Пикселя Meta на странице не видно"), L("Без пікселя Meta не бачить реєстрацій і вчиться на кліках. Постав код пікселя в <head>.","Без пикселя Meta не видит регистраций и учится на кликах. Поставь код пикселя в <head>.")],
  pixel_gtm:[L("Піксель, схоже, через Google Tag Manager","Пиксель, похоже, через Google Tag Manager"), L("Так він спрацьовує пізніше — частина відкриттів сторінки не рахується. Краще код пікселя прямо в <head>.","Так он срабатывает позже — часть открытий страницы не считается. Лучше код пикселя прямо в <head>.")],
  pixel_late:[L("Піксель стоїть не в <head>","Пиксель стоит не в <head>"), L("Він спрацьовує після завантаження сторінки, і Meta недораховує відкриття. Перенеси код у <head>.","Он срабатывает после загрузки страницы, и Meta недосчитывает открытия. Перенеси код в <head>.")],
  pageview:[L("Немає події PageView","Нет события PageView"), L("Додай fbq('track', 'PageView') одразу після init.","Добавь fbq('track', 'PageView') сразу после init.")],
  pixel_ok:[L("Піксель Meta стоїть","Пиксель Meta стоит"), ""],
  lead_ev:[L("Події ліда в коді сторінки немає","События лида в коде страницы нет"), L("Якщо реєстрація рахується на сторінці «дякуємо» — перевір її теж. Якщо ні — Meta не бачить лідів.","Если регистрация считается на странице «спасибо» — проверь и ее. Если нет — Meta не видит лидов.")],
  video:[L("Відео з автозапуском","Видео с автозапуском"), L("Важке відео гальмує перший екран. Постав обкладинку, а відео — після натискання.","Тяжелое видео тормозит первый экран. Поставь обложку, а видео — по нажатию.")],
  yt:[L("Вбудоване відео YouTube / Vimeo","Встроенное видео YouTube / Vimeo"), L("Плеєр завантажує ~1 МБ скриптів. Покажи обкладинку й підвантажуй плеєр після натискання.","Плеер загружает ~1 МБ скриптов. Покажи обложку и подгружай плеер по нажатию.")],
  fields:[L("Полів у формі: ","Полей в форме: ") + v, f.lvl === "ok" ? L("Добре.","Хорошо.") : L("Кожне поле понад 3 знижує реєстрації. Залиш ім’я й телефон або пошту.","Каждое поле сверх 3 снижает регистрации. Оставь имя и телефон или почту.")],
  noform:[L("Форми на сторінці не знайшов","Формы на странице не нашел"), L("Якщо форма у віджеті чи на іншій сторінці — це ще один крок і ще одне завантаження. Краще форма прямо тут.","Если форма в виджете или на другой странице — это еще один шаг и еще одна загрузка. Лучше форма прямо здесь.")],
  scripts:[L("Скриптів на сторінці: ","Скриптов на странице: ") + v, L("Прибери те, що не потрібно для реєстрації: старі лічильники, чати, віджети.","Убери то, что не нужно для регистрации: старые счетчики, чаты, виджеты.")],
  title:[L("Немає заголовка сторінки (title)","Нет заголовка страницы (title)"), L("Додай <title> з обіцянкою з реклами.","Добавь <title> с обещанием из рекламы.")],
  h1:[L("Немає головного заголовка (h1)","Нет главного заголовка (h1)"), L("Перший екран має одразу казати те саме, що реклама.","Первый экран должен сразу говорить то же, что реклама.")]})[f.k] || [f.k, ""]; }
function scResult(c){ const R = c.result || {}, F = R.find || [], P = R.psi, bad = F.filter(f => f.lvl !== "ok"), ok = F.filter(f => f.lvl === "ok");
  const row = f => { const t = scText(f); return `<li class="sc__f sc__f--${f.lvl}"><b>${esc(t[0])}</b>${t[1] ? `<span>${esc(t[1])}</span>` : ""}</li>`; };
  return `<div class="sc__res">
    <div class="plf2">${P ? `<div><span>${L("Швидкість на телефоні","Скорость на телефоне")}</span><b${P.score < 50 ? ' class="is-bad"' : ""}>${P.score}</b></div><div><span>${L("Головний блок","Главный блок")}</span><b${P.lcp > 4 ? ' class="is-bad"' : ""}>${n1(P.lcp)} ${L("с","с")}</b></div><div><span>${L("Вага","Вес")}</span><b${P.mb > 5 ? ' class="is-bad"' : ""}>${n1(P.mb)} ${L("МБ","МБ")}</b></div>` : ""}<div><span>${L("Відповідь сервера","Ответ сервера")}</span><b${R.html && R.html.ms > 1800 ? ' class="is-bad"' : ""}>${R.html ? n1(R.html.ms / 1000) + " " + L("с","с") : "—"}</b></div></div>
    ${bad.length ? `<h4>${L("Що виправити — по черзі","Что исправить — по очереди")}</h4><ol class="placc sc__list">${bad.map(row).join("")}</ol>` : `<p>${L("Явних проблем не знайшов.","Явных проблем не нашел.")}</p>`}
    ${ok.length ? `<p class="sub">${L("Що в порядку: ","Что в порядке: ")}${esc(ok.map(f => scText(f)[0]).join("; "))}.</p>` : ""}
    <p class="sub">${L("Швидкість — оцінка Google PageSpeed для телефона, одна перевірка; цифри можуть коливатися на 5–10 пунктів.","Скорость — оценка Google PageSpeed для телефона, одна проверка; цифры могут колебаться на 5–10 пунктов.")}</p></div>`; }
function vSite(){ scLoad(); const st = SCK.st, lands = scLands(), bal = st && st.balance != null ? st.balance : null, price = st && st.price || 10;
  if (!SCK.url && lands[0]) SCK.url = lands[0].url;
  const hist = st && st.hist || [], cur = SCK.open ? hist.find(h => h.id === SCK.open) : hist.find(h => h.status === "ok");
  return `<section class="plhp" aria-label="${L("Хіро: перевірка сайту","Хиро: проверка сайта")}">${hava("idea", 48)}<div class="plhp__t"><b>${L("Перевірю сторінку так, як її бачить людина з реклами на телефоні","Проверю страницу так, как ее видит человек из рекламы на телефоне")}</b><span>${L("Швидкість, піксель Meta, форма, важкі блоки. Кожна знахідка — з тим, що виправити.","Скорость, пиксель Meta, форма, тяжелые блоки. Каждая находка — с тем, что исправить.")}</span></div>
      <div class="sc__bal"><span>${L("Баланс","Баланс")}</span><b>${bal == null ? "…" : bal} ${COIN}</b></div></section>
    <div class="panel"><form class="sc__form" data-act="scGo" onsubmit="return false">
      <label class="sc__lab" for="sc-url">${L("Адреса сторінки","Адрес страницы")}</label>
      <div class="row"><input id="sc-url" class="tin" type="url" inputmode="url" list="sc-lands" placeholder="https://" value="${esc(SCK.url)}" data-act="scUrl"><datalist id="sc-lands">${lands.map(l => `<option value="${esc(l.url)}">${esc(l.n)}</option>`).join("")}</datalist>
      <button type="button" class="btn btn--main" data-act="scGo"${SCK.busy || bal != null && bal < price ? " disabled" : ""}>${SCK.busy ? L("Перевіряю… до хвилини","Проверяю… до минуты") : L("Перевірити · ","Проверить · ") + price + " " + COIN}</button></div>
      ${SCK.err ? `<p class="mterr">${esc(SCK.err)}</p>` : ""}
      ${bal != null && bal < price ? `<p class="sub">${L("Не вистачає ","Не хватает ") + COIN}. ${L("Поповнення з’явиться незабаром.","Пополнение появится скоро.")}</p>` : `<p class="sub">${L("Монети повертаю, якщо сторінка не відкрилась.","Монеты возвращаю, если страница не открылась.")}</p>`}</form></div>
    ${cur ? `<div class="panel"><div class="row sp"><span class="tag">${esc(cur.url)}</span><time class="sub">${esc(new Date(cur.at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}))}</time></div>${scResult(cur)}</div>` : ""}
    ${hist.length > 1 ? `<div class="panel"><span class="tag">${L("Попередні перевірки","Прошлые проверки")}</span><div class="tw"><table class="tm"><tbody>${hist.map(h => `<tr><td><button type="button" class="btn btn--text btn--sm" data-act="scOpen" data-v="${h.id}">${esc(h.url)}</button></td><td class="n">${h.status === "ok" ? (h.result && h.result.psi ? h.result.psi.score + "/100" : "—") : L("не відкрилась","не открылась")}</td><td class="n">${h.cost} ${COIN}</td></tr>`).join("")}</tbody></table></div></div>` : ""}`; }
Object.assign(ACT, {
  scUrl(d, e){ SCK.url = e && e.target ? e.target.value : SCK.url; return false; },
  async scGo(){ const el = document.getElementById("sc-url"); if (el) SCK.url = el.value.trim(); if (!SCK.url || SCK.busy) return false;
    SCK.busy = true; SCK.err = ""; render(); const pid = (scLands().find(l => l.url === SCK.url) || {}).p;
    const r = await scCall({action:"check", url:SCK.url, project_id:pid}); SCK.busy = false;
    if (SCK.st && r.balance != null) SCK.st.balance = r.balance;
    if (r.ok && r.check) { SCK.st.hist = [r.check].concat(SCK.st.hist || []); SCK.open = r.check.id; } else { SCK.err = scErr(r.error); if (r.error === "unreachable") scLoad(true); }
    render(); return false; },
  scOpen(d){ SCK.open = Number(d.v); },
  /* из разбора Хиро: перейти в проверку сайта с адресом лендинга воронки */
  siteGo(d){ W.cur = null; W.fun = null; W.ctab = "site"; if (d.v) SCK.url = d.v; SCK.err = ""; save(); }
});

/* ---------- предложение Хиро прямо в разборе «дорого» (Дмитрий, 24.11.2026) ----------
   «Перевірю сторінку за 10 HEY?» → «Так» → монеты списываются, проверка идет, результат — в той же карточке. «Ні» — убрать предложение. */
const SCI = {}, scNorm = u => String(u || "").replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
function plSiteOffer(p, A, why){ const k = p.id + A.f.id, s = SCI[k] = SCI[k] || {}, st = SCK.st; scLoad();
  const land = s.url || ((A.f.lands || [])[0] || {}).url || "", price = st && st.price || 10, bal = st && st.balance != null ? st.balance : null, hist = st && st.hist || [];
  const res = s.id ? hist.find(h => h.id === s.id) : null, last = !res && land ? hist.find(h => h.status === "ok" && scNorm(h.url) === scNorm(land) && Date.now() - Date.parse(h.at) < 7 * 864e5) : null;
  const wrap = b => `<div class="scoffer">${hava("idea", 40)}<div class="scoffer__m">${b}</div></div>`;
  if (res) { const prev = hist.find(h => h.id !== res.id && h.status === "ok" && scNorm(h.url) === scNorm(res.url) && h.at < res.at), ps = prev && prev.result && prev.result.psi, rs = res.result && res.result.psi;
    const cmp = ps && rs ? `<p class="sub">${L("Порівняно з перевіркою ","По сравнению с проверкой ")}${new Date(prev.at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})}: ${L("швидкість ","скорость ")}<b>${ps.score} → ${rs.score}</b>, ${L("головний блок ","главный блок ")}<b>${n1(ps.lcp)} → ${n1(rs.lcp)} ${L("с","с")}</b>, ${L("вага ","вес ")}<b>${n1(ps.mb)} → ${n1(rs.mb)} ${L("МБ","МБ")}</b>.</p>` : "";
    return wrap(`<div class="row sp"><b>${L("Перевірив сторінку","Проверил страницу")} ${esc(res.url)}</b><span class="sub">${res.cost ? "−" + res.cost + " " + COIN + " · " : ""}${L("баланс ","баланс ")}${bal == null ? "…" : bal} ${COIN}</span></div>${cmp}${scResult(res)}
      ${s.err ? `<p class="mterr">${esc(s.err)}</p>` : ""}<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="scInlGo" data-k="${k}" data-p="${p.id}" data-again="1"${bal != null && bal < price ? " disabled" : ""}>${ico("refresh")} ${L("Виправлено — перевірити ще раз · ","Исправлено — проверить еще раз · ")}${price} ${COIN}</button><button type="button" class="btn btn--sm btn--text" data-act="scInlNo" data-k="${k}">${L("Згорнути","Свернуть")}</button></div>
      <p class="sub">${L("Оцінка Google від запуску до запуску коливається на 5–15 пунктів. Після правок перевір 1–2 рази й дивись на головний блок і вагу.","Оценка Google от запуска к запуску колеблется на 5–15 пунктов. После правок проверь 1–2 раза и смотри на главный блок и вес.")}</p>`); }
  if (s.no) return "";
  if (s.busy) return wrap(`<b>${L("Перевіряю сторінку…","Проверяю страницу…")}</b><p class="sub">${L("Сторінка: ","Страница: ")}<b>${esc(s.url || land)}</b></p><p class="sub">${L("Швидкість на телефоні, піксель, форма. До хвилини, результат з’явиться тут.","Скорость на телефоне, пиксель, форма. До минуты, результат появится здесь.")}</p>`);
  const low = bal != null && bal < price;
  return wrap(`<span class="heytag">Hey!</span><b>${esc(why)} ${L("Перевірю її за ","Проверю ее за ")}${price} ${COIN}?</b>
    <p class="sub">${L("Подивлюся, як сторінку бачить людина з реклами на телефоні: швидкість, піксель Meta, форма, важкі блоки. Результат покажу тут, з тим, що виправити.","Посмотрю, как страницу видит человек из рекламы на телефоне: скорость, пиксель Meta, форма, тяжелые блоки. Результат покажу здесь, с тем, что исправить.")}</p>
    ${land ? `<p class="sub">${L("Сторінка: ","Страница: ")}<b>${esc(land)}</b></p>` : `<input id="sci-${k}" class="tin" type="url" inputmode="url" placeholder="${L("Адреса сторінки, https://…","Адрес страницы, https://…")}">`}
    ${s.err ? `<p class="mterr">${esc(s.err)}</p>` : ""}
    <div class="row"><button type="button" class="btn btn--main btn--sm" data-act="scInlGo" data-k="${k}" data-p="${p.id}"${low ? " disabled" : ""}>${L("Так, перевір · ","Да, проверь · ")}${price} ${COIN}</button><button type="button" class="btn btn--sm" data-act="scInlNo" data-k="${k}">${L("Ні","Нет")}</button>
    ${last ? `<button type="button" class="btn btn--sm btn--text" data-act="scInlShow" data-k="${k}" data-v="${last.id}">${L("Показати перевірку від ","Показать проверку от ")}${new Date(last.at).toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU", {day:"2-digit", month:"2-digit"})}</button>` : ""}</div>
    <p class="sub">${low ? L("Не вистачає ","Не хватает ") + COIN + L(": на балансі ",": на балансе ") + bal + "." : L("На балансі ","На балансе ") + (bal == null ? "…" : bal) + " " + COIN + L(". Якщо сторінка не відкриється — монети поверну.",". Если страница не откроется — монеты верну.")}</p>`); }
Object.assign(ACT, {
  async scInlGo(d){ const s = SCI[d.k] = SCI[d.k] || {}; if (d.again) { const r0 = s.id && SCK.st ? (SCK.st.hist || []).find(h => h.id === s.id) : null; if (r0) s.url = r0.url; s.id = null; s.no = 0; }
    const el = document.getElementById("sci-" + d.k), p = (W.projs || []).find(x => x.id === d.p);
    const f = p && (p.funnels || []).find(x => d.k === p.id + x.id), url = s.url || (el && el.value.trim()) || (f && ((f.lands || [])[0] || {}).url) || "";
    if (!url) { s.err = L("Впиши адресу сторінки.","Впиши адрес страницы."); render(); return false; }
    s.url = url; s.busy = true; s.err = ""; render();
    const r = await scCall({action:"check", url, project_id:d.p}); s.busy = false;
    if (SCK.st && r.balance != null) SCK.st.balance = r.balance;
    if (r.ok && r.check) { if (SCK.st) SCK.st.hist = [r.check].concat(SCK.st.hist || []); s.id = r.check.id; } else s.err = scErr(r.error);
    render(); return false; },
  scInlNo(d){ const s = SCI[d.k] = SCI[d.k] || {}; s.no = 1; s.id = null; },
  scInlShow(d){ const s = SCI[d.k] = SCI[d.k] || {}; s.id = Number(d.v); }
});
