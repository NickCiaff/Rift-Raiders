import { createServer } from "node:http";
import { createDatabase } from "./db.mjs";
import { createRevenueCatClient } from "./revenuecat.mjs";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const apiToken = process.env.RIFT_RAIDERS_SERVER_TOKEN || "dev-token-change-me";
const db = createDatabase();
const revenueCat = createRevenueCatClient();

await db.init();

const server = createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && req.url === "/api/revenuecat/webhook") {
      const body = await readJson(req);
      if (!revenueCat.verifyWebhookAuth(req)) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      const event = body?.event || {};
      const inserted = await db.recordWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        appUserId: event.app_user_id,
        transactionIdentifier: event.transaction_id || event.original_transaction_id,
        rawEvent: body
      });
      if (!inserted) {
        sendJson(res, 200, { ok: true, duplicate: true });
        return;
      }
      const verifiedPurchase = revenueCat.derivePurchaseFromWebhook(body);
      if (verifiedPurchase) {
        await db.reconcileVerifiedPurchase({
          ...verifiedPurchase,
          source: "revenuecat_webhook"
        });
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!authorize(req, apiToken)) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/wallet/")) {
      const appUserId = decodeURIComponent(req.url.split("/").pop());
      sendJson(res, 200, { wallet: await db.getWallet(appUserId) });
      return;
    }

    if (req.method === "POST" && req.url === "/api/wallet/grant") {
      const body = await readJson(req);
      const result = await db.grantCurrency(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/api/wallet/spend") {
      const body = await readJson(req);
      const result = await db.spendCurrency(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/api/iap/reconcile") {
      const body = await readJson(req);
      const existing = await db.findVerifiedPurchase(body.transactionIdentifier);
      if (existing) {
        sendJson(res, 200, {
          wallet: await db.getWallet(existing.appUserId),
          duplicate: true,
          purchaseRecord: existing
        });
        return;
      }

      const subscriber = await revenueCat.fetchSubscriber(body.appUserId);
      const verifiedPurchases = revenueCat.derivePurchasesFromSubscriber(body.appUserId, subscriber);
      const matchingPurchase = verifiedPurchases.find((entry) => entry.transactionIdentifier === body.transactionIdentifier);

      if (!matchingPurchase) {
        sendJson(res, 409, { error: "purchase_not_yet_verified" });
        return;
      }

      const result = await db.reconcileVerifiedPurchase({
        ...matchingPurchase,
        source: "revenuecat_api_v1"
      });
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "request_failed" });
  }
});

server.listen(port, host, () => {
  console.log(`Rift Raiders backend listening on http://${host}:${port}`);
});

function authorize(req, token) {
  const header = req.headers.authorization || "";
  return header === `Bearer ${token}`;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}
