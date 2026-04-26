---
name: codebase-improvement-audit
description: Audits a selected codebase layer for duplication, code quality issues, performance opportunities, code smells, and readability problems, then suggests prioritized improvements. Use when the user asks for code improvement suggestions, smell detection, duplication review, performance review, or maintainability/readability feedback.
---

# Codebase Improvement Audit

## Step 1: Ask for the target layer first

Before any analysis, ask the user which layer to focus on.

Use `AskQuestion` with these options:
- `components`
- `hooks`
- `lib`
- `server actions`
- `client routes`
- `other / custom layer`

If the user picks `other / custom layer`, ask a follow-up question to get the exact scope before proceeding.

## Step 2: Define audit scope

- Translate the chosen layer into concrete directories/files.
- Stay focused on the selected layer unless the user explicitly asks for cross-layer analysis.
- If scope is still broad, suggest 1-3 high-impact sub-areas and let the user pick.

## Step 3: Run the audit

Review the selected scope and identify:
- Duplication (repeated logic, repeated UI patterns, copy-pasted utilities)
- Quality issues (weak typing, unclear boundaries, missing error handling)
- Performance opportunities (expensive rerenders, over-fetching, unnecessary work)
- Code smells (large functions/components, mixed responsibilities, hidden side effects)
- Readability issues (naming, structure, complexity, unclear flow)

Prefer concrete, actionable findings over broad advice.

## Step 4: Report findings in priority order

Use this structure:

```markdown
## Focus Layer
[Selected layer and exact scope]

## Top Findings
1. [Issue title] — [severity: high/medium/low]
   - Evidence: [file/symbol]
   - Why it matters: [impact]
   - Suggested fix: [specific change]

## Quick Wins
- [Small improvement with high value]

## Refactor Candidates
- [Larger, staged improvement]

## Suggested Next Step
- [Single best next action]
```

## Step 5: Keep suggestions implementation-ready

- Suggest minimal, incremental changes first.
- Point out where shared abstractions are justified and where duplication is acceptable.
- For each major suggestion, include expected payoff (maintainability/performance/readability) and likely effort (S/M/L).
- Do not implement changes unless the user asks.
