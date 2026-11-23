/* Пилот «ведение аккаунта» в кабинете: настройки, подключение Telegram, журнал отчётов и предложений с «Да / Нет».
   Работу делает серверная функция pilot (каждый час по расписанию). Подключается после rek.js. */
const PL = {st:{}, busy:{}, edit:{}, msg:{}};
async function plCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("pilot", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const plErr = r => ({net:L("Сервер не відповів — можливо, функцію pilot ще не викладено.","Сервер не ответил — возможно, функцию pilot ещё не выложили."), denied:L("Налаштовувати може власник або керівник.","Настраивать может собственник или руководитель."), no_bot:L("Немає ключа бота: додай TG_BOT_TOKEN у Secrets.","Нет ключа бота: добавь TG_BOT_TOKEN в Secrets."), no_chats:L("Спершу підключи Telegram.","Сначала подключи Telegram."), not_connected:L("Meta не підключено.","Meta не подключена.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
async function plLoad(p){ if (PL.busy[p.id]) return; PL.busy[p.id] = true; const r = await plCall({action:"get", project_id:p.id}); PL.st[p.id] = r; PL.busy[p.id] = false;
  if (r.ok && !PL.edit[p.id]) PL.edit[p.id] = plDefaults(p, r.settings); render(); }
/* значения по умолчанию: аккаунт проекта, цель — потолок первой воронки, слова — из правила аккаунта */
function plDefaults(p, s){ const accs = prAccs(p, "meta").map(a => String(a.id)), f = p.funnels[0], cap = f ? fT(f, p).cap : 0;
  const ruled = accs.find(id => ((p.accRules || {})["meta:" + id] || []).length), acc = (s && s.account_ids && s.account_ids[0]) || ruled || accs[0] || "", rule = ((p.accRules || {})["meta:" + acc] || []).find(r => !f || r.f === f.id) || {};
  return {enabled:s ? s.enabled : false, account_ids:s && s.account_ids && s.account_ids.length ? s.account_ids.slice() : acc ? [acc] : [], target_cpl:s && s.target_cpl ? s.target_cpl : Math.round(cap * 100) / 100,
    inc:s ? s.inc : (rule.inc || ""), exc:s ? s.exc : (rule.exc || ""), report_hour:s ? s.report_hour : 9, mode:s && s.mode === "auto" ? "auto" : "propose", auto:!s}; }
const plStrip = t => String(t || "").replace(/<[^>]+>/g, "");
/* аватар Хиро (heyrow-ui/mascot/avatars): круг --ink, 24–96px */
const hava = (n, size, alt) => `<img class="hava${size && size !== 32 ? " hava--" + size : ""}" src="ui/hiro/${n}.webp" alt="${alt || ""}" width="${size || 32}" height="${size || 32}" loading="lazy">`;
const plTime = at => new Date(at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {timeZone:"Europe/Kyiv", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}).replace(",", "");
const plMoney = v => fxM(v) + " $";
/* кнопка решения — глагол и объект */
const plVerb = op => ({pause:L("Вимкнути групу","Выключить группу"), pause_ad:L("Вимкнути оголошення","Выключить объявление"), budget:L("Змінити бюджет","Изменить бюджет"), activate:L("Увімкнути кампанію","Включить кампанию"), relaunch:L("Перезапустити групу","Перезапустить группу"), watch:L("Залишити як є","Оставить как есть")}[op] || L("Зробити вночі","Сделать ночью"));
/* строка ленты: время, что сделано, деньги; аватар по событию */
function plRow(p, x, dis){ const pay = x.payload || {}, rep = x.kind === "report";
  const av = rep ? "win" : x.status === "done" ? (x.result === "watch" ? "watch" : "stop") : x.status === "fail" ? "oops" : x.kind === "reco" ? "idea" : "watch";
  const money = pay.op === "budget" && pay.from ? `${plMoney(pay.from)} → ${plMoney(pay.to)}` : "";
  const day = x.exec_on ? x.exec_on.slice(8, 10) + "." + x.exec_on.slice(5, 7) : "";
  const state = x.kind !== "reco" ? "" : x.status === "new" ? `<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="y"${dis}>${plVerb(pay.op)}</button><button type="button" class="btn btn--sm" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="n"${dis}>${L("Запропонуй інше","Предложи другое")}</button></div>`
    : x.status === "scheduled" ? `<div class="row"><span class="st st--pause">${L("Зроблю вночі ","Сделаю ночью ")}<span class="mono">${day}</span></span><button type="button" class="btn btn--sm btn--text" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="c"${dis}>${L("Прибрати з графіка","Убрать из графика")}</button></div>`
    : x.status === "done" ? `<span class="st ${x.result === "watch" ? "st--on" : "st--fix"}">${x.result === "watch" ? L("Залишив, стежу","Оставил, слежу") : L("Виправив автопілот","Исправил автопилот")}</span>`
    : x.status === "fail" ? `<span class="st st--err">${L("Не вийшло: ","Не получилось: ")}${esc(x.result || "")}</span>`
    : `<span class="st">${{yes:L("Ти погодив","Ты согласовал"), canceled:L("Прибрано з графіка","Убрано из графика"), no:L("Ти відхилив","Ты отклонил"), expired:L("Без відповіді, застаріло","Без ответа, устарело")}[x.status] || esc(x.status)}${x.decided_by ? " · " + esc(x.decided_by) : ""}</span>`;
  /* коротко: заголовок и первый абзац (что и почему), кнопки сразу под ним; разбор целиком — под «Детальніше» */
  const txt = plStrip(x.body).replace(/[\u26AA\u{1F7E2}\u{1F7E1}\u{1F534}]\uFE0F?\s?/gu, "").trim(), parts = txt.split(/\n\s*\n/), short = parts[0], rest = parts.slice(1).join("\n\n").trim();
  const body = rep ? `<details class="more"><summary>${L("Показати звіт","Показать отчёт")}${ico("chevron")}</summary><pre class="plpre">${esc(txt)}</pre></details>`
    : `<div class="plb">${esc(short)}</div>`;
  const more = !rep && rest ? `<details class="more plmore"><summary>${L("Детальніше: розбір і що зміню","Подробнее: разбор и что изменю")}${ico("chevron")}</summary><div class="plb">${esc(rest)}</div></details>` : "";
  return `<li class="feed__r pll--${x.kind}">${hava(av, 32)}<time>${esc(plTime(x.at))}</time><div class="feed__t"><b>${x.kind === "alert" ? ico("warning") + " " : ""}${esc(x.title)}</b>${body}${state}${more}</div><span class="feed__m">${money}</span></li>`; }
function plPanel(p){ if (!CLOUD) return "";
  const r = PL.st[p.id]; if (r === undefined && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0);
  const head = t => `<div class="row sp"><h2>${t}</h2>`;
  if (!r) return `<div class="panel plt" role="status">${head(L("Лента автопілота","Лента автопилота"))}</div>${[0, 1, 2].map(() => '<div class="skr"></div>').join("")}</div>`;
  if (!r.ok) return `<div class="panel plt"><div class="empty empty--sm">${hava("oops", 48)}<div><b>${L("Не бачу автопілот.","Не вижу автопилот.")}</b> <span class="sub">${esc(plErr(r))}</span></div></div></div>`;
  const e = PL.edit[p.id], s = r.settings, on = s && s.enabled, accs = prAccs(p, "meta"), dis = r.admin ? "" : " disabled";
  const dirty = s ? (!!e.enabled !== !!s.enabled) : !!e.enabled;
  const st = dirty ? `<span class="st st--pause">${L("Зміни не збережено","Изменения не сохранены")}</span>` : on ? `<span class="st st--on">${L("Працює, перевіряю щогодини","Работает, проверяю каждый час")}</span>` : `<span class="st st--pause">${L("На паузі","На паузе")}</span>`;
  const rows = (r.log || []).map(x => plRow(p, x, dis)).join("");
  const feed = rows ? `<ul class="feed pllog">${rows}</ul>` : `<div class="empty empty--sm">${hava("watch", 48)}<div><b>${L("Тут буде все, що я зробив з рекламою.","Здесь будет всё, что я сделал с рекламой.")}</b> <span class="sub">${on ? L("Перевіряю акаунт щогодини, перший звіт надішлю о ","Проверяю аккаунт каждый час, первый отчёт пришлю в ") + String(s.report_hour).padStart(2, "0") + ":00." : L("Увімкни автопілот у налаштуваннях нижче.","Включи автопилот в настройках ниже.")}</span></div></div>`;
  const accOpts = accs.map(a => `<label class="ck"><input type="checkbox" data-placc="${esc(String(a.id))}"${e.account_ids.includes(String(a.id)) ? " checked" : ""}${dis}> ${esc(a.name || a.id)}</label>`).join("");
  const hours = [...Array(16)].map((_, i) => i + 7);
  const settings = `<div class="form plf">
      <div class="field w"><span class="lbl">${L("Акаунти","Аккаунты")}</span><div class="row">${accOpts || `<span class="sub">${L("Немає підключених акаунтів Meta. Підключи кабінет у проєкті.","Нет подключённых аккаунтов Meta. Подключи кабинет в проекте.")}</span>`}</div></div>
      <div class="field"><label for="pl-t">${L("Ціль: ціна ліда до, $","Цель: цена лида до, $")}</label><input id="pl-t" data-plf="target_cpl" inputmode="decimal" value="${esc(String(e.target_cpl || ""))}"${dis}>${e.auto ? `<span class="sub">${L("Узяв зі стелі воронки","Взял из потолка воронки")}</span>` : ""}</div>
      <div class="field"><label for="pl-h">${L("Звіт щодня о","Отчёт каждый день в")}</label><select id="pl-h" data-plf="report_hour"${dis}>${hours.map(h => `<option value="${h}"${+e.report_hour === h ? " selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      <div class="field"><label for="pl-i">${L("Кампанії, назва містить","Кампании, название содержит")}</label><input id="pl-i" data-plf="inc" value="${esc(e.inc || "")}" placeholder="${L("порожньо — усі","пусто — все")}"${dis}></div>
      <div class="field"><label for="pl-x">${L("Не містить","Не содержит")}</label><input id="pl-x" data-plf="exc" value="${esc(e.exc || "")}"${dis}></div>
      <div class="field w"><span class="lbl">${L("Як я працюю","Как я работаю")}</span>
        <div class="seg plseg" role="group">${[["propose", L("Пропоную, ти вирішуєш","Предлагаю, ты решаешь")], ["auto", L("Роблю сам","Делаю сам")]].map(m => `<button type="button" data-act="plMode" data-p="${p.id}" data-v="${m[0]}" aria-pressed="${e.mode === m[0]}"${dis}>${m[1]}</button>`).join("")}</div>
        <span class="sub">${e.mode === "auto" ? L("Одразу ставлю зміни в графік на ніч і пишу, що запланував. Ти можеш прибрати зміну до півночі.","Сразу ставлю изменения в график на ночь и пишу, что запланировал. Ты можешь убрать изменение до полуночи.") : L("Пропозиція приходить сюди й у Telegram. Погодиш — зроблю вночі. Відхилиш — запропоную інше.","Предложение приходит сюда и в Telegram. Согласуешь — сделаю ночью. Отклонишь — предложу другое.")} ${L("Усі зміни в Meta роблю після 00:00 за Києвом. Рекламу вмикаю лише після твого погодження.","Все изменения в Meta делаю после 00:00 по Киеву. Рекламу включаю только после твоего согласования.")}</span></div>
      <label class="ck w"><input type="checkbox" data-plf="enabled"${e.enabled ? " checked" : ""}${dis}> <span>${L("Автопілот веде акаунт: щогодини перевіряю, зранку звіт, протягом дня сповіщення й пропозиції","Автопилот ведёт аккаунт: каждый час проверяю, утром отчёт, в течение дня оповещения и предложения")}</span></label></div>
    <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="plSave" data-p="${p.id}"${dis}>${L("Зберегти налаштування","Сохранить настройки")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="0">${L("Перевірити акаунт зараз","Проверить аккаунт сейчас")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="1"${dis}>${L("Надіслати звіт зараз","Отправить отчёт сейчас")}</button></div>
    <div class="row pltg"><span class="lbl">Telegram</span>${(s && s.chats && s.chats.length) ? s.chats.map(c => `<span class="st st--on">${esc(c)}</span>`).join(" ") : `<span class="st st--pause">${L("Не підключено","Не подключено")}</span>`}
      <button type="button" class="btn btn--sm" data-act="plTg" data-p="${p.id}"${dis}${r.bot ? "" : ` title="${esc(plErr({error:"no_bot"}))}"`}>${ico("send")} ${L("Підключити Telegram","Подключить Telegram")}</button>${s && s.chats && s.chats.length ? `<button type="button" class="btn btn--sm" data-act="plTgTest" data-p="${p.id}">${L("Надіслати тест","Отправить тест")}</button>` : ""}</div>`;
  return `<div class="panel plt">${head(L("Лента автопілота","Лента автопилота"))}${st}</div>
    ${feed}
    ${PL.msg[p.id] ? `<p class="sub" role="status">${PL.msg[p.id]}</p>` : ""}
    ${more("pls:" + p.id, L("Налаштування автопілота","Настройки автопилота"), settings)}</div>`; }
/* строка автопилота над рабочей областью: состояние, что делает, последнее действие, одна кнопка */
function apbHTML(){ if (!CLOUD || !W.user || !W.co) return "";
  const ps = (P() ? [P()] : pfProjs()).filter(p => p.meta && p.meta.conn);
  if (!ps.length) return `<span class="apb__st">${hava("sleep", 24)}<span class="st st--pause">${L("Автопілот вимкнено","Автопилот выключен")}</span></span><span class="apb__now">${L("Підключи рекламний кабінет, і я почну.","Подключи рекламный кабинет, и я начну.")}</span>`;
  ps.forEach(p => { if (PL.st[p.id] === undefined && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0); });
  const ok = ps.filter(p => PL.st[p.id] && PL.st[p.id].ok), on = ok.filter(p => PL.st[p.id].settings && PL.st[p.id].settings.enabled);
  if (!ok.length) return `<span class="apb__st">${hava("work", 24)}<span>${ps.some(p => PL.st[p.id] && !PL.st[p.id].ok) ? L("Не бачу автопілот: сервер не відповів.","Не вижу автопилот: сервер не ответил.") : L("Перевіряю автопілот…","Проверяю автопилот…")}</span></span>`;
  const last = ok.flatMap(p => PL.st[p.id].log || []).filter(x => x.kind !== "report").sort((a, b) => (b.at > a.at ? 1 : -1))[0];
  const one = ps.length === 1 ? ps[0] : null, admin = one && PL.st[one.id] && PL.st[one.id].admin;
  const state = on.length ? `${hava("watch", 24)}<span class="st st--on">${ps.length > 1 ? L("Автопілот веде " + on.length + " з " + ps.length + " проєктів", "Автопилот ведёт " + on.length + " из " + ps.length + " проектов") : L("Автопілот увімкнено","Автопилот включён")}</span>`
    : `${hava("sleep", 24)}<span class="st st--pause">${L("Автопілот на паузі","Автопилот на паузе")}</span>`;
  const now = last ? `${L("Останнє: ","Последнее: ")}<time>${esc(plTime(last.at))}</time> · ${esc(last.title)}` : on.length ? L("Щогодини перевіряю акаунт. Змін поки не було.","Каждый час проверяю аккаунт. Изменений пока не было.") : L("Нічого не змінюю, поки на паузі.","Ничего не меняю, пока на паузе.");
  const btn = admin ? `<button type="button" class="btn${on.length ? "" : " btn--solid"}" data-act="apbToggle" data-p="${one.id}">${on.length ? ico("pause") + " " + L("Поставити на паузу","Поставить на паузу") : ico("autopilot") + " " + L("Увімкнути автопілот","Включить автопилот")}</button>` : "";
  return `<span class="apb__st">${state}</span><span class="apb__now">${now}</span>${btn}`; }
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.plf || t.type === "checkbox") return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; PL.edit[p.id][t.dataset.plf] = t.value; PL.edit[p.id].auto = false; });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; const ed = PL.edit[p.id];
  if (t.dataset.plf && t.type === "checkbox") { ed[t.dataset.plf] = t.checked; render(); }
  if (t.dataset.plf === "report_hour") ed.report_hour = +t.value;
  if (t.dataset.placc) { ed.account_ids = t.checked ? [...new Set(ed.account_ids.concat(t.dataset.placc))] : ed.account_ids.filter(x => x !== t.dataset.placc); } });
Object.assign(ACT, {
  apbToggle(d){ const p = W.projs.find(x => x.id === d.p), r = PL.st[d.p]; if (!p || !r || !r.ok) return false; if (!PL.edit[d.p]) PL.edit[d.p] = plDefaults(p, r.settings);
    PL.edit[d.p].enabled = !(r.settings && r.settings.enabled); return ACT.plSave({p:d.p}); },
  plMode(d){ const e = PL.edit[d.p]; if (!e) return false; e.mode = d.v === "auto" ? "auto" : "propose"; },
  async plSave(d){ const e = PL.edit[d.p]; if (!e) return false; if (e.enabled && !(+String(e.target_cpl).replace(",", ".") > 0)) { toast(L("Вкажи цільову ціну ліда","Укажи целевую цену лида")); return false; }
    const r = await plCall({action:"save", project_id:d.p, settings:Object.assign({}, e, {target_cpl:+String(e.target_cpl).replace(",", ".")})});
    toast(r.ok ? (e.enabled ? L("Збережено: Хіро веде акаунт","Сохранено: Хиро ведёт аккаунт") : L("Збережено","Сохранено")) : plErr(r)); if (r.ok) { delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); } return false; },
  async plNow(d){ PL.msg[d.p] = L("Перевіряємо…","Проверяем…"); render(); const r = await plCall({action:"now", project_id:d.p, report:d.v === "1", send:d.v === "1"});
    PL.msg[d.p] = r.ok ? L("Груп у роботі: ","Групп в работе: ") + r.groups + L(" · пропозицій: "," · предложений: ") + r.recos + (r.errs && r.errs.length ? " · " + esc(r.errs.join(", ")) : "") : esc(plErr(r)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plDecide(d){ const r = await plCall({action:"decide", project_id:d.p, id:+d.id, v:d.v}); toast(r.text || plErr(r)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plTg(d){ const w = window.open("", "_blank"); const r = await plCall({action:"tg_link", project_id:d.p});
    if (!r.ok) { if (w) w.close(); toast(plErr(r)); return false; } if (w) w.location = r.url; else location.href = r.url;
    PL.msg[d.p] = L("Відкрий бота й натисни «Start» — чат підключиться. Потім онови сторінку.","Открой бота и нажми «Start» — чат подключится. Потом обнови страницу."); render(); return false; },
  async plTgTest(d){ const r = await plCall({action:"tg_test", project_id:d.p}); toast(r.ok ? L("Надіслано — перевір Telegram","Отправлено — проверь Telegram") : plErr(r)); return false; },
});
