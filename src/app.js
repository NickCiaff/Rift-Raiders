import { Capacitor } from "@capacitor/core";
import { LOG_LEVEL, Purchases } from "@revenuecat/purchases-capacitor";
import { IAP_CONFIG } from "./iap-config.js";

const STORAGE_KEY = "rift-raiders-save-v2";
const TICK_MS = 250;
const companionsPool = [
  { name: "Spark Fox", rarity: "Rare", bonus: 1.12, flavor: "Boosts crit damage through static arcs." },
  { name: "Lantern Wisp", rarity: "Common", bonus: 1.08, flavor: "Adds safe auto-battle damage over time." },
  { name: "Moss Golem", rarity: "Epic", bonus: 1.22, flavor: "Turns max HP into bonus attack." },
  { name: "Ash Drake", rarity: "Legendary", bonus: 1.35, flavor: "Massive burst against bosses." },
  { name: "Coin Mantis", rarity: "Rare", bonus: 1.15, flavor: "Improves gold drops from elite kills." }
];
const fallbackOffers = [
  { identifier: IAP_CONFIG.packageIds.starterPack, title: "Starter Cache", price: "$1.99", description: "250 gems • 1200 gold" },
  { identifier: IAP_CONFIG.packageIds.riftPassMonthly, title: "Rift Pass Monthly", price: "$4.99", description: "700 gems • 3000 gold • premium perks" },
  { identifier: IAP_CONFIG.packageIds.gemVault1800, title: "Gem Vault 1800", price: "$9.99", description: "1800 gems" }
];
const quests = [
  { title: "Clean Sweep", desc: "Defeat 8 enemies", target: 8, type: "kills", reward: { gold: 500, gems: 30 } },
  { title: "Burst Damage", desc: "Use Rift Burst 5 times", target: 5, type: "skills", reward: { gold: 300, gems: 40 } },
  { title: "Deep Dive", desc: "Clear 3 stages", target: 3, type: "stages", reward: { gold: 900, gems: 60 } }
];

const runtime = {
  offerings: [],
  currentOfferingId: null,
  storeStatus: "Connecting store...",
  purchaseInFlight: false,
  billingReady: false,
  customerInfoListener: null,
  appUserId: null,
  walletEnabled: false,
  walletSyncInFlight: false,
  walletQueue: Promise.resolve()
};

const defaultState = () => ({
  gold: 400,
  gems: 150,
  stage: 1,
  wave: 1,
  enemy: buildEnemy(1, 1),
  player: {
    attack: 18,
    hpMax: 150,
    hp: 150,
    critRate: 0.1,
    critDamage: 1.8,
    lifesteal: 0.03
  },
  upgrades: { attack: 0, health: 0, crit: 0, lifesteal: 0 },
  companions: [],
  autoBattle: true,
  forcedBoss: false,
  stats: { kills: 0, skills: 0, stages: 0, damageDone: 0 },
  questIndex: 0,
  questClaimed: false,
  lastSaved: Date.now(),
  lastOpened: Date.now(),
  monetization: {
    platform: "web",
    premiumActive: false,
    lastStoreSync: null,
    lastWalletSync: null
  },
  battleLog: ["The first breach opens under a blood-orange sky."]
});

let state = loadState();
const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  bindEvents();
  render();
  await initializeBilling();
  applyIdleRewards();
  render();
  setInterval(gameTick, TICK_MS);
  setInterval(saveState, 5000);
});

window.addEventListener("beforeunload", saveState);

function bindElements() {
  const ids = [
    "goldValue", "gemsValue", "powerValue", "stageValue", "enemyName", "enemyFlavor", "enemyBadge",
    "enemyHpBar", "enemyHpText", "dpsValue", "critValue", "lifestealValue", "battleLog",
    "attackUpgradeCost", "healthUpgradeCost", "critUpgradeCost", "lifestealUpgradeCost",
    "questTitle", "questDesc", "questBar", "questProgress", "companionsList", "offersList",
    "attackBtn", "skillBtn", "bossBtn", "summonBtn", "claimQuestBtn", "claimIdleBtn", "autoBattleToggle",
    "restorePurchasesBtn", "storeStatus"
  ];
  ids.forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.attackBtn.addEventListener("click", () => hitEnemy(false));
  els.skillBtn.addEventListener("click", castSkill);
  els.bossBtn.addEventListener("click", () => {
    state.forcedBoss = true;
    state.enemy = buildEnemy(state.stage, state.wave, true);
    log("Boss challenge forced. Better kill it fast.");
    render();
  });
  els.summonBtn.addEventListener("click", summonCompanion);
  els.claimQuestBtn.addEventListener("click", claimQuestReward);
  els.claimIdleBtn.addEventListener("click", () => applyIdleRewards(true));
  els.restorePurchasesBtn.addEventListener("click", restorePurchases);
  els.autoBattleToggle.addEventListener("change", (event) => {
    state.autoBattle = event.target.checked;
    render();
  });
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
  });
}

async function initializeBilling() {
  state.monetization.platform = Capacitor.getPlatform();
  if (!isNativePlatform()) {
    runtime.storeStatus = "Open the Android or iPhone app to test real purchases. Browser mode does not have native billing.";
    render();
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey || apiKey.includes("_here")) {
    runtime.storeStatus = "RevenueCat API key missing. Add your Apple and Google public SDK keys in src/iap-config.js.";
    render();
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey, appUserID: null });
    runtime.appUserId = (await Purchases.getAppUserID()).appUserID;
    await initializeWallet();
    runtime.customerInfoListener = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      applyCustomerInfo(customerInfo);
      render();
    });
    runtime.billingReady = true;
    runtime.storeStatus = "Store connected. Loading offerings...";
    await refreshStoreState();
  } catch (error) {
    runtime.storeStatus = `Store setup failed: ${getErrorMessage(error)}`;
    render();
  }
}

async function initializeWallet() {
  if (!runtime.appUserId) {
    runtime.storeStatus = "Wallet setup failed: RevenueCat app user ID missing.";
    return;
  }
  if (!hasBackendConfig()) {
    runtime.storeStatus = "Backend wallet config missing. Set src/iap-config.js backend.baseUrl and backend.apiToken.";
    return;
  }
  try {
    runtime.walletSyncInFlight = true;
    const response = await backendRequest(`/api/wallet/${encodeURIComponent(runtime.appUserId)}`);
    state.gems = response.wallet.balances.gems || 0;
    state.monetization.lastWalletSync = Date.now();
    runtime.walletEnabled = true;
  } catch (error) {
    runtime.storeStatus = `Wallet sync failed: ${getErrorMessage(error)}`;
  } finally {
    runtime.walletSyncInFlight = false;
  }
}

async function refreshStoreState() {
  if (!runtime.billingReady) return;
  try {
    const [{ customerInfo }, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings()
    ]);
    applyCustomerInfo(customerInfo);
    const currentOffering = offerings.current ?? offerings.all?.[IAP_CONFIG.offeringIdentifier] ?? null;
    runtime.currentOfferingId = currentOffering?.identifier ?? null;
    runtime.offerings = (currentOffering?.availablePackages ?? []).map((entry) => ({
      rcPackage: entry,
      identifier: entry.identifier,
      productIdentifier: entry.product.identifier,
      title: entry.product.title || prettifyIdentifier(entry.identifier),
      description: entry.product.description || describeReward(entry.identifier),
      price: entry.product.priceString
    }));
    runtime.storeStatus = runtime.offerings.length
      ? `Store ready on ${state.monetization.platform}. Offering: ${runtime.currentOfferingId || "current"}.`
      : "Store connected, but no RevenueCat packages were returned for the current offering.";
  } catch (error) {
    runtime.storeStatus = `Store refresh failed: ${getErrorMessage(error)}`;
  }
  render();
}

function gameTick() {
  if (state.autoBattle) {
    hitEnemy(true);
  }
  saveState(false);
  render();
}

function hitEnemy(isAuto) {
  const damage = calcDamage(isAuto ? 0.72 : 1);
  state.enemy.hp = Math.max(0, state.enemy.hp - damage);
  state.stats.damageDone += damage;
  healFromLifesteal(damage);
  log(`${isAuto ? "Auto" : "Strike"} hits ${state.enemy.name} for ${formatNumber(damage)}.`);
  if (state.enemy.hp <= 0) {
    killEnemy();
  }
}

function castSkill() {
  const damage = calcDamage(2.6);
  updateQuestProgress("skills", 1);
  state.enemy.hp = Math.max(0, state.enemy.hp - damage);
  healFromLifesteal(damage * 1.3);
  log(`Rift Burst detonates for ${formatNumber(damage)} damage.`);
  if (state.enemy.hp <= 0) {
    killEnemy();
  }
  render();
}

function killEnemy() {
  const goldReward = Math.round(state.enemy.maxHp * (state.enemy.isBoss ? 0.95 : 0.45) * getPremiumGoldMultiplier());
  const gemReward = state.enemy.isBoss ? 12 + Math.floor(state.stage / 3) : Math.random() < 0.12 ? 3 : 0;
  state.gold += goldReward;
  if (gemReward) {
    scheduleGemGrant(gemReward, state.enemy.isBoss ? "boss_kill" : "enemy_drop");
  }
  updateQuestProgress("kills", 1);
  log(`${state.enemy.name} falls. +${goldReward} gold${gemReward ? `, +${gemReward} gems` : ""}.`);
  advanceWave();
}

function advanceWave() {
  if (state.enemy.isBoss || state.wave >= 5) {
    state.stage += 1;
    state.wave = 1;
    updateQuestProgress("stages", 1);
    log(`Stage cleared. The rift deepens to ${state.stage}-1.`);
  } else {
    state.wave += 1;
  }
  state.forcedBoss = false;
  state.enemy = buildEnemy(state.stage, state.wave);
}

function buyUpgrade(type) {
  const cost = getUpgradeCost(type);
  if (state.gold < cost) {
    log("Not enough gold for that upgrade.");
    return;
  }
  state.gold -= cost;
  state.upgrades[type] += 1;
  if (type === "attack") state.player.attack += 6;
  if (type === "health") {
    state.player.hpMax += 30;
    state.player.hp = state.player.hpMax;
  }
  if (type === "crit") state.player.critRate += 0.02;
  if (type === "lifesteal") state.player.lifesteal += 0.01;
  log(`Purchased ${type} upgrade.`);
  render();
}

async function summonCompanion() {
  if (state.gems < 100) {
    log("Need 100 gems to summon a companion.");
    return;
  }
  const spendApplied = await spendGems(100, "companion_summon");
  if (!spendApplied) {
    return;
  }
  const pick = companionsPool[Math.floor(Math.random() * companionsPool.length)];
  state.companions.push({ ...pick, id: `${pick.name}-${Date.now()}` });
  log(`${pick.rarity} companion summoned: ${pick.name}.`);
  render();
}

function claimQuestReward() {
  const quest = getQuest();
  if (state.questClaimed || getQuestCurrentProgress() < quest.target) {
    log("Quest reward is not ready.");
    return;
  }
  state.gold += quest.reward.gold;
  if (quest.reward.gems) {
    scheduleGemGrant(quest.reward.gems, "quest_reward");
  }
  state.questIndex = (state.questIndex + 1) % quests.length;
  state.questClaimed = false;
  resetQuestProgress();
  log(`Quest completed. +${quest.reward.gold} gold and +${quest.reward.gems} gems.`);
  render();
}

async function restorePurchases() {
  if (!runtime.billingReady || runtime.purchaseInFlight) {
    log("Billing is not ready yet.");
    return;
  }
  try {
    runtime.purchaseInFlight = true;
    render();
    const { customerInfo } = await Purchases.restorePurchases();
    applyCustomerInfo(customerInfo);
    runtime.storeStatus = "Restore completed.";
    log("Restore Purchases finished.");
    await refreshStoreState();
  } catch (error) {
    runtime.storeStatus = `Restore failed: ${getErrorMessage(error)}`;
    log(runtime.storeStatus);
    render();
  } finally {
    runtime.purchaseInFlight = false;
    render();
  }
}

async function handlePurchase(identifier) {
  if (!runtime.billingReady || runtime.purchaseInFlight) return;
  const selected = runtime.offerings.find((entry) => entry.identifier === identifier);
  if (!selected?.rcPackage) {
    runtime.storeStatus = "Selected package is unavailable.";
    render();
    return;
  }

  try {
    runtime.purchaseInFlight = true;
    runtime.storeStatus = `Opening ${selected.title} checkout...`;
    render();
    const result = await Purchases.purchasePackage({
      aPackage: selected.rcPackage,
      googleIsPersonalizedPrice: false
    });
    await reconcilePurchaseGrant({
      packageIdentifier: selected.identifier,
      productIdentifier: selected.productIdentifier,
      transactionIdentifier: result.transaction.transactionIdentifier,
      platform: state.monetization.platform
    });
    applyCustomerInfo(result.customerInfo);
    runtime.storeStatus = `${selected.title} purchase completed.`;
    log(`${selected.title} purchased through ${state.monetization.platform}.`);
    await refreshStoreState();
  } catch (error) {
    const message = getErrorMessage(error);
    runtime.storeStatus = message === "Purchase was cancelled." ? message : `Purchase failed: ${message}`;
    log(runtime.storeStatus);
    render();
  } finally {
    runtime.purchaseInFlight = false;
    render();
  }
}

function applyCustomerInfo(customerInfo) {
  const active = customerInfo?.entitlements?.active ?? {};
  state.monetization.premiumActive = Boolean(active[IAP_CONFIG.entitlementIds.riftPass]);
  state.monetization.lastStoreSync = Date.now();
}

function applyIdleRewards(fromButton = false) {
  const now = Date.now();
  const elapsedMinutes = Math.min(240, Math.floor((now - state.lastOpened) / 60000));
  if (!elapsedMinutes) {
    if (fromButton) log("No idle loot ready yet.");
    return;
  }
  const gold = Math.round(elapsedMinutes * getPower() * 0.55 * getPremiumGoldMultiplier());
  const gems = Math.floor(elapsedMinutes / 18);
  state.gold += gold;
  if (gems) {
    scheduleGemGrant(gems, "idle_reward");
  }
  state.lastOpened = now;
  log(`Idle haul collected: ${gold} gold${gems ? ` and ${gems} gems` : ""}.`);
}

function buildEnemy(stage, wave, forceBoss = false) {
  const isBoss = forceBoss || wave === 5;
  const tier = stage + wave;
  const name = isBoss ? `Rift Tyrant ${stage}` : ["Void Slime", "Ash Hound", "Shard Priest", "Iron Ghoul"][tier % 4];
  const maxHp = Math.round((70 + stage * 28 + wave * 18) * (isBoss ? 4.3 : 1));
  return {
    name,
    flavor: isBoss ? "Its core pulses with stolen treasure." : "Every kill feeds the breach and your upgrade loop.",
    isBoss,
    maxHp,
    hp: maxHp
  };
}

function calcDamage(multiplier) {
  const companionBonus = state.companions.reduce((sum, companion) => sum * companion.bonus, 1);
  const crit = Math.random() < state.player.critRate ? state.player.critDamage : 1;
  const healthBonus = 1 + (state.player.hpMax / 1000) * hasCompanion("Moss Golem") * 0.8;
  const premiumBonus = state.monetization.premiumActive ? 1.12 : 1;
  return Math.round(state.player.attack * multiplier * crit * companionBonus * healthBonus * premiumBonus);
}

function healFromLifesteal(damage) {
  state.player.hp = Math.min(state.player.hpMax, state.player.hp + damage * state.player.lifesteal);
}

function getPower() {
  const companionMultiplier = state.companions.reduce((sum, companion) => sum + companion.bonus - 1, 1);
  const premiumOffset = state.monetization.premiumActive ? 250 : 0;
  return Math.round(state.player.attack * 4 + state.player.hpMax * 0.7 + state.player.critRate * 600 + companionMultiplier * 180 + premiumOffset);
}

function getUpgradeCost(type) {
  const level = state.upgrades[type];
  const base = { attack: 120, health: 140, crit: 180, lifesteal: 220 }[type];
  return Math.round(base * Math.pow(1.45, level));
}

function getQuest() {
  return quests[state.questIndex];
}

function getQuestCurrentProgress() {
  const type = getQuest().type;
  return state.stats[type];
}

function updateQuestProgress(type, amount) {
  const quest = getQuest();
  state.stats[type] += amount;
  if (quest.type === type && state.stats[type] >= quest.target) {
    state.questClaimed = false;
  }
}

function resetQuestProgress() {
  state.stats.kills = 0;
  state.stats.skills = 0;
  state.stats.stages = 0;
}

function hasCompanion(name) {
  return state.companions.some((companion) => companion.name === name) ? 1 : 0;
}

function getPremiumGoldMultiplier() {
  return state.monetization.premiumActive ? 1.2 : 1;
}

function log(message) {
  state.battleLog.unshift(message);
  state.battleLog = state.battleLog.slice(0, 18);
}

function render() {
  const hpRatio = (state.enemy.hp / state.enemy.maxHp) * 100;
  const quest = getQuest();
  const questProgress = Math.min(getQuestCurrentProgress(), quest.target);
  els.goldValue.textContent = formatNumber(state.gold);
  els.gemsValue.textContent = formatNumber(state.gems);
  els.powerValue.textContent = formatNumber(getPower());
  els.stageValue.textContent = `${state.stage}-${state.wave}`;
  els.enemyName.textContent = state.enemy.name;
  els.enemyFlavor.textContent = state.enemy.flavor;
  els.enemyBadge.textContent = state.enemy.isBoss ? "Boss" : "Normal";
  els.enemyHpBar.style.width = `${hpRatio}%`;
  els.enemyHpText.textContent = `${formatNumber(state.enemy.hp)} / ${formatNumber(state.enemy.maxHp)} HP`;
  els.dpsValue.textContent = formatNumber(Math.round(calcDamage(0.72) * (1000 / TICK_MS)));
  els.critValue.textContent = `${Math.round(state.player.critRate * 100)}%`;
  els.lifestealValue.textContent = `${Math.round(state.player.lifesteal * 100)}%`;
  els.attackUpgradeCost.textContent = `${formatNumber(getUpgradeCost("attack"))} gold`;
  els.healthUpgradeCost.textContent = `${formatNumber(getUpgradeCost("health"))} gold`;
  els.critUpgradeCost.textContent = `${formatNumber(getUpgradeCost("crit"))} gold`;
  els.lifestealUpgradeCost.textContent = `${formatNumber(getUpgradeCost("lifesteal"))} gold`;
  els.questTitle.textContent = quest.title;
  els.questDesc.textContent = `${quest.desc}. Reward: ${quest.reward.gold} gold, ${quest.reward.gems} gems.`;
  els.questBar.style.width = `${(questProgress / quest.target) * 100}%`;
  els.questProgress.textContent = `${questProgress} / ${quest.target}`;
  els.claimQuestBtn.textContent = questProgress >= quest.target ? "Claim Quest Reward" : "Quest In Progress";
  els.autoBattleToggle.checked = state.autoBattle;
  els.restorePurchasesBtn.disabled = !runtime.billingReady || runtime.purchaseInFlight;
  els.storeStatus.textContent = runtime.storeStatus;
  els.storeStatus.className = runtime.billingReady ? "muted status-good" : "muted status-bad";
  els.battleLog.innerHTML = state.battleLog.map((entry) => `<p class="log-entry">${entry}</p>`).join("");
  renderCompanions();
  renderOffers();
}

function renderCompanions() {
  if (!state.companions.length) {
    els.companionsList.innerHTML = `<article class="companion-card"><div><h3>No companions yet</h3><p class="muted">Summon allies to compound your power curve.</p></div><strong>0%</strong></article>`;
    return;
  }
  els.companionsList.innerHTML = state.companions
    .map((companion) => `
      <article class="companion-card">
        <div>
          <h3>${companion.name}</h3>
          <p class="muted">${companion.rarity} • ${companion.flavor}</p>
        </div>
        <strong>+${Math.round((companion.bonus - 1) * 100)}%</strong>
      </article>
    `).join("");
}

function renderOffers() {
  const offers = runtime.offerings.length ? runtime.offerings : fallbackOffers;
  const canPurchase = runtime.billingReady && !runtime.purchaseInFlight;
  els.offersList.innerHTML = offers.map((offer) => `
    <article class="offer-card">
      <div class="offer-meta">
        <h3>${offer.title}</h3>
        <p class="muted">${offer.description || describeReward(offer.identifier)}</p>
        <small class="button-note">${offer.identifier}${state.monetization.premiumActive && offer.identifier === IAP_CONFIG.packageIds.riftPassMonthly ? " • active" : ""}</small>
      </div>
      <div class="offer-actions">
        <span class="offer-price">${offer.price}</span>
        <button class="primary-button" data-offer="${offer.identifier}" ${canPurchase && runtime.offerings.length ? "" : "disabled"}>
          ${runtime.purchaseInFlight ? "Processing" : runtime.offerings.length ? "Buy" : "Native Only"}
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-offer]").forEach((button) => {
    button.addEventListener("click", () => handlePurchase(button.dataset.offer));
  });
}

function getRevenueCatApiKey() {
  return state.monetization.platform === "ios" ? IAP_CONFIG.appleApiKey : IAP_CONFIG.googleApiKey;
}

function hasBackendConfig() {
  return Boolean(IAP_CONFIG.backend?.baseUrl && IAP_CONFIG.backend?.apiToken);
}

async function backendRequest(path, options = {}) {
  const response = await fetch(`${IAP_CONFIG.backend.baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${IAP_CONFIG.backend.apiToken}`,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "backend_request_failed");
  }
  return payload;
}

function enqueueWalletOperation(work) {
  runtime.walletQueue = runtime.walletQueue
    .then(work)
    .catch((error) => {
      log(`Wallet sync failed: ${getErrorMessage(error)}`);
      render();
      return null;
    });
  return runtime.walletQueue;
}

function scheduleGemGrant(amount, reason) {
  state.gems += amount;
  render();

  if (!runtime.walletEnabled) {
    return;
  }

  const idempotencyKey = `${runtime.appUserId}:${reason}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  enqueueWalletOperation(async () => {
    const payload = await backendRequest("/api/wallet/grant", {
      method: "POST",
      body: {
        appUserId: runtime.appUserId,
        currency: "gems",
        amount,
        reason,
        idempotencyKey
      }
    });
    state.gems = payload.wallet.balances.gems || 0;
    state.monetization.lastWalletSync = Date.now();
    render();
  });
}

async function spendGems(amount, reason) {
  if (!runtime.walletEnabled) {
    state.gems -= amount;
    render();
    return true;
  }

  try {
    runtime.walletSyncInFlight = true;
    render();
    const payload = await enqueueWalletOperation(() => backendRequest("/api/wallet/spend", {
      method: "POST",
      body: {
        appUserId: runtime.appUserId,
        currency: "gems",
        amount,
        reason,
        idempotencyKey: `${runtime.appUserId}:${reason}:${Date.now()}`
      }
    }));
    if (!payload) return false;
    state.gems = payload.wallet.balances.gems || 0;
    state.monetization.lastWalletSync = Date.now();
    render();
    return true;
  } catch (error) {
    log(`Spend failed: ${getErrorMessage(error)}`);
    render();
    return false;
  } finally {
    runtime.walletSyncInFlight = false;
  }
}

async function reconcilePurchaseGrant({ packageIdentifier, productIdentifier, transactionIdentifier, platform }) {
  const reward = IAP_CONFIG.packageRewards[packageIdentifier];
  if (!runtime.walletEnabled) {
    if (reward) {
      state.gems += reward.gems;
      state.gold += reward.gold;
    }
    return;
  }

  const payload = await waitForVerifiedPurchase({
    appUserId: runtime.appUserId,
    packageIdentifier,
    productIdentifier,
    transactionIdentifier,
    platform
  });
  state.gems = payload.wallet.balances.gems || 0;
  if (!payload.duplicate && payload.purchaseRecord?.goldGranted) {
    state.gold += payload.purchaseRecord.goldGranted;
  }
  state.monetization.lastWalletSync = Date.now();
  const gemsGranted = payload.purchaseRecord?.gemsGranted ?? reward?.gems ?? 0;
  const goldGranted = payload.purchaseRecord?.goldGranted ?? reward?.gold ?? 0;
  log(`${reward?.note || prettifyIdentifier(packageIdentifier)} reconciled: +${gemsGranted} gems${goldGranted ? `, +${goldGranted} gold` : ""}.`);
}

async function waitForVerifiedPurchase(body) {
  const attempts = 4;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await backendRequest("/api/iap/reconcile", {
        method: "POST",
        body
      });
    } catch (error) {
      if (error.message !== "purchase_not_yet_verified" || attempt === attempts - 1) {
        throw error;
      }
      runtime.storeStatus = "Purchase submitted. Waiting for RevenueCat verification...";
      render();
      await wait(1500);
    }
  }
  throw new Error("purchase_not_yet_verified");
}

function isNativePlatform() {
  return ["ios", "android"].includes(Capacitor.getPlatform());
}

function describeReward(identifier) {
  const reward = IAP_CONFIG.packageRewards[identifier];
  if (!reward) return "Configure this package in RevenueCat.";
  const typeLabel = reward.storeType === "subscription" ? " • subscription" : reward.storeType === "consumable" ? " • consumable" : " • one-time";
  return `${reward.gems} gems${reward.gold ? ` • ${reward.gold} gold` : ""}${typeLabel}`;
}

function prettifyIdentifier(identifier) {
  return identifier.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(Math.round(value));
}

function getErrorMessage(error) {
  if (error?.userCancelled) return "Purchase was cancelled.";
  return error?.message || error?.code || "Unknown billing error.";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState(), ...saved } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(updateTimestamp = true) {
  if (updateTimestamp) {
    state.lastOpened = Date.now();
  }
  state.lastSaved = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
