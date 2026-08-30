# P12 Personal Ledger Manager — Project Planning

## 1. Document purpose

This document is the implementation source of truth for P12 Personal Ledger Manager. It defines what will be built, the calculation rules, modular architecture, data model, API boundaries, security rules, testing strategy, delivery phases, and completion criteria.

The application will use:

- Next.js with TypeScript for the frontend
- Node.js and Express with TypeScript for the backend API
- MongoDB Atlas and Mongoose for persistence
- Firebase Authentication and Firebase Admin for identity verification
- Vercel for deployment
- A modular, feature-based code pattern on both frontend and backend

The existing `docs/` directory describes an unrelated CNF back-office product. It is reference material only and is not the specification for P12.

---

## 2. Problem statement

The product must satisfy all four required P12 items:

1. Let a user set a monthly salary and add expenses manually or by uploading a bill or receipt image. Extract the amount, date, and shop name, show the extracted data for review, and allow every field to be corrected before saving.
2. Show a monthly dashboard containing total spending against salary, spending by category, the largest expenses, and change compared with last month.
3. Forecast expected spending for the rest of the month and expected money left or short at month end. Produce at least three written insights that name specific categories and amounts.
4. Let a user create savings pockets for particular items. Each pocket must have a name, target amount, item details, and monthly contribution. Show a forecast-based completion date and the projected DPS return over that period at a clearly stated annual rate.

The supplied public dataset is:

`C:\Users\LENOVO\Downloads\P12_personal_ledger_public.json`

It contains 25 public cases, two months of expenses per case, monthly salaries, three savings pockets per case, DPS rates, and the exact DPS calculation rule. The local absolute path is for development only and must never be used by production code.

---

## 3. Product goals

- Make personal spending understandable at a glance.
- Make receipt entry faster without trusting OCR blindly.
- Ensure all forecasts and insights can be traced to actual numbers.
- Connect spending behaviour to realistic savings-pocket completion dates.
- Keep the experience simple and responsive for mobile and desktop users.
- Keep calculations deterministic, testable, and independent of presentation code.

## 4. Scope boundaries

### In scope

- Firebase sign-up, sign-in, sign-out, and protected user data
- Monthly salary management
- Manual expense create, read, update, and delete
- Receipt image upload and OCR-assisted expense entry
- Monthly dashboard and charts
- Current-to-previous-month comparison
- Spending forecast
- Deterministic written insights
- Savings-pocket create, read, update, and delete
- Forecast-based completion estimates
- Exact DPS simulation using the public-data rule
- Dataset-driven tests
- Responsive user interface
- Vercel-compatible production deployment

### Out of scope for the required version

- Bank account connections
- Mobile financial-service synchronization
- Automatic recurring payments
- Multi-currency accounting
- Shared household accounts
- Investment trading
- Tax reporting
- A chatbot that invents financial advice
- Permanent receipt-image storage unless later approved
- Native Android or iOS applications

---

## 5. Core engineering principles adapted from the root documentation

Only product-independent principles will be retained:

1. Money must use exact decimal arithmetic. Ordinary JavaScript floating-point arithmetic must not determine financial outputs.
2. Business dates use `YYYY-MM-DD`; audit timestamps use UTC.
3. Every incoming API value is validated at the application boundary.
4. UI components never query MongoDB directly.
5. Controllers remain thin; services own use cases; repositories own Mongoose access.
6. Calculation engines are pure modules with unit tests.
7. Every protected database operation is scoped to the authenticated Firebase UID.
8. OCR results are drafts until the user explicitly confirms them.
9. Errors use clear language a non-technical user can understand.
10. The critical release gate is lint, type-check, test, and production build.

---

## 6. Modular architecture

The codebase will follow a modular monolith pattern. Features remain in one repository and one deployable frontend/API system, but each business capability owns its models, validation, controller, service, repository, types, and tests.

### Dependency flow

```text
Route
  -> authentication/validation middleware
  -> controller
  -> service/use case
  -> repository or pure calculation module
  -> Mongoose/MongoDB
```

Dependencies flow inward. A repository must not depend on a controller, and a calculation module must not depend on Express, React, or Mongoose.

### Backend modules

```text
apps/api/src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   ├── database.ts
│   └── firebase-admin.ts
├── shared/
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── error-handler.ts
│   │   ├── not-found.ts
│   │   └── rate-limit.ts
│   ├── errors/
│   ├── money/
│   ├── dates/
│   └── types/
└── modules/
    ├── users/
    ├── salaries/
    ├── expenses/
    ├── receipts/
    ├── dashboard/
    ├── forecasts/
    ├── insights/
    └── savings-pockets/
```

Each feature module should normally contain:

```text
module-name/
├── module-name.model.ts
├── module-name.validation.ts
├── module-name.repository.ts
├── module-name.service.ts
├── module-name.controller.ts
├── module-name.routes.ts
├── module-name.types.ts
└── module-name.test.ts
```

Not every module needs every file. Calculation-only modules such as forecasts and insights should avoid empty repositories or controllers and expose pure functions through their service.

### Frontend modules

```text
apps/web/
├── app/
│   ├── (auth)/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── receipts/
│   │   ├── savings-pockets/
│   │   └── settings/
│   └── layout.tsx
├── components/
│   └── ui/
├── features/
│   ├── auth/
│   ├── salary/
│   ├── expenses/
│   ├── receipt-review/
│   ├── dashboard/
│   ├── forecast/
│   └── savings-pockets/
├── lib/
│   ├── api-client.ts
│   ├── firebase.ts
│   ├── format-money.ts
│   └── format-date.ts
└── providers/
```

Each frontend feature owns its components, hooks, API calls, form schema, and display types. Shared visual primitives belong in `components/ui`; business-specific components stay inside the feature.

### Shared package

```text
packages/shared/
├── constants/
├── contracts/
├── schemas/
└── types/
```

Only cross-runtime contracts should live here. Database models and browser-only Firebase code must not be placed in the shared package.

---

## 7. Authentication and authorization

Firebase Authentication provides identity. The browser obtains a Firebase ID token and includes it with protected requests:

```http
Authorization: Bearer <firebase-id-token>
```

The Express authentication middleware will:

1. Read the bearer token.
2. Verify it with Firebase Admin.
3. Reject expired or invalid tokens.
4. Attach `firebaseUid`, email, and permitted identity claims to the request.
5. Never accept a user ID from the request body as ownership proof.

Every repository method for user-owned data receives `firebaseUid` and queries by both record ID and owner ID. This prevents cross-user access even if someone guesses a MongoDB ObjectId.

Initial authentication methods:

- Email and password
- Google sign-in if schedule permits
- Password-reset flow
- Sign out

---

## 8. Money and date rules

### Money

API money fields should be represented as decimal strings, for example `"856.50"`.

MongoDB will use one of these approved representations before implementation begins:

- Preferred: integer paisa (`856.50 BDT = 85650 paisa`) for application simplicity
- Alternative: MongoDB `Decimal128` with a decimal arithmetic library

The representation must be consistent across salary, expenses, pocket targets, contributions, forecasts, and DPS results. DPS interest is rounded half-up to two decimal places after each monthly calculation.

### Dates

- Salary month: `YYYY-MM`
- Expense date: `YYYY-MM-DD`
- API-created timestamps: UTC ISO timestamps
- Display timezone: `Asia/Dhaka`
- Future expense dates are rejected in the normal entry flow
- Month boundaries and leap years must use calendar-aware date utilities

---

## 9. Data model

### User profile

```text
UserProfile
- _id
- firebaseUid (unique)
- email
- displayName
- currency: BDT
- timezone: Asia/Dhaka
- createdAt
- updatedAt
```

### Monthly salary

```text
MonthlySalary
- _id
- firebaseUid
- month: YYYY-MM
- amount
- createdAt
- updatedAt
```

Unique index: `firebaseUid + month`.

### Expense

```text
Expense
- _id
- firebaseUid
- amount
- date: YYYY-MM-DD
- shop
- category
- note (optional)
- source: manual | receipt
- receiptMetadata (optional)
  - originalFileName
  - mimeType
  - provider
  - confidence
  - rawText (optional and size-limited)
- createdAt
- updatedAt
```

Indexes should support owner/month queries, category aggregation, date sorting, and shop search.

### Savings pocket

```text
SavingsPocket
- _id
- firebaseUid
- name
- itemDetails
- targetAmount
- currentSavedAmount (default zero)
- monthlyContribution
- dpsAnnualRate
- createdAt
- updatedAt
```

The public dataset has no current-saved field, so imported cases default it to zero.

---

## 10. Salary module

The user can add or replace the salary for a selected month, view it, and copy the previous salary when starting a new month.

Rules:

- Amount must be greater than zero.
- Only one salary exists per user per month.
- Updating salary immediately affects the dashboard, forecast, insights, and pocket estimates.
- When missing, the UI shows spending but explains that salary-based values are unavailable.

Endpoints:

```http
GET /api/salaries/:month
PUT /api/salaries/:month
```

---

## 11. Expense module

Manual expense fields:

- Amount
- Date
- Shop or merchant name
- Category
- Optional note

Initial categories based on the public cases:

- Clothing
- Education
- Entertainment
- Food
- Groceries
- Health
- Mobile
- Rent
- Transport
- Utilities
- Other

Users can create, view, edit, and delete their expenses. Deletion requires confirmation. The expense list supports month/category filtering, shop search, and date/amount sorting.

Validation:

- Amount is greater than zero.
- Date is valid and not unexpectedly in the future.
- Shop is non-empty.
- Category is from the supported list or safely normalized as `Other`.
- Ownership is checked for every read and mutation.

Endpoints:

```http
GET    /api/expenses?month=2026-09&category=Food&search=shop
POST   /api/expenses
GET    /api/expenses/:id
PATCH  /api/expenses/:id
DELETE /api/expenses/:id
```

---

## 12. Receipt OCR module

### Required workflow

```text
Select/take image
  -> preview image
  -> validate file
  -> upload for extraction
  -> OCR reads text
  -> parser selects amount, date, and shop
  -> editable review screen
  -> user corrects fields and chooses category
  -> explicit confirmation
  -> expense is saved
```

OCR extraction and expense persistence are separate actions. `POST /api/receipts/extract` never creates an expense.

Accepted initial types:

- JPEG
- PNG
- WebP

Target maximum size: 5 MB. File signature and MIME type should both be checked. OCR endpoints need authentication and rate limiting.

Normalized extraction contract:

```typescript
type ReceiptExtraction = {
  amount: string | null;
  date: string | null;
  shop: string | null;
  confidence: {
    amount: number;
    date: number;
    shop: number;
  };
  rawText?: string;
};
```

The parser should prefer totals near labels such as `Grand Total`, `Net Total`, `Total`, `Amount Paid`, and `Payable`. It must not silently choose a subtotal, VAT amount, change, phone number, or card number. Low-confidence fields are highlighted and remain editable.

The OCR provider will be behind an interface so it can be replaced without changing routes or business services. Provider selection is a pre-coding decision based on Bangladeshi-receipt accuracy, structured output, cost, quota, latency, and Vercel compatibility.

Endpoint:

```http
POST /api/receipts/extract
```

Permanent image storage is not required initially. The image may be processed transiently and discarded after extraction.

---

## 13. Dashboard module

The dashboard defaults to the current month and supports month selection.

### Summary

It displays:

- Monthly salary
- Total spent
- Remaining salary or current overspend
- Percentage of salary spent
- Forecast remaining spending
- Forecast month-end total
- Forecast money left or short

```text
remaining = salary - total spent
percentage spent = total spent / salary * 100
```

Salary-zero or missing-salary cases must not divide by zero.

### Category breakdown

```text
category total = sum(expenses in category)
category share = category total / total spent * 100
```

Display a readable chart plus category names, exact totals, and percentages. The numerical list remains the accessible source of truth.

### Largest expenses

Show the five highest expenses in the selected month with shop, category, date, and amount. Show all if fewer than five exist.

### Month-over-month change

The dashboard provides two comparisons:

1. Direct total: current selected month total versus previous full month total.
2. Primary fair comparison for an incomplete month: current month through today versus the previous month through the equivalent day.

```text
change amount = current comparison total - previous comparison total
change percent = change amount / previous comparison total * 100
```

When the previous comparison total is zero, show an explanatory state instead of an invalid percentage.

Endpoint:

```http
GET /api/dashboard?month=2026-09
```

The response includes summary, categories, largest expenses, comparisons, forecast, insights, and pocket affordability information needed by the screen.

---

## 14. Forecast module

The first version uses a transparent daily-pacing model.

```text
elapsed days = current day number
days in month = calendar days in selected month
remaining days = days in month - elapsed days
daily pace = spending so far / elapsed days
expected remaining spending = daily pace * remaining days
expected month-end spending = spending so far + expected remaining spending
expected month-end balance = salary - expected month-end spending
```

Positive balance means expected money left. Negative balance means expected shortfall.

Historical completed months use actual totals and zero expected remaining spending. Future months do not receive a spending forecast. The UI explains that the forecast continues the average daily spending pace and is an estimate.

Fixed-cost-aware forecasting may be added later, but it must not replace the baseline without a documented, testable rule.

---

## 15. Written insights module

Insights are deterministic templates populated from dashboard calculations. They do not rely on a language model to invent advice.

Every response returns at least three distinct insights when enough expense data exists. Each insight must name a category or merchant and include an exact amount or percentage.

Candidate types:

- Forecast shortfall or surplus
- Largest spending category and its amount/share
- Largest category increase from the comparable previous period
- Largest category decrease
- Largest individual expense
- Largest merchant concentration
- Category month-end projection
- Category share of salary

Priority:

1. Forecast shortfall
2. Largest category
3. Largest category increase
4. Largest expense
5. Largest decrease
6. Forecast surplus
7. Merchant concentration

Examples:

- `Food spending is BDT 4,850.00, BDT 1,120.00 higher than the same period last month.`
- `Rent is the largest category at BDT 16,000.00, equal to 32.00% of salary.`
- `At the current pace, spending may reach BDT 67,400.00, producing a BDT 2,400.00 shortfall.`

The engine must never claim causation or use a number that cannot be reproduced from the response data.

---

## 16. Savings-pockets module

Users can create, view, edit, and delete pockets with:

- Name
- Target amount
- Item details
- Monthly contribution
- Optional current saved amount
- DPS annual rate

Validation:

- Name and item details are required.
- Target and monthly contribution are greater than zero.
- Current saved amount and DPS rate are not negative.
- A completed pocket remains viewable.

Endpoints:

```http
GET    /api/pockets
POST   /api/pockets
GET    /api/pockets/:id
PATCH  /api/pockets/:id
DELETE /api/pockets/:id
```

### Forecast savings capacity

```text
forecast capacity = max(salary - expected month-end spending, 0)
```

### Multiple-pocket affordability

The same forecast capacity cannot be promised independently to every pocket. Let:

```text
P = sum of all planned monthly pocket contributions
S = forecast monthly savings capacity
affordability factor = min(1, S / P)
effective contribution for pocket i = planned contribution i * affordability factor
```

If `S <= 0`, show `Not currently achievable at this spending pace` instead of a false date. If salary is missing, ask the user to set it. The UI displays both planned and forecast-adjusted contributions so the estimate is transparent.

### Completion calculation

```text
remaining target = max(target - current saved, 0)
months required = ceiling(remaining target / effective contribution)
```

Display both approximate months and a calendar completion month. If already saved is at least the target, mark the pocket complete now.

---

## 17. DPS calculation

Every pocket shows the exact annual DPS rate used. The projection follows the dataset rule for every month:

1. Add the monthly deposit to the balance.
2. Calculate `balance * annual rate / 12 / 100`.
3. Round that month's interest half-up to the paisa.
4. Add interest to the balance.
5. Use the updated balance in the next month.

```text
balance = 0
total deposits = 0

repeat for completion months:
    balance = balance + monthly deposit
    total deposits = total deposits + monthly deposit
    interest = roundHalfUp(balance * rate / 12 / 100, 2)
    balance = balance + interest

interest earned = balance - total deposits
```

Display:

- Annual rate
- Duration in months
- Monthly DPS deposit
- Total deposits
- Interest earned
- Projected final DPS value

The UI states that this is a projection under the displayed calculation rule and that actual bank fees, tax, and product rules may differ.

---

## 18. Public dataset strategy

The JSON has schema version 2.1 and 25 `P12` cases. Each case supplies `today`, `months`, `salary_bdt`, expenses, pockets, an annual DPS rate, and the DPS rule.

It will be used for:

- Development/demo seeding
- Dashboard aggregation tests
- Same-period and full-month comparison tests
- Forecast tests
- Written-insight tests
- Pocket affordability and completion tests
- DPS precision and rounding tests

The original file remains unchanged. A later development-only importer may copy a sanitized version into a project test-fixture location. Production must not read from the Downloads path.

Dataset invariants to verify for every public case:

- Category totals add up to the selected-month total.
- Largest expenses are correctly sorted.
- Forecast remaining spending is never negative.
- At least three insights contain traceable numerical values.
- Effective pocket contributions do not exceed forecast capacity in total.
- DPS final value equals total deposits plus accumulated interest.
- Money outputs use two decimal places.

---

## 19. User interface and routes

### Authentication

- `/login`
- `/register`
- `/forgot-password`

### Protected application

- `/dashboard`
- `/expenses`
- `/expenses/new`
- `/expenses/:id/edit`
- `/receipts/new`
- `/savings-pockets`
- `/savings-pockets/new`
- `/savings-pockets/:id`
- `/settings`

### UX requirements

- Mobile-first responsive layout
- Clear Bangladeshi Taka formatting
- One obvious primary action per form
- Loading, empty, error, and success states
- Keyboard-accessible forms and dialogs
- Chart information repeated as readable text
- Destructive actions require confirmation
- OCR review visibly distinguishes extracted versus user-corrected data
- Forecasts label themselves as estimates

---

## 20. Error handling

The API uses a consistent error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter an amount greater than zero.",
    "fields": {}
  }
}
```

Expected codes include:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `DUPLICATE_MONTHLY_SALARY`
- `UNSUPPORTED_RECEIPT_TYPE`
- `RECEIPT_TOO_LARGE`
- `OCR_EXTRACTION_FAILED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Internal provider or database details are logged safely but not exposed to the browser.

---

## 21. Security plan

- Verify Firebase tokens only on the backend.
- Scope all user-owned records by authenticated UID.
- Keep Firebase Admin, MongoDB, and OCR credentials in server environment variables.
- Never expose OCR provider secrets through Next.js public variables.
- Validate upload signature, type, and size.
- Apply OCR route rate limits.
- Do not serve uploaded images from the application origin unless permanent storage is explicitly added.
- Validate and normalize every request.
- Configure production HTTPS and safe CORS origins.
- Avoid logging tokens, receipt images, or unnecessary OCR text.
- Return generic internal-error messages.
- Test cross-user record access for every module.

---

## 22. Testing strategy

### Unit tests

- Money conversion and formatting
- Half-up rounding
- Salary/expense totals
- Category aggregation
- Largest-expense ordering
- Full-month and same-period changes
- Zero-denominator comparisons
- Month lengths and leap years
- Daily-pacing forecast
- Surplus and shortfall calculation
- Insight generation and ranking
- Pocket proportional allocation
- Completion-month calculation
- DPS monthly simulation

### Integration tests

- Firebase-authenticated API access
- Salary uniqueness per user/month
- Expense CRUD ownership
- Pocket CRUD ownership
- Dashboard aggregation
- Receipt validation and mocked OCR response
- Invalid input and error envelopes

### End-to-end tests

1. Register or sign in.
2. Set a salary.
3. Add a manual expense.
4. Upload a receipt.
5. Correct extracted fields.
6. Confirm and save the receipt expense.
7. See the dashboard update.
8. See forecast and at least three insights.
9. Create a savings pocket.
10. See completion and DPS projections.
11. Edit and delete owned records.

### Release checks

```text
lint
type-check
unit tests
integration tests
production build
critical manual flow
```

---

## 23. Delivery phases

### Phase 0 — Planning decisions

Approve:

- OCR provider
- Integer-paisa versus Decimal128 representation
- Exact Express-on-Vercel deployment shape
- Baseline forecast formula
- Proportional allocation across pockets
- Default DPS rate behaviour

Deliverable: accepted calculation and architecture contract.

### Phase 1 — Foundation

- Workspace and modular directory structure
- Next.js application
- Express API
- Environment validation
- MongoDB connection
- Firebase client and Admin setup
- Authentication middleware
- Shared API client and error handling
- Base responsive protected layout

### Phase 2 — Salary and manual expenses

- Salary module and screen
- Expense model and CRUD API
- Manual expense forms
- Expense list, filters, search, and sorting
- Ownership and validation tests

### Phase 3 — Receipt OCR

- Upload validation
- OCR adapter and selected provider
- Amount/date/shop parser
- Editable receipt review screen
- Explicit confirmation and expense creation
- Low-confidence and failure handling

### Phase 4 — Monthly dashboard

- Summary cards
- Category aggregation and chart
- Largest expenses
- Full previous-month comparison
- Same-period comparison
- Empty and missing-salary states

### Phase 5 — Forecast and insights

- Pure forecast engine
- Month-end surplus/shortfall
- Deterministic insight candidates
- Ranking and at least three specific insights
- Dataset-driven verification

### Phase 6 — Savings pockets and DPS

- Pocket CRUD
- Forecast savings capacity
- Proportional contribution allocation
- Completion date
- Exact monthly DPS simulator
- Pocket cards and details

### Phase 7 — Hardening and deployment

- Complete public-case test run
- Authorization tests
- Receipt error testing
- Responsive and accessibility review
- Performance review
- Production environment configuration
- Vercel deployment
- Final acceptance walkthrough

---

## 24. Pre-coding decisions

The following must be decided before feature implementation:

1. **OCR provider:** choose after testing representative Bangladeshi receipts.
2. **Money storage:** integer paisa is preferred unless Decimal128 provides a demonstrated advantage.
3. **Deployment:** confirm whether Express is deployed as a Vercel-compatible API within the repository or as a separately configured Vercel project.
4. **Pocket allocation:** approve proportional reduction when combined planned contributions exceed forecast savings.
5. **DPS deposit:** use the forecast-adjusted effective contribution for the DPS comparison so all pocket projections share the same affordability assumption.
6. **Current date:** production uses the user's current Dhaka date; dataset tests use each case's supplied `today` value.

---

## 25. Definition of done

The project is complete when:

- Users can authenticate and sign out.
- Users can set and edit a salary for a month.
- Users can create, view, edit, and delete expenses.
- Users can upload a supported receipt image.
- The system extracts amount, date, and shop.
- Extracted values are shown before saving.
- Every extracted value can be corrected.
- Nothing is saved until the user confirms it.
- The dashboard shows salary, spending, remaining balance, and percent spent.
- It shows category totals and shares.
- It shows the largest expenses.
- It shows current versus previous-month change.
- It forecasts spending for the rest of the current month.
- It shows expected money left or expected shortfall.
- It produces at least three category/merchant-and-amount-specific insights.
- Users can manage savings pockets with all required fields.
- Every pocket shows a forecast-aware completion estimate or an honest unavailable state.
- Every pocket states its DPS annual rate and displays deposits, interest, and final projected value.
- DPS calculations exactly follow the public-data monthly rule.
- All 25 public cases pass dataset-driven invariants.
- Cross-user access is prevented and tested.
- The application is usable on mobile and desktop.
- Lint, type-check, tests, and production build pass.
- The application is successfully deployed with production secrets kept server-side.

---

## 26. Final planning recommendation

Use the modular monolith described here and implement one complete vertical feature at a time. Keep forecasts, insights, money arithmetic, and DPS logic as pure tested modules. Treat OCR as an assisted data-entry workflow rather than an authoritative source. Use the supplied dataset as the calculation test contract, and keep all UI explanations tied to exact values returned by the backend.
