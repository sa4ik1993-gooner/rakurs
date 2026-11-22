/* Оформление платформы — в одном месте. Чтобы сменить айдентику, правится только этот файл:
   название, логотип, значок вкладки, шрифты и цвета светлой и тёмной темы.
   Остальные файлы берут цвета через var(--имя), название — через BRAND.name, логотип — через brandLogo(). */
window.BRAND = {
  name: "Rakurs",          // название в текстах, заголовке вкладки, подписях ассистента
  logoText: "RAKURS",      // надпись рядом со знаком-уголком, пока нет файла логотипа

  /* Файлы логотипа (SVG или PNG) кладутся рядом с этим файлом, сюда пишется имя: "logo-dark.svg".
     Пока пусто — рисуется уголок и надпись logoText. Если файл указан, надпись не показывается. */
  logo: {
    onDark: "",            // для тёмного фона: левая полоса кабинета и тёмная тема лендинга
    onLight: "",           // для светлого фона: шапка лендинга в светлой теме
    height: 22             // высота логотипа в пикселях
  },
  icon: "",                // значок вкладки браузера (SVG или PNG); пусто — уголок цвета акцента

  fonts: {
    url: "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Unbounded:wght@500;700&display=swap",
    display: "'Unbounded','Arial Black',sans-serif",          // заголовки и логотип
    body: "'Golos Text','Segoe UI',system-ui,sans-serif",      // основной текст
    mono: "'JetBrains Mono',ui-monospace,Menlo,monospace"      // цифры, метки, подписи
  },

  /* Цвета. В обеих темах одни и те же имена. */
  light: {
    "bg": "#EDF0EE",          // фон страницы
    "surface": "#FFFFFF",     // фон карточек и панелей
    "ink": "#10231F",         // основной текст
    "muted": "#51635D",       // второстепенный текст
    "line": "#C9D2CD",        // рамки и разделители
    "track": "#1E5A4E",       // фирменный цвет: ссылки, активные элементы, основные кнопки
    "track-soft": "#D8E6E1",  // его светлая подложка
    "play": "#D93A20",        // акцент: уголок логотипа, главное действие, «плохо»
    "on-play": "#FFFFFF",     // текст поверх акцента
    "mark": "#F2C230",        // метка-подсветка
    "on-ink": "#F4F7F5",      // текст поверх тёмной заливки
    "good": "#1E7A4E",        // «хорошо»
    "warn": "#8A5F08",        // «внимание»
    "warn-soft": "#FBF0CC",   // подложка «внимание»
    "crit-soft": "#FBE0DA",   // подложка «плохо»
    "rail": "#10231F",        // левая полоса кабинета
    "rail-fg": "#E3EBE7",     // текст на ней
    "rail-mute": "#8FA59D",   // приглушённый текст на ней
    "rail-on": "#21433B",     // выбранный пункт на ней
    "shade": "rgba(16,35,31,.42)" // затемнение под окнами
  },
  dark: {
    "bg": "#0E1715", "surface": "#16221F", "ink": "#E6EEEA", "muted": "#93A69F", "line": "#2A3A35",
    "track": "#6CC7AE", "track-soft": "#1D3530", "play": "#FF6B4A", "on-play": "#FFFFFF", "mark": "#F2C230", "on-ink": "#0E1715",
    "good": "#6CC7AE", "warn": "#F2C230", "warn-soft": "#3A3212", "crit-soft": "#3D1E17",
    "rail": "#0A1210", "rail-fg": "#E3EBE7", "rail-mute": "#7E948C", "rail-on": "#1B332D",
    "shade": "rgba(0,0,0,.6)"
  }
};

/* ---- ниже ничего менять не нужно: раскладка настроек по странице ---- */
(function (B) {
  const vars = o => Object.keys(o).map(k => "--" + k + ":" + o[k]).join(";");
  const dark = vars(B.dark) + ";color-scheme:dark", h = (B.logo && B.logo.height) || 22;
  const st = document.createElement("style"); st.id = "brand";
  st.textContent =
    ":root{" + vars(B.light) + ";--f-display:" + B.fonts.display + ";--f-body:" + B.fonts.body + ";--f-mono:" + B.fonts.mono + "}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + dark + "}}" +
    ':root[data-theme="dark"]{' + dark + "}" +
    ".logo img{height:" + h + "px;width:auto;display:block}.logo .lg-d{display:none}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .logo .lg-l{display:none}:root:not([data-theme="light"]) .logo .lg-d{display:block}}' +
    ':root[data-theme="dark"] .logo .lg-l{display:none}:root[data-theme="dark"] .logo .lg-d{display:block}';
  document.head.appendChild(st);
  if (B.fonts.url) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = B.fonts.url; document.head.appendChild(l); }
  const ic = document.createElement("link"); ic.rel = "icon";
  ic.href = B.icon || "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="' + B.light.rail + '"/><path d="M9 24V9h15" fill="none" stroke="' + B.light.play + '" stroke-width="5"/></svg>');
  document.head.appendChild(ic);

  /* логотип: place = "rail" — тёмная полоса кабинета; "page" — фон по теме (лендинг) */
  window.brandLogo = place => {
    const L = B.logo || {}, img = (src, c) => '<img src="' + src + '" alt="' + B.name + '"' + (c ? ' class="' + c + '"' : "") + ">";
    if (place === "rail" && (L.onDark || L.onLight)) return img(L.onDark || L.onLight);
    if (place !== "rail" && L.onLight && L.onDark) return img(L.onLight, "lg-l") + img(L.onDark, "lg-d");
    if (place !== "rail" && (L.onLight || L.onDark)) return img(L.onLight || L.onDark);
    return "<i></i>" + B.logoText;
  };
  const fill = () => {
    if (document.title) document.title = document.title.replace("Rakurs", B.name);
    const d = document.querySelector('meta[name="description"]'); if (d) d.content = d.content.replace("Rakurs", B.name);
    document.querySelectorAll('[data-brand="logo"]').forEach(el => { el.innerHTML = brandLogo("page"); });
    document.querySelectorAll('[data-brand="name"]').forEach(el => { el.textContent = B.name; });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})(window.BRAND);
