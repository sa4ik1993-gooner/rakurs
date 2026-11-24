/* Чат с Хиро на платформе (Дмитрий, 24.11.2026: «онлайн-чат на платформе, а не переводить в Telegram;
   вопросы только по своим кампаниям»). Бесплатно: без ИИ, готовые вопросы кнопками и короткие фразы,
   ответы собираются из данных кабинета (цифры дня, лента Хиро, график, гипотезы). Свободного ИИ-чата нет — решение Дмитрия. */
const HC = {open:false, msgs:[]};

const hcProjs = () => (typeof pfProjs === "function" ? pfProjs() : (W.projs || [])).filter(p => p && p.funnels);
const hcLog = p => { const st = typeof PL !== "undefined" ? PL.st[p.id] : null; return st && st.ok ? (st.log || []) : null; };
const hcM = v => (typeof dec === "function" ? dec(v) : (Math.round(v * 100) / 100).toFixed(2)) + " $";

/* вопросы: ключ, подпись, слова для распознавания фразы */
const HCQ = () => [
  {k:"today", t:L("Як справи сьогодні?","Как дела сегодня?"), w:/сьогодн|сегодн|справ|дела|як там|как там|скільки лід|сколько лид|цифр/},
  {k:"why", t:L("Чому дорого?","Почему дорого?"), w:/дорог|чому|почему|ціна|цена|cpl/},
  {k:"off", t:L("Що вимкнути?","Что выключить?"), w:/вимк|выкл|зупин|останов|не працю|не работ/},
  {k:"night", t:L("Що в графіку на ніч?","Что в графике на ночь?"), w:/граф|ніч|ноч|заплан|старт/},
  {k:"tests", t:L("Що з дублями й тестами?","Что с дублями и тестами?"), w:/дубл|тест|копі|копи|cap|кап/},
  {k:"recos", t:L("Що ти пропонуєш?","Что ты предлагаешь?"), w:/пропон|предлаг|порад|совет|ідеї|идеи|гіпотез|гипотез/},
  {k:"grow", t:L("Як отримати більше лідів?","Как получить больше лидов?"), w:/більше|больше|збільш|увелич|масштаб|бюджет|розігн|разогн/},
];

function hcAnswer(k){
  const ps = hcProjs();
  if (!ps.length) return L("Поки немає проєктів з підключеною рекламою — мені нема на що дивитися.","Пока нет проектов с подключенной рекламой — мне не на что смотреть.");
  if (k === "today") { const e = typeof hiroEv === "function" ? hiroEv(null) : null;
    if (!e || e.load) return L("Ще завантажую цифри за сьогодні — спитай за хвилину.","Еще загружаю цифры за сегодня — спроси через минуту.");
    if (e.none || !e.s) return L("Сьогодні реклама ще не витрачала.","Сегодня реклама еще не тратила.");
    const s = e.s, cpl = s.leads ? s.spend / s.leads : 0, bad = (e.bad || []).slice(0, 3);
    return L("Сьогодні: витрачено ","Сегодня: потрачено ") + hcM(s.spend) + L(", лідів ",", лидов ") + num(s.leads) + (cpl ? L(", лід за ",", лид за ") + hcM(cpl) : "") + "."
      + (bad.length ? L(" Дорожче за норму: "," Дороже нормы: ") + bad.map(b => (b.o.name || "").slice(0, 40) + (b.cpl ? " — " + hcM(b.cpl) : "")).join("; ") + "." : L(" Кампаній, дорожчих за норму, немає."," Кампаний дороже нормы нет.")); }
  if (k === "why") { const H = []; ps.forEach(p => (p.funnels || []).forEach(f => { const C = typeof PLC !== "undefined" ? PLC[p.id + f.id] : null; (C && C.H || []).forEach(h => H.push(h.t)); }));
    return H.length ? L("Головні причини, які я бачу: ","Главные причины, которые я вижу: ") + [...new Set(H)].slice(0, 4).join("; ") + L(". Кожну з планом дій дивись у «Пропозиціях» на «Сьогодні».",". Каждую с планом действий смотри в «Предложениях» на «Сегодня».")
      : L("Окремих причин дорожнечі зараз не бачу. Якщо ціна ліда вища за ціль — відкрий «Сьогодні»: там розбір по групах.","Отдельных причин дороговизны сейчас не вижу. Если цена лида выше цели — открой «Сегодня»: там разбор по группам."); }
  if (k === "off") { const e = typeof hiroEv === "function" ? hiroEv(null) : null, bad = e && e.bad ? e.bad.slice(0, 5) : [];
    const offs = []; ps.forEach(p => (hcLog(p) || []).filter(x => x.kind === "reco" && x.status === "new" && /pause/.test((x.payload || {}).op || "")).forEach(x => offs.push(x.title + ((x.payload || {}).name ? " — " + x.payload.name : ""))));
    if (offs.length) return L("Пропоную вимкнути: ","Предлагаю выключить: ") + offs.slice(0, 4).join("; ") + L(". Натисни «Так» у стрічці — вимкну одразу.",". Нажми «Да» в ленте — выключу сразу.");
    return bad.length ? L("Дорожче за норму сьогодні: ","Дороже нормы сегодня: ") + bad.map(b => (b.o.name || "").slice(0, 40)).join("; ") + L(". Вимикати поки рано — мало даних; якщо буде впевнено дорого, я запропоную сам.",". Выключать пока рано — мало данных; если будет уверенно дорого, я предложу сам.")
      : L("Нічого вимикати не треба: дорогих кампаній зараз немає.","Ничего выключать не нужно: дорогих кампаний сейчас нет."); }
  if (k === "night" || k === "tests") { const rows = []; ps.forEach(p => (hcLog(p) || []).forEach(x => { const y = x.payload || {};
      if (k === "night" ? x.status === "scheduled" : /dup|costcap|geotest|relaunch/.test(y.op || "")) rows.push({x, y}); }));
    if (!rows.length) return k === "night" ? L("На ніч нічого не заплановано.","На ночь ничего не запланировано.") : L("Дублів і тестів поки немає.","Дублей и тестов пока нет.");
    return rows.slice(0, 6).map(({x, y}) => { const t = typeof plTitle === "function" ? plTitle(y.op, y, y.level) || x.title : x.title, hm = typeof plPrepHm === "function" ? plPrepHm(y) : "01:00";
      const st = x.status === "scheduled" ? (y.prep && y.prep.nid ? L("готово, старт о ","готово, старт в ") + hm : L("зроблю вночі","сделаю ночью")) : x.status === "done" ? L("запущено","запущено") : x.status === "fail" ? L("не вийшло: ","не получилось: ") + String(x.result || "").slice(0, 80) : x.status === "new" ? L("чекає «Так»","ждет «Да»") : x.status;
      return "• " + t + (y.name ? " — " + y.name : "") + ": " + st; }).join("\n"); }
  if (k === "recos") { const r = []; ps.forEach(p => (hcLog(p) || []).filter(x => x.kind === "reco" && x.status === "new").forEach(x => r.push(x.title + ((x.payload || {}).name ? " — " + x.payload.name : ""))));
    return r.length ? L("Чекають твого «Так»: ","Ждут твоего «Да»: ") + r.slice(0, 5).join("; ") + "." : L("Нових пропозицій зараз немає — я перевіряю рекламу щогодини.","Новых предложений сейчас нет — я проверяю рекламу каждый час."); }
  if (k === "grow") return L("Напиши задачу внизу «Сьогодні», напр. «підняти бюджет до 200 $ на день». Групи, що пройшли навчання, підніму кроками; якщо ще вчаться — запропоную дубль найкращої зв’язки з іншою аудиторією (країни з оплатами, вік, мова) і бюджетом, з відкладеним стартом о 01:00.","Напиши задачу внизу «Сегодня», напр. «поднять бюджет до 200 $ в день». Обученные группы подниму шагами; если еще учатся — предложу дубль лучшей связки с другой аудиторией (страны с оплатами, возраст, язык) и бюджетом, с отложенным стартом в 01:00.");
  return "";
}

function hcAsk(text, k){ const q = HCQ(), hit = k ? q.find(x => x.k === k) : q.find(x => x.w.test(String(text).toLowerCase()));
  HC.msgs.push({me:1, t:text || (hit && hit.t) || ""});
  HC.msgs.push({t: hit ? hcAnswer(hit.k) : L("Я відповідаю лише про твою рекламу. Обери питання нижче або спитай коротко: «чому дорого», «що вимкнути», «що на ніч», «як більше лідів».","Я отвечаю только про твою рекламу. Выбери вопрос ниже или спроси коротко: «почему дорого», «что выключить», «что на ночь», «как больше лидов».")});
  HC.msgs = HC.msgs.slice(-30); render(); requestAnimationFrame(() => { const b = document.querySelector(".hcw__m"); if (b) b.scrollTop = b.scrollHeight; }); }

function hcPanel(){ if (!HC.open || !W.user || !W.co) return "";
  const msgs = HC.msgs.length ? HC.msgs : [{t:L("Hey! Я Хіро. Питай про свою рекламу — відповім за цифрами твоїх кампаній.","Hey! Я Хиро. Спрашивай про свою рекламу — отвечу по цифрам твоих кампаний.")}];
  return `<section class="hcw" role="dialog" aria-label="${L("Чат з Хіро","Чат с Хиро")}"><div class="hcw__h"><img src="ui/hiro/watch.webp" alt="" width="32" height="32"><b>${L("Хіро","Хиро")}</b><button type="button" class="btn btn--sm btn--text" data-act="hcClose" aria-label="${L("Закрити","Закрыть")}">${ico("close")}</button></div>
    <div class="hcw__m">${msgs.map(m => `<p class="hcw__b${m.me ? " hcw__b--me" : ""}">${esc(m.t).replace(/\n/g, "<br>")}</p>`).join("")}</div>
    <div class="hcw__q">${HCQ().map(q => `<button type="button" class="chip" data-act="hcQ" data-v="${q.k}">${esc(q.t)}</button>`).join("")}</div>
    <form class="hcw__f" data-hcform="1"><input class="tin tin--w" name="q" maxlength="200" autocomplete="off" placeholder="${L("Спитай коротко: чому дорого?","Спроси коротко: почему дорого?")}" aria-label="${L("Питання Хіро","Вопрос Хиро")}"><button type="submit" class="btn btn--sm btn--main">${L("Спитати","Спросить")}</button></form></section>`; }

function hcMount(){ let el = document.getElementById("hcw"); if (!el) { el = document.createElement("div"); el.id = "hcw"; document.body.appendChild(el); }
  const html = hcPanel(); if (el.dataset.h !== html) { const val = el.querySelector("input") && el.querySelector("input").value; el.innerHTML = html; el.dataset.h = html; const i = el.querySelector("input"); if (i && val) i.value = val; }
  const b = document.getElementById("hchat"); if (b) b.hidden = b.hidden || HC.open; }

document.addEventListener("submit", e => { const f = e.target; if (!f.dataset || !f.dataset.hcform) return; e.preventDefault(); const v = String(f.q.value || "").trim(); if (!v) return; f.q.value = ""; hcAsk(v); });

Object.assign(ACT, {
  /* «Спитати Хіро» / «Хіро на зв’язку» — чат на платформе, а не Telegram */
  hiroAsk(){ HC.open = true; render(); requestAnimationFrame(() => { const i = document.querySelector(".hcw input"); if (i) i.focus(); }); return false; },
  hcClose(){ HC.open = false; render(); return false; },
  hcQ(d){ hcAsk("", d.v); return false; },
});
