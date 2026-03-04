/**
 * Firebase Cloud Functions for Plaid integration.
 * Uses Plaid Node.js SDK in Production with secrets from Secret Manager.
 */

import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";
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
 * Creates a Plaid link token for the authenticated user.
 * Callable; requires auth. Returns { linkToken } for initializing Plaid Link.
 */
export const createLinkToken = onCall(
  {secrets: plaidSecrets},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const clientId = plaidClientId.value();
    const secret = plaidSecret.value();
    const plaid = getPlaidClient(clientId, secret);

    const linkTokenRequest: LinkTokenCreateRequest = {
      client_name: "Money Map",
      language: "en",
      country_codes: [CountryCode.Us],
      user: {client_user_id: uid},
      products: [Products.Transactions],
    };

    try {
      const response = await plaid.linkTokenCreate(linkTokenRequest);
      return {linkToken: response.data.link_token};
    } catch (err: unknown) {
      logger.error("Plaid linkTokenCreate failed", err);
      const message =
        err && typeof err === "object" && "response" in err ?
          String((err as { response?: { data?: unknown } }).response?.data) :
          "Failed to create link token.";
      throw new HttpsError("internal", message);
    }
  }
);

/**
 * Exchanges the public token from Plaid Link for an access token
 * and stores it in Firestore at users/{uid}/plaidData.
 */
export const exchangePublicToken = onCall(
  {secrets: plaidSecrets},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

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

      return {success: true};
    } catch (err: unknown) {
      logger.error("Plaid itemPublicTokenExchange failed", err);
      const message =
        err && typeof err === "object" && "response" in err ?
          String((err as { response?: { data?: unknown } }).response?.data) :
          "Failed to exchange public token.";
      throw new HttpsError("internal", message);
    }
  }
);

/**
 * Retrieves transactions using the stored access token and saves them
 * to users/{uid}/transactions.
 * Uses transactions/sync; persists cursor in plaidData.
 */
export const syncTransactions = onCall(
  {secrets: plaidSecrets},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

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

    const transactionsRef = db.collection(`users/${uid}/transactions`);
    let cursor: string | undefined = (plaidData?.transactions_cursor as
      | string
      | undefined) || undefined;
    let hasMore = true;
    let totalAdded = 0;
    let totalModified = 0;

    try {
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
          batch.set(docRef, {
            ...tx,
            _sync: "added",
            _updatedAt: new Date(),
          });
          totalAdded++;
        }
        for (const tx of modified) {
          const docRef = transactionsRef.doc(tx.transaction_id);
          batch.set(docRef, {
            ...tx,
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
        success: true,
        added: totalAdded,
        modified: totalModified,
      };
    } catch (err: unknown) {
      logger.error("Plaid transactionsSync failed", err);
      const message =
        err && typeof err === "object" && "response" in err ?
          String((err as { response?: { data?: unknown } }).response?.data) :
          "Failed to sync transactions.";
      throw new HttpsError("internal", message);
    }
  }
);
