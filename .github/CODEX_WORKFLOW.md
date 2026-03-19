# Codex PR Workflow

These instructions define the default way Codex should work in this repository.

## 1. Default Unit Of Work

Every code change should be handled as a PR-sized changeset:

1. Understand the request and identify the smallest safe deliverable.
2. Make the edits for that deliverable only.
3. Review the resulting diff before declaring the work done.
4. Run all relevant tests, plus type check and lint.
5. Run the build last.
6. When verification passes, leave the work as a single cohesive changeset for that PR.

Do not mix unrelated fixes into the same changeset.

## 2. Test-First Expectation

For new functionality, start by writing tests first whenever practical.

- Prefer a failing test or targeted test update before implementing behavior.
- If tests cannot reasonably be written first, state why before proceeding.
- If the repository lacks test coverage for the relevant area, add the smallest useful test coverage you can.
- If save-file fixtures are needed, prefer the checked-in samples under [`test_save`](../test_save).
- Use the smallest realistic `.sav` fixture that covers the case, and prefer existing snapshots before creating new binary fixtures.

## 3. Large Change Policy

If a request is too large for one clean PR, do not jump straight into a broad implementation.

First create a detailed PR breakdown plan that:

- Splits the work into smaller, independently reviewable PRs
- Defines the goal and scope of each PR
- Identifies sequencing and dependencies
- Calls out testing and migration concerns for each PR

After making that plan:

1. Execute the PRs one at a time.
2. Keep each PR independently buildable.
3. Finish and verify the current PR-sized slice before moving to the next one.

## 4. Required Self-Review

Before finalizing any code change:

1. Review the diff for correctness, unnecessary changes, and regressions.
2. Confirm the change matches the requested scope.
3. Check whether tests adequately cover the new behavior.
4. Remove dead code, accidental debug output, and unrelated edits.

The change is not done until this review has happened.

## 5. Required Verification

Run these repository checks after code changes when relevant:

- Relevant focused tests
- `npm run ts:check`
- `npm run lint`
- `npm run build`

Preferred order:

1. Relevant focused tests
2. `npm run ts:check`
3. `npm run lint`
4. `npm run build`

Run `npm run build` after the other relevant verification passes, and only finalize the PR-sized slice after the build succeeds.

Also run:

- Any existing automated tests relevant to the area changed
- Any new tests added for the functionality

If a verification command fails:

1. Fix the issue if it is within the scope of the change.
2. If it is blocked by an existing unrelated problem, document that clearly.

## 6. Completion Standard

A PR-sized change is complete only when all of the following are true:

- The scope is focused and reviewable
- Tests were written first when practical
- The final diff has been self-reviewed
- The build passes
- Relevant tests pass
- The resulting work is a single cohesive changeset

If any item above is not satisfied, explicitly say so instead of implying completion.
