/* Подключение к серверу. Пока оба поля пустые, кабинет работает как прототип: данные в браузере, вход имитируется.
   url — адрес проекта Supabase, key — публичный ключ (anon / publishable). Секретный service_role сюда не вставлять. */
window.RK = {
  url: "https://otmvxtdhaqodkmizutbo.supabase.co",
  key: "sb_publishable_BLrktbKDGpAL_AlFqTqWiQ_dq8yyHWb",
  hosts: [],  // свои домены, на которых включать сервер, кроме github.io и localhost
  code: false // true — в письме приходит код (нужен свой почтовый сервис и строка {{ .Token }} в шаблонах); false — вход по ссылке из письма
};
