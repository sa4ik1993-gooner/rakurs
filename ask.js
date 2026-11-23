/* Запрос к платформе: вопрос словами (текстом или голосом) → серверная функция ask → разбор с цифрами.
   Думает модель Claude по API: каждый вопрос тратит токены со счёта ключа, который лежит в секретах сервера.
   Цифры модель берёт сама: реклама — из аккаунтов Meta, отмеченных в подключении проекта; продажи — из загруженных в проект.
   Только чтение. Подключается перед ws.js. */
const AQ = {text:"", busy:false, err:"", rec:null, on:false, t0:0, tick:0};
const AQ_SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
async function aqCall(body){
  if (!CLOUD || !sb) return {ok:false, error:"offline"};
  try { const f = await sb.functions.invoke("ask", {body}); if (f.error || !f.data) return {ok:false, error:"net", detail:(f.error && f.error.message) || "empty"}; return f.data; }
  catch (e) { return {ok:false, error:"net", detail:e && e.message}; }
}
const aqErr = d => ({
  no_ai_key:L("На сервері ще немає ключа Anthropic. Додайте його в Supabase: Edge Functions → Secrets → ANTHROPIC_API_KEY.","На сервере ещё нет ключа Anthropic. Добавьте его в Supabase: Edge Functions → Secrets → ANTHROPIC_API_KEY."),
  bad_ai_key:L("Ключ Anthropic на сервері не працює: перевірте його та баланс рахунку.","Ключ Anthropic на сервере не работает: проверьте его и баланс счёта."),
  ai_busy:L("Сервіс Claude зараз перевантажений. Спробуйте ще раз за хвилину.","Сервис Claude сейчас перегружен. Попробуйте ещё раз через минуту."),
  refused:L("Модель відмовилась відповідати на це запитання. Сформулюйте його інакше.","Модель отказалась отвечать на этот вопрос. Сформулируйте его иначе."),
  too_long:L("Відповідь вийшла надто довгою й обірвалась. Звузьте запитання: один акаунт, один період.","Ответ получился слишком длинным и оборвался. Сузьте вопрос: один аккаунт, один период."),
  no_answer:L("Відповіді не вийшло. Спробуйте ще раз або звузьте запитання.","Ответа не получилось. Попробуйте ещё раз или сузьте вопрос."),
  empty:L("Напишіть або надиктуйте запитання.","Напишите или надиктуйте вопрос."),
  denied:L("Цей проєкт вам не відкрито.","Этот проект вам не открыт."), not_signed_in:L("Спершу увійдіть у кабінет.","Сначала войдите в кабинет."),
  no_project:L("Проєкт ще не збережено на сервері. Зачекайте кілька секунд і повторіть.","Проект ещё не сохранён на сервере. Подождите пару секунд и повторите."),
  net:L("Не вдалося звернутися до функції ask. Якщо її ще не створено на сервері — створіть (Supabase → Edge Functions → ask). ","Не удалось обратиться к функции ask. Если она ещё не создана на сервере — создайте (Supabase → Edge Functions → ask). ") + (d.detail || ""),
}[d.error] || L("Не вдалося: ","Не удалось: ") + (d.detail || d.error));
/* Ответ модели приходит простой разметкой: заголовки, списки, жирный, таблицы. Всё экранируется, HTML из ответа не исполняется. */
function mdLite(src){
  const lines = String(src || "").replace(/\r/g, "").split("\n"), inl = s => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
  const isT = l => /^\s*\|.*\|\s*$/.test(l), isH = l => /^#{1,4}\s+/.test(l), isL = l => /^\s*([-*•]|\d+[.)])\s+/.test(l);
  let html = "", i = 0;
  while (i < lines.length) { const l = lines[i];
    if (isT(l)) { const rows = []; while (i < lines.length && isT(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()), body = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r)); if (!body.length) continue;
      const num = c => /^[−-]?[$€₴]?\s?[\d\s.,]+\s?(%|[$€₴]|[A-Z]{3}|грн)?$/.test(c);
      html += `<div class="tw tw--in"><table><thead><tr>${cells(body[0]).map(c => `<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td${num(c) ? ' class="n mono"' : ""}>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; continue; }
    if (isH(l)) { html += `<h3>${inl(l.replace(/^#+\s+/, ""))}</h3>`; i++; continue; }
    if (isL(l)) { const ord = /^\s*\d+[.)]\s+/.test(l), items = []; while (i < lines.length && isL(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      html += `<${ord ? "ol" : "ul"}>${items.map(x => `<li>${inl(x)}</li>`).join("")}</${ord ? "ol" : "ul"}>`; continue; }
    if (!l.trim()) { i++; continue; }
    const par = []; while (i < lines.length && lines[i].trim() && !isT(lines[i]) && !isH(lines[i]) && !isL(lines[i])) par.push(lines[i++]);
    html += `<p>${par.map(inl).join("<br>")}</p>`; }
  return html;
}
const aqExamples = p => { const a = ((p.meta && p.meta.conn && (p.meta.conn.accounts || [p.meta.conn.account])) || []).filter(Boolean), n = a[0] ? (a[0].name || a[0].id) : L("основному акаунті","основном аккаунте");
  return [L(`Які оголошення в ${n} за останні 30 днів дали найдешевший результат? Що з них перенести в новий запуск?`, `Какие объявления в ${n} за последние 30 дней дали самый дешёвый результат? Что из них перенести в новый запуск?`),
    a.length > 1 ? L("Порівняй усі підключені акаунти за минулий місяць: витрати, результати, ціна результату.","Сравни все подключённые аккаунты за прошлый месяц: расход, результаты, цена результата.") : L("Як змінилась ціна ліда за останні два тижні проти двох попередніх?","Как изменилась цена лида за последние две недели против двух предыдущих?"),
    L("Які кампанії варто вимкнути й чому?","Какие кампании стоит выключить и почему?")]; };
function askPanel(p, f){
  /* Блок выключен, пока в config.js нет ask:true. Решение Дмитрия 20.11.2026: платных запросов по API пока не делаем. */
  if (!(window.RK && RK.ask)) return "";
  const list = (p.asks || []), conn = p.meta && p.meta.conn;
  const item = (x, open) => `<details class="aqi"${open ? " open" : ""}><summary><b>${esc(x.q)}</b><span class="sub mono">${esc(String(x.at || "").slice(0, 16).replace("T", " "))}</span></summary>
      <div class="aqa">${mdLite(x.a)}</div>
      <div class="row sp"><span class="sub mono">${x.cost != null ? "≈ $" + dec(+x.cost, 2) + " · " : ""}${x.tok ? num(x.tok) + L(" токенів"," токенов") : ""}${x.sec ? " · " + x.sec + L(" с"," с") : ""}</span>${del("aqDel", x.id)}</div></details>`;
  let body;
  if (!CLOUD) body = `<p class="sub proto">${L("Прототип: запити працюють після входу на сервер.","Прототип: запросы работают после входа на сервер.")}</p>`;
  else body = `<div class="field"><label for="aq-text">${L("Запитання","Вопрос")}</label><textarea id="aq-text" rows="3" data-aq="text" placeholder="${esc(aqExamples(p)[0])}"${AQ.busy ? " disabled" : ""}>${esc(AQ.text)}</textarea></div>
      ${!AQ.text && !AQ.busy ? `<div class="chipset">${aqExamples(p).map((t, i) => `<button type="button" class="chip" data-act="aqEx" data-v="${i}">${esc(t)}</button>`).join("")}</div>` : ""}
      ${!conn ? `<p class="sub">${L("Рекламний кабінет Meta до проєкту ще не підключено — без нього платформа не бачить цифр реклами.","Рекламный кабинет Meta к проекту ещё не подключён — без него платформа не видит цифр рекламы.")}</p>` : ""}
      ${AQ.err ? `<p class="mterr" role="alert">${esc(AQ.err)}</p>` : ""}
      <div class="row"><button class="btn btn--solid" data-act="aqSend"${AQ.busy ? " disabled" : ""}>${AQ.busy ? L("Рахуємо…","Считаем…") : L("Спитати","Спросить")}</button>
        ${AQ_SR ? `<button type="button" class="btn${AQ.on ? " btn--del" : ""}" data-act="aqMic"${AQ.busy ? " disabled" : ""} aria-pressed="${AQ.on}">${AQ.on ? L("■ Зупинити запис","■ Остановить запись") : L("● Надиктувати","● Надиктовать")}</button>` : `<span class="sub">${L("Диктування працює в Chrome і Safari.","Диктовка работает в Chrome и Safari.")}</span>`}
        ${AQ.busy ? `<span class="sub" role="status">${L("Платформа збирає цифри й рахує, зазвичай до хвилини","Платформа собирает цифры и считает, обычно до минуты")} · <span id="aq-wait">0</span> ${L("с","с")}</span>` : ""}</div>`;
  return `<div class="panel" id="aq"><span class="tag">${L("Запит до платформи","Запрос к платформе")}</span>
    
    ${body}${list.length ? `<div class="aqs">${list.map((x, i) => item(x, i === 0)).join("")}</div>` : ""}</div>`;
}
Object.assign(ACT, {
  aqEx(d){ const p = P(); if (!p) return false; AQ.text = aqExamples(p)[+d.v] || ""; AQ.err = ""; },
  aqDel(d){ const p = P(); if (!p) return false; p.asks = (p.asks || []).filter(x => x.id !== d.id); save(); },
  aqMic(){ if (!AQ_SR) return false; if (AQ.on && AQ.rec) { try { AQ.rec.stop(); } catch (e) {} return false; }
    const r = new AQ_SR(), base = AQ.text.trim() ? AQ.text.trim() + " " : ""; let fin = "";
    r.lang = lang === "ru" ? "ru-RU" : "uk-UA"; r.continuous = true; r.interimResults = true;
    r.onresult = e => { let tmp = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t + " "; else tmp += t; }
      AQ.text = (base + fin + tmp).replace(/\s+/g, " "); const el = document.getElementById("aq-text"); if (el) el.value = AQ.text; };
    r.onerror = e => { AQ.err = e.error === "not-allowed" || e.error === "service-not-allowed" ? L("Браузер не дав доступу до мікрофона. Дозвольте його для цієї сторінки.","Браузер не дал доступ к микрофону. Разрешите его для этой страницы.") : e.error === "no-speech" || e.error === "aborted" ? "" : L("Не вдалося розпізнати мову: ","Не удалось распознать речь: ") + e.error; };
    r.onend = () => { AQ.on = false; AQ.rec = null; AQ.text = AQ.text.trim(); render(); };
    AQ.rec = r; AQ.on = true; AQ.err = ""; try { r.start(); } catch (e) { AQ.on = false; AQ.rec = null; } },
  aqSend(){ const p = P(), f = F(), q = AQ.text.trim(); if (!p || AQ.busy) return false; if (q.length < 3) { AQ.err = aqErr({error:"empty"}); return; }
    if (AQ.on && AQ.rec) { try { AQ.rec.stop(); } catch (e) {} }
    /* предыдущий вопрос идёт вместе с новым, только если он свежий: так работает «а теперь за октябрь» */
    const last = (p.asks || [])[0], hist = last && Date.now() - new Date(last.at).getTime() < 30 * 60000 ? [{q:last.q, a:last.a}] : [];
    AQ.busy = true; AQ.err = ""; AQ.t0 = Date.now(); clearInterval(AQ.tick); AQ.tick = setInterval(() => { const el = document.getElementById("aq-wait"); if (el) el.textContent = Math.round((Date.now() - AQ.t0) / 1000); }, 1000);
    aqCall({project_id:p.id, funnel_id:f ? f.id : "", question:q, history:hist}).then(r => { AQ.busy = false; clearInterval(AQ.tick);
      if (!r.ok) AQ.err = aqErr(r); else { p.asks = p.asks || []; p.asks.unshift({id:uid(), at:new Date().toISOString(), q, a:String(r.answer).slice(0, 12000), cost:r.cost, tok:r.usage ? r.usage.input + r.usage.output + r.usage.cache_read : 0, sec:r.seconds || 0}); p.asks = p.asks.slice(0, 12); AQ.text = ""; save(); }
      render(); }); },
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.aq === "text") { const was = !!AQ.text; AQ.text = t.value; if (was !== !!AQ.text && !AQ.on) { /* подсказки-примеры видны только при пустом поле */ const pos = t.selectionStart; render(); const el = document.getElementById("aq-text"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} } } } });
document.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && e.target && e.target.id === "aq-text") { e.preventDefault(); if (ACT.aqSend() !== false) render(); } });
