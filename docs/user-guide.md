# TAMANNA TRADERS — Back Office User Manual

This is the complete manual for the system. It assumes you know **your business**
but nothing about computers. Every step says exactly what to click and what you
should see next.

If your screen does not match what a step describes, **stop and ask** — do not
guess. Guessing with money records is how mistakes get buried.

---

## Contents

**Part 1 — Getting started**
1. [What this system is for](#1-what-this-system-is-for)
2. [Signing in](#2-signing-in)
3. [How the screen is laid out](#3-how-the-screen-is-laid-out)
4. [Things that work the same on every screen](#4-things-that-work-the-same-on-every-screen)

**Part 2 — Setting up (do this once)**
5. [The order to set things up](#5-the-order-to-set-things-up)
6. [Clients](#6-clients)
7. [Staff](#7-staff)
8. [Money channels](#8-money-channels)
9. [Expense categories](#9-expense-categories)
10. [Billing parameters](#10-billing-parameters)
11. [Bill templates](#11-bill-templates)
12. [Letter templates](#12-letter-templates)
13. [Lenders](#13-lenders)
14. [Your organisation details](#14-your-organisation-details)

**Part 3 — The daily work**
15. [Step 1 — enter the job (C number)](#15-step-1--enter-the-job-c-number)
16. [Step 2 — make the bill](#16-step-2--make-the-bill)
17. [Step 3 — issue and print the bill](#17-step-3--issue-and-print-the-bill)
18. [The additional letter](#18-the-additional-letter)
19. [Step 4 — record money received](#19-step-4--record-money-received)
20. [Advances](#20-advances)

**Part 4 — Money going out**
21. [Expenses](#21-expenses)
22. [Money given to staff](#22-money-given-to-staff)
23. [Loans](#23-loans)

**Part 5 — Knowing where you stand**
24. [The dashboard](#24-the-dashboard)
25. [Reports](#25-reports)

**Part 6 — Fixing mistakes**
26. [What to do when you get something wrong](#26-what-to-do-when-you-get-something-wrong)

**Part 7 — Administration**
27. [Users](#27-users)
28. [Troubleshooting](#28-troubleshooting)
29. [Words this system uses](#29-words-this-system-uses)
30. [Good habits](#30-good-habits)

---
---

# Part 1 — Getting started

## 1. What this system is for

It keeps the money side of your clearing and forwarding business in one place:

- every **job** (C number) you handle,
- every **bill** you raise, with a number that can never repeat,
- every **taka received** from a client and which bill it paid,
- every **taka spent**, and who you gave it to,
- every **loan** you took and what it has cost you,
- and reports that answer *"did I make money, and who owes me what?"*

The single most important habit: **enter things as they happen.** The reports
are only as truthful as what you type in.

---

## 2. Signing in

1. Open your browser. Chrome or Safari, on a computer or a phone, both work.
2. Go to your office address (for example `https://office.tamannatraders.com`).
3. You will see a **Sign in** box.
4. Type your **Email**.
5. Type your **Password**.
6. Click **Sign in**.

You land on the **Dashboard**.

### The first time you ever sign in

The system will insist you **change your password** before it lets you do
anything. This is normal.

- The new password must be **at least 10 characters**.
- Use something you will remember but nobody would guess — not your phone
  number, not `12345678`.

### If it will not let you in

| What you see | What it means | What to do |
|---|---|---|
| "Invalid email or password" | One of the two is wrong | Check for a stray space at the end. Passwords are case-sensitive: `Depot` and `depot` are different. |
| "Too many login attempts" | Too many wrong tries | Wait 15 minutes. This protects you from someone guessing. |
| "Your account is not active" | An Administrator switched it off | Ask the Administrator to switch it back on. |

### Signing out

Click your name at the **top right** → **Sign out**. Always do this on a shared
or public computer.

---

## 3. How the screen is laid out

Three parts, on every screen:

**The menu, down the left.** Grouped the way the work flows:

| Group | What lives there |
|---|---|
| **Dashboard** | The overview |
| **Jobs & Billing** | Jobs, New Job, Bills, New Bill |
| **Money In** | Money Received, Advances, Advance Ledger |
| **Money Out** | Expenses, Staff Ledger, Instruments, Loans |
| **Reports** | Every report |
| **Settings** | The lists the system works from |

On a phone the menu hides behind the **☰** button at the top left.

**The trail, along the top.** Something like:

> Dashboard › Reports › Income

That shows where you are. **Every part of it is clickable** — click *Reports*
to go back up one level, *Dashboard* to go home.

**The page itself,** in the middle.

---

## 4. Things that work the same on every screen

Learn these five and the whole system becomes familiar.

### Dropdown lists

Fields like **Client**, **Lender** and **How was it paid?** are dropdowns. Click
one and the list appears. If the list is long, there is a **search box at the
top** — start typing and it narrows. Click the one you want.

You never have to remember a name exactly. Type part of it.

### Number boxes that suggest as you type

**C number**, **Invoice number** and **Bill number** boxes show matching numbers
underneath as you type. Click a suggestion instead of typing the whole thing.
You can still type a partial number and it will filter.

### Money boxes

Type plain digits: `15000` or `15000.50`. Do not type commas or the ৳ sign — the
system adds those. Money is always shown to two decimal places.

### Dates

Click the box and pick from the calendar, or type as `dd-mm-yyyy`. Dates are
Bangladesh dates; there is no timezone confusion.

### Deleting anything

Deleting **always asks twice**:

1. First it tells you what will go and what else it affects. Click **Continue**.
2. Then it warns you it cannot be undone. Click the red button to confirm.

At either step you can back out. If a **Delete** button is greyed out, hover
over it — it tells you why it cannot be deleted.

---
---

# Part 2 — Setting up (do this once)

## 5. The order to set things up

Some lists depend on others, so do them in this order:

1. **Organisation details** — your name and address, so bills print correctly
2. **Money channels** — where your money sits
3. **Expense categories** — what you spend on
4. **Billing parameters** — the lines a bill can contain
5. **Bill templates** — ready-made sets of those lines
6. **Letter templates** — optional
7. **Clients**
8. **Staff**
9. **Lenders** — only if you borrow

You can add more of any of these later, at any time.

---

## 6. Clients

A client is a company you clear goods for. One client can have both import and
export jobs — you do not record that here, it belongs to the job.

### Adding a client

1. Menu → **Settings** → **Clients**.
2. Click **Add client**.
3. **Client name** is the only thing you must fill in.
4. Everything else is optional:
   - **Short code** — a nickname like `AKIJ`. **Leave it blank** and the system
     makes one from the name.
   - **Contact person, Phone, Email, BIN/VAT, Address**.
5. Click **Add client**.

> The **opening balance** (what a client already owed you before you started
> using the system) is *not* on this form on purpose — it confused people. If a
> client does owe you from before, add them first, then click **Edit** on their
> row and put it in there.

### Changing or retiring a client

- **Edit** on their row changes the details.
- **Deactivate** retires them: they stop appearing in dropdowns for new work,
  but all their old bills and payments stay exactly as they were.
- **Activate** brings them back. Set the status box at the top of the list to
  **Deactivated** to find them, then choose **Activate** from the **⋯** menu.

A client is never deleted. Their history is your record.

The same pair works on every Settings list — clients, staff, lenders, money
channels, expense categories, billing parameters, bill templates, letter
templates and users. **Deactivating is never permanent**: if you retire the
wrong row, filter by **Deactivated** and activate it again.

---

## 7. Staff

The people you hand money to for job expenses — the person who takes cash to
the depot.

1. Menu → **Settings** → **Staff** → **Add staff member**.
2. **Name** is the only thing required. Designation, phone and joining date are
   optional.
3. Click **Add staff member**.

These names appear in the **Money given to** box on the expense screen, and each
person gets their own running total in the **Staff Ledger**.

---

## 8. Money channels

A channel is **a place your money sits**: your cash box, each bank account, each
mobile wallet.

1. Menu → **Settings** → **Money Channels** → **Add channel**.
2. Fill in:
   - **Name** — what you call it: `Cash`, `City Bank`, `bKash`.
   - **Type** — Cash / Bank / Mobile wallet / Cheque / Other.
   - **Account reference** — the account number, optional.
   - **Opening balance** — what was in it the day you started.
3. Click **Save**.

Every rupee in and out names a channel, which is how the **Cash Flow** report
can tell you what should be in each one right now.

---

## 9. Expense categories

A category says **what kind of spending this is** — and that decides how it
affects your profit. Getting these right is what makes the profit figure
trustworthy.

Each category has a **kind**, and the kind is what matters:

| Kind | Meaning | Counts against profit? |
|---|---|---|
| **Operating** | Running the office — rent, salary, electricity | **Yes** |
| **Job reimbursable** | Spent for a job, to be recovered from the client | No — it is netted against what you billed |
| **Branch transfer** | Money moved to a branch | Yes |
| **Loan repayment** | Returning borrowed principal | **No** — it is money leaving, not a cost |
| **Loan cost** | Commission or profit share on a loan | Yes |
| **Capital** | Buying equipment or furniture | **No** — you bought a thing, you did not lose the money |

> **Why "loan repayment" does not reduce profit:** giving back money you
> borrowed is not an expense — you never earned it. Counting it as one would
> make a good month look terrible. The **Cash Flow** report shows it, because
> the money really did leave.

To add one: **Settings → Expense Categories → Add category**, give it a name,
pick the kind, save.

---

## 10. Billing parameters

These are **the lines a bill can contain**. Set them up once and building a bill
becomes picking from a list.

**Settings → Billing Parameters → Add billing parameter**. For each one:

- **Code** — a short tag like `COMM`, `SERVICE`.
- **Label** — what prints on the bill: "Commission on Invoice Value".
- **Type** — how the amount is worked out:
  - **Amount** — you type the figure (transport, labour).
  - **Commission** — you type an invoice value and a percentage, and the system
    calculates it.
  - **Text** — words only, no money (a note on the bill).
  - **Advance adjustment** — subtracts advance money already taken.
- **Revenue class** — Commission / Service charge / Reimbursement / Adjustment /
  Narrative. This is what the income reports group by.
- **Default value** — pre-filled to save typing.

> **Once a parameter is used on a bill, that bill keeps its own copy.** Renaming
> "Transport" to "Transportation" later will **not** change any bill already
> raised. Old bills always print exactly as they were issued. This is
> deliberate.

---

## 11. Bill templates

A template is a **ready-made set of lines**, so a routine bill is a few clicks.

1. **Settings → Bill Templates → Add template**.
2. Name it (e.g. "Standard Import").
3. Choose whether it is for Import, Export or both.
4. Add the lines it should contain, in printing order, with default amounts.
5. Save.

Making a bill then becomes: pick the C number → apply the template → adjust the
figures.

---

## 12. Letter templates

Some bills need a covering letter explaining a charge. Write the wording once
here, with placeholders the system fills in.

**Settings → Letter Templates → Add template.** The screen lists the available
placeholders (client name, bill number, amount and so on) — click one to insert
it. When you attach the letter to a real bill, the placeholders become that
bill's real values.

---

## 13. Lenders

Only if you borrow working capital. A lender is **not** a client.

**Settings → Lenders → Add lender**: name, type (individual / institution /
family / other), contact.

---

## 14. Your organisation details

**Settings → Organisation.** Your name, address, phone, BIN/VAT and logo — this
is what prints at the top of every bill.

**Letterhead top margin** matters if you print on pre-printed letterhead paper.
Measure the printed header in millimetres, put that number here, and the system
starts the bill below it. Print one test bill and adjust until it lines up.

---
---

# Part 3 — The daily work

The cycle is always the same:

> **Job → Bill → Money received**

## 15. Step 1 — enter the job (C number)

A **job** is one consignment, identified by its **C number** (the ASYCUDA
number).

1. Menu → **Jobs & Billing** → **New Job**.
2. Fill in:
   - **C number** — must be unique. If it is already used the system tells you
     which job has it.
   - **C date** — the date on the document.
   - **Import or export**.
   - **Client** — pick from the dropdown.
   - **Customs house / depot**, **Commodity**, **BL / AWB number**,
     **LC number**, **BE number** — all optional but useful later for searching.
3. **Invoices** — click **Add invoice** for each one:
   - **Invoice number**
   - **Invoice value** and **Currency**
   - **FX rate** if it is not taka — the system converts and remembers the taka
     value.
4. Click **Save job**.

> **Enter the invoice value even if you are not billing yet.** When you make the
> bill, the system fills the commission calculation from it automatically. That
> one habit removes most typing mistakes.

### Finding a job later

**Jobs** in the menu. Search by C number or invoice number, or filter by client,
import/export, date or status.

### Deleting a job

Only for a job entered by mistake. Open the job → **Delete job**.

It refuses if the job has **any bill or any expense** on it, and tells you so.
That is intentional: once money is attached, the job is part of your records.

---

## 16. Step 2 — make the bill

1. Menu → **Jobs & Billing** → **New Bill**.
2. **C number** — start typing; matching jobs appear; click the right one. The
   client and import/export fill in by themselves.
3. **Bill date** — today by default.
4. Note the line saying **"Next bill number: 2026-42"**. That is the number this
   bill will get **when you issue it** — not before.
5. **Apply a template** if you have one, then adjust.
6. **Add lines** one at a time from the dropdown. What you type depends on the
   line:
   - **Amount** lines — type the figure.
   - **Commission** lines — the **invoice value is already filled in from the
     job**. Type the percentage; the amount calculates itself.
   - **Text** lines — type the wording.
   - **Advance adjustment** — type how much advance to apply. The system shows
     how much that client has available and will not let you exceed it.
7. Watch the **totals bar** along the bottom: subtotal, deductions, net payable.
8. Tick **Attach additional letter** if this bill needs one.
9. Click **Save draft** any time. It also **saves itself as you type**, so a
   closed browser never loses your work.

### Draft vs issued — the important difference

| | Draft | Issued |
|---|---|---|
| Has a bill number? | No | Yes, permanently |
| Can you change it freely? | Yes | Only by **amending** (Admin) |
| Does it count in reports? | No | Yes |

**A draft is not a bill yet.** Take your time with it.

---

## 17. Step 3 — issue and print the bill

When the bill is right, click **Issue bill**.

This is the moment the bill becomes real: it takes the next number, the date is
locked, and it starts counting in your reports.

Then:

- **Print bill** — opens the letterhead version. Use your browser's Print.
- **Print letter** — if you attached one.

### Bill numbers never repeat and never skip

Numbers run `2026-01`, `2026-02`, … within each year and are handed out **only
when you issue**. Two people issuing at the same moment can never get the same
number.

---

## 18. The additional letter

Some bills need a covering letter justifying a charge.

**To add one:** open the bill → **Attach letter** (or tick the box while
building it). Pick a template or write it yourself, then **Save**. The
placeholders become this bill's real values.

**To change one:** open the bill → **Edit letter**.

**To remove one:** open the bill → **Delete letter**. The bill is untouched; you
can attach a new one afterwards.

> Writing a letter on a **draft** bill is ordinary work anyone can do. Changing
> the letter on a bill **already issued** is an **Administrator** action,
> because the client may already be holding a copy. A **cancelled** bill's
> letter is frozen for good.

---

## 19. Step 4 — record money received

When a client pays:

1. Menu → **Money In** → **Money Received** → **New receipt**.
2. **Client who paid** — pick from the dropdown.
3. **Receipt date** and **Amount received**.
4. **How the money came in** — the channel (Cash, bank, bKash).
5. **Reference** — cheque or transaction number, optional.
6. **Apply the money to bills:**
   - Click **Add a bill**.
   - A list of that client's unpaid bills appears. Search by bill number, C
     number or invoice number if the list is long.
   - Click the bill. It becomes a row showing how much is still owed on it.
   - Type how much of this payment goes to that bill.
   - Click **Add a bill** again for each further bill.
7. Watch **Left over** at the bottom. If money remains, tick **Keep the leftover
   as an advance** to hold it against future bills.
8. Click **Save receipt**.

The bills you paid update themselves to *Partly paid* or *Paid*.

> **Why you add bills one at a time:** a client with two hundred old bills would
> otherwise give you a two-hundred-row screen. You add only the ones this
> payment is actually for.

### Correcting a receipt

On the **Money Received** list, click **⋯** at the end of the row:

- **Edit receipt** — change anything, including which bills it paid. Bills you
  take money off go back to being unpaid.
- **Delete receipt** — removes it entirely, unwinds the bills, and removes any
  advance kept from its leftover. Asks twice.

---

## 20. Advances

An **advance** is money a client gives you **before** there is a bill.

### Recording one

1. Menu → **Money In** → **Advances** → **New advance**.
2. **Client who paid in advance**, **Advance date**, **Advance amount**, **How
   the money came in**.
3. **Reference** and **Notes**, optional.
4. Click **Save advance**.

### Using it against a bill

You do not "spend" an advance from the advance screen. You use it **while
building a bill**: add an **Advance adjustment** line and type the amount. The
system:

- shows how much that client has left,
- refuses more than is available,
- uses the **oldest advance first**,
- and subtracts it from the net payable.

### Seeing where advances stand

**Money In → Advance Ledger.** Every advance taken, everything adjusted, and
what is still standing — per client or for everyone. The **Totals** row at the
bottom adds up the columns above it.

---
---

# Part 4 — Money going out

## 21. Expenses

Every taka that leaves the business is an expense, and each gets a **voucher
number** (`EX-20260817-001`) automatically.

1. Menu → **Money Out** → **Expenses** → **New expense**.
2. **Expense date**.
3. **Category** — this is the important one; it decides how the spending affects
   your profit (see [§9](#9-expense-categories)).
4. **Amount paid out**.
5. **How was it paid?** — pick the channel the money left from.
   - If you pick a **bank account**, one more question appears: **What kind of
     bank payment?** (transfer, cheque, DD or pay order), because a bank account
     can be any of those. For cash or a mobile wallet nothing more is asked.
   - For a cheque, DD or pay order you must also give the **instrument number**,
     and optionally the bank and who it is favouring.
6. **Money given to** — the staff member who took the money, if any.
7. **C numbers this expense is for** — see below.
8. **What was it for** — a short description. Write something useful; this is
   what you will read in six months.
9. **Attach a file** — a photo or scan of the voucher, optional.
10. Click **Save expense**.

### When one expense covers several C numbers

A gate pass or one lorry often serves several consignments.

1. Add the first C number — type it, click the suggestion.
2. Add the next. And the next.
3. The system **splits the amount equally** between them and shows each share.
4. If the split is not even, **type over any share**.
5. A line underneath tells you the running total: *"The shares add up to
   ৳3,000.00 — the same as the expense."* If it does not match, it says so and
   how far off you are.
6. Remove a C number with the **✕** next to it; the rest re-split.

> **Why the shares matter:** the Job Profitability report subtracts what you
> spent on a job from what you billed for it. If three jobs each got credited
> the full ৳3,000, all three would look worse than they are.

### Instruments (cheques, DDs, pay orders)

**Money Out → Instruments** lists every cheque, DD and pay order you issued, and
whether it has been billed back to the client yet. Use it to chase money you
have laid out.

---

## 22. Money given to staff

Whenever you put a staff member in **Money given to**, that expense joins their
running total.

**Money Out → Staff Ledger** shows, per person: every voucher, the date, the
amount, what it was for, the job, and a running total.

**Click any voucher number** to open the expense behind it.

---

## 23. Loans

Money **you** borrowed to run the business.

### Recording a loan

1. Menu → **Money Out** → **Loans** → **New loan**.
2. **Lender who gave the money** — dropdown.
3. **Loan date**, **Amount borrowed**, **How the money came in**.
4. **Purpose** and **Terms**, optional.
5. Click **Save loan**.

### Recording a payment

Click **Record payment** on the loan, then choose **what kind of payment** it
is — and this is the part that matters:

| Kind | Effect |
|---|---|
| **Returning part of the original money** | Reduces what you still owe. **Not** a business cost. |
| **Commission** / **Profit share** / **Other** | A real cost that reduces profit. Does **not** reduce what you owe. |

Every payment automatically creates a matching expense voucher, so it shows in
your money-out records too. The voucher number is shown when you save.

### What the loan screens tell you

Both the loans list and each loan's page show four figures:

- **Principal** — what you borrowed
- **Principal returned** — how much of it you have given back
- **Also paid** — commission, profit share and anything else the loan cost
- **Total paid** — everything you have handed over, principal and cost together
- **Outstanding principal** — what you still owe

> "Principal returned" alone hides what the loan actually cost you. "Total paid"
> is the number to look at when deciding whether to borrow again.

### Correcting a payment

On the loan's page, click **⋯** on the payment row:

- **Edit payment** — fix the date, amount, kind or channel. The expense voucher
  updates with it and keeps its number.
- **Delete payment** — removes the payment and its voucher. Asks twice.

---
---

# Part 5 — Knowing where you stand

## 24. The dashboard

The first screen after signing in. A **period selector** at the top (last 7
days, this month, this year, or your own dates) controls the headline numbers.

**Top row — how you did:** bills raised, total billed, commission billed, total
spent, **net profit**.

**Second row — where you stand:** money clients owe you, advances not yet used,
what should be in each channel, outstanding loan principal.

**Charts:** income against expense over time, import vs export, your top 5
clients.

**Lists to act on:** recent bills, advances sitting too long, jobs with no bill
yet, and overdue receivables.

Click any figure to open the report behind it.

---

## 25. Reports

Menu → **Reports** for the full list.

### The filter bar

Above every report is one filter bar. Set what you want, then click **Run
report**.

**Each report only shows filters that actually work on it.** The loan ledger, for
example, offers none — it is a snapshot of what you owe today, and a date range
would make it lie. If a filter is on screen, it works.

- **Client** — click it and the list appears. **Tick more than one** to compare.
- **C number / Invoice / Bill number** — suggestions appear as you type.
- **Date range** — presets or your own dates.
- **Clear filters** resets everything.

The filters live in the web address, so you can bookmark a report you run often.

### What each report answers

| Report | The question it answers |
|---|---|
| **Bill Register** | Every bill I raised, with totals |
| **Income** | What did I earn, per client? |
| **Expense** | What did I spend, by category? |
| **Staff Disbursement** | How much went to each person? |
| **Advance Ledger** | Whose advance money am I still holding? |
| **Client Statement** | One client's full history and balance |
| **Receivables Aging** | Who owes me, and for how long? |
| **Job Profitability** | Did this C number make money? |
| **Loan Ledger** | What do I owe, and what have loans cost? |
| **Profit & Loss** | Did I make money? |
| **Cash Flow** | Where did my money actually go? |
| **Instrument Register** | Which cheques and DDs are still unrecovered? |
| **Audit Trail** | Who changed what, and when (Admin only) |

### Profit & Loss vs Cash Flow — they will differ, and should

**Cash Flow** counts every taka that left, including loan principal you returned
and money you will recover from clients.

**Profit & Loss** excludes those, because neither is a cost of doing business.

If Cash Out looks bigger than Business Expense, that is correct.

### Exporting

Every report has **CSV**, **Excel** and **PDF** buttons. The export contains
exactly what is on screen, with your filters applied.

---
---

# Part 6 — Fixing mistakes

## 26. What to do when you get something wrong

Mistakes are normal. The system is built so you can fix them, but the right fix
depends on **whether anyone outside your office has seen it**.

### The quick answer

| What is wrong | What to do |
|---|---|
| A job you should not have created | Open it → **Delete job** (only if no bill or expense on it) |
| A draft bill | Open it → **Edit bill**, change anything |
| A bill you just issued, before sending it | Open it → **Delete bill** — the number is freed |
| A bill the client already has | **Amend bill** (change figures) or **Cancel bill** (void it) |
| A receipt | **⋯ → Edit receipt**, or **Delete receipt** |
| A loan payment | **⋯ → Edit payment**, or **Delete payment** |
| An expense | Open it → **Edit** |
| A client or staff name | **Settings** → **Edit** |

### Deleting a bill vs cancelling it

**Delete** — for a bill you just got wrong, before anyone saw it.

- Only the **newest** bill of the year can be deleted. Deleting one from the
  middle would leave a gap in your numbering.
- **Its number becomes free again**, so the next bill you raise takes it. No
  wasted numbers for a typo.
- Refused if any money has been received against it.

**Cancel** — for a bill the client already has.

- The bill stays, marked **Cancelled**, with your reason.
- **Its number is used up for good.**
- **A cancelled bill can never be deleted.** Cancelling is you saying "this is
  void but on the record", so undoing it would defeat the point.

> **The rule of thumb:** if the bill is still in your office, delete it. Once it
> has left your office, cancel it.

### Amending an issued bill

Open the bill → **Amend bill** (Administrators only).

This opens **the same screen you built the bill on**. Add lines, remove lines,
change any figure, edit the notes — everything except the bill number and date,
which never change.

Refused if money has already been received against the bill: reverse the receipt
first, then amend.

Every amendment is recorded in the Audit Trail.

### Things that can never be deleted

| | Why |
|---|---|
| A cancelled bill | It is a permanent record of a void |
| The audit trail | It is your record of who did what — the database itself refuses |
| A client, staff member or lender with history | Deactivate them instead; the history stays |

---
---

# Part 7 — Administration

## 27. Users

Administrators only: **Settings → Users**.

| Role | Can do |
|---|---|
| **Administrator** | Everything, including amending and cancelling bills, deleting records, and the audit trail |
| **Operator** | Day-to-day entry: jobs, bills, receipts, expenses. Cannot amend or cancel an issued bill. |
| **Viewer** | Look at everything, change nothing |

**Add a user:** **Add user**, give name, email, role. They set their own password
on first sign-in.

**Someone leaves:** **Deactivate** them. Do not share logins — the audit trail is
worthless if two people use one account.

---

## 28. Troubleshooting

| What you see | What to do |
|---|---|
| "This C number is already used" | That job exists. Search **Jobs** for it — the message names the client. |
| "Enter the client name" | The name box is empty. It is the only one required. |
| "This bill has money already received against it" | Money is applied to it. Edit or delete the **receipt** first, then the bill. |
| "Only the newest bill can be deleted" | Newer bills exist. **Cancel** it instead. |
| "The shares add up to ৳X, but the expense is ৳Y" | The C-number shares must equal the amount. Adjust one. |
| "More than ৳X remains payable on this bill" | You applied more than the bill still owes. Reduce it. |
| "…exceeds TAMANNA's unadjusted advance" | You adjusted more advance than the client has. Reduce it, or record the advance first. |
| A **Delete** button is greyed out | Hover it — it says why. |
| The page will not load | Refresh. If it persists, note what you were doing and tell your support contact. |

### If a number looks wrong

1. Check the **filters** — a date range or client filter left on is the usual
   cause.
2. Check the **Audit Trail** (Admin) — it shows every change to that record.
3. Open the record itself and read its lines.

Do not "fix" a report by editing the database directly. Fix the record that
feeds it.

---

## 29. Words this system uses

| Word | Means |
|---|---|
| **C number** | The ASYCUDA number identifying one consignment. One job = one C number. |
| **Job** | Everything about one consignment |
| **Draft bill** | A bill being built. No number yet, not in reports. |
| **Issued bill** | A real bill with a permanent number |
| **Net payable** | What the client owes on this bill after deductions |
| **Advance** | Money from a client before a bill exists |
| **Adjustment** | Using advance money to reduce a bill |
| **Receipt** | Money actually received |
| **Allocation** | Which bill a receipt paid |
| **Channel** | Where money sits — cash box, bank, wallet |
| **Voucher** | The reference number of an expense |
| **Instrument** | A cheque, DD or pay order |
| **Reimbursable** | Money spent for a job, to be recovered from the client |
| **Recovery surplus** | What you billed for reimbursables minus what you actually spent. Positive = extra income. |
| **Principal** | The original borrowed amount, ignoring cost |
| **Receivable** | Money clients owe you |
| **Aging** | How long a debt has been unpaid |

---

## 30. Good habits

**Every day**
- Enter jobs, bills, receipts and expenses **as they happen**, not weekly.
- Write a real description on every expense.

**Every week**
- Look at **Receivables Aging** and chase anything past 60 days.
- Look at the dashboard's **unbilled jobs** list.
- Check **Instruments** for cheques not yet recovered.

**Every month**
- Read **Profit & Loss** for the month.
- Read **Advance Ledger** — long-standing advances mean unbilled work.
- Check **Cash Flow** against what is really in each account.
- Confirm last night's **backup** actually reached Google Drive.

**Never**
- Never share a login.
- Never edit the database directly to fix a number.
- Never cancel a bill you could still delete — cancelling burns the number
  forever.
