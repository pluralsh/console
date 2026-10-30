package agent

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
)

const (
	agentRunNotification = "agent_run"

	// runEventsWait bounds how long a long-poll is held open.
	runEventsWait = 25 * time.Second
	// runEventsRejoinInterval is how often a dropped websocket is rejoined.
	runEventsRejoinInterval = 30 * time.Second
)

// runEvents counts the deploy agent notifications for one agent run and lets the harness
// long-poll for the count to change, so it never needs the deploy token for the websocket.
type runEvents struct {
	id     string
	socket websocket.Socket
	stop   chan struct{}

	mu         sync.Mutex
	generation uint64
	changed    chan struct{}
}

func newRunEvents(id string, socket websocket.Socket) *runEvents {
	in := &runEvents{id: id, socket: socket, stop: make(chan struct{}), changed: make(chan struct{})}
	socket.AddPublisher(agentRunNotification, in)
	return in
}

func (in *runEvents) Publish(id string, _ bool) {
	if id != in.id {
		return
	}

	in.mu.Lock()
	defer in.mu.Unlock()
	in.generation++
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

// ServeHTTP answers with the current generation once it differs from the "since" query
// parameter, or after runEventsWait.
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

	generation, changed := in.current()
	if generation == since {
		select {
		case <-changed:
		case <-timer.C:
		case <-in.stop:
		case <-r.Context().Done():
			return
		}
		generation, _ = in.current()
	}

	w.Header().Set("Content-Type", "text/plain")
	_, _ = w.Write([]byte(strconv.FormatUint(generation, 10)))
}

func (in *runEvents) current() (uint64, <-chan struct{}) {
	in.mu.Lock()
	defer in.mu.Unlock()
	return in.generation, in.changed
}
