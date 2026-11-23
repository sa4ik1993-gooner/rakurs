/* Декомпозиция воронки: «откуда деньги с одного лида».
   Каждая строка — путь к деньгам (покупка на вебинаре, акция после вебинара, продажи не пришедшим, допродажи…):
   цепочка шагов с процентами и чек. Выручка с лида = Σ (произведение % шагов × чек).
   Потолок цены лида = выручка с лида × доля маркетинга проекта. Им пользуются fT (цели, пульс, карта, задачи, Хиро).
   Пока таблицу не трогали, строка 1 берётся из старых целей воронки (лид→бронь, бронь→оплата, чек) — расчёт не меняется.
   Подключается после ws.js? Нет — до ws.js: ws.js вызывает decRows/decView. */
const decPct = v => { const n = +String(v == null ? "" : v).replace(",", "."); return isFinite(n) && n > 0 ? n : 0; };
const decConv = r => r.s.length ? r.s.reduce((a, s) => a * decPct(s[1]) / 100, 1) : 0;
const decRows = f => f && f.dec && Array.isArray(f.dec.rows) && f.dec.rows.length ? f.dec.rows : null;
/* строки по умолчанию — из старых целей воронки, чтобы ничего не поменялось, пока человек не правит */
const decBase = f => [{n:L("Купили на вебінарі","Купили на вебинаре"), s:[[L("Лід → бронь","Лид → бронь"), f.tg.l2b], [L("Бронь → оплата","Бронь → оплата"), f.tg.b2p]], c:f.tg.check}];
const decOf = f => decRows(f) || decBase(f);
/* шаблоны: проценты новых строк пустые — их заполняет человек или Хиро из продаж, выдуманных цифр нет */
const DEC_TPL = () => ({
  web: [L("Вебінар","Вебинар"), f => [decBase(f)[0],
    {n:L("Акція після вебінару","Акция после вебинара"), s:[[L("Були на вебінарі, не купили","Были на вебинаре, не купили"), ""], [L("Купили на акції","Купили на акции"), ""]], c:""},
    {n:L("Продажі тим, хто не прийшов","Продажи тем, кто не пришёл"), s:[[L("Не прийшли на вебінар","Не пришли на вебинар"), ""], [L("Купили з розсилки чи дзвінка","Купили из рассылки или звонка"), ""]], c:""},
    {n:L("Допродажі купившим","Допродажи купившим"), s:[[L("Купили будь-що","Купили что-либо"), ""], [L("Докупили","Докупили"), ""]], c:""}]],
  form: [L("Лід-форма → дзвінок","Лид-форма → звонок"), f => [{n:L("Продаж після дзвінка","Продажа после звонка"), s:[[L("Лід → дозвонились","Лид → дозвонились"), ""], [L("Дзвінок → оплата","Звонок → оплата"), ""]], c:f.tg.check}]],
  cons: [L("Консультація","Консультация"), f => [{n:L("Продаж на консультації","Продажа на консультации"), s:[[L("Лід → записались","Лид → записались"), ""], [L("Прийшли","Пришли"), ""], [L("Купили","Купили"), ""]], c:f.tg.check}]],
  shop: [L("Магазин","Магазин"), f => [{n:L("Замовлення","Заказ"), s:[[L("Лід → замовлення","Лид → заказ"), ""]], c:f.tg.check}, {n:L("Повторні покупки","Повторные покупки"), s:[[L("Купили ще раз","Купили ещё раз"), ""]], c:""}]],
});
/* итог по таблице */
function decCalc(f, p){ const rows = decOf(f), share = (+p.tg.share || 0) / 100;
  const per = rows.map(r => decConv(r) * decPct(r.c)), rpl = per.reduce((a, b) => a + b, 0);
  return {rows, per, rpl, share, cap:rpl * share, conv1:decConv(rows[0] || {s:[]}), c1:decPct((rows[0] || {}).c)}; }
/* первый правка — таблица становится своей у воронки; строка 1 держит старые поля целей в согласии */
function decOwn(f){ if (!decRows(f)) f.dec = {rows:JSON.parse(JSON.stringify(decBase(f)))}; return f.dec.rows; }
function decSync(f){ const r = (decRows(f) || [])[0]; if (!r) return; if (decPct(r.c)) f.tg.check = decPct(r.c); if (r.s.length === 2) { if (decPct(r.s[0][1])) f.tg.l2b = decPct(r.s[0][1]); if (decPct(r.s[1][1])) f.tg.b2p = decPct(r.s[1][1]); } }

function decView(f, p){ const x = decCalc(f, p), m = v => (v >= 100 ? num(v) : dec(v)) + " $", own = !!decRows(f);
  const rowH = (r, i) => `<div class="decr">
    <div class="decr__h"><input class="decn" data-dec="${i}:n" value="${esc(r.n)}" aria-label="${L("Назва шляху","Название пути")}">
      <span class="decr__c"><label>${L("Чек","Чек")}<input class="tin" data-dec="${i}:c" value="${esc(String(r.c == null ? "" : r.c))}" inputmode="decimal" placeholder="0"> $</label></span>
      ${i ? `<button type="button" class="x x--sm x--del" data-act="decDelRow" data-i="${i}" aria-label="${L("Прибрати шлях","Убрать путь")}" title="${L("Прибрати шлях","Убрать путь")}">${ico("trash")}</button>` : ""}</div>
    <div class="decs">${r.s.map((s, j) => `<span class="decst"><input class="decsn" data-dec="${i}:s:${j}:0" value="${esc(s[0])}" aria-label="${L("Крок","Шаг")}"><input class="tin" data-dec="${i}:s:${j}:1" value="${esc(String(s[1] == null ? "" : s[1]))}" inputmode="decimal" placeholder="—"> %${r.s.length > 1 ? `<button type="button" class="decx" data-act="decDelStep" data-i="${i}" data-j="${j}" aria-label="${L("Прибрати крок","Убрать шаг")}">${ico("close")}</button>` : ""}</span>${j < r.s.length - 1 ? '<i class="decar">→</i>' : ""}`).join("")}
      <button type="button" class="btn btn--sm btn--text" data-act="decAddStep" data-i="${i}">${ico("plus")} ${L("крок","шаг")}</button></div>
    <div class="decr__r" id="dec-r${i}">${decRowRes(x, i)}</div></div>`;
  return `<div class="panel decp"><div class="row sp"><span class="tag">${L("Звідки гроші з одного ліда","Откуда деньги с одного лида")}</span>
      <span class="seg" role="group" aria-label="${L("Шаблон","Шаблон")}">${Object.entries(DEC_TPL()).map(([k, t]) => `<button type="button" data-act="decTpl" data-v="${k}" aria-pressed="${own && f.dec.tpl === k}">${t[0]}</button>`).join("")}</span></div>
    <p class="sub">${L("Кожен рядок — шлях, яким лід приносить гроші: покупка на вебінарі, акція після, продажі тим, хто не прийшов, допродажі. Відсотки — від усіх лідів, крок за кроком.","Каждая строка — путь, которым лид приносит деньги: покупка на вебинаре, акция после, продажи тем, кто не пришёл, допродажи. Проценты — от всех лидов, шаг за шагом.")}</p>
    ${x.rows.map(rowH).join("")}
    <button type="button" class="btn btn--sm" data-act="decAddRow">${ico("plus")} ${L("Додати шлях до грошей","Добавить путь к деньгам")}</button>
    <div class="decsum" id="dec-sum">${decSumH(x, p)}</div></div>`; }
const decRowRes = (x, i) => { const c = decConv(x.rows[i]); return `<span class="sub">${L("з ліда","с лида")} ${c ? dec(c * 100, c * 100 < 1 ? 2 : 1) + "%" : "—"}</span><b class="num">${x.per[i] ? dec(x.per[i]) + " $" : "—"}</b>`; };
const decSumH = (x, p) => `<dl class="decsum__k"><div><dt>${L("Виручка з 1 ліда","Выручка с 1 лида")}</dt><dd class="num">${dec(x.rpl)} $</dd></div>
  <div><dt>${L("Частка на рекламу","Доля на рекламу")} ${hint(L("Береться з цілей проєкту: скільки виручки готові віддати на рекламу.","Берётся из целей проекта: сколько выручки готовы отдать на рекламу."))}</dt><dd class="num">${+p.tg.share || 0}%</dd></div>
  <div class="decsum__cap"><dt>${L("Стеля ціни ліда","Потолок цены лида")}</dt><dd class="num">${x.cap ? dec(x.cap) + " $" : "—"}</dd></div></dl>`;
/* живой пересчёт без перерисовки экрана — фокус в поле не теряется */
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || t.dataset.dec == null || !own()) return; const f = F(), p = P(); if (!f || !p) return;
  const rows = decOwn(f), k = t.dataset.dec.split(":"), r = rows[+k[0]]; if (!r) return;
  if (k[1] === "n") r.n = t.value; else if (k[1] === "c") r.c = t.value; else if (k[1] === "s") { const s = r.s[+k[2]]; if (s) s[+k[3]] = k[3] === "1" ? t.value : t.value; }
  decSync(f); save(); const x = decCalc(f, p); x.rows.forEach((_, i) => { const el = $("dec-r" + i); if (el) el.innerHTML = decRowRes(x, i); });
  const sm = $("dec-sum"); if (sm) sm.innerHTML = decSumH(x, p); const c = $("w-calc"); if (c) c.innerHTML = calcF(f, p); });
Object.assign(ACT, {
  decTpl(d){ const f = F(); if (!f) return false; const t = DEC_TPL()[d.v]; if (!t) return false; f.dec = {tpl:d.v, rows:JSON.parse(JSON.stringify(t[1](f)))}; decSync(f); save(); },
  decAddRow(){ const f = F(); if (!f) return false; decOwn(f).push({n:L("Новий шлях","Новый путь"), s:[[L("Крок","Шаг"), ""]], c:""}); save(); },
  decDelRow(d){ const f = F(); if (!f) return false; const rows = decOwn(f); if (+d.i > 0) rows.splice(+d.i, 1); save(); },
  decAddStep(d){ const f = F(); if (!f) return false; const r = decOwn(f)[+d.i]; if (r) r.s.push([L("Крок","Шаг"), ""]); save(); },
  decDelStep(d){ const f = F(); if (!f) return false; const r = decOwn(f)[+d.i]; if (r && r.s.length > 1) r.s.splice(+d.j, 1); decSync(f); save(); },
});
