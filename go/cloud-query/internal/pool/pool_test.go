package pool

import (
	"database/sql"
	"errors"
	"fmt"
	"reflect"
	"testing"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

type recordingConnection struct {
	event   string
	events  *[]string
	onClose func()
	pingErr error
}

func (c *recordingConnection) Configure() error { return nil }

func (c *recordingConnection) Schema(string) ([]cloudquery.SchemaResult, error) {
	return nil, nil
}

func (c *recordingConnection) Schemas([]string) ([]cloudquery.SchemaResult, error) {
	return nil, nil
}

func (c *recordingConnection) Tables(string) ([]string, error) { return nil, nil }

func (c *recordingConnection) Query(string, ...any) ([]string, [][]any, error) {
	return nil, nil, nil
}

func (c *recordingConnection) Exec(string, ...any) (sql.Result, error) {
	*c.events = append(*c.events, c.event)
	return nil, nil
}

func (c *recordingConnection) Ping() error { return c.pingErr }

func (c *recordingConnection) LoadedModules() ([][]any, error) { return nil, nil }

func (c *recordingConnection) Close() error {
	if c.onClose != nil {
		c.onClose()
	}
	*c.events = append(*c.events, c.event)
	return nil
}

func TestRemoveClosesConnectionBeforeDroppingRole(t *testing.T) {
	const (
		key  = "configuration"
		role = "tenant-role"
	)

	events := make([]string, 0, 3)
	p := &ConnectionPool{
		admin: &recordingConnection{event: "cleanup", events: &events},
		pool:  cmap.New[entry](),
	}
	tenant := &recordingConnection{
		event:  "close",
		events: &events,
		onClose: func() {
			if p.pool.Has(key) {
				t.Error("connection remained discoverable while it was closing")
			}
		},
	}
	item := cmap.Tuple[string, entry]{
		Key: key,
		Val: entry{
			uuid:       role,
			connection: tenant,
		},
	}
	p.pool.Set(item.Key, item.Val)

	if err := p.Remove(item); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}

	if want := []string{"close", "cleanup", "cleanup"}; !reflect.DeepEqual(events, want) {
		t.Fatalf("lifecycle events = %v, want %v", events, want)
	}
}

func TestRemoveSkipsWhenConnectionWasReused(t *testing.T) {
	const (
		key  = "configuration"
		role = "tenant-role"
	)

	events := make([]string, 0)
	p := &ConnectionPool{
		admin: &recordingConnection{event: "cleanup", events: &events},
		pool:  cmap.New[entry](),
		ttl:   time.Hour,
	}
	tenant := &recordingConnection{event: "close", events: &events}
	current := entry{
		uuid:       role,
		connection: tenant,
		ping:       time.Now(),
	}
	p.pool.Set(key, current)

	stale := current
	stale.ping = time.Now().Add(-2 * time.Hour)
	item := cmap.Tuple[string, entry]{Key: key, Val: stale}

	if err := p.Remove(item); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
	if !p.pool.Has(key) {
		t.Fatal("reused connection was dropped from the pool")
	}
	if len(events) != 0 {
		t.Fatalf("lifecycle events = %v, want none", events)
	}
}

func TestConnectRecreatesUnhealthyConnection(t *testing.T) {
	cfg := config.NewAWSConfiguration(
		config.WithAWSAccessKeyId("id"),
		config.WithAWSSecretAccessKey("secret"),
		config.WithAWSRegions("us-east-1"),
	)
	sha, err := cfg.SHA()
	if err != nil {
		t.Fatalf("SHA() error = %v", err)
	}

	events := make([]string, 0)
	p := &ConnectionPool{
		admin: &recordingConnection{event: "admin", events: &events},
		pool:  cmap.New[entry](),
		ttl:   time.Hour,
	}

	closed := false
	tenant := &recordingConnection{
		event:   "close",
		events:  &events,
		pingErr: errors.New(`pq: role "old-role" does not exist (28000)`),
		onClose: func() { closed = true },
	}
	p.pool.Set(sha, entry{
		uuid:       "old-role",
		connection: tenant,
		ping:       time.Now(),
	})

	conn, err := p.Connect(cfg)
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}
	if conn == nil {
		t.Fatal("Connect() returned nil connection")
	}
	t.Cleanup(func() { _ = conn.Close() })
	if !closed {
		t.Fatal("expected the unhealthy pooled connection to be closed")
	}

	data, ok := p.pool.Get(sha)
	if !ok {
		t.Fatal("expected a replacement connection in the pool")
	}
	if data.uuid == "old-role" {
		t.Fatal("pooled connection still uses the dropped role")
	}
	if fmt.Sprint(events[0]) != "close" {
		t.Fatalf("first lifecycle event = %v, want close", events[0])
	}
}

var _ connection.Connection = (*recordingConnection)(nil)
