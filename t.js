/* HEYROW — трекер для сайта клиента. Ставится одной строкой в <head> на все страницы:
   <script async src="https://…/t.js" data-k="hr_КЛЮЧ_ПРОЕКТА" data-f="ID_ВОРОНКИ"></script>
   data-k — ключ проекта (школы, компании), data-f — воронка (необязательно: без него воронку определит кабинет по адресу страницы).
   data-consent="1" — ничего не сохранять и не отправлять, пока сайт не вызовет heyrow.consent() (баннер согласия, ЕС).
   Что делает:
   1) запоминает в браузере, с какой рекламы пришёл человек (UTM, id клика Facebook/Google/TikTok, id объявления) — первое и последнее касание, 90 дней;
   2) отправляет «просмотр» страницы;
   3) при отправке любой формы дописывает в неё скрытые поля с метками (уходят в любую CRM) и отправляет «лид»;
      почту/телефон не отправляет — только их SHA-256, посчитанный здесь же;
   4) heyrow.pay(сумма, "USD") — оплата со страницы «спасибо», heyrow.lead() — лид из своей формы или виджета. */
(function () {
  "use strict";
  var me = document.currentScript || document.querySelector("script[data-k][src*='t.js']");
  if (!me || window.__heyrow) return; window.__heyrow = 1;
  var K = me.getAttribute("data-k") || "", F = me.getAttribute("data-f") || "", WAIT = me.getAttribute("data-consent") === "1";
  var END = me.getAttribute("data-e") || "https://otmvxtdhaqodkmizutbo.supabase.co/functions/v1/track";
  if (!/^hr_[a-z0-9]{8,24}$/.test(K)) return;
  var DAY = 864e5, TTL = 90 * DAY, ok = !WAIT, sent = {};

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function ck(k, v) { try { if (v === undefined) { var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; }
    document.cookie = k + "=" + encodeURIComponent(v) + "; max-age=" + 400 * 86400 + "; path=/; SameSite=Lax"; } catch (e) { return null; } }
  function rid() { var a = "abcdefghijklmnopqrstuvwxyz0123456789", s = "", r = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(20)) : null;
    for (var i = 0; i < 20; i++) s += a[(r ? r[i] : Math.floor(Math.random() * 256)) % 36]; return s; }
  /* свой id браузера: в localStorage и cookie сайта (если одно стерли — восстановим из другого) */
  function vid() { var v = ls("hr_vid") || ck("hr_vid"); if (!v || !/^[a-z0-9]{10,32}$/.test(v)) v = rid(); ls("hr_vid", v); ck("hr_vid", v); return v; }

  /* касания: последнее рекламное держится 90 дней, пока не придёт новое; первое — не меняется */
  function touch() {
    var q = new URLSearchParams(location.search), g = function (n) { return (q.get(n) || "").slice(0, 200); };
    var t = {s: g("utm_source"), m: g("utm_medium"), c: g("utm_campaign"), n: g("utm_content"), tm: g("utm_term"),
      click: q.get("fbclid") ? "fb" : q.get("gclid") || q.get("wbraid") || q.get("gbraid") ? "gg" : q.get("ttclid") ? "tt" : "", ad: g("hr_ad") || g("ad_id")};
    var st = {}; try { st = JSON.parse(ls("hr_t") || ck("hr_t") || "{}") || {}; } catch (e) { st = {}; }
    var now = Date.now();
    if (st.l && now - st.l.at > TTL) st.l = null;
    if (t.s || t.c || t.n || t.click || t.ad) {
      if (!t.s && t.click) t.s = {fb: "facebook", gg: "google", tt: "tiktok"}[t.click];
      t.at = now; st.l = t; if (!st.f) st.f = {s: t.s, c: t.c, n: t.n, at: now};
    }
    if (ok) { var j = JSON.stringify(st); ls("hr_t", j); ck("hr_t", j); }
    return st;
  }
  var V = "", T = {};
  function start() { V = vid(); T = touch(); send("view"); }

  function send(kind, x) {
    if (!ok) return; x = x || {};
    var l = T.l || {}, f = T.f || {}, ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { ref = ""; }
    if (ref === location.hostname) ref = "";
    var b = {action: "e", k: K, t: kind, v: V, f: F, h: location.hostname, p: location.pathname, r: ref,
      q: {s: l.s, m: l.m, c: l.c, n: l.n, tm: l.tm, click: l.click, ad: l.ad}, ft: {s: f.s, c: f.c, n: f.n, at: f.at},
      ch: x.ch || "", a: x.a || 0, cu: x.cu || "", fm: x.fm || ""};
    var body = JSON.stringify(b);
    try { if (navigator.sendBeacon && navigator.sendBeacon(END, new Blob([body], {type: "text/plain"}))) return; } catch (e) { /* ниже fetch */ }
    try { fetch(END, {method: "POST", body: body, keepalive: true, mode: "cors", headers: {"Content-Type": "text/plain"}}); } catch (e) { /* без сети — пропускаем */ }
  }

  /* хеш почты или телефона: телефон — последние 9 цифр (одинаково для 0XX… и +380XX…), почта — в нижнем регистре */
  function norm(form) {
    var els = form.querySelectorAll("input"), ph = "", em = "";
    for (var i = 0; i < els.length; i++) { var e = els[i], n = ((e.name || "") + " " + (e.id || "") + " " + (e.type || "")).toLowerCase(), v = (e.value || "").trim();
      if (!v || e.type === "hidden" || e.type === "password") continue;
      if (!em && (e.type === "email" || /mail/.test(n)) && /@/.test(v)) em = "e:" + v.toLowerCase();
      else if (!ph && (e.type === "tel" || /phone|tel|телефон|номер/.test(n))) { var d = v.replace(/\D/g, ""); if (d.length >= 9) ph = "p:" + d.slice(-9); } }
    return ph || em;
  }
  function sha(s) { if (!s || !window.crypto || !crypto.subtle) return Promise.resolve("");
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }, function () { return ""; }); }

  /* скрытые поля с метками: если у формы таких нет — добавляем, если есть пустые — заполняем */
  function stamp(form) {
    var l = T.l || {}, set = {utm_source: l.s, utm_medium: l.m, utm_campaign: l.c, utm_content: l.n, utm_term: l.tm, hr_vid: V, hr_ad: l.ad};
    Object.keys(set).forEach(function (k) { if (!set[k]) return; var el = form.querySelector("[name='" + k + "']");
      if (!el) { el = document.createElement("input"); el.type = "hidden"; el.name = k; form.appendChild(el); }
      if (!el.value) el.value = set[k]; });
  }
  function onForm(form) {
    if (!ok || !form || form.getAttribute("data-hr") === "off") return;
    var id = form.id || form.name || form.getAttribute("data-tilda-formskey") || "form", now = Date.now();
    if (sent[id] && now - sent[id] < 5000) return; sent[id] = now;
    stamp(form);
    sha(norm(form)).then(function (h) { send("lead", {ch: h, fm: id}); });
  }
  document.addEventListener("submit", function (e) { onForm(e.target); }, true);
  /* конструкторы, которые отправляют форму без события submit: ловим нажатие на кнопку отправки */
  document.addEventListener("click", function (e) { var b = e.target && e.target.closest ? e.target.closest("button[type=submit], input[type=submit], .t-submit") : null;
    if (b && b.form) setTimeout(function () { var f = b.form; if (f.checkValidity && !f.checkValidity()) return; onForm(f); }, 0); }, true);

  window.heyrow = {
    vid: function () { return V; },
    consent: function () { if (ok) return; ok = true; start(); },
    lead: function (o) { o = o || {}; sha(o.phone ? "p:" + String(o.phone).replace(/\D/g, "").slice(-9) : o.email ? "e:" + String(o.email).trim().toLowerCase() : "").then(function (h) { send("lead", {ch: h, fm: o.form || "api"}); }); },
    pay: function (a, cu, o) { o = o || {}; sha(o.phone ? "p:" + String(o.phone).replace(/\D/g, "").slice(-9) : o.email ? "e:" + String(o.email).trim().toLowerCase() : "").then(function (h) { send("pay", {a: +a || 0, cu: cu || "USD", ch: h}); }); }
  };
  if (ok) start();
})();
