/* Исследование воронки и концепция запуска. Обычный код по данным сервера, без ИИ и без баллов.
   Собирается один раз (при первом открытии запуска воронки), обновляется по кнопке; результат хранится в воронке (f.research).
   Выгорание — по 4 окнам по 28 дней; креативы — за 112 дней, с бронями и оплатами по метке utm_content.
   Пороги — наши значения по умолчанию, пока Дмитрий не задал свои: показываются на экране с пометкой «поставили сами». */
const RS_DEF = {cplUp:30, payDown:25, minLeads:30, trashRate:50, minCrLeads:20};
const RS = {busy:{}, err:{}};
const rsDay = (d, k) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
/* базовое имя креатива: без _v/_v2/_s/_s_v3 и хвоста даты вида П06.26 — версии одного ролика считаются вместе */
const rsBase = n => String(n || "").normalize("NFC").replace(/(_s)?(_v\d*)?$/i, "").replace(/(_s)?(_v\d*)?$/i, "").replace(/[ПP]\d{2}\.\d{2}$/u, "").replace(/[_\s]+$/, "").toLowerCase() || "—";
function rsTh(){ const o = Object.assign({}, RS_DEF), c = ((W.co || {}).set || {}).rs || {};
  Object.keys(RS_DEF).forEach(k => { const n = parseFloat(String(c[k] == null ? "" : c[k]).replace(",", ".")); if (n > 0) o[k] = n; }); return o; }
/* поля порогов исследования для «Настроек» компании */
function rsSetPanel(adm){ const v = ((W.co || {}).set || {}).rs || {}, row = (k, label, unit, tip) => `<div class="field"><label for="rs-${k}">${label} ${hint(tip)}</label><div class="row row--u"><input id="rs-${k}" class="tin" data-w="co.set.rs.${k}" value="${esc(String(v[k] == null ? "" : v[k]))}" placeholder="${RS_DEF[k]}" inputmode="decimal"${adm ? "" : " disabled"}><span class="sub mono">${unit}</span></div></div>`;
  return `<div class="panel"><span class="tag">${L("Дослідження воронки","Исследование воронки")} ${hint(L("Пороги вигорання й сміттєвих креативів. Порожнє поле — наше значення за замовчуванням.","Пороги выгорания и мусорных креативов. Пустое поле — наше значение по умолчанию."))}</span><div class="form">
    ${row("cplUp", L("Вигорання: ціна ліда дорожча на","Выгорание: цена лида дороже на"), "%", L("Порівняно з найкращим із трьох попередніх вікон по 28 днів.","По сравнению с лучшим из трёх предыдущих окон по 28 дней."))}
    ${row("payDown", L("Вигорання: частка оплат нижча на","Выгорание: доля оплат ниже на"), "%", L("Оплати від лідів у вікні 29–56 днів тому проти найкращого з ранніх вікон.","Оплаты от лидов в окне 29–56 дней назад против лучшего из ранних окон."))}
    ${row("trashRate", L("Сміттєвий: броней і оплат від лідів менше ніж","Мусорный: броней и оплат от лидов меньше чем"), "%", L("Від середнього по воронці, якщо лід дешевший за медіану.","От среднего по воронке, если лид дешевле медианы."))}
    ${row("minLeads", L("Мінімум лідів у вікні","Минимум лидов в окне"), L("лідів","лидов"), L("Менше — «мало даних».","Меньше — «мало данных»."))}
    ${row("minCrLeads", L("Мінімум лідів на креатив","Минимум лидов на креатив"), L("лідів","лидов"), L("Менше — креатив не оцінюється.","Меньше — креатив не оценивается."))}</div></div>`; }

async function rsRun(p, f){ if (!prOn(p) || RS.busy[f.id]) return; RS.busy[f.id] = true; RS.err[f.id] = ""; render();
  try {
    const q = async (fn, a) => { const r = await sb.rpc(fn, Object.assign({p:p.id}, a)); if (r.error) throw new Error(r.error.message); return r.data || []; };
    const end = rsDay(prToday(), -1), wins = [3, 2, 1, 0].map(i => ({d1:rsDay(end, -28 * (i + 1) + 1), d2:rsDay(end, -28 * i)}));
    const camps = await Promise.all(wins.map(w => q("ad_summary", {d1:w.d1, d2:w.d2})));
    const sales = await Promise.all(wins.map(w => q("sales_summary", {d1:w.d1, d2:w.d2})));
    const crs = await q("ad_creatives", {d1:wins[0].d1, d2:end});
    const mine = new Set(), names = new Set();
    camps.forEach(rows => rows.forEach(o => { if (fxFunnel(p, {id:o.campaign_id, f:o.funnel_id || ""}) === f.id) { mine.add(o.campaign_id); names.add(fxKey(o.campaign_name)); } }));
    const rate = cur => cur === "USD" || !cur ? 1 : (p.fx || {})[cur];
    const win = wins.map((w, i) => { const t = {d1:w.d1, d2:w.d2, spend:0, leads:0, book:0, pay:0, rev:0};
      camps[i].forEach(o => { if (mine.has(o.campaign_id)) { t.spend += +o.spend || 0; t.leads += +o.leads || 0; } });
      sales[i].forEach(o => { if (!names.has(fxKey(o.utm_campaign))) return; if (o.kind === "booking") t.book += +o.events || 0; else if (o.kind === "payment") { t.pay += +o.events || 0; const r = rate(o.currency); t.rev += r ? (+o.amount || 0) / r : 0; } });
      return t; });
    const sb2 = {}; sales.forEach(rows => rows.forEach(o => { if (!names.has(fxKey(o.utm_campaign))) return; const k = rsBase(o.utm_content), t = sb2[k] = sb2[k] || {book:0, pay:0}; if (o.kind === "booking") t.book += +o.events || 0; else if (o.kind === "payment") t.pay += +o.events || 0; }));
    const by = {}; crs.forEach(o => { if (!mine.has(o.campaign_id) || !o.ad_name) return; const k = rsBase(o.ad_name), t = by[k] = by[k] || {k, name:o.ad_name, spend:0, leads:0, clicks:0, imp:0}; t.spend += +o.spend || 0; t.leads += +o.leads || 0; t.clicks += +o.clicks || 0; t.imp += +o.impressions || 0; });
    const cr = Object.values(by).map(c => Object.assign(c, sb2[c.k] || {book:0, pay:0})).sort((a, b) => b.spend - a.spend).slice(0, 40);
    f.research = {at:new Date().toISOString(), win, cr, hasSales:win.some(w => w.book || w.pay)}; save();
  } catch (e) { RS.err[f.id] = fxErr ? fxErr(e.message) : String(e.message || e); }
  RS.busy[f.id] = false; render(); }

/* выгорание: цена лида последнего окна против лучшего из прошлых; доля оплат — по окну 29–56 дней назад (оплаты успели дозреть) */
function rsBurn(R, th){ const w = R.win, ok = x => x.leads >= th.minLeads, last = w[3], prev = w.slice(0, 3).filter(ok);
  if (!ok(last) || !prev.length) return {lv:"mute", t:L("Мало даних","Мало данных"), why:L("Потрібно щонайменше ","Нужно хотя бы ") + th.minLeads + L(" лідів в останньому й хоча б в одному з минулих вікон."," лидов в последнем и хотя бы в одном из прошлых окон.")};
  const cpl = x => x.spend / x.leads, base = prev.reduce((a, x) => cpl(x) < cpl(a) ? x : a), up = (cpl(last) / cpl(base) - 1) * 100;
  let down = null; const m = w[2], b0 = w.slice(0, 2).filter(x => ok(x) && x.pay > 0);
  if (R.hasSales && ok(m) && b0.length) { const l2p = x => x.pay / x.leads, bb = b0.reduce((a, x) => l2p(x) > l2p(a) ? x : a); down = (1 - l2p(m) / l2p(bb)) * 100; }
  const pct = v => (v > 0 ? "+" : "") + Math.round(v) + "%", why = L("Ціна ліда ","Цена лида ") + pct(up) + L(" до найкращого вікна",' к лучшему окну') + (down !== null ? "; " + L("частка оплат від лідів ","доля оплат от лидов ") + pct(-down) : "") + ".";
  if (up >= th.cplUp && (down === null || down >= th.payDown)) return {lv:"crit", t:down === null ? L("Схоже на вигорання","Похоже на выгорание") : L("Вигорає","Выгорает"), why:why + (down === null ? " " + L("Без продажів не видно, чи впала якість ліда.","Без продаж не видно, упало ли качество лида.") : "")};
  if (down !== null && down >= th.payDown) return {lv:"warn", t:L("Ліди не дорожчають, але гірше купують","Лиды не дорожают, но хуже покупают"), why};
  if (up >= th.cplUp) return {lv:"warn", t:L("Дорожчає","Дорожает"), why:why + (down !== null ? " " + L("Оплати від лідів тримаються — можливо, аукціон або сезон, а не воронка.","Оплаты от лидов держатся — возможно, аукцион или сезон, а не воронка.") : "")};
  return {lv:"good", t:L("Тримається","Держится"), why}; }

/* креативы: рабочий / мусорный / дорогой / мало данных. Мусорный = лид дешевле медианы, но броней или оплат от лидов вдвое меньше среднего по воронке */
function rsCr(R, th){ const cs = R.cr.filter(c => c.leads >= th.minCrLeads), med = (a => a.length ? a[Math.floor(a.length / 2)] : 0)(cs.map(c => c.spend / c.leads).sort((a, b) => a - b));
  const L0 = cs.reduce((a, c) => a + c.leads, 0), qual = c => R.hasSales ? (c.book + c.pay * 3) / c.leads : null, avgQ = R.hasSales && L0 ? cs.reduce((a, c) => a + c.book + c.pay * 3, 0) / L0 : null;
  return R.cr.map(c => { const cpl = c.leads ? c.spend / c.leads : 0, q = c.leads ? qual(c) : null; let v;
    if (c.leads < th.minCrLeads) v = ["mute", L("мало даних","мало данных")];
    else if (avgQ && q !== null && cpl <= med && q < avgQ * th.trashRate / 100) v = ["crit", L("сміттєвий","мусорный")];
    else if (cpl > med * 1.5) v = ["warn", L("дорогий","дорогой")];
    else if (avgQ && q !== null && q >= avgQ) v = ["good", L("робочий","рабочий")];
    else if (!avgQ && cpl <= med) v = ["good", L("дешевий лід","дешёвый лид")];
    else v = ["mute", L("середній","средний")];
    return Object.assign({cpl, v}, c); }); }

/* концепция запуска по правилам: каждое решение со строкой «почему» */
function rsConcept(p, f, R, crs, burn){ const last = f.launch || {}, ev = last.event || (f.sale === "site" ? "buy" : "lead"), t = fT(f, p), plan = Math.round(t.bud / 30);
  const good = crs.filter(c => c.v[0] === "good").slice(0, 5), bad = crs.filter(c => c.v[0] === "crit");
  const evName = (BD_EVENTS().find(e => e[0] === ev) || ["", ev])[1].split(" — ")[0];
  const rows = [
    [L("Подія","Событие"), evName, last.event ? L("як у минулому запуску цієї воронки — історія оптимізації не обнуляється","как в прошлом запуске этой воронки — история оптимизации не обнуляется") : f.sale === "site" ? L("оплата на сайті: оптимізуємо одразу на покупку","оплата на сайте: оптимизируем сразу на покупку") : L("заявка або реєстрація: оптимізуємо на лід, оплата далі по воронці","заявка или регистрация: оптимизируем на лид, оплата дальше по воронке")],
    [L("Бюджет на день","Бюджет в день"), plan >= 5 ? "$" + plan : "$20", plan >= 5 ? L("план воронки ÷ 30 днів","план воронки ÷ 30 дней") : L("плану воронки немає — мінімум, щоб Meta встигла навчитися","плана воронки нет — минимум, чтобы Meta успела обучиться")],
    [L("Структура","Структура"), L("1 кампанія · 1 група · бюджет на групі","1 кампания · 1 группа · бюджет на группе"), L("можна вимикати групи окремо й порівнювати їх","можно выключать группы по отдельности и сравнивать их")],
    [L("Креативи","Креативы"), good.length ? good.map(c => c.name).join(", ") : L("нові","новые"), good.length ? L("найкращі за ","лучшие за ") + (R.hasSales ? L("бронями й оплатами","бронями и оплатами") : L("ціною ліда","ценой лида")) + L(" за 112 днів"," за 112 дней") + (bad.length ? L("; не брати: ","; не брать: ") + bad.map(c => c.name).join(", ") : "") : L("з минулих запусків немає креативів з достатньою кількістю лідів","из прошлых запусков нет креативов с достаточным числом лидов")],
    [L("Старт","Старт"), L("завтра 00:40 за Києвом","завтра 00:40 по Киеву"), L("доба починається з повним бюджетом, а не з вечірніх залишків","сутки начинаются с полным бюджетом, а не с вечерних остатков")],
  ];
  if (burn.lv === "crit") rows.push([L("Увага","Внимание"), L("воронка вигорає","воронка выгорает"), L("новий запуск на тих самих креативах і офері, найімовірніше, буде дорожчим — варто оновити офер або креативи","новый запуск на тех же креативах и оффере, скорее всего, будет дороже — стоит обновить оффер или креативы")]);
  return {ev, budget:plan >= 5 ? plan : 20, rows}; }

function rsPanel(p, f){ const R = f.research, th = rsTh(), busy = RS.busy[f.id], err = RS.err[f.id];
  const head = `<div class="row sp"><span class="tag">${L("Дослідження воронки","Исследование воронки")}</span><span class="row">${R ? `<small class="sub mono">${esc(R.at.slice(0, 16).replace("T", " "))}</small>` : ""}${hint(L("Рахує платформа за даними кабінету й продажів, без ШІ. Збирається один раз, оновлюється кнопкою.","Считает платформа по данным кабинета и продаж, без ИИ. Собирается один раз, обновляется кнопкой."))}${R && prOn(p) ? `<button type="button" class="btn btn--sm btn--ico" data-act="rsRun" aria-label="${L("Оновити","Обновить")}" title="${L("Оновити","Обновить")}"${busy ? " disabled" : ""}>↻</button>` : ""}</span></div>`;
  if (!prOn(p)) return `<div class="panel" id="rs">${head}<p class="sub">${L("З’явиться після підключення кабінету Meta.","Появится после подключения кабинета Meta.")}</p></div>`;
  if (!R) return `<div class="panel" id="rs">${head}<p class="sub">${L("Вигорання, робочі й сміттєві креативи, минулі запуски й чернетка концепції.","Выгорание, рабочие и мусорные креативы, прошлые запуски и черновик концепции.")}</p>
    ${err ? `<p class="mterr">${esc(err)}</p>` : ""}<div class="row"><button class="btn btn--solid" data-act="rsRun"${busy ? " disabled" : ""}>${busy ? L("Збираємо…","Собираем…") : L("Зібрати дослідження","Собрать исследование")}</button></div></div>`;
  const burn = rsBurn(R, th), crs = rsCr(R, th), cc = rsConcept(p, f, R, crs, burn), m = v => "$" + dec(v, v >= 100 ? 0 : 2), dm = d => d.slice(8, 10) + "." + d.slice(5, 7);
  const winT = `<div class="tw tw--in"><table><thead><tr><th>${L("Вікно","Окно")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${R.hasSales ? `<th class="n">${L("Броні","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th>` : ""}</tr></thead><tbody>${R.win.map(w => `<tr><td class="mono">${dm(w.d1)}–${dm(w.d2)}</td><td class="n mono">${m(w.spend)}</td><td class="n mono">${num(w.leads)}</td><td class="n mono">${w.leads ? m(w.spend / w.leads) : "—"}</td>${R.hasSales ? `<td class="n mono">${num(w.book)}</td><td class="n mono">${num(w.pay)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
  const crT = crs.length ? `<div class="tw tw--in"><table><thead><tr><th>${L("Креатив","Креатив")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("Ціна ліда","Цена лида")}</th>${R.hasSales ? `<th class="n">${L("Броні","Брони")}</th><th class="n">${L("Оплати","Оплаты")}</th>` : ""}<th></th></tr></thead><tbody>${crs.slice(0, 20).map(c => `<tr><td class="mono">${esc(c.name)}</td><td class="n mono">${m(c.spend)}</td><td class="n mono">${num(c.leads)}</td><td class="n mono">${c.leads ? m(c.cpl) : "—"}</td>${R.hasSales ? `<td class="n mono">${num(c.book)}</td><td class="n mono">${num(c.pay)}</td>` : ""}<td class="n">${pill(c.v[0], c.v[1])}</td></tr>`).join("")}</tbody></table></div>` : `<p class="sub">${L("За 112 днів оголошень цієї воронки немає.","За 112 дней объявлений этой воронки нет.")}</p>`;
  const bs = (f.builds || []).slice(0, 5), hist = bs.length ? `<ul class="rsh">${bs.map(b => `<li><span class="mono">${esc(b.at.slice(0, 10))}</span> <span class="mono">${esc(b.name)}</span>${b.goal ? ` · <span class="sub">${esc(b.goal)}</span>` : ""}${(b.chg || []).length ? ` · <span class="sub">${L("змінено: ","изменено: ")}${b.chg.map(k => (BD_CHG().find(c => c[0] === k) || [0, k])[1]).join(", ")}</span>` : ""}</li>`).join("")}</ul>` : `<p class="sub">${L("Через платформу цю воронку ще не запускали.","Через платформу эту воронку ещё не запускали.")}</p>`;
  const lock = t => `<li><span>${t}</span><button type="button" class="btn btn--sm" disabled title="${L("Буде за бали","Будет за баллы")}">${L("за бали","за баллы")}</button></li>`;
  return `<div class="panel" id="rs">${head}${err ? `<p class="mterr">${esc(err)}</p>` : ""}
    <div class="rsb"><b>${L("Вигорання","Выгорание")}</b> ${pill(burn.lv, burn.t)}<p class="sub">${esc(burn.why)}</p></div>${winT}
    <div class="rsb"><b>${L("Креативи за 112 днів","Креативы за 112 дней")}</b>${R.hasSales ? "" : `<p class="sub">${L("Продажів немає — сміттєві креативи без броней і оплат не відрізнити, видно лише ціну ліда.","Продаж нет — мусорные креативы без броней и оплат не отличить, видна только цена лида.")}</p>`}</div>${crT}
    <div class="rsb"><b>${L("Минулі запуски","Прошлые запуски")}</b></div>${hist}
    <div class="rsb"><b>${L("Концепція запуску","Концепция запуска")}</b> <small class="sub">${L("чернетка за правилами","черновик по правилам")}</small></div>
    <dl class="kv rsc">${cc.rows.map(r => `<dt>${r[0]}</dt><dd><b>${esc(r[1])}</b><small class="sub">${esc(r[2])}</small></dd>`).join("")}</dl>
    <div class="row"><button class="btn btn--solid" data-act="rsApply">${L("Перенести в запуск","Перенести в запуск")}</button></div>
    <ul class="rsl">${lock(L("Конкуренти в бібліотеці реклами","Конкуренты в библиотеке рекламы"))}${lock(L("Розбір відео: свої й конкурентів","Разбор видео: свои и конкурентов"))}${lock(L("Концепція з поясненнями від ШІ","Концепция с объяснениями от ИИ"))}</ul>
    <p class="sub rsth">${L("Пороги поставили самі, перевірте: ","Пороги поставили сами, проверьте: ")}${L("вигорання — ціна ліда +","выгорание — цена лида +")}${th.cplUp}%${L(" і частка оплат −"," и доля оплат −")}${th.payDown}%; ${L("сміттєвий — лід дешевший за медіану, а броней і оплат від лідів менше ніж ","мусорный — лид дешевле медианы, а броней и оплат от лидов меньше чем ")}${th.trashRate}%${L(" від середнього"," от среднего")}; ${L("мінімум ","минимум ")}${th.minLeads}${L(" лідів у вікні"," лидов в окне")}.</p></div>`; }

Object.assign(ACT, {
  rsRun(){ const p = P(), f = F(); if (p && f) rsRun(p, f); return false; },
  rsApply(){ const p = P(), f = F(); if (!p || !f || !f.research) return false; const R = f.research, th = rsTh(), cc = rsConcept(p, f, R, rsCr(R, th), rsBurn(R, th));
    if (BD.open !== f.id) ACT.bdOpen({id:f.id}); const F0 = BD.form; if (!F0) return false;
    F0.event = cc.ev; F0.eventSet = true; F0.budget = cc.budget;
    setTimeout(() => { const el = document.getElementById("bd"); if (el) el.scrollIntoView({block:"start"}); }, 80); }
});
