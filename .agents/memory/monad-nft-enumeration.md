---
name: Monad NFT enumeration
description: Why CHOG Genesis ownership reads use contract enumeration instead of transfer-log reconstruction.
---

The CHOG Genesis collection exposes `tokensOfOwner(address)` as a view returning token IDs. It was verified against a current Monad mainnet holder. Monad RPC `eth_getLogs` enforces a 100-block range limit, so reconstructing ownership across the collection's full history is not viable.

**Why:** Holder eligibility must reflect current on-chain ownership without depending on an impractical historical log scan.

**How to apply:** Compare the returned ID count with `balanceOf` and verify each token with `ownerOf`. If the contract or RPC behavior changes, re-check its ABI and limits rather than silently falling back to a full-history scan.
