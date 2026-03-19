# Codex Agent Instructions

This repository uses a PR-first workflow for code changes.

Read and follow the detailed workflow in [`.github/CODEX_WORKFLOW.md`](./.github/CODEX_WORKFLOW.md).

## Required Operating Rules

1. Treat every code change as a PR-sized unit of work.
2. Start new functionality by writing or updating tests first whenever practical.
3. For large changes, first write a detailed PR breakdown plan, then implement one PR-sized slice at a time.
4. Before considering work complete, review your own diff, run all relevant tests plus lint and type check first, then run the build last, and only finalize after the build passes.
5. Keep the result as a single coherent changeset for that PR-sized slice.

## Repository Verification Commands

- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npm run ts:check`
- Tests: no test script is currently defined in `package.json`; add and run focused tests when introducing new behavior

Preferred verification order for PR-sized slices:

1. Relevant focused tests
2. `npm run ts:check`
3. `npm run lint`
4. `npm run build`

Treat `npm run build` as the final verification step before finalizing the PR-sized slice.

## Test Fixtures

- If a test needs real save data, use fixtures from [`test_save`](./test_save).
- Prefer the smallest fixture that covers the scenario.
- Prefer the checked-in JSON fixtures under [`test_save`](./test_save) for parser and save-state behavior.
- Raw `.sav` files are not kept in the repo by default; regenerate JSON locally from a live save when a new binary fixture is needed.

If a verification step cannot run, say exactly why and what remains unverified.
