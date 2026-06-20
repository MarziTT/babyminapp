---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b36e5cda6c6511f1aa625254006c9bbf
    ReservedCode1: bYBJDV3hgw9eSefEO81gZGWgptgFEVGv8F5JfdwhbzhUQOAQewBRX2pvaJLlDWzbhEVA++xga2/tolugFGnhc2R8IrqjZlvh5kkl0tdpXb4qodFRNZz7y5NCJWn3SskDGjjxtc2JaKKGEcLRitqE3rDt4gxhZ6sNLtNr8Vz+veBBuxHPWB4njb9snk4=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b36e5cda6c6511f1aa625254006c9bbf
    ReservedCode2: bYBJDV3hgw9eSefEO81gZGWgptgFEVGv8F5JfdwhbzhUQOAQewBRX2pvaJLlDWzbhEVA++xga2/tolugFGnhc2R8IrqjZlvh5kkl0tdpXb4qodFRNZz7y5NCJWn3SskDGjjxtc2JaKKGEcLRitqE3rDt4gxhZ6sNLtNr8Vz+veBBuxHPWB4njb9snk4=
---

# Fix Voice Confirm — Missing family_id

- **Status**: closed
- **Type**: bug
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

Voice page `_doConfirm` constructed record payloads with `baby_id` but omitted `family_id`. The page-level add forms all include `family_id` via `getFamilyId()`, so voice-created records were missing this field, potentially causing backend errors or orphaned records.

## Acceptance criteria

- [x] `voice.js` imports `getFamilyId` from `utils/baby`
- [x] `_doConfirm` sets `payload.family_id = getFamilyId()` after `payload.baby_id`

## Files changed

- `pages/voice/voice.js`
*（内容由AI生成，仅供参考）*
