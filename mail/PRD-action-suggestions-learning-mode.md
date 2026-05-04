# PRD: Action Suggestions + Learning Mode

## Overview

Mail should become a human-in-the-loop triage assistant that suggests an action for each newly received inbox item, groups messages by proposed action, and treats every approval, correction, label change, or move between groups as a learning signal.

The first version is deliberately conservative: Mail suggests and practices. The user approves before any Gmail action is taken. No rule should silently act on mail yet.

## Product goals

1. Reduce inbox triage effort by grouping mail into action-oriented queues.
2. Let the user approve actions in batches when suggestions look right.
3. Let the user move any message to another action group before acting.
4. For `Label & Archive`, suggest a label and let the user change it before approval.
5. Capture corrections and approvals as structured local learning signals.
6. Use those signals to improve future suggestions and eventually propose user-readable automation rules and exceptions.

## Non-goals for the first version

- No fully automatic actions.
- No sending replies automatically.
- No destructive actions without explicit approval.
- No specialized topical categories such as finance, receipts, travel, newsletters, promotions, or security. The system may suggest existing Gmail labels, but action groups remain general and action-oriented.
- No cross-workspace learning. Signals are workspace-scoped.

## Action groups

These are action queues, not content categories.

| Group                   | Meaning                                                               | First-version action                                                                               |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Archive`               | Message likely needs no further attention.                            | Remove from inbox.                                                                                 |
| `Label & Archive`       | Message is useful for reference but should not stay in inbox.         | Apply suggested or user-selected label, then remove from inbox.                                    |
| `To Do / Keep in Inbox` | Message represents work the user wants visible in the inbox.          | Record approval signal; leave in inbox.                                                            |
| `Follow Up`             | User should follow up later or track it.                              | Star the message and record signal.                                                                |
| `Waiting On`            | User is waiting for someone else or the thread is pending externally. | Record signal; first version may leave in inbox unless the user moves it to archive/label archive. |
| `Reply Needed`          | User probably needs to respond.                                       | Star the message and record signal; leave in inbox.                                                |
| `Read Later`            | Worth reading, but not urgent.                                        | Record signal; leave in inbox unless user moves it to archive/label archive.                       |
| `Unsubscribe & Archive` | Mailing-list style message the user likely does not want.             | Run unsubscribe/archive when unsubscribe data is available.                                        |
| `Trash`                 | Unwanted but not necessarily spam.                                    | Move to trash.                                                                                     |
| `Spam`                  | Abusive, scammy, or unwanted sender that should train spam filtering. | Mark as spam.                                                                                      |
| `Needs Review`          | The model is uncertain or the message has high risk.                  | No mailbox action; user moves it elsewhere or leaves it for later.                                 |

## Suggestion shape

Each message suggestion includes:

```ts
type MailActionSuggestion = {
  id: string
  messageId: string
  groupId: MailActionGroupId
  confidence: number // 0..1
  reason?: string // optional concise human-readable reason
  suggestedLabelId?: string // only for Label & Archive when matched to an existing label
  suggestedLabelName?: string
}
```

## Label & Archive behavior

Yes: for `Label & Archive`, Mail should suggest a label when it can. The user can change the label before approval.

First-version behavior:

- Prefer existing Gmail user labels.
- If no confident label is available, show `Choose label` and require a label before applying `Label & Archive`.
- Changing the label is a learning signal.
- Approving `Label & Archive` records the final label chosen by the user.

Future behavior:

- Suggest creating a new label when no existing label fits.
- Learn sender/domain-to-label rules.
- Learn exceptions, such as “archive this sender except when I am directly mentioned.”

## Learning signals

All signals are stored locally in the app data directory for the active workspace.

Positive signals:

- User approves an individual suggestion.
- User approves all messages in a group.
- User accepts the suggested label.

Correction signals:

- User moves a message to a different action group.
- User changes the suggested label.
- User moves a message out of a risky/destructive group.

Signal schema:

```ts
type MailTriageSignal = {
  id: string
  createdAt: string
  message: {
    id: string
    from: string
    subject: string
    snippet: string
    labelIds: string[]
  }
  suggestedGroupId?: MailActionGroupId
  finalGroupId: MailActionGroupId
  outcome: 'approved' | 'corrected' | 'label_changed' | 'dismissed'
  suggestedLabelName?: string
  finalLabelName?: string
  reason?: string
}
```

## User experience

1. User opens Inbox.
2. Mail loads recent messages and requests action suggestions.
3. Suggestions appear in a compact `Practice mode` panel above the normal inbox list.
4. Messages are grouped by action.
5. Each group has an `Approve` button.
6. Each row has:
   - sender
   - subject
   - optional concise reason
   - current action group selector
   - label selector when group is `Label & Archive`
   - individual approve button
7. Moving a row to another group immediately records a correction signal.
8. Approving a row/group performs only the approved action and records a signal.

## Safety model

- `Trash`, `Spam`, and `Unsubscribe & Archive` always require explicit approval.
- `Send`, `Forward`, and automatic replies are out of scope.
- The model should prefer `Needs Review` when confidence is low.
- Signals are advisory; no automation is enabled until the user explicitly opts into rules later.

## First-version implementation plan

1. Add server-side action suggestion generation.
   - Input: visible inbox messages, existing labels, account.
   - Output: structured suggestions.
   - Use recent local signals as examples.
   - Fall back to deterministic heuristics if AI generation fails.
2. Add workspace-scoped signal persistence.
   - Store in `triage-signals.json` under the app data directory.
   - Keep a bounded recent history.
3. Add client hooks.
   - `useActionSuggestions`
   - `useRecordActionSuggestionSignal`
4. Add `ActionSuggestionsPanel` to Inbox.
   - Group messages by suggested action.
   - Allow moving between groups.
   - Allow changing labels for `Label & Archive`.
   - Approve individual rows or whole groups.
5. Wire approved actions to existing Gmail operations.
   - Archive, label/archive, star for follow-up/reply-needed, trash, spam, unsubscribe/archive.
   - Practice-only approvals for no-op groups.

## Human-readable learned rules

Rules are a natural-language preference layer generated from human corrections and approvals. They are not regexes, sender-specific code paths, or deterministic classifiers.

### Rule principles

- The LLM classifies messages using message context, recent raw signals, existing Gmail labels, and human-readable rules.
- If the LLM cannot classify a message cleanly, the message goes to `Needs triaging`.
- A human can then move the message to the correct action group or label, creating a durable signal.
- The LLM can use accumulated signals to draft or revise natural-language rules.
- Rules remain inspectable text with exceptions; they should explain user preference, not encode hidden implementation logic.
- Regexes and hardcoded sender/domain classifiers are explicitly an antipattern for this feature.

### Rule schema

```ts
type TriageRule = {
  id: string
  title: string
  body: string
  action: {
    groupId: MailActionGroupId
    labelName?: string
  }
  status: 'draft' | 'active' | 'archived'
  confidence: number
  createdAt: string
  updatedAt: string
  evidenceSignalIds: string[]
  exceptions?: string[]
}
```

Example:

```json
{
  "id": "rule_completed_ride_receipts",
  "title": "Archive completed ride receipts",
  "body": "When an email is a completed ride receipt from a rideshare service and does not ask me to make a decision, suggest Archive.",
  "action": { "groupId": "archive" },
  "status": "draft",
  "confidence": 0.82,
  "evidenceSignalIds": ["signal_1", "signal_2"],
  "exceptions": [
    "If it mentions a disputed charge, refund, account access issue, or asks me to respond, put it in Needs triaging."
  ]
}
```

### Rule generation loop

When a human corrects or approves a message:

1. Store the raw signal.
2. Ask the LLM whether the signal fits an existing rule, requires a rule adjustment, or suggests a new rule.
3. Store the resulting human-readable rule draft/update locally.
4. Include active/draft rules in future classification prompts.

Rule generation is LLM-based. It should not produce or rely on regexes. If no useful rule can be inferred, no rule is created.

### Rule fit/check behavior

For future messages, the classifier prompt includes current rules. The LLM may return matched rule IDs as explanation metadata, but the rule itself is natural language guidance. Classification remains human-in-the-loop until automation is explicitly enabled later.

## Future milestones

1. Rule review surface: “I think I can usually archive these; approve rule?”
2. Exception editor: “Archive GitHub notifications except direct mentions/review requests.”
3. Confidence thresholds per action type.
4. Optional automation for safe groups only.
5. Richer task integration for `To Do / Keep in Inbox`.
6. Snooze/reminder recommendations.
7. Rule analytics showing how often the user overrides a suggestion.
