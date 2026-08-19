package pool

import (
	"database/sql"
	"reflect"
	"testing"

	cmap "github.com/orcaman/concurrent-map/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

type recordingConnection struct {
	event   string
	events  *[]string
	onClose func()
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

func (c *recordingConnection) Ping() error { return nil }

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

	events := make([]string, 0, 2)
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

	if want := []string{"close", "cleanup"}; !reflect.DeepEqual(events, want) {
		t.Fatalf("lifecycle events = %v, want %v", events, want)
	}
}

var _ connection.Connection = (*recordingConnection)(nil)
