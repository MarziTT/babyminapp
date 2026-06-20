---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_afca9eaf6c6511f18805525400d9a7a1
    ReservedCode1: cG1CuZLxKN7DpGWYQAaJD4hN85AFzE9Gl46NJ+n9uoPI+8POUZSTtyzYHWlGTA7Iob6rH+dlMBF6aXN3GY6CJ3/az+kRizV7WitfRZH9hdxOVTaFROV9m9jajPDYSIC4kflJnRjTMj+PcMhw/ObI/taXraZHEyjmMUMrldW2lXhtVnqK6tt5Zv6+ayY=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_afca9eaf6c6511f18805525400d9a7a1
    ReservedCode2: cG1CuZLxKN7DpGWYQAaJD4hN85AFzE9Gl46NJ+n9uoPI+8POUZSTtyzYHWlGTA7Iob6rH+dlMBF6aXN3GY6CJ3/az+kRizV7WitfRZH9hdxOVTaFROV9m9jajPDYSIC4kflJnRjTMj+PcMhw/ObI/taXraZHEyjmMUMrldW2lXhtVnqK6tt5Zv6+ayY=
---

# Issue Tracker

Issues are stored as local markdown files under `.scratch/`.

## Convention

Each issue is a single `.md` file: `.scratch/<issue-id>.md`

- `issue-id`: lowercase-kebab-case short slug (e.g. `fix-growth-edit-crash`, `add-medication-edit`)

## File format

```markdown
# [Title]

- **Status**: needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix | closed
- **Type**: bug | feature | chore
- **Blocked by**: <issue-id> or None
- **Created**: YYYY-MM-DD

## What to build

[Description]

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Files changed

- `path/to/file.js`
```

## Operations

- **Create**: write a new `.md` file under `.scratch/`
- **Read**: read the `.md` file
- **Update**: edit the `.md` file (status, body, checkboxes)
- **Close**: change status to `closed`
*（内容由AI生成，仅供参考）*
