# Ticket Workflow

Covers: the GitHub Issues tracker of `JudgEby/language-learning` and the branch/commit agreements below
Read when: filing a bug or feature ticket, taking a ticket into work, pushing, opening a PR, or closing a ticket.

New work starts with a ticket on the board, not with code. If a person describes a task,
the result is a ticket, and implementation waits for a separate explicit "do it".

## Tracker and access

- Tracker: GitHub Issues on `https://github.com/JudgEby/language-learning` (Issues enabled,
  no issue templates — `.github/` does not exist).
- Work with it via the GitHub CLI. Check access before the first write with a read command.
- Ticket bodies are passed from a file, not as a shell string: backticks inside a shell
  string execute as commands.

Read commands (safe, verified in this run):

```bash
gh issue list --limit 20                    # open issues
gh issue list --state all --limit 20        # including closed (duplicate search)
gh issue view <number>                      # ticket with comments
gh label list                               # taxonomy on the tracker
gh search issues "<symptom words>" --state all --repo JudgEby/language-learning
```

Write commands (only after an explicit "yes" on a shown draft):

```bash
gh issue create --title "..." --label "type:bug,area:content" --body-file /tmp/ticket.md
gh issue comment <number> --body-file /tmp/comment.md
gh issue edit <number> --add-label "status:progress" --remove-label "status:ready"
gh issue close <number> --comment "Done via PR #N (commit abc1234)"
```

## Taxonomy

Only the nine default GitHub labels exist on the tracker and no ticket has ever been filed,
so the taxonomy below is established by this file. The human creates the labels once:

```bash
gh label create "type:bug" --color d73a4a --description "Something is broken"
gh label create "type:proposal" --color a2eeef --description "Feature or improvement"
gh label create "type:debt" --color e4e669 --description "Cleanup, docs, tooling"
gh label create "type:ops" --color cccccc --description "Release, environment, CI"
gh label create "area:content" --color 0075ca --description "content/{LEVEL}/ data"
gh label create "area:app" --color 7057ff --description "React app in app/"
gh label create "area:scripts" --color 008672 --description "Python pipeline in scripts/"
gh label create "area:docs" --color f9d0c4 --description "Docs and prompts"
gh label create "status:ready" --color 0e8a16 --description "Ready to take"
gh label create "status:progress" --color fbca04 --description "In work"
gh label create "status:blocked" --color d93f0b --description "Waiting on someone/something"
gh label create "status:deferred" --color cfd3d7 --description "Postponed"
gh label create "status:wontdo" --color ffffff --description "Will not be done"
gh label create "priority:high" --color b60205 --description "Do first"
gh label create "priority:low" --color c2e0c6 --description "Do when free"
```

Rules: every ticket carries one `type:`, one `area:`, one `status:`; `priority:` only when it
matters. One format, no mixing with the default labels (`bug`, `enhancement`, …) — use the
`type:` axis instead.

## Described or assigned

| They said | It means |
|---|---|
| "X is broken", "we should Y", long description with no command verb | draft a ticket and stop — "ready to take it if you say so" |
| "do X", "fix it", "take ticket N" | implement |
| "look at ticket N", "is it still valid" | analyse without edits, report back |

In doubt — ticket and stop. Nothing is written to the tracker (ticket, comment, label,
status) without an explicit "yes" on a shown draft — except the "in work" mark, which is
set the moment assigned work starts. Everything that outlives a session (deferred items,
things noticed along the way, "later") becomes a ticket — not a code TODO, markdown note,
or agent memory. Details live in this file.

## Before creating: duplicate search

Search open **and** closed issues in this one tracker: symptom words, function and file
names, in Russian and in English; read the comments too. Exact match → comment on the
existing ticket instead. Partial match → new ticket linking the neighbour. Record what was
searched and found under "Related", even if nothing.

## Bug, feature, or not a ticket

- Promised or intended but behaves differently → bug (facts, reproduction, cause — confirmed
  separately from hypotheses; no fix at this step).
- Behaviour does not exist or the intent is bad → feature/improvement (how it is now, 2–3
  options, recommendation).
- Feature disabled by a setting → not a ticket, just answer how to enable it.

## Ticket body

What is wrong / what is wanted; how it is now and how it was measured (file paths,
commands); why it matters; decision (chosen and rejected — with reasons); done criteria
(observable checks and commands; for a bug — the check that fails before the fix); open
questions and who decides; what NOT to touch; related. Drop empty sections. No secrets,
no personal data.

## Creation

Full draft (title, labels, body) → explicit "yes" → create → re-read the created ticket
and confirm everything landed.

## Taking a ticket into work

Read it with comments; check whether it is already done (linked PRs and commits); ticket
claims are a request, not a fact — re-verify against code; if the expected result is
unclear — send questions back. Levels:

- **S1** — edit in 1–2 files with no externally visible behaviour change (typo in one
  lesson file, UI copy fix). No separate plan and no "yes" — but verification still applies:
  `validate_level.py` / `typecheck` before "done".
- **S2** — an existing flow changes (new lesson across 4 files, new test day, pipeline
  script change). Short plan and "yes".
- **S3** — new subsystem, data schema, or contract between parts (new level, schema field,
  new script or derived artefact). Design, plan, and "yes".

What raises the level here: any content-contract change, any schema-field change, any new
derived artefact. Mark "in work" (`status:progress`) the moment work starts.

## Branches, commits, PRs

No branch convention was established in history (work went straight to `main`, messages
mixed `content:` / `feat:` / `Fix`). The agreement below is established by this file:

- Task branches grow from `develop`; releases merge `develop` into `main`.
- Branch name: `<area>/<issue-number>-<short-slug>`, e.g. `content/12-b2-lesson-05`.
- Every commit references the ticket (`#12` in the message); commit messages in English.
- The PR description closes with GitHub syntax (`Closes #12`, in English).
- Found something out of scope along the way → new ticket, not a silent edit in the same
  branch; exception — a docs mismatch exposed by this very change, fixed in the same branch.
- Push, PR creation, and ticket closing — only with the human's explicit permission.

## Honest closing

Close only what is done, with a link to the PR/MR and commit; partially done — do not
close, narrow the remainder with a comment; leftovers — separate tickets. A merged PR does
not always close the ticket — verify.
