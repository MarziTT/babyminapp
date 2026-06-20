---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b2b56e056c6511f1aa625254006c9bbf
    ReservedCode1: dT2i8xona0U7D0L3fUufrvgU5ptTVYc9wmuN+UuzEO7IEpKuusQ+MhUXOKMhHoUFmvrWoX4u8OVt9DJAvNc95WJAxcMh1OtizyTuJ5bVCFP3XzohsF0c1O7cb/xtaAagwRF8hVqFIhFpiMF0a260F11226YHss2awn5oik8sWF3ADnul2QF++HjfibQ=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b2b56e056c6511f1aa625254006c9bbf
    ReservedCode2: dT2i8xona0U7D0L3fUufrvgU5ptTVYc9wmuN+UuzEO7IEpKuusQ+MhUXOKMhHoUFmvrWoX4u8OVt9DJAvNc95WJAxcMh1OtizyTuJ5bVCFP3XzohsF0c1O7cb/xtaAagwRF8hVqFIhFpiMF0a260F11226YHss2awn5oik8sWF3ADnul2QF++HjfibQ=
---

# Add Medication Edit Functionality

- **Status**: closed
- **Type**: bug
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

Medication module had no edit capability — no `editRecord` on the list page, no edit mode on the add page, no `getMedication`/`updateMedication` in the API layer, and no `bindtap` on the WXML items. Users could create and delete medication records but could not edit them.

## Acceptance criteria

- [x] `api.js` defines `getMedication(id)` and `updateMedication(id, data)`
- [x] `api.js` module.exports includes both
- [x] `medication.js` has `editRecord` method (stores record to globalData/storage, navigates)
- [x] `medication/add/add.js` has full edit mode: `onLoad`, `fillForm`, mode-based `onSubmit`
- [x] `medication/add/add.js` handles `from=voice` voice prefill
- [x] `medication.wxml` item-body has `bindtap="editRecord" data-id="{{item.id}}"`

## Files changed

- `utils/api.js`
- `pages/medication/medication.js`
- `pages/medication/add/add.js`
- `pages/medication/medication.wxml`
*（内容由AI生成，仅供参考）*
