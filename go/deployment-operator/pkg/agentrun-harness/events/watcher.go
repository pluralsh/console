// Package events relays the agent run status Console pushes to the mcpserver sidecar, which holds
// the deploy token and the websocket, to the harness's poll loops.
package events

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	// requestTimeout must outlast the sidecar's long-poll wait.
	requestTimeout = 2 * time.Minute
	retryDelay     = 5 * time.Second
	maxUpdateBytes = 1 << 20
)

// Update is the sidecar's long-poll answer. Run is the latest status Console pushed, nil until the
// first push, and Connected reports whether the sidecar's websocket is up.
type Update struct {
	Generation uint64                          `json:"generation"`
	Connected  bool                            `json:"connected"`
	Run        *console.AgentRunStatusFragment `json:"run,omitempty"`
}

// Watcher long-polls the sidecar's events endpoint and kicks every subscriber when Console pushes a
// new status for the run.
type Watcher struct {
	url    string
	client *http.Client

	mu          sync.Mutex
	subscribers []chan struct{}
	latest      Update
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

// Latest returns the last update from the sidecar. A nil Watcher is never connected.
func (in *Watcher) Latest() Update {
	if in == nil {
		return Update{}
	}

	in.mu.Lock()
	defer in.mu.Unlock()
	return in.latest
}

// Run long-polls until ctx is done.
func (in *Watcher) Run(ctx context.Context) {
	for ctx.Err() == nil {
		update, err := in.poll(ctx, in.Latest())
		if err != nil {
			klog.V(log.LogLevelDebug).InfoS("could not poll agent run events", "error", err)
			in.disconnect()
			select {
			case <-ctx.Done():
			case <-time.After(retryDelay):
			}
			continue
		}

		in.mu.Lock()
		changed := update.Generation != in.latest.Generation || update.Connected != in.latest.Connected
		in.latest = update
		in.mu.Unlock()
		if changed {
			in.kick()
		}
	}
}

func (in *Watcher) disconnect() {
	in.mu.Lock()
	wasConnected := in.latest.Connected
	in.latest.Connected = false
	in.mu.Unlock()
	if wasConnected {
		in.kick()
	}
}

func (in *Watcher) poll(ctx context.Context, last Update) (Update, error) {
	var update Update
	query := url.Values{
		"since":     {strconv.FormatUint(last.Generation, 10)},
		"connected": {strconv.FormatBool(last.Connected)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, in.url+"?"+query.Encode(), nil)
	if err != nil {
		return update, err
	}

	resp, err := in.client.Do(req)
	if err != nil {
		return update, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return update, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	err = json.NewDecoder(io.LimitReader(resp.Body, maxUpdateBytes)).Decode(&update)
	return update, err
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
