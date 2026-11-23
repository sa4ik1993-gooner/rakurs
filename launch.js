/* Запуск кампании в Meta из воронки. Обычный код, без ИИ.
   Человек даёт три вещи: креативы (ссылки на Google Диск или файлы), текст (платформа предлагает варианты) и бюджет.
   Остальное платформа подставляет сама — из прошлого запуска, последней группы аккаунта, проекта — и показывает сводкой;
   «Изменить настройки» открывает все поля. Всё создаётся выключенным (PAUSED) со стартом на следующий день в 00:40 по Киеву;
   включает человек. Номера созданного хранятся в BD.run: если шаг упал, «Продолжить» начинает с него. */
const BD = {open:null, form:null, run:null, busy:false, err:"", step:"", files:{}, adv:false, px:{}, pxLast:{}, tx:{}, dr:{state:"", notes:[]}};
const BD_EVENTS = () => [["lead",L("Лід (Lead) — заявка на сайті","Лид (Lead) — заявка на сайте")],["reg",L("Реєстрація (CompleteRegistration)","Регистрация (CompleteRegistration)")],["sub",L("Підписка на сайті (Subscribe) — реєстрація на вебінар","Подписка на сайте (Subscribe) — регистрация на вебинар")],["buy",L("Покупка (Purchase)","Покупка (Purchase)")],["lpv",L("Перегляди сторінки — без пікселя","Просмотры страницы — без пикселя")]];
const BD_CTA = [["LEARN_MORE","Learn more"],["SIGN_UP","Sign up"],["REGISTER_NOW","Register now"],["APPLY_NOW","Apply now"],["GET_OFFER","Get offer"],["SUBSCRIBE","Subscribe"],["CONTACT_US","Contact us"],["SHOP_NOW","Shop now"],["WATCH_MORE","Watch more"]];
const bdLatin = s => String(s || "").split("").map(c => { const l = c.toLowerCase(); return TRL[l] !== undefined ? (c === l ? TRL[l] : TRL[l].charAt(0).toUpperCase() + TRL[l].slice(1)) : c; }).join("").replace(/[^A-Za-z0-9_.\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 120);
/* Завтра 00:40 по Киеву → момент времени. Смещение Киева берём из часов браузера, поэтому летнее время учтено само. */
function bdKyivOffset(ms){ const p = {}; new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Kyiv", hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"}).formatToParts(new Date(ms)).forEach(x => p[x.type] = x.value);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000; }
const bdKyivToUtc = (date, time) => { const [y, m, d] = date.split("-").map(Number), [hh, mm] = time.split(":").map(Number), guess = Date.UTC(y, m - 1, d, hh, mm); return guess - bdKyivOffset(guess - bdKyivOffset(guess)); };
function bdTomorrow(){ const p = {}; new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Kyiv", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date(Date.now() + 86400000)).forEach(x => p[x.type] = x.value); return `${p.year}-${p.month}-${p.day}`; }
const bdUrl = u => { u = String(u || "").trim(); return !u ? "" : /^https?:\/\//i.test(u) ? u : "https://" + u; };
const bdConn = p => p && p.meta && p.meta.conn;
const bdAccs = c => c && c.accounts && c.accounts.length ? c.accounts : c && c.account ? [c.account] : [];
const bdPages = c => c && c.pages && c.pages.length ? c.pages : c && c.page ? [c.page] : [];
const bdCanWrite = c => !c || !c.scopes || !c.scopes.length || c.scopes.includes("ads_management");
/* Страна проекта, только если она точно распознана: «Весь світ» не должен превратиться в код VE (Венесуэла). */
const bdGeo1 = s => { const hit = geoFind(s), c = hit ? hit[0] : GEO[slug(s)]; return c && /^[A-Z]{2}$/.test(c) && c !== "EU" && c !== "WW" ? c : ""; };
const bdGeo = g => [...new Set(String(g || "").split(/[,;\/]/).map(bdGeo1).filter(Boolean))].join(", ");
function bdName(f, p, date){ const dm = date ? date.slice(8, 10) + "." + date.slice(5, 7) : ""; return bdLatin([slug(p.name), bdGeo(p.geo).split(", ")[0], slug(f.name), f.goal === "form" ? "Form" : "Site", dm, "ABO"].filter(Boolean).join("_")); }
const bdAdset = F0 => F0.adset || bdLatin(F0.countries.replace(/[^A-Za-z]+/g, "-") + "_" + (F0.advantage ? "AdvPlus" : F0.age_min + "-" + F0.age_max + (F0.gender ? "_" + F0.gender.toUpperCase() : "")));
const bdAdsLink = (acc, id) => `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(acc)}&selected_campaign_ids=${encodeURIComponent(id)}`;
const bdB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
async function bdStep(body, label){ BD.step = label; render(); const r = await mtCall(Object.assign({project_id:P().id, account_id:BD.form.account, page_id:BD.form.page, pixel_id:BD.form.pixel}, body)); if (!r.ok) throw r; return r; }
const bdWait = ms => new Promise(ok => setTimeout(ok, ms));

/* Пиксели выбранного аккаунта и настройки его последней группы: у каждого аккаунта свои, читаются с сервера при выборе. */
function bdPixels(p, c){ const F0 = BD.form, id = F0.account; if (BD.px[id]) return; BD.px[id] = "load";
  mtCall({action:"b_pixels", project_id:p.id, account_id:id}).then(r => { const main = c.account && c.account.id === id;
    BD.px[id] = r.ok ? r.pixels : r.error === "action" ? (main && c.pixel ? [c.pixel] : []) : {err:mtErr(r)};
    BD.pxLast[id] = r.ok && r.last ? r.last : null;
    if (BD.form === F0 && F0.account === id && Array.isArray(BD.px[id])) { const has = x => x && BD.px[id].some(y => y.id === x), last = BD.pxLast[id];
      if (!F0.pixelSet || !has(F0.pixel)) F0.pixel = last && has(last.id) ? last.id : main && c.pixel && has(c.pixel.id) ? c.pixel.id : (BD.px[id][0] || {}).id || "";
      const ev = last && F0.pixel === last.id ? {LEAD:"lead", COMPLETE_REGISTRATION:"reg", SUBSCRIBE:"sub", PURCHASE:"buy"}[last.event] : ""; if (ev && !F0.eventSet) F0.event = ev; }
    render(); }); }

/* ---------- на кого показываем: готовые варианты вместо ручной настройки ---------- */
const BD_EUROPE = "DE, AT, FR, ES, IT, NL, BE, CH, PT, IE, SE, FI, DK, NO, PL, CZ, SK, HU, RO, BG, GR, LT, LV, EE";
const bdAudText = s => [s.countries, String(s.lang) === "52" ? L("українська мова","украинский язык") : "", s.advantage ? L("Advantage+ (Meta шукає сама)","Advantage+ (Meta ищет сама)") : (s.age_min || 18) + "–" + (s.age_max || 65) + (s.gender === "f" ? L(", жінки",", женщины") : s.gender === "m" ? L(", чоловіки",", мужчины") : "")].filter(Boolean).join(" · ");
const bdAudKey = s => [String(s.countries || "").toUpperCase().split(/[^A-Z]+/).filter(Boolean).sort().join(","), s.lang || "", s.advantage ? "a" : (s.age_min || 18) + "-" + (s.age_max || 65) + (s.gender || "")].join("|");
function bdAuds(f, p){ const a = [], seen = {}, F0 = BD.form, acc = ((BD.pxLast[F0.account] || {}).set) || null, g = bdGeo(p.geo);
  const mk = (k, label, s) => { const key = bdAudKey(s); if (!s.countries || seen[key]) return; seen[key] = 1; a.push({k, label, s}); };
  if (f.launch) mk("last", L("Як у минулому запуску воронки","Как в прошлом запуске воронки"), f.launch);
  if (p.launch) mk("plast", L("Як у минулому запуску проєкту","Как в прошлом запуске проекта"), p.launch);
  if (acc && acc.countries && acc.countries.length) mk("acc", L("Як в останній групі акаунта","Как в последней группе аккаунта"), {countries:acc.countries.join(", "), lang:(acc.locales || []).includes(52) ? "52" : "", advantage:!!acc.advantage, age_min:acc.age_min || 18, age_max:acc.age_max || 65, gender:acc.gender || ""});
  if (g) mk("geo", L("Гео проєкту","Гео проекта"), {countries:g, lang:"", advantage:true});
  mk("ua", L("Україна","Украина"), {countries:"UA", lang:"", advantage:true});
  mk("uaeu", L("Україномовні в Європі","Украиноязычные в Европе"), {countries:BD_EUROPE, lang:"52", advantage:false, age_min:18, age_max:65, gender:""});
  return a; }
function bdAudSet(v){ const F0 = BD.form, s = v.s; F0.countries = s.countries; F0.lang = String(s.lang || ""); F0.advantage = !!s.advantage; F0.age_min = s.age_min || 18; F0.age_max = s.age_max || 65; F0.gender = s.gender || ""; F0.aud = v.k; }

/* ---------- тексты: варианты из прошлых объявлений аккаунта и с лендинга ---------- */
const bdBase = n => String(n || "").replace(/\.[A-Za-z0-9]{2,4}$/, "");
const bdTok = n => bdLatin(bdBase(n)).toLowerCase();
const bdIsS = n => /(^|_)s(_|$)/.test(bdTok(n));                                   /* «_s_» в названии — вертикальная версия для сторис */
const bdPairKey = n => bdTok(n).replace(/(^|_)s(?=_|$)/, "").replace(/^_/, "");    /* по нему находим пару «лента + сторис» */
const bdFam = n => bdPairKey(n).replace(/_v\d*$/, "");                             /* ролик без номера версии — по нему подбираем текст */
const bdM = (n, cur) => (cur === "USD" || !cur ? "$" : "") + dec(n, n >= 100 || Number.isInteger(n) ? 0 : 2) + (cur && cur !== "USD" ? " " + cur : "");
function bdTexts(p){ const F0 = BD.form, link = bdUrl(F0.link), key = F0.account + "|" + link; if (BD.tx.key === key) return;
  const tx = BD.tx = {key, past:null, land:null, old:false};
  const done = () => { if (BD.tx !== tx || BD.form !== F0) return; bdTextAuto(); render(); };
  mtCall({action:"b_texts", project_id:p.id, account_id:F0.account, link}).then(r => { tx.past = r.ok ? r.texts || [] : []; if (r.error === "action") tx.old = true; done(); });
  if (/^https:\/\/[^\s.]+\.[^\s]+/.test(link)) mtCall({action:"b_landing", project_id:p.id, account_id:F0.account, url:link}).then(r => { tx.land = r.ok ? r : false; done(); }); else tx.land = false; }
/* Заготовка текста из того, что написано на лендинге: первый абзац, до четырёх пунктов, призыв. Человек правит её под себя. */
function bdDraft(l){ if (!l) return null; const heads = l.heads || [], bl = (l.bullets || []).filter(x => x.length <= 120).slice(0, 4), lead = (l.paras || [])[0] || l.desc || "", head = heads[0] || l.title || "";
  if (!lead && !bl.length) return null;
  const cta = (l.cta || []).slice().sort((x, y) => y.length - x.length)[0] || {uk:"Реєструйтеся за посиланням", ru:"Регистрируйтесь по ссылке", en:"Sign up via the link"}[l.lang] || "";
  return {body:[lead || head, bl.map(x => "✔️ " + x).join("\n"), cta ? "👉 " + cta : ""].filter(Boolean).join("\n\n"), title:head.length <= 90 ? head : ""}; }
function bdVariants(f){ const v = [], tx = BD.tx, cur = ((bdAccs(bdConn(P())).find(a => a.id === BD.form.account)) || {}).currency || "USD", past = tx.past || [];
  const pv = (t, i) => ({k:"p" + i, label:(t.same ? L("Вже вели на цей лендинг","Уже вели на этот лендинг") : L("З оголошень акаунта","Из объявлений аккаунта")) + (t.res ? " · " + t.res + L(" рез. по "," рез. по ") + bdM(t.spend / t.res, cur) : t.spend ? " · " + L("витрачено ","потрачено ") + bdM(t.spend, cur) : ""), body:t.body, title:t.title || ""});
  if ((f.launch || {}).text) v.push({k:"last", label:L("Минулий запуск воронки","Прошлый запуск воронки"), body:f.launch.text, title:f.launch.headline || ""});
  bdTx(f).own.forEach(o => v.push({k:o.k, label:L("Ваш текст","Ваш текст"), body:o.body, title:o.title || "", own:true}));
  past.forEach((t, i) => { if (t.same && v.length < 4) v.push(pv(t, i)); });
  const d = bdDraft(tx.land); if (d) v.push({k:"land", label:L("Чернетка з лендингу","Черновик с лендинга"), body:d.body, title:d.title});
  past.forEach((t, i) => { if (!t.same && v.length < 6) v.push(pv(t, i)); });
  [...new Set(f.crs.map(c => (c.text || "").trim()).filter(Boolean))].slice(0, 2).forEach((t, i) => v.push({k:"c" + i, label:L("З креативів воронки","Из креативов воронки"), body:t, title:""}));
  const seen = {}, del = bdTx(f).del; return v.filter(x => { const b = x.body.trim(); if (!b || seen[b] || (!x.own && del.includes(bdTK(b)))) return false; seen[b] = 1; return true; }); }
/* Свои тексты и скрытые варианты хранятся в воронке: платформа предлагает сама, человек проверяет, правит, убирает лишнее. */
const bdTK = b => String(b || "").replace(/\s+/g, " ").trim().slice(0, 200);
function bdTx(f){ const t = f.bdtx = f.bdtx || {}; t.own = t.own || []; t.del = t.del || []; return t; }

function bdVarSet(v){ const F0 = BD.form; F0.text = v.body; F0.vark = v.k; if (v.title && !F0.headSet) F0.headline = v.title; }
function bdHeads(){ const tx = BD.tx, a = []; (tx.past || []).forEach(t => { if (t.title) a.push(t.title); }); ((tx.land || {}).heads || []).slice(0, 1).forEach(h => { if (h.length <= 90) a.push(h); }); return [...new Set(a)].slice(0, 5); }
/* Тексты подставляются сами: общий — первый вариант; отдельному ролику — текст прошлого объявления с тем же роликом. */
function bdAdTexts(){ const F0 = BD.form, past = BD.tx.past || []; if (!F0) return;
  F0.ads.forEach(a => { if (a.own || a.noauto) return; const fam = bdFam(a.name), t = fam ? past.find(x => (x.names || []).some(n => bdFam(n) === fam)) : null; a.text = t ? t.body : ""; a.auto = t ? ((t.names || []).find(n => bdFam(n) === fam) || "") : ""; }); }
function bdTextAuto(){ const F0 = BD.form, f = F(); if (!F0 || !f) return; const vs = bdVariants(f);
  if (!F0.textSet && (!F0.text.trim() || (F0.vark && F0.vark !== "last")) && vs.length) bdVarSet(vs[0]);
  bdAdTexts(); }
const bdAdText = (a, F0) => (a.text || "").trim() || (F0.text || "").trim();

/* ---------- креативы: ссылки на Google Диск или файлы с компьютера; «лента + сторис» собираются в одно объявление ---------- */
function bdAddMedia(items){ const F0 = BD.form; let n = 0;
  items.forEach(m => { if (F0.ads.some(a => (a.src && a.src.key === m.key) || (a.story && a.story.key === m.key))) return;
    const video = m.kind === "video", vert = m.w && m.h ? m.h / m.w > 1.4 : null, story = video && (vert === null ? bdIsS(m.name) : vert), pk = bdPairKey(m.name);
    const src = {t:m.t, id:m.id || "", fname:m.name, key:m.key, size:m.size || 0};
    let a = video ? F0.ads.find(x => x.type === "video" && x.pk === pk && !x.story && (story ? !x.solo : x.solo)) : null;
    if (a && story) { a.story = src; if (m.file) BD.files[a.id + ":s"] = m.file; }
    else if (a) { a.story = a.src; a.src = src; a.solo = false; a.name = bdLatin(bdBase(m.name)); if (BD.files[a.id]) { BD.files[a.id + ":s"] = BD.files[a.id]; delete BD.files[a.id]; } if (m.file) BD.files[a.id] = m.file; }
    else { a = {id:"n" + uid(), on:true, name:bdLatin(bdBase(m.name)), pk, type:video ? "video" : "img", text:"", auto:"", own:false, src, story:null, solo:story, custom:true}; F0.ads.push(a); if (m.file) BD.files[a.id] = m.file; }
    n++; });
  if (n) bdAdTexts();
  return n; }
/* Размер кадра видео с компьютера: по нему видно, вертикальный ролик или нет, даже если в названии нет «_s_». */
const bdDims = file => new Promise(ok => { if ((file.type || "").indexOf("video") !== 0) return ok({w:0, h:0});
  const v = document.createElement("video"), url = URL.createObjectURL(file), end = r => { URL.revokeObjectURL(url); ok(r); };
  v.preload = "metadata"; v.muted = true; v.onloadedmetadata = () => end({w:v.videoWidth || 0, h:v.videoHeight || 0}); v.onerror = () => end({w:0, h:0}); setTimeout(() => end({w:0, h:0}), 4000); v.src = url; });
async function bdDrive(){ const F0 = BD.form, p = P(), f = F(); if (!F0 || !p || BD.dr.state === "load") return;
  const links = String(F0.links || "").split(/\s+/).filter(Boolean); if (!links.length) { BD.dr = {state:"err", notes:[{error:"none"}]}; return render(); }
  BD.dr = {state:"load", notes:[]}; render();
  const r = await mtCall({action:"b_drive", project_id:p.id, account_id:F0.account, links});
  if (BD.form !== F0) return;
  if (!r.ok) { BD.dr = {state:"err", notes:[{error:r.error === "action" ? "old" : "drive", detail:r.error === "action" ? "" : mtErr(r)}]}; return render(); }
  const n = bdAddMedia((r.files || []).map(x => ({t:"drive", id:x.id, name:x.name, kind:x.kind, w:x.w, h:x.h, size:x.size, key:"d:" + x.id})));
  BD.dr = {state:"ok", notes:r.notes || [], found:(r.files || []).length, added:n}; if (f) { f.links = F0.links; save(); } render(); }
const bdDrNote = n => ({none:L("Вставте посилання на файл або папку Google Диска.","Вставьте ссылку на файл или папку Google Диска."),
  old:L("Сервер ще старої версії: оновіть функцію meta — тоді запрацюють посилання на Диск і підказки тексту.","Сервер ещё старой версии: обновите функцию meta — тогда заработают ссылки на Диск и подсказки текста."),
  need_key:L("Це папка. Щоб платформа бачила файли в папках, власник один раз додає на сервер безкоштовний ключ Google. Поки що вставте посилання на самі файли.","Это папка. Чтобы платформа видела файлы в папках, собственник один раз добавляет на сервер бесплатный ключ Google. Пока вставьте ссылки на сами файлы."),
  closed:L("Файл закритий. Відкрийте доступ «Усі, хто має посилання».","Файл закрыт. Откройте доступ «Все, у кого есть ссылка»."),
  not_drive:L("Не схоже на посилання Google Диска.","Не похоже на ссылку Google Диска."),
  empty:L("У папці немає відео й картинок.","В папке нет видео и картинок.")}[n.error] || n.detail || n.error);
/* ---------- форма ---------- */
function bdInit(f, p){ const date = bdTomorrow(), c = bdConn(p), last = f.launch || p.launch || {}, accs = bdAccs(c), pages = bdPages(c), daily = Math.round(fT(f, p).bud / 30), u = utmLvl(p, f);
  BD.px = {}; BD.pxLast = {}; BD.tx = {}; BD.dr = {state:"", notes:[]}; BD.adv = false; BD.run = null; BD.err = ""; BD.step = ""; BD.files = {};
  BD.form = {account:accs.some(a => a.id === last.account) ? last.account : (accs[0] || {}).id || "", page:pages.some(a => a.id === last.page) ? last.page : (pages[0] || {}).id || "",
    pixel:last.pixel || (c && c.pixel ? c.pixel.id : ""), pixelSet:!!last.pixel, event:last.event || "lead", eventSet:!!last.event,
    name:bdName(f, p, date), budget:last.budget || (daily >= 5 ? daily : 20), link:bdUrl((f.lands[0] || {}).url), utm:u.v,
    countries:"UA", lang:"", advantage:true, age_min:18, age_max:65, gender:"", aud:"",
    adset:"", goal:"", chg:[], date, time:"00:40", text:(f.launch || {}).text || "", vark:(f.launch || {}).text ? "last" : "", textSet:false, headline:(f.launch || {}).headline || "", headSet:false, description:"", cta:last.cta || "LEARN_MORE", links:f.links || "",
    ads:f.crs.filter(x => x.path).map(x => ({id:x.id, on:true, name:bdLatin(x.slug || x.name), pk:bdPairKey(x.name || x.slug), type:x.type === "img" ? "img" : "video", text:x.text || "", auto:"", own:!!(x.text || "").trim(), src:{t:"store", path:x.path, fname:x.name || "", key:"s:" + x.path}, story:null, solo:false}))};
  const a = bdAuds(f, p)[0]; if (a) bdAudSet(a);
  bdTexts(p); }
function bdCheck(F0, c){ const e = [], on = F0.ads.filter(a => a.on);
  if (!on.length) e.push(L("креативи — вставте посилання або оберіть файли","креативы — вставьте ссылки или выберите файлы"));
  on.forEach(a => { if (a.src.t === "file" && !BD.files[a.id]) e.push(L("файл для ","файл для ") + (a.name || "—")); });
  if (on.some(a => !bdAdText(a, F0))) e.push(L("текст оголошення","текст объявления"));
  const T = BD.tgt ? BD.tgt.mode : "";
  if (T !== "ad" && !(+String(F0.budget).replace(",", ".") >= 1)) e.push(L("бюджет на день","бюджет в день"));
  if (!T && !bdLatin(F0.name)) e.push(L("назва кампанії","название кампании"));
  if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(bdUrl(F0.link))) e.push(L("посилання на лендинг","ссылка на лендинг"));
  if (!utmOk(F0.utm)) e.push(L("мітки UTM (вигляд: utm_source=…&utm_campaign=…)","метки UTM (вид: utm_source=…&utm_campaign=…)"));
  if (T !== "ad" && !F0.countries.split(/[,\s]+/).some(x => /^[A-Za-z]{2}$/.test(x))) e.push(L("країни (коди з двох літер: UA, PL)","страны (коды из двух букв: UA, PL)"));
  if (T !== "ad" && bdKyivToUtc(F0.date, F0.time) < Date.now() + 10 * 60000) e.push(L("старт — щонайменше за 10 хвилин від зараз","старт — минимум через 10 минут от сейчас"));
  if (c && !F0.page) e.push(L("сторінка (позначте її в підключенні Meta)","страница (отметьте её в подключении Meta)"));
  if (T !== "ad" && c && F0.event !== "lpv" && !F0.pixel && BD.px[F0.account] !== "load") e.push(L("піксель цього акаунта (або ціль «Перегляди сторінки»)","пиксель этого аккаунта (или цель «Просмотры страницы»)"));
  return e; }

function bdPanel(f, p){
  const c = bdConn(p), list = (f.builds || []).slice(0, 5);
  const hist = list.length ? `<div class="tw tw--in"><table><thead><tr><th>${L("Зібрано","Собрано")}</th><th>${L("Кампанія","Кампания")}</th><th class="n">${L("Оголошень","Объявлений")}</th><th></th></tr></thead><tbody>${list.map(b => `<tr><td class="mono">${esc(b.at.slice(0, 16).replace("T", " "))}</td><td class="mono">${esc(b.name)}${b.account_name ? `<small class="pl sub">${esc(b.account_name)}</small>` : ""}${b.note ? `<small class="pl sub">${esc(b.note)}</small>` : ""}</td><td class="n mono">${b.ads.length}</td><td class="n">${c || b.account ? `<a class="lnk" href="${bdAdsLink(b.account || c.account.id, b.campaign_id)}" target="_blank" rel="noopener">Ads Manager ↗</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : "";
  let body;
  if (!CLOUD) body = `<p class="sub proto">${L("Прототип: запуск працює після входу на сервер і підключення Meta.","Прототип: запуск работает после входа на сервер и подключения Meta.")}</p>`;
  else if (!c) body = `<p class="sub">${L("Спершу підключіть рекламний кабінет Meta в проєкті.","Сначала подключите рекламный кабинет Meta в проекте.")}</p><div class="row"><button class="btn btn--sm" data-act="wsBackF">${L("До проєкту","К проекту")}</button></div>`;
  else if (!bdCanWrite(c)) body = `<p class="mterr">${L("Ключ підключення має тільки право на читання. Щоб збирати кампанії, згенеруйте ключ у системного користувача з правами ads_read і ads_management та замініть його в «Підключеннях» проєкту.","У ключа подключения только право на чтение. Чтобы собирать кампании, сгенерируйте ключ у системного пользователя с правами ads_read и ads_management и замените его в «Подключениях» проекта.")}</p>`;
  else if (BD.open !== f.id) body = `<p class="sub">${L("Дайте креативи й бюджет — решту платформа підставить сама й покаже перед збиранням.","Дайте креативы и бюджет — остальное платформа подставит сама и покажет перед сборкой.")}</p><div class="row"><button class="btn btn--solid" data-act="bdOpen" data-id="${f.id}">${L("Запустити в Meta","Запустить в Meta")}</button></div>`;
  else body = bdForm(f, p, c);
  return `<div class="panel" id="bd"><span class="tag">${L("Запуск у Meta","Запуск в Meta")}</span>${body}${hist}</div>`;
}
function bdForm(f, p, c){ const F0 = BD.form, accs = bdAccs(c), pages = bdPages(c), acc = accs.find(a => a.id === F0.account) || accs[0] || {}, cur = acc.currency || "USD", R = BD.run || {}, dis = BD.busy ? " disabled" : "";
  bdPixels(p, c); bdTexts(p);
  const px = BD.px[F0.account], pxs = Array.isArray(px) ? px : [], lock = R.campaign_id ? " disabled" : dis, lastPx = BD.pxLast[F0.account], tx = BD.tx;
  const inp = (k, label, o = {}) => `<div class="field${o.w ? " w" : ""}"><label for="bd-${k}">${label}</label><input id="bd-${k}" data-bd="${k}" value="${esc(F0[k])}"${o.num ? ` inputmode="decimal"` : ""}${o.type ? ` type="${o.type}"` : ""}${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${dis}>${o.hint ? `<span class="sub">${o.hint}</span>` : ""}</div>`;
  const sel = (k, label, rows) => `<div class="field"><label for="bd-${k}">${label}</label><select id="bd-${k}" data-bd="${k}"${dis}>${rows.map(r => `<option value="${r[0]}"${String(F0[k]) === r[0] ? " selected" : ""}>${esc(r[1])}</option>`).join("")}</select></div>`;
  const chip = (act, v, label, on, extra) => `<button type="button" class="opt" data-act="${act}" data-v="${esc(v)}" aria-pressed="${on ? "true" : "false"}"${dis}${extra || ""}>${label}</button>`;
  const lands = f.lands.map(l => bdUrl(l.url)), errs = bdCheck(F0, c), done = id => R.ads && R.ads[id] && R.ads[id].ad_id, on = F0.ads.filter(a => a.on);
  const name = bdLatin(F0.name), when = new Date(bdKyivToUtc(F0.date, F0.time)), whenT = when.toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {timeZone:"Europe/Kyiv", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
  /* 1. креативы */
  const fmt = a => a.type === "img" ? L("картинка","картинка") : a.story ? L("стрічка + сторіс","лента + сторис") : a.solo ? L("вертикальне відео","вертикальное видео") : L("відео","видео");
  const from = a => a.src.t === "drive" ? L("Диск","Диск") : a.src.t === "store" ? L("файли воронки","файлы воронки") : L("з комп’ютера","с компьютера");
  const ads = F0.ads.map(a => `<div class="bda${a.on ? "" : " off"}"><div class="row sp"><label class="row"><input type="checkbox" data-bd="ad:${a.id}:on"${a.on ? " checked" : ""}${dis}> <b class="mono">${esc(a.name || "—")}</b></label><span class="row">${done(a.id) ? pill("good", L("створено","создано")) : ""}${pill(a.story ? "good" : "mute", fmt(a))}<small class="sub">${from(a)}</small>${a.custom && !done(a.id) ? del("bdAdDel", a.id) : ""}</span></div>
      ${!a.on ? "" : a.own ? `<div class="field w"><textarea rows="3" data-bd="ad:${a.id}:text" aria-label="${L("Текст цього оголошення","Текст этого объявления")}"${dis}>${esc(a.text)}</textarea><span class="sub"><button type="button" class="lnk" data-act="bdAdOwn" data-id="${a.id}" data-v="0"${dis}>${L("повернути спільний текст","вернуть общий текст")}</button></span></div>`
        : `<span class="sub">${a.auto ? L("Текст — як у минулому оголошенні «","Текст — как в прошлом объявлении «") + esc(a.auto) + "»" : L("Текст — спільний","Текст — общий")} · <button type="button" class="lnk" data-act="bdAdOwn" data-id="${a.id}" data-v="1"${dis}>${a.auto ? L("змінити","изменить") : L("свій текст","свой текст")}</button>${a.auto ? ` · <button type="button" class="lnk" data-act="bdAdOwn" data-id="${a.id}" data-v="c"${dis}>${L("спільний","общий")}</button>` : ""}</span>`}
      ${BD.adv && a.on ? `<div class="field"><label for="bd-an-${a.id}">${L("Назва (у мітку utm_content)","Название (в метку utm_content)")}</label><input id="bd-an-${a.id}" data-bd="ad:${a.id}:name" value="${esc(a.name)}"${dis}></div>` : ""}</div>`).join("");
  const dr = BD.dr, drMsg = dr.state === "load" ? `<p class="sub" role="status">${L("Шукаємо файли на Диску…","Ищем файлы на Диске…")}</p>` : (dr.state === "ok" ? `<p class="sub">${L("Знайдено файлів: ","Найдено файлов: ")}${dr.found}${dr.added < dr.found ? L(" (нових: "," (новых: ") + dr.added + ")" : ""}.</p>` : "") + (dr.notes || []).map(n => `<p class="mterr">${n.link ? `<span class="mono">${esc(n.link.slice(0, 70))}</span> — ` : ""}${esc(bdDrNote(n))}</p>`).join("");
  const s1 = `<div class="bdq"><b class="bdn">1 · ${L("Креативи","Креативы")}</b>
      <div class="field w"><textarea id="bd-links" data-bd="links" rows="2" placeholder="${L("Посилання на файли або папку Google Диска — кожне з нового рядка","Ссылки на файлы или папку Google Диска — каждая с новой строки")}"${dis}>${esc(F0.links)}</textarea>
        <span class="sub">${L("Доступ до файлів — «Усі, хто має посилання». Відео Meta забирає з Диска сама. Версію для сторіс (вертикальну або з «_s_» у назві) платформа сама з’єднає з основною.","Доступ к файлам — «Все, у кого есть ссылка». Видео Meta забирает с Диска сама. Версию для сторис (вертикальную или с «_s_» в названии) платформа сама соединит с основной.")}</span></div>
      <div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="bdDrive"${dis}>${L("Знайти файли","Найти файлы")}</button><label class="btn btn--sm"><input type="file" hidden multiple accept="image/*,video/*" data-bdm="1"${dis}>${L("або обрати з комп’ютера","или выбрать с компьютера")}</label></div>
      ${drMsg}${ads ? `<div class="bdas">${ads}</div>` : ""}</div>`;
  /* 2. текст */
  const vs = bdVariants(f), heads = bdHeads(), loadingTx = tx.past === null || tx.land === null;
  const s2 = `<div class="bdq"><b class="bdn">2 · ${L("Текст і заголовок","Текст и заголовок")}</b>
      <div class="bdvs">${vs.map(v => `<div class="bdvw"><button type="button" class="bdv" data-act="bdVar" data-v="${v.k}" aria-pressed="${F0.vark === v.k && F0.text === v.body ? "true" : "false"}"${dis}><small>${esc(v.label)}</small><span>${esc(v.body.replace(/\s+/g, " ").slice(0, 110))}${v.body.length > 110 ? "…" : ""}</span></button><button type="button" class="bdvx" data-act="bdVarDel" data-v="${v.k}" title="${L("Прибрати варіант","Убрать вариант")}" aria-label="${L("Прибрати варіант","Убрать вариант")}"${dis}>×</button></div>`).join("")}<button type="button" class="bdv bdv--add" data-act="bdVarAdd" aria-pressed="${F0.vark === "new" ? "true" : "false"}"${dis}><small>${L("Свій текст","Свой текст")}</small><span>+ ${L("написати з нуля","написать с нуля")}</span></button></div>
      ${bdTx(f).del.length ? `<p class="sub"><button type="button" class="lnk" data-act="bdVarBack"${dis}>${L("Повернути приховані варіанти","Вернуть скрытые варианты")} (${bdTx(f).del.length})</button></p>` : ""}
      ${loadingTx ? `<p class="sub" role="status">${L("Шукаємо варіанти: тексти минулих оголошень акаунта й зміст лендингу…","Ищем варианты: тексты прошлых объявлений аккаунта и содержание лендинга…")}</p>` : vs.length ? "" : `<p class="sub">${tx.old ? esc(bdDrNote({error:"old"})) : L("Готових варіантів немає: в акаунті ще не було оголошень на цей лендинг, а зі сторінки текст прочитати не вдалося. Напишіть свій.","Готовых вариантов нет: в аккаунте ещё не было объявлений на этот лендинг, а со страницы текст прочитать не удалось. Напишите свой.")}</p>`}
      <div class="field w"><label for="bd-text">${L("Спільний текст оголошень","Общий текст объявлений")}</label><textarea id="bd-text" data-bd="text" rows="6"${dis}>${esc(F0.text)}</textarea></div>
      <div class="field w"><label for="bd-headline">${L("Заголовок","Заголовок")}</label><input id="bd-headline" data-bd="headline" value="${esc(F0.headline)}" placeholder="${L("можна залишити порожнім","можно оставить пустым")}"${dis}>
        ${heads.length ? `<div class="opts opts--sm">${heads.map(h => chip("bdHead", h, esc(h.length > 46 ? h.slice(0, 45) + "…" : h), F0.headline === h)).join("")}</div>` : ""}</div></div>`;
  /* 3. бюджет */
  const plan = Math.round(fT(f, p).bud / 30), accB = ((lastPx || {}).set || {}).budget, buds = [...new Set([20, 50, 100, plan >= 5 ? plan : 0, accB >= 1 ? Math.round(accB) : 0].filter(Boolean))].sort((x, y) => x - y);
  const s3 = `<div class="bdq"><b class="bdn">3 · ${L("Бюджет на день, ","Бюджет в день, ")}${esc(cur)}</b>
      <div class="row"><input id="bd-budget" data-bd="budget" class="bdbud" value="${esc(F0.budget)}" inputmode="decimal" aria-label="${L("Бюджет на день","Бюджет в день")}"${dis}>
        <div class="opts opts--sm">${buds.map(b => chip("bdBud", b, bdM(b, cur) + (b === plan ? L(" · план воронки"," · план воронки") : b === Math.round(accB || 0) ? L(" · як в акаунті"," · как в аккаунте") : ""), +F0.budget === b)).join("")}</div></div></div>`;
  /* сводка: что платформа поставила сама */
  const u = utmLvl(p, f), utmWho = utmClean(F0.utm) !== u.v ? L("свої для цього запуску","свои для этого запуска") : {f:L("шаблон воронки","шаблон воронки"), p:L("шаблон проєкту","шаблон проекта"), co:L("шаблон компанії","шаблон компании"), std:L("рекомендовані","рекомендованные")}[u.from];
  const evName = (BD_EVENTS().find(e => e[0] === F0.event) || ["", F0.event])[1].split(" — ")[0], pxName = px === "load" ? L("шукаємо…","ищем…") : ((pxs.find(x => x.id === F0.pixel) || {}).name || (F0.pixel ? F0.pixel : L("без пікселя","без пикселя")));
  const auds = bdAuds(f, p);
  const sum = `<div class="bdsum"><div class="row sp"><span class="tag">${L("Решту платформа поставила сама","Остальное платформа поставила сама")}</span><button type="button" class="btn btn--sm" data-act="bdAdv"${dis}>${BD.adv ? L("Згорнути налаштування","Свернуть настройки") : L("Змінити налаштування","Изменить настройки")}</button></div>
      <dl class="kv">
        <dt>${L("Кому показуємо","Кому показываем")}</dt><dd>${esc(bdAudText(F0))}</dd>
        <dt>${L("Ціль","Цель")}</dt><dd>${esc(evName)}${F0.event === "lpv" ? "" : " · " + L("піксель ","пиксель ") + esc(pxName)}${lastPx && F0.pixel === lastPx.id ? `<small class="sub"> — ${L("як в останній кампанії акаунта","как в последней кампании аккаунта")}</small>` : ""}</dd>
        <dt>${L("Від імені","От имени")}</dt><dd>${esc((pages.find(x => x.id === F0.page) || {}).name || "—")}</dd>
        <dt>${L("Старт","Старт")}</dt><dd>${whenT} ${L("за Києвом, усе вимкнене","по Киеву, всё выключено")}</dd>
        <dt>${L("Мітки UTM","Метки UTM")}</dt><dd>${utmWho}</dd>
        <dt>${L("Назва","Название")}</dt><dd class="mono">${esc(name || "—")}</dd>
      </dl>
      ${auds.length > 1 ? `<div class="opts opts--sm">${auds.map(a => chip("bdAud", a.k, esc(a.label), F0.aud === a.k, ` title="${esc(bdAudText(a.s))}"`)).join("")}</div>` : ""}</div>`;
  /* все настройки — по кнопке */
  const adv = !BD.adv ? "" : `<div class="form">
      <div class="field"><label for="bd-page">${L("Сторінка","Страница")}</label><select id="bd-page" data-bd="page"${dis}>${pages.length ? "" : `<option value="">—</option>`}${pages.map(a => `<option value="${esc(a.id)}"${a.id === F0.page ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
      ${sel("event", L("Що оптимізуємо","Что оптимизируем"), BD_EVENTS())}
      <div class="field w"><label for="bd-pixel">${L("Піксель","Пиксель")}</label><select id="bd-pixel" data-bd="pixel"${dis}><option value="">${px === "load" ? L("завантажуємо…","загружаем…") : pxs.length ? L("— без пікселя —","— без пикселя —") : L("в акаунті немає пікселів","в аккаунте нет пикселей")}</option>${pxs.map(a => `<option value="${esc(a.id)}"${a.id === F0.pixel ? " selected" : ""}>${esc(a.name || a.id)} · ${esc(a.id)}</option>`).join("")}</select>${px && px.err ? `<span class="sub">${esc(px.err)}</span>` : ""}</div>
      ${inp("countries", L("Країни","Страны"), {ph:"UA, PL", w:1})}
      ${sel("lang", L("Мова користувача","Язык пользователя"), [["",L("будь-яка","любой")],["52",L("українська","украинский")]])}
      <div class="field"><label>${L("Аудиторія","Аудитория")}</label><label class="row bdck"><input type="checkbox" data-bd="advantage"${F0.advantage ? " checked" : ""}${dis}> ${L("Advantage+ — Meta сама шукає людей","Advantage+ — Meta сама ищет людей")}</label></div>
      ${F0.lang && F0.advantage ? `<div class="field w"><span class="sub">${L("З Advantage+ Meta може показувати рекламу й поза обраною мовою. Щоб показувати тільки україномовним, вимкніть Advantage+ і задайте вік.","С Advantage+ Meta может показывать рекламу и вне выбранного языка. Чтобы показывать только украиноязычным, выключите Advantage+ и задайте возраст.")}</span></div>` : ""}
      ${F0.advantage ? "" : inp("age_min", L("Вік від","Возраст от"), {num:1}) + inp("age_max", L("Вік до","Возраст до"), {num:1}) + sel("gender", L("Стать","Пол"), [["",L("усі","все")],["f",L("жінки","женщины")],["m",L("чоловіки","мужчины")]])}
      ${inp("name", L("Назва кампанії","Название кампании"), {w:1, hint:L("Іде в мітки, тому тільки латиниця. Буде: ","Уходит в метки, поэтому только латиница. Будет: ") + `<span class="mono">${esc(name || "—")}</span>`})}
      ${inp("adset", L("Назва групи","Название группы"), {ph:bdAdset(Object.assign({}, F0, {adset:""})), hint:L("Порожньо — збереться сама.","Пусто — соберётся сама.")})}
      ${sel("cta", L("Кнопка","Кнопка"), BD_CTA)}
      ${inp("date", L("Старт, дата (Київ)","Старт, дата (Киев)"), {type:"date"})}${inp("time", L("Час (Київ)","Время (Киев)"), {type:"time"})}
      ${inp("description", L("Опис посилання","Описание ссылки"), {w:1, ph:L("у стрічці Facebook та в Instagram зазвичай не видно","в ленте Facebook и в Instagram обычно не видно")})}
      <div class="field w"><label for="bd-utm">${L("Мітки UTM","Метки UTM")}</label><textarea id="bd-utm" data-bd="utm" class="mono" rows="2" spellcheck="false"${dis}>${esc(F0.utm)}</textarea>
        <span class="sub">${L("Зараз: ","Сейчас: ")}${utmWho}. ${utmClean(F0.utm) !== u.v ? `<button type="button" class="lnk" data-act="bdUtmReset"${dis}>${L("повернути шаблон","вернуть шаблон")}</button> · ` : ""}${L("Зберегти як шаблон: ","Сохранить как шаблон: ")}<button type="button" class="lnk" data-act="bdUtmSave" data-v="f"${dis}>${L("воронки","воронки")}</button> · <button type="button" class="lnk" data-act="bdUtmSave" data-v="p"${dis}>${L("проєкту","проекта")}</button>${canAdmin() ? ` · <button type="button" class="lnk" data-act="bdUtmSave" data-v="co"${dis}>${L("компанії","компании")}</button>` : ""}</span></div>
    </div>`;
  return `<p class="sub">${L("Усе створюється вимкненим: кампанія, група й оголошення. Увімкнете самі в Ads Manager, коли перевірите.","Всё создаётся выключенным: кампания, группа и объявления. Включите сами в Ads Manager, когда проверите.")}</p>
    <div class="form bdtop">
      <div class="field"><label for="bd-account">${L("Рекламний акаунт","Рекламный аккаунт")}</label><select id="bd-account" data-bd="account"${lock}>${accs.map(a => `<option value="${esc(a.id)}"${a.id === F0.account ? " selected" : ""}>${esc(a.name && a.name !== a.id ? a.name + " · " + a.id : a.id)}${a.currency ? " · " + esc(a.currency) : ""}</option>`).join("")}</select>${R.campaign_id ? `<span class="sub">${L("Кампанію вже створено в цьому акаунті — змінити його не можна.","Кампания уже создана в этом аккаунте — сменить его нельзя.")}</span>` : ""}</div>
      <div class="field"><label for="bd-link">${L("Лендинг","Лендинг")}</label><input id="bd-link" data-bd="link" value="${esc(F0.link)}" list="bd-lands" placeholder="https://"${dis}><datalist id="bd-lands">${lands.map(x => `<option value="${esc(x)}">`).join("")}</datalist></div>
    </div>
    ${bdTgtHead()}${BD.tgt && BD.tgt.mode === "ad" ? "" : bdGoalBlock(f, p, cur, dis)}${s1}${s2}${BD.tgt && BD.tgt.mode === "ad" ? "" : s3}${sum}${adv}
    ${errs.length && !BD.busy ? `<p class="sub">${L("Ще потрібно: ","Ещё нужно: ")}${esc(errs.join(", "))}.</p>` : ""}
    ${BD.err ? `<p class="mterr" role="alert">${esc(BD.err)}</p>` : ""}
    ${BD.busy ? `<p class="sub" role="status">${esc(BD.step)}</p>` : ""}
    <div class="row"><button class="btn btn--solid" data-act="bdRun"${errs.length || BD.busy ? " disabled" : ""}>${BD.busy ? L("Збираємо…","Собираем…") : BD.tgt ? (BD.tgt.mode === "ad" ? L("Додати вимкненими · оголошень: ","Добавить выключенными · объявлений: ") : L("Додати групу вимкненою · оголошень: ","Добавить группу выключенной · объявлений: ")) + on.length : R.campaign_id ? L("Продовжити збирання","Продолжить сборку") : L("Зібрати вимкненою · оголошень: ","Собрать выключенной · объявлений: ") + on.length}</button>
      <button class="btn" data-act="bdClose"${dis}>${L("Скасувати","Отмена")}</button></div>`;
}
/* ---------- загрузка файлов в Meta и сборка ---------- */
async function bdBlob(a, part){ const k = a.id + (part ? ":s" : ""), src = part ? a.story : a.src; if (BD.files[k]) return BD.files[k];
  if (!src || src.t !== "store") throw new Error(L("немає файла для ","нет файла для ") + a.name);
  const r = await sb.storage.from("files").download(src.path); if (r.error || !r.data) throw new Error(L("не вдалося взяти файл ","не удалось взять файл ") + src.fname);
  return new File([r.data], src.fname || a.name, {type:r.data.type || (a.type === "img" ? "image/jpeg" : "video/mp4")}); }
/* Одна часть объявления: основной файл (part = "") или версия для сторис (part = "s"). kick — только попросить Meta начать
   забирать видео с Диска и идти дальше: так все ролики обрабатываются одновременно, а не по очереди. */
async function bdUp(a, part, x, kick){ const src = part ? a.story : a.src, K = n => (part ? "s_" : "") + n, nm = a.name + (part ? "_s" : "");
  if (x[K("hash")] || x[K("picture")]) return;
  if (a.type !== "video") { if (kick) return;
    if (src.t === "drive") { x[K("hash")] = (await bdStep({action:"b_image_url", drive_id:src.id, name:nm}, L("Беремо картинку з Диска: ","Берём картинку с Диска: ") + nm)).hash; return; }
    const img = await bdBlob(a, part); if (img.size > 8 * 1048576) throw {error:"bad", detail:L("картинка більша за 8 МБ: ","картинка больше 8 МБ: ") + a.name};
    x[K("hash")] = (await bdStep({action:"b_image", name:nm, data:await bdB64(img)}, L("Завантажуємо картинку ","Загружаем картинку ") + nm)).hash; return; }
  if (!x[K("video_id")] || !x[K("uploaded")]) {
    if (src.t === "drive") { x[K("video_id")] = (await bdStep({action:"b_video_url", drive_id:src.id, name:nm}, L("Meta забирає відео з Диска: ","Meta забирает видео с Диска: ") + nm)).video_id; x[K("uploaded")] = true; }
    else if (kick) return;
    else { const file = await bdBlob(a, part), s = await bdStep({action:"b_video_start", size:file.size}, L("Готуємо завантаження відео ","Готовим загрузку видео ") + nm);
      x[K("video_id")] = s.video_id; let st = s.start, en = s.end;
      while (st < en) { const chunk = file.slice(st, Math.min(en, st + 4 * 1048576));
        const r = await bdStep({action:"b_video_chunk", session:s.session, start:st, data:await bdB64(chunk)}, L("Відео ","Видео ") + nm + ": " + Math.round(st / file.size * 100) + "%"); st = r.start; en = r.end; }
      await bdStep({action:"b_video_finish", session:s.session, name:nm}, L("Відео завантажено, Meta його обробляє…","Видео загружено, Meta его обрабатывает…")); x[K("uploaded")] = true; } }
  if (kick) return;
  const strict = src.t === "drive" || !!a.story;   /* файл с Диска и пара «лента + сторис» ждут полной готовности ролика */
  for (let i = 0; i < 48; i++) { const v = await bdStep({action:"b_video_status", video_id:x[K("video_id")]}, L("Meta обробляє відео ","Meta обрабатывает видео ") + nm + " · " + (i * 5) + L(" с"," с"));
    if (v.state === "error") throw {error:"meta", detail:L("Meta не змогла обробити відео ","Meta не смогла обработать видео ") + nm + (src.t === "drive" ? L(". Перевірте, що файл на Диску відкритий за посиланням.",". Проверьте, что файл на Диске открыт по ссылке.") : "")};
    if (v.picture && (v.state === "ready" || (!strict && i > 3))) { x[K("picture")] = v.picture; return; }
    await bdWait(5000); }
  throw {error:"slow", detail:L("Meta ще обробляє відео. Зачекайте хвилину й натисніть «Продовжити збирання» — уже завантажене не повториться.","Meta ещё обрабатывает видео. Подождите минуту и нажмите «Продолжить сборку» — уже загруженное не повторится.")}; }
async function bdRunAll(){ const f = F(), p = P(), F0 = BD.form, c = bdConn(p); if (!f || !p || !c || BD.busy) return;
  BD.busy = true; BD.err = ""; const R = BD.run = BD.run || {ads:{}}, name = bdLatin(F0.name), adset = bdAdset(F0), start = new Date(bdKyivToUtc(F0.date, F0.time)).toISOString(), on = F0.ads.filter(a => a.on), budget = +String(F0.budget).replace(",", ".");
  try {
    if (!R.campaign_id) { const r = await bdStep({action:"b_campaign", name, event:F0.event}, L("Створюємо кампанію…","Создаём кампанию…")); R.campaign_id = r.id; R.name = r.name;
      /* старая серверная функция не знает про выбор аккаунта и создала бы всё в основном */
      if (F0.account !== (c.account || {}).id && r.account !== F0.account) throw {error:"old_fn"}; }
    if (!R.adset_id) R.adset_id = (await bdStep({action:"b_adset", campaign_id:R.campaign_id, name:adset, event:F0.event, daily_budget:budget, start_time:start,
      countries:F0.countries.toUpperCase().split(/[^A-Z]+/).filter(x => x.length === 2), locales:F0.lang ? [+F0.lang] : [], advantage:F0.advantage, age_min:+F0.age_min, age_max:+F0.age_max, gender:F0.gender}, L("Створюємо групу оголошень…","Создаём группу объявлений…"))).id;
    for (const a of on) { const x = R.ads[a.id] = R.ads[a.id] || {}; if (x.ad_id) continue; await bdUp(a, "", x, true); if (a.story) await bdUp(a, "s", x, true); }
    for (const a of on) { const x = R.ads[a.id]; if (x.ad_id) continue; await bdUp(a, "", x); if (a.story) await bdUp(a, "s", x);
      const r = await bdStep({action:"b_ad", adset_id:R.adset_id, name:a.name, text:bdAdText(a, F0), headline:F0.headline, description:F0.description, cta:F0.cta, link:bdUrl(F0.link), url_tags:utmClean(F0.utm),
        image_hash:x.hash, video_id:x.picture ? x.video_id : undefined, picture:x.picture, story_video_id:a.story && x.s_picture ? x.s_video_id : undefined, story_picture:x.s_picture, creative_id:x.creative_id}, L("Створюємо оголошення ","Создаём объявление ") + a.name);
      x.creative_id = r.creative_id; x.ad_id = r.id; if (a.story && !r.pac) R.nopac = (R.nopac || 0) + 1; }
    const note = R.nopac ? L("без версії для сторіс: ","без версии для сторис: ") + R.nopac : "";
    f.builds = f.builds || []; f.builds.unshift({at:new Date().toISOString(), goal:F0.goal || "", chg:F0.chg || [], name:R.name || name, account:F0.account, account_name:(bdAccs(c).find(a => a.id === F0.account) || {}).name || "", campaign_id:R.campaign_id, adset_id:R.adset_id, start, note, ads:on.map(a => ({name:a.name, id:R.ads[a.id].ad_id}))});
    p.campMap = p.campMap || {}; p.campMap[R.campaign_id] = f.id; /* статистика этой кампании попадёт в воронку, даже если название её не содержит */
    /* следующий запуск начнётся с этих же настроек: аккаунт, цель, аудитория, бюджет, текст */
    const snap = {account:F0.account, page:F0.page, pixel:F0.pixel, event:F0.event, countries:F0.countries, lang:F0.lang, advantage:!!F0.advantage, age_min:+F0.age_min || 18, age_max:+F0.age_max || 65, gender:F0.gender, budget, cta:F0.cta};
    f.launch = Object.assign({text:F0.text, headline:F0.headline}, snap); p.launch = snap; f.links = F0.links;
    const T0 = BD.tgt ? BD.tgt.mode : ""; BD.open = null; BD.run = null; BD.files = {}; BD.tgt = null; save();
    if (T0) toast(T0 === "ad" ? L("Оголошення додано вимкненими. Перевірте їх в Ads Manager.","Объявления добавлены выключенными. Проверьте их в Ads Manager.") : L("Групу додано вимкненою. Перевірте її в Ads Manager.","Группа добавлена выключенной. Проверьте её в Ads Manager.")); else
    toast(note ? L("Кампанію зібрано вимкненою. У частини оголошень версія для сторіс не підставилась — перевірте в Ads Manager.","Кампания собрана выключенной. У части объявлений версия для сторис не подставилась — проверьте в Ads Manager.") : L("Кампанію зібрано вимкненою. Перевірте її в Ads Manager і ввімкніть, коли будете готові.","Кампания собрана выключенной. Проверьте её в Ads Manager и включите, когда будете готовы."));
  } catch (e) { BD.err = e && e.error ? (e.error === "slow" || e.error === "bad" && e.detail && e.detail.length > 14 ? e.detail : bdErr(e)) : L("Не вдалося: ","Не удалось: ") + (e && e.message || e);
    if (R.campaign_id) BD.err += " " + L("Уже створене збережено: «Продовжити збирання» почне з місця зупинки.","Уже созданное сохранено: «Продолжить сборку» начнёт с места остановки."); }
  BD.busy = false; BD.step = ""; render(); }
const bdErr = d => ({no_pixel:L("У підключенні немає пікселя — оберіть його в налаштуваннях або ціль «Перегляди сторінки».","В подключении нет пикселя — выберите его в настройках или цель «Просмотры страницы»."), no_page:L("У підключенні немає сторінки — оберіть її в «Підключеннях».","В подключении нет страницы — выберите её в «Подключениях»."),
  action:L("Сервер ще старої версії: оновіть функцію meta.","Сервер ещё старой версии: обновите функцию meta."),
  bad:d.detail === "drive_closed" ? L("Файл на Диску закритий. Відкрийте доступ «Усі, хто має посилання».","Файл на Диске закрыт. Откройте доступ «Все, у кого есть ссылка».") : L("Перевірте поле: ","Проверьте поле: ") + ({name:L("назва кампанії","название кампании"), budget:L("бюджет","бюджет"), start:L("старт","старт"), countries:L("країни","страны"), link:L("лендинг","лендинг"), image:L("картинка (до 20 МБ)","картинка (до 20 МБ)"), media:L("файл оголошення","файл объявления")}[d.detail] || d.detail || "")}[d.error] || mtErr(d));
Object.assign(ACT, {
  bdOpen(d){ const f = F(), p = P(); if (!f || !p) return false; BD.open = f.id; BD.tgt = null; bdInit(f, p); setTimeout(() => { const el = document.getElementById("bd"); if (el) el.scrollIntoView({block:"start", behavior:"smooth"}); }, 50); },
  bdClose(){ if (BD.busy) return false; BD.open = null; BD.run = null; BD.tgt = null; BD.files = {}; BD.err = ""; },
  bdRun(){ bdRunAll(); return false; },
  bdDrive(){ bdDrive(); return false; },
  bdAdv(){ BD.adv = !BD.adv; },
  bdAud(d){ const f = F(), p = P(), v = f && p && BD.form ? bdAuds(f, p).find(a => a.k === d.v) : null; if (!v) return false; bdAudSet(v); },
  bdVar(d){ const f = F(), v = f && BD.form ? bdVariants(f).find(x => x.k === d.v) : null; if (!v) return false; bdVarSet(v); BD.form.textSet = true; },
  bdVarDel(d){ const f = F(), F0 = BD.form; if (!f || !F0) return false; const v = bdVariants(f).find(x => x.k === d.v); if (!v) return false; const t = bdTx(f);
    if (v.own) t.own = t.own.filter(o => o.k !== v.k); else t.del.push(bdTK(v.body));
    if (F0.vark === v.k) { const vs = bdVariants(f); F0.textSet = false; if (vs.length) bdVarSet(vs[0]); else { F0.text = ""; F0.vark = ""; } }
    save(); },
  bdVarAdd(){ const F0 = BD.form; if (!F0) return false; F0.text = ""; F0.vark = "new"; F0.textSet = true; setTimeout(() => { const el = document.getElementById("bd-text"); if (el) el.focus(); }, 30); },
  bdVarBack(){ const f = F(); if (!f) return false; bdTx(f).del = []; save(); },
  bdHead(d){ if (!BD.form) return false; BD.form.headline = BD.form.headline === d.v ? "" : d.v; BD.form.headSet = true; },
  bdBud(d){ if (!BD.form) return false; BD.form.budget = +d.v; },
  bdAdOwn(d){ const a = BD.form && BD.form.ads.find(x => x.id === d.id); if (!a) return false;
    if (d.v === "1") { a.own = true; if (!a.text.trim()) a.text = BD.form.text; } else if (d.v === "c") { a.own = false; a.text = ""; a.auto = ""; a.noauto = true; } else { a.own = false; a.text = ""; a.auto = ""; bdAdTexts(); } },
  bdAdDel(d){ if (!BD.form) return false; BD.form.ads = BD.form.ads.filter(a => a.id !== d.id); delete BD.files[d.id]; delete BD.files[d.id + ":s"]; },
  bdUtmReset(){ const p = P(), f = F(); if (!BD.form || !p) return false; BD.form.utm = utmLvl(p, f).v; },
  /* шаблон меток закладывается один раз и наследуется: компания → проект → воронка → запуск */
  bdUtmSave(d){ const p = P(), f = F(), v = BD.form ? utmClean(BD.form.utm) : ""; if (!p || !f || !v) return false;
    if (!utmOk(v)) { toast(L("Мітки мають вигляд: utm_source=…&utm_campaign=…","Метки имеют вид: utm_source=…&utm_campaign=…")); return false; }
    if (d.v === "co") { if (!canAdmin()) return false; W.co.utm = v; if (utmClean(p.utm) === v) delete p.utm; if (utmClean(f.utm) === v) delete f.utm; } else if (d.v === "p") { p.utm = v; if (utmClean(f.utm) === v) delete f.utm; } else f.utm = v;
    save(); toast({co:L("Збережено як шаблон компанії","Сохранено как шаблон компании"), p:L("Збережено як шаблон проєкту","Сохранено как шаблон проекта"), f:L("Збережено як шаблон воронки","Сохранено как шаблон воронки")}[d.v]); },
});
/* Правка текста: выбранный «свой» вариант меняется, а правка готового варианта становится новым «своим» — исходник остаётся в списке. */
function bdTextEdit(val){ const F0 = BD.form, f = F(); F0.textSet = true; if (!f) return; const t = bdTx(f); let o = t.own.find(x => x.k === F0.vark);
  if (!o) { if (!val.trim()) return; o = {k:"o" + uid(), body:"", title:F0.headline || ""}; t.own.unshift(o); F0.vark = o.k; }
  o.body = val; }
document.addEventListener("input", e => { const t = e.target; if (!t.dataset || !t.dataset.bd || !BD.form) return; const k = t.dataset.bd;
  if (k.indexOf("ad:") === 0) { const [, id, fk] = k.split(":"), a = BD.form.ads.find(x => x.id === id); if (a && fk !== "on") a[fk] = t.value; return; }
  if (t.type !== "checkbox" && t.tagName !== "SELECT") { BD.form[k] = t.value; if (k === "text") bdTextEdit(t.value); if (k === "headline") BD.form.headSet = true; } });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset || !BD.form) return;
  if (t.dataset.bdm) { const files = [...(t.files || [])].filter(x => /^(image|video)\//.test(x.type || "") || mediaExt(x.name)); if (!files.length) return; const F0 = BD.form;
    Promise.all(files.map(async file => { const d = await bdDims(file); return {t:"file", name:file.name, kind:(file.type || "").indexOf("video") === 0 || mediaExt(file.name) === "video" ? "video" : "img", w:d.w, h:d.h, size:file.size, key:"f:" + file.name + ":" + file.size, file}; }))
      .then(items => { if (BD.form !== F0) return; bdAddMedia(items); render(); }); return; }
  if (!t.dataset.bd) return; const k = t.dataset.bd;
  if (k.indexOf("ad:") === 0) { const [, id, fk] = k.split(":"), a = BD.form.ads.find(x => x.id === id); if (!a) return; if (fk === "on") a.on = t.checked; else if (fk === "name") { a.name = bdLatin(t.value); if (!a.own) { a.auto = ""; bdAdTexts(); } } else a[fk] = t.value; render(); return; }
  BD.form[k] = t.type === "checkbox" ? t.checked : t.value; if (k === "name" || k === "adset") BD.form[k] = t.value ? t.value : "";
  if (k === "utm") BD.form.utm = utmClean(t.value);
  if (k === "account") { BD.form.pixel = ""; BD.form.pixelSet = false; BD.form.eventSet = false; BD.run = null; } if (k === "pixel") BD.form.pixelSet = true; if (k === "event") BD.form.eventSet = true;
  if (k === "countries" || k === "lang" || k === "advantage" || k === "age_min" || k === "age_max" || k === "gender") BD.form.aud = "";
  if (k === "link") BD.form.link = bdUrl(t.value);
  if (k === "text") save();
  render(); });
const mediaExt = n => /\.(mp4|mov|m4v|webm)$/i.test(n || "") ? "video" : /\.(jpe?g|png|gif|webp)$/i.test(n || "") ? "img" : "";

/* ── Цель запуска одной фразой. Разбор и расчёт — обычный код, без ИИ. ── */
const bdDayAdd = (d, k) => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + k)).toISOString().slice(0, 10); };
const bdDayDiff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);
function bdGoalParse(s){ const t = String(s || "").toLowerCase().replace(/ /g, " "), g = {}, tom = bdTomorrow(), num = x => +String(x).replace(/\s/g, "");
  const m = t.match(/(\d[\d ]*)\s*(лід|лид|реєстр|регистр|заяв|підпис|подпис|оплат|продаж|покуп|брон)/);
  if (m) { g.n = num(m[1]); g.unit = /оплат|продаж|покуп/.test(m[2]) ? "pay" : /брон/.test(m[2]) ? "book" : "lead"; }
  const b = t.match(/\$\s?(\d[\d ]*)/) || t.match(/(\d[\d ]*)\s*(\$|дол|usd|бакс)/); if (b) g.budget = num(b[1]);
  const dm = t.match(/(?:^|[^\d.])(\d{1,2})[.\/](\d{1,2})(?![\d])/), thr = t.match(/через\s+(\d+)\s*(дн|ден|день|діб|сут)/);
  if (/післязавтра|послезавтра/.test(t)) g.date = bdDayAdd(tom, 1); else if (/завтра/.test(t)) g.date = tom; else if (/сьогодні|сегодня/.test(t)) g.date = bdDayAdd(tom, -1);
  else if (thr) g.date = bdDayAdd(tom, +thr[1] - 1);
  else if (dm && +dm[2] >= 1 && +dm[2] <= 12 && +dm[1] >= 1 && +dm[1] <= 31) { const y = +tom.slice(0, 4); let d = y + "-" + String(dm[2]).padStart(2, "0") + "-" + String(dm[1]).padStart(2, "0"); if (bdDayDiff(d, tom) < -1) d = (y + 1) + d.slice(4); g.date = d; }
  return g; }
/* цена лида: факт воронки за выбранный на карте период, иначе план воронки */
function bdGoalCpl(f, p){ let fact = 0; try { if (typeof prOn === "function" && prOn(p)) { const x = prOf(p); if (x.cur) { const rows = x.cur.filter(r => fxFunnel(p, r) === f.id), sp = rows.reduce((a, r) => a + (+r.spend || 0), 0), ld = rows.reduce((a, r) => a + (+r.leads || 0), 0); if (ld >= 10) fact = sp / ld; } } } catch (e) {}
  const t = fT(f, p), plan = t.leads > 0 ? t.bud / t.leads : 0; return fact ? {v:fact, from:"fact"} : plan ? {v:plan, from:"plan"} : null; }
function bdGoalCalc(f, p){ const F0 = BD.form, g = bdGoalParse(F0.goal), c = bdGoalCpl(f, p), t = f.tg || {}, o = {g, cpl:c};
  if (!c) return o;
  const k = g.unit === "pay" ? (t.l2b / 100) * (t.b2p / 100) : g.unit === "book" ? t.l2b / 100 : 1;
  if (g.n && k > 0) { o.leads = Math.ceil(g.n / k); o.total = o.leads * c.v;
    if (g.date) { o.days = bdDayDiff(g.date, F0.date); o.late = o.days < 1; o.daily = Math.ceil(o.total / Math.max(1, o.days)); } }
  if (g.budget) o.byBudget = Math.floor(g.budget / c.v * k);
  return o; }
const BD_CHG = () => [["offer",L("офер","оффер")],["price",L("ціна","цена")],["land",L("лендинг","лендинг")],["crs",L("креативи","креативы")],["aud",L("аудиторія","аудитория")]];
function bdGoalBlock(f, p, cur, dis){ const F0 = BD.form, o = bdGoalCalc(f, p), g = o.g, dm = d => d.slice(8, 10) + "." + d.slice(5, 7), unit = {lead:L("лідів","лидов"), book:L("бронювань","броней"), pay:L("оплат","оплат")}[g.unit] || "";
  const mic = (window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="btn btn--ico${BD.mic ? " btn--solid" : ""}" data-act="bdMic" aria-pressed="${BD.mic ? "true" : "false"}" aria-label="${L("Надиктувати","Надиктовать")}" title="${L("Надиктувати","Надиктовать")}"${dis}><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="7.5" y="2.5" width="5" height="9" rx="2.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/></svg></button>` : "";
  const got = [g.n ? g.n + " " + unit : "", g.date ? L("до ","к ") + dm(g.date) : "", g.budget ? bdM(g.budget, cur) : ""].filter(Boolean);
  let calc = "";
  if (o.cpl && g.n) { const src = o.cpl.from === "fact" ? L("факт воронки","факт воронки") : L("план воронки","план воронки");
    calc = `<p class="bdg__c">${g.unit !== "lead" ? `${g.n} ${unit} ≈ ${o.leads} ${L("лідів","лидов")} · ` : ""}${L("лід ","лид ")}${bdM(o.cpl.v, cur)} <small class="sub">(${src})</small> → <b>${bdM(Math.round(o.total), cur)}</b>${o.days >= 1 ? ` · ${o.days} ${L("дн.","дн.")} × <b>${bdM(o.daily, cur)}</b>` : ""}</p>
      ${o.late ? `<p class="mterr">${L("Старт стоїть на ","Старт стоит на ")}${dm(F0.date)} ${F0.time} — ${L("до цієї дати реклама не встигне. Зсуньте старт у налаштуваннях або дату цілі.","к этой дате реклама не успеет. Сдвиньте старт в настройках или дату цели.")}</p>` : ""}
      ${o.daily && +F0.budget !== o.daily ? `<div class="row"><button type="button" class="btn btn--sm btn--solid" data-act="bdBud" data-v="${o.daily}"${dis}>${L("Поставити ","Поставить ")}${bdM(o.daily, cur)}${L(" на день"," в день")}</button></div>` : ""}`; }
  else if (o.cpl && g.budget) calc = `<p class="bdg__c">${bdM(g.budget, cur)} ÷ ${L("лід ","лид ")}${bdM(o.cpl.v, cur)} ≈ <b>${o.byBudget} ${L("лідів","лидов")}</b></p>`;
  const chg = (f.builds || []).length ? `<div class="row bdg__q"><span class="sub">${L("Що змінилося з минулого запуску","Что изменилось с прошлого запуска")}</span><div class="opts opts--sm">${BD_CHG().map(c => `<button type="button" class="opt" data-act="bdChg" data-v="${c[0]}" aria-pressed="${(F0.chg || []).includes(c[0]) ? "true" : "false"}"${dis}>${c[1]}</button>`).join("")}</div></div>` : "";
  return `<div class="bdq bdg"><div class="row sp"><b class="bdn">${L("Ціль","Цель")}</b></div>
    <div class="row bdg__in"><input id="bd-goal" data-bd="goal" value="${esc(F0.goal || "")}" placeholder="${L("100 лідів на вебінар післязавтра","100 лидов на вебинар послезавтра")}" aria-label="${L("Ціль запуску","Цель запуска")}"${dis}>${mic}</div>
    ${got.length ? `<div class="bdg__got">${got.map(x => `<span class="pill pill--mute">${esc(x)}</span>`).join("")}</div>` : ""}${calc}${chg}</div>`; }
function bdMic(){ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR || !BD.form) return;
  if (BD.mic) { try { BD.mic.stop(); } catch (e) {} BD.mic = null; render(); return; }
  const r = new SR(); r.lang = lang === "uk" ? "uk-UA" : "ru-RU"; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(" ").trim(); if (t && BD.form) BD.form.goal = ((BD.form.goal || "") + " " + t).trim(); };
  r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(L("Браузер не дав доступ до мікрофона","Браузер не дал доступ к микрофону")); };
  r.onend = () => { BD.mic = null; render(); };
  BD.mic = r; try { r.start(); } catch (e) { BD.mic = null; } render(); }
Object.assign(ACT, {
  bdMic(){ bdMic(); return false; },
  bdChg(d){ const F0 = BD.form; if (!F0) return false; F0.chg = F0.chg || []; const i = F0.chg.indexOf(d.v); if (i < 0) F0.chg.push(d.v); else F0.chg.splice(i, 1); },
  /* вход с карты: «+ Кампания» у Meta Ads открывает запуск нужной воронки */
  bdFromMap(d){ const p = W.projs.find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return false;
    W.cur = p.id; W.fun = f.id; W.ftab = d.tab || "launch"; BD.open = f.id; BD.tgt = null; if (CLOUD && bdConn(p) && bdCanWrite(bdConn(p))) bdInit(f, p); else BD.open = null; save();
    setTimeout(() => { const el = document.getElementById("bd"); if (el) el.scrollIntoView({block:"start"}); }, 80); }
});
document.addEventListener("change", e => { if (e.target && e.target.id === "bd-goal") render(); });

/* ── Добавление в существующее: группа в кампанию, объявления в группу. Сборка продолжает с заполненных номеров (BD.run). ── */
function bdTgtHead(){ const t = BD.tgt; if (!t) return "";
  return `<div class="bdtgt"><span class="tag">${t.mode === "ad" ? L("Нові оголошення в групі","Новые объявления в группе") : L("Нова група в кампанії","Новая группа в кампании")}</span>
    <b class="mono">${esc(t.mode === "ad" ? t.an : t.cn)}</b>${t.mode === "ad" ? `<small class="sub mono">${esc(t.cn)}</small>` : ""}
    ${hint(t.mode === "ad" ? L("Аудиторія, бюджет, старт і піксель — як у цій групі. Тут лише креативи, тексти й кнопка.","Аудитория, бюджет, старт и пиксель — как в этой группе. Здесь только креативы, тексты и кнопка.")
      : L("Ціль групи має збігатися з ціллю кампанії. Якщо в кампанії бюджет на рівні кампанії, Meta не прийме бюджет групи — тоді додайте групу в Ads Manager.","Цель группы должна совпадать с целью кампании. Если в кампании бюджет на уровне кампании, Meta не примет бюджет группы — тогда добавьте группу в Ads Manager."))}</div>`; }
Object.assign(ACT, {
  bdTarget(d){ const p = W.projs.find(x => x.id === d.p), f = p && p.funnels.find(x => x.id === d.f); if (!f) return false;
    W.cur = p.id; W.fun = f.id; BD.open = f.id; bdInit(f, p);
    const F0 = BD.form, prev = (f.builds || []).find(b => b.campaign_id === d.cid);
    if (d.acc && d.acc !== "_" && bdAccs(bdConn(p)).some(a => a.id === d.acc)) F0.account = d.acc; else if (prev && prev.account) F0.account = prev.account;
    BD.tgt = {mode:d.mode, cid:d.cid, cn:d.cn || d.cid, aid:d.aid || "", an:d.an || ""};
    BD.run = {ads:{}, campaign_id:d.cid, name:d.cn || "", adset_id:d.mode === "ad" ? d.aid : undefined};
    if (prev && prev.event) F0.event = prev.event;
    save(); setTimeout(() => { const el = document.getElementById("bd"); if (el) el.scrollIntoView({block:"start"}); }, 80); }
});
