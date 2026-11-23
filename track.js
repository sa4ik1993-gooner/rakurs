/* Трекер HEYROW в кабинете: код для сайта (свой у каждого проекта и каждой воронки), проверка, что он стоит, и отчёт «трекер против Meta».
   Сам трекер — t.js (ставится на сайт клиента), приём событий — серверная функция track. Подключается после goals.js. */
const TK = {st:{}, busy:{}, rep:{}, repBusy:{}, hostsEdit:null};
const TR_SRC = () => { const b = location.origin + location.pathname.replace(/[^/]*$/, ""); return /localhost|127\.0\.0\.1/.test(b) ? "https://sa4ik1993-gooner.github.io/rakurs/" : b; };
async function trCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("track", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; }
  catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const trErr = r => ({not_signed_in:L("Спершу увійдіть у кабінет","Сначала войдите в кабинет"), denied:L("Немає доступу до цього проєкту","Нет доступа к этому проекту"), offline:L("Працює лише із сервером","Работает только с сервером"),
  net:L("Сервер не відповів. Можливо, функцію track ще не викладено.","Сервер не ответил. Возможно, функцию track ещё не выложили.")})[r.error] || (r.error || "") + (r.detail ? ": " + r.detail : "");
async function trLoad(p){ if (TK.busy[p.id]) return; TK.busy[p.id] = true;
  let r = await trCall({action:"status", project_id:p.id});
  if (r.ok && !r.key) { const k = await trCall({action:"key", project_id:p.id}); if (k.ok && k.key) r = await trCall({action:"status", project_id:p.id}); else if (k.ok) r = Object.assign({}, r, {nokey:true}); }
  TK.st[p.id] = r; TK.busy[p.id] = false; render(); }
const trTag = (k, f) => `<script async src="${TR_SRC()}t.js" data-k="${k}"${f ? ` data-f="${f}"` : ""}></` + `script>`;
const trAgo = iso => { if (!iso) return ""; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? m + L(" хв тому"," мин назад") : m < 1440 ? Math.round(m / 60) + L(" год тому"," ч назад") : Math.round(m / 1440) + L(" дн. тому"," дн. назад"); };

/* карточка в «Подключениях» проекта */
function trPanel(p){
  if (!CLOUD) return `<div class="panel tr"><div class="row sp"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2>${pill("mute", L("прототип","прототип"))}</div><p class="sub">${L("Код трекера видно після входу на сервер.","Код трекера виден после входа на сервер.")}</p></div>`;
  const s = TK.st[p.id]; if (!s && !TK.busy[p.id]) setTimeout(() => trLoad(p), 0);
  if (!s) return `<div class="panel tr"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2><p class="sub" role="status">${L("Завантажуємо…","Загружаем…")}</p></div>`;
  if (!s.ok) return `<div class="panel tr"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2><p class="sub">${esc(trErr(s))}</p><button class="btn btn--sm" data-act="trReload">${L("Спробувати ще","Попробовать ещё")}</button></div>`;
  if (!s.key) return `<div class="panel tr"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2><p class="sub">${L("Ключ трекера створює власник або керівник проєкту.","Ключ трекера создаёт собственник или руководитель проекта.")}</p></div>`;
  const live = s.last && Date.now() - Date.parse(s.last) < 7 * 864e5, seen = Object.keys(s.seen || {}), adm = canAdmin();
  const foreign = (s.hosts || []).length ? [] : seen;
  const fun = p.funnels.map(f => { const x = (s.funnels || {})[f.id];
    return `<div class="trf"><div class="row sp"><b>${esc(f.name)}</b>${x ? pill("good", num(x.leads) + L(" лідів · "," лидов · ") + num(x.views) + L(" переглядів"," просмотров")) : pill("mute", L("подій ще немає","событий ещё нет"))}</div>
      <div class="row trc"><code class="mono">${esc(trTag(s.key, f.id))}</code><button type="button" class="btn btn--sm" data-act="trCopy" data-v="${esc(f.id)}">${L("Копіювати","Копировать")}</button></div></div>`; }).join("");
  return `<div class="panel tr"><div class="row sp"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2><span class="row">${live ? pill("good", L("працює · ","работает · ") + trAgo(s.last)) : pill("warn", L("ще не стоїть на сайті","ещё не стоит на сайте"))}${hint(L("Один рядок коду в блок head сайту. Запам’ятовує, з якої реклами прийшла людина (90 днів), дописує мітки в кожну форму — вони дійдуть до будь-якої CRM — і рахує ліди окремо від Facebook. Почту й телефон не передає, лише їхній хеш. У кожної воронки свій код: так видно, з якої воронки лід.","Одна строка кода в блок head сайта. Запоминает, с какой рекламы пришёл человек (90 дней), дописывает метки в каждую форму — они дойдут до любой CRM — и считает лиды отдельно от Facebook. Почту и телефон не передаёт, только их хеш. У каждой воронки свой код: так видно, из какой воронки лид."), "wide")}</span></div>
    <p class="sub">${L("Ключ проєкту: ","Ключ проекта: ")}<b class="mono">${esc(s.key)}</b> · ${L("за 7 днів: ","за 7 дней: ")}${num((s.kinds || {}).lead || 0)} ${L("лідів","лидов")}, ${num((s.kinds || {}).view || 0)} ${L("переглядів","просмотров")}${(s.kinds || {}).pay ? ", " + num(s.kinds.pay) + L(" оплат"," оплат") : ""}</p>
    ${fun || `<p class="sub">${L("Додайте воронку — для неї з’явиться свій код.","Добавьте воронку — для неё появится свой код.")}</p>`}
    <details class="trx"><summary>${L("Сайт на кількох доменах, оплата, згода на cookie","Сайт на нескольких доменах, оплата, согласие на cookie")}</summary>
      <p class="sub">${L("Загальний код без воронки: ","Общий код без воронки: ")}<code class="mono">${esc(trTag(s.key, ""))}</code> — ${L("воронку визначимо за адресою сторінки з розділу «Лендинги».","воронку определим по адресу страницы из раздела «Лендинги».")}</p>
      <p class="sub">${L("Сторінка «дякуємо» після оплати: ","Страница «спасибо» после оплаты: ")}<code class="mono">heyrow.pay(650, "USD")</code>. ${L("Якщо оплати вже рахує CRM — не ставте, щоб не задвоїти.","Если оплаты уже считает CRM — не ставьте, чтобы не задвоить.")}</p>
      <p class="sub">${L("Для ЄС: додайте ","Для ЕС: добавьте ")}<code class="mono">data-consent="1"</code>${L(" і викликайте "," и вызывайте ")}<code class="mono">heyrow.consent()</code>${L(" після згоди на cookie."," после согласия на cookie.")}</p></details>
    <div class="trh"><span class="tag">${L("Звідки приходять події","Откуда приходят события")}</span> ${seen.length ? seen.map(h => `<span class="mono">${esc(h)}</span>`).join(", ") : `<span class="sub">—</span>`}
      ${adm ? `<div class="row"><input id="tr-hosts" value="${esc((s.hosts || []).join(", "))}" placeholder="${L("свої домени через кому — інші відкидаємо","свои домены через запятую — остальные отбрасываем")}" aria-label="${L("Дозволені домени","Разрешённые домены")}"><button type="button" class="btn btn--sm" data-act="trHosts">${L("Зберегти","Сохранить")}</button></div>` : ""}
      ${foreign.length > 1 ? `<p class="sub">${L("Домени не обмежено: події приймаються з будь-якого сайту з цим кодом. Впишіть свої.","Домены не ограничены: события принимаются с любого сайта с этим кодом. Впишите свои.")}</p>` : ""}</div></div>`; }

/* отчёт в воронке: лиды трекера против лидов Meta по объявлениям за период карты */
const trPath = u => { try { const x = new URL(/^https?:/.test(u) ? u : "https://" + u); return [x.hostname.replace(/^www\./, ""), x.pathname.replace(/\/$/, "") || "/"]; } catch (e) { return ["", ""]; } };
/* какой воронке принадлежит событие трекера: 1) код воронки (data-f); 2) адрес страницы из «Лендингов» воронки;
   3) название кампании из метки utm_campaign по правилам аккаунтов; 4) единственная воронка проекта. Иначе — «не определено». */
function trFunnelOf(r, p){ if (r.funnel_id && p.funnels.some(f => f.id === r.funnel_id)) return r.funnel_id;
  const pg = [r.host, (r.path || "/").replace(/\/$/, "") || "/"];
  const byPage = p.funnels.find(f => (f.lands || []).some(l => { const t = trPath(l.url || ""); return t[0] === pg[0] && (pg[1] === t[1] || pg[1].indexOf(t[1] + "/") === 0); }));
  if (byPage) return byPage.id;
  const byName = typeof fxByName === "function" ? fxByName(p, r.utm_campaign) : ""; if (byName) return byName;
  return p.funnels.length === 1 ? p.funnels[0].id : ""; }
const trMine = (r, f, p) => trFunnelOf(r, p) === f.id;
async function trRep(p, f){ const k = f.id; if (TK.repBusy[k]) return; TK.repBusy[k] = true;
  const r = typeof prRange === "function" ? prRange() : {d1:prToday(), d2:prToday()};
  try { const [a, b, c] = await Promise.all([sb.rpc("track_summary", {p:p.id, d1:r.d1, d2:r.d2}), sb.rpc("ad_creatives", {p:p.id, d1:r.d1, d2:r.d2}), sb.rpc("ad_summary", {p:p.id, d1:r.d1, d2:r.d2})]);
    if (a.error) throw new Error(a.error.message);
    const cf = {}; (c.data || []).forEach(o => { cf[o.campaign_id] = fxFunnel(p, {id:o.campaign_id, f:o.funnel_id || "", name:o.campaign_name}); });
    TK.rep[k] = {r, at:Date.now(), rows:(a.data || []).filter(x => trMine(x, f, p)), meta:b.error ? null : (b.data || []).filter(o => o.provider === "meta" && (cf[o.campaign_id] != null ? cf[o.campaign_id] : fxFunnel(p, {id:o.campaign_id, f:"", name:o.campaign_name})) === f.id)}; }
  catch (e) { TK.rep[k] = {err:String(e.message || e)}; }
  TK.repBusy[k] = false; render(); }
function trReport(p, f){ if (!CLOUD) return ""; const s = TK.st[p.id]; if (s === undefined && !TK.busy[p.id]) setTimeout(() => trLoad(p), 0);
  if (!s || !s.ok || !s.key) return "";
  const rg = typeof prRange === "function" ? prRange() : null, R = TK.rep[f.id];
  if ((!R || (rg && R.r && (R.r.d1 !== rg.d1 || R.r.d2 !== rg.d2))) && !TK.repBusy[f.id]) setTimeout(() => trRep(p, f), 0);
  const head = `<div class="row sp"><span class="tag">${L("Трекер проти Meta","Трекер против Meta")}${R && R.r && typeof prLabel === "function" ? " · " + esc(prLabel(Object.assign({span:Math.round((Date.parse(R.r.d2) - Date.parse(R.r.d1)) / 864e5) + 1}, R.r))) : ""}</span>${hint(L("Ліди трекера — унікальні люди, що відправили форму на сайті з кодом цієї воронки. Ліди Meta — те, що бачить Facebook. Різниця — люди, яких Facebook не побачив (блокувальники, iPhone, повернулися пізніше) або які прийшли не з реклами. Мітка оголошення — utm_content.","Лиды трекера — уникальные люди, отправившие форму на сайте с кодом этой воронки. Лиды Meta — то, что видит Facebook. Разница — люди, которых Facebook не увидел (блокировщики, iPhone, вернулись позже) или пришедшие не с рекламы. Метка объявления — utm_content."), "wide")}</div>`;
  if (!R || TK.repBusy[f.id] && !R.rows) return `<div class="panel">${head}<p class="sub" role="status">${L("Рахуємо…","Считаем…")}</p></div>`;
  if (R.err) return `<div class="panel">${head}<p class="sub">${esc(R.err)}</p></div>`;
  const by = {}, add = (n, o) => { const kk = fxKey(n) || "—", t = by[kk] = by[kk] || {n:n || L("без мітки","без метки"), v:0, l:0, pay:0, am:0, m:null}; Object.keys(o).forEach(x => t[x] = (t[x] || 0) + o[x]); };
  R.rows.forEach(x => add(x.utm_content, x.kind === "view" ? {v:+x.people} : x.kind === "lead" ? {l:+x.people} : {pay:+x.events, am:+x.amount}));
  let mt = 0; (R.meta || []).forEach(o => { const n = +o.leads || 0; mt += n; if (!o.ad_name) return; add(o.ad_name, {}); const t = by[fxKey(o.ad_name)]; t.m = (t.m || 0) + n; });
  const rows = Object.values(by).filter(x => x.l || x.m || x.pay).sort((a, b) => (b.l + (b.m || 0)) - (a.l + (a.m || 0))).slice(0, 20), tl = rows.reduce((a, x) => a + x.l, 0), paid = R.rows.filter(x => x.kind === "lead" && x.utm_source).reduce((a, x) => a + +x.people, 0);
  if (!R.rows.length) return `<div class="panel">${head}<p class="sub">${L("За цей період подій трекера по воронці немає. Перевірте, що код стоїть на лендингу (Підключення → Трекер HEYROW).","За этот период событий трекера по воронке нет. Проверьте, что код стоит на лендинге (Подключения → Трекер HEYROW).")}</p></div>`;
  return `<div class="panel">${head}<div class="kpis kpis--4">${[[L("Ліди трекера","Лиды трекера"), num(tl)], [L("Ліди Meta","Лиды Meta"), R.meta ? num(mt) : "—"], [L("З міткою реклами","С меткой рекламы"), num(paid)], [L("Різниця","Разница"), R.meta ? (tl - mt > 0 ? "+" : "") + num(tl - mt) : "—"]].map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
    <div class="tw tw--in"><table><thead><tr><th>${L("Оголошення (utm_content)","Объявление (utm_content)")}</th><th class="n">${L("Відвідувачі","Посетители")}</th><th class="n">${L("Ліди трекера","Лиды трекера")}</th><th class="n">${L("Ліди Meta","Лиды Meta")}</th><th class="n">${L("Оплати","Оплаты")}</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td class="mono">${esc(x.n)}</td><td class="n mono">${num(x.v)}</td><td class="n mono">${num(x.l)}</td><td class="n mono">${x.m == null ? "—" : num(x.m)}</td><td class="n mono">${x.pay ? num(x.pay) + (x.am ? " · $" + num(x.am) : "") : "—"}</td></tr>`).join("")}</tbody></table></div></div>`; }

Object.assign(ACT, {
  trReload(){ const p = P(); if (p) { delete TK.st[p.id]; trLoad(p); } return false; },
  trCopy(d){ const p = P(), s = p && TK.st[p.id]; if (!s || !s.key) return false; const t = trTag(s.key, d.v || "");
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(L("Код скопійовано — вставте в блок head сайту","Код скопирован — вставьте в блок head сайта")), () => toast(L("Виділіть код і скопіюйте вручну","Выделите код и скопируйте вручную"))); return false; },
  async trHosts(){ const p = P(), el = document.getElementById("tr-hosts"); if (!p || !el) return false;
    const r = await trCall({action:"hosts", project_id:p.id, hosts:el.value.split(/[\s,;]+/).filter(Boolean)});
    if (r.ok) { toast(r.hosts.length ? L("Збережено: події лише з цих доменів","Сохранено: события только с этих доменов") : L("Обмеження знято","Ограничение снято")); delete TK.st[p.id]; trLoad(p); } else toast(trErr(r)); return false; },
});
