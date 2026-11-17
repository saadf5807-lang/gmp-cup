# GMP Cup — Live Scoreboard

Live scores, group tables, knockout bracket, captains and match-day updates for the GMP Cup, the BMC Medicine inter-batch football tournament (Thursday 26 November).

The page refreshes itself every minute, so students only need to keep it open.

## Updating scores on match day

All results live in **`data.json`**. Edit it on GitHub (pencil icon → edit → **Commit changes**). The site updates within a minute or two.

For each match in `matches`:

| Field | Meaning |
|---|---|
| `hs` / `as` | Home / away goals |
| `status` | `"upcoming"`, `"live"` or `"ft"` (full time) |
| `hp` / `ap` | Penalties (knockouts only, when level at full time) |

Set `updatedAt` to the current time, e.g. `"2026-11-26T17:20:00+03:00"`.

To post an announcement, add to the top of `updates`:

```json
{ "at": "2026-11-26T17:20:00+03:00", "text": "Kick-off at Majid delayed 10 minutes" }
```

Group tables and the semi-final / final teams are worked out automatically from the scores. A group's qualifiers fill in once all of its matches are `"ft"`.
