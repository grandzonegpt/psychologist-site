# Schema plan для тематических лендингов

Шаг 2.1: инвентаризация. 21 файл (11 RU + 10 PL). Без правок, только данные.

Правило заполнения «FAQ-разметка нужна?»:
- **да** — `details_count >= 3`
- **проверить вручную** — `details_count` 1-2, или `faq_heading >= 1` при `details_count = 0`
- **нет** — всё по нулям

## Сводная таблица

| Файл | Язык | Тема (из `<title>`) | details_count | FAQ-разметка нужна? | Блок «О специалисте»? | `<title>` | meta description |
|---|---|---|---|---|---|---|---|
| panic.html | ru | Панические атаки. Психолог в Варшаве. Алексей Левашев | 4 | да | да | ✓ | ✓ |
| anxiety.html | ru | Тревога и тревожное расстройство. Психолог в Варшаве | 4 | да | да | ✓ | ✓ |
| cptsd.html | ru | Комплексное ПТСР (кПТСР). Психотравматолог Варшава | 3 | да | да | ✓ | ✓ |
| ocd.html | ru | ОКР: обсессивно-компульсивное расстройство. Варшава | 4 | да | да | ✓ | ✓ |
| gaslighting.html | ru | После газлайтинга и токсичных отношений. Психолог Варшава | 3 | да | да | ✓ | ✓ |
| psychosomatics.html | ru | Психосоматика и нарушения сна. Психолог Варшава | 3 | да | да | ✓ | ✓ |
| burnout-page.html | ru | Выгорание. Психолог в Варшаве | 4 | да | да | ✓ | ✓ |
| for-loved-ones.html | ru | Для тех, кто рядом: как поддержать при тревоге и травме | 1 | проверить вручную | нет | ✓ | ✓ |
| emigration.html | ru | Адаптация в эмиграции. Психолог в Варшаве, онлайн | 4 | да | да | ✓ | ✓ |
| not-sure.html | ru | Не уверен, что мне нужен психолог | 1 | проверить вручную | нет | ✓ | ✓ |
| cennik.html | ru | Цены. Сессия онлайн 180 PLN. Алексей Левашев | 1 | проверить вручную | нет | ✓ | ✓ |
| panic-pl.html | pl | Napady paniki. Psycholog Warszawa. Aliaksei Levashou | 4 | да | да | ✓ | ✓ |
| anxiety-pl.html | pl | Lęk i zaburzenia lękowe. Psycholog Warszawa | 4 | да | да | ✓ | ✓ |
| cptsd-pl.html | pl | Złożony PTSD (cPTSD). Psychotraumatolog Warszawa | 3 | да | да | ✓ | ✓ |
| ocd-pl.html | pl | OCD: zaburzenie obsesyjno-kompulsyjne. Psycholog Warszawa | 4 | да | да | ✓ | ✓ |
| gaslighting-pl.html | pl | Po gaslightingu i toksycznych relacjach. Psycholog Warszawa | 3 | да | да | ✓ | ✓ |
| psychosomatics-pl.html | pl | Psychosomatyka i zaburzenia snu. Psycholog Warszawa | 3 | да | да | ✓ | ✓ |
| burnout-page-pl.html | pl | Wypalenie zawodowe. Psycholog Warszawa | 4 | да | да | ✓ | ✓ |
| for-loved-ones-pl.html | pl | Dla bliskich: jak wesprzeć osobę z lękiem lub traumą | 1 | проверить вручную | нет | ✓ | ✓ |
| not-sure-pl.html | pl | Nie wiem, czy potrzebuję psychologa | 1 | проверить вручную | нет | ✓ | ✓ |
| cennik-pl.html | pl | Cennik. Sesja online 180 PLN. Aliaksei Levashou | 1 | проверить вручную | нет | ✓ | ✓ |

## Группировка для шага 2.2 / 2.4

### WebPage JSON-LD (шаг 2.2): на ВСЕ 21 файл

Каждый получает компактный `<script type="application/ld+json">` с `WebPage` через `@graph`, ссылающийся на `#person`, `#service`, `#website` с index.

### FAQPage JSON-LD (шаг 2.4): на 15 файлов с `details >= 3`

**RU (8):** panic, anxiety, cptsd, ocd, gaslighting, psychosomatics, burnout-page, emigration
**PL (7):** panic-pl, anxiety-pl, cptsd-pl, ocd-pl, gaslighting-pl, psychosomatics-pl, burnout-page-pl

### «Проверить вручную» (6 файлов): for-loved-ones, not-sure, cennik (RU + PL)

У всех `details_count = 1` без FAQ-заголовка. Скорее всего это `<details class="nav-dropdown">` в навигации (раскрывающееся меню «Материалы»), а не FAQ. Это значит на этих 6 страницах FAQ-блока нет вообще. Решаю не сейчас, а после того как ты посмотришь HTML вокруг этого `<details>` на каждом из 6 файлов (см. ниже).

## Замечание по числу 22 vs 21

Я насчитал 21 файл (11 RU + 10 PL), ты упоминал 22. Возможные кандидаты на 22-й:
- `practices.html` / `practices-pl.html` (индекс практик, но без явной темы и без FAQ)
- `library.html` / `library-pl.html` (каталог книг, не лендинг)
- `tests.html` / `tests-pl.html` (самотесты, у них своя структура)
- `glossary.html` / `glossary-pl.html` (словарь терминов)

Если хочешь — добавлю их в скоуп. Сейчас они не включены потому что больше похожи на служебные/контентные страницы чем на тематические лендинги.

## Что покажу для «проверить вручную» по запросу

По каждому из 6 файлов (for-loved-ones, not-sure, cennik × RU/PL) могу прислать фрагмент HTML вокруг единственного `<details>` чтобы убедиться что это nav-dropdown а не FAQ.

Жду подтверждения и команды:
1. Идти на 21 файл (11+10) или включить ещё 4 PL пары для общего числа 22?
2. Показать HTML вокруг `<details>` на 6 «вручную» файлах, или поверить что это nav-dropdown и пропустить FAQPage на них?
