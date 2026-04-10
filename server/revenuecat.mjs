import { MONETIZATION_CATALOG } from "../shared/monetization-catalog.js";

const PURCHASE_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "NON_RENEWING_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE"
]);

export function createRevenueCatClient() {
  const secretApiKey = process.env.REVENUECAT_SECRET_API_KEY || "";
  const webhookAuth = process.env.REVENUECAT_WEBHOOK_AUTH || "";

  async function fetchSubscriber(appUserId) {
    if (!secretApiKey) {
      throw new Error("REVENUECAT_SECRET_API_KEY is required for server-side verification");
    }
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: {
        Authorization: secretApiKey
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || payload.error || "revenuecat_subscriber_fetch_failed");
    }
    return payload.subscriber || {};
  }

  function verifyWebhookAuth(req) {
    if (!webhookAuth) {
      throw new Error("REVENUECAT_WEBHOOK_AUTH is required");
    }
    const header = req.headers.authorization || "";
    return header === webhookAuth || header === `Bearer ${webhookAuth}`;
  }

  function derivePurchaseFromWebhook(rawEvent) {
    const event = rawEvent?.event || {};
    if (!PURCHASE_EVENT_TYPES.has(event.type)) {
      return null;
    }
    const packageIdentifier = findPackageByProductId(event.product_id);
    if (!packageIdentifier) {
      return null;
    }
    const transactionIdentifier = event.transaction_id || event.original_transaction_id;
    if (!transactionIdentifier) {
      return null;
    }
    return {
      appUserId: event.app_user_id,
      packageIdentifier,
      productIdentifier: event.product_id,
      transactionIdentifier,
      platform: normalizeStore(event.store),
      rawEvent
    };
  }

  function derivePurchasesFromSubscriber(appUserId, subscriber) {
    const purchases = [];
    const nonSubscriptions = subscriber?.non_subscriptions || {};

    for (const [productId, entries] of Object.entries(nonSubscriptions)) {
      const packageIdentifier = findPackageByProductId(productId);
      if (!packageIdentifier) continue;
      for (const entry of entries || []) {
        const transactionIdentifier = entry.transaction_id || entry.id || entry.store_transaction_id || entry.transaction_identifier;
        if (!transactionIdentifier) continue;
        purchases.push({
          appUserId,
          packageIdentifier,
          productIdentifier: productId,
          transactionIdentifier,
          platform: normalizeStore(entry.store),
          rawEvent: { subscriber_entry: entry, source: "revenuecat_api_v1" }
        });
      }
    }

    const subscriptions = subscriber?.subscriptions || {};
    for (const [productId, entry] of Object.entries(subscriptions)) {
      const packageIdentifier = findPackageByProductId(productId);
      if (!packageIdentifier) continue;
      const transactionIdentifier = entry.store_transaction_id || entry.transaction_id || entry.original_transaction_id;
      if (!transactionIdentifier) continue;
      purchases.push({
        appUserId,
        packageIdentifier,
        productIdentifier: productId,
        transactionIdentifier,
        platform: normalizeStore(entry.store),
        rawEvent: { subscriber_entry: entry, source: "revenuecat_api_v1" }
      });
    }

    return purchases;
  }

  return {
    derivePurchaseFromWebhook,
    derivePurchasesFromSubscriber,
    fetchSubscriber,
    verifyWebhookAuth
  };
}

function findPackageByProductId(productId) {
  for (const platform of Object.values(MONETIZATION_CATALOG.productIds)) {
    for (const [key, value] of Object.entries(platform)) {
      if (value === productId) {
        return MONETIZATION_CATALOG.packageIds[key];
      }
    }
  }
  return null;
}

function normalizeStore(store) {
  if (!store) return null;
  if (store.includes("PLAY")) return "android";
  if (store.includes("APP_STORE")) return "ios";
  return store.toLowerCase();
}
