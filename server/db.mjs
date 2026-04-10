import pg from "pg";
import { MONETIZATION_CATALOG } from "../shared/monetization-catalog.js";

const { Pool } = pg;

export function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString,
    ssl: parseBoolean(process.env.DATABASE_SSL) ? { rejectUnauthorized: false } : undefined
  });

  async function init() {
    await pool.query(`
      create table if not exists wallets (
        app_user_id text primary key,
        gems integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ledger_entries (
        id bigserial primary key,
        app_user_id text not null,
        entry_type text not null,
        currency text not null,
        amount integer not null,
        reason text not null,
        idempotency_key text,
        transaction_identifier text,
        product_identifier text,
        package_identifier text,
        platform text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create unique index if not exists ledger_entries_idempotency_key_idx
        on ledger_entries (idempotency_key)
        where idempotency_key is not null;

      create table if not exists purchase_transactions (
        transaction_identifier text primary key,
        app_user_id text not null,
        package_identifier text not null,
        product_identifier text,
        platform text,
        gems_granted integer not null default 0,
        gold_granted integer not null default 0,
        source text not null,
        verified_at timestamptz not null default now(),
        raw_event jsonb not null default '{}'::jsonb
      );

      create table if not exists webhook_events (
        event_id text primary key,
        event_type text not null,
        app_user_id text,
        transaction_identifier text,
        received_at timestamptz not null default now(),
        raw_event jsonb not null
      );
    `);
  }

  async function close() {
    await pool.end();
  }

  async function ensureWallet(client, appUserId) {
    await client.query(
      `insert into wallets (app_user_id, gems)
       values ($1, $2)
       on conflict (app_user_id) do nothing`,
      [appUserId, MONETIZATION_CATALOG.defaultWallet.gems]
    );
  }

  async function getWallet(appUserId) {
    const client = await pool.connect();
    try {
      await ensureWallet(client, appUserId);
      const { rows } = await client.query(
        `select app_user_id, gems, created_at, updated_at
         from wallets
         where app_user_id = $1`,
        [appUserId]
      );
      return mapWallet(rows[0]);
    } finally {
      client.release();
    }
  }

  async function grantCurrency({ appUserId, currency, amount, reason, idempotencyKey, metadata = {} }) {
    if (currency !== "gems") throw new Error("only gems are supported in the database wallet");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be a positive number");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await ensureWallet(client, appUserId);

      if (idempotencyKey) {
        const duplicate = await client.query(
          `select id, amount, reason, created_at
           from ledger_entries
           where idempotency_key = $1`,
          [idempotencyKey]
        );
        if (duplicate.rows[0]) {
          const wallet = await fetchWalletForUpdate(client, appUserId);
          await client.query("commit");
          return { wallet, duplicate: true, transaction: duplicate.rows[0] };
        }
      }

      await client.query(
        `update wallets
         set gems = gems + $2, updated_at = now()
         where app_user_id = $1`,
        [appUserId, amount]
      );
      const inserted = await client.query(
        `insert into ledger_entries (
          app_user_id, entry_type, currency, amount, reason, idempotency_key, metadata
        ) values ($1, 'grant', $2, $3, $4, $5, $6)
        returning id, amount, reason, created_at`,
        [appUserId, currency, amount, reason || "unspecified", idempotencyKey || null, JSON.stringify(metadata)]
      );
      const wallet = await fetchWalletForUpdate(client, appUserId);
      await client.query("commit");
      return { wallet, duplicate: false, transaction: inserted.rows[0] };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function spendCurrency({ appUserId, currency, amount, reason, idempotencyKey, metadata = {} }) {
    if (currency !== "gems") throw new Error("only gems are supported in the database wallet");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be a positive number");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await ensureWallet(client, appUserId);

      if (idempotencyKey) {
        const duplicate = await client.query(
          `select id, amount, reason, created_at
           from ledger_entries
           where idempotency_key = $1`,
          [idempotencyKey]
        );
        if (duplicate.rows[0]) {
          const wallet = await fetchWalletForUpdate(client, appUserId);
          await client.query("commit");
          return { wallet, duplicate: true, transaction: duplicate.rows[0] };
        }
      }

      const wallet = await fetchWalletForUpdate(client, appUserId, true);
      if (wallet.balances.gems < amount) {
        throw new Error("insufficient gems");
      }

      await client.query(
        `update wallets
         set gems = gems - $2, updated_at = now()
         where app_user_id = $1`,
        [appUserId, amount]
      );
      const inserted = await client.query(
        `insert into ledger_entries (
          app_user_id, entry_type, currency, amount, reason, idempotency_key, metadata
        ) values ($1, 'spend', $2, $3, $4, $5, $6)
        returning id, amount, reason, created_at`,
        [appUserId, currency, amount, reason || "unspecified", idempotencyKey || null, JSON.stringify(metadata)]
      );
      const updatedWallet = await fetchWalletForUpdate(client, appUserId);
      await client.query("commit");
      return { wallet: updatedWallet, duplicate: false, transaction: inserted.rows[0] };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function findVerifiedPurchase(transactionIdentifier) {
    const { rows } = await pool.query(
      `select *
       from purchase_transactions
       where transaction_identifier = $1`,
      [transactionIdentifier]
    );
    return rows[0] ? mapPurchase(rows[0]) : null;
  }

  async function reconcileVerifiedPurchase({ appUserId, packageIdentifier, productIdentifier, transactionIdentifier, platform, source, rawEvent = {} }) {
    const reward = MONETIZATION_CATALOG.packageRewards[packageIdentifier];
    if (!reward) throw new Error(`unknown packageIdentifier: ${packageIdentifier}`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await ensureWallet(client, appUserId);

      const existing = await client.query(
        `select *
         from purchase_transactions
         where transaction_identifier = $1
         for update`,
        [transactionIdentifier]
      );
      if (existing.rows[0]) {
        const wallet = await fetchWalletForUpdate(client, appUserId);
        await client.query("commit");
        return { wallet, duplicate: true, purchaseRecord: mapPurchase(existing.rows[0]) };
      }

      await client.query(
        `update wallets
         set gems = gems + $2, updated_at = now()
         where app_user_id = $1`,
        [appUserId, reward.gems]
      );

      const inserted = await client.query(
        `insert into purchase_transactions (
          transaction_identifier, app_user_id, package_identifier, product_identifier, platform,
          gems_granted, gold_granted, source, raw_event
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *`,
        [
          transactionIdentifier,
          appUserId,
          packageIdentifier,
          productIdentifier || null,
          platform || null,
          reward.gems,
          reward.gold,
          source,
          JSON.stringify(rawEvent)
        ]
      );

      await client.query(
        `insert into ledger_entries (
          app_user_id, entry_type, currency, amount, reason, transaction_identifier, product_identifier,
          package_identifier, platform, metadata
        ) values ($1, 'purchase_grant', 'gems', $2, $3, $4, $5, $6, $7, $8)`,
        [
          appUserId,
          reward.gems,
          packageIdentifier,
          transactionIdentifier,
          productIdentifier || null,
          packageIdentifier,
          platform || null,
          JSON.stringify({ source })
        ]
      );

      const wallet = await fetchWalletForUpdate(client, appUserId);
      await client.query("commit");
      return { wallet, duplicate: false, purchaseRecord: mapPurchase(inserted.rows[0]) };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function recordWebhookEvent({ eventId, eventType, appUserId, transactionIdentifier, rawEvent }) {
    const { rowCount } = await pool.query(
      `insert into webhook_events (event_id, event_type, app_user_id, transaction_identifier, raw_event)
       values ($1, $2, $3, $4, $5)
       on conflict (event_id) do nothing`,
      [eventId, eventType, appUserId || null, transactionIdentifier || null, JSON.stringify(rawEvent)]
    );
    return rowCount > 0;
  }

  return {
    close,
    getWallet,
    grantCurrency,
    spendCurrency,
    findVerifiedPurchase,
    reconcileVerifiedPurchase,
    recordWebhookEvent,
    init
  };
}

async function fetchWalletForUpdate(client, appUserId, forUpdate = false) {
  const suffix = forUpdate ? " for update" : "";
  const { rows } = await client.query(
    `select app_user_id, gems, created_at, updated_at
     from wallets
     where app_user_id = $1${suffix}`,
    [appUserId]
  );
  return mapWallet(rows[0]);
}

function mapWallet(row) {
  return {
    appUserId: row.app_user_id,
    balances: { gems: row.gems },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPurchase(row) {
  return {
    transactionIdentifier: row.transaction_identifier,
    appUserId: row.app_user_id,
    packageIdentifier: row.package_identifier,
    productIdentifier: row.product_identifier,
    platform: row.platform,
    gemsGranted: row.gems_granted,
    goldGranted: row.gold_granted,
    source: row.source,
    verifiedAt: row.verified_at
  };
}

function parseBoolean(value) {
  return value === "1" || value === "true";
}
