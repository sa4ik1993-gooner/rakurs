/* Своя компания: Компания → Проекты → Воронки. Пустой старт, всё введённое хранится в браузере.
   Подключается после setup.js. Заполненный пример «Школа 3D» остаётся отдельным режимом. */
const blankW = () => ({mode:"own", user:null, co:null, projs:[], cur:null, fun:null, tab:"about", ftab:"an", ctab:"projects", wipe:false});
const blankBrand = () => ({colors:"", fonts:"", voice:"", files:[]});
let W = blankW();
try { const s = JSON.parse(localStorage.getItem("rakurs_ws")); if (s && Array.isArray(s.projs)) W = Object.assign(W, s, {wipe:false}); } catch (e) {}
const accKey = id => "rakurs_acc_" + id;
const accGet = id => { try { const a = JSON.parse(localStorage.getItem(accKey(id))); return a && Array.isArray(a.projs) ? a : null; } catch (e) { return null; } };
/* приводит сохранённые данные к текущей структуре */
function norm(){ W.ctab = W.ctab || "projects";
  if (W.co) { W.co.kb = W.co.kb || []; W.co.brand = Object.assign(blankBrand(), W.co.brand); W.co.ban = W.co.ban || ""; W.co.tone = W.co.tone || ""; }
  W.projs.forEach(p => { p.kb = p.kb || []; p.kbOff = p.kbOff || []; const b = p.brand = Object.assign(blankBrand(), p.brand); if (b.own == null) b.own = !!(b.colors || b.fonts || b.voice); }); }
norm();
if (location.hash === "#sample") { W.mode = "sample"; location.hash = "today"; }
const save = () => { try { localStorage.setItem("rakurs_ws", JSON.stringify(W)); if (W.user) localStorage.setItem(accKey(W.user.id), JSON.stringify(Object.assign({}, W, {mode:"own", wipe:false}))); } catch (e) {} };
const own = () => W.mode !== "sample";
const P = () => W.projs.find(p => p.id === W.cur);
const F = () => { const p = P(); return p && p.funnels.find(f => f.id === W.fun); };
const uid = () => Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const TRL = {а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",ё:"e",є:"ye",ж:"zh",з:"z",и:"i",і:"i",ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
const slug = s => String(s || "").toLowerCase().replace(/\.[a-z0-9]{2,4}$/,"").split("").map(c => TRL[c] !== undefined ? TRL[c] : c).join("").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28);
const GEO = {ukraina:"UA",ukrayina:"UA",polsha:"PL",polscha:"PL",kazakhstan:"KZ",germaniya:"DE",nimechchina:"DE",ssha:"US",usa:"US",evropa:"EU",yevropa:"EU",moldova:"MD",litva:"LT",latviya:"LV",estoniya:"EE",chekhiya:"CZ",ispaniya:"ES",italiya:"IT",izrail:"IL",kanada:"CA"};
const geoCode = g => { const w = slug(String(g||"").split(/[,;\/]/)[0]); return GEO[w] || (w ? w.slice(0,2).toUpperCase() : ""); };
const UTM = "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}";
const root = k => ({co:W.co, p:P(), f:F()}[k]);
const wget = path => path.split(".").reduce((o,k,i)=> i ? (o == null ? "" : o[k]) : root(k), null);
function wset(path, v){ const ks = path.split("."), last = ks.pop(); let o = root(ks[0]); for (let i = 1; i < ks.length; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[last] = v; save(); }
const fld = (path, label, o = {}) => { const id = "w-" + path.replace(/\./g,"-"), v = esc(wget(path));
  return `<div class="field${o.w?" w":""}"><label for="${id}">${label}</label>${o.area ? `<textarea id="${id}" data-w="${path}" rows="${o.area}" placeholder="${esc(o.ph||"")}">${v}</textarea>` : `<input id="${id}" data-w="${path}" value="${v}" placeholder="${esc(o.ph||"")}"${o.num?' inputmode="decimal"':""}>`}</div>`; };
const optsW = (path, list) => `<div class="opts">${list.map(x=>`<button type="button" class="opt" data-act="wsSet" data-k="${path}" data-v="${x[0]}" aria-pressed="${wget(path)===x[0]}">${x[1]}</button>`).join("")}</div>`;
const stepper = (steps, cur, act) => `<ol class="obst obst--nav" style="grid-template-columns:repeat(${steps.length},minmax(0,1fr))">${steps.map((s,i)=>`<li class="${s[2]?"ok":""}${s[0]===cur?" on":""}"><button type="button" data-act="${act}" data-v="${s[0]}"><i>${i+1}${s[2]?" ✓":""}</i><span>${s[1]}</span></button></li>`).join("")}</ol>`;
const empty = (t, s) => `<div class="empty"><b>${t}</b><span class="sub">${s}</span></div>`;
const del = (act, id) => `<button type="button" class="x x--sm" data-act="${act}" data-id="${id}" aria-label="delete">×</button>`;
const PATHS = () => ({web:L("реклама → лендинг → вебінар → бронь → оплата","реклама → лендинг → вебинар → бронь → оплата"),call:L("реклама → лендинг → заявка → дзвінок → оплата","реклама → лендинг → заявка → звонок → оплата"),site:L("реклама → лендинг → оплата","реклама → лендинг → оплата")});

/* ---------- расчёты ---------- */
const pT = p => { const t = p.tg, rv = t.budget / (t.share/100), pay = rv / t.check; return {rev:rv, pay, leads: pay/(t.b2p/100)/(t.l2b/100), cap: t.l2b/100*t.b2p/100*t.check*t.share/100, roas:100/t.share}; };
const fT = (f, p) => { const t = f.tg, rv = t.pay * t.check, bud = rv * p.tg.share/100, leads = t.pay/(t.b2p/100)/(t.l2b/100); return {pay:t.pay, rev:rv, bud, leads, cap: t.l2b/100*t.b2p/100*t.check*p.tg.share/100}; };
const fSegs = (f, p) => p.segs.filter(s => !f.aud.off.includes(s.id)).concat(f.aud.add);
const pChain = p => [["about",L("Опис","Описание"),!!(p.name && p.product)],["aud",L("ЦА","ЦА"),p.segs.length>0],["kb",L("База знань","База знаний"),p.kb.length>0],["goals",L("Цілі","Цели"),p.tg.budget>0],["funnels",L("Воронки","Воронки"),p.funnels.length>0],["conn",L("Підключення","Подключения"),Object.values(p.conn).some(Boolean)]];
const fChain = (f, p) => [["an",L("Анамнез","Анамнез"),!!(f.an.offer && f.tg.check)],["aud",L("ЦА воронки","ЦА воронки"),fSegs(f,p).length>0],["land",L("Лендинги","Лендинги"),f.lands.length>0],["cr",L("Креативи","Креативы"),f.crs.length>=3],["goals",L("Цілі й аналітика","Цели и аналитика"),f.tg.pay>0]];

/* ---------- экраны ---------- */
const auFresh = () => ({via:"email", step:0, id:"", login:false});
let AU = auFresh();
function vAuth(){
  const up = !AU.login, proto = t => `<p class="sub proto">${L("Прототип: ","Прототип: ")}${t}</p>`;
  const agree = `<label class="chk"><input type="checkbox" id="au-ok"><span>${L("Погоджуюся з умовами сервісу та політикою конфіденційності","Соглашаюсь с условиями сервиса и политикой конфиденциальности")}</span></label>`;
  const body = AU.via === "email"
    ? (AU.step === 0
      ? `<div class="field"><label for="au-mail">${L("Електронна пошта","Электронная почта")}</label><input id="au-mail" type="email" inputmode="email" autocomplete="email" placeholder="name@company.com" value="${esc(AU.id)}"></div>
         ${up?agree:""}<div class="row"><button class="btn btn--solid" data-act="wsAuthSend">${L("Отримати код","Получить код")}</button></div>
         <p class="sub">${L("Пароль не потрібен: надішлемо шестизначний код підтвердження, він діє 10 хвилин.","Пароль не нужен: пришлём шестизначный код подтверждения, он действует 10 минут.")}</p>`
      : `<p>${L("Код підтвердження надіслано на ","Код подтверждения отправлен на ")}<b>${esc(AU.id)}</b></p>
         <div class="field"><label for="au-code">${L("Код із листа","Код из письма")}</label><input id="au-code" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></div>
         <div class="row"><button class="btn btn--solid" data-act="wsAuthCode">${L("Підтвердити","Подтвердить")}</button><button class="btn" data-act="wsAuthBack">${L("Інша пошта","Другая почта")}</button></div>
         ${proto(L("лист не надсилається, підійдуть будь-які шість цифр.","письмо не отправляется, подойдут любые шесть цифр."))}`)
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
  <div class="panel"><span class="tag">${L("Як усе влаштовано","Как всё устроено")}</span>
    <div class="tree">
      <div><b>${L("Компанія","Компания")}</b><span class="sub">${L("назва, хто має доступ","название, у кого доступ")}</span></div>
      <div><b>${L("Проєкт","Проект")}</b><span class="sub">${L("опис, ЦА, база знань, цілі, підключені кабінети","описание, ЦА, база знаний, цели, подключённые кабинеты")}</span></div>
      <div><b>${L("Воронка","Воронка")}</b><span class="sub">${L("свій анамнез, правки ЦА, лендинги, креативи, цілі й аналітика","свой анамнез, правки ЦА, лендинги, креативы, цели и аналитика")}</span></div>
    </div></div>`;
}
function vCompany(){
  const t = W.ctab, tabs = [["projects",L("Проєкти","Проекты")],["kb",L("База знань компанії","База знаний компании")],["acc",L("Акаунт","Аккаунт")]];
  const body = {
    projects: () => `${W.projs.length ? `<div class="cols">${W.projs.map(p=>{ const ch = pChain(p), done = ch.filter(c=>c[2]).length; return `<div class="panel">
      <div class="row sp"><h2>${esc(p.name)}</h2>${del("wsDelP", p.id)}</div><p class="sub">${esc([p.niche,p.geo].filter(Boolean).join(" · "))}</p>
      <div class="prog"><i style="width:${done/ch.length*100}%"></i></div>
      <dl class="kv"><dt>${L("Заповнено","Заполнено")}</dt><dd class="mono">${done} / ${ch.length}</dd><dt>${L("Воронок","Воронок")}</dt><dd class="mono">${p.funnels.length}</dd><dt>${L("Сегментів ЦА","Сегментов ЦА")}</dt><dd class="mono">${p.segs.length}</dd><dt>${L("Матеріалів","Материалов")}</dt><dd class="mono">${p.kb.length} + ${kbInh(p).length} ${L("з компанії","из компании")}</dd></dl>
      <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenP" data-id="${p.id}">${L("Відкрити","Открыть")}</button></div></div>`; }).join("")}</div>`
     : empty(L("Проєктів ще немає","Проектов ещё нет"), L("Додайте перший: анкета з шести кроків — назва, кабінети, анамнез, цілі, аудиторія.","Добавьте первый: анкета из шести шагов — название, кабинеты, анамнез, цели, аудитория."))}
     <div class="row"><button class="btn btn--sm" data-act="wsSample">${L("Заповнений приклад «Школа 3D»","Заполненный пример «Школа 3D»")}</button></div>`,
    kb: () => `<p class="sub">${L("Те, що спільне для всіх проєктів компанії. Кожен проєкт бачить ці матеріали як успадковані й може вимкнути зайві.","То, что общее для всех проектов компании. Каждый проект видит эти материалы как унаследованные и может выключить лишние.")}</p>
      ${brandPanel("co")}
      <div class="panel"><span class="tag">${L("Спільні правила","Общие правила")}</span><div class="form">${fld("co.ban",L("Що не можна обіцяти й казати в жодному проєкті","Что нельзя обещать и говорить ни в одном проекте"),{w:1})}${fld("co.tone",L("Тон компанії","Тон компании"),{w:1})}</div>
        <p class="sub">${L("Додаються до правил кожного проєкту й перевіряються в кожному ролику й тексті.","Добавляются к правилам каждого проекта и проверяются в каждом ролике и тексте.")}</p></div>
      ${kbCols("co")}`,
    acc: () => { const u = W.user, size = (()=>{ try { return Math.max(1, Math.round(JSON.stringify(W).length/1024)); } catch (e) { return 0; } })();
      return `<div class="c2"><div class="panel"><span class="tag">${L("Акаунт","Аккаунт")}</span>
        <dl class="kv"><dt>${L("Вхід","Вход")}</dt><dd>${u.via==="tg"?"Telegram":L("Пошта","Почта")} · ${L("підтверджено","подтверждено")}</dd><dt>${L("Ідентифікатор","Идентификатор")}</dt><dd class="mono">${esc(u.id)}</dd>
          <dt>${L("Компанія","Компания")}</dt><dd>${esc(W.co.name)}</dd><dt>${L("Проєктів","Проектов")}</dt><dd class="mono">${W.projs.length}</dd><dt>${L("Обсяг даних","Объём данных")}</dt><dd class="mono">${size} KB</dd></dl>
        <div class="form">${fld("co.name",L("Назва компанії","Название компании"),{w:1})}</div>
        <div class="row"><button class="btn" data-act="wsLogout">${L("Вийти","Выйти")}</button><button class="btn btn--danger" data-act="wsWipe">${W.wipe?L("Точно видалити все?","Точно удалить всё?"):L("Видалити акаунт і дані","Удалить аккаунт и данные")}</button></div></div>
        <div class="panel vf"><span class="tag">${L("Де зберігаються дані","Где хранятся данные")}</span>
          <p>${L("Усе, що ви вводите, зберігається одразу і прив’язане до акаунта: після виходу та входу тим самим способом компанія, проєкти й бази знань на місці.","Всё, что вы вводите, сохраняется сразу и привязано к аккаунту: после выхода и входа тем же способом компания, проекты и базы знаний на месте.")}</p>
          <p class="sub proto">${L("Прототип: дані лежать у цьому браузері. На іншому пристрої їх не буде, доки немає сервера, — перенесіть копією.","Прототип: данные лежат в этом браузере. На другом устройстве их не будет, пока нет сервера, — перенесите копией.")}</p>
          <div class="row"><button class="btn btn--sm" data-act="wsExport">${L("Завантажити копію","Скачать копию")}</button><button class="btn btn--sm" data-act="wsCopyAll">${L("Скопіювати копію","Скопировать копию")}</button>
            <label class="btn btn--sm"><input type="file" hidden accept=".json,application/json" data-wimp="1">${L("Відновити з копії","Восстановить из копии")}</label></div></div></div>`; }
  }[t]();
  return `<div class="head"><div><span class="tag">${W.co.kind==="agency"?L("Агентство","Агентство"):L("Компанія","Компания")}</span><h1>${esc(W.co.name)}</h1></div>
    ${t==="projects"?`<button class="btn btn--solid" data-act="modal" data-id="project">${L("Додати проєкт","Добавить проект")}</button>`:""}</div>
  <div class="seg" role="group">${tabs.map(x=>`<button type="button" data-act="wsCtab" data-v="${x[0]}" aria-pressed="${t===x[0]}">${x[1]}${x[0]==="kb"&&W.co.kb.length?" · "+W.co.kb.length:""}</button>`).join("")}</div>
  ${body}`;
}
function segList(segs, act, tag){ return segs.length ? `<div class="segs">${segs.map(s=>`<div class="seg3"><div class="row sp"><b>${esc(s.name)}</b><span class="row">${tag?tag(s):""}${del(act, s.id)}</span></div><span class="sub">${esc(s.pain)}</span>${s.say?`<span class="mono">→ ${esc(s.say)}</span>`:""}</div>`).join("")}</div>` : ""; }
function segAdder(pre, act){ return `<div class="form adder">
    <div class="field"><label for="${pre}-n">${L("Сегмент","Сегмент")}</label><input id="${pre}-n" placeholder="${L("хто це: вік, чим займається","кто это: возраст, чем занимается")}"></div>
    <div class="field"><label for="${pre}-p">${L("Що болить, чому купує","Что болит, почему покупает")}</label><input id="${pre}-p" placeholder="${L("подія або причина","событие или причина")}"></div>
    <div class="field w"><label for="${pre}-s">${L("Що казати в рекламі","Что говорить в рекламе")}</label><input id="${pre}-s" placeholder="${L("головна думка для цього сегмента","главная мысль для этого сегмента")}"></div>
    <div class="row w"><button class="btn btn--sm" data-act="${act}">${L("Додати сегмент","Добавить сегмент")}</button></div></div>`; }
function filesBox(path, hint){ const a = wget(path) || [];
  return `<label class="drop"><input type="file" multiple hidden data-wf="${path}"><b>${L("Додати файли","Добавить файлы")}</b><span class="sub">${hint}</span></label>
    ${a.length?`<div class="chipset">${a.map((n,i)=>`<span class="chip">${esc(n)} <button type="button" class="chipx" data-act="wsDelFile" data-k="${path}" data-id="${i}" aria-label="delete">×</button></span>`).join("")}</div>`:""}`; }
/* тип, где живёт (co — компания, p — проект, both), название, что класть, что бот берёт */
const KBT = () => [
  ["story","co",L("Історія компанії та засновник","История компании и основатель"),L("звідки компанія, чому їй вірять","откуда компания, почему ей верят"),L("сюжети роликів, перший кадр «від першої особи»","сюжеты роликов, первый кадр «от первого лица»")],
  ["team","co",L("Команда й експерти","Команда и эксперты"),L("хто веде, досвід, фото","кто ведёт, опыт, фото"),L("обличчя в роликах, підписи експертів","лица в роликах, подписи экспертов")],
  ["product","p",L("Продукт і програма","Продукт и программа"),L("що всередині, для кого, який результат","что внутри, для кого, какой результат"),L("факти в текстах, перевірка обіцянок","факты в текстах, проверка обещаний")],
  ["faq","p",L("Питання й заперечення","Вопросы и возражения"),L("що питають перед покупкою, що відповідаємо","что спрашивают перед покупкой, что отвечаем"),L("відповіді в текстах і на лендингу, ідеї гіпотез","ответы в текстах и на лендинге, идеи гипотез")],
  ["case","both",L("Кейси та відгуки","Кейсы и отзывы"),L("результати учнів або клієнтів із цифрами","результаты учеников или клиентов с цифрами"),L("докази в оголошеннях і на лендингу","доказательства в объявлениях и на лендинге")],
  ["video","both",L("Відео","Видео"),L("вебінари, відгуки, запис уроків, бекстейдж","вебинары, отзывы, записи уроков, бэкстейдж"),L("нарізки для креативів, цитати в тексти","нарезки для креативов, цитаты в тексты")],
  ["doc","both",L("Документи й посилання","Документы и ссылки"),L("прайс, оферта, презентація, соцмережі","прайс, оферта, презентация, соцсети"),L("факти, реквізити, перевірка формулювань","факты, реквизиты, проверка формулировок")]];
const kbHolder = sc => sc === "co" ? W.co : P();
const kbName = t => (KBT().find(k=>k[0]===t) || [0,0,t])[2];
const kbInh = p => W.co.kb.filter(i => !p.kbOff.includes(i.id));
const swatches = str => { const cols = String(str||"").split(/[\s,;]+/).filter(c=>/^#?[0-9a-f]{3,8}$/i.test(c)).map(c=>c[0]==="#"?c:"#"+c); return cols.length?`<div class="sw3">${cols.map(c=>`<span><i style="background:${esc(c)}"></i><em class="mono">${esc(c)}</em></span>`).join("")}</div>`:""; };
function brandPanel(sc, extra){ const b = kbHolder(sc).brand;
  return `<div class="panel"><div class="row sp"><span class="tag">${sc==="co"?L("Айдентика компанії","Айдентика компании"):L("Айдентика проєкту","Айдентика проекта")}</span>${extra||""}</div><div class="form">
    ${fld(sc+".brand.colors",L("Кольори бренду","Цвета бренда"),{ph:"#1E5A4E, #D93A20, #F2C230"})}${fld(sc+".brand.fonts",L("Шрифти","Шрифты"),{ph:"Unbounded, Golos Text"})}
    ${fld(sc+".brand.voice",L("Голос бренду: якими словами говоримо","Голос бренда: какими словами говорим"),{w:1,ph:L("на «ви», без сленгу, коротко","на «вы», без сленга, коротко")})}</div>
    ${swatches(b.colors)}${filesBox(sc+".brand.files", L("Логотип, брендбук, шаблони обкладинок","Логотип, брендбук, шаблоны обложек"))}</div>`; }
const kbItem = (i, right) => `<div class="item"><div class="row sp"><b>${esc(i.title)}</b>${right}</div>${i.src?`<span class="mono sub">${esc(i.src)}</span>`:""}${i.note?`<span class="sub">${esc(i.note)}</span>`:""}</div>`;
function kbCols(sc){ const h = kbHolder(sc);
  return `<div class="cols">${KBT().filter(k=>k[1]===sc||k[1]==="both").map(k=>{ const items = h.kb.filter(i=>i.type===k[0]); return `<div class="panel"><span class="tag">${k[2]} · ${items.length}</span><p class="sub">${k[3]}</p>
    ${items.map(i=>kbItem(i, del("wsDelKb", i.id))).join("")}
    <div class="adder"><div class="field"><label for="kb-${k[0]}-t">${L("Назва","Название")}</label><input id="kb-${k[0]}-t"></div><div class="field"><label for="kb-${k[0]}-s">${L("Посилання","Ссылка")}</label><input id="kb-${k[0]}-s" placeholder="https://"></div>
      <div class="field"><label for="kb-${k[0]}-n">${L("Що тут важливе","Что здесь важно")}</label><input id="kb-${k[0]}-n"></div>
      <div class="row"><button class="btn btn--sm" data-act="wsAddKb" data-id="${k[0]}">${L("Додати","Добавить")}</button><label class="btn btn--sm"><input type="file" multiple hidden data-wf="kb.${k[0]}">${L("Файлами","Файлами")}</label></div></div>
    <p class="sub mono">${L("бот бере звідси: ","бот берёт отсюда: ")}${k[4]}</p></div>`; }).join("")}</div>`; }
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
    about: () => `<div class="panel"><span class="tag">${L("Про проєкт","О проекте")}</span><div class="form">
        ${fld("p.name",L("Назва проєкту","Название проекта"))}${fld("p.niche",L("Ніша","Ниша"),{ph:L("онлайн-освіта, послуги, товари","онлайн-образование, услуги, товары")})}
        ${fld("p.geo",L("Гео","Гео"),{ph:L("країни та мови","страны и языки")})}${fld("p.site",L("Сайти","Сайты"),{ph:"example.com"})}
        ${fld("p.product",L("Що продаємо","Что продаём"),{w:1,ph:L("продукт, тривалість, ціна","продукт, длительность, цена")})}
        ${fld("p.desc",L("Опис проєкту своїми словами","Описание проекта своими словами"),{w:1,area:4,ph:L("для кого, у чому користь, чим відрізняємося від інших","для кого, в чём польза, чем отличаемся от других")})}
        <div class="field w"><label>${L("Як відбувається продаж","Как происходит продажа")}</label>${optsW("p.sale", SALE())}</div></div></div>
      <div class="panel"><span class="tag">${L("Правила для реклами","Правила для рекламы")}</span><div class="form">
        ${fld("p.worked",L("Що вже спрацьовувало","Что уже срабатывало"),{w:1})}${fld("p.ban",L("Що не можна обіцяти й казати","Что нельзя обещать и говорить"),{w:1})}${fld("p.tone",L("Тон","Тон"),{w:1})}</div>
        <p class="sub">${L("Ці правила успадковують усі воронки проєкту.","Эти правила наследуют все воронки проекта.")}${W.co.ban||W.co.tone?L(" З компанії додаються: "," Из компании добавляются: ")+esc([W.co.ban,W.co.tone].filter(Boolean).join(" · ")):""}</p></div>`,
    aud: () => `<div class="panel"><span class="tag">${L("Аудиторія проєкту","Аудитория проекта")} · ${p.segs.length}</span>
        <p class="sub">${L("Базова ЦА на весь проєкт. У кожній воронці її можна звузити або доповнити.","Базовая ЦА на весь проект. В каждой воронке её можно сузить или дополнить.")}</p>
        ${segList(p.segs, "wsDelSeg") || empty(L("Сегментів ще немає","Сегментов ещё нет"), L("Додайте хоча б один нижче.","Добавьте хотя бы один ниже."))}${segAdder("sg", "wsAddSeg")}</div>
      <div class="c2"><div class="panel"><span class="tag">${L("Опис покупця","Описание покупателя")}</span>${fld("p.audText",L("Як розповіли б новому менеджеру","Как рассказали бы новому менеджеру"),{area:6})}</div>
        <div class="panel"><span class="tag">${L("Матеріали про аудиторію","Материалы об аудитории")}</span>${filesBox("p.audFiles", L("Портрет клієнта, вивантаження з CRM, записи дзвінків, відгуки","Портрет клиента, выгрузка из CRM, записи звонков, отзывы"))}
          <p class="sub">${L("У прототипі файли лише прикріплюються: сегменти з них бот виділятиме після підключення.","В прототипе файлы только прикрепляются: сегменты из них бот будет выделять после подключения.")}</p></div></div>`,
    kb: () => kbProject(p),
    goals: () => { const sum = p.funnels.reduce((a,f)=>{ const x = fT(f,p); a.pay+=x.pay; a.rev+=x.rev; a.bud+=x.bud; a.leads+=x.leads; return a; }, {pay:0,rev:0,bud:0,leads:0}), ok = p.funnels.length && Math.abs(sum.rev - tgt.rev) < tgt.rev*0.05;
      const r = (k, tt, u) => `<tr><td>${tt}</td><td class="n"><input class="tin" data-w="p.tg.${k}" value="${p.tg[k]}" inputmode="decimal" aria-label="${tt}"> <span class="sub mono">${u}</span></td></tr>`;
      return `<div class="c2"><div class="panel"><span class="tag">${L("Цільові цифри проєкту","Целевые цифры проекта")}</span><div class="tw tw--in"><table class="tnar"><tbody>
        ${r("budget",L("Рекламний бюджет на місяць","Рекламный бюджет в месяц"),"$")}${r("check",L("Середній чек","Средний чек"),"$")}${r("share",L("Частка маркетингу у виручці","Доля маркетинга в выручке"),"%")}${r("l2b",L("Лід → бронь або домовленість","Лид → бронь или договорённость"),"%")}${r("b2p",L("Бронь → оплата","Бронь → оплата"),"%")}</tbody></table></div></div>
        <div class="panel vf"><span class="tag">${L("Що з цього випливає","Что из этого следует")}</span><div id="w-calc">${calcP(p)}</div></div></div>
      <div class="panel"><div class="row sp"><span class="tag">${L("Зведення по воронках","Свод по воронкам")}</span>${p.funnels.length?(ok?pill("good",L("сходиться з ціллю проєкту","сходится с целью проекта")):pill("warn",L("воронки дають ","воронки дают ")+money(sum.rev)+L(" із "," из ")+money(tgt.rev))):""}</div>
        ${p.funnels.length?`<div class="tw tw--in"><table><thead><tr><th>${L("Воронка","Воронка")}</th><th class="n">${L("План оплат","План оплат")}</th><th class="n">${L("Чек","Чек")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${L("Лідів","Лидов")}</th><th class="n">${L("Стеля ліда","Потолок лида")}</th><th class="n">${L("Виручка","Выручка")}</th></tr></thead><tbody>
          ${p.funnels.map(f=>{ const x = fT(f,p); return `<tr data-act="wsOpenF" data-id="${f.id}" tabindex="0"><td><b>${esc(f.name)}</b></td><td class="n mono">${num(x.pay)}</td><td class="n mono">$${num(f.tg.check)}</td><td class="n mono">${money(x.bud)}</td><td class="n mono">${num(x.leads)}</td><td class="n mono">$${dec(x.cap)}</td><td class="n mono">${money(x.rev)}</td></tr>`; }).join("")}
          <tr class="sum"><td><b>${L("Проєкт","Проект")}</b></td><td class="n mono"><b>${num(sum.pay)}</b></td><td></td><td class="n mono"><b>${money(sum.bud)}</b></td><td class="n mono"><b>${num(sum.leads)}</b></td><td></td><td class="n mono"><b>${money(sum.rev)}</b></td></tr></tbody></table></div>`
          : empty(L("Воронок ще немає","Воронок ещё нет"), L("Цілі воронок зведуться сюди й звіряться з ціллю проєкту.","Цели воронок сведутся сюда и сверятся с целью проекта."))}
        <p class="sub">${L("Факт з’явиться тут же після підключення рекламних кабінетів і таблиці продажів.","Факт появится здесь же после подключения рекламных кабинетов и таблицы продаж.")}</p></div>`; },
    funnels: () => `<div class="row"><button class="btn btn--solid" data-act="modal" data-id="funnel">${L("Додати воронку","Добавить воронку")}</button></div>
      ${p.funnels.length?`<div class="cols">${p.funnels.map(f=>{ const c = fChain(f,p), done = c.filter(x=>x[2]).length, x = fT(f,p); return `<div class="panel"><div class="row sp"><h2>${esc(f.name)}</h2>${del("wsDelF", f.id)}</div><p class="sub">${esc(f.an.offer)}</p><div class="prog"><i style="width:${done/c.length*100}%"></i></div>
        <dl class="kv"><dt>${L("Готовність","Готовность")}</dt><dd class="mono">${done} / ${c.length}</dd><dt>${L("ЦА","ЦА")}</dt><dd class="mono">${fSegs(f,p).length} ${L("сегм.","сегм.")}</dd><dt>${L("Лендингів","Лендингов")}</dt><dd class="mono">${f.lands.length}</dd><dt>${L("Креативів","Креативов")}</dt><dd class="mono">${f.crs.length}</dd><dt>${L("План","План")}</dt><dd class="mono">${num(x.pay)} ${L("оплат","оплат")} · ${money(x.rev)}</dd></dl>
        <div class="row"><button class="btn btn--sm btn--solid" data-act="wsOpenF" data-id="${f.id}">${L("Відкрити","Открыть")}</button></div></div>`; }).join("")}</div>`
        : empty(L("Воронок ще немає","Воронок ещё нет"), L("Воронка — це один офер з ціною: вебінар, акція, лід-форма. У неї свої лендинги, креативи й цілі.","Воронка — это один оффер с ценой: вебинар, акция, лид-форма. У неё свои лендинги, креативы и цели."))}`,
    conn: () => `<p class="sub">${L("У прототипі кабінети не підключаються: позначте, що є, — інтегратор побачить список.","В прототипе кабинеты не подключаются: отметьте, что есть, — интегратор увидит список.")}</p>
      <div class="conn">${OBCONN().map(c=>`<div class="panel"><div class="row sp"><h2>${c[1]}</h2>${p.conn[c[0]]?pill("warn",L("до підключення","к подключению")):pill("mute",L("немає","нет"))}</div><p class="sub">${c[2]}</p><div class="row"><button class="btn btn--sm" data-act="wsConn" data-id="${c[0]}">${p.conn[c[0]]?L("Прибрати","Убрать"):L("Є, підключити","Есть, подключить")}</button></div></div>`).join("")}</div>`
  }[t]();
  const next = ch.find(c=>!c[2]);
  return `<button class="back" data-act="wsBackP">← ${esc(W.co.name)}</button>
  <div class="head"><div><span class="tag">${L("Проєкт","Проект")}</span><h1>${esc(p.name)}</h1></div>${next&&next[0]!==t?`<button class="btn" data-act="wsTab" data-v="${next[0]}">${L("Наступний крок: ","Следующий шаг: ")}${next[1]}</button>`:""}</div>
  ${stepper(ch, t, "wsTab")}${body}`;
}
function calcP(p){ const c = pT(p); return `<div class="kpis">${[[L("Виручка","Выручка"),money(c.rev)],[L("Оплат","Оплат"),num(c.pay)],[L("Лідів","Лидов"),num(c.leads)],[L("Стеля ліда","Потолок лида"),"$"+dec(c.cap)],["ROAS",dec(c.roas)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
  <p class="sub">${L("Стеля ціни ліда = лід → бронь × бронь → оплата × чек × частка маркетингу.","Потолок цены лида = лид → бронь × бронь → оплата × чек × доля маркетинга.")}</p>`; }
function calcF(f, p){ const x = fT(f,p); return `<div class="kpis">${[[L("Бюджет","Бюджет"),money(x.bud)],[L("Лідів","Лидов"),num(x.leads)],[L("Оплат","Оплат"),num(x.pay)],[L("Виручка","Выручка"),money(x.rev)],[L("Стеля ліда","Потолок лида"),"$"+dec(x.cap)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>`; }
function vFunnel(f, p){
  const ch = fChain(f,p), t = W.ftab, hasConn = Object.values(p.conn).some(Boolean);
  const ready = [[L("Офер і ціна","Оффер и цена"),ch[0][2]],[L("ЦА: хоча б один сегмент","ЦА: хотя бы один сегмент"),ch[1][2]],[L("Лендинг","Лендинг"),ch[2][2]],[L("Креативи: від трьох","Креативы: от трёх"),ch[3][2]],[L("Цілі воронки","Цели воронки"),ch[4][2]],[L("Кабінети відмічено до підключення","Кабинеты отмечены к подключению"),hasConn]];
  const camp = [slug(p.name), geoCode(p.geo), slug(f.name), f.goal==="form"?"Form":"Site", "ABO"].filter(Boolean).join("_");
  const body = {
    an: () => `<div class="panel"><span class="tag">${L("Анамнез воронки","Анамнез воронки")}</span><div class="form">
        ${fld("f.name",L("Назва воронки","Название воронки"))}${fld("f.tg.check",L("Ціна, $","Цена, $"),{num:1})}
        ${fld("f.an.offer",L("Офер: що саме пропонуємо","Оффер: что именно предлагаем"),{w:1,ph:L("безкоштовний урок → курс за $680","бесплатный урок → курс за $680")})}
        ${fld("f.an.promo",L("Акція","Акция"),{ph:L("бонус, знижка — або порожньо","бонус, скидка — или пусто")})}${fld("f.an.until",L("Діє до","Действует до"),{ph:"30.11"})}
        <div class="field w"><label>${L("Ціль реклами","Цель рекламы")}</label>${optsW("f.goal", [["site",L("Конверсія на сайті","Конверсия на сайте")],["form",L("Лід-форма","Лид-форма")]])}</div>
        ${fld("f.an.path",L("Шлях клієнта","Путь клиента"),{w:1})}${fld("f.an.event",L("Результат рахуємо до","Результат считаем до"),{ph:L("оплати","оплаты")})}${fld("f.an.diff",L("Чим відрізняється від інших воронок","Чем отличается от других воронок"))}
        ${fld("f.an.obj",L("Заперечення, які чують менеджери","Возражения, которые слышат менеджеры"),{w:1,area:3})}
        <div class="field w"><label>${L("Режим автономії","Режим автономии")}</label>${optsW("f.mode", [["adv",modeName("adv")],["btn",modeName("btn")],["auto",modeName("auto")]])}</div></div>
        <p class="sub">${L("Тон і заборонені формулювання успадковано з проєкту: ","Тон и запрещённые формулировки унаследованы из проекта: ")}${esc([p.ban, W.co.ban].filter(Boolean).join(" · ") || "—")}. ${L("Бот бере матеріали з бази знань проєкту й компанії: ","Бот берёт материалы из базы знаний проекта и компании: ")}${p.kb.length} + ${kbInh(p).length}.</p></div>`,
    aud: () => `<div class="panel"><span class="tag">${L("Сегменти з проєкту","Сегменты из проекта")}</span><p class="sub">${L("Вимкніть ті, на кого ця воронка не розрахована.","Выключите тех, на кого эта воронка не рассчитана.")}</p>
        ${p.segs.length?`<div class="segs">${p.segs.map(s=>`<div class="seg3${f.aud.off.includes(s.id)?" off":""}"><div class="row sp"><b>${esc(s.name)}</b><button type="button" class="sw" data-act="wsSegT" data-id="${s.id}" aria-pressed="${!f.aud.off.includes(s.id)}" aria-label="toggle"></button></div><span class="sub">${esc(s.pain)}</span></div>`).join("")}</div>`:empty(L("У проєкті ще немає сегментів","В проекте ещё нет сегментов"),L("Додайте їх у проєкті або тільки для цієї воронки нижче.","Добавьте их в проекте или только для этой воронки ниже."))}</div>
      <div class="panel"><span class="tag">${L("Тільки для цієї воронки","Только для этой воронки")} · ${f.aud.add.length}</span>${segList(f.aud.add, "wsDelFSeg")}${segAdder("fs", "wsAddFSeg")}</div>
      <div class="panel">${fld("f.aud.note",L("Чим аудиторія цієї воронки відрізняється","Чем аудитория этой воронки отличается"),{area:3,ph:L("наприклад: тільки ті, хто вже був на вебінарі","например: только те, кто уже был на вебинаре")})}</div>`,
    land: () => `<div class="panel"><span class="tag">${L("Лендинги","Лендинги")} · ${f.lands.length}</span>
        ${f.lands.map(l=>`<div class="item"><div class="row sp"><b class="mono">${esc(l.url)}</b>${del("wsDelLand", l.id)}</div>${l.note?`<span class="sub">${esc(l.note)}</span>`:""}
          <div class="utm"><code>${esc(l.url)}${l.url.includes("?")?"&":"?"}${UTM}</code><button class="btn btn--sm" data-act="wsCopy" data-id="${l.id}">${L("Копіювати","Копировать")}</button></div></div>`).join("") || empty(L("Лендингів ще немає","Лендингов ещё нет"), L("Додайте сторінку, на яку веде реклама.","Добавьте страницу, на которую ведёт реклама."))}
        <div class="form adder"><div class="field"><label for="ld-u">URL</label><input id="ld-u" placeholder="example.com/urok"></div><div class="field"><label for="ld-n">${L("Що на сторінці, для кого","Что на странице, для кого")}</label><input id="ld-n"></div><div class="row w"><button class="btn btn--sm" data-act="wsAddLand">${L("Додати лендинг","Добавить лендинг")}</button></div></div>
        <p class="sub">${L("Посилання для реклами збирається з єдиними мітками: назви кампанії, групи й оголошення підставляє майданчик.","Ссылка для рекламы собирается с едиными метками: названия кампании, группы и объявления подставляет площадка.")}</p></div>`,
    cr: () => { const segs = fSegs(f,p);
      return `<div class="panel"><span class="tag">${L("Креативи й тексти","Креативы и тексты")} · ${f.crs.length}</span>
        ${f.crs.length?`<div class="tw tw--in"><table><thead><tr><th>${L("Назва в UTM","Название в UTM")}</th><th>${L("Тип","Тип")}</th><th>${L("Перший кадр або думка","Первый кадр или мысль")}</th><th>${L("Сегмент","Сегмент")}</th><th>${L("Текст","Текст")}</th><th></th></tr></thead><tbody>
          ${f.crs.map(c=>`<tr><td class="mono"><b>${esc(c.slug)}</b>${c.name&&c.name!==c.slug?`<small class="pl">${esc(c.name)}</small>`:""}</td><td>${c.type==="img"?L("статика","статика"):L("відео","видео")}</td><td>${esc(c.hook)}</td><td>${esc((segs.find(s=>s.id===c.seg)||{}).name || "—")}</td><td class="sub">${esc(c.text)}</td><td class="n">${del("wsDelCr", c.id)}</td></tr>`).join("")}</tbody></table></div>`
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
        ${r("pay",L("План оплат на місяць","План оплат в месяц"),"")}${r("check",L("Чек","Чек"),"$")}${r("l2b",L("Лід → бронь","Лид → бронь"),"%")}${r("b2p",L("Бронь → оплата","Бронь → оплата"),"%")}</tbody></table></div>
        <p class="sub">${L("Конверсії взято з проєкту — змініть, якщо у цієї воронки вони інші. Частка маркетингу спільна: ","Конверсии взяты из проекта — измените, если у этой воронки они другие. Доля маркетинга общая: ")}${p.tg.share}%.</p></div>
        <div class="panel vf"><span class="tag">${L("План воронки","План воронки")}</span><div id="w-calc">${calcF(f,p)}</div></div></div>
      <div class="panel"><span class="tag">${L("Аналітика","Аналитика")}</span>
        <div class="tw tw--in"><table><thead><tr><th>${L("Показник","Показатель")}</th><th class="n">${L("Ціль","Цель")}</th><th class="n">${L("Факт","Факт")}</th></tr></thead><tbody>
        ${(()=>{ const x = fT(f,p); return [[L("Витрати","Расход"),money(x.bud)],[L("Ліди","Лиды"),num(x.leads)],[L("Ціна ліда","Цена лида"),"≤ $"+dec(x.cap)],[L("Лід → бронь","Лид → бронь"),pc(f.tg.l2b)],[L("Бронь → оплата","Бронь → оплата"),pc(f.tg.b2p,0)],[L("Оплати","Оплаты"),num(x.pay)],[L("Виручка","Выручка"),money(x.rev)],["ROAS",dec(100/p.tg.share)]].map(a=>`<tr><td>${a[0]}</td><td class="n mono">${a[1]}</td><td class="n mono sub">—</td></tr>`).join(""); })()}</tbody></table></div>
        <p class="sub">${L("Факт рахується по даті вебінару і до оплати. З’явиться після першого запуску; як це виглядає — у заповненому прикладі.","Факт считается по дате вебинара и до оплаты. Появится после первого запуска; как это выглядит — в заполненном примере.")}</p></div>`; }
  }[t]();
  return `<button class="back" data-act="wsBackF">← ${esc(p.name)}</button>
  <div class="head"><div><span class="tag">${L("Воронка","Воронка")}</span><h1>${esc(f.name)}</h1><p class="sub">${esc(f.an.offer)}</p></div></div>
  ${stepper(ch, t, "wsFtab")}${body}
  <div class="panel vf"><div class="row sp"><span class="tag">${L("Готовність до запуску","Готовность к запуску")} · ${ready.filter(r=>r[1]).length} / ${ready.length}</span></div>
    <ul class="steps">${ready.map(r=>`<li class="${r[1]?"ok":""}">${r[0]}</li>`).join("")}</ul>
    <p class="sub">${L("Назва кампанії буде такою: ","Название кампании будет таким: ")}<span class="mono">${esc(camp)}</span>. ${L("Кампанія збирається вимкненою, вмикає людина.","Кампания собирается выключенной, включает человек.")}</p></div>`;
}
function modalFunnelOwn(){ const p = P();
  return `<div class="ob"><div class="row sp"><div><span class="tag">${esc(p.name)}</span><h1>${L("Нова воронка","Новая воронка")}</h1></div><button class="x" data-act="closeOverlay" aria-label="close">×</button></div>
    <div class="form"><div class="field w"><label for="nf-name">${L("Назва","Название")}</label><input id="nf-name" placeholder="${L("Вебінар, повна ціна","Вебинар, полная цена")}"></div>
      <div class="field w"><label for="nf-offer">${L("Офер: що пропонуємо","Оффер: что предлагаем")}</label><input id="nf-offer" placeholder="${L("безкоштовний урок → курс","бесплатный урок → курс")}"></div>
      <div class="field"><label for="nf-price">${L("Ціна, $","Цена, $")}</label><input id="nf-price" value="${p.tg.check}" inputmode="decimal"></div>
      <div class="field"><label for="nf-goal">${L("Ціль","Цель")}</label><select id="nf-goal"><option value="site">${L("Конверсія на сайті","Конверсия на сайте")}</option><option value="form">${L("Лід-форма","Лид-форма")}</option></select></div>
      <div class="field w"><label for="nf-url">${L("Лендинг","Лендинг")}</label><input id="nf-url" placeholder="${esc(p.site || "example.com/page")}"></div></div>
    <p class="sub">${L("ЦА, тон і конверсії успадкуються з проєкту. Усе можна змінити всередині воронки.","ЦА, тон и конверсии унаследуются из проекта. Всё можно изменить внутри воронки.")}</p>
    <div class="row"><button class="btn btn--solid" data-act="createFunnel">${L("Створити воронку","Создать воронку")}</button></div></div>`; }
function ownAudStep(o){ return `<p class="sub">${L("Хто купує. Можна додати зараз або пізніше в проєкті; у воронках аудиторію можна звужувати.","Кто покупает. Можно добавить сейчас или позже в проекте; в воронках аудиторию можно сужать.")}</p>
  ${segList(o.segsOwn, "obSegDel")}${segAdder("os", "obSegAdd")}`; }

/* ---------- оболочка ---------- */
function ownShell(){
  const p = P(), f = F(), nb = (act, v, t, on) => `<a role="button" tabindex="0" data-act="${act}" data-v="${v}" ${on?'aria-current="page"':""}>${t}</a>`;
  $("rail").innerHTML = `<a class="logo" href="index.html"><i></i>RAKURS</a>
    ${W.user&&W.co?`<button type="button" class="ws" data-act="wsBackP"><small>${L("Компанія","Компания")}</small><b>${esc(W.co.name)}</b></button>
    <nav class="navg"><span>${L("Компанія","Компания")}</span>${nb("wsCtab","projects",L("Проєкти","Проекты")+(W.projs.length?` <b class="cnt">${W.projs.length}</b>`:""),!p&&W.ctab==="projects")}${nb("wsCtab","kb",L("База знань","База знаний")+(W.co.kb.length?` <b class="cnt">${W.co.kb.length}</b>`:""),!p&&W.ctab==="kb")}${nb("wsCtab","acc",L("Акаунт","Аккаунт"),!p&&W.ctab==="acc")}</nav>`:""}
    ${W.user&&p?`<nav class="navg"><span>${esc(p.name)}</span>${pChain(p).map(c=>nb("wsTab",c[0],c[1]+(c[2]?"":" <em>·</em>"),!f&&W.tab===c[0])).join("")}</nav>`:""}
    ${W.user&&f?`<nav class="navg"><span>${esc(f.name)}</span>${fChain(f,p).map(c=>nb("wsFtab",c[0],c[1]+(c[2]?"":" <em>·</em>"),W.ftab===c[0])).join("")}</nav>`:""}
    <div class="rail__foot">${W.user?`<div class="me"><small>${W.user.via==="tg"?"Telegram":L("Пошта","Почта")} · ${L("підтверджено","подтверждено")}</small><b>${esc(W.user.id)}</b></div><button type="button" data-act="wsLogout">${L("Вийти","Выйти")}</button>`:""}<button type="button" data-act="wsSample">${L("Приклад «Школа 3D»","Пример «Школа 3D»")}</button><button type="button" data-act="theme">${L("Тема: світла / темна","Тема: светлая / тёмная")}</button>
      <a href="index.html">← ${L("На сайт","На сайт")}</a></div>`;
  $("bar").innerHTML = `<span class="crumb">${[W.co&&W.co.name, p&&p.name, f&&f.name].filter(Boolean).map(esc).join(" › ") || (W.user?L("Нова компанія","Новая компания"):L("Реєстрація","Регистрация"))}</span><span class="badge">${L("прототип · дані у браузері","прототип · данные в браузере")}</span>
    <div class="bar__r"><div class="seg tier" role="group" aria-label="version"><button type="button" data-act="tier" data-v="lite" aria-pressed="${S.tier==="lite"}">Lite</button><button type="button" data-act="tier" data-v="pro" aria-pressed="${S.tier==="pro"}">Pro</button></div><div class="lang" role="group" aria-label="language"><button type="button" data-lang="uk" aria-pressed="${lang==="uk"}">UA</button><button type="button" data-lang="ru" aria-pressed="${lang==="ru"}">RU</button></div></div>`;
  $("frozen").hidden = true; $("fab").hidden = true; document.documentElement.lang = lang;
}
function ownView(){ const p = P(), f = F(); return !W.user ? vAuth() : !W.co ? vWelcome() : !p ? vCompany() : f ? vFunnel(f, p) : vProject(p); }
let ownKey = "";
const _rs = renderShell, _rv = renderView, _ra = renderAsst, _mf = modalFunnel;
renderShell = function(){ if (own()) ownShell(); else { _rs(); const ft = document.querySelector(".rail__foot"); if (ft) ft.insertAdjacentHTML("afterbegin", `<button type="button" data-act="wsOwn">← ${L("Моя компанія","Моя компания")}</button>`); } };
renderView = function(){ if (!own()) return _rv(); const v = $("view"), k = [W.cur, W.fun, W.tab, W.ftab, W.ctab, !!W.co, !!W.user, AU.via, AU.step, AU.login].join("|"); v.innerHTML = ownView(); if (k !== ownKey) { enter(v); ownKey = k; window.scrollTo(0,0); } };
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
const need = (v, t) => { if (!v) { toast(t); return false; } return true; };
const _mod = ACT.modal, _cp = ACT.createProject, _cf = ACT.createFunnel, _oc = ACT.obConn, _on = ACT.obNav;
Object.assign(ACT, {
  wsAuthVia(d){ AU.via = d.v; AU.step = 0; AU.id = ""; },
  wsAuthMode(){ AU.login = !AU.login; AU.step = 0; },
  wsAuthBack(){ AU.step = 0; },
  wsAuthSend(){ const m = val("au-mail").toLowerCase(); if (!need(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m), L("Перевірте адресу пошти","Проверьте адрес почты"))) return false;
    if (!authGate(m)) return false; if (!AU.login && !need($("au-ok").checked, L("Потрібна згода з умовами","Нужно согласие с условиями"))) return false; AU.id = m; AU.step = 1; },
  wsAuthCode(){ if (!need(/^\d{6}$/.test(val("au-code")), L("Код — шість цифр","Код — шесть цифр"))) return false; authDone("email", AU.id); },
  wsAuthTg(){ const u = val("au-tg").replace(/^@+/, ""); if (!need(/^[A-Za-z0-9_]{4,32}$/.test(u), L("Нік: латиниця, цифри й _, від 4 символів","Ник: латиница, цифры и _, от 4 символов"))) return false;
    if (!authGate("@" + u)) return false; if (!AU.login && !need($("au-ok").checked, L("Потрібна згода з умовами","Нужно согласие с условиями"))) return false; AU.id = "@" + u; AU.step = 1; },
  wsAuthTgOk(){ authDone("tg", AU.id); },
  wsLogout(){ save(); W = blankW(); AU = auFresh(); AU.login = true; try { localStorage.setItem("rakurs_ws", JSON.stringify(W)); } catch (e) {} toast(L("Ви вийшли. Дані збережено в акаунті","Вы вышли. Данные сохранены в аккаунте")); },
  wsCtab(d){ W.cur = null; W.fun = null; W.ctab = d.v; save(); },
  wsGoCoKb(){ W.cur = null; W.fun = null; W.ctab = "kb"; save(); },
  wsBrandOwn(d){ P().brand.own = d.v === "1"; save(); },
  wsKbT(d){ const p = P(), i = p.kbOff.indexOf(d.id); if (i < 0) p.kbOff.push(d.id); else p.kbOff.splice(i, 1); save(); },
  wsExport(){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(Object.assign({}, W, {wipe:false}), null, 1)], {type:"application/json"})); a.download = "rakurs_" + slug(W.co.name) + ".json"; document.body.appendChild(a); a.click(); a.remove(); toast(L("Якщо файл не завантажився, скористайтесь «Скопіювати копію»","Если файл не скачался, воспользуйтесь «Скопировать копию»")); return false; },
  wsCopyAll(){ (navigator.clipboard ? navigator.clipboard.writeText(JSON.stringify(W)) : Promise.reject()).then(()=>toast(L("Копію скопійовано в буфер","Копия скопирована в буфер")), ()=>toast(L("Браузер не дав скопіювати — завантажте файл","Браузер не дал скопировать — скачайте файл"))); return false; },
  wsKind(d){ W.kind = d.v; const n = val("co-name"); renderView(); const e = $("co-name"); if (e) e.value = n; return false; },
  wsCo(){ const n = val("co-name"); if (!need(n, L("Введіть назву компанії","Введите название компании"))) return false; W.co = {name:n, kind:W.kind || "own"}; norm(); save(); },
  wsSample(){ W.mode = "sample"; save(); location.hash = "today"; lastRoute = null; },
  wsOwn(){ W.mode = "own"; S.cr = S.launch = S.modal = null; S.asst.open = false; save(); ownKey = ""; },
  wsBackP(){ W.cur = null; W.fun = null; W.ctab = "projects"; save(); },
  wsOpenP(d){ W.cur = d.id; W.fun = null; W.tab = "about"; save(); },
  wsTab(d){ W.fun = null; W.tab = d.v; save(); },
  wsDelP(d){ W.projs = W.projs.filter(p=>p.id!==d.id); save(); toast(L("Проєкт видалено","Проект удалён")); },
  wsSet(d){ wset(d.k, d.v); if (d.k === "p.sale") { /* путь клиента новых воронок берётся из схемы продажи */ } },
  wsAddSeg(){ const n = val("sg-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"))) return false; P().segs.push({id:uid(), name:n, pain:val("sg-p"), say:val("sg-s")}); save(); },
  wsDelSeg(d){ const p = P(); p.segs = p.segs.filter(s=>s.id!==d.id); p.funnels.forEach(f=>{ f.aud.off = f.aud.off.filter(x=>x!==d.id); }); save(); },
  wsAddKb(d){ const t = val("kb-"+d.id+"-t"); if (!need(t, L("Дайте матеріалу назву","Дайте материалу название"))) return false; kbHolder(W.cur ? "p" : "co").kb.push({id:uid(), type:d.id, title:t, src:val("kb-"+d.id+"-s"), note:val("kb-"+d.id+"-n")}); save(); },
  wsDelKb(d){ const h = kbHolder(W.cur ? "p" : "co"); h.kb = h.kb.filter(i=>i.id!==d.id); if (!W.cur) W.projs.forEach(p=>{ p.kbOff = p.kbOff.filter(x=>x!==d.id); }); save(); },
  wsDelFile(d){ const a = wget(d.k); a.splice(+d.id, 1); save(); },
  wsConn(d){ const p = P(); p.conn[d.id] = p.conn[d.id] ? 0 : 3; save(); },
  wsOpenF(d){ W.fun = d.id; W.ftab = "an"; save(); },
  wsBackF(){ W.fun = null; W.tab = "funnels"; save(); },
  wsFtab(d){ W.ftab = d.v; save(); },
  wsDelF(d){ const p = P(); p.funnels = p.funnels.filter(f=>f.id!==d.id); save(); toast(L("Воронку видалено","Воронка удалена")); },
  wsSegT(d){ const f = F(), i = f.aud.off.indexOf(d.id); if (i < 0) f.aud.off.push(d.id); else f.aud.off.splice(i, 1); save(); },
  wsAddFSeg(){ const n = val("fs-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"))) return false; F().aud.add.push({id:uid(), name:n, pain:val("fs-p"), say:val("fs-s")}); save(); },
  wsDelFSeg(d){ const f = F(); f.aud.add = f.aud.add.filter(s=>s.id!==d.id); save(); },
  wsAddLand(){ const u = val("ld-u"); if (!need(u, L("Вкажіть адресу сторінки","Укажите адрес страницы"))) return false; F().lands.push({id:uid(), url:u.replace(/^https?:\/\//,""), note:val("ld-n")}); save(); },
  wsDelLand(d){ const f = F(); f.lands = f.lands.filter(l=>l.id!==d.id); save(); },
  wsCopy(d){ const l = F().lands.find(x=>x.id===d.id), t = "https://" + l.url + (l.url.includes("?")?"&":"?") + UTM; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast(L("Посилання скопійовано","Ссылка скопирована")), ()=>toast(L("Виділіть посилання й скопіюйте вручну","Выделите ссылку и скопируйте вручную"))); return false; },
  wsAddCr(){ const n = val("cr-n"), h = val("cr-h"); if (!need(n || h, L("Дайте креативу назву або опишіть перший кадр","Дайте креативу название или опишите первый кадр"))) return false; const f = F(); f.crs.push({id:uid(), name:n, slug:slug(n) || "creative_" + (f.crs.length+1), type:$("cr-t").value, hook:h, seg:$("cr-s").value, text:val("cr-x")}); save(); },
  wsDelCr(d){ const f = F(); f.crs = f.crs.filter(c=>c.id!==d.id); save(); },
  wsWipe(){ if (!W.wipe) { W.wipe = true; later(()=>{ if (W.wipe) { W.wipe = false; render(); } }, 4000); return; } try { if (W.user) localStorage.removeItem(accKey(W.user.id)); } catch (e) {} W = blankW(); AU = auFresh(); save(); toast(L("Акаунт і дані видалено","Аккаунт и данные удалены")); },
  obSegAdd(){ const n = val("os-n"); if (!need(n, L("Опишіть сегмент","Опишите сегмент"))) return false; S.ob.segsOwn.push({id:uid(), name:n, pain:val("os-p"), say:val("os-s")}); },
  obSegDel(d){ S.ob.segsOwn = S.ob.segsOwn.filter(s=>s.id!==d.id); },
  obConn(d){ if (own()) { S.ob.conn[d.id] = 3; return; } return _oc(d); },
  obNav(d){ if (own() && S.ob.step === 0 && +d.v > 0 && !String(S.ob.d.name).trim()) { toast(L("Введіть назву проєкту","Введите название проекта")); return false; } return _on(d); },
  createProject(){ if (!own()) return _cp(); const o = S.ob, d = o.d;
    const p = {id:uid(), name:String(d.name).trim(), niche:d.niche, geo:d.geo, site:d.site, product:d.product, sale:d.sale, desc:"", worked:d.worked, ban:d.ban, tone:d.tone,
      tg:{budget:d.budget, check:d.check, share:d.share, l2b:d.l2b, b2p:d.b2p}, segs:o.segsOwn, audText:"", audFiles:[], brand:Object.assign(blankBrand(), {own:false}), kb:[], kbOff:[], conn:Object.assign(W.user && W.user.via === "tg" ? {tg:3} : {}, o.conn), funnels:[]};
    W.projs.push(p); W.cur = p.id; W.fun = null; W.tab = p.segs.length ? "kb" : "aud"; S.modal = null; S.ob = null; save(); toast(L("Проєкт створено. Далі — база знань і воронки","Проект создан. Дальше — база знаний и воронки")); },
  createFunnel(){ if (!own()) return _cf(); const p = P(), n = val("nf-name"); if (!need(n, L("Дайте воронці назву","Дайте воронке название"))) return false;
    const check = nfv("nf-price") || p.tg.check, u = val("nf-url").replace(/^https?:\/\//,""), first = !p.funnels.length;
    const f = {id:uid(), name:n, goal:$("nf-goal").value, mode:"btn", an:{offer:val("nf-offer"), promo:"", until:"", path:PATHS()[p.sale] || PATHS().web, event:L("оплати","оплаты"), diff:"", obj:""},
      aud:{off:[], add:[], note:""}, lands:u?[{id:uid(), url:u, note:""}]:[], crs:[], tg:{pay: first ? Math.max(1, Math.round(pT(p).rev / check)) : 10, check, l2b:p.tg.l2b, b2p:p.tg.b2p}};
    p.funnels.push(f); W.fun = f.id; W.ftab = "an"; S.modal = null; save(); toast(L("Воронку створено","Воронка создана")); }
});
document.addEventListener("input", e => { const t = e.target; if (!t.dataset.w || !own()) return; const path = t.dataset.w, isN = /\.tg\./.test(path);
  if (isN) { const n = pnum(t.value); if (!(n > 0)) return; wset(path, n); const c = $("w-calc"); if (c) c.innerHTML = F() ? calcF(F(), P()) : calcP(P()); } else wset(path, t.value); });
document.addEventListener("change", e => { const t = e.target; if (!own()) return;
  if (t.dataset.wimp) { const f = t.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !d.co || !Array.isArray(d.projs)) throw 0; W = Object.assign(blankW(), d, {user:W.user, mode:"own", cur:null, fun:null, ctab:"projects", wipe:false}); norm(); save(); render(); toast(L("Дані відновлено з копії","Данные восстановлены из копии")); } catch (x) { toast(L("Це не файл копії кабінету","Это не файл копии кабинета")); } };
    r.readAsText(f); return; }
  if (t.dataset.wf) { const names = [...t.files].map(f=>f.name); if (!names.length) return;
    if (t.dataset.wf.startsWith("kb.")) { const h = kbHolder(W.cur ? "p" : "co"), ty = t.dataset.wf.slice(3); names.forEach(n => h.kb.push({id:uid(), type:ty, title:n.replace(/\.[a-z0-9]{2,5}$/i,""), src:n, note:""})); save(); renderView(); renderShell(); return; }
    if (t.dataset.wf === "f.crs") { const f = F(); names.forEach(n => f.crs.push({id:uid(), name:n, slug:slug(n) || "creative_" + (f.crs.length+1), type:/\.(png|jpe?g|webp|gif)$/i.test(n)?"img":"video", hook:"", seg:"", text:""})); save(); }
    else { const a = wget(t.dataset.wf); if (Array.isArray(a)) a.push(...names); else wset(t.dataset.wf, names); save(); }
    renderView(); return; }
  if (t.dataset.w) { renderShell(); if (/^(p\.name|f\.name|co\.name|p\.brand\.|co\.brand\.colors|p\.tg\.|f\.tg\.)/.test(t.dataset.w)) renderView(); } });
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("a[role=button][data-act]")) { e.preventDefault(); e.target.click(); } });
render();
