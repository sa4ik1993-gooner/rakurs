/* Оформление платформы — в одном месте. Чтобы сменить айдентику, правится только этот файл:
   название, логотип, значок вкладки, шрифты и цвета светлой и тёмной темы.
   Остальные файлы берут цвета через var(--имя), название — через BRAND.name, логотип — через brandLogo(). */
window.BRAND = {
  name: "HEYROW",          // название в текстах, заголовке вкладки, подписях ассистента
  logoText: "HEY",         // надпись логотипа, пока нет файла логотипа…
  logoAccent: "ROW",       // …и её вторая часть цветом акцента (play)

  /* Файлы логотипа (SVG или PNG) кладутся рядом с этим файлом, сюда пишется имя: "logo-dark.svg".
     Пока пусто — рисуется знак и надпись. Если файл указан, надпись не показывается. */
  logo: {
    onDark: "ui/logo/logo-on-dark.svg",    // файлы из heyrow-ui/logo, не перерисовываются
    onLight: "ui/logo/logo-on-light.svg",
    height: 28             // высота логотипа в пикселях
  },
  icon: "ui/logo/icon-32.png",             // значок вкладки: app-icon-dark из heyrow-ui/logo
  touchIcon: "ui/logo/icon-180.png",

  fonts: {
    url: "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@600;700;800&family=Caveat:wght@600&display=swap",
    display: "'Unbounded','Arial Black',sans-serif",          // заголовки и логотип
    body: "'Golos Text','Segoe UI',system-ui,sans-serif",      // основной текст
    mono: "'JetBrains Mono',ui-monospace,Menlo,monospace"      // цифры, метки, подписи
  },

  /* Цвета: концепция бренда HEYROW, палитра 1 «Чернила и оранжевый» (22.11.2026).
     В обеих темах одни и те же имена. */
  light: {
    "bg": "#F2F4F8",          // фон страницы — «Туман»
    "surface": "#FFFFFF",     // фон карточек и панелей — «Белый»
    "ink": "#0D1424",         // основной текст — «Чернила»
    "muted": "#5B6478",       // второстепенный текст
    "line": "#DDE1EA",        // рамки и разделители
    "track": "#2C3650",       // рабочий цвет: ссылки, активные элементы, полосы и графики
    "track-soft": "#E4E8F1",  // его светлая подложка
    "play": "#FF5A1F",        // акцент — «Сигнал»: знак, главное действие, «плохо»
    "on-play": "#FFFFFF",     // текст поверх акцента
    "mark": "#F2C230",        // метка-подсветка
    "on-ink": "#F2F4F8",      // текст поверх тёмной заливки
    "good": "#13805C",        // «хорошо» — «Окупилось» (#1FC28B), затемнён для текста на белом
    "warn": "#8A5F08",        // «внимание»
    "warn-soft": "#FBF0CC",   // подложка «внимание»
    "crit-soft": "#FFE5DA",   // подложка «плохо»
    "rail": "#0D1424",        // левая полоса кабинета
    "rail-fg": "#F2F4F8",     // текст на ней
    "rail-mute": "#A9B2C6",   // приглушённый текст на ней
    "rail-on": "#1B2438",     // выбранный пункт на ней
    "shade": "rgba(13,20,36,.45)" // затемнение под окнами
  },
  dark: {
    "bg": "#0A0F1B", "surface": "#131B2D", "ink": "#EEF1F7", "muted": "#A9B2C6", "line": "#2C3650",
    "track": "#AEBBDA", "track-soft": "#1B2438", "play": "#FF6A33", "on-play": "#FFFFFF", "mark": "#F2C230", "on-ink": "#0A0F1B",
    "good": "#1FC28B", "warn": "#F2C230", "warn-soft": "#3A3212", "crit-soft": "#3D1F14",
    "rail": "#070B14", "rail-fg": "#EEF1F7", "rail-mute": "#7F89A0", "rail-on": "#1B2438",
    "shade": "rgba(0,0,0,.6)"
  }
};

/* ---- ниже ничего менять не нужно ----
   Кабинет (<html data-ui="app">): цвета, шрифты, отступы — только из ui/tokens.css (heyrow-ui), тёмной темы нет (DESIGN.md п. 3).
   Лендинг: старые имена цветов и тёмная тема остаются, пока лендинг не переведён на дизайн-систему. */
(function (B) {
  const app = document.documentElement.dataset.ui === "app";
  const vars = o => Object.keys(o).map(k => "--" + k + ":" + o[k]).join(";");
  const h = (B.logo && B.logo.height) || 28, add = (tag, a) => { const e = document.createElement(tag); Object.assign(e, a); document.head.appendChild(e); return e; };
  if (app) add("link", { rel: "stylesheet", href: "ui/tokens.css" });
  const st = document.createElement("style"); st.id = "brand";
  st.textContent = (app ? "" :
    ":root{" + vars(B.light) + ";--f-display:" + B.fonts.display + ";--f-body:" + B.fonts.body + ";--f-mono:" + B.fonts.mono + "}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + vars(B.dark) + ";color-scheme:dark}}" +
    ':root[data-theme="dark"]{' + vars(B.dark) + ";color-scheme:dark}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .logo .lg-l{display:none}:root:not([data-theme="light"]) .logo .lg-d{display:block}}' +
    ':root[data-theme="dark"] .logo .lg-l{display:none}:root[data-theme="dark"] .logo .lg-d{display:block}') +
    ".logo img{height:" + h + "px;width:auto;display:block}.logo .lg-d{display:none}";
  document.head.appendChild(st);
  if (B.fonts.url) add("link", { rel: "stylesheet", href: B.fonts.url });
  add("link", { rel: "icon", href: B.icon });
  if (B.touchIcon) add("link", { rel: "apple-touch-icon", href: B.touchIcon });

  /* иконки: спрайт heyrow-ui/icons вставляется в страницу, ico("name") рисует <svg><use> */
  if (app) fetch("ui/icons.svg").then(r => r.text()).then(t => { const d = document.createElement("div"); d.hidden = true; d.innerHTML = t; document.body.prepend(d); }).catch(() => {});
  window.ico = (n, label) => '<svg class="ic" ' + (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"') + '><use href="#i-' + n + '"/></svg>';

  /* логотип — только файлом: rail — тёмная полоса кабинета, page — светлый фон */
  window.brandLogo = place => {
    const L = B.logo || {}, img = (src, c) => '<img src="' + src + '" alt="' + B.name + '"' + (c ? ' class="' + c + '"' : "") + ">";
    if (place === "rail") return img(L.onDark);
    return app ? img(L.onLight) : img(L.onLight, "lg-l") + img(L.onDark, "lg-d");
  };
  const fill = () => {
    if (document.title) document.title = document.title.replace("Rakurs", B.name);
    const d = document.querySelector('meta[name="description"]'); if (d) d.content = d.content.replace("Rakurs", B.name);
    document.querySelectorAll('[data-brand="logo"]').forEach(el => { el.innerHTML = brandLogo("page"); });
    document.querySelectorAll('[data-brand="name"]').forEach(el => { el.textContent = B.name; });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})(window.BRAND);
