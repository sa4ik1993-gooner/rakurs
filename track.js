/* Трекер HEYROW в кабинете: код для сайта (свой у каждого проекта и каждой воронки), проверка, что он стоит, и отчёт «трекер против Meta».
   Сам трекер — t.js (ставится на сайт клиента), приём событий — серверная функция track. Подключается после goals.js. */
const TK = {st:{}, busy:{}, rep:{}, repBusy:{}, hostsEdit:null, pages:{}, learn:{}};
const TR_SRC = () => { const b = location.origin + location.pathname.replace(/[^/]*$/, ""); return /localhost|127\.0\.0\.1/.test(b) ? "https://sa4ik1993-gooner.github.io/rakurs/" : b; };
async function trCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const r = await sb.functions.invoke("track", {body}); if (r.error || !r.data) return {ok:false, error:"net", detail:(r.error && r.error.message) || ""}; return r.data; }
  catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
const trErr = r => ({not_signed_in:L("Спершу увійди у кабінет","Сначала войди в кабинет"), denied:L("Немає доступу до цього проєкту","Нет доступа к этому проекту"), offline:L("Працює лише із сервером","Работает только с сервером"),
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
  return `<div class="panel tr"><div class="row sp"><h2>${L("Трекер HEYROW","Трекер HEYROW")}</h2><span class="row">${live ? pill("good", L("працює · ","работает · ") + trAgo(s.last)) : pill("warn", L("ще не стоїть на сайті","ещё не стоит на сайте"))}</span></div>
    <p class="sub">${L("Ключ проєкту: ","Ключ проекта: ")}<b class="mono">${esc(s.key)}</b> · ${L("за 7 днів: ","за 7 дней: ")}${num((s.kinds || {}).lead || 0)} ${L("лідів","лидов")}, ${num((s.kinds || {}).view || 0)} ${L("переглядів","просмотров")}${(s.kinds || {}).pay ? ", " + num(s.kinds.pay) + L(" оплат"," оплат") : ""}</p>
    ${fun || `<p class="sub">${L("Додай воронку — для неї з’явиться свій код.","Добавь воронку — для неё появится свой код.")}</p>`}
    <details class="trx"><summary>${L("Сайт на кількох доменах, оплата, згода на cookie","Сайт на нескольких доменах, оплата, согласие на cookie")}</summary>
      <p class="sub">${L("Загальний код без воронки: ","Общий код без воронки: ")}<code class="mono">${esc(trTag(s.key, ""))}</code> — ${L("воронку визначимо за адресою сторінки з розділу «Лендинги».","воронку определим по адресу страницы из раздела «Лендинги».")}</p>
      <p class="sub">${L("Сторінка «дякуємо» після оплати: ","Страница «спасибо» после оплаты: ")}<code class="mono">heyrow.pay(650, "USD")</code>. ${L("Якщо оплати вже рахує CRM — не став, щоб не задвоїти.","Если оплаты уже считает CRM — не ставь, чтобы не задвоить.")}</p>
      <p class="sub">${L("Для ЄС: додай ","Для ЕС: добавь ")}<code class="mono">data-consent="1"</code>${L(" і викликай "," и вызывай ")}<code class="mono">heyrow.consent()</code>${L(" після згоди на cookie."," после согласия на cookie.")}</p></details>
    ${trPagesBox(p)}<div class="trh"><span class="tag">${L("Звідки приходять події","Откуда приходят события")}</span> ${seen.length ? seen.map(h => `<span class="mono">${esc(h)}</span>`).join(", ") : `<span class="sub">—</span>`}
      ${adm ? `<div class="row"><input id="tr-hosts" value="${esc((s.hosts || []).join(", "))}" placeholder="${L("свої домени через кому — інші відкидаємо","свои домены через запятую — остальные отбрасываем")}" aria-label="${L("Дозволені домени","Разрешённые домены")}"><button type="button" class="btn btn--sm" data-act="trHosts">${L("Зберегти","Сохранить")}</button></div>` : ""}
      ${foreign.length > 1 ? `<p class="sub">${L("Домени не обмежено: події приймаються з будь-якого сайту з цим кодом. Впиши свої.","Домены не ограничены: события принимаются с любого сайта с этим кодом. Впиши свои.")}</p>` : ""}</div></div>`; }

/* отчёт в воронке: лиды трекера против лидов Meta по объявлениям за период карты */
const trPath = u => { try { const x = new URL(/^https?:/.test(u) ? u : "https://" + u); return [x.hostname.replace(/^www\./, ""), x.pathname.replace(/\/$/, "") || "/"]; } catch (e) { return ["", ""]; } };
/* какой воронке принадлежит событие трекера: 1) код воронки (data-f); 2) адрес страницы из «Лендингов» воронки;
   3) название кампании из метки utm_campaign по правилам аккаунтов; 4) единственная воронка проекта. Иначе — «не определено». */
/* Страницы сайта → воронка (p.trPages["host/path"] = {f, auto}). Платформа узнаёт сама: на страницу без кода воронки
   приходят люди с рекламы — по их кампаниям (правила аккаунтов, привязка кампаний) видно, чья это воронка. Если ≥70% из ≥10 человек
   из одной воронки — страница её («поставили сами»). Человек может поменять. «Спасибо» воронку не голосует: берёт с лендинга до неё. */
const trPK = (h, p) => (h || "") + ((p || "/").replace(/\/$/, "") || "/");
function trPageF(p, h, path){ const k = trPK(h, path), m = (p.trPages || {})[k]; if (m && m.f && p.funnels.some(f => f.id === m.f)) return m.f;
  const pg = [h, (path || "/").replace(/\/$/, "") || "/"];
  const f = p.funnels.find(f => (f.lands || []).some(l => { const t = trPath(l.url || ""); return t[0] === pg[0] && (pg[1] === t[1] || pg[1].indexOf(t[1] + "/") === 0); }));
  return f ? f.id : ""; }
/* какой воронке принадлежит событие: 1) код воронки; 2) страница (своя карта страниц, «Лендинги» воронок);
   3) для «Спасибо» — лендинг, с которого пришёл человек; 4) кампания из метки по правилам аккаунтов; 5) единственная воронка. */
function trFunnelOf(r, p){ if (r.funnel_id && p.funnels.some(f => f.id === r.funnel_id)) return r.funnel_id;
  const pf = trPageF(p, r.host, r.path); if (pf) return pf;
  if (r.lp_host) { const lf = trPageF(p, r.lp_host, r.lp_path); if (lf) return lf; }
  const byName = typeof fxByName === "function" ? fxByName(p, r.utm_campaign) : ""; if (byName) return byName;
  return p.funnels.length === 1 ? p.funnels[0].id : ""; }
async function trLearn(p){ if (!sb || TK.learn[p.id]) return; TK.learn[p.id] = 1;
  const d2 = prToday(), d1 = typeof rsDay === "function" ? rsDay(d2, -30) : d2;
  try { const [a, c] = await Promise.all([sb.rpc("track_summary", {p:p.id, d1, d2}), sb.rpc("ad_summary", {p:p.id, d1, d2})]); if (a.error) throw new Error(a.error.message);
    const byName = {}; (c.data || []).forEach(o => { const f = fxFunnel(p, {id:o.campaign_id, f:o.funnel_id || "", name:o.campaign_name}); if (f && o.campaign_name) byName[fxKey(o.campaign_name)] = f; });
    const pages = {}, votes = {};
    (a.data || []).forEach(r => { const k = trPK(r.host, r.path), g = pages[k] = pages[k] || {k, host:r.host, path:r.path, views:0, leads:0, thx:false, lp:{}, code:""};
      if (r.kind === "view") g.views += +r.people; else if (r.kind === "lead") g.leads += +r.people;
      if (r.lp_host) { g.thx = true; const lk = trPK(r.lp_host, r.lp_path); g.lp[lk] = (g.lp[lk] || 0) + +r.people; }
      if (r.funnel_id) g.code = r.funnel_id;
      if (r.kind === "view" && !r.lp_host && !r.funnel_id && r.utm_campaign) { const f = byName[fxKey(r.utm_campaign)] || (typeof fxByName === "function" ? fxByName(p, r.utm_campaign) : ""); if (f) { const v = votes[k] = votes[k] || {}; v[f] = (v[f] || 0) + +r.people; } } });
    p.trPages = p.trPages || {}; let ch = false;
    Object.keys(votes).forEach(k => { const m = p.trPages[k]; if (m && !m.auto) return; const v = votes[k], tot = Object.values(v).reduce((x, y) => x + y, 0), top = Object.keys(v).sort((x, y) => v[y] - v[x])[0];
      if (tot >= 10 && v[top] / tot >= 0.7) { if (!m || m.f !== top) { p.trPages[k] = {f:top, auto:1}; ch = true; } } });
    if (ch) save();
    TK.pages[p.id] = Object.values(pages).sort((x, y) => (y.views + y.leads) - (x.views + x.leads)); }
  catch (e) { TK.pages[p.id] = {err:String(e.message || e)}; }
  render(); }
const trThxF = (p, g) => { const top = Object.keys(g.lp || {}).sort((x, y) => g.lp[y] - g.lp[x])[0]; if (!top) return ""; const i = top.indexOf("/"); return trPageF(p, top.slice(0, i), top.slice(i)); };
function trPagesBox(p){ const ps = TK.pages[p.id]; if (!ps) { if (!TK.learn[p.id]) setTimeout(() => trLearn(p), 0); return ""; } if (ps.err || !ps.length) return "";
  const how = g => { const m = (p.trPages || {})[g.k]; if (g.code) return L("код воронки","код воронки"); if (m && m.f) return m.auto ? L("за рекламою — поставили самі","по рекламе — поставили сами") : L("вручну","вручную");
    if (g.thx) { const top = Object.keys(g.lp).sort((x, y) => g.lp[y] - g.lp[x])[0]; return L("«Дякуємо» — з лендингу ","«Спасибо» — с лендинга ") + (top || ""); } return trPageF(p, g.host, g.path) ? L("з «Лендингів» воронки","из «Лендингов» воронки") : L("не визначено","не определено"); };
  const fOf = g => g.code || trPageF(p, g.host, g.path) || (g.thx ? "" : "");
  return `<div class="trp"><span class="tag">${L("Сторінки сайту","Страницы сайта")} · 30 ${L("дн.","дн.")}</span>
    <div class="tw tw--in"><table><thead><tr><th>${L("Сторінка","Страница")}</th><th class="n">${L("Відвідувачі","Посетители")}</th><th class="n">${L("Ліди","Лиды")}</th><th>${L("Воронка","Воронка")}</th></tr></thead><tbody>
    ${ps.slice(0, 15).map(g => `<tr><td class="mono">${esc(g.host + g.path)}${g.thx ? " " + pill("mute", L("дякуємо","спасибо")) : ""}</td><td class="n mono">${num(g.views)}</td><td class="n mono">${num(g.leads)}</td><td>${g.code || g.thx ? `<span class="sub">${esc((p.funnels.find(f => f.id === (g.code || trThxF(p, g))) || {}).name || L("не визначено","не определено"))}</span> <small class="sub">${esc(how(g))}</small>` : `<select data-trp="${esc(g.k)}" aria-label="${L("Воронка сторінки","Воронка страницы")}"><option value="">— ${L("не визначено","не определено")} —</option>${p.funnels.map(f => `<option value="${f.id}"${fOf(g) === f.id ? " selected" : ""}>${esc(f.name)}</option>`).join("")}</select> <small class="sub">${esc(how(g))}</small>`}</td></tr>`).join("")}</tbody></table></div></div>`; }
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !t.dataset.trp) return; const p = P(); if (!p) return; p.trPages = p.trPages || {};
  if (t.value) p.trPages[t.dataset.trp] = {f:t.value, auto:0}; else p.trPages[t.dataset.trp] = {f:"", auto:0}; save(); render(); });
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
  if (!R.rows.length) return `<div class="panel">${head}<p class="sub">${L("За цей період подій трекера по воронці немає. Перевір, що код стоїть на лендингу (Підключення → Трекер HEYROW).","За этот период событий трекера по воронке нет. Проверь, что код стоит на лендинге (Подключения → Трекер HEYROW).")}</p></div>`;
  return `<div class="panel">${head}<div class="kpis kpis--4">${[[L("Ліди трекера","Лиды трекера"), num(tl)], [L("Ліди Meta","Лиды Meta"), R.meta ? num(mt) : "—"], [L("З міткою реклами","С меткой рекламы"), num(paid)], [L("Різниця","Разница"), R.meta ? (tl - mt > 0 ? "+" : "") + num(tl - mt) : "—"]].map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
    ${more("trr:" + f.id, L("по оголошеннях","по объявлениям") + " · " + rows.length, `<div class="tw tw--in"><table><thead><tr><th>${L("Оголошення (utm_content)","Объявление (utm_content)")}</th><th class="n">${L("Відвідувачі","Посетители")}</th><th class="n">${L("Ліди трекера","Лиды трекера")}</th><th class="n">${L("Ліди Meta","Лиды Meta")}</th><th class="n">${L("Оплати","Оплаты")}</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td class="nm">${esc(x.n)}</td><td class="n mono">${num(x.v)}</td><td class="n mono">${num(x.l)}</td><td class="n mono">${x.m == null ? "—" : num(x.m)}</td><td class="n mono">${x.pay ? num(x.pay) + (x.am ? " · $" + num(x.am) : "") : "—"}</td></tr>`).join("")}</tbody></table></div>`)}</div>`; }

Object.assign(ACT, {
  trReload(){ const p = P(); if (p) { delete TK.st[p.id]; trLoad(p); } return false; },
  trCopy(d){ const p = P(), s = p && TK.st[p.id]; if (!s || !s.key) return false; const t = trTag(s.key, d.v || "");
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(L("Код скопійовано — встав в блок head сайту","Код скопирован — вставь в блок head сайта")), () => toast(L("Виділи код і скопіюй вручну","Выдели код и скопируй вручную"))); return false; },
  async trHosts(){ const p = P(), el = document.getElementById("tr-hosts"); if (!p || !el) return false;
    const r = await trCall({action:"hosts", project_id:p.id, hosts:el.value.split(/[\s,;]+/).filter(Boolean)});
    if (r.ok) { toast(r.hosts.length ? L("Збережено: події лише з цих доменів","Сохранено: события только с этих доменов") : L("Обмеження знято","Ограничение снято")); delete TK.st[p.id]; trLoad(p); } else toast(trErr(r)); return false; },
});
