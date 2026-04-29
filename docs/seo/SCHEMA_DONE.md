# Schema rollout — статус по шагу 2 (2.2 + 2.3)

Дата: 2026-04-29.

## Шаг 2.3 — index.html

`Service` node на `index.html` получил `"@id": "https://levashou.pl/#service"` (одна строка).

`WebSite` node уже существовал с `"@id": "https://levashou.pl/#website"` — не трогали.

`Psychologist` node остался с прежним `"@id": "https://levashou.pl/#aliaksei"` (используется как author/publisher в 36 блог-постах, не переименовываем).

## Шаг 2.2 — WebPage JSON-LD на 21 тематическом лендинге

Каждому лендингу добавлен один `<script type="application/ld+json">` сразу после строки `<link rel="stylesheet" href="/css/style.min.css?v=77">`. Структура:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://levashou.pl/<file>#webpage",
      "url": "https://levashou.pl/<file>",
      "name": "<title из файла дословно>",
      "description": "<meta description из файла дословно>",
      "inLanguage": "ru" | "pl",
      "isPartOf": { "@id": "https://levashou.pl/#website" },
      "about": { "@id": "https://levashou.pl/#aliaksei" },
      "mainEntity": { "@id": "https://levashou.pl/#service" }
    }
  ]
}
```

`name` и `description` извлекались из файла на лету через perl-regex (не хардкод, не сочинение). `lang` определяется суффиксом `-pl` в имени файла.

### Список файлов (21)

| # | Файл | Язык | Schema добавлен | webpage_blocks |
|---|---|---|---|---|
| 1 | panic.html | ru | WebPage | 1 |
| 2 | anxiety.html | ru | WebPage | 1 |
| 3 | cptsd.html | ru | WebPage | 1 |
| 4 | ocd.html | ru | WebPage | 1 |
| 5 | gaslighting.html | ru | WebPage | 1 |
| 6 | psychosomatics.html | ru | WebPage | 1 |
| 7 | burnout-page.html | ru | WebPage | 1 |
| 8 | for-loved-ones.html | ru | WebPage | 1 |
| 9 | emigration.html | ru | WebPage | 1 |
| 10 | not-sure.html | ru | WebPage | 1 |
| 11 | cennik.html | ru | WebPage | 1 |
| 12 | panic-pl.html | pl | WebPage | 1 |
| 13 | anxiety-pl.html | pl | WebPage | 1 |
| 14 | cptsd-pl.html | pl | WebPage | 1 |
| 15 | ocd-pl.html | pl | WebPage | 1 |
| 16 | gaslighting-pl.html | pl | WebPage | 1 |
| 17 | psychosomatics-pl.html | pl | WebPage | 1 |
| 18 | burnout-page-pl.html | pl | WebPage | 1 |
| 19 | for-loved-ones-pl.html | pl | WebPage | 1 |
| 20 | not-sure-pl.html | pl | WebPage | 1 |
| 21 | cennik-pl.html | pl | WebPage | 1 |

Все 21 файл: ровно один WebPage-блок, дублей нет, идемпотентность проверена (`anxiety.html` была пропущена во втором запуске благодаря pre-check на `#webpage"`).

## MISSING DESCRIPTION

(none)

Все 21 файл имели валидное `<meta name="description">`. Placeholder `Описание скоро появится` нигде не использован.

## Что НЕ запускалось

- Шаг 2.4 (FAQPage) — отложен до ревью валидатором WebPage-блоков.
- Коммит — отложен до ручного ревью пользователем.

## Файлы, изменённые в этом шаге (22 файла)

- `index.html` — добавлен `@id` к Service node.
- 21 тематический лендинг — добавлен WebPage JSON-LD.

Готов к проверке через https://validator.schema.org/ и https://search.google.com/test/rich-results.
