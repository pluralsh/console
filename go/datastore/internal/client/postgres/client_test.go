package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// POSTGRES_TEST_URL must point at a superuser connection, e.g.
// postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
const postgresTestURLEnv = "POSTGRES_TEST_URL"

const adminPassword = "admin"

type testEnv struct {
	t        *testing.T
	super    *sql.DB
	superURL *url.URL
	suffix   string
	admin    string
}

// newTestEnv creates a non-superuser role with CREATEROLE/CREATEDB, mirroring managed Postgres
// master users such as RDS, and returns a client authenticated as it.
func newTestEnv(t *testing.T) (*testEnv, *client) {
	raw := os.Getenv(postgresTestURLEnv)
	if raw == "" {
		t.Skipf("%s not set", postgresTestURLEnv)
	}

	u, err := url.Parse(raw)
	require.NoError(t, err)

	super, err := sql.Open("pgx", raw)
	require.NoError(t, err)
	t.Cleanup(func() { _ = super.Close() })
	require.NoError(t, super.Ping())

	suffix := fmt.Sprintf("%s_%d", strings.ToLower(t.Name()), time.Now().UnixNano()%1_000_000_000)
	env := &testEnv{t: t, super: super, superURL: u, suffix: suffix, admin: "admin_" + suffix}

	env.exec(fmt.Sprintf(`CREATE ROLE "%s" WITH LOGIN PASSWORD '%s' CREATEROLE CREATEDB`, env.admin, adminPassword))
	t.Cleanup(func() {
		_, _ = super.Exec(fmt.Sprintf(`DROP OWNED BY "%s"`, env.admin))
		_, _ = super.Exec(fmt.Sprintf(`DROP ROLE IF EXISTS "%s"`, env.admin))
	})

	return env, &client{ctx: context.Background(), connection: env.adminURL(strings.TrimPrefix(u.Path, "/"))}
}

func (e *testEnv) exec(query string) {
	e.t.Helper()
	_, err := e.super.Exec(query)
	require.NoError(e.t, err, query)
}

func (e *testEnv) adminURL(database string) string {
	u := *e.superURL
	u.User = url.UserPassword(e.admin, adminPassword)
	u.Path = "/" + database
	return u.String()
}

func (e *testEnv) databaseExists(name string) bool {
	e.t.Helper()
	var exists bool
	require.NoError(e.t, e.super.QueryRow(`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)`, name).Scan(&exists))
	return exists
}

func (e *testEnv) dropDatabaseOnCleanup(name string) {
	e.t.Cleanup(func() {
		_, _ = e.super.Exec(fmt.Sprintf(`DROP DATABASE IF EXISTS "%s" WITH (FORCE)`, name))
	})
}

func TestDeleteDatabaseOwnedByAnotherRole(t *testing.T) {
	env, c := newTestEnv(t)

	user := "app_" + env.suffix
	dbName := "db_" + env.suffix
	t.Cleanup(func() { _, _ = env.super.Exec(fmt.Sprintf(`DROP ROLE IF EXISTS "%s"`, user)) })
	env.dropDatabaseOnCleanup(dbName)

	require.NoError(t, c.UpsertUser(user, "app"))
	require.NoError(t, c.UpsertDatabase(dbName))
	env.exec(fmt.Sprintf(`ALTER DATABASE "%s" OWNER TO "%s"`, dbName, user))

	require.NoError(t, c.DeleteDatabase(dbName))
	require.False(t, env.databaseExists(dbName))

	require.NoError(t, c.DeleteUser(user))
}

func TestDeleteDatabaseWithOpenConnections(t *testing.T) {
	env, c := newTestEnv(t)

	dbName := "db_" + env.suffix
	env.dropDatabaseOnCleanup(dbName)
	require.NoError(t, c.UpsertDatabase(dbName))

	conn, err := sql.Open("pgx", env.adminURL(dbName))
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	require.NoError(t, conn.Ping())

	require.NoError(t, c.DeleteDatabase(dbName))
	require.False(t, env.databaseExists(dbName))
}

func TestDeleteDatabaseAbsent(t *testing.T) {
	env, c := newTestEnv(t)

	require.NoError(t, c.DeleteDatabase("db_"+env.suffix))
}
