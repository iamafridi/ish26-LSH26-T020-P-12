/**
 * Seed a published case into a user's account from the command line.
 *
 * Takes a Firebase uid directly, so a demo account can be prepared without
 * signing in as that user or holding their password anywhere.
 *
 *   npx tsx scripts/seed-user.ts <firebase-uid> [CASE-ID]
 *   npx tsx scripts/seed-user.ts 4K4HBc... PUB-01
 *
 * Idempotent: running it twice leaves the same ledger rather than a doubled one.
 */
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { listCases, seedCase } from "../src/modules/demo/demo.service.js";

async function main(): Promise<void> {
  const uid = process.argv[2];
  const caseId = process.argv[3] ?? "PUB-01";

  if (!uid) {
    console.error("Usage: npx tsx scripts/seed-user.ts <firebase-uid> [CASE-ID]");
    console.error(`Cases: ${listCases().map((c) => c.case_id).join(", ")}`);
    process.exit(1);
  }

  await connectDatabase();
  const result = await seedCase(uid, caseId);

  console.log(`Seeded ${result.case_id} for uid ${uid}`);
  console.log(`  months     ${result.last_month} and ${result.month}`);
  console.log(`  salary     ${result.salary_bdt}`);
  console.log(`  expenses   ${result.expenses}`);
  console.log(`  pockets    ${result.pockets}`);

  await disconnectDatabase();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
