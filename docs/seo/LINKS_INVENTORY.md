# Internal-links inventory — шаг 3.1.1

Дата: 2026-04-29. Задача: посчитать, на каких файлах уже есть блок перелинковки «Читайте по теме / Powiązane materiały / related-articles» и т.п. Только grep, ничего не меняем.

Регулярка покрывает паттерны:
- RU: `Читайте по теме`, `Читай также`, `Похожие темы`, `Связанные материалы`
- PL: `Czytaj na ten temat`, `Powiązane materiały`, `Podobne tematy`
- HTML классы: `related-articles`, `related-posts`, `related-links`

Каунт = число строк, на которых матчится шаблон (case-insensitive). 0 = блока нет.

## Полная таблица (57 файлов)

| Файл | Категория | existing_links_block |
|---|---|---|
| panic.html | landing-ru | 2 |
| anxiety.html | landing-ru | 2 |
| cptsd.html | landing-ru | 2 |
| ocd.html | landing-ru | 2 |
| gaslighting.html | landing-ru | 2 |
| psychosomatics.html | landing-ru | 2 |
| burnout-page.html | landing-ru | 2 |
| for-loved-ones.html | landing-ru | 0 |
| emigration.html | landing-ru | 2 |
| not-sure.html | landing-ru | 0 |
| cennik.html | landing-ru | 0 |
| panic-pl.html | landing-pl | 2 |
| anxiety-pl.html | landing-pl | 2 |
| cptsd-pl.html | landing-pl | 1 |
| ocd-pl.html | landing-pl | 1 |
| gaslighting-pl.html | landing-pl | 1 |
| psychosomatics-pl.html | landing-pl | 1 |
| burnout-page-pl.html | landing-pl | 2 |
| for-loved-ones-pl.html | landing-pl | 0 |
| not-sure-pl.html | landing-pl | 0 |
| cennik-pl.html | landing-pl | 0 |
| blog/anxiety-disorder.html | blog-ru | 1 |
| blog/breakup.html | blog-ru | 1 |
| blog/burnout.html | blog-ru | 1 |
| blog/cbt.html | blog-ru | 1 |
| blog/choosing-therapist.html | blog-ru | 1 |
| blog/codependency.html | blog-ru | 1 |
| blog/cognitive-distortions.html | blog-ru | 1 |
| blog/emigration-anxiety.html | blog-ru | 1 |
| blog/flashbacks.html | blog-ru | 1 |
| blog/gaslighting.html | blog-ru | 1 |
| blog/grounding.html | blog-ru | 1 |
| blog/intrusive-thoughts.html | blog-ru | 1 |
| blog/it-burnout.html | blog-ru | 1 |
| blog/night-panic.html | blog-ru | 1 |
| blog/panic-attacks.html | blog-ru | 1 |
| blog/ptsd.html | blog-ru | 1 |
| blog/sleep.html | blog-ru | 1 |
| blog/social-anxiety.html | blog-ru | 1 |
| blog-pl/anxiety-disorder.html | blog-pl | 1 |
| blog-pl/breakup.html | blog-pl | 1 |
| blog-pl/burnout.html | blog-pl | 1 |
| blog-pl/cbt.html | blog-pl | 1 |
| blog-pl/choosing-therapist.html | blog-pl | 1 |
| blog-pl/codependency.html | blog-pl | 1 |
| blog-pl/cognitive-distortions.html | blog-pl | 1 |
| blog-pl/emigration-anxiety.html | blog-pl | 1 |
| blog-pl/flashbacks.html | blog-pl | 1 |
| blog-pl/gaslighting.html | blog-pl | 1 |
| blog-pl/grounding.html | blog-pl | 1 |
| blog-pl/intrusive-thoughts.html | blog-pl | 1 |
| blog-pl/it-burnout.html | blog-pl | 1 |
| blog-pl/night-panic.html | blog-pl | 1 |
| blog-pl/panic-attacks.html | blog-pl | 1 |
| blog-pl/ptsd.html | blog-pl | 1 |
| blog-pl/sleep.html | blog-pl | 1 |
| blog-pl/social-anxiety.html | blog-pl | 1 |

## Сводка

- **Всего файлов:** 57 (21 лендинг + 36 блог-постов)
- **С существующим блоком (>0):** 51
- **Без блока (=0):** 6

### Группировка «без блока» (6 файлов)

Все 6 — это парные файлы из 3 «утилитарных» лендингов RU+PL:
- `for-loved-ones.html` / `for-loved-ones-pl.html` (для близких)
- `not-sure.html` / `not-sure-pl.html` (не уверен, нужен ли психолог)
- `cennik.html` / `cennik-pl.html` (цены)

Это то же самое, что в Группе D + E из шага 2 (плюс for-loved-ones из Группы D без cennik).

### Группировка «с блоком»

| Категория | Кол-во | Каунт распределение |
|---|---|---|
| landing-ru | 8 из 11 | все по 2 матча |
| landing-pl | 7 из 10 | 4 файла по 2 матча, 4 по 1 |
| blog-ru | 18 из 18 | все по 1 матчу |
| blog-pl | 18 из 18 | все по 1 матчу |

### Замечания по различию count=1 vs count=2

На большинстве RU-лендингов count=2 — вероятно матчится в 2 разных местах (например, и `related-articles` в верстке, и текстовый заголовок «Связанные материалы»). PL-лендинги cptsd-pl/ocd-pl/gaslighting-pl/psychosomatics-pl показывают count=1 — у них может не быть текстового заголовка, только класс. Для шага 3.1.2 нужно посмотреть фактический HTML на этих файлах чтобы понять состав блока.

### Что НЕ покрыл grep

- Inline-ссылки внутри параграфов (типа `<a href="/cptsd.html">кПТСР</a>` посреди текста) не учтены — они не имеют заголовка и не попадают под регулярку. Это отдельный класс перелинковки.
- Author cards с внешними ссылками (на cal.com и т.п.) тоже не входят в скоуп.
- Навигационное меню «Материалы» в навбаре — структурная навигация, не related-block, не считается.

Жду ОК. Дальше — шаг 3.1.2 (детальный осмотр существующих блоков на нескольких файлах для понимания формата).
