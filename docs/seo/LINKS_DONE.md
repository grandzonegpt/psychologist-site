# Blog → landing links rollout — шаг 3.2.3

Дата: 2026-04-29.

## Что сделано

На 13 gap-постах в `<div class="post-cta">` после существующего `<p>` (с уникальным описательным текстом) вставлен второй `<p>` со ссылкой на парный тематический лендинг. Кнопки и `<h3>` не тронуты.

Шаблон вставки:
- **RU:** `<p>Посмотри <a href="/[лендинг]">[текст]</a> или запишись на консультацию.</p>`
- **PL:** `<p>Zobacz <a href="/[лендинг]">[текст]</a> lub umów się na konsultację.</p>`

## Финальная grep-проверка

| # | Файл | Лендинг | links |
|---|---|---|---|
| 1 | blog/breakup.html | /gaslighting.html | 1 |
| 2 | blog/choosing-therapist.html | /not-sure.html | 1 |
| 3 | blog/emigration-anxiety.html | /emigration.html | 1 |
| 4 | blog/grounding.html | /psychosomatics.html | 1 |
| 5 | blog/it-burnout.html | /burnout-page.html | 1 |
| 6 | blog/night-panic.html | /panic.html | 1 |
| 7 | blog/social-anxiety.html | /anxiety.html | 1 |
| 8 | blog-pl/breakup.html | /gaslighting-pl.html | 1 |
| 9 | blog-pl/choosing-therapist.html | /not-sure-pl.html | 1 |
| 10 | blog-pl/grounding.html | /psychosomatics-pl.html | 1 |
| 11 | blog-pl/it-burnout.html | /burnout-page-pl.html | 1 |
| 12 | blog-pl/night-panic.html | /panic-pl.html | 1 |
| 13 | blog-pl/social-anxiety.html | /anxiety-pl.html | 1 |

**Все 13 файлов:** ровно `links=1`. Дублей нет, пропусков нет.

## Тексты ссылок (точные формулировки)

### RU (7 файлов)

| Файл | Текст ссылки |
|---|---|
| blog/breakup.html | как я работаю с последствиями токсичных отношений |
| blog/choosing-therapist.html | если ты не уверен, нужен ли тебе психолог |
| blog/emigration-anxiety.html | как я работаю с адаптацией после переезда |
| blog/grounding.html | как я работаю с психосоматикой и нарушениями сна |
| blog/it-burnout.html | как я работаю с выгоранием |
| blog/night-panic.html | как я работаю с паническими атаками |
| blog/social-anxiety.html | как я работаю с тревогой и социальной тревожностью |

### PL (6 файлов)

| Файл | Текст ссылки |
|---|---|
| blog-pl/breakup.html | jak pracuję z konsekwencjami toksycznych relacji |
| blog-pl/choosing-therapist.html | jeśli nie masz pewności, czy potrzebujesz psychologa |
| blog-pl/grounding.html | jak pracuję z psychosomatyką i zaburzeniami snu |
| blog-pl/it-burnout.html | jak pracuję z wypaleniem |
| blog-pl/night-panic.html | jak pracuję z napadami paniki |
| blog-pl/social-anxiety.html | jak pracuję z lękiem i lękiem społecznym |

## Идемпотентность

Перед каждой вставкой делалась проверка `grep -c 'href="/<лендинг>"'`. Все 13 файлов имели pre-count = 0 (новых ссылок до вставки не было). После вставки count = 1 везде.

Если этот шаг будет запущен повторно — Edit упадёт с ошибкой «old_string already replaced» (потому что прежнего варианта `<p>...</p><a href="/#booking">` без вставки больше нет), что корректно блокирует дубли.

## Не сделано (5 постов без парного лендинга по дизайну)

- blog/cbt.html, blog-pl/cbt.html — общая тема о методе
- blog/cognitive-distortions.html, blog-pl/cognitive-distortions.html — общая тема
- blog-pl/emigration-anxiety.html — у emigration нет PL-парной страницы (emigration RU only)

Эти 5 файлов оставлены без вставки, как и планировалось.

## Что дальше

- Не коммитить.
- При желании прогнать выборочно `git diff blog/breakup.html` или другой файл для ручного ревью.
- После ревью — коммит на 13 файлов с сообщением вида `feat(seo): add post-cta link from blog posts to parallel landings`.
