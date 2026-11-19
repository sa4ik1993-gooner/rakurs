/* Опыт проекта: журнал тестов. Одна запись = что проверяли, на ком, в каком канале, что вышло по деньгам и какой вывод.
   Это второй слой знаний: принадлежит проекту, наружу не выходит. Пока записи вносит человек;
   после подключения кабинетов цифры будут подставляться сами. Подключается перед ws.js. */
const EXS = () => [["idea", L("ідея","идея")], ["run", L("іде","идёт")], ["done", L("завершено","завершён")]];
const EXV = () => [["yes", L("спрацювало","сработало"), "good"], ["no", L("не спрацювало","не сработало"), "crit"], ["unk", L("неясно","неясно"), "warn"]];
const exDate = d => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d || ""); return m ? m[3] + "." + m[2] + "." + m[1] : ""; };
function exCalc(e, p){ const f = p.funnels.find(x => x.id === e.f), cap = f ? fT(f, p).cap : pT(p).cap, cpl = e.leads > 0 ? e.spend / e.leads : null;
  return {f, cap, cpl, okCpl: cpl == null ? null : cpl <= cap, l2b: e.leads > 0 ? e.book / e.leads * 100 : null, b2p: e.book > 0 ? e.pay / e.book * 100 : null, roas: e.spend > 0 && f && e.pay > 0 ? e.pay * f.tg.check / e.spend : null}; }
function exRow(e, i, p){ const c = exCalc(e, p), v = EXV().find(x => x[0] === e.v), n = (k, t, u) => `<div class="field"><label for="ex-${i}-${k}">${t}</label><input id="ex-${i}-${k}" class="tin tin--w" data-exp="${i}.${k}" value="${e[k] || ""}" inputmode="decimal" placeholder="0"${u ? ` aria-label="${t}, ${u}"` : ""}></div>`;
  const facts = [c.cpl != null ? `${L("ціна ліда","цена лида")} $${dec(c.cpl)} ${L("за стелі","при потолке")} $${dec(c.cap)}` : "", c.l2b != null ? `${L("лід → бронь","лид → бронь")} ${dec(c.l2b, 1)}%` : "", c.b2p != null ? `${L("бронь → оплата","бронь → оплата")} ${dec(c.b2p, 1)}%` : "", c.roas != null ? `ROAS ${dec(c.roas)}` : ""].filter(Boolean);
  return `<div class="panel exr"><div class="row sp"><span class="row">${v ? pill(v[2], v[1]) : pill("mute", EXS().find(x => x[0] === e.st)[1])}<span class="sub mono">${exDate(e.at)}</span></span>
      <span class="row"><select data-exs="${i}" aria-label="${L("Статус","Статус")}">${EXS().map(x => `<option value="${x[0]}"${x[0] === e.st ? " selected" : ""}>${x[1]}</option>`).join("")}</select>${del("exDel", e.id)}</span></div>
    ${fld("p.exp." + i + ".h", L("Що перевіряємо","Что проверяем"), {w:1, area:2})}
    <p class="sub">${[c.f ? esc(c.f.name) : L("увесь проєкт","весь проект"), e.ch ? chOf(e.ch)[1] : "", e.seg ? esc(e.seg) : L("уся аудиторія","вся аудитория")].filter(Boolean).join(" · ")}</p>
    ${e.st === "idea" ? "" : `<div class="exn">${n("spend", L("Витрати, $","Расход, $"))}${n("leads", L("Лідів","Лидов"))}${n("book", L("Броней","Броней"))}${n("pay", L("Оплат","Оплат"))}</div>
      ${facts.length ? `<p class="exf">${c.okCpl != null ? pill(c.okCpl ? "good" : "crit", c.okCpl ? L("у межах стелі","в пределах потолка") : L("дорожче стелі","дороже потолка")) : ""} <span class="mono">${facts.join(" · ")}</span></p>` : ""}
      <div class="field"><label>${L("Вердикт","Вердикт")}</label><div class="opts opts--sm">${EXV().map(x => `<button type="button" class="opt" data-act="exV" data-i="${i}" data-v="${x[0]}" aria-pressed="${e.v === x[0]}">${x[1]}</button>`).join("")}</div></div>
      ${fld("p.exp." + i + ".out", L("Висновок: що беремо далі","Вывод: что берём дальше"), {w:1, area:2, ph:L("одне речення, яке знадобиться за місяць","одно предложение, которое пригодится через месяц")})}`}</div>`; }
function vExp(p){ const ex = p.exp || [], cnt = k => ex.filter(e => k === "run" ? e.st === "run" : e.v === k).length, lst = k => ex.filter(e => e.v === k && (e.out || e.h));
  const sum = (k, t) => { const r = lst(k); return `<div class="panel"><span class="tag">${t} · ${r.length}</span>${r.length ? `<ul class="exl">${r.map(e => `<li><b>${esc(e.out || e.h)}</b>${e.out ? `<span class="sub">${esc(e.h)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="sub">${L("Поки порожньо.","Пока пусто.")}</p>`}</div>`; };
  return `<p class="sub">${L("Пам’ять проєкту: кожен тест — один запис із гіпотезою, цифрами й висновком. За журналом видно, що вже пробували, і бот читатиме його перед тим, як пропонувати нову гіпотезу. Записи належать проєкту й нікуди не передаються.","Память проекта: каждый тест — одна запись с гипотезой, цифрами и выводом. По журналу видно, что уже пробовали, и бот будет читать его перед тем, как предлагать новую гипотезу. Записи принадлежат проекту и никуда не передаются.")}</p>
    <div class="kpis">${[[L("Усього тестів","Всего тестов"), ex.length], [L("Ідуть зараз","Идут сейчас"), cnt("run")], [L("Спрацювало","Сработало"), cnt("yes")], [L("Не спрацювало","Не сработало"), cnt("no")]].map(k => `<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
    <div class="panel vf"><span class="tag">${L("Новий тест","Новый тест")}</span><div class="form">
      <div class="field w"><label for="ex-h">${L("Гіпотеза: що перевіряємо","Гипотеза: что проверяем")}</label><input id="ex-h" placeholder="${L("ролик із викладачем дасть дешевший лід, ніж відгук учня","ролик с преподавателем даст лид дешевле, чем отзыв ученика")}"></div>
      <div class="field"><label for="ex-f">${L("Воронка","Воронка")}</label><select id="ex-f"><option value="">${L("увесь проєкт","весь проект")}</option>${p.funnels.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="ex-ch">${L("Канал","Канал")}</label><select id="ex-ch"><option value="">—</option>${CHAN().map(c => `<option value="${c[0]}">${c[1]}</option>`).join("")}</select></div>
      <div class="field"><label for="ex-seg">${L("Сегмент ЦА","Сегмент ЦА")}</label><select id="ex-seg"><option value="">${L("уся аудиторія","вся аудитория")}</option>${p.segs.concat(p.funnels.flatMap(f => f.aud.add)).map(s => `<option>${esc(s.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="ex-st">${L("Статус","Статус")}</label><select id="ex-st">${EXS().map(x => `<option value="${x[0]}">${x[1]}</option>`).join("")}</select></div></div>
      <div class="row"><button class="btn btn--solid" data-act="exAdd">${L("Записати тест","Записать тест")}</button></div></div>
    ${ex.length ? `<div class="c2 c2--eq">${sum("yes", L("Що спрацювало","Что сработало"))}${sum("no", L("Що не спрацювало","Что не сработало"))}</div>
      ${ex.map((e, i) => [e, i]).reverse().map(x => exRow(x[0], x[1], p)).join("")}`
    : empty(L("Тестів ще немає","Тестов ещё нет"), L("Запишіть першу гіпотезу — навіть якщо запуск іще попереду.","Запишите первую гипотезу — даже если запуск ещё впереди."))}`; }
Object.assign(ACT, {
  exAdd(){ const p = P(), h = val("ex-h"); if (!need(h, L("Сформулюйте гіпотезу одним реченням","Сформулируйте гипотезу одним предложением"), "ex-h")) return false;
    p.exp = p.exp || []; p.exp.push({id:uid(), at:new Date().toISOString().slice(0, 10), h, f:$("ex-f").value, ch:$("ex-ch").value, seg:$("ex-seg").value, st:$("ex-st").value, spend:0, leads:0, book:0, pay:0, v:"", out:""}); save(); toast(L("Тест записано","Тест записан")); },
  exDel(d){ const p = P(); p.exp = (p.exp || []).filter(e => e.id !== d.id); save(); },
  exV(d){ const e = P().exp[+d.i]; if (!e) return false; e.v = e.v === d.v ? "" : d.v; if (e.v && e.st !== "done") e.st = "done"; save(); },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return; const p = P(); if (!p || !p.exp) return;
  if (t.dataset.exs) { const x = p.exp[+t.dataset.exs]; if (x) { x.st = t.value; if (x.st !== "done") x.v = ""; save(); render(); } return; }
  if (t.dataset.exp) { const [i, k] = t.dataset.exp.split("."), x = p.exp[+i], n = parseFloat(String(t.value).replace(",", ".").replace(/[^\d.]/g, "")); if (x) { x[k] = n >= 0 ? n : 0; save(); render(); } } });
