## Broad elixir style guidance

1. Never use the standard elixir formatter, we don't use it by choice in this codebase as the default styling is goofy.
2. Prefer function head matching to internal case/cond clauses.
3. Never use a nested case when a with expression is possible.
