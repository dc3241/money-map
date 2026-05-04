/**
 * Firebase Cloud Functions for Plaid integration.
 * Uses Plaid Node.js SDK in Production with secrets from Secret Manager.
 */

import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import type {
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  TransactionsSyncRequest,
} from "plaid";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

initializeApp();

const plaidClientId = defineSecret("PLAID_CLIENT_ID");
const plaidSecret = defineSecret("PLAID_SECRET");

const plaidSecrets = [plaidClientId, plaidSecret];

setGlobalOptions({maxInstances: 10});

/**
 * Returns a Plaid API client configured for Production.
 * @param {string} clientId - Plaid client ID
 * @param {string} secret - Plaid secret
 * @return {PlaidApi} Configured PlaidApi instance
 */
function getPlaidClient(clientId: string, secret: string): PlaidApi {
  const configuration = new Configuration({
    basePath: PlaidEnvironments.production,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(configuration);
}

/**
 * Builds a safe log payload from a Plaid/Axios error.
 * Raw Axios errors include PLAID-SECRET in request config; do not log them.
 * @param {unknown} err Caught error (often from Plaid SDK / Axios).
 * @return {Record<string, unknown>} Fields safe to send to logger.
 */
function plaidAxiosFailureFields(err: unknown): Record<string, unknown> {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as {
      response?: {status?: number; data?: unknown};
      message?: string;
    };
    return {
      status: ax.response?.status,
      plaidBody: ax.response?.data,
      axiosMessage: ax.message,
    };
  }
  return {
    detail: err instanceof Error ? err.message : String(err),
  };
}

/**
 * Prefer Plaid's error_message / error_code for client-facing messages.
 * @param {unknown} err Caught error.
 * @param {string} fallback Message when no Plaid body is present.
 * @return {string} User-safe description.
 */
function messageFromPlaidAxiosError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object" || !("response" in err)) {
    return fallback;
  }
  const data = (err as {response?: {data?: unknown}}).response?.data;
  if (!data || typeof data !== "object") return fallback;
  const body = data as {error_message?: string; error_code?: string};
  if (typeof body.error_message === "string" && body.error_message.length > 0) {
    return body.error_message;
  }
  if (typeof body.error_code === "string" && body.error_code.length > 0) {
    return body.error_code;
  }
  return fallback;
}

type SyncOutcome = {
  added: number;
  modified: number;
};

type RateLimitSpec = {
  maxRequests: number;
  windowMs: number;
};

const RATE_LIMITS: Record<string, RateLimitSpec> = {
  createLinkToken: {maxRequests: 20, windowMs: 60 * 60 * 1000},
  exchangePublicToken: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  syncTransactions: {maxRequests: 30, windowMs: 60 * 60 * 1000},
  syncBalances: {maxRequests: 30, windowMs: 60 * 60 * 1000},
  syncPlaidInsights: {maxRequests: 20, windowMs: 60 * 60 * 1000},
  disconnectPlaid: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  deleteUserData: {maxRequests: 5, windowMs: 60 * 60 * 1000},
};

/**
 * Applies a per-user, per-function fixed-window rate limit in Firestore.
 * @param {string} uid Auth user ID.
 * @param {string} functionName Callable function name.
 * @return {Promise<void>}
 */
async function enforceRateLimit(
  uid: string,
  functionName: string
): Promise<void> {
  const spec = RATE_LIMITS[functionName];
  if (!spec) return;

  const db = getFirestore();
  const rateLimitPath =
    `users/${uid}/security/functionRateLimits_${functionName}`;
  const docRef = db.doc(rateLimitPath);
  const nowMs = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.data() as
      | {windowStartMs?: number; count?: number}
      | undefined;
    const windowStartMs = data?.windowStartMs ?? 0;
    const count = data?.count ?? 0;
    const withinWindow = nowMs - windowStartMs < spec.windowMs;

    const nextWindowStartMs = withinWindow ? windowStartMs : nowMs;
    const nextCount = withinWindow ? count + 1 : 1;

    if (withinWindow && count >= spec.maxRequests) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later."
      );
    }

    tx.set(
      docRef,
      {
        functionName,
        windowStartMs: nextWindowStartMs,
        count: nextCount,
        updatedAt: new Date(),
      },
      {merge: true}
    );
  });
}

/**
 * Removes the Plaid Item (revokes access token) if one exists for the user.
 * @param {string} uid Auth user ID.
 * @param {PlaidApi} plaid Configured Plaid API client.
 * @return {Promise<boolean>} True when an item was found and removed.
 */
async function revokePlaidItemIfPresent(
  uid: string,
  plaid: PlaidApi
): Promise<boolean> {
  const db = getFirestore();
  const plaidDocRef = db.doc(`users/${uid}/plaidData/item`);
  const plaidDoc = await plaidDocRef.get();
  if (!plaidDoc.exists) {
    return false;
  }
  const accessToken = plaidDoc.data()?.access_token as string | undefined;
  if (!accessToken) {
    return false;
  }

  await plaid.itemRemove({access_token: accessToken});
  return true;
}

/**
 * Picks the date used for budgeting/day bucketing.
 * Prefer authorized/swipe date; fall back to posted date.
 * @param {string | null | undefined} authorizedDate Plaid authorized_date.
 * @param {string | null | undefined} postedDate Plaid date.
 * @return {string | null} Effective YYYY-MM-DD date when available.
 */
function plaidEffectiveDate(
  authorizedDate: string | null | undefined,
  postedDate: string | null | undefined
): string | null {
  if (typeof authorizedDate === "string" && authorizedDate.length > 0) {
    return authorizedDate;
  }
  if (typeof postedDate === "string" && postedDate.length > 0) {
    return postedDate;
  }
  return null;
}

/**
 * Performs a Plaid transactions/sync loop and persists results for a user.
 * @param {string} uid Auth user ID.
 * @param {PlaidApi} plaid Configured Plaid API client.
 * @return {Promise<SyncOutcome>} Number of added/modified transactions.
 */
async function runTransactionsSyncForUser(
  uid: string,
  plaid: PlaidApi
): Promise<SyncOutcome> {
  const db = getFirestore();
  const plaidDoc = await db.doc(`users/${uid}/plaidData/item`).get();
  const plaidData = plaidDoc.data();
  const accessToken = plaidData?.access_token as string | undefined;

  if (!accessToken) {
    throw new HttpsError(
      "failed-precondition",
      "No Plaid access token. Link a bank account first."
    );
  }

  const transactionsRef = db.collection(`users/${uid}/transactions`);
  let cursor: string | undefined = (plaidData?.transactions_cursor as
    | string
    | undefined) || undefined;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;

  while (hasMore) {
    const syncRequest: TransactionsSyncRequest = {
      access_token: accessToken,
      cursor,
      count: 500,
    };

    const response = await plaid.transactionsSync(syncRequest);
    const {
      added,
      modified,
      removed,
      next_cursor: nextCursor,
      has_more: hasMoreFromApi,
    } = response.data;

    const batch = db.batch();

    for (const tx of added) {
      const docRef = transactionsRef.doc(tx.transaction_id);
      const effectiveDate = plaidEffectiveDate(tx.authorized_date, tx.date);
      batch.set(docRef, {
        ...tx,
        posted_date: tx.date ?? null,
        effective_date: effectiveDate,
        date: effectiveDate ?? tx.date ?? null,
        _sync: "added",
        _updatedAt: new Date(),
      });
      totalAdded++;
    }
    for (const tx of modified) {
      const docRef = transactionsRef.doc(tx.transaction_id);
      const effectiveDate = plaidEffectiveDate(tx.authorized_date, tx.date);
      batch.set(docRef, {
        ...tx,
        posted_date: tx.date ?? null,
        effective_date: effectiveDate,
        date: effectiveDate ?? tx.date ?? null,
        _sync: "modified",
        _updatedAt: new Date(),
      });
      totalModified++;
    }
    for (const tx of removed) {
      const docRef = transactionsRef.doc(tx.transaction_id);
      batch.delete(docRef);
    }

    if (added.length > 0 || modified.length > 0 || removed.length > 0) {
      await batch.commit();
    }

    cursor = nextCursor ?? "";
    hasMore = hasMoreFromApi ?? false;

    await db.doc(`users/${uid}/plaidData/item`).set(
      {
        transactions_cursor: cursor,
        transactions_synced_at: new Date(),
      },
      {merge: true}
    );
  }

  return {
    added: totalAdded,
    modified: totalModified,
  };
}

/**
 * Creates a Plaid link token for the authenticated user.
 * Callable; requires auth. Returns { linkToken } for initializing Plaid Link.
 */
export const createLinkToken = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "createLinkToken");

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    const linkTokenRequest: LinkTokenCreateRequest = {
      client_name: "Money Map",
      language: "en",
      country_codes: [CountryCode.Us],
      user: {client_user_id: uid},
      products: [Products.Transactions],
      additional_consented_products: [Products.Liabilities],
    };

    try {
      const response = await plaid.linkTokenCreate(linkTokenRequest);
      return {linkToken: response.data.link_token};
    } catch (err: unknown) {
      logger.error(
        "Plaid linkTokenCreate failed",
        plaidAxiosFailureFields(err)
      );
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(err, "Failed to create link token.")
      );
    }
  }
);

/**
 * Exchanges the public token from Plaid Link for an access token
 * and stores it in Firestore at users/{uid}/plaidData.
 */
export const exchangePublicToken = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "exchangePublicToken");

    const publicToken = request.data?.publicToken as string | undefined;
    if (!publicToken || typeof publicToken !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid publicToken."
      );
    }

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    const exchangeRequest: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    try {
      const response = await plaid.itemPublicTokenExchange(exchangeRequest);
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id ?? null;

      const db = getFirestore();
      await db.doc(`users/${uid}/plaidData/item`).set(
        {
          access_token: accessToken,
          item_id: itemId,
          updated_at: new Date(),
        },
        {merge: true}
      );

      // Fetch and store accounts (Auth product) for net worth and display
      const accountsResponse = await plaid.accountsGet({
        access_token: accessToken,
      });
      const accountsRef = db
        .collection("users")
        .doc(uid)
        .collection("accounts");
      for (const acct of accountsResponse.data.accounts) {
        const balances = acct.balances;
        await accountsRef.doc(acct.account_id).set({
          account_id: acct.account_id,
          item_id: itemId,
          name: acct.name ?? "Account",
          type: acct.type ?? "other",
          subtype: acct.subtype ?? null,
          mask: acct.mask ?? null,
          current_balance: balances?.current ?? null,
          available_balance: balances?.available ?? null,
          updated_at: new Date(),
        }, {merge: true});
      }

      return {success: true};
    } catch (err: unknown) {
      logger.error(
        "Plaid itemPublicTokenExchange failed",
        plaidAxiosFailureFields(err)
      );
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(err, "Failed to exchange public token.")
      );
    }
  }
);

/**
 * Retrieves transactions using the stored access token and saves them
 * to users/{uid}/transactions.
 * Uses transactions/sync; persists cursor in plaidData.
 */
export const syncTransactions = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "syncTransactions");

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    try {
      const outcome = await runTransactionsSyncForUser(uid, plaid);

      return {
        success: true,
        added: outcome.added,
        modified: outcome.modified,
      };
    } catch (err: unknown) {
      logger.error(
        "Plaid transactionsSync failed",
        plaidAxiosFailureFields(err)
      );
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(err, "Failed to sync transactions.")
      );
    }
  }
);

/**
 * Daily midnight sync for all linked Plaid users.
 * Runs in Pacific Time to align with the product's primary timezone.
 */
export const syncPlaidDaily = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/Los_Angeles",
    secrets: plaidSecrets,
  },
  async () => {
    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);
    const db = getFirestore();

    // Plaid daily sync: collectionGroup cannot use documentId == "item".
    // Read plaidData group, then filter to docs with id "item" (tokens).
    const plaidDataSnapshot = await db.collectionGroup("plaidData").get();
    const itemDocs = plaidDataSnapshot.docs.filter((d) => d.id === "item");

    let synced = 0;
    let failed = 0;
    let skipped = 0;
    let totalAdded = 0;
    let totalModified = 0;

    for (const itemDoc of itemDocs) {
      const uid = itemDoc.ref.parent.parent?.id;
      if (!uid) {
        skipped++;
        continue;
      }
      try {
        const outcome = await runTransactionsSyncForUser(uid, plaid);
        synced++;
        totalAdded += outcome.added;
        totalModified += outcome.modified;
      } catch (err: unknown) {
        if (
          err instanceof HttpsError &&
          err.code === "failed-precondition"
        ) {
          skipped++;
          continue;
        }
        failed++;
        logger.error("Daily Plaid sync failed for user", {
          uid,
          ...plaidAxiosFailureFields(err),
        });
      }
    }

    logger.info("Daily Plaid sync completed", {
      plaidDataDocs: plaidDataSnapshot.size,
      usersMatched: itemDocs.length,
      synced,
      skipped,
      failed,
      added: totalAdded,
      modified: totalModified,
    });
  }
);

/**
 * Refreshes account balances from Plaid and updates users/{uid}/accounts.
 */
export const syncBalances = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "syncBalances");

    const db = getFirestore();
    const plaidDoc = await db.doc(`users/${uid}/plaidData/item`).get();
    const plaidData = plaidDoc.data();
    const accessToken = plaidData?.access_token as string | undefined;

    if (!accessToken) {
      throw new HttpsError(
        "failed-precondition",
        "No Plaid access token. Link a bank account first."
      );
    }

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    try {
      const accountsResponse = await plaid.accountsGet({
        access_token: accessToken,
      });
      const accountsRef = db
        .collection("users")
        .doc(uid)
        .collection("accounts");
      for (const acct of accountsResponse.data.accounts) {
        const balances = acct.balances;
        await accountsRef.doc(acct.account_id).set({
          account_id: acct.account_id,
          item_id: plaidData?.item_id ?? null,
          name: acct.name ?? "Account",
          type: acct.type ?? "other",
          subtype: acct.subtype ?? null,
          mask: acct.mask ?? null,
          current_balance: balances?.current ?? null,
          available_balance: balances?.available ?? null,
          updated_at: new Date(),
        }, {merge: true});
      }
      return {success: true};
    } catch (err: unknown) {
      logger.error("Plaid accountsGet failed", plaidAxiosFailureFields(err));
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(err, "Failed to sync balances.")
      );
    }
  }
);

/**
 * Syncs Plaid recurring transaction streams and liabilities snapshot.
 * Writes to users/{uid}/plaidData/recurring and
 * users/{uid}/plaidData/liabilities.
 * Call after transactions sync; failures are logged but partial success is
 * allowed.
 */
export const syncPlaidInsights = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "syncPlaidInsights");

    const db = getFirestore();
    const plaidDoc = await db.doc(`users/${uid}/plaidData/item`).get();
    const plaidData = plaidDoc.data();
    const accessToken = plaidData?.access_token as string | undefined;

    if (!accessToken) {
      throw new HttpsError(
        "failed-precondition",
        "No Plaid access token. Link a bank account first."
      );
    }

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    const recurringRef = db.doc(`users/${uid}/plaidData/recurring`);
    const liabilitiesRef = db.doc(`users/${uid}/plaidData/liabilities`);

    let recurringOk = false;
    let liabilitiesOk = false;

    try {
      const recResponse = await plaid.transactionsRecurringGet({
        access_token: accessToken,
      });
      const recData = recResponse.data;
      await recurringRef.set(
        {
          inflow_streams: recData.inflow_streams ?? [],
          outflow_streams: recData.outflow_streams ?? [],
          updated_datetime: recData.updated_datetime ?? null,
          personal_finance_category_version:
            recData.personal_finance_category_version ?? null,
          synced_at: new Date(),
          error: null,
        },
        {merge: true}
      );
      recurringOk = true;
    } catch (err: unknown) {
      logger.warn(
        "Plaid transactionsRecurringGet failed (item may lack product)",
        plaidAxiosFailureFields(err)
      );
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { data?: unknown } }).response;
        await recurringRef.set(
          {
            synced_at: new Date(),
            error:
              res?.data !== undefined ?
                JSON.stringify(res.data) :
                messageFromPlaidAxiosError(err, "unknown_error"),
          },
          {merge: true}
        );
      }
    }

    try {
      const liabResponse = await plaid.liabilitiesGet({
        access_token: accessToken,
      });
      const liabData = liabResponse.data;
      await liabilitiesRef.set(
        {
          accounts: liabData.accounts ?? [],
          liabilities: liabData.liabilities ?? {},
          item: liabData.item ?? null,
          synced_at: new Date(),
          error: null,
        },
        {merge: true}
      );
      liabilitiesOk = true;
    } catch (err: unknown) {
      logger.warn(
        "Plaid liabilitiesGet failed (product not enabled or unsupported)",
        plaidAxiosFailureFields(err)
      );
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { data?: unknown } }).response;
        await liabilitiesRef.set(
          {
            synced_at: new Date(),
            error:
              res?.data !== undefined ?
                JSON.stringify(res.data) :
                messageFromPlaidAxiosError(err, "unknown_error"),
          },
          {merge: true}
        );
      }
    }

    return {
      success: recurringOk || liabilitiesOk,
      recurring: recurringOk,
      liabilities: liabilitiesOk,
    };
  }
);

/**
 * Disconnects the user's Plaid item and removes Plaid-linked data in Firestore.
 * Leaves manual budgeting data intact.
 */
export const disconnectPlaid = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "disconnectPlaid");

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);
    const db = getFirestore();
    const userDocRef = db.doc(`users/${uid}`);

    let removedFromPlaid = false;
    try {
      removedFromPlaid = await revokePlaidItemIfPresent(uid, plaid);
    } catch (err: unknown) {
      logger.error("Plaid itemRemove failed", plaidAxiosFailureFields(err));
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(err, "Failed to disconnect bank.")
      );
    }

    // Remove all synced Plaid data from Firestore.
    await Promise.all([
      db.recursiveDelete(db.collection(`users/${uid}/accounts`)),
      db.recursiveDelete(db.collection(`users/${uid}/transactions`)),
      db.recursiveDelete(db.collection(`users/${uid}/plaidData`)),
    ]);

    // Remove debt goals tied to Plaid account IDs so stale goals do not linger.
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      const data = userDoc.data() as {
        budgetData?: {debtGoals?: Array<Record<string, unknown>>};
      };
      const existingDebtGoals = data?.budgetData?.debtGoals ?? [];
      const filteredDebtGoals = existingDebtGoals.filter((goal) => {
        return !(
          typeof goal?.plaidAccountId === "string" &&
          goal.plaidAccountId.length > 0
        );
      });
      await userDocRef.set({
        budgetData: {
          debtGoals: filteredDebtGoals,
        },
        plaidDisconnectedAt: new Date().toISOString(),
      }, {merge: true});
    }

    return {
      success: true,
      removedFromPlaid,
    };
  }
);

/**
 * Deletes all app data for the authenticated user.
 * Also revokes Plaid item access.
 * The client should delete the Firebase Auth user after this call succeeds.
 */
export const deleteUserData = onCall(
  {secrets: plaidSecrets, invoker: "public", cors: true, enforceAppCheck: true},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    await enforceRateLimit(uid, "deleteUserData");

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);
    const db = getFirestore();

    try {
      await revokePlaidItemIfPresent(uid, plaid);
    } catch (err: unknown) {
      logger.error(
        "Plaid itemRemove failed during deleteUserData",
        plaidAxiosFailureFields(err)
      );
      throw new HttpsError(
        "internal",
        messageFromPlaidAxiosError(
          err,
          "Failed to revoke bank access before deleting data."
        )
      );
    }

    await db.recursiveDelete(db.doc(`users/${uid}`));
    return {success: true};
  }
);
