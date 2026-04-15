# Google Consent Mode v2 — levashou.pl

## Что это и зачем
Google Consent Mode v2 — это механизм, который сообщает Google-сервисам (GA4, Google Ads) о статусе согласия пользователя на использование cookies. Требуется для соответствия GDPR (ЕС) и RODO (Польша) с марта 2024 г.

Реализация на сайте:
- **Default**: все рекламные и аналитические storage = `denied` до получения согласия. Регион `['EEA', 'PL']` — правила применяются к посетителям из ЕЭЗ и Польши.
- **Update**: вызывается при нажатии пользователем кнопки в баннере cookies.
- GA4 (`G-48BN8FG5NG`) загружается всегда, но при `denied` шлёт только cookieless pings без идентификаторов.
- Microsoft Clarity загружается **только** при `analytics_storage = 'granted'` (т.е. выбор "Принять все").

## Архитектура
1. **Inline в каждом HTML** (после `<head>`): блок `gtag('consent', 'default', {...denied, region: ['EEA','PL']})` перед загрузкой gtag.js.
2. **Microsoft Clarity** обёрнут в проверку `localStorage.getItem('cookie-consent') === 'all'` — не запускается на первом визите до согласия.
3. **`/js/main.js`**:
   - При загрузке страницы, если есть сохранённое согласие — вызывает `gtag('consent', 'update', ...)`.
   - При клике на кнопки баннера (`data-cookie="all|necessary|rejected"`) — сохраняет в localStorage и вызывает consent update.
   - При `"all"` — динамически инжектит Clarity (поскольку inline-версия уже не сработает).
   - Кнопка `data-cookie="open"` в футере открывает баннер заново.

## Три сценария

### 1. "Принять все" (`all`)
- localStorage: `cookie-consent=all`
- gtag consent update: все 4 флага = `granted`
- GA4: полный сбор (cookies, user_id, events)
- Clarity: загружается, пишет session recordings и heatmaps
- Правовое основание: явное согласие (art. 6(1)(a) GDPR, art. 173 Prawo telekomunikacyjne PL)

### 2. "Только необходимые" (`necessary`)
- localStorage: `cookie-consent=necessary`
- gtag consent update: все 4 флага = `denied`
- GA4: cookieless pings (агрегированная статистика без идентификации)
- Clarity: **не загружается**
- Необходимые cookies (functionality, security) работают без согласия — legitimate interest

### 3. "Отклонить" (`rejected`)
- localStorage: `cookie-consent=rejected`
- gtag consent update: все 4 флага = `denied`
- GA4: cookieless pings
- Clarity: **не загружается**
- Идентичен `necessary` по данным, но фиксирует явный отказ

## Как тестировать
1. **Google Tag Assistant** (`tagassistant.google.com`):
   - Открыть levashou.pl через Tag Assistant
   - Проверить event `consent` → `default` с `ad_storage: denied`
   - Нажать "Принять все" → увидеть event `consent` → `update` с `ad_storage: granted`
2. **DevTools → Application → Local Storage**: ключ `cookie-consent`
3. **DevTools → Network → clarity.ms**:
   - Первый визит (без выбора): **нет запросов** к clarity.ms
   - После "Принять все": появляется `https://www.clarity.ms/tag/wbo8sg8woh`
   - После "Только необходимые" или "Отклонить": **нет запросов**
4. **GA4 Realtime** → DebugView: events идут во всех сценариях, но с разными флагами.

## Правовые ссылки
- GDPR art. 6, 7 — согласие как правовое основание
- RODO (польская имплементация GDPR) — identyczne wymogi
- Prawo telekomunikacyjne (PL) art. 173 — cookies require консент
- Google Consent Mode v2 docs: https://developers.google.com/tag-platform/security/guides/consent

## Файлы
- Default consent block — все 50 HTML (после `<head>`)
- Gated Clarity — все 50 HTML
- Banner logic — `/js/main.js` (секция "Cookie banner + Google Consent Mode v2")
