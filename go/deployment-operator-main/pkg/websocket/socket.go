package websocket

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"sync/atomic"

	graphql "github.com/hasura/go-graphql-client"
	"github.com/hasura/go-graphql-client/pkg/jsonutil"
	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/log"
)

const graphqlWebsocketPath = "/ext/socket/gql-ws"

type Publisher interface {
	Publish(id string, kick bool)
}

type socket struct {
	clusterID    string
	endpoint     *url.URL
	deployToken  string
	publishers   cmap.ConcurrentMap[string, Publisher]
	clientHandle atomic.Pointer[subscriptionHandle]
	clientGen    atomic.Uint64
	joining      atomic.Bool
	closed       atomic.Bool
}

type subscriptionHandle struct {
	client *graphql.SubscriptionClient
	cancel context.CancelFunc
}

type Socket interface {
	AddPublisher(event string, publisher Publisher)
	Join() error
	Close() error
}

func New(clusterID, consoleURL, deployToken string) (Socket, error) {
	s, err := newSocketFromConsoleURL(clusterID, consoleURL, deployToken, false)
	if err != nil {
		return nil, err
	}

	if err := s.Join(); err != nil {
		return s, fmt.Errorf("failed to start graphql websocket subscription: %w", err)
	}

	return s, nil
}

// NewClosed creates a socket that starts in closed state and does not open
// a websocket connection until Join() is called.
func NewClosed(clusterID, consoleURL, deployToken string) (Socket, error) {
	s, err := newSocketFromConsoleURL(clusterID, consoleURL, deployToken, true)
	if err != nil {
		return nil, err
	}

	return s, nil
}

func newSocketFromConsoleURL(clusterID, consoleURL, deployToken string, closed bool) (*socket, error) {
	endpoint, err := gqlWSUri(consoleURL)
	if err != nil {
		return nil, fmt.Errorf("failed to build graphql websocket URI: %w", err)
	}

	return newSocket(clusterID, endpoint, deployToken, closed), nil
}

func newSocket(clusterID string, endpoint *url.URL, deployToken string, closed bool) *socket {
	s := &socket{
		clusterID:   clusterID,
		endpoint:    endpoint,
		deployToken: deployToken,
		publishers:  cmap.New[Publisher](),
	}
	s.closed.Store(closed)
	return s
}

func (s *socket) AddPublisher(event string, publisher Publisher) {
	if event == "" {
		klog.V(log.LogLevelDefault).Info("cannot register publisher without event type")
		return
	}
	if publisher == nil {
		klog.V(log.LogLevelDefault).InfoS("cannot register nil publisher", "event", event)
		return
	}

	if !s.publishers.SetIfAbsent(event, publisher) {
		klog.V(log.LogLevelDefault).InfoS("publisher for this event type is already registered", "event", event)
		return
	}
}

func (s *socket) Join() error {
	if !s.joining.CompareAndSwap(false, true) {
		return nil
	}

	defer func() {
		if s.closed.Load() {
			s.joining.Store(false)
		}
	}()

	// If a client is already active, rely on the subscription client reconnect loop.
	if !s.closed.Load() && s.clientHandle.Load() != nil {
		s.joining.Store(false)
		return nil
	}

	gen := s.clientGen.Add(1)
	s.closed.Store(false)

	client := s.newSubscriptionClient(gen)

	subscription := &notificationSubscription{}
	_, err := client.Subscribe(subscription, nil, s.subscriptionHandler(gen))
	if err != nil {
		s.joining.Store(false)
		s.closed.Store(true)
		return fmt.Errorf("failed to subscribe to deploy agent notifications: %w", err)
	}

	runCtx, cancel := context.WithCancel(context.Background())
	handle := &subscriptionHandle{
		client: client,
		cancel: cancel,
	}

	if !s.publishClient(handle) {
		cancel()
		_ = client.Close()
		return nil
	}

	go s.runSubscriptionClient(runCtx, gen, handle)
	return nil
}

func (s *socket) publishClient(handle *subscriptionHandle) bool {
	// If the socket was closed while Join() was preparing the client, do not publish this client.
	if s.closed.Load() {
		s.joining.Store(false)
		return false
	}

	s.clientHandle.Store(handle)

	// Close can race after the closed check and before the store above.
	// Roll back publication if closed was set in that window.
	if s.closed.Load() && s.clientHandle.CompareAndSwap(handle, nil) {
		s.joining.Store(false)
		return false
	}

	return true
}

func (s *socket) runSubscriptionClient(ctx context.Context, gen uint64, handle *subscriptionHandle) {
	if err := handle.client.RunWithContext(ctx); err != nil {
		klog.V(log.LogLevelDefault).InfoS("graphql websocket subscription client exited with error", "error", err)
	}
	klog.V(log.LogLevelDefault).InfoS(
		"graphql websocket connection closed",
		"clusterID", s.clusterID,
		"generation", gen,
	)

	if gen != s.clientGen.Load() {
		return
	}

	s.joining.Store(false)
	s.clientHandle.CompareAndSwap(handle, nil)

	if !s.closed.Load() {
		// Mark as closed so manager poll can trigger a clean recreate.
		s.closed.Store(true)
	}
}

func (s *socket) newSubscriptionClient(gen uint64) *graphql.SubscriptionClient {
	return graphql.NewSubscriptionClient(s.endpoint.String()).
		WithProtocol(graphql.GraphQLWS).
		WithConnectionParams(map[string]any{"token": s.deployToken}).
		WithRetryTimeout(0).
		WithExitWhenNoSubscription(false).
		WithSyncMode(true).
		OnConnected(func() {
			if s.isStaleOrClosed(gen) {
				return
			}
			klog.V(log.LogLevelDefault).InfoS(
				"graphql websocket connection established",
				"clusterID", s.clusterID,
				"endpoint", s.endpoint.String(),
			)
			s.joining.Store(false)
		}).
		OnError(func(_ *graphql.SubscriptionClient, err error) error {
			if err == nil {
				return nil
			}
			if s.closed.Load() {
				// Intentional close should terminate run loop.
				return err
			}
			klog.V(log.LogLevelDefault).InfoS("graphql websocket client error", "error", err)
			return nil
		})
}

func (s *socket) subscriptionHandler(gen uint64) func([]byte, error) error {
	return func(message []byte, subscribeErr error) error {
		if subscribeErr != nil {
			klog.V(log.LogLevelDefault).InfoS("graphql subscription callback error", "error", subscribeErr)
			return nil
		}

		if len(message) == 0 {
			return nil
		}

		payload, ok := parseNotificationPayload(message)
		if !ok {
			return nil
		}

		s.handleNotification(gen, payload.Notification)
		return nil
	}
}

func (s *socket) handleNotification(gen uint64, payload notification) {
	if s.isStaleOrClosed(gen) {
		return
	}

	resource := normalizeResource(payload.Resource)
	klog.V(log.LogLevelDefault).InfoS(
		"received graphql websocket notification",
		"resource", resource,
		"resourceID", payload.ResourceID,
		"kick", lo.FromPtr(payload.Kick),
	)

	publisher, ok := s.publishers.Get(resource)
	if !ok {
		klog.V(log.LogLevelDebug).InfoS("could not find publisher for resource", "resource", resource)
		return
	}

	publisher.Publish(payload.ResourceID, lo.FromPtr(payload.Kick))
}

func (s *socket) isStaleOrClosed(gen uint64) bool {
	return gen != s.clientGen.Load() || s.closed.Load()
}

func (s *socket) Close() error {
	if !s.closed.CompareAndSwap(false, true) {
		return nil
	}

	s.joining.Store(false)
	handle := s.clientHandle.Swap(nil)

	klog.V(log.LogLevelDefault).Info("closing graphql websocket subscription client")
	if handle != nil && handle.cancel != nil {
		handle.cancel()
	}

	return nil
}

func gqlWSUri(consoleUrl string) (*url.URL, error) {
	baseURL, err := url.Parse(consoleUrl)
	if err != nil {
		return nil, err
	}

	return &url.URL{
		Scheme: "wss",
		Host:   baseURL.Host,
		Path:   graphqlWebsocketPath,
	}, nil
}

func parseNotificationPayload(message []byte) (*notificationSubscription, bool) {
	var payload notificationSubscription
	if err := jsonutil.UnmarshalGraphQL(message, &payload); err != nil {
		klog.V(log.LogLevelDefault).InfoS("failed to parse graphql subscription payload", "error", err)
		return nil, false
	}

	return &payload, true
}

func normalizeResource(resource string) string {
	return strings.ToLower(strings.TrimSpace(resource))
}

type notificationSubscription struct {
	Notification notification `graphql:"deployAgentNotification"`
}

type notification struct {
	Resource   string `graphql:"resource" json:"resource"`
	ResourceID string `graphql:"resourceId" json:"resourceId"`
	Kick       *bool  `graphql:"kick" json:"kick"`
}
