export const MONETIZATION_CATALOG = {
  defaultWallet: {
    gems: 150
  },
  entitlementIds: {
    riftPass: "premium_rift_pass"
  },
  offeringIdentifier: "main",
  packageIds: {
    starterPack: "starter_pack",
    riftPassMonthly: "rift_pass_monthly",
    gemVault1800: "gem_vault_1800"
  },
  productIds: {
    apple: {
      starterPack: "com.nickciaff.riftraiders.starterpack",
      riftPassMonthly: "com.nickciaff.riftraiders.riftpass.monthly",
      gemVault1800: "com.nickciaff.riftraiders.gemvault.1800"
    },
    google: {
      starterPack: "com.nickciaff.riftraiders.starterpack",
      riftPassMonthly: "com.nickciaff.riftraiders.riftpass.monthly",
      gemVault1800: "com.nickciaff.riftraiders.gemvault.1800"
    }
  },
  packageRewards: {
    starter_pack: {
      gems: 250,
      gold: 1200,
      note: "Starter Cache",
      storeType: "one_time",
      revenueCatPackage: "starter_pack"
    },
    rift_pass_monthly: {
      gems: 700,
      gold: 3000,
      note: "Rift Pass Monthly",
      storeType: "subscription",
      revenueCatPackage: "rift_pass_monthly"
    },
    gem_vault_1800: {
      gems: 1800,
      gold: 0,
      note: "Gem Vault 1800",
      storeType: "consumable",
      revenueCatPackage: "gem_vault_1800"
    }
  }
};
