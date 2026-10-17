---
name: Manual wallet test profiles
description: Security boundary for profile previews created from an unsigned wallet-address scan.
---

Profiles created from a manually entered address must remain local to that browser and clearly labeled as test-only. Do not save them to the shared profile database or present them as authenticated community profiles.

**Why:** On-chain ownership proves which address owns the NFT, but an unsigned address entry does not prove that the user controls that address. The normal profile API relies on authenticated wallet sessions and revalidates ownership.

**How to apply:** Keep address-only testing read-only with respect to shared services. A test profile may save entered fields in browser storage, but must not call profile creation, login, signing, or transaction endpoints.
