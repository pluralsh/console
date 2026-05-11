package websocket

import (
	"net/url"
	"strings"
	"sync"
	"testing"

	graphql "github.com/hasura/go-graphql-client"
	cmap "github.com/orcaman/concurrent-map/v2"
)

func TestNewClosedStartsWithoutClientConnection(t *testing.T) {
	ws, err := NewClosed("cluster-id", "https://console.example.com", "token")
	if err != nil {
		t.Fatalf("expected NewClosed to succeed, got error: %v", err)
	}

	s, ok := ws.(*socket)
	if !ok {
		t.Fatalf("expected concrete socket type")
	}

	if !s.closed.Load() {
		t.Fatalf("expected socket to start closed")
	}
	if s.clientHandle.Load() != nil {
		t.Fatalf("expected socket to start without an active client")
	}
	if s.endpoint == nil {
		t.Fatalf("expected websocket endpoint to be initialized")
	}
	if s.endpoint.Scheme != "wss" {
		t.Fatalf("expected wss URI, got %q", s.endpoint.Scheme)
	}
	if s.endpoint.Path != graphqlWebsocketPath {
		t.Fatalf("expected graphql websocket path, got %q", s.endpoint.Path)
	}
}

func TestNewClosedRejectsInvalidURL(t *testing.T) {
	_, err := NewClosed("cluster-id", "://invalid-url", "token")
	if err == nil {
		t.Fatalf("expected invalid URL error")
	}
}

func TestClosePreventsCallbackReopen(t *testing.T) {
	s := &socket{}
	s.clientGen.Store(1)
	s.joining.Store(true)
	s.closed.Store(false)

	if err := s.Close(); err != nil {
		t.Fatalf("expected close to succeed, got error: %v", err)
	}

	if !s.closed.Load() {
		t.Fatalf("expected socket to stay closed")
	}
	if s.joining.Load() {
		t.Fatalf("expected joining=false after close")
	}
}

func TestHandleNotificationDispatchesToPublisher(t *testing.T) {
	pub := &recordingPublisher{}
	s := &socket{publishers: newPublisherMapWith("service", pub)}
	s.clientGen.Store(2)
	s.closed.Store(false)

	s.handleNotification(2, notification{
		Resource:   "service",
		ResourceID: "svc-123",
		Kick:       boolPtr(true),
	})

	if pub.id != "svc-123" {
		t.Fatalf("expected id svc-123, got %q", pub.id)
	}
	if !pub.kick {
		t.Fatalf("expected kick=true")
	}
}

func TestHandleNotificationDispatchesUppercaseResourceToPublisher(t *testing.T) {
	pub := &recordingPublisher{}
	s := &socket{publishers: newPublisherMapWith("service", pub)}
	s.clientGen.Store(2)
	s.closed.Store(false)

	s.handleNotification(2, notification{
		Resource:   "SERVICE",
		ResourceID: "svc-456",
		Kick:       boolPtr(false),
	})

	if pub.id != "svc-456" {
		t.Fatalf("expected id svc-456, got %q", pub.id)
	}
	if pub.kick {
		t.Fatalf("expected kick=false")
	}
}

func TestHandleNotificationIgnoresStaleGeneration(t *testing.T) {
	pub := &recordingPublisher{}
	s := &socket{publishers: newPublisherMapWith("service", pub)}
	s.clientGen.Store(3)
	s.closed.Store(false)

	s.handleNotification(2, notification{
		Resource:   "service",
		ResourceID: "svc-123",
	})

	if pub.calls != 0 {
		t.Fatalf("expected stale generation to be ignored")
	}
}

func TestHandleNotificationIgnoresUnsupportedResource(t *testing.T) {
	pub := &recordingPublisher{}
	s := &socket{publishers: newPublisherMapWith("service", pub)}
	s.clientGen.Store(1)
	s.closed.Store(false)

	s.handleNotification(1, notification{
		Resource:   "unknown",
		ResourceID: "id-1",
	})

	if pub.calls != 0 {
		t.Fatalf("expected unsupported resource to be ignored")
	}
}

func TestAddPublisherRejectsNilPublisher(t *testing.T) {
	s := newSocket("cluster-id", mustWebsocketURL(t), "token", true)

	s.AddPublisher("service", nil)

	if s.publishers.Has("service") {
		t.Fatalf("expected nil publisher to be ignored")
	}
}

func TestNotificationSubscriptionUsesResourceIdFieldName(t *testing.T) {
	subscription := &notificationSubscription{}
	query, _, err := graphql.ConstructSubscription(subscription, nil)
	if err != nil {
		t.Fatalf("expected subscription query to build, got error: %v", err)
	}

	if !strings.Contains(query, "resourceId") {
		t.Fatalf("expected subscription query to contain resourceId field, got query: %s", query)
	}
	if strings.Contains(query, "resourceID") {
		t.Fatalf("expected subscription query not to contain resourceID field, got query: %s", query)
	}
}

func TestConcurrentJoinCloseLeavesNoClientWhenClosed(t *testing.T) {
	s := newSocket("cluster-id", mustWebsocketURL(t), "token", false)

	const iterations = 40
	var wg sync.WaitGroup
	wg.Add(iterations * 2)

	for i := 0; i < iterations; i++ {
		go func() {
			defer wg.Done()
			_ = s.Join()
		}()

		go func() {
			defer wg.Done()
			_ = s.Close()
		}()
	}

	wg.Wait()

	if err := s.Close(); err != nil {
		t.Fatalf("expected final close to succeed, got error: %v", err)
	}

	if !s.closed.Load() {
		t.Fatalf("expected socket to remain closed")
	}
	if s.joining.Load() {
		t.Fatalf("expected joining=false after close")
	}
	if s.clientHandle.Load() != nil {
		t.Fatalf("expected no active client after close")
	}
}

type recordingPublisher struct {
	id    string
	kick  bool
	calls int
}

func (r *recordingPublisher) Publish(id string, kick bool) {
	r.id = id
	r.kick = kick
	r.calls++
}

func newPublisherMapWith(event string, publisher Publisher) cmap.ConcurrentMap[string, Publisher] {
	m := cmap.New[Publisher]()
	m.Set(event, publisher)
	return m
}

func boolPtr(v bool) *bool {
	return &v
}

func mustWebsocketURL(t *testing.T) *url.URL {
	t.Helper()

	endpoint, err := gqlWSUri("https://console.example.com")
	if err != nil {
		t.Fatalf("expected websocket URL, got error: %v", err)
	}

	return endpoint
}
