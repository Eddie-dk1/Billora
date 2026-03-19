Ниже — **Implementation Blueprint v1** для проекта **Billora** в формате текста: четко, структурированно и без кода. Это уже технический слой поверх MVP Spec, который можно использовать как основу для проектирования backend, frontend и базы данных.

---

# Billora — Implementation Blueprint v1

## 1. Назначение документа

Этот документ фиксирует **техническую реализацию MVP** для проекта Billora.

Он описывает:

* общую архитектуру системы
* backend-модули
* модель данных
* API-эндпоинты
* фоновые jobs
* политику retry
* правила уведомлений
* локализацию
* test matrix

Документ не меняет продуктовые решения. Он переводит уже согласованный MVP в инженерную структуру.

---

# 2. Общая техническая модель

## 2.1 Формат продукта

Продукт реализуется как **responsive website** с **mobile-first интерфейсом**.

Поддерживаются:

* мобильные браузеры как основной сценарий
* desktop browsers как вторичный сценарий

## 2.2 Высокоуровневая архитектура

Система состоит из следующих слоев:

### Frontend

Отвечает за:

* UI
* формы
* отображение Dashboard, Payments, Calendar, Analytics, Settings
* переключение контекста Personal / Shared
* вызовы backend API
* отображение reminder-состояний внутри интерфейса

### Backend API

Отвечает за:

* аутентификацию
* управление пользователями и настройками
* CRUD платежей
* mark as paid
* расчёт next due date
* агрегаты Dashboard и Analytics
* shared account логику
* хранение истории оплат
* генерацию данных для reminders

### Database

Хранит:

* пользователей
* настройки
* платежи
* recurrence rules
* reminders
* payment history
* shared accounts
* membership
* FX rates
* notification logs

### Background jobs / scheduler

Отвечает за:

* daily FX updates
* reminder preparation
* reminder dispatch
* overdue checks
* retry failed deliveries

### Notification layer

Отвечает за:

* browser push notification delivery
* in-app reminder feed как fallback

---

# 3. Архитектурные принципы

## 3.1 Backend — источник истины

Вся критическая логика должна рассчитываться на backend:

* recurrence calculations
* next due date updates
* mark paid behavior
* overdue logic
* dashboard totals
* monthly load normalization
* FX conversion for aggregates
* reminder eligibility

Frontend не должен быть единственным местом, где считается schedule logic.

## 3.2 Контекстность данных

Все данные принадлежат одному из двух owner-контекстов:

* `personal`
* `shared`

Это правило должно быть единым для:

* payments
* categories
* aggregates
* calendar data
* analytics data

## 3.3 Простота MVP

Для v1 принимаются упрощения:

* no role-based permissions in shared
* immutable payment history
* current FX rates for aggregates
* last-write-wins for shared edits
* no missed-cycle debt engine

---

# 4. Рекомендуемый стек

Это рекомендуемый, а не обязательный стек.

## Frontend

* Next.js
* Tailwind CSS

## Backend

* Next.js API routes или отдельный Node.js backend
* сервисный слой для бизнес-логики

## Database

* PostgreSQL

## Auth

* email auth / magic link / classic email-password

## Hosting

* Vercel для frontend
* managed PostgreSQL

## Jobs

* cron / worker runner

## Notifications

* browser push where supported
* in-app fallback always available

## FX

* public FX API
* daily refresh

---

# 5. Backend modules

Система должна быть разбита на независимые модули.

## 5.1 Auth module

Отвечает за:

* sign up
* sign in
* session handling
* logout
* passwordless or password-based auth
* protected route access

## 5.2 Users / Settings module

Отвечает за:

* user profile
* primary currency
* timezone
* preferred reminder time
* notification preference
* current active context selection

## 5.3 Payments module

Отвечает за:

* create payment
* update payment
* stop payment
* delete payment
* fetch payment list
* fetch payment details
* filter by type/status/context
* recurrence storage

## 5.4 Payment History module

Отвечает за:

* immutable history records
* list payment history
* append paid record on mark-paid

## 5.5 Reminders module

Отвечает за:

* storing reminder offsets
* eligibility calculation
* reminder feed generation
* handoff to notification dispatch

## 5.6 Shared Accounts module

Отвечает за:

* create shared account
* invite or join flow
* membership
* shared data scoping
* membership-based access control

## 5.7 Dashboard module

Отвечает за:

* due this month
* average monthly load
* upcoming payments
* context-based summary cards

## 5.8 Analytics module

Отвечает за:

* yearly total
* category breakdown
* expensive payments list
* aggregate conversion to primary currency

## 5.9 FX Rates module

Отвечает за:

* fetching daily rates
* storing latest rates
* fallback to cached rates
* conversion helper methods

## 5.10 Notifications module

Отвечает за:

* browser push delivery
* in-app reminder entries
* logging deliveries
* retry status handling

## 5.11 Scheduler / Jobs module

Отвечает за:

* periodic task execution
* retry policy
* idempotent processing
* queue-safe execution

---

# 6. Модель данных

Ниже — рекомендуемая схема данных на уровне сущностей и ключевых полей.

---

## 6.1 Users

Хранит аккаунты пользователей.

### Основные поля

* `id`
* `name`
* `email`
* `password_hash` или auth provider fields
* `timezone`
* `primary_currency`
* `preferred_reminder_time`
* `notifications_enabled`
* `active_context_type`
* `active_context_id` nullable
* `created_at`
* `updated_at`

### Комментарий

`active_context_type` используется для восстановления последнего выбранного режима Personal / Shared.

---

## 6.2 SharedAccounts

Хранит shared / family аккаунты.

### Поля

* `id`
* `name`
* `created_by_user_id`
* `created_at`
* `updated_at`

---

## 6.3 SharedAccountMembers

Хранит membership shared аккаунтов.

### Поля

* `id`
* `shared_account_id`
* `user_id`
* `joined_at`

### Ограничения

* один и тот же пользователь не может быть добавлен дважды в один shared account

---

## 6.4 Categories

Категории платежей.

### Поля

* `id`
* `owner_type` (`personal` / `shared`)
* `owner_id`
* `name`
* `created_at`

### Комментарий

Категория не заменяет системный тип платежа.

---

## 6.5 Payments

Главная сущность recurring-платежей.

### Поля

* `id`
* `owner_type` (`personal` / `shared`)
* `owner_id`
* `title`
* `payment_type` (`subscription` / `bill`)
* `amount`
* `currency`
* `next_due_date`
* `recurrence_interval`
* `recurrence_unit` (`day` / `week` / `month` / `year`)
* `category_id` nullable
* `note` nullable
* `status` (`active` / `stopped`)
* `created_by_user_id`
* `created_at`
* `updated_at`

### Комментарий

`payment_type` используется для фильтров “Подписки / Счета”.

---

## 6.6 PaymentReminders

Хранит множественные offsets напоминаний для платежа.

### Поля

* `id`
* `payment_id`
* `offset_days`
* `created_at`

### Допустимые значения для MVP

* `0`
* `1`
* `3`
* `7`

---

## 6.7 PaymentHistory

Immutable история оплат.

### Поля

* `id`
* `payment_id`
* `paid_at`
* `paid_amount`
* `currency`
* `created_by_user_id`
* `schedule_action` (`on_time` / `early_keep` / `early_shift` / `late_shift`)
* `note` nullable
* `created_at`

### Комментарий

История не редактируется и не удаляется в MVP.

---

## 6.8 FxRates

Хранит курсы валют.

### Поля

* `id`
* `base_currency`
* `quote_currency`
* `rate`
* `fetched_at`

### Комментарий

Для MVP достаточно хранить latest available rates.

---

## 6.9 NotificationLog

Логирует отправку напоминаний.

### Поля

* `id`
* `payment_id`
* `user_id`
* `channel` (`browser_push` / `in_app`)
* `reminder_offset_days`
* `target_due_date`
* `status` (`pending` / `sent` / `failed` / `skipped`)
* `attempt_count`
* `last_attempt_at` nullable
* `sent_at` nullable
* `error_message` nullable
* `created_at`

### Комментарий

Используется для дедупликации и retry.

---

## 6.10 InAppReminders

Если нужен явный in-app reminder center, можно хранить их отдельно.

### Поля

* `id`
* `user_id`
* `payment_id`
* `title`
* `message`
* `is_read`
* `created_at`

### Комментарий

Можно и не хранить отдельно, если in-app center строится динамически из upcoming/overdue данных. Для MVP допустимы оба подхода.

---

# 7. Индексы и ограничения

Ниже — ключевые инженерные требования.

## 7.1 Индексы

Нужны индексы по:

* `payments(owner_type, owner_id, status)`
* `payments(next_due_date)`
* `payment_reminders(payment_id)`
* `payment_history(payment_id, paid_at desc)`
* `shared_account_members(user_id)`
* `notification_log(user_id, payment_id, target_due_date, reminder_offset_days)`

## 7.2 Ограничения

* `recurrence_interval > 0`
* `amount > 0`
* `currency` must be valid ISO code
* `offset_days` only from allowed values in MVP
* `status` only `active` or `stopped`
* `payment_type` only `subscription` or `bill`

---

# 8. API Contract Principles

## 8.1 Общие правила

Все API должны быть JSON-based.

### Базовые правила

* request/response в JSON
* timestamps in ISO 8601
* money values as decimal-safe strings or integer minor units
* consistent error envelope
* authenticated endpoints require session/token

## 8.2 Error format

Единый формат ошибок:

* `code`
* `message`
* optional `details`

Пример логики:

* validation error
* unauthorized
* forbidden
* not found
* conflict
* internal error

---

# 9. API Endpoints

Ниже — рекомендуемый набор endpoints для MVP.

---

## 9.1 Auth

### POST `/api/auth/signup`

Создает пользователя.

### POST `/api/auth/login`

Логин.

### POST `/api/auth/logout`

Логаут.

### GET `/api/auth/me`

Возвращает текущего пользователя и базовые настройки.

---

## 9.2 Settings / User

### GET `/api/settings`

Возвращает настройки пользователя.

### PATCH `/api/settings`

Обновляет:

* primary currency
* timezone
* preferred reminder time
* notifications enabled

### PATCH `/api/settings/active-context`

Меняет текущий контекст:

* personal
* shared + shared_account_id

---

## 9.3 Shared Accounts

### POST `/api/shared-accounts`

Создает shared account.

### GET `/api/shared-accounts`

Возвращает shared accounts пользователя.

### GET `/api/shared-accounts/:id`

Возвращает shared account details.

### POST `/api/shared-accounts/:id/join`

Присоединение к shared аккаунту.

### GET `/api/shared-accounts/:id/members`

Список участников.

---

## 9.4 Categories

### GET `/api/categories?contextType=&contextId=`

Список категорий в контексте.

### POST `/api/categories`

Создает категорию.

### PATCH `/api/categories/:id`

Редактирует категорию.

---

## 9.5 Payments

### GET `/api/payments`

Список платежей.

Поддерживает query params:

* `contextType`
* `contextId`
* `status`
* `paymentType`
* `categoryId`
* `sort`

### POST `/api/payments`

Создает платеж.

### GET `/api/payments/:id`

Возвращает details платежа.

### PATCH `/api/payments/:id`

Редактирует платеж.

### DELETE `/api/payments/:id`

Удаляет платеж.

### POST `/api/payments/:id/stop`

Меняет статус на stopped.

### POST `/api/payments/:id/activate`

Возвращает статус active.

---

## 9.6 Payment Reminders

### PUT `/api/payments/:id/reminders`

Полностью обновляет список reminder offsets для платежа.

---

## 9.7 Payment History

### GET `/api/payments/:id/history`

Возвращает immutable history list.

---

## 9.8 Mark Paid

### POST `/api/payments/:id/mark-paid`

Request должен включать:

* `paidAt`
* `paidAmount` optional if same as current amount
* `action`:

  * `keep_schedule`
  * `shift_schedule`
  * optional auto mode for on-time/late logic

Response должен вернуть:

* history entry
* updated payment
* new next due date

---

## 9.9 Dashboard

### GET `/api/dashboard?contextType=&contextId=`

Возвращает:

* due_this_month
* average_monthly_load
* upcoming_payments
* currency used for totals

---

## 9.10 Calendar

### GET `/api/calendar?contextType=&contextId=&month=YYYY-MM`

Возвращает платежи по датам выбранного месяца.

---

## 9.11 Analytics

### GET `/api/analytics?contextType=&contextId=`

Возвращает:

* due_this_month
* average_monthly_load
* yearly_total
* category_breakdown
* most_expensive_payments

---

## 9.12 Notifications / Reminder Center

### GET `/api/reminders`

Возвращает in-app reminder list или reminder feed.

### PATCH `/api/reminders/:id/read`

Помечает reminder как прочитанный, если in-app reminders materialized.

---

# 10. Правила расчета next due date

Это центральная бизнес-логика backend.

## 10.1 Supported units

* day
* week
* month
* year

## 10.2 Base rule

Новая дата строится добавлением интервала к reference date.

## 10.3 Monthly/yearly edge case

Если нужного дня нет в целевом месяце — берется последний валидный день месяца.

Примеры:

* Jan 31 → Feb 28
* Mar 31 → Apr 30
* Feb 29, 2024 → Feb 28, 2025

## 10.4 Paid on time

`new_next_due_date = old_next_due_date + interval`

## 10.5 Paid early

Если оплата раньше более чем на 1 день:

* user chooses keep or shift

### keep schedule

`new_next_due_date = old_next_due_date + interval`

### shift schedule

`new_next_due_date = paid_at + interval`

Если раньше меньше чем на 1 день:

* автоматически keep schedule

## 10.6 Paid late

Для MVP:
`new_next_due_date = paid_at + interval`

---

# 11. Логика агрегатов

## 11.1 Due this month

Сумма платежей, у которых `next_due_date` попадает в текущий месяц выбранного контекста и `status = active`.

## 11.2 Average monthly load

Нормализованная месячная нагрузка по активным платежам.

### Формулы

* yearly → amount / 12
* every 3 months → amount / 3
* every 2 weeks → amount × 26 / 12
* daily rules normalize through average month length

### Приближения для MVP

* 1 month = 30.4375 days
* 1 year = 12 months
* 1 week = 7 days

## 11.3 Currency conversion

Все агрегаты конвертируются в `primary_currency` пользователя по latest FX rates.

Исторические агрегаты не фиксируют rate at payment date.

---

# 12. Notification behavior

## 12.1 Reminder channels

Для MVP есть два канала:

* browser push
* in-app reminder availability

## 12.2 Browser push

Используется, если:

* пользователь дал permission
* браузер поддерживает push
* notifications enabled = true

## 12.3 In-app fallback

Даже если push недоступен, пользователь должен видеть upcoming/reminder data внутри продукта.

## 12.4 Shared timezone behavior

Напоминания отправляются по timezone каждого пользователя.

## 12.5 Reminder eligibility

Напоминание eligible, если:

* платеж active
* offset настроен
* target date = due date - offset
* reminder еще не отправлен для этого user/payment/due date/offset
* пользователь имеет доступ к соответствующему контексту

---

# 13. Background jobs

Ниже — обязательные фоновые процессы.

---

## 13.1 FX Refresh Job

### Назначение

Обновляет курсы валют.

### Частота

1 раз в сутки.

### Действия

* fetch from public FX API
* validate response
* upsert rates
* store fetched_at

### Fallback

Если API недоступен:

* keep last known rates
* log failure
* retry later

---

## 13.2 Reminder Preparation Job

### Назначение

Проверяет, какие reminders должны быть созданы/отправлены.

### Частота

Например, каждые 15–30 минут.

### Действия

* найти active payments
* рассчитать due offset windows
* учесть timezone пользователя
* создать pending notification entries или enqueue dispatch

---

## 13.3 Reminder Dispatch Job

### Назначение

Отправляет browser push notification.

### Частота

Часто, например каждые 5–10 минут или queue-based.

### Действия

* взять pending reminders
* отправить push
* записать sent/failed
* increment attempt count

---

## 13.4 Overdue Check Job

### Назначение

Проверяет overdue payments и готовит follow-up reminders.

### Частота

1 раз в день или чаще.

### Действия

* найти платежи с due date < today and unpaid
* определить follow-up reminder eligibility
* отправить follow-up logic

---

## 13.5 Cleanup / Maintenance Job

### Назначение

Техобслуживание.

### Действия

* prune stale temporary data
* rotate logs if needed
* clean obsolete pending items

---

# 14. Retry policy и SLA для jobs

Для MVP нужна простая и надежная стратегия.

## 14.1 FX job retry

Если ежедневное обновление курсов не удалось:

* повтор через 1 час
* затем через 3 часа
* затем через 6 часов
* максимум 3 retry attempts за сутки

Если все retries провалены:

* используем last known rates
* пишем warning/error log

## 14.2 Push dispatch retry

Если отправка push failed:

* retry через 5 минут
* затем через 15 минут
* затем через 1 час
* максимум 3 attempts

Если после этого fail:

* статус `failed`
* in-app reminder все равно остается доступным

## 14.3 Reminder preparation retry

Если job failed на уровне процесса:

* повтор через 10 минут
* максимум 3 attempts

## 14.4 SLA ожидания для MVP

Для MVP достаточно следующих ориентиров:

* FX freshness: до 24 часов
* reminder dispatch delay: целевой лаг не более 15–30 минут от запланированного времени
* dashboard/analytics response: целевой response under a few hundred ms for typical loads

---

# 15. Локализация и UX text layer

## 15.1 Язык MVP

Если MVP ориентирован на русскоязычный запуск, основной язык может быть русский.

Но систему лучше строить сразу i18n-ready.

## 15.2 Стратегия

Все UI-строки должны быть вынесены в localization keys.

Не хардкодить тексты внутри бизнес-логики.

## 15.3 Основные группы текстов

* navigation labels
* dashboard labels
* payment form labels
* validation errors
* notification texts
* empty states
* shared account texts

## 15.4 Примеры системных текстов

* “К оплате в этом месяце”
* “Средняя нагрузка / мес”
* “Добавить платеж”
* “Сохранить график”
* “Сдвинуть график”
* “Остановить”
* “Оплачено”

## 15.5 Notification templates

Нужны шаблоны вида:

* “Через {N} дня нужно оплатить {title} — {amount} {currency}”
* “Сегодня нужно оплатить {title} — {amount} {currency}”

---

# 16. Shared editing policy

## 16.1 Conflict resolution

Для MVP применяется `last-write-wins`.

## 16.2 Практический смысл

Если два пользователя редактируют один платеж почти одновременно:

* последнее сохранение становится актуальным

## 16.3 Допустимое упрощение

No optimistic locking/versioning in v1.

---

# 17. Security and access control

## 17.1 General

Все protected endpoints требуют auth.

## 17.2 Ownership checks

Перед любым чтением/изменением payment backend обязан проверить, что пользователь:

* владелец personal payment
  или
* участник соответствующего shared account

## 17.3 Shared membership checks

Нельзя получать доступ к shared account без membership.

## 17.4 Sensitive data

Продукт не хранит банковские карты, номера счетов и т.п. в MVP.

---

# 18. Test Matrix

Ниже — минимальный обязательный набор тестов.

---

## 18.1 Auth tests

* signup success
* login success
* unauthorized access blocked

---

## 18.2 Payment CRUD tests

* create personal payment
* create shared payment
* edit payment
* stop payment
* delete payment
* filter by payment type
* filter by status

---

## 18.3 Recurrence engine tests

* every 1 month
* every 1 year
* every 2 weeks
* every 10 days
* Jan 31 monthly rollover
* leap year yearly rollover

---

## 18.4 Mark Paid tests

* on-time payment
* early payment with keep schedule
* early payment with shift schedule
* early payment within 1 day → no dialog logic side
* late payment auto shift

---

## 18.5 Aggregation tests

* due this month includes only current month
* stopped payments excluded
* monthly load normalization for yearly
* monthly load normalization for 2 weeks
* mixed currency aggregate conversion

---

## 18.6 FX tests

* rates loaded successfully
* fallback to cached rates
* analytics still works if API unavailable

---

## 18.7 Shared account tests

* create shared account
* join shared account
* access shared dashboard
* non-member access denied
* shared payment visible to members
* shared edits use last-write-wins

---

## 18.8 Reminder tests

* reminder generated for 1 day before
* same-day reminder works
* duplicate reminder not generated twice
* stopped payment never reminds
* overdue follow-up eligibility

---

## 18.9 Notifications tests

* browser push success logged
* failed push retries
* failed push marked failed after max attempts
* in-app fallback remains visible

---

## 18.10 Localization tests

* key labels resolve correctly
* missing keys detected in build/test phase if possible

---

# 19. Non-functional requirements

## 19.1 Performance

* pages must load quickly on mobile
* lists should paginate or lazy load if needed
* aggregates should be efficient at normal MVP scale

## 19.2 Reliability

* date calculations must be deterministic
* FX fallback must prevent broken analytics
* failed push must not break core product

## 19.3 Maintainability

* business logic in service layer
* no heavy logic duplicated in UI
* module boundaries should remain clean

---

# 20. Что считается готовностью backend MVP

Backend можно считать готовым к MVP, если реализованы:

* auth and session flow
* settings
* personal/shared context support
* payment CRUD
* reminders persistence
* immutable history
* mark paid logic
* next due date engine
* dashboard aggregates
* analytics aggregates
* FX update job
* reminder jobs
* notification log
* basic shared access control

---

# 21. Что считается готовностью frontend MVP

Frontend можно считать готовым к MVP, если реализованы:

* mobile-first layout
* bottom navigation
* onboarding/settings flow
* context switcher
* dashboard
* payment list
* add/edit payment form
* payment details
* calendar screen
* analytics screen
* reminder-related UI
* browser notification permission flow

---

# 22. Финальная инженерная трактовка MVP

MVP v1 — это responsive website с mobile-first UX, где backend является источником истины для recurring payment logic, reminders и aggregates.

Система должна поддерживать:

* personal and shared contexts
* recurring payments with custom recurrence
* immutable payment history
* daily FX rates
* due-this-month and average-monthly-load metrics
* browser push where available
* in-app fallback visibility
* deterministic schedule logic
* simple, maintainable architecture

---

# 23. Рекомендуемый следующий шаг

После этого blueprint логично собрать:
**delivery plan / roadmap разработки**, то есть разбивку на этапы:

* schema + auth
* payments + recurrence engine
* dashboard + analytics
* reminders + jobs
* shared accounts
* polish + QA

Это уже будет прямой мост от спецификации к реализации.
