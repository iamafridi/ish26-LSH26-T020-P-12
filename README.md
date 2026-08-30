# Personal Ledger Manager

Team **LSH26-T020** - Problem **P12**

Personal Ledger Manager is a full-stack web application for recording salary and expenses, extracting expense details from receipt photos, understanding monthly spending, forecasting month-end finances, and planning item-specific savings goals with DPS projections.

The frontend and backend are separate applications in one npm workspace. The implementation follows a feature-first modular architecture so that authentication, expenses, receipts, dashboards, forecasts, insights, and savings pockets remain independently maintainable.

## Team

| Member | GitHub |
| --- | --- |
| Afridi Akbar Ifty | [iamafridi](https://github.com/iamafridi) |
| Asif Zaman | [A-K-M-Asifuzzaman](https://github.com/A-K-M-Asifuzzaman) |
| Akram Rahat | [akramrafid](https://github.com/akramrafid) |

## Problem requirements and implementation

| P12 requirement | What the application provides |
| --- | --- |
| Set a monthly salary and add expenses | A salary can be saved independently for each `YYYY-MM` month. Expenses support create, view, edit, delete, search, filtering, and sorting. |
| Upload and verify a bill or receipt | Authenticated users can upload one JPEG, PNG, or WebP image up to 5 MB. Google Cloud Vision reads its text, and the application proposes the amount, date, and shop. Every extracted field is shown in an editable confirmation form before anything is saved. |
| Show a monthly dashboard | The dashboard displays salary, total spent, remaining money, salary percentage used, expense count, category totals and shares, largest expenses, full-month comparison, and a fair same-day comparison for the current month. |
| Forecast and produce specific insights | A deterministic daily-pace forecast calculates expected remaining spending, expected month-end spending, and expected surplus or shortfall. At least three insights use actual category, merchant, amount, percentage, salary, and forecast values. |
| Create savings pockets and calculate DPS | Each pocket stores a name, item details, target, already-saved amount, desired monthly contribution, and a stated annual DPS rate. The app estimates an affordable contribution, completion month, total deposits, interest, and final DPS value. |

## Main features

- Firebase email/password registration, sign-in, sign-out, and password-reset email
- Protected application pages and authenticated API requests using Firebase ID tokens
- Monthly salary create/update and retrieval
- Manual expense creation, editing, deletion, searching, filtering, and sorting
- Receipt OCR with a required review-and-correct step before saving
- Monthly salary-versus-spending dashboard
- Category breakdown and largest-expense ranking
- Full-month and same-period previous-month comparisons
- Daily-pace month-end spending and balance forecast
- Deterministic, number-specific spending insights
- Savings-pocket create, read, update, and delete operations
- Forecast-aware contribution allocation across multiple pockets
- Deposit-first, monthly-compounded DPS projections at a user-stated rate
- Responsive interface for desktop and mobile use

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, CSS |
| Client authentication | Firebase Authentication |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB with Mongoose |
| Server authentication | Firebase Admin ID-token verification |
| Receipt OCR | Google Cloud Vision |
| Validation | Zod |
| Security middleware | Helmet, CORS, Express Rate Limit, Multer limits |
| Testing | Vitest, Supertest |
| Deployment target | Two Vercel projects from one repository |

## Repository structure

```text
.
|-- frontend/
|   |-- src/app/                 Next.js routes and layouts
|   |-- src/lib/                 API client, Firebase client, dates, money display
|   |-- src/modules/             Feature modules and UI components
|   `-- tests/                   Frontend unit tests
|-- backend/
|   |-- scripts/                 Optional local demo-user and public-data seed tools
|   |-- src/config/              Environment, MongoDB, and Firebase Admin setup
|   |-- src/modules/             Domain modules
|   |-- src/shared/              Shared errors, dates, money, middleware, validation
|   `-- tests/                   Unit, route, authorization, and dataset tests
|-- EVENT.md                     Event, team, problem, and start-code metadata
|-- evaluation-manifest.json     Evaluator entrypoints and deployment metadata
|-- LICENSES.md                  Project and dependency licensing information
|-- package.json                 Workspace commands
`-- README.md                    Project documentation
```

The internal planning documents are intentionally ignored by Git. They are development material rather than submission artifacts.

## Architecture

The browser signs a user in through Firebase Authentication. For protected calls, the frontend retrieves the current Firebase ID token and sends it as a bearer token to the Express API. The backend verifies that token with Firebase Admin and obtains the user's UID. Every salary, expense, dashboard query, and savings-pocket operation is then scoped to that UID.

```text
Browser / Next.js
       |
       | Authorization: Bearer <Firebase ID token>
       v
Express API
       |
       | authentication -> validation -> controller -> service -> repository
       v
MongoDB

Receipt image -> authenticated upload -> Google Cloud Vision -> parser
              -> editable browser review -> confirmed expense -> MongoDB
```

The backend is organized by business capability. A typical module contains:

- `*.routes.ts` for HTTP endpoints and middleware order
- `*.controller.ts` for request and response handling
- `*.validation.ts` for request validation
- `*.service.ts` for business rules
- `*.repository.ts` for database access
- `*.model.ts` for the Mongoose schema

Forecasting, written insights, receipt parsing, money conversion, and savings/DPS projections are kept outside route code so their behavior can be tested directly.

## Data and calculation rules

### Money

Money is never persisted as a floating-point value. The backend converts API decimal strings such as `1250.50` into integer paisa (`125050`) before saving them. It converts paisa back into two-decimal strings at the API boundary. This avoids cumulative floating-point errors in totals, comparisons, and projections.

### Dates and months

- Expense dates use `YYYY-MM-DD`.
- Salary and dashboard months use `YYYY-MM`.
- Date-sensitive calculations use the `Asia/Dhaka` calendar date.
- Each salary is unique for a user and month.
- Receipt dates that cannot be confidently detected remain editable before confirmation.

### Expense categories

The supported categories are:

`Clothing`, `Education`, `Entertainment`, `Food`, `Groceries`, `Health`, `Mobile`, `Rent`, `Transport`, `Utilities`, and `Other`.

### Dashboard comparison

For a completed historical month, the dashboard compares the selected full month with the previous full month. For the current month it also compares both months through the same day number, preventing a partial current month from being presented as equivalent to an entire previous month.

Change percentage is calculated as:

```text
((current spending - previous spending) / previous spending) x 100
```

When previous spending is zero, the percentage is returned as unavailable rather than inventing an infinite percentage.

### Forecast

The current-month forecast uses actual daily spending pace:

```text
daily average = spent so far / elapsed days
expected month-end spending = spent so far x days in month / elapsed days
expected remaining spending = expected month-end spending - spent so far
expected balance = salary - expected month-end spending
```

Historical months use their final recorded spending. Future months return an unavailable forecast because no actual spending pace exists yet. Calculations use integer paisa and half-up rounding.

### Written insights

Insights are generated from ledger facts rather than general-purpose advice. Depending on available data, they identify:

- the highest-spending category, its amount, and its share of total spending;
- category increases or decreases against the comparable previous period;
- the largest merchant expense and amount;
- salary utilization and remaining balance;
- forecast month-end spending and the expected surplus or shortfall.

The service returns at least three data-specific insights when the dashboard has enough actual numbers.

### Savings affordability and completion

The current month's forecasted non-negative balance becomes the total savings capacity. If all planned monthly contributions fit within that capacity, each pocket keeps its planned contribution. Otherwise, the capacity is divided proportionally across all pockets:

```text
effective contribution = planned contribution x forecast capacity / total planned contributions
completion months = ceiling(remaining target / effective contribution)
```

A pocket is marked `salary-required`, `not-affordable`, `active`, or `complete` according to its data and the forecast. The estimated completion month is derived from the effective contribution, not an unaffordable desired contribution.

### DPS projection

The user states the annual DPS interest rate for each pocket. The projection deposits the effective contribution first and then applies one month of interest, repeating until the estimated completion duration:

```text
monthly rate = annual rate / 12
monthly balance = (previous balance + monthly deposit) + monthly interest
final value = total deposits + interest earned
```

The API reports the rate, duration, effective monthly deposit, total deposits, interest earned, and final value. Rates are limited to `50.00%` annually, and extremely long projections are reported as unavailable rather than running an unbounded simulation. This is an estimate, not a bank quotation; actual DPS rules, tax, fees, compounding, and maturity terms depend on the financial institution.

## Prerequisites

Install or create the following before running the application:

- Node.js 22 or newer
- npm 11 or newer
- A MongoDB Atlas database, or another reachable MongoDB instance
- A Firebase project with Email/Password Authentication enabled
- A Firebase Web App for the public frontend configuration
- A Firebase service account for backend ID-token verification
- Google Cloud Vision API enabled in the backend Firebase/Google Cloud project

## External service setup

### 1. MongoDB

1. Create a MongoDB Atlas project and cluster.
2. Create a database user with access to the application database.
3. Add the IP/network access required for local development or deployment.
4. Copy the connection URI into `backend/.env` as `MONGODB_URI`.
5. Do not place the URI in source code, screenshots, commits, or documentation.

Mongoose creates the required collections and indexes when the application first uses the models.

### 2. Firebase Authentication

1. Create a Firebase project.
2. Open **Authentication > Sign-in method** and enable **Email/Password**.
3. Register a Firebase Web App and copy its configuration values into `frontend/.env.local`.
4. In **Project settings > Service accounts**, create backend service-account credentials.
5. Put the project ID, client email, and private key into `backend/.env`.
6. For production, add the deployed frontend domain under Firebase Authentication's authorized domains.

The frontend Firebase values begin with `NEXT_PUBLIC_` and are expected to be visible in browser code. They identify the Firebase project but do not replace backend authorization. The service-account private key is a secret and must exist only in the ignored backend environment file or deployment environment settings.

### 3. Google Cloud Vision

1. Enable the Cloud Vision API for the Google Cloud project used by the backend service account.
2. Ensure the service account can call the Vision API.
3. Keep `OCR_PROVIDER=google-vision` in the backend environment.
4. Use a clear, upright, well-lit receipt image for the most reliable extraction.

Receipt extraction accepts JPEG, PNG, and WebP. It checks both the declared type and the file signature, processes the image in memory, and does not permanently store the uploaded file.

## Environment configuration

Create local environment files from the safe examples:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
```

### Frontend variables

| Variable | Purpose | Local example |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for the versioned backend API | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App API key | From Firebase Web App settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | From Firebase Web App settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | From Firebase Web App settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket value | From Firebase Web App settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | From Firebase Web App settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID | From Firebase Web App settings |

### Backend variables

| Variable | Purpose | Local example |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | Local Express port | `4000` |
| `FRONTEND_URL` | Exact allowed CORS origin | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection URI | Set privately |
| `FIREBASE_PROJECT_ID` | Firebase Admin project ID | Set privately |
| `FIREBASE_CLIENT_EMAIL` | Firebase service-account email | Set privately |
| `FIREBASE_PRIVATE_KEY` | Firebase service-account private key | Set privately |
| `OCR_PROVIDER` | Receipt OCR implementation | `google-vision` |

Keep `FIREBASE_PRIVATE_KEY` on one line with escaped newlines:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Never commit `frontend/.env.local`, `backend/.env`, a service-account JSON file, a MongoDB URI, test credentials, or downloaded participant data. The repository ignores local environment files while retaining both `.env.example` templates.

## Install and run locally

From the repository root:

```powershell
npm install
npm run dev
```

The root command starts both workspaces:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/api/v1/health`

Run either application separately when debugging:

```powershell
npm run dev:frontend
npm run dev:backend
```

Create a production build and start it locally with:

```powershell
npm run build
npm run start --workspace backend
npm run start --workspace frontend
```

The backend's local production command uses `dist/server.js`. Vercel uses the default-exported Express application in `backend/src/index.ts`.

## Application routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/login` | Public | Email/password sign-in |
| `/register` | Public | Account registration |
| `/forgot-password` | Public | Request a Firebase password-reset email |
| `/dashboard` | Authenticated | Salary, spending analysis, comparison, forecast, and insights |
| `/expenses` | Authenticated | Add, browse, filter, edit, and delete expenses |
| `/receipts` | Authenticated | Upload a receipt, review OCR fields, and confirm an expense |
| `/savings-pockets` | Authenticated | Manage goals and review forecast/DPS projections |

## API reference

The base path is `/api/v1`. Except for the health route, all endpoints require:

```http
Authorization: Bearer <Firebase ID token>
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Confirm the API process is available |
| `GET` | `/auth/me` | Return the verified Firebase identity |
| `GET` | `/salaries/:month` | Get the authenticated user's salary for `YYYY-MM` |
| `PUT` | `/salaries/:month` | Create or replace salary for `YYYY-MM` |
| `GET` | `/expenses` | List owned expenses with supported query filters |
| `POST` | `/expenses` | Create a manual expense |
| `GET` | `/expenses/:id` | Get one owned expense |
| `PATCH` | `/expenses/:id` | Update one owned expense |
| `DELETE` | `/expenses/:id` | Delete one owned expense |
| `POST` | `/receipts/extract` | Upload multipart field `receipt` and return proposed fields |
| `POST` | `/receipts/confirm` | Validate reviewed receipt fields and create an expense |
| `GET` | `/dashboard?month=YYYY-MM` | Get the complete monthly dashboard result |
| `GET` | `/savings-pockets` | List pockets with current projections |
| `POST` | `/savings-pockets` | Create a pocket |
| `GET` | `/savings-pockets/:id` | Get one owned projected pocket |
| `PATCH` | `/savings-pockets/:id` | Update one owned pocket |
| `DELETE` | `/savings-pockets/:id` | Delete one owned pocket |

Successful responses and validation errors use JSON. Business errors include a stable error code and a human-readable message. Unknown routes return `404`, while unexpected errors are handled centrally without exposing stack traces in production.

## Optional local demo data

The organizer-provided `P12_personal_ledger_public.json` dataset is not stored in this repository. The optional scripts can create a Firebase demo account and seed one selected public case into MongoDB without hardcoding credentials or machine-specific paths.

Add these values only to the ignored `backend/.env` file:

```env
P12_DATASET_PATH=C:\path\to\P12_personal_ledger_public.json
DEMO_USER_UID=choose-a-demo-uid
DEMO_USER_EMAIL=demo-address-you-control@example.com
DEMO_USER_PASSWORD=choose-a-strong-temporary-password
SEED_CASE_ID=PUB-01
```

Then run:

```powershell
npm run demo:user --workspace backend
npm run seed:public --workspace backend
```

The seed script only replaces salary, expense, and savings-pocket records owned by the configured `DEMO_USER_UID`, and it loads only the selected `SEED_CASE_ID`. Use a dedicated demo UID, verify the target database first, and never point the script at another user's UID.

## Automated testing and quality checks

Run the complete repository check from the root:

```powershell
npm run check
```

This command runs, in order:

1. ESLint for both applications
2. Strict TypeScript checks for both applications
3. Frontend and backend Vitest suites
4. Production builds for both applications

Run individual stages when diagnosing a failure:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

The automated suite covers:

- authenticated API behavior and cross-user authorization protection;
- exact decimal-money parsing and formatting;
- current, historical, and future forecast behavior;
- numerical written insights;
- contribution allocation, completion, and DPS projections;
- receipt text parsing;
- health routing;
- frontend authenticated API request behavior;
- organizer public-dataset invariants.

### Run the public dataset suite

Point the test at your local dataset for the duration of one PowerShell session:

```powershell
$env:P12_DATASET_PATH='C:\path\to\P12_personal_ledger_public.json'
npm run test:dataset
Remove-Item Env:P12_DATASET_PATH
```

The suite validates all supplied cases without copying the dataset or its local path into the repository. If the variable is absent during the normal `npm test`, the dataset-only suite is skipped and all repository-owned tests still run.

## Manual end-to-end test checklist

1. Start MongoDB access, configure both environment files, and run `npm run dev`.
2. Register using a test email address and sign in.
3. Set a salary for the current month and refresh the page to confirm persistence.
4. Add at least three manual expenses in different categories.
5. Edit one expense, delete another, and verify search/filter/sort behavior.
6. Upload a clear JPEG, PNG, or WebP receipt under 5 MB.
7. Confirm that amount, date, and shop are displayed before saving.
8. Deliberately correct one extracted value and confirm the receipt expense.
9. Verify that the corrected expense appears in the ledger and dashboard.
10. Check total spent, remaining salary, category shares, largest expenses, and expense count.
11. Add previous-month expenses and verify the full-month and current same-period comparisons.
12. Confirm forecast remaining spending, month-end spending, and surplus/shortfall values.
13. Confirm at least three insights name actual categories, merchants, amounts, or percentages.
14. Create two savings pockets whose total planned contribution is below forecast capacity.
15. Create or increase pockets so planned contributions exceed capacity and verify proportional reduction.
16. Review each pocket's effective contribution, completion month, stated rate, deposits, interest, and final DPS value.
17. Sign out and confirm that protected pages redirect to login.

## Vercel deployment

Deploy the two applications as separate Vercel projects connected to the same repository.

### Backend project

1. Import the repository into Vercel.
2. Set **Root Directory** to `backend`.
3. Add all required backend environment variables.
4. Set `NODE_ENV=production`.
5. Set `FRONTEND_URL` to the final frontend origin with no trailing path.
6. Deploy and verify `https://<backend-domain>/api/v1/health`.

Vercel detects the default-exported Express app in `backend/src/index.ts`. The MongoDB connection is initialized lazily and reused when possible, which supports serverless request handling.

### Frontend project

1. Import the same repository as another Vercel project.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Next.js framework preset.
4. Add all required frontend environment variables.
5. Set `NEXT_PUBLIC_API_URL=https://<backend-domain>/api/v1`.
6. Deploy the frontend.
7. Add the frontend domain to Firebase Authentication authorized domains.

If the frontend URL changes, update backend `FRONTEND_URL`. If the backend URL changes, update frontend `NEXT_PUBLIC_API_URL`. Redeploy the affected project after changing environment variables.

See Vercel's [monorepo guide](https://vercel.com/docs/monorepos) and [Express deployment guide](https://vercel.com/kb/guide/ship-a-express-app-on-vercel) for the platform-specific setup.

## Security and privacy

- Every user-owned database operation includes the verified Firebase UID.
- The backend never trusts a UID supplied by the browser as ownership proof.
- Protected routes reject missing, invalid, or expired Firebase ID tokens.
- Request payloads and route parameters are validated before business logic runs.
- CORS accepts only the configured frontend origin.
- Helmet supplies common HTTP security headers.
- JSON requests are limited to 1 MB.
- Receipt extraction is authenticated and limited to 10 requests per minute per client.
- Receipt uploads accept one file up to 5 MB and validate the file signature.
- Uploaded receipt images remain in memory and are not permanently stored.
- Private values live in ignored environment files or deployment environment settings.
- Database errors and stack traces are not exposed to production clients.
- Dependency review currently reports no high or critical advisories; known transitive notices are documented in `LICENSES.md`.

Before every push, inspect staged changes and verify that no `.env` file, service-account file, dataset, credential, personal ledger record, or deployment secret is included.

## Troubleshooting

### The frontend reports a network or CORS error

- Confirm that the backend is running and `/api/v1/health` responds.
- Check that `NEXT_PUBLIC_API_URL` includes `/api/v1`.
- Check that backend `FRONTEND_URL` exactly matches the browser origin.
- Restart or redeploy after changing environment variables.

### Sign-in works but protected API calls return `401`

- Confirm the frontend and backend Firebase project IDs refer to the same project.
- Recheck `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
- Ensure private-key newlines are represented as `\n` in the environment value.
- Sign out and sign back in to obtain a fresh ID token.

### MongoDB does not connect

- Verify the `MONGODB_URI`, database user permissions, and Atlas network access list.
- Confirm special characters in the URI username/password are URL-encoded.
- Do not add quotes unless they are required by the environment provider.

### Receipt extraction fails

- Verify the Cloud Vision API is enabled and the service account has permission.
- Use a supported image under 5 MB with clear, upright text.
- Confirm the file extension matches its real image format.
- When OCR cannot read a receipt, add the expense manually; no incomplete OCR result is automatically saved.

### A forecast or savings completion date is unavailable

- Set a salary for the current month.
- Add actual current-month spending so a meaningful pace exists.
- Ensure the forecast leaves a positive balance for savings.
- Ensure the pocket has a positive target and monthly contribution.

## Assumptions and limitations

- The application is a personal budgeting tool, not accounting, tax, credit, or investment advice.
- Currency values are displayed in BDT and stored internally as paisa.
- Forecasts extrapolate current daily spending pace; unexpected future purchases will change the result.
- OCR quality depends on image quality, receipt layout, language, and print clarity, so confirmation is mandatory.
- DPS results are mathematical estimates based on the stated nominal annual rate and monthly compounding; a bank's real product may use different rules.
- The application has no billing system, bill numbering, staff ledger, loan ledger, accounting-grade allocation, or enterprise deployment machinery because those are outside P12.

## Submission files

The required root files are present:

- [`README.md`](README.md) - application documentation
- [`evaluation-manifest.json`](evaluation-manifest.json) - evaluation entrypoints and status
- [`EVENT.md`](EVENT.md) - team ID, problem ID, and start code
- [`LICENSES.md`](LICENSES.md) - project and dependency license information

Internal docs, local datasets, build outputs, credentials, and environment files are excluded from version control.
