/* Продажи: загрузка файла с бронями или оплатами.
   Файл разбирается здесь, в браузере. Человек указывает, в какой колонке дата, сумма и метки;
   на сервер уходят только эти поля. Имена, телефоны и почты из файла компьютер не покидают.
   Подключается перед ws.js. */
const SL = {};   /* по проекту: {kind, name, rows, hi, map, flt, cur, busy, stat, done} */
const slOf = p => (SL[p.id] = SL[p.id] || {kind:"booking", name:"", rows:null, hi:0, map:{}, flt:{col:"", has:""}, cur:"UAH", busy:false, done:""});
const SL_FIELDS = () => [["d", L("Дата події","Дата события"), 1, /^дата$|date|дата брон|дата оплат|^дата /i], ["w", L("Дата вебінару","Дата вебинара"), 0, /вебінар|вебинар|webinar/i], ["a", L("Сума","Сумма"), 0, /сум|amount|оплат|price|варт/i],
  ["s", L("Джерело (utm_source)","Источник (utm_source)"), 0, /source|джерел|источник/i], ["k", L("Кампанія (utm_campaign)","Кампания (utm_campaign)"), 0, /campaign|кампан/i], ["n", L("Креатив (utm_content)","Креатив (utm_content)"), 0, /content|креатив/i], ["t", "utm_term", 0, /term|adset|група|группа/i]];
const SL_KINDS = () => [["booking", L("Броні","Брони")], ["payment", L("Оплати","Оплаты")], ["lead", L("Ліди","Лиды")]];
const slCol = i => { let s = "", n = i; do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
/* разбор CSV: кавычки, переносы внутри ячейки, разделитель , ; или табуляция */
function csvParse(text){
  const nl = text.indexOf("\n"), first = nl < 0 ? text : text.slice(0, nl), delim = [",", ";", "\t"].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === delim) { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c; }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}
/* дата в виде ГГГГ-ММ-ДД: принимает 05.09.2026, 5/9/26, 2026-09-05 и порядковый номер дня из таблицы */
function slDate(v){ const t = String(v == null ? "" : v).trim(); if (!t) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/.exec(t); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; if (+m[2] > 12 || +m[1] > 31 || +m[2] < 1 || +m[1] < 1) return ""; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  if (/^\d{5}(\.\d+)?$/.test(t) && +t > 30000 && +t < 80000) return new Date(Math.round((+t - 25569) * 86400000)).toISOString().slice(0, 10);
  return ""; }
/* сумма: «12 345,67», «12,345.67», «₴1 200» */
function slNum(v){ let t = String(v == null ? "" : v).replace(/[^\d.,-]/g, ""); if (!t) return 0;
  const c = t.lastIndexOf(","), d = t.lastIndexOf("."); if (c > d) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,/g, "");
  const n = parseFloat(t); return isFinite(n) ? n : 0; }
/* события из файла по сопоставлению колонок — только обезличенные поля */
function slEvents(x){ const m = x.map, out = [], col = k => m[k] === "" || m[k] == null ? -1 : +m[k], has = x.flt.has.split(",").map(s => s.trim().toLowerCase()).filter(Boolean), fc = x.flt.col === "" ? -1 : +x.flt.col;
  let skipped = 0, filtered = 0;
  for (let i = x.hi + 1; i < x.rows.length; i++) { const r = x.rows[i], g = k => col(k) < 0 ? "" : String(r[col(k)] == null ? "" : r[col(k)]).trim();
    if (fc >= 0 && has.length && !has.some(h => String(r[fc] || "").toLowerCase().includes(h))) { filtered++; continue; }
    const d = slDate(g("d")); if (!d) { skipped++; continue; }
    out.push({d, w:slDate(g("w")), a:col("a") < 0 ? 0 : slNum(g("a")), c:x.cur, s:g("s"), k:g("k"), n:g("n"), t:g("t")}); }
  return {ev:out, skipped, filtered}; }
function salesPanel(p){
  const x = slOf(p), head = `<span class="tag">${L("Продажі: броні й оплати","Продажи: брони и оплаты")}</span>`;
  if (!CLOUD) return `<div class="panel" id="sales">${head}<p class="sub proto">${L("Прототип: завантаження продажів працює після входу на сервер.","Прототип: загрузка продаж работает после входа на сервер.")}</p></div>`;
  const intro = `<p class="sub">${L("Вивантажте аркуш із бронями або оплатами як CSV і оберіть файл. Він розбирається тут, у браузері: на сервер підуть лише дата, сума й мітки. Імена, телефони й пошти нікуди не передаються.","Выгрузите лист с бронями или оплатами как CSV и выберите файл. Он разбирается здесь, в браузере: на сервер уйдут только дата, сумма и метки. Имена, телефоны и почты никуда не передаются.")}</p>`;
  const rate = `<div class="field"><label for="sl-rate">${L("Курс: гривень за $1","Курс: гривен за $1")}</label><input id="sl-rate" class="tin tin--w" data-slrate="1" inputmode="decimal" value="${(p.fx && p.fx.UAH) || ""}" placeholder="41.5"></div>`;
  if (!x.rows) return `<div class="panel" id="sales">${head}${intro}
      <div class="form"><div class="field"><label>${L("Що в файлі","Что в файле")}</label><div class="opts opts--sm">${SL_KINDS().map(k => `<button type="button" class="opt" data-act="slKind" data-id="${p.id}" data-v="${k[0]}" aria-pressed="${x.kind === k[0]}">${k[1]}</button>`).join("")}</div></div>${rate}</div>
      <div class="row"><label class="btn btn--solid"><input type="file" hidden accept=".csv,.tsv,.txt,text/csv" data-slfile="${p.id}">${L("Обрати файл CSV","Выбрать файл CSV")}</label></div>
      ${x.done ? `<p class="sub">${esc(x.done)}</p>` : ""}</div>`;
  const hdr = x.rows[x.hi] || [], opts = cur => `<option value="">—</option>${hdr.map((h, i) => `<option value="${i}"${String(cur) === String(i) ? " selected" : ""}>${slCol(i)} · ${esc(String(h).slice(0, 40) || "—")}</option>`).join("")}`;
  const r = slEvents(x), ev = r.ev, days = ev.map(e => e.d).sort(), sum = ev.reduce((a, e) => a + e.a, 0), src = {}; ev.forEach(e => { const k = (e.s || "—").toLowerCase(); src[k] = (src[k] || 0) + 1; });
  const top = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => esc(e[0]) + " " + e[1]).join(" · ");
  return `<div class="panel vf" id="sales">${head}<div class="row sp"><b>${esc(x.name)}</b><button class="btn btn--sm" data-act="slDrop" data-id="${p.id}">${L("Інший файл","Другой файл")}</button></div>
    <div class="form"><div class="field"><label for="sl-hi">${L("Рядок із заголовками","Строка с заголовками")}</label><select id="sl-hi" data-slhi="1">${[0, 1, 2, 3, 4].filter(i => i < x.rows.length).map(i => `<option value="${i}"${x.hi === i ? " selected" : ""}>${i + 1}: ${esc((x.rows[i] || []).filter(Boolean).slice(0, 3).join(", ").slice(0, 50))}</option>`).join("")}</select></div>
      <div class="field"><label for="sl-cur">${L("Валюта сум","Валюта сумм")}</label><select id="sl-cur" data-slcur="1">${["UAH", "USD", "EUR", "PLN"].map(c => `<option${x.cur === c ? " selected" : ""}>${c}</option>`).join("")}</select></div>
      ${SL_FIELDS().map(f => `<div class="field"><label for="sl-m-${f[0]}">${f[1]}${f[2] ? " *" : ""}</label><select id="sl-m-${f[0]}" data-slmap="${f[0]}">${opts(x.map[f[0]])}</select></div>`).join("")}
      <div class="field"><label for="sl-fc">${L("Брати тільки рядки, де в колонці","Брать только строки, где в колонке")}</label><select id="sl-fc" data-slfc="1">${opts(x.flt.col)}</select></div>
      <div class="field"><label for="sl-fh">${L("є одне з (через кому)","есть одно из (через запятую)")}</label><input id="sl-fh" data-slfh="1" value="${esc(x.flt.has)}" placeholder="fb, facebook"></div></div>
    <div class="tw"><table><thead><tr>${SL_FIELDS().map(f => `<th>${f[1].replace(/ \(.*/, "")}</th>`).join("")}</tr></thead><tbody>${ev.slice(0, 4).map(e => `<tr>${["d", "w", "a", "s", "k", "n", "t"].map(k => `<td class="mono">${esc(String(e[k] === 0 ? "0" : e[k] || "—").slice(0, 28))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="sub">${ev.length ? `${L("Подій до завантаження: ","Событий к загрузке: ")}<b>${num(ev.length)}</b> · ${days[0]} — ${days[days.length - 1]} · ${L("сума ","сумма ")}${fxM(sum)} ${x.cur}${top ? " · " + L("джерела: ","источники: ") + top : ""}` : L("Оберіть колонку з датою — з’явиться попередній перегляд.","Выберите колонку с датой — появится предпросмотр.")}${r.skipped ? ` · ${L("без дати пропущено: ","без даты пропущено: ")}${r.skipped}` : ""}${r.filtered ? ` · ${L("відсіяно фільтром: ","отсеяно фильтром: ")}${r.filtered}` : ""}</p>
    <p class="sub">${L("Попередні події цього виду за той самий період буде замінено — повторне завантаження не дублює.","Прежние события этого вида за тот же период будут заменены — повторная загрузка не задваивает.")}</p>
    <div class="row"><button class="btn btn--solid" data-act="slSend" data-id="${p.id}"${x.busy || !ev.length ? " disabled" : ""}>${x.busy ? L("Завантажуємо…","Загружаем…") : L("Завантажити ","Загрузить ") + SL_KINDS().find(k => k[0] === x.kind)[1].toLowerCase() + ": " + num(ev.length)}</button></div></div>`;
}
async function slCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"}; try { const f = await sb.functions.invoke("sales", {body}); if (f.error || !f.data) return {ok:false, error:"net", detail:(f.error && f.error.message) || "empty"}; return f.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
Object.assign(ACT, {
  slKind(d){ const p = W.projs.find(q => q.id === d.id); if (p) slOf(p).kind = d.v; },
  slDrop(d){ const p = W.projs.find(q => q.id === d.id); if (p) { const x = slOf(p); x.rows = null; x.name = ""; } },
  slSend(d){ const p = W.projs.find(q => q.id === d.id); if (!p) return false; const x = slOf(p), ev = slEvents(x).ev; if (!ev.length || x.busy) return false;
    const days = ev.map(e => e.d).sort(); x.busy = true;
    p.salesMap = p.salesMap || {}; p.salesMap[x.kind] = {map:Object.assign({}, x.map), hi:x.hi, cur:x.cur, flt:Object.assign({}, x.flt), head:(x.rows[x.hi] || []).slice(0, 60)}; save();
    (async () => { let added = 0, err = "";
      for (let i = 0; i < ev.length && !err; i += 1000) { const r = await slCall({action:"import", project_id:p.id, kind:x.kind, first:i === 0, from:days[0], to:days[days.length - 1], events:ev.slice(i, i + 1000)});
        if (!r.ok) err = /sales_events|does not exist|schema cache/i.test(String(r.detail)) ? L("Таблиці продажів на сервері ще немає: потрібно запустити schema_metrics.sql.","Таблицы продаж на сервере ещё нет: нужно запустить schema_metrics.sql.") : /not found|404|Failed to send/i.test(String(r.detail)) ? L("Функцію sales на сервері ще не створено.","Функция sales на сервере ещё не создана.") : L("Не вдалося завантажити: ","Не удалось загрузить: ") + (r.detail || r.error);
        else added += r.added; }
      x.busy = false;
      if (err) toast(err); else { x.done = L("Завантажено: ","Загружено: ") + SL_KINDS().find(k => k[0] === x.kind)[1].toLowerCase() + " — " + num(added) + ", " + days[0] + " — " + days[days.length - 1]; x.rows = null; x.name = ""; toast(x.done); const fx = fxOf(p); fx.rows = null; fxLoad(p); }
      render(); })(); },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return;
  if (t.dataset.slfile) { const p = W.projs.find(q => q.id === t.dataset.slfile), f = t.files && t.files[0]; if (!p || !f) return; const x = slOf(p), rd = new FileReader();
    rd.onload = () => { const rows = csvParse(String(rd.result || "")); if (rows.length < 2) { toast(L("У файлі немає рядків із даними","В файле нет строк с данными")); return; }
      x.rows = rows; x.name = f.name; x.done = ""; const saved = (p.salesMap || {})[x.kind];
      const same = saved && JSON.stringify(saved.head) === JSON.stringify((rows[saved.hi] || []).slice(0, 60));
      if (same) { x.hi = saved.hi; x.map = Object.assign({}, saved.map); x.cur = saved.cur; x.flt = Object.assign({col:"", has:""}, saved.flt); }
      else { x.hi = 0; x.map = {}; const h = rows[0]; SL_FIELDS().forEach(fl => { const i = h.findIndex((c, n) => fl[3].test(String(c)) && !Object.values(x.map).includes(String(n))); if (i >= 0) x.map[fl[0]] = String(i); }); x.flt = {col:"", has:""}; }
      render(); toast(same ? L("Колонки зіставлено як минулого разу","Колонки сопоставлены как в прошлый раз") : L("Перевірте зіставлення колонок","Проверьте сопоставление колонок")); };
    rd.readAsText(f); return; }
  const p = P(); if (!p) return; const x = slOf(p);
  if (t.dataset.slmap) { x.map[t.dataset.slmap] = t.value; render(); }
  else if (t.dataset.slhi) { x.hi = +t.value; x.map = {}; render(); }
  else if (t.dataset.slcur) { x.cur = t.value; render(); }
  else if (t.dataset.slfc) { x.flt.col = t.value; render(); }
  else if (t.dataset.slfh) { x.flt.has = t.value; render(); }
  else if (t.dataset.slrate) { const n = parseFloat(String(t.value).replace(",", ".")); p.fx = p.fx || {}; if (n > 0) p.fx.UAH = n; else delete p.fx.UAH; save(); render(); } });
