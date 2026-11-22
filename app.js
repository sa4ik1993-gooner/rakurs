/* Rakurs — кликабельный демо-кабинет. Только фронт: все данные примерные, действия меняют состояние в памяти. */
let lang = "uk";
try { const s = localStorage.getItem("rakurs_lang"); if (s === "ru" || s === "uk") lang = s; } catch (e) {}
try { const q = new URLSearchParams(location.search).get("lang"); if (q === "ru" || q === "uk") lang = q; } catch (e) {}
try { const th = localStorage.getItem("rakurs_theme"); if (th === "light" || th === "dark") document.documentElement.dataset.theme = th; } catch (e) {}

const L = (uk, ru) => (lang === "ru" ? ru : uk);
const $ = id => document.getElementById(id);
const num = n => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
const money = n => "$" + num(n);
const dec = (n, d = 2) => n.toFixed(d).replace(".", ",");
const tc = s => "0:" + String(Math.max(0, Math.round(s))).padStart(2, "0");
const pill = (c, x) => `<span class="pill pill--${c}">${x}</span>`;
const PHR = [4, 9, 16, 23, 30];

function fresh(){ return {
  tier:"pro", ob:null, an:"all", anF:"all", goalRev:64600, audm:{tab:"files",files:null,seg:false,text:"",segs:()=>[SEGX()]},
  frozen:false, share:22, funnel:null, cr:null, playhead:0, launch:null, modal:null, wiz:0,
  inbox:{a1:null,a3:null,a4:null}, upload:null, trim:null, copySel:"A", rewrite:null, objections:false,
  funnels:[
    {id:"f1",goal:"site",cap:5,limit:260,mode:"btn",spend:7760,leads:1790,pay:44,landing:"school3d.example/urok",tg:{pay:68,check:680,l2b:6,b2p:56}},
    {id:"f2",goal:"site",cap:4.5,limit:90,mode:"adv",spend:2140,leads:510,pay:10,landing:"school3d.example/akcia",tg:{pay:21,check:680,l2b:6.5,b2p:50}},
    {id:"f3",goal:"form",cap:6,limit:40,mode:"auto",spend:640,leads:152,pay:2,landing:"lead form",tg:{pay:6,check:680,l2b:10,b2p:40}}],
  fam:[
    {id:"priglos",h:160,v:4,dur:30,drop:4,k:.72,spend:2140,leads:412,pay:22,st:"win",ctr:"1,9%",fq:"2,8",f:"f1"},
    {id:"viktor",h:24,v:2,dur:26,drop:7,k:.84,spend:1380,leads:250,pay:12,st:"win",ctr:"2,2%",fq:"1,7",f:"f1"},
    {id:"systema",h:205,v:3,dur:28,drop:3,k:.70,spend:960,leads:190,pay:8,st:"live",ctr:"1,6%",fq:"1,5",f:"f1"},
    {id:"pasyvchyk",h:48,v:3,dur:24,drop:5,k:.78,spend:1120,leads:240,pay:9,st:"live",ctr:"1,8%",fq:"1,9",f:"f2"},
    {id:"treds",h:332,v:4,dur:21,drop:2,k:.62,spend:4300,leads:1150,pay:5,st:"flag",ctr:"3,1%",fq:"2,2",f:"f1"},
    {id:"hook_dohid",h:0,v:1,dur:18,drop:2,k:.58,spend:640,leads:210,pay:0,st:"stop",ctr:"3,4%",fq:"1,4",f:"f3"}],
  hyp:[{id:"hA",col:1,src:"sales"},{id:"hB",col:1,src:"ret"},{id:"hC",col:1,src:"mkt"},
       {id:"hD",col:2,src:"ret"},{id:"hE",col:2,src:"mem"},
       {id:"hF",col:3,src:"sales",res:1},{id:"hG",col:3,src:"mem",res:1},{id:"hH",col:3,src:"mkt",res:0}],
  launches:[
    {n:"RK_UA_Urok3D_Site_12.11_ABO",pl:"Meta",f:"f1",st:"run",bud:120,spend:4210,leads:1010},
    {n:"RK_PL_Urok3D_Site_14.11_ABO",pl:"Meta",f:"f1",st:"learn",bud:60,spend:890,leads:180},
    {n:"RK_UA_Akcia_Site_17.11_CBO",pl:"Meta",f:"f2",st:"run",bud:90,spend:2140,leads:510},
    {n:"RK_UA_Urok3D_Reels_08.11_ABO",pl:"Meta",f:"f1",st:"run",bud:80,spend:1640,leads:390},
    {n:"RK_UA_Konsult_Form_10.11",pl:"TikTok",f:"f3",st:"run",bud:40,spend:640,leads:152},
    {n:"RK_UA_Urok3D_Search_05.11",pl:"Google",f:"f1",st:"run",bud:35,spend:1020,leads:210}],
  rules:[1,1,1,1,1,1,1,1],
  conn:{crm:0,tt2:0},
  projects:[], 
  log:[["19.11 08:02","rule",0],["18.11 07:31","bot",1],["17.11 15:40","you",2],["17.11 09:12","bot",3],["16.11 18:20","you",4]],
  asst:{open:false,chat:[],phase:"idle",next:0}
}; }
let S = fresh();

const CHECK = 680;
const rev = x => x.pay * CHECK;
const roas = x => (x.spend ? rev(x) / x.spend : 0);
const fname = id => ({f1:L("Вебінар «Урок 3D», повна ціна","Вебинар «Урок 3D», полная цена"),f2:L("Акція листопада","Акция ноября"),f3:L("Консультація, лід-форма","Консультация, лид-форма")}[id] || id);
const ST = () => ({
  win:["good",L("переможець","победитель")], live:["mute",L("у ротації","в ротации")], flag:["warn",L("ліди без оплат","лиды без оплат")], stop:["crit",L("зупинено правилом","остановлено правилом")],
  run:["good",L("крутиться","крутится")], learn:["warn",L("навчання","обучение")], draft:["mute",L("чернетка, вимкнено","черновик, выключен")], paused:["crit",L("на паузі","на паузе")]});
const st = k => pill(ST()[k][0], ST()[k][1]);
const LOGT = () => [
  L("Зупинено оголошення hook_dohid_v1: витрачено 2 × стелю ціни ліда без жодної оплати.","Остановлено объявление hook_dohid_v1: потрачено 2 × потолок цены лида без единой оплаты."),
  L("Бюджет групи viktor +20%: CPL три дні нижче цілі на 24%.","Бюджет группы viktor +20%: CPL три дня ниже цели на 24%."),
  L("Створено воронку «Акція листопада», режим «радник».","Создана воронка «Акция ноября», режим «советник»."),
  L("Запит монтажеру: нова версія priglos, перший кадр — готовий рендер.","Запрос монтажёру: новая версия priglos, первый кадр — готовый рендер."),
  L("Змінено стелю ціни ліда у вебінарній воронці: $5,50 → $5,00.","Изменён потолок цены лида в вебинарной воронке: $5,50 → $5,00.")];
const WHO = () => ({rule:L("правило","правило"),bot:L("бот","бот"),you:L("ви","вы")});
function nowS(){ const d = new Date(), p = n => String(n).padStart(2,"0"); return p(d.getDate())+"."+p(d.getMonth()+1)+" "+p(d.getHours())+":"+p(d.getMinutes()); }
const logAdd = (who, text) => S.log.unshift([nowS(), who, text]);

/* ---------- графики ---------- */
function curve(f){ const a=[100]; for(let i=1;i<=f.dur;i++){ a.push(Math.round(a[i-1]*(i<f.drop?0.93:(i===f.drop?f.k:0.975)))); } return a; }
function retChart(f, opt = {}){
  const a = curve(f), W = 560, H = 230, x0 = 44, x1 = 540, y0 = 196, max = Math.max(f.dur, opt.prev ? opt.prev.length - 1 : 0);
  const X = s => x0 + s / max * (x1 - x0), Y = p => y0 - p / 100 * 168;
  const line = arr => arr.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p).toFixed(1)).join("");
  let h = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="retention" id="retsvg">`;
  [0,50,100].forEach(p => h += `<line class="g-grid" x1="${x0}" x2="${x1}" y1="${Y(p)}" y2="${Y(p)}"/><text class="g-lab" x="${x0-8}" y="${Y(p)+3.5}" text-anchor="end">${p}%</text>`);
  for(let s=0;s<=max;s+=5) h += `<text class="g-lab" x="${X(s)}" y="${H-12}" text-anchor="middle">${tc(s)}</text>`;
  h += `<path class="g-area" d="${line(a)}L${X(f.dur)} ${Y(0)}L${X(0)} ${Y(0)}Z"/>`;
  if (opt.prev) h += `<path class="g-off" d="${line(opt.prev)}"/>`;
  h += `<path class="g-on" d="${line(a)}"/>`;
  if (!opt.noCut) h += `<line class="g-cut" x1="${X(f.drop)}" x2="${X(f.drop)}" y1="${Y(100)}" y2="${Y(0)}"/><text class="g-cutlab" x="${X(f.drop)+8}" y="${Y(100)+12}">${L("провал на","провал на")} ${tc(f.drop)} · −${a[f.drop-1]-a[f.drop]} ${L("п.п.","п.п.")}</text>`;
  if (opt.head != null) { const s = Math.min(f.dur, opt.head); h += `<line class="g-head" x1="${X(s)}" x2="${X(s)}" y1="${Y(a[s])}" y2="${Y(0)}"/><circle class="g-dot" cx="${X(s)}" cy="${Y(a[s])}" r="5"/>`; }
  return h + "</svg>";
}
function dayChart(){
  const sp=[690,720,705,760,810,790,745,730,770,800,780,760,740,740], ld=[150,168,160,172,190,184,170,166,181,192,186,180,176,177];
  const X = i => 44 + i * 36, Y = v => 170 - v / 900 * 140, YL = v => 170 - v / 220 * 140;
  let h = `<svg viewBox="0 0 560 204" role="img" aria-label="daily">`;
  [0,300,600,900].forEach(v => h += `<line class="g-grid" x1="40" x2="548" y1="${Y(v)}" y2="${Y(v)}"/><text class="g-lab" x="34" y="${Y(v)+3.5}" text-anchor="end">$${v}</text>`);
  sp.forEach((v,i) => h += `<rect class="${i>=7?"g-bar2":"g-bar"}" x="${X(i)}" y="${Y(v)}" width="22" height="${170-Y(v)}"/><text class="g-lab" x="${X(i)+11}" y="188" text-anchor="middle">${String(6+i).padStart(2,"0")}</text>`);
  h += `<path class="g-line" d="${ld.map((v,i)=>(i?"L":"M")+(X(i)+11)+" "+YL(v).toFixed(1)).join("")}"/>`;
  return h + "</svg>";
}

/* ---------- тексты сущностей ---------- */
const HYP = () => ({
  hA:L("Розстрочка без переплати — відповідь на головне заперечення","Рассрочка без переплаты — ответ на главное возражение"),
  hB:L("Почати ролик з готового рендера учениці замість вступу викладача","Начать ролик с готового рендера ученицы вместо вступления преподавателя"),
  hC:L("Кейс учениці 45+ для аудиторії, яка боїться не встигнути","Кейс ученицы 45+ для аудитории, которая боится не успеть"),
  hD:L("Короткий ролик 12 секунд для Reels","Короткий ролик 12 секунд для Reels"),
  hE:L("Той самий переможець у TikTok з рідним звуком","Тот же победитель в TikTok с родным звуком"),
  hF:L("Хук про дохід дає дешеві ліди і нуль оплат","Хук про доход даёт дешёвые лиды и ноль оплат"),
  hG:L("Запрошення від викладача працює краще за відгук","Приглашение от преподавателя работает лучше отзыва"),
  hH:L("Бонусний модуль без дедлайну конвертує гірше","Бонусный модуль без дедлайна конвертит хуже"),
  hI:L("Урок іде на звичайному ноутбуці — показати це в першому кадрі","Урок идёт на обычном ноутбуке — показать это в первом кадре"),
  hJ:L("Навчання вечорами по 40 хвилин — ролик про розклад","Обучение вечерами по 40 минут — ролик про расписание")});
const SRC = () => ({sales:L("продажі","продажи"),ret:L("досмотри","досмотры"),mkt:L("ринок","рынок"),mem:L("пам’ять","память")});
const TR = () => [
  [0,4,L("Привіт! Мене звати Олена, я викладаю 3D уже вісім років.","Привет! Меня зовут Елена, я преподаю 3D уже восемь лет.")],
  [4,9,L("Подивіться на цей рендер. Його зробила учениця на третьому тижні.","Посмотрите на этот рендер. Его сделала ученица на третьей неделе.")],
  [9,16,L("Вона ніколи не працювала в 3D і вчилася вечорами.","Она никогда не работала в 3D и училась по вечерам.")],
  [16,23,L("На безкоштовному уроці ми зберемо таку саму сцену разом.","На бесплатном уроке мы соберём такую же сцену вместе.")],
  [23,30,L("Реєструйтесь за посиланням — урок уже цієї середи.","Регистрируйтесь по ссылке — урок уже в эту среду.")]];
const COPY = () => ({
  A:{head:L("Безкоштовний урок 3D-візуалізації","Бесплатный урок 3D-визуализации"),
     text:L("Навчіться створювати інтер’єри в 3D. Записуйтесь на безкоштовний урок і зробіть перший крок у нову професію.","Научитесь создавать интерьеры в 3D. Записывайтесь на бесплатный урок и сделайте первый шаг в новую профессию."),
     u:[5,3,2,2], a:[4,4,3,6],
     note:L("Обіцянка загальна: незрозуміло, що саме людина зробить на уроці й коли він відбудеться. Терміновості немає.","Обещание общее: непонятно, что именно человек сделает на уроке и когда он пройдёт. Срочности нет.")},
  B:{head:L("Перший 3D-рендер за один вечір — урок у середу о 19:00","Первый 3D-рендер за один вечер — урок в среду в 19:00"),
     text:L("За 90 хвилин зберете сцену вітальні з нуля: світло, матеріали, рендер. Без досвіду, на звичайному ноутбуці. Урок безкоштовний, реєстрація до середи.","За 90 минут соберёте сцену гостиной с нуля: свет, материалы, рендер. Без опыта, на обычном ноутбуке. Урок бесплатный, регистрация до среды."),
     u:[8,7,9,8], a:[8,8,7,8],
     note:L("Є конкретний результат, час і умова. Заборонених формулювань проєкту немає.","Есть конкретный результат, время и условие. Запрещённых формулировок проекта нет.")}});

/* ---------- экраны ---------- */
const V = {
today(){
  const act = (id, okL) => S.inbox[id] === null
    ? `<div class="row"><button class="btn btn--solid btn--sm" data-act="inbox" data-id="${id}" data-v="1">${okL}</button><button class="btn btn--sm" data-act="inbox" data-id="${id}" data-v="0">${L("Відхилити","Отклонить")}</button></div>`
    : pill(S.inbox[id] ? "good" : "mute", S.inbox[id] ? L("виконано","выполнено") : L("відхилено","отклонено"));
  return `<div class="head"><div><h1>${L("Сьогодні","Сегодня")}</h1><p class="sub">${L("Ранковий розбір і рішення, які чекають на людину. Бот уже все порахував.","Утренний разбор и решения, которые ждут человека. Бот уже всё посчитал.")}</p></div></div>
  <div class="c2">
    <div class="panel vf"><span class="tag">${L("Ранковий розбір · 07:30","Утренний разбор · 07:30")}</span>
      <p>${L("За вчора витрачено $740, прийшло 177 лідів по $4,18 — у межах стелі. Дві оплати з вебінару середи. Головне на сьогодні: сім’я treds забирає 41% бюджету і майже не дає оплат, а priglos_v4 вигорає. Обидві пропозиції нижче.","За вчера потрачено $740, пришло 177 лидов по $4,18 — в пределах потолка. Две оплаты с вебинара среды. Главное на сегодня: семья treds забирает 41% бюджета и почти не даёт оплат, а priglos_v4 выгорает. Оба предложения ниже.")}</p>
      <div class="item"><div class="row">${pill("crit","ROAS 0,79")}<strong>${L("treds: 41% бюджету, майже без оплат","treds: 41% бюджета, почти без оплат")}</strong></div>
        <p class="sub">${L("Ліди по $3,74, але з 1 150 лідів лише 5 оплат. Пропозиція: бюджет сім’ї −50%, вивільнене — у priglos і viktor. Якщо нічого не робити, за тиждень піде ще близько $2 100.","Лиды по $3,74, но из 1 150 лидов только 5 оплат. Предложение: бюджет семьи −50%, высвобожденное — в priglos и viktor. Если ничего не делать, за неделю уйдёт ещё около $2 100.")}</p>${act("a1",L("Підтвердити","Подтвердить"))}</div>
      <div class="item"><div class="row">${pill("warn","CTR −32%")}<strong>${L("priglos_v4 вигорає","priglos_v4 выгорает")}</strong></div>
        <p class="sub">${L("Частота 2,8. Досмотри показують провал на четвертій секунді — можна обрізати вступ і випустити v5.","Частота 2,8. Досмотры показывают провал на четвёртой секунде — можно обрезать вступление и выпустить v5.")}</p><div class="row"><button class="btn btn--sm" data-act="openCr" data-id="priglos">${L("Відкрити креатив","Открыть креатив")}</button></div></div>
      <div class="item"><div class="row">${pill("good",SRC().sales)}<strong>${L("Нова гіпотеза з продажів","Новая гипотеза из продаж")}</strong></div>
        <p class="sub">${L("«Комісія розстрочки» звучить в 11 з 24 коментарів менеджерів. Ідея ролика: розстрочка без переплати.","«Комиссия рассрочки» звучит в 11 из 24 комментариев менеджеров. Идея ролика: рассрочка без переплаты.")}</p>${act("a3",L("Взяти в тест","Взять в тест"))}</div>
    </div>
    <div class="stack" style="display:flex;flex-direction:column;gap:16px">
      <div class="panel"><span class="tag">${L("План місяця","План месяца")}</span>
        ${[[L("Ліди","Лиды"),2452,2820],[L("Оплати","Оплаты"),56,95],[L("Виручка","Выручка"),38080,64600]].map(r=>`<div><div class="row sp"><span>${r[0]}</span><b class="mono">${r[0]===L("Виручка","Выручка")?money(r[1])+" / "+money(r[2]):num(r[1])+" / "+num(r[2])}</b></div><div class="prog"><i style="width:${Math.round(r[1]/r[2]*100)}%"></i></div></div>`).join("")}
      </div>
      <div class="panel"><span class="tag">${L("Сторож кабінетів","Сторож кабинетов")}</span>
        <div class="item"><div class="row">${pill("warn",L("баланс","баланс"))}<strong>TikTok Ads</strong></div><p class="sub">${L("Балансу вистачить на 2 дні. Поповнює власник кабінету.","Баланса хватит на 2 дня. Пополняет владелец кабинета.")}</p>${S.inbox.a4===null?`<div class="row"><button class="btn btn--sm" data-act="inbox" data-id="a4" data-v="1">${L("Нагадати власнику","Напомнить владельцу")}</button></div>`:pill("good",L("нагадування надіслано","напоминание отправлено"))}</div>
        <div class="item"><div class="row">${pill("good","ok")}<strong>Meta Ads · Google Ads</strong></div><p class="sub">${L("Статус активний, відхилених оголошень немає, поза основними плейсментами — $0.","Статус активный, отклонённых объявлений нет, вне основных плейсментов — $0.")}</p></div>
      </div>
    </div>
  </div>`;
},
projects(){
  const rows = [["school3d",L("Школа 3D","Школа 3D"),L("онлайн-освіта","онлайн-образование"),"Meta · TikTok · Google",10540,"3,61",Object.values(S.inbox).filter(v=>v===null).length],
    ["gamedev",L("Курс геймдизайну","Курс геймдизайна"),L("онлайн-освіта","онлайн-образование"),"Meta · TikTok",6200,"2,40",1],
    ["clinic",L("Клініка естетики","Клиника эстетики"),L("послуги, лід-форми","услуги, лид-формы"),"Meta",3900,"—",0]].concat(S.projects);
  return `<div class="head"><div><h1>${L("Усі проєкти","Все проекты")}</h1><p class="sub">${L("Один кабінет на всі проєкти агентства: різні ніші, різні майданчики, одні правила роботи.","Один кабинет на все проекты агентства: разные ниши, разные площадки, одни правила работы.")}</p></div>
    <button class="btn btn--solid" data-act="modal" data-id="project">${L("Новий проєкт","Новый проект")}</button></div>
  <div class="tw"><table><thead><tr><th>${L("Проєкт","Проект")}</th><th>${L("Ніша","Ниша")}</th><th>${L("Майданчики","Площадки")}</th><th class="n">${L("Витрати, 14 днів","Расход, 14 дней")}</th><th class="n">ROAS</th><th class="n">${L("Чекає рішень","Ждёт решений")}</th></tr></thead>
  <tbody>${rows.map(r=>`<tr data-act="proj" data-id="${r[0]}" tabindex="0"><td><b>${r[1]}</b></td><td>${r[2]}</td><td class="mono">${r[3]}</td><td class="n">${r[4]?money(r[4]):"—"}</td><td class="n">${r[5]}</td><td class="n">${r[6]?pill("crit",r[6]):pill("mute","0")}</td></tr>`).join("")}</tbody></table></div>`;
},
passport(){
  const rpl = 0.06 * 0.56 * CHECK;
  return `<div class="head"><div><h1>${L("Анамнез проєкту","Анамнез проекта")}</h1><p class="sub">${L("Те, чого бот не вгадає з кабінету. Заповнюється один раз, далі з цього беруться тексти, перевірки й стеля ціни ліда.","То, что бот не угадает из кабинета. Заполняется один раз, дальше отсюда берутся тексты, проверки и потолок цены лида.")}</p></div></div>
  <div class="c2">
    <div class="panel"><span class="tag">${L("Про проєкт","О проекте")}</span>
      <dl class="kv">
        <dt>${L("Ніша","Ниша")}</dt><dd>${L("Онлайн-освіта, 3D-візуалізація інтер’єрів","Онлайн-образование, 3D-визуализация интерьеров")}</dd>
        <dt>${L("Продукт","Продукт")}</dt><dd>${L("Курс на 4 місяці, $680","Курс на 4 месяца, $680")}</dd>
        <dt>${L("Гео","Гео")}</dt><dd>${L("Україна, Польща","Украина, Польша")}</dd>
        <dt>${L("Аудиторія","Аудитория")}</dt><dd>${L("25–54, без досвіду в 3D, шукають нову професію","25–54, без опыта в 3D, ищут новую профессию")}</dd>
        <dt>${L("Тон","Тон")}</dt><dd>${L("Спокійний, без тиску і дедлайнів, яких немає","Спокойный, без давления и дедлайнов, которых нет")}</dd>
        <dt>${L("Сайти","Сайты")}</dt><dd class="mono">school3d.example/urok · /akcia</dd>
        <dt>${L("Подія цілі","Событие цели")}</dt><dd>${L("Реєстрація на урок → бронь → оплата","Регистрация на урок → бронь → оплата")}</dd>
      </dl>
      <span class="tag" style="margin-top:6px">${L("Заборонені формулювання","Запрещённые формулировки")}</span>
      <div class="chipset"><span class="chip chip--no">${L("«заробіток від $…»","«заработок от $…»")}</span><span class="chip chip--no">${L("«гарантія працевлаштування»","«гарантия трудоустройства»")}</span><span class="chip chip--no">${L("«залишилось N місць»","«осталось N мест»")}</span></div>
      <p class="sub">${L("Ці фрази перевіряються в кожному новому ролику й тексті до запуску.","Эти фразы проверяются в каждом новом ролике и тексте до запуска.")}</p>
    </div>
    <div class="panel vf"><span class="tag">${L("Стеля ціни ліда","Потолок цены лида")}</span>
      <p class="formula">6,0% × 56% × $680 × <span id="shv">${S.share}</span>%</p>
      <p class="big" id="capv">$${dec(rpl * S.share / 100)}</p>
      <div class="field"><label for="share">${L("Частка маркетингу у виручці","Доля маркетинга в выручке")}</label><input type="range" id="share" min="15" max="35" value="${S.share}"></div>
      <p class="sub">${L("Броней від лідів × закриття броней × чек × частка маркетингу. Усі правила зупинки й масштабування рахуються від цього числа.","Броней от лидов × закрытие броней × чек × доля маркетинга. Все правила остановки и масштабирования считаются от этого числа.")}</p>
    </div>
  </div>`;
},
funnels(){
  if (S.funnel) return V.funnel(S.funnels.find(f => f.id === S.funnel));
  return `<div class="head"><div><h1>${L("Воронки","Воронки")}</h1><p class="sub">${L("Офер, ціна й акція живуть у воронці. У кожної свої креативи, тексти, стеля ціни ліда і режим автономії.","Оффер, цена и акция живут в воронке. У каждой свои креативы, тексты, потолок цены лида и режим автономии.")}</p></div>
    <button class="btn btn--solid" data-act="modal" data-id="funnel">${L("Нова воронка","Новая воронка")}</button></div>
  <div class="cols">${S.funnels.map(f=>`<div class="panel">
    <div class="row sp"><h2>${f.name || fname(f.id)}</h2>${pill(f.mode==="auto"?"ink":"mute",modeName(f.mode))}</div>
    <dl class="kv"><dt>${L("Ціль","Цель")}</dt><dd>${f.goal==="site"?L("Конверсія на сайті","Конверсия на сайте"):L("Лід-форма","Лид-форма")}</dd>
      <dt>${L("Стеля ліда","Потолок лида")}</dt><dd>$${dec(f.cap)}</dd><dt>${L("Витрати","Расход")}</dt><dd>${money(f.spend)}</dd>
      <dt>${L("Ліди","Лиды")}</dt><dd>${num(f.leads)}${f.leads?" · $"+dec(f.spend/f.leads):""}</dd><dt>ROAS</dt><dd><b>${f.spend?dec(roas(f)):"—"}</b></dd></dl>
    <div class="row"><button class="btn btn--sm" data-act="openFunnel" data-id="${f.id}">${L("Відкрити","Открыть")}</button></div></div>`).join("")}</div>`;
},
funnel(f){
  const fams = S.fam.filter(x => x.f === f.id), ls = S.launches.filter(x => x.f === f.id);
  return `<button class="back" data-act="closeFunnel">← ${L("Усі воронки","Все воронки")}</button>
  <div class="head"><div><h1>${f.name || fname(f.id)}</h1><p class="sub mono">${f.landing}</p></div></div>
  <div class="kpis">${[[L("Витрати","Расход"),money(f.spend)],[L("Ліди","Лиды"),num(f.leads)],[L("Ціна ліда","Цена лида"),f.leads?"$"+dec(f.spend/f.leads):"—"],[L("Оплати","Оплаты"),f.pay],["ROAS",f.spend?dec(roas(f)):"—"]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
  <div class="c2">
    <div class="panel"><span class="tag">${L("Режим автономії","Режим автономии")}</span>
      <div class="seg" role="group">${["adv","btn","auto"].map(m=>`<button type="button" data-act="mode" data-id="${f.id}" data-v="${m}" aria-pressed="${f.mode===m}" ${S.frozen&&m==="auto"?"disabled":""}>${modeName(m)}</button>`).join("")}</div>
      <p class="sub">${{adv:L("Бот тільки радить. Усе робить людина.","Бот только советует. Всё делает человек."),btn:L("Бот готує дію і виконує після підтвердження.","Бот готовит действие и выполняет после подтверждения."),auto:L("Бот діє сам у коридорі нижче. Вихід за коридор повертає до кнопки.","Бот действует сам в коридоре ниже. Выход за коридор возвращает к кнопке.")}[f.mode]}</p>
      <dl class="kv"><dt>${L("Стеля ціни ліда","Потолок цены лида")}</dt><dd class="mono">$${dec(f.cap)}</dd><dt>${L("Денний ліміт","Дневной лимит")}</dt><dd class="mono">$${f.limit}</dd><dt>${L("Крок бюджету","Шаг бюджета")}</dt><dd class="mono">${L("до 30%, кулдаун 24 год","до 30%, кулдаун 24 ч")}</dd></dl>
    </div>
    <div class="panel"><span class="tag">${L("Офер","Оффер")}</span>
      <dl class="kv"><dt>${L("Продукт","Продукт")}</dt><dd>${L("Курс 3D-візуалізації","Курс 3D-визуализации")}</dd><dt>${L("Ціна","Цена")}</dt><dd>$680</dd>
      <dt>${L("Акція","Акция")}</dt><dd>${f.id==="f2"?L("бонусний модуль до 30.11","бонусный модуль до 30.11"):"—"}</dd><dt>${L("Ціль","Цель")}</dt><dd>${f.goal==="site"?L("Реєстрація на сайті","Регистрация на сайте"):L("Лід-форма","Лид-форма")}</dd></dl></div>
  </div>
  <div class="panel"><div class="row sp"><span class="tag">${L("Креативи воронки","Креативы воронки")} · ${fams.length}</span><a class="btn btn--sm" href="#creatives">${L("Бібліотека","Библиотека")}</a></div>
    ${fams.length?`<div class="lib">${fams.map(crCard).join("")}</div>`:`<p class="sub">${L("Поки порожньо. Додайте ролики з папки або скажіть боту, що запустити.","Пока пусто. Добавьте ролики из папки или скажите боту, что запустить.")}</p>`}</div>
  <div class="tw"><table><thead><tr><th>${L("Запуски воронки","Запуски воронки")}</th><th>${L("Майданчик","Площадка")}</th><th>${L("Статус","Статус")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">CPL</th></tr></thead>
    <tbody>${ls.map(l=>`<tr data-act="openLaunch" data-id="${l.n}" tabindex="0"><td class="mono">${l.n}</td><td>${l.pl}</td><td>${st(l.st)}</td><td class="n">${money(l.spend)}</td><td class="n">${l.leads?"$"+dec(l.spend/l.leads):"—"}</td></tr>`).join("") || `<tr><td colspan="5" class="sub">${L("Запусків ще немає","Запусков ещё нет")}</td></tr>`}</tbody></table></div>`;
},
creatives(){
  const up = S.upload;
  return `<div class="head"><div><h1>${L("Креативи","Креативы")}</h1><p class="sub">${L("Версії однієї ідеї зібрані в сім’ю. Відкрийте ролик, щоб побачити досмотри по секундах.","Версии одной идеи собраны в семью. Откройте ролик, чтобы увидеть досмотры по секундам.")}</p></div></div>
  <div class="panel">
    <button type="button" class="drop" data-act="upload"><b>${L("Додати ролики","Добавить ролики")}</b><span class="sub">${L("Перетягніть файли або візьміть нові з папки Drive «Креативи 3D»","Перетащите файлы или возьмите новые из папки Drive «Креативы 3D»")}</span></button>
    ${up ? up.files.map(f=>`<div class="file"><span class="mono">${f.n}</span>${f.p<100?`<span class="mono">${f.p}%</span>`:(f.bad?pill("crit",L("заборонене формулювання","запрещённая формулировка")):pill("good",L("перевірено","проверено")))}
      <div class="prog"><i style="width:${f.p}%"></i></div>
      ${f.p>=100&&f.bad?`<p class="sub" style="grid-column:1/-1">${L("На 0:03 текст на екрані «від 20$ на годину». Це заборонене формулювання проєкту — ролик у запуск не потрапить.","На 0:03 текст на экране «от 20$ в час». Это запрещённая формулировка проекта — ролик в запуск не попадёт.")}</p>`:""}</div>`).join("") : ""}
  </div>
  <div class="lib">${S.fam.map(crCard).join("")}</div>`;
},
copy(){
  const C = COPY(), c = C[S.copySel], U = [L("Корисність","Полезность"),L("Унікальність","Уникальность"),L("Конкретика","Конкретика"),L("Терміновість","Срочность")], A = ["Attention","Interest","Desire","Action"];
  const rw = S.rewrite;
  return `<div class="head"><div><h1>${L("Тексти","Тексты")}</h1><p class="sub">${L("Варіанти описів під воронку. Кожен перевіряється за 4U та AIDA і на заборонені формулювання проєкту.","Варианты описаний под воронку. Каждый проверяется по 4U и AIDA и на запрещённые формулировки проекта.")}</p></div>
    <div class="seg" role="group"><button type="button" data-act="copySel" data-id="A" aria-pressed="${S.copySel==="A"}">${L("Варіант A","Вариант A")}</button><button type="button" data-act="copySel" data-id="B" aria-pressed="${S.copySel==="B"}" ${rw&&rw.done?"":"disabled"}>${L("Варіант B","Вариант B")}</button></div></div>
  <div class="c2">
    <div class="panel"><span class="tag">${fname("f1")}</span>
      <div class="copybox"><b>${c.head}</b><p>${c.text}</p></div>
      <p class="sub">${c.note}</p>
      ${S.copySel==="A" ? `<div class="row"><button class="btn btn--solid" data-act="rewrite" ${rw?"disabled":""}>${L("Переписати за 4U","Переписать по 4U")}</button></div>` : `<div class="row">${pill("good",L("заборонених формулювань немає","запрещённых формулировок нет"))}</div>`}
      ${rw && S.copySel==="A" ? `<div class="copybox"><span class="tag">${L("Варіант B","Вариант B")}</span><b>${C.B.head.slice(0, rw.n)}</b><p>${C.B.text.slice(0, Math.max(0, rw.n - C.B.head.length))}${rw.done?"":'<span class="dots"></span>'}</p></div>${rw.done?`<div class="row"><button class="btn" data-act="copySel" data-id="B">${L("Відкрити варіант B","Открыть вариант B")}</button></div>`:""}` : ""}
    </div>
    <div class="panel vf"><span class="tag">4U</span>${U.map((n,i)=>`<div class="score"><span>${n}</span><i class="${c.u[i]<5?"low":""}" style="width:${c.u[i]*10}%"></i><b class="mono">${c.u[i]}</b></div>`).join("")}
      <span class="tag" style="margin-top:8px">AIDA</span>${A.map((n,i)=>`<div class="score"><span>${n}</span><i class="${c.a[i]<5?"low":""}" style="width:${c.a[i]*10}%"></i><b class="mono">${c.a[i]}</b></div>`).join("")}</div>
  </div>`;
},
hyp(){
  const H = HYP(), R = SRC();
  const col = n => S.hyp.filter(h=>h.col===n).map(h=>`<div class="kcard"><div class="row">${pill("mute",R[h.src])}${h.res!=null?pill(h.res?"good":"crit",h.res?L("підтверджено","подтверждено"):L("спростовано","опровергнуто")):""}</div><p>${H[h.id]}</p>${n===1?`<button class="btn btn--sm" data-act="take" data-id="${h.id}">${L("Взяти в тест","Взять в тест")}</button>`:""}</div>`).join("");
  return `<div class="head"><div><h1>${L("Гіпотези","Гипотезы")}</h1><p class="sub">${L("У кожної гіпотези є джерело і результат. Історія лишається в проєкті, навіть коли змінюється команда.","У каждой гипотезы есть источник и результат. История остаётся в проекте, даже когда меняется команда.")}</p></div>
    <button class="btn btn--solid" data-act="objections" ${S.objections?"disabled":""}>${L("Зібрати з продажів","Собрать из продаж")}</button></div>
  ${S.objections?`<div class="panel vf"><span class="tag">${L("Заперечення з коментарів менеджерів · 24 броні","Возражения из комментариев менеджеров · 24 брони")}</span>
    <div class="bars">${[[L("Комісія розстрочки","Комиссия рассрочки"),11],[L("Немає часу на навчання","Нет времени на обучение"),7],[L("Слабкий ноутбук","Слабый ноутбук"),5]].map(o=>`<div class="barrow"><span>${o[0]}</span><i style="width:${o[1]/11*100}%"></i><b>${o[1]} ${L("з 24","из 24")}</b></div>`).join("")}</div>
    <p class="sub">${L("Із двох заперечень, для яких ще не було роликів, додано дві нові ідеї.","Из двух возражений, для которых ещё не было роликов, добавлены две новые идеи.")}</p></div>`:""}
  <div class="kan">${[[1,L("Ідеї","Идеи")],[2,L("У тесті","В тесте")],[3,L("Результат","Результат")]].map(c=>`<div class="panel"><span class="tag">${c[1]} · ${S.hyp.filter(h=>h.col===c[0]).length}</span>${col(c[0])}</div>`).join("")}</div>`;
},
launches(){
  return `<div class="head"><div><h1>${L("Запуски","Запуски")}</h1><p class="sub">${L("Усі майданчики в одній таблиці. Назви латиницею, бо вони йдуть в UTM. Усе нове створюється вимкненим — вмикає людина.","Все площадки в одной таблице. Названия латиницей, потому что они уходят в UTM. Всё новое создаётся выключенным — включает человек.")}</p></div></div>
  <div class="tw"><table><thead><tr><th>${L("Кампанія","Кампания")}</th><th>${L("Майданчик","Площадка")}</th><th>${L("Воронка","Воронка")}</th><th>${L("Статус","Статус")}</th><th class="n">${L("Бюджет/день","Бюджет/день")}</th><th class="n">${L("Витрати","Расход")}</th><th class="n">CPL</th></tr></thead>
  <tbody>${S.launches.map(l=>`<tr data-act="openLaunch" data-id="${l.n}" tabindex="0"><td class="mono">${l.n}</td><td>${l.pl}</td><td>${fname(l.f)}</td><td>${st(l.st)}</td><td class="n">$${l.bud}</td><td class="n">${money(l.spend)}</td><td class="n">${l.leads?"$"+dec(l.spend/l.leads):"—"}</td></tr>`).join("")}</tbody></table></div>`;
},
analytics(){
  const fs = S.fam.filter(f=>f.spend>0), mx = Math.max(...fs.map(roas));
  return `<div class="head"><div><h1>${L("Аналітика","Аналитика")}</h1><p class="sub">${L("Рахунок по даті вебінару і до оплати. Жовті дні ще дозрівають: оплати по них надходять.","Счёт по дате вебинара и до оплаты. Жёлтые дни ещё дозревают: оплаты по ним поступают.")}</p></div></div>
  <div class="kpis">${[[L("Витрати","Расход"),"$10 540"],[L("Ліди","Лиды"),"2 452"],[L("Ціна ліда","Цена лида"),"$4,30"],[L("Броні","Брони"),"148"],[L("Оплати","Оплаты"),"56"],[L("Виручка","Выручка"),"$38 080"],["ROAS","3,61"]].map(k=>`<div class="kpi"><span class="tag">${k[0]}</span><strong>${k[1]}</strong></div>`).join("")}</div>
  <div class="c2">
    <div class="panel"><span class="tag">${L("Витрати по днях і ліди","Расход по дням и лиды")}</span>${dayChart()}</div>
    <div class="panel"><span class="tag">${L("Воронка до грошей","Воронка до денег")}</span>
      <div class="bars">${[[L("Ліди","Лиды"),2452,100,""],[L("Броні","Брони"),148,34,"6,0%"],[L("Оплати","Оплаты"),56,18,"38%"]].map(b=>`<div class="barrow"><span>${b[0]}</span><i style="width:${b[2]}%"></i><b>${num(b[1])}${b[3]?" · "+b[3]:""}</b></div>`).join("")}</div>
      <p class="sub">${L("Закриття броней за планом 56%. Зараз 38%, бо останній тиждень ще дозріває.","Закрытие броней по плану 56%. Сейчас 38%, потому что последняя неделя ещё дозревает.")}</p></div>
  </div>
  <div class="c2">
    <div class="panel"><span class="tag">${L("ROAS по сім’ях креативів","ROAS по семьям креативов")}</span>
      <div class="bars">${fs.map(f=>`<div class="barrow"><span class="mono">${f.id}</span><i class="${roas(f)<1?"bad":""}" style="width:${Math.max(2,roas(f)/mx*100)}%"></i><b>${dec(roas(f))}</b></div>`).join("")}</div></div>
    <div class="panel"><span class="tag">${L("По майданчиках","По площадкам")}</span>
      <dl class="kv">${[["Meta",8880,2090],["TikTok",640,152],["Google",1020,210]].map(p=>`<dt>${p[0]}</dt><dd class="mono">${money(p[1])} · ${num(p[2])} ${L("лідів","лидов")} · $${dec(p[1]/p[2])}</dd>`).join("")}</dl></div>
  </div>`;
},
rules(){
  const R = [
    [L("Оголошення без ліда","Объявление без лида"),L("витрачено 2 × стелю","потрачено 2 × потолок"),L("стоп оголошення","стоп объявления"),"auto"],
    [L("Група без ліда","Группа без лида"),L("витрачено 3 × стелю","потрачено 3 × потолок"),L("пауза групи","пауза группы"),"auto"],
    [L("CPL вище цілі","CPL выше цели"),L("+50% три дні поспіль","+50% три дня подряд"),L("бюджет −30%","бюджет −30%"),"btn"],
    [L("CPL нижче цілі","CPL ниже цели"),L("−20% три дні","−20% три дня"),L("бюджет +20–30%, кулдаун 24 год","бюджет +20–30%, кулдаун 24 ч"),"btn"],
    [L("Вигорання","Выгорание"),L("частота > 2,5 або CTR −30%","частота > 2,5 или CTR −30%"),L("запит нової версії монтажеру","запрос новой версии монтажёру"),"auto"],
    [L("Нове гео або вік","Новое гео или возраст"),"—",L("тільки дублем групи","только дублем группы"),"btn"],
    [L("Група в навчанні","Группа в обучении"),L("менше 50 подій або 3 днів","меньше 50 событий или 3 дней"),L("нічого не змінювати","ничего не менять"),"auto"],
    [L("Стоп-лосс кабінету","Стоп-лосс кабинета"),L("$400 на день","$400 в день"),L("зупинити виконання, написати в Telegram","остановить исполнение, написать в Telegram"),"auto"]];
  const T = [[L("Власник","Собственник"),L("усе, включно з правилами","всё, включая правила"),L("без стелі","без потолка")],
    [L("Керівник лідгену","Руководитель лидгена"),L("усе, крім зміни правил","всё, кроме смены правил"),L("до 20% бюджету групи на день","до 20% бюджета группы в день")],
    [L("Таргетолог","Таргетолог"),L("вмикає готові чернетки","включает готовые черновики"),L("у межах тижневого ліміту","в пределах недельного лимита")],
    [L("Менеджер","Менеджер"),L("питання, стоп поганого креативу","вопросы, стоп плохого креатива"),L("не витрачає гроші","не тратит деньги")]];
  return `<div class="head"><div><h1>${L("Правила й ролі","Правила и роли")}</h1><p class="sub">${L("Пороги рахуються від стелі ціни ліда з анамнезу. Автоматично бот тільки зупиняє — усе, що збільшує витрати, чекає на кнопку.","Пороги считаются от потолка цены лида из анамнеза. Автоматически бот только останавливает — всё, что увеличивает расход, ждёт кнопки.")}</p></div></div>
  <div class="tw"><table><thead><tr><th>${L("Ситуація","Ситуация")}</th><th>${L("Поріг","Порог")}</th><th>${L("Дія","Действие")}</th><th>${L("Як","Как")}</th><th class="n">${L("Увімкнено","Включено")}</th></tr></thead>
  <tbody>${R.map((r,i)=>`<tr><td><b>${r[0]}</b></td><td class="mono">${r[1]}</td><td>${r[2]}</td><td>${pill(r[3]==="auto"?"ink":"mute",r[3]==="auto"?L("сам","сам"):L("за кнопкою","по кнопке"))}</td><td class="n"><button type="button" class="sw" data-act="rule" data-id="${i}" aria-pressed="${!!S.rules[i]}" aria-label="toggle"></button></td></tr>`).join("")}</tbody></table></div>
  <div class="tw"><table><thead><tr><th>${L("Роль","Роль")}</th><th>${L("Що може","Что может")}</th><th>${L("Стеля без підтвердження","Потолок без подтверждения")}</th></tr></thead>
  <tbody>${T.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join("")}</tbody></table></div>`;
},
connections(){
  const C = [["Meta Ads",L("2 кабінети, піксель, сторінка","2 кабинета, пиксель, страница"),1],["TikTok Ads",L("1 кабінет","1 кабинет"),1],["Google Ads",L("1 кабінет, читання і запис","1 кабинет, чтение и запись"),1],
    ["Google Drive",L("папка «Креативи 3D», 38 файлів","папка «Креативы 3D», 38 файлов"),1],[L("Таблиця продажів","Таблица продаж"),L("оновлено сьогодні о 08:02","обновлено сегодня в 08:02"),1],["Telegram",L("бот @rakurs_demo_bot, 4 учасники","бот @rakurs_demo_bot, 4 участника"),1],
    ["CRM",L("щоб рахувати заперечення й оплати без таблиці","чтобы считать возражения и оплаты без таблицы"),S.conn.crm?2:0]];
  return `<div class="head"><div><h1>${L("Підключення","Подключения")}</h1><p class="sub">${L("Підключає інтегратор " + BRAND.name + " через офіційні API майданчиків. Доступ можна відкликати будь-коли.","Подключает интегратор " + BRAND.name + " через официальные API площадок. Доступ можно отозвать в любой момент.")}</p></div></div>
  <div class="conn">${C.map((c,i)=>`<div class="panel"><div class="row sp"><h2>${c[0]}</h2>${c[2]===1?pill("good",L("підключено","подключено")):c[2]===2?pill("warn",L("запит надіслано","запрос отправлен")):pill("mute",L("не підключено","не подключено"))}</div><p class="sub">${c[1]}</p>${c[2]===0?`<div class="row"><button class="btn btn--sm" data-act="connect">${L("Запит інтегратору","Запрос интегратору")}</button></div>`:""}</div>`).join("")}</div>`;
},
journal(){
  const T = LOGT(), W = WHO();
  return `<div class="head"><div><h1>${L("Журнал","Журнал")}</h1><p class="sub">${L("Кожна дія: хто, коли, що і на якій підставі.","Каждое действие: кто, когда, что и на каком основании.")}</p></div></div>
  <div class="panel"><div class="log">${S.log.map(l=>`<div><time>${l[0]}</time><span>${W[l[1]]}</span><p>${typeof l[2]==="number"?T[l[2]]:l[2]}</p></div>`).join("")}</div></div>`;
}};
const modeName = m => ({adv:L("Радник","Советник"),btn:L("За кнопкою","По кнопке"),auto:L("Автопілот","Автопилот")}[m]);
function crCard(f){ return `<button type="button" class="cr" data-act="openCr" data-id="${f.id}"><div class="thumb" style="--h:${f.h}"><em>${tc(f.dur)}</em><span>${f.id}_v${f.v}</span></div><div class="row sp">${st(f.st)}<b class="mono">${f.spend?"ROAS "+dec(roas(f)):L("новий","новый")}</b></div><span class="sub mono">${f.v} ${L("версії","версии")} · ${money(f.spend)}</span></button>`; }

/* ---------- оверлеи ---------- */
function overlay(){
  if (S.cr) return ["drawer", drawerCr(S.fam.find(f => f.id === S.cr))];
  if (S.launch) return ["drawer", drawerLaunch(S.launches.find(l => l.n === S.launch))];
  if (S.modal === "funnel") return ["modal", modalFunnel()];
  if (S.modal === "project" && S.ob) return ["modal", modalOnboard()];
  if (S.modal === "aud") return ["modal", modalAud()];
  return null;
}
function drawerCr(f){
  const T = TR(), bound = PHR.reduce((b,p)=>Math.abs(p-f.drop)<Math.abs(b-f.drop)?p:b, PHR[0]), tr = S.trim;
  const steps = [L("Знаходжу межу фрази біля провалу","Нахожу границу фразы возле провала"),L("Ріжу ролик","Режу ролик")+" "+tc(0)+"–"+tc(bound),L("Заливаю нову версію в кабінет","Заливаю новую версию в кабинет"),L("Збираю оголошення вимкненим","Собираю объявление выключенным")];
  return `
    <div class="row sp"><div><span class="tag">${L("Сім’я креативу","Семья креатива")}</span><h1>${f.id}_v${f.v}</h1></div><button class="x" data-act="closeOverlay" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="row">${st(f.st)}${pill("mute","CTR "+f.ctr)}${pill("mute",L("частота","частота")+" "+f.fq)}${pill("mute",f.spend?"ROAS "+dec(roas(f)):L("ще без показів","ещё без показов"))}</div>
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap;gap:16px">
      <div class="thumb thumb--lg" style="--h:${f.h}"><em>${tc(S.playhead)} / ${tc(f.dur)}</em><span>${f.id}_v${f.v}</span></div>
      <div class="panel vf" style="flex:1"><span class="tag">${L("Досмотри по секундах","Досмотры по секундам")}${f.prev?" · "+L("пунктир — попередня версія","пунктир — прошлая версия"):""}</span>${retChart(f,{head:S.playhead,prev:f.prev,noCut:!!f.prev})}</div>
    </div>
    <div class="panel"><span class="tag">${L("Розшифровка","Расшифровка")}</span>
      <div class="tr">${T.filter(p=>p[0]>=(f.cut||0) && p[0]-(f.cut||0)<f.dur).map(p=>{ const off = f.cut||0, a=p[0]-off, b=Math.min(p[1]-off,f.dur); return `<button type="button" data-act="seek" data-id="${a}" class="${!f.prev&&tr&&p[1]<=bound?"cutme":""}" aria-current="${S.playhead>=a&&S.playhead<b}"><time>${tc(a)}–${tc(b)}</time><span>${p[2]}</span></button>`; }).join("")}</div></div>
    ${tr ? `<div class="panel"><span class="tag">${L("Обрізка","Обрезка")}</span><ol class="steps">${steps.map((s,i)=>`<li class="${i<tr.i?"ok":i===tr.i?"on":""}">${s}</li>`).join("")}</ol></div>` : ""}
    ${f.prev ? `<div class="panel"><div class="row">${pill("good",L("нова версія","новая версия"))}<b>${L("Вступ обрізано, оголошення зібране вимкненим","Вступление обрезано, объявление собрано выключенным")}</b></div><p class="sub">${L("Ролик тепер починається з готового рендера. Порівняйте криві, коли набереться тиждень показів.","Ролик теперь начинается с готового рендера. Сравните кривые, когда наберётся неделя показов.")}</p></div>` : ""}
    <div class="row"><button class="btn btn--solid" data-act="trim" ${tr||f.prev?"disabled":""}>${L("Обрізати вступ по межі фрази","Обрезать вступление по границе фразы")}</button>
      <button class="btn" data-act="toTikTok" data-id="${f.id}">${L("Перенести в TikTok","Перенести в TikTok")}</button></div>`;
}
function drawerLaunch(l){
  const fams = S.fam.filter(f => f.f === l.f).slice(0,3);
  return `
    <div class="row sp"><div><span class="tag">${l.pl} · ${fname(l.f)}</span><h1 style="font-size:18px;overflow-wrap:anywhere">${l.n}</h1></div><button class="x" data-act="closeOverlay" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="row">${st(l.st)}</div>
    <div class="panel"><span class="tag">${L("Налаштування","Настройки")}</span>
      <dl class="kv"><dt>${L("Ціль","Цель")}</dt><dd>${L("Ліди, подія «реєстрація»","Лиды, событие «регистрация»")}</dd><dt>${L("Гео і вік","Гео и возраст")}</dt><dd>${l.n.includes("_PL_")?L("Польща","Польша"):L("Україна","Украина")}, 25–54</dd>
      <dt>${L("Бюджет","Бюджет")}</dt><dd class="mono">$${l.bud} ${L("на день","в день")}</dd><dt>${L("Старт","Старт")}</dt><dd class="mono">${L("00:40 за Києвом","00:40 по Киеву")}</dd>
      <dt>UTM</dt><dd class="mono">utm_campaign={{campaign.name}}&amp;utm_content={{ad.name}}&amp;utm_term={{adset.name}}</dd></dl></div>
    <div class="panel"><span class="tag">${L("Структура","Структура")}</span>
      <div class="tree"><b>${l.n}</b>${fams.map(f=>`<div>${L("група","группа")} ${f.id} · $${Math.round(l.bud/fams.length)}<div>${f.id}_v${f.v}</div></div>`).join("")}</div></div>
    ${l.st==="draft" ? `<div class="panel vf"><p>${L("Кампанія зібрана вимкненою. Перевірте структуру й увімкніть — це завжди робить людина.","Кампания собрана выключенной. Проверьте структуру и включите — это всегда делает человек.")}</p><div class="row"><button class="btn btn--solid" data-act="enable" data-id="${l.n}" ${S.frozen?"disabled":""}>${L("Увімкнути","Включить")}</button></div></div>` : ""}`;
}
function modalFunnel(){
  return `
    <div class="row sp"><h1>${L("Нова воронка","Новая воронка")}</h1><button class="x" data-act="closeOverlay" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="form">
      <div class="field w"><label for="nf-name">${L("Назва","Название")}</label><input id="nf-name" value="${L("Чорна п’ятниця, −20%","Чёрная пятница, −20%")}"></div>
      <div class="field"><label for="nf-price">${L("Ціна","Цена")}</label><input id="nf-price" value="$544"></div>
      <div class="field"><label for="nf-until">${L("Акція до","Акция до")}</label><input id="nf-until" value="30.11"></div>
      <div class="field"><label for="nf-goal">${L("Ціль","Цель")}</label><select id="nf-goal"><option value="site">${L("Конверсія на сайті","Конверсия на сайте")}</option><option value="form">${L("Лід-форма","Лид-форма")}</option></select></div>
      <div class="field"><label for="nf-cap">${L("Стеля ціни ліда","Потолок цены лида")}</label><input id="nf-cap" value="$4,00"></div>
      <div class="field w"><label for="nf-url">${L("Лендинг","Лендинг")}</label><input id="nf-url" value="school3d.example/bf"></div>
    </div>
    <div class="row"><button class="btn btn--solid" data-act="createFunnel">${L("Створити воронку","Создать воронку")}</button></div>`;
}
function modalProject(){
  const stepsT = [L("Про проєкт","О проекте"),L("Офер і економіка","Оффер и экономика"),L("Обмеження","Ограничения")], w = S.wiz;
  const body = [
    `<div class="field w"><label for="np-name">${L("Назва проєкту","Название проекта")}</label><input id="np-name" value="${L("Школа англійської","Школа английского")}"></div>
     <div class="field"><label for="np-niche">${L("Ніша","Ниша")}</label><input id="np-niche" value="${L("онлайн-освіта","онлайн-образование")}"></div>
     <div class="field"><label for="np-geo">${L("Гео","Гео")}</label><input id="np-geo" value="${L("Україна","Украина")}"></div>
     <div class="field w"><label for="np-aud">${L("Кому продаємо","Кому продаём")}</label><input id="np-aud" value="${L("дорослі 25–45, англійська для роботи","взрослые 25–45, английский для работы")}"></div>`,
    `<div class="field"><label for="np-price">${L("Середній чек","Средний чек")}</label><input id="np-price" value="$320"></div>
     <div class="field"><label for="np-share">${L("Частка маркетингу","Доля маркетинга")}</label><input id="np-share" value="25%"></div>
     <div class="field w"><label for="np-site">${L("Сайти, на які можна вести","Сайты, на которые можно вести")}</label><input id="np-site" value="english.example/trial"></div>
     <div class="field w"><label for="np-ev">${L("Що вважаємо результатом","Что считаем результатом")}</label><input id="np-ev" value="${L("запис на пробний урок → оплата","запись на пробный урок → оплата")}"></div>`,
    `<div class="field w"><label for="np-ban">${L("Заборонені формулювання","Запрещённые формулировки")}</label><textarea id="np-ban" rows="3">${L("«заговорите за місяць», «гарантія рівня»","«заговорите за месяц», «гарантия уровня»")}</textarea></div>
     <div class="field w"><label for="np-tone">${L("Тон","Тон")}</label><input id="np-tone" value="${L("дружній, без обіцянок швидкого результату","дружелюбный, без обещаний быстрого результата")}"></div>`][w];
  return `
    <div class="row sp"><div><span class="tag">${L("Крок","Шаг")} ${w+1} / 3 · ${stepsT[w]}</span><h1>${L("Новий проєкт","Новый проект")}</h1></div><button class="x" data-act="closeOverlay" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="prog"><i style="width:${(w+1)/3*100}%"></i></div>
    <div class="form">${body}</div>
    <div class="row">${w>0?`<button class="btn" data-act="wiz" data-v="-1">${L("Назад","Назад")}</button>`:""}${w<2?`<button class="btn btn--solid" data-act="wiz" data-v="1">${L("Далі","Дальше")}</button>`:`<button class="btn btn--solid" data-act="createProject">${L("Створити і надіслати інтегратору","Создать и отправить интегратору")}</button>`}</div>`;
}

/* ---------- голосовой помощник ---------- */
const ORDER = ["launch","why","budget","tiktok","stop"];
const SC = () => ({
  launch:{chip:L("Запустити три ролики","Запустить три ролика"),q:L("Запусти в акції три нові ролики на Польщу, по десять доларів","Запусти в акции три новых ролика на Польшу, по десять долларов"),
    rows:[[L("Воронка","Воронка"),fname("f2")],[L("Креативи","Креативы"),"priglos_v4, viktor_v2, systema_v3"],[L("Гео","Гео"),L("Польща, 25–54","Польша, 25–54")],[L("Бюджет","Бюджет"),L("$10 на день × 3 групи","$10 в день × 3 группы")],[L("Старт","Старт"),L("завтра о 00:40, вимкненою","завтра в 00:40, выключенной")]],
    ok:L("Запустити","Запустить"),
    steps:[L("Беру три ролики з воронки","Беру три ролика из воронки"),L("Перевіряю тексти на заборонені формулювання","Проверяю тексты на запрещённые формулировки"),L("Збираю кампанію і три групи","Собираю кампанию и три группы"),L("Проставляю UTM і старт 00:40","Проставляю UTM и старт 00:40")],
    done:L("Зібрано: RK_PL_Akcia_Site_20.11_ABO, 3 групи, 3 оголошення. Усе вимкнено. Увімкніть, коли перевірите.","Собрано: RK_PL_Akcia_Site_20.11_ABO, 3 группы, 3 объявления. Всё выключено. Включите, когда проверите."),go:["launches",L("Відкрити запуски","Открыть запуски")]},
  why:{chip:L("Чому виріс CPL?","Почему вырос CPL?"),q:L("Чому виріс CPL у вебінарній воронці?","Почему вырос CPL в вебинарной воронке?"),
    text:L("За тиждень CPL зріс з $3,90 до $4,60. CTR не змінився, CPM +18%. Причина в одній сім’ї: priglos_v4 показується з частотою 2,8, аудиторія його вже бачила. Пропоную обрізати вступ і випустити v5. Нічого не змінював.","За неделю CPL вырос с $3,90 до $4,60. CTR не изменился, CPM +18%. Причина в одной семье: priglos_v4 показывается с частотой 2,8, аудитория его уже видела. Предлагаю обрезать вступление и выпустить v5. Ничего не менял."),go:["creatives",L("Відкрити креативи","Открыть креативы")]},
  budget:{chip:L("Підняти бюджет на 30%","Поднять бюджет на 30%"),q:L("Підніми бюджет на viktor на тридцять відсотків","Подними бюджет на viktor на тридцать процентов"),
    rows:[[L("Дія","Действие"),L("Бюджет +30%","Бюджет +30%")],[L("Група","Группа"),"viktor"],[L("Було → стане","Было → станет"),L("$40 → $52 на день","$40 → $52 в день")],[L("Правило","Правило"),L("останнє підвищення 14 год тому, кулдаун 24 год","последнее повышение 14 ч назад, кулдаун 24 ч")]],
    ok:L("Поставити на 10:00","Поставить на 10:00"),
    done:L("Поставив у чергу на 10:00. Якщо до того часу ціна ліда вийде за стелю, дію буде скасовано.","Поставил в очередь на 10:00. Если к этому времени цена лида выйдет за потолок, действие будет отменено.")},
  tiktok:{chip:L("Переможця — в TikTok","Победителя — в TikTok"),q:L("Перенеси найкращий ролик у TikTok","Перенеси лучший ролик в TikTok"),
    rows:[[L("Ролик","Ролик"),"priglos_v4 · ROAS 6,99"],[L("Куди","Куда"),"TikTok Ads"],[L("Формат","Формат"),L("9:16, 30 с — підходить","9:16, 30 с — подходит")],[L("Бюджет","Бюджет"),L("$20 на день, тест 5 днів","$20 в день, тест 5 дней")],[L("Ціль","Цель")+" CPL",L("до $5,00","до $5,00")]],
    ok:L("Зібрати чернетку","Собрать черновик"),
    steps:[L("Перевіряю формат і тривалість","Проверяю формат и длительность"),L("Збираю кампанію в TikTok Ads","Собираю кампанию в TikTok Ads"),L("Проставляю UTM","Проставляю UTM")],
    done:L("Чернетка RK_UA_Urok3D_TT_20.11 зібрана вимкненою. Результат порівняю з Meta через п’ять днів.","Черновик RK_UA_Urok3D_TT_20.11 собран выключенным. Результат сравню с Meta через пять дней."),go:["launches",L("Відкрити запуски","Открыть запуски")]},
  stop:{chip:L("Зупинити акцію","Остановить акцию"),q:L("Зупини все по акції, поки не перевіримо лендинг","Останови всё по акции, пока не проверим лендинг"),
    rows:[[L("Дія","Действие"),L("Пауза всіх кампаній воронки","Пауза всех кампаний воронки")],[L("Воронка","Воронка"),fname("f2")],[L("Зачепить","Затронет"),L("1 кампанію, $90 на день","1 кампанию, $90 в день")]],
    ok:L("Зупинити","Остановить"),
    done:L("Кампанію RK_UA_Akcia_Site_17.11_CBO поставлено на паузу. Воронку переведено в режим «радник».","Кампания RK_UA_Akcia_Site_17.11_CBO поставлена на паузу. Воронка переведена в режим «советник».")}});
const FX = {
  launch(){ if (!S.launches.some(l=>l.n==="RK_PL_Akcia_Site_20.11_ABO")) S.launches.unshift({n:"RK_PL_Akcia_Site_20.11_ABO",pl:"Meta",f:"f2",st:"draft",bud:30,spend:0,leads:0}); },
  budget(){}, 
  tiktok(){ if (!S.launches.some(l=>l.n==="RK_UA_Urok3D_TT_20.11")) S.launches.unshift({n:"RK_UA_Urok3D_TT_20.11",pl:"TikTok",f:"f1",st:"draft",bud:20,spend:0,leads:0}); },
  stop(){ S.launches.forEach(l => { if (l.f === "f2" && l.st !== "draft") l.st = "paused"; }); S.funnels.find(f=>f.id==="f2").mode = "adv"; }
};
function asstHTML(){
  const A = S.asst; if (!A.open) return "";
  const sc = SC();
  const body = A.chat.map((m, i) => {
    const d = sc[m.sc];
    if (m.k === "me") return `<div class="msg msg--me"><small>${L("Ви · голосове","Вы · голосовое")}</small>«${d.q.slice(0, m.n)}${m.n < d.q.length ? "" : "»"}</div>`;
    if (m.k === "think") return `<div class="msg msg--bot"><small>${BRAND.name}</small><span class="dots">${L("Розбираю","Разбираю")}</span></div>`;
    if (m.k === "text") return `<div class="msg msg--bot"><small>${BRAND.name}</small>${d.text}${d.go?`<div class="row" style="margin-top:8px"><a class="btn btn--sm" href="#${d.go[0]}" data-act="asstGo">${d.go[1]}</a></div>`:""}</div>`;
    if (m.k === "card") return `<div class="msg msg--bot"><small>${BRAND.name}</small><div class="card"><span class="tag">${L("Я зрозумів так","Я понял так")}</span><dl class="kv">${d.rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>${m.done?"":`<div class="row"><button class="btn btn--solid btn--sm" data-act="asstOk" data-id="${i}">${d.ok}</button><button class="btn btn--sm" data-act="asstNo" data-id="${i}">${L("Змінити","Изменить")}</button></div>`}</div></div>`;
    if (m.k === "steps") return `<div class="msg msg--bot"><small>${BRAND.name}</small><ol class="steps">${d.steps.map((s,j)=>`<li class="${j<m.i?"ok":j===m.i?"on":""}">${s}</li>`).join("")}</ol></div>`;
    if (m.k === "done") return `<div class="msg msg--bot"><small>${BRAND.name}</small>${d.done}${d.go?`<div class="row" style="margin-top:8px"><a class="btn btn--sm" href="#${d.go[0]}" data-act="asstGo">${d.go[1]}</a></div>`:""}</div>`;
    return `<div class="msg msg--bot"><small>${BRAND.name}</small>${L("Добре, скажіть, що змінити.","Хорошо, скажите, что изменить.")}</div>`;
  }).join("");
  const rec = A.phase === "rec";
  return `<div class="asst__h"><div><span class="tag">${L("Голосове керування","Голосовое управление")}</span><h2>${BRAND.name}</h2></div><button class="x" data-act="asstClose" aria-label="${L("Закрити","Закрыть")}">×</button></div>
    <div class="asst__b" id="asst-b">${body || `<p class="sub">${L("Затисніть кнопку і скажіть, що зробити. Так само це працює в Telegram.","Зажмите кнопку и скажите, что сделать. Так же это работает в Telegram.")}</p>`}</div>
    <div class="asst__f">
      <span class="tag">${L("Спробуйте","Попробуйте")}</span>
      <div class="try">${ORDER.map(k=>`<button type="button" data-act="say" data-id="${k}" ${A.phase!=="idle"?"disabled":""}>${sc[k].chip}</button>`).join("")}</div>
      <button type="button" class="mic ${rec?"rec":""}" data-act="say" ${A.phase!=="idle"?"disabled":""}>${rec?`<span class="wave">${"<b></b>".repeat(9).replace(/<b>/g,(m,o)=>`<b style="animation-delay:${(o%7)*60}ms">`)}</span>${L("Слухаю","Слушаю")} <span id="rec-t">0:00</span>`:`<i></i>${L("Затиснути і сказати","Зажать и сказать")}`}</button>
    </div>`;
}
let timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function say(id){
  const A = S.asst; if (A.phase !== "idle") return;
  if (!id) { id = ORDER[A.next % ORDER.length]; }
  A.next = ORDER.indexOf(id) + 1; A.phase = "rec"; renderAsst();
  const t0 = Date.now(); const iv = setInterval(() => { const el = $("rec-t"); if (el) el.textContent = "0:0" + Math.min(9, Math.floor((Date.now()-t0)/1000)); }, 200); timers.push(iv);
  later(() => { clearInterval(iv); A.phase = "type"; const m = {k:"me",sc:id,n:0}; A.chat.push(m); const q = SC()[id].q;
    const ti = setInterval(() => { m.n = Math.min(q.length, m.n + 2); renderAsst(); if (m.n >= q.length) { clearInterval(ti);
      A.chat.push({k:"think",sc:id}); renderAsst();
      later(() => { A.chat.pop(); const d = SC()[id]; A.chat.push(d.rows ? {k:"card",sc:id} : {k:"text",sc:id}); A.phase = "idle"; renderAsst(); }, 900); } }, 24); timers.push(ti);
  }, 2400);
}
function asstOk(i){
  const m = S.asst.chat[i], d = SC()[m.sc]; m.done = true;
  const finish = () => { FX[m.sc] && FX[m.sc](); S.asst.chat.push({k:"done",sc:m.sc}); logAdd("bot", d.done); S.asst.phase = "idle"; render(); toast(L("Виконано і записано в журнал","Выполнено и записано в журнал")); };
  if (!d.steps) { finish(); return; }
  S.asst.phase = "work"; const sm = {k:"steps",sc:m.sc,i:0}; S.asst.chat.push(sm); renderAsst();
  const iv = setInterval(() => { sm.i++; renderAsst(); if (sm.i >= d.steps.length) { clearInterval(iv); later(finish, 350); } }, 750); timers.push(iv);
}

/* ---------- каркас и рендер ---------- */
const NAV = () => { const lt = S.tier === "lite"; return [
  [L("Агентство","Агентство"),[["projects",L("Усі проєкти","Все проекты")]]],
  [L("Проєкт","Проект"),[["today",L("Сьогодні","Сегодня")],["passport",L("Проєкт і цілі","Проект и цели")],["funnels",L("Воронки","Воронки")],["creatives",L("Креативи","Креативы")],["copy",L("Тексти","Тексты")]].concat(lt?[]:[["hyp",L("Гіпотези","Гипотезы")]])],
  [L("Реклама","Реклама"),[["launches",L("Запуски","Запуски")],["analytics",lt?L("Результати","Результаты"):L("Аналітика","Аналитика")]]],
  [L("Керування","Управление"),(lt?[]:[["rules",L("Правила й ролі","Правила и роли")]]).concat([["connections",L("Підключення","Подключения")]],lt?[]:[["journal",L("Журнал","Журнал")]])]]; };
const route = () => { const h = location.hash.replace("#",""); return V[h] && h !== "funnel" ? h : "today"; };
let lastRoute = null;
function renderShell(){
  const r = route(), pend = Object.values(S.inbox).filter(v=>v===null).length;
  $("rail").innerHTML = `<a class="logo" href="index.html">${brandLogo("rail")}</a>
    <button type="button" class="ws" data-act="goProjects"><small>${L("Проєкт","Проект")}</small><b>${L("Школа 3D","Школа 3D")}</b></button>
    ${NAV().map(g=>`<nav class="navg"><span>${g[0]}</span>${g[1].map(n=>`<a href="#${n[0]}" ${n[0]===r?'aria-current="page"':""}>${n[1]}${n[0]==="today"&&pend?`<b>${pend}</b>`:""}</a>`).join("")}</nav>`).join("")}
    <div class="rail__foot"><button type="button" data-act="theme">${L("Тема: світла / темна","Тема: светлая / тёмная")}</button><button type="button" data-act="reset">${L("Скинути демо","Сбросить демо")}</button><a href="index.html">← ${L("На сайт","На сайт")}</a></div>`;
  $("bar").innerHTML = `<span class="crumb">${L("Школа 3D","Школа 3D")}</span><span class="badge">${L("демо-дані","демо-данные")}</span><span class="range">06.11 – 19.11</span>
    <div class="bar__r"><div class="seg tier" role="group" aria-label="${L("Режим","Режим")}"><button type="button" data-act="tier" data-v="lite" aria-pressed="${S.tier==="lite"}">Lite</button><button type="button" data-act="tier" data-v="pro" aria-pressed="${S.tier==="pro"}">Pro</button></div><div class="lang" role="group" aria-label="${L("Мова","Язык")}"><button type="button" data-lang="uk" aria-pressed="${lang==="uk"}">UA</button><button type="button" data-lang="ru" aria-pressed="${lang==="ru"}">RU</button></div>
    <button type="button" class="stop" data-act="stop" aria-pressed="${S.frozen}">${S.frozen?L("АВТОДІЇ ЗУПИНЕНО","АВТОДЕЙСТВИЯ ОСТАНОВЛЕНЫ"):L("СТОП","СТОП")}</button></div>`;
  const fz = $("frozen"); fz.hidden = !S.frozen; fz.textContent = L("Усі автодії по проєкту заморожено. Кампанії крутяться як є, бот нічого не змінює й не вмикає, доки ви не знімете стоп.","Все автодействия по проекту заморожены. Кампании крутятся как есть, бот ничего не меняет и не включает, пока вы не снимете стоп.");
  $("fab").innerHTML = `<i></i>${L("Сказати боту","Сказать боту")}`; $("fab").hidden = S.asst.open;
  document.documentElement.lang = lang;
}
function renderView(){ const r = route(), v = $("view"); v.innerHTML = V[r](); if (r !== lastRoute) { v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); lastRoute = r; window.scrollTo(0,0); } }
const enter = el => { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); };
let ovKind = null, asstWas = false;
function renderOverlay(){
  const o = overlay(), kind = o ? o[0] : null, sh = $("shade"), dr = $("drawer"), mo = $("modal");
  sh.hidden = !o; dr.hidden = kind !== "drawer"; mo.hidden = kind !== "modal";
  if (kind === "drawer") { const y = dr.scrollTop; dr.innerHTML = o[1]; dr.scrollTop = ovKind === "drawer" ? y : 0; } else dr.innerHTML = "";
  mo.innerHTML = kind === "modal" ? o[1] : "";
  if (kind && kind !== ovKind) { enter(sh); enter(kind === "drawer" ? dr : mo); }
  ovKind = kind;
}
function renderAsst(){
  const el = $("asst"), open = S.asst.open; el.hidden = !open;
  if (open) { el.innerHTML = asstHTML(); const b = $("asst-b"); if (b) b.scrollTop = b.scrollHeight; if (!asstWas) enter(el); } else el.innerHTML = "";
  asstWas = open; $("fab").hidden = open;
}
function render(){ renderShell(); renderView(); renderOverlay(); renderAsst(); }
let toastTimer;
function toast(text){ const el = $("toast"); el.textContent = text; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600); }
const okT = () => L("Виконано і записано в журнал","Выполнено и записано в журнал");

/* ---------- действия ---------- */
const ACT = {
  inbox(d){ const yes = d.v === "1"; S.inbox[d.id] = yes;
    if (yes && d.id === "a1") { logAdd("you", L("Бюджет сім’ї treds −50%, перерозподіл у priglos і viktor.","Бюджет семьи treds −50%, перераспределение в priglos и viktor.")); toast(okT()); }
    else if (yes && d.id === "a3") { const h = S.hyp.find(x=>x.id==="hA"); if (h) h.col = 2; toast(L("Гіпотезу взято в тест","Гипотеза взята в тест")); }
    else if (yes) toast(L("Нагадування надіслано в Telegram","Напоминание отправлено в Telegram"));
    else toast(L("Пропозицію відхилено","Предложение отклонено")); },
  proj(d){ if (d.id === "school3d") location.hash = "today"; else toast(L("У демо відкритий один проєкт — «Школа 3D»","В демо открыт один проект — «Школа 3D»")); },
  goProjects(){ location.hash = "projects"; },
  modal(d){ S.modal = d.id; S.wiz = 0; S.asst.open = false; },
  wiz(d){ S.wiz = Math.max(0, Math.min(2, S.wiz + (+d.v))); },
  createProject(){ S.projects.push(["new",L("Школа англійської","Школа английского"),L("онлайн-освіта","онлайн-образование"),L("чекає на підключення","ждёт подключения"),0,"—",0]); S.modal = null; logAdd("you", L("Створено проєкт «Школа англійської». Інтегратор отримав запит на підключення кабінетів.","Создан проект «Школа английского». Интегратор получил запрос на подключение кабинетов.")); toast(L("Проєкт створено, запит інтегратору надіслано","Проект создан, запрос интегратору отправлен")); },
  createFunnel(){ const name = $("nf-name").value.trim() || L("Нова воронка","Новая воронка"), goal = $("nf-goal").value, url = $("nf-url").value.trim();
    const id = "n" + Date.now(); S.funnels.push({id,name,goal,cap:4,limit:60,mode:"btn",spend:0,leads:0,pay:0,landing:url}); S.modal = null; S.funnel = id;
    logAdd("you", L("Створено воронку «","Создана воронка «") + name + L("», режим «за кнопкою».","», режим «по кнопке».")); location.hash = "funnels"; toast(L("Воронку створено","Воронка создана")); },
  openFunnel(d){ S.funnel = d.id; window.scrollTo(0,0); },
  closeFunnel(){ S.funnel = null; },
  mode(d){ S.funnels.find(f=>f.id===d.id).mode = d.v; toast(L("Режим змінено","Режим изменён")); },
  openCr(d){ S.asst.open = false; S.cr = d.id; S.playhead = S.fam.find(f=>f.id===d.id).drop; S.trim = null; },
  seek(d){ S.playhead = +d.id; },
  closeOverlay(){ S.cr = null; S.launch = null; S.modal = null; S.trim = null; },
  trim(){ const f = S.fam.find(x=>x.id===S.cr); S.trim = {i:0};
    const iv = setInterval(() => { S.trim.i++; if (S.trim.i >= 4) { clearInterval(iv);
        const bound = PHR.reduce((b,p)=>Math.abs(p-f.drop)<Math.abs(b-f.drop)?p:b, PHR[0]);
        f.prev = curve(f); f.cut = bound; f.v += 1; f.dur -= bound; f.drop = Math.min(f.dur - 6, f.drop + 7); f.k = Math.min(.92, f.k + .16); f.st = "live"; S.playhead = 0; S.trim = null;
        logAdd("you", L("Створено версію ","Создана версия ") + f.id + "_v" + f.v + L(": обрізано вступ по межі фрази, оголошення зібране вимкненим.",": обрезано вступление по границе фразы, объявление собрано выключенным."));
        toast(L("Нова версія створена","Новая версия создана")); }
      renderOverlay(); if (!S.trim) renderView(); }, 800); timers.push(iv); },
  toTikTok(d){ const n = "RK_UA_" + d.id + "_TT_20.11"; if (!S.launches.some(l=>l.n===n)) S.launches.unshift({n,pl:"TikTok",f:"f1",st:"draft",bud:20,spend:0,leads:0});
    logAdd("you", L("Зібрано чернетку в TikTok для ","Собран черновик в TikTok для ") + d.id + "."); S.cr = null; location.hash = "launches"; toast(L("Чернетку для TikTok зібрано вимкненою","Черновик для TikTok собран выключенным")); },
  upload(){ if (S.upload) return; S.upload = {files:[{n:"render_uchenytsi_v1.mp4",p:0},{n:"rozklad_vechory_v1.mp4",p:0},{n:"hook_dohid_v2.mp4",p:0,bad:1}]};
    const iv = setInterval(() => { let all = true; S.upload.files.forEach((f,i) => { if (f.p < 100) { f.p = Math.min(100, f.p + 9 + i * 4); all = false; } });
      if (all) { clearInterval(iv); S.fam.unshift({id:"render_uchenytsi",h:188,v:1,dur:22,drop:6,k:.86,spend:0,leads:0,pay:0,st:"live",ctr:"—",fq:"—",f:"f1"},{id:"rozklad_vechory",h:92,v:1,dur:19,drop:5,k:.82,spend:0,leads:0,pay:0,st:"live",ctr:"—",fq:"—",f:"f1"});
        logAdd("bot", L("Додано 2 ролики. hook_dohid_v2 не прийнято: заборонене формулювання на 0:03.","Добавлено 2 ролика. hook_dohid_v2 не принят: запрещённая формулировка на 0:03.")); toast(L("2 ролики додано, 1 не пройшов перевірку","2 ролика добавлено, 1 не прошёл проверку")); }
      renderView(); }, 260); timers.push(iv); },
  copySel(d){ S.copySel = d.id; },
  rewrite(){ const C = COPY().B, total = C.head.length + C.text.length; S.rewrite = {n:0,done:false};
    const iv = setInterval(() => { S.rewrite.n = Math.min(total, S.rewrite.n + 4); if (S.rewrite.n >= total) { S.rewrite.done = true; clearInterval(iv); } renderView(); }, 30); timers.push(iv); },
  take(d){ S.hyp.find(h=>h.id===d.id).col = 2; toast(L("Гіпотезу взято в тест","Гипотеза взята в тест")); },
  objections(){ S.objections = true; S.hyp.unshift({id:"hI",col:1,src:"sales"},{id:"hJ",col:1,src:"sales"}); toast(L("Додано 2 гіпотези з продажів","Добавлены 2 гипотезы из продаж")); },
  openLaunch(d){ S.asst.open = false; S.launch = d.id; },
  enable(d){ const l = S.launches.find(x=>x.n===d.id); l.st = "learn"; logAdd("you", L("Увімкнено кампанію ","Включена кампания ") + l.n + "."); toast(L("Кампанію увімкнено","Кампания включена")); },
  rule(d){ S.rules[+d.id] = S.rules[+d.id] ? 0 : 1; },
  connect(){ S.conn.crm = 1; toast(L("Запит інтегратору надіслано","Запрос интегратору отправлен")); },
  stop(){ S.frozen = !S.frozen; if (S.frozen) S.funnels.forEach(f => { if (f.mode === "auto") f.mode = "btn"; }); toast(S.frozen ? L("Автодії заморожено","Автодействия заморожены") : L("Автодії знову активні","Автодействия снова активны")); },
  theme(){ const el = document.documentElement, dark = el.dataset.theme ? el.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; el.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem("rakurs_theme", el.dataset.theme); } catch (e) {} },
  reset(){ timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; S = fresh(); toast(L("Демо скинуто до початкового стану","Демо сброшено к начальному состоянию")); },
  say(d){ say(d.id); return false; },
  asstOk(d){ asstOk(+d.id); return false; },
  asstNo(d){ S.asst.chat[+d.id].done = true; S.asst.chat.push({k:"edit"}); renderAsst(); return false; },
  asstClose(){ S.asst.open = false; },
  asstGo(){ S.asst.open = false; }
};
/* Подсказка в значке «?»: пояснения не занимают место на экране, открываются наведением или нажатием. */
const hint = t => `<span class="hint"><button type="button" class="hint__b" aria-label="${L("Підказка","Подсказка")}" aria-expanded="false">?</button><span class="hint__t" role="tooltip">${t}</span></span>`;
/* иконки вместо слов там, где знак понятен всем */
const ICO = {
  collapse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  eye:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>',
  expand:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'};
const icoBtn = (ico, label, attrs) => `<button type="button" class="btn btn--sm btn--ico" aria-label="${label}" title="${label}" ${attrs}>${ICO[ico]}</button>`;
document.addEventListener("click", e => {
  const hb = e.target.closest(".hint__b"); document.querySelectorAll(".hint.on").forEach(h => { if (!hb || h !== hb.parentNode) { h.classList.remove("on"); h.firstChild.setAttribute("aria-expanded", "false"); } });
  if (hb) { const on = hb.parentNode.classList.toggle("on"); hb.setAttribute("aria-expanded", String(on)); return; }
  const lb = e.target.closest(".lang button");
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem("rakurs_lang", lang); } catch (x) {} render(); return; }
  if (e.target.closest("#fab")) { S.asst.open = true; renderAsst(); return; }
  const el = e.target.closest("[data-act]"); if (!el) return;
  const r = ACT[el.dataset.act](el.dataset); if (r !== false) render();
});
document.addEventListener("input", e => { if (e.target.id === "share") { S.share = +e.target.value; $("shv").textContent = S.share; $("capv").textContent = "$" + dec(0.06 * 0.56 * CHECK * S.share / 100); } });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (S.cr || S.launch || S.modal) { ACT.closeOverlay(); render(); } else if (S.asst.open) { S.asst.open = false; renderAsst(); } }
  if (e.key === "Enter" && e.target.matches("tr[data-act]")) { ACT[e.target.dataset.act](e.target.dataset); render(); }
});
window.addEventListener("hashchange", () => { if (route() !== "funnels") S.funnel = null; render(); });
/* первый render() вызывается в конце setup.js */
