---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b4e138d36c6511f18805525400d9a7a1
    ReservedCode1: 8NqavJa+QdquG5dJapXl3AflgdP8PIKKuuE2GNMQciC7Ifnkpi2Gl174I8Rf0MviOAN/SRO2NQctxK46S9+ZD2YGQ5szoFaLV3qzIrWbsClMgZfAwPRLZVSI/TLt1pcrAIbQSB4E+sqtThCMyjrJz7DXAK50W/mIDIMTLZwoR6q93Vp/oCgB6ZYT+s0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b4e138d36c6511f18805525400d9a7a1
    ReservedCode2: 8NqavJa+QdquG5dJapXl3AflgdP8PIKKuuE2GNMQciC7Ifnkpi2Gl174I8Rf0MviOAN/SRO2NQctxK46S9+ZD2YGQ5szoFaLV3qzIrWbsClMgZfAwPRLZVSI/TLt1pcrAIbQSB4E+sqtThCMyjrJz7DXAK50W/mIDIMTLZwoR6q93Vp/oCgB6ZYT+s0=
---

# Fix Report Export — Note param

- **Status**: closed
- **Type**: bug
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

Report page `_fetchByType` for `note` type called `api.getNotes(babyId)` but `getNotes(babyId, date)` requires a date parameter. The call would fail or return unexpected results.

## Acceptance criteria

- [x] `report.js` `_fetchByType` passes `(babyId, todayStr)` when `type === 'note'`

## Files changed

- `pages/report/report.js`
*（内容由AI生成，仅供参考）*
