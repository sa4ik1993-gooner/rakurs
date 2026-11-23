/* Своя компания: Компания → Проекты → Воронки. Пустой старт, всё введённое хранится в браузере.
   Подключается после setup.js. Заполненный пример «Школа 3D» остаётся отдельным режимом. */
const blankW = () => ({mode:"own", user:null, co:null, projs:[], cur:null, fun:null, tab:"about", ftab:"an", ctab:"map", wipe:false});
const blankBrand = () => ({colors:"", fonts:"", voice:"", files:[]});
let W = blankW();
try { const s = JSON.parse(localStorage.getItem("rakurs_ws")); if (s && Array.isArray(s.projs)) W = Object.assign(W, s, {wipe:false}); } catch (e) {}
if (CLOUD) W = blankW();   /* с сервером локальная копия не используется */
const accKey = id => "rakurs_acc_" + id;
const accGet = id => { try { const a = JSON.parse(localStorage.getItem(accKey(id))); return a && Array.isArray(a.projs) ? a : null; } catch (e) { return null; } };
/* приводит сохранённые данные к текущей структуре */
function norm(){ W.ctab = W.ctab || "map"; if (W.ctab === "acc") W.ctab = "me";
  if (W.co) { W.co.kb = W.co.kb || []; W.co.paths = W.co.paths || []; W.co.brand = Object.assign(blankBrand(), W.co.brand); W.co.ban = W.co.ban || ""; W.co.tone = W.co.tone || ""; }
  W.projs.forEach(p => { p.kb = p.kb || []; p.exp = p.exp || []; p.kbOff = p.kbOff || []; const b = p.brand = Object.assign(blankBrand(), p.brand); if (b.own == null) b.own = !!(b.colors || b.fonts || b.voice); (p.funnels || []).forEach(f => { f.ch = f.ch || []; f.sale = f.sale || p.sale || "web"; }); }); }
norm();
if (location.hash === "#sample") { W.mode = "sample"; location.hash = "today"; }
const save = () => { if (CLOUD) return cloudQueue(); try { localStorage.setItem("rakurs_ws", JSON.stringify(W)); if (W.user) localStorage.setItem(accKey(W.user.id), JSON.stringify(Object.assign({}, W, {mode:"own", wipe:false}))); } catch (e) {} };
const own = () => W.mode !== "sample";
const P = () => W.projs.find(p => p.id === W.cur);
const F = () => { const p = P(); return p && p.funnels.find(f => f.id === W.fun); };
const uid = () => Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const TRL = {а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",ё:"e",є:"ye",ж:"zh",з:"z",и:"i",і:"i",ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
const slug = s => String(s || "").toLowerCase().replace(/\.[a-z0-9]{2,4}$/,"").split("").map(c => TRL[c] !== undefined ? TRL[c] : c).join("").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28);
const GEO = {ukraina:"UA",ukrayina:"UA",polsha:"PL",polscha:"PL",kazakhstan:"KZ",germaniya:"DE",nimechchina:"DE",ssha:"US",usa:"US",evropa:"EU",yevropa:"EU",moldova:"MD",litva:"LT",latviya:"LV",estoniya:"EE",chekhiya:"CZ",ispaniya:"ES",italiya:"IT",izrail:"IL",kanada:"CA"};
const geoCode = g => { const first = String(g||"").split(/[,;\/]/)[0], hit = geoFind(first); if (hit) return hit[0]; const w = slug(first); return GEO[w] || (w ? w.slice(0,2).toUpperCase() : ""); };
const UTM = "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&hr_ad={{ad.id}}";
/* Шаблон меток закладывается один раз и наследуется: компания → проект → воронка → запуск. Пустой уровень берёт шаблон уровня выше;
   если не задан нигде — действуют рекомендованные. */
const utmClean = t => String(t || "").replace(/\s+/g, "").replace(/^[?&]+/, "");
const utmOk = t => /^[^=&]+=[^&]*(&[^=&]+=[^&]*)*$/.test(utmClean(t));
const utmLvl = (p, f) => { const hit = [["f", f && f.utm], ["p", p && p.utm], ["co", W.co && W.co.utm]].find(x => utmOk(x[1])); return hit ? {from:hit[0], v:utmClean(hit[1])} : {from:"std", v:UTM}; };
const utmOf = (p, f) => utmLvl(p, f).v;
function utmPanel(lvl){ const p = P(), f = F(), up = lvl === "co" ? {from:"std", v:UTM} : lvl === "p" ? utmLvl(null, null) : utmLvl(p, null), own = utmClean(wget(lvl + ".utm"));
  const who = {std:L("рекомендований","рекомендованный"), co:L("компанії","компании"), p:L("проєкту","проекта")}[up.from];
  return `<div class="panel"><span class="tag">${L("Мітки UTM","Метки UTM")} · ${{co:L("компанія","компания"), p:L("проєкт","проект"), f:L("воронка","воронка")}[lvl]}</span>
    <div class="form">${fld(lvl + ".utm", {co:L("Шаблон міток для всіх проєктів компанії","Шаблон меток для всех проектов компании"), p:L("Свій шаблон міток проєкту","Свой шаблон меток проекта"), f:L("Свій шаблон міток воронки","Свой шаблон меток воронки")}[lvl], {area:2, w:1, ph:up.v})}</div>
    <p class="sub">${own && !utmOk(own) ? `<span class="mterr">${L("Шаблон має вигляд: utm_source=…&utm_campaign=… Поки він записаний не так, діє шаблон рівнем вище.","Шаблон имеет вид: utm_source=…&utm_campaign=… Пока он записан не так, действует шаблон уровнем выше.")}</span> ` : ""}${own ? "" : L("Порожньо — діє шаблон ","Пусто — действует шаблон ") + who + `: <span class="mono">${esc(up.v)}</span>. `}${lvl === "co" ? L("Закладається один раз; проєкт, воронка й окремий запуск можуть мати свій.","Закладывается один раз; у проекта, воронки и отдельного запуска может быть свой.") : L("Заповнюйте, лише якщо тут мітки мають відрізнятися.","Заполняйте, только если здесь метки должны отличаться.")} ${L("Meta сама підставляє","Meta сама подставляет")} <span class="mono">{{campaign.name}}</span>, <span class="mono">{{adset.name}}</span>, <span class="mono">{{ad.name}}</span>, <span class="mono">{{site_source_name}}</span>, <span class="mono">{{placement}}</span>.</p></div>`; }
const root = k => ({co:W.co, p:P(), f:F()}[k]);
const wget = path => path.split(".").reduce((o,k,i)=> i ? (o == null ? "" : o[k]) : root(k), null);
function wset(path, v){ const ks = path.split("."), last = ks.pop(); let o = root(ks[0]); for (let i = 1; i < ks.length; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[last] = v; save(); }
const fld = (path, label, o = {}) => { const id = "w-" + path.replace(/\./g,"-"), v = esc(wget(path));
  return `<div class="field${o.w?" w":""}"><label for="${id}">${label}</label>${o.area ? `<textarea id="${id}" data-w="${path}" rows="${o.area}" placeholder="${esc(o.ph||"")}">${v}</textarea>` : sgWrap(/^(p|co)\./.test(path) ? path.split(".").pop() : "", `<input id="${id}" data-w="${path}" value="${v}" placeholder="${esc(o.ph||"")}"${o.num?' inputmode="decimal"':""}>`, "w:" + path, id, wget(path))}</div>`; };
const optsW = (path, list) => `<div class="opts">${list.map(x=>`<button type="button" class="opt" data-act="wsSet" data-k="${path}" data-v="${x[0]}" aria-pressed="${wget(path)===x[0]}">${x[1]}</button>`).join("")}</div>`;
const stepper = (steps, cur, act) => `<ol class="obst obst--nav" style="grid-template-columns:repeat(${steps.length},minmax(0,1fr))">${steps.map((s,i)=>`<li class="${s[2]?"ok":""}${s[0]===cur?" on":""}"><button type="button" data-act="${act}" data-v="${s[0]}"><i>${i+1}${s[2]?" ✓":""}</i><span>${s[1]}</span></button></li>`).join("")}</ol>`;
/* кабинет ещё грузится: очертания шапки, вкладок и доски вместо пустого экрана; если долго — подсказка */
const skelCab = () => `<div class="skel" role="status"><span class="skel__note">${L("Завантажуємо кабінет…","Загружаем кабинет…")} <span class="skel__late">${L("Довше, ніж зазвичай: перевірте мережу або оновіть сторінку.","Дольше обычного: проверьте сеть или обновите страницу.")}</span></span>
  <div class="skel__head">${sk("110px", 11)}${sk("min(280px,70%)", 28)}</div><div class="row">${[64, 86, 170, 86].map(w => sk(w + "px", 34)).join("")}</div>${sk("min(520px,100%)", 14)}
  <div class="skel__grid" aria-hidden="true">${[1, 2, 3, 4].map(n => `<div>${sk("60%", 11)}${Array(n).fill(sk("100%", 58)).join("")}</div>`).join("")}</div></div>`;
/* пустое состояние: что это, зачем и одна главная кнопка (если действие есть) */
const empty = (t, s, btn) => `<div class="empty"><b>${t}</b><span class="sub">${s}</span>${btn ? `<div class="row">${btn}</div>` : ""}</div>`;
const del = (act, id) => `<button type="button" class="x x--sm" data-act="${act}" data-id="${id}" aria-label="delete">×</button>`;
/* Удаление проекта и воронки — в два нажатия: первое спрашивает, второе (в течение 6 секунд) удаляет.
   Файлы удалённого стираются из хранилища, изменение уходит на сервер сразу, без обычной паузы. */
const DELQ = {k:"", t:0, h:0};
const delOn = k => DELQ.k === k && Date.now() - DELQ.t < 6000;
function delAsk(k){ if (delOn(k)) { DELQ.k = ""; clearTimeout(DELQ.h); return true; } DELQ.k = k; DELQ.t = Date.now(); clearTimeout(DELQ.h); DELQ.h = setTimeout(() => { if (DELQ.k === k) { DELQ.k = ""; render(); } }, 6000); return false; }
const delSure = (act, id, k, text, extra = "") => `<button type="button" class="btn btn--sm${delOn(k) ? " btn--del" : ""}" data-act="${act}" data-id="${id}"${extra}>${delOn(k) ? L("Точно видалити?","Точно удалить?") : text}</button>`;
const del2 = (act, id, k, extra = "") => delOn(k) ? delSure(act, id, k, "", extra) : `<button type="button" class="x x--sm" data-act="${act}" data-id="${id}"${extra} aria-label="${L("Видалити","Удалить")}">×</button>`;
function storedPaths(o, out = []){ if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if ((k === "path" || k === "p") && typeof v === "string" && W.co && W.co.id && v.indexOf(W.co.id + "/") === 0) out.push(v); else storedPaths(v, out); } return out; }
function saveNow(){ save(); if (CLOUD && typeof cloudSync === "function") { clearTimeout(CL.timer); cloudSync(); } }
const PATHS = () => ({web:L("реклама → лендинг → вебінар → бронь → оплата","реклама → лендинг → вебинар → бронь → оплата"),call:L("реклама → лендинг → заявка → дзвінок → оплата","реклама → лендинг → заявка → звонок → оплата"),site:L("реклама → лендинг → оплата","реклама → лендинг → оплата")});

/* ---------- расчёты ---------- */
/* Допродажи (p.tg.ltv, % к первой оплате): клиент приносит больше первого чека — повторные покупки, апсейлы. Потолок лида и бюджет считаются с ними, cap1 — только по первой оплате. */
const ltvK = p => 1 + Math.max(0, +((p.tg || {}).ltv) || 0) / 100;
/* у каждой воронки свои допродажи; пусто — берём из проекта */
const fLtvOwn = f => { const v = (f.tg || {}).ltv; return v != null && v !== "" && isFinite(+v); };
const fLtv = (f, p) => fLtvOwn(f) ? Math.max(0, +f.tg.ltv) : Math.max(0, +((p.tg || {}).ltv) || 0);
const pT = p => { const t = p.tg, k = ltvK(p), rv = t.budget / (t.share/100), pay = rv / (t.check * k), c1 = t.l2b/100*t.b2p/100*t.check*t.share/100; return {rev:rv, pay, leads: pay/(t.b2p/100)/(t.l2b/100), cap: c1 * k, cap1: c1, k, roas:100/t.share}; };
const fT = (f, p) => { const t = f.tg, k = 1 + fLtv(f, p) / 100, rv1 = t.pay * t.check, rv = rv1 * k, bud = rv * p.tg.share/100, leads = t.pay/(t.b2p/100)/(t.l2b/100), c1 = t.l2b/100*t.b2p/100*t.check*p.tg.share/100; return {pay:t.pay, rev:rv, rev1:rv1, bud, leads, cap: c1 * k, cap1: c1, k}; };
const fSegs = (f, p) => p.segs.filter(s => !f.aud.off.includes(s.id)).concat(f.aud.add);
const pChain = p => [["about",L("Опис","Описание"),!!(p.name && p.product)],["aud",L("ЦА","ЦА"),p.segs.length>0],["kb",L("База знань","База знаний"),p.kb.length>0],["goals",L("Цілі","Цели"),p.tg.budget>0],["funnels",L("Воронки","Воронки"),p.funnels.length>0],["conn",L("Підключення","Подключения"),Object.values(p.conn).some(Boolean)],["exp",L("Досвід","Опыт"),(p.exp||[]).length>0]];
const fChain = (f, p) => [["an",L("Анамнез","Анамнез"),!!(f.an.offer && f.tg.check)],["aud",L("ЦА воронки","ЦА воронки"),fSegs(f,p).length>0],["land",L("Лендинги","Лендинги"),f.lands.length>0],["cr",L("Креативи","Креативы"),f.crs.length>=3],["goals",L("Цілі й аналітика","Цели и аналитика"),f.tg.pay>0]];

/* ---------- экраны ---------- */
let PNEW = false;   /* в анамнезе воронки открыта форма своего пути */
const auFresh = () => ({via:"email", step:0, id:"", login:false});
let AU = auFresh();
function vAuth(){
  const link = CLOUD && !RK.code, up = !AU.login, proto = t => `<p class="sub proto">${L("Прототип: ","Прототип: ")}${t}</p>`;
  const agree = `<label class="chk"><input type="checkbox" id="au-ok"><span>${L("Погоджуюся з умовами сервісу та політикою конфіденційності","Соглашаюсь с условиями сервиса и политикой конфиденциальности")}</span></label>`;
  const body = AU.via === "email"
    ? (AU.step === 0
      ? `<div class="field"><label for="au-mail">${L("Електронна пошта","Электронная почта")}</label><input id="au-mail" type="email" inputmode="email" autocomplete="email" placeholder="name@company.com" value="${esc(AU.id)}"></div>
         ${up?agree:""}<div class="row"><button class="btn btn--solid" data-act="wsAuthSend">${link?L("Отримати лист","Получить письмо"):L("Отримати код","Получить код")}</button></div>
         <p class="sub">${link?L("Пароль не потрібен: надішлемо лист із посиланням для входу.","Пароль не нужен: пришлём письмо со ссылкой для входа."):L("Пароль не потрібен: надішлемо шестизначний код підтвердження, він діє 10 хвилин.","Пароль не нужен: пришлём шестизначный код подтверждения, он действует 10 минут.")}</p>`
      : link ? `<p>${L("Лист із посиланням для входу надіслано на ","Письмо со ссылкой для входа отправлено на ")}<b>${esc(AU.id)}</b></p>
         <p class="sub">${L("Відкрийте лист у цьому ж браузері й натисніть на посилання — кабінет відкриється сам. Лист іде до хвилини, перевірте «Спам». Посилання одноразове й діє близько години.","Откройте письмо в этом же браузере и нажмите на ссылку — кабинет откроется сам. Письмо идёт до минуты, проверьте «Спам». Ссылка одноразовая и действует около часа.")}</p>
         <div class="row"><button class="btn btn--solid" data-act="wsAuthResend">${L("Надіслати ще раз","Отправить ещё раз")}</button><button class="btn" data-act="wsAuthBack">${L("Інша пошта","Другая почта")}</button></div>`
      : `<p>${L("Код підтвердження надіслано на ","Код подтверждения отправлен на ")}<b>${esc(AU.id)}</b></p>
         <div class="field"><label for="au-code">${L("Код із листа","Код из письма")}</label><input id="au-code" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="${CLOUD?8:6}" placeholder="••••••"></div>
         <div class="row"><button class="btn btn--solid" data-act="wsAuthCode">${L("Підтвердити","Подтвердить")}</button><button class="btn" data-act="wsAuthBack">${L("Інша пошта","Другая почта")}</button></div>
         ${CLOUD ? `<p class="sub">${L("Лист іде до хвилини, перевірте «Спам». Можна також просто перейти за посиланням із листа.","Письмо идёт до минуты, проверьте «Спам». Можно также просто перейти по ссылке из письма.")}</p>` : proto(L("лист не надсилається, підійдуть будь-які шість цифр.","письмо не отправляется, подойдут любые шесть цифр."))}`)
    : TG() ? `<p>${L("Натисніть кнопку — відкриється вікно Telegram. Підтвердіть вхід, і кабінет відкриється сам. Пошта й пароль не потрібні.","Нажмите кнопку — откроется окно Telegram. Подтвердите вход, и кабинет откроется сам. Почта и пароль не нужны.")}</p>
         <div class="row"><button class="btn btn--solid" data-act="wsTgLogin">${up?L("Продовжити через Telegram","Продолжить через Telegram"):L("Увійти через Telegram","Войти через Telegram")}</button></div>
         <p class="sub">${up?L("Продовжуючи, ви погоджуєтеся з умовами сервісу та політикою конфіденційності. ","Продолжая, вы соглашаетесь с условиями сервиса и политикой конфиденциальности. "):""}${L("Якщо вікно не відкрилося, дозвольте спливні вікна для цього сайту.","Если окно не открылось, разрешите всплывающие окна для этого сайта.")}</p>`
    : CLOUD ? `<p>${L("Вхід через Telegram підключимо наступним кроком: для нього потрібен бот сервісу. Поки що входьте поштою.","Вход через Telegram подключим следующим шагом: для него нужен бот сервиса. Пока входите по почте.")}</p><div class="row"><button class="btn" data-act="wsAuthVia" data-v="email">${L("Увійти поштою","Войти по почте")}</button></div>`
    : (AU.step === 0
      ? `<p class="sub">${L("Вхід через Telegram одразу прив’язує бота: туди він пише розбори й там приймає голосові вказівки.","Вход через Telegram сразу привязывает бота: туда он пишет разборы и там принимает голосовые указания.")}</p>
         <div class="field"><label for="au-tg">${L("Ваш нік у Telegram","Ваш ник в Telegram")}</label><input id="au-tg" placeholder="@username" autocomplete="username" value="${esc(AU.id)}"></div>
         ${up?agree:""}<div class="row"><button class="btn btn--solid" data-act="wsAuthTg">${L("Продовжити через Telegram","Продолжить через Telegram")}</button></div>`
      : `<p>${L("Підтвердьте вхід для ","Подтвердите вход для ")}<b>${esc(AU.id)}</b></p>
         <ul class="steps"><li class="ok">${L("Відкрийте бота сервісу в Telegram","Откройте бота сервиса в Telegram")}</li><li class="on">${L("Натисніть «Start» — бот підтвердить, що це ви","Нажмите «Start» — бот подтвердит, что это вы")}</li><li>${L("Поверніться сюди: кабінет відкриється сам","Вернитесь сюда: кабинет откроется сам")}</li></ul>
         <div class="row"><button class="btn btn--solid" data-act="wsAuthTgOk">${L("Я натиснув Start","Я нажал Start")}</button><button class="btn" data-act="wsAuthBack">${L("Назад","Назад")}</button></div>
         ${proto(L("бота ще немає, вхід підтверджується цією кнопкою.","бота ещё нет, вход подтверждается этой кнопкой."))}`);
  return `<div class="panel vf hero0"><span class="tag">${up?L("Крок 1","Шаг 1"):L("Вхід","Вход")}${AU.step?L(" · підтвердження"," · подтверждение"):""}</span><h1>${up?L("Реєстрація","Регистрация"):L("Вхід у кабінет","Вход в кабинет")}</h1>
    <div class="seg" role="group">${[["email",L("Пошта","Почта")],["tg","Telegram"]].map(x=>`<button type="button" data-act="wsAuthVia" data-v="${x[0]}" aria-pressed="${AU.via===x[0]}">${x[1]}</button>`).join("")}</div>
    ${body}
    <p class="sub">${up?L("Уже є акаунт? ","Уже есть аккаунт? "):L("Ще немає акаунта? ","Ещё нет аккаунта? ")}<button type="button" class="lnk" data-act="wsAuthMode">${up?L("Увійти","Войти"):L("Зареєструватися","Зарегистрироваться")}</button></p></div>
  <div class="row"><button class="btn btn--sm" data-act="wsSample">${L("Подивитися заповнений приклад без реєстрації","Посмотреть заполненный пример без регистрации")}</button></div>`;
}
function vWelcome(){
  return `<div class="panel vf hero0"><span class="tag">${L("Крок 2","Шаг 2")}</span><h1>${L("Як називається компанія?","Как называется компания?")}</h1>
    <p class="sub">${L("Компанія — верхній рівень. У неї може бути кілька проєктів, а в кожному проєкті — свої воронки.","Компания — верхний уровень. У неё может быть несколько проектов, а в каждом проекте — свои воронки.")}</p>
    <div class="field"><label for="co-name">${L("Назва компанії","Название компании")}</label><input id="co-name" placeholder="${L("наприклад, Visual360","например, Visual360")}"></div>
    <div class="field"><label>${L("Хто ви","Кто вы")}</label><div class="opts" id="co-kind">${[["own",L("Своя компанія","Своя компания")],["agency",L("Агентство, ведемо клієнтів","Агентство, ведём клиентов")]].map((x,i)=>`<button type="button" class="opt" data-act="wsKind" data-v="${x[0]}" aria-pressed="${(W.kind||"own")===x[0]}">${x[1]}</button>`).join("")}</div></div>
    <div class="row"><button class="btn btn--solid" data-act="wsCo">${L("Створити компанію","Создать компанию")}</button><button class="btn" data-act="wsSample">${L("Подивитися заповнений приклад","Посмотреть заполненный пример")}</button></div></div>
  <div class="panel"><span class="tag">${L("Як усе влаштовано · приклад","Как всё устроено · пример")}</span>
    ${vMapDemo()}</div>`;
}
/* свои пути продажи компании: переименовать, поправить шаги, удалить, добавить */
function pathsPanel(){
  const own = saleOwn(), adm = canAdmin(), use = id => W.projs.reduce((a, p) => a + p.funnels.filter(f => f.sale === id).length, 0);
  return `<div class="panel"><span class="tag">${L("Свої шляхи продажу","Свои пути продажи")} · ${own.length}</span>
    <div class="hrow">${hint(L("Шляхи, які ви додали самі. Вони є у списку «Як відбувається продаж» кожної воронки компанії. Стандартні шляхи доступні завжди й тут не показані.","Пути, которые вы добавили сами. Они есть в списке «Как происходит продажа» каждой воронки компании. Стандартные пути доступны всегда и здесь не показаны."), "wide")}</div>
    ${own.length ? own.map((x, i) => `<div class="pathrow">${adm ? `<div class="form">${fld("co.paths." + i + ".name", L("Назва","Название"))}${fld("co.paths." + i + ".steps", L("Кроки","Шаги"))}</div>` : `<b>${esc(x.name)}</b><span class="sub">${esc(x.steps)}</span>`}
        <div class="row sp"><span class="sub">${L("Воронок із цим шляхом: ","Воронок с этим путём: ")}${use(x.id)}</span>${adm ? del("wsDelPath", x.id) : ""}</div></div>`).join("")
      : empty(L("Своїх шляхів ще немає","Своих путей пока нет"), L("Додайте тут або під час створення воронки: «Як відбувається продаж» → «+ Свій шлях…».","Добавьте здесь или при создании воронки: «Как происходит продажа» → «+ Свой путь…»."))}
    ${adm ? `<div class="pathrow"><div class="form">${saleNew("kp")}</div><div class="row"><button class="btn btn--sm btn--solid" data-act="wsPathNew">${L("Додати шлях","Добавить путь")}</button></div></div>` : ""}</div>`;
}
function vCompany(){
  const t = W.ctab, tabs = [["map",L("Карта","Карта")],["projects",L("Проєкти","Проекты")],["kb",L("База знань компанії","База знаний компании")],["team",L("Команда","Команда")],["set",L("Налаштування","Настройки")],["me",L("Профіль","Профиль")]];
  const body = {
    map: () => vMap(),
    projects: () => `${W.projs.length ? `<div class="cols">${W.projs.map(p=>{ const ch = pChain(p), done = ch.filter(c=>c[2]).length; return `<div class="panel">
      <div class="row sp"><h2>${esc(p.name)}</h2>${canAdmin()?del2("wsDelP", p.id, "p:" + p.id):""}</div><p class="sub">${esc([p.niche,p.geo].filter(Boolean).join(" · "))}</p>
      <div class="prog"><i style="width:${done/ch.length*100}%"></i></div>
      <dl class="kv"><dt>${L("Заповнено","Заполнено")}</dt><dd class="mono">${done} / ${ch.length}</dd><dt>${L("Воронок","Воронок")}</dt><dd class="mono">${p.funnels.length}</dd><dt>${L("Сегментів ЦА","Сегментов ЦА")}</dt><dd class="mono">${p.segs.length}</dd><dt>${L("Матеріалів","Материалов")}</dt><dd class="mono">${p.kb.length} + ${kbInh(p).length} ${L("з компанії","из компании")}</dd></dl>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenP" data-id="${p.id}">${L("Відкрити","Открыть")}</button></div></div>`; }).join("")}</div>`
     : empty(L("Проєктів ще немає","Проектов ещё нет"), canAdmin() ? L("Проєкт — це окремий продукт зі своєю аудиторією, цілями й воронками. Анкета з шести кроків, пів години.","Проект — это отдельный продукт со своей аудиторией, целями и воронками. Анкета из шести шагов, полчаса.") : L("Проєкти додає власник або керівник лідогенерації. Щойно вам відкриють проєкт, він з’явиться тут.","Проекты добавляет собственник или руководитель лидогенерации. Как только вам откроют проект, он появится здесь."), canAdmin() ? `<button class="btn btn--solid" data-act="modal" data-id="project">${L("Додати проєкт","Добавить проект")}</button>` : "")}
     <div class="row"><button class="btn btn--sm" data-act="wsSample">${L("Заповнений приклад «Школа 3D»","Заполненный пример «Школа 3D»")}</button></div>`,
    kb: () => `${kbMeter()}
      ${kbCols("co")}
      ${brandPanel("co")}
      <div class="panel"><span class="tag">${L("Спільні правила","Общие правила")}</span><div class="form">${fld("co.ban",L("Що не можна обіцяти й казати в жодному проєкті","Что нельзя обещать и говорить ни в одном проекте"),{w:1})}${fld("co.tone",L("Тон компанії","Тон компании"),{w:1})}</div>
        <p class="sub">${L("Додаються до правил кожного проєкту й перевіряються в кожному ролику й тексті.","Добавляются к правилам каждого проекта и проверяются в каждом ролике и тексте.")}</p></div>`,
    team: () => { if (!CLOUD) return `<div class="panel vf"><span class="tag">${L("Команда","Команда")}</span><p>${L("Кілька людей в одній компанії з’являться разом із сервером: кожен входить своєю поштою й бачить ті проєкти, до яких йому дали доступ.","Несколько человек в одной компании появятся вместе с сервером: каждый входит своей почтой и видит те проекты, к которым ему дали доступ.")}</p><p class="sub proto">${L("Прототип: сервер ще не підключено.","Прототип: сервер ещё не подключён.")}</p></div>`;
      const R = ROLES(), link = location.origin + location.pathname, pn = ids => ids ? ids.map(i => (W.projs.find(p=>p.id===i)||{}).name || "—").join(", ") : L("усі проєкти","все проекты");
      return `<div class="tw"><table class="tm"><thead><tr><th>${L("Хто","Кто")}</th><th>${L("Роль","Роль")}</th><th>${L("Доступ","Доступ")}</th><th>${L("Статус","Статус")}</th><th></th></tr></thead><tbody>
        ${CL.members.map(m=>`<tr><td class="mono"><b>${esc(m.label || (TGMAIL.test(m.email) ? "Telegram" : m.email))}</b>${m.email===W.user.id?` <span class="sub">${L("це ви","это вы")}</span>`:""}</td><td>${R[m.role]||esc(m.role)}</td><td>${esc(pn(m.project_ids))}</td><td>${m.user_id?pill("good",L("увійшов","вошёл")):pill("warn",L("запрошений, ще не входив","приглашён, ещё не входил"))}</td><td class="n">${canAdmin()&&!m.user_id&&m.email!==W.user.id?`<button class="btn btn--sm" data-act="wsInvite" data-id="${m.id}">${L("Скопіювати запрошення","Скопировать приглашение")}</button> `:""}${isOwner()&&m.role!=="owner"?del("wsDelMember", m.id):""}</td></tr>`).join("")}</tbody></table></div>
      ${isOwner()?`<div class="panel"><span class="tag">${L("Дати доступ","Дать доступ")}</span><div class="form">
          <div class="field w"><label for="tm-mail">${TG()?L("Пошта або нік у Telegram","Почта или ник в Telegram"):L("Пошта людини","Почта человека")}</label><input id="tm-mail" type="text" inputmode="email" autocapitalize="none" placeholder="${TG()?"name@company.com / @username":"name@company.com"}"></div>
          <div class="field"><label for="tm-role">${L("Роль","Роль")}</label><select id="tm-role"><option value="targetolog">${R.targetolog}</option><option value="lead">${R.lead}</option></select></div>
          <div class="field"><label for="tm-proj">${L("Доступ","Доступ")}</label><select id="tm-proj"><option value="">${L("Усі проєкти компанії","Все проекты компании")}</option>${W.projs.map(p=>`<option value="${p.id}">${L("Тільки «","Только «")}${esc(p.name)}»</option>`).join("")}</select></div></div>
          <div class="row"><button class="btn btn--solid" data-act="wsAddMember">${L("Дати доступ","Дать доступ")}</button></div></div>`:`<p class="sub">${L("Команду змінює власник компанії.","Команду меняет собственник компании.")}</p>`}
      <div class="c2"><div class="panel vf"><span class="tag">${L("Як людина потрапляє в кабінет","Как человек попадает в кабинет")}</span>
          <ol class="nx"><li>${TG()?L("Ви додаєте тут його пошту або нік у Telegram.","Вы добавляете здесь его почту или ник в Telegram."):L("Ви додаєте його пошту тут.","Вы добавляете его почту здесь.")}</li><li>${L("Натискаєте «Скопіювати запрошення» й надсилаєте йому готовий текст.","Нажимаете «Скопировать приглашение» и отправляете ему готовый текст.")}</li><li>${TG()?L("Він входить через Telegram під цим ніком або цією поштою й одразу бачить компанію.","Он входит через Telegram под этим ником или этой почтой и сразу видит компанию."):L("Він входить цією поштою й одразу бачить компанію.","Он входит этой почтой и сразу видит компанию.")}</li></ol>
          <div class="utm"><code>${esc(link)}</code><button class="btn btn--sm" data-act="wsCopyLink">${L("Копіювати","Копировать")}</button></div>
          <p class="sub">${L("Запрошення саме не надсилається — текст передаєте ви. Поки не підключено власний поштовий сервіс, лист для входу може не дійти до людини поза вашою організацією на сервері, тому надійніше запрошувати за ніком у Telegram.","Приглашение само не отправляется — текст передаёте вы. Пока не подключён свой почтовый сервис, письмо для входа может не дойти до человека вне вашей организации на сервере, поэтому надёжнее приглашать по нику в Telegram.")}</p></div>
        <div class="panel"><span class="tag">${L("Що може роль","Что может роль")}</span><dl class="kv"><dt>${R.owner}</dt><dd>${L("усе: команда, компанія, проєкти","всё: команда, компания, проекты")}</dd><dt>${R.lead}</dt><dd>${L("база компанії, створення й видалення проєктів","база компании, создание и удаление проектов")}</dd><dt>${R.targetolog}</dt><dd>${L("редагує проєкти й воронки, до яких має доступ","редактирует проекты и воронки, к которым есть доступ")}</dd></dl></div></div>`; },
    set: () => { const adm = canAdmin(), T = prTh(), num1 = (k, label, unit, tip) => `<div class="field"><label for="st-${k}">${label} ${hint(tip)}</label><div class="row row--u"><input id="st-${k}" class="tin" data-w="co.set.${k}" value="${esc(String((W.co.set || {})[k] == null ? "" : W.co.set[k]))}" placeholder="${PR_DEF[k]}" inputmode="decimal"${adm ? "" : " disabled"}><span class="sub mono">${unit}</span></div></div>`;
      return `<div class="row only-m"><button class="btn btn--sm" data-act="wsCtab" data-v="team">${L("Команда","Команда")} →</button></div><div class="c2 c2--sw"><div class="panel"><span class="tag">${L("Компанія","Компания")}</span>
          <div class="form">${adm ? fld("co.name",L("Назва компанії","Название компании"),{w:1}) : `<p>${esc(W.co.name)}</p>`}</div>
          ${CLOUD?`<dl class="kv"><dt>${L("Ваша роль","Ваша роль")}</dt><dd>${ROLES()[CL.role]||"—"}</dd></dl>`:""}${CLOUD&&CL.cos.length>1?`<span class="tag">${L("Ваші компанії","Ваши компании")}</span>${CL.cos.map(c=>`<div class="row sp"><b>${esc(c.id===W.co.id?W.co.name:c.name)}</b>${c.id===W.co.id?pill("good",L("відкрита","открыта")):`<button class="btn btn--sm" data-act="wsSwitchCo" data-id="${c.id}">${L("Відкрити","Открыть")}</button>`}</div>`).join("")}`:""}
          ${isOwner()?`<div class="row"><button class="btn btn--danger" data-act="wsWipe">${W.wipe?L("Точно видалити все?","Точно удалить всё?"):CLOUD?L("Видалити компанію й дані","Удалить компанию и данные"):L("Видалити акаунт і дані","Удалить аккаунт и данные")}</button></div>`:""}</div>
        <div class="panel"><span class="tag">${L("Висновки на карті","Выводы на карте")} ${hint(L("За цими порогами платформа пише висновки по акаунтах і кампаніях. Порожнє поле — значення за замовчуванням. Стеля ціни ліда рахується з цілей воронки.","По этим порогам платформа пишет выводы по аккаунтам и кампаниям. Пустое поле — значение по умолчанию. Потолок цены лида считается из целей воронки."))}</span>
          <div class="form">
            ${num1("early", L("Рано судити, доки витрачено менше","Рано судить, пока потрачено меньше"), L("стель","потолков"), L("Доки кампанія не витратила стільки стель ціни ліда і не дала 5 лідів, висновок — «рано судити».","Пока кампания не потратила столько потолков цены лида и не дала 5 лидов, вывод — «рано судить»."))}
            ${num1("noLead", L("Витрати без лідів — від","Расход без лидов — от"), L("стель","потолков"), L("Скільки стель можна витратити без жодного ліда, перш ніж це стане проблемою.","Сколько потолков можно потратить без единого лида, прежде чем это станет проблемой."))}
            ${num1("crit", L("Лід дорогий, якщо вище стелі на","Лид дорогой, если выше потолка на"), "%", L("До цієї межі — «трохи вище стелі», далі — «дорожчий за стелю».","До этой границы — «чуть выше потолка», дальше — «дороже потолка»."))}
            ${num1("up", L("Лід подорожчав — від","Лид подорожал — от"), "%", L("Зростання ціни ліда до минулого такого ж періоду.","Рост цены лида к прошлому такому же периоду."))}
            ${num1("ctr", L("CTR падає — від","CTR падает — от"), "%", L("Падіння CTR до минулого періоду, від 1000 показів.","Падение CTR к прошлому периоду, от 1000 показов."))}
            ${num1("top", L("Кампаній під акаунтом на дошці","Кампаний под аккаунтом на доске"), L("шт.","шт."), L("Решта — в панелі акаунта.","Остальные — в панели аккаунта."))}
          </div>${adm ? "" : `<p class="sub">${L("Змінює власник або керівник лідогенерації.","Меняет собственник или руководитель лидогенерации.")}</p>`}</div></div>
        ${typeof rsSetPanel === "function" ? rsSetPanel(adm) : ""}${utmPanel("co")}
        ${pathsPanel()}
        <div class="c2"><div class="panel vf"><span class="tag">${L("Де зберігаються дані","Где хранятся данные")}</span>
          <p>${L("Усе, що ви вводите, зберігається одразу і прив’язане до акаунта: після виходу та входу тим самим способом компанія, проєкти й бази знань на місці.","Всё, что вы вводите, сохраняется сразу и привязано к аккаунту: после выхода и входа тем же способом компания, проекты и базы знаний на месте.")}</p>
          ${CLOUD?`<p class="sub">${L("Дані лежать на сервері: вони доступні з будь-якого пристрою після входу й однакові для всієї команди. Роль у цій компанії: ","Данные лежат на сервере: они доступны с любого устройства после входа и одинаковы для всей команды. Роль в этой компании: ")}<b>${ROLES()[CL.role]||"—"}</b>.</p>`:`<p class="sub proto">${L("Прототип: дані лежать у цьому браузері. На іншому пристрої їх не буде, доки немає сервера, — перенесіть копією.","Прототип: данные лежат в этом браузере. На другом устройстве их не будет, пока нет сервера, — перенесите копией.")}</p>`}
          <div class="row"><button class="btn btn--sm" data-act="wsExport">${L("Завантажити копію","Скачать копию")}</button><button class="btn btn--sm" data-act="wsCopyAll">${L("Скопіювати копію","Скопировать копию")}</button>
            ${CLOUD?"":`<label class="btn btn--sm"><input type="file" hidden accept=".json,application/json" data-wimp="1">${L("Відновити з копії","Восстановить из копии")}</label>`}</div></div></div>`; },
    me: () => { const u = W.user, per = [["t",L("Сьогодні","Сегодня")],["y",L("Вчора","Вчера")],["7","7 " + L("дн.","дн.")],["30","30 " + L("дн.","дн.")],["m",L("Місяць","Месяц")]], th = document.documentElement.dataset.theme || "auto", nh = Object.keys(MP.hide || {}).length;
      const seg = (act, list, cur) => `<span class="seg" role="group">${list.map(x => `<button type="button" data-act="${act}" data-v="${x[0]}" aria-pressed="${String(cur) === x[0]}"${x[2] ? ` aria-label="${x[2]}" title="${x[2]}"` : ""}>${x[1]}</button>`).join("")}</span>`;
      return `<div class="c2"><div class="panel"><span class="tag">${L("Про вас","О вас")}</span>
          <div class="form"><div class="field w"><label for="me-name">${L("Ім’я","Имя")}</label><input id="me-name" data-me="name" value="${esc(ME.name)}" autocomplete="name"></div>
            <div class="field w"><label for="me-title">${L("Посада або роль у команді","Должность или роль в команде")}</label><input id="me-title" data-me="title" value="${esc(ME.title)}" placeholder="${L("таргетолог, маркетолог, власник","таргетолог, маркетолог, собственник")}"></div></div>
          <dl class="kv"><dt>${L("Вхід","Вход")}</dt><dd>${u.via==="tg"?"Telegram":L("Пошта","Почта")} · <span class="mono">${esc(u.name || u.id)}</span></dd>${TG()&&u.via!=="tg"?`<dt>Telegram</dt><dd>${CL.tg?esc(CL.tg.username||CL.tg.name||""):`<button class="btn btn--sm" data-act="wsTgLink">${L("Прив’язати","Привязать")}</button>`}</dd>`:""}${CLOUD?`<dt>${L("Роль у компанії","Роль в компании")}</dt><dd>${ROLES()[CL.role]||"—"}</dd>`:""}</dl>
          <div class="row"><button class="btn" data-act="wsLogout">${L("Вийти","Выйти")}</button></div></div>
        <div class="panel"><span class="tag">${L("Особисті налаштування","Личные настройки")} ${hint(L("Діють лише для вас і не змінюють нічого в колег.","Действуют только для вас и ничего не меняют у коллег."))}</span>
          <dl class="kv kv--set"><dt>${L("Мова","Язык")}</dt><dd><span class="lang" role="group"><button type="button" data-lang="uk" aria-pressed="${lang==="uk"}">UA</button><button type="button" data-lang="ru" aria-pressed="${lang==="ru"}">RU</button></span></dd>
            <dt>${L("Тема","Тема")}</dt><dd>${seg("themeSet", [["light", ICO.sun, L("Світла","Светлая")], ["dark", ICO.moon, L("Темна","Тёмная")], ["auto", "A", L("Як у пристрої","Как в устройстве")]], th)}</dd>
            <dt>${L("Карта відкривається за","Карта открывается за")}</dt><dd>${seg("mePeriod", per, ME.period || "t")}</dd>
            <dt>${L("Режим","Режим")}</dt><dd>${seg("tier", [["lite","Lite"],["pro","Pro"]], S.tier)}</dd>
            ${nh ? `<dt>${L("Сховані картки на карті","Скрытые карточки на карте")}</dt><dd><button class="btn btn--sm" data-act="mapShowAll">${L("Показати всі","Показать все")} · ${nh}</button></dd>` : ""}</dl></div></div>`; },
  }[t]();
  return `<div class="head"><div><span class="tag">${t==="me"?L("Профіль","Профиль"):t==="set"?L("Налаштування компанії","Настройки компании"):W.co.kind==="agency"?L("Агентство","Агентство"):L("Компанія","Компания")}</span><h1>${esc(t==="me" ? ME.name || W.user.name || W.user.id : W.co.name)}</h1></div>
    ${(t==="projects"||t==="map")&&canAdmin()?`<button class="btn btn--solid" data-act="modal" data-id="project">${L("Додати проєкт","Добавить проект")}</button>`:""}</div>
  <div class="seg seg--co" role="group">${tabs.map(x=>`<button type="button" data-act="wsCtab" data-v="${x[0]}" aria-pressed="${t===x[0]}">${x[1]}${x[0]==="kb"&&W.co.kb.length?" · "+W.co.kb.length:""}</button>`).join("")}</div>
  ${body}`;
}
function segList(segs, act, tag){ return segs.length ? `<div class="segs">${segs.map(s=>`<div class="seg3"><div class="row sp"><b>${esc(s.name)}</b><span class="row">${tag?tag(s):""}${del(act, s.id)}</span></div><span class="sub">${esc(s.pain)}</span>${s.say?`<span class="mono">→ ${esc(s.say)}</span>`:""}</div>`).join("")}</div>` : ""; }
function segAdder(pre, act, niche){ return `${segTpl(pre, niche)}<div class="form adder">
    <div class="field"><label for="${pre}-n">${L("Сегмент","Сегмент")}</label><input id="${pre}-n" placeholder="${L("хто це: вік, чим займається","кто это: возраст, чем занимается")}"></div>
    <div class="field"><label for="${pre}-p">${L("Що болить, чому купує","Что болит, почему покупает")}</label><input id="${pre}-p" placeholder="${L("подія або причина","событие или причина")}"></div>
    <div class="field w"><label for="${pre}-s">${L("Що казати в рекламі","Что говорить в рекламе")}</label><input id="${pre}-s" placeholder="${L("головна думка для цього сегмента","главная мысль для этого сегмента")}"></div>
    <div class="row w"><button class="btn btn--sm" data-act="${act}">${L("Додати сегмент","Добавить сегмент")}</button></div></div>`; }
const fileLabel = n => typeof n === "string" ? esc(n) : n.p ? `<button type="button" class="lnk" data-act="fileOpen" data-p="${esc(n.p)}">${esc(n.n)}</button> <small class="sub">${fileSize(n.s || 0)}</small>` : esc(n.n);
/* принимает выбранные файлы: с сервером — загружает и хранит путь, без него — только название */
async function fileIntake(key, files){
  const kb = key.startsWith("kb."), h = kb ? kbHolder(W.cur ? "p" : "co") : null, f = key === "f.crs" ? F() : null, scope = W.cur || "co";
  let list = null; if (!kb && !f) { list = wget(key); if (!Array.isArray(list)) { wset(key, []); list = wget(key); } }
  const res = []; if (CLOUD) { toast(L("Завантажуємо файли: ","Загружаем файлы: ") + files.length + "…"); for (const x of files) res.push(await cloudUpload(x, scope)); }
  files.forEach((x, i) => { const r = res[i] || {}, n = x.name, path = r.path || "";
    if (kb) h.kb.push({id:uid(), type:key.slice(3), title:n.replace(/\.[a-z0-9]{2,5}$/i,""), src:n, note:"", path, size:path ? x.size : 0});
    else if (f) f.crs.push({id:uid(), name:n, slug:slug(n) || "creative_" + (f.crs.length+1), type:/\.(png|jpe?g|webp|gif)$/i.test(n)?"img":"video", hook:"", seg:"", text:"", path, size:path ? x.size : 0});
    else list.push(path ? {n, p:path, s:x.size} : n); });
  save(); render();
  if (CLOUD) { const ok = res.filter(r => r && r.path).length, big = res.filter(r => r && r.err === "big").length, nb = res.some(r => r && r.err === "nobucket"), bad = res.filter(r => r && r.err === "fail").length;
    toast(nb ? L("Сховище файлів ще не ввімкнено на сервері: збережено лише назви","Хранилище файлов ещё не включено на сервере: сохранены только названия")
      : [ok ? L("Завантажено: ","Загружено: ") + ok : "", big ? L("більші за 50 MB, збережено лише назву: ","больше 50 MB, сохранено только название: ") + big : "", bad ? L("не вдалося завантажити: ","не удалось загрузить: ") + bad : ""].filter(Boolean).join(" · ")); }
}
function filesBox(path, hint){ const a = wget(path) || [];
  return `<label class="drop"><input type="file" multiple hidden data-wf="${path}"><b>${L("Додати файли","Добавить файлы")}</b><span class="sub">${hint}</span></label>
    ${a.length?`<div class="chipset">${a.map((n,i)=>`<span class="chip">${fileLabel(n)} <button type="button" class="chipx" data-act="wsDelFile" data-k="${path}" data-id="${i}" aria-label="delete">×</button></span>`).join("")}</div>`:""}`; }
/* тип, где живёт (co — компания, p — проект, both), название, что класть, что бот берёт */
const KBT = () => [
  ["story","co",L("Історія компанії та засновник","История компании и основатель"),L("звідки компанія, чому їй вірять","откуда компания, почему ей верят"),L("сюжети роликів, перший кадр «від першої особи»","сюжеты роликов, первый кадр «от первого лица»"),15],
  ["team","co",L("Команда й експерти","Команда и эксперты"),L("хто веде, досвід, фото","кто ведёт, опыт, фото"),L("обличчя в роликах, підписи експертів","лица в роликах, подписи экспертов"),15],
  ["product","p",L("Продукт і програма","Продукт и программа"),L("що всередині, для кого, який результат","что внутри, для кого, какой результат"),L("факти в текстах, перевірка обіцянок","факты в текстах, проверка обещаний"),25],
  ["faq","p",L("Питання й заперечення","Вопросы и возражения"),L("що питають перед покупкою, що відповідаємо","что спрашивают перед покупкой, что отвечаем"),L("відповіді в текстах і на лендингу, ідеї гіпотез","ответы в текстах и на лендинге, идеи гипотез"),20],
  ["case","both",L("Кейси та відгуки","Кейсы и отзывы"),L("результати учнів або клієнтів із цифрами","результаты учеников или клиентов с цифрами"),L("докази в оголошеннях і на лендингу","доказательства в объявлениях и на лендинге"),20],
  ["video","both",L("Відео","Видео"),L("вебінари, відгуки, запис уроків, бекстейдж","вебинары, отзывы, записи уроков, бэкстейдж"),L("нарізки для креативів, цитати в тексти","нарезки для креативов, цитаты в тексты"),10],
  ["doc","both",L("Документи й посилання","Документы и ссылки"),L("прайс, оферта, презентація, соцмережі","прайс, оферта, презентация, соцсети"),L("факти, реквізити, перевірка формулювань","факты, реквизиты, проверка формулировок"),10]];
const kbHolder = sc => sc === "co" ? W.co : P();
const kbName = t => (KBT().find(k=>k[0]===t) || [0,0,t])[2];
const kbInh = p => W.co.kb.filter(i => !p.kbOff.includes(i.id));
const swatches = str => { const cols = String(str||"").split(/[\s,;]+/).filter(c=>/^#?[0-9a-f]{3,8}$/i.test(c)).map(c=>c[0]==="#"?c:"#"+c); return cols.length?`<div class="sw3">${cols.map(c=>`<span><i style="background:${esc(c)}"></i><em class="mono">${esc(c)}</em></span>`).join("")}</div>`:""; };
function brandPanel(sc, extra){ const b = kbHolder(sc).brand;
  return `<div class="panel"><div class="row sp"><span class="tag">${sc==="co"?L("Айдентика компанії","Айдентика компании"):L("Айдентика проєкту","Айдентика проекта")}</span>${extra||""}</div><div class="form">
    ${fld(sc+".brand.colors",L("Кольори бренду","Цвета бренда"),{ph:"#1E5A4E, #D93A20, #F2C230"})}${fld(sc+".brand.fonts",L("Шрифти","Шрифты"),{ph:"Unbounded, Golos Text"})}
    ${fld(sc+".brand.voice",L("Голос бренду: якими словами говоримо","Голос бренда: какими словами говорим"),{w:1,ph:L("на «ви», без сленгу, коротко","на «вы», без сленга, коротко")})}</div>
    ${swatches(b.colors)}${filesBox(sc+".brand.files", L("Логотип, брендбук, шаблони обкладинок","Логотип, брендбук, шаблоны обложек"))}</div>`; }
const kbItem = (i, right) => `<div class="item"><div class="row sp"><b>${esc(i.title)}</b>${right}</div>${i.src?(i.path?`<span class="mono"><button type="button" class="lnk" data-act="fileOpen" data-p="${esc(i.path)}">${esc(i.src)}</button> <small class="sub">${fileSize(i.size || 0)}</small></span>`:`<span class="mono sub">${esc(i.src)}</span>`):""}${i.note?`<span class="sub">${esc(i.note)}</span>`:""}</div>`;
let KBO = null; /* какой раздел базы раскрыт для добавления */
/* заполненность базы компании: раздел → баллы, всего 100 */
function kbScore(){ const co = W.co, b = co.brand, has = t => co.kb.some(i=>i.type===t);
  const rows = [["brand",L("Айдентика","Айдентика"),20,!!(b.colors||b.fonts||b.voice||(b.files||[]).length)],["rules",L("Спільні правила","Общие правила"),10,!!(co.ban||co.tone)]]
    .concat(KBT().filter(k=>k[1]!=="p").map(k=>[k[0],k[2],k[5],has(k[0])]));
  return {rows, got:rows.filter(r=>r[3]).reduce((a,r)=>a+r[2],0), next:rows.filter(r=>!r[3]).sort((x,y)=>y[2]-x[2])[0]}; }
function kbMeter(){ const m = kbScore(), n = m.next, sec = n && !["brand","rules"].includes(n[0]);
  return `<div class="panel kbm"><div class="row sp"><b class="kbm__n">${m.got}<small> / 100</small></b>${hint(L("Що більше платформа знає про компанію, то менше вигадує: тексти, сюжети й докази беруться з ваших матеріалів. Спільне для всіх проєктів; проєкт може вимкнути зайве.","Чем больше платформа знает о компании, тем меньше придумывает: тексты, сюжеты и доказательства берутся из ваших материалов. Общее для всех проектов; проект может выключить лишнее."))}</div>
    <div class="prog"><i style="width:${m.got}%"></i></div>
    <div class="kbm__s">${m.rows.map(r=>`<span class="${r[3]?"ok":""}">${r[1]}</span>`).join("")}</div>
    ${n ? `<div class="row"><span class="sub">${L("Далі:","Дальше:")}</span>${sec?`<button class="btn btn--sm btn--solid" data-act="kbOpen" data-id="${n[0]}" data-on="1">${n[1]} · +${n[2]}</button>`:`<b>${n[1]} · +${n[2]}</b>`}</div>` : `<p class="good">${L("База повна","База полная")}</p>`}</div>`; }
function kbCols(sc){ const h = kbHolder(sc);
  return `<div class="kbl">${KBT().filter(k=>k[1]===sc||k[1]==="both").map(k=>{ const items = h.kb.filter(i=>i.type===k[0]), on = KBO === k[0];
    return `<div class="kbc${items.length?" ok":""}${on?" on":""}" id="kbc-${k[0]}"><div class="kbc__h"><i class="kbc__m">${items.length || (sc==="co" ? "+"+k[5] : "")}</i>
      <div class="kbc__t"><h3>${k[2]}</h3><p>→ ${k[4]}</p></div>
      <button type="button" class="btn btn--sm btn--ico${items.length?"":" btn--solid"}" data-act="kbOpen" data-id="${k[0]}" aria-expanded="${on}" aria-label="${L("Додати","Добавить")}" title="${L("Додати","Добавить")}">${on?"–":"+"}</button></div>
    ${items.map(i=>kbItem(i, del("wsDelKb", i.id))).join("")}
    ${on ? `<div class="adder"><div class="field"><label for="kb-${k[0]}-t">${L("Назва","Название")}</label><input id="kb-${k[0]}-t" placeholder="${k[3]}"></div><div class="field"><label for="kb-${k[0]}-s">${L("Посилання","Ссылка")}</label><input id="kb-${k[0]}-s" placeholder="https://"></div>
      <div class="field"><label for="kb-${k[0]}-n">${L("Що тут важливе","Что здесь важно")}</label><input id="kb-${k[0]}-n"></div>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsAddKb" data-id="${k[0]}">${L("Додати","Добавить")}</button><label class="btn btn--sm"><input type="file" multiple hidden data-wf="kb.${k[0]}">${L("Файл","Файл")}</label></div></div>` : ""}</div>`; }).join("")}</div>`; }
function kbProject(p){
  const co = W.co, inh = kbInh(p), all = p.kb.concat(inh), has = t => all.some(i=>i.type===t), b = p.brand.own ? p.brand : co.brand, bOk = !!(b.colors || b.fonts || b.voice || (b.files||[]).length);
  const gaps = [[L("Айдентика","Айдентика"),bOk,L("без неї обкладинки й тексти будуть «нічиї»","без неё обложки и тексты будут «ничьи»")],[L("Продукт і програма","Продукт и программа"),has("product")||!!p.product,L("бот не знатиме, що можна обіцяти","бот не будет знать, что можно обещать")],
    [L("Кейси та відгуки","Кейсы и отзывы"),has("case"),L("нема чим доводити в оголошеннях","нечем доказывать в объявлениях")],[L("Відео","Видео"),has("video"),L("нема з чого різати креативи","не из чего резать креативы")],
    [L("Історія чи експерти","История или эксперты"),has("story")||has("team"),L("нема від кого говорити в кадрі","не от кого говорить в кадре")],[L("Питання й заперечення","Вопросы и возражения"),has("faq"),L("гіпотези доведеться вигадувати","гипотезы придётся придумывать")]];
  return `<div class="panel vf"><div class="row sp"><span class="tag">${L("Що бот знає про проєкт","Что бот знает о проекте")}</span><span class="mono sub">${p.kb.length} ${L("своїх","своих")} + ${inh.length} ${L("з компанії","из компании")}</span></div>
      <ul class="steps gaps">${gaps.map(g=>`<li class="${g[1]?"ok":""}"><span><b>${g[0]}</b>${g[1]?"":` <span class="sub">— ${g[2]}</span>`}</span></li>`).join("")}</ul></div>
    ${p.brand.own ? brandPanel("p", `<button class="btn btn--sm" data-act="wsBrandOwn" data-v="0">${L("Повернути айдентику компанії","Вернуть айдентику компании")}</button>`)
      : `<div class="panel"><div class="row sp"><span class="tag">${L("Айдентика · з компанії","Айдентика · из компании")}</span><button class="btn btn--sm" data-act="wsBrandOwn" data-v="1">${L("Своя для цього проєкту","Своя для этого проекта")}</button></div>
          ${bOk ? `${swatches(co.brand.colors)}<dl class="kv">${co.brand.fonts?`<dt>${L("Шрифти","Шрифты")}</dt><dd>${esc(co.brand.fonts)}</dd>`:""}${co.brand.voice?`<dt>${L("Голос","Голос")}</dt><dd>${esc(co.brand.voice)}</dd>`:""}${(co.brand.files||[]).length?`<dt>${L("Файли","Файлы")}</dt><dd class="mono">${co.brand.files.map(esc).join(", ")}</dd>`:""}</dl>`
            : `<p class="sub">${L("У компанії айдентику ще не заповнено.","У компании айдентика ещё не заполнена.")}</p><div class="row"><button class="btn btn--sm" data-act="wsGoCoKb">${L("Заповнити в базі компанії","Заполнить в базе компании")}</button></div>`}</div>`}
    <div class="panel"><div class="row sp"><span class="tag">${L("З бази компанії","Из базы компании")} · ${inh.length} / ${co.kb.length}</span><button class="btn btn--sm" data-act="wsGoCoKb">${L("Відкрити базу компанії","Открыть базу компании")}</button></div>
      ${co.kb.length ? co.kb.map(i=>`<div class="${p.kbOff.includes(i.id)?"dim":""}">${kbItem(Object.assign({}, i, {title:i.title, note:kbName(i.type)+(i.note?" · "+i.note:"")}), `<button type="button" class="sw" data-act="wsKbT" data-id="${i.id}" aria-pressed="${!p.kbOff.includes(i.id)}" aria-label="toggle"></button>`)}</div>`).join("")
        : `<p class="sub">${L("Спільних матеріалів ще немає. Історію компанії, команду й загальні документи зручніше додати один раз там.","Общих материалов ещё нет. Историю компании, команду и общие документы удобнее добавить один раз там.")}</p>`}
      <p class="sub">${L("Вимкніть те, що цьому проєкту не підходить: інший продукт, інша аудиторія.","Выключите то, что этому проекту не подходит: другой продукт, другая аудитория.")}</p></div>
    ${kbCols("p")}`;
}
function vProject(p){
  const ch = pChain(p), t = W.tab, tgt = pT(p);
  const body = {
    about: () => `${typeof abAuto === "function" ? (abAuto(p), "") : ""}<div class="panel">${typeof abHead === "function" ? abHead(p) : `<span class="tag">${L("Про проєкт","О проекте")}</span>`}<div class="form">
        ${fld("p.name",L("Назва проєкту","Название проекта"))}${fld("p.niche",L("Ніша","Ниша"),{ph:L("онлайн-освіта, послуги, товари","онлайн-образование, услуги, товары")})}
        ${fld("p.geo",L("Гео","Гео"),{w:1,ph:L("країни та мови","страны и языки")})}
        ${fld("p.product",L("Що продаємо","Что продаём"),{w:1,ph:L("продукт, тривалість, ціна","продукт, длительность, цена")})}
        ${fld("p.desc",L("Опис проєкту своїми словами","Описание проекта своими словами"),{w:1,area:4,ph:L("для кого, у чому користь, чим відрізняємося від інших","для кого, в чём польза, чем отличаемся от других")})}</div></div>
      <div class="panel"><span class="tag">${L("Правила для реклами","Правила для рекламы")}</span><div class="form">
        ${fld("p.worked",L("Що вже спрацьовувало","Что уже срабатывало"),{w:1})}${fld("p.ban",L("Що не можна обіцяти й казати","Что нельзя обещать и говорить"),{w:1})}${fld("p.tone",L("Тон","Тон"),{w:1})}</div>
        <p class="sub">${L("Ці правила успадковують усі воронки проєкту.","Эти правила наследуют все воронки проекта.")}${W.co.ban||W.co.tone?L(" З компанії додаються: "," Из компании добавляются: ")+esc([W.co.ban,W.co.tone].filter(Boolean).join(" · ")):""}</p></div>
      <div class="panel"><span class="tag">${L("Що де задається","Что где задаётся")}</span>${splitNote(0)}</div>`,
    aud: () => `<div class="panel"><span class="tag">${L("Аудиторія проєкту","Аудитория проекта")} · ${p.segs.length}</span>
        <p class="sub">${L("Базова ЦА на весь проєкт. У кожній воронці її можна звузити або доповнити.","Базовая ЦА на весь проект. В каждой воронке её можно сузить или дополнить.")}</p>
        ${segList(p.segs, "wsDelSeg") || empty(L("Сегментів ще немає","Сегментов ещё нет"), L("Додайте хоча б один нижче.","Добавьте хотя бы один ниже."))}${segAdder("sg", "wsAddSeg", p.niche)}</div>
      <div class="c2"><div class="panel"><span class="tag">${L("Опис покупця","Описание покупателя")}</span>${fld("p.audText",L("Як розповіли б новому менеджеру","Как рассказали бы новому менеджеру"),{area:6})}</div>
        <div class="panel"><span class="tag">${L("Матеріали про аудиторію","Материалы об аудитории")}</span>${filesBox("p.audFiles", L("Портрет клієнта, вивантаження з CRM, записи дзвінків, відгуки","Портрет клиента, выгрузка из CRM, записи звонков, отзывы"))}
          <p class="sub">${L("У прототипі файли лише прикріплюються: сегменти з них бот виділятиме після підключення.","В прототипе файлы только прикрепляются: сегменты из них бот будет выделять после подключения.")}</p></div></div>`,
    kb: () => kbProject(p),
    exp: () => vExp(p),
    goals: () => { const sum = p.funnels.reduce((a,f)=>{ const x = fT(f,p); a.pay+=x.pay; a.rev+=x.rev; a.bud+=x.bud; a.leads+=x.leads; return a; }, {pay:0,rev:0,bud:0,leads:0}), ok = p.funnels.length && Math.abs(sum.rev - tgt.rev) < tgt.rev*0.05;
      const r = (k, tt, u) => `<tr><td>${tt}</td><td class="n"><input class="tin" data-w="p.tg.${k}" value="${p.tg[k]}" inputmode="decimal" aria-label="${tt}"> <span class="sub mono">${u}</span></td></tr>`;
      return `<div class="c2"><div class="panel"><span class="tag">${L("Цільові цифри проєкту","Целевые цифры проекта")}</span><div class="tw tw--in"><table class="tnar"><tbody>
        ${r("budget",L("Рекламний бюджет на місяць","Рекламный бюджет в месяц"),"$")}${r("check",L("Середній чек","Средний чек"),"$")}${r("share",L("Частка маркетингу у виручці","Доля маркетинга в выручке"),"%")}${r("l2b",L("Лід → бронь або домовленість","Лид → бронь или договорённость"),"%")}${r("b2p",L("Бронь → оплата","Бронь → оплата"),"%")}<tr><td>${L("Допродажі за замовчуванням","Допродажи по умолчанию")} ${hint(L("Скільки клієнт приносить понад перший чек: повторні покупки, апсейли, доплати — у відсотках до першої оплати. 50 = клієнт за весь час платить у 1,5 раза більше. Стеля ліда й бюджет зростають на стільки ж. 0 — рахуємо лише першу оплату. Це значення для воронок, де свого немає: у кожної воронки можна вказати своє.","Сколько клиент приносит сверх первого чека: повторные покупки, апсейлы, доплаты — в процентах к первой оплате. 50 = клиент за всё время платит в 1,5 раза больше. Потолок лида и бюджет растут на столько же. 0 — считаем только первую оплату. Это значение для воронок, где своего нет: у каждой воронки можно указать своё."), "wide")}</td><td class="n"><input class="tin" data-w="p.tg.ltv" value="${p.tg.ltv || 0}" inputmode="decimal" aria-label="${L("Допродажі","Допродажи")}"> <span class="sub mono">%</span></td></tr></tbody></table></div></div>
        <div class="panel vf"><span class="tag">${L("Що з цього випливає","Что из этого следует")}</span>${hint(L("Стеля ціни ліда = чек × (1 + допродажі) × лід→бронь × бронь→оплата × частка маркетингу. Окупність = 100 ÷ частка маркетингу.","Потолок цены лида = чек × (1 + допродажи) × лид→бронь × бронь→оплата × доля маркетинга. Окупаемость = 100 ÷ доля маркетинга."))}<div id="w-calc">${calcP(p)}</div></div></div>
      <div class="panel"><div class="row sp"><span class="tag">${L("Зведення по воронках","Свод по воронкам")}</span>${p.funnels.length?(ok?pill("good",L("сходиться з ціллю проєкту","сходится с целью проекта")):pill("warn",L("воронки дають ","воронки дают ")+money(sum.rev)+L(" із "," из ")+money(tgt.rev))):""}</div>
        ${p.funnels.length?`<div class="tw tw--in"><table><thead><tr><th>${L("Воронка","Воронка")}</th><th class="n">${L("План оплат","План оплат")}</th><th class="n">${L("Чек","Чек")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${L("Лідів","Лидов")}</th><th class="n">${L("Стеля ліда","Потолок лида")}</th><th class="n">${L("Виручка","Выручка")}</th></tr></thead><tbody>
          ${p.funnels.map(f=>{ const x = fT(f,p); return `<tr data-act="wsOpenF" data-id="${f.id}" tabindex="0"><td><b>${esc(f.name)}</b></td><td class="n mono">${num(x.pay)}</td><td class="n mono">$${num(f.tg.check)}</td><td class="n mono">${money(x.bud)}</td><td class="n mono">${num(x.leads)}</td><td class="n mono">$${dec(x.cap)}</td><td class="n mono">${money(x.rev)}</td></tr>`; }).join("")}
          <tr class="sum"><td><b>${L("Проєкт","Проект")}</b></td><td class="n mono"><b>${num(sum.pay)}</b></td><td></td><td class="n mono"><b>${money(sum.bud)}</b></td><td class="n mono"><b>${num(sum.leads)}</b></td><td></td><td class="n mono"><b>${money(sum.rev)}</b></td></tr></tbody></table></div>`
          : empty(L("Воронок ще немає","Воронок ещё нет"), L("Цілі воронок зведуться сюди й звіряться з ціллю проєкту.","Цели воронок сведутся сюда и сверятся с целью проекта."), `<button class="btn btn--solid" data-act="modal" data-id="funnel">${L("Додати воронку","Добавить воронку")}</button>`)}
        <p class="sub">${L("Це план. Факт — нижче, у блоці «Факт реклами».","Это план. Факт — ниже, в блоке «Факт рекламы».")}</p></div>
      ${factPanel(p)}
      ${askPanel(p)}
      ${salesPanel(p)}
      ${chSumPanel(p)}`; },
    funnels: () => `${p.funnels.length ? `<div class="row"><button class="btn btn--solid" data-act="modal" data-id="funnel">${L("Додати воронку","Добавить воронку")}</button></div>` : ""}
      ${p.funnels.length?`<div class="cols">${p.funnels.map(f=>{ const c = fChain(f,p), done = c.filter(x=>x[2]).length, x = fT(f,p); return `<div class="panel"><div class="row sp"><h2>${esc(f.name)}</h2>${del2("wsDelF", f.id, "f:" + f.id)}</div><p class="sub">${esc(f.an.offer)}</p><div class="prog"><i style="width:${done/c.length*100}%"></i></div>
        <dl class="kv"><dt>${L("Готовність","Готовность")}</dt><dd class="mono">${done} / ${c.length}</dd><dt>${L("ЦА","ЦА")}</dt><dd class="mono">${fSegs(f,p).length} ${L("сегм.","сегм.")}</dd><dt>${L("Лендингів","Лендингов")}</dt><dd class="mono">${f.lands.length}</dd><dt>${L("Креативів","Креативов")}</dt><dd class="mono">${f.crs.length}</dd><dt>${L("План","План")}</dt><dd class="mono">${num(x.pay)} ${L("оплат","оплат")} · ${money(x.rev)}</dd></dl>
        <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenF" data-id="${f.id}">${L("Відкрити","Открыть")}</button></div></div>`; }).join("")}</div>`
        : empty(L("Воронок ще немає","Воронок ещё нет"), L("Воронка — це один офер з ціною: вебінар, акція, лід-форма. У неї свої сайт, канали трафіку, креативи й цілі.","Воронка — это один оффер с ценой: вебинар, акция, лид-форма. У неё свои сайт, каналы трафика, креативы и цели."), `<button class="btn btn--solid" data-act="modal" data-id="funnel">${L("Додати першу воронку","Добавить первую воронку")}</button>`)}`,
    conn: () => `${MT.open === p.id ? metaGuide(p) : MT.g && MT.g.p === p.id ? guidePanel(p, MT.g.prov) : ""}<div class="hrow">${hint(L("Meta Ads — ключем доступу, Google і TikTok — входом у вікні майданчика. Для Telegram Ads відкритого способу забирати статистику немає: витрати вносяться вручну.","Meta Ads — ключом доступа, Google и TikTok — входом в окне площадки. Для Telegram Ads открытого способа забирать статистику нет: расход вносится вручную."), "wide")}</div>
      ${typeof trPanel === "function" ? trPanel(p) : ""}<div class="conn">${OBCONN().map(c=>{ const v = p.conn[c[0]]; return `<div class="panel"><div class="row sp"><h2>${c[1]}</h2>${c[0]==="meta"&&mtBroken(p)?pill("crit",L("потрібна увага","нужно внимание")):v===1?pill("good",L("підключено","подключено")):v?pill("warn",L("до підключення","к подключению")):pill("mute",L("немає","нет"))}</div>${c[0]==="meta" ? metaCard(p) : AD_FN[c[0]] ? adCard(p, c[0], c[2] + ".") : GUIDES()[c[0]] ? guideCard(p, c[0], c[2] + ".") : `<p class="sub">${c[2]}</p><div class="row"><button class="btn btn--sm" data-act="wsConn" data-id="${c[0]}">${v?L("Прибрати","Убрать"):L("Є, підключити","Есть, подключить")}</button></div>`}</div>`; }).join("")}</div>${sourcesPanel(p)}${utmPanel("p")}`
  }[t]();
  const next = ch.find(c=>!c[2]);
  return `<button class="back" data-act="wsBackP">← ${esc(W.co.name)}</button>
  <div class="head"><div><span class="tag">${L("Проєкт","Проект")}</span><h1>${esc(p.name)}</h1></div>${next&&next[0]!==t?`<button class="btn" data-act="wsTab" data-v="${next[0]}">${L("Наступний крок: ","Следующий шаг: ")}${next[1]}</button>`:""}</div>
  ${stepper(ch, t, "wsTab")}${body}`;
}
const capT = c => "$" + dec(c.cap) + (c.k > 1 ? `<small class="sub"> ${L("перша оплата","первая оплата")} $${dec(c.cap1)}</small>` : "");
function calcP(p){ const c = pT(p); return `<div class="kpis">${[[L("Виручка","Выручка"),money(c.rev)],[L("Оплат","Оплат"),num(c.pay)],[L("Лідів","Лидов"),num(c.leads)],[L("Стеля ліда","Потолок лида"),capT(c)],["ROAS",dec(c.roas)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
  ${typeof geList === "function" ? geList(geProject(p)) : ""}`; }
function calcF(f, p){ const x = fT(f,p); return `<div class="kpis">${[[L("Бюджет","Бюджет"),money(x.bud)],[L("Лідів","Лидов"),num(x.leads)],[L("Оплат","Оплат"),num(x.pay)],[L("Виручка","Выручка"),money(x.rev)],[L("Стеля ліда","Потолок лида"),capT(x)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>${typeof geList === "function" ? geList(geFunnel(f, p)) : ""}`; }
function vFunnel(f, p){
  const ch = fChain(f,p), t = W.ftab, hasConn = Object.values(p.conn).some(Boolean);
  const ready = [[L("Офер і ціна","Оффер и цена"),ch[0][2]],[L("ЦА: хоча б один сегмент","ЦА: хотя бы один сегмент"),ch[1][2]],[L("Лендинг","Лендинг"),ch[2][2]],[L("Креативи: від трьох","Креативы: от трёх"),ch[3][2]],[L("Цілі воронки","Цели воронки"),ch[4][2]],[L("Кабінети позначено до підключення","Кабинеты отмечены к подключению"),hasConn]];
  const camp = [slug(p.name), geoCode(p.geo), slug(f.name), f.goal==="form"?"Form":"Site", "ABO"].filter(Boolean).join("_");
  const body = {
    an: () => `<div class="panel"><span class="tag">${L("Анамнез воронки","Анамнез воронки")}</span><div class="form">
        ${fld("f.name",L("Назва воронки","Название воронки"))}${fld("f.tg.check",L("Ціна, $","Цена, $"),{num:1})}
        <div class="field w"><label>${L("Канали трафіку","Каналы трафика")}</label>${chOpts(p, f)}</div>
        ${fld("f.an.offer",L("Офер: що саме пропонуємо","Оффер: что именно предлагаем"),{w:1,ph:L("безкоштовний урок → курс за $680","бесплатный урок → курс за $680")})}
        ${fld("f.an.promo",L("Акція","Акция"),{ph:L("бонус, знижка — або порожньо","бонус, скидка — или пусто")})}${fld("f.an.until",L("Діє до","Действует до"),{ph:"30.11"})}
        <div class="field w"><label>${L("Ціль реклами","Цель рекламы")}</label>${optsW("f.goal", [["site",L("Конверсія на сайті","Конверсия на сайте")],["form",L("Лід-форма","Лид-форма")]])}</div>
        <div class="field w"><label for="fp-sale">${L("Як відбувається продаж","Как происходит продажа")}</label>${saleSelect("fp-sale", PNEW ? "+" : f.sale, f)}</div>
        ${PNEW ? saleNew("fp") + `<div class="row w"><button class="btn btn--sm btn--solid" data-act="wsPathAdd">${L("Зберегти шлях","Сохранить путь")}</button><button class="btn btn--sm" data-act="wsPathCancel">${L("Скасувати","Отмена")}</button></div>` : ""}
        ${fld("f.an.path",L("Шлях клієнта","Путь клиента"),{w:1})}${fld("f.an.event",L("Результат рахуємо до","Результат считаем до"),{ph:L("оплати","оплаты")})}${fld("f.an.diff",L("Чим відрізняється від інших воронок","Чем отличается от других воронок"))}
        ${fld("f.an.obj",L("Заперечення, які чують менеджери","Возражения, которые слышат менеджеры"),{w:1,area:3})}
        <div class="field w"><label>${L("Режим автономії","Режим автономии")}</label>${optsW("f.mode", [["adv",modeName("adv")],["btn",modeName("btn")],["auto",modeName("auto")]])}</div></div>
        <p class="sub">${L("Тон і заборонені формулювання успадковано з проєкту: ","Тон и запрещённые формулировки унаследованы из проекта: ")}${esc([p.ban, W.co.ban].filter(Boolean).join(" · ") || "—")}. ${L("Бот бере матеріали з бази знань проєкту й компанії: ","Бот берёт материалы из базы знаний проекта и компании: ")}${p.kb.length} + ${kbInh(p).length}.</p></div>`,
    aud: () => `<div class="panel"><span class="tag">${L("Сегменти з проєкту","Сегменты из проекта")}</span><p class="sub">${L("Вимкніть ті, на кого ця воронка не розрахована.","Выключите тех, на кого эта воронка не рассчитана.")}</p>
        ${p.segs.length?`<div class="segs">${p.segs.map(s=>`<div class="seg3${f.aud.off.includes(s.id)?" off":""}"><div class="row sp"><b>${esc(s.name)}</b><button type="button" class="sw" data-act="wsSegT" data-id="${s.id}" aria-pressed="${!f.aud.off.includes(s.id)}" aria-label="toggle"></button></div><span class="sub">${esc(s.pain)}</span></div>`).join("")}</div>`:empty(L("У проєкті ще немає сегментів","В проекте ещё нет сегментов"),L("Базову аудиторію задають у проєкті — її успадкують усі воронки. Сегмент лише для цієї воронки можна додати нижче.","Базовую аудиторию задают в проекте — её унаследуют все воронки. Сегмент только для этой воронки можно добавить ниже."), `<button class="btn" data-act="wsTab" data-v="aud">${L("Відкрити ЦА проєкту","Открыть ЦА проекта")}</button>`)}</div>
      <div class="panel"><span class="tag">${L("Тільки для цієї воронки","Только для этой воронки")} · ${f.aud.add.length}</span>${segList(f.aud.add, "wsDelFSeg")}${segAdder("fs", "wsAddFSeg", p.niche)}</div>
      <div class="panel">${fld("f.aud.note",L("Чим аудиторія цієї воронки відрізняється","Чем аудитория этой воронки отличается"),{area:3,ph:L("наприклад: тільки ті, хто вже був на вебінарі","например: только те, кто уже был на вебинаре")})}</div>`,
    land: () => `<div class="panel"><span class="tag">${L("Лендинги","Лендинги")} · ${f.lands.length}</span>
        ${f.lands.map(l=>`<div class="item"><div class="row sp"><b class="mono">${esc(l.url)}</b>${del("wsDelLand", l.id)}</div>${l.note?`<span class="sub">${esc(l.note)}</span>`:""}
          <div class="utm"><code>${esc(l.url)}${l.url.includes("?")?"&":"?"}${esc(utmOf(p, f))}</code><button class="btn btn--sm" data-act="wsCopy" data-id="${l.id}">${L("Копіювати","Копировать")}</button></div></div>`).join("") || empty(L("Лендингів ще немає","Лендингов ещё нет"), L("Додайте сторінку, на яку веде реклама.","Добавьте страницу, на которую ведёт реклама."))}
        <div class="form adder"><div class="field"><label for="ld-u">URL</label><input id="ld-u" placeholder="example.com/urok"></div><div class="field"><label for="ld-n">${L("Що на сторінці, для кого","Что на странице, для кого")}</label><input id="ld-n"></div><div class="row w"><button class="btn btn--sm" data-act="wsAddLand">${L("Додати лендинг","Добавить лендинг")}</button></div></div>
        <p class="sub">${L("Посилання для реклами збирається з єдиними мітками: назви кампанії, групи й оголошення підставляє майданчик.","Ссылка для рекламы собирается с едиными метками: названия кампании, группы и объявления подставляет площадка.")}</p></div>
      ${utmPanel("f")}`,
    cr: () => { const segs = fSegs(f,p);
      return `<div class="panel"><span class="tag">${L("Креативи й тексти","Креативы и тексты")} · ${f.crs.length}</span>
        ${f.crs.length?`<div class="tw tw--in"><table><thead><tr><th>${L("Назва в UTM","Название в UTM")}</th><th>${L("Тип","Тип")}</th><th>${L("Перший кадр або думка","Первый кадр или мысль")}</th><th>${L("Сегмент","Сегмент")}</th><th>${L("Текст","Текст")}</th><th></th></tr></thead><tbody>
          ${f.crs.map(c=>`<tr><td class="mono"><b>${esc(c.slug)}</b>${c.name&&c.name!==c.slug?`<small class="pl">${c.path?`<button type="button" class="lnk" data-act="fileOpen" data-p="${esc(c.path)}">${esc(c.name)}</button>`:esc(c.name)}</small>`:""}</td><td>${c.type==="img"?L("статика","статика"):L("відео","видео")}</td><td>${esc(c.hook)}</td><td>${esc((segs.find(s=>s.id===c.seg)||{}).name || "—")}</td><td class="sub">${esc(c.text)}</td><td class="n">${del("wsDelCr", c.id)}</td></tr>`).join("")}</tbody></table></div>`
          : empty(L("Креативів ще немає","Креативов ещё нет"), L("Для тесту гіпотез потрібно щонайменше три: різні перші кадри або різні сегменти.","Для теста гипотез нужно минимум три: разные первые кадры или разные сегменты."))}
        <div class="form adder"><div class="field"><label for="cr-n">${L("Назва","Название")}</label><input id="cr-n" placeholder="priglos_v1"></div>
          <div class="field"><label for="cr-t">${L("Тип","Тип")}</label><select id="cr-t"><option value="video">${L("Відео","Видео")}</option><option value="img">${L("Статика","Статика")}</option></select></div>
          <div class="field"><label for="cr-h">${L("Перший кадр або головна думка","Первый кадр или главная мысль")}</label><input id="cr-h"></div>
          <div class="field"><label for="cr-s">${L("Для якого сегмента","Для какого сегмента")}</label><select id="cr-s"><option value="">—</option>${segs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
          <div class="field w"><label for="cr-x">${L("Текст оголошення","Текст объявления")}</label><textarea id="cr-x" rows="2"></textarea></div>
          <div class="row w"><button class="btn btn--sm" data-act="wsAddCr">${L("Додати креатив","Добавить креатив")}</button></div></div>
        <label class="drop"><input type="file" multiple hidden data-wf="f.crs" accept="video/*,image/*"><b>${L("Або додати файлами","Или добавить файлами")}</b><span class="sub">${L("Кожен файл стане рядком; назву буде переведено в латиницю, бо вона йде в UTM.","Каждый файл станет строкой; название будет переведено в латиницу, потому что оно уходит в UTM.")}</span></label></div>`; },
    goals: () => { const r = (k, tt, u) => `<tr><td>${tt}</td><td class="n"><input class="tin" data-w="f.tg.${k}" value="${f.tg[k]}" inputmode="decimal" aria-label="${tt}"> <span class="sub mono">${u}</span></td></tr>`;
      return `<div class="c2"><div class="panel"><span class="tag">${L("Цілі воронки","Цели воронки")}</span><div class="tw tw--in"><table class="tnar"><tbody>
        ${r("pay",L("План оплат на місяць","План оплат в месяц"),"")}${r("check",L("Чек","Чек"),"$")}${r("l2b",L("Лід → бронь","Лид → бронь"),"%")}${r("b2p",L("Бронь → оплата","Бронь → оплата"),"%")}<tr><td>${L("Допродажі після першої оплати","Допродажи после первой оплаты")} ${hint(L("Скільки клієнт цієї воронки приносить понад перший чек, у % до першої оплати. Порожньо — беремо з цілей проєкту (","Сколько клиент этой воронки приносит сверх первого чека, в % к первой оплате. Пусто — берём из целей проекта (") + (+p.tg.ltv || 0) + "%).", "wide")}</td><td class="n"><input class="tin" data-w="f.tg.ltv" value="${fLtvOwn(f) ? f.tg.ltv : ""}" placeholder="${+p.tg.ltv || 0}" inputmode="decimal" aria-label="${L("Допродажі","Допродажи")}"> <span class="sub mono">%</span></td></tr></tbody></table></div>
        <p class="sub">${L("Конверсії взято з проєкту — змініть, якщо у цієї воронки вони інші. Частка маркетингу спільна: ","Конверсии взяты из проекта — измените, если у этой воронки они другие. Доля маркетинга общая: ")}${p.tg.share}%.</p></div>
        <div class="panel vf"><span class="tag">${L("План воронки","План воронки")}</span><div id="w-calc">${calcF(f,p)}</div></div></div>
      ${chPlanPanel(f, p)}
      ${typeof fxMatchPanel === "function" ? fxMatchPanel(p, f) : ""}
      ${factPanel(p, f)}
      ${typeof trReport === "function" ? trReport(p, f) : ""}
      <div class="panel"><span class="tag">${L("Аналітика","Аналитика")}</span>
        <div class="tw tw--in"><table><thead><tr><th>${L("Показник","Показатель")}</th><th class="n">${L("Ціль","Цель")}</th><th class="n">${L("Факт","Факт")}</th></tr></thead><tbody>
        ${(()=>{ const x = fT(f,p); return [[L("Витрати","Расход"),money(x.bud)],[L("Ліди","Лиды"),num(x.leads)],[L("Ціна ліда","Цена лида"),"≤ $"+dec(x.cap)],[L("Лід → бронь","Лид → бронь"),pc(f.tg.l2b)],[L("Бронь → оплата","Бронь → оплата"),pc(f.tg.b2p,0)],[L("Оплати","Оплаты"),num(x.pay)],[L("Виручка","Выручка"),money(x.rev)],["ROAS",dec(100/p.tg.share)]].map(a=>`<tr><td>${a[0]}</td><td class="n mono">${a[1]}</td><td class="n mono sub">—</td></tr>`).join(""); })()}</tbody></table></div>
        <div class="hrow">${hint(L("Факт рахується за датою вебінару й до оплати. З’явиться після першого запуску; як це виглядає — у заповненому прикладі.","Факт считается по дате вебинара и до оплаты. Появится после первого запуска; как это выглядит — в заполненном примере."), "wide")}</div></div>`; }
  }[t]();
  return `<button class="back" data-act="wsBackF">← ${esc(p.name)}</button>
  <div class="head"><div><span class="tag">${L("Воронка","Воронка")}</span><h1>${esc(f.name)}</h1><p class="sub">${esc(f.an.offer)}</p></div></div>
  ${stepper(ch, t, "wsFtab")}${body}
  <div class="panel vf"><div class="row sp"><span class="tag">${L("Готовність до запуску","Готовность к запуску")} · ${ready.filter(r=>r[1]).length} / ${ready.length}</span></div>
    <ul class="steps">${ready.map(r=>`<li class="${r[1]?"ok":""}">${r[0]}</li>`).join("")}</ul>
    <p class="sub">${L("Назва кампанії буде такою: ","Название кампании будет таким: ")}<span class="mono">${esc(camp)}</span>. ${L("Кампанія збирається вимкненою, вмикає людина.","Кампания собирается выключенной, включает человек.")}</p></div>
  ${rsPanel(p, f)}
  ${askPanel(p, f)}
  ${bdPanel(f, p)}`;
}
function modalFunnelOwn(){ const p = P();
  return `<div class="ob"><div class="row sp"><div><span class="tag">${esc(p.name)}</span><h1>${L("Нова воронка","Новая воронка")}</h1></div><button class="x" data-act="closeOverlay" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="form"><div class="field w"><label for="nf-name">${L("Назва","Название")}</label><input id="nf-name" placeholder="${L("Вебінар, повна ціна","Вебинар, полная цена")}"></div>
      <div class="field w"><label for="nf-offer">${L("Офер: що пропонуємо","Оффер: что предлагаем")}</label><input id="nf-offer" placeholder="${L("безкоштовний урок → курс","бесплатный урок → курс")}"></div>
      <div class="field"><label for="nf-price">${L("Ціна, $","Цена, $")}</label><input id="nf-price" value="${p.tg.check}" inputmode="decimal"></div>
      <div class="field"><label for="nf-goal">${L("Ціль реклами","Цель рекламы")}</label><select id="nf-goal"><option value="site">${L("Конверсія на сайті","Конверсия на сайте")}</option><option value="form">${L("Лід-форма","Лид-форма")}</option></select></div>
      <div class="field w"><label for="nf-sale">${L("Як відбувається продаж","Как происходит продажа")}</label>${saleSelect("nf-sale", p.sale || "web")}</div>
      ${saleNew("nf", true)}
      <div class="field w"><label for="nf-url">${L("Сайт: лендинг цієї воронки","Сайт: лендинг этой воронки")}</label><input id="nf-url" inputmode="url" autocapitalize="none" placeholder="example.com/page"></div>
      <div class="w chkf"><span class="tag">${L("Канали трафіку","Каналы трафика")}</span><div class="chks">${CHAN().map(c=>`<label class="chk"><input type="checkbox" class="nf-ch" value="${c[0]}"${p.conn[c[0]]?" checked":""}><span>${c[1]}</span></label>`).join("")}</div></div></div>
    <div class="hrow">${hint(L("З проєкту успадкуються ЦА, правила й конверсії. Аудиторію можна правити всередині воронки: вимкнути сегменти проєкту й додати свої.","Из проекта унаследуются ЦА, правила и конверсии. Аудиторию можно править внутри воронки: выключить сегменты проекта и добавить свои."), "wide")}</div>
    ${splitNote(1)}
    <div class="row"><button class="btn btn--solid" data-act="createFunnel">${L("Створити воронку","Создать воронку")}</button></div></div>`; }
function ownAudStep(o){ return `<p class="sub">${L("Хто купує. Можна додати зараз або пізніше в проєкті; у воронках аудиторію можна звужувати.","Кто покупает. Можно добавить сейчас или позже в проекте; в воронках аудиторию можно сужать.")}</p>
  ${segList(o.segsOwn, "obSegDel")}${segAdder("os", "obSegAdd", o.d.niche)}`; }

/* ---------- оболочка ---------- */
/* нижняя навигация на телефоне: разделы компании под большим пальцем; разделы проекта остаются полосой сверху */
const TBI = {
  map:'<rect x="1.5" y="8" width="4" height="4"/><path d="M5.5 10h3M8.5 5v10M8.5 5h3M8.5 15h3"/><rect x="11.5" y="3" width="6" height="4"/><rect x="11.5" y="13" width="6" height="4"/>',
  projects:'<path d="M2.5 5h5l1.5 2h8.5v9h-15z"/>',
  kb:'<path d="M4 3.5h10.5A1.5 1.5 0 0 1 16 5v11.5H5.5A1.5 1.5 0 0 1 4 15z"/><path d="M4 15a1.5 1.5 0 0 1 1.5-1.5H16"/>',
  team:'<circle cx="7.5" cy="7" r="2.5"/><path d="M2.5 16c.5-3 2.4-4.5 5-4.5s4.5 1.5 5 4.5"/><circle cx="14" cy="7.5" r="2"/><path d="M14.5 11.6c1.7.3 2.7 1.7 3 4.4"/>',
  set:'<path d="M3 5.5h8M15 5.5h2M3 10h2M9 10h8M3 14.5h8M15 14.5h2"/><circle cx="13" cy="5.5" r="2"/><circle cx="7" cy="10" r="2"/><circle cx="13" cy="14.5" r="2"/>',
  me:'<circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="8" r="2.5"/><path d="M5 15.3c1-2.1 2.7-3.1 5-3.1s4 1 5 3.1"/>'};
function tabBar(){
  let tb = $("tabbar"); if (!tb) { tb = document.createElement("nav"); tb.id = "tabbar"; tb.className = "tabbar"; document.body.appendChild(tb); }
  const on = own() && !!W.user && !!W.co && !(CLOUD && (!CL.ready || CL.entering)); tb.hidden = !on; document.body.classList.toggle("has-tabbar", on); if (!on) { tb.innerHTML = ""; return; }
  tb.setAttribute("aria-label", L("Розділи компанії","Разделы компании"));
  const cur = P() ? "projects" : W.ctab;
  tb.innerHTML = [["map",L("Карта","Карта")],["projects",L("Проєкти","Проекты")],["kb",L("База","База")],["set",L("Налашт.","Настройки")],["me",L("Профіль","Профиль")]].map(x =>
    `<button type="button" data-act="wsCtab" data-v="${x[0]}"${cur === x[0] ? ' aria-current="page"' : ""}><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${TBI[x[0]]}</svg><span>${x[1]}</span></button>`).join("");
}
function ownShell(){
  const p = P(), f = F(), nb = (act, v, t, on) => `<a role="button" tabindex="0" data-act="${act}" data-v="${v}" ${on?'aria-current="page"':""}>${t}</a>`;
  $("rail").innerHTML = `<a class="logo" href="index.html">${brandLogo("rail")}</a>
    ${W.user&&W.co?`<button type="button" class="ws" data-act="wsBackP"><small>${L("Компанія","Компания")}</small><b>${esc(W.co.name)}</b></button>
    <nav class="navg navg--co"><span>${L("Компанія","Компания")}</span>${nb("wsCtab","map",L("Карта","Карта"),!p&&W.ctab==="map")}${nb("wsCtab","projects",L("Проєкти","Проекты")+(W.projs.length?` <b class="cnt">${W.projs.length}</b>`:""),!p&&W.ctab==="projects")}${nb("wsCtab","kb",L("База знань","База знаний")+(W.co.kb.length?` <b class="cnt">${W.co.kb.length}</b>`:""),!p&&W.ctab==="kb")}${nb("wsCtab","team",L("Команда","Команда"),!p&&W.ctab==="team")}${nb("wsCtab","set",L("Налаштування","Настройки"),!p&&W.ctab==="set")}</nav>`:""}
    ${W.user&&p?`<nav class="navg"><span>${esc(p.name)}</span>${pChain(p).map(c=>nb("wsTab",c[0],c[1]+(c[2]?"":" <em>·</em>"),!f&&W.tab===c[0])).join("")}</nav>`:""}
    ${W.user&&f?`<nav class="navg"><span>${esc(f.name)}</span>${fChain(f,p).map(c=>nb("wsFtab",c[0],c[1]+(c[2]?"":" <em>·</em>"),W.ftab===c[0])).join("")}</nav>`:""}
    <div class="rail__foot">${W.user&&W.co?`<button type="button" class="me me--btn" data-act="wsCtab" data-v="me"${!p&&W.ctab==="me"?' aria-current="page"':""} title="${L("Профіль","Профиль")}"><b>${esc(ME.name || W.user.name || W.user.id)}</b><small>${esc(ME.title || (ME.name ? W.user.name || W.user.id : L("профіль","профиль")))}</small></button>`:""}
      <div class="rail__ico"><button type="button" class="ib" data-act="theme" aria-label="${L("Тема: світла / темна","Тема: светлая / тёмная")}" title="${L("Тема: світла / темна","Тема: светлая / тёмная")}">${isDark() ? ICO.moon : ICO.sun}</button>${W.user?`<button type="button" class="ib" data-act="wsLogout" aria-label="${L("Вийти","Выйти")}" title="${L("Вийти","Выйти")}">${ICO.exit}</button>`:""}<a href="index.html" title="${L("На сайт","На сайт")}">← ${L("сайт","сайт")}</a></div></div>`;
  $("bar").innerHTML = `<span class="crumb">${[W.co&&W.co.name, p&&p.name, f&&f.name].filter(Boolean).map(esc).join(" › ") || (W.user?L("Нова компанія","Новая компания"):L("Реєстрація","Регистрация"))}</span><span id="sync" role="status">${CLOUD ? cloudBadgeHTML() : `<span class="badge">${L("прототип · дані у браузері","прототип · данные в браузере")}</span>`}</span>
    <div class="bar__r"><div class="seg tier" role="group" aria-label="${L("Режим","Режим")}"><button type="button" data-act="tier" data-v="lite" aria-pressed="${S.tier==="lite"}">Lite</button><button type="button" data-act="tier" data-v="pro" aria-pressed="${S.tier==="pro"}">Pro</button></div><div class="lang" role="group" aria-label="${L("Мова","Язык")}"><button type="button" data-lang="uk" aria-pressed="${lang==="uk"}">UA</button><button type="button" data-lang="ru" aria-pressed="${lang==="ru"}">RU</button></div></div>`;
  $("frozen").hidden = true; $("fab").hidden = true; document.documentElement.lang = lang;
}
function ownView(){ const p = P(), f = F(); if (CLOUD && (!CL.ready || CL.entering || CL.opening)) return skelCab(); return !W.user ? vAuth() : !W.co ? vWelcome() : !p ? vCompany() : f ? vFunnel(f, p) : vProject(p); }
let ownKey = "";
const _rs = renderShell, _rv = renderView, _ra = renderAsst, _mf = modalFunnel;
renderShell = function(){ tabBar(); if (own()) ownShell(); else { _rs(); const ft = document.querySelector(".rail__foot"); if (ft) ft.insertAdjacentHTML("afterbegin", `<button type="button" data-act="wsOwn">← ${L("Моя компанія","Моя компания")}</button>`); } };
renderView = function(){ if (!own()) return _rv(); const v = $("view"), k = [W.cur, W.fun, W.tab, W.ftab, W.ctab, !!W.co, !!W.user, AU.via, AU.step, AU.login].join("|"), same = k === ownKey, pop = !!v.querySelector(".mpop");
  /* тот же экран: прокрутка окна карточки, доски, списка и таблиц сохраняется, окно не «въезжает» заново */
  const kept = same ? KEEP_SCROLL.map(q => [...v.querySelectorAll(q)].map(e => [e.scrollTop, e.scrollLeft])) : null;
  v.innerHTML = ownView();
  if (kept) KEEP_SCROLL.forEach((q, i) => [...v.querySelectorAll(q)].forEach((e, j) => { const x = kept[i][j]; if (x) { e.scrollTop = x[0]; e.scrollLeft = x[1]; } }));
  if (same && pop) { const m = v.querySelector(".mpop"); if (m) m.classList.add("mpop--still"); }
  if (!same) { enter(v); ownKey = k; window.scrollTo(0,0); } };
renderAsst = function(){ if (own()) { $("asst").hidden = true; $("fab").hidden = true; return; } _ra(); };
modalFunnel = function(){ return own() ? modalFunnelOwn() : _mf(); };

/* ---------- действия ---------- */
function authDone(via, id){ const acc = accGet(id), had = !!acc;
  if (acc) W = Object.assign(blankW(), acc, {user:{via, id}, mode:"own", wipe:false}); else W = Object.assign(W.co ? W : blankW(), {user:{via, id}});
  norm(); AU = auFresh(); save(); toast(had ? L("З поверненням. Дані на місці","С возвращением. Данные на месте") : L("Підтверджено. Тепер компанія","Подтверждено. Теперь компания")); }
const authGate = id => { const has = !!accGet(id);
  if (AU.login && !has) { toast(L("Такого акаунта на цьому пристрої немає. Зареєструйтесь","Такого аккаунта на этом устройстве нет. Зарегистрируйтесь")); return false; }
  if (!AU.login && has) { AU.login = true; toast(L("Такий акаунт уже є — входимо","Такой аккаунт уже есть — входим")); }
  return true; };
const val = id => { const e = $(id); return e ? e.value.trim() : ""; };
/* Ошибка показывается у самого поля: красная рамка, текст под полем, фокус в поле. Пропадает, как только человек начал исправлять.
   Если поля с таким id на экране нет, остаётся всплывающее сообщение. */
function fieldErr(id, t){ const e = id && document.getElementById(id); if (!e) { toast(t); return; }
  const box = e.closest(".field") || e.closest(".chk") || e.parentNode; fieldOk(e);
  e.setAttribute("aria-invalid", "true"); const m = document.createElement("span"); m.className = "ferr"; m.setAttribute("role", "alert"); m.id = id + "-err"; m.textContent = t; e.setAttribute("aria-describedby", m.id);
  if (box.classList && box.classList.contains("chk")) box.insertAdjacentElement("afterend", m); else box.appendChild(m);
  try { e.focus({preventScroll:true}); e.scrollIntoView({block:"nearest"}); } catch (x) {} }
function fieldOk(e){ if (!e || !e.getAttribute || !e.getAttribute("aria-invalid")) return; e.removeAttribute("aria-invalid"); const m = document.getElementById(e.id + "-err"); if (m) m.remove(); e.removeAttribute("aria-describedby"); }
document.addEventListener("input", e => fieldOk(e.target));
document.addEventListener("change", e => fieldOk(e.target));
const need = (v, t, id) => { if (!v) { fieldErr(id, t); return false; } return true; };
const _mod = ACT.modal, _cp = ACT.createProject, _cf = ACT.createFunnel, _oc = ACT.obConn, _on = ACT.obNav;
Object.assign(ACT, {
  /* анкета проекта не теряется, если окно закрыли случайно: при повторном открытии продолжаем с того же места */
  modal(d){ if (own() && d.id === "project" && S.ob && String(S.ob.d.name || "").trim()) { S.modal = "project"; S.asst.open = false; S.ob.resumed = true; return; } return _mod(d); },
  obReset(){ S.ob = obFresh(); },
  wsAuthVia(d){ AU.via = d.v; AU.step = 0; AU.id = ""; },
  wsAuthMode(){ AU.login = !AU.login; AU.step = 0; },
  wsAuthBack(){ AU.step = 0; },
  wsAuthResend(){ if (CLOUD && AU.id) cloudSendCode(AU.id); return false; },
  wsAuthSend(){ const m = val("au-mail").toLowerCase(); if (!need(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m), L("Перевірте адресу пошти","Проверьте адрес почты"), "au-mail")) return false;
    if (CLOUD) { if (!AU.login && !need($("au-ok").checked, L("Потрібна згода з умовами","Нужно согласие с условиями"), "au-ok")) return false; cloudSendCode(m); return false; }
    if (!authGate(m)) return false; if (!AU.login && !need($("au-ok").checked, L("Потрібна згода з умовами","Нужно согласие с условиями"), "au-ok")) return false; AU.id = m; AU.step = 1; },
  wsAuthCode(){ if (CLOUD) { const c = val("au-code"); if (!need(/^\d{6,8}$/.test(c), L("Введіть код із листа","Введите код из письма"), "au-code")) return false; cloudVerify(c); return false; }
    if (!need(/^\d{6}$/.test(val("au-code")), L("Код — шість цифр","Код — шесть цифр"), "au-code")) return false; authDone("email", AU.id); },
  wsAuthTg(){ if (CLOUD) return false; const u = val("au-tg").replace(/^@+/, ""); if (!need(/^[A-Za-z0-9_]{4,32}$/.test(u), L("Нік: латиниця, цифри й _, від 4 символів","Ник: латиница, цифры и _, от 4 символов"), "au-tg")) return false;
    if (!authGate("@" + u)) return false; if (!AU.login && !need($("au-ok").checked, L("Потрібна згода з умовами","Нужно согласие с условиями"), "au-ok")) return false; AU.id = "@" + u; AU.step = 1; },
  wsAuthTgOk(){ authDone("tg", AU.id); },
  wsLogout(){ if (CLOUD) { cloudLogout(); return false; } save(); W = blankW(); AU = auFresh(); AU.login = true; try { localStorage.setItem("rakurs_ws", JSON.stringify(W)); } catch (e) {} toast(L("Ви вийшли. Дані збережено в акаунті","Вы вышли. Данные сохранены в аккаунте")); },
  wsTgLogin(){ cloudTg(false); return false; },
  wsTgLink(){ cloudTg(true); return false; },
  wsAddMember(){ const m = val("tm-mail").toLowerCase().replace(/^https?:\/\/t\.me\//, "@"); if (!need(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) || (TG() && /^@[a-z0-9_]{4,32}$/.test(m)), TG()?L("Вкажіть пошту або нік у Telegram, наприклад @username","Укажите почту или ник в Telegram, например @username"):L("Перевірте адресу пошти","Проверьте адрес почты"), "tm-mail")) return false; cloudAddMember(m, $("tm-role").value, $("tm-proj").value); return false; },
  wsDelMember(d){ cloudDelMember(d.id); return false; },
  wsSwitchCo(d){ cloudSwitch(d.id); return false; },
  cloudRetry(){ CL.tries = 0; cloudQueue(); return false; },
  /* готовый текст приглашения: кто, куда, с какой ролью и как войти */
  wsInvite(d){ const m = CL.members.find(x => x.id === d.id); if (!m) return false; const R = ROLES(), tg = m.email.charAt(0) === "@", link = location.origin + location.pathname;
    const proj = m.project_ids ? m.project_ids.map(i => (W.projs.find(p => p.id === i) || {}).name).filter(Boolean).join(", ") : "";
    const t = L(`Привіт! Відкрив тобі доступ до кабінету «${W.co.name}». Роль: ${R[m.role] || m.role}. Доступ: ${proj ? "проєкт «" + proj + "»" : "усі проєкти компанії"}.\n\nПосилання: ${link}\n\nЯк увійти: ${tg ? "вкладка «Telegram» → «Увійти через Telegram», під ніком " + m.email + ". Пошта й пароль не потрібні." : "вкладка «Пошта», адреса " + m.email + ". На неї прийде лист із посиланням для входу, пароль не потрібен."}`,
                `Привет! Открыл тебе доступ в кабинет «${W.co.name}». Роль: ${R[m.role] || m.role}. Доступ: ${proj ? "проект «" + proj + "»" : "все проекты компании"}.\n\nСсылка: ${link}\n\nКак войти: ${tg ? "вкладка «Telegram» → «Войти через Telegram», под ником " + m.email + ". Почта и пароль не нужны." : "вкладка «Почта», адрес " + m.email + ". На него придёт письмо со ссылкой для входа, пароль не нужен."}`);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(L("Запрошення скопійовано — надішліть його людині","Приглашение скопировано — отправьте его человеку")), () => { window.prompt(L("Скопіюйте текст запрошення","Скопируйте текст приглашения"), t); }); return false; },
  wsCopyLink(){ const t = location.origin + location.pathname; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast(L("Посилання скопійовано","Ссылка скопирована")), ()=>toast(L("Виділіть посилання й скопіюйте вручну","Выделите ссылку и скопируйте вручную"))); return false; },
  themeSet(d){ const el = document.documentElement; if (d.v === "auto") delete el.dataset.theme; else el.dataset.theme = d.v; try { if (d.v === "auto") localStorage.removeItem("rakurs_theme"); else localStorage.setItem("rakurs_theme", d.v); } catch (e) {} },
  mePeriod(d){ ME.period = d.v; meSave(); PR.touched = 0; PR.mode = meMode(); },
  wsCtab(d){ W.cur = null; W.fun = null; W.ctab = d.v; save(); },
  wsGoCoKb(){ W.cur = null; W.fun = null; W.ctab = "kb"; save(); },
  wsBrandOwn(d){ P().brand.own = d.v === "1"; save(); },
  kbOpen(d){ KBO = (KBO === d.id && !d.on) ? null : d.id; },
  wsKbT(d){ const p = P(), i = p.kbOff.indexOf(d.id); if (i < 0) p.kbOff.push(d.id); else p.kbOff.splice(i, 1); save(); },
  wsExport(){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(Object.assign({}, W, {wipe:false}), null, 1)], {type:"application/json"})); a.download = "rakurs_" + slug(W.co.name) + ".json"; document.body.appendChild(a); a.click(); a.remove(); toast(L("Якщо файл не завантажився, скористайтесь «Скопіювати копію»","Если файл не скачался, воспользуйтесь «Скопировать копию»")); return false; },
  wsCopyAll(){ (navigator.clipboard ? navigator.clipboard.writeText(JSON.stringify(W)) : Promise.reject()).then(()=>toast(L("Копію скопійовано в буфер","Копия скопирована в буфер")), ()=>toast(L("Браузер не дав скопіювати — завантажте файл","Браузер не дал скопировать — скачайте файл"))); return false; },
  wsKind(d){ W.kind = d.v; const n = val("co-name"); renderView(); const e = $("co-name"); if (e) e.value = n; return false; },
  wsCo(){ const n = val("co-name"); if (!need(n, L("Введіть назву компанії","Введите название компании"), "co-name")) return false; if (CLOUD) { cloudCreateCo(n, W.kind || "own"); return false; } W.co = {name:n, kind:W.kind || "own"}; norm(); save(); },
  wsSample(){ W.mode = "sample"; save(); location.hash = "today"; lastRoute = null; },
  wsOwn(){ W.mode = "own"; S.cr = S.launch = S.modal = null; S.asst.open = false; save(); ownKey = ""; },
  wsBackP(){ W.cur = null; W.fun = null; W.ctab = "map"; save(); },
  wsOpenP(d){ W.cur = d.id; W.fun = null; W.tab = "about"; save(); },
  wsTab(d){ W.fun = null; W.tab = d.v; save(); },
  wsDelP(d){ if (!canAdmin()) { toast(L("Проєкти видаляє власник або керівник","Проекты удаляет собственник или руководитель")); return false; } const dp = W.projs.find(p => p.id === d.id); if (!dp) return false;
    if (!delAsk("p:" + d.id)) { toast(L("Натисніть ще раз, щоб видалити проєкт «","Нажмите ещё раз, чтобы удалить проект «") + dp.name + L("» з воронками, підключеннями й статистикою","» с воронками, подключениями и статистикой")); return; }
    storedPaths(dp).forEach(cloudFileDel); W.projs = W.projs.filter(p => p.id !== d.id); if (W.cur === d.id) { W.cur = null; W.fun = null; } saveNow(); toast(L("Проєкт видалено","Проект удалён")); },
  wsSet(d){ wset(d.k, d.v); },
  wsSale(d, sp){ const f = F(); sp = sp || saleGet(d.v); if (!f || !sp) return; const known = saleAll().map(x => x.steps);
    if (!f.an.path || known.includes(f.an.path) || d.force) f.an.path = sp.steps; f.sale = sp.id; f.saleName = sp.name; save(); },
  wsPathAdd(){ const sp = pathRead("fp"); if (!sp) return false; PNEW = false; ACT.wsSale({force:1}, sp); toast(L("Шлях збережено","Путь сохранён")); },
  wsPathCancel(){ PNEW = false; },
  wsPathNew(){ const sp = pathRead("kp"); if (!sp) return false; save(); toast(L("Шлях додано","Путь добавлен")); },
  wsDelPath(d){ const x = saleOwn().find(y => y.id === d.id); if (!x) return false;
    W.projs.forEach(p => p.funnels.forEach(f => { if (f.sale === x.id) f.saleName = x.name; }));   /* воронки сохраняют название и свои шаги */
    W.co.paths = W.co.paths.filter(y => y.id !== x.id); save(); toast(L("Шлях видалено. Воронки, що його використовували, зберегли свої кроки","Путь удалён. Воронки, которые его использовали, сохранили свои шаги")); },
  wsAddSeg(){ const n = val("sg-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"), "sg-n")) return false; P().segs.push({id:uid(), name:n, pain:val("sg-p"), say:val("sg-s")}); save(); },
  wsDelSeg(d){ const p = P(); p.segs = p.segs.filter(s=>s.id!==d.id); p.funnels.forEach(f=>{ f.aud.off = f.aud.off.filter(x=>x!==d.id); }); save(); },
  wsAddKb(d){ const t = val("kb-"+d.id+"-t"); if (!need(t, L("Дайте матеріалу назву","Дайте материалу название"), "kb-"+d.id+"-t")) return false; kbHolder(W.cur ? "p" : "co").kb.push({id:uid(), type:d.id, title:t, src:val("kb-"+d.id+"-s"), note:val("kb-"+d.id+"-n")}); save(); },
  wsDelKb(d){ const h = kbHolder(W.cur ? "p" : "co"), x = h.kb.find(i=>i.id===d.id); if (x && x.path) cloudFileDel(x.path); h.kb = h.kb.filter(i=>i.id!==d.id); if (!W.cur) W.projs.forEach(p=>{ p.kbOff = p.kbOff.filter(x=>x!==d.id); }); save(); },
  wsDelFile(d){ const a = wget(d.k), x = a[+d.id]; if (x && x.p) cloudFileDel(x.p); a.splice(+d.id, 1); save(); },
  fileOpen(d){ cloudFileOpen(d.p); return false; },
  wsConn(d){ const p = P(); p.conn[d.id] = p.conn[d.id] ? 0 : 3; save(); },
  wsOpenF(d){ W.fun = d.id; W.ftab = "an"; save(); },
  wsBackF(){ W.fun = null; W.tab = "funnels"; save(); },
  wsFtab(d){ W.ftab = d.v; save(); },
  wsDelF(d){ const p = d.p ? W.projs.find(x => x.id === d.p) : P(), df = p && p.funnels.find(f => f.id === d.id); if (!df) return false;
    if (!delAsk("f:" + d.id)) { toast(L("Натисніть ще раз, щоб видалити воронку «","Нажмите ещё раз, чтобы удалить воронку «") + df.name + "»"); return; }
    storedPaths(df).forEach(cloudFileDel); p.funnels = p.funnels.filter(f => f.id !== d.id); if (W.fun === d.id) W.fun = null; saveNow(); toast(L("Воронку видалено","Воронка удалена")); },
  wsSegT(d){ const f = F(), i = f.aud.off.indexOf(d.id); if (i < 0) f.aud.off.push(d.id); else f.aud.off.splice(i, 1); save(); },
  wsAddFSeg(){ const n = val("fs-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"), "fs-n")) return false; F().aud.add.push({id:uid(), name:n, pain:val("fs-p"), say:val("fs-s")}); save(); },
  wsDelFSeg(d){ const f = F(); f.aud.add = f.aud.add.filter(s=>s.id!==d.id); save(); },
  wsAddLand(){ const u = val("ld-u"); if (!need(u, L("Вкажіть адресу сторінки","Укажите адрес страницы"), "ld-u")) return false; F().lands.push({id:uid(), url:u.replace(/^https?:\/\//,""), note:val("ld-n")}); save(); },
  wsDelLand(d){ const f = F(); f.lands = f.lands.filter(l=>l.id!==d.id); save(); },
  wsCopy(d){ const l = F().lands.find(x=>x.id===d.id), t = "https://" + l.url + (l.url.includes("?")?"&":"?") + utmOf(P(), F()); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast(L("Посилання скопійовано","Ссылка скопирована")), ()=>toast(L("Виділіть посилання й скопіюйте вручну","Выделите ссылку и скопируйте вручную"))); return false; },
  wsAddCr(){ const n = val("cr-n"), h = val("cr-h"); if (!need(n || h, L("Дайте креативу назву або опишіть перший кадр","Дайте креативу название или опишите первый кадр"), "cr-n")) return false; const f = F(); f.crs.push({id:uid(), name:n, slug:slug(n) || "creative_" + (f.crs.length+1), type:$("cr-t").value, hook:h, seg:$("cr-s").value, text:val("cr-x")}); save(); },
  wsDelCr(d){ const f = F(), x = f.crs.find(c=>c.id===d.id); if (x && x.path) cloudFileDel(x.path); f.crs = f.crs.filter(c=>c.id!==d.id); save(); },
  wsWipe(){ if (!W.wipe) { W.wipe = true; later(()=>{ if (W.wipe) { W.wipe = false; render(); } }, 4000); return; } if (CLOUD) { W.wipe = false; cloudDeleteCo(); return false; } try { if (W.user) localStorage.removeItem(accKey(W.user.id)); } catch (e) {} W = blankW(); AU = auFresh(); save(); toast(L("Акаунт і дані видалено","Аккаунт и данные удалены")); },
  obSegAdd(){ const n = val("os-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"), "os-n")) return false; S.ob.segsOwn.push({id:uid(), name:n, pain:val("os-p"), say:val("os-s")}); },
  obSegDel(d){ S.ob.segsOwn = S.ob.segsOwn.filter(s=>s.id!==d.id); },
  obConn(d){ if (own()) { S.ob.conn[d.id] = 3; return; } return _oc(d); },
  obNav(d){ if (own() && S.ob.step === 0 && +d.v > 0 && !String(S.ob.d.name).trim()) { fieldErr("ob-name", L("Введіть назву проєкту","Введите название проекта")); return false; } return _on(d); },
  createProject(){ if (!own()) return _cp(); const o = S.ob, d = o.d;
    const p = {id:pid(), name:String(d.name).trim(), niche:d.niche, geo:d.geo, product:d.product, desc:"", worked:d.worked, ban:d.ban, tone:d.tone,
      tg:{budget:d.budget, check:d.check, share:d.share, l2b:d.l2b, b2p:d.b2p}, segs:o.segsOwn, audText:"", audFiles:[], brand:Object.assign(blankBrand(), {own:false}), kb:[], kbOff:[], conn:Object.assign(W.user && W.user.via === "tg" ? {tg:3} : {}, o.conn), funnels:[]};
    W.projs.push(p); W.cur = p.id; W.fun = null; W.tab = p.segs.length ? "kb" : "aud"; S.modal = null; S.ob = null; save(); toast(L("Проєкт створено. Далі — база знань і воронки","Проект создан. Дальше — база знаний и воронки")); },
  createFunnel(){ if (!own()) return _cf(); const p = P(), n = val("nf-name"); if (!need(n, L("Дайте воронці назву","Дайте воронке название"), "nf-name")) return false;
    const check = nfv("nf-price") || p.tg.check, u = val("nf-url").replace(/^https?:\/\//,""), first = !p.funnels.length;
    const sp = $("nf-sale").value === "+" ? pathRead("nf") : (saleGet($("nf-sale").value) || saleGet("web")); if (!sp) return false;
    const f = {id:uid(), name:n, goal:$("nf-goal").value, sale:sp.id, saleName:sp.name, mode:"btn", an:{offer:val("nf-offer"), promo:"", until:"", path:sp.steps, event:L("оплати","оплаты"), diff:"", obj:""},
      aud:{off:[], add:[], note:""}, lands:u?[{id:uid(), url:u, note:""}]:[], crs:[], ch:[...document.querySelectorAll(".nf-ch:checked")].map(e => e.value), tg:{pay: first ? Math.max(1, Math.round(pT(p).rev / check)) : 10, check, l2b:p.tg.l2b, b2p:p.tg.b2p}};
    p.funnels.push(f); W.fun = f.id; W.ftab = "an"; S.modal = null; save(); toast(L("Воронку створено","Воронка создана")); }
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset.me) { ME[t.dataset.me] = t.value; meSave(); return; } if (!t.dataset.w || !own()) return; const path = t.dataset.w, isN = /\.tg\./.test(path);
  if (isN) { const z = /\.ltv$/.test(path), em = !String(t.value).trim(), n = z && em ? (path[0] === "f" ? null : 0) : pnum(t.value); if (!(n > 0) && !(z && (n === 0 || n === null))) return; wset(path, n); const c = $("w-calc"); if (c) c.innerHTML = F() ? calcF(F(), P()) : calcP(P()); const cp = $("ch-plan"); if (cp && F()) cp.innerHTML = chPlanBody(F(), P()); } else { wset(path, t.value); const m = path.match(/^p\.(desc|product|worked|site)$/), pp = m && P(); if (pp && pp.auto) delete pp.auto[m[1]]; } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset.me) { renderShell(); return; } if (!own()) return;
  if (t.dataset.w && /^co\.paths\.\d+\.steps$/.test(t.dataset.w)) { const v = stepsNorm(t.value); if (v && v !== t.value) { wset(t.dataset.w, v); render(); } return; }
  if (t.id === "nf-sale") { const b = $("nf-own"); if (b) { b.hidden = t.value !== "+"; if (!b.hidden) $("nf-pname").focus(); } return; }
  if (t.id === "fp-sale") { if (t.value === "+") PNEW = true; else { PNEW = false; ACT.wsSale({v:t.value}); } render(); if (PNEW) { const n = $("fp-pname"); if (n) n.focus(); } return; }
  if (t.dataset.wimp) { const f = t.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !d.co || !Array.isArray(d.projs)) throw 0; W = Object.assign(blankW(), d, {user:W.user, mode:"own", cur:null, fun:null, ctab:"projects", wipe:false}); norm(); save(); render(); toast(L("Дані відновлено з копії","Данные восстановлены из копии")); } catch (x) { toast(L("Це не файл копії кабінету","Это не файл копии кабинета")); } };
    r.readAsText(f); return; }
  if (t.dataset.wf) { const files = [...t.files]; if (files.length) fileIntake(t.dataset.wf, files); return; }
  if (t.dataset.w) { renderShell(); if (/^(p\.name|f\.name|co\.name|p\.brand\.|co\.brand\.colors|p\.tg\.|f\.tg\.|co\.utm|p\.utm|f\.utm)/.test(t.dataset.w)) renderView(); } });
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("a[role=button][data-act]")) { e.preventDefault(); e.target.click(); } });
/* ---------- клавиатура и программы чтения с экрана ----------
   Экран перерисовывается целиком, и фокус при этом пропадал: после любого нажатия человек с клавиатурой
   начинал путь с начала страницы. Теперь после перерисовки фокус возвращается: на тот же элемент, если он остался;
   в открывшееся окно; на того, кто окно открыл; на заголовок нового экрана. Окно не выпускает Tab наружу. */
const FOC = {dlg:null, opener:null};
const focDs = e => JSON.stringify(Object.assign({}, e.dataset));
function focKey(){ const e = document.activeElement; if (!e || e === document.body || !e.closest) return null; const r = e.closest("#modal,#drawer,#view,#rail,#bar,#tabbar"); if (!r) return null;
  const k = {root:r.id, id:e.id || "", tag:e.tagName, ds:focDs(e), n:0};
  if (!k.id) k.n = [...r.querySelectorAll(e.tagName)].filter(x => focDs(x) === k.ds).indexOf(e);
  try { if (typeof e.selectionStart === "number") { k.s = e.selectionStart; k.e = e.selectionEnd; } } catch (x) {}
  return k; }
function focFind(k){ if (!k) return null; if (k.id) { const e = document.getElementById(k.id); return e && !e.closest("[hidden]") ? e : null; }
  const r = document.getElementById(k.root); if (!r || r.hidden) return null;
  return [...r.querySelectorAll(k.tag)].filter(x => focDs(x) === k.ds)[k.n] || null; }
function focPut(t, k){ if (!t || t === document.activeElement) return; try { t.focus({preventScroll:true}); if (k && typeof k.s === "number" && t.setSelectionRange) t.setSelectionRange(k.s, k.e); } catch (x) {} }
const viewHead = () => { const h = document.querySelector("#view h1, #view h2") || $("view"); h.tabIndex = -1; return h; };
const dlgNow = () => { const mo = $("modal"), dr = $("drawer"); return !mo.hidden ? mo : !dr.hidden ? dr : null; };
const FOCUSABLE = "a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
/* куда встать в окне: на первое поле; на телефоне — на само окно, чтобы клавиатура не выскакивала сама */
const dlgFirst = d => (matchMedia("(pointer:coarse)").matches ? null : d.querySelector("input:not([type=hidden]):not([type=file]):not([disabled]),select:not([disabled]),textarea:not([disabled])")) || d;
/* перерисовка одного куска (без смены экрана): просто вернуть фокус туда же */
const keepFocus = fn => function(){ const k = focKey(), r = fn.apply(this, arguments); if (k && (!document.activeElement || document.activeElement === document.body)) focPut(focFind(k), k); return r; };
renderView = keepFocus(renderView); renderShell = keepFocus(renderShell);
const _render0 = render;
render = function(){
  const k = focKey(), was = FOC.dlg, viewWas = ownKey;
  _render0();
  const d = dlgNow(), app = document.querySelector(".app"), tb = $("tabbar"), sk = $("skip");
  if (app) app.inert = !!d; if (tb) tb.inert = !!d;
  $("rail").setAttribute("aria-label", L("Навігація","Навигация")); if (sk) sk.textContent = L("До вмісту","К содержимому");
  let now = null;
  if (d) { const h = d.querySelector("h1,h2"), tag = d.querySelector(".tag"); d.tabIndex = -1; d.setAttribute("aria-modal", "true");
    if (h) { h.id = h.id || "dlg-h"; d.setAttribute("aria-labelledby", h.id); }
    now = [S.modal || S.cr || S.launch || "dlg", h ? h.textContent : "", tag ? tag.textContent : ""].join("|"); }
  if (d && !was) FOC.opener = k;
  FOC.dlg = now;
  let t = null;
  if (d) t = now !== was ? dlgFirst(d) : (k && k.root === d.id && focFind(k)) || (d.contains(document.activeElement) ? null : d);
  else if (was) { t = focFind(FOC.opener) || viewHead(); FOC.opener = null; }
  else if (k) t = own() && ownKey !== viewWas && k.root !== "bar" ? viewHead() : focFind(k) || (k.root === "view" ? viewHead() : null);
  focPut(t, t && t.tagName !== "H1" && t.tagName !== "H2" ? k : null);
};
document.addEventListener("keydown", e => { if (e.key !== "Tab") return; const d = dlgNow(); if (!d) return;
  const f = [...d.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null), a = document.activeElement;
  if (!f.length) { e.preventDefault(); d.focus(); return; }
  if (!d.contains(a)) { e.preventDefault(); f[0].focus(); }
  else if (e.shiftKey && (a === f[0] || a === d)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } });
/* «К содержимому»: первая остановка Tab, видна только при фокусе */
(function(){ const b = document.createElement("button"); b.type = "button"; b.id = "skip"; b.className = "skip"; b.dataset.act = "skip"; document.body.insertBefore(b, document.body.firstChild); })();
ACT.skip = function(){ const h = viewHead(); h.focus(); h.scrollIntoView({block:"start"}); return false; };

render();
cloudBoot();
