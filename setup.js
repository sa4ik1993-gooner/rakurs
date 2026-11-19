/* Lite / Pro, анкета нового проекта, цели проекта и воронок, сводная аналитика.
   Подключается после app.js и дополняет его: те же V, ACT, S. */
const lite = () => S.tier === "lite";
const pc = (n, d = 1) => dec(n, d) + "%";
const lt = c => `<i class="lt lt--${c}"></i>`;
const pf = (fact, plan) => `<b>${fact}</b><small class="pl">${L("ціль","цель")} ${plan}</small>`;

/* ---------- данные: когорты по дате вебинара × воронки: [расход, лиды, брони, оплаты] ---------- */
const COH = [
  {d:"08.11", ripe:100, f:{f1:[2330,554,39,22], f3:[150,36,2,1]}},
  {d:"12.11", ripe:90,  f:{f1:[2600,602,40,21], f3:[160,38,3,1]}},
  {d:"15.11", ripe:55,  f:{f1:[1890,432,25,1], f2:[840,200,13,8], f3:[170,40,2,0]}},
  {d:"19.11", ripe:10,  f:{f1:[940,202,4,0],   f2:[1300,310,18,2], f3:[160,38,2,0]}}];
const cohSum = (c, fid) => { const ks = fid && fid !== "all" ? [fid] : Object.keys(c.f); return ks.reduce((a,k)=>{ const v = c.f[k]; if (v) v.forEach((x,i)=>a[i]+=x); return a; }, [0,0,0,0]); };
const fBook = f => COH.reduce((s,c)=>s+(c.f[f.id]?c.f[f.id][2]:0), 0);
const fRipe = f => { const a = COH.filter(c=>c.ripe>=90).reduce((s,c)=>{ const v=c.f[f.id]; if (v) { s[0]+=v[2]; s[1]+=v[3]; } return s; }, [0,0]); return a[0] ? a[1]/a[0]*100 : null; };

/* ---------- цели: воронка задаёт план оплат и две конверсии, остальное считается ---------- */
function fPlan(f){ const t = f.tg, rv = t.pay * t.check, bud = rv * S.share / 100, book = t.pay / (t.b2p/100), leads = book / (t.l2b/100); return {pay:t.pay, rev:rv, bud, book, leads}; }
function pPlan(){ return S.funnels.reduce((a,f)=>{ const p = fPlan(f); a.pay+=p.pay; a.rev+=p.rev; a.bud+=p.bud; a.book+=p.book; a.leads+=p.leads; return a; }, {pay:0,rev:0,bud:0,book:0,leads:0}); }
function pFact(){ return S.funnels.reduce((a,f)=>{ a.spend+=f.spend; a.leads+=f.leads; a.book+=fBook(f); a.pay+=f.pay; a.rev+=f.pay*f.tg.check; return a; }, {spend:0,leads:0,book:0,pay:0,rev:0}); }
const rate = (fact, tgt) => fact == null ? "mute" : fact >= tgt*0.95 ? "good" : fact >= tgt*0.8 ? "warn" : "crit";
function fLights(f){
  const cpl = f.leads ? (f.spend/f.leads <= f.cap ? "good" : f.spend/f.leads <= f.cap*1.2 ? "warn" : "crit") : "mute";
  const l2b = f.leads ? rate(fBook(f)/f.leads*100, f.tg.l2b) : "mute";
  const b2p = rate(fRipe(f), f.tg.b2p);
  const all = [cpl,l2b,b2p], worst = all.includes("crit") ? "crit" : all.includes("warn") ? "warn" : all.every(x=>x==="mute") ? "mute" : (b2p==="mute" ? "warn" : "good");
  return {cpl,l2b,b2p,worst};
}
const LWORD = () => ({good:L("за планом","по плану"),warn:L("рано судити","рано судить"),crit:L("потрібна увага","нужно внимание"),mute:L("ще немає даних","данных ещё нет")});
function fVerdict(f){
  const x = fLights(f), cpl = f.leads ? "$"+dec(f.spend/f.leads) : "—";
  if (!f.leads) return L("Воронку створено, запусків ще не було. Цифри з’являться після першого вебінару.","Воронка создана, запусков ещё не было. Цифры появятся после первого вебинара.");
  if (x.l2b === "crit") return L(`Заявки недорогі (${cpl}), але до броні доходить ${dec(fBook(f)/f.leads*100,0)} зі 100 за цілі ${f.tg.l2b}. Проблема не в рекламі, а в обробці заявок: подивіться, як швидко їм відповідають.`,`Заявки недорогие (${cpl}), но до брони доходит ${dec(fBook(f)/f.leads*100,0)} из 100 при цели ${f.tg.l2b}. Проблема не в рекламе, а в обработке заявок: посмотрите, как быстро им отвечают.`);
  if (x.b2p === "mute") return L(`Заявка коштує ${cpl} за стелі $${dec(f.cap)}. Оплати з цих вебінарів ще надходять, висновок робити зарано.`,`Заявка стоит ${cpl} при потолке $${dec(f.cap)}. Оплаты с этих вебинаров ещё поступают, вывод делать рано.`);
  if (x.worst === "good") return L(`Заявка коштує ${cpl} за стелі $${dec(f.cap)}, з дозрілих вебінарів оплачує ${dec(fRipe(f),0)}% броней за цілі ${f.tg.b2p}%. Можна додавати бюджет.`,`Заявка стоит ${cpl} при потолке $${dec(f.cap)}, с дозревших вебинаров оплачивает ${dec(fRipe(f),0)}% броней при цели ${f.tg.b2p}%. Можно добавлять бюджет.`);
  return L(`Заявка коштує ${cpl} за стелі $${dec(f.cap)}. Є відхилення від цілей, деталі в таблиці.`,`Заявка стоит ${cpl} при потолке $${dec(f.cap)}. Есть отклонения от целей, детали в таблице.`);
}
const fN = f => f.name || fname(f.id);

/* ---------- аудитория ---------- */
const SEG3D = () => [
  [L("Шукають нову професію","Ищут новую профессию"),L("30–45, втомились від найму, бояться, що «пізно вчитися»","30–45, устали от найма, боятся, что «поздно учиться»"),L("показувати роботи учнів того ж віку","показывать работы учеников того же возраста")],
  [L("Дизайнери інтер’єрів","Дизайнеры интерьеров"),L("малюють від руки або в 2D, клієнти просять візуалізацію","рисуют от руки или в 2D, клиенты просят визуализацию"),L("говорити про чек проєкту, а не про програму","говорить о чеке проекта, а не о программе")],
  [L("Мами в декреті","Мамы в декрете"),L("є 2 години ввечері, потрібен дохід з дому","есть 2 часа вечером, нужен доход из дома"),L("розклад і формат занять у першому кадрі","расписание и формат занятий в первом кадре")]];
const SEGX = () => [L("Рієлтори","Риелторы"),L("хочуть показувати порожні квартири з меблями","хотят показывать пустые квартиры с мебелью"),L("кейс «до і після» за один вечір","кейс «до и после» за один вечер")];
const SEGEN = () => [
  [L("Айтішники перед співбесідою","Айтишники перед собеседованием"),L("читають документацію, але мовчать на дзвінках","читают документацию, но молчат на созвонах"),L("розмовна практика з першого уроку","разговорная практика с первого урока")],
  [L("Менеджери з іноземними клієнтами","Менеджеры с иностранными клиентами"),L("бояться листів і презентацій англійською","боятся писем и презентаций на английском"),L("англійська під робочі ситуації","английский под рабочие ситуации")],
  [L("Готуються до переїзду","Готовятся к переезду"),L("є дата, мало часу","есть дата, мало времени"),L("план на 3 місяці до конкретного рівня","план на 3 месяца до конкретного уровня")]];
const segHTML = a => `<div class="segs">${a.map(s=>`<div class="seg3"><b>${s[0]}</b><span class="sub">${s[1]}</span><span class="mono">→ ${s[2]}</span></div>`).join("")}</div>`;
function audBlock(o, act){
  const tabs = [["files",L("Завантажити файли","Загрузить файлы")],["text",L("Описати своїми словами","Описать своими словами")],["quiz",L("Відповісти на питання","Ответить на вопросы")]];
  const Q = [[L("Хто купує найчастіше?","Кто покупает чаще всего?"),L("вік, чим займається","возраст, чем занимается")],[L("Що в них сталося перед покупкою?","Что у них случилось перед покупкой?"),L("подія або причина","событие или причина")],[L("Що зупиняє тих, хто не купив?","Что останавливает тех, кто не купил?"),L("заперечення з продажів","возражения из продаж")],[L("Де вони проводять час?","Где они проводят время?"),L("соцмережі, спільноти","соцсети, сообщества")]];
  const body = o.tab === "files"
    ? (o.files ? o.files.map(f=>`<div class="file"><span class="mono">${f.n}</span><span class="sub mono">${f.p>=100?L("прочитано","прочитано"):f.p+"%"}</span><div class="prog"><i style="width:${f.p}%"></i></div></div>`).join("")
      : `<button type="button" class="drop" data-act="${act}Files"><b>${L("Додати файли","Добавить файлы")}</b><span class="sub">${L("Портрет клієнта, вивантаження з CRM, записи дзвінків, відгуки. PDF, таблиці, аудіо.","Портрет клиента, выгрузка из CRM, записи звонков, отзывы. PDF, таблицы, аудио.")}</span></button>`)
    : o.tab === "text"
    ? `<div class="field"><label for="aud-t">${L("Опишіть покупця, як розповіли б новому менеджеру","Опишите покупателя, как рассказали бы новому менеджеру")}</label><textarea id="aud-t" rows="5">${o.text}</textarea></div>`
    : `<div class="form">${Q.map((q,i)=>`<div class="field"><label for="aud-q${i}">${q[0]}</label><input id="aud-q${i}" placeholder="${q[1]}"></div>`).join("")}</div>`;
  const ready = o.tab !== "files" || (o.files && o.files.every(f=>f.p>=100));
  return `<div class="seg" role="group">${tabs.map(t=>`<button type="button" data-act="${act}Tab" data-v="${t[0]}" aria-pressed="${o.tab===t[0]}">${t[1]}</button>`).join("")}</div>
    ${body}
    ${o.seg ? `<div class="panel vf"><span class="tag">${L("Бот виділив сегменти","Бот выделил сегменты")}</span>${segHTML(o.segs())}<p class="sub">${L("Під кожен сегмент бот готує окремі тексти й перший кадр. Сегменти можна правити будь-коли.","Под каждый сегмент бот готовит отдельные тексты и первый кадр. Сегменты можно править в любой момент.")}</p></div>`
      : `<div class="row"><button class="btn" data-act="${act}Parse" ${ready?"":"disabled"}>${L("Розібрати й виділити сегменти","Разобрать и выделить сегменты")}</button></div>`}`;
}

/* ---------- анкета нового проекта ---------- */
const OBS = () => [L("Проєкт","Проект"),L("Акаунти","Аккаунты"),L("Анамнез","Анамнез"),L("Цілі","Цели"),L("Аудиторія","Аудитория"),L("Підсумок","Итог")];
const obFresh = () => ({step:0, q:0, conn:{}, tab:"files", files:null, seg:false, segs:SEGEN,
  text:L("Дорослі 25–45, англійська потрібна для роботи. Найчастіше приходять перед співбесідою або коли з’являються іноземні клієнти.","Взрослые 25–45, английский нужен для работы. Чаще всего приходят перед собеседованием или когда появляются иностранные клиенты."),
  d:{name:L("Школа англійської","Школа английского"), niche:L("онлайн-освіта","онлайн-образование"), geo:L("Україна","Украина"), site:"english.example/trial",
     product:L("Курс розмовної англійської, 3 місяці","Курс разговорного английского, 3 месяца"), sale:"call",
     worked:L("Відео з викладачем і відгуки учнів","Видео с преподавателем и отзывы учеников"), ban:L("«заговорите за місяць», «гарантія рівня»","«заговорите за месяц», «гарантия уровня»"), tone:L("дружній, без обіцянок швидкого результату","дружелюбный, без обещаний быстрого результата"),
     budget:3000, check:320, share:25, l2b:8, b2p:45}});
function obCalc(d){ const rv = d.budget / (d.share/100), pay = rv / d.check, book = pay / (d.b2p/100), leads = book / (d.l2b/100); return {rev:rv, pay, book, leads, cap:d.l2b/100*d.b2p/100*d.check*d.share/100, roas:100/d.share}; }
function obCalcHTML(d){ const c = obCalc(d);
  return `<div class="kpis">${[[L("Виручка з реклами","Выручка с рекламы"),money(c.rev)],[L("Оплат на місяць","Оплат в месяц"),num(c.pay)],[lite()?L("Заявок потрібно","Заявок нужно"):L("Лідів потрібно","Лидов нужно"),num(c.leads)],[lite()?L("Заявка не дорожче","Заявка не дороже"):L("Стеля ціни ліда","Потолок цены лида"),"$"+dec(c.cap)],[lite()?L("Повернення з $1","Возврат с $1"):"ROAS",lite()?"$"+dec(c.roas):dec(c.roas)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>`; }
const inp = (k, label, w) => `<div class="field${w?" w":""}"><label for="ob-${k}">${label}</label><input id="ob-${k}" data-ob="${k}" value="${S.ob.d[k]}"></div>`;
const SALE = () => [["web",L("Вебінар → бронь → оплата","Вебинар → бронь → оплата")],["call",L("Заявка → дзвінок → оплата","Заявка → звонок → оплата")],["site",L("Оплата одразу на сайті","Оплата сразу на сайте")]];
const OBCONN = () => [["meta","Meta Ads",L("кабінет, піксель, сторінка","кабинет, пиксель, страница"),1],["tt","TikTok Ads",L("рекламний кабінет","рекламный кабинет"),1],["gg","Google Ads",L("рекламний кабінет","рекламный кабинет"),1],
  ["crm",L("Продажі: CRM або таблиця","Продажи: CRM или таблица"),L("щоб рахувати до оплати, а не до заявки","чтобы считать до оплаты, а не до заявки"),0],["drive",L("Папка з роликами","Папка с роликами"),"Google Drive / Dropbox",1],["tg","Telegram",L("куди бот пише і де його питають","куда бот пишет и где его спрашивают"),1]];
function obQuiz(){
  const d = S.ob.d, q = S.ob.q;
  const opt = (k, v, t) => `<button type="button" class="opt" data-act="obSet" data-k="${k}" data-v="${v}" aria-pressed="${d[k]===v}">${t}</button>`;
  const QS = [
    [L("Скільки готові витрачати на рекламу на місяць?","Сколько готовы тратить на рекламу в месяц?"),L("Можна приблизно. Бот не витратить більше без вашого підтвердження.","Можно примерно. Бот не потратит больше без вашего подтверждения."),[1000,3000,5000,10000].map(v=>opt("budget",v,money(v))).join("")],
    [L("Скільки в середньому платить один клієнт?","Сколько в среднем платит один клиент?"),L("Середній чек. Якщо є розстрочка — повна сума.","Средний чек. Если есть рассрочка — полная сумма."),[150,320,500,900].map(v=>opt("check",v,money(v))).join("")],
    [L("Яку частину виручки готові віддавати на рекламу?","Какую часть выручки готовы отдавать на рекламу?"),L("Зазвичай в онлайн-освіті це 20–30%.","Обычно в онлайн-образовании это 20–30%."),[15,20,25,30].map(v=>opt("share",v,v+"%")).join("")+`<button type="button" class="opt opt--q" data-act="obSet" data-k="share" data-v="25">${L("Не знаю, візьми середнє","Не знаю, возьми среднее")}</button>`],
    [L("Зі 100 заявок скільки доходить до оплати?","Из 100 заявок сколько доходит до оплаты?"),L("Якщо не рахували — бот візьме середнє по ніші й уточнить за перший місяць.","Если не считали — бот возьмёт среднее по нише и уточнит за первый месяц."),[[2,5,40],[4,8,45],[6,10,60]].map(v=>`<button type="button" class="opt" data-act="obConv" data-a="${v[1]}" data-b="${v[2]}" aria-pressed="${d.l2b===v[1]&&d.b2p===v[2]}">${v[0]===2?"2":v[0]===4?"3–4":"6"} ${L("зі 100","из 100")}</button>`).join("")+`<button type="button" class="opt opt--q" data-act="obConv" data-a="8" data-b="45">${L("Не знаю, візьми по ніші","Не знаю, возьми по нише")}</button>`]];
  if (q >= QS.length) return `<div class="quiz"><span class="tag">${L("Ось що вийшло","Вот что получилось")}</span><h2>${L("Ваші цілі на місяць","Ваши цели на месяц")}</h2>${obCalcHTML(d)}<p class="sub">${L("Від цих чисел бот рахує все інше: коли зупинити оголошення, коли додати бюджет, яка воронка відстає. Змінити можна будь-коли.","От этих чисел бот считает всё остальное: когда остановить объявление, когда добавить бюджет, какая воронка отстаёт. Изменить можно в любой момент.")}</p></div>`;
  return `<div class="quiz"><span class="tag">${L("Питання","Вопрос")} ${q+1} / ${QS.length}</span><h2>${QS[q][0]}</h2><p class="sub">${QS[q][1]}</p><div class="opts">${QS[q][2]}</div></div>`;
}
function obTable(){
  const d = S.ob.d, r = (k, t, u) => `<tr><td>${t}</td><td class="n"><input class="tin" data-ob="${k}" value="${d[k]}" inputmode="decimal" aria-label="${t}"> <span class="sub mono">${u}</span></td></tr>`;
  return `<div class="tw"><table class="tnar"><thead><tr><th>${L("Вхідні числа","Входные числа")}</th><th class="n">${L("Значення","Значение")}</th></tr></thead><tbody>
    ${r("budget",L("Рекламний бюджет на місяць","Рекламный бюджет в месяц"),"$")}${r("check",L("Середній чек","Средний чек"),"$")}${r("share",L("Частка маркетингу у виручці","Доля маркетинга в выручке"),"%")}${r("l2b",L("Лід → бронь або домовленість","Лид → бронь или договорённость"),"%")}${r("b2p",L("Бронь → оплата","Бронь → оплата"),"%")}</tbody></table></div>
    <div id="ob-calc">${obCalcHTML(d)}</div>
    <p class="sub">${L("Це цілі рівня проєкту. Кожна воронка успадковує конверсії та чек і може мати свої: акція з нижчою ціною, лід-форма з іншою конверсією.","Это цели уровня проекта. Каждая воронка наследует конверсии и чек и может иметь свои: акция с ценой ниже, лид-форма с другой конверсией.")}</p>`;
}
function modalOnboard(){
  const o = S.ob, d = o.d, st = OBS(), s = o.step;
  const body = [
    () => `<div class="form">${inp("name",L("Назва проєкту","Название проекта"),1)}${inp("niche",L("Ніша","Ниша"))}${inp("geo",L("Гео","Гео"))}${inp("site",L("Сайти, на які можна вести","Сайты, на которые можно вести"),1)}</div>`,
    () => `<p class="sub">${L("Вхід через офіційне вікно майданчика, паролі ми не бачимо. Доступ можна відкликати будь-коли. Чого немає зараз — підключите пізніше.","Вход через официальное окно площадки, пароли мы не видим. Доступ можно отозвать в любой момент. Чего нет сейчас — подключите позже.")}</p>
      <div class="conn">${OBCONN().map(c=>{ const v = o.conn[c[0]]; return `<div class="panel"><div class="row sp"><h2>${c[1]}</h2>${v===1?pill("good",L("підключено","подключено")):v===2?pill("warn",L("підключаємо…","подключаем…")):v===3?pill("warn",L("запит інтегратору","запрос интегратору")):""}</div><p class="sub">${c[2]}</p>${v?"":`<div class="row"><button class="btn btn--sm" data-act="obConn" data-id="${c[0]}" data-v="${c[3]}">${c[3]?L("Підключити","Подключить"):L("Запросити інтегратора","Запросить интегратора")}</button></div>`}</div>`; }).join("")}</div>`,
    () => `<div class="form">${inp("product",L("Що продаємо","Что продаём"),1)}
      <div class="field w"><label>${L("Як відбувається продаж","Как происходит продажа")}</label><div class="opts">${SALE().map(x=>`<button type="button" class="opt" data-act="obSet" data-k="sale" data-v="${x[0]}" aria-pressed="${d.sale===x[0]}">${x[1]}</button>`).join("")}</div></div>
      ${inp("worked",L("Що вже спрацьовувало в рекламі","Что уже срабатывало в рекламе"),1)}${inp("ban",L("Що не можна обіцяти й казати","Что нельзя обещать и говорить"),1)}${inp("tone",L("Тон","Тон"),1)}</div>
      <p class="sub">${L("Це те, чого бот не побачить у кабінеті. З анамнезу беруться тексти, перевірка роликів перед запуском і подія, до якої рахуємо результат.","Это то, чего бот не увидит в кабинете. Из анамнеза берутся тексты, проверка роликов перед запуском и событие, до которого считаем результат.")}</p>`,
    () => lite() ? obQuiz() : obTable(),
    () => audBlock(o, "ob"),
    () => { const c = obCalc(d), n = Object.values(o.conn).filter(Boolean).length;
      return `<dl class="kv"><dt>${L("Проєкт","Проект")}</dt><dd><b>${d.name}</b> · ${d.niche} · ${d.geo}</dd><dt>${L("Продаж","Продажа")}</dt><dd>${SALE().find(x=>x[0]===d.sale)[1]}</dd>
        <dt>${L("Акаунти","Аккаунты")}</dt><dd>${n} ${L("із 6 підключено або в роботі","из 6 подключено или в работе")}</dd>
        <dt>${L("Цілі місяця","Цели месяца")}</dt><dd class="mono">${money(d.budget)} → ${num(c.leads)} ${L("лідів","лидов")} → ${num(c.pay)} ${L("оплат","оплат")} → ${money(c.rev)}</dd>
        <dt>${L("Стеля ціни ліда","Потолок цены лида")}</dt><dd class="mono">$${dec(c.cap)}</dd>
        <dt>${L("Аудиторія","Аудитория")}</dt><dd>${o.seg?SEGEN().map(x=>x[0]).join(" · "):L("сегменти не виділено — можна додати пізніше","сегменты не выделены — можно добавить позже")}</dd></dl>
      <div class="panel vf"><span class="tag">${L("Що буде далі","Что будет дальше")}</span><ol class="nx"><li>${L("Інтегратор перевірить доступи й події пікселя.","Интегратор проверит доступы и события пикселя.")}</li><li>${L("Ви створюєте першу воронку: офер, ціна, лендинг.","Вы создаёте первую воронку: оффер, цена, лендинг.")}</li><li>${L("Бот збирає кампанії вимкненими. Вмикаєте ви.","Бот собирает кампании выключенными. Включаете вы.")}</li></ol></div>`; }][s]();
  const lastQ = s === 3 && lite() && o.q < 4;
  return `<div class="ob">
    <div class="row sp"><div><span class="tag">${L("Крок","Шаг")} ${s+1} / ${st.length}</span><h1>${L("Новий проєкт","Новый проект")}</h1></div><button class="x" data-act="closeOverlay" aria-label="close">×</button></div>
    <ol class="obst">${st.map((t,i)=>`<li class="${i<s?"ok":i===s?"on":""}"><i>${i+1}</i><span>${t}</span></li>`).join("")}</ol>
    ${body}
    <div class="row sp"><div class="row">${s>0||(s===3&&o.q>0)?`<button class="btn" data-act="obNav" data-v="-1">${L("Назад","Назад")}</button>`:""}</div>
      <div class="row">${s===1||s===4?`<button class="btn" data-act="obNav" data-v="9">${L("Пропустити","Пропустить")}</button>`:""}${s<st.length-1?`<button class="btn btn--solid" data-act="obNav" data-v="1">${lastQ?L("Далі","Дальше"):L("Далі","Дальше")}</button>`:`<button class="btn btn--solid" data-act="createProject">${L("Створити проєкт","Создать проект")}</button>`}</div></div></div>`;
}
function modalAud(){ return `<div class="ob"><div class="row sp"><div><span class="tag">${L("Школа 3D","Школа 3D")}</span><h1>${L("Доповнити аудиторію","Дополнить аудиторию")}</h1></div><button class="x" data-act="closeOverlay" aria-label="close">×</button></div>${audBlock(S.audm, "am")}<div class="row"><button class="btn btn--solid" data-act="closeOverlay">${L("Готово","Готово")}</button></div></div>`; }

/* ---------- новая воронка: свои цели, остальное наследуется ---------- */
function modalFunnel(){
  const p = lite();
  return `<div class="ob">
    <div class="row sp"><h1>${L("Нова воронка","Новая воронка")}</h1><button class="x" data-act="closeOverlay" aria-label="close">×</button></div>
    <div class="form">
      <div class="field w"><label for="nf-name">${L("Назва","Название")}</label><input id="nf-name" value="${L("Чорна п’ятниця, −20%","Чёрная пятница, −20%")}"></div>
      <div class="field"><label for="nf-price">${L("Ціна, $","Цена, $")}</label><input id="nf-price" data-nf value="544" inputmode="decimal"></div>
      <div class="field"><label for="nf-until">${L("Акція до","Акция до")}</label><input id="nf-until" value="30.11"></div>
      <div class="field"><label for="nf-goal">${L("Ціль","Цель")}</label><select id="nf-goal"><option value="site">${L("Конверсія на сайті","Конверсия на сайте")}</option><option value="form">${L("Лід-форма","Лид-форма")}</option></select></div>
      <div class="field"><label for="nf-url">${L("Лендинг","Лендинг")}</label><input id="nf-url" value="school3d.example/bf"></div>
      <div class="field"${p?" hidden":""}><label for="nf-pay">${L("План оплат на місяць","План оплат в месяц")}</label><input id="nf-pay" data-nf value="18" inputmode="decimal"></div>
      <div class="field"${p?" hidden":""}><label for="nf-l2b">${L("Лід → бронь, %","Лид → бронь, %")}</label><input id="nf-l2b" data-nf value="6.5" inputmode="decimal"></div>
      <div class="field"${p?" hidden":""}><label for="nf-b2p">${L("Бронь → оплата, %","Бронь → оплата, %")}</label><input id="nf-b2p" data-nf value="56" inputmode="decimal"></div>
    </div>
    <div class="panel vf"><span class="tag">${L("Цілі воронки","Цели воронки")}</span><p class="formula" id="nf-calc">${nfCalc(544,18,6.5,56)}</p>
      <p class="sub">${p?L("Конверсії взято з проєкту: 6,5% у бронь і 56% в оплату. Плани підлаштуються після перших двох вебінарів.","Конверсии взяты из проекта: 6,5% в бронь и 56% в оплату. Планы подстроятся после первых двух вебинаров."):L("Частка маркетингу успадкована з проєкту. Плани воронки зводяться в цілі проєкту на сторінці «Проєкт і цілі».","Доля маркетинга унаследована с проекта. Планы воронки сводятся в цели проекта на странице «Проект и цели».")}</p></div>
    <div class="row"><button class="btn btn--solid" data-act="createFunnel">${L("Створити воронку","Создать воронку")}</button></div></div>`;
}
function nfCalc(price, pay, l2b, b2p){ const rv = pay*price, bud = rv*S.share/100, leads = pay/(b2p/100)/(l2b/100), cap = l2b/100*b2p/100*price*S.share/100;
  return `${L("бюджет","бюджет")} ${money(bud)} → ${num(leads)} ${L("лідів","лидов")} → ${num(pay)} ${L("оплат","оплат")} → ${money(rv)} · ${L("стеля ліда","потолок лида")} $${dec(cap)}`; }
const nfv = id => parseFloat(String($(id).value).replace(",", ".")) || 0;

/* ---------- страница «Проект и цели» ---------- */
const passportOld = V.passport;
V.passport = function(){
  const P = pPlan(), F = pFact(), ok = Math.abs(P.rev - S.goalRev) < 1, segs = SEG3D().concat(S.audm.seg ? [SEGX()] : []);
  const top = passportOld().replace(/<div class="head">[\s\S]*?<\/div><\/div>/, `<div class="head"><div><h1>${L("Проєкт і цілі","Проект и цели")}</h1><p class="sub">${L("Анамнез, цільові цифри й аудиторія. Заповнюється один раз в анкеті, далі з цього беруться тексти, перевірки та всі пороги.","Анамнез, целевые цифры и аудитория. Заполняется один раз в анкете, дальше отсюда берутся тексты, проверки и все пороги.")}</p></div></div>`);
  const rowsP = [[L("Виручка","Выручка"),money(P.rev),money(F.rev)],[L("Оплати","Оплаты"),num(P.pay),num(F.pay)],[L("Броні","Брони"),num(P.book),num(F.book)],[lite()?L("Заявки","Заявки"):L("Ліди","Лиды"),num(P.leads),num(F.leads)],[L("Рекламний бюджет","Рекламный бюджет"),money(P.bud),money(F.spend)],[lite()?L("Повернення з $1","Возврат с $1"):"ROAS",dec(100/S.share),dec(F.rev/F.spend)]];
  const tin = (f, k) => lite() ? (k==="pay"?num(f.tg[k]):pc(f.tg[k],1)) : `<input class="tin" data-tg="${f.id}.${k}" value="${f.tg[k]}" inputmode="decimal" aria-label="${k}">`;
  return top + `
  <div class="c2">
    <div class="panel"><span class="tag">${L("Цілі проєкту на місяць","Цели проекта на месяц")}</span>
      <div class="tw tw--in"><table class="tnar"><thead><tr><th>${L("Показник","Показатель")}</th><th class="n">${L("Ціль","Цель")}</th><th class="n">${L("Факт на 19.11","Факт на 19.11")}</th><th class="n">%</th></tr></thead>
      <tbody>${rowsP.map((r,i)=>`<tr><td>${r[0]}</td><td class="n mono">${r[1]}</td><td class="n mono">${r[2]}</td><td class="n mono">${i<5?Math.round([F.rev/P.rev,F.pay/P.pay,F.book/P.book,F.leads/P.leads,F.spend/P.bud][i]*100)+"%":"—"}</td></tr>`).join("")}</tbody></table></div>
      <p class="sub">${L("Ціль проєкту — це сума цілей воронок. Оплати відстають від лідів, бо два останні вебінари ще дозрівають.","Цель проекта — это сумма целей воронок. Оплаты отстают от лидов, потому что два последних вебинара ещё дозревают.")}</p></div>
    <div class="panel"><div class="row sp"><span class="tag">${L("Цільова аудиторія","Целевая аудитория")} · ${segs.length}</span><button class="btn btn--sm" data-act="modal" data-id="aud">${L("Доповнити","Дополнить")}</button></div>
      ${segHTML(segs)}<p class="sub mono">${L("Джерела: портрет_клієнта.pdf, 212 коментарів менеджерів, відповіді власника","Источники: портрет_клиента.pdf, 212 комментариев менеджеров, ответы собственника")}</p></div>
  </div>
  <div class="panel"><div class="row sp"><span class="tag">${L("Цілі по воронках","Цели по воронкам")}</span>${ok?pill("good",L("сходиться з ціллю проєкту","сходится с целью проекта")):pill("warn",L("воронки дають ","воронки дают ")+money(P.rev)+L(" із "," из ")+money(S.goalRev))}</div>
    <div class="tw tw--in"><table><thead><tr><th>${L("Воронка","Воронка")}</th><th class="n">${L("План оплат","План оплат")}</th><th class="n">${L("Чек","Чек")}</th><th class="n">${lite()?L("Заявка → бронь","Заявка → бронь"):L("Лід → бронь","Лид → бронь")}</th><th class="n">${L("Бронь → оплата","Бронь → оплата")}</th><th class="n">${L("Бюджет","Бюджет")}</th><th class="n">${lite()?L("Заявок","Заявок"):L("Лідів","Лидов")}</th><th class="n">${L("Виручка","Выручка")}</th></tr></thead>
    <tbody>${S.funnels.map(f=>{ const p = fPlan(f); return `<tr><td><b>${fN(f)}</b></td><td class="n">${tin(f,"pay")}</td><td class="n mono">$${f.tg.check}</td><td class="n">${tin(f,"l2b")}</td><td class="n">${tin(f,"b2p")}</td><td class="n mono">${money(p.bud)}</td><td class="n mono">${num(p.leads)}</td><td class="n mono">${money(p.rev)}</td></tr>`; }).join("")}
    <tr class="sum"><td><b>${L("Проєкт","Проект")}</b></td><td class="n mono"><b>${num(P.pay)}</b></td><td></td><td></td><td></td><td class="n mono"><b>${money(P.bud)}</b></td><td class="n mono"><b>${num(P.leads)}</b></td><td class="n mono"><b>${money(P.rev)}</b></td></tr></tbody></table></div>
    <p class="sub">${lite()?L("Числа рахує бот із вашої анкети. Щоб правити їх вручну, перемкніться на Pro.","Числа считает бот из вашей анкеты. Чтобы править их вручную, переключитесь на Pro."):L("Правте план оплат і конверсії — бюджет, ліди й виручка перерахуються, а підсумок звіриться з ціллю проєкту.","Правьте план оплат и конверсии — бюджет, лиды и выручка пересчитаются, а итог сверится с целью проекта.")}</p></div>`;
};

/* ---------- аналитика ---------- */
function anKpis(){ const P = pPlan(), F = pFact();
  return `<div class="kpis">${[[L("Витрати","Расход"),money(F.spend),money(P.bud)],[L("Ліди","Лиды"),num(F.leads),num(P.leads)],[L("Ціна ліда","Цена лида"),"$"+dec(F.spend/F.leads),"≤ $"+dec(P.bud/P.leads)],[L("Броні","Брони"),num(F.book),num(P.book)],[L("Оплати","Оплаты"),num(F.pay),num(P.pay)],[L("Виручка","Выручка"),money(F.rev),money(P.rev)],["ROAS",dec(F.rev/F.spend),dec(100/S.share)]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong><small>${L("план","план")} ${k[2]}</small></div>`).join("")}</div>`; }
function anAll(){ const fs = S.fam.filter(f=>f.spend>0), mx = Math.max(...fs.map(roas)), F = pFact();
  return `<div class="c2">
    <div class="panel"><span class="tag">${L("Витрати по днях і ліди","Расход по дням и лиды")}</span>${dayChart()}</div>
    <div class="panel"><span class="tag">${L("Воронка до грошей","Воронка до денег")}</span>
      <div class="bars">${[[L("Ліди","Лиды"),F.leads,100,""],[L("Броні","Брони"),F.book,34,pc(F.book/F.leads*100)],[L("Оплати","Оплаты"),F.pay,18,pc(F.pay/F.book*100,0)]].map(b=>`<div class="barrow"><span>${b[0]}</span><i style="width:${b[2]}%"></i><b>${num(b[1])}${b[3]?" · "+b[3]:""}</b></div>`).join("")}</div>
      <p class="sub">${L("Закриття броней за планом 56%. Зараз 38%, бо останні вебінари ще дозрівають: дивіться вкладку «Когорти».","Закрытие броней по плану 56%. Сейчас 38%, потому что последние вебинары ещё дозревают: смотрите вкладку «Когорты».")}</p></div>
  </div>
  <div class="c2">
    <div class="panel"><span class="tag">${L("ROAS по сім’ях креативів","ROAS по семьям креативов")}</span>
      <div class="bars">${fs.map(f=>`<div class="barrow"><span class="mono">${f.id}</span><i class="${roas(f)<1?"bad":""}" style="width:${Math.max(2,roas(f)/mx*100)}%"></i><b>${dec(roas(f))}</b></div>`).join("")}</div></div>
    <div class="panel"><span class="tag">${L("По майданчиках","По площадкам")}</span>
      <dl class="kv">${[["Meta",8880,2090],["TikTok",640,152],["Google",1020,210]].map(p=>`<dt>${p[0]}</dt><dd class="mono">${money(p[1])} · ${num(p[2])} ${L("лідів","лидов")} · $${dec(p[1]/p[2])}</dd>`).join("")}</dl></div>
  </div>`; }
function anFun(){ const P = pPlan(), F = pFact(), W = LWORD();
  const row = f => { const p = fPlan(f), x = fLights(f), bk = fBook(f), rp = fRipe(f);
    return `<tr data-act="openFunnelA" data-id="${f.id}" tabindex="0"><td><b>${fN(f)}</b></td><td class="n mono">${pf(money(f.spend),money(p.bud))}</td><td class="n mono">${pf(num(f.leads),num(p.leads))}</td>
      <td class="n mono">${lt(x.cpl)} ${pf(f.leads?"$"+dec(f.spend/f.leads):"—","$"+dec(f.cap))}</td><td class="n mono">${lt(x.l2b)} ${pf(f.leads?pc(bk/f.leads*100):"—",pc(f.tg.l2b))}</td>
      <td class="n mono">${lt(x.b2p)} ${pf(rp==null?L("дозріває","дозревает"):pc(rp,0),pc(f.tg.b2p,0))}</td><td class="n mono">${pf(num(f.pay),num(p.pay))}</td><td class="n mono"><b>${f.spend?dec(f.pay*f.tg.check/f.spend):"—"}</b></td><td>${pill(x.worst,W[x.worst])}</td></tr>`; };
  return `<div class="tw"><table><thead><tr><th>${L("Воронка","Воронка")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">${L("CPL / стеля","CPL / потолок")}</th><th class="n">${L("Лід → бронь","Лид → бронь")}</th><th class="n">${L("Бронь → оплата*","Бронь → оплата*")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">ROAS</th><th>${L("Статус","Статус")}</th></tr></thead>
    <tbody>${S.funnels.map(row).join("")}
    <tr class="sum"><td><b>${L("Уся когорта","Вся когорта")}</b></td><td class="n mono">${pf(money(F.spend),money(P.bud))}</td><td class="n mono">${pf(num(F.leads),num(P.leads))}</td><td class="n mono">$${dec(F.spend/F.leads)}</td><td class="n mono">${pc(F.book/F.leads*100)}</td><td class="n mono">—</td><td class="n mono">${pf(num(F.pay),num(P.pay))}</td><td class="n mono"><b>${dec(F.rev/F.spend)}</b></td><td></td></tr></tbody></table></div>
    <p class="sub">${L("Факт / ціль. * Закриття броней рахується тільки по дозрілих вебінарах (від 90%), щоб свіжі не занижували цифру.","Факт / цель. * Закрытие броней считается только по дозревшим вебинарам (от 90%), чтобы свежие не занижали цифру.")}</p>
    <div class="cols">${S.funnels.map(f=>{ const x = fLights(f); return `<div class="panel"><div class="row">${lt(x.worst)}<h2>${fN(f)}</h2></div><p class="sub">${fVerdict(f)}</p></div>`; }).join("")}</div>`; }
function anCoh(){ const fid = S.anF, T = [0,0,0,0];
  const chk = fid === "all" ? CHECK : S.funnels.find(f=>f.id===fid).tg.check;
  const rows = COH.map(c=>{ const v = cohSum(c, fid); v.forEach((x,i)=>T[i]+=x); return [c, v]; }).filter(r=>r[1][0]>0);
  return `<div class="row"><span class="tag">${L("Воронка","Воронка")}</span><div class="seg" role="group"><button type="button" data-act="anF" data-v="all" aria-pressed="${fid==="all"}">${L("Усі","Все")}</button>${S.funnels.filter(f=>COH.some(c=>c.f[f.id])).map(f=>`<button type="button" data-act="anF" data-v="${f.id}" aria-pressed="${fid===f.id}">${fN(f)}</button>`).join("")}</div></div>
  <div class="tw"><table><thead><tr><th>${L("Дата вебінару","Дата вебинара")}</th><th>${L("Дозрілість","Зрелость")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">${L("Ліди","Лиды")}</th><th class="n">CPL</th><th class="n">${L("Броні","Брони")}</th><th class="n">${L("Лід → бронь","Лид → бронь")}</th><th class="n">${L("Оплати","Оплаты")}</th><th class="n">${L("Бронь → оплата","Бронь → оплата")}</th><th class="n">ROAS</th></tr></thead>
    <tbody>${rows.map(([c,v])=>`<tr class="${c.ripe<90?"unripe":""}"><td class="mono"><b>${c.d}</b></td><td><div class="ripe"><div class="prog"><i style="width:${c.ripe}%"></i></div><span class="mono">${c.ripe}%</span></div></td><td class="n mono">${money(v[0])}</td><td class="n mono">${num(v[1])}</td><td class="n mono">$${dec(v[0]/v[1])}</td><td class="n mono">${v[2]}</td><td class="n mono">${pc(v[2]/v[1]*100)}</td><td class="n mono">${v[3]}</td><td class="n mono">${pc(v[3]/v[2]*100,0)}</td><td class="n mono"><b>${dec(v[3]*chk/v[0])}</b></td></tr>`).join("")}
    <tr class="sum"><td><b>${L("Разом","Итого")}</b></td><td></td><td class="n mono">${money(T[0])}</td><td class="n mono">${num(T[1])}</td><td class="n mono">$${dec(T[0]/T[1])}</td><td class="n mono">${T[2]}</td><td class="n mono">${pc(T[2]/T[1]*100)}</td><td class="n mono">${T[3]}</td><td class="n mono">${pc(T[3]/T[2]*100,0)}</td><td class="n mono"><b>${dec(T[3]*chk/T[0])}</b></td></tr></tbody></table></div>
  <p class="sub">${L("Когорта — усі, хто прийшов на вебінар цієї дати, з усією рекламою, яка їх привела. Жовті рядки ще дозрівають: оплати надходять до трьох тижнів, тому їхній ROAS зросте.","Когорта — все, кто пришёл на вебинар этой даты, со всей рекламой, которая их привела. Жёлтые строки ещё дозревают: оплаты поступают до трёх недель, поэтому их ROAS вырастет.")}</p>`; }
function anLite(){ const F = pFact(), P = pPlan(), W = LWORD(), tgt = 100/S.share, r = F.rev/F.spend;
  const ripe = COH.filter(c=>c.ripe>=90).reduce((a,c)=>{ const v = cohSum(c); a[0]+=v[0]; a[1]+=v[3]; return a; }, [0,0]), rr = ripe[1]*CHECK/ripe[0];
  const cpl = F.spend/F.leads, cap = P.bud/P.leads;
  return `<div class="head"><div><h1>${L("Результати","Результаты")}</h1><p class="sub">${L("Коротко: чи окупається реклама і що робити далі. Усі деталі — у версії Pro.","Коротко: окупается ли реклама и что делать дальше. Все детали — в версии Pro.")}</p></div><button class="btn" data-act="tier" data-v="pro">${L("Показати детально","Показать подробно")}</button></div>
  <div class="panel vf"><span class="tag">${L("Головне","Главное")}</span>
    <p class="verdict">${L(`На кожен вкладений $1 повернулося <b>$${dec(r)}</b>. Ціль — $${dec(tgt)}.`,`На каждый вложенный $1 вернулось <b>$${dec(r)}</b>. Цель — $${dec(tgt)}.`)}</p>
    <p>${L(`Це не відставання: майже половина бюджету пішла на вебінари, оплати з яких ще надходять. По вебінарах, де оплати вже зібрано, повернення $${dec(rr)} — вище цілі.`,`Это не отставание: почти половина бюджета ушла на вебинары, оплаты с которых ещё поступают. По вебинарам, где оплаты уже собраны, возврат $${dec(rr)} — выше цели.`)}</p>
    <div class="lights">
      <div>${lt(cpl<=cap?"good":"warn")}<b>${L("Ціна заявки","Цена заявки")}</b><span class="mono">$${dec(cpl)} ${L("за стелі","при потолке")} $${dec(cap)}</span></div>
      <div>${lt("good")}<b>${L("Заявки","Заявки")}</b><span class="mono">${num(F.leads)} ${L("із","из")} ${num(P.leads)} ${L("на місяць","на месяц")}</span></div>
      <div>${lt("warn")}<b>${L("Оплати","Оплаты")}</b><span class="mono">${F.pay} ${L("із","из")} ${num(P.pay)}, ${L("ще надходять","ещё поступают")}</span></div>
    </div></div>
  <div class="cols">${S.funnels.map(f=>{ const x = fLights(f); return `<div class="panel"><div class="row sp"><div class="row">${lt(x.worst)}<h2>${fN(f)}</h2></div>${pill(x.worst,W[x.worst])}</div><p>${fVerdict(f)}</p>
    <dl class="kv"><dt>${L("Витрачено","Потрачено")}</dt><dd class="mono">${money(f.spend)}</dd><dt>${L("Заявок","Заявок")}</dt><dd class="mono">${num(f.leads)}</dd><dt>${L("Оплат","Оплат")}</dt><dd class="mono">${f.pay}</dd></dl></div>`; }).join("")}</div>`; }
V.analytics = function(){
  if (lite()) return anLite();
  const tabs = [["all",L("Уся когорта","Вся когорта")],["fun",L("По воронках","По воронкам")],["coh",L("Когорти","Когорты")]];
  return `<div class="head"><div><h1>${L("Аналітика","Аналитика")}</h1><p class="sub">${L("Рахунок по даті вебінару і до оплати. Цифри зводяться в загальну когорту або розкладаються по воронках.","Счёт по дате вебинара и до оплаты. Цифры сводятся в общую когорту или раскладываются по воронкам.")}</p></div>
    <div class="seg" role="group">${tabs.map(t=>`<button type="button" data-act="an" data-v="${t[0]}" aria-pressed="${S.an===t[0]}">${t[1]}</button>`).join("")}</div></div>
  ${anKpis()}${{all:anAll,fun:anFun,coh:anCoh}[S.an]()}`;
};

/* ---------- действия ---------- */
Object.assign(ACT, {
  tier(d){ S.tier = d.v; try { localStorage.setItem("rakurs_tier", S.tier); } catch (e) {} if (lite() && ["hyp","rules","journal"].includes(route())) location.hash = "today"; toast(lite()?L("Lite: коротко і простими словами","Lite: коротко и простыми словами"):L("Pro: усі цифри, цілі й когорти","Pro: все цифры, цели и когорты")); },
  modal(d){ S.modal = d.id; S.asst.open = false; if (d.id === "project") S.ob = obFresh(); },
  obNav(d){ const o = S.ob, v = +d.v;
    if (v === 9) { o.step++; o.q = 0; return; }
    if (o.step === 3 && lite()) { const q = o.q + v; if (q >= 0 && q <= 4) { o.q = q; return; } }
    o.step = Math.max(0, Math.min(5, o.step + v)); if (o.step === 3) o.q = v > 0 ? 0 : 4; },
  obSet(d){ S.ob.d[d.k] = isNaN(+d.v) ? d.v : +d.v; },
  obConv(d){ S.ob.d.l2b = +d.a; S.ob.d.b2p = +d.b; },
  obConn(d){ const o = S.ob; if (d.v === "0") { o.conn[d.id] = 3; return; } o.conn[d.id] = 2; later(() => { if (S.ob === o) { o.conn[d.id] = 1; renderOverlay(); } }, 900); },
  obTab(d){ S.ob.tab = d.v; }, amTab(d){ S.audm.tab = d.v; },
  obFiles(){ audFiles(S.ob); }, amFiles(){ audFiles(S.audm); },
  obParse(){ S.ob.seg = true; }, amParse(){ S.audm.seg = true; logAdd("bot", L("Аудиторію доповнено: додано сегмент «Рієлтори».","Аудитория дополнена: добавлен сегмент «Риелторы».")); toast(L("Додано сегмент «Рієлтори»","Добавлен сегмент «Риелторы»")); },
  createProject(){ const d = S.ob.d, c = obCalc(d), n = Object.values(S.ob.conn).filter(Boolean).length;
    S.projects.push(["new", d.name, d.niche, n ? L(n+" підключень у роботі", n+" подключений в работе") : L("чекає на підключення","ждёт подключения"), 0, "—", 0]); S.modal = null; S.ob = null;
    logAdd("you", L(`Створено проєкт «${d.name}»: бюджет ${money(d.budget)}, ціль ${num(c.pay)} оплат, стеля ліда $${dec(c.cap)}.`,`Создан проект «${d.name}»: бюджет ${money(d.budget)}, цель ${num(c.pay)} оплат, потолок лида $${dec(c.cap)}.`));
    location.hash = "projects"; toast(L("Проєкт створено","Проект создан")); },
  createFunnel(){ const name = $("nf-name").value.trim() || L("Нова воронка","Новая воронка"), goal = $("nf-goal").value, url = $("nf-url").value.trim();
    const check = nfv("nf-price") || CHECK, pay = nfv("nf-pay") || 18, l2b = nfv("nf-l2b") || 6.5, b2p = nfv("nf-b2p") || 56, id = "n" + Date.now();
    S.funnels.push({id,name,goal,cap:+(l2b/100*b2p/100*check*S.share/100).toFixed(2),limit:60,mode:"btn",spend:0,leads:0,pay:0,landing:url,tg:{pay,check,l2b,b2p}}); S.goalRev += pay*check; S.modal = null; S.funnel = id;
    logAdd("you", L("Створено воронку «","Создана воронка «") + name + L("», режим «по кнопці».","», режим «по кнопке».")); location.hash = "funnels"; toast(L("Воронку створено, цілі додано до плану проєкту","Воронка создана, цели добавлены в план проекта")); },
  an(d){ S.an = d.v; }, anF(d){ S.anF = d.v; },
  openFunnelA(d){ S.funnel = d.id; location.hash = "funnels"; }
});
function audFiles(o){ if (o.files) return; o.files = [{n:L("портрет_клієнта.pdf","портрет_клиента.pdf"),p:0},{n:"crm_export_2026.xlsx",p:0},{n:L("дзвінки_менеджерів.zip","звонки_менеджеров.zip"),p:0}];
  const iv = setInterval(() => { let all = true; o.files.forEach((f,i)=>{ if (f.p < 100) { f.p = Math.min(100, f.p + 12 + i*5); all = false; } }); if (all) clearInterval(iv); renderOverlay(); }, 240); timers.push(iv); }
const ccl = ACT.closeOverlay; ACT.closeOverlay = function(){ ccl(); S.ob = null; };
const rst = ACT.reset; ACT.reset = function(){ const t = S.tier; rst(); S.tier = t; };

/* ввод в анкете и таблицах целей: без полной перерисовки, чтобы поле не теряло фокус */
const pnum = v => parseFloat(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
document.addEventListener("input", e => { const t = e.target;
  if (t.dataset.ob && S.ob) { const k = t.dataset.ob, isN = typeof S.ob.d[k] === "number"; if (isN) { const n = pnum(t.value); if (n > 0) S.ob.d[k] = n; } else S.ob.d[k] = t.value; const c = $("ob-calc"); if (c) c.innerHTML = obCalcHTML(S.ob.d); }
  if (t.id === "aud-t" && S.ob) S.ob.text = t.value;
  if ("nf" in t.dataset) { const c = $("nf-calc"); if (c) c.innerHTML = nfCalc(nfv("nf-price")||CHECK, nfv("nf-pay")||1, nfv("nf-l2b")||1, nfv("nf-b2p")||1); } });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset.tg) return; const [id, k] = t.dataset.tg.split("."), n = pnum(t.value), f = S.funnels.find(x=>x.id===id); if (f && n > 0) { f.tg[k] = n; renderView(); } });
try { const t = localStorage.getItem("rakurs_tier"); if (t === "lite" || t === "pro") S.tier = t; } catch (e) {}
render();
