# RevenueCat Setup

Project bundle ID: `com.nickciaff.riftraiders`

## Entitlement

- Entitlement ID: `premium_rift_pass`
  Use this for the monthly premium pass. The app checks this entitlement to enable premium combat and gold bonuses.

## Offering

- Current offering identifier: `main`

## Packages and store products

| RevenueCat package ID | Store product ID | Store type | Purpose |
| --- | --- | --- | --- |
| `starter_pack` | `com.nickciaff.riftraiders.starterpack` | One-time purchase | Starter bundle with 250 gems and 1200 gold |
| `rift_pass_monthly` | `com.nickciaff.riftraiders.riftpass.monthly` | Auto-renewable subscription | Monthly premium pass with entitlement plus 700 gems and 3000 gold on purchase transaction |
| `gem_vault_1800` | `com.nickciaff.riftraiders.gemvault.1800` | Consumable | 1800 gem purchase |

## RevenueCat dashboard checklist

- Create or open the `Rift Raiders` project.
- Add the iOS app with bundle ID `com.nickciaff.riftraiders`.
- Add the Android app with package name `com.nickciaff.riftraiders`.
- Copy the public Apple SDK key and Google SDK key into [src/iap-config.js](/home/nickciaff/rift-raiders/src/iap-config.js).
- Create entitlement `premium_rift_pass`.
- Create the three products with the exact product IDs listed above.
- Attach `com.nickciaff.riftraiders.riftpass.monthly` to entitlement `premium_rift_pass`.
- Create offering `main`.
- Add packages `starter_pack`, `rift_pass_monthly`, and `gem_vault_1800` to offering `main`.
- Confirm Sandbox Testing Access is set appropriately for QA before external testing.

## App behavior mapping

- `starter_pack`: grants 250 gems and 1200 gold once per successful purchase transaction.
- `rift_pass_monthly`: grants 700 gems and 3000 gold on purchase transaction and enables `premium_rift_pass`.
- `gem_vault_1800`: grants 1800 gems once per successful purchase transaction.

## Implementation note

Consumable gem grants are now reconciled through the backend wallet service. The current server stores data in a local JSON file for development; replace that with a proper database and server-side RevenueCat verification before production.
