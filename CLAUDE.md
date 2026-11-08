## Agent skills

### Issue tracker

Issues are tracked in Linear, project `Sjung`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), applied as Linear labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): description`). See the "Commits" section in `README.md`.

### Boy scout rule

Leave the code you touch cleaner than you found it. When a change or its review turns up small tidying in or next to that code (duplicated logic, unclear names, a helper in the wrong folder, scattered conditionals), do it as part of the same work rather than leaving it as a suggestion. Commit it separately as a `refactor` so the behaviour change and the cleanup can be reviewed apart. Keep it to code the change touches; a larger cleanup gets its own issue instead.

### PR descriptions

No manual line breaks mid-paragraph — they render as a staggered mess on mobile. See the "Pull requests" section in `README.md`.
