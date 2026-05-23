## Broad elixir style guidance

1. Never use the standard elixir formatter, we don't use it by choice in this codebase as the default styling is goofy.
2. Prefer function head matching to internal case/cond clauses.
3. Never use a nested case when a with expression is possible.
4. Defer to ecto for input validation.  You should rarely need to use put_change, trust the builtins.
5. Avoid usage of `if` and `cond` if a more elegant case expression is possible.

## Broad go guidance

The repo has a substantial amount of go code, all in a go workspace under `go/`.  Here are some broad rules for interactin with it:

* You must always format all go code, linters will validate.
* You should prefer using code generators in the Makefiles associated with whatever module you're interacting with. Never manually edit generated files, it'll be overwritten.