// Package events relays Console notifications about this agent run from the mcpserver sidecar,
// which holds the deploy token and the websocket, to the harness's poll loops.
package events

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	// requestTimeout must outlast the sidecar's long-poll wait.
	requestTimeout = 2 * time.Minute
	retryDelay     = 5 * time.Second
)

// Watcher long-polls the sidecar's events endpoint and kicks every subscriber when the run's
// event generation changes.
type Watcher struct {
	url    string
	client *http.Client

	mu          sync.Mutex
	subscribers []chan struct{}
}

func NewWatcher(url string) *Watcher {
	return &Watcher{url: url, client: &http.Client{Timeout: requestTimeout}}
}

// Subscribe returns a channel that receives at most one pending kick. A nil Watcher returns a
// nil channel, which never fires.
func (in *Watcher) Subscribe() <-chan struct{} {
	if in == nil {
		return nil
	}

	in.mu.Lock()
	defer in.mu.Unlock()
	ch := make(chan struct{}, 1)
	in.subscribers = append(in.subscribers, ch)
	return ch
}

// Run long-polls until ctx is done.
func (in *Watcher) Run(ctx context.Context) {
	var generation uint64
	for ctx.Err() == nil {
		next, err := in.poll(ctx, generation)
		if err != nil {
			klog.V(log.LogLevelDebug).InfoS("could not poll agent run events", "error", err)
			select {
			case <-ctx.Done():
			case <-time.After(retryDelay):
			}
			continue
		}

		if next != generation {
			generation = next
			in.kick()
		}
	}
}

func (in *Watcher) poll(ctx context.Context, since uint64) (uint64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, in.url+"?"+url.Values{"since": {strconv.FormatUint(since, 10)}}.Encode(), nil)
	if err != nil {
		return 0, err
	}

	resp, err := in.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64))
	if err != nil {
		return 0, err
	}
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return strconv.ParseUint(strings.TrimSpace(string(body)), 10, 64)
}

func (in *Watcher) kick() {
	in.mu.Lock()
	defer in.mu.Unlock()
	for _, ch := range in.subscribers {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}
