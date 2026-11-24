# Triage Labels

The skills speak in terms of two canonical category roles and five canonical state roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

## Category roles

| Role in mattpocock/skills | Label in our tracker | Meaning                                           |
| ------------------------- | -------------------- | ------------------------------------------------- |
| `bug`                     | `Bug`                | Something is broken                               |
| `enhancement`             | `Improvement`        | Changes or improves something that already exists |
| `enhancement`             | `Feature`            | Adds a capability Sjung doesn't have yet          |

`enhancement` maps to two labels: pick `Improvement` or `Feature` depending on whether the request changes something that exists or adds something new. Either way an issue carries exactly one category label.

## State roles

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
