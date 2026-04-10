# App Store Connect Checklist

Reference app:
- Bundle ID: `com.nickciaff.riftraiders`
- App name: `Rift Raiders`

Products to create:
- `com.nickciaff.riftraiders.starterpack`
- `com.nickciaff.riftraiders.riftpass.monthly`
- `com.nickciaff.riftraiders.gemvault.1800`

## Product setup

- Create app record for `Rift Raiders` using bundle ID `com.nickciaff.riftraiders`.
- In Agreements, Tax, and Banking, ensure paid apps are fully enabled.
- Under In-App Purchases, create:
  - Non-Consumable or non-renewing one-time bundle decision for `com.nickciaff.riftraiders.starterpack`
  - Auto-Renewable Subscription for `com.nickciaff.riftraiders.riftpass.monthly`
  - Consumable for `com.nickciaff.riftraiders.gemvault.1800`
- Add localized display names, descriptions, review screenshots, and pricing.
- Put `com.nickciaff.riftraiders.riftpass.monthly` in a subscription group, for example `rift_pass_group`.
- Mirror the same products inside RevenueCat and map the subscription to entitlement `premium_rift_pass`.

## Sandbox and TestFlight

- Create Sandbox Apple test accounts in App Store Connect.
- Install a TestFlight or debug build on a physical device.
- Sign in with a Sandbox Apple Account on the device.
- Verify the store loads products from RevenueCat.
- Test successful purchase for each product.
- Test cancelling a purchase before confirmation.
- Test `Restore Purchases` for the subscription product.
- In TestFlight, verify accelerated subscription renewals for `com.nickciaff.riftraiders.riftpass.monthly`.
- Verify the app unlocks premium perks when entitlement `premium_rift_pass` becomes active.

## Submission readiness

- Confirm every in-app purchase is marked `Ready to Submit` or included with the app version as required.
- Ensure privacy policy, support URL, and app metadata are present.
- Verify App Review notes explain how the premium pass and gem purchases are exposed in-game.
- Submit the binary with in-app purchases attached for review.

## QA sign-off

- Purchase flow succeeds on device.
- Cancelling purchase returns cleanly to game.
- Subscription entitlement toggles premium perks correctly.
- One-time purchases do not break progression if the app is backgrounded during checkout.
- No production Apple ID is used for sandbox testing.
