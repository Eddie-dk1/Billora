# Billora — Final MVP Spec v1

## 1. Product Overview

**Billora** is a responsive website for tracking recurring subscriptions and invoices.

The product helps users:

* keep all recurring payments in one place
* see what must be paid this month
* understand their average monthly financial load
* receive reminders before due dates
* mark payments as paid and keep schedules updated

The product is designed as a **website that works comfortably on phones**, with a **mobile-first interface** that also supports desktop browsers.

This is **not** a full budgeting app and **not** a banking product.
Its purpose is narrow and clear: **recurring payment tracking and reminders**.

---

## 2. Product Objective

Help users stay in control of recurring subscriptions and invoices by tracking upcoming payments, sending timely reminders, and summarizing monthly spending in a clean, minimal interface.

---

## 3. MVP Goal

Achieve **60% of new users adding at least 5 payments within 7 days of first launch**.

This is the primary activation metric for MVP validation.

---

## 4. Platform Definition

The product will be implemented as a **responsive website**.

It must:

* work well on mobile browsers
* be fully usable on smartphones
* support desktop browsers
* use a mobile-first layout
* feel close to an app experience inside the browser

### Mobile usage expectation

The main usage is expected to come from phones, so the interface should prioritize:

* vertical scrolling
* large touch targets
* bottom navigation
* card-based layout
* minimal text
* fast one-hand interaction

### Desktop usage expectation

Desktop support is required, but desktop is secondary.

On larger screens, the website may use wider cards and more spacing, but the structure and functionality remain the same.

### Future option

PWA support may be added later, but it is **not required for MVP**.

---

## 5. Product Philosophy

The product should feel:

* minimal
* clean
* premium
* calm
* fast

### Core principles

* adding a payment should take about **10 seconds**
* core actions should require **1–2 taps**
* the user should always see the most important information first
* text should be minimal
* controls should be large and obvious
* the product should reduce stress, not add complexity

---

## 6. UI and Visual Direction

## Design style

Minimalism with taste.

The interface uses:

* cards
* clear spacing
* large buttons
* clean typography
* simple icons
* very little visual noise

This should not look like a heavy banking dashboard.
It should look like a focused control tool for recurring expenses.

---

## 7. Color System

### Primary colors

**Mist Gray — #ECEFF1**
Used for:

* main background
* neutral surfaces
* page sections

**Midnight Blue — #191970**
Used for:

* primary buttons
* active navigation item
* selected states
* headings and important labels
* icons and actions

### General color usage rules

* keep the palette restrained
* avoid too many accent colors
* use color mainly for hierarchy and action
* cards should stay clean and readable

---

## 8. Information Architecture

The application includes five main sections:

1. Dashboard
2. Payments
3. Calendar
4. Analytics
5. Settings

Navigation is provided through a **bottom tab bar**.

---

## 9. Core Product Loop

1. User adds recurring payments
2. App stores schedule and reminders
3. App tracks upcoming due dates
4. User receives reminders
5. User marks a payment as paid
6. System updates next due date
7. Dashboard and analytics update automatically

---

## 10. Primary User Types

## A. Individual user

A person tracking their own subscriptions and recurring bills.

## B. Shared / family user

A user participating in one shared list of recurring payments with other members.

---

## 11. User Journey 1 — Individual User

## First launch / onboarding

When the user opens the product for the first time, onboarding should be very short.

The user sets:

* primary currency
* timezone
* push notification permission
* preferred reminder sending time

Then the user enters the Dashboard.

---

## Dashboard

The Dashboard is the main screen and must answer three questions immediately:

* what do I need to pay this month?
* what is my average monthly load?
* what is coming up next?

### Dashboard sections

1. Greeting
2. Monthly overview card
3. Upcoming payments list
4. Primary CTA

### Greeting

Example:

**Привет, Kenan**
**Ваши регулярные расходы**

---

## Monthly overview card

This is the most important card on the screen.

It shows two metrics:

### 1. К оплате в этом месяце

This includes only payments whose **next due date falls within the current month**.

### 2. Средняя нагрузка / мес

This is the **normalized monthly amount** across all active recurring payments.

These two values must be clearly separated and labeled.

---

## Upcoming payments list

Displayed as vertical cards sorted by nearest due date.

Each card contains:

* payment name
* amount in original currency
* next due date or relative text like “Оплата через 3 дня”

Example:

**Spotify**
**9.99 EUR**
**Оплата через 3 дня**

---

## Primary action

A large button at the bottom of the screen:

**Добавить платеж**

This is the main call to action.

---

## Add Payment

This screen is a simple vertical form.

### Fields

* Название
* Сумма
* Валюта
* Дата следующей оплаты
* Периодичность
* Напоминания
* Категория
* Заметка (optional)

### Save action

Large primary button:

**Сохранить**

After saving, the user returns to the Dashboard.

---

## Periodicity / recurrence UI

The recurrence selector should remain minimal.

### Default presets

* Каждый месяц
* Каждый год
* Каждую неделю
* Другое…

This is the preferred UX because most users will choose a standard frequency in one tap.

### If user taps “Другое…”

A compact custom recurrence field appears:

**Каждые [N] [дни / недели / месяцы / годы]**

This supports custom intervals like:

* every 2 weeks
* every 3 months
* every 10 days

---

## Reminder selection

Users can choose multiple reminder offsets for one payment.

Supported reminder offsets:

* same day
* 1 day before
* 3 days before
* 7 days before

A payment may have multiple reminders enabled at once.

---

## Payments tab

This screen shows the full list of payments.

### Filters

* Все
* Подписки
* Счета
* Остановленные

### Card structure

Each payment appears as a card containing:

* name
* amount
* next due date
* recurrence

Tapping a card opens the details page.

---

## Payment Details

The details page shows complete information for one payment.

### Fields shown

* amount
* recurrence
* next due date
* category
* reminders
* note
* payment history

History is shown with latest records first.

### Actions

* Оплачено
* Редактировать
* Остановить

---

## Mark as Paid behavior

When the user taps **Оплачено**:

1. a history entry is created
2. the system records the payment date
3. the next due date is recalculated

### If paid early

The system asks:

* **Сохранить график** — keep original cadence
* **Сдвинуть график** — shift schedule from actual payment date

### If paid on time

The next due date is calculated from the previous due date.

### If paid late

For MVP, the schedule automatically shifts from the actual payment date.

---

## Calendar tab

The Calendar screen shows payments distributed by date.

### Behavior

* month view grid
* indicators on dates with payments
* tapping a date shows all payments due that day

This gives users a planning view.

---

## Analytics tab

Analytics should remain simple and card-based.

### MVP analytics cards

* К оплате в этом месяце
* Средняя нагрузка / мес
* Yearly total
* Category breakdown
* Most expensive payments

All totals are shown in the user’s **primary currency**.

---

## Notifications

Users receive short push reminders.

Examples:

* “Через 3 дня нужно оплатить Spotify — 9.99 EUR”
* “Сегодня нужно оплатить Интернет — 25 EUR”

If a payment remains unpaid after its due date, the system may send a follow-up reminder the next day.

---

## 12. User Journey 2 — Shared / Family Account

MVP shared access means one shared list of payments.

### Shared account behavior

Users can:

* create or join a shared account
* see shared payments
* add shared payments
* edit shared payments
* mark shared payments as paid

### Scope for v1

There is **no role management** in MVP.
All members have the same editing ability.

Shared members see the same shared Dashboard / Payments / Calendar / Analytics data.

---

## 13. Feature Scope

## In Scope

* responsive website
* mobile-first interface
* bottom navigation
* Dashboard overview
* upcoming payment cards
* add payment flow
* payment details
* payment history
* mark paid behavior
* recurrence presets
* custom recurrence rules
* multiple reminders per payment
* calendar view
* analytics summary
* multi-currency payments
* shared / family list
* active and stopped payment states

## Out of Scope

* native iOS app
* native Android app
* in-app payments
* automatic bill payment
* bank sync
* transaction auto-import
* email reminders
* SMS reminders
* advanced budgeting
* bank account linking
* role-based permissions in shared accounts

---

## 14. Monthly Load Policy

Two separate values must exist in the product.

## A. К оплате в этом месяце

This is the sum of payments whose **next due date** falls inside the current month.

This reflects what is actually due this month.

## B. Средняя нагрузка / мес

This is the normalized average monthly load across all active recurring payments.

This reflects regular financial burden, even when a payment is yearly or quarterly.

### Why both are required

Showing only one value creates confusion:

* “due this month” helps with short-term planning
* “monthly load” helps understand overall recurring cost

---

## 15. Currency Policy

The system supports:

* payment currency
* primary user currency

### Payment currency

Each payment is stored in its original currency.

This is what the user actually pays and must always be visible on payment cards and details.

### Primary currency

This is chosen by the user in Settings.

It is used for:

* Dashboard totals
* analytics totals
* normalized monthly load
* yearly totals

---

## 16. FX Policy for MVP

For MVP, use:

**automatic exchange rates updated once per day, with totals recalculated using the latest available rates**

### Policy summary

* original payment amount remains unchanged
* analytics and totals are converted into primary currency
* conversion uses a public FX API
* rates update once per day
* totals are recalculated “as of now”

### Why this policy is chosen

It is the simplest and most practical for v1:

* easy to understand
* low technical complexity
* good enough for product analytics
* no need for manual rate management

---

## 17. Payment Status Policy

Each payment has a status.

### MVP statuses

* **Active**
* **Stopped**

### Active

* appears in upcoming lists
* contributes to monthly totals
* participates in reminders

### Stopped

* does not send reminders
* does not appear in upcoming totals
* does not contribute to monthly load

---

## 18. Next Due Date Engine

This is the core scheduling logic of the product.

Each payment must store:

* next due date
* recurrence interval
* recurrence unit
* status

Optional internal fields may include:

* last paid date
* created at
* updated at

---

## 19. Supported recurrence units

* days
* weeks
* months
* years

Custom rules must support:

**Every [N] [unit]**

Examples:

* every 10 days
* every 2 weeks
* every 3 months
* every 2 years

---

## 20. Next due date calculation rules

### Base rule

The next due date is calculated by adding the recurrence interval to the current schedule reference date.

---

## 21. Monthly and yearly date edge cases

For month-based and year-based recurrences:

If the target day does not exist in the target month, use the **last valid day of that month**.

Examples:

* January 31 → February 28
* March 31 → April 30
* February 29, 2024 → February 28, 2025

This rule must be fixed and consistent across the system.

---

## 22. Mark Paid rules

### Paid on time

New next due date = previous due date + recurrence interval

### Paid early, keep schedule

New next due date = previous due date + recurrence interval

### Paid early, shift schedule

New next due date = actual payment date + recurrence interval

### Paid late

For MVP, new next due date = actual payment date + recurrence interval

---

## 23. Editing recurrence rules

If the user changes the recurrence rule:

* the new rule applies from the current next due date
* history is not rewritten
* future schedule uses the new recurrence rule

---

## 24. Manual next due date editing

If the user manually changes the next due date:

* next due date is replaced with the chosen value
* recurrence rule remains unchanged
* future schedule continues from that new date

---

## 25. Overdue handling

For MVP, overdue handling stays simple.

If a payment passes its due date and is not marked as paid:

* it may be visually treated as overdue
* it may trigger a follow-up reminder
* no debt engine or missed-cycle history is required

When the user later marks it as paid, the schedule is recalculated from actual payment date.

---

## 26. Monthly Load Normalization Rules

For normalized monthly load:

### Yearly

amount / 12

### Every 3 months

amount / 3

### Every 2 weeks

amount × 26 / 12

### Custom day-based rules

Normalize proportionally using an average month length.

MVP may use a practical approximation:

* 1 month = 30.4375 days
* 1 year = 12 months
* 1 week = 7 days

---

## 27. Technical Architecture

MVP should use a standard web architecture with clear separation of concerns.

### Recommended architecture

**Frontend**

* responsive website
* mobile-first UI
* browser-based client

**Backend API**

* authentication
* payment CRUD
* reminder logic
* due date calculation
* analytics calculations
* shared account logic

**Database**

* stores users, payments, history, reminders, shared accounts

**Background jobs / scheduler**

* sends reminders
* refreshes FX rates daily
* checks overdue payments

**Push notification service**

* delivers browser push notifications if enabled

---

## 28. Recommended technical stack

One practical stack for MVP:

### Frontend

* Next.js
* Tailwind CSS

### Backend

* Next.js API routes or Node.js backend
* structured service layer for business logic

### Database

* PostgreSQL

### Authentication

* email magic link or standard email auth

### Hosting

* Vercel for frontend
* managed PostgreSQL provider

### Jobs

* cron or worker-based job runner

### FX rates

* public FX API with daily refresh

This stack is not mandatory, but the product should follow this architectural direction.

---

## 29. Backend Responsibilities

Backend must be the source of truth for:

* recurrence calculations
* next due date updates
* mark paid logic
* overdue checks
* analytics totals
* FX-based conversions
* reminder scheduling

The frontend should display and submit data, but core schedule logic should not live only in the client.

---

## 30. Data Model Overview

## Users

Stores account-level information.

Suggested fields:

* id
* name
* email
* timezone
* primary_currency
* reminder_time
* created_at

---

## Payments

Stores recurring payment records.

Suggested fields:

* id
* owner_type
* owner_id
* title
* amount
* currency
* next_due_date
* recurrence_interval
* recurrence_unit
* category_id
* note
* status
* created_at
* updated_at

### owner_type

Used to distinguish whether the payment belongs to:

* individual user
* shared account

---

## Categories

Stores payment categories.

Suggested fields:

* id
* owner_scope
* owner_id
* name

---

## PaymentReminders

Stores multiple reminder offsets per payment.

Suggested fields:

* id
* payment_id
* offset_days

Example offsets:

* 0
* 1
* 3
* 7

---

## PaymentHistory

Stores completed payment events.

Suggested fields:

* id
* payment_id
* paid_at
* paid_amount
* currency
* note
* created_at

---

## SharedAccounts

Stores shared / family accounts.

Suggested fields:

* id
* name
* created_by
* created_at

---

## SharedAccountMembers

Stores shared account membership.

Suggested fields:

* id
* shared_account_id
* user_id
* joined_at

---

## FxRates

Stores latest exchange rates for analytics conversion.

Suggested fields:

* id
* base_currency
* quote_currency
* rate
* fetched_at

---

## NotificationLog

Stores reminder delivery attempts.

Suggested fields:

* id
* payment_id
* user_id
* reminder_offset
* sent_at
* status

---

## 31. Screen-by-Screen MVP Requirements

## Dashboard

Must include:

* greeting
* this month due
* average monthly load
* upcoming payments
* add payment CTA

## Payments

Must include:

* list of cards
* filters
* access to details

## Add Payment

Must include:

* vertical form
* recurrence presets
* custom recurrence
* multiple reminders
* save action

## Payment Details

Must include:

* payment fields
* history
* paid action
* edit action
* stop action

## Calendar

Must include:

* month view
* day indicators
* date tap behavior

## Analytics

Must include:

* summary cards only
* no heavy charts required for MVP

## Settings

Must include:

* primary currency
* timezone
* reminder time
* notification preference
* shared account entry point

---

## 32. Settings Scope

The Settings screen should include:

* profile basics
* primary currency
* timezone
* reminder sending time
* browser notification settings
* shared / family account section

---

## 33. Browser Notification Policy

For the website, reminder delivery depends on browser support and user permission.

For MVP:

* the product should request notification permission during onboarding or setup
* reminder scheduling is controlled on the backend
* notification display depends on browser support

If browser push is limited in some environments, the MVP may still keep internal reminder logic ready for later expansion.

---

## 34. UX Requirements

### Core UX rules

* most important information appears first
* payment cards must be easy to scan
* actions must be touch-friendly
* forms must be short and fast
* primary actions must be visually obvious
* no dense information blocks

### Specific UX target

A user should be able to:

* add a payment quickly
* open details quickly
* mark it as paid in seconds
* understand totals without explanation

---

## 35. Non-Functional Requirements

The MVP should aim for:

* fast page load
* responsive layout
* stable data persistence
* reliable due date calculations
* consistent currency conversion behavior
* simple error handling
* secure authentication

---

## 36. Risks and Simplifications

### Known product risks

* users may not want to manually enter many payments
* browser notifications may be weaker than native mobile app notifications
* multi-currency totals may fluctuate because they use current FX rates
* shared editing without roles may create occasional conflicts

### MVP simplifications

* no auto-import
* no automatic payment execution
* no complex missed-payment engine
* no role management
* no bank integrations

---

## 37. Success Criteria for MVP

MVP is considered successful if it proves that users:

* understand the product quickly
* add recurring payments soon after first launch
* return to check upcoming payments
* use reminders and mark payments as paid
* get value from the Dashboard overview

Primary success metric:

* **60% of new users add at least 5 payments within 7 days of first launch**

Secondary useful metrics:

* number of payments added per user
* % of users enabling notifications
* % of users marking at least one payment as paid
* 7-day retention
* usage of shared account flow

---

## 38. Final MVP Definition

MVP v1 is a **responsive, mobile-friendly website** for tracking recurring payments.

It includes:

* onboarding
* Dashboard
* payment creation
* recurrence rules
* reminders
* payment history
* calendar
* analytics
* shared list support
* multi-currency totals in primary currency

It does **not** include:

* bank sync
* auto-pay
* advanced budgeting
* native mobile apps
* role-based collaboration

---

## 39. Short Product Summary

Billora is a minimal, card-based recurring payment tracker built as a responsive website optimized for mobile browsers.

It helps users:

* add subscriptions and bills
* see what is due this month
* understand average monthly load
* receive reminders
* keep schedules updated after payment

The MVP focuses on **clarity, speed, and control**.

