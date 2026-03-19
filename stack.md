Да. Для этого проекта я бы зафиксировал такой стек — **простой, современный и без лишней инфраструктурной сложности для MVP**.

## Рекомендованный стек

### Frontend + app shell

**Next.js 16 + App Router + TypeScript + Tailwind CSS**

Почему это подходит:

* Next.js App Router уже рассчитан на full-stack веб-приложения, включая route handlers, server-side логику и mobile-first UI. ([Next.js][1])
* Для твоего продукта удобно держать сайт, API и часть серверной логики в одном репозитории, а не раскалывать MVP на отдельные frontend/backend проекты. Это ускорит запуск и упростит поддержку. App Router для этого особенно удобен. ([Next.js][1])

### База данных

**PostgreSQL**

Почему:

* у тебя много сущностей с нормальными связями: users, payments, reminders, history, shared accounts, FX rates;
* нужна надежная реляционная модель, фильтры, агрегаты и даты;
* PostgreSQL хорошо подходит под такую бизнес-логику. Prisma официально поддерживает PostgreSQL и дает типобезопасный доступ к данным. ([Prisma][2])

### ORM

**Prisma ORM**

Почему:

* типобезопасные запросы;
* удобные миграции;
* быстрое описание схемы;
* хороший DX для MVP. Prisma прямо позиционирует ORM как типобезопасный способ работы с БД с миграциями и визуальным редактором данных. ([Prisma][3])

### Аутентификация

**Auth.js**

Почему:

* это понятный выбор под Next.js;
* удобно для email sign-in / magic link / OAuth позже;
* можно быстро получить сессии, login/logout и защиту маршрутов. Auth.js официально поддерживает Next.js и покрывает session management и login flow. ([authjs.dev][4])

### Background jobs / scheduler

**Upstash QStash** для cron-like задач и доставки job-вызовов

Почему:

* для MVP не хочется поднимать отдельный тяжелый queue stack;
* тебе нужны ежедневные FX updates, reminder preparation и retry-доставка;
* QStash поддерживает schedules, cron-выражения и automatic retries / delivery semantics для endpoint-driven воркеров. ([Upstash: Serverless Data Platform][5])

### Хостинг

**Vercel для приложения + managed Postgres**

Почему:

* для Next.js это самый прямой путь;
* проще деплой, preview environments и быстрая итерация;
* для MVP это обычно быстрее, чем собирать свою инфраструктуру с нуля. Next.js docs ориентируют App Router и route handlers как естественную основу full-stack app deployment. ([Next.js][6])

---

## Как я бы это зафиксировал окончательно

### Основной стек MVP

* **Next.js 16**
* **TypeScript**
* **Tailwind CSS**
* **PostgreSQL**
* **Prisma ORM**
* **Auth.js**
* **Upstash QStash**
* **Vercel**

Это, на мой взгляд, самый подходящий набор для твоего сайта.

---

## Почему именно такой стек, а не более сложный

Я бы **не** делал сейчас:

* отдельный NestJS backend;
* отдельный React frontend;
* Redis + BullMQ + отдельный worker server;
* микросервисы;
* тяжелую event-driven архитектуру.

Для MVP это почти наверняка перегруз. У тебя продукт не про высоконагруженный realtime, а про:

* формы,
* recurring logic,
* агрегаты,
* reminders,
* shared access.

Это лучше закрыть **одним full-stack репозиторием**, чтобы быстрее дойти до первого релиза. Next.js App Router как раз для этого подходит. ([Next.js][1])

---

## Практическая инженерная рекомендация по структуре

Я бы делал **monorepo не нужен**.
Для MVP достаточно **одного репозитория** со структурой:

* `app/` — страницы и UI
* `app/api/` или route handlers — API
* `lib/` — общие утилиты
* `server/` — business logic services
* `prisma/` — schema и migrations

Это даст:

* меньше бойлерплейта;
* проще деплой;
* проще onboarding для разработки.

---

## Что я бы выбрал по спорным инженерным пунктам

### Формат money

Для MVP я бы рекомендовал:
**хранить деньги в minor units**
то есть:

* `amount_minor`
* `currency`

Например:

* 9.99 EUR → `999`
* 25.00 EUR → `2500`

Почему:

* безопаснее для арифметики;
* меньше проблем с округлениями;
* лучше для агрегатов и FX-конверсии.

### Pagination

Для MVP:

* **Payments list** — offset pagination или просто limit + page;
* **Payment history** — page/limit;
* **Dashboard upcoming** — fixed limit, например 5–10;
* **Analytics** — без пагинации.

### Migrations order

Я бы шел так:

1. users + auth
2. shared accounts + members
3. categories
4. payments
5. payment_reminders
6. payment_history
7. fx_rates
8. notification_log
9. optional in_app_reminders

Такой порядок уменьшает число переделок схемы.

---

## Финальная рекомендация одним блоком

**Подходящий стек для проекта:**

* Frontend/Web app: **Next.js 16 + TypeScript + Tailwind**
* Backend: **Next.js Route Handlers + service layer**
* Database: **PostgreSQL**
* ORM: **Prisma**
* Auth: **Auth.js**
* Jobs/Scheduling: **Upstash QStash**
* Hosting: **Vercel**
* Money format: **minor units**
* Repo strategy: **single full-stack repo**

Это самый здравый вариант: быстро собрать, не утонуть в инфраструктуре и оставить хорошую базу для будущего iOS-приложения. ([Next.js][1])



[1]: https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router | Next.js"
[2]: https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql?utm_source=chatgpt.com "PostgreSQL database connector | Prisma Documentation"
[3]: https://www.prisma.io/docs/orm?utm_source=chatgpt.com "What is Prisma ORM? (Overview) | Prisma Documentation"
[4]: https://authjs.dev/?utm_source=chatgpt.com "Auth.js | Authentication for the Web"
[5]: https://upstash.com/docs/qstash/features/schedules?utm_source=chatgpt.com "Schedules - Upstash Documentation"
[6]: https://nextjs.org/docs/app/getting-started?utm_source=chatgpt.com "App Router: Getting Started | Next.js"
