/* Источники данных и правила: инструмент интегратора.
   Платформе нужны одни и те же события пути продажи — лид, бронь, оплата — с датой, суммой и метками.
   У каждой компании они лежат в своей CRM и своих таблицах. Интегратор описывает источник один раз:
   какие строки считать каким событием и в какой колонке что лежит. Из одной строки может получиться несколько событий.
   Движок правил (srcRun) не знает, откуда пришли строки: сегодня это файл, разобранный в браузере,
   дальше — таблица или CRM, читаемые сервером. Правила при этом остаются те же.
   Личные данные: файл не покидает компьютер, на сервер уходят только дата, сумма и метки.
   Подключается перед ws.js. */
const DSRC = {open:null, rows:{}, raw:{}, file:{}, busy:false, done:"", ctrl:""};
const SL_KINDS = () => [["booking", L("Бронь","Бронь")], ["payment", L("Оплата","Оплата")], ["lead", L("Лід","Лид")]];
const SL_FIELDS = () => [["d", L("Дата події","Дата события"), 1, /^дата$|date|дата брон|дата оплат|^дата |created/i], ["w", L("Дата вебінару","Дата вебинара"), 0, /вебінар|вебинар|webinar/i], ["a", L("Сума","Сумма"), 0, /сум|amount|оплат|price|варт/i],
  ["s", L("Джерело (utm_source)","Источник (utm_source)"), 0, /source|джерел|источник/i], ["k", L("Кампанія (utm_campaign)","Кампания (utm_campaign)"), 0, /campaign|кампан/i], ["n", L("Креатив (utm_content)","Креатив (utm_content)"), 0, /content|креатив/i], ["t", "utm_term", 0, /term|adset|група|группа/i]];
const SRC_OPS = () => [["any", L("кожен рядок","каждая строка")], ["filled", L("колонка заповнена","колонка заполнена")], ["empty", L("колонка порожня","колонка пустая")], ["pos", L("число більше нуля","число больше нуля")], ["has", L("містить одне з","содержит одно из")], ["not", L("не містить жодного з","не содержит ни одного из")]];
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
/* дата в виде ГГГГ-ММ-ДД: принимает 05.09.2026, 5/9/26, 2026-09-05, 2026-09-05T10:00:00+03:00 и порядковый номер дня из таблицы */
function slDate(v){ const t = String(v == null ? "" : v).trim(); if (!t) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/.exec(t); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; if (+m[2] > 12 || +m[1] > 31 || +m[2] < 1 || +m[1] < 1) return ""; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  if (/^\d{5}(\.\d+)?$/.test(t) && +t > 30000 && +t < 80000) return new Date(Math.round((+t - 25569) * 86400000)).toISOString().slice(0, 10);
  return ""; }
/* сумма: «12 345,67», «12,345.67», «₴1 200» */
function slNum(v){ let t = String(v == null ? "" : v).replace(/[^\d.,-]/g, ""); if (!t) return 0;
  const c = t.lastIndexOf(","), d = t.lastIndexOf("."); if (c > d) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,/g, "");
  const n = parseFloat(t); return isFinite(n) ? n : 0; }

/* ---------- строки источника: всё приводится к списку «колонка → значение» ---------- */
/* таблица: имена колонок из строки заголовков; пустые и повторные получают букву колонки */
function srcFromTable(raw, hi){ const seen = {}, head = (raw[hi] || []).map((h, i) => { let n = String(h || "").trim() || slCol(i); if (seen[n]) n += " (" + slCol(i) + ")"; seen[n] = 1; return n; });
  return {head, rows:raw.slice(hi + 1).map(r => { const o = {}; head.forEach((h, i) => { o[h] = r[i] == null ? "" : r[i]; }); return o; })}; }
/* JSON из CRM или выгрузки: ищем список записей, вложенные поля разворачиваем в «сделка.сумма» */
function srcFromJson(data){ let list = Array.isArray(data) ? data : null;
  if (!list && data && typeof data === "object") { const k = Object.keys(data).find(x => Array.isArray(data[x]) && data[x].length && typeof data[x][0] === "object"); if (k) list = data[k]; }
  if (!list) return null;
  const flat = (o, pre, out) => { Object.keys(o || {}).forEach(k => { const v = o[k], key = pre ? pre + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out); else out[key] = Array.isArray(v) ? v.map(x => x && typeof x === "object" ? (x.name || x.title || x.value || x.id || "") : x).join(", ") : v == null ? "" : v; }); return out; };
  const rows = list.filter(x => x && typeof x === "object").map(x => flat(x, "", {})), head = []; rows.slice(0, 200).forEach(r => Object.keys(r).forEach(k => { if (!head.includes(k)) head.push(k); }));
  return {head, rows}; }

/* ---------- движок правил ---------- */
/* словарь значений источника: строки вида «fb, facebook, fb_gum = facebook» */
function srcDict(src){ const m = {}; String(src.dict || "").split("\n").forEach(l => { const i = l.lastIndexOf("="); if (i < 0) return; const to = l.slice(i + 1).trim(); if (!to) return; l.slice(0, i).split(",").forEach(x => { const k = x.trim().toLowerCase(); if (k) m[k] = to; }); });
  return v => { const k = String(v || "").trim().toLowerCase(); return k in m ? m[k] : v; }; }
/* Строки + правила источника → события и отчёт. Каждое правило проверяется на каждой строке отдельно:
   так из одной продажи с тремя платежами получаются три события оплаты. */
function srcRun(rows, src){ const ev = [], st = {rows:rows.length, noDate:0, miss:0, per:{}}, dict = srcDict(src), get = (r, c) => c ? String(r[c] == null ? "" : r[c]).trim() : "";
  const ok = (r, w) => { if (!w || !w.col || w.op === "any") return true; const v = get(r, w.col), l = v.toLowerCase(), list = String(w.val || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    return w.op === "filled" ? v !== "" : w.op === "empty" ? v === "" : w.op === "pos" ? slNum(v) > 0 : w.op === "has" ? list.some(x => l.includes(x)) : w.op === "not" ? !list.some(x => l.includes(x)) : true; };
  const rules = (src.rules || []).filter(q => q.f && q.f.d);
  rows.forEach(r => { let hit = false;
    rules.forEach(q => { if (!(q.when || []).every(w => ok(r, w))) return; hit = true;
      const d = slDate(get(r, q.f.d)); if (!d) { st.noDate++; return; }
      ev.push({kind:q.kind, rule:q.id, d, w:slDate(get(r, q.f.w)), a:q.f.a ? slNum(get(r, q.f.a)) : 0, c:src.cur || "UAH", s:dict(get(r, q.f.s)), k:get(r, q.f.k), n:get(r, q.f.n), t:get(r, q.f.t)});
      st.per[q.id] = (st.per[q.id] || 0) + 1; });
    if (!hit) st.miss++; });
  return {ev, st}; }

/* ---------- экран ---------- */
const srcList = p => (p.sources = p.sources || []);
const srcGet = p => srcList(p).find(s => s.id === DSRC.open);
const srcRule = (kind, head) => { const f = {}, used = []; SL_FIELDS().forEach(fl => { const h = (head || []).find(c => fl[3].test(String(c)) && !used.includes(c)); if (h) { f[fl[0]] = h; used.push(h); } });
  return {id:"r" + uid(), kind, name:"", when:[{col:"", op:"any", val:""}], f}; };
const srcKindName = k => (SL_KINDS().find(x => x[0] === k) || ["", k])[1];
const srcSum = s => SL_KINDS().map(k => { const n = (s.rules || []).filter(r => r.kind === k[0]).length; return n ? k[1] + (n > 1 ? " ×" + n : "") : ""; }).filter(Boolean).join(" · ");
/* что уже есть у проекта по каждому виду события */
function srcCover(p){ const has = k => srcList(p).filter(s => (s.rules || []).some(r => r.kind === k && r.f && r.f.d)).map(s => s.name || L("без назви","без названия"));
  const meta = CLOUD && p.meta && p.meta.conn ? ["Meta Ads"] : [];
  return [[L("Ліди","Лиды"), meta.concat(has("lead"))], [L("Броні","Брони"), has("booking")], [L("Оплати","Оплаты"), has("payment")]]; }
function sourcesPanel(p){
  const list = srcList(p), s = srcGet(p), head = `<span class="tag">${L("Джерела даних: ліди, броні, оплати","Источники данных: лиды, брони, оплаты")}</span>`;
  const cover = `<dl class="kv">${srcCover(p).map(c => `<dt>${c[0]}</dt><dd>${c[1].length ? pill("good", esc(c[1].join(", "))) : pill("warn", L("джерела немає","источника нет"))}</dd>`).join("")}</dl>`;
  if (!s) return `<div class="panel" id="sources">${head}
    <p class="sub">${L("Тут інтегратор описує, звідки платформа бере події шляху продажу. Джерело — будь-яке вивантаження: аркуш таблиці або файл із CRM. Для кожного джерела задаються правила: який рядок вважати якою подією й у якій колонці що лежить.","Здесь интегратор описывает, откуда платформа берёт события пути продажи. Источник — любая выгрузка: лист таблицы или файл из CRM. Для каждого источника задаются правила: какую строку считать каким событием и в какой колонке что лежит.")}</p>
    ${cover}
    ${list.length ? `<div class="tw tw--in"><table class="tnar"><thead><tr><th>${L("Джерело","Источник")}</th><th>${L("Події","События")}</th><th>${L("Останнє завантаження","Последняя загрузка")}</th><th></th></tr></thead><tbody>${list.map(x => `<tr><td><b>${esc(x.name || L("Без назви","Без названия"))}</b></td><td>${srcSum(x) || "—"}</td><td class="mono">${x.last ? esc(x.last.at) + " · " + num(x.last.n) : "—"}</td><td class="n"><button class="btn btn--sm" data-act="srcOpen" data-id="${x.id}">${L("Відкрити","Открыть")}</button></td></tr>`).join("")}</tbody></table></div>`
      : empty(L("Джерел іще немає","Источников пока нет"), L("Без них платформа бачить рекламу лише до ліда. Додайте вивантаження з бронями чи оплатами — з’являться виручка й окупність за кампаніями та креативами.","Без них платформа видит рекламу только до лида. Добавьте выгрузку с бронями или оплатами — появятся выручка и окупаемость по кампаниям и креативам."))}
    <div class="row"><button class="btn btn--solid" data-act="srcAdd">${L("Додати джерело","Добавить источник")}</button></div>
    ${DSRC.done ? `<p class="sub">${esc(DSRC.done)}</p>` : ""}
    <p class="sub">${L("Зараз джерело — це файл CSV або JSON, який розбирається у браузері: на сервер ідуть лише дата, сума й мітки, імена й контакти комп’ютер не покидають. Читання таблиць і CRM за розкладом підключимо далі — правила залишаться ті самі.","Сейчас источник — это файл CSV или JSON, который разбирается в браузере: на сервер уходят только дата, сумма и метки, имена и контакты компьютер не покидают. Чтение таблиц и CRM по расписанию подключим дальше — правила останутся те же.")}</p></div>`;
  /* редактор одного источника */
  const rows = DSRC.rows[s.id], raw = DSRC.raw[s.id], cols = s.head || [], sel = (path, cur, id, lab) => `<select id="${id}" data-sr="${path}" aria-label="${lab}"><option value="">—</option>${cols.map(h => `<option value="${esc(h)}"${cur === h ? " selected" : ""}>${esc(String(h).slice(0, 44))}</option>`).join("")}${cur && !cols.includes(cur) ? `<option value="${esc(cur)}" selected>${esc(cur)} · ${L("немає у файлі","нет в файле")}</option>` : ""}</select>`;
  const rules = (s.rules || []).map((q, i) => { const w = (q.when && q.when[0]) || {col:"", op:"any", val:""}, pre = "rule:" + q.id + ":", id = "sr-" + q.id + "-";
    return `<div class="panel srule"><div class="row sp"><span class="tag">${L("Правило","Правило")} ${i + 1}</span><span class="row"><button class="btn btn--sm" data-act="srcRuleCopy" data-id="${q.id}">${L("Дублювати","Дублировать")}</button><button class="btn btn--sm" data-act="srcRuleDel" data-id="${q.id}">${L("Прибрати","Убрать")}</button></span></div>
      <div class="form"><div class="field"><label for="${id}kind">${L("Яка це подія","Какое это событие")}</label><select id="${id}kind" data-sr="${pre}kind">${SL_KINDS().map(k => `<option value="${k[0]}"${q.kind === k[0] ? " selected" : ""}>${k[1]}</option>`).join("")}</select></div>
        <div class="field"><label for="${id}name">${L("Назва правила","Название правила")}</label><input id="${id}name" data-sr="${pre}name" value="${esc(q.name || "")}" placeholder="${L("напр. Оплата 2 (доплата)","напр. Оплата 2 (доплата)")}"></div>
        <div class="field"><label for="${id}op">${L("Коли рядок підходить","Когда строка подходит")}</label><select id="${id}op" data-sr="${pre}when:op">${SRC_OPS().map(o => `<option value="${o[0]}"${w.op === o[0] ? " selected" : ""}>${o[1]}</option>`).join("")}</select></div>
        ${w.op !== "any" ? `<div class="field"><label for="${id}wc">${L("Колонка умови","Колонка условия")}</label>${sel(pre + "when:col", w.col, id + "wc", L("Колонка умови","Колонка условия"))}</div>` : ""}
        ${w.op === "has" || w.op === "not" ? `<div class="field"><label for="${id}wv">${L("Значення через кому","Значения через запятую")}</label><input id="${id}wv" data-sr="${pre}when:val" value="${esc(w.val || "")}" placeholder="fb, facebook"></div>` : ""}
        ${SL_FIELDS().map(f => `<div class="field"><label for="${id}f${f[0]}">${f[1]}${f[2] ? " *" : ""}</label>${sel(pre + "f:" + f[0], (q.f || {})[f[0]] || "", id + "f" + f[0], f[1])}</div>`).join("")}</div></div>`; }).join("");
  let prev = `<p class="sub proto">${L("Оберіть файл — побачите, які події вийдуть за цими правилами. Самі правила збережено, файл не зберігається.","Выберите файл — увидите, какие события получатся по этим правилам. Сами правила сохранены, файл не хранится.")}</p>`, send = "";
  if (rows) { const r = srcRun(rows, s), ev = r.ev, days = ev.map(e => e.d).sort(), by = {}, srcs = {}; ev.forEach(e => { by[e.kind] = by[e.kind] || {n:0, a:0}; by[e.kind].n++; by[e.kind].a += e.a; const k = String(e.s || "—").toLowerCase(); srcs[k] = (srcs[k] || 0) + 1; });
    const pay = (by.payment || {a:0}).a, ctrl = slNum(DSRC.ctrl), top = Object.entries(srcs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => esc(e[0]) + " " + e[1]).join(" · ");
    const rn = id => { const i = (s.rules || []).findIndex(q => q.id === id), q = s.rules[i]; return q ? (q.name || srcKindName(q.kind) + " · " + (i + 1)) : ""; };
    prev = `<div class="tw"><table><thead><tr><th>${L("Правило","Правило")}</th>${SL_FIELDS().map(f => `<th>${f[1].replace(/ \(.*/, "")}</th>`).join("")}</tr></thead><tbody>${ev.slice(0, 6).map(e => `<tr><td>${esc(rn(e.rule))}</td>${["d", "w", "a", "s", "k", "n", "t"].map(k => `<td class="mono">${esc(String(e[k] === 0 ? "0" : e[k] || "—").slice(0, 28))}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="8">${L("Подій немає: перевірте умову правила й колонку з датою.","Событий нет: проверьте условие правила и колонку с датой.")}</td></tr>`}</tbody></table></div>
      <dl class="kv"><dt>${L("Рядків у файлі","Строк в файле")}</dt><dd class="mono">${num(r.st.rows)}</dd>
        ${SL_KINDS().filter(k => by[k[0]]).map(k => `<dt>${k[1]}</dt><dd class="mono">${num(by[k[0]].n)}${by[k[0]].a ? " · " + fxM(by[k[0]].a) + " " + esc(s.cur || "UAH") : ""}</dd>`).join("")}
        ${ev.length ? `<dt>${L("Період","Период")}</dt><dd class="mono">${days[0]} — ${days[days.length - 1]}</dd>` : ""}
        ${r.st.miss ? `<dt>${L("Не підійшли під жодне правило","Не подошли ни под одно правило")}</dt><dd class="mono">${num(r.st.miss)}</dd>` : ""}
        ${r.st.noDate ? `<dt>${L("Пропущено: дата не читається","Пропущено: дата не читается")}</dt><dd>${pill("warn", num(r.st.noDate))}</dd>` : ""}
        ${top ? `<dt>${L("Джерела після словника","Источники после словаря")}</dt><dd class="mono">${top}</dd>` : ""}</dl>
      ${by.payment ? `<div class="form"><div class="field"><label for="sr-ctrl">${L("Звірка: скільки оплат за цей період має бути (з обліку)","Сверка: сколько оплат за этот период должно быть (из учёта)")}</label><input id="sr-ctrl" class="tin" data-srctrl="1" inputmode="decimal" value="${esc(DSRC.ctrl)}" placeholder="${fxM(pay)}"></div>
        <div class="field"><label>${L("Розбіжність","Расхождение")}</label><div>${ctrl > 0 ? pill(Math.abs(pay - ctrl) / ctrl < 0.01 ? "good" : "warn", (pay - ctrl >= 0 ? "+" : "−") + fxM(Math.abs(pay - ctrl)) + " " + esc(s.cur || "UAH") + " · " + dec(Math.abs(pay - ctrl) / ctrl * 100) + "%") : `<span class="sub">${L("введіть контрольну суму","введите контрольную сумму")}</span>`}</div></div></div>` : ""}`;
    send = `<p class="sub">${L("Попередні події цього джерела за той самий період буде замінено — повторне завантаження не дублює.","Прежние события этого источника за тот же период будут заменены — повторная загрузка не задваивает.")}</p>
      <div class="row">${CLOUD ? `<button class="btn btn--solid" data-act="srcSend"${DSRC.busy || !ev.length ? " disabled" : ""}>${DSRC.busy ? L("Завантажуємо…","Загружаем…") : L("Завантажити події: ","Загрузить события: ") + num(ev.length)}</button>` : `<span class="sub proto">${L("Прототип: правила й попередній перегляд працюють, завантаження на сервер — після входу.","Прототип: правила и предпросмотр работают, загрузка на сервер — после входа.")}</span>`}</div>`; }
  return `<div class="panel vf" id="sources">${head}<div class="row sp"><button class="btn btn--sm" data-act="srcClose">← ${L("Усі джерела","Все источники")}</button><button class="btn btn--sm" data-act="srcDel" data-id="${s.id}">${DSRC.del === s.id ? L("Точно видалити?","Точно удалить?") : L("Видалити джерело","Удалить источник")}</button></div>
    <div class="form"><div class="field"><label for="sr-name">${L("Назва джерела","Название источника")}</label><input id="sr-name" data-sr="name" value="${esc(s.name || "")}" placeholder="${L("напр. CRM: оплати","напр. CRM: оплаты")}"></div>
      <div class="field"><label for="sr-cur">${L("Валюта сум","Валюта сумм")}</label><select id="sr-cur" data-sr="cur">${["UAH", "USD", "EUR", "PLN"].map(c => `<option${(s.cur || "UAH") === c ? " selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="sl-rate">${L("Курс: гривень за $1","Курс: гривен за $1")}</label><input id="sl-rate" class="tin tin--w" data-slrate="1" inputmode="decimal" value="${(p.fx && p.fx.UAH) || ""}" placeholder="41.5"></div>
      ${raw ? `<div class="field"><label for="sr-hi">${L("Рядок із заголовками","Строка с заголовками")}</label><select id="sr-hi" data-sr="hi">${[0, 1, 2, 3, 4].filter(i => i < raw.length).map(i => `<option value="${i}"${(s.hi || 0) === i ? " selected" : ""}>${i + 1}: ${esc((raw[i] || []).filter(Boolean).slice(0, 3).join(", ").slice(0, 50))}</option>`).join("")}</select></div>` : ""}</div>
    <div class="row"><label class="btn${rows ? "" : " btn--solid"}"><input type="file" hidden accept=".csv,.tsv,.txt,.json,text/csv,application/json" data-srfile="${s.id}">${rows ? L("Інший файл","Другой файл") : L("Обрати файл CSV або JSON","Выбрать файл CSV или JSON")}</label>${DSRC.file[s.id] ? `<span class="sub mono">${esc(DSRC.file[s.id])}</span>` : cols.length ? `<span class="sub">${L("колонок у правилах: ","колонок в правилах: ")}${cols.length}</span>` : ""}</div>
    ${cols.length ? `<p class="sub">${L("Правила перевіряються на кожному рядку окремо. Якщо в одному рядку кілька подій (перша оплата й доплати) — зробіть по правилу на кожну.","Правила проверяются на каждой строке отдельно. Если в одной строке несколько событий (первая оплата и доплаты) — сделайте по правилу на каждое.")}</p>${rules}
      <div class="row"><button class="btn btn--sm" data-act="srcRuleAdd">${L("Додати правило","Добавить правило")}</button></div>
      <div class="form"><div class="field" style="grid-column:1/-1"><label for="sr-dict">${L("Словник джерел: варіанти через кому = як рахувати","Словарь источников: варианты через запятую = как считать")}</label><textarea id="sr-dict" data-sr="dict" rows="2" placeholder="fb, fb_gum, fb ig = facebook">${esc(s.dict || "")}</textarea></div></div>
      ${prev}${send}` : `<p class="sub">${L("Почніть із файла: за його заголовками платформа сама запропонує перше правило.","Начните с файла: по его заголовкам платформа сама предложит первое правило.")}</p>`}</div>`;
}
/* в целях проекта остаётся короткая отсылка сюда */
const salesPanel = p => `<div class="panel" id="sales"><span class="tag">${L("Продажі: броні й оплати","Продажи: брони и оплаты")}</span><p class="sub">${L("Броні й оплати приходять із джерел даних проєкту: ","Брони и оплаты приходят из источников данных проекта: ")}${srcCover(p).slice(1).map(c => c[0].toLowerCase() + " — " + (c[1].length ? esc(c[1].join(", ")) : L("джерела немає","источника нет"))).join("; ")}.</p><div class="row"><button class="btn btn--sm" data-act="mapConn" data-id="${p.id}">${L("Джерела даних","Источники данных")}</button></div></div>`;
async function slCall(body){ if (!CLOUD || !sb) return {ok:false, error:"offline"}; try { const f = await sb.functions.invoke("sales", {body}); if (f.error || !f.data) return {ok:false, error:"net", detail:(f.error && f.error.message) || "empty"}; return f.data; } catch (e) { return {ok:false, error:"net", detail:e && e.message}; } }
function srcLoad(s, name, text){ let t = null;
  if (/^\s*[\[{]/.test(text)) { try { t = srcFromJson(JSON.parse(text)); } catch (e) { t = null; } if (!t) { toast(L("У файлі JSON не знайдено списку записів","В файле JSON не найден список записей")); return false; } delete DSRC.raw[s.id]; }
  else { const raw = csvParse(text); if (raw.length < 2) { toast(L("У файлі немає рядків із даними","В файле нет строк с данными")); return false; } DSRC.raw[s.id] = raw; if ((s.hi || 0) >= raw.length) s.hi = 0; t = srcFromTable(raw, s.hi || 0); }
  if (!t.rows.length) { toast(L("У файлі немає рядків із даними","В файле нет строк с данными")); return false; }
  const same = JSON.stringify(s.head || []) === JSON.stringify(t.head); s.head = t.head; DSRC.rows[s.id] = t.rows; DSRC.file[s.id] = name; if (!s.name) s.name = name.replace(/\.[a-z0-9]+$/i, "");
  if (!(s.rules || []).length) s.rules = [srcRule("booking", t.head)];
  toast(same ? L("Колонки ті самі — правила застосовано","Колонки те же — правила применены") : L("Перевірте правила: колонки у файлі інші","Проверьте правила: колонки в файле другие")); return true; }
Object.assign(ACT, {
  srcAdd(){ const p = P(); if (!p) return false; const s = {id:"s" + uid(), name:"", cur:"UAH", hi:0, head:[], rules:[], dict:""}; srcList(p).push(s); DSRC.open = s.id; DSRC.done = ""; save(); },
  srcOpen(d){ DSRC.open = d.id; DSRC.del = null; DSRC.ctrl = ""; },
  srcClose(){ DSRC.open = null; DSRC.del = null; },
  srcDel(d){ const p = P(); if (!p) return false; if (DSRC.del !== d.id) { DSRC.del = d.id; return; } p.sources = srcList(p).filter(s => s.id !== d.id); delete DSRC.rows[d.id]; delete DSRC.raw[d.id]; delete DSRC.file[d.id]; DSRC.open = null; DSRC.del = null; save(); },
  srcRuleAdd(){ const s = srcGet(P()); if (!s) return false; s.rules = s.rules || []; s.rules.push(srcRule(s.rules.length ? s.rules[s.rules.length - 1].kind : "booking", s.head)); save(); },
  srcRuleCopy(d){ const s = srcGet(P()), q = s && (s.rules || []).find(r => r.id === d.id); if (!q) return false; const c = JSON.parse(JSON.stringify(q)); c.id = "r" + uid(); c.name = ""; s.rules.splice(s.rules.indexOf(q) + 1, 0, c); save(); },
  srcRuleDel(d){ const s = srcGet(P()); if (!s) return false; s.rules = (s.rules || []).filter(r => r.id !== d.id); save(); },
  srcSend(){ const p = P(), s = p && srcGet(p), rows = s && DSRC.rows[s.id]; if (!rows || DSRC.busy) return false; const ev = srcRun(rows, s).ev; if (!ev.length) return false; DSRC.busy = true;
    (async () => { let added = 0, err = ""; const all = ev.map(e => e.d).sort();
      for (const k of SL_KINDS().map(x => x[0])) { const part = ev.filter(e => e.kind === k); if (!part.length || err) continue; const days = part.map(e => e.d).sort();
        for (let i = 0; i < part.length && !err; i += 1000) { const r = await slCall({action:"import", project_id:p.id, kind:k, source_id:s.id, first:i === 0, from:days[0], to:days[days.length - 1], events:part.slice(i, i + 1000).map(e => ({d:e.d, w:e.w, a:e.a, c:e.c, s:e.s, k:e.k, n:e.n, t:e.t}))});
          if (!r.ok) err = /sales_events|does not exist|schema cache/i.test(String(r.detail)) ? L("Таблиці продажів на сервері ще немає: потрібно запустити schema_metrics.sql.","Таблицы продаж на сервере ещё нет: нужно запустить schema_metrics.sql.") : /not found|404|Failed to send/i.test(String(r.detail)) ? L("Функцію sales на сервері ще не створено.","Функция sales на сервере ещё не создана.") : L("Не вдалося завантажити: ","Не удалось загрузить: ") + (r.detail || r.error);
          else added += r.added; } }
      DSRC.busy = false;
      if (err) toast(err); else { s.last = {at:new Date().toISOString().slice(0, 10), n:added, from:all[0], to:all[all.length - 1]}; DSRC.done = L("Завантажено подій: ","Загружено событий: ") + num(added) + ", " + all[0] + " — " + all[all.length - 1]; delete DSRC.rows[s.id]; delete DSRC.raw[s.id]; delete DSRC.file[s.id]; DSRC.open = null; save(); toast(DSRC.done); const fx = fxOf(p); fx.rows = null; fxLoad(p); }
      render(); })(); },
});
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return; const p = P(); if (!p) return;
  if (t.dataset.slrate) { const n = parseFloat(String(t.value).replace(",", ".")); p.fx = p.fx || {}; if (n > 0) p.fx.UAH = n; else delete p.fx.UAH; save(); render(); return; }
  if (t.dataset.srctrl) { DSRC.ctrl = t.value; render(); return; }
  const s = srcGet(p); if (!s) return;
  if (t.dataset.srfile) { const f = t.files && t.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { if (srcLoad(s, f.name, String(rd.result || ""))) save(); render(); }; rd.readAsText(f); return; }
  if (!t.dataset.sr) return; const path = t.dataset.sr.split(":");
  if (path[0] === "rule") { const q = (s.rules || []).find(r => r.id === path[1]); if (!q) return;
    if (path[2] === "f") { q.f = q.f || {}; if (t.value) q.f[path[3]] = t.value; else delete q.f[path[3]]; }
    else if (path[2] === "when") { q.when = q.when && q.when[0] ? q.when : [{col:"", op:"any", val:""}]; q.when[0][path[3]] = t.value; }
    else q[path[2]] = t.value; }
  else if (path[0] === "hi") { s.hi = +t.value; const raw = DSRC.raw[s.id]; if (raw) { const x = srcFromTable(raw, s.hi); s.head = x.head; DSRC.rows[s.id] = x.rows; } }
  else s[path[0]] = t.value;
  save(); render(); });
