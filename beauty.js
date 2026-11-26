/* HEYROW Beauty — отдельный сервис для мастеров услуг (косметологи и т.п.), у которых реклама ведёт в Instagram Direct.
   Три блока: сводка (Хиро), журнал клиентов «Записалась / Купила / Ні», реклама по покупателям.
   Данные: функция lite (статистика Meta только читается, журнал — таблица lite_sales). В Meta ничего не уходит.
   Отдельный продукт (Дмитрий, 24.11.2026): своя сессия входа (storageKey heyrow-beauty-auth), своя регистрация, свои кабинеты (companies.kind = beauty) —
   проекты основного кабинета сюда не попадают и наоборот. Своё подключение рекламного аккаунта (функция meta: check / save). Боковая панель: Сьогодні, Клієнти, Реклама, Підключення. */
const RK = window.RK || {};
let sb = null, lang = (() => { try { return localStorage.getItem("lite_lang") || "uk"; } catch (e) { return "uk"; } })();
const L = (uk, ru) => lang === "ru" ? ru : uk;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const S = {user:null, step:"boot", mail:"", projects:[], pid:ls("lite_pid") || "", days:+(ls("lite_days") || 7), data:null, busy:false, err:"", form:{status:"bought", cur:ls("lite_cur") || "UAH", d:today()}, ask:null, rate:{USD:0, EUR:0}, tab:ls("lite_tab") || "list", page:ls("beauty_page") || "today", ob:{name:""}, mt:{token:"", seen:null, acc:"", pg:"", busy:false, err:""}};
const SYM = {UAH:"₴", USD:"$", EUR:"€"};
/* деньги: пробел между тысячами, запятая в дробях, знак после числа */
const money = (v, cur, frac) => { const n = +v || 0, f = frac == null ? (Math.abs(n) < 100 ? 2 : 0) : frac;
  return n.toLocaleString("uk-UA", {minimumFractionDigits:f, maximumFractionDigits:f}).replace(/ /g, " ") + " " + (SYM[cur] || cur || "$"); };
const int = v => Math.round(+v || 0).toLocaleString("uk-UA").replace(/ /g, " ");
/* множественное число: 1 клієнт, 2–4 клієнти, 5+ клієнтів */
const pl = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "—";
const dd = d => d ? d.slice(8, 10) + "." + d.slice(5, 7) : "";

/* курс НБУ: продажи в гривнах пересчитываются в валюту рекламного кабинета */
async function loadRate(){ try { const r = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"); const j = await r.json();
  for (const x of j) if (x.cc === "USD" || x.cc === "EUR") S.rate[x.cc] = +x.rate; render(); } catch (e) { /* без курса показываем суммы как есть */ } }
/* сумма продажи в валюте рекламы */
function conv(amount, from, to){ from = from || to; if (!from || from === to) return +amount || 0;
  const uah = from === "UAH" ? +amount : (+amount) * (S.rate[from] || 0); if (to === "UAH") return uah; const r = S.rate[to]; return r ? uah / r : NaN; }

async function call(body){ try { const r = await sb.functions.invoke("lite", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const errText = r => ({net:L("Сервер не відповів. Перевір інтернет і онови сторінку.","Сервер не ответил. Проверь интернет и обнови страницу."), denied:L("У тебе немає доступу до цього проєкту. Попроси таргетолога додати твою пошту.","У тебя нет доступа к этому проекту. Попроси таргетолога добавить твою почту."), not_signed_in:L("Увійди ще раз.","Войди еще раз.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
function toast(t){ const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3200); }

/* ---------- данные ---------- */
async function boot(){
  if (!RK.url || !RK.key || !window.supabase) { S.step = "noserver"; return render(); }
  sb = window.supabase.createClient(RK.url, RK.key, {auth:{storageKey:"heyrow-beauty-auth", persistSession:true, detectSessionInUrl:true}});
  const s = (await sb.auth.getSession()).data.session; S.user = s && s.user;
  sb.auth.onAuthStateChange((_e, ss) => { const had = !!S.user; S.user = ss && ss.user; if (!had && S.user) loadProjects(); });
  if (!S.user) { S.step = "login"; return render(); }
  try { localStorage.removeItem("beauty_back"); } catch (e) {}
  loadProjects(); loadRate();
}
async function loadProjects(){ S.step = "load"; render(); const r = await call({action:"projects", product:"beauty"});
  if (!r.ok) { S.step = "err"; S.err = errText(r); return render(); }
  S.projects = r.projects; if (!S.projects.find(p => p.id === S.pid)) S.pid = (S.projects.find(p => p.meta) || S.projects[0] || {}).id || "";
  if (!S.pid) { S.step = "onboard"; return render(); }
  ls("lite_pid", S.pid); S.step = "app"; loadStats(); }
async function loadStats(){ S.busy = true; render(); const r = await call({action:"stats", project_id:S.pid, days:S.days}); S.busy = false;
  if (!r.ok) { S.err = errText(r); S.data = null; } else { S.err = ""; S.data = r; }
  render(); }

/* итоги в валюте рекламы */
function calc(){ const d = S.data; if (!d) return null; const cur = d.currency || "USD", t = d.total;
  const bought = d.sales.filter(x => x.status === "bought"), revenue = bought.reduce((a, x) => a + conv(x.amount, x.cur, cur), 0);
  const booked = d.sales.filter(x => x.status === "booked").length, clients = bought.length;
  const byAd = {}; for (const x of bought) if (x.ad_id) { const o = byAd[x.ad_id] = byAd[x.ad_id] || {n:0, rev:0}; o.n++; o.rev += conv(x.amount, x.cur, cur); }
  return {cur, spend:t.spend, conv:t.conv, booked, clients, no:d.sales.filter(x => x.status === "no").length, revenue,
    cpc:t.conv ? t.spend / t.conv : 0, cac:clients ? t.spend / clients : 0, roi:t.spend ? revenue / t.spend : 0, byAd, noRate:isNaN(revenue)}; }

/* ---------- экраны ---------- */
function vLogin(){ return `<section class="hp lite-hero"><div class="hp__t"><span class="heytag">Hey!</span><h2>${L("Твоя реклама і клієнти в одному місці","Твоя реклама и клиенты в одном месте")}</h2>
  <p>${L("Скільки людей написали в Direct, хто купив і скільки грошей повернула реклама.","Сколько людей написали в Direct, кто купил и сколько денег вернула реклама.")}</p>
  ${S.step === "sent" ? `<p><b>${L("Лист надіслано на ","Письмо отправлено на ")}${esc(S.mail)}.</b> ${L("Відкрий посилання з листа на цьому пристрої.","Открой ссылку из письма на этом устройстве.")}</p><div class="row"><button type="button" class="btn btn--glass" data-act="again">${L("Інша пошта","Другая почта")}</button></div>`
  : `<form class="lite-login" data-form="login"><label class="sr" for="mail">${L("Пошта","Почта")}</label><input id="mail" type="email" required autocomplete="email" placeholder="${L("твоя пошта","твоя почта")}" value="${esc(S.mail)}"><button class="btn btn--main" type="submit">${L("Отримати посилання для входу","Получить ссылку для входа")}</button></form>
  <p class="lite-fine">${L("Нема акаунта? Цей самий лист створить його. Окремий вхід — не той, що в основному кабінеті HEYROW.","Нет аккаунта? Это же письмо создаст его. Отдельный вход — не тот, что в основном кабинете HEYROW.")}</p>`}</div>
  <img class="hp__h" src="ui/hiro3d/hey.webp" alt="" width="210" height="250"></section>`; }

function vState(pose, title, text, btn){ return `<section class="panel lite-state"><img src="ui/hiro3d/${pose}.webp" alt="" width="160" height="190"><h2>${title}</h2><p class="sub">${text}</p>${btn || ""}</section>`; }

function vHero(c){ const d = S.data, cur = c.cur;
  let title, text, pose;
  if (!d.meta) { pose = "point"; title = L("Рекламу ще не підключено","Реклама еще не подключена"); text = L("Підключи рекламний акаунт Meta в розділі «Підключення». Журнал клієнтів уже можна вести.","Подключи рекламный аккаунт Meta в разделе «Подключение». Журнал клиентов уже можно вести."); }
  else if (c.clients) { pose = c.roi >= 1 ? "win" : "watch"; title = L(`${c.clients} ${pl(c.clients, "клієнт", "клієнти", "клієнтів")} за ${money(c.cac, cur)}`, `${c.clients} ${pl(c.clients, "клиент", "клиента", "клиентов")} по ${money(c.cac, cur)}`);
    text = c.noRate ? L("Не вдалося отримати курс НБУ, тому виручку в гривнях поки не порахував.","Не получилось взять курс НБУ, поэтому выручку в гривнах пока не посчитал.") : c.roi >= 1 ? L(`Кожен долар реклами приніс ${money(c.roi, cur, 2)} виручки.`, `Каждый доллар рекламы принес ${money(c.roi, cur, 2)} выручки.`) : L("Реклама поки не окупилась. Подивись, які оголошення приводять покупців, а не лише повідомлення.","Реклама пока не окупилась. Посмотри, какие объявления приводят покупателей, а не только переписки."); }
  else if (c.conv) { pose = "idea"; title = L(`${int(c.conv)} листувань за ${money(c.cpc, cur)}`, `${int(c.conv)} переписок по ${money(c.cpc, cur)}`); text = L("Познач, хто з них записався і хто купив, і я порахую ціну клієнта.","Отметь, кто из них записался и кто купил, и я посчитаю цену клиента."); }
  else { pose = "watch"; title = L("Повідомлень за цей період немає","Переписок за этот период нет"); text = d.meta_err ? L("Meta відповіла помилкою: ","Meta ответила ошибкой: ") + d.meta_err : L("Можливо, реклама не працювала. Обери довший період.","Возможно, реклама не работала. Выбери период длиннее."); }
  const keys = [[L("Витрачено","Потрачено"), money(c.spend, cur)], [L("Повідомлень","Переписок"), int(c.conv)], [L("Ціна клієнта","Цена клиента"), c.clients ? money(c.cac, cur) : "—", c.clients && c.roi < 1], [L("Повернулось на 1 $","Вернулось на 1 $").replace("$", SYM[cur] || "$"), c.clients && !c.noRate ? money(c.roi, SYM[cur] || "$", 2) : "—", c.clients && c.roi < 1]];
  return `<section class="hp" aria-label="${L("Головне за період","Главное за период")}"><div class="hp__t"><span class="heytag">Hey!</span><h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="row"><button type="button" class="btn btn--main" data-act="focusAdd">${L("Додати клієнта","Добавить клиента")}</button></div></div>
    <dl class="hp__k">${keys.map(k => `<div><dt>${k[0]}</dt><dd${k[2] ? ' class="hot"' : ""}>${k[1]}</dd></div>`).join("")}</dl>
    <img class="hp__h" src="ui/hiro3d/${pose}.webp" alt="" width="210" height="250"></section>`; }

/* путь клиента: переписки → записались → купили */
function vPath(c){ const st = [[L("Написали в Direct","Написали в Direct"), c.conv], [L("Записались","Записались"), c.booked + c.clients], [L("Купили","Купили"), c.clients]];
  return `<div class="lite-path">${st.map((s, i) => `<div><span class="tag">${s[0]}</span><b class="num">${int(s[1])}</b>${i ? `<small class="sub">${pct(s[1], st[i - 1][1])} ${L("від попереднього","от предыдущего")}</small>` : ""}</div>`).join('<i aria-hidden="true">→</i>')}</div>`; }

function vAdd(c){ const f = S.form, ads = (S.data.ads || []).filter(a => a.conv || a.spend);
  const stB = [["booked", L("Записалась","Записалась")], ["bought", L("Купила","Купила")], ["no", L("Ні","Нет")]];
  return `<form class="panel lite-add" data-form="add" id="add"><div class="row sp"><span class="tag">${L("Новий клієнт","Новый клиент")}</span></div>
    <div class="lite-grid">
      <div class="field"><label for="f-who">${L("Нік або ім’я","Ник или имя")}</label><input id="f-who" value="${esc(f.who || "")}" placeholder="@nik" autocomplete="off" maxlength="80"></div>
      <div class="field"><label>${L("Що сталося","Что произошло")}</label><span class="seg" role="group">${stB.map(s => `<button type="button" data-act="fStatus" data-v="${s[0]}" aria-pressed="${f.status === s[0]}">${s[1]}</button>`).join("")}</span></div>
      <div class="field"${f.status === "no" ? " hidden" : ""}><label for="f-amount">${L("Сума","Сумма")}</label><span class="lite-sum"><input id="f-amount" inputmode="decimal" value="${esc(f.amount || "")}" placeholder="0"><span class="seg seg--xs" role="group">${["UAH", "USD"].map(k => `<button type="button" data-act="fCur" data-v="${k}" aria-pressed="${f.cur === k}">${SYM[k]}</button>`).join("")}</span></span></div>
      <div class="field"><label for="f-d">${L("Дата","Дата")}</label><input id="f-d" type="date" value="${esc(f.d)}" max="${today()}"></div>
      ${ads.length ? `<div class="field lite-wide"><label for="f-ad">${L("З якої реклами (якщо знаєш)","С какой рекламы (если знаешь)")}</label><select id="f-ad"><option value="">${L("не знаю","не знаю")}</option>${ads.map(a => `<option value="${esc(a.id)}"${f.ad === a.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>` : ""}
    </div>
    <div class="row"><button class="btn btn--solid" type="submit">${L("Зберегти","Сохранить")}</button></div></form>`; }

function vList(c){ const d = S.data, sales = d.sales;
  if (!sales.length) return `<section class="panel"><span class="tag">${L("Клієнти","Клиенты")}</span><div class="empty empty--sm"><img src="ui/hiro/empty.webp" alt="" width="64" height="64"><b>${L("Поки нікого не позначено","Пока никого не отмечено")}</b><p class="sub">${L("Додай тих, хто написав у Direct за цей період: хто записався, хто купив, хто відмовився.","Добавь тех, кто написал в Direct за этот период: кто записался, кто купил, кто отказался.")}</p></div></section>`;
  const adName = id => ((d.ads || []).find(a => a.id === id) || {}).name || "";
  const stB = [["booked", L("Записалась","Записалась")], ["bought", L("Купила","Купила")], ["no", L("Ні","Нет")]];
  return `<section class="panel"><div class="row sp"><span class="tag">${L("Клієнти","Клиенты")} · ${sales.length}</span></div><div class="lite-list">${sales.map(x => `<div class="lite-row">
    <div class="lite-row__m"><b>${esc(x.who || L("без імені","без имени"))}</b><small class="sub">${dd(x.d)}${x.ad_id ? " · " + esc(adName(x.ad_id) || L("реклама","реклама")) : ""}</small></div>
    <span class="seg seg--xs" role="group" aria-label="${L("Статус","Статус")}">${stB.map(s => `<button type="button" data-act="setSt" data-id="${x.id}" data-v="${s[0]}" aria-pressed="${x.status === s[0]}">${s[1]}</button>`).join("")}</span>
    <span class="num lite-row__a">${S.amt === x.id ? `<span class="lite-amt"><input id="amt-${x.id}" inputmode="decimal" placeholder="${L("сума","сумма")}" aria-label="${L("Сума покупки","Сумма покупки")}"><span class="seg seg--xs" role="group">${["UAH", "USD"].map(k => `<button type="button" data-act="fCur" data-v="${k}" aria-pressed="${S.form.cur === k}">${SYM[k]}</button>`).join("")}</span><button type="button" class="btn btn--sm btn--solid" data-act="amtSave" data-id="${x.id}">OK</button></span>`
      : x.status === "bought" ? money(x.amount, x.cur || c.cur) + (x.capi_at ? `<small class="lite-capi">${L("передано в Meta","передано в Meta")}</small>` : x.capi_err ? `<small class="lite-capi lite-capi--err" title="${esc(x.capi_err)}">${L("Meta не прийняла","Meta не приняла")}</small>` : "") : x.status === "new" ? `<span class="st st--fix">${L("Написала","Написала")}</span>` : ""}</span>
    ${S.ask === x.id ? `<span class="row"><button type="button" class="btn btn--sm btn--danger" data-act="del" data-id="${x.id}">${L("Так, прибрати","Да, убрать")}</button><button type="button" class="btn btn--sm btn--text" data-act="askNo">${L("Скасувати","Отмена")}</button></span>`
      : `<button type="button" class="btn btn--sm btn--text lite-x" data-act="ask" data-id="${x.id}">${L("Прибрати","Убрать")}</button>`}</div>`).join("")}</div></section>`; }

function vAds(c){ const ads = (S.data.ads || []).filter(a => a.spend > 0);
  if (!S.data.meta) return "";
  if (!ads.length) return `<section class="panel"><span class="tag">${L("Реклама","Реклама")}</span><p class="sub">${L("За цей період оголошення не мали витрат.","За этот период у объявлений не было расходов.")}</p></section>`;
  const rows = ads.map(a => { const b = c.byAd[a.id] || {n:0, rev:0}; return Object.assign({}, a, {b:b.n, rev:b.rev}); }).sort((x, y) => (y.b - x.b) || (y.conv - x.conv) || (y.spend - x.spend));
  const anyB = rows.some(r => r.b);
  return `<section class="panel"><div class="row sp"><span class="tag">${L("Реклама: що приводить клієнтів","Реклама: что приводит клиентов")}</span></div>
    ${anyB ? "" : `<p class="sub">${L("Щоб бачити покупців за оголошеннями, у клієнта вибирай «З якої реклами».","Чтобы видеть покупателей по объявлениям, у клиента выбирай «С какой рекламы».")}</p>`}
    <div class="tw"><table class="lite-t"><thead><tr><th>${L("Оголошення","Объявление")}</th><th>${L("Витрачено","Потрачено")}</th><th>${L("Повідомлень","Переписок")}</th><th>${L("Ціна повідомлення","Цена переписки")}</th><th>${L("Купили","Купили")}</th><th>${L("Ціна клієнта","Цена клиента")}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b><small class="sub">${esc(r.campaign || "")}</small></td><td class="num">${money(r.spend, c.cur)}</td><td class="num">${int(r.conv)}</td><td class="num${r.spend && !r.conv ? " bad" : ""}">${r.conv ? money(r.spend / r.conv, c.cur) : "—"}</td><td class="num">${r.b || "—"}</td><td class="num">${r.b ? money(r.spend / r.b, c.cur) : "—"}</td></tr>`).join("")}</tbody></table></div></section>`; }

/* этап 2: переписки из Instagram и покупки в Meta. Включает собственник или руководитель проекта */
function vIg(){ const d = S.data, g = d.ig || {}, dis = S.igBusy ? " disabled" : "";
  if (!d.meta) return "";
  const head = `<div class="row sp"><span class="tag">${L("Повідомлення з Instagram","Переписки из Instagram")}</span>${g.ig_id ? `<span class="st ${g.err ? "st--err" : "st--on"}">${g.err ? L("помилка","ошибка") : "@" + esc(g.ig_name || "")}</span>` : ""}</div>`;
  if (!g.ready) return `<section class="panel">${head}<p class="sub">${L("Скоро кожен, хто напише в Direct, сам з’являтиметься в журналі разом з оголошенням, з якого прийшов. Зараз HEYROW налаштовує це на своєму боці.","Скоро каждый, кто напишет в Direct, сам появится в журнале вместе с объявлением, с которого пришел. Сейчас HEYROW настраивает это на своей стороне.")}</p></section>`;
  if (!g.ig_id) return `<section class="panel">${head}<p class="sub">${L("Кожен, хто напише в Direct, сам з’явиться в журналі з оголошенням, з якого прийшов. Тобі лишиться натиснути «Купила» або «Ні». Тексти повідомлень я не читаю й не зберігаю.","Каждый, кто напишет в Direct, сам появится в журнале с объявлением, с которого пришел. Тебе останется нажать «Купила» или «Нет». Тексты сообщений я не читаю и не храню.")}</p>
    ${d.admin ? `<div class="row"><button type="button" class="btn btn--main" data-act="igConnect"${dis}>${L("Підключити повідомлення","Подключить переписки")}</button></div>` : `<p class="sub">${L("Підключає власник проєкту.","Подключает владелец проекта.")}</p>`}</section>`;
  const last = g.last_event_at ? new Date(g.last_event_at).toLocaleString(lang === "ru" ? "ru-RU" : "uk-UA", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}).replace(",", "") : "";
  return `<section class="panel">${head}
    <p class="sub">${g.err ? L("Meta не підписала сторінку на повідомлення: ","Meta не подписала страницу на переписки: ") + esc(g.err) : last ? L("Останнє повідомлення надійшло ","Последняя переписка пришла ") + last : L("Підключено. Чекаю перше повідомлення.","Подключено. Жду первую переписку.")}</p>
    ${d.admin ? `<label class="ck"><input type="checkbox" data-act="igCapi" data-v="${g.capi ? "0" : "1"}"${g.capi ? " checked" : ""}${dis}> <span>${L("Передавати покупки в Meta","Передавать покупки в Meta")} <small class="sub">${L("Покупка з сумою з’явиться в Ads Manager біля оголошення. Навчати рекламу на покупках з Instagram Meta поки не вміє.","Покупка с суммой появится в Ads Manager рядом с объявлением. Учить рекламу на покупках из Instagram Meta пока не умеет.")}</small></span></label>
      <div class="row">${S.igAsk === "off" ? `<button type="button" class="btn btn--sm btn--danger" data-act="igOff">${L("Так, відключити","Да, отключить")}</button><button type="button" class="btn btn--sm btn--text" data-act="igNo">${L("Скасувати","Отмена")}</button>` : `<button type="button" class="btn btn--sm btn--text" data-act="igOff">${L("Відключити повідомлення","Отключить переписки")}</button>`}</div>` : ""}</section>`; }

function vBar(){ const p = S.projects.find(x => x.id === S.pid);
  return `<header class="lite-bar"><span class="lite-brand"><img src="ui/logo/logo-on-light.svg" alt="HEYROW" height="24"><b>Beauty</b></span>
    ${S.projects.length > 1 ? `<select class="pfsel" data-ch="pid" aria-label="${L("Проєкт","Проект")}">${S.projects.map(x => `<option value="${x.id}"${x.id === S.pid ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : p ? `<b class="lite-name">${esc(p.name)}</b>` : ""}
    <span class="lite-bar__r">${S.step === "app" ? `<span class="seg seg--xs" role="group" aria-label="${L("Період","Период")}">${[[7, L("7 днів","7 дней")], [30, L("30 днів","30 дней")]].map(x => `<button type="button" data-act="days" data-v="${x[0]}" aria-pressed="${S.days === x[0]}">${x[1]}</button>`).join("")}</span>` : ""}
    <span class="seg seg--xs" role="group" aria-label="Мова"><button type="button" data-act="lang" data-v="uk" aria-pressed="${lang === "uk"}">UA</button><button type="button" data-act="lang" data-v="ru" aria-pressed="${lang === "ru"}">RU</button></span>
    ${S.user ? `<button type="button" class="btn btn--sm btn--text" data-act="out">${L("Вийти","Выйти")}</button>` : ""}</span></header>`; }

/* ---------- регистрация кабинета ---------- */
function vOnboard(){ return `<section class="hp lite-hero"><div class="hp__t"><span class="heytag">Hey!</span><h2>${L("Створимо твій кабінет","Создадим твой кабинет")}</h2>
  <p>${L("Назви його так, як називається твій салон або сторінка в Instagram. Потім підключимо рекламний акаунт.","Назови его так, как называется твой салон или страница в Instagram. Потом подключим рекламный аккаунт.")}</p>
  <form class="lite-login" data-form="ob"><label class="sr" for="ob-name">${L("Назва","Название")}</label><input id="ob-name" required maxlength="80" placeholder="${L("напр. Студія краси Олени","напр. Студия красоты Елены")}" value="${esc(S.ob.name)}"><button class="btn btn--main" type="submit"${S.ob.busy ? " disabled" : ""}>${L("Створити кабінет","Создать кабинет")}</button></form>
  </div><img class="hp__h" src="ui/hiro3d/hey.webp" alt="" width="210" height="250"></section>`; }
/* ---------- подключение рекламного аккаунта Meta: ключ → проверка → акаунт і сторінка → зберегти ---------- */
/* инструкция для мастера: по шагу на действие, у каждого — кнопка на нужную страницу Meta и отметка «Зроблено» (запоминается в браузере).
   Названия пунктов Meta — с английскими в скобках: интерфейс у людей на разных языках. */
const MTSTEPS = () => [
  {t:L("Створи застосунок","Создай приложение"), url:"https://developers.facebook.com/apps/creation/", go:L("Відкрити Meta for Developers","Открыть Meta for Developers"),
    how:[L("Увійди тим самим Facebook, що й до рекламного кабінету.","Войди тем же Facebook, что и в рекламный кабинет."),
      L("Назва — будь-яка, наприклад «Звіти реклами». Її бачиш лише ти. Тип або сценарій — «Інше» (Other), потім «Бізнес» (Business).","Название — любое, например «Отчеты рекламы». Оно видно только тебе. Тип или сценарий — «Другое» (Other), потом «Бизнес» (Business)."),
      L("Обери своє бізнес-портфоліо й натисни «Створити застосунок» (Create app). Більше в застосунку нічого не налаштовуй.","Выбери свое бизнес-портфолио и нажми «Создать приложение» (Create app). Больше в приложении ничего не настраивай.")]},
  {t:L("Додай системного користувача","Добавь системного пользователя"), url:"https://business.facebook.com/settings/system-users", go:L("Відкрити налаштування компанії","Открыть настройки компании"),
    how:[L("Користувачі → Системні користувачі (Users → System users) → «Додати» (Add).","Пользователи → Системные пользователи (Users → System users) → «Добавить» (Add)."),
      L("Ім’я — «HEYROW», роль — «Співробітник» (Employee) → «Створити».","Имя — «HEYROW», роль — «Сотрудник» (Employee) → «Создать».")]},
  {t:L("Дай йому доступ до реклами й сторінки","Дай ему доступ к рекламе и странице"), url:"https://business.facebook.com/settings/system-users", go:L("Відкрити системних користувачів","Открыть системных пользователей"),
    how:[L("Обери користувача «HEYROW» → «Призначити ресурси» (Assign assets).","Выбери пользователя «HEYROW» → «Назначить ресурсы» (Assign assets)."),
      L("«Рекламні акаунти» → твій акаунт → увімкни «Переглядати ефективність» (View performance) → «Зберегти».","«Рекламные аккаунты» → твой аккаунт → включи «Просматривать эффективность» (View performance) → «Сохранить»."),
      L("«Сторінки» → сторінка Facebook, до якої прив’язаний твій Instagram → «Переглядати вміст» і «Повідомлення» → «Зберегти».","«Страницы» → страница Facebook, к которой привязан твой Instagram → «Просматривать контент» и «Сообщения» → «Сохранить»."),
      L("Застосунки (Apps) → «Додати» → обери застосунок із кроку 1 → «Керувати застосунком» (Manage app).","Приложения (Apps) → «Добавить» → выбери приложение из шага 1 → «Управлять приложением» (Manage app).")]},
  {t:L("Створи ключ","Создай ключ"), url:"https://business.facebook.com/settings/system-users", go:L("Відкрити системних користувачів","Открыть системных пользователей"),
    how:[L("У користувача «HEYROW» натисни «Створити маркер» (Generate new token).","У пользователя «HEYROW» нажми «Создать маркер» (Generate new token)."),
      L("Застосунок — той, що створила на кроці 1. Термін дії — «Ніколи» (Never).","Приложение — то, что создала на шаге 1. Срок действия — «Никогда» (Never)."),
      L("Постав галочки: ads_read, pages_show_list, pages_read_engagement. Щоб клієнти з Direct самі з’являлися в журналі — ще instagram_basic, instagram_manage_messages, pages_manage_metadata.","Поставь галочки: ads_read, pages_show_list, pages_read_engagement. Чтобы клиенты из Direct сами появлялись в журнале — еще instagram_basic, instagram_manage_messages, pages_manage_metadata."),
      L("«Створити маркер» → «Копіювати». Meta покаже ключ лише один раз — встав його одразу нижче.","«Создать маркер» → «Копировать». Meta покажет ключ только один раз — вставь его сразу ниже.")]}];
const mtDone = () => { try { return JSON.parse(localStorage.getItem("beauty_mt_done") || "{}"); } catch (e) { return {}; } };
function vMeta(){ const p = S.projects.find(x => x.id === S.pid) || {}, m = S.mt, dis = m.busy ? " disabled" : "";
  if (p.meta) return `<section class="panel"><div class="row sp"><span class="tag">${L("Рекламний акаунт Meta","Рекламный аккаунт Meta")}</span><span class="st st--on">${L("підключено","подключено")}</span></div>
    <p><b>${esc(p.account || "")}</b>${p.currency ? ` <span class="sub">· ${esc(p.currency)}</span>` : ""}</p>
    ${p.role === "owner" ? `<div class="row">${S.mtAsk === "off" ? `<button type="button" class="btn btn--sm btn--danger" data-act="mtOff">${L("Так, відключити","Да, отключить")}</button><button type="button" class="btn btn--sm btn--text" data-act="mtNo">${L("Скасувати","Отмена")}</button>` : `<button type="button" class="btn btn--sm btn--text" data-act="mtOff">${L("Відключити акаунт","Отключить аккаунт")}</button>`}</div>` : ""}</section>`;
  const accs = (m.seen && m.seen.accounts) || [], pages = (m.seen && m.seen.pages) || [];
  return `<section class="panel"><div class="row sp"><span class="tag">${L("Підключи рекламний акаунт Meta","Подключи рекламный аккаунт Meta")}</span><span class="st st--pause">${L("не підключено","не подключено")}</span></div>
    <p class="sub">${L("Без нього я не бачу витрат на рекламу й не порахую, скільки коштує клієнт. Ключ бачить статистику реклами й листування Direct, рекламу не змінює.","Без него я не вижу расходов на рекламу и не посчитаю, сколько стоит клиент. Ключ видит статистику рекламы и переписку Direct, рекламу не меняет.")}</p>
    <p class="sub">${L("Робиться один раз, близько 10 хвилин. Потрібен доступ адміністратора до бізнес-портфоліо, де лежить твій рекламний акаунт. Якщо рекламу тобі веде таргетолог — можеш переслати йому цю сторінку.","Делается один раз, около 10 минут. Нужен доступ администратора к бизнес-портфолио, где лежит твой рекламный аккаунт. Если рекламу тебе ведет таргетолог — можешь переслать ему эту страницу.")}</p>
    <ol class="bty-steps">${MTSTEPS().map((st, i) => { const dn = mtDone()[i]; return `<li class="bty-step${dn ? " is-done" : ""}"><div class="bty-step__h"><span class="bty-step__n">${dn ? (typeof ico === "function" ? ico("done") : "✓") : i + 1}</span><b>${st.t}</b></div>
      <ul>${st.how.map(h => `<li>${h}</li>`).join("")}</ul><div class="row"><a class="btn btn--sm" href="${st.url}" target="_blank" rel="noopener">${st.go}</a><label class="ck"><input type="checkbox" data-ch="mtdone" data-i="${i}"${dn ? " checked" : ""}> ${L("Зроблено","Сделано")}</label></div></li>`; }).join("")}
      <li class="bty-step"><div class="bty-step__h"><span class="bty-step__n">${MTSTEPS().length + 1}</span><b>${L("Встав ключ сюди","Вставь ключ сюда")}</b></div></li></ol>
    ${!m.seen ? `<form class="bty-form" data-form="mt"><label for="mt-token">${L("Ключ доступу","Ключ доступа")}</label><input id="mt-token" type="password" autocomplete="off" required placeholder="EAA…" value="${esc(m.token)}"><button class="btn btn--main" type="submit"${dis}>${m.busy ? L("Перевіряю…","Проверяю…") : L("Перевірити ключ","Проверить ключ")}</button></form>`
    : `<div class="bty-form"><label for="mt-acc">${L("Рекламний акаунт","Рекламный аккаунт")}</label><select id="mt-acc" data-ch="mtacc">${accs.map(a => `<option value="${esc(a.id)}"${a.id === m.acc ? " selected" : ""}>${esc(a.name || a.id)}${a.currency ? " · " + esc(a.currency) : ""}</option>`).join("")}</select>
      <label for="mt-pg">${L("Сторінка Facebook (з Instagram)","Страница Facebook (с Instagram)")}</label><select id="mt-pg" data-ch="mtpg"><option value="">${L("— без сторінки —","— без страницы —")}</option>${pages.map(g => `<option value="${esc(g.id)}"${g.id === m.pg ? " selected" : ""}>${esc(g.name || g.id)}</option>`).join("")}</select>
      <div class="row"><button type="button" class="btn btn--main" data-act="mtSave"${dis || (accs.length ? "" : " disabled")}>${L("Підключити","Подключить")}</button><button type="button" class="btn btn--text" data-act="mtReset">${L("Інший ключ","Другой ключ")}</button></div></div>`}
    ${m.err ? `<p class="mterr">${esc(m.err)}</p>` : ""}</section>`; }
const BPAGES = () => [["today", L("Сьогодні","Сегодня"), "today"], ["clients", L("Клієнти","Клиенты"), "user"], ["ads", L("Реклама","Реклама"), "campaigns"], ["connect", L("Підключення","Подключение"), "connections"]];
function vRail(){ const p = S.projects.find(x => x.id === S.pid), app = S.step === "app";
  return `<aside class="rail bty-rail"><a class="logo" href="beauty.html"><img src="ui/logo/logo-on-dark.svg" alt="HEYROW" width="132" height="32"></a><span class="bty-tag">Beauty</span>
    ${app && S.projects.length > 1 ? `<select class="bty-sel" data-ch="pid" aria-label="${L("Кабінет","Кабинет")}">${S.projects.map(x => `<option value="${x.id}"${x.id === S.pid ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : p ? `<b class="bty-name">${esc(p.name)}</b>` : ""}
    ${app ? `<nav class="navg">${BPAGES().map(n => `<a role="button" tabindex="0" data-act="page" data-v="${n[0]}"${S.page === n[0] ? ' aria-current="page"' : ""}><i class="nbi">${typeof ico === "function" ? ico(n[2]) : ""}</i><span>${n[1]}</span>${n[0] === "connect" && p && !p.meta ? "<b>1</b>" : ""}</a>`).join("")}</nav>` : ""}
    <div class="rail__foot"><span class="seg seg--xs" role="group" aria-label="Мова"><button type="button" data-act="lang" data-v="uk" aria-pressed="${lang === "uk"}">UA</button><button type="button" data-act="lang" data-v="ru" aria-pressed="${lang === "ru"}">RU</button></span>
      ${S.user ? `<small class="bty-mail">${esc(S.user.email || "")}</small><button type="button" class="btn btn--glass btn--sm" data-act="out">${L("Вийти","Выйти")}</button>` : ""}</div></aside>`; }
function vHead(title){ return `<header class="lite-bar"><h1 class="bty-h">${title}</h1><span class="lite-bar__r">${S.page !== "connect" ? `<span class="seg seg--xs" role="group" aria-label="${L("Період","Период")}">${[[7, L("7 днів","7 дней")], [30, L("30 днів","30 дней")]].map(x => `<button type="button" data-act="days" data-v="${x[0]}" aria-pressed="${S.days === x[0]}">${x[1]}</button>`).join("")}</span>` : ""}</span></header>`; }
const noMeta = () => `<section class="panel"><div class="row sp"><b>${L("Рекламний акаунт не підключено","Рекламный аккаунт не подключен")}</b><button type="button" class="btn btn--main btn--sm" data-act="page" data-v="connect">${L("Підключити","Подключить")}</button></div><p class="sub">${L("Журнал клієнтів уже працює. Витрати й ціну клієнта покажу, щойно підключиш акаунт.","Журнал клиентов уже работает. Расходы и цену клиента покажу, как только подключишь аккаунт.")}</p></section>`;
function vSkel(){ return `<section class="hp"><div class="hp__t"><span class="heytag">Hey!</span><h2>${L("Рахую рекламу й клієнтів…","Считаю рекламу и клиентов…")}</h2><p>${L("Беру витрати й повідомлення з Meta.","Беру расходы и переписки из Meta.")}</p></div><img class="hp__h" src="ui/hiro3d/work.webp" alt="" width="210" height="250"></section>`; }

function render(){ const v = $("view"), solo = ["boot", "noserver", "login", "sent"].includes(S.step); let h = "";
  if (S.step === "boot" || S.step === "load") h += vSkel();
  else if (S.step === "noserver") h += vState("oops", L("Сервер не налаштовано","Сервер не настроен"), L("Ця сторінка працює лише з підключеним сервером HEYROW.","Эта страница работает только с подключенным сервером HEYROW."));
  else if (S.step === "login" || S.step === "sent") h += vLogin();
  else if (S.step === "err") h += vState("oops", L("Не вдалося відкрити дані","Не получилось открыть данные"), esc(S.err), `<button type="button" class="btn btn--main" data-act="reload">${L("Спробувати ще раз","Попробовать еще раз")}</button>`);
  else if (S.step === "onboard") h += vOnboard();
  else if (S.page === "connect") h += vHead(L("Підключення","Подключение")) + vMeta() + (S.data ? vIg() : "");
  else if (!S.data) h += vHead(BPAGES().find(x => x[0] === S.page)[1]) + (S.busy ? vSkel() : vState("oops", L("Не вдалося взяти статистику","Не получилось взять статистику"), esc(S.err), `<button type="button" class="btn btn--main" data-act="reload">${L("Спробувати ще раз","Попробовать еще раз")}</button>`));
  else { const c = calc(), p = S.projects.find(x => x.id === S.pid) || {}, nm = !p.meta ? noMeta() : "";
    h += vHead(BPAGES().find(x => x[0] === S.page)[1]);
    if (S.page === "today") h += nm + vHero(c) + vPath(c);
    else if (S.page === "clients") h += `<div class="lite-cols">${vAdd(c)}${vList(c)}</div>`;
    else h += nm || vAds(c);
    if (S.busy) h += `<p class="sub lite-busy">${L("Оновлюю…","Обновляю…")}</p>`; }
  v.innerHTML = solo ? `<main class="lite">${h}</main>` : `<div class="bty">${vRail()}<main class="lite">${h}</main></div>`; }

/* ---------- действия ---------- */
const ACT = {
  page(d){ S.page = d.v; ls("beauty_page", d.v); render(); window.scrollTo(0, 0); },
  mtReset(){ S.mt = {token:"", seen:null, acc:"", pg:"", busy:false, err:""}; render(); },
  async mtSave(){ const m = S.mt; if (!m.acc) return; m.busy = true; m.err = ""; render();
    let r = {}; try { r = (await sb.functions.invoke("meta", {body:{action:"save", project_id:S.pid, token:m.token, account_id:m.acc, account_ids:[m.acc], page_id:m.pg || "", page_ids:m.pg ? [m.pg] : [], pixel_id:""}})).data || {}; } catch (e) { r = {}; }
    m.busy = false; if (!r.ok) { m.err = L("Не вдалося зберегти: ","Не получилось сохранить: ") + (r.detail || r.error || L("сервер не відповів","сервер не ответил")); return render(); }
    S.mt = {token:"", seen:null, acc:"", pg:"", busy:false, err:""}; toast(L("Рекламний акаунт підключено","Рекламный аккаунт подключен")); S.page = "today"; ls("beauty_page", "today"); loadProjects(); },
  async mtOff(){ if (S.mtAsk !== "off") { S.mtAsk = "off"; return render(); } S.mtAsk = null;
    let r = {}; try { r = (await sb.functions.invoke("meta", {body:{action:"disconnect", project_id:S.pid}})).data || {}; } catch (e) { r = {}; }
    if (!r.ok) return toast(errText(r)); toast(L("Акаунт відключено","Аккаунт отключен")); loadProjects(); },
  mtNo(){ S.mtAsk = null; render(); },
  async again(){ S.step = "login"; render(); },
  lang(d){ lang = d.v; ls("lite_lang", lang); document.documentElement.lang = lang === "ru" ? "ru" : "uk"; render(); },
  days(d){ S.days = +d.v; ls("lite_days", String(S.days)); loadStats(); },
  reload(){ S.pid ? loadStats() : loadProjects(); },
  async out(){ await sb.auth.signOut(); S.user = null; S.data = null; S.step = "login"; render(); },
  focusAdd(){ if (S.page !== "clients") { S.page = "clients"; ls("beauty_page", "clients"); render(); } const el = $("f-who"); if (el) { el.scrollIntoView({behavior:"smooth", block:"center"}); el.focus({preventScroll:true}); } },
  fStatus(d){ keepForm(); S.form.status = d.v; render(); },
  fCur(d){ keepForm(); S.form.cur = d.v; ls("lite_cur", d.v); render(); },
  ask(d){ S.ask = +d.id; render(); },
  askNo(){ S.ask = null; render(); },
  async setSt(d){ const x = S.data.sales.find(s => s.id === +d.id); if (!x || x.status === d.v) return;
    if (d.v === "bought" && !+x.amount) { S.amt = x.id; render(); const el = $("amt-" + x.id); if (el) el.focus(); return; }
    const prev = x.status; x.status = d.v; render();
    const r = await call({action:"upd", project_id:S.pid, id:x.id, row:{status:d.v}}); if (!r.ok) { x.status = prev; render(); toast(errText(r)); } },
  async amtSave(d){ const x = S.data.sales.find(s => s.id === +d.id), el = $("amt-" + d.id); if (!x || !el) return; const v = +String(el.value).replace(/\s/g, "").replace(",", ".");
    if (!(v > 0)) { toast(L("Впиши суму покупки.","Впиши сумму покупки.")); el.focus(); return; }
    const r = await call({action:"upd", project_id:S.pid, id:x.id, row:{status:"bought", amount:v, cur:S.form.cur}}); if (!r.ok) return toast(errText(r));
    Object.assign(x, {status:"bought", amount:v, cur:S.form.cur, capi_at:r.capi_at, capi_err:r.capi_err}); S.amt = null; render();
    toast(r.capi_at ? L("Збережено й передано в Meta","Сохранено и передано в Meta") : L("Збережено","Сохранено")); },
  async igConnect(){ S.igBusy = true; render(); const r = await call({action:"ig_connect", project_id:S.pid}); S.igBusy = false;
    if (!r.ok) { render(); return toast(r.error === "no_ig" ? L("До сторінки Facebook цього проєкту не прив’язаний Instagram-акаунт.","К странице Facebook этого проекта не привязан Instagram-аккаунт.") : errText(r)); }
    toast(L("Повідомлення з @","Переписки @") + (r.ig_name || "") + L(" підключено"," подключены")); loadStats(); },
  async igCapi(d){ S.igBusy = true; render(); const r = await call({action:"ig_capi", project_id:S.pid, on:d.v === "1"}); S.igBusy = false;
    if (!r.ok) { render(); return toast(errText(r)); } loadStats(); },
  async igOff(){ if (S.igAsk !== "off") { S.igAsk = "off"; return render(); } S.igAsk = null; const r = await call({action:"ig_off", project_id:S.pid}); if (!r.ok) return toast(errText(r)); loadStats(); },
  igNo(){ S.igAsk = null; render(); },
  async del(d){ const r = await call({action:"del", project_id:S.pid, id:+d.id}); S.ask = null; if (!r.ok) return toast(errText(r)); S.data.sales = S.data.sales.filter(s => s.id !== +d.id); render(); toast(L("Запис прибрано","Запись убрана")); },
};
function keepForm(){ const f = S.form, g = id => $(id) && $(id).value; if ($("f-who")) { f.who = g("f-who"); f.amount = g("f-amount") || ""; f.d = g("f-d") || today(); f.ad = g("f-ad") || ""; } }
document.addEventListener("keydown", e => { const b = e.target.closest && e.target.closest("[role=button][data-act]"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); const f = ACT[b.dataset.act]; if (f) f(b.dataset); } });
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset); } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset.ch === "pid") { S.pid = t.value; ls("lite_pid", S.pid); S.data = null; loadStats(); }
  if (t.dataset.ch === "mtdone") { const d = mtDone(); d[t.dataset.i] = t.checked; try { localStorage.setItem("beauty_mt_done", JSON.stringify(d)); } catch (e) {} render(); }
  if (t.dataset.ch === "mtacc") S.mt.acc = t.value; if (t.dataset.ch === "mtpg") S.mt.pg = t.value; });
document.addEventListener("submit", async e => { const f = e.target; e.preventDefault();
  if (f.dataset.form === "login") { const mail = ($("mail").value || "").trim().toLowerCase(); if (!mail) return; S.mail = mail;
    ls("beauty_back", String(Date.now()));
    const r = await sb.auth.signInWithOtp({email:mail, options:{shouldCreateUser:true, emailRedirectTo:location.origin + location.pathname}});
    if (r.error) return toast(/signups not allowed|not found|not allowed for otp/i.test(r.error.message) ? L("Цієї пошти немає в HEYROW. Попроси таргетолога додати її.","Этой почты нет в HEYROW. Попроси таргетолога добавить ее.") : /rate|seconds|limit/i.test(r.error.message) ? L("Забагато листів. Спробуй за годину.","Слишком много писем. Попробуй через час.") : L("Не вдалося надіслати лист: ","Не получилось отправить письмо: ") + r.error.message);
    S.step = "sent"; return render(); }
  if (f.dataset.form === "ob") { const name = ($("ob-name").value || "").trim(); if (!name) return; S.ob = {name, busy:true}; render();
    const co = await sb.from("companies").insert({name, kind:"beauty"}).select().single();
    if (co.error) { S.ob.busy = false; render(); return toast(L("Не вдалося створити кабінет: ","Не получилось создать кабинет: ") + co.error.message); }
    const pr = await sb.from("projects").insert({company_id:co.data.id, name, data:{beauty:true}}).select().single();
    if (pr.error) { S.ob.busy = false; render(); return toast(L("Кабінет створено, але проєкт — ні: ","Кабинет создан, но проект — нет: ") + pr.error.message); }
    S.pid = pr.data.id; ls("lite_pid", S.pid); S.page = "connect"; ls("beauty_page", "connect"); S.ob = {name:""}; toast(L("Кабінет створено. Тепер підключи рекламний акаунт.","Кабинет создан. Теперь подключи рекламный аккаунт.")); return loadProjects(); }
  if (f.dataset.form === "mt") { const m = S.mt; m.token = ($("mt-token").value || "").trim(); if (!m.token) return; m.busy = true; m.err = ""; render();
    let r = {}; try { r = (await sb.functions.invoke("meta", {body:{action:"check", token:m.token}})).data || {}; } catch (e) { r = {}; }
    m.busy = false; if (!r.ok || !r.seen) { m.err = L("Ключ не підійшов: ","Ключ не подошел: ") + (r.detail || r.error || L("сервер не відповів","сервер не ответил")); return render(); }
    m.seen = r.seen; m.acc = (r.seen.accounts[0] || {}).id || ""; m.pg = (r.seen.pages[0] || {}).id || "";
    if (!r.seen.accounts.length) m.err = L("Ключ не бачить жодного рекламного акаунта. Видай акаунт системному користувачу («Призначити об’єкти»).","Ключ не видит ни одного рекламного аккаунта. Выдай аккаунт системному пользователю («Назначить объекты»)."); return render(); }
  if (f.dataset.form === "add") { keepForm(); const x = S.form;
    if (x.status === "bought" && !(+String(x.amount).replace(",", ".") > 0)) { toast(L("Впиши суму покупки.","Впиши сумму покупки.")); $("f-amount") && $("f-amount").focus(); return; }
    const row = {who:x.who || "", status:x.status, amount:x.status === "no" ? 0 : String(x.amount || "0").replace(/\s/g, ""), cur:x.cur, d:x.d || today(), ad_id:x.ad || ""};
    const r = await call({action:"add", project_id:S.pid, row}); if (!r.ok) return toast(errText(r));
    S.form = {status:x.status, cur:x.cur, d:x.d}; toast(L("Збережено","Сохранено")); loadStats(); } });
document.documentElement.lang = lang === "ru" ? "ru" : "uk";
boot();
