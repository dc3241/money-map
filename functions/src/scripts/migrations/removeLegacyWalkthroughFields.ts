/**
 * One-time migration: remove legacy walkthrough fields from users documents.
 *
 * Usage:
 *   npm run migrate:walkthrough:dry-run
 *   npm run migrate:walkthrough:execute
 *
 * Optional direct usage:
 *   node lib/scripts/migrations/removeLegacyWalkthroughFields.js
 *   --page-size=300
 */

import {initializeApp} from "firebase-admin/app";
import {FieldPath, FieldValue, getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const USERS_COLLECTION = "users";
const LEGACY_FIELDS = [
  "walkthroughCompleted",
  "walkthroughTasks",
  "walkthroughCompletedAt",
] as const;

interface Args {
  dryRun: boolean;
  pageSize: number;
}

/**
 * Parses CLI arguments for mode and pagination settings.
 * @param {string[]} argv Process argv array.
 * @return {Args} Parsed migration arguments.
 */
function parseArgs(argv: string[]): Args {
  const args = new Set(argv.slice(2));
  const execute = args.has("--execute");
  const dryRun = !execute || args.has("--dry-run");

  let pageSize = 300;
  for (const arg of args) {
    if (!arg.startsWith("--page-size=")) continue;
    const parsed = Number(arg.split("=")[1]);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      throw new Error("Invalid --page-size. Use an integer between 1 and 500.");
    }
    pageSize = Math.floor(parsed);
  }

  return {dryRun, pageSize};
}

/**
 * Scans user documents and removes legacy walkthrough fields.
 * Defaults to dry-run unless `--execute` is provided.
 * @return {Promise<void>}
 */
async function run(): Promise<void> {
  const {dryRun, pageSize} = parseArgs(process.argv);
  const mode = dryRun ? "DRY_RUN" : "EXECUTE";
  console.log(`Starting walkthrough field cleanup in ${mode} mode...`);
  console.log(`Collection: ${USERS_COLLECTION}`);
  console.log(`Legacy fields: ${LEGACY_FIELDS.join(", ")}`);
  console.log(`Page size: ${pageSize}`);

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let page = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  let hasMore = true;
  while (hasMore) {
    let query = db
      .collection(USERS_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      continue;
    }

    page += 1;
    scanned += snapshot.size;

    const docsToUpdate = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return LEGACY_FIELDS.some((field) =>
        Object.prototype.hasOwnProperty.call(data, field)
      );
    });

    matched += docsToUpdate.length;
    skipped += snapshot.size - docsToUpdate.length;

    if (!dryRun && docsToUpdate.length > 0) {
      const batch = db.batch();
      for (const doc of docsToUpdate) {
        const updatePayload: Record<string, FirebaseFirestore.FieldValue> = {};
        for (const field of LEGACY_FIELDS) {
          updatePayload[field] = FieldValue.delete();
        }
        batch.update(doc.ref, updatePayload);
      }

      try {
        await batch.commit();
        updated += docsToUpdate.length;
      } catch (error) {
        errors += docsToUpdate.length;
        console.error(
          `Batch commit failed on page ${page}` +
            ` (${docsToUpdate.length} docs):`,
          error
        );
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(
      `[Page ${page}] scanned=${scanned}, matched=${matched}, ` +
        `updated=${updated}, skipped=${skipped}, errors=${errors}`
    );
  }

  console.log("Migration complete.");
  console.log(
    JSON.stringify(
      {
        mode,
        scanned,
        matched,
        updated,
        skipped,
        errors,
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error("Migration failed with fatal error:", error);
  process.exitCode = 1;
});
