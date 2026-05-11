# Test via Docker Compose

Use Docker Compose for a clean, reproducible test run that compiles the code inside a container.

Preferred:
- `make test-docker`

Equivalent manual command:
- `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests`

Notes:
- Compose builds the test image from `dockerfiles/tests.Dockerfile` and runs `make test`.
- Use the Makefile target unless you need to customize the compose invocation.
