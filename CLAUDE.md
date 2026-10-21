If tests are needed, run them with:

`make test-full` (override with `TEST_CMD="mix test"` if needed)

This spins up the test dependencies from `docker-compose.test.yml`, builds the
Elixir test image from `dockerfiles/Dockerfile.test`, compiles the console app,
runs the full test suite, then shuts everything down.

When running type checks on the front end code, always use `yarn tsc --build` (or `yarn typecheck`) not just `tsc` or `tsc --noEmit` to get actual typecheck results. Run it through `yarn`, not `npx`: `yarn` resolves TypeScript 7, while `npx tsc` picks up the TypeScript 6 binary that library tools still depend on
