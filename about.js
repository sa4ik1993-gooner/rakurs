/* «Про проєкт» заполняется сам: с лендинга (через сервер Meta), из воронок и из статистики рекламы.
   Бесплатно, без ИИ: только то, что есть на странице и в цифрах. Пустые поля и те, что платформа заполнила сама раньше; написанное человеком не трогаем.
   Поля, которые поставила платформа, помечены — человек проверяет и правит. */
const AB = {busy:{}, tried:{}};
const abT = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s\S*$/, "") + "…" : s; };
function abLand(p){ const u = (p.site && /^https?:\/\//.test(p.site) ? p.site : "") || ((p.funnels.find(f => (f.lands || []).length) || {}).lands || [{}])[0].url || "";
  return typeof bdUrl === "function" ? bdUrl(u) : u; }
/* что отличает: строки с цифрами и словами доверия — «1200 выпускников», «10 лет», «практики» */
const AB_TRUST = /(\d[\d\s]*\+?\s*(рок|рів|лет|год|учн|студент|випускник|выпускник|клієнт|клиент|кейс|країн|стран)|практик|автор|гаранті|гаранти|сертиф|офіційн|официальн|єдин|единств|перш|перв)/i;
function abDesc(l){ if (!l) return "";
  const lead = abT(l.desc || (l.paras || [])[0] || (l.heads || [])[0] || l.title, 260);
  const ben = (l.bullets || []).filter(x => x.length >= 15 && x.length <= 140 && !AB_TRUST.test(x)).slice(0, 4);
  const diff = [...(l.heads || []), ...(l.bullets || []), ...(l.paras || [])].filter(x => x.length <= 160 && AB_TRUST.test(x)).slice(0, 2);
  return [lead, ben.length ? L("Користь: ","Польза: ") + ben.join("; ") : "", diff.length ? L("Чим відрізняємося: ","Чем отличаемся: ") + diff.join("; ") : ""].filter(Boolean).join("\n"); }
const abProduct = p => p.funnels.filter(f => f.an && f.an.offer).map(f => f.name + ": " + abT(f.an.offer, 120) + (f.tg && f.tg.check ? " ($" + num(f.tg.check) + ")" : "")).join("; ");
async function abWorked(p){ const offers = [...new Set(p.funnels.map(f => abT(String((f.an || {}).offer || "").split(/→|->/)[0], 60)).filter(Boolean))];
  let top = [];
  if (typeof prOn === "function" && prOn(p) && typeof sb !== "undefined") { const d2 = prToday(), d1 = typeof rsDay === "function" ? rsDay(d2, -90) : d2;
    try { const r = await sb.rpc("ad_creatives", {p:p.id, d1, d2}); const by = {};
      (r.data || []).forEach(o => { if (!o.ad_name) return; const k = typeof rsBase === "function" ? rsBase(o.ad_name) : o.ad_name, t = by[k] = by[k] || {n:o.ad_name, s:0, l:0}; t.s += +o.spend || 0; t.l += +o.leads || 0; });
      top = Object.values(by).filter(c => c.l >= 10).sort((a, b) => a.s / a.l - b.s / b.l).slice(0, 3); } catch (_e) { /* без статистики */ } }
  return [offers.length ? L("Офер: ","Оффер: ") + offers.join("; ") : "", top.length ? L("Найдешевші ліди за 90 днів: ","Самые дешёвые лиды за 90 дней: ") + top.map(c => c.n + " — $" + dec(c.s / c.l)).join("; ") : ""].filter(Boolean).join(". "); }
function abFree(p, k){ return !String(p[k] || "").trim() || (p.auto || {})[k]; }
async function abFill(p, manual){ if (AB.busy[p.id]) return; AB.busy[p.id] = true; AB.tried[p.id] = true; if (manual) render();
  const got = {}; p.auto = p.auto || {};
  try {
    const u = abLand(p), acc = ((((p.meta || {}).conn || {}).account) || {}).id;
    let land = null; if (CLOUD && u && acc && typeof mtCall === "function") { const r = await mtCall({action:"b_landing", project_id:p.id, account_id:acc, url:u}); if (r && r.ok) land = r; }
    const v = {desc:abDesc(land), product:abProduct(p), worked:await abWorked(p)};
    if (land && !String(p.site || "").trim()) v.site = u;
    Object.keys(v).forEach(k => { if (v[k] && abFree(p, k) && v[k] !== p[k]) { p[k] = v[k]; p.auto[k] = 1; got[k] = 1; } });
    if (Object.keys(got).length) save();
    if (manual) toast(Object.keys(got).length ? L("Заповнили самі — перевірте й виправте","Заполнили сами — проверьте и исправьте") : u ? L("Нового нічого не знайшли: поля, які ви писали самі, не чіпаємо","Нового ничего не нашли: поля, которые вы писали сами, не трогаем") : L("Додайте лендинг у воронку — з нього заповнимо опис","Добавьте лендинг в воронку — из него заполним описание"));
  } finally { AB.busy[p.id] = false; render(); } }
/* при открытии «Про проєкт»: один раз за сеанс, если есть что заполнить */
function abAuto(p){ if (!own() || AB.tried[p.id] || AB.busy[p.id]) return; if (!["desc", "product", "worked"].some(k => !String(p[k] || "").trim())) return; setTimeout(() => abFill(p, false), 0); }
function abHead(p){ const a = Object.keys(p.auto || {}).filter(k => (p.auto || {})[k]), nm = {desc:L("опис","описание"), product:L("що продаємо","что продаём"), worked:L("що спрацьовувало","что срабатывало"), site:L("сайт","сайт")};
  return `<div class="row sp"><span class="tag">${L("Про проєкт","О проекте")}</span><span class="row">${a.length ? `<small class="sub">${L("Поставили самі: ","Поставили сами: ")}${a.map(k => nm[k] || k).join(", ")}</small>` : ""}${own() ? `<button type="button" class="btn btn--sm" data-act="abFill"${AB.busy[p.id] ? " disabled" : ""}>${AB.busy[p.id] ? L("Заповнюємо…","Заполняем…") : L("Заповнити самі","Заполнить сами")}</button>` : ""}${hint(L("Беремо з лендинга воронки (заголовок, користь, цифри на кшталт «10 років», «1200 випускників»), з оферів воронок і з реклами: які креативи давали найдешевші ліди. Заповнюємо лише порожні поля й ті, що ставили самі. Що ви написали — не чіпаємо.","Берём с лендинга воронки (заголовок, польза, цифры вроде «10 лет», «1200 выпускников»), из офферов воронок и из рекламы: какие креативы давали самые дешёвые лиды. Заполняем только пустые поля и те, что ставили сами. Что вы написали — не трогаем."), "wide")}</span></div>`; }
Object.assign(ACT, { abFill(){ const p = P(); if (p) abFill(p, true); return false; } });
