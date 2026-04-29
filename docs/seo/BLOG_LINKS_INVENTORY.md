# Blog → landing links inventory — шаг 3.2.2

Дата: 2026-04-29. Цель: на каждом из 36 блог-постов посчитать ссылки на тематические лендинги, понять контекст вставки и наличие пары.

## Методика

- **Тематические лендинги** — список из 21 файла: panic, anxiety, cptsd, ocd, gaslighting, psychosomatics, burnout-page, emigration, for-loved-ones, not-sure, cennik (RU+PL пары; emigration только RU).
- **Контекст** определялся по ближайшему `<div|aside|section|p>` с атрибутом `class` за 5 строк до ссылки.
- **Контексты, ИСКЛЮЧЁННЫЕ из «реальных тематических ссылок»**:
  - `nav-links` — навигационное меню «Цены / Cennik», есть на каждой PL-странице, не контекстная ссылка
  - `social-row` — автор-карточка со ссылкой на `/index-pl.html#about`, не контекстная ссылка на лендинг (хотя index формально считается главной)
  - Пустой контекст `cennik-pl.html` в нижней части страниц — это footer/global, не контекстная связь
- **«Реальная» ссылка на лендинг** = `<div class="post-cta">` или похожий контентный блок внутри текста статьи.

## Парные лендинги (mapping)

| Блог-пост | Парный лендинг |
|---|---|
| panic-attacks | panic |
| anxiety-disorder | anxiety |
| ptsd | cptsd |
| intrusive-thoughts | ocd |
| burnout | burnout-page |
| it-burnout | burnout-page |
| gaslighting | gaslighting |
| emigration-anxiety | emigration (RU only — PL пары лендинга нет) |
| night-panic | panic |
| social-anxiety | anxiety |
| sleep | psychosomatics |
| grounding | psychosomatics или cptsd (двойная привязка) |
| flashbacks | cptsd |
| breakup | for-loved-ones или gaslighting |
| codependency | for-loved-ones или gaslighting |
| choosing-therapist | not-sure |
| cbt | НЕТ парного лендинга |
| cognitive-distortions | НЕТ парного лендинга |

## Таблица RU блога (18 постов)

| Файл | Real links | Контекст | Парный лендинг | Есть ссылка на парный? |
|---|---|---|---|---|
| anxiety-disorder.html | 1 | post-cta → /anxiety.html | anxiety | ✓ |
| breakup.html | 0 | — | for-loved-ones / gaslighting | ✗ |
| burnout.html | 1 | post-cta → /burnout-page.html | burnout-page | ✓ |
| cbt.html | 0 | — | (нет парного) | n/a |
| choosing-therapist.html | 0 | — | not-sure | ✗ |
| codependency.html | 1 | post-cta → /gaslighting.html | for-loved-ones / gaslighting | ✓ (gaslighting) |
| cognitive-distortions.html | 0 | — | (нет парного) | n/a |
| emigration-anxiety.html | 0 | — | emigration | ✗ |
| flashbacks.html | 1 | post-cta → /cptsd.html | cptsd | ✓ |
| gaslighting.html | 1 | post-cta → /gaslighting.html | gaslighting | ✓ |
| grounding.html | 0 | — | psychosomatics / cptsd | ✗ |
| intrusive-thoughts.html | 1 | post-cta → /ocd.html | ocd | ✓ |
| it-burnout.html | 0 | — | burnout-page | ✗ |
| night-panic.html | 0 | — | panic | ✗ |
| panic-attacks.html | 1 | post-cta → /panic.html | panic | ✓ |
| ptsd.html | 1 | post-cta → /cptsd.html | cptsd | ✓ |
| sleep.html | 1 | post-cta → /psychosomatics.html | psychosomatics | ✓ |
| social-anxiety.html | 0 | — | anxiety | ✗ |

## Таблица PL блога (18 постов)

PL-блог имеет 2 «глобальных» вставки `cennik-pl.html` на каждой странице — в `nav-links` (меню) и в неизвестном контексте (вероятно footer). Эти ссылки исключены из колонки «Real links».

| Файл | Real links | Контекст | Парный лендинг | Есть ссылка на парный? |
|---|---|---|---|---|
| anxiety-disorder.html | 1 | post-cta → /anxiety-pl.html | anxiety-pl | ✓ |
| breakup.html | 0 | — (только nav+social-row #about) | for-loved-ones-pl / gaslighting-pl | ✗ |
| burnout.html | 1 | post-cta → /burnout-page-pl.html | burnout-page-pl | ✓ |
| cbt.html | 0 | — | (нет парного) | n/a |
| choosing-therapist.html | 0 | — | not-sure-pl | ✗ |
| codependency.html | 1 | post-cta → /gaslighting-pl.html | for-loved-ones-pl / gaslighting-pl | ✓ (gaslighting) |
| cognitive-distortions.html | 0 | — | (нет парного) | n/a |
| emigration-anxiety.html | 0 | — | emigration-pl не существует | n/a |
| flashbacks.html | 1 | post-cta → /cptsd-pl.html | cptsd-pl | ✓ |
| gaslighting.html | 1 | post-cta → /gaslighting-pl.html | gaslighting-pl | ✓ |
| grounding.html | 0 | — | psychosomatics-pl / cptsd-pl | ✗ |
| intrusive-thoughts.html | 1 | post-cta → /ocd-pl.html | ocd-pl | ✓ |
| it-burnout.html | 0 | — | burnout-page-pl | ✗ |
| night-panic.html | 0 | — | panic-pl | ✗ |
| panic-attacks.html | 1 | post-cta → /panic-pl.html | panic-pl | ✓ |
| ptsd.html | 1 | post-cta → /cptsd-pl.html | cptsd-pl | ✓ |
| sleep.html | 1 | post-cta → /psychosomatics-pl.html | psychosomatics-pl | ✓ |
| social-anxiety.html | 0 | — | anxiety-pl | ✗ |

## Сводка (36 блог-постов)

### Распределение по статусу парной ссылки

| Статус | RU | PL | Итого |
|---|---|---|---|
| Есть ссылка на парный лендинг | 9 | 9 | 18 |
| Парный лендинг есть, ссылки нет (gap) | 7 | 6 | 13 |
| Парного лендинга по дизайну нет (cbt, cognitive-distortions, emigration-anxiety-pl) | 2 | 3 | 5 |
| **Итого** | **18** | **18** | **36** |

### Все 18 постов «с парной ссылкой» используют ОДИН паттерн

`<div class="post-cta">` с одной ссылкой на лендинг внутри предложения «Посмотри как я работаю с …», плюс две кнопки рядом (`#booking`, бесплатное знакомство). Это уже стандарт. mid-CTA на середине статьи никуда на лендинги не ведёт, только на cal.com.

### 13 «gap-постов» (где парный есть, но ссылки нет)

**RU (7):**
- breakup → for-loved-ones / gaslighting
- choosing-therapist → not-sure
- emigration-anxiety → emigration
- grounding → psychosomatics / cptsd
- it-burnout → burnout-page
- night-panic → panic
- social-anxiety → anxiety

**PL (6, без emigration-anxiety так как emigration-pl не существует):**
- breakup-pl → for-loved-ones-pl / gaslighting-pl
- choosing-therapist-pl → not-sure-pl
- grounding-pl → psychosomatics-pl / cptsd-pl
- it-burnout-pl → burnout-page-pl
- night-panic-pl → panic-pl
- social-anxiety-pl → anxiety-pl

### 5 постов «без парного лендинга по дизайну»

- blog/cbt.html, blog-pl/cbt.html — общая тема о методе
- blog/cognitive-distortions.html, blog-pl/cognitive-distortions.html — общая тема
- blog-pl/emigration-anxiety.html — emigration-pl-лендинга не существует (emigration был сделан только на RU)

## Замечания

- **mid-CTA** на середине каждой статьи всегда ведёт на cal.com (free intro), не на лендинг. Это конверсионный, не SEO-элемент.
- **post-cta** ведёт на лендинг — это и есть контекстная ссылка которую мы инвентаризируем.
- **Связка post-cta → лендинг** работает на 18/36 постов. На остальных 13 (gap) она физически возможна, но не сделана.
- **5 постов без пары** — не нужно ничего добавлять, это норма.

## Что дальше

Для шага 3.x кандидаты:
- Добавить post-cta на 13 gap-постов с ссылкой на парный лендинг (или для двойных — на оба)
- На 18 уже-связанных постов проверить что ссылка корректная и не сломается
- 5 без пары не трогать

Жду команду на шаг 3.2.3.
