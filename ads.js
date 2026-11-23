/* Подключение Google Ads и TikTok Ads к проекту (серверные функции google и tiktok).
   Человек нажимает «Подключить», входит в окне площадки и возвращается сюда с ?gads=… или ?tt=… в адресе.
   Ключи доступа живут только на сервере; здесь — список выбранных аккаунтов (p.ads[канал]) для карты. */
const AD_FN = {gg:"google", tt:"tiktok"}, AD_RET = {gg:"gads", tt:"tt"};
const AD = {st:{}, seen:{}, pick:{}, busy:{}, sure:{}};
async function adCall(prov, body){
  if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const f = await sb.functions.invoke(AD_FN[prov], {body}); if (f.error || !f.data) return {ok:false, error:"net", detail:(f.error && f.error.message) || "empty"}; return f.data; }
  catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const adK = (p, prov) => p.id + "|" + prov;
const adErr = (prov, d) => ({not_signed_in:L("Спершу увійди у кабінет","Сначала войди в кабинет"), denied:L("Підключати кабінети може власник або керівник","Подключать кабинеты может собственник или руководитель"),
  no_keys:L("Сервер ще не налаштовано: власник має додати ключі застосунку в Supabase.","Сервер ещё не настроен: владелец должен добавить ключи приложения в Supabase."), revoked:L("Доступ відкликано — підключи заново.","Доступ отозван — подключи заново."),
  not_connected:L("Кабінет не підключено","Кабинет не подключён"), no_account:L("Обери хоча б один акаунт","Выбери хотя бы один аккаунт"), net:L("Сервер не відповів. Можливо, функцію ще не викладено.","Сервер не ответил. Возможно, функцию ещё не выложили.")}[d.error] || (d.detail || d.error));
/* что подключено — с сервера, один раз за сеанс на проект */
async function adStatus(p, prov, force){ const k = adK(p, prov); if (AD.st[k] && !force) return; AD.st[k] = {load:1}; render();
  const d = await adCall(prov, {action:"status", project_id:p.id}); AD.st[k] = d.ok ? d : {err:adErr(prov, d)};
  if (d.ok) { p.ads = p.ads || {}; const was = JSON.stringify(p.ads[prov] || null);
    p.ads[prov] = d.connected ? {conn:true, accounts:(d.conn && d.conn.accounts) || [], synced:d.conn && d.conn.synced_at} : null;
    if (d.connected && (d.conn.accounts || []).length) p.conn[prov] = 1;
    if (was !== JSON.stringify(p.ads[prov] || null)) save(); }
  render(); }
async function adConnect(p, prov){ const d = await adCall(prov, {action:"auth_url", project_id:p.id}); if (!d.ok) { toast(adErr(prov, d)); return; } location.href = d.url; }
async function adAccounts(p, prov){ const k = adK(p, prov); AD.busy[k] = 1; render(); const d = await adCall(prov, {action:"accounts", project_id:p.id}); AD.busy[k] = 0;
  if (!d.ok) { toast(adErr(prov, d)); render(); return; } AD.seen[k] = d.accounts; AD.pick[k] = d.chosen && d.chosen.length ? d.chosen.slice() : d.accounts.length === 1 ? [d.accounts[0].id] : []; render(); }
async function adSave(p, prov){ const k = adK(p, prov); AD.busy[k] = 1; render(); const d = await adCall(prov, {action:"save", project_id:p.id, account_ids:AD.pick[k] || []}); AD.busy[k] = 0;
  if (!d.ok) { toast(adErr(prov, d)); render(); return; } delete AD.seen[k]; await adStatus(p, prov, true); adSync(p, prov, 30, true); }
async function adSync(p, prov, days, manual){ const k = adK(p, prov); AD.busy[k] = 1; render(); const d = await adCall(prov, {action:"sync", project_id:p.id, days}); AD.busy[k] = 0;
  if (!d.ok) { if (manual) toast(adErr(prov, d)); render(); return d; }
  if (p.ads && p.ads[prov]) p.ads[prov].synced = d.synced_at; Object.keys(PD).forEach(x => { if (x.indexOf(p.id + "|") === 0) PD[x].at = 0; });
  if (manual) toast(L("Завантажено рядків: ","Загружено строк: ") + d.rows + (d.unmatched ? L(" · кампаній без воронки: "," · кампаний без воронки: ") + d.unmatched : "")); render(); return d; }
/* обновление «Сегодня» над картой тянет и Google с TikTok, если они подключены */
const adSyncToday = p => Promise.all(Object.keys(AD_FN).filter(prov => p.ads && p.ads[prov] && p.ads[prov].conn).map(prov => adSync(p, prov, 2, false)));

function adCard(p, prov, hintText){ const k = adK(p, prov), st = AD.st[k], a = (p.ads || {})[prov], name = GUIDES()[prov].name, busy = AD.busy[k] ? " disabled" : "";
  if (!CLOUD) return guideCard(p, prov, hintText);
  if (!st) { setTimeout(() => adStatus(p, prov), 0); return `<p class="sub">…</p>`; }
  if (st.load) return `<p class="sub">…</p>`;
  if (st.err) return `<p class="mterr">${esc(st.err)}</p>${guideCard(p, prov, hintText)}`;
  const seen = AD.seen[k];
  if (seen) return `<div class="ckl">${seen.length ? seen.map(x => `<label class="ck"><input type="checkbox" data-adc="${k}" value="${esc(x.id)}"${(AD.pick[k] || []).includes(x.id) ? " checked" : ""}><span><b>${esc(x.name)}</b><small class="sub mono">${esc(x.id)}${x.currency ? " · " + esc(x.currency) : ""}</small></span></label>`).join("") : `<p class="sub">${L("Доступ не бачить жодного рекламного акаунта.","Доступ не видит ни одного рекламного аккаунта.")}</p>`}</div>
    <div class="row"><button class="btn btn--sm btn--solid" data-act="adSave" data-id="${p.id}" data-v="${prov}"${busy || !(AD.pick[k] || []).length ? " disabled" : ""}>${L("Зберегти й завантажити 30 днів","Сохранить и загрузить 30 дней")}</button><button class="btn btn--sm" data-act="adPickClose" data-id="${p.id}" data-v="${prov}">${L("Скасувати","Отмена")}</button></div>`;
  if (st.connected) { const accs = (a && a.accounts) || [];
    return `${accs.length ? `<ul class="adl">${accs.map(x => `<li><b>${esc(x.name)}</b> <small class="sub mono">${esc(x.id)}${x.currency ? " · " + esc(x.currency) : ""}</small></li>`).join("")}</ul>` : `<p class="sub">${L("Кабінет підключено. Обери акаунти проєкту.","Кабинет подключён. Выбери аккаунты проекта.")}</p>`}
      ${a && a.synced ? `<small class="sub mono">${L("оновлено: ","обновлено: ")}${esc(fxWhen(a.synced))}</small>` : ""}
      <div class="row">${accs.length ? `<button class="btn btn--sm btn--solid" data-act="adSync" data-id="${p.id}" data-v="${prov}"${busy}>${AD.busy[k] ? L("Завантажуємо…","Загружаем…") : L("Оновити дані","Обновить данные")}</button>` : ""}
        <button class="btn btn--sm${accs.length ? "" : " btn--solid"}" data-act="adPick" data-id="${p.id}" data-v="${prov}"${busy}>${L("Акаунти","Аккаунты")}</button>
        <button class="btn btn--sm" data-act="adOff" data-id="${p.id}" data-v="${prov}"${busy}>${AD.sure[k] ? L("Точно відключити?","Точно отключить?") : L("Відключити","Отключить")}</button></div>`; }
  if (!st.keys) return `<p class="sub">${L("Підключення через вікно ","Подключение через окно ")}${name}${L(" готове на платформі, але сервер ще не налаштовано: потрібні ключі застосунку."," готово на платформе, но сервер ещё не настроен: нужны ключи приложения.")}</p>${guideCard(p, prov, "")}`;
  return `<p class="sub">${L("Вхід у вікні ","Вход в окне ")}${name}${L(", доступ лише на читання звітів. Пароль платформа не бачить.",", доступ только на чтение отчётов. Пароль платформа не видит.")}</p><div class="row"><button class="btn btn--sm btn--solid" data-act="adConnect" data-id="${p.id}" data-v="${prov}">${L("Підключити ","Подключить ")}${name}</button><button class="btn btn--sm" data-act="gdOpen" data-id="${p.id}" data-v="${prov}">${L("Підготовка кабінету","Подготовка кабинета")}</button></div>`; }

Object.assign(ACT, {
  adConnect(d){ const p = W.projs.find(x => x.id === d.id); if (p) adConnect(p, d.v); return false; },
  adPick(d){ const p = W.projs.find(x => x.id === d.id); if (p) adAccounts(p, d.v); return false; },
  adPickClose(d){ delete AD.seen[d.id + "|" + d.v]; },
  adSave(d){ const p = W.projs.find(x => x.id === d.id); if (p) adSave(p, d.v); return false; },
  adSync(d){ const p = W.projs.find(x => x.id === d.id); if (p) adSync(p, d.v, 7, true); return false; },
  adOff(d){ const k = d.id + "|" + d.v, p = W.projs.find(x => x.id === d.id); if (!p) return false;
    if (!AD.sure[k]) { AD.sure[k] = 1; setTimeout(() => { AD.sure[k] = 0; render(); }, 4000); return; }
    AD.sure[k] = 0; adCall(d.v, {action:"disconnect", project_id:p.id}).then(r => { if (!r.ok) { toast(adErr(d.v, r)); return; } if (p.ads) p.ads[d.v] = null; p.conn[d.v] = 0; save(); adStatus(p, d.v, true); toast(L("Відключено","Отключено")); }); return false; }
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.adc) return; const k = t.dataset.adc, a = AD.pick[k] = AD.pick[k] || [];
  if (t.checked && !a.includes(t.value)) a.push(t.value); if (!t.checked) AD.pick[k] = a.filter(x => x !== t.value); render(); });
/* возврат из окна Google или TikTok: сообщение, открыть проект на подключениях, предложить выбрать аккаунты */
(function adReturn(){ const q = new URLSearchParams(location.search); let prov = "", v = "";
  for (const k of Object.keys(AD_RET)) if (q.get(AD_RET[k])) { prov = k; v = q.get(AD_RET[k]); }
  if (!prov) return; const pid = q.get("p"), n = +q.get("n") || 0;
  ["gads", "tt", "p", "n"].forEach(x => q.delete(x)); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  const msg = {ok:L("Кабінет підключено","Кабинет подключён"), cancel:L("Підключення скасовано","Подключение отменено"), state:L("Посилання застаріло — натисни «Підключити» ще раз","Ссылка устарела — нажми «Подключить» ещё раз"),
    norefresh:L("Площадка не видала постійний доступ — спробуй ще раз","Площадка не выдала постоянный доступ — попробуй ещё раз"), nokeys:L("Сервер ще не налаштовано","Сервер ещё не настроен")}[v] || L("Не вдалося підключити: ","Не удалось подключить: ") + v;
  let tries = 0; setTimeout(() => toast(msg), 300);
  const go = () => { const p = pid && W.projs && W.projs.find(x => x.id === pid); if (!p && tries++ < 75) return setTimeout(go, 400);
    if (p && v === "ok") { W.cur = p.id; W.fun = null; W.tab = "conn"; save(); adStatus(p, prov, true).then(() => { if (n !== 1) adAccounts(p, prov); else adSync(p, prov, 30, true); }); } };
  setTimeout(go, 600); })();
