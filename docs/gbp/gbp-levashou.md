# GBP spec · Aliaksei Levashou (levashou.pl)

> Сгенерировано по плейбуку GBP Setup. Вставляй секции в Google Business Profile.
> ⚠️ Поля с TODO заполни сам. Категории/атрибуты подтверди в автокомплите GBP (не выдумывать).
> Профиль: Service Area Business (адрес скрыт), существующий, оптимизация.

---

## 1. Identity

```yaml
legal_name: "GoalCoach - Aliaksei Levashou"   # działalność gospodarcza
dba_name: "Aliaksei Levashou"                 # имя на карточке (БЕЗ ключей в названии)
year_founded: "2017"        # TODO подтвердить: опыт с 2017; если działalność позже, ставь дату działalności
founders: ["Aliaksei Levashou"]
website: "https://levashou.pl"
address: "pl. Bankowy 2, 00-095 Warszawa"     # адрес верификации, СКРЫТ (SAB)
address_visible: false       # Service Area Business — адрес не показывается
phone: ""                    # TODO: телефон с кодом (+48 ...) — GBP его требует
```

**Правила/заметки:**
- ❌ Не добавляй ключи в название («Aliaksei Levashou psycholog Warszawa» = риск бана). Только имя.
- ✅ SAB: адрес скрыт, на карте показывается зона обслуживания, не точка.
- ⚠️ Нужен телефон. Если не хочешь личный, можно отдельный номер/виртуальный.

---

## 2. Categories

```yaml
primary_category: "Psychologist"     # рекомендую: точно под mgr psychologii SWPS
secondary_categories:
  - "Psychotherapist"   # ОПЦИОНАЛЬНО — добавляй, только если сам решишь (статус CBT в процессе)
  - "Counselor"
  - "Mental health service"
  - "Family counselor"  # только если реально работаешь с парами/семьями; иначе убрать
```

**Правила:**
- Primary — главный фактор ранжирования. Подтверди «Psychologist» в автокомплите GBP.
- 🎯 Сначала проверь в автокомплите GBP, есть ли **«Psychotraumatologist»** (или «Trauma therapy»). У тебя завершённый диплом психотравматолога SWPS + ключ «psychotraumatolog warszawa» = 260/мес при почти нулевой конкуренции. Если такая категория есть — бери её primary, это твоё сильнейшее попадание. Если нет — оставляй «Psychologist», а психотравматологию вытягивай описанием и сервисом-ключом.
- Конкуренты: соло-терапевты используют Psychologist/Psychotherapist, центры (cbt.pl) — Mental health clinic. Тебе как соло — Psychologist.
- Не набивай 9 слотов мусором: у соло-психолога легитимных категорий 3-4. Лишние = размытие.
- ⚠️ «Psychotherapist» вторичной — на твоё усмотрение, с учётом правила про статус. Я бы пока не ставил, либо ставил и контролировал формулировки везде («podejście CBT», не «psychoterapeuta CBT»).

---

## 3. Services (target 30 · keyword-rich, ≤300 знаков · PL)

> name + Warszawa/online + дифференциатор + мягкий CTA. type: predefined (есть в автокомплите GBP) / custom (вводишь руками).

```yaml
services:
  - name: "Terapia lęku"
    description: "Terapia lęku uogólnionego i przewlekłego napięcia, online po polsku, rosyjsku i białorusku. Podejście CBT, praca z przyczyną, nie tylko objawem. Umów bezpłatne 15 minut."
    type: predefined
  - name: "Terapia napadów paniki"
    description: "Pomoc przy atakach paniki i lęku panicznym, online z Warszawy. Wyjaśniam mechanizm w ciele i uczę, co robić w ataku. Pierwsze spotkanie bezpłatne."
    type: predefined
  - name: "Terapia lęku społecznego"
    description: "Terapia fobii i lęku społecznego, online. U emigrantów nasila się przez barierę językową i kulturową. Podejście CBT. Konsultacja bez opłaty."
    type: predefined
  - name: "Terapia OCD (zaburzenie obsesyjno-kompulsyjne)"
    description: "Terapia OCD i natrętnych myśli, online po polsku i rosyjsku. CBT z ekspozycją (ERP), metoda o udowodnionej skuteczności. Umów rozmowę zapoznawczą."
    type: predefined
  - name: "Psychotraumatolog Warszawa (praca z traumą)"
    description: "Psychotraumatolog z dyplomem SWPS. Praca z traumą, traumą złożoną i jej skutkami, online po polsku, rosyjsku i białorusku. Bezpieczne tempo, podejście CBT. Pierwsze 15 minut bezpłatnie."
    type: custom
  - name: "Terapia traumy i PTSD"
    description: "Praca ze skutkami traumy, PTSD i złożonym PTSD (cPTSD). Psychotraumatolog, podejście CBT, bezpieczne tempo. Online z Warszawy, pierwsze 15 minut gratis."
    type: predefined
  - name: "Terapia depresji"
    description: "Terapia depresji, w tym ukrytej (wysokofunkcjonującej), online. Krótkoterminowa praca oparta na dowodach. Po polsku, rosyjsku, białorusku."
    type: predefined
  - name: "Terapia wypalenia zawodowego"
    description: "Pomoc przy wypaleniu i przewlekłym wyczerpaniu, online. Trzy wymiary wypalenia, realistyczny plan odbudowy. Konsultacja bezpłatna."
    type: predefined
  - name: "Terapia psychosomatyki"
    description: "Praca z objawami psychosomatycznymi i napięciem w ciele, online. Gdy ciało sygnalizuje zamiast psychiki. Podejście CBT z Warszawy."
    type: custom
  - name: "Terapia zaburzeń snu i bezsenności"
    description: "Pomoc przy bezsenności i problemach ze snem na tle stresu i lęku, online. Elementy CBT-I. Po polsku i rosyjsku."
    type: custom
  - name: "Wsparcie w adaptacji po emigracji"
    description: "Terapia lęku po przeprowadzce, tęsknoty i adaptacji w nowym kraju. Dla emigrantów z Białorusi, Ukrainy, Rosji. Online, w języku ojczystym."
    type: custom
  - name: "Wsparcie w żałobie i po stracie"
    description: "Pomoc w przeżywaniu straty i żałoby, online z Warszawy. Bezpieczna przestrzeń, własne tempo. Pierwsze spotkanie bez opłaty."
    type: predefined
  - name: "Terapia po skutkach przemocy w związku"
    description: "Praca ze skutkami przemocy, gaslightingu i toksycznych relacji, online. Odzyskiwanie granic i samooceny. Po polsku, rosyjsku, białorusku."
    type: custom
  - name: "Praca z niską samooceną i perfekcjonizmem"
    description: "Terapia niskiej samooceny, samokrytyki i perfekcjonizmu, online. Podejście CBT. Umów bezpłatne 15 minut."
    type: custom
  - name: "Terapia współuzależnienia"
    description: "Praca ze współuzależnieniem i uzależnieniem emocjonalnym w relacjach, online z Warszawy. Po polsku i rosyjsku."
    type: custom
  - name: "Konsultacja psychologiczna online"
    description: "Konsultacja psychologa online po polsku, rosyjsku i białorusku. Sesja 50 minut, 180 PLN. Pierwsze 15 minut bezpłatnie."
    type: predefined
  # --- дополнительные имена без описаний (добавь в GBP списком) ---
  - name: "Psychoterapia w podejściu CBT"
    type: predefined
  - name: "Terapia online (wideo)"
    type: predefined
  - name: "Terapia po rosyjsku"
    type: custom
  - name: "Terapia po białorusku"
    type: custom
  - name: "Terapia dla emigrantów"
    type: custom
  - name: "Pomoc przy lęku o zdrowie (hipochondria)"
    type: custom
  - name: "Praca z natrętnymi myślami"
    type: custom
  - name: "Terapia zaburzeń odżywiania"
    type: custom
  - name: "Wsparcie przy chronicznym stresie"
    type: custom
  - name: "Praca z poczuciem winy i wstydem"
    type: custom
```

---

## 4. Description (≤750 знаков, PL · первые 100 критичны · без URL, без em-dash)

```
Aliaksei Levashou: psycholog i psychotraumatolog w Warszawie. Terapia online po polsku, rosyjsku i białorusku, w podejściu CBT (poznawczo-behawioralnym). Pomagam dorosłym przy lęku, napadach paniki, OCD, skutkach traumy i PTSD, wypaleniu, bezsenności oraz adaptacji po emigracji. Krótkoterminowa, oparta na dowodach praca, zwykle 8-16 sesji. Mgr psychologii SWPS, specjalizacja z psychotraumatologii, szkolenie CBT (PTTPB). Pierwsze 15 minut bezpłatnie, sesja 180 PLN. Umów spotkanie online.
```

**Заметки:** статус-формула соблюдена («w podejściu CBT», без «psychoterapeuta CBT»). Языки RU/BY вынесены вперёд как дифференциатор (ниша «psycholog rosyjskojęzyczny Warszawa»). Без ключевого спама.

---

## 5. Hours

```yaml
hours:
  # TODO: подставь свои реальные часы приёма
  regular:
    monday: ""
    tuesday: ""
    wednesday: ""
    thursday: ""
    friday: ""
    saturday: ""
    sunday: ""
  holiday_hours: []
  is_24_7: false
  has_answering_service: false
```

**Заметки:** не оставляй часы «не подтверждены» — это режет видимость. Если приём по записи, ставь окна, когда реально доступен.

---

## 6. Photos brief (загрузить 10+, дальше 3-5/мес)

```yaml
photos_brief:
  team:
    - "Твоё фото-портрет (то самое селфи уже на сайте)"
    - "Рабочее место для онлайн-сессий (нейтральный кабинет/фон)"
  credentials:
    - "Диплом mgr SWPS (как на сайте, credentials/magister.jpg)"
    - "Свидетельство психотравматологии (psychotraumatologia.jpg)"
  brand:
    - "Логотип/обложка с именем"
    - "Скрин/визуал процесса видеосессии (без клиентов)"
  monthly_upload_target: "3-5 новых фото/мес"
```

**Заметки:** реальные фото > AI > сток. Уже есть портрет и 2 диплома на сайте, переиспользуй. 100+ фото = заметно больше звонков (BrightLocal).

---

## 7. Attributes (identity-хак · создаёт ниши без конкуренции)

```yaml
attributes:
  identity:
    - lgbtq_friendly: TODO   # на твоё усмотрение
  service_options:
    - online_appointments: true     # ⚠️ см. правило ниже
    - language_other_than_english: ["Polish", "Russian", "Belarusian"]
  payments:
    - card: true
    - mobile_payments: true   # Blik, Apple Pay, Google Pay
  accessibility: []
```

**Правила:**
- ⚠️ Плейбук советует **убрать** атрибуты «onsite services»/«online appointment», если они выталкивают отзывы из видимой части профиля. Проверь после включения, как выглядит карточка.
- Языковой атрибут (Polish/Russian/Belarusian) это твой главный identity-хак: ловит «psycholog rosyjskojęzyczny Warszawa» почти без конкуренции.

---

## 8. Service area (SAB)

```yaml
service_area:
  is_sab: true
  cities:
    - "Warszawa"
    - "Pruszków"
    - "Piaseczno"
    - "Legionowo"
    - "Ząbki"
    - "Marki"
    - "Józefów"
    - "Otwock"
    # онлайн-приём = можно расширить на крупные города PL (по желанию):
    - "Kraków"
    - "Wrocław"
    - "Poznań"
    - "Gdańsk"
  max_drive_time: "не применимо (онлайн)"
```

**Заметки:** для онлайн-терапевта зона обслуживания гибкая. Ядро Варшава + агломерация. Можно добавить крупные города (онлайн-приём это оправдывает), но не раздувай за 20.

---

## 9. Products (топ для витрины GBP)

```yaml
products:
  - name: "Pierwsza konsultacja (15 minut)"
    description: "Bezpłatne 15 minut zapoznawcze, online. Opowiesz swój temat, ja powiem czy i jak mogę pomóc."
    price: "0 PLN"
    linked_service_page: "https://levashou.pl/intro-pl.html"
  - name: "Sesja terapeutyczna online (50 min)"
    description: "Indywidualna sesja w podejściu CBT, online po polsku, rosyjsku lub białorusku."
    price: "180 PLN"
    linked_service_page: "https://levashou.pl/cennik-pl.html"
  - name: "Terapia lęku i napadów paniki"
    description: "Cykl pracy nad lękiem i paniką dla dorosłych, online."
    price: "180 PLN / sesja"
    linked_service_page: "https://levashou.pl/anxiety-pl.html"
  - name: "Praca z traumą i PTSD"
    description: "Terapia skutków traumy, online, bezpieczne tempo."
    price: "180 PLN / sesja"
    linked_service_page: "https://levashou.pl/trauma-pl.html"
```

---

## 10. Booking link

```yaml
booking:
  enabled: true
  platform: "własny system /intro + cal.com"
  booking_url: "https://levashou.pl/intro-pl.html"
  fallback_cta: "Book"
```

---

## 11. FAQ seed (на САЙТ, не в GBP — Q&A в GBP сворачивают)

```yaml
faq_seed:
  - question: "W jakich językach prowadzisz terapię?"
    answer: "Po polsku, rosyjsku i białorusku. Online z Warszawy, dla osób dorosłych."
  - question: "Ile kosztuje sesja?"
    answer: "180 PLN za 50 minut. Pierwsze 15 minut zapoznawcze jest bezpłatne. Płatność Blik, kartą, Apple Pay lub Google Pay."
  - question: "Czy terapia jest online czy stacjonarnie?"
    answer: "Standardowo online przez Google Meet. Spotkanie stacjonarne w Warszawie możliwe na życzenie."
  - question: "W jakim podejściu pracujesz?"
    answer: "W podejściu poznawczo-behawioralnym (CBT), krótkoterminowym i opartym na dowodach. Specjalizuję się w psychotraumatologii."
  - question: "Z czym mogę się zgłosić?"
    answer: "Lęk, napady paniki, OCD, depresja, skutki traumy i PTSD, wypalenie, bezsenność, adaptacja po emigracji, trudności w relacjach."
  - question: "Jak się umówić?"
    answer: "Przez kalendarz online na stronie. Zacznij od bezpłatnych 15 minut."
```

**Заметки:** добавь это в FAQ-секцию сайта (PL) с FAQ-schema. AI Overviews тянут оттуда.

---

## 12. NAP citations (мастер-запись · везде ОДИНАКОВО)

```yaml
nap_master:
  name: "Aliaksei Levashou"
  address: "pl. Bankowy 2, 00-095 Warszawa"   # скрыт в GBP, но единый формат в каталогах
  phone: ""   # TODO единый формат, напр. "+48 XXX XXX XXX"
citation_directories:
  tier_1_universal:
    - "Google Business Profile"
    - "Apple Maps Connect"
    - "Bing Places"
    - "Facebook Business Page"
  tier_2_authority:
    - "Panorama Firm (PL)"
    - "PKT.pl"
    - "Aleo.com (PL)"
  tier_3_industry:    # каталоги психологов PL
    - "ZnanyLekarz.pl"     # ключевой для PL-медицины/психологов
    - "Twojpsycholog / podobne katalogi terapeutów PL"
    - "Профильные RU/UA-каталоги психологов-эмигрантов (если есть)"
```

**Правила:** NAP байт-в-байт одинаково везде (формат адреса и телефона). 30-50 точных цитат > 300 разнобойных. ZnanyLekarz для Польши почти обязателен.

---

## Suspension-проверка (всё чисто, флагов нет)

- ✅ Название без ключей
- ✅ SAB, адрес скрыт (нет publicized placówka)
- ✅ Не PO box, не коворкинг, не фейк-города
- ✅ Зона обслуживания в пределах разумного
- ⚠️ Один открытый вопрос: статус «Psychotherapist» как категория — на твоё решение (формула CBT-статуса).

---

## Что заполнить тебе перед вставкой
1. **Телефон** (с кодом +48) — обязателен для GBP.
2. **Год основания** (подтвердить 2017 или дату działalności).
3. **Часы приёма** (секция 5).
4. **Решение по primary-категории**: подтвердить «Psychologist» в автокомплите GBP; решить, ставить ли «Psychotherapist» вторичной.
5. **Атрибуты identity** (LGBTQ-friendly и т.д.) — по желанию.
