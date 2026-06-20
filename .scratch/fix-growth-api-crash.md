---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b1fd98bf6c6511f18805525400d9a7a1
    ReservedCode1: KZVEtE31drp4912Hnu/bySJjcj4EBhY+Si06ccxaGxCHpAAHvH9ZxD68s690fX7MwhBry9DJrdWwSDIidE4cFQ9JLaVC2fKSyyeCClQE13NcE0LtqeH//nSykS5pwMYOKUsw3BvMRk9W+8+MrvLfy+6daHu2CW7/90O+QvAeOyAF3EQ7jJxbg+33rug=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b1fd98bf6c6511f18805525400d9a7a1
    ReservedCode2: KZVEtE31drp4912Hnu/bySJjcj4EBhY+Si06ccxaGxCHpAAHvH9ZxD68s690fX7MwhBry9DJrdWwSDIidE4cFQ9JLaVC2fKSyyeCClQE13NcE0LtqeH//nSykS5pwMYOKUsw3BvMRk9W+8+MrvLfy+6daHu2CW7/90O+QvAeOyAF3EQ7jJxbg+33rug=
---

# Fix Growth API Crash — Missing Exports

- **Status**: closed
- **Type**: bug
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

`api.js` exported `getGrowthRecord` and `updateGrowth` in `module.exports` but never defined them. `growth/add/add.js` required these functions and `growth.js`'s `editRecord` navigated to the add page with `mode=edit&id=xxx`, but the add page had no `onLoad` to handle edit mode — causing runtime crash `undefined is not a function`.

## Acceptance criteria

- [x] `api.js` defines `getGrowthRecord(id)` and `updateGrowth(id, data)` with correct REST endpoints
- [x] `api.js` module.exports includes both functions
- [x] `growth/add/add.js` has `onLoad` that handles `mode=edit` (reads globalData/storage, falls back to API fetch)
- [x] `growth/add/add.js` has `onLoad` that handles `from=voice` voice prefill
- [x] Edit form fills correctly with existing record data
- [x] Voice prefill populates growth fields correctly

## Files changed

- `utils/api.js`
- `pages/growth/add/add.js`
*（内容由AI生成，仅供参考）*
