/* Аналіз акаунту при підключенні Meta: перший звіт — що зламано, куди йдуть гроші, що зробити.
   Сервер: функція pilot, action "audit" (тільки читання з Meta, 30 днів). Результат зберігається в p.meta.audit, щоб не питати Meta щоразу.
   Запускається сам: коли Meta підключено, а аналізу ще немає або він старший за 7 днів. Підключається перед ws.js. */
const AUD = {busy:{}, err:{}};
const auLvl = l => l === "bad" ? ["crit", L("зламано","сломано")] : l === "warn" ? ["warn", L("варто виправити","стоит исправить")] : ["good", L("нормально","нормально")];
function auRun(p){ if (!p || AUD.busy[p.id]) return; AUD.busy[p.id] = 1; AUD.err[p.id] = "";
  plCall({action:"audit", project_id:p.id}).then(d => { AUD.busy[p.id] = 0;
    if (!d || !d.ok) AUD.err[p.id] = d && d.error === "not_connected" ? L("Meta не підключено","Meta не подключена") : L("Не вдалося зробити аналіз. Спробуй ще раз пізніше.","Не удалось сделать анализ. Попробуй ещё раз позже.");
    else { mtMeta(p).audit = d; save(); }
    render(); }); }
function auditPanel(p){ const m = p && p.meta; if (!m || !m.conn) return "";
  const a = m.audit, busy = AUD.busy[p.id], err = AUD.err[p.id];
  if (!busy && !err && (!a || Date.now() - Date.parse(a.at) > 7 * 864e5)) setTimeout(() => auRun(p), 0);
  const head = `<div class="row sp"><h2>${L("Аналіз акаунту","Анализ аккаунта")} ${hint(L("Хіро читає Meta за 30 днів: акаунт, піксель, структуру груп, вигорання креативів і де гроші йдуть без лідів. Нічого не змінює.","Хиро читает Meta за 30 дней: аккаунт, пиксель, структуру групп, выгорание креативов и где деньги уходят без лидов. Ничего не меняет."))}</h2>
    <button class="btn btn--sm" data-act="auRun"${busy ? " disabled" : ""}>${ico("refresh")} ${busy ? L("Аналізую…","Анализирую…") : L("Оновити","Обновить")}</button></div>`;
  if (!a) return `<div class="panel aud">${head}<p class="sub">${busy ? L("Дивлюся акаунт за 30 днів. Це до хвилини.","Смотрю аккаунт за 30 дней. Это до минуты.") : esc(err || "")}</p></div>`;
  const F = a.findings || [], bad = F.filter(f => f.lvl !== "ok"), lost = bad.reduce((s, f) => s + (+f.money || 0), 0);
  const kpi = `<dl class="decsum__k aud__k"><div><dt>${L("Витрати за 30 днів","Расход за 30 дней")}</dt><dd class="num">${num(a.spend)} $</dd></div><div><dt>${L("Лідів","Лидов")}</dt><dd class="num">${num(a.res)}</dd></div>
    <div><dt>${L("Ціна ліда","Цена лида")}</dt><dd class="num">${a.cpl ? dec(a.cpl) + " $" : "—"}</dd></div><div class="decsum__cap"><dt>${L("Під питанням","Под вопросом")} ${hint(L("Скільки грошей пішло на оголошення, плейсменти й країни без лідів або з дуже дорогими лідами. Деякі суми можуть перетинатися.","Сколько денег ушло на объявления, плейсменты и страны без лидов или с очень дорогими лидами. Некоторые суммы могут пересекаться."))}</dt><dd class="num">${lost ? num(lost) + " $" : "0 $"}</dd></div></dl>`;
  const row = f => { const v = auLvl(f.lvl); return `<li class="aud__i"><div class="row sp"><b>${f.title}</b>${pill(v[0], v[1])}</div><p class="sub">${f.text}</p>${f.todo ? `<p class="aud__todo">${ico("chevron")} ${esc(f.todo)}</p>` : ""}</li>`; };
  return `<div class="panel aud">${head}<p class="sub">${L("Мірило — ","Мерило — ")}${a.byT === "цілі" ? L("ціль ціни ліда ","цель цены лида ") : L("середня ціна ліда акаунту ","средняя цена лида аккаунта ")}${a.T ? dec(a.T) + " $" : "—"} · ${L("оновлено ","обновлено ")}${new Date(a.at).toLocaleString(L("uk-UA","ru-RU"), {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})}</p>
    ${kpi}${F.length ? `<ul class="aud__l">${F.map(row).join("")}</ul>` : `<p class="sub">${L("Явних проблем не бачу.","Явных проблем не вижу.")}</p>`}${err ? `<p class="mterr">${esc(err)}</p>` : ""}</div>`; }
Object.assign(ACT, { auRun(){ const p = typeof P === "function" ? P() : null; if (!p) return false; auRun(p); } });
