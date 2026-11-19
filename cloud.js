/* Сервер: настоящий вход по почте и общие данные компании (Supabase).
   Включается, когда в config.js заданы url и key. Подключается перед ws.js. */
const RK = window.RK || {};
const CLOUD = !!(RK.url && RK.key) && (/(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) || (RK.hosts || []).includes(location.hostname));
let sb = null;
const CL = {ready:false, state:"idle", cos:[], members:[], role:null, known:{}, snap:{co:"", p:{}}, timer:null, busy:false, again:false, at:0};
const ROLES = () => ({owner:L("Власник","Собственник"), lead:L("Керівник лідгену","Руководитель лидгена"), targetolog:L("Таргетолог","Таргетолог")});
const canAdmin = () => !CLOUD || CL.role === "owner" || CL.role === "lead";
const isOwner = () => !CLOUD || CL.role === "owner";
const pid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : uid();
const cErr = (e, t) => { console.error(e); CL.state = "err"; cloudBadge(); toast(t + (e && e.message ? ": " + e.message : "")); };
const cloudLabel = () => ({idle:L("сервер підключено","сервер подключён"), load:L("завантаження…","загрузка…"), dirty:L("зберігаємо…","сохраняем…"), saved:L("збережено","сохранено"), err:L("помилка збереження","ошибка сохранения")}[CL.state]);
function cloudBadge(){ const b = document.querySelector("#bar .badge"); if (b && CLOUD) b.textContent = cloudLabel(); }
const coJSON = () => { const c = Object.assign({}, W.co), name = c.name, kind = c.kind; delete c.id; delete c.name; delete c.kind; return JSON.stringify({name, kind, data:c}); };
function cloudSnap(){ CL.snap = {co: W.co ? coJSON() : "", p:{}}; W.projs.forEach(p => { CL.snap.p[p.id] = JSON.stringify(p); }); }

function loadLib(){ return window.supabase ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"; s.onload = ok; s.onerror = () => no(new Error("lib")); document.head.appendChild(s); }); }
async function cloudBoot(){
  if (!CLOUD) return;
  CL.state = "load";
  try { await loadLib(); sb = window.supabase.createClient(RK.url, RK.key);
    const r = await sb.auth.getSession(); if (r.data && r.data.session) await cloudEnter(r.data.session.user);
    CL.state = "saved";
  } catch (e) { cErr(e, L("Не вдалося з’єднатися із сервером","Не удалось соединиться с сервером")); }
  CL.ready = true; render();
  window.addEventListener("focus", () => { if (W.co && W.co.id && CL.state === "saved" && !CL.busy && Date.now() - CL.at > 30000 && (!document.activeElement || document.activeElement === document.body)) cloudOpen(W.co.id).then(render, () => {}); });
}
async function cloudEnter(user){
  W.user = {via:"email", id:String(user.email).toLowerCase(), uid:user.id};
  await sb.rpc("claim_membership");
  const r = await sb.from("companies").select("*").order("created_at"); if (r.error) throw r.error;
  CL.cos = r.data || [];
  let want = null; try { want = localStorage.getItem("rakurs_co"); } catch (e) {}
  const co = CL.cos.find(c => c.id === want) || CL.cos[0];
  if (co) await cloudOpen(co.id); else { W.co = null; W.projs = []; W.cur = W.fun = null; cloudSnap(); }
}
async function cloudOpen(id){
  const [c, m, p] = await Promise.all([sb.from("companies").select("*").eq("id", id).single(), sb.from("members").select("*").eq("company_id", id).order("created_at"), sb.from("projects").select("*").eq("company_id", id).order("created_at")]);
  if (c.error) throw c.error; if (m.error) throw m.error; if (p.error) throw p.error;
  W.co = Object.assign({}, c.data.data, {id, name:c.data.name, kind:c.data.kind});
  CL.members = m.data || []; CL.role = (CL.members.find(x => x.email === W.user.id) || {}).role || null;
  W.projs = (p.data || []).map(r => Object.assign({}, r.data, {id:r.id, name:r.name}));
  CL.known = {co:c.data.updated_at}; (p.data || []).forEach(r => { CL.known[r.id] = r.updated_at; });
  if (!W.projs.some(x => x.id === W.cur)) { W.cur = null; W.fun = null; }
  norm(); cloudSnap(); CL.at = Date.now(); try { localStorage.setItem("rakurs_co", id); } catch (e) {}
}
function cloudQueue(){ if (!sb || !W.user || !W.co || !W.co.id) return; CL.state = "dirty"; cloudBadge(); clearTimeout(CL.timer); CL.timer = setTimeout(cloudSync, 900); }
async function cloudSync(){
  if (CL.busy) { CL.again = true; return; }
  CL.busy = true; CL.again = false; let conflict = false, denied = false;
  try {
    const cj = coJSON();
    if (cj !== CL.snap.co) {
      if (!canAdmin()) denied = true;
      else { const o = JSON.parse(cj), r = await sb.from("companies").update(o).eq("id", W.co.id).eq("updated_at", CL.known.co).select("updated_at"); if (r.error) throw r.error;
        if (!r.data.length) conflict = true; else { CL.known.co = r.data[0].updated_at; CL.snap.co = cj; } }
    }
    for (const p of W.projs.slice()) { const j = JSON.stringify(p);
      if (!(p.id in CL.snap.p)) { const r = await sb.from("projects").insert({id:p.id, company_id:W.co.id, name:p.name || "", data:p}).select("updated_at"); if (r.error) throw r.error; if (r.data.length) CL.known[p.id] = r.data[0].updated_at; CL.snap.p[p.id] = j; }
      else if (j !== CL.snap.p[p.id]) { const r = await sb.from("projects").update({name:p.name || "", data:p}).eq("id", p.id).eq("updated_at", CL.known[p.id]).select("updated_at"); if (r.error) throw r.error;
        if (!r.data.length) conflict = true; else { CL.known[p.id] = r.data[0].updated_at; CL.snap.p[p.id] = j; } }
    }
    for (const id of Object.keys(CL.snap.p)) if (!W.projs.some(p => p.id === id)) { const r = await sb.from("projects").delete().eq("id", id); if (r.error) throw r.error; delete CL.snap.p[id]; delete CL.known[id]; }
    if (conflict || denied) { await cloudOpen(W.co.id); render(); toast(denied ? L("Базу й налаштування компанії змінює власник або керівник","Базу и настройки компании меняет собственник или руководитель") : L("Дані змінив інший учасник — завантажено свіжу версію","Данные изменил другой участник — загружена свежая версия")); }
    CL.state = "saved"; cloudBadge();
  } catch (e) { cErr(e, L("Не вдалося зберегти","Не удалось сохранить")); }
  CL.busy = false; if (CL.again) cloudQueue();
}
/* вход */
async function cloudSendCode(mail){
  const r = await sb.auth.signInWithOtp({email:mail, options:{shouldCreateUser:!AU.login, emailRedirectTo:location.origin + location.pathname}});
  if (r.error) { toast(/signups not allowed|not found|not allowed for otp/i.test(r.error.message) ? L("Акаунта з такою поштою немає — зареєструйтесь","Аккаунта с такой почтой нет — зарегистрируйтесь") : /rate|seconds|limit/i.test(r.error.message) ? L("Забагато листів поспіль. Спробуйте за хвилину","Слишком много писем подряд. Попробуйте через минуту") : L("Не вдалося надіслати код: ","Не удалось отправить код: ") + r.error.message); return; }
  AU.id = mail; AU.step = 1; render();
}
async function cloudVerify(code){
  const r = await sb.auth.verifyOtp({email:AU.id, token:code, type:"email"});
  if (r.error || !r.data || !r.data.user) { toast(L("Код не підійшов або застарів","Код не подошёл или устарел")); return; }
  try { CL.state = "load"; await cloudEnter(r.data.user); CL.state = "saved"; AU = auFresh(); render(); toast(W.co ? L("З поверненням","С возвращением") : L("Пошту підтверджено. Тепер компанія","Почта подтверждена. Теперь компания")); }
  catch (e) { cErr(e, L("Вхід виконано, але дані не завантажилися","Вход выполнен, но данные не загрузились")); render(); }
}
async function cloudLogout(){ try { await sb.auth.signOut(); } catch (e) {} W = blankW(); AU = auFresh(); AU.login = true; CL.cos = []; CL.members = []; CL.role = null; cloudSnap(); render(); toast(L("Ви вийшли","Вы вышли")); }
async function cloudCreateCo(name, kind){
  const r = await sb.from("companies").insert({name, kind}).select().single(); if (r.error) return cErr(r.error, L("Не вдалося створити компанію","Не удалось создать компанию"));
  CL.cos.push(r.data); try { await cloudOpen(r.data.id); CL.state = "saved"; } catch (e) { return cErr(e, L("Компанію створено, але вона не відкрилася","Компания создана, но не открылась")); } render();
}
async function cloudSwitch(id){ try { CL.state = "load"; cloudBadge(); await cloudOpen(id); W.ctab = "projects"; CL.state = "saved"; } catch (e) { cErr(e, L("Не вдалося відкрити компанію","Не удалось открыть компанию")); } render(); }
async function cloudDeleteCo(){ const r = await sb.from("companies").delete().eq("id", W.co.id); if (r.error) return cErr(r.error, L("Не вдалося видалити","Не удалось удалить"));
  CL.cos = CL.cos.filter(c => c.id !== W.co.id); W.co = null; W.projs = []; W.cur = W.fun = null; try { localStorage.removeItem("rakurs_co"); } catch (e) {}
  if (CL.cos[0]) await cloudOpen(CL.cos[0].id); else cloudSnap(); render(); toast(L("Компанію видалено","Компания удалена")); }
/* команда */
async function cloudMembers(){ const m = await sb.from("members").select("*").eq("company_id", W.co.id).order("created_at"); if (!m.error) CL.members = m.data || []; }
async function cloudAddMember(email, role, proj){
  const r = await sb.from("members").insert({company_id:W.co.id, email, role, project_ids: proj ? [proj] : null}); if (r.error) { toast(/duplicate|unique/i.test(r.error.message) ? L("Ця людина вже в команді","Этот человек уже в команде") : L("Не вдалося додати: ","Не удалось добавить: ") + r.error.message); return; }
  await cloudMembers(); render(); toast(L("Доступ видано. Надішліть людині посилання на кабінет","Доступ выдан. Отправьте человеку ссылку на кабинет"));
}
async function cloudDelMember(id){ const r = await sb.from("members").delete().eq("id", id); if (r.error) return cErr(r.error, L("Не вдалося прибрати","Не удалось убрать")); await cloudMembers(); render(); toast(L("Доступ закрито","Доступ закрыт")); }
