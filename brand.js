/* Оформление платформы — в одном месте. Чтобы сменить айдентику, правится только этот файл:
   название, логотип, значок вкладки, шрифты и цвета светлой и тёмной темы.
   Остальные файлы берут цвета через var(--имя), название — через BRAND.name, логотип — через brandLogo(). */
window.BRAND = {
  name: "HEYROW",          // название в текстах, заголовке вкладки, подписях ассистента
  logoText: "HEY",         // надпись логотипа, пока нет файла логотипа…
  logoAccent: "ROW",       // …и её вторая часть цветом акцента (play)
  mark: false,             // старый знак со стрелками — не используется (утверждён логотип «HEY с воронкой и строкой ROW», Figma 23.11.2026)
  wordmark: true,          // утверждённый логотип: HEY, ножка Y — оранжевая «воронка», под словом оранжевая черта и ROW справа

  /* Файлы логотипа (SVG или PNG) кладутся рядом с этим файлом, сюда пишется имя: "logo-dark.svg".
     Пока пусто — рисуется знак и надпись. Если файл указан, надпись не показывается. */
  logo: {
    onDark: "",            // для тёмного фона: левая полоса кабинета и тёмная тема лендинга
    onLight: "",           // для светлого фона: шапка лендинга в светлой теме
    height: 22             // высота логотипа в пикселях
  },
  icon: "",                // значок вкладки браузера (SVG или PNG); пусто — знак на тёмном квадрате

  fonts: {
    url: "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Unbounded:wght@500;700;800;900&display=swap",
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

/* ---- ниже ничего менять не нужно: раскладка настроек по странице ---- */
(function (B) {
  const vars = o => Object.keys(o).map(k => "--" + k + ":" + o[k]).join(";");
  const MARK = '<path d="M40 44h22v56H40zM29 98h44l-22 28zM60 74h40v16H60z" fill="currentColor"/><path d="M98 58h22v68H98zM87 60h44l-22-30z" fill="var(--play)"/>';
  const dark = vars(B.dark) + ";color-scheme:dark", h = (B.logo && B.logo.height) || 22;
  const st = document.createElement("style"); st.id = "brand";
  st.textContent =
    ":root{" + vars(B.light) + ";--f-display:" + B.fonts.display + ";--f-body:" + B.fonts.body + ";--f-mono:" + B.fonts.mono + "}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + dark + "}}" +
    ':root[data-theme="dark"]{' + dark + "}" +
    ".logo svg{width:22px;height:22px;flex:none;display:block}.logo span{font-weight:800;letter-spacing:-.01em}.logo b{color:var(--play);font-weight:inherit}" +
    ".logo img{height:" + h + "px;width:auto;display:block}.logo .lg-d{display:none}" +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .logo .lg-l{display:none}:root:not([data-theme="light"]) .logo .lg-d{display:block}}' +
    ':root[data-theme="dark"] .logo .lg-l{display:none}:root[data-theme="dark"] .logo .lg-d{display:block}';
  document.head.appendChild(st);
  if (B.fonts.url) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = B.fonts.url; document.head.appendChild(l); }
  const ic = document.createElement("link"); ic.rel = "icon";
  ic.href = B.icon || "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="' + B.light.ink + '"/>' + MARK.replace("currentColor", "#fff").replace("var(--play)", B.light.play) + "</svg>");
  document.head.appendChild(ic);

  /* логотип: place = "rail" — тёмная полоса кабинета; "page" — фон по теме (лендинг) */
  window.brandLogo = place => {
    const L = B.logo || {}, img = (src, c) => '<img src="' + src + '" alt="' + B.name + '"' + (c ? ' class="' + c + '"' : "") + ">";
    if (place === "rail" && (L.onDark || L.onLight)) return img(L.onDark || L.onLight);
    if (place !== "rail" && L.onLight && L.onDark) return img(L.onLight, "lg-l") + img(L.onDark, "lg-d");
    if (place !== "rail" && (L.onLight || L.onDark)) return img(L.onLight || L.onDark);
    if (B.wordmark) return '<span class="hw" aria-label="' + B.name + '"><span class="hw__hey">HE<span class="hw__y">Y</span></span><span class="hw__ln"><i></i><span class="hw__row">ROW</span></span></span>';
    const word = "<span>" + B.logoText + (B.logoAccent ? "<b>" + B.logoAccent + "</b>" : "") + "</span>";
    return (B.mark ? '<svg viewBox="26 26 108 104" aria-hidden="true">' + MARK + "</svg>" : "<i></i>") + word;
  };
  const fill = () => {
    if (document.title) document.title = document.title.replace("Rakurs", B.name);
    const d = document.querySelector('meta[name="description"]'); if (d) d.content = d.content.replace("Rakurs", B.name);
    document.querySelectorAll('[data-brand="logo"]').forEach(el => { el.innerHTML = brandLogo("page"); });
    document.querySelectorAll('[data-brand="name"]').forEach(el => { el.textContent = B.name; });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})(window.BRAND);
