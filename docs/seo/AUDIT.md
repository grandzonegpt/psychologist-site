# SEO Audit — levashou.pl

Дата: 2026-04-29. Цель: понять причину что 54 из ~80 страниц не индексируются Google. Этот документ — только аудит, без правок.

## 1. Тип сайта и инструменты сборки

**Static HTML, served by Express.js.** Никакого SSG/шаблонизатора нет:

- `package.json` объявляет один скрипт `start: node server.js` и одну зависимость `express`.
- `server.js` — простой Express, отдает `assets/`, `css/`, `js/` со статическим long-cache, и HTML-файлы как есть с корня и подпапок `blog/`, `blog-pl/`.
- Нет `_config.yml` (Jekyll), нет `astro.config.*`, нет `next.config.*`, нет `hugo.toml`, нет `eleventy.config.*` или `11ty.config.*`. Только Node + Express.
- Деплой через Railway → GitHub `grandzonegpt/psychologist-site` main.
- Кеш статики через Cloudflare (CDN), отсюда правило bump query `?v=N` на каждом изменении CSS/JS.
- `robots.txt` разрешает всё и ссылается на `https://levashou.pl/sitemap.xml`.
- `sitemap.xml` ведётся вручную, содержит 79 уникальных URL (соответствует 80 HTML файлам минус `404.html`, что корректно).

Шаблонизатора нет → каждое изменение `<head>` нужно вносить во все файлы вручную или через `perl -i -pe`. Это ключевой контекст для всех будущих SEO-правок.

## 2. Инвентаризация всех HTML страниц (80 файлов)

### 2.1 Корневые лендинги, RU (12)

Главная и тематические:
- `index.html` (главная)
- `panic.html` (панические атаки)
- `anxiety.html` (тревожное расстройство)
- `cptsd.html` (комплексное ПТСР)
- `ocd.html` (ОКР)
- `gaslighting.html` (последствия газлайтинга)
- `psychosomatics.html` (психосоматика и бессонница)
- `burnout-page.html` (выгорание)
- `for-loved-ones.html` (для близких)
- `emigration.html` (адаптация в эмиграции, RU only — пары PL нет)
- `not-sure.html` (не уверен, нужна ли терапия)
- `cennik.html` (цены)

### 2.2 Корневые лендинги, PL (11)

Парные к RU кроме `emigration`:
- `index-pl.html`, `panic-pl.html`, `anxiety-pl.html`, `cptsd-pl.html`, `ocd-pl.html`, `gaslighting-pl.html`, `psychosomatics-pl.html`, `burnout-page-pl.html`, `for-loved-ones-pl.html`, `not-sure-pl.html`, `cennik-pl.html`

### 2.3 Блог RU (`/blog/`, 18 статей)

`anxiety-disorder.html`, `breakup.html`, `burnout.html`, `cbt.html`, `choosing-therapist.html`, `codependency.html`, `cognitive-distortions.html`, `emigration-anxiety.html`, `flashbacks.html`, `gaslighting.html`, `grounding.html`, `intrusive-thoughts.html`, `it-burnout.html`, `night-panic.html`, `panic-attacks.html`, `ptsd.html`, `sleep.html`, `social-anxiety.html`

Плюс корневая `blog.html` (индекс блога) и `blog/feed.xml` (RSS).

### 2.4 Блог PL (`/blog-pl/`, 18 статей)

Имена файлов идентичны RU. Плюс корневая `blog-pl.html` (индекс) и `blog-pl/feed.xml`.

### 2.5 Практики (короткие гайды-упражнения)

RU (3):
- `box-breathing.html`, `breathing-4-7-8.html`, `grounding-5-4-3-2-1.html`

PL (3):
- `box-breathing-pl.html`, `breathing-4-7-8-pl.html`, `grounding-5-4-3-2-1-pl.html`

Плюс корневая `practices.html` / `practices-pl.html` (индекс практик).

### 2.6 Служебные

RU:
- `library.html` (библиотека книг и материалов)
- `glossary.html` (глоссарий терминов)
- `tests.html` (самотесты)
- `privacy.html` (политика конфиденциальности)
- `regulamin.html` (регламент / regulamin)
- `404.html` (не в sitemap, корректно)

PL аналоги: `library-pl.html`, `glossary-pl.html`, `tests-pl.html`, `privacy-pl.html`, `regulamin-pl.html`.

### 2.7 Итого по группам

| Группа | RU | PL | Всего |
|---|---|---|---|
| Корневые лендинги | 12 | 11 | 23 |
| Блог-индексы | 1 | 1 | 2 |
| Блог-статьи | 18 | 18 | 36 |
| Практики (включая индекс) | 4 | 4 | 8 |
| Служебные | 6 | 5 | 11 |
| **Итого** | **41** | **39** | **80** |

## 3. Тематические пары "лендинг ↔ статья блога"

Найденные сюжетные связки. У некоторых лендингов несколько релевантных статей.

| Лендинг RU/PL | Связанные статьи блога RU/PL |
|---|---|
| `panic.html` / `panic-pl.html` | `blog/panic-attacks.html`, `blog/night-panic.html` (+ PL) |
| `anxiety.html` / `anxiety-pl.html` | `blog/anxiety-disorder.html`, `blog/social-anxiety.html` (+ PL) |
| `burnout-page.html` / `burnout-page-pl.html` | `blog/burnout.html`, `blog/it-burnout.html` (+ PL) |
| `ocd.html` / `ocd-pl.html` | `blog/intrusive-thoughts.html` (+ PL) |
| `gaslighting.html` / `gaslighting-pl.html` | `blog/gaslighting.html`, `blog/codependency.html` (+ PL) |
| `cptsd.html` / `cptsd-pl.html` | `blog/ptsd.html`, `blog/flashbacks.html` (+ PL) |
| `emigration.html` (RU only) | `blog/emigration-anxiety.html`, `blog-pl/emigration-anxiety.html` |
| `psychosomatics.html` / `psychosomatics-pl.html` | `blog/sleep.html` (+ PL) |
| `not-sure.html` / `not-sure-pl.html` | `blog/choosing-therapist.html`, `blog/cbt.html` (+ PL) |
| `for-loved-ones.html` / `for-loved-ones-pl.html` | `blog/breakup.html`, `blog/codependency.html` (+ PL — пересекается с gaslighting) |

Статьи без явного парного лендинга:
- `blog/cognitive-distortions.html` (общий обзор, можно прицепить к anxiety или not-sure)
- `blog/grounding.html` (про технику заземления, можно прицепить к panic, но логичнее к practices)

## 4. Состояние head-секций (по 4 прочитанным файлам)

### 4.1 Что есть на ВСЕХ четырёх

Идентично:
- `<!DOCTYPE html>` + корректный `lang="ru"` или `lang="pl"`
- Google Consent Mode v2 (default denied, region EEA+PL)
- GA4 (`G-48BN8FG5NG`)
- `<meta charset="UTF-8">`, `<meta name="viewport">`, `<meta name="theme-color">`
- `<title>`, `<meta name="description">`
- `<link rel="canonical">`
- `<link rel="alternate" hreflang>` (ru, pl, x-default)
- Open Graph (`og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:locale`)
- `<meta name="twitter:card">`
- Favicon, font preconnects, шрифт Inter+Cormorant
- `<link rel="stylesheet" href="/css/style.min.css?v=NN">`
- Microsoft Clarity (gated by consent)
- MailerLite Universal

### 4.2 `index.html` — самая богатая структурными данными

Пять JSON-LD блоков:
1. `Psychologist` (с credentials, sameAs, address, knowsAbout, member of PTTPB)
2. `WebSite` (with @id reference)
3. `MedicalBusiness`
4. `FAQPage` (12 Q&A)
5. `Service` (psychotherapy online)

Это эталонный объём structured data для главной.

### 4.3 `panic.html` — лендинг по симптому, ПОЛНОЕ ОТСУТСТВИЕ JSON-LD

Только базовое meta + canonical + hreflang + og. **Никаких `<script type="application/ld+json">`** между `</head>` и `<body>`.

То же самое (по выборке + памяти из прошлых задач) применимо ко всем 22 другим тематическим лендингам RU/PL: `anxiety`, `cptsd`, `ocd`, `gaslighting`, `psychosomatics`, `burnout-page`, `for-loved-ones`, `emigration`, `not-sure`, `cennik` (и PL пары). На лендинге уже физически присутствует FAQ-аккордеон (`<details><summary>...`) и блок "О специалисте", но эти данные не выдаются Google в виде разметки.

Что отсутствует на лендингах:
- `BreadcrumbList` (важно для SERP rich snippets и пути crawl)
- `MedicalCondition` или `MedicalWebPage` (тематический сигнал для медицинских поисков)
- `FAQPage` (хотя FAQ-блок физически на странице есть)
- `Service` (price + provider per landing)
- Ссылка `@id` на главного `Psychologist` (`https://levashou.pl/#aliaksei`)

### 4.4 `blog/panic-attacks.html` и `blog-pl/panic-attacks.html` — блог

Два JSON-LD блока:
1. `BlogPosting` (с `datePublished`, `dateModified`, `author @id`, `publisher @id`, `inLanguage`, `mainEntityOfPage`)
2. `BreadcrumbList` (Главная → Блог → статья)

Что есть в блоге, но нет на лендингах: `BreadcrumbList` + ссылочная связка `@id` с главным `Psychologist`.

Что отсутствует и в блоге:
- `Article.image` или `BlogPosting.image` (SERP может не показать карточку)
- `wordCount` (мелочь)
- `articleBody` (Google и так парсит, но явное хорошо для structured signals)
- `Speakable` schema (опционально, для Google Assistant)
- Связь со связанным лендингом через `mentions` или `about` (могло бы дать topical authority)

### 4.5 Расхождение версий статики между папками

При проверке версий ассетов:

| Папка | `style.min.css` | `main.min.js` |
|---|---|---|
| Корень + `blog/` | `?v=77` | `?v=20` |
| `blog-pl/` (18 файлов) | **`?v=76`** | **`?v=18`** |

Все 18 PL-блог-постов отстают по версиям ассетов на 1-2 итерации. На индексацию напрямую не влияет, но Googlebot может видеть рассогласованную верстку (например, без light-theme button fix v=77 кнопки выглядят сломано в светлой теме на этих 18 страницах). Скрипт bump бамперов в прошлых сессиях шёл по `*.html blog/*.html` и пропустил `blog-pl/*.html`.

## 5. Гипотезы по 54 неиндексируемым страницам

На основе аудита:

1. **Самая вероятная причина**: 22 тематических лендинга (RU+PL) не имеют JSON-LD кроме унаследованных мета-тегов. У Google могут быть сигналы "thin content" / "duplicate content" если лендинги структурно очень похожи между собой (одна и та же структура блоков с подменой темы) и не отличаются structured data. Особенно если `description` слишком похожи или `og:image` одна на всех.

2. **Соотношение ассетов**: 18 PL-блог-постов на старой версии стилей могут отдавать визуально отличную или полусломанную страницу. Это не блокирует индексацию, но может занижать Quality Score.

3. **Bot Fight Mode** (по памяти отключён пользователем недавно) — если был ON долго, Googlebot мог получить накопленный backlog "блокированных запросов". Свежеотключённый Bot Fight Mode не означает мгновенной индексации; нужно время + Request Indexing.

4. **Sitemap корректен** (79 URL, без дублей, все файлы кроме 404.html включены). Tут проблем нет.

5. **`hreflang` reciprocal**: на всех проверенных файлах двусторонние пары есть. Это не блокирует.

6. **Canonical** на всех 4 файлах указывает на саму себя. Это правильно. Конфликта canonical-vs-alternate нет.

## 6. Что предлагаю готовить к следующим шагам

Не делаю сейчас, фиксирую для следующих этапов:

- **Шаг 2 кандидат**: добавить `BreadcrumbList` + `MedicalWebPage`/`MedicalCondition` + `FAQPage` schema на 22 тематических лендинга (по одной паре RU/PL за итерацию).
- **Шаг 3 кандидат**: подтянуть версии ассетов в `blog-pl/` (CSS v=76→77, main.js v=18→20) — выровнять с остальным сайтом.
- **Шаг 4 кандидат**: добавить `image` в `BlogPosting` schema + связку `about`/`mentions` со связанным лендингом для topic authority.
- **Шаг 5 кандидат**: в Google Search Console — Request Indexing на топ-страницы, мониторинг Coverage report до и после.

Жду подтверждения и следующего шага.
