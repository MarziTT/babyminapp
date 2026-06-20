---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b59a95776c6511f1aa625254006c9bbf
    ReservedCode1: saetmy2vKCyP+JGwBhMbQErNAWNOv9aHppYjsB7qiUoovq/0TtcMtKvX6uZE/UK1tbQ6ns4ljIBSaMmK+eO2bLsNS2itDjtKzCqEuIFKz20HD1az5GwVUG5Rv+3GfxBGDWGF/frzgkErgTZKpWDbK9NitUq1dJYIMfdMdMPT5rG70NyKpdXKZnDziS0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b59a95776c6511f1aa625254006c9bbf
    ReservedCode2: saetmy2vKCyP+JGwBhMbQErNAWNOv9aHppYjsB7qiUoovq/0TtcMtKvX6uZE/UK1tbQ6ns4ljIBSaMmK+eO2bLsNS2itDjtKzCqEuIFKz20HD1az5GwVUG5Rv+3GfxBGDWGF/frzgkErgTZKpWDbK9NitUq1dJYIMfdMdMPT5rG70NyKpdXKZnDziS0=
---

# Fix Feeding Silent Catch

- **Status**: closed
- **Type**: chore
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

`feeding.js` `loadRecords` catch handler silently swallowed all errors with no logging and left stale records in the UI. Changed to log the error and clear the records list on failure.

## Acceptance criteria

- [x] `feeding.js` catch block logs the error via `console.error`
- [x] `feeding.js` catch block sets `records: []` to clear stale UI

## Files changed

- `pages/feeding/feeding.js`
*（内容由AI生成，仅供参考）*
