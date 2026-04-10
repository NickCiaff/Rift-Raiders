# Rift Raiders

`Rift Raiders` is a mobile-first idle RPG prototype built with HTML, CSS, and JavaScript, wrapped with Capacitor for Android and iPhone, and wired for RevenueCat-based in-app purchases.

This repository is a prototype, not a production-ready monetization backend. The current backend architecture is suitable for development and portfolio review, but still needs stronger auth, deployment, and operational hardening before a real launch.

## What is included

- Tap and auto-battle combat loop
- Stage progression with forced bosses
- Upgrade economy using gold
- Gem-based companion summons
- Quest rewards and idle loot claims
- RevenueCat-backed native store flow for Apple and Google billing
- Postgres-backed wallet reconciliation for consumable gems

## Quick Start

1. Run `npm install`
2. Copy `.env.example` to `.env` and fill in real backend/RevenueCat values
3. Start the backend with `npm run server`
4. Build the web bundle with `npm run build`
5. Sync the Capacitor projects with `npm run sync`
