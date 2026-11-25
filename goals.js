/* Цели и окупаемость: видны всем ролям на карте, проверяются при каждом изменении целей.
   Потолок цены лида = чек × лид→бронь × бронь→оплата × доля маркетинга. Окупаемость (ROAS) по плану = 100 / доля маркетинга.
   По факту: доля маркетинга, которую реально съест реклама, = доля × (факт цены лида / потолок).
   Пороги — наши по умолчанию (W.co.set.ge переопределяет), показываются как «поставили сами». */
const GE_DEF = {shareWarn:35, shareCrit:50, minLeads:10};
function geTh(){ const o = Object.assign({}, GE_DEF), c = ((W.co || {}).set || {}).ge || {}; Object.keys(GE_DEF).forEach(k => { const n = parseFloat(String(c[k] == null ? "" : c[k]).replace(",", ".")); if (n > 0) o[k] = n; }); return o; }
/* факт воронки за период карты: расход, лиды, оплаты (если есть продажи) */
function geFact(p, f){ if (typeof prOn !== "function" || !prOn(p)) return null; const x = prOf(p); if (!x.cur) return null;
  const rows = x.cur.filter(r => fxFunnel(p, r) === f.id).map(r => Object.assign({}, r, (x.sb || {})[fxKey(r.name)] || {})), s = fxSum(rows);
  return s.leads >= geTh().minLeads ? {spend:s.spend, leads:s.leads, cpl:s.spend / s.leads, pay:s.pay, book:s.book, label:prLabel(x.r)} : null; }
const geRoas = share => share > 0 ? 100 / share : 0;
/* проверки экономики: [уровень, заголовок, пояснение] */
function geChecks(t, share, fact){ const th = geTh(), out = [], k = 1 + Math.max(0, +t.ltv || 0) / 100, cap1 = t.check * t.l2b / 100 * t.b2p / 100 * share / 100, cap = cap1 * k;
  const noLtv = k > 1 ? "" : L(" Якщо клієнти докуповують, вкажи допродажі в цілях воронки — гранична ціна ліда зросте."," Если клиенты докупают, укажи допродажи в целях воронки — потолок вырастет.");
  if (share >= 100) out.push(["crit", L("Збиток за планом","Убыток по плану"), L("Частка маркетингу ","Доля маркетинга ") + share + L("%: реклама коштує більше, ніж приносить виручки.","%: реклама стоит больше, чем приносит выручки.")]);
  else if (share > th.shareCrit) out.push(["crit", L("Погана окупність","Плохая окупаемость"), L("Окупність за планом ","Окупаемость по плану ") + dec(geRoas(share), 1) + L(": реклама забирає більше половини виручки, на решту бізнесу лишається мало.",": реклама забирает больше половины выручки, на остальной бизнес остается мало.")]);
  else if (share > th.shareWarn) out.push(["warn", L("Окупність на межі","Окупаемость на грани"), L("Окупність за планом ","Окупаемость по плану ") + dec(geRoas(share), 1) + L(". Перевір, чи вистачає маржі.",". Проверь, хватает ли маржи.")]);
  if (t.check > 5000) out.push(["warn", L("Чек дуже великий","Чек очень большой"), L("Поле в доларах. Якщо вписано суму в гривнях — граничну ціну ліда завищено в ~41 раз.","Поле в долларах. Если вписана сумма в гривнах — потолок цены лида завышен в ~41 раз.")]);
  if (t.l2b > 40) out.push(["warn", L("Лід → бронювання вище 40%","Лид → бронь выше 40%"), L("Так буває рідко. Перевір, що «лід» — це реєстрація, а не вже бронювання.","Так бывает редко. Проверь, что «лид» — это регистрация, а не уже бронь.")]);
  if (t.b2p > 90) out.push(["warn", L("Бронювання → оплата вище 90%","Бронь → оплата выше 90%"), L("Перевір цифру: майже всі бронювання оплачують?","Проверь цифру: почти все брони оплачивают?")]);
  if (fact && cap > 0) { const real = share * fact.cpl / cap, rr = geRoas(real);
    if (real >= 100) out.push(["crit", L("Зараз у мінус","Сейчас в минус"), L("Факт ціни ліда ","Факт цены лида ") + (dec(fact.cpl) + " $") + L(" за граничної ціни "," при потолке ") + (dec(cap) + " $") + L(": реклама дорожча за виручку (окупність ",": реклама дороже выручки (окупаемость ") + dec(rr, 2) + ")." + noLtv, fact.label]);
    else if (fact.cpl > cap * 1.5) out.push(["crit", L("Невигідно зараз","Невыгодно сейчас"), L("Ліди за ","Лиды по ") + (dec(fact.cpl) + " $") + L(" замість "," вместо ") + (dec(cap) + " $") + L(": реклама забере ",": реклама заберет ") + Math.round(real) + L("% виручки, окупність ","% выручки, окупаемость ") + dec(rr, 1) + "." + noLtv, fact.label]);
    else if (fact.cpl > cap) out.push(["warn", L("Дорожче за план","Дороже плана"), L("Ліди за ","Лиды по ") + (dec(fact.cpl) + " $") + L(" за граничної ціни "," при потолке ") + (dec(cap) + " $") + L(": частка маркетингу фактично ",": доля маркетинга фактически ") + Math.round(real) + "%." + noLtv, fact.label]);
    else if (k > 1 && fact.cpl > cap1) out.push(["warn", L("Окупається на допродажах","Окупается на допродажах"), L("Ліди за ","Лиды по ") + (dec(fact.cpl) + " $") + L(": перша оплата їх не окупає (гранична ціна $",": первая оплата их не окупает (потолок $") + dec(cap1) + L("), з допродажами — в межах ($","), с допродажами — в пределах ($") + dec(cap) + L("). Гроші повертаються пізніше — стеж за касою.","). Деньги возвращаются позже — следи за кассой."), fact.label]);
    else out.push(["good", L("У межах плану","В пределах плана"), L("Ліди за ","Лиды по ") + (dec(fact.cpl) + " $") + L(" за граничної ціни "," при потолке ") + (dec(cap) + " $") + L(", окупність ",", окупаемость ") + dec(rr, 1) + ".", fact.label]);
    if (fact.pay > 0 && fact.leads >= 50) { const pl = t.l2b / 100 * t.b2p / 100, fl = fact.pay / fact.leads;
      if (fl < pl * 0.7) out.push(["warn", L("Оплат менше за план","Оплат меньше плана"), L("Від лідів платять ","От лидов платят ") + dec(fl * 100, 1) + L("% замість ","% вместо ") + dec(pl * 100, 1) + "%.", fact.label]); } }
  if (!out.some(o => o[0] !== "good")) out.unshift(["good", L("Економіка сходиться","Экономика сходится"), L("Окупність за планом ","Окупаемость по плану ") + dec(geRoas(share), 1) + "."]);
  return out; }
const geList = cs => `<ul class="gel">${cs.map(c => `<li class="gel--${c[0]}"><b>${c[1]}</b> <span>${c[2]}</span>${c[3] ? ` <small class="sub mono">${esc(c[3])}</small>` : ""}</li>`).join("")}</ul>`;
const geLv = cs => cs.some(c => c[0] === "crit") ? "crit" : cs.some(c => c[0] === "warn") ? "warn" : "good";
/* проверка целей проекта: по каждой воронке со своим фактом + общие */
function geProject(p){ const all = []; geChecks({check:p.tg.check, l2b:p.tg.l2b, b2p:p.tg.b2p, ltv:p.tg.ltv}, p.tg.share, null).forEach(c => all.push(c));
  p.funnels.forEach(f => geChecks(geT(f, p), p.tg.share, geFact(p, f)).filter(c => c[3] && c[0] !== "good").forEach(c => all.push([c[0], f.name + ": " + c[1], c[2], c[3]])));
  const bud = p.funnels.reduce((a, f) => a + fT(f, p).bud, 0); if (p.funnels.length && bud > p.tg.budget * 1.05) all.push(["warn", L("Воронкам потрібно більше бюджету","Воронкам нужно больше бюджета"), L("Сума бюджетів воронок ","Сумма бюджетов воронок ") + money(bud) + L(" більша за бюджет проєкту "," больше бюджета проекта ") + money(p.tg.budget) + "."]);
  const bad = all.filter(c => c[0] !== "good"); return bad.length ? bad : all.slice(0, 1); }
const geT = (f, p) => Object.assign({}, f.tg, {ltv:fLtv(f, p)});
const geFunnel = (f, p) => geChecks(geT(f, p), p.tg.share, geFact(p, f));

/* цели на карте: видны всем — собственнику, таргетологам, маркетологам */
function goalsBoard(only){ const ps = (only ? [only] : W.projs).filter(p => p.funnels.length); if (!ps.length) return "";
  let R = 0, B = 0, P = 0; const rows = [];
  /* фильтр «Сьогодні» по воронке — только она (на других экранах фильтра нет) */
  ps.forEach(p => p.funnels.filter(f => W.ctab !== "today" || typeof tfF !== "function" || tfF(f)).forEach(f => { const t = fT(f, p), fa = geFact(p, f), cs = geFunnel(f, p), lv = geLv(cs), top = cs.find(c => c[0] === lv) || cs[0];
    R += t.rev; B += t.bud; P += t.pay;
    rows.push(`<tr class="ge--${lv}" data-act="geOpen" data-p="${p.id}" data-f="${f.id}" tabindex="0"><td><b>${esc(f.name)}</b>${ps.length > 1 ? `<small class="sub">${esc(p.name)}</small>` : ""}</td><td class="n mono">${num(t.pay)}</td><td class="n mono">${money(t.bud)}</td><td class="n mono">${dec(t.cap)} $${t.k > 1 ? `<small class="sub"> / ${dec(t.cap1)} $</small>` : ""}</td><td class="n mono">${fa ? (dec(fa.cpl) + " $") : "—"}</td><td class="n mono">${dec(geRoas(p.tg.share), 1)}</td><td>${pill(lv, top[1])}</td></tr>`); }));
  return `<div class="panel ge"><div class="row sp"><span class="tag">${L("Цілі на місяць","Цели на месяц")}</span>${hint(L("План — з цілей проєктів і воронок, факт — за період карти, якщо лідів не менше ","План — из целей проектов и воронок, факт — за период карты, если лидов не меньше ") + geTh().minLeads + L(". Після «/» — гранична ціна лише за першою оплатою; формула — у цілях проєкту.",". После «/» — потолок только по первой оплате; формула — в целях проекта."), "wide")}</div>
    <div class="kpis kpis--4">${[[L("Виручка","Выручка"), money(R)], [L("Бюджет","Бюджет"), money(B)], [L("Оплат","Оплат"), num(P)], [L("Окупність","Окупаемость"), B ? dec(R / B, 1) : "—"]].map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
    ${more("gb", L("за воронками","по воронкам") + " · " + rows.length, `<div class="tw tw--in"><table><thead><tr><th>${L("Воронка","Воронка")}</th><th class="n">${L("Оплат","Оплат")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${L("Гранична ціна","Потолок лида")}</th><th class="n">${L("Факт ліда","Факт лида")}</th><th class="n">ROAS</th><th></th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`)}</div>`; }
Object.assign(ACT, { geOpen(d){ W.cur = d.p; W.fun = d.f; W.ftab = "set"; save(); } });
