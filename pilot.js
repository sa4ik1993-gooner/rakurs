/* Пилот «ведение аккаунта» в кабинете: настройки, подключение Telegram, журнал отчётов и предложений с «Да / Нет».
   Работу делает серверная функция pilot (каждый час по расписанию). Подключается после rek.js. */
const PL = {st:{}, busy:{}, edit:{}, msg:{}};
async function plCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("pilot", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const plErr = r => ({net:L("Сервер не відповів — можливо, функцію pilot ще не викладено.","Сервер не ответил — возможно, функцию pilot ещё не выложили."), denied:L("Налаштовувати може власник або керівник.","Настраивать может собственник или руководитель."), no_bot:L("Немає ключа бота: додайте TG_BOT_TOKEN у Secrets.","Нет ключа бота: добавьте TG_BOT_TOKEN в Secrets."), no_chats:L("Спершу підключіть Telegram.","Сначала подключите Telegram."), not_connected:L("Meta не підключено.","Meta не подключена.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
async function plLoad(p){ if (PL.busy[p.id]) return; PL.busy[p.id] = true; const r = await plCall({action:"get", project_id:p.id}); PL.st[p.id] = r; PL.busy[p.id] = false;
  if (r.ok && !PL.edit[p.id]) PL.edit[p.id] = plDefaults(p, r.settings); render(); }
/* значения по умолчанию: аккаунт проекта, цель — потолок первой воронки, слова — из правила аккаунта */
function plDefaults(p, s){ const accs = prAccs(p, "meta").map(a => String(a.id)), f = p.funnels[0], cap = f ? fT(f, p).cap : 0;
  const ruled = accs.find(id => ((p.accRules || {})["meta:" + id] || []).length), acc = (s && s.account_ids && s.account_ids[0]) || ruled || accs[0] || "", rule = ((p.accRules || {})["meta:" + acc] || []).find(r => !f || r.f === f.id) || {};
  return {enabled:s ? s.enabled : false, account_ids:s && s.account_ids && s.account_ids.length ? s.account_ids.slice() : acc ? [acc] : [], target_cpl:s && s.target_cpl ? s.target_cpl : Math.round(cap * 100) / 100,
    inc:s ? s.inc : (rule.inc || ""), exc:s ? s.exc : (rule.exc || ""), report_hour:s ? s.report_hour : 9, allow_exec:s ? s.allow_exec : false, auto:!s}; }
const plStrip = t => String(t || "").replace(/<[^>]+>/g, "");
function plPanel(p){ if (!CLOUD) return "";
  const r = PL.st[p.id]; if (r === undefined && !PL.busy[p.id]) setTimeout(() => plLoad(p), 0);
  const head = `<div class="row sp"><span class="tag">${L("Пілот · веде акаунт","Пилот · ведёт аккаунт")}</span>`;
  if (!r) return `<div class="panel pl">${head}</div><p class="sub" role="status">${L("Завантажуємо…","Загружаем…")}</p></div>`;
  if (!r.ok) return `<div class="panel pl">${head}</div><p class="sub">${esc(plErr(r))}</p></div>`;
  const e = PL.edit[p.id], s = r.settings, on = s && s.enabled, accs = prAccs(p, "meta"), dis = r.admin ? "" : " disabled";
  const st = on ? pill("good", L("веде · щогодини","ведёт · каждый час")) : pill("mute", L("вимкнено","выключено"));
  const log = (r.log || []).map(x => { const pay = x.payload || {};
    return `<li class="pll pll--${x.kind} pll--${x.status}"><div class="row sp"><b>${x.kind === "report" ? "📊 " : x.kind === "reco" ? "💡 " : x.kind === "alert" ? "⚠️ " : ""}${esc(x.title)}</b><small class="sub mono">${esc(new Date(x.at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {timeZone:"Europe/Kyiv", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}))}</small></div>
      ${x.kind === "report" ? `<details><summary class="sub">${L("Показати звіт","Показать отчёт")}</summary><pre class="plpre">${esc(plStrip(x.body))}</pre></details>` : `<div class="plb">${esc(plStrip(x.body))}</div>`}
      ${x.kind === "reco" ? (x.status === "new" ? `<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="y"${dis}>${L("Так","Да")}</button><button type="button" class="btn btn--sm" data-act="plDecide" data-p="${p.id}" data-id="${x.id}" data-v="n"${dis}>${L("Ні","Нет")}</button></div>`
        : `<small class="sub">${{yes:L("так — зробити вручну","да — сделать вручную"), no:L("ні","нет"), done:L("виконано платформою","выполнено платформой"), fail:L("не вдалося: ","не удалось: ") + esc(x.result || ""), expired:L("без відповіді — застаріло","без ответа — устарело")}[x.status] || x.status}${x.decided_by ? " · " + esc(x.decided_by) : ""}</small>`) : ""}</li>`; }).join("");
  const accOpts = accs.map(a => `<label class="ck"><input type="checkbox" data-placc="${esc(String(a.id))}"${e.account_ids.includes(String(a.id)) ? " checked" : ""}${dis}> ${esc(a.name || a.id)}</label>`).join("");
  const hours = [...Array(16)].map((_, i) => i + 7);
  return `<div class="panel pl">${head}<span class="row">${st}${hint(L("Щогодини платформа читає з Meta групи вибраних акаунтів і шукає: що витрачає без лідів (сьогодні ≥ 2 цілі ціни ліда), що веде до дорогих лідів (3 дні > 1,5 цілі), що можна підняти на 15% (навчання пройдено, 7 днів ≤ 90% цілі, стабільно, не змінювали 48 год). Групи в навчанні не чіпає. Пропозиції — в Telegram і тут, з «Так / Ні». Зранку — звіт за вчора. З полудня — сповіщення, якщо сьогодні лід дорожчий за план (по групі й по акаунту), раз на день. Рекламу пілот ніколи не вмикає.","Каждый час платформа читает из Meta группы выбранных аккаунтов и ищет: что тратит без лидов (сегодня ≥ 2 целей цены лида), что ведёт к дорогим лидам (3 дня > 1,5 цели), что можно поднять на 15% (обучение пройдено, 7 дней ≤ 90% цели, стабильно, не меняли 48 ч). Группы в обучении не трогает. Предложения — в Telegram и здесь, с «Да / Нет». Утром — отчёт за вчера. С полудня — оповещение, если сегодня лид дороже плана (по группе и по аккаунту), раз в день. Рекламу пилот никогда не включает."), "wide")}</span></div>
    <div class="form plf">
      <div class="field w"><span class="lbl">${L("Акаунти","Аккаунты")}</span><div class="row">${accOpts || `<span class="sub">${L("Немає підключених акаунтів Meta","Нет подключённых аккаунтов Meta")}</span>`}</div></div>
      <div class="field"><label for="pl-t">${L("Ціль: ціна ліда до, $","Цель: цена лида до, $")}</label><input id="pl-t" data-plf="target_cpl" inputmode="decimal" value="${esc(String(e.target_cpl || ""))}"${dis}>${e.auto ? `<span class="sub">${L("поставили самі — стеля воронки","поставили сами — потолок воронки")}</span>` : ""}</div>
      <div class="field"><label for="pl-h">${L("Звіт щодня о","Отчёт ежедневно в")}</label><select id="pl-h" data-plf="report_hour"${dis}>${hours.map(h => `<option value="${h}"${+e.report_hour === h ? " selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div>
      <div class="field"><label for="pl-i">${L("Кампанії, назва містить","Кампании, название содержит")}</label><input id="pl-i" data-plf="inc" value="${esc(e.inc || "")}" placeholder="${L("порожньо — усі","пусто — все")}"${dis}></div>
      <div class="field"><label for="pl-x">${L("Не містить","Не содержит")}</label><input id="pl-x" data-plf="exc" value="${esc(e.exc || "")}"${dis}></div>
      <label class="ck w"><input type="checkbox" data-plf="allow_exec"${e.allow_exec ? " checked" : ""}${dis}> <span>${L("Виконувати по «Так»: платформа сама вимикає групу або піднімає бюджет на 15% у Meta, коли ви натиснули «Так». Без цього — лише нагадує, а зміни робите ви.","Выполнять по «Да»: платформа сама выключает группу или поднимает бюджет на 15% в Meta, когда вы нажали «Да». Без этого — только напоминает, а изменения делаете вы.")}</span></label>
      <label class="ck w"><input type="checkbox" data-plf="enabled"${e.enabled ? " checked" : ""}${dis}> <b>${L("Вести акаунт","Вести аккаунт")}</b></label></div>
    <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="plSave" data-p="${p.id}"${dis}>${L("Зберегти","Сохранить")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="0">${L("Перевірити зараз","Проверить сейчас")}</button>
      <button type="button" class="btn btn--sm" data-act="plNow" data-p="${p.id}" data-v="1"${dis}>${L("Надіслати звіт зараз","Отправить отчёт сейчас")}</button></div>
    <div class="row pltg"><span class="lbl">Telegram</span>${(s && s.chats && s.chats.length) ? s.chats.map(c => pill("good", esc(c))).join(" ") : `<span class="sub">${L("не підключено","не подключено")}</span>`}
      <button type="button" class="btn btn--sm" data-act="plTg" data-p="${p.id}"${dis}${r.bot ? "" : ` title="${esc(plErr({error:"no_bot"}))}"`}>${L("Підключити Telegram","Подключить Telegram")}</button>${s && s.chats && s.chats.length ? `<button type="button" class="btn btn--sm" data-act="plTgTest" data-p="${p.id}">${L("Тест","Тест")}</button>` : ""}</div>
    ${PL.msg[p.id] ? `<p class="sub">${PL.msg[p.id]}</p>` : ""}
    ${log ? more("pl:" + p.id, L("журнал","журнал") + " · " + (r.log || []).length, `<ul class="pllog">${log}</ul>`) : ""}</div>`; }
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.plf || t.type === "checkbox") return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; PL.edit[p.id][t.dataset.plf] = t.value; PL.edit[p.id].auto = false; });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return; const p = P() || pfProjs()[0]; if (!p || !PL.edit[p.id]) return; const ed = PL.edit[p.id];
  if (t.dataset.plf && t.type === "checkbox") { ed[t.dataset.plf] = t.checked; render(); }
  if (t.dataset.plf === "report_hour") ed.report_hour = +t.value;
  if (t.dataset.placc) { ed.account_ids = t.checked ? [...new Set(ed.account_ids.concat(t.dataset.placc))] : ed.account_ids.filter(x => x !== t.dataset.placc); } });
Object.assign(ACT, {
  async plSave(d){ const e = PL.edit[d.p]; if (!e) return false; if (e.enabled && !(+String(e.target_cpl).replace(",", ".") > 0)) { toast(L("Вкажіть цільову ціну ліда","Укажите целевую цену лида")); return false; }
    const r = await plCall({action:"save", project_id:d.p, settings:Object.assign({}, e, {target_cpl:+String(e.target_cpl).replace(",", ".")})});
    toast(r.ok ? (e.enabled ? L("Збережено: пілот веде акаунт","Сохранено: пилот ведёт аккаунт") : L("Збережено","Сохранено")) : plErr(r)); if (r.ok) { delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); } return false; },
  async plNow(d){ PL.msg[d.p] = L("Перевіряємо…","Проверяем…"); render(); const r = await plCall({action:"now", project_id:d.p, report:d.v === "1", send:d.v === "1"});
    PL.msg[d.p] = r.ok ? L("Груп у роботі: ","Групп в работе: ") + r.groups + L(" · пропозицій: "," · предложений: ") + r.recos + (r.errs && r.errs.length ? " · " + esc(r.errs.join(", ")) : "") : esc(plErr(r)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plDecide(d){ const r = await plCall({action:"decide", project_id:d.p, id:+d.id, v:d.v}); toast(r.text || plErr(r)); delete PL.st[d.p]; const p = W.projs.find(x => x.id === d.p); if (p) plLoad(p); return false; },
  async plTg(d){ const w = window.open("", "_blank"); const r = await plCall({action:"tg_link", project_id:d.p});
    if (!r.ok) { if (w) w.close(); toast(plErr(r)); return false; } if (w) w.location = r.url; else location.href = r.url;
    PL.msg[d.p] = L("Відкрийте бота й натисніть «Start» — чат підключиться. Потім оновіть сторінку.","Откройте бота и нажмите «Start» — чат подключится. Потом обновите страницу."); render(); return false; },
  async plTgTest(d){ const r = await plCall({action:"tg_test", project_id:d.p}); toast(r.ok ? L("Надіслано — перевірте Telegram","Отправлено — проверьте Telegram") : plErr(r)); return false; },
});
