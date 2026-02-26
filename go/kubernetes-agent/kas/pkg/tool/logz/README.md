# The `logz` package

The `logz` package should be used to re-use existing log fields (`zap.Field`)
and helpers.
New log fields can be added in case they don't drag in any new dependency.
In case the log field requires a new dependency,
you should define the log field name in `fields.go`
and define the `zap.Field` helper in the module where it's used.

## Log field names

Log field names must be in `snake_case`.
