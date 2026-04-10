# Play Console Checklist

Reference app:
- Package name: `com.nickciaff.riftraiders`
- App name: `Rift Raiders`

Products to create:
- `com.nickciaff.riftraiders.starterpack`
- `com.nickciaff.riftraiders.riftpass.monthly`
- `com.nickciaff.riftraiders.gemvault.1800`

## Play Console setup

- Create the app in Google Play Console with package name `com.nickciaff.riftraiders`.
- Complete the Payments profile and merchant setup.
- Upload an Android App Bundle to at least the internal testing track so billing features are enabled.
- Add license testers under `Settings > License testing`.
- Create monetization products:
  - In-app product `com.nickciaff.riftraiders.starterpack`
  - Subscription `com.nickciaff.riftraiders.riftpass.monthly`
  - In-app product `com.nickciaff.riftraiders.gemvault.1800`
- Activate the products so they are available to testers.
- Mirror the same products inside RevenueCat offering `main`.
- Map subscription `com.nickciaff.riftraiders.riftpass.monthly` to entitlement `premium_rift_pass`.

## Internal testing

- Add tester accounts to the internal track.
- Install the build from Google Play, not by sideloading.
- Verify the tester account is the primary Play Store account on the device.
- Confirm the store loads RevenueCat offerings successfully.
- Test successful purchase for each product.
- Test user-cancelled purchase flow.
- Test `Restore Purchases` for the subscription product.
- Verify premium perks unlock when `premium_rift_pass` is active.

## Billing QA

- Verify `starterpack` grants 250 gems and 1200 gold once.
- Verify `riftpass.monthly` grants 700 gems and 3000 gold and enables premium perks.
- Verify `gemvault.1800` grants 1800 gems.
- Confirm the app survives switching away to banking or Play UI during checkout.
- Use Play Billing Lab and license testers to simulate failures if deeper billing QA is needed.

## Release readiness

- Confirm internal testing passes before moving to closed or open testing.
- Verify store listing, privacy policy, and data safety form are complete.
- Confirm no billing test-only metadata is left in production manifests.
- Move from internal to staged rollout after successful purchase verification.
