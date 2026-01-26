If tests are needed, run them with:

`make test-full` (override with `TEST_CMD="mix test"` if needed)

This spins up the test dependencies from `docker-compose.test.yml`, builds the
Elixir test image from `dockerfiles/Dockerfile.test`, compiles the console app,
runs the full test suite, then shuts everything down.
