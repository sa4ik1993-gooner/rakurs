/* Декомпозиция воронки: «откуда деньги с одного лида».
   Каждая строка — путь к деньгам (покупка на вебинаре, акция после вебинара, продажи не пришедшим, допродажи…):
   цепочка шагов с процентами и чек. Выручка с лида = Σ (произведение % шагов × чек).
   Потолок цены лида = выручка с лида × доля маркетинга проекта. Им пользуются fT (цели, пульс, карта, задачи, Хиро).
   Пока таблицу не трогали, строка 1 берётся из старых целей воронки (лид→бронь, бронь→оплата, чек) — расчёт не меняется.
   Подключается после ws.js? Нет — до ws.js: ws.js вызывает decRows/decView. */
const decPct = v => { const n = +String(v == null ? "" : v).replace(",", "."); return isFinite(n) && n > 0 ? n : 0; };
const decConv = r => { const f = (r.s || []).filter(s => decPct(s[1])); return f.length ? f.reduce((a, s) => a * decPct(s[1]) / 100, 1) : 0; };
const decRows = f => f && f.dec && Array.isArray(f.dec.rows) && f.dec.rows.length ? f.dec.rows : null;
/* строки по умолчанию — из старых целей воронки, чтобы ничего не поменялось, пока человек не правит */
const decBase = f => [{n:L("Купили на вебінарі","Купили на вебинаре"), s:[[L("Лід → бронювання","Лид → бронь"), f.tg.l2b], [L("Бронювання → оплата","Бронь → оплата"), f.tg.b2p]], c:f.tg.check}];
const decOf = f => { if (decRows(f)) decLtv(f); return decRows(f) || decBase(f); };
/* шаблоны: проценты новых строк пустые — их заполняет человек или Хиро из продаж, выдуманных цифр нет */
const DEC_TPL = () => ({
  web: [L("Вебінар","Вебинар"), f => [decBase(f)[0],
    {n:L("Акція після вебінару","Акция после вебинара"), s:[[L("Були на вебінарі, не купили","Были на вебинаре, не купили"), ""], [L("Купили на акції","Купили на акции"), ""]], c:""},
    {n:L("Продажі тим, хто не прийшов","Продажи тем, кто не пришел"), s:[[L("Не прийшли на вебінар","Не пришли на вебинар"), ""], [L("Купили з розсилки чи дзвінка","Купили из рассылки или звонка"), ""]], c:""},
    {n:L("Допродажі покупцям","Допродажи купившим"), s:[[L("Купили будь-що","Купили что-нибудь"), ""], [L("Докупили","Докупили"), ""]], c:""}]],
  form: [L("Лід-форма → дзвінок","Лид-форма → звонок"), f => [{n:L("Продаж після дзвінка","Продажа после звонка"), s:[[L("Лід → додзвонилися","Лид → дозвонились"), ""], [L("Дзвінок → оплата","Звонок → оплата"), ""]], c:f.tg.check}]],
  cons: [L("Консультація","Консультация"), f => [{n:L("Продаж на консультації","Продажа на консультации"), s:[[L("Лід → записались","Лид → записались"), ""], [L("Прийшли","Пришли"), ""], [L("Купили","Купили"), ""]], c:f.tg.check}]],
  shop: [L("Магазин","Магазин"), f => [{n:L("Замовлення","Заказ"), s:[[L("Лід → замовлення","Лид → заказ"), ""]], c:f.tg.check}, {n:L("Повторні покупки","Повторные покупки"), s:[[L("Купили ще раз","Купили еще раз"), ""]], c:""}]],
});
/* итог по таблице. r.on === false — путь не считается (галочка); f.dec.fee — комиссии, % от выручки (эквайринг, рассрочка) */
const decOn = r => r && r.on !== false;
const decFee = f => f && f.dec && f.dec.feeOn !== false ? Math.min(90, decPct(f.dec.fee)) : 0;
function decCalc(f, p){ const rows = decOf(f), share = (+p.tg.share || 0) / 100;
  const per = rows.map(r => decOn(r) ? decConv(r) * decPct(r.c) : 0), gross = per.reduce((a, b) => a + b, 0), fee = decFee(f), rpl = gross * (1 - fee / 100);
  const r0 = rows[0] || {s:[]};
  return {rows, per, gross, fee, rpl, share, cap:rpl * share, conv1:decConv(r0), c1:decPct(r0.c) * (1 - fee / 100)}; }
/* первая правка — таблица становится своей у воронки; строка 1 держит старые поля целей в согласии */
function decOwn(f){ if (!decRows(f)) f.dec = {rows:JSON.parse(JSON.stringify(decBase(f)))}; decLtv(f); return f.dec.rows; }
/* Допродажи из целей воронки (tg.ltv, % к первой оплате) — отдельной строкой таблицы, иначе своя таблица их теряла (26.11: 3,60 $ вместо 5,04 $) */
function decLtv(f){ const d = f && f.dec; if (!d || !Array.isArray(d.rows) || d.ltvDone) return; d.ltvDone = 1; const v = decPct((f.tg || {}).ltv), r0 = d.rows[0]; if (!v || !r0) return;
  d.rows.push({k:"up", n:L("Допродажі покупцям","Допродажи купившим"), s:[[L("Купили (рядок 1)","Купили (строка 1)"), Math.round(decConv(r0) * 10000) / 100], [L("Докупили","Докупили"), v]], c:decPct(r0.c) || ""}); }
function decSync(f){ const r = (decRows(f) || [])[0]; if (!r) return; if (decPct(r.c)) f.tg.check = decPct(r.c); if (r.s.length >= 2) { if (decPct(r.s[0][1])) f.tg.l2b = decPct(r.s[0][1]); if (decPct(r.s[1][1])) f.tg.b2p = decPct(r.s[1][1]); } }
/* пути, которые можно добавить: проценты пустые — их вписывает человек или Хиро из продаж, выдуманных цифр нет */
const DEC_ADD = f => [
  ["web", L("Купили на вебінарі без броні","Купили на вебинаре без брони"), [[L("Прийшли на вебінар","Пришли на вебинар"), ""], [L("Купили без броні","Купили без брони"), ""]], f.tg.check],
  ["noshow", L("Не були на вебінарі","Не были на вебинаре"), [[L("Не прийшли","Не пришли"), ""], [L("Купили з розсилки чи дзвінка","Купили из рассылки или звонка"), ""]], f.tg.check],
  ["promo", L("Акція","Акция"), [[L("Отримали акцію","Получили акцию"), ""], [L("Купили на акції","Купили на акции"), ""]], ""],
  ["push", L("Дожимна воронка","Дожимная воронка"), [[L("Потрапили в дожим","Попали в дожим"), ""], [L("Купили","Купили"), ""]], f.tg.check],
  ["up", L("Допродажі","Допродажи"), [[L("Купили (рядок 1)","Купили (строка 1)"), ""], [L("Докупили","Докупили"), ""]], ""],
  ["own", L("Свій шлях","Свой путь"), [["", ""]], ""]];
/* сколько людей после каждого шага из 1 000 лидов */
const decPeople = r => { let cur = 1000; return (r.s || []).map(s => { if (decPct(s[1])) cur = cur * decPct(s[1]) / 100; return decPct(s[1]) ? cur : null; }); };
const decN = v => v == null ? "—" : v >= 10 ? num(Math.round(v)) : dec(v, 1);
const decMoney = v => (v >= 100 ? num(Math.round(v)) : dec(v)) + " $";

function decView(f, p){ if (decRows(f)) decLtv(f); const x = decCalc(f, p), own = !!decRows(f), d = f.dec || {};
  const stepH = (r, i) => { const pp = decPeople(r); return r.s.map((s, j) => `<tr class="dect__st${decOn(r) ? "" : " is-off"}"><td></td>
      <td><span class="dect__in"><i class="decar">→</i><input class="decsn" data-dec="${i}:s:${j}:0" value="${esc(s[0])}" placeholder="${L("що сталося","что произошло")}" aria-label="${L("Крок","Шаг")}"></span></td>
      <td class="n"><span class="dect__pc"><input class="tin" data-dec="${i}:s:${j}:1" value="${esc(String(s[1] == null ? "" : s[1]))}" inputmode="decimal" placeholder="—" aria-label="${L("Конверсія, %","Конверсия, %")}"> %</span></td>
      <td class="n num" id="dec-p${i}-${j}">${decN(pp[j])}</td><td></td><td></td>
      <td>${r.s.length > 1 ? `<button type="button" class="decx" data-act="decDelStep" data-i="${i}" data-j="${j}" aria-label="${L("Прибрати крок","Убрать шаг")}">${ico("close")}</button>` : ""}</td></tr>`).join(""); };
  const rowH = (r, i) => `<tr class="dect__path${decOn(r) ? "" : " is-off"}">
      <td><input type="checkbox" data-dec="${i}:on"${decOn(r) ? " checked" : ""} aria-label="${L("Рахувати цей шлях","Считать этот путь")}"></td>
      <td><span class="dect__in"><span class="decno">${i + 1}</span><input class="decn" data-dec="${i}:n" value="${esc(r.n)}" placeholder="${L("Як лід приносить гроші","Как лид приносит деньги")}" aria-label="${L("Назва шляху","Название пути")}"></span></td>
      <td></td><td></td>
      <td class="n"><span class="dect__pc"><input class="tin" data-dec="${i}:c" value="${esc(String(r.c == null ? "" : r.c))}" inputmode="decimal" placeholder="0" aria-label="${L("Чек, $","Чек, $")}"> $</span></td>
      <td class="n num" id="dec-v${i}"><b>${decOn(r) && x.per[i] ? decMoney(x.per[i] * 1000) : "—"}</b></td>
      <td>${i ? `<button type="button" class="decx" data-act="decDelRow" data-i="${i}" aria-label="${L("Прибрати шлях","Убрать путь")}">${ico("trash")}</button>` : ""}</td></tr>
    ${stepH(r, i)}<tr class="dect__add"><td></td><td colspan="6"><button type="button" class="btn btn--sm btn--text" data-act="decAddStep" data-i="${i}">${ico("plus")} ${L("крок","шаг")}</button></td></tr>`;
  const feeH = `<tr class="dect__path dect__fee${d.feeOn === false ? " is-off" : ""}"><td><input type="checkbox" data-dec="fee:on"${d.feeOn === false ? "" : " checked"} aria-label="${L("Рахувати комісії","Считать комиссии")}"></td>
      <td><b>${L("Комісії","Комиссии")}</b> ${hint(L("Еквайринг, розстрочка, повернення — відсоток від усієї виручки.","Эквайринг, рассрочка, возвраты — процент от всей выручки."))}</td>
      <td class="n"><span class="dect__pc">− <input class="tin" data-dec="fee:v" value="${esc(String(d.fee == null ? "" : d.fee))}" inputmode="decimal" placeholder="0" aria-label="${L("Комісії, %","Комиссии, %")}"> %</span></td><td></td><td></td>
      <td class="n num" id="dec-fee">${x.fee && x.gross ? "− " + decMoney(x.gross * 1000 * x.fee / 100) : "—"}</td><td></td></tr>`;
  return `<div class="panel decp"><div class="row sp"><span class="tag">${L("Звідки гроші з 1 000 лідів","Откуда деньги с 1 000 лидов")}</span>${hint(L("Кожен рядок — шлях до грошей. Відсоток кроку — від попереднього кроку, перший — від лідів. Галочка — рахувати шлях чи ні. З підсумку береться ціль ліда для автопілота.","Каждая строка — путь к деньгам. Процент шага — от предыдущего шага, первый — от лидов. Галочка — считать путь или нет. Из итога берется цель лида для автопилота."), "wide")}</div>
    <div class="tw dect"><table class="tnar"><thead><tr><th class="dect__ck"></th><th>${L("Етап","Этап")}</th><th class="n">${L("Конверсія","Конверсия")}</th><th class="n">${L("Людей","Людей")}</th><th class="n">${L("Чек","Чек")}</th><th class="n">${L("Виручка","Выручка")}</th><th class="dect__x"></th></tr></thead>
    <tbody><tr class="dect__lead"><td></td><td><b>${L("Ліди","Лиды")}</b></td><td></td><td class="n num">1 000</td><td></td><td></td><td></td></tr>
    ${x.rows.map(rowH).join("")}${feeH}</tbody></table></div>
    <div class="dect__more"><span class="sub">${L("Додати шлях:","Добавить путь:")}</span>${DEC_ADD(f).map(a => `<button type="button" class="chip" data-act="decAddRow" data-v="${a[0]}">${ico("plus")} ${a[1]}</button>`).join("")}</div>
    <div class="decsum" id="dec-sum">${decSumH(x, p, f)}</div></div>`; }
/* итог: выручка → цель лида; факт цены лида → окупаемость трафика в целом (все пути, а не только первая продажа) */
function decSumH(x, p, f){ const fact = f && typeof geFact === "function" ? geFact(p, f) : null, roas = fact && fact.cpl > 0 && x.rpl ? x.rpl / fact.cpl : 0, pt = f && typeof decPilot === "function" ? decPilot(f, p) : null;
  const k = (t, v, cls, h) => `<div${cls ? ` class="${cls}"` : ""}><dt>${t}${h ? " " + hint(h) : ""}</dt><dd class="num">${v}</dd></div>`;
  return `<dl class="decsum__k">${k(L("Виручка з 1 000 лідів","Выручка с 1 000 лидов"), x.rpl ? decMoney(x.rpl * 1000) : "—")}${k(L("З 1 ліда","С 1 лида"), x.rpl ? dec(x.rpl) + " $" : "—")}
    ${k(L("На рекламу","На рекламу"), (+p.tg.share || 0) + "%", "", L("З цілей проєкту: яку частку виручки готові віддати на рекламу.","Из целей проекта: какую долю выручки готовы отдать на рекламу."))}
    ${k(L("Ціль ліда","Цель лида"), x.cap ? dec(x.cap) + " $" : "—", "decsum__cap")}
    ${fact ? k(L("Лід зараз","Лид сейчас"), dec(fact.cpl) + " $", "", fact.label) : ""}
    ${roas ? k(L("Окупність трафіку","Окупаемость трафика"), "×" + dec(roas, 1), roas >= 1 ? "decsum__ok" : "decsum__bad", L("Виручка з ліда за всіма шляхами ÷ ціна ліда зараз. Менше ×1 — реклама дорожча за гроші, які приносить.","Выручка с лида по всем путям ÷ цена лида сейчас. Меньше ×1 — реклама дороже денег, которые приносит.")) : ""}</dl>
    ${pt ? `<p class="sub decsum__pl">${pt}</p>` : ""}`; }
/* живой пересчёт без перерисовки экрана — фокус в поле не теряется */
function decLive(f, p){ const x = decCalc(f, p);
  x.rows.forEach((r, i) => { const v = $("dec-v" + i); if (v) v.innerHTML = "<b>" + (decOn(r) && x.per[i] ? decMoney(x.per[i] * 1000) : "—") + "</b>"; decPeople(r).forEach((n, j) => { const el = $("dec-p" + i + "-" + j); if (el) el.textContent = decN(n); }); });
  const fe = $("dec-fee"); if (fe) fe.textContent = x.fee && x.gross ? "− " + decMoney(x.gross * 1000 * x.fee / 100) : "—";
  const sm = $("dec-sum"); if (sm) sm.innerHTML = decSumH(x, p, f); const c = $("w-calc"); if (c) c.innerHTML = calcF(f, p); decPilotPush(f, p); }
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || t.dataset.dec == null || !own()) return; const f = F(), p = P(); if (!f || !p) return;
  const rows = decOwn(f), k = t.dataset.dec.split(":");
  if (k[0] === "fee") { if (k[1] === "on") { f.dec.feeOn = t.checked; t.closest("tr").classList.toggle("is-off", !t.checked); } else f.dec.fee = t.value; save(); decLive(f, p); return; }
  const r = rows[+k[0]]; if (!r) return;
  if (k[1] === "on") { r.on = t.checked; const tr = t.closest("tr"); for (let el = tr; el && !(el !== tr && el.classList.contains("dect__path")); el = el.nextElementSibling) el.classList.toggle("is-off", !t.checked); }
  else if (k[1] === "n") r.n = t.value; else if (k[1] === "c") r.c = t.value; else if (k[1] === "s") { const s = r.s[+k[2]]; if (s) s[+k[3]] = t.value; }
  decSync(f); save(); decLive(f, p); });
Object.assign(ACT, {
  decTpl(d){ const f = F(); if (!f) return false; const t = DEC_TPL()[d.v]; if (!t) return false; f.dec = {tpl:d.v, rows:JSON.parse(JSON.stringify(t[1](f)))}; decSync(f); save(); },
  decAddRow(d){ const f = F(), p = P(); if (!f) return false; const rows = decOwn(f), a = DEC_ADD(f).find(z => z[0] === d.v) || DEC_ADD(f).slice(-1)[0], s = JSON.parse(JSON.stringify(a[2]));
    if (a[0] === "up" && rows[0]) s[0][1] = Math.round(decConv(rows[0]) * 10000) / 100;
    rows.push({k:a[0], n:a[0] === "own" ? "" : a[1], s, c:a[3] || ""}); save(); if (p) decPilotPush(f, p); },
  decDelRow(d){ const f = F(), p = P(); if (!f) return false; const rows = decOwn(f); if (+d.i > 0) rows.splice(+d.i, 1); save(); if (p) decPilotPush(f, p); },
  decAddStep(d){ const f = F(); if (!f) return false; const r = decOwn(f)[+d.i]; if (r) r.s.push(["", ""]); save(); },
  decDelStep(d){ const f = F(); if (!f) return false; const r = decOwn(f)[+d.i]; if (r && r.s.length > 1) r.s.splice(+d.j, 1); decSync(f); save(); const p = P(); if (p) decPilotPush(f, p); },
});

/* Цель лида автопилота = итог декомпозиции (Дмитрий, 26.11: «должно задаваться автоматически из декомпозиции»).
   f.dec.autoT: true — цель в автопилоте обновляется сама при правке таблицы; false — человек поставил свою в автопилоте.
   Пока не решено (старые воронки): если в автопилоте уже стоит другое число — считаем его ручным, ничего молча не меняем. */
const decT = (f, p) => Math.round((fT(f, p).cap || 0) * 100) / 100;
function decZone(f, p){ const st = typeof PL !== "undefined" ? PL.st[p.id] : null, zs = st && st.ok && st.settings && Array.isArray(st.settings.zones) ? st.settings.zones : null; return zs ? zs.find(z => z.fid === f.id) || null : null; }
function decAuto(f, p){ const d = f.dec || {}; if (d.autoT != null) return !!d.autoT; const z = decZone(f, p); return !z || Math.abs((+z.target_cpl || 0) - decT(f, p)) < 0.01; }
function decPilot(f, p){ const z = decZone(f, p); if (!z) return ""; const T = decT(f, p), cur = +z.target_cpl || 0;
  if (decAuto(f, p)) return L("Автопілот бере ціль ліда звідси: ","Автопилот берет цель лида отсюда: ") + dec(T) + " $.";
  return L("В автопілоті ціль поставлено вручну: ","В автопилоте цель поставлена вручную: ") + dec(cur) + ` $. <button type="button" class="btn btn--sm btn--text" data-act="decUseT" data-p="${p.id}" data-f="${f.id}">${L("Брати звідси: ","Брать отсюда: ") + dec(T)} $</button>`; }
let DEC_PT = 0;
function decPilotPush(f, p){ clearTimeout(DEC_PT); DEC_PT = setTimeout(() => {
  const st = typeof PL !== "undefined" ? PL.st[p.id] : null, z = decZone(f, p), T = decT(f, p); if (!st || !st.admin || !z || !(T > 0) || !decAuto(f, p) || Math.abs((+z.target_cpl || 0) - T) < 0.01) return;
  if (f.dec) f.dec.autoT = true; save();
  if (!PL.edit[p.id]) PL.edit[p.id] = plDefaults(p, st.settings); const ez = (PL.edit[p.id].zones || []).find(q => q.fid === f.id); if (ez) ez.target_cpl = T;
  ACT.plSave({p:p.id}).then(() => toast(L("Ціль ліда в автопілоті: ","Цель лида в автопилоте: ") + dec(T) + L(" $ — з декомпозиції"," $ — из декомпозиции"))); }, 1500); }
ACT.decUseT = d => { const p = (W.projs || []).find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return false; decOwn(f); f.dec.autoT = true; save(); decPilotPush(f, p); };
