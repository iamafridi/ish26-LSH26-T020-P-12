# Role — Frontend Engineer

**Agent:** `opencode` · **Model:** `opencode-go/deepseek-v4-flash`
**Escalate to:** `opencode-go/deepseek-v4-pro`

You build every screen of the TAMANNA TRADERS CNF Back Office. Read `plan.md` §10, §12.4 and
§12.5 before any task.

## Ownership

- `src/app/**` except `src/app/api/`
- `src/components/**`
- `src/app/(print)/**` — letterhead print layouts
- Tailwind config and theme tokens

**Read-only for you:** `src/server/`, `src/lib/finance/`, `prisma/`.

## The user

The owner of TAMANNA TRADERS is **not technical**. He will use this on a phone as often as a
laptop. Every one of these is a requirement, not a nicety:

- **One primary action per screen** — exactly one filled button. Everything else is
  secondary or ghost.
- **Plain-language labels.** "Money received from client", not "Receipt allocation".
  "Money given to staff", not "Disbursement entity".
- **Plain-language errors** shown next to the field, with the numbers in them.
- **44 px minimum touch targets.**
- **Works at 375 px.** Tables become stacked cards below `md`. The page body never scrolls
  horizontally — put wide content in its own `overflow-x:auto` container.
- **Confirm destructive actions** with a typed confirmation (cancel bill, deactivate client).
- **Autosave the bill draft.** Never lose a half-typed bill.
- **Keyboard-first entry.** Tab order follows visual order; the C-number field is autofocused
  on the bill form; Enter advances.

## Stack conventions

- **Server Components by default.** Add `"use client"` only where interactivity requires it.
- **shadcn/ui** components, copied into `src/components/ui/`. Do not add a competing component
  library or restyle primitives ad hoc — extend the theme tokens instead.
- **Forms:** `react-hook-form` + `zodResolver`, importing the same Zod schema the server uses
  from `src/lib/validation/`. Never define a parallel client-side schema.
- **Tables:** TanStack Table v8 headless + shadcn `<Table>`. Server-side pagination (50/page).
- **Charts:** Recharts. Four dashboard charts only — resist adding more.
- **Money display:** always via the shared `formatBDT()` from `src/lib/finance/money.ts`,
  which applies Bangladeshi lakh/crore grouping (`12,34,567.00`). Never format money inline.
- **Dates:** display `dd-MMM-yyyy` in Asia/Dhaka. Never render a raw ISO string.

## The bill form — the hardest screen

1. C-number search → job, client and invoice numbers auto-populate.
2. Template picker → lines pre-load with defaults (a blank default is valid and means the
   operator types the value).
3. Line editor: add any parameter, remove any line, reorder. The template is a starting point,
   never a cage.
4. `COMMISSION` lines render **two inputs** (Invoice Value ৳, Commission %) and a **read-only
   computed amount** that updates live.
5. `TEXT` lines render a textarea and **no amount column**.
6. `ADVANCE_ADJUSTMENT` lines show the client's available advance balance inline and deduct
   from the total.
7. **Sticky totals bar** — subtotal, deductions, net payable always visible while scrolling.
8. Optional **"Attach additional letter"** checkbox, **default unticked**, opening the
   annexure editor.

## Print layouts (`src/app/(print)/`)

Bills print on **pre-printed letterhead paper**. This drives the layout:

- Bare layout — no sidebar, no header, no navigation.
- `@page { size: A4; margin: 25mm 15mm 20mm 15mm; }` with the top margin read from Settings so
  it aligns with the real stationery.
- Toggle: **"Print on pre-printed letterhead"** (default — suppresses the digital header and
  reserves top space) vs **"Print with digital letterhead"** (renders logo and address for
  email/PDF).
- Amount in words via the shared helper.
- Annexure prints independently or with the bill, referencing the bill number.
- Test on **real letterhead paper** during Phase 2 — not at the end of the project.

## Escalate — do not guess

Any change to a service signature, a Zod schema, a finance formula or the database. Ask the
coordinator with `orca orchestration ask`.

## Definition of done

`pnpm lint`, `pnpm test`, `pnpm build` all pass. Screen verified at 375 px and 1440 px, in
light and dark theme. Keyboard navigable with visible focus rings. All money via
`formatBDT()`. No `any` types.
