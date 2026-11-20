package agent

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
)

const (
	// runEventsWait bounds how long a long-poll is held open.
	runEventsWait = 25 * time.Second
	// runEventsRejoinInterval is how often a dropped websocket is rejoined.
	runEventsRejoinInterval = 30 * time.Second
)

// runEvents keeps the latest status Console pushed for this agent run and lets the harness
// long-poll for it, so it never needs the deploy token for the websocket.
type runEvents struct {
	socket websocket.StatusSocket
	stop   chan struct{}

	mu         sync.Mutex
	generation uint64
	run        *console.AgentRunStatusFragment
	changed    chan struct{}
}

func newRunEvents() *runEvents {
	return &runEvents{stop: make(chan struct{}), changed: make(chan struct{})}
}

func (in *runEvents) publish(run *console.AgentRunStatusFragment) {
	in.mu.Lock()
	defer in.mu.Unlock()
	in.generation++
	in.run = run
	close(in.changed)
	in.changed = make(chan struct{})
}

// start joins the websocket and rejoins it whenever it drops, until close.
func (in *runEvents) start() {
	go func() {
		ticker := time.NewTicker(runEventsRejoinInterval)
		defer ticker.Stop()
		for {
			if err := in.socket.Join(); err != nil {
				klog.V(log.LogLevelDefault).InfoS("could not join console websocket for agent run events", "error", err)
			}
			select {
			case <-in.stop:
				return
			case <-ticker.C:
			}
		}
	}()
}

func (in *runEvents) close() error {
	close(in.stop)
	return in.socket.Close()
}

// ServeHTTP answers with the latest events.Update once its generation differs from the "since"
// query parameter or its connection state from "connected", or after runEventsWait.
func (in *runEvents) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	since, err := strconv.ParseUint(r.URL.Query().Get("since"), 10, 64)
	if err != nil {
		http.Error(w, "invalid since parameter", http.StatusBadRequest)
		return
	}

	timer := time.NewTimer(runEventsWait)
	defer timer.Stop()

	connected := r.URL.Query().Get("connected") == "true"
	update, changed := in.current()
	if update.Generation == since && update.Connected == connected {
		select {
		case <-changed:
		case <-timer.C:
		case <-in.stop:
		case <-r.Context().Done():
			return
		}
		update, _ = in.current()
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(update)
}

func (in *runEvents) current() (events.Update, <-chan struct{}) {
	in.mu.Lock()
	defer in.mu.Unlock()
	return events.Update{Generation: in.generation, Connected: in.socket.Connected(), Run: in.run}, in.changed
}
