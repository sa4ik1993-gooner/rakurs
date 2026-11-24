/* HEYROW Lite — кабинет для мастеров услуг (косметологи и т.п.), у которых реклама ведёт в Instagram Direct.
   Три блока: сводка (Хиро), журнал клиентов «Записалась / Купила / Ні», реклама по покупателям.
   Данные: функция lite (статистика Meta только читается, журнал — таблица lite_sales). В Meta ничего не уходит.
   Вход — ссылкой из письма, та же учётная запись, что в основном кабинете. Проект и подключение Meta создаёт таргетолог. */
const RK = window.RK || {};
let sb = null, lang = (() => { try { return localStorage.getItem("lite_lang") || "uk"; } catch (e) { return "uk"; } })();
const L = (uk, ru) => lang === "ru" ? ru : uk;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const S = {user:null, step:"boot", mail:"", projects:[], pid:ls("lite_pid") || "", days:+(ls("lite_days") || 7), data:null, busy:false, err:"", form:{status:"bought", cur:ls("lite_cur") || "UAH", d:today()}, ask:null, rate:{USD:0, EUR:0}, tab:ls("lite_tab") || "list"};
const SYM = {UAH:"₴", USD:"$", EUR:"€"};
/* деньги: пробел между тысячами, запятая в дробях, знак после числа */
const money = (v, cur, frac) => { const n = +v || 0, f = frac == null ? (Math.abs(n) < 100 ? 2 : 0) : frac;
  return n.toLocaleString("uk-UA", {minimumFractionDigits:f, maximumFractionDigits:f}).replace(/ /g, " ") + " " + (SYM[cur] || cur || "$"); };
const int = v => Math.round(+v || 0).toLocaleString("uk-UA").replace(/ /g, " ");
const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "—";
const dd = d => d ? d.slice(8, 10) + "." + d.slice(5, 7) : "";

/* курс НБУ: продажи в гривнах пересчитываются в валюту рекламного кабинета */
async function loadRate(){ try { const r = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"); const j = await r.json();
  for (const x of j) if (x.cc === "USD" || x.cc === "EUR") S.rate[x.cc] = +x.rate; render(); } catch (e) { /* без курса показываем суммы как есть */ } }
/* сумма продажи в валюте рекламы */
function conv(amount, from, to){ from = from || to; if (!from || from === to) return +amount || 0;
  const uah = from === "UAH" ? +amount : (+amount) * (S.rate[from] || 0); if (to === "UAH") return uah; const r = S.rate[to]; return r ? uah / r : NaN; }

async function call(body){ try { const r = await sb.functions.invoke("lite", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const errText = r => ({net:L("Сервер не відповів. Перевір інтернет і онови сторінку.","Сервер не ответил. Проверь интернет и обнови страницу."), denied:L("У тебе немає доступу до цього проєкту. Попроси таргетолога додати твою пошту.","У тебя нет доступа к этому проекту. Попроси таргетолога добавить твою почту."), not_signed_in:L("Увійди ще раз.","Войди ещё раз.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
function toast(t){ const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3200); }

/* ---------- данные ---------- */
async function boot(){
  if (!RK.url || !RK.key || !window.supabase) { S.step = "noserver"; return render(); }
  sb = window.supabase.createClient(RK.url, RK.key);
  const s = (await sb.auth.getSession()).data.session; S.user = s && s.user;
  sb.auth.onAuthStateChange((_e, ss) => { const had = !!S.user; S.user = ss && ss.user; if (!had && S.user) loadProjects(); });
  if (!S.user) { S.step = "login"; return render(); }
  try { localStorage.removeItem("lite_back"); } catch (e) {}
  loadProjects(); loadRate();
}
async function loadProjects(){ S.step = "load"; render(); const r = await call({action:"projects"});
  if (!r.ok) { S.step = "err"; S.err = errText(r); return render(); }
  S.projects = r.projects; if (!S.projects.find(p => p.id === S.pid)) S.pid = (S.projects.find(p => p.meta) || S.projects[0] || {}).id || "";
  if (!S.pid) { S.step = "noproj"; return render(); }
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
  <p class="lite-fine">${L("Вхід працює для пошти, яку додав твій таргетолог.","Вход работает для почты, которую добавил твой таргетолог.")}</p>`}</div>
  <img class="hp__h" src="ui/hiro3d/hey.webp" alt="" width="210" height="250"></section>`; }

function vState(pose, title, text, btn){ return `<section class="panel lite-state"><img src="ui/hiro3d/${pose}.webp" alt="" width="160" height="190"><h2>${title}</h2><p class="sub">${text}</p>${btn || ""}</section>`; }

function vHero(c){ const d = S.data, cur = c.cur;
  let title, text, pose;
  if (!d.meta) { pose = "point"; title = L("Рекламу ще не підключено","Реклама ещё не подключена"); text = L("Попроси таргетолога підключити рекламний кабінет Meta до цього проєкту. Журнал клієнтів уже можна вести.","Попроси таргетолога подключить рекламный кабинет Meta к этому проекту. Журнал клиентов уже можно вести."); }
  else if (c.clients) { pose = c.roi >= 1 ? "win" : "watch"; title = L(`${c.clients} ${c.clients === 1 ? "клієнт" : "клієнтів"} по ${money(c.cac, cur)}`, `${c.clients} ${c.clients === 1 ? "клиент" : "клиентов"} по ${money(c.cac, cur)}`);
    text = c.noRate ? L("Не вдалося взяти курс НБУ, тому виручку в гривнях поки не порахував.","Не получилось взять курс НБУ, поэтому выручку в гривнах пока не посчитал.") : c.roi >= 1 ? L(`Кожен долар реклами повернув ${money(c.roi, cur, 2)} у виручці.`, `Каждый доллар рекламы вернул ${money(c.roi, cur, 2)} в выручке.`) : L("Реклама поки не окупилась. Подивись, які оголошення приводять покупців, а не лише переписки.","Реклама пока не окупилась. Посмотри, какие объявления приводят покупателей, а не только переписки."); }
  else if (c.conv) { pose = "idea"; title = L(`${int(c.conv)} переписок по ${money(c.cpc, cur)}`, `${int(c.conv)} переписок по ${money(c.cpc, cur)}`); text = L("Познач, хто з них записався і хто купив, і я порахую ціну клієнта.","Отметь, кто из них записался и кто купил, и я посчитаю цену клиента."); }
  else { pose = "watch"; title = L("Переписок за цей період немає","Переписок за этот период нет"); text = d.meta_err ? L("Meta відповіла помилкою: ","Meta ответила ошибкой: ") + d.meta_err : L("Можливо, реклама не працювала. Обери довший період.","Возможно, реклама не работала. Выбери период длиннее."); }
  const keys = [[L("Витрачено","Потрачено"), money(c.spend, cur)], [L("Переписок","Переписок"), int(c.conv)], [L("Ціна клієнта","Цена клиента"), c.clients ? money(c.cac, cur) : "—", c.clients && c.roi < 1], [L("Повернулось на 1 $","Вернулось на 1 $").replace("$", SYM[cur] || "$"), c.clients && !c.noRate ? money(c.roi, SYM[cur] || "$", 2) : "—", c.clients && c.roi < 1]];
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
    <span class="num lite-row__a">${x.status === "bought" ? money(x.amount, x.cur || c.cur) : ""}</span>
    ${S.ask === x.id ? `<span class="row"><button type="button" class="btn btn--sm btn--danger" data-act="del" data-id="${x.id}">${L("Так, прибрати","Да, убрать")}</button><button type="button" class="btn btn--sm btn--text" data-act="askNo">${L("Скасувати","Отмена")}</button></span>`
      : `<button type="button" class="btn btn--sm btn--text lite-x" data-act="ask" data-id="${x.id}">${L("Прибрати","Убрать")}</button>`}</div>`).join("")}</div></section>`; }

function vAds(c){ const ads = (S.data.ads || []).filter(a => a.spend > 0);
  if (!S.data.meta) return "";
  if (!ads.length) return `<section class="panel"><span class="tag">${L("Реклама","Реклама")}</span><p class="sub">${L("За цей період оголошення не мали витрат.","За этот период у объявлений не было расходов.")}</p></section>`;
  const rows = ads.map(a => { const b = c.byAd[a.id] || {n:0, rev:0}; return Object.assign({}, a, {b:b.n, rev:b.rev}); }).sort((x, y) => (y.b - x.b) || (y.conv - x.conv) || (y.spend - x.spend));
  const anyB = rows.some(r => r.b);
  return `<section class="panel"><div class="row sp"><span class="tag">${L("Реклама: що приводить клієнтів","Реклама: что приводит клиентов")}</span></div>
    ${anyB ? "" : `<p class="sub">${L("Щоб бачити покупців по оголошеннях, у клієнта вибирай «З якої реклами».","Чтобы видеть покупателей по объявлениям, у клиента выбирай «С какой рекламы».")}</p>`}
    <div class="tw"><table class="lite-t"><thead><tr><th>${L("Оголошення","Объявление")}</th><th>${L("Витрачено","Потрачено")}</th><th>${L("Переписок","Переписок")}</th><th>${L("Ціна переписки","Цена переписки")}</th><th>${L("Купили","Купили")}</th><th>${L("Ціна клієнта","Цена клиента")}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b><small class="sub">${esc(r.campaign || "")}</small></td><td class="num">${money(r.spend, c.cur)}</td><td class="num">${int(r.conv)}</td><td class="num${r.spend && !r.conv ? " bad" : ""}">${r.conv ? money(r.spend / r.conv, c.cur) : "—"}</td><td class="num">${r.b || "—"}</td><td class="num">${r.b ? money(r.spend / r.b, c.cur) : "—"}</td></tr>`).join("")}</tbody></table></div></section>`; }

function vBar(){ const p = S.projects.find(x => x.id === S.pid);
  return `<header class="lite-bar"><img src="ui/logo/logo-on-light.svg" alt="HEYROW" height="24">
    ${S.projects.length > 1 ? `<select class="pfsel" data-ch="pid" aria-label="${L("Проєкт","Проект")}">${S.projects.map(x => `<option value="${x.id}"${x.id === S.pid ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : p ? `<b class="lite-name">${esc(p.name)}</b>` : ""}
    <span class="lite-bar__r">${S.step === "app" ? `<span class="seg seg--xs" role="group" aria-label="${L("Період","Период")}">${[[7, L("7 днів","7 дней")], [30, L("30 днів","30 дней")]].map(x => `<button type="button" data-act="days" data-v="${x[0]}" aria-pressed="${S.days === x[0]}">${x[1]}</button>`).join("")}</span>` : ""}
    <span class="seg seg--xs" role="group" aria-label="Мова"><button type="button" data-act="lang" data-v="uk" aria-pressed="${lang === "uk"}">UA</button><button type="button" data-act="lang" data-v="ru" aria-pressed="${lang === "ru"}">RU</button></span>
    ${S.user ? `<button type="button" class="btn btn--sm btn--text" data-act="out">${L("Вийти","Выйти")}</button>` : ""}</span></header>`; }

function vSkel(){ return `<section class="hp"><div class="hp__t"><span class="heytag">Hey!</span><h2>${L("Рахую рекламу й клієнтів…","Считаю рекламу и клиентов…")}</h2><p>${L("Беру витрати й переписки з Meta.","Беру расходы и переписки из Meta.")}</p></div><img class="hp__h" src="ui/hiro3d/work.webp" alt="" width="210" height="250"></section>`; }

function render(){ const v = $("view"); let h = vBar();
  if (S.step === "boot" || S.step === "load") h += vSkel();
  else if (S.step === "noserver") h += vState("oops", L("Сервер не налаштовано","Сервер не настроен"), L("Ця сторінка працює лише з підключеним сервером HEYROW.","Эта страница работает только с подключённым сервером HEYROW."));
  else if (S.step === "login" || S.step === "sent") h += vLogin();
  else if (S.step === "err") h += vState("oops", L("Не вдалося відкрити дані","Не получилось открыть данные"), esc(S.err), `<button type="button" class="btn btn--main" data-act="reload">${L("Спробувати ще раз","Попробовать ещё раз")}</button>`);
  else if (S.step === "noproj") h += vState("empty", L("Тут поки немає проєкту","Здесь пока нет проекта"), L("Попроси таргетолога додати твою пошту до проєкту в HEYROW, тоді тут з’являться реклама й клієнти.","Попроси таргетолога добавить твою почту в проект HEYROW, тогда здесь появятся реклама и клиенты."));
  else if (!S.data) h += S.busy ? vSkel() : vState("oops", L("Не вдалося взяти статистику","Не получилось взять статистику"), esc(S.err), `<button type="button" class="btn btn--main" data-act="reload">${L("Спробувати ще раз","Попробовать ещё раз")}</button>`);
  else { const c = calc();
    h += vHero(c) + vPath(c) + `<div class="lite-cols">${vAdd(c)}${vList(c)}</div>` + vAds(c);
    if (S.busy) h += `<p class="sub lite-busy">${L("Оновлюю…","Обновляю…")}</p>`; }
  v.innerHTML = h; }

/* ---------- действия ---------- */
const ACT = {
  async again(){ S.step = "login"; render(); },
  lang(d){ lang = d.v; ls("lite_lang", lang); document.documentElement.lang = lang === "ru" ? "ru" : "uk"; render(); },
  days(d){ S.days = +d.v; ls("lite_days", String(S.days)); loadStats(); },
  reload(){ S.pid ? loadStats() : loadProjects(); },
  async out(){ await sb.auth.signOut(); S.user = null; S.data = null; S.step = "login"; render(); },
  focusAdd(){ const el = $("f-who"); if (el) { el.scrollIntoView({behavior:"smooth", block:"center"}); el.focus({preventScroll:true}); } },
  fStatus(d){ keepForm(); S.form.status = d.v; render(); },
  fCur(d){ keepForm(); S.form.cur = d.v; ls("lite_cur", d.v); render(); },
  ask(d){ S.ask = +d.id; render(); },
  askNo(){ S.ask = null; render(); },
  async setSt(d){ const x = S.data.sales.find(s => s.id === +d.id); if (!x || x.status === d.v) return; const prev = x.status; x.status = d.v; render();
    if (d.v === "bought" && !+x.amount) toast(L("Познач суму: прибери запис і додай з сумою, або залиш без суми.","Отметь сумму: убери запись и добавь с суммой, или оставь без суммы."));
    const r = await call({action:"upd", project_id:S.pid, id:x.id, row:{status:d.v}}); if (!r.ok) { x.status = prev; render(); toast(errText(r)); } },
  async del(d){ const r = await call({action:"del", project_id:S.pid, id:+d.id}); S.ask = null; if (!r.ok) return toast(errText(r)); S.data.sales = S.data.sales.filter(s => s.id !== +d.id); render(); toast(L("Запис прибрано","Запись убрана")); },
};
function keepForm(){ const f = S.form, g = id => $(id) && $(id).value; if ($("f-who")) { f.who = g("f-who"); f.amount = g("f-amount") || ""; f.d = g("f-d") || today(); f.ad = g("f-ad") || ""; } }
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset); } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset.ch === "pid") { S.pid = t.value; ls("lite_pid", S.pid); S.data = null; loadStats(); } });
document.addEventListener("submit", async e => { const f = e.target; e.preventDefault();
  if (f.dataset.form === "login") { const mail = ($("mail").value || "").trim().toLowerCase(); if (!mail) return; S.mail = mail;
    ls("lite_back", String(Date.now()));
    const r = await sb.auth.signInWithOtp({email:mail, options:{shouldCreateUser:false, emailRedirectTo:location.origin + location.pathname}});
    if (r.error) return toast(/signups not allowed|not found|not allowed for otp/i.test(r.error.message) ? L("Цієї пошти немає в HEYROW. Попроси таргетолога додати її.","Этой почты нет в HEYROW. Попроси таргетолога добавить её.") : /rate|seconds|limit/i.test(r.error.message) ? L("Забагато листів. Спробуй за годину.","Слишком много писем. Попробуй через час.") : L("Не вдалося надіслати лист: ","Не получилось отправить письмо: ") + r.error.message);
    S.step = "sent"; return render(); }
  if (f.dataset.form === "add") { keepForm(); const x = S.form;
    if (x.status === "bought" && !(+String(x.amount).replace(",", ".") > 0)) { toast(L("Впиши суму покупки.","Впиши сумму покупки.")); $("f-amount") && $("f-amount").focus(); return; }
    const row = {who:x.who || "", status:x.status, amount:x.status === "no" ? 0 : String(x.amount || "0").replace(/\s/g, ""), cur:x.cur, d:x.d || today(), ad_id:x.ad || ""};
    const r = await call({action:"add", project_id:S.pid, row}); if (!r.ok) return toast(errText(r));
    S.form = {status:x.status, cur:x.cur, d:x.d}; toast(L("Збережено","Сохранено")); loadStats(); } });
document.documentElement.lang = lang === "ru" ? "ru" : "uk";
boot();
